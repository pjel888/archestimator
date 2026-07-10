# Activation Ledger, Data Lifecycle, And Idempotency

This supporting model expands `DATA-001`, `SEC-001`, `RISK-001/002/006`, and
`UNIT-001`. It does not move stable IDs or authorize a migration.

## Migration Admission

The planned migration is `migrations/0054_beta_activation_events.sql`. Before any
edit, `UNIT-001` must validate the Program's durable
`MIGRATION_LEASE_GENERATION.json`: schema and generation, current sorted migration
tail, owner package and manifest digest, unclaimed `0054` allocation, allocation
set digest, and receipt digest. Missing, stale, consumed, collided, or mismatched
admission stops the lane before source edits and triggers Program-led atomic
reissue of every affected unconsumed slot.

## Data Ownership

| Relation | Purpose | Identity/integrity | Lifecycle |
|---|---|---|---|
| `beta_activation_progress` | Current maximum stage and checklist visibility | `(user_id, workspace_id)` primary key; composite membership/project/estimate chain | Retained while membership is active; exported and atomically erased when allowed |
| `beta_activation_events` | Minimal append-only milestone facts | Tenant-scoped server-derived dedupe; allowlisted stage/source/metadata; composite resource FKs | 180-day event retention |
| `beta_activation_outbox` | Durable delivery intent coupled to the domain commit | Unique `(workspace_id, dedupe_key)`; bounded state, attempts, lease, and safe error code | Delivered rows 30 days; unresolved/dead rows at most 180 days |
| `beta_activation_retention_holds` | Server-only erasure restriction | Composite subject; allowlisted reason; platform-admin creator | Expiry checked before export/erase/purge decisions |

No table stores email, raw invite/share/session tokens, IP, user agent, referrer,
support message text, arbitrary event blobs, or client-supplied identity.

## Transaction And Delivery State Machine

1. The authoritative domain mutation and canonical outbox intent commit in one
   D1 batch or owner-domain transaction.
2. A bounded reconciler atomically claims a pending or expired-lease row.
3. Delivery inserts-or-ignores the tenant-scoped event, advances progress to the
   maximum known stage, and marks the outbox row delivered atomically.
4. Retries occur at 1 minute, 5 minutes, 15 minutes, 1 hour, then 6 hours through
   attempt 10. An expired lease is reclaimable.
5. Attempt 10 becomes observable `dead`; the repair command is idempotent and
   uses the original canonical identity rather than minting a second event.

Late and out-of-order milestones remain in the ledger while progress never
regresses. The same untrusted nonce in two workspaces cannot collide because the
server derives the canonical key within the authorized tenant/resource chain.

## Privacy And Failure Semantics

- Analytics-consent withdrawal stops optional provider emission but does not
  delete essential authenticated activation progress.
- Privacy/account/membership erase is one all-or-nothing batch over outbox,
  events, and progress. An active hold returns `skipped_legal_hold` and leaves no
  partial deletion.
- Export includes shaped progress and events, excluding internal leases, raw
  error detail, and hold-reason internals.
- D1 unavailability, malformed JSON, missing/deleted resources, mismatched
  composite chains, and unknown stage/source/metadata fail closed with shaped
  errors and redacted structured diagnostics.
- D1 rollback is fix-forward: disable readers, writers, claims, and purge jobs;
  preserve additive tables; repair schema/data; then re-enable after tests.

## Proof Procedure

`TEST-001` owns migration constraints, direct-SQL chain mismatch, replay,
cross-tenant nonce, monotonic order, crash after domain commit, crash after lease
claim, concurrent workers, attempt cap/repair, every TTL edge, consent withdrawal,
export/erase, and active/expired hold fixtures. Evidence remains planned until
the implementation-time command sequence in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` runs and produces a fresh receipt.
