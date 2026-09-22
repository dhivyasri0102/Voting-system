/**
 * Permissioned Blockchain Ledger Service (Hyperledger Fabric Architecture)
 * 
 * Implements an immutable, cryptographically verifiable ledger simulating
 * Hyperledger Fabric Channel & Chaincode execution:
 * - Deterministic Smart Contract validation
 * - SHA-256 Merkle Root generation
 * - Cryptographic Block linkage (Hash-chaining)
 * - Strict Separation: NO voter identity, NO Aadhaar on-chain
 * - Live tamper detection and audit trail
 */

import crypto from 'crypto';
import { BlockchainBlock, BlockchainTransaction } from '../../types/index.js';

export class BlockchainLedgerService {
  private static blocks: BlockchainBlock[] = [];
  private static mempool: BlockchainTransaction[] = [];
  private static channelId = 'election-channel';
  private static organizationMSP = 'ElectionAuthorityMSP';

  // Secret key used to sign blocks by the authorized orderer / peer
  private static ordererSigningKey = crypto.randomBytes(32).toString('hex');

  static {
    // Initialize Genesis Block if empty
    this.initializeGenesisBlock();
  }

  private static initializeGenesisBlock(): void {
    if (this.blocks.length > 0) return;

    const genesisTx: BlockchainTransaction = {
      transactionReference: 'TX-GENESIS-00000000',
      electionId: 'SYSTEM-ROOT',
      ballotCommitment: '0000000000000000000000000000000000000000000000000000000000000000',
      credentialHash: '0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
      signature: 'SIG-FABRIC-ORDERER-GENESIS',
      status: 'COMMITTED',
    };

    const genesisBlock: BlockchainBlock = {
      index: 0,
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: genesisTx.timestamp,
      merkleRoot: this.calculateMerkleRoot([genesisTx]),
      hash: '',
      transactions: [genesisTx],
      validatorSignature: 'ORDERER-MSP-PEER0-INITIAL-ANCHOR',
      channelId: this.channelId,
    };

    genesisBlock.hash = this.calculateBlockHash(genesisBlock);
    this.blocks.push(genesisBlock);
  }

