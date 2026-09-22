# Hyperledger Fabric Permissioned Blockchain Architecture

## 1. Network Topology
- **Channel**: `election-channel`
- **Consensus**: Raft BFT/CFT with TLS 1.3 mutual authentication
- **Organizations**:
  1. `ElectionAuthorityMSP` (Election Commission of India / State Election Commission)
  2. `AuditorMSP` (Comptroller & Auditor General of India / Judiciary Election Observers)
  3. `TechnicalInfrastructureMSP` (National Informatics Centre)

## 2. On-Chain Ballot Schema
```json
{
  "transaction_reference": "TX-FABRIC-8F124A09",
  "election_id": "ELEC-2026-CHENN-01",
  "ballot_commitment": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  "credential_hash": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "timestamp": "2026-09-22T08:30:00Z",
  "signature": "SIG-MSP-ElectionAuthorityMSP-A7F92B..."
}
```

**Privacy Guarantee**:
Notice what is NOT in this transaction:
- NO Aadhaar number
- NO Voter ID / EPIC
- NO voter name, phone number, address, or biometric
- NO plaintext candidate selection
The `ballot_commitment` is a one-way cryptographic hash: `SHA256(CandidateID + VoterSecretNonce)`.
Only the voter with their private secret nonce can prove what they voted for to themselves.
Neither the government nor any auditor can reverse it without the candidate choices, and the ballot domain has no record of the voter's identity.
