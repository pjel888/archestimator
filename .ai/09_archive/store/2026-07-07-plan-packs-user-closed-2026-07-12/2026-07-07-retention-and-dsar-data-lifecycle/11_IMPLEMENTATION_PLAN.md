# 11 — Implementation Plan (authoritative execution guide)

> Future implementation AI: read `README.md` first, then this document. Re-read every file you intend to edit immediately before editing. Coordinate with `LOOP_LEDGER.md`. No auto-branch/worktree.

Phases are dependency-aware. Each phase has a durable-goal contract. Tasks have exact paths/symbols or are explicitly `DISCOVERY-REQUIRED`/`BLOCKED-*`.

---

## Phase 0 — Inventory codification + intake verification

**Objective**: Lock the data inventory; confirm existing intake still passes its tests.
**Requirements addressed**: REQ-INV-001, REQ-DSAR-004.
**Prerequisites**: none.
**Dependencies**: none.
**Parallelizable**: yes (Task 0.1 and 0.2 are independent).

### Durable-goal contract (Phase 0)
- **Goal ID**: RET-DSAR-P0.
- **Objective**: Codify inventory; verify intake green.
- **Scope**: docs + test re-run; no code change.
- **Requirements covered**: REQ-INV-001, REQ-DSAR-004.
- **Required evidence**: inventory table in `07_` §1 (done in this pack); green intake test output.
- **Completion audit**: inventory cross-checked vs `migrations/`; intake tests pass.
- **Checkpoint artifacts**: `07_` §1, test transcript.
- **Stop condition**: inventory complete + intake green.
- **Blocker condition**: intake test regression (would indicate concurrent change).
- **Review gate**: lead.
- **QA gate**: n/a (docs + existing tests).

### Task 0.1 — Codify data inventory (planning, done)
- **Task ID**: T-0.1.
- **REQ IDs**: REQ-INV-001.
- **Objective**: The per-class table in `07_` §1 is the inventory.
- **Target**: `07_DATA_DATABASE_API_NETWORK_PLAN.md` §1 (already written in this pack).
- **Complexity**: Small.
- **Parallelization**: parallel-safe (docs).
- **Status**: done in this pack.

### Task 0.2 — Re-run intake tests
- **Task ID**: T-0.2.
- **REQ IDs**: REQ-DSAR-004.
- **Objective**: Confirm existing privacy-request intake tests are green before changes.
- **Target files**: `tests/vitest/` (privacy-request intake test — locate via `rg "privacy.request" tests/`).
- **Command**: `bunx vitest run <located test> --maxWorkers=1`.
- **Expected**: green.
- **Complexity**: Small.
- **Parallelization**: parallel-safe (read-only).
- **Status**: to be run at impl start.

---

## Phase 1 — Retention rule registry completion + env-gate

**Objective**: All 14 classes enforced; non-purge actions wired; cron env-gated.
**Requirements addressed**: REQ-RET-001, REQ-RET-002, REQ-RET-003, REQ-RET-004, REQ-CRON-001, REQ-CRON-002, REQ-EVID-001, REQ-LOG-001, REQ-LOG-002.
**Prerequisites**: Phase 0.
**Dependencies**: DB-05 (new classes enum) must land before adding rules for new classes.

### Durable-goal contract (Phase 1)
- **Goal ID**: RET-DSAR-P1.
- **Objective**: 14-class registry; env-gated cron; logs acceptance rows.
- **Requirements covered**: REQ-RET-001/002/003/004, REQ-CRON-001/002, REQ-EVID-001, REQ-LOG-001/002.
- **Required evidence**: registry unit test (14 rules); cron dry-run vs apply test; `data_retention_events` acceptance rows for logs classes.
- **Completion audit**: registry length === 14; env-gate test green; logs acceptance rows written.
- **Checkpoint artifacts**: `retention-core.ts` diff; test transcript.
- **Stop condition**: all three evidence items present.
- **Blocker condition**: D1 CHECK rebuild failure (DB-05).
- **Review gate**: lead + code-review.
- **QA gate**: adversarial cron scenarios (E matrix).

