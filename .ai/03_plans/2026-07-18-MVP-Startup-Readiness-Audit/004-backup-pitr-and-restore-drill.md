# UNIT-004 · Backup PITR enablement + restore drill

- **Requirement:** REQ-009
- **Priority:** P0 · **Effort:** S (config) + M (drill) · **Risk:** LOW · **Status:** READY
- **Depends on:** —
- **Evidence:** EVID-004
- **Confidence caveat:** CONFIRMED-schema (no `backups`/`time_travel` config
  in `wrangler.jsonc`); **STRONG_INFERENCE-PITR-default** (Cloudflare D1 PITR
  default-state pending re-verification against current docs before UNIT-004
  locks "enable" vs "drill-only" scope — see RISK-001).

## Goal

D1 point-in-time recovery is enabled (if not already on by default),
documented, and drill-proven before any real design-partner data is at risk.

## Source evidence (commit `a41a07d01`)

- `wrangler.jsonc` read in full: no `backups`, no `time_travel`, no PITR
  settings.
- Grep for `backup|d1 backup|point.in.time|pitr|snapshot` over
  `wrangler.jsonc`, `wrangler.next-dev.jsonc`,
  `wrangler.auth-callback-normalizer.jsonc` → zero matches.
- No `.github/workflows/` directory exists (no CI-driven backup).
- No restore runbook. `src/app/admin/README.md:29-34` describes flag-based
  rollback only; no data-restore procedure.

## Implementation

1. **Re-verify current Cloudflare D1 PITR default state** via a researcher
   citation. If PITR is on by default at the binding level, the "enable"
   step collapses to "confirm + document."
2. If PITR must be explicitly enabled, enable it in the Cloudflare
   dashboard for both `database_id` (production) and `preview_database_id`
   (preview). `AUTH-001`: this is an operational config action, not a code
   change.
3. Write `.ai/00_system/BACKUP_AND_RESTORE_RUNBOOK.md`: RPO/RTO targets
   (target RPO ≤24h), restore commands (`wrangler d1 time-travel` or
   equivalent per current docs), restore-drill cadence (monthly), drill
   evidence path under `.ai/05_logs/`.
4. Execute one restore drill against **preview D1 only** (`AUTH-001`):
   record a known write, capture its timestamp, restore to that timestamp,
   verify the write is present in the restored state. Record evidence at
   `.ai/05_logs/2026-07-XX-d1-restore-drill.md`.

## Acceptance evidence

- PITR is enabled (or confirmed on-by-default) for both databases.
- Runbook exists and is linked from `src/app/admin/README.md`.
- Restore drill log shows successful point-in-time restore of a known write.

## Test decision

`test_requirement: NOT_REQUIRED`. The drill IS the evidence.

## Recovery

A failed drill does not affect production state (drill runs against preview
only). A failed production-enablement rolls back by disabling the setting;
no data is lost in either direction.

## Completion signal

Runbook exists; drill log shows a successful restore; RPO and procedure
documented.
