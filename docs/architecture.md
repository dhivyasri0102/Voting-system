# National E-Voting System: End-to-End Technical Architecture

## 1. System Overview

The **National Privacy-Preserving E-Voting Architecture** is an enterprise-grade digital voting platform engineered for constitutional elections. It solves the classic democratic dilemma: verifying that **every voter is legitimate and votes only once**, while cryptographically guaranteeing that **no party (including election administrators, database operators, or cryptanalysts) can determine which candidate a specific voter selected**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             IDENTITY DOMAIN (ECI / UIDAI)                      │
│                                                                                 │
│   Voter EPIC Entry  ──►  Electoral Roll Check  ──►  Aadhaar Consent & OTP      │
│   (ABC1234567)           (Constituency Valid)      (UIDAI AUA/ASA Gateway)      │
│                                                                                 │
│                                      │ Verified                                 │
│                                      ▼                                          │
│                    ┌───────────────────────────────────┐                        │
│                    │ Anonymous Credential Engine       │                        │
│                    │ Issues Unlinkable One-Time Token  │                        │
│                    └───────────────────────────────────┘                        │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                         CRYPTO-AIRGAP (No link preserved)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             VOTING DOMAIN (BALLOT LAYER)                        │
│                                                                                 │
│   Candidate Selection ──► Ballot Commitment (SHA-256) ──► Smart Contract Lock  │
│   (Choice + Secret Nonce) (Zero Identity Meta)           (Single-use Atomic)    │
│                                                                                 │
│                                      │ Validated                                │
│                                      ▼                                          │
│                    ┌───────────────────────────────────┐                        │
│                    │ Hyperledger Fabric Ledger         │                        │
│                    │ Channel: election-channel         │                        │
│                    │ Immutably Linked Block Header     │                        │
│                    └───────────────────────────────────┘                        │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             TALLY & AUDIT DOMAIN                                │
│                                                                                 │
│   Election Closed ──► Automated Ledger Tally ──► 10-Point CAG Cryptographic     │
│   (State Machine)     (Mathematical Proof)       Audit Verification             │
│                                                          │ Pass                 │
│                                                          ▼                      │
│                                                Official Public Results          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Core Architectural Pillars

### 1. Identity vs. Ballot Domain Segregation
- The identity domain contains Voter ID (EPIC), UIDAI authentication references, and constituency eligibility.
- When verified, the identity domain issues an **anonymous, cryptographically random single-use token**.
- The server stores only the token's SHA-256 hash.
- The ballot domain accepts only the token hash, a candidate ID, and a client-side blinding nonce.
- **There is zero database column, foreign key, or transaction trace linking identity to candidate.**

### 2. Atomic Concurrency Double-Voting Protection
- Simultaneous attempts to submit two ballots with the same credential token are blocked at the kernel/mutex layer.
- Credential status transitions atomically from `ISSUED` to `USED`. Subsequent attempts are rejected with HTTP 409 Conflict.

### 3. Hyperledger Fabric Permissioned Ledger
- Avoids public cryptocurrency networks and gas volatility.
- Uses Raft consensus across Election Authority peers and independent Auditor peers.
- Blocks are cryptographically chained using SHA-256 parent hash references and Merkle roots.
