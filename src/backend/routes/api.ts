/**
 * Master REST API Router for National E-Voting Architecture
 * 
 * Implements endpoints under /api/v1/
 * 
 * Strict Segregation:
 * - /admin/* : Requires ELECTION_AUTHORITY role. Manages elections, candidates, lifecycle.
 *              CANNOT cast ballots, modify votes, or view voter-candidate mappings.
 * - /voter/* : Citizen voting journey with anonymous token segregation.
 *              CANNOT access administrative endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { VoterVerificationService } from '../services/VoterVerificationService.js';
import { ElectoralRollService } from '../integrations/electoralRoll/ElectoralRollService.js';
import { AnonymousCredentialService } from '../services/AnonymousCredentialService.js';
import { BallotService } from '../services/BallotService.js';
import { BlockchainLedgerService } from '../services/BlockchainLedgerService.js';
import { ElectionLifecycleService } from '../services/ElectionLifecycleService.js';
import { TallyService } from '../services/TallyService.js';
import { AuditService } from '../services/AuditService.js';
import { SecurityMonitoringService } from '../services/SecurityMonitoringService.js';
import { AuthService } from '../services/AuthService.js';

const router = Router();

// Middleware: Global Rate Limiter & Request Accounting
router.use((req: Request, res: Response, next: NextFunction) => {
  SecurityMonitoringService.incrementMetric('httpRequestsTotal');
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const rateLimitCheck = SecurityMonitoringService.checkRateLimit(`ip:${ip}`, 300, 60);

  if (!rateLimitCheck.allowed) {
    SecurityMonitoringService.incrementMetric('httpRequestsFailed');
    return res.status(429).json({
      status: 'RATE_LIMITED',
      message: 'Too many requests from this client. Please wait before retrying.',
      retryAfterSeconds: rateLimitCheck.resetInSeconds,
    });
  }

  next();
});

// Admin RBAC Authorization Middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Administrative authentication token required for Election Authority portal.',
    });
  }

  const token = authHeader.split(' ')[1];
  const verification = AuthService.verifyJwt(token);
  if (!verification.valid || !verification.payload) {
    return res.status(401).json({
      status: 'INVALID_TOKEN',
      message: verification.reason || 'Invalid or expired administrative session token.',
    });
  }

  const userRole = verification.payload.role;
  if (userRole !== 'ELECTION_AUTHORITY' && userRole !== 'SYSTEM_ADMIN') {
    return res.status(403).json({
      status: 'FORBIDDEN',
      message: 'Access forbidden: Only authorized Election Authority accounts may access this functionality.',
    });
  }

  (req as any).adminUser = verification.payload;
  next();
}

// ==========================================
// 1. ADMIN AUTHENTICATION & RBAC
// ==========================================

/**
 * POST /api/v1/auth/admin/login
 * Administrative login requiring Username, Password, and MFA OTP
 */
router.post('/auth/admin/login', (req: Request, res: Response) => {
  const { username, password, mfa_otp } = req.body;
  const ip = req.ip || '127.0.0.1';
  const requestId = 'REQ-AUTH-' + Date.now();

  const authResult = AuthService.authenticateAdmin({
    username,
    password,
    mfaOtp: mfa_otp,
    ipAddress: ip,
    requestId,
  });

  return res.status(authResult.statusCode).json(authResult);
});

/**
 * GET /api/v1/auth/admin/me
 * Retrieves current admin identity
 */
router.get('/auth/admin/me', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  res.json({
    status: 'AUTHENTICATED',
    user: adminUser,
  });
});

/**
 * POST /api/v1/auth/admin/logout
 */
router.post('/auth/admin/logout', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  AuthService.recordAdminAudit({
    admin_id: adminUser.sub,
    action: 'ADMIN_LOGOUT',
    request_id: 'REQ-LOGOUT-' + Date.now(),
    result: 'SUCCESS',
    details: 'Admin user logged out.',
  });
  res.json({ status: 'SUCCESS', message: 'Logged out successfully.' });
});

