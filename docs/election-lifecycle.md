# Election State Machine & Automated Lifecycle

```
 ┌─────────┐
 │  DRAFT  │
 └────┬────┘
      │ Schedule / Configure
      ▼
┌───────────┐
│ SCHEDULED │
└─────┬─────┘
      │ Poll Opening Time Reached / Authority Action
      ▼
 ┌─────────┐
 │  OPEN   │  ◄── Votes accepted only in this state
 └────┬────┘
      │ Polling Window Expires / Authority Closes
      ▼
┌───────────┐
│  CLOSED   │  ◄── Further ballot submissions rejected (HTTP 403)
└─────┬─────┘
      │ Automated or Authorized Tally Kickoff
      ▼
┌───────────┐
│ TALLYING  │  ◄── Aggregates candidate totals from valid ledger commitments
└─────┬─────┘
      │ Tally Completed & Proof Hash Computed
      ▼
┌───────────┐
│ AUDITING  │  ◄── CAG Independent Auditor executes 10-point mathematical verification
└─────┬─────┘
      │ Audit Passes (AUDIT_PASS)
      ▼
┌──────────────────┐
│ RESULT_PUBLISHED │  ◄── Public certified results released to citizenry
└──────────────────┘
```

## State Constraints
- **OPEN**: Votes are validated against smart contract rules and committed to `election-channel`.
- **CLOSED**: Smart contracts immediately reject incoming ballot transactions.
- **AUDITING**: Results cannot be published unless the automated audit outputs `AUDIT_PASS`.
