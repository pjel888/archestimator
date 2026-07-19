# UNIT-001 — Establish hosted D1 recovery posture

## Goal

Prove the hosted D1 binding (`ARCH_DB`) can be recovered within a documented
RPO/RTO, by running a preview-only restore drill, documenting the production
restore command chain and approval flow, and recording RPO/RTO targets in the
release-gate runbook.

## Source finding / requirement

- `OPS-RECOVERY-001` (High) — `04-FINDINGS-REGISTER.md`
- `REQ-OPS-001` (CORE) — hosted recovery posture is a release-gate NO_GO

## Dependencies

- None (operator-driven; AUTH-001 must be resolved first)

## Owned paths / resources

- `artifacts/release-gate.json` — update `GATE-RECOVERY-001` to resolved
- `artifacts/d1-backup-restore-readiness.md` — capture hosted results
- `artifacts/recovery-scenario-matrix.csv` rows "Bad migration", "D1 corruption"
- No product code, no migrations, no `wrangler.jsonc` changes

## Non-goals

- PITR enablement itself (owned by MVP-Startup UNIT-004)
- New restore tooling
- Real production restore execution
- D1 schema work

## Implementation boundary

Operator-driven actions only:

1. Interactive terminal: `bunx wrangler login` (or `CLOUDFLARE_API_TOKEN` set).
2. `bunx wrangler d1 info ARCH_DB --remote` — capture size, table count.
3. `bunx wrangler d1 backups list ARCH_DB --remote` — confirm backup cadence.
4. `bunx wrangler d1 migrations list ARCH_DB --remote` — confirm migration head
   matches `migrations/0092_linked_estimate_template_instances.sql`.
5. Confirm preview database (`preview_database_id 363c756a…`) is disposable.
6. Run a preview-only time-travel restore: pick a recent timestamp `T`;
   `bunx wrangler d1 time-travel restore ARCH_DB --remote --timestamp=<T>`
   against the **preview DB only** (use the preview binding in a worktree or
   `--env preview` if configured).
7. Record before/after identities + snapshots in
   `evidence/d1-preview-restore-drill-<date>.md`.
8. Document production restore command chain + approval flow in
   `d1-backup-restore-readiness.md`.
9. Document RPO/RTO targets (operator decision).
10. Update `release-gate.json`: mark `GATE-RECOVERY-001` resolved with evidence
    path and timestamp.

## Invariants to preserve

- Production D1 is never mutated by this unit.
- No real production backup restore.
- No `wrangler secret` value is read or printed.
- All evidence is sanitized (no PII, no tokens, no customer content).
- Cleanup: any disposable preview rehearsal resource is deleted after the drill.

## Acceptance evidence

- `evidence/d1-preview-restore-drill-<date>.md` exists with before/after
  schema, row counts, FK check, route smoke, auth-denial smoke, audit-row smoke.
- `d1-backup-restore-readiness.md` "Hosted" section transitions from
  `EVIDENCE_BLOCKED` to `HOSTED_CONFIRMED`.
- `release-gate.json` `NO_GO_items[GATE-RECOVERY-001]` is removed; entry in
  `release_receipt_template.no_go_items_resolved`.
- RPO/RTO targets recorded as `DEC-AUTO-006`.

## Test decision

`NOT_REQUIRED` — this is operator-driven hosted verification, not automated
product testing.

## Recovery / fix-forward

If the preview restore drill fails: capture the failure mode in
`d1-backup-restore-readiness.md`, raise a new finding, and **do not** admit the
cohort until the runbook is honest.

## Completion signal

`release-gate.json` removes `GATE-RECOVERY-001` from `NO_GO_items`; evidence
path attached; LOOP_LEDGER E-NNNN records the operator event.

## Status

`PLANNED` — ready for operator; no in-scope code change required.