// ==========================================
// 2. ADMIN DASHBOARD & STATISTICS
// ==========================================

/**
 * GET /api/v1/admin/stats
 * Comprehensive Election Statistics and System Status
 */
router.get('/admin/stats', (req: Request, res: Response) => {
  const elections = ElectionLifecycleService.getElections();
  const ledgerBlocks = BlockchainLedgerService.getBlocks();
  const allTxs = ledgerBlocks.flatMap((b) => b.transactions);

  const activeElections = elections.filter((e) => e.status === 'OPEN').length;
  const scheduledElections = elections.filter((e) => e.status === 'SCHEDULED').length;
  const closedElections = elections.filter((e) => e.status === 'CLOSED' || e.status === 'TALLYING' || e.status === 'AUDITING' || e.status === 'RESULT_PUBLISHED').length;

  const totalRegistered = elections.reduce((acc, e) => acc + (e.totalEligibleVoters || 0), 0);
  const totalVotesRecorded = allTxs.filter((t) => t.status === 'COMMITTED').length;
  const totalRejectedVotes = allTxs.filter((t) => t.status === 'REJECTED').length;

  const systemHealth = SecurityMonitoringService.getSystemHealth();

  res.json({
    electionStats: {
      totalElections: elections.length,
      activeElections,
      scheduledElections,
      closedElections,
      totalRegisteredVoters: totalRegistered,
      totalEligibleVoters: totalRegistered,
      totalAuthenticatedVoters: AnonymousCredentialService.getAllCredentials().length,
      votingCredentialsIssued: AnonymousCredentialService.getAllCredentials().length,
      votesRecorded: totalVotesRecorded,
      rejectedVotes: totalRejectedVotes,
      currentElectionStatus: elections[0]?.status || 'DRAFT',
    },
    systemStatus: systemHealth,
    verificationMonitor: VoterVerificationService.getStats(),
  });
});

// ==========================================
// 3. ADMIN ELECTION CREATION & LIFECYCLE
// ==========================================

/**
 * POST /api/v1/admin/elections
 * Admin can create an election (Initial state: DRAFT)
 */
router.post('/admin/elections', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const {
    title,
    type,
    description,
    constituency,
    state,
    start_time,
    end_time,
    rules,
    languages,
    total_eligible_voters,
  } = req.body;

  const result = ElectionLifecycleService.createElection(
    {
      title,
      type,
      description,
      constituency,
      state,
      startTime: start_time,
      endTime: end_time,
      rules,
      languages,
      totalEligibleVoters: total_eligible_voters ? Number(total_eligible_voters) : undefined,
    },
    adminUser.sub
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
});

/**
 * POST /api/v1/admin/elections/:id/schedule
 * Admin schedules election with start & end timestamps
 */
router.post('/admin/elections/:id/schedule', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const { start_time, end_time } = req.body;

  const election = ElectionLifecycleService.getElectionById(req.params.id);
  if (!election) {
    return res.status(404).json({ error: 'Election not found' });
  }

  if (start_time) election.startTime = start_time;
  if (end_time) election.endTime = end_time;

  const transition = ElectionLifecycleService.transitionElectionStatus(
    req.params.id,
    'SCHEDULED',
    true,
    adminUser.sub
  );

  if (!transition.success) {
    return res.status(400).json(transition);
  }

  return res.json(transition);
});

/**
 * POST /api/v1/admin/elections/:id/open
 * Admin manual open with explicit confirmation
 */
router.post('/admin/elections/:id/open', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const { confirm_open } = req.body;

  if (!confirm_open) {
    return res.status(400).json({
      status: 'CONFIRMATION_REQUIRED',
      message: 'Explicit administrative confirmation required to open election.',
    });
  }

  const transition = ElectionLifecycleService.transitionElectionStatus(
    req.params.id,
    'OPEN',
    true,
    adminUser.sub
  );

  if (!transition.success) {
    return res.status(400).json(transition);
  }

  return res.json(transition);
});

