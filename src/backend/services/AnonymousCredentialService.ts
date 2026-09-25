/**
 * Anonymous Credential Service
 * 
 * Provides cryptographically unlinkable, single-use anonymous voting tokens.
 * Crucial Privacy Principle:
 * - The identity domain issues the token.
 * - The voting domain consumes only the token hash.
 * - Enforces atomic single-use concurrency protection to prevent double-spending or replay attacks.
 */

import crypto from 'crypto';
import { VotingCredential, CredentialStatus } from '../../types/index.js';

export class AnonymousCredentialService {
  // Keyed by credentialHash
  private static credentials = new Map<string, VotingCredential>();

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

    this.credentials.set(credentialHash, credentialRecord);

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

    const cred = this.credentials.get(credentialHash);

    if (!cred) {
      console.warn(`[AnonymousCredentialService] Hash [${hashPrefix}] not found in credential registry. Registered total: ${this.credentials.size}`);
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
      return { isValid: false, reason: 'Voting credential has expired.' };
    }

    if (cred.status !== 'ISSUED') {
      return { isValid: false, reason: `Credential status is ${cred.status}, cannot be used.` };
    }

    return { isValid: true, credential: cred };
  }

  /**
   * ATOMIC ONE-VOTE ENFORCEMENT
   * 
   * Atomically transitions a credential from ISSUED -> USED.
   * If two requests attempt to consume the same credential simultaneously,
   * the lock prevents race conditions and only the first request succeeds.
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
        reason: 'Concurrent vote submission detected for this credential. Second attempt rejected.',
      };
    }

    this.locks.add(credentialHash);

    try {
      const validation = this.validateCredentialHash(credentialHash, electionId);
      if (!validation.isValid || !validation.credential) {
        return { success: false, reason: validation.reason || 'Credential validation failed.' };
      }

      const cred = validation.credential;

      // Atomic state transition
      cred.status = 'USED';
      cred.usedAt = new Date().toISOString();
      cred.transactionReference = transactionReference;

      this.credentials.set(credentialHash, cred);

      return { success: true };
    } finally {
      // Release lock
      this.locks.delete(credentialHash);
    }
  }

  public static getCredentialsSummary(electionId?: string): {
    totalIssued: number;
    totalUsed: number;
    totalExpired: number;
    totalRevoked: number;
  } {
    let totalIssued = 0;
    let totalUsed = 0;
    let totalExpired = 0;
    let totalRevoked = 0;

    for (const cred of this.credentials.values()) {
      if (electionId && cred.electionId !== electionId) continue;
      if (cred.status === 'ISSUED') totalIssued++;
      if (cred.status === 'USED') totalUsed++;
      if (cred.status === 'EXPIRED') totalExpired++;
      if (cred.status === 'REVOKED') totalRevoked++;
    }

    return { totalIssued: totalIssued + totalUsed, totalUsed, totalExpired, totalRevoked };
  }

  public static getAllRecords(): VotingCredential[] {
    return Array.from(this.credentials.values());
  }

  public static getAllCredentials(): VotingCredential[] {
    return Array.from(this.credentials.values());
  }

  public static reset(): void {
    this.credentials.clear();
    this.locks.clear();
  }
}
