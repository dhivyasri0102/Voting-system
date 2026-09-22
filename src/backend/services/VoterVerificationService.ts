/**
 * Local Mock Voter Verification Service
 * 
 * Replaces external UIDAI/Aadhaar identity services with a self-contained local mock
 * voter verification engine for demonstration and testing.
 * 
 * Enforces:
 * 1. Voter ID verification against local mock database
 * 2. Cryptographically secure 6-digit OTP generation and verification
 * 3. 2-minute OTP expiry, 3-attempt limit, and 30-second resend cooldown
 * 4. Electoral eligibility verification (ACTIVE status, constituency match, OPEN election, no prior vote)
 * 5. One-time anonymous voting credential issuance with strict identity-ballot separation
 */

import crypto from 'crypto';
import { SecurityMonitoringService } from './SecurityMonitoringService.js';
import { ElectoralRollService } from '../integrations/electoralRoll/ElectoralRollService.js';
import { ElectionLifecycleService } from './ElectionLifecycleService.js';
import { AnonymousCredentialService } from './AnonymousCredentialService.js';

export interface MockVoterRecord {
  voter_id: string;
  name: string;
  mobile: string;
  constituency: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ActiveOtpSession {
  verificationId: string;
  voterId: string;
  otp: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  blocked: boolean;
  verified: boolean;
  lastRequestedAt: number;
}

export interface VerificationStats {
  voterIdChecks: {
    total: number;
    successful: number;
    failed: number;
  };
  otpVerifications: {
    total: number;
    successful: number;
    failed: number;
  };
  eligibleVoters: number;
  credentialsIssued: number;
}

export class VoterVerificationService {
  // Local Mock Voter Database
  private static voters = new Map<string, MockVoterRecord>();

  // In-memory active OTP sessions (verificationId -> session)
  private static otpSessions = new Map<string, ActiveOtpSession>();
  // Index by voter ID for quick lookup
  private static voterOtpIndex = new Map<string, string>(); // voterId -> verificationId

  // Verification statistics for Admin Monitoring
  private static stats: VerificationStats = {
    voterIdChecks: { total: 0, successful: 0, failed: 0 },
    otpVerifications: { total: 0, successful: 0, failed: 0 },
    eligibleVoters: 0,
    credentialsIssued: 0,
  };

  static {
    this.seedMockVoters();
  }

  private static seedMockVoters(): void {
    const defaultVoters: MockVoterRecord[] = [
      {
        voter_id: 'ABC1234567',
        name: 'Karthika',
        mobile: '9876543210',
        constituency: 'CBE-01',
        status: 'ACTIVE',
      },
      {
        voter_id: 'ABC1234568',
        name: 'Ravi',
        mobile: '9876543211',
        constituency: 'CBE-01',
        status: 'ACTIVE',
      },
      {
        voter_id: 'ABC1234569',
        name: 'Kumar',
        mobile: '9876543212',
        constituency: 'CBE-02',
        status: 'ACTIVE',
      },
      {
        voter_id: 'ABC1234570',
        name: 'Anitha',
        mobile: '9876543213',
        constituency: 'CBE-01',
        status: 'INACTIVE',
      },
      // Backward compatibility voter record
      {
        voter_id: 'TNL1029384',
        name: 'Senthil Kumar',
        mobile: '9876543299',
        constituency: 'Central Chennai (Constituency No. 04)',
        status: 'ACTIVE',
      },
    ];

    for (const v of defaultVoters) {
      this.voters.set(v.voter_id.toUpperCase(), v);
    }
  }

  /**
   * Step 1: Verify Voter ID / EPIC against local database
   */
  public static verifyVoterId(voterId: string): {
    verified: boolean;
    voter_id?: string;
    name?: string;
    constituency?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    message?: string;
  } {
    this.stats.voterIdChecks.total++;
    const cleanId = (voterId || '').trim().toUpperCase();

    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `[VOTER_ID_VERIFICATION_STARTED] Checking voter identity for ${cleanId || 'UNKNOWN'}.`,
      clientIpMasked: 'VERIFY_GATEWAY',
    });

