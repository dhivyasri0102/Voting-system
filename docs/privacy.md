# Cryptographic Privacy & Ballot Secrecy Specification

## 1. The Core Invariant
**Under no condition does the system persist or link identity data to candidate selection.**

### Prohibited Associations
- `Voter ID / EPIC` ──X── `Candidate ID`
- `Voter Name` ──X── `Candidate ID`
- `IP Address` ──X── `Candidate ID`

## 2. Cryptographic Air-Gap Protocol

```
Resident (Voter ID + Mobile SMS OTP)
              │
              ▼
    [Identity Gateway]
              │
              ├─ Verified: Yes
              ├─ Marked in Electoral Roll as "Voted": Yes
              └─ Issues: 256-bit cryptographically random token T
                               │
                       [AIR-GAP BOUNDARY]
                               │
                               ▼
                        [Ballot Gateway]
    Resident client generates blinding nonce N
    Computes Ballot Commitment C = SHA-256(CandidateID + ":" + N)
    Computes Token Hash H = SHA-256(T + ElectionID)
    Sends (C, H) to Ballot Gateway
                               │
                               ▼
                [Hyperledger Fabric Smart Contract]
    Verifies H is ISSUED
    Atomically marks H as USED
    Records C on election-channel
```

Neither the Identity Gateway nor the Ballot Gateway possesses both pieces of the puzzle:
- Identity Gateway knows *who* requested a token, but has zero knowledge of *what* ballot commitment is created.
- Ballot Gateway and Blockchain Peers know *which* ballot commitments are cast, but have zero knowledge of *who* holds the token.
