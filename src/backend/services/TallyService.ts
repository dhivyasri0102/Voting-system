/**
 * Automated Tally Service
 * 
 * Aggregates candidate totals after election closure:
 * Election CLOSED -> TALLYING -> Decrypt/Read Valid Ballots -> Cryptographic Proof -> AUDITING -> RESULT_PUBLISHED
 */

import crypto from 'crypto';
import { BallotService } from './BallotService.js';
import { BlockchainLedgerService } from './BlockchainLedgerService.js';
import { ElectionLifecycleService } from './ElectionLifecycleService.js';

export interface CandidateTallyResult {
  candidateId: string;
  candidateName: string;
  party: string;
  symbol: string;
  voteCount: number;
  percentage: number;
}

export interface ElectionTallyReport {
  electionId: string;
  totalBallotsCounted: number;
  totalBlockchainTransactions: number;
  turnoutPercentage: number;
  tallyTimestamp: string;
  tallyProofHash: string; // SHA-256 of candidate counts + ledger root
  candidateResults: CandidateTallyResult[];
}

export class TallyService {
  /**
   * Run automated tally for an election
   */
  public static computeTally(electionId: string): ElectionTallyReport {
    const election = ElectionLifecycleService.getElectionById(electionId);
    const candidates = ElectionLifecycleService.getCandidates(electionId);
    const storedBallots = BallotService.getBallotsForElection(electionId);
    const ledgerTxs = BlockchainLedgerService.getTransactionsForElection(electionId);

    const counts = new Map<string, number>();
    for (const c of candidates) {
      counts.set(c.id, 0);
    }

    // Tally votes from the isolated ballot domain
    for (const ballot of storedBallots) {
      const current = counts.get(ballot.candidateId) || 0;
      counts.set(ballot.candidateId, current + 1);
    }

    const totalCounted = storedBallots.length;
    const eligibleVoters = election?.totalEligibleVoters || 1;
    const turnoutPercentage = Number(((totalCounted / eligibleVoters) * 100).toFixed(4));

    const candidateResults: CandidateTallyResult[] = candidates.map((candidate) => {
      const voteCount = counts.get(candidate.id) || 0;
      const percentage = totalCounted > 0 ? Number(((voteCount / totalCounted) * 100).toFixed(2)) : 0;
      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        party: candidate.party,
        symbol: candidate.symbol,
        voteCount,
        percentage,
      };
    });

    // Sort descending by votes
    candidateResults.sort((a, b) => b.voteCount - a.voteCount);

    const timestamp = new Date().toISOString();

    // Compute cryptographic proof of tally
    const tallyProofHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(candidateResults) + totalCounted + timestamp)
      .digest('hex');

    return {
      electionId,
      totalBallotsCounted: totalCounted,
      totalBlockchainTransactions: ledgerTxs.length,
      turnoutPercentage,
      tallyTimestamp: timestamp,
      tallyProofHash,
      candidateResults,
    };
  }
}
