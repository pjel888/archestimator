# UNIT-005 — Establish hosted queue, DLQ, DO, and R2 operational baselines

## Goal

Capture the hosted operational baselines for queues/DLQs, Durable Objects, and
R2 so the operator has a known-good starting point for the controlled beta and
a documented inspection cadence.

## Source findings / requirements

- `OPS-QUEUE-DLQ-012` (Medium) — DLQ depth + replay contract
- `OPS-DO-STORAGE-013` (Medium) — DO storage use + quarantine runbook
- `OPS-R2-LIFECYCLE-014` (Medium) — R2 inventory + cleanup execution
- `REQ-005` (CORE)

## Dependencies

- AUTH-001 resolution (wrangler login)

## Owned paths / resources

- `artifacts/queue-dlq-matrix.csv`
- `artifacts/durable-object-operations.md`
- `artifacts/r2-lifecycle-matrix.csv`
- `artifacts/recovery-scenario-matrix.csv` rows for queue poison, DO state,
  R2 divergence
- `artifacts/release-gate.json` (`GATE-QUEUE-DLQ-007`)

## Non-goals

- Queue topology (historical Quality Master UNIT-019/024; current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`)
- Queue message signing (historical Infosec UNIT-008; current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`)
- DO revocation logic (historical Infosec UNIT-001; current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`)
- Upload security invariants (historical Infosec UNIT-005-007; current
  authority `.ai/03_plans/2026-07-31/Code-Improvement/`)

## Implementation boundary

Operator-driven actions:

1. `bunx wrangler queues list` (read-only) — capture baseline DLQ depth for
   `archestimator-upload-jobs-dlq` and
   `archestimator-client-portal-notifications-dlq`.
2. `bunx wrangler r2 object list archestimator-proof-uploads` (read-only) —
   capture baseline R2 object count by prefix
   (`component-attachments/`, `project-images/`, `component-images/`).
3. `bunx wrangler d1 execute ARCH_DB --remote --command "SELECT state,
   COUNT(*) FROM client_portal_notification_outbox GROUP BY state"` (read-only)
   — confirm no `state='dead'` rows at baseline.
4. Confirm `UPLOAD_JOBS_ENABLED=1` in hosted Worker secrets (name only).
5. Run a cleanup dry-run via the `/api/internal/upload-cleanup` route with
   `dryRun=1` — capture planned-action count.
6. Document the DO quarantine procedure (for now: `revoke-subject` via control
   secret for `CollaborationRoom`; no general procedure for `GlobalPresence` or
   `SupportInbox` — flag for engineering follow-up).
7. Document the queue replay contract: reset outbox rows to `state='pending'`
   for Client Portal; for upload-jobs, re-enqueue via the cron path. **Never**
   `bunx wrangler queues send/purge` in production.
8. Update the matrices with hosted baselines.
9. Update `release-gate.json`: resolve `GATE-QUEUE-DLQ-007`.

## Invariants

- No production mutations.
- No real DLQ purge or replay.
- No customer PII in artifacts.

## Acceptance evidence

- `evidence/queue-do-r2-baseline-<date>.md` with DLQ depths, R2 object counts,
  outbox state counts, cleanup dry-run result.
- DO quarantine procedure documented in `durable-object-operations.md`.
- Queue replay contract documented in `queue-dlq-matrix.csv`.
- `release-gate.json` resolves `GATE-QUEUE-DLQ-007`.

## Test decision

`NOT_REQUIRED` — operator-driven hosted verification.

## Recovery / fix-forward

If baselines show unexpected state (e.g. DLQ already populated, outbox
`state='dead'` rows): investigate root cause before cohort admit.

## Completion signal

`release-gate.json` resolves `GATE-QUEUE-DLQ-007`.

## Status

`PLANNED` — ready for operator.