### Task 1.1 — DB-05: expand `data_retention_events.class_name` CHECK
- **Task ID**: T-1.1.
- **REQ IDs**: REQ-EVID-001 (supports new classes).
- **Objective**: Add new class values to the CHECK so DSAR triage/export/erasure and new personal-data classes can write audit rows.
- **Target**: new migration `migrations/<NNNN>_data_retention_events_new_classes.sql` where `NNNN` is the next free number at impl time. **Concurrency note**: at planning time, concurrent agent work had already created `migrations/0040_operational_incidents.sql` (untracked, 2026-07-08). Re-verify the latest number with `ls migrations/ | tail -5` immediately before creating this migration and claim the next free number; do not collide with concurrent work. Latest *numbered* migration in the planning audit was `0039`.
- **Approach**: rebuild table (mirror `0035` pattern: `account_security_events__hmac_rebuild` style create-copy/drop/rename) because D1 can't `ALTER ... CHECK`. Preserve all existing rows. Re-create the two existing indexes.
- **New class values to add**: `beta_feedback_submissions`, `legal_terms_acceptances`, `publication_digest_log`, `privacy_request_triage`, `privacy_request_export`, `privacy_request_erasure`.
- **Backfill**: copy existing rows.
- **Rollback**: restore from daily D1 backup (fix-forward preferred).
- **Local proof**: `bun run cf:d1-restore-rehearsal` + insert test for each new class.
- **Complexity**: Medium.
- **Parallelization**: sequential (migration must precede rule/code changes referencing new classes).
- **Status**: `planned`.

### Task 1.2 — Extend `RetentionClassName` + `DEFAULT_RETENTION_RULES` to 14 (+ new) classes
- **Task ID**: T-1.2.
- **REQ IDs**: REQ-RET-001, REQ-RET-003.
- **Objective**: Add rules for `ai_action_runs` (365d purge), `ai_tool_calls` (365d purge via `run_id` cascade — note `ON DELETE CASCADE` from `ai_action_runs`), `ai_data_access_events` (365d purge, cascade), `logs_worker_observability` (acceptance row, `platformManaged: true`), `logs_email_delivery` (acceptance row), `uploads_orphaned` (30d, reuse upload-cleanup definition), `sessions_expired` (acceptance row, Better Auth manages). Plus `beta_feedback_submissions` (TBD TTL pending counsel — default 365d), `legal_terms_acceptances` (long retention, default 2555d — evidence), `publication_digest_log` (90d).
- **Target files**: `src/lib/compliance/retention-core.ts`.
- **Target symbols**: `RetentionClassName` union; `DEFAULT_RETENTION_RULES`; `RetentionRule` type (add `platformManaged?: boolean`, `batchSize?: number`).
- **Implementation notes**:
  - `ai_tool_calls`/`ai_data_access_events` have `ON DELETE CASCADE` from `ai_action_runs.run_id`, so purging `ai_action_runs` cascades. Add a rule for `ai_action_runs` only; document cascade.
  - `logs_*`/`sessions_expired` rules: `selectSql` returns nothing (or a constant); `applySql` is a no-op; the engine writes an acceptance audit row with `rows_affected: 0` and `notes: "platform-managed"`. Extend `runRetentionPassInD1` to honor `platformManaged`.
  - `uploads_orphaned`: define "orphaned" = `upload_assets` rows with no matching `target_entity_id` reference OR `upload_sessions` in `reserved/failed/expired/deleted` past cutoff. Reuse `buildUploadRetentionCutoffs`. This rule may overlap the existing upload-cleanup job — coordinate so they don't double-delete: the retention rule writes a `data_retention_events` acceptance row and **defers** actual R2 deletion to the upload-cleanup job (which already owns R2 deletion). Recommendation: `uploads_orphaned` rule = audit/acceptance only, referencing the upload-cleanup correlation.
- **Expected output**: registry length matches union cardinality.
- **Tests**: `tests/vitest/compliance-retention-repository.test.ts` (extend) — assert all classes present + each `platformManaged` rule writes acceptance row without deleting.
- **Complexity**: Medium.
- **Parallelization**: sequential after T-1.1.
- **Status**: `planned`.

### Task 1.3 — Wire non-purge actions (`anonymized`, `soft_deleted`, `skipped_legal_hold`)
- **Task ID**: T-1.3.
- **REQ IDs**: REQ-RET-004.
- **Objective**: The engine supports UPDATE-style actions. `anonymized` rewrites actor columns; `soft_deleted` sets `deleted_at`; `skipped_legal_hold` skips rows where `legal_hold=1` (once DB-04 lands).
- **Target**: `src/lib/compliance/retention-core.ts` `runRetentionPassInD1`.
- **Approach**: today apply is always a `DELETE`. Extend: if `rule.action === 'anonymized' || 'soft_deleted'`, the `applySql` is an UPDATE (rule supplies it); engine behavior unchanged (select ids → bind JSON → run applySql → read `meta.changes` → audit). No new engine branch needed beyond allowing UPDATE `applySql`. Add a unit test that an `anonymized` rule runs UPDATE not DELETE.
- **Complexity**: Small-Medium.
- **Parallelization**: sequential after T-1.2 (depends on type changes).
- **Status**: `planned`.

