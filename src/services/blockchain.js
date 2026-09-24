import { ethers } from "ethers";

const CONTRACT_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS;

const ABI = [
  "function addCandidate(string,string,string,string)",
  "function candidateCount() view returns (uint256)",
  "function getAllCandidates() view returns (tuple(uint256 id,string name,string party,string symbol,string description,uint256 voteCount,bool exists)[])",
  "function getCandidate(uint256) view returns (uint256 id,string name,string party,string symbol,string description,uint256 voteCount,bool exists)",
  "function owner() view returns (address)",
  // ✅ BUG FIX: castVote was missing from ABI — the Voting.sol contract exposes vote(uint256 candidateId)
  "function vote(uint256 candidateId)",
  "event Voted(address indexed voter, uint256 indexed candidateId)",
];

// Connect MetaMask wallet
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to connect a wallet.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: network.chainId.toString(),
  };
};

// Get contract with signer
const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    ABI,
    signer
  );
};

// Get all candidates
export const fetchCandidates = async () => {
  const contract = await getContract();
  const candidates = await contract.getAllCandidates();

  return candidates.map((candidate) => ({
    id: Number(candidate.id),
    name: candidate.name,
    party: candidate.party,
    symbol: candidate.symbol,
    description: candidate.description,
    voteCount: Number(candidate.voteCount),
    exists: candidate.exists
  }));
};

// Add candidate
export const addCandidate = async (candidate) => {
  const contract = await getContract();

  return await contract.addCandidate(
    candidate.name,
    candidate.party,
    candidate.symbol,
    candidate.description
  );
};

// Cast a vote on-chain (calls the Voting.sol vote(uint256) function)
// NOTE: This records the vote on the EVM chain via MetaMask.
// The backend REST API (/api/v1/voting/ballots/cast) handles the
// Hyperledger Fabric permissioned ledger write independently.
export const castVote = async (candidateId) => {
  if (!candidateId && candidateId !== 0) {
    throw new Error("candidateId is required to cast a vote on-chain.");
  }

  const contract = await getContract();

  // Sends the transaction via MetaMask — returns TransactionResponse
  const tx = await contract.vote(Number(candidateId));

  // Wait for 1 confirmation
  const receipt = await tx.wait(1);

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString(),
  };
};

// Temporary functions
// Your current Voting.sol does not contain editCandidate or disableCandidate.

export const editCandidate = async () => {
  throw new Error(
    "editCandidate is not available in the current Voting.sol contract."
  );
};

export const disableCandidate = async () => {
  throw new Error(
    "disableCandidate is not available in the current Voting.sol contract."
  );
};