# Cybersecurity Controls & Defense-in-Depth Specification

## 1. Authentication & RBAC Hierarchy
- **VOTER**: Ephemeral token authentication; can only submit single ballot commitment per election.
- **ELECTION_AUTHORITY**: Multi-Factor Authentication (MFA) required for all lifecycle state machine modifications.
- **INDEPENDENT_AUDITOR**: Read-only cryptographic inspection rights; cannot modify ledger or vote state.
- **SYSTEM_ADMIN**: Infrastructure observability; prohibited from querying ballot content or modifying voter data.

## 2. Brute-Force & Denial-of-Service Mitigations
- **Aadhaar OTP Lockout**: Maximum 3 verification attempts permitted per transaction before automated locking.
- **IP Rate-Limiting**: Sliding window rate limits (300 requests/minute per client IP) implemented at the API Gateway.
- **Stateless Node.js Architecture**: Horizontal scalability behind Nginx reverse proxies with request buffering.

## 3. Concurrency Protection & Atomic Mutex
- Prevents race-condition double-voting when concurrent HTTP requests arrive for the same token.
- Single-use state transition `ISSUED -> USED` executes under a strict mutex lock.
- Second attempts immediately receive HTTP 409 Conflict with `ERR_CONCURRENT_VOTE_REJECTED`.