### Task 1.4 — Cron env-gate (`RETENTION_DRY_RUN` / `RETENTION_ENABLED`)
- **Task ID**: T-1.4.
- **REQ IDs**: REQ-CRON-001, REQ-CRON-002.
- **Objective**: `worker.ts` reads env flags; default dry-run. `cronRunId` already passed (idempotency).
- **Target**: `worker.ts` lines 109-115; `src/lib/compliance/retention-repository.ts` `runRetentionPass` (read env); `cloudflare-env.d.ts` (add `RETENTION_DRY_RUN?`/`RETENTION_ENABLED?` to `CloudflareWorkerEnv`, then `bun run cf:typegen` if binding types change — these are vars, not bindings, so likely just env string fields).
- **Logic**: `const dryRun = env.RETENTION_DRY_RUN === "1" || env.RETENTION_ENABLED !== "1";` → pass `{ dryRun, cronRunId }`.
- **Tests**: worker scheduled() test with mock env (dry-run → no DELETE; apply → DELETE).
- **Complexity**: Small.
- **Parallelization**: parallel-safe with T-1.2/T-1.3 (different file).
- **Status**: `planned`.

### Task 1.5 — Performance evaluator script `cf:d1-retention-proof`
- **Task ID**: T-1.5.
- **REQ IDs**: REQ-CRON-001 (evidence), PERF-01.
- **Objective**: A script that runs the pass against a seeded local D1, records per-class duration/query-count/rows, emits JSON.
- **Target**: `scripts/generate-cloudflare-d1-retention-proof.ts`; add `cf:d1-retention-proof` to `package.json` scripts.
- **Complexity**: Medium.
- **Parallelization**: parallel-safe (new file).
- **Status**: `planned`.

---

## Phase 2 — Admin DSAR triage + transitions + legal-hold gate

**Objective**: Platform-admin can list/read/transition requests; transitions audited; legal-hold policy isolated.
**Requirements addressed**: REQ-DSAR-001, REQ-RET-005, REQ-LEGAL-002, REQ-LEGAL-003.
**Prerequisites**: Phase 1 (DB-05 for triage audit class).
**Dependencies**: none new.

### Durable-goal contract (Phase 2)
- **Goal ID**: RET-DSAR-P2.
- **Objective**: Admin triage workflow with audited transitions; legal-hold gated.
- **Requirements covered**: REQ-DSAR-001, REQ-RET-005, REQ-LEGAL-002/003.
- **Required evidence**: repo transition unit tests (all legal + illegal); role-matrix denial test; triage audit rows in `data_retention_events`.
- **Completion audit**: transition graph enforced; non-admin denied; audit written per transition.
- **Stop condition**: all three evidence items present.
- **Blocker condition**: none (legal-hold policy gate is for `skipped_legal_hold` enforcement, not triage).
- **Review gate**: lead + security review.
- **QA gate**: B matrix shadow-path.

### Task 2.1 — `transitionPrivacyRequest` repo function
- **Task ID**: T-2.1.
- **REQ IDs**: REQ-DSAR-001.
- **Objective**: Enforce the status graph (§06.5); write audit.
- **Target**: `src/lib/compliance/privacy-request-repository.ts`.
- **Contract**:
  ```ts
  transitionPrivacyRequest(input: {
    id: string;
    toStatus: PrivacyRequestStatus;
    actorUserId: string;
    reason: string;
    dbOverride?: D1DatabaseLike;
  }): Promise<{ status: PrivacyRequestStatus; auditId: string }>
  ```
  - Illegal transition → throw `PRIVACY_REQUEST_ILLEGAL_TRANSITION`.
  - Optimistic guard: `UPDATE privacy_requests SET status=?, updated_at=?, triaged_at=?, resolved_at=?, triaged_by=? WHERE id=? AND status=?` (expected current status passed or derived) → if `changes === 0`, conflict.
  - Write audit: `data_retention_events` (class `privacy_request_triage`, action `soft_deleted` is wrong — use a neutral action; **recommendation**: extend the `action` CHECK to add `transitioned` for triage, OR reuse `anonymized` semantically — **cleaner: add `transitioned` action**). This requires DB-05 to also add `transitioned` to the action CHECK.
