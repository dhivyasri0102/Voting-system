/**
 * Election Lifecycle & Candidate Management Service
 * 
 * Enforces strict Election State Transitions:
 * DRAFT -> SCHEDULED -> OPEN -> CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED
 * 
 * Strict Candidate Validation:
 * - Candidates belong strictly to their intended election and constituency.
 * - Candidates are never hard-deleted once voting has started; they are marked DISABLED.
 * - Every candidate lifecycle action generates an immutable audit event.
 */

import crypto from 'crypto';
import { Election, Candidate, ElectionStatus, CandidateStatus, CandidateType } from '../../types/index.js';
import { AuthService } from './AuthService.js';
import { SecurityMonitoringService } from './SecurityMonitoringService.js';

export class ElectionLifecycleService {
  private static elections = new Map<string, Election>();
  private static candidates = new Map<string, Candidate[]>(); // electionId -> Candidate[]

  static {
    this.seedDefaultElection();
  }

  private static seedDefaultElection(): void {
    const electionId = 'ELEC-2026-CHENN-01';

    const defaultElection: Election = {
      id: electionId,
      title: 'Parliamentary General Election 2026',
      description: 'General election to elect the Member of Parliament representing Chennai Central Parliamentary Constituency.',
      constituency: 'Central Chennai (Constituency No. 04)',
      state: 'Tamil Nadu',
      type: 'PARLIAMENTARY',
      status: 'OPEN',
      startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 86400 * 1000 * 3).toISOString(),
      rules: {
        maxSelections: 1,
        allowNOTA: true,
        requireMFAForAuthority: true,
        seniorAccessibilityEnabled: true,
      },
      languages: ['en', 'ta'],
      totalEligibleVoters: 1250000,
      createdAt: new Date(Date.now() - 86400 * 1000 * 7).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const defaultCandidates: Candidate[] = [
      {
        id: 'CAND-01',
        electionId,
        name: 'Dr. K. Anbazhagan',
        party: 'National Democratic Alliance (NDA)',
        candidateType: 'Party',
        symbol: 'Lotus',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        constituency: 'Central Chennai (Constituency No. 04)',
        description: 'Public health reformer advocating modern urban clinics and affordable senior care.',
        information: 'Former State Healthcare Commissioner, Ph.D. in Public Health & Urban Governance. 20+ years civic administration experience.',
        profileSummary: 'Former State Healthcare Commissioner, Ph.D. in Public Health & Urban Governance.',
        status: 'ACTIVE',
        orderNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'CAND-02',
        electionId,
        name: 'S. Dayanidhi Meenakshi',
        party: 'United Progressive Front (UPF)',
        candidateType: 'Party',
        symbol: 'Rising Sun',
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        constituency: 'Central Chennai (Constituency No. 04)',
        description: 'Legal scholar and civic infrastructure specialist championing sustainable water management.',
        information: 'Senior Advocate of Madras High Court, Chairperson for Civic Infrastructure & Water Resources. Authored national coastal resilience guidelines.',
        profileSummary: 'Senior Advocate of High Court, Chairperson for Civic Infrastructure & Water Resources.',
        status: 'ACTIVE',
        orderNumber: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'CAND-03',
        electionId,
        name: 'P. Rajeshwari',
        party: 'People Welfare Congress (PWC)',
        candidateType: 'Party',
        symbol: 'Two Leaves',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        constituency: 'Central Chennai (Constituency No. 04)',
        description: 'Community educator promoting grassroots digital literacy and women-led MSME clusters.',
        information: 'Educator, Social Entrepreneur, Former Mayor dedicated to Youth Skill Development and women economic empowerment.',
        profileSummary: 'Educator, Social Entrepreneur, Former Mayor dedicated to Youth Skill Development.',
        status: 'ACTIVE',
        orderNumber: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'CAND-04',
        electionId,
        name: 'NOTA (None of the Above)',
        party: 'Independent Constitutional Option',
        candidateType: 'Independent',
        symbol: 'Cross Ballot Icon',
        photo: '',
        constituency: 'Central Chennai (Constituency No. 04)',
        description: 'Statutory constitutional option under Rule 49-O allowing voters to reject all candidates.',
        information: 'Electoral option under Rule 49-O of the Conduct of Elections Rules, 1961.',
        profileSummary: 'Electoral option under Rule 49-O to record rejection of all candidates.',
        status: 'ACTIVE',
        orderNumber: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this.elections.set(electionId, defaultElection);
    this.candidates.set(electionId, defaultCandidates);
  }

  public static getElections(): Election[] {
    // Check and execute automatic time-based transitions
    this.checkTimeTransitions();
    return Array.from(this.elections.values());
  }

  public static getElectionById(id: string): Election | undefined {
    this.checkTimeTransitions();
    return this.elections.get(id);
  }

  /**
   * Evaluates scheduled start and end times automatically on the backend
   */
  private static checkTimeTransitions(): void {
    const now = Date.now();
    for (const election of this.elections.values()) {
      const startMs = new Date(election.startTime).getTime();
      const endMs = new Date(election.endTime).getTime();

      // SCHEDULED -> OPEN when start time arrived
      if (election.status === 'SCHEDULED' && now >= startMs && now < endMs) {
        election.status = 'OPEN';
        election.updatedAt = new Date().toISOString();
        AuthService.recordAdminAudit({
          admin_id: 'SYSTEM_CLOCK_DAEMON',
          action: 'ELECTION_AUTOMATICALLY_OPENED',
          election_id: election.id,
          request_id: 'SYS-TIME-' + Date.now(),
          result: 'SUCCESS',
          details: `Election ${election.id} automatically opened based on scheduled start time.`,
        });
      }

      // OPEN -> CLOSED when end time passed
      if (election.status === 'OPEN' && now >= endMs) {
        election.status = 'CLOSED';
        election.updatedAt = new Date().toISOString();
        AuthService.recordAdminAudit({
          admin_id: 'SYSTEM_CLOCK_DAEMON',
          action: 'ELECTION_AUTOMATICALLY_CLOSED',
          election_id: election.id,
          request_id: 'SYS-TIME-' + Date.now(),
          result: 'SUCCESS',
          details: `Election ${election.id} automatically closed based on scheduled end time.`,
        });
      }
    }
  }

  /**
   * Strictly retrieves candidates belonging to a specific election.
   * Never leaks or blends candidates across different elections.
   */
  public static getCandidates(electionId: string): Candidate[] {
    const list = this.candidates.get(electionId) || [];
    return [...list];
  }

  public static getCandidateById(electionId: string, candidateId: string): Candidate | undefined {
    const list = this.candidates.get(electionId) || [];
    return list.find((c) => c.id === candidateId);
  }

  /**
   * Enforce valid election state transitions:
   * DRAFT -> SCHEDULED -> OPEN -> CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED
   */
  public static transitionElectionStatus(
    electionId: string,
    targetStatus: ElectionStatus,
    adminMfaVerified = false,
    adminId = 'ADMIN'
  ): { success: boolean; message: string; election?: Election } {
    const election = this.elections.get(electionId);
    if (!election) {
      return { success: false, message: 'Election not found.' };
    }

    if (election.rules.requireMFAForAuthority && !adminMfaVerified) {
      return { success: false, message: 'MFA authorization required for administrative lifecycle transitions.' };
    }

    const current = election.status;

    const validTransitions: Record<ElectionStatus, ElectionStatus[]> = {
      DRAFT: ['SCHEDULED', 'OPEN'],
      SCHEDULED: ['OPEN', 'DRAFT'],
      OPEN: ['CLOSED'],
      CLOSED: ['TALLYING'],
      TALLYING: ['AUDITING'],
      AUDITING: ['RESULT_PUBLISHED', 'CLOSED'], // Can return to closed if audit fails
      RESULT_PUBLISHED: [],
    };

    if (!validTransitions[current]?.includes(targetStatus)) {
      return {
        success: false,
        message: `Illegal state transition from ${current} to ${targetStatus}. Enforced sequence: DRAFT -> SCHEDULED -> OPEN -> CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED.`,
      };
    }

    // Additional validations
    if (targetStatus === 'OPEN') {
      const candidates = this.getCandidates(electionId);
      if (candidates.length < 1) {
        return { success: false, message: 'Cannot open an election with zero registered candidates.' };
      }
    }

    election.status = targetStatus;
    election.updatedAt = new Date().toISOString();
    this.elections.set(electionId, election);

    // Record formal audit event
    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: `ELECTION_${targetStatus}`,
      election_id: electionId,
      request_id: 'REQ-STATUS-' + Date.now(),
      result: 'SUCCESS',
      details: `Transitioned election status from ${current} to ${targetStatus}.`,
    });

    return {
      success: true,
      message: `Election transitioned from ${current} to ${targetStatus} successfully.`,
      election,
    };
  }

