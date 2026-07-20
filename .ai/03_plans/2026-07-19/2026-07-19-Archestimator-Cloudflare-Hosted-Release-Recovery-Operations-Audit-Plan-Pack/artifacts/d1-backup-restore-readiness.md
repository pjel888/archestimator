# D1 Backup, PITR, Restore, Verification — O-04

## Current official Cloudflare D1 backup / time-travel semantics

**This audit does not reproduce vendor documentation.** Operator must reconcile
against current official docs at restore time. At time of audit (2026-07-19),
Cloudflare D1 supports:

- **Time-travel restore** (`wrangler d1 time-travel restore <DB> --timestamp=<ISO>`):
  restores the database to a prior point in time within the time-travel window.
- **Backup** commands (`wrangler d1 backups <create|list|restore>`): explicit
  named backups with their own retention.
- **Export/import** (`wrangler d1 export <DB>` / `wrangler d1 execute --file`):
  SQL dump round-trip.

> Vendor semantics (window length, regional behavior, retention, paid-feature
> gating) change. Operator must verify against current docs before relying on
> any of the above during an incident.

## Account / resource eligibility — EVIDENCE_BLOCKED

- Cannot confirm the Archestimator account has D1 backup/time-travel paid
  features enabled (AUTH-001).
- Cross-ref MVP-Startup UNIT-004 (PITR enablement — owner direction).

## Available restore windows — EVIDENCE_BLOCKED

- Time-travel window not confirmed (AUTH-001).

## Permissions — EVIDENCE_BLOCKED

- Account role cannot be enumerated without dashboard or `wrangler whoami`.

## Current backup / PITR evidence — EVIDENCE_BLOCKED

- No backup list captured. AUTH-001 continuation:
  `bunx wrangler d1 backups list ARCH_DB --remote`.

## SQL export / import readiness — CURRENT_SOURCE_CONFIRMED

- `bunx wrangler d1 export ARCH_DB --remote --output backup-YYYYMMDD.sql.gz` is
  the operator command for a pre-restore safety export.
- `bunx wrangler d1 execute ARCH_DB --remote --file backup.sql` for import.
- These commands are **not** part of any npm script — operator-driven only.

## Existing local restore rehearsal — CURRENT_SOURCE_CONFIRMED

`scripts/generate-cloudflare-d1-restore-rehearsal.ts`:

- Explicit `localOnly: true` / `providerBacked: false` (lines 57-58, 341-342).
- Creates temporary SQLite DBs from sanitized fixture data, dumps SQL, imports
  into a fresh DB, verifies rows/checksums/foreign keys, removes temp artifacts.
- Does **not** read env files, print secrets, call Cloudflare APIs, create D1
  databases, deploy Workers, change DNS, run Time-Travel restore, or prove a
  hosted D1 restore (lines 85-88, 347).

> Per the master prompt: this script is useful evidence for the runbook logic
> but **cannot** prove hosted D1 recovery. Finding `OPS-D1-RESTORE-005A`
> records this as `ALREADY_IMPLEMENTED` (correct honest behavior).

## Preview-only restore drill feasibility — EVIDENCE_BLOCKED

- Feasible in principle: the binding has `preview_database_id` (`363c756a…`
  redacted).
- Authorized for this audit (preview-only) but blocked by AUTH-001 (wrangler
  auth expired).
- **Continuation**: interactive terminal → `bunx wrangler login` → confirm
  preview DB is disposable → run a time-travel restore drill against the
  preview DB only → record before/after identities + snapshots → cleanup.

## RPO / RTO target — NOT DOCUMENTED

- No RPO/RTO target recorded in any active pack.
- **Operator decision** required before controlled beta: minimum acceptable
  RPO (e.g. 24h via nightly backup) and RTO (e.g. 2h).

## Pre-restore safety export — DOCUMENTED COMMAND

`bunx wrangler d1 export ARCH_DB --remote --output backup-YYYYMMDD.sql.gz`
**must** be run before any hosted restore. The restore command overwrites state.

## Destructive restore approval — OPERATOR

- Hosted D1 restore is destructive (overwrites state).
- Approval chain: operator (Philip) only. No second approver required for
  controlled beta (small cohort), but the approval must be recorded in the
  incident ledger.

## Post-restore verification — DOCUMENTED CHECKLIST

After any hosted restore:

1. **Schema**: `bunx wrangler d1 execute ARCH_DB --remote --command ".schema"`
   matches pre-restore.
2. **Row counts**: every PII-bearing and cohort-facing table within delta of
   pre-restore.
3. **Foreign keys**: `PRAGMA foreign_key_check` returns empty.
4. **Auth denial**: `GET /api/auth/get-session` (no cookie) → `null` (200).
5. **Commercial-golden**: one end-to-end estimate read/write round-trip on a
   test account.
6. **Route**: `/api/health` → 200 with deterministic JSON.
7. **Audit log**: confirm `admin_audit_events` row exists for the restore
   approval.

## Recovery of new writes after restored point — OPERATOR BEHAVIOR

- Time-travel restore to `T` discards writes after `T`.
- Cohort must be notified: any work after `T` must be re-entered.
- App must re-open for writes only after post-restore verification passes.

## Operator checklist and decision authority — NEW_OWNER_HERE

- Captured in `artifacts/recovery-scenario-matrix.csv` row "D1 corruption" +
  "Bad migration".
- Decision authority: Philip (operator) for the controlled beta.

## Honest local-versus-hosted verdict

- **Local**: rehearsal script proves runbook logic. LocalOnly by design.
- **Hosted**: **unproven** in this audit (AUTH-001). The honest verdict for the
  controlled-beta release gate is: hosted D1 recovery is the **#1 NO_GO
  blocker** until the operator runs the preview-only restore drill + documents
  RPO/RTO + documents the restore command chain.