- **Tests**: `tests/vitest/compliance-privacy-request-transition.test.ts` — all legal transitions + illegal + conflict + audit write.
- **Complexity**: Medium.
- **Parallelization**: sequential after T-1.1.
- **Status**: `planned`.

### Task 2.2 — Admin triage route + Server Action
- **Task ID**: T-2.2.
- **REQ IDs**: REQ-DSAR-001.
- **Objective**: `POST /api/admin/privacy-requests/[id]/transition` + `GET /api/admin/privacy-requests` (list).
- **Target**: `src/app/api/admin/privacy-requests/route.ts` (GET list), `src/app/api/admin/privacy-requests/[id]/transition/route.ts` (POST). Platform-admin gate via `isPlatformAdminRole` (or new `requirePlatformAdmin`).
- **Tests**: role-matrix denial (non-admin → 403/404); transition success.
- **Complexity**: Medium.
- **Parallelization**: sequential after T-2.1.
- **Status**: `planned`.

### Task 2.3 — Admin triage UI (read-only-planned; impl in Phase 6)
- **Task ID**: T-2.3.
- **REQ IDs**: REQ-DSAR-001, UX.
- **Objective**: `/workshop/admin/privacy-requests` page + queue component + detail drawer + transition form.
- **Target**: `src/app/workshop/admin/privacy-requests/page.tsx`, `src/components/admin/PrivacyRequestQueue.tsx`, etc. Reuse `src/components/ui/`.
- **Complexity**: Medium-Large.
- **Parallelization**: parallel-safe after T-2.2 (frontend vs backend).
- **Status**: `planned`.

### Task 2.4 — Legal-hold policy gate (DB-04 deferred)
- **Task ID**: T-2.4.
- **REQ IDs**: REQ-RET-005.
- **Objective**: DB-04 migration + `skipped_legal_hold` enforcement **deferred** until `OPEN-DEC-006` resolves (who can set, scope). Code path (`runRetentionPassInD1` honors `legal_hold`) lands behind `RETENTION_LEGAL_HOLD_ENABLED` flag (default off).
- **Status**: `BLOCKED-EXTERNAL` (policy) + `planned` (code behind flag).
- **Decision owner**: Philip + counsel (`OPEN-DEC-006`).

---

## Phase 3 — DSAR export builder

**Objective**: Build a structured data-subject package for access/portability requests.
**Requirements addressed**: REQ-DSAR-002.
**Prerequisites**: Phase 2.
**Dependencies**: none new.

### Durable-goal contract (Phase 3)
- **Goal ID**: RET-DSAR-P3.
- **Objective**: Export builder + delivery + rate limit.
- **Requirements covered**: REQ-DSAR-002.
- **Required evidence**: builder unit test (fixture → expected keys); integration test (D1 fixture → package); rate-limit denial test.
- **Completion audit**: package covers all personal-data tables for target user; size-capped; rate-limited.
- **Stop condition**: evidence present.
- **Blocker condition**: `OPEN-DEC-008` (format/delivery) — default JSON + signed R2 URL interim.
- **Review gate**: lead + security (cross-workspace leak check).
- **QA gate**: C matrix shadow-path.

### Task 3.1 — `dsar-export-builder.ts`
- **Task ID**: T-3.1.
- **REQ IDs**: REQ-DSAR-002.
- **Objective**: Build package per `07_` §1 inventory (profiles, onboarding, terms acceptances, feedback, audit events actor-scoped, memberships, shared_link_recipients, upload metadata, AI audit actor-scoped).
- **Target**: new `src/lib/compliance/dsar-export-builder.ts` (`"server-only"`).
- **Contract**:
  ```ts
  buildDsarExportPackage(input: {
    targetUserId: string;
    format?: "json";
    dbOverride?: D1DatabaseLike;
  }): Promise<{ packageJson: string; sizeBytes: number; tableCounts: Record<string, number> }>
  ```
  - All reads filtered by `targetUserId` (or actor col). No cross-workspace leakage.
  - Size cap: warn + truncate at N MB (model on proposal-export caps).
