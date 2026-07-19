# UNIT-007 — Verify hosted D1 migration parity + retention cadence

## Goal

Confirm the production D1 database has applied all 84 migrations in
`migrations/`, schema fingerprint is reconciled, and the nightly retention pass
runs at the documented cadence with the expected table coverage.

## Source findings / requirements

- `OPS-D1-PARITY-006` (Medium) — hosted migration parity unverified
- `OPS-RETENTION-015` (Low) — retention cadence + coverage unverified at hosted layer
- `OPS-CRON-UNMATCHED-016` (Low) — 30 3 * * * cosmetic noise (deferred to Quality Master)
- `OPS-CRON-FIVE-MIN-017` (Informational) — empty-cron-event concern resolved
- `REQ-OPS-008` (CORE)

## Dependencies

- AUTH-001 resolution
- Infosec UNIT-011 (retention registry coverage) — cross-ref

## Owned paths / resources

- `artifacts/d1-migration-parity.json`
- `artifacts/release-gate.json` (GATE-DEPLOY-PROOF-008)

## Non-goals

- Applying pending migrations (separate operator action)
- Schema redesign
- Retention registry coverage itself (Infosec UNIT-011)
- Cron-handler logic (resolved)

## Implementation boundary

Operator-driven actions:

1. `bunx wrangler d1 migrations list ARCH_DB --remote` — capture applied list.
2. Diff against `ls migrations/*.sql`. Capture delta in `d1-migration-parity.json`.
3. `bunx wrangler d1 execute ARCH_DB --remote --command ".schema"` — capture
   schema; hash it; record fingerprint in `d1-migration-parity.json`.
4. `bunx wrangler d1 execute ARCH_DB --remote --command "PRAGMA foreign_key_check"`
   — capture FK violations (should be empty).
5. Inspect recent `cron_run_events` for the `retention-pass:30 3 * * *` cron:
   confirm nightly execution at expected UTC time.
6. Inspect `data_retention_events` for recent purge activity.
7. After Infosec UNIT-011 lands (retention registry coverage), re-confirm
   coverage includes every PII/security event table.
8. Update `d1-migration-parity.json`: hosted applied state transitions from
   `EVIDENCE_BLOCKED` to `HOSTED_CONFIRMED`.
9. Update `release-gate.json`: resolve `GATE-DEPLOY-PROOF-008` (migration head
   matches).
10. Defer the `30 3` cosmetic-noise issue to Quality Master (not operator-
    facing); record the deferral in `existing-pack-overlap.json`.

## Invariants

- No production mutations.
- No `wrangler d1 migrations apply --remote`.
- No customer PII in evidence.

## Acceptance evidence

- `evidence/d1-parity-<date>.md` with applied-migration list, schema hash,
  FK-check result, retention-cadence sample.
- `d1-migration-parity.json` "Hosted" sections → `HOSTED_CONFIRMED`.
- `release-gate.json` resolves `GATE-DEPLOY-PROOF-008`.

## Test decision

`NOT_REQUIRED` — operator-driven hosted verification.

## Recovery / fix-forward

If migration drift is detected: block cohort admit; plan the catch-up apply
with documented approval.

## Completion signal

`release-gate.json` resolves `GATE-DEPLOY-PROOF-008`.

## Status

`PLANNED` — ready for operator.