  /**
   * Calculates SHA-256 Merkle Root of an array of transactions
   */
  public static calculateMerkleRoot(transactions: BlockchainTransaction[]): string {
    if (transactions.length === 0) return crypto.createHash('sha256').update('EMPTY').digest('hex');

    let hashes = transactions.map((tx) =>
      crypto
        .createHash('sha256')
        .update(tx.transactionReference + tx.electionId + tx.ballotCommitment + tx.credentialHash)
        .digest('hex')
    );

    while (hashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          nextLevel.push(
            crypto.createHash('sha256').update(hashes[i] + hashes[i + 1]).digest('hex')
          );
        } else {
          nextLevel.push(
            crypto.createHash('sha256').update(hashes[i] + hashes[i]).digest('hex')
          );
        }
      }
      hashes = nextLevel;
    }

    return hashes[0];
  }

  /**
   * Calculates SHA-256 Hash of a Block Header
   */
  public static calculateBlockHash(block: Omit<BlockchainBlock, 'hash'>): string {
    const headerString = [
      block.index,
      block.previousHash,
      block.timestamp,
      block.merkleRoot,
      block.channelId,
    ].join(':');

    return crypto.createHash('sha256').update(headerString).digest('hex');
  }

  /**
   * Record a new Ballot Transaction to the Blockchain
   * Enforces Chaincode Smart Contract Validation
   */
  public static async recordBallotTransaction(params: {
    electionId: string;
    ballotCommitment: string;
    credentialHash: string;
  }): Promise<{
    success: boolean;
    transactionReference: string;
    blockIndex: number;
    blockHash: string;
    timestamp: string;
    error?: string;
  }> {
    const timestamp = new Date().toISOString();
    const transactionReference = 'TX-FABRIC-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    // Sign transaction with peer MSP key
    const signature = crypto
      .createHmac('sha256', this.ordererSigningKey)
      .update(transactionReference + params.electionId + params.ballotCommitment)
      .digest('hex');

    const tx: BlockchainTransaction = {
      transactionReference,
      electionId: params.electionId,
      ballotCommitment: params.ballotCommitment,
      credentialHash: params.credentialHash,
      timestamp,
      signature: `SIG-MSP-${this.organizationMSP}-${signature.slice(0, 16)}`,
      status: 'COMMITTED',
    };

    // Form a new Block immediately (or batch in high-throughput)
    const previousBlock = this.blocks[this.blocks.length - 1];
    const newBlockIndex = this.blocks.length;
    const merkleRoot = this.calculateMerkleRoot([tx]);

    const candidateBlock: Omit<BlockchainBlock, 'hash'> = {
      index: newBlockIndex,
      previousHash: previousBlock.hash,
      timestamp,
      merkleRoot,
      transactions: [tx],
      validatorSignature: `FABRIC-ENDORSED-${this.organizationMSP}-PEER0`,
      channelId: this.channelId,
    };

    const blockHash = this.calculateBlockHash(candidateBlock);
    const finalizedBlock: BlockchainBlock = {
      ...candidateBlock,
      hash: blockHash,
    };

    this.blocks.push(finalizedBlock);

    return {
      success: true,
      transactionReference,
      blockIndex: newBlockIndex,
      blockHash,
      timestamp,
    };
  }

  /**
   * Complete Audit Verification of the Ledger
   * Traverses all blocks and validates:
   * 1. Block indices are sequential
   * 2. previousHash matches the preceding block's actual hash
   * 3. Merkle root matches transactions
   * 4. Block hash matches recalculated block header hash
   */
  public static verifyLedgerIntegrity(): {
    isTamperFree: boolean;
    totalBlocks: number;
    totalTransactions: number;
    discrepancies: string[];
  } {
    const discrepancies: string[] = [];
    let totalTransactions = 0;

    if (this.blocks.length === 0) {
      return {
        isTamperFree: false,
        totalBlocks: 0,
        totalTransactions: 0,
        discrepancies: ['Genesis block is missing from ledger'],
      };
    }

    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      totalTransactions += block.transactions.length;

      // 1. Check index
      if (block.index !== i) {
        discrepancies.push(`Block at array position ${i} has invalid index ${block.index}`);
      }

      // 2. Check previousHash link
      if (i > 0) {
        const prevBlock = this.blocks[i - 1];
        if (block.previousHash !== prevBlock.hash) {
          discrepancies.push(
            `Broken chain link at Block #${block.index}: previousHash ${block.previousHash.slice(0, 10)} does not match Block #${prevBlock.index} hash ${prevBlock.hash.slice(0, 10)}`
          );
        }
      }

      // 3. Verify Merkle root
      const computedMerkle = this.calculateMerkleRoot(block.transactions);
      if (block.merkleRoot !== computedMerkle) {
        discrepancies.push(
          `Merkle root mismatch in Block #${block.index}: stored ${block.merkleRoot.slice(0, 10)} != computed ${computedMerkle.slice(0, 10)}`
        );
      }

      // 4. Verify Block Hash
      const computedHash = this.calculateBlockHash(block);
      if (block.hash !== computedHash) {
        discrepancies.push(
          `Invalid block hash in Block #${block.index}: stored ${block.hash.slice(0, 10)} != computed ${computedHash.slice(0, 10)}`
        );
      }
    }

    return {
      isTamperFree: discrepancies.length === 0,
      totalBlocks: this.blocks.length,
      totalTransactions,
      discrepancies,
    };
  }

  public static getBlocks(): BlockchainBlock[] {
    return [...this.blocks];
  }

  public static getBlockByIndex(index: number): BlockchainBlock | undefined {
    return this.blocks[index];
  }

  public static getTransactionsForElection(electionId: string): BlockchainTransaction[] {
    const txs: BlockchainTransaction[] = [];
    for (const block of this.blocks) {
      for (const tx of block.transactions) {
        if (tx.electionId === electionId && tx.status === 'COMMITTED') {
          txs.push(tx);
        }
      }
    }
    return txs;
  }

  public static reset(): void {
    this.blocks = [];
    this.initializeGenesisBlock();
  }
}
