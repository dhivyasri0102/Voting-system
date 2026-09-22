# National Privacy-Preserving E-Voting Architecture & Ledger

> Proposed technical prototype for constitutional, large-scale national elections combining Aadhaar (UIDAI v2.5) identity authentication, Electoral Roll verification, anonymous single-use voting credentials, and an immutable permissioned Hyperledger Fabric blockchain ledger.

---

## Key Architectural Principles

1. **Strict Real-World Integration Rule**:
   - The application clearly distinguishes between `REAL AUTHORIZED`, `SANDBOX/TEST`, and `UNCONFIGURED` integration states.
   - It never fabricates fake Aadhaar authentication success or hardcodes fake government credentials.
   - When credentials or endpoints are unconfigured, the system reports:
     `"UIDAI authentication integration is not configured or authorized in this environment."`
2. **Cryptographic Privacy Air-Gap**:
   - **Identity Domain**: Verifies Voter ID (EPIC), Electoral Roll status, and UIDAI OTP. Issues an anonymous, unpredictable one-time voting token.
   - **Ballot Domain**: Records only the token hash, candidate selection, and a client-side blinding nonce.
   - **Zero Identity Leakage**: No database table, column, or transaction trace links voter identity to their candidate choice.
3. **Atomic Concurrency & One-Vote Enforcement**:
   - Kernel-level mutex locks guarantee that simultaneous requests using the same credential cannot double-spend. Only one request transitions `ISSUED -> USED`; duplicate attempts are rejected with HTTP 409 Conflict.
4. **Permissioned Blockchain (Hyperledger Fabric)**:
   - Channel: `election-channel`.
   - Immutable blocks chained via SHA-256 parent hash headers and Merkle roots.
   - Go chaincode deployed at `blockchain/chaincode/voting_chaincode.go`.
5. **Accessibility & Senior Citizen Mode**:
   - High-contrast visual themes with enlarged touch targets (>48px) and step-by-step navigation.
   - Web Speech API synthetic voice instructions in English and Tamil (தமிழ்).
   - Assisted Voting Mode with strict legal privacy boundaries.

---

## Directory Structure

```
├── blockchain/
│   └── chaincode/
│       └── voting_chaincode.go   # Hyperledger Fabric 2.5 Go Smart Contract
├── docs/
│   ├── architecture.md           # End-to-end technical architecture & domain flow
│   ├── uidai-integration.md      # UIDAI AUA/KUA/ASA specs & compliance rules
│   ├── blockchain.md             # Hyperledger Fabric channel, Raft & block schema
│   ├── privacy.md                # Cryptographic air-gap & zero-knowledge commitments
│   ├── threat-model.md           # Security threat matrix, attack vectors & mitigations
│   ├── election-lifecycle.md     # State machine (DRAFT -> OPEN -> CLOSED -> RESULT)
│   ├── accessibility.md          # Senior Citizen & RPwD Act compliance guidelines
│   └── scalability.md            # National scale (100M+ voter) deployment blueprint
├── src/
│   ├── backend/
│   │   ├── integrations/
│   │   │   ├── uidai/            # UIDAIConfiguration, Signer, Validator, OTP/Auth
│   │   │   └── electoralRoll/    # ElectoralRollService & EPIC verification
│   │   ├── routes/
│   │   │   └── api.ts            # REST API endpoints (/api/v1/...)
│   │   └── services/
│   │       ├── AnonymousCredentialService.ts # Single-use token generator & mutex
│   │       ├── BlockchainLedgerService.ts    # Permissioned ledger & Merkle engine
│   │       ├── ElectionLifecycleService.ts   # State machine controller
│   │       ├── BallotService.ts              # Privacy-preserving vote processor
│   │       ├── TallyService.ts               # Automated ballot counter
│   │       ├── AuditService.ts               # 10-point CAG cryptographic auditor
│   │       └── SecurityMonitoringService.ts  # SOC alerting & Prometheus exporter
│   ├── components/               # Header, VoterJourney, Authority, Auditor, Security
│   ├── i18n/                     # Bilingual English / தமிழ் translations
│   └── types/                    # Shared TypeScript interfaces & models
├── tests/
│   └── voting_system.test.ts     # Automated unit & integration test suite
├── docker-compose.yml            # Multi-container production deployment topology
├── .env.example                  # Environment configuration template
├── server.ts                     # Express + Vite hybrid full-stack server
└── package.json
```

---

## Running the Automated Test Suite

```bash
npx tsx tests/voting_system.test.ts
```

Runs 17 automated tests verifying:
- Electoral Roll verification
- UIDAI consent and format checks
- Anonymous credential generation
- Blockchain transaction commitment
- Atomic double-voting rejection
- Zero identity leakage
- Automated tallying
- 10-point CAG audit verification