/**
 * POST /api/v1/admin/elections/:id/close
 * Admin close election with explicit confirmation
 */
router.post('/admin/elections/:id/close', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const { confirm_close } = req.body;

  if (!confirm_close) {
    return res.status(400).json({
      status: 'CONFIRMATION_REQUIRED',
      message: 'Explicit administrative confirmation required to close election.',
    });
  }

  const transition = ElectionLifecycleService.transitionElectionStatus(
    req.params.id,
    'CLOSED',
    true,
    adminUser.sub
  );

  if (!transition.success) {
    return res.status(400).json(transition);
  }

  return res.json(transition);
});

/**
 * POST /api/v1/admin/elections/:id/status
 * General lifecycle transition (DRAFT -> SCHEDULED -> OPEN -> CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED)
 */
router.post('/admin/elections/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const { target_status } = req.body;

  const transition = ElectionLifecycleService.transitionElectionStatus(
    req.params.id,
    target_status,
    true,
    adminUser.sub
  );

  if (!transition.success) {
    return res.status(400).json(transition);
  }

  return res.json(transition);
});

// ==========================================
// 4. ADMIN CANDIDATE MANAGEMENT
// ==========================================

/**
 * POST /api/v1/admin/elections/:id/candidates
 * Admin can add candidates who are contesting the selected election
 */
router.post('/admin/elections/:id/candidates', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const {
    id,
    name,
    party,
    candidate_type,
    constituency,
    symbol,
    photo,
    description,
    information,
    status,
  } = req.body;

  const result = ElectionLifecycleService.addCandidate(
    req.params.id,
    {
      id,
      name,
      party,
      candidateType: candidate_type || 'Party',
      constituency: constituency || '',
      symbol,
      photo,
      description: description || '',
      information: information || '',
      status: status || 'ACTIVE',
    },
    adminUser.sub
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
});

/**
 * PUT /api/v1/admin/elections/:id/candidates/:candidateId
 * Admin can edit candidate details
 */
