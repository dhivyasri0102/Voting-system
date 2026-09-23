/**
 * Election Lifecycle & Candidate Management Service
 * 
 * Enforces strict Election State Transitions:
 * DRAFT -> SCHEDULED -> OPEN -> CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED
 * 
 * Powered by persistent DataStoreService (Zero in-memory mock data arrays).
 * - Candidates belong strictly to their intended election.
 * - Candidates are never hard-deleted once voting has started; they are marked DISABLED.
 * - Every candidate lifecycle action generates an immutable audit event.
 */

import crypto from 'crypto';
import { Election, Candidate, ElectionStatus, CandidateStatus, CandidateType } from '../../types/index.js';
import { AuthService } from './AuthService.js';
import { DataStoreService } from './DataStoreService.js';

export class ElectionLifecycleService {
  public static getElections(): Election[] {
    this.checkTimeTransitions();
    return DataStoreService.getElections();
  }

  public static getElectionById(id: string): Election | undefined {
    this.checkTimeTransitions();
    return DataStoreService.getElectionById(id);
  }

  /**
   * Evaluates scheduled start and end times automatically
   */
  private static checkTimeTransitions(): void {
    const now = Date.now();
    const elections = DataStoreService.getElections();

    for (const election of elections) {
      const startMs = new Date(election.startTime).getTime();
      const endMs = new Date(election.endTime).getTime();

      // SCHEDULED -> OPEN when start time arrived
      if (election.status === 'SCHEDULED' && now >= startMs && now < endMs) {
        election.status = 'OPEN';
        election.updatedAt = new Date().toISOString();
        DataStoreService.saveElection(election);

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
        DataStoreService.saveElection(election);

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
   * Retrieves candidates belonging to a specific election.
   */
  public static getCandidates(electionId: string): Candidate[] {
    return DataStoreService.getCandidates(electionId);
  }

  public static getCandidateById(electionId: string, candidateId: string): Candidate | undefined {
    const list = DataStoreService.getCandidates(electionId);
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
    const election = DataStoreService.getElectionById(electionId);
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
      AUDITING: ['RESULT_PUBLISHED', 'CLOSED'],
      RESULT_PUBLISHED: [],
    };

    if (!validTransitions[current]?.includes(targetStatus)) {
      return {
        success: false,
        message: `Illegal state transition from ${current} to ${targetStatus}. Enforced sequence: DRAFT -> SCHEDULED -> OPEN -> CLOSED -> TALLYING -> AUDITING -> RESULT_PUBLISHED.`,
      };
    }

    if (targetStatus === 'OPEN') {
      const candidates = this.getCandidates(electionId);
      if (candidates.length < 1) {
        return { success: false, message: 'Cannot open an election with zero registered candidates.' };
      }
    }

    election.status = targetStatus;
    election.updatedAt = new Date().toISOString();
    DataStoreService.saveElection(election);

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
      status: 'DRAFT',
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

    DataStoreService.saveElection(newElection);
    DataStoreService.saveCandidates(id, []);

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
   * Admin: Add Candidate
   */
  public static addCandidate(
    electionId: string,
    candidateData: {
      id?: string;
      name: string;
      party?: string;
      candidateType?: CandidateType;
      constituency?: string;
      symbol?: string;
      photo?: string;
      logo?: string;
      description?: string;
      information?: string;
      status?: CandidateStatus;
    },
    adminId = 'ADMIN'
  ): { success: boolean; message: string; candidate?: Candidate } {
    const election = DataStoreService.getElectionById(electionId);
    if (!election) {
      return { success: false, message: 'Election not found.' };
    }

    if (election.status !== 'DRAFT' && election.status !== 'SCHEDULED') {
      return {
        success: false,
        message: `Candidates cannot be added while election is in ${election.status} state.`,
      };
    }

    if (!candidateData.name?.trim()) {
      return { success: false, message: 'Candidate Name is required.' };
    }

    const currentCandidates = DataStoreService.getCandidates(electionId);
    const candidateId = candidateData.id?.trim().toUpperCase() || `CAND-${(currentCandidates.length + 1).toString().padStart(2, '0')}`;
    const cleanName = candidateData.name.trim();

    if (currentCandidates.some((c) => c.id === candidateId)) {
      return { success: false, message: `Candidate with ID ${candidateId} already exists.` };
    }

    const newCandidate: Candidate = {
      id: candidateId,
      electionId,
      name: cleanName,
      party: candidateData.party?.trim() || 'Independent',
      candidateType: candidateData.candidateType || 'Party',
      constituency: candidateData.constituency?.trim() || election.constituency,
      symbol: candidateData.symbol?.trim() || '🗳️',
      photo: candidateData.photo?.trim() || '',
      logo: candidateData.logo?.trim() || '',
      description: candidateData.description?.trim() || '',
      information: candidateData.information?.trim() || '',
      status: candidateData.status || 'ACTIVE',
      orderNumber: currentCandidates.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    currentCandidates.push(newCandidate);
    DataStoreService.saveCandidates(electionId, currentCandidates);

    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: 'CANDIDATE_ADDED',
      election_id: electionId,
      request_id: 'REQ-CAND-ADD-' + Date.now(),
      result: 'SUCCESS',
      details: `Added candidate "${newCandidate.name}" (${newCandidate.id}) to election ${electionId}.`,
    });

    return {
      success: true,
      message: `Candidate ${newCandidate.name} added successfully.`,
      candidate: newCandidate,
    };
  }

  /**
   * Admin: Update Candidate Details
   */
  public static updateCandidate(
    electionId: string,
    candidateId: string,
    updateData: Partial<Candidate>,
    adminId = 'ADMIN'
  ): { success: boolean; message: string; candidate?: Candidate } {
    const election = DataStoreService.getElectionById(electionId);
    if (!election) {
      return { success: false, message: 'Election not found.' };
    }

    const candidates = DataStoreService.getCandidates(electionId);
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return { success: false, message: 'Candidate not found in this election.' };
    }

    if (updateData.name) candidate.name = updateData.name.trim();
    if (updateData.party !== undefined) candidate.party = updateData.party.trim();
    if (updateData.candidateType) candidate.candidateType = updateData.candidateType;
    if (updateData.symbol !== undefined) candidate.symbol = updateData.symbol.trim();
    if (updateData.photo !== undefined) candidate.photo = updateData.photo.trim();
    if (updateData.logo !== undefined) candidate.logo = updateData.logo.trim();
    if (updateData.description !== undefined) candidate.description = updateData.description.trim();
    if (updateData.information !== undefined) candidate.information = updateData.information.trim();
    if (updateData.status) candidate.status = updateData.status;
    candidate.updatedAt = new Date().toISOString();

    DataStoreService.saveCandidates(electionId, candidates);

    AuthService.recordAdminAudit({
      admin_id: adminId,
      action: 'CANDIDATE_UPDATED',
      election_id: electionId,
      request_id: 'REQ-CAND-UPD-' + Date.now(),
      result: 'SUCCESS',
      details: `Updated candidate ${candidateId} in election ${electionId}.`,
    });

    return {
      success: true,
      message: `Candidate ${candidate.name} updated successfully.`,
      candidate,
    };
  }

  /**
   * Admin: Disable Candidate (never permanently delete after voting started)
   */
  public static disableCandidate(
    electionId: string,
    candidateId: string,
    adminId = 'ADMIN'
  ): { success: boolean; message: string; candidate?: Candidate } {
    return this.updateCandidate(electionId, candidateId, { status: 'DISABLED' }, adminId);
  }
}
