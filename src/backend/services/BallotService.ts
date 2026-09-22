/**
 * Ballot Service & Privacy-Preserving Voting Engine
 * 
 * Strict Architectural Rule:
 * NEVER store:
 * - Voter ID + Candidate
 * - Aadhaar + Vote
 * - Name + Candidate
 * 
 * Identity Domain and Ballot Domain are physically and logically segregated.
 */

import crypto from 'crypto';
import { AnonymousCredentialService } from './AnonymousCredentialService.js';
import { BlockchainLedgerService } from './BlockchainLedgerService.js';
import { ElectionLifecycleService } from './ElectionLifecycleService.js';
import { SecurityMonitoringService } from './SecurityMonitoringService.js';

// ISOLATED BALLOT DOMAIN: Keyed by ballotCommitment ONLY
// Contains ZERO identity attributes (No Voter ID, No Aadhaar, No Name, No IP)
interface StoredBallotItem {
  ballotCommitment: string;
  candidateId: string;
  electionId: string;
  recordedAt: string;
  transactionReference: string;
}

const isolatedBallotStore = new Map<string, StoredBallotItem>();

export class BallotService {
  /**
   * Cast an anonymous vote
   */
  public static async castBallot(params: {
    electionId: string;
    candidateId: string;
    rawCredential?: string;
    credentialHash: string;
    voterSecretNonce?: string; // Generated client-side for zero-knowledge commitment
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    statusCode: number;
    transactionReference?: string;
    blockIndex?: number;
    blockHash?: string;
    timestamp?: string;
    message: string;
    error_code?: string;
  }> {
    const { electionId, candidateId, credentialHash } = params;

    // 1. Verify Election is currently OPEN
    const election = ElectionLifecycleService.getElectionById(electionId);
    if (!election) {
      return {
        success: false,
        statusCode: 404,
        message: 'Election not found.',
        error_code: 'ERR_ELECTION_NOT_FOUND',
      };
    }

    if (election.status !== 'OPEN') {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'SUSPICIOUS_REQUEST',
        severity: 'MEDIUM',
        description: `Vote submission rejected: Election ${electionId} is in status ${election.status}.`,
        clientIpMasked: params.ipAddress ? SecurityMonitoringService.maskIp(params.ipAddress) : 'UNKNOWN',
      });

      return {
        success: false,
        statusCode: 403,
        message: `Ballot cannot be cast. Election is currently ${election.status}. Votes are only accepted when status is OPEN.`,
        error_code: 'ERR_ELECTION_NOT_OPEN',
      };
    }

    // 2. Verify Candidate belongs to this election
    const candidates = ElectionLifecycleService.getCandidates(electionId);
    const candidateExists = candidates.some((c) => c.id === candidateId);
    if (!candidateExists) {
      return {
        success: false,
        statusCode: 400,
        message: 'Selected candidate does not exist in this election.',
        error_code: 'ERR_INVALID_CANDIDATE',
      };
    }

    // 3. Pre-validate credential status
    const credentialValidation = AnonymousCredentialService.validateCredentialHash(
      credentialHash,
      electionId
    );

    if (!credentialValidation.isValid) {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'DUPLICATE_VOTE_ATTEMPT',
        severity: 'HIGH',
        description: `Rejected vote attempt: ${credentialValidation.reason}`,
        clientIpMasked: params.ipAddress ? SecurityMonitoringService.maskIp(params.ipAddress) : 'UNKNOWN',
      });

      return {
        success: false,
        statusCode: 409,
        message: credentialValidation.reason || 'Voting credential is invalid or already consumed.',
        error_code: 'ERR_CREDENTIAL_INVALID',
      };
    }

    // 4. Generate Ballot Commitment
    // SHA-256(candidateId + voterSecretNonce)
    const nonce = params.voterSecretNonce || crypto.randomBytes(16).toString('hex');
    const ballotCommitment = crypto
      .createHash('sha256')
      .update(candidateId + ':' + nonce)
      .digest('hex');

    // 5. Generate transaction reference
    const transactionReference = 'TX-VOTE-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    // 6. ATOMIC ONE-VOTE ENFORCEMENT
    // Atomically transition the credential from ISSUED -> USED
    const consumptionResult = await AnonymousCredentialService.consumeCredentialAtomically(
      credentialHash,
      electionId,
      transactionReference
    );

    if (!consumptionResult.success) {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'DUPLICATE_VOTE_ATTEMPT',
        severity: 'CRITICAL',
        description: `Concurrent double-vote attempt blocked: ${consumptionResult.reason}`,
        clientIpMasked: params.ipAddress ? SecurityMonitoringService.maskIp(params.ipAddress) : 'UNKNOWN',
      });

      return {
        success: false,
        statusCode: 409,
        message: consumptionResult.reason || 'Duplicate voting attempt prevented.',
        error_code: 'ERR_CONCURRENT_VOTE_REJECTED',
      };
    }

    // 7. Record transaction to Permissioned Blockchain Ledger
    const blockchainResult = await BlockchainLedgerService.recordBallotTransaction({
      electionId,
      ballotCommitment,
      credentialHash,
    });

    if (!blockchainResult.success) {
      return {
        success: false,
        statusCode: 500,
        message: 'Your vote could not be confirmed on the election ledger. Please do not retry until the system confirms your transaction status.',
        error_code: 'ERR_LEDGER_COMMITTAL_FAILED',
      };
    }

    // 8. Store in Isolated Ballot Domain (Unlinked from any voter identity)
    isolatedBallotStore.set(ballotCommitment, {
      ballotCommitment,
      candidateId,
      electionId,
      recordedAt: blockchainResult.timestamp,
      transactionReference,
    });

    // 9. Audit event
    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `Ballot commitment recorded on block #${blockchainResult.blockIndex} on election-channel.`,
      clientIpMasked: 'ANONYMOUS_CREDENTIAL_DOMAIN',
    });

    return {
      success: true,
      statusCode: 200,
      transactionReference,
      blockIndex: blockchainResult.blockIndex,
      blockHash: blockchainResult.blockHash,
      timestamp: blockchainResult.timestamp,
      message: 'Your vote has been successfully recorded on the election ledger.',
    };
  }

  public static getBallotStore(): StoredBallotItem[] {
    return Array.from(isolatedBallotStore.values());
  }

  public static getBallotsForElection(electionId: string): StoredBallotItem[] {
    return Array.from(isolatedBallotStore.values()).filter((b) => b.electionId === electionId);
  }

  public static reset(): void {
    isolatedBallotStore.clear();
  }
}