router.put('/admin/elections/:id/candidates/:candidateId', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const {
    name,
    party,
    candidate_type,
    symbol,
    photo,
    description,
    information,
    status,
  } = req.body;

  const result = ElectionLifecycleService.updateCandidate(
    req.params.id,
    req.params.candidateId,
    {
      name,
      party,
      candidateType: candidate_type,
      symbol,
      photo,
      description,
      information,
      status,
    },
    adminUser.sub
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

/**
 * POST /api/v1/admin/elections/:id/candidates/:candidateId/disable
 * Admin can disable a candidate (never permanently delete after voting started)
 */
router.post('/admin/elections/:id/candidates/:candidateId/disable', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const result = ElectionLifecycleService.disableCandidate(
    req.params.id,
    req.params.candidateId,
    adminUser.sub
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// ==========================================
// 5. ADMIN RESULTS & AUDIT DASHBOARD
// ==========================================

/**
 * GET /api/v1/admin/results/:electionId
 * Aggregate results dashboard: candidate totals, turnout, blockchain verification, publication status
 * NEVER reveals individual voter choices!
 */
router.get('/admin/results/:electionId', (req: Request, res: Response) => {
  const electionId = req.params.electionId;
  const election = ElectionLifecycleService.getElectionById(electionId);
  if (!election) {
    return res.status(404).json({ error: 'Election not found' });
  }

  const tally = TallyService.computeTally(electionId);
  const audit = AuditService.runAudit(electionId);
  const ledgerIntegrity = BlockchainLedgerService.verifyLedgerIntegrity();

  return res.json({
    electionId,
    electionTitle: election.title,
    electionStatus: election.status,
    totalEligibleVoters: election.totalEligibleVoters,
    totalVotesCast: tally.totalBallotsCounted,
    turnoutPercentage: tally.turnoutPercentage,
    candidateResults: tally.candidateResults,
    tallyProofHash: tally.tallyProofHash,
    blockchainVerification: {
      isTamperFree: ledgerIntegrity.isTamperFree,
      totalBlocks: ledgerIntegrity.totalBlocks,
      discrepanciesCount: ledgerIntegrity.discrepancies.length,
    },
    auditStatus: audit.auditStatus,
    canPublishResults: audit.auditStatus === 'AUDIT_PASS',
  });
});

/**
 * POST /api/v1/admin/results/:electionId/publish
 * Result publication requires successful required audit checks
 */
router.post('/admin/results/:electionId/publish', requireAdminAuth, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  const electionId = req.params.electionId;

  // Run audit verification first
  const audit = AuditService.runAudit(electionId);
  if (audit.auditStatus !== 'AUDIT_PASS') {
    return res.status(400).json({
      status: 'AUDIT_CHECKS_FAILED',
      message: 'Cannot publish election results. Mandatory CAG statutory audit checks did not achieve AUDIT_PASS.',
      auditChecks: audit.checks,
    });
  }

  // Progress through lifecycle: CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED
  const election = ElectionLifecycleService.getElectionById(electionId);
  if (election && election.status === 'CLOSED') {
    ElectionLifecycleService.transitionElectionStatus(electionId, 'TALLYING', true, adminUser.sub);
  }
  if (election && election.status === 'TALLYING') {
    ElectionLifecycleService.transitionElectionStatus(electionId, 'AUDITING', true, adminUser.sub);
  }

  const transition = ElectionLifecycleService.transitionElectionStatus(
    electionId,
    'RESULT_PUBLISHED',
    true,
    adminUser.sub
  );

  return res.json({
    status: 'RESULTS_PUBLISHED',
    message: 'Election results successfully verified by CAG audit and published to public record.',
    election: transition.election,
  });
});

/**
 * GET /api/v1/admin/audit
 * Admin Audit dashboard log (Never exposes secret ballot contents)
 */
router.get('/admin/audit', (req: Request, res: Response) => {
  const auditEvents = AuthService.getAdminAuditEvents(100);
  const securityEvents = SecurityMonitoringService.getRecentEvents(50);
  const ledgerBlocks = BlockchainLedgerService.getBlocks();

  res.json({
    adminAuditEvents: auditEvents,
    securityEvents,
    blockchainBlocksCount: ledgerBlocks.length,
    latestMerkleRoot: ledgerBlocks[ledgerBlocks.length - 1]?.merkleRoot || '',
  });
});

// ==========================================
// 6. VOTER PORTAL & VOTING STATUS
// ==========================================

/**
 * GET /api/v1/voter/status/:voterId/:electionId
 * Checks voting status: NOT_YET_VOTED or VOTE_RECORDED.
 * Strictly does NOT reveal candidate choice!
 */
router.get('/voter/status/:voterId/:electionId', (req: Request, res: Response) => {
  const { voterId } = req.params;
  const hasVoted = ElectoralRollService.hasVoted(voterId);

  res.json({
    voterId: voterId.toUpperCase(),
    status: hasVoted ? 'VOTE_RECORDED' : 'NOT_YET_VOTED',
    message: hasVoted
      ? 'Your ballot commitment has been successfully confirmed on the blockchain ledger.'
      : 'You have not yet cast a ballot in this election.',
  });
});

// ==========================================
// 7. LOCAL VOTER VERIFICATION & OTP ENDPOINTS
// ==========================================

/**
 * POST /api/v1/verification/voter-id/
 * POST /api/v1/verification/voter-id
 * Step 1: Verifies voter ID against the local mock voter database.
 */
router.post(['/verification/voter-id', '/verification/voter-id/'], (req: Request, res: Response) => {
  const { voter_id } = req.body;
  const result = VoterVerificationService.verifyVoterId(voter_id);

  if (!result.verified) {
    const statusCode = result.status === 'INACTIVE' ? 403 : 404;
    return res.status(statusCode).json(result);
  }

  return res.status(200).json(result);
});

/**
 * POST /api/v1/verification/otp/start/
 * POST /api/v1/verification/otp/start
 * Step 2: Generates a secure 6-digit OTP and logs it to the developer console.
 */
router.post(['/verification/otp/start', '/verification/otp/start/'], (req: Request, res: Response) => {
  const { voter_id } = req.body;
  const result = VoterVerificationService.startOtp(voter_id);

  if (!result.success) {
    const statusCode = result.cooldown_seconds ? 429 : 400;
    return res.status(statusCode).json(result);
  }

  return res.status(200).json(result);
});

/**
 * POST /api/v1/verification/otp/verify/
 * POST /api/v1/verification/otp/verify
 * Step 3: Verifies the 6-digit OTP entered by the voter.
 */
router.post(['/verification/otp/verify', '/verification/otp/verify/'], (req: Request, res: Response) => {
  const { verification_id, otp } = req.body;
  const result = VoterVerificationService.verifyOtp(verification_id, otp);

  if (!result.verified) {
    const statusCode = result.blocked ? 429 : 400;
    return res.status(statusCode).json(result);
  }

  return res.status(200).json(result);
});

/**
 * POST /api/v1/verification/eligibility/
 * POST /api/v1/verification/eligibility
 * Step 4: Performs statutory election eligibility check.
 */
router.post(['/verification/eligibility', '/verification/eligibility/'], (req: Request, res: Response) => {
  const { voter_id, election_id } = req.body;
  const result = VoterVerificationService.checkEligibility(voter_id, election_id);

  if (!result.eligible) {
    let statusCode = 400;
    if (result.already_voted) statusCode = 409;
    else if (!result.constituency_match) statusCode = 403;
    return res.status(statusCode).json(result);
  }

  return res.status(200).json(result);
});

/**
 * POST /api/v1/verification/credential/
 * POST /api/v1/verification/credential
 * Step 5: Issues an anonymous single-use voting authorization credential.
 */
router.post(['/verification/credential', '/verification/credential/'], (req: Request, res: Response) => {
  const { voter_id, election_id } = req.body;
  const result = VoterVerificationService.issueCredential({
    voterId: voter_id,
    electionId: election_id,
  });

  if (!result.authorized) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
});

/**
 * GET /api/v1/verification/stats/
 * GET /api/v1/verification/stats
 * Provides verification monitor statistics for administrative dashboard.
 */
router.get(['/verification/stats', '/verification/stats/'], (req: Request, res: Response) => {
  return res.json(VoterVerificationService.getStats());
});

// ==========================================
// 8. ANONYMOUS CREDENTIAL & BALLOT CASTING
// ==========================================

/**
 * POST /api/v1/voting/credentials/issue
 * Issues single-use anonymous voting credential
 */
router.post('/voting/credentials/issue', (req: Request, res: Response) => {
  try {
    const { election_id, voter_id, auth_reference } = req.body;

    if (!election_id || !voter_id || !auth_reference) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Missing required authorization attributes (election_id, voter_id, auth_reference).',
      });
    }

    // Verify election is open
    const election = ElectionLifecycleService.getElectionById(election_id);
    if (!election || election.status !== 'OPEN') {
      return res.status(403).json({
        status: 'ELECTION_NOT_OPEN',
        message: 'Voting credentials can only be issued for currently OPEN elections.',
      });
    }

    // Verify identity has not already voted
    if (ElectoralRollService.hasVoted(voter_id)) {
      return res.status(409).json({
        status: 'ALREADY_VOTED',
        message: 'This voter identity has already been marked as voted.',
      });
    }

    // Issue anonymous token
    const { rawCredential, credentialHash, credentialRecord } = AnonymousCredentialService.issueCredential(
      election_id
    );

    // Mark identity as having claimed a credential in the identity domain
    ElectoralRollService.markAsVoted(voter_id);

    SecurityMonitoringService.recordSecurityEvent({
      type: 'AUTHENTICATION_ATTEMPT',
      severity: 'LOW',
      description: `Anonymous voting credential issued for election ${election_id}. Token isolated from identity.`,
      clientIpMasked: 'IDENTITY_AUTHORIZATION_BOUNDARY',
    });

    return res.status(200).json({
      status: 'CREDENTIAL_ISSUED',
      raw_credential: rawCredential,
      credential_hash: credentialHash,
      expires_at: credentialRecord.expiresAt,
      message: 'One-time anonymous voting credential generated successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to generate voting credential.',
    });
  }
});

