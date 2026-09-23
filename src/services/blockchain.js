import { ethers } from "ethers";

const CONTRACT_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS;

const ABI = [
  "function addCandidate(string,string,string,string)",
  "function candidateCount() view returns (uint256)",
  "function getAllCandidates() view returns (tuple(uint256 id,string name,string party,string symbol,string description,uint256 voteCount,bool exists)[])",
  "function getCandidate(uint256) view returns (uint256 id,string name,string party,string symbol,string description,uint256 voteCount,bool exists)",
  "function owner() view returns (address)"
];

// Connect MetaMask
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();

  const address = await signer.getAddress();

  return {
    provider,
    signer,
    address
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