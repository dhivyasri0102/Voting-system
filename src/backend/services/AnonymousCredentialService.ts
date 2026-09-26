/**
 * Anonymous Credential Service
 * 
 * Provides cryptographically protected, single-use anonymous voting tokens.
 * Crucial Privacy Principle:
 * - The identity domain issues the token.
 * - The voting domain consumes only the token hash.
 * - Enforces atomic single-use concurrency protection to prevent double-spending or replay attacks.
 * - Backed by persistent DataStoreService.
 */

import crypto from 'crypto';
import { VotingCredential, CredentialStatus } from '../../types/index.js';
import { DataStoreService } from './DataStoreService.js';

export class AnonymousCredentialService {
  // Mutex locks for atomic operations per credentialHash
  private static locks = new Set<string>();

  /**
   * Issue a one-time anonymous voting credential for an eligible voter.
   * Returns the raw credential to the client once (never stored in plaintext on server).
   */
  public static issueCredential(electionId: string, validityMinutes = 60): {
    rawCredential: string;
    credentialHash: string;
    credentialRecord: VotingCredential;
  } {
    // Generate 256-bit cryptographically secure random token
    const rawCredential = 'VOTE-TOKEN-' + crypto.randomBytes(32).toString('hex').toUpperCase();

    // Generate SHA-256 hash of (rawCredential + electionId)
    const credentialHash = crypto
      .createHash('sha256')
      .update(rawCredential + electionId)
      .digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityMinutes * 60 * 1000);

    const credentialRecord: VotingCredential = {
      id: 'CRED-' + crypto.randomBytes(8).toString('hex'),
      credentialHash,
      electionId,
      status: 'ISSUED',
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    DataStoreService.saveCredential(credentialRecord);

    return {
      rawCredential,
      credentialHash,
      credentialRecord,
    };
  }

  /**
   * Validate if a credential hash is currently usable (ISSUED and unexpired).
   */
  public static validateCredentialHash(credentialHash: string, electionId: string): {
    isValid: boolean;
    reason?: string;
    credential?: VotingCredential;
  } {
    const hashPrefix = credentialHash ? `${credentialHash.slice(0, 8)}...` : 'undefined';
    console.log(`[AnonymousCredentialService] Validating credential prefix [${hashPrefix}] for election [${electionId}]`);

    const cred = DataStoreService.getCredential(credentialHash);

    if (!cred) {
      console.warn(`[AnonymousCredentialService] Hash [${hashPrefix}] not found in credential registry. Registered total: ${DataStoreService.getAllCredentials().length}`);
      return { isValid: false, reason: 'Invalid or unrecognized voting credential hash.' };
    }

    if (cred.electionId !== electionId) {
      return { isValid: false, reason: 'Credential is not valid for this election.' };
    }

    if (cred.status === 'USED') {
      return { isValid: false, reason: 'This voting credential has already been consumed (Duplicate vote prevented).' };
    }

    if (cred.status === 'REVOKED') {
      return { isValid: false, reason: 'This voting credential has been revoked by election authority.' };
    }

    if (new Date() > new Date(cred.expiresAt)) {
      cred.status = 'EXPIRED';
      DataStoreService.saveCredential(cred);
      return { isValid: false, reason: 'Voting credential has expired.' };
    }

    if (cred.status !== 'ISSUED') {
      return { isValid: false, reason: `Credential status is ${cred.status}, cannot be used.` };
    }

    return { isValid: true, credential: cred };
  }

  /**
   * ATOMIC ONE-VOTE ENFORCEMENT
   * Transitions credential status from ISSUED to USED atomically with mutex protection.
   */
  public static async consumeCredentialAtomically(
    credentialHash: string,
    electionId: string,
    transactionReference: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Acquire mutex lock
    if (this.locks.has(credentialHash)) {
      return {
        success: false,
        reason: 'Concurrent vote submission detected for this credential. Request blocked.',
      };
    }

    this.locks.add(credentialHash);

    try {
      const validation = this.validateCredentialHash(credentialHash, electionId);
      if (!validation.isValid || !validation.credential) {
        return { success: false, reason: validation.reason };
      }

      const cred = validation.credential;
      cred.status = 'USED';
      cred.usedAt = new Date().toISOString();
      cred.transactionReference = transactionReference;

      DataStoreService.saveCredential(cred);

      return { success: true };
    } finally {
      this.locks.delete(credentialHash);
    }
  }

  public static getCredentialStatus(credentialHash: string): CredentialStatus | 'UNKNOWN' {
    const cred = DataStoreService.getCredential(credentialHash);
    return cred ? cred.status : 'UNKNOWN';
  }

  public static getAllCredentials(): VotingCredential[] {
    return DataStoreService.getAllCredentials();
  }

  public static getCredentialsSummary(electionId: string): {
    totalIssued: number;
    totalUsed: number;
    totalRevoked: number;
    totalExpired: number;
  } {
    const creds = DataStoreService.getAllCredentials().filter((c) => c.electionId === electionId);
    return {
      totalIssued: creds.length,
      totalUsed: creds.filter((c) => c.status === 'USED').length,
      totalRevoked: creds.filter((c) => c.status === 'REVOKED').length,
      totalExpired: creds.filter((c) => c.status === 'EXPIRED').length,
    };
  }

  public static revokeCredential(credentialHash: string): boolean {
    const cred = DataStoreService.getCredential(credentialHash);
    if (!cred) return false;
    cred.status = 'REVOKED';
    DataStoreService.saveCredential(cred);
    return true;
  }
}
