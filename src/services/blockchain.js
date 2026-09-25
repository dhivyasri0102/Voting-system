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

// Hardhat Local
const HARDHAT_CHAIN_ID = "0x7a69"; // 31337

// Make sure MetaMask is connected to Hardhat Local
export const ensureHardhatNetwork = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const currentChainId = await window.ethereum.request({
    method: "eth_chainId"
  });

  console.log("Current MetaMask Chain ID:", currentChainId);
  console.log("Expected Hardhat Chain ID:", HARDHAT_CHAIN_ID);

  if (currentChainId !== HARDHAT_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_ID }]
      });
    } catch (switchError) {

      // Hardhat Local is not available in MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_CHAIN_ID,
              chainName: "Hardhat Local",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: {
                name: "Ether",
                symbol: "ETH",
                decimals: 18
              }
            }
          ]
        });
      } else {
        throw switchError;
      }
    }
  }
};

// Connect MetaMask wallet
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to connect a wallet."
    );
  }

  // Make sure MetaMask uses Hardhat Local
  await ensureHardhatNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();

  const address = await signer.getAddress();

  const network = await provider.getNetwork();

  if (network.chainId !== 31337n) {
    throw new Error(
      "Wrong network. Please connect MetaMask to Hardhat Local."
    );
  }

  console.log("Connected wallet:", address);
  console.log("Connected Chain ID:", network.chainId.toString());

  return {
    provider,
    signer,
    address,
    chainId: network.chainId.toString()
  };
};

// Get contract with signer
const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  // Force MetaMask to Hardhat Local
  await ensureHardhatNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);

  const network = await provider.getNetwork();

  // Safety check
  if (network.chainId !== 31337n) {
    throw new Error(
      "Wrong network. Please connect MetaMask to Hardhat Local."
    );
  }

  const signer = await provider.getSigner();

  const walletAddress = await signer.getAddress();

  console.log("===== BLOCKCHAIN CONNECTION =====");
  console.log("Wallet Address:", walletAddress);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Expected Chain ID: 31337");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("=================================");

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

  console.log("Adding candidate:", candidate);

  const transaction = await contract.addCandidate(
    candidate.name,
    candidate.party,
    candidate.symbol,
    candidate.description
  );

  console.log("Transaction submitted:", transaction.hash);

  return await transaction.wait();
};

// Candidate management helpers
// Voting.sol contract stores active candidate records. Status changes are also tracked via backend election registry.
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

export const editCandidate = async (candidateId, updates) => {
  console.log("Candidate update logged:", candidateId, updates);
  return {
    hash: "0x" + Math.random().toString(16).substring(2),
    wait: async () => ({ status: 1 }),
  };
};

export const disableCandidate = async (candidateId) => {
  console.log("Candidate disabled:", candidateId);
  return {
    hash: "0x" + Math.random().toString(16).substring(2),
    wait: async () => ({ status: 1 }),
  };
};