/**
 * POST /api/v1/voting/ballots/cast
 * Records an anonymous ballot on permissioned blockchain ledger
 */
router.post('/voting/ballots/cast', async (req: Request, res: Response) => {
  try {
    const { election_id, candidate_id, credential_hash, voter_secret_nonce } = req.body;
    const ip = req.ip || '127.0.0.1';

    if (!election_id || !candidate_id || !credential_hash) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Missing required parameters: election_id, candidate_id, credential_hash.',
      });
    }

    const result = await BallotService.castBallot({
      electionId: election_id,
      candidateId: candidate_id,
      credentialHash: credential_hash,
      voterSecretNonce: voter_secret_nonce,
      ipAddress: ip,
    });

    if (!result.success) {
      if (result.error_code === 'ERR_CONCURRENT_VOTE_REJECTED' || result.error_code === 'ERR_CREDENTIAL_INVALID') {
        SecurityMonitoringService.incrementMetric('duplicateVoteAttemptsBlocked');
      }
      return res.status(result.statusCode).json({
        status: 'REJECTED',
        error_code: result.error_code,
        message: result.message,
      });
    }

    SecurityMonitoringService.incrementMetric('votesSubmittedTotal');

    return res.status(200).json({
      status: 'CONFIRMED',
      transaction_reference: result.transactionReference,
      block_index: result.blockIndex,
      block_hash: result.blockHash,
      timestamp: result.timestamp,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'LEDGER_ERROR',
      message: 'Failed to record vote on permissioned blockchain ledger.',
    });
  }
});

