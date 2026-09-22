# Threat Model & Security Controls Matrix

| Threat Category | Attack Vector / Surface | Impact | Mitigation Strategy | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **External Attacker** | DDoS on public voter portal | Service disruption during polling hours | Edge Anycast CDN rate limiting, Nginx request bursts caps, stateless Node cluster | Distributed multi-terabit volumetric bandwidth saturation |
| **Credential Theft** | Intercepting one-time token | Unauthorized ballot submission | Single-use consumption token with 60-min expiry, TLS 1.3 encryption, cryptographic blinding | Malware on voter's personal end-user device |
| **Replay Attack** | Resubmitting previously captured OTP or Ballot TX | Duplicate vote or state corruption | Nonce enforcement, transaction ID single-use validation, 300s window limits | Clock drift exceeding 5 minutes on untrusted nodes |
| **Brute-Force Attack** | Automated OTP guessing on UIDAI endpoint | Identity compromise | Account lockout after 3 failed attempts, strict IP and correlation rate limits | Compromise of resident's SMS carrier SIM |
| **Double-Voting** | Concurrent requests across multiple browser tabs | Multiple votes counted | Kernel-level mutex locks during `ISSUED -> USED` credential transition | None (guaranteed by atomic lock and unique DB constraint) |
| **Insider / Admin Threat** | Election authority attempts to view votes or alter tally | Ballot secrecy breach or fraudulent result | Strict air-gap: ballot table has zero identity columns; blockchain ledger is append-only | Quantum computing decryption of stored commitments in 2040+ |
| **Ledger Tampering** | Rogue node rewrites historic block or transaction | Vote manipulation | Cryptographic block header hash-chaining + Merkle trees; instant tamper alert | 51% Byzantine majority compromise of all independent auditor nodes |
| **Identity Correlation** | Timing analysis correlating identity authentication with vote | Ballot deanonymization | Randomized transaction queue delays, batch commit intervals, decoupling of identity and ballot sessions | High-precision global passive traffic analysis |