  /**
   * Admin: Create Election in DRAFT status
   */
  public static createElection(
    electionData: {
      title: string;
      type: 'PARLIAMENTARY' | 'ASSEMBLY' | 'MUNICIPAL';
      description?: string;
      constituency: string;
      state: string;
      startTime: string;
      endTime: string;
      rules?: Partial<Election['rules']>;
      languages?: string[];
      totalEligibleVoters?: number;
    },
    adminId = 'ADMIN'
  ): { success: boolean; message: string; election?: Election } {
    if (!electionData.title?.trim() || !electionData.constituency?.trim() || !electionData.state?.trim()) {
      return { success: false, message: 'Missing required election fields: title, constituency, state.' };
    }

    const start = new Date(electionData.startTime);
    const end = new Date(electionData.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { success: false, message: 'Invalid start/end time. End time must be strictly after start time.' };
    }

    const id = 'ELEC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();

    const newElection: Election = {
      id,
      title: electionData.title.trim(),
      description: electionData.description?.trim() || '',
      constituency: electionData.constituency.trim(),
      state: electionData.state.trim(),
      type: electionData.type || 'PARLIAMENTARY',
      status: 'DRAFT', // Strictly starts in DRAFT state
      startTime: electionData.startTime,
      endTime: electionData.endTime,
      rules: {
        maxSelections: 1,
        allowNOTA: true,
        requireMFAForAuthority: true,
        seniorAccessibilityEnabled: true,
        ...(electionData.rules || {}),
      },
      languages: electionData.languages || ['en', 'ta'],
      totalEligibleVoters: electionData.totalEligibleVoters || 1000000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.elections.set(id, newElection);
    this.candidates.set(id, []);

    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: 'ELECTION_CREATED',
      election_id: id,
      request_id: 'REQ-ELEC-CREATE-' + Date.now(),
      result: 'SUCCESS',
      details: `Created new election "${newElection.title}" in status DRAFT.`,
    });