- **Reuse**: mirror `src/lib/proposal-export/` builder discipline (caps, no infinite loops).
- **Tests**: `tests/vitest/dsar-export-builder.test.ts` — fixture two users → package for A excludes B; counts correct.
- **Complexity**: Large.
- **Parallelization**: parallel-safe after Phase 2 (independent file).
- **Status**: `planned`.

### Task 3.2 — Export Server Action + R2 delivery
- **Task ID**: T-3.2.
- **REQ IDs**: REQ-DSAR-002.
- **Objective**: `POST /api/admin/privacy-requests/[id]/export` → build → upload to R2 (`provider-proof/dsar-export/<requestId>.json`) → return signed URL.
- **Target**: `src/app/api/admin/privacy-requests/[id]/export/route.ts`.
- **Rate limit**: per-admin + per-target via `security_rate_limit_events` (new scopes `dsar_export_admin`, `dsar_export_target`).
- **Cache**: package cached within TTL keyed by `(requestId, format)`.
- **Tests**: export success + rate-limit denial.
- **Complexity**: Medium.
- **Parallelization**: sequential after T-3.1.
- **Status**: `planned`.

---

## Phase 4 — DSAR erasure orchestrator + R2 tombstone

**Objective**: Propagate erasure across the personal-data surface; tombstone R2; revoke Better Auth.
**Requirements addressed**: REQ-DSAR-003, REQ-R2-001, REQ-R2-002.
**Prerequisites**: Phase 2 (status guard), Phase 3 (export-then-erase pattern optional).
**Dependencies**: DB-01, DB-02, DB-03; Better Auth revocation API (DISCOVERY-REQUIRED).

### Durable-goal contract (Phase 4)
- **Goal ID**: RET-DSAR-P4.
- **Objective**: Erasure orchestrator runs the propagation map; R2 tombstone+purge; Better Auth revoke.
- **Requirements covered**: REQ-DSAR-003, REQ-R2-001/002.
- **Required evidence**: orchestrator unit test (fixture → expected propagation); R2 receipt test; idempotency test; denial test; Better Auth revoke proof.
- **Completion audit**: every map target affected; receipt written; idempotent; non-admin denied.
- **Stop condition**: evidence present.
- **Blocker condition**: `OPEN-DEC-007` (identity-verification threshold for erasure) — code lands behind `DSAR_ERASURE_ENABLED=0` default.
- **Review gate**: lead + security + privacy.
- **QA gate**: D + F matrix shadow-paths.

### Task 4.1 — DB-01/02/03 migrations
- **Task ID**: T-4.1.
- **REQ IDs**: REQ-DSAR-003, REQ-R2-001.
- **Objective**: Apply blueprints DB-01 (`profiles`), DB-02 (audit anonymize column), DB-03 (`upload_assets` tombstone columns).
- **Target**: `migrations/<NNNN>_profiles_soft_delete.sql`, `<NNNN+1>_audit_anonymize_columns.sql`, `<NNNN+2>_upload_assets_dsar_tombstone.sql` — exact numbers chosen at impl time after re-running `ls migrations/ | tail -5`. **Concurrency note**: `migrations/0040_operational_incidents.sql` already existed at planning time (concurrent agent work); the next free number at impl time is likely `0041+` (or higher if more concurrent migrations land). Do not collide.
- **Complexity**: Small each.
- **Parallelization**: sequential (migration order).
- **Status**: `planned`.

### Task 4.2 — DISCOVERY: Better Auth revocation API
- **Task ID**: T-4.2.
- **REQ IDs**: REQ-DSAR-003.
- **Objective**: Confirm the exact Better Auth API to revoke all sessions/accounts/verification for a user_id and mark the user deleted/anonymized.
- **Search scope**: `node_modules/better-auth/` docs + `src/lib/auth/` usage; Better Auth 1.6.22.
- **Stop condition**: named API function(s) + evidence they work against the D1 auth tables.
- **Expected evidence**: doc citation + a tiny proof snippet.
- **Classification**: `DISCOVERY-REQUIRED` (read-only, no code change).
- **Complexity**: Small.
- **Parallelization**: parallel-safe (read-only).
- **Status**: `planned`.