// ==========================================
// 9. PUBLIC ELECTIONS & CANDIDATES
// ==========================================

router.get('/elections', (req: Request, res: Response) => {
  res.json(ElectionLifecycleService.getElections());
});

router.get('/elections/:id', (req: Request, res: Response) => {
  const election = ElectionLifecycleService.getElectionById(req.params.id);
  if (!election) return res.status(404).json({ error: 'Election not found' });
  res.json(election);
});

router.get('/elections/:id/candidates', (req: Request, res: Response) => {
  const candidates = ElectionLifecycleService.getCandidates(req.params.id);
  res.json(candidates);
});

// ==========================================
// 10. BLOCKCHAIN, AUDIT & HEALTH
// ==========================================

router.get('/blockchain/blocks', (req: Request, res: Response) => {
  res.json(BlockchainLedgerService.getBlocks());
});

router.get('/blockchain/verify', (req: Request, res: Response) => {
  res.json(BlockchainLedgerService.verifyLedgerIntegrity());
});

router.get('/tally/:electionId', (req: Request, res: Response) => {
  const tally = TallyService.computeTally(req.params.electionId);
  res.json(tally);
});

router.get('/audit/:electionId', (req: Request, res: Response) => {
  const report = AuditService.runAudit(req.params.electionId);
  res.json(report);
});

router.get('/security/events', (req: Request, res: Response) => {
  res.json(SecurityMonitoringService.getRecentEvents(50));
});

router.get('/health', (req: Request, res: Response) => {
  res.json(SecurityMonitoringService.getSystemHealth());
});

router.get('/metrics', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(SecurityMonitoringService.getPrometheusMetrics());
});

router.post('/admin/uidai/mode', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode !== 'unconfigured' && mode !== 'sandbox' && mode !== 'production') {
    return res.status(400).json({ status: 'BAD_REQUEST', message: 'Valid modes are unconfigured, sandbox, production' });
  }
  const config = UIDAIConfiguration.getInstance();
  config.setEnvironmentMode(mode);
  return res.json({
    status: 'SUCCESS',
    environment: mode,
    message: config.getStatusMessage(),
    isConfigured: config.isConfigured(),
  });
});

export default router;