    return {
      success: true,
      message: 'Election created successfully in DRAFT state.',
      election: newElection,
    };
  }

  /**
   * Admin: Add Candidate with strict validation
   */
  public static addCandidate(
    electionId: string,
    candidateData: {
      id: string;
      name: string;
      party?: string;
      candidateType: CandidateType;
      constituency: string;
      symbol?: string;
      photo?: string;
      description: string;
      information: string;
      status?: CandidateStatus;
    },
    adminId = 'ADMIN'
  ): { success: boolean; message: string; candidate?: Candidate } {
    const election = this.elections.get(electionId);
    if (!election) {
      return { success: false, message: 'Election not found.' };
    }

    // Prohibit candidate alterations once voting is active/closed
    if (election.status !== 'DRAFT' && election.status !== 'SCHEDULED') {
      return {
        success: false,
        message: `Candidates cannot be added while election is in ${election.status} state. Candidates must be finalized in DRAFT or SCHEDULED phase.`,
      };
    }

    // 1. Required field validations
    if (!candidateData.id?.trim() || !candidateData.name?.trim() || !candidateData.constituency?.trim()) {
      return { success: false, message: 'Candidate ID, Candidate Name, and Constituency are required.' };
    }

    const cleanCandidateId = candidateData.id.trim().toUpperCase();
    const cleanName = candidateData.name.trim();

    // 2. Election association & Constituency Match
    // Candidate constituency must align with election constituency
    if (
      !election.constituency.toLowerCase().includes(candidateData.constituency.trim().toLowerCase()) &&
      !candidateData.constituency.trim().toLowerCase().includes(election.constituency.toLowerCase())
    ) {
      return {
        success: false,
        message: `Candidate constituency (${candidateData.constituency}) does not match election constituency (${election.constituency}).`,
      };
    }

    const currentList = this.candidates.get(electionId) || [];

    // 3. ID Uniqueness within the election
    const existingById = currentList.find((c) => c.id === cleanCandidateId);
    if (existingById) {
      return {
        success: false,
        message: `Candidate with ID "${cleanCandidateId}" already exists in this election. Candidate IDs must be unique.`,
      };
    }

    // 4. Duplicate Candidate Prevention (Name check)
    const existingByName = currentList.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.status !== 'DISABLED'
    );
    if (existingByName) {
      return {
        success: false,
        message: `Candidate with name "${cleanName}" is already registered in this election.`,
      };
    }

    const newCandidate: Candidate = {
      id: cleanCandidateId,
      electionId,
      name: cleanName,
      party: candidateData.candidateType === 'Party' ? candidateData.party?.trim() || 'Unspecified Party' : 'Independent',
      candidateType: candidateData.candidateType || 'Party',
      constituency: election.constituency,
      symbol: candidateData.symbol?.trim() || 'Electoral Symbol',
      photo: candidateData.photo?.trim() || '',
      description: candidateData.description?.trim() || '',
      information: candidateData.information?.trim() || '',
      profileSummary: candidateData.description?.trim() || candidateData.information?.trim() || '',
      status: candidateData.status || 'ACTIVE',
      orderNumber: currentList.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    currentList.push(newCandidate);
    this.candidates.set(electionId, currentList);

    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: 'CANDIDATE_CREATED',
      election_id: electionId,
      candidate_id: cleanCandidateId,
      request_id: 'REQ-CAND-ADD-' + Date.now(),
      result: 'SUCCESS',
      details: `Added candidate "${cleanName}" (${cleanCandidateId}) to election ${electionId}.`,
    });

    return {
      success: true,
      message: 'Candidate added successfully.',
      candidate: newCandidate,
    };
  }

  /**
   * Admin: Edit Candidate
   */
  public static updateCandidate(
    electionId: string,
    candidateId: string,
    updates: Partial<Omit<Candidate, 'id' | 'electionId' | 'orderNumber'>>,
    adminId = 'ADMIN'
  ): { success: boolean; message: string; candidate?: Candidate } {
    const election = this.elections.get(electionId);
    if (!election) {
      return { success: false, message: 'Election not found.' };
    }

    if (election.status !== 'DRAFT' && election.status !== 'SCHEDULED') {
      return {
        success: false,
        message: `Candidate details cannot be altered while election is in ${election.status} state.`,
      };
    }

    const currentList = this.candidates.get(electionId) || [];
    const candidateIndex = currentList.findIndex((c) => c.id === candidateId);
    if (candidateIndex === -1) {
      return { success: false, message: 'Candidate not found in this election.' };
    }

    const existing = currentList[candidateIndex];
    const updatedCandidate: Candidate = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    currentList[candidateIndex] = updatedCandidate;
    this.candidates.set(electionId, currentList);

    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: 'CANDIDATE_UPDATED',
      election_id: electionId,
      candidate_id: candidateId,
      request_id: 'REQ-CAND-UPDATE-' + Date.now(),
      result: 'SUCCESS',
      details: `Updated details for candidate ${candidateId}.`,
    });

    return {
      success: true,
      message: 'Candidate updated successfully.',
      candidate: updatedCandidate,
    };
  }

  /**
   * Admin: Disable Candidate
   * Strictly marks candidate as DISABLED; never hard deletes candidate after voting has started.
   */
  public static disableCandidate(
    electionId: string,
    candidateId: string,
    adminId = 'ADMIN'
  ): { success: boolean; message: string; candidate?: Candidate } {
    const currentList = this.candidates.get(electionId) || [];
    const candidate = currentList.find((c) => c.id === candidateId);
    if (!candidate) {
      return { success: false, message: 'Candidate not found in this election.' };
    }

    candidate.status = 'DISABLED';
    candidate.updatedAt = new Date().toISOString();

    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: 'CANDIDATE_DISABLED',
      election_id: electionId,
      candidate_id: candidateId,
      request_id: 'REQ-CAND-DISABLE-' + Date.now(),
      result: 'SUCCESS',
      details: `Candidate ${candidateId} (${candidate.name}) marked as DISABLED.`,
    });

    return {
      success: true,
      message: `Candidate ${candidate.name} (${candidateId}) has been disabled.`,
      candidate,
    };
  }
}