### Task 4.3 — `dsar-propagation-map.ts`
- **Task ID**: T-4.3.
- **REQ IDs**: REQ-DSAR-003.
- **Objective**: Declarative map (§07.3) the orchestrator iterates.
- **Target**: new `src/lib/compliance/dsar-propagation-map.ts`.
- **Contract**: `PROPAGATION_MAP: ReadonlyArray<PropagationTarget>` where `PropagationTarget = { table, actorCol?, action: 'anonymized'|'soft_deleted'|'tombstoned'|'kept', sql, evidence: boolean }`.
- **Tests**: map-only test (data shape).
- **Complexity**: Small-Medium.
- **Parallelization**: parallel-safe after T-4.1.
- **Status**: `planned`.

### Task 4.4 — `dsar-erasure-orchestrator.ts`
- **Task ID**: T-4.4.
- **REQ IDs**: REQ-DSAR-003, REQ-R2-001, REQ-R2-002.
- **Objective**: Run the map + Better Auth revoke + R2 tombstone + receipt + audit. Idempotent via `privacy_requests.status` + correlation ID (reuse `createBulkActionCorrelationId` from `src/lib/mass-deletion/bulk-action.ts`).
- **Target**: new `src/lib/compliance/dsar-erasure-orchestrator.ts` (`"server-only"`).
- **Contract**:
  ```ts
  runDsarErasure(input: {
    privacyRequestId: string;
    targetUserId: string;
    actorUserId: string;
    confirmationPhrase: string;
    dbOverride?: D1DatabaseLike;
    r2Override?: R2Bucket;
  }): Promise<{ correlationId: string; affectedCounts: Record<string, number>; receiptKey: string }>
  ```
  - Validate typed phrase (reuse `validateTypedConfirmationPhrase`).
  - Status guard: only run if `status === 'in_progress'` and not already erased (idempotency).
  - Per-target UPDATE/DELETE; on any failure, record `data_retention_events` error row, do NOT set `completed`.
  - R2 receipt: `provider-proof/dsar/<requestId>.json` via `env.ARCH_UPLOADS_R2.put`.
  - Set `privacy_requests.status = 'completed'`, `resolved_at` only after all targets succeed.
- **Tests**: `tests/vitest/dsar-erasure-orchestrator.test.ts` — full propagation; idempotent re-run; partial failure (one target errors → not completed); R2 receipt written; phrase missing → throws.
- **Complexity**: Large.
- **Parallelization**: sequential after T-4.1, T-4.2, T-4.3.
- **Status**: `planned`.

### Task 4.5 — R2 purge sweep (cron)
- **Task ID**: T-4.5.
- **REQ IDs**: REQ-R2-001.
- **Objective**: A cron hook (merged into `30 3 * * *` or a new trigger) that purges R2 objects where `upload_assets.dsar_purge_after < now` and writes a `data_retention_events` row.
- **Target**: new `src/lib/compliance/dsar-r2-purge.ts`; hook in `worker.ts` scheduled() alongside retention pass.
- **Approach**: select `upload_assets` rows past purge window → `storageProvider.removeObjects` (reuse `createUploadCleanupStorageFromProvider` chunking) → mark purged → audit.
- **Tests**: `tests/vitest/dsar-r2-purge.test.ts` — purge + retry on failure.
- **Complexity**: Medium.
- **Parallelization**: sequential after T-4.4.
- **Status**: `planned`.

### Task 4.6 — Erasure Server Action + admin UI
- **Task ID**: T-4.6.
- **REQ IDs**: REQ-DSAR-003.
- **Objective**: `POST /api/admin/privacy-requests/[id]/erasure` + confirmation modal (typed phrase). Behind `DSAR_ERASURE_ENABLED` flag (default off until `OPEN-DEC-007`).
- **Target**: `src/app/api/admin/privacy-requests/[id]/erasure/route.ts`; modal in `src/components/admin/`.
- **Tests**: role-matrix denial; phrase missing → 400; flag off → 503.
- **Complexity**: Medium.
- **Parallelization**: sequential after T-4.4.
- **Status**: `planned`.

---

## Phase 5 — Cron proof + 30-day hosted observation gate

**Objective**: Prove the cron runs hosted for 30 days; operator dashboard.
**Requirements addressed**: REQ-CRON-003, REQ-EVID-002, REQ-LOG-001/002.
**Prerequisites**: Phase 1.
**Dependencies**: hosted Worker deploy.

