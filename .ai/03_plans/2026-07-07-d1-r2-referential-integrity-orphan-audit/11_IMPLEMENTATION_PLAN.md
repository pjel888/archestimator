# 11 — Implementation Plan

This is the authoritative execution guide for the future implementation AI. Organized into dependency-aware phases. Each task has a stable ID, exact target paths, and completion evidence. Read `06` for architecture and `04` for requirement IDs before starting.

**Plan profile:** exhaustive. **Status:** core phases (1–5, 7, 9) implementation-ready in design; phase 6 (repair) conditionally ready; phase 8 (Track B) gated on OPEN-DEC-001.

**Implementation-unit field contract (applies to every task T1.1–T9.2):** each task below specifies its core fields. The following fields are **defined once here and apply uniformly** to every task unless a task explicitly overrides (this satisfies the standard's 16-field implementation-unit requirement without per-task repetition):

- **User/system outcome:** the operator gets a verified, redacted, owner-gated D1/R2 orphan-audit capability (pack-level); per-task outcomes are in each task's Goal.
- **Scope/Non-goals:** per-task scope = the files/symbols listed; non-goals = anything outside those files + the pack-level non-goals in `02`.
- **Existing patterns to follow:** `node:sqlite` `DatabaseSync` (`tests/vitest/workspace-owner-membership-backfill-migration.test.ts`); `FakeR2Bucket` + `list()` (`tests/vitest/cloudflare-r2-storage-provider.test.ts`); `recordRetentionEventInD1` (`src/lib/compliance/retention-core.ts`); `CRON_SECRET` gate (`src/app/api/internal/upload-cleanup`); `database.batch()` atomicity (`src/lib/projects/actions.ts:294`).
- **Data/API/security/performance implications:** aggregated in `07`/`08`/`09`; security: detection read-only (SEC-001), repair token-gated (SEC-003) + per-class allowlist (`06`).
- **Manual/browser/provider proof:** browser N/A (no UI); provider = hosted preview dry-run (Ring 1, `13`); local = `node:sqlite` + fake R2.
- **Rollback/recovery:** DB changes → `07` DB-CHG blueprints; Track A → remove 2 DELETEs; Track B → remove pragma; repair → idempotent re-run + audit row.
- **Stop/blocker condition:** per phase durable-goal contract; a task blocks if its validation fails after 2 retries with no new recovery path (record root cause + residual risk).

**Ultragoal-style durable goal contract per phase** (abbreviated fields shown once here, applied to each phase): Goal ID, Objective, Scope, Requirements covered, Required evidence, Completion audit, Checkpoint artifacts, Stop condition, Blocker condition, Review gate, QA gate.

---

## Phase 1 — Full-schema harness + ownership manifest

**Objective:** a reusable in-memory D1 harness applying all 38 migrations, and a derived ownership manifest.
**Requirements covered:** DATA-001, FR-001.
**Prerequisites:** none.
**Dependencies:** none.
**Parallelizable with:** nothing (foundational).
**Durable goal contract:** Goal ID `ORPHAN-P1`. Completion audit = harness applies 38 migrations cleanly; manifest count == table count in `03` §1; `PRAGMA foreign_key_check` returns 0 on empty seeded DB. Stop = both gates pass. Blocker = a migration fails to apply in `node:sqlite` (record the failing migration and the SQLite incompatibility).

### Task 1.1 — Migration-applier test helper
- **Task ID:** T1.1
- **Requirement IDs:** DATA-001
- **Objective:** apply `migrations/0001…0038` in numeric order to `node:sqlite` `DatabaseSync(":memory:")`.
- **Why:** no full-schema harness exists (`03` §6); all later phases depend on it.
- **Target file (new):** `tests/vitest/helpers/apply-all-migrations.ts`
- **Target symbols:** `applyAllMigrations(db)`, `createSeededMemoryDb(seed?)`
- **Inputs:** reads `migrations/*.sql` via `fs.readdir`.
- **Instructions:** sort filenames numerically; `db.exec()` each file's contents in order; on throw, attach the filename + statement to the error; expose a `createSeededMemoryDb` that applies migrations then optional seed rows.
- **Expected output:** a reusable helper.
- **Failure cases:** a migration uses a SQLite feature `node:sqlite` lacks → record and surface clearly (do not silently skip).
- **Tests to add:** `tests/vitest/helpers/apply-all-migrations.test.ts` — asserts 69 tables present after apply; `PRAGMA foreign_key_check` empty.
- **Validation:** `bunx vitest run tests/vitest/helpers/apply-all-migrations.test.ts --maxWorkers=1`
- **Completion evidence:** test green; table-count assertion matches `03` §1.
- **Parallelization:** sequential (foundational).
- **Complexity:** Medium.

### Task 1.2 — Ownership manifest generator
- **Task ID:** T1.2
- **Requirement IDs:** FR-001
- **Objective:** parse `migrations/*.sql` for `REFERENCES` and FK-like columns; emit a typed manifest of parent→child edges + R2-key columns, each tagged `{declared, enforced}`.
- **Why:** detection queries are generated from the manifest; hand-maintained manifests rot.
- **Target file (new):** `src/lib/audit/orphan/ownership-manifest.ts`
- **Target symbols:** `buildOwnershipManifest()`, type `OwnershipEdge`
- **Inputs:** `migrations/*.sql` (read at generation time; for the test, read from disk).
- **Instructions:** regex/parser for `REFERENCES <table>(<col>) ON DELETE CASCADE|SET NULL|...` and composite `FOREIGN KEY (...) REFERENCES ...`; separately catalog the 4 R2-key columns from `03` §3; tag each edge `enforced: 'unknown'` by default (runtime readback fills it).
- **Expected output:** `OwnershipEdge[]` + `R2KeyColumn[]`.
- **Failure cases:** migration syntax the parser misses → snapshot test diffs against `03` §1–3 and fails loudly.
- **Tests to add:** `tests/vitest/orphan-manifest.test.ts` — snapshot of edge count + a few canonical edges (e.g., the 0014 cluster asserts `declared: 'none'`).
- **Validation:** `bunx vitest run tests/vitest/orphan-manifest.test.ts --maxWorkers=1`
- **Completion evidence:** manifest count matches `03`; 0014 cluster flagged `none`.
- **Parallelization:** parallel with T1.1 (independent files).
- **Complexity:** Medium.

**Phase 1 exit criteria:** both tasks green; harness + manifest reusable by Phase 2.

---

## Phase 2 — Class A detection + FK readback

**Objective:** read-only D1 orphan detection for all Class A edges + engine FK state.
**Requirements covered:** FR-002 (D1 part), DATA-002, SEC-001.
**Prerequisites:** Phase 1.
**Dependencies:** T1.1, T1.2.
**Durable goal contract:** Goal ID `ORPHAN-P2`. Completion audit = TEST-001 finds all planted Class A orphans; TEST-002 records zero writes; FK readback field present. Stop = both pass. Blocker = a detection query cannot be expressed without a full scan at 100x (record + add PERF-001 EXPLAIN finding).

### Task 2.1 — ReadOnlyD1 port + local adapter
- **Task ID:** T2.1
- **Requirement IDs:** SEC-001, ARCH-001
- **Objective:** a `ReadOnlyD1` interface exposing only `prepare(sql).all()/.get()` + pragma helpers; local `node:sqlite` adapter.
- **Target files (new):** `src/lib/audit/orphan/port.ts`, `src/lib/audit/orphan/adapters/local-sqlite.ts`
- **Instructions:** type-level read-only enforcement (AD-1 in `06`); adapter wraps `DatabaseSync`.
- **Tests:** covered by TEST-002.
- **Complexity:** Small.

### Task 2.2 — Class A detector
- **Task ID:** T2.2
- **Requirement IDs:** FR-002, DATA-002
- **Objective:** for each manifest edge, run `LEFT JOIN … WHERE parent.id IS NULL` / `NOT EXISTS`; also `PRAGMA foreign_key_check` + `PRAGMA foreign_keys` readback.
- **Target file (new):** `src/lib/audit/orphan/detect.ts`
- **Target symbols:** `detectD1Orphans(d1: ReadOnlyD1, manifest): OrphanFinding[]`, `readForeignKeyEnforcement(d1)`
- **Instructions:** generate queries from manifest; paginate by `id`; legal-hold exclusion via `data_retention_events` cross-check (FR-006).
- **Failure cases:** empty parent table → 0 orphans (correct); huge child table → paginate.
- **Tests to add:** `tests/vitest/orphan-audit-detection.test.ts` (TEST-001) — plant known Class A orphans per ORPH-001/004/005/006/009/010/011/013/014; assert exact findings.
- **Validation:** `bunx vitest run tests/vitest/orphan-audit-detection.test.ts --maxWorkers=1`
- **Complexity:** Large.

### Task 2.3 — Read-only instrumentation test
- **Task ID:** T2.3
- **Requirement IDs:** SEC-001, TEST-002
- **Objective:** wrap the D1 stub so any `run()`/`delete()` call in detection throws; assert detection completes.
- **Target file (new):** `tests/vitest/orphan-audit-read-only.test.ts`
- **Complexity:** Small.

**Phase 2 exit criteria:** TEST-001 + TEST-002 green; FK readback field populated.

---

## Phase 3 — R2 reconciliation (Class B/C)

**Objective:** paginated, cost-capped R2↔D1 set reconciliation.
**Requirements covered:** FR-003, PERF-002.
**Prerequisites:** Phase 2 (shares port + report types).
**Durable goal contract:** Goal ID `ORPHAN-P3`. Completion audit = fake-R2 test finds planted Class B/C orphans; cost cap aborts a seeded over-cap scan. Stop = both pass.

### Task 3.1 — ReadOnlyR2 port + reconciliation
- **Task ID:** T3.1
- **Requirement IDs:** FR-003, PERF-002
- **Target files (new):** extend `port.ts`; `src/lib/audit/orphan/reconcile-r2.ts`
- **Instructions:** `R2.list({prefix, cursor})` paginated over the 3 logical-bucket prefixes; build key set; set-diff vs D1 `storage_path` union; cost cap aborts + reports partial.
- **Tests:** `tests/vitest/orphan-audit-reconcile.test.ts` — extend `FakeR2Bucket` with `list()`; plant R2-only and D1-only keys; assert; cap-abort test.
- **Complexity:** Medium-Large.

**Phase 3 exit criteria:** reconciliation test green; cost cap works.

---

## Phase 4 — Redacted report

**Objective:** schema-locked, redacted report formatter.
**Requirements covered:** FR-004, SEC-002.
**Prerequisites:** Phases 2–3.
**Durable goal contract:** Goal ID `ORPHAN-P4`. Completion audit = TEST-003 zero secret-pattern hits; report schema stable.

### Task 4.1 — Report formatter + redaction test
- **Task ID:** T4.1
- **Requirement IDs:** FR-004, TEST-003
- **Target file (new):** `src/lib/audit/orphan/report.ts`
- **Instructions:** fields per `05` copy section; SHA-256 prefix for paths; ≤2-segment key prefix; severity mapping (P0/P1/P2 from `03` §7).
- **Tests:** `tests/vitest/orphan-audit-redaction.test.ts` (TEST-003) — regex scan over report JSON for `bearer|token|password|eyJ|-----BEGIN PRIVATE` etc.; zero hits.
- **Complexity:** Medium.

**Phase 4 exit criteria:** TEST-003 green.

---

## Phase 5 — Dry-run script + CI/runbook wiring

**Objective:** a `cf:orphan-audit` script and a documented cadence.
**Requirements covered:** FR-007, OPS-001.
**Prerequisites:** Phase 4.
**Durable goal contract:** Goal ID `ORPHAN-P5`. Completion audit = script runs dry-run on local seeded DB and prints a report; runbook step documented.

### Task 5.1 — CLI entry
- **Task ID:** T5.1
- **Requirement IDs:** FR-007
- **Target files (new):** `scripts/run-orphan-audit.ts`; `package.json` entry `"cf:orphan-audit": "bun run scripts/run-orphan-audit.ts"`.
- **Instructions:** flags `--dry-run --target local|preview|production --from-report --confirm --class --r2-cost-cap`; exit codes per `05`.
- **Tests:** invocation smoke test (dry-run on local seeded DB).
- **Complexity:** Medium.

### Task 5.2 — Runbook
- **Task ID:** T5.2
- **Requirement IDs:** OPS-001
- **Target file:** this pack's `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` (already drafted; finalize with the real script name + flags).
- **Complexity:** Small.

**Phase 5 exit criteria:** script runs; runbook references real flags.

---

## Phase 6 — Repair (conditionally ready)

**Objective:** gated, idempotent repair consuming a dry-run report.
**Requirements covered:** FR-005, REL-001, SEC-003.
**Prerequisites:** Phase 5.
**Status:** CONDITIONALLY READY — depends on a real independent reviewer signing off (verification_mode emulated) and the repair-action allowlist being reviewed.

### Task 6.1 — Repair module
- **Task ID:** T6.1
- **Requirement IDs:** FR-005, REL-001, SEC-003
- **Target file (new):** `src/lib/audit/orphan/repair.ts`
- **Instructions:** per-class allowlist (delete-row / delete-object / set-null); require `--from-report` + `--confirm` + `ORPHAN_AUDIT_REPAIR_TOKEN`; write `data_retention_events`-style audit row; before/after diff.
- **Tests:** gate tests (refuses without report/confirm/token); idempotency (re-run = no-op); partial-failure injection.
- **Complexity:** Large.

**Phase 6 exit criteria:** all gate tests green; allowlist reviewed.

---

## Phase 7 — Track A: defense-in-depth explicit deletes

**Objective:** add explicit `estimate_sheet_events`/`estimate_sheet_adjustments` deletes to the project-delete batch.
**Requirements covered:** DATA-003.
**Prerequisites:** Phase 1 (harness, to test cascade-off behavior).
**Status:** implementation-ready in design.

### Task 7.1 — Project-delete batch patch
- **Task ID:** T7.1
- **Requirement IDs:** DATA-003
- **Goal:** make project delete correct regardless of FK enforcement state.
- **Target file (existing):** `src/lib/projects/actions.ts` (batch region ~602–754)
- **Instructions:** add `DELETE FROM estimate_sheet_events WHERE estimate_id IN (...)` and `DELETE FROM estimate_sheet_adjustments WHERE estimate_id IN (...)` before `DELETE FROM estimates`; preserve batch atomicity (`database.batch()`).
- **Tests:** extend project-delete tests; add `tests/vitest/project-delete-cascade-off.test.ts` (set `PRAGMA foreign_keys=OFF`, delete a project, assert no surviving `estimate_sheet_events`/`adjustments`).
- **Validation:** existing project-delete suite green; cascade-off test green.
- **Completion evidence / Done criteria:** both tests green; diff shows only the 2 added statements.
- **Complexity:** Small.

### Task 7.2 — Revoke destroys password_hash + encrypted_token (SEC-004 prevention)
- **Task ID:** T7.2
- **Requirement IDs:** SEC-004, ORPH-014
- **Goal:** destroy public-route-accepted credential material on publication revoke (Track-A-class prevention, independent of OPEN-DEC-001).
- **Target file (existing):** `src/lib/publication/actions.ts` (`revokeProjectPublication`, ~line 1012-1026).
- **Instructions:** in the revoke UPDATE, set `password_hash = NULL` and `encrypted_token = NULL` alongside the existing `status='revoked'`/`revoked_at` set. Preserve the row (audit trail). Revoke is terminal (`revoked_at` monotonic; no un-revoke path), so nulling is safe.
- **Tests:** `tests/vitest/publication-revoke-clears-password-hash.test.ts` — assert post-revoke row has `password_hash IS NULL` and `encrypted_token IS NULL`; denial test asserting the public `POST /api/share/[token]/password` route rejects a revoked publication's token even before this patch (defense-in-depth).
- **Validation:** revoke test green; denial test green; existing publication test suite green.
- **Completion evidence / Done criteria:** revoked row has null credential columns; public route denies revoked pubs.
- **Rollback:** revert the two column-nulls; behavior returns to today's retained-hash state (ORPH-014 re-detectable).
- **Complexity:** Small.

**Phase 7 exit criteria:** cascade-off test green; revoke-clears-hash test green; existing suites green.

---

## Phase 8 — Track B: enable + prove FK enforcement (GATED)

**Objective:** enable `PRAGMA foreign_keys = ON` + cascade-behavior test.
**Requirements covered:** DATA-004, TEST-004.
**Prerequisites:** Phase 6 (dry-run repair must be available to clear pre-existing violations FIRST); **OPEN-DEC-001 owner approval**.
**Status:** BLOCKED-EXTERNAL on OPEN-DEC-001.

### Task 8.1 — Enable pragma
- **Task ID:** T8.1
- **Requirement IDs:** DATA-004
- **Target file (existing):** `src/lib/cloudflare/d1.ts`
- **Instructions:** set `PRAGMA foreign_keys = ON` on connection acquisition; document that pre-existing violations must be cleared first.
- **Complexity:** Small.

### Task 8.2 — Cascade-behavior test
- **Task ID:** T8.2
- **Requirement IDs:** TEST-004
- **Target file (new):** `tests/vitest/d1-cascade-behavior.test.ts`
- **Instructions:** for each declared cascade edge in the manifest, seed parent+child, delete parent, assert child gone/null.
- **Complexity:** Medium.

**Phase 8 exit criteria:** OPEN-DEC-001 resolved; cascade suite green; dry-run repair run on preview to clear violations before enabling.

---

## Phase 9 — DSAR interaction + retention rule

**Objective:** legal-hold exclusion (already in detect.ts) + per-user/per-workspace DSAR query template + `uploads_orphaned` retention rule.
**Requirements covered:** FR-006, DB-CHG-004.
**Prerequisites:** Phase 4.

### Task 9.1 — DSAR query template
- **Task ID:** T9.1
- **Requirement IDs:** FR-006
- **Goal:** give the future DSAR erasure path the exact per-user/per-workspace orphan queries it must run to propagate deletes to R2.
- **Target file (new):** `src/lib/audit/orphan/dsar-templates.ts`
- **Instructions:** export parameterized orphan queries scoped by `user_id` and `workspace_id`, covering at minimum: (a) R2 keys by `workspace_id` — `SELECT storage_path FROM upload_assets WHERE workspace_id = ?` plus the attachment table; (b) upload-asset rows by `workspace_id`; (c) AI audit rows (`ai_action_runs`/`ai_tool_calls`/`ai_data_access_events`) by `workspace_id`; (d) `account_security_events` by `user_id`; (e) `estimate_sheet_events`/`collaboration_audit_events` actor rows by `actor_user_id`. Each query documented with its erasure-action (delete-row / anonymize-actor / delete-R2-object). These are **templates** (not wired into an erasure action until OPEN-DEC-002).
- **Tests:** smoke test asserting each template returns the expected rows on a seeded fixture.
- **Completion evidence / Done criteria:** 5 query templates exported + documented; smoke test green.
- **Complexity:** Small-Medium.

### Task 9.2 — uploads_orphaned retention rule
- **Task ID:** T9.2
- **Requirement IDs:** DB-CHG-004, OPEN-DEC-003 (traces to FR-006 per `16`)
- **Goal:** give the repair audit row a retention home so it does not accumulate forever.
- **Target file (existing):** `src/lib/compliance/retention-core.ts`
- **Instructions:** add a rule to `DEFAULT_RETENTION_RULES` for `class_name='uploads_orphaned'` matching the existing rule shape: `selectSql` selects `data_retention_events` rows where `class_name='uploads_orphaned' AND created_at < cutoff`; `applySql` deletes those rows; TTL 90d. This sweeps the audit rows the repair module writes, not user data.
- **Tests:** extend `tests/vitest/compliance-retention-repository.test.ts` — assert the rule selects rows older than 90d and deletes them; rows younger than 90d are preserved; dry-run does not delete.
- **Validation:** `bunx vitest run tests/vitest/compliance-retention-repository.test.ts --maxWorkers=1`
- **Completion evidence / Done criteria:** rule present; TTL test green; dry-run preserves recent rows.
- **Complexity:** Small.

**Phase 9 exit criteria:** DSAR template documented; retention rule + test green.

---

## Implementation ordering summary

1. Phase 1 (foundational) → 2,3 (detection) → 4 (report) → 5 (script/runbook) — **implementation-ready core**.
2. Phase 7 (Track A) — implementation-ready, can land any time after Phase 1.
3. Phase 9 (DSAR + retention rule) — implementation-ready after Phase 4.
4. Phase 6 (repair) — **conditionally ready**, needs reviewer sign-off.
5. Phase 8 (Track B) — **blocked** on OPEN-DEC-001.

## Files explicitly off-limits during implementation

- `migrations/supabase/*` (legacy; never extend).
- Any Cloudflare resource outside `wrangler.jsonc` bindings.
- `.ai/09_archive/*` (historical).
- The Git history (no rebase/force).

## Verification before each edit (shared-worktree discipline)

- `git status --short --branch` before starting.
- Re-read the exact target file immediately before editing.
- Small diffs; no unrelated formatting.
- No branch/worktree creation unless explicitly requested.
