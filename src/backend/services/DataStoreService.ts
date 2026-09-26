/**
 * Persistent Dynamic Data Store Service
 * 
 * Replaces hardcoded mock arrays with persistent JSON storage in data/store.json.
 * Guarantees zero mock data: all records (voters, elections, candidates, credentials, blocks)
 * are dynamically created, queried, and persisted.
 */

import fs from 'fs';
import path from 'path';
import { Election, Candidate, VotingCredential, BlockchainBlock } from '../../types/index.js';

export interface RegisteredVoter {
  voterId: string;       // EPIC Number (e.g. TNL1029384)
  fullName: string;
  mobileNumber: string;  // Retained for voter records; demo login does not send SMS
  constituency: string;
  state: string;
  status: 'ACTIVE' | 'INACTIVE';
  registeredAt: string;
}

export interface StoreSchema {
  voters: RegisteredVoter[];
  elections: Election[];
  candidates: Record<string, Candidate[]>; // electionId -> Candidate[]
  credentials: Record<string, VotingCredential>; // credentialHash -> VotingCredential
  blocks: BlockchainBlock[];
  electoralRollVoted: string[]; // voterIds marked as voted
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

export class DataStoreService {
  private static store: StoreSchema = {
    voters: [],
    elections: [],
    candidates: {},
    credentials: {},
    blocks: [],
    electoralRollVoted: [],
  };

  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_PATH)) {
      try {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        this.store = JSON.parse(raw);
        // Ensure all keys exist
        if (!this.store.voters) this.store.voters = [];
        if (!this.store.elections) this.store.elections = [];
        if (!this.store.candidates) this.store.candidates = {};
        if (!this.store.credentials) this.store.credentials = {};
        if (!this.store.blocks) this.store.blocks = [];
        if (!this.store.electoralRollVoted) this.store.electoralRollVoted = [];
      } catch (err) {
        console.error('[DataStore] Corrupted store. Initializing clean store.', err);
        this.save();
      }
    } else {
      // A new installation must remain empty until an authority creates records.
      this.save();
    }

    this.initialized = true;
  }

  public static save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Failed to write store to disk', err);
    }
  }

  // --- Voter Operations ---
  public static getVoter(voterId: string): RegisteredVoter | undefined {
    this.initialize();
    const clean = voterId.trim().toUpperCase();
    return this.store.voters.find((v) => v.voterId.toUpperCase() === clean);
  }

  public static getAllVoters(): RegisteredVoter[] {
    this.initialize();
    return [...this.store.voters];
  }

  public static registerVoter(voter: RegisteredVoter): { success: boolean; message: string } {
    this.initialize();
    const cleanId = voter.voterId.trim().toUpperCase();
    const exists = this.store.voters.find((v) => v.voterId.toUpperCase() === cleanId);
    if (exists) {
      return { success: false, message: `Voter ID ${cleanId} is already registered.` };
    }

    this.store.voters.push({
      ...voter,
      voterId: cleanId,
      status: voter.status || 'ACTIVE',
      registeredAt: new Date().toISOString(),
    });
    this.save();
    return { success: true, message: `Voter ${voter.fullName} successfully registered with EPIC ${cleanId}.` };
  }

  // --- Electoral Roll Voted Flags ---
  public static hasVoted(voterId: string): boolean {
    this.initialize();
    return this.store.electoralRollVoted.includes(voterId.trim().toUpperCase());
  }

  public static markAsVoted(voterId: string): void {
    this.initialize();
    const clean = voterId.trim().toUpperCase();
    if (!this.store.electoralRollVoted.includes(clean)) {
      this.store.electoralRollVoted.push(clean);
      this.save();
    }
  }

  // --- Election Operations ---
  public static getElections(): Election[] {
    this.initialize();
    return [...this.store.elections];
  }

  public static getElectionById(id: string): Election | undefined {
    this.initialize();
    return this.store.elections.find((e) => e.id === id);
  }

  public static saveElection(election: Election): void {
    this.initialize();
    const idx = this.store.elections.findIndex((e) => e.id === election.id);
    if (idx >= 0) {
      this.store.elections[idx] = election;
    } else {
      this.store.elections.push(election);
    }
    this.save();
  }

  // --- Candidate Operations ---
  public static getCandidates(electionId: string): Candidate[] {
    this.initialize();
    return this.store.candidates[electionId] ? [...this.store.candidates[electionId]] : [];
  }

  public static saveCandidates(electionId: string, candidates: Candidate[]): void {
    this.initialize();
    this.store.candidates[electionId] = candidates;
    this.save();
  }

  // --- Credentials Operations ---
  public static getCredential(hash: string): VotingCredential | undefined {
    this.initialize();
    return this.store.credentials[hash];
  }

  public static saveCredential(credential: VotingCredential): void {
    this.initialize();
    this.store.credentials[credential.credentialHash] = credential;
    this.save();
  }

  public static getAllCredentials(): VotingCredential[] {
    this.initialize();
    return Object.values(this.store.credentials);
  }

  // --- Blockchain Blocks ---
  public static getBlocks(): BlockchainBlock[] {
    this.initialize();
    return [...this.store.blocks];
  }

  public static saveBlocks(blocks: BlockchainBlock[]): void {
    this.initialize();
    this.store.blocks = blocks;
    this.save();
  }

  public static addBlock(block: BlockchainBlock): void {
    this.initialize();
    this.store.blocks.push(block);
    this.save();
  }
}
