/**
 * Core Types for National Privacy-Preserving E-Voting Architecture
 */

export type UserRole = 'VOTER' | 'ELECTION_AUTHORITY' | 'AUDITOR' | 'SYSTEM_ADMIN';

export type ElectionStatus = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'OPEN'
  | 'CLOSED'
  | 'TALLYING'
  | 'AUDITING'
  | 'RESULT_PUBLISHED';

export type CandidateStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED';
export type CandidateType = 'Party' | 'Independent';

export interface Candidate {
  id: string;
  electionId: string;
  name: string;
  party: string;
  candidateType: CandidateType;
  constituency: string;
  symbol: string;
  photo?: string;
  description: string;
  information: string;
  status: CandidateStatus;
  profileSummary?: string; // backwards compatibility
  orderNumber: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Election {
  id: string;
  title: string;
  description?: string;
  constituency: string;
  state: string;
  type: 'PARLIAMENTARY' | 'ASSEMBLY' | 'MUNICIPAL';
  status: ElectionStatus;
  startTime: string;
  endTime: string;
  rules: {
    maxSelections: number;
    allowNOTA: boolean;
    requireMFAForAuthority: boolean;
    seniorAccessibilityEnabled: boolean;
  };
  languages?: string[];
  totalEligibleVoters: number;
  createdAt: string;
  updatedAt: string;
}

export type CredentialStatus = 'ISSUED' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface VotingCredential {
  id: string;
  credentialHash: string; // SHA-256 of the raw credential
  electionId: string;
  status: CredentialStatus;
  issuedAt: string;
  expiresAt: string;
  usedAt?: string;
  transactionReference?: string;
}

export interface BallotCommitment {
  electionId: string;
  ballotCommitment: string; // SHA-256(candidateId + voterSecretNonce)
  credentialHash: string;
  timestamp: string;
  transactionReference: string;
  blockIndex?: number;
  blockHash?: string;
}

export interface BlockchainTransaction {
  transactionReference: string;
  electionId: string;
  ballotCommitment: string;
  credentialHash: string;
  timestamp: string;
  signature: string;
  status: 'COMMITTED' | 'REJECTED';
  rejectionReason?: string;
}

export interface BlockchainBlock {
  index: number;
  previousHash: string;
  timestamp: string;
  merkleRoot: string;
  hash: string;
  transactions: BlockchainTransaction[];
  validatorSignature: string;
  channelId: string;
}

export interface ElectoralRollRecord {
  voterId: string; // EPIC (e.g. ABC1234567)
  fullNameMasked: string; // E.g. "R***** K****" (never unmasked on public logs)
  constituency: string;
  state: string;
  isRegistered: boolean;
  hasVotedInCurrentElection: boolean;
  eligibilityStatus: 'ELIGIBLE' | 'INELIGIBLE_ALREADY_VOTED' | 'INELIGIBLE_NOT_REGISTERED' | 'CONSTITUENCY_MISMATCH';
}

export interface UIDAIConfigState {
  environment: 'unconfigured' | 'sandbox' | 'production';
  enabled: boolean;
  authUrlConfigured: boolean;
  otpUrlConfigured: boolean;
  certificatesLoaded: boolean;
  statusMessage: string;
}

export interface UIDAIOTPResponse {
  transaction_id?: string;
  status: 'OTP_REQUESTED' | 'UNCONFIGURED' | 'FAILED';
  message: string;
  error_code?: string;
}

export interface UIDAIAuthResponse {
  status: 'AUTHENTICATED' | 'AUTHENTICATION_FAILED' | 'UNCONFIGURED';
  transaction_id?: string;
  authentication_reference?: string;
  authenticated_at?: string;
  reason_code?: string;
  message: string;
}

export interface AuditCheckItem {
  id: string;
  name: string;
  description: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  details: string;
  timestamp: string;
}

export interface ElectionAuditReport {
  electionId: string;
  auditStatus: 'AUDIT_PASS' | 'AUDIT_WARNING' | 'AUDIT_FAILURE';
  generatedAt: string;
  auditorOrg: string;
  totalCredentialsIssued: number;
  totalCredentialsUsed: number;
  totalBlockchainTransactions: number;
  validBallotsRecorded: number;
  rejectedTransactions: number;
  blockChainHeight: number;
  merkleChainVerified: boolean;
  checks: AuditCheckItem[];
  tallySummary?: {
    candidateId: string;
    candidateName: string;
    party: string;
    voteCount: number;
    percentage: number;
  }[];
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 
    | 'AUTHENTICATION_ATTEMPT'
    | 'SUSPICIOUS_REQUEST'
    | 'DUPLICATE_VOTE_ATTEMPT'
    | 'RATE_LIMITED'
    | 'REJECTED_TRANSACTION'
    | 'ADMIN_ACTION'
    | 'AUDIT_TRIGGERED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  correlationId: string;
  clientIpMasked: string;
}

export interface AdminAuditEvent {
  id: string;
  admin_id: string;
  action: string;
  election_id?: string;
  candidate_id?: string;
  timestamp: string;
  request_id: string;
  result: 'SUCCESS' | 'FAILURE';
  details?: string;
}

export interface SystemHealthState {
  database: 'HEALTHY' | 'DEGRADED' | 'NOT CONFIGURED' | 'UNAVAILABLE';
  redis: 'HEALTHY' | 'DEGRADED' | 'NOT CONFIGURED' | 'UNAVAILABLE';
  backend: 'HEALTHY' | 'DEGRADED' | 'NOT CONFIGURED' | 'UNAVAILABLE';
  blockchain: 'HEALTHY' | 'DEGRADED' | 'NOT CONFIGURED' | 'UNAVAILABLE';
  uidai: 'HEALTHY' | 'DEGRADED' | 'NOT CONFIGURED' | 'UNAVAILABLE';
  electoralRoll: 'HEALTHY' | 'DEGRADED' | 'NOT CONFIGURED' | 'UNAVAILABLE';
}

export interface AccessibilityPreferences {
  seniorCitizenMode: boolean;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  language: 'en' | 'ta';
  speechAssistance: boolean;
}

// User & RBAC interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  createdAt: string;
}

export interface AdminProfile {
  userId: string;
  badgeNumber: string;
  department: string;
  mfaEnabled: boolean;
  lastLoginAt?: string;
}

export interface VoterProfile {
  voterId: string; // EPIC
  authenticatedAadhaarRef?: string;
  constituency: string;
  state: string;
  hasVoted: boolean;
  issuedTokenHash?: string;
}