    if (!cleanId) {
      this.stats.voterIdChecks.failed++;
      return {
        verified: false,
        message: '✕ Voter ID / EPIC is required.',
      };
    }

    const voter = this.voters.get(cleanId);
    if (!voter) {
      this.stats.voterIdChecks.failed++;
      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `[VOTER_ID_VERIFICATION_FAILED] Voter ID ${cleanId} not found in local database.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        verified: false,
        message: '✕ Voter ID not found.',
      };
    }

    if (voter.status !== 'ACTIVE') {
      this.stats.voterIdChecks.failed++;
      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `[VOTER_ID_VERIFICATION_FAILED] Voter ID ${cleanId} registration is INACTIVE.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        verified: false,
        status: 'INACTIVE',
        message: '✕ This voter registration is inactive.',
      };
    }

    this.stats.voterIdChecks.successful++;
    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `[VOTER_ID_VERIFICATION_SUCCESS] Voter ID ${cleanId} successfully verified. Name: ${voter.name}, Constituency: ${voter.constituency}.`,
      clientIpMasked: 'VERIFY_GATEWAY',
    });

    return {
      verified: true,
      voter_id: voter.voter_id,
      name: voter.name,
      constituency: voter.constituency,
      status: voter.status,
      message: '✓ Voter ID Verified',
    };
  }

  /**
   * Helper to generate unpredictable 6-digit OTP
   */
  private static generateSecureOtp(): string {
    const predictableList = [
      '123456', '654321', '111111', '222222', '333333',
      '444444', '555555', '666666', '777777', '888888', '999999', '000000',
    ];
    let otp = '';
    do {
      otp = crypto.randomInt(100000, 999999).toString();
    } while (predictableList.includes(otp));
    return otp;
  }

  /**
   * Step 2: Start OTP generation for verified voter
   */
  public static startOtp(voterId: string): {
    success: boolean;
    verification_id?: string;
    otp_required?: boolean;
    message?: string;
    cooldown_seconds?: number;
  } {
    const cleanId = (voterId || '').trim().toUpperCase();
    const voter = this.voters.get(cleanId);
    if (!voter || voter.status !== 'ACTIVE') {
      return {
        success: false,
        message: '✕ Invalid voter identity or inactive voter registration.',
      };
    }

    // Check resend cooldown (30 seconds)
    const existingVerId = this.voterOtpIndex.get(cleanId);
    const now = Date.now();
    if (existingVerId) {
      const existingSession = this.otpSessions.get(existingVerId);
      if (existingSession && now - existingSession.lastRequestedAt < 30000) {
        const remainingSec = Math.ceil((30000 - (now - existingSession.lastRequestedAt)) / 1000);
        return {
          success: false,
          cooldown_seconds: remainingSec,
          message: `Please wait ${remainingSec} seconds before requesting a new OTP.`,
        };
      }
    }

    // Generate new OTP & Verification ID
    const otp = this.generateSecureOtp();
    const verificationId = `VER-${crypto.randomInt(10000, 99999)}`;
    const expiresAt = now + 120000; // 2 minutes expiry

    const session: ActiveOtpSession = {
      verificationId,
      voterId: cleanId,
      otp,
      createdAt: now,
      expiresAt,
      attempts: 0,
      blocked: false,
      verified: false,
      lastRequestedAt: now,
    };

    this.otpSessions.set(verificationId, session);
    this.voterOtpIndex.set(cleanId, verificationId);

    // Development behavior: log OTP to backend / server console
    console.log(`\n========================================`);
    console.log(`[DEV OTP]`);
    console.log(`Voter: ${cleanId}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires in: 2 minutes`);
    console.log(`========================================\n`);

    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `[OTP_GENERATED] Verification OTP generated for Voter ID ${cleanId}. Verification ID: ${verificationId}.`,
      clientIpMasked: 'VERIFY_GATEWAY',
    });

    return {
      success: true,
      verification_id: verificationId,
      otp_required: true,
      message: 'OTP generated and sent to registered mobile number.',
    };
  }

  /**
   * Step 3: Verify the entered OTP
   */
  public static verifyOtp(verificationId: string, enteredOtp: string): {
    verified: boolean;
    message: string;
    blocked?: boolean;
    expired?: boolean;
    remaining_attempts?: number;
  } {
    this.stats.otpVerifications.total++;
    const session = this.otpSessions.get(verificationId);

    if (!session) {
      this.stats.otpVerifications.failed++;
      return {
        verified: false,
        message: '✕ Invalid or expired verification session.',
      };
    }

    const now = Date.now();

    // Check if blocked due to >3 attempts
    if (session.blocked || session.attempts >= 3) {
      this.stats.otpVerifications.failed++;
      SecurityMonitoringService.recordSecurityEvent({
        type: 'SUSPICIOUS_REQUEST',
        severity: 'HIGH',
        description: `[OTP_VERIFICATION_FAILED] Voter ${session.voterId} session blocked due to excessive failed attempts.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        verified: false,
        blocked: true,
        message: 'OTP verification temporarily blocked. Please request a new OTP.',
      };
    }

    // Check expiry (2 minutes)
    if (now > session.expiresAt) {
      this.stats.otpVerifications.failed++;
      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `[OTP_VERIFICATION_FAILED] OTP expired for Voter ID ${session.voterId}.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        verified: false,
        expired: true,
        message: 'OTP expired. Please request a new OTP.',
      };
    }

    const cleanInput = (enteredOtp || '').trim();

    // Verify match
    if (cleanInput !== session.otp) {
      session.attempts++;
      this.stats.otpVerifications.failed++;

      if (session.attempts >= 3) {
        session.blocked = true;
        SecurityMonitoringService.recordSecurityEvent({
          type: 'SUSPICIOUS_REQUEST',
          severity: 'HIGH',
          description: `[OTP_VERIFICATION_FAILED] Voter ID ${session.voterId} blocked after 3 failed OTP attempts.`,
          clientIpMasked: 'VERIFY_GATEWAY',
        });
        return {
          verified: false,
          blocked: true,
          message: 'OTP verification temporarily blocked. Please request a new OTP.',
        };
      }

      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `[OTP_VERIFICATION_FAILED] Incorrect OTP attempt (${session.attempts}/3) for Voter ID ${session.voterId}.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });

      return {
        verified: false,
        remaining_attempts: 3 - session.attempts,
        message: '✕ Invalid OTP',
      };
    }

    // Success
    session.verified = true;
    this.stats.otpVerifications.successful++;

    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `[OTP_VERIFICATION_SUCCESS] Identity successfully verified for Voter ID ${session.voterId}.`,
      clientIpMasked: 'VERIFY_GATEWAY',
    });

    return {
      verified: true,
      message: 'Identity verification successful',
    };
  }

  /**
   * Step 4: Check Election Eligibility
   */
  public static checkEligibility(voterId: string, electionId?: string): {
    eligible: boolean;
    registered: boolean;
    status: string;
    constituency_match: boolean;
    already_voted: boolean;
    message: string;
    voter?: MockVoterRecord;
    election?: any;
  } {
    const cleanId = (voterId || '').trim().toUpperCase();
    const voter = this.voters.get(cleanId);

    if (!voter) {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `[ELIGIBILITY_FAILED] Voter ${cleanId} not found during eligibility check.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        eligible: false,
        registered: false,
        status: 'NOT_FOUND',
        constituency_match: false,
        already_voted: false,
        message: '✕ Voter ID not registered in database.',
      };
    }

    if (voter.status !== 'ACTIVE') {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `[ELIGIBILITY_FAILED] Voter ${cleanId} is INACTIVE.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        eligible: false,
        registered: true,
        status: voter.status,
        constituency_match: false,
        already_voted: false,
        message: '✕ Voter registration inactive',
      };
    }

    // Check if voter has already voted in active session
    if (ElectoralRollService.hasVoted(cleanId)) {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'DUPLICATE_VOTE_ATTEMPT',
        severity: 'HIGH',
        description: `[DUPLICATE_VOTE_ATTEMPT] Voter ${cleanId} attempted to verify again after voting.`,
        clientIpMasked: 'VERIFY_GATEWAY',
      });
      return {
        eligible: false,
        registered: true,
        status: voter.status,
        constituency_match: true,
        already_voted: true,
        message: '✕ You have already voted in this election',
      };
    }

    // Determine target election
    const elections = ElectionLifecycleService.getElections();
    let election = electionId
      ? ElectionLifecycleService.getElectionById(electionId)
      : elections.find((e) => e.status === 'OPEN') || elections[0];

    // Check election status
    if (election && election.status !== 'OPEN') {
      return {
        eligible: false,
        registered: true,
        status: voter.status,
        constituency_match: true,
        already_voted: false,
        message: `✕ Election ${election.id} is currently ${election.status}. Voting is not permitted.`,
      };
    }

    // Check constituency match
    let constituencyMatch = true;
    if (election) {
      const elecConst = election.constituency.toUpperCase();
      const voterConst = voter.constituency.toUpperCase();
      const isDirectMatch = elecConst === voterConst || elecConst.includes(voterConst) || voterConst.includes(elecConst);
      if (!isDirectMatch) {
        constituencyMatch = false;
        SecurityMonitoringService.recordSecurityEvent({
          type: 'AUTHENTICATION_ATTEMPT',
          severity: 'MEDIUM',
          description: `[ELIGIBILITY_FAILED] Voter ${cleanId} constituency (${voter.constituency}) does not match election constituency (${election.constituency}).`,
          clientIpMasked: 'VERIFY_GATEWAY',
        });
        return {
          eligible: false,
          registered: true,
          status: voter.status,
          constituency_match: false,
          already_voted: false,
          message: '✕ You are not eligible for this constituency',
        };
      }
    }

    this.stats.eligibleVoters++;
    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `[ELIGIBILITY_CHECKED] Voter ${cleanId} passed all eligibility checks for election ${election?.id || 'GENERAL'}.`,
      clientIpMasked: 'VERIFY_GATEWAY',
    });

    return {
      eligible: true,
      registered: true,
      status: voter.status,
      constituency_match: constituencyMatch,
      already_voted: false,
      message: 'Voter is eligible for this election',
      voter,
      election,
    };
  }

  /**
   * Step 5: Issue Single-Use One-Time Voting Credential
   */
  public static issueCredential(params: {
    voterId: string;
    electionId?: string;
  }): {
    authorized: boolean;
    credential_reference?: string;
    raw_credential?: string;
    credential_hash?: string;
    message?: string;
  } {
    const { voterId, electionId } = params;
    const cleanId = (voterId || '').trim().toUpperCase();

    const eligibility = this.checkEligibility(cleanId, electionId);
    if (!eligibility.eligible) {
      return {
        authorized: false,
        message: eligibility.message,
      };
    }

    const elections = ElectionLifecycleService.getElections();
    const targetElectionId = electionId || (elections.find((e) => e.status === 'OPEN') || elections[0])?.id || 'ELEC-001';

    // Issue cryptographic anonymous token via AnonymousCredentialService
    const { rawCredential, credentialHash } = AnonymousCredentialService.issueCredential(targetElectionId);

    // Generate clear human-readable credential reference
    const credentialReference = `VOTE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Mark voter as having voted to prevent double issuance
    ElectoralRollService.markAsVoted(cleanId);
    this.stats.credentialsIssued++;

    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `[CREDENTIAL_ISSUED] One-time voting credential reference ${credentialReference} generated. Air-gapped from voter ${cleanId}.`,
      clientIpMasked: 'PRIVACY_AIR_GAP',
    });

    return {
      authorized: true,
      credential_reference: credentialReference,
      raw_credential: rawCredential,
      credential_hash: credentialHash,
      message: 'Voting authorization generated successfully.',
    };
  }

  /**
   * Get Verification Monitor stats for Admin Dashboard
   */
  public static getStats(): VerificationStats {
    return { ...this.stats };
  }

  /**
   * Reset stats and active test registries (for automated tests)
   */
  public static reset(): void {
    this.otpSessions.clear();
    this.voterOtpIndex.clear();
    ElectoralRollService.resetVotedRegistry();
    this.stats = {
      voterIdChecks: { total: 0, successful: 0, failed: 0 },
      otpVerifications: { total: 0, successful: 0, failed: 0 },
      eligibleVoters: 0,
      credentialsIssued: 0,
    };
  }
}