### Durable-goal contract (Phase 5)
- **Goal ID**: RET-DSAR-P5.
- **Objective**: Hosted 30-day cron proof + operator dashboard + runbook.
- **Requirements covered**: REQ-CRON-003, REQ-EVID-002, REQ-LOG-001/002.
- **Required evidence**: hosted `data_retention_events` query (≥30 distinct `ran_at` days, error-skip ≤ threshold); operator dashboard queries; runbook.
- **Completion audit**: 30-day query returns clean; dashboard renders; runbook covers incidents.
- **Stop condition**: 30 hosted days clean OR owner accepts shorter window for beta.
- **Blocker condition**: hosted cron not deployed/triggering.
- **Review gate**: lead + ops.
- **QA gate**: E matrix + ops drill.

### Task 5.1 — Deploy retention apply to hosted Worker (after dry-run staging)
- **Task ID**: T-5.1.
- **Objective**: Set hosted `RETENTION_DRY_RUN=1` first (observe dry-run rows), then `RETENTION_ENABLED=1` + `RETENTION_DRY_RUN=0` after 3 clean dry-run days.
- **Target**: Wrangler vars (`wrangler.jsonc` `vars` block or `wrangler secret put` for the env — vars are fine, not secrets).
- **Complexity**: Small.
- **Parallelization**: sequential.
- **Status**: `planned` (ops).

### Task 5.2 — Operator dashboard + queries
- **Task ID**: T-5.2.
- **REQ IDs**: REQ-EVID-002.
- **Objective**: `/workshop/admin/retention` page + `retention-operational-snapshot.ts` (mirrors `buildUploadCleanupOperationalSnapshot`).
- **Target**: `src/app/workshop/admin/retention/page.tsx`, `src/lib/compliance/retention-operational-snapshot.ts`.
- **Queries**: last run per class, rows affected, error-skip count, R2 DSAR purge backlog, DSAR queue depth.
- **Complexity**: Medium.
- **Parallelization**: parallel-safe.
- **Status**: `planned`.

### Task 5.3 — Hosted 30-day observation query
- **Task ID**: T-5.3.
- **REQ IDs**: REQ-CRON-003.
- **Objective**: The query + checklist an operator runs after 30 days to assert the gate.
- **Target**: `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` (documented) + a `scripts/check-cloudflare-d1-retention-30-day-proof.ts` (optional helper).
- **Complexity**: Small.
- **Parallelization**: parallel-safe.
- **Status**: `planned`.

---

## Phase 6 — Tests, adversarial QA, runbook, docs closeout

**Objective**: Full test matrix green; adversarial matrix executed; runbook published; docs updated.
**Requirements addressed**: REQ-TEST-001, all.
**Prerequisites**: Phases 1–5.
**Dependencies**: none new.

### Durable-goal contract (Phase 6)
- **Goal ID**: RET-DSAR-P6.
- **Objective**: Test + QA + docs completeness.
- **Requirements covered**: REQ-TEST-001 + cross-cutting.
- **Required evidence**: `12_` matrix all green; `19_` adversarial matrix executed; runbook; docs updated.
- **Stop condition**: all green + docs updated.
- **Review gate**: lead + independent reviewer.
- **QA gate**: full adversarial pass.

### Task 6.1 — Test execution matrix (per `12_`)
- **Task ID**: T-6.1.
- **Status**: `planned` (each phase carries its own tests; this task aggregates).

### Task 6.2 — Adversarial QA matrix (per `19_`)
- **Task ID**: T-6.2.
- **Status**: `planned`.

### Task 6.3 — Runbook + dashboard queries (`13_`)
- **Task ID**: T-6.3.
- **Status**: `planned` (documented in this pack).

### Task 6.4 — Docs closeout
- **Task ID**: T-6.4.
- **Objective**: Bump `retention-schedule.md` status (after `OPEN-DEC-004`); update roadmap P1.8; append `current-state.md`; add `OPEN-DEC-006/007/008` to `decisions.md`.
- **Status**: `planned` (at impl closeout).

---

## Cross-phase notes

- **Server/client boundary**: all admin routes dynamic Server Components; `"use client"` minimal.
- **Cache/revalidation**: TanStack Query invalidation after mutations; no `use cache`.
- **Bundle/RSC impact**: admin-only; minimal.
- **Cloudflare resource boundary**: `ARCH_DB`, `ARCH_UPLOADS_R2`, `EMAIL` only. No Supabase/Vercel/Resend.
- **Performance measurement**: PERF-01/02/03 evaluators (Phase 1 + 3 + 4).
- **Rollback**: env flags + nullable-column DROPs + daily D1 backup.
