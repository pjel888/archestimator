# 07 — Data, Database, API, and Network Plan

## §1. Per-class data inventory (REQ-INV-001)

| Class (RetentionClassName or other) | Backing table / namespace | PII? | Owner | Lifecycle | Currently enforced? |
|---|---|---|---|---|---|
| `account_security_events` | `account_security_events` | yes (user_id, ip_hash, ua_hash) | platform | purge 365d | ✅ |
| `account_audit_legacy_sha256` | `account_security_events` (filter `sha256:`) | yes | platform | purge 180d | ✅ |
| `collaboration_audit_events` | `collaboration_audit_events` | yes (actor_user_id) | workspace/platform | purge 365d | ✅ |
| `shared_link_events` | `shared_link_events` | yes (recipient_id, ip_hash) | platform | purge 90d | ✅ |
| `estimate_sheet_events` | `estimate_sheet_events` | yes (actor_user_id) | workspace | purge 365d | ✅ |
| `privacy_requests_completed` | `privacy_requests` (`status=completed`) | yes (hashed email) | platform | purge 2555d | ✅ |
| `privacy_requests_rejected` | `privacy_requests` (`status=rejected`) | yes | platform | purge 365d | ✅ |
| `ai_action_runs` | `ai_action_runs` | yes (actor_user_id, hashes) | workspace/platform | purge 365d | ❌ (Phase 1) |
| `ai_tool_calls` | `ai_tool_calls` | yes (actor_user_id, hashes) | workspace/platform | purge 365d | ❌ (Phase 1) |
| `ai_data_access_events` | `ai_data_access_events` | yes (actor_user_id, hashes) | workspace/platform | purge 365d | ❌ (Phase 1) |
| `logs_worker_observability` | Cloudflare Workers Observability (platform) | possibly | processor-managed | platform TTL (documented) | ❌ acceptance row (Phase 1) |
| `logs_email_delivery` | Cloudflare Email logs (platform) | possibly | processor-managed | 90d (documented) | ❌ acceptance row (Phase 1) |
| `uploads_orphaned` | `upload_assets`/`upload_sessions` (no assoc record) | possibly | workspace/platform | 30d (reuse upload-cleanup) | ❌ (Phase 1) |
| `sessions_expired` | Better Auth `session` (platform) | yes | processor-managed | Better Auth expiry (documented) | ❌ acceptance row (Phase 1) |
| (non-class) profiles | `profiles` | yes (email) | platform | DSAR soft-delete | DSAR (Phase 4) |
| (non-class) beta_feedback_submissions | `beta_feedback_submissions` | yes (user_id, user_email) | platform/workspace | DSAR export; retention via account purge | DSAR (Phase 3/4) |
| (non-class) legal_terms_acceptances | `legal_terms_acceptances` | yes (user_id) | platform | DSAR export; long retention (evidence) | DSAR (Phase 3) |
| (non-class) user_onboarding_profiles | `user_onboarding_profiles` | yes (marketing_consent_at) | platform | DSAR export; anonymize on erasure | DSAR (Phase 3/4) |
| (non-class) project/estimate/sheet members | `project_members`, `estimate_sheet_members`, `workspace_members` | yes (user_id) | workspace | DSAR export; anonymize on erasure | DSAR (Phase 3/4) |
| (non-class) shared_link_recipients/comments/responses | `shared_link_recipients`, `shared_link_comments`, `shared_link_responses` | yes (recipient email/token) | platform | retention via shared_link_events; DSAR | DSAR (Phase 3/4) |
| (non-class) publication_digest_log | `publication_digest_log` | yes (recipient) | platform | purge 90d aligning email logs | Consider Phase 1+ |
| (non-class) mass_deletion_events | `mass_deletion_events` | yes (actor) | workspace/platform | long retention (evidence) | unchanged |
| (non-class) upload_events | `upload_events` | yes (actor) | workspace/platform | 365d (per upload policy `auditEventRetentionDays`) | unchanged |

> Implementation note: the personal-data classes not in `RetentionClassName` today either need (a) a new class added to the enum + registry, or (b) explicit "handled by DSAR export / account-level purge" annotation. The pack recommends adding `beta_feedback_submissions`, `legal_terms_acceptances`, `publication_digest_log` as new classes where a time-based purge is appropriate, and treating membership/feedback rows as DSAR-export-only (no independent TTL) unless counsel specifies otherwise (`OPEN-DEC-004`).

## §2. Retention policy source of truth

- **Phase 1**: `DEFAULT_RETENTION_RULES` in `src/lib/compliance/retention-core.ts` remains the single constant. Add a docstring marker: `DRAFT — pending OPEN-DEC-004`.
- **Phase N+ (deferred)**: optional `retention_policy` D1 table:
  ```sql
  CREATE TABLE IF NOT EXISTS retention_policy (
    class_name TEXT PRIMARY KEY,
    ttl_days INTEGER NOT NULL,
    action TEXT NOT NULL,
    effective_at TEXT NOT NULL,
    superseded_at TEXT,
    notes TEXT,
    CHECK (action IN ('tombstoned','anonymized','purged','soft_deleted','skipped_legal_hold'))
  );
  ```
  This enables operator-tunable TTLs without a deploy, but is **not required** for P1.8 acceptance. Deferred per DEC-002.

## §3. DSAR erasure propagation map (REQ-DSAR-003)

| Target table / namespace | Action | SQL shape | Keeps evidence? | Phase |
|---|---|---|---|---|
| `profiles` | `soft_deleted` + email anonymize | `UPDATE profiles SET deleted_at=?, email='erased:'||?||'@local', display_name=NULL WHERE id=?` | row kept | 4 |
| Better Auth `user` | revoke + mark | Better Auth API: revoke sessions/accounts; mark user (scramble email if API allows, else mirror in `profiles`) | n/a | 4 |
| Better Auth `session`/`account`/`verification` | revoke | Better Auth API: invalidate all for user_id | n/a | 4 |
| `account_security_events` | `anonymized` | `UPDATE ... SET user_id='erased:'||? WHERE user_id=? AND <past cutoff optional>` | row kept (audit) | 4 |
| `estimate_sheet_events` | `anonymized` actor | `UPDATE ... SET actor_user_id='erased:'||? WHERE actor_user_id=?` | row kept | 4 |
| `collaboration_audit_events` | `anonymized` actor | `UPDATE ... SET actor_user_id='erased:'||? WHERE actor_user_id=?` | row kept | 4 |
| `shared_link_events` | `anonymized` recipient | `UPDATE ... SET recipient_id='erased:'||? WHERE recipient_id=?` (+ ip_hash null) | row kept | 4 |
| `upload_assets` (R2 metadata) | `tombstoned` | `UPDATE upload_assets SET dsar_erased_at=?, dsar_purge_after=? WHERE actor_user_id=?` | metadata kept until purge | 4 |
| R2 objects (uploads owned by user) | tombstone now, purge +30d | cron sweep: `DELETE` R2 object where `dsar_purge_after < now` | receipt kept | 4 |
| `beta_feedback_submissions` | `anonymized` | `UPDATE ... SET user_id='erased:'||?, user_email=NULL WHERE user_id=?` | row kept (content may need counsel review) | 4 |
| `user_onboarding_profiles` | `anonymized` | `UPDATE ... SET marketing_consent_at=NULL, ... WHERE user_id=?` | row kept | 4 |
| `workspace_members`/`project_members`/`estimate_sheet_members` | `anonymized` actor | `UPDATE ... SET user_id='erased:'||? WHERE user_id=?` (or leave; counsel) | row kept | 4 (counsel) |
| `shared_link_recipients` | `anonymized` | scramble email/token; keep aggregate | row kept | 4 |
| `privacy_requests` (this request) | `kept` | no change; status=completed + resolved_at | **kept as evidence** | 4 |
| `ai_action_runs`/`ai_tool_calls`/`ai_data_access_events` | `anonymized` actor | `UPDATE ... SET actor_user_id='erased:'||? WHERE actor_user_id=?` | row kept | 4 |
| `data_retention_events` (this request's rows) | `kept` | no change | **kept as evidence** | 4 |

> The propagation map is **declarative** (`src/lib/compliance/dsar-propagation-map.ts`): a list of `{ target, action, sql, evidence }` entries the orchestrator iterates. This makes it auditable and testable as data, mirroring the retention rule registry philosophy.

## §4. Database Change Blueprints

### Blueprint DB-01 — `profiles.deleted_at` + email-anonymize support (Phase 4)
- **Migration**: `migrations/<NNNN>_profiles_soft_delete.sql` where `NNNN` is the **next free number at impl time**. NOTE: at planning time `migrations/0040_operational_incidents.sql` was already created by concurrent agent work (untracked, 2026-07-08), so the next free number is likely `0041+`. **Re-verify with `ls migrations/ | tail -5` before creating any migration** — do not collide with concurrent work.
- **Change**:
  ```sql
  ALTER TABLE profiles ADD COLUMN deleted_at TEXT;
  ALTER TABLE profiles ADD COLUMN erased_request_id TEXT;
  CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
  ```
- **Backfill**: none (nullable column).
- **Existing-data compatibility**: nullable; existing rows unaffected.
- **Cardinality**: 1 row per user; index partial.
- **Query count**: DSAR erasure = 1 UPDATE.
- **Rollback**: `ALTER TABLE profiles DROP COLUMN deleted_at; DROP COLUMN erased_request_id;` (D1 supports DROP COLUMN).
- **Local proof**: `bun run cf:d1-restore-rehearsal` + repository test.

### Blueprint DB-02 — Audit-table `anonymized_actor` support (Phase 4)
- **Migration**: `migrations/0041_audit_anonymize_columns.sql`.
- **Change**: add `anonymized_at TEXT` and `anonymized_request_id TEXT` to `account_security_events`, `estimate_sheet_events`, `collaboration_audit_events`, `shared_link_events`. (Or, to minimize columns, store a single `anonymized_at` and rewrite the actor column to `erased:<request_id>` — the pack recommends the single-column approach to avoid 4× column sprawl; the actor rewrite is the anonymization.)
- **Recommended minimal change**:
  ```sql
  ALTER TABLE account_security_events ADD COLUMN anonymized_at TEXT;
  -- (repeat for the other 3 tables)
  ```
  The actor column (`user_id`/`actor_user_id`/`recipient_id`) is rewritten in place to `erased:<request_id>`; `anonymized_at` records when.
- **Rollback**: `DROP COLUMN anonymized_at` per table.
- **Proof**: repository test (anonymize → read back).

### Blueprint DB-03 — `upload_assets` DSAR tombstone columns (Phase 4)
- **Migration**: `migrations/0042_upload_assets_dsar_tombstone.sql`.
- **Change**:
  ```sql
  ALTER TABLE upload_assets ADD COLUMN dsar_erased_at TEXT;
  ALTER TABLE upload_assets ADD COLUMN dsar_purge_after TEXT;
  CREATE INDEX IF NOT EXISTS idx_upload_assets_dsar_purge
    ON upload_assets(dsar_purge_after) WHERE dsar_purge_after IS NOT NULL;
  ```
- **Rollback**: drop columns + index.
- **Proof**: DSAR R2 receipt test.

### Blueprint DB-04 — `legal_hold` (Phase 2, gated on OPEN-DEC-006)
- **Migration**: `migrations/0043_retention_legal_hold.sql` (deferred until policy decision).
- **Change** (illustrative; exact tables per policy):
  ```sql
  ALTER TABLE account_security_events ADD COLUMN legal_hold INTEGER NOT NULL DEFAULT 0 CHECK (legal_hold IN (0,1));
  -- (per retention-target table per OPEN-DEC-006 scope)
  ```
- **Rollback**: drop column.
- **Status**: `planned` but policy-blocked.

### Blueprint DB-05 — New retention classes + `transitioned` action (Phase 1)
- **Migration**: `migrations/<NNNN>_data_retention_events_new_classes.sql` (next free number at impl time; concurrent `0040_operational_incidents.sql` exists — re-verify).
- **Change**: expand the `class_name` CHECK on `data_retention_events` to add new classes (`beta_feedback_submissions`, `legal_terms_acceptances`, `publication_digest_log`, `privacy_request_triage`, `privacy_request_export`, `privacy_request_erasure`), **and** add a new `transitioned` value to the `action` CHECK (used by privacy-request triage audit rows — reusing `anonymized`/`soft_deleted` for a status transition is semantically wrong). Since D1 can't ALTER CHECK in place, rebuild the table (mirror migration `0035` pattern: create-copy, drop, rename, re-create indexes). The `RetentionAction` type in `retention-core.ts` must also add `"transitioned"`.
- **Rollback**: restore prior `data_retention_events` from backup (daily D1 backup) — destructive, so fix-forward preferred.
- **Proof**: `cf:d1-restore-rehearsal` + registry test.

### Blueprint DB-06 — (Optional, deferred) `retention_policy` table
- See §2. Deferred.

## §5. Migration sequencing
Order: DB-05 (new classes) → DB-01 (profiles) → DB-02 (audit anonymize) → DB-03 (upload tombstone) → DB-04 (legal hold, gated). Each is independent and can land separately. DB-05 must land before Phase 1 rule expansion if new classes are added to the enum.

## §6. Idempotency, uniqueness, concurrency
- Retention pass: select-then-apply within a run; `cron_run_id` tags the run. Two concurrent crons (rare; cron is daily) would double-select but the apply is idempotent for `purged` (DELETE is idempotent) and for `anonymized`/`soft_deleted` (setting `deleted_at`/`anonymized_at` again is a no-op). Add a guard: skip rows already `deleted_at IS NOT NULL` / `anonymized_at IS NOT NULL`.
- DSAR erasure: `privacy_requests.status` guard — once `completed`, re-run is a no-op. Correlation ID (`createBulkActionCorrelationId`) groups the propagation.
- DSAR export: cached package within TTL keyed by `(requestId, format)`; re-build returns cached.

## §7. Query plans, cardinality, indexes
- Retention selects use `created_at < ?` with `LIMIT 500`. Existing indexes: `account_security_events` has `(user_id, created_at)`, `(workspace_id, created_at)`, `(event_type, created_at)` — a bare `created_at` index does not exist; the select does a scan. **Recommendation**: add `idx_<table>_created_at(created_at)` for each retention-target table if EXPLAIN shows a full scan at scale. At current beta volume this is acceptable; flag for the 10×/100× review.
- DSAR export reads are user-scoped; existing `(user_id/actor_user_id, created_at)` indexes cover them.
- Operator dashboard queries are low-cardinality aggregates; acceptable.

## §8. D1 access-authorization (app-authz)
- Retention pass runs in the Worker `scheduled()` handler with the `ARCH_DB` binding — **no app-authz check** (it is a system cron, not a user request). This is correct and matches the upload-cleanup pattern.
- DSAR admin actions run as a **platform-admin** (not workspace-scoped). Use `isPlatformAdminRole` (existing) or a new `requirePlatformAdmin` helper. The `can*InD1` workspace helpers do **not** apply to DSAR (cross-workspace).
- DSAR export reads bypass workspace authz (platform-admin scope) but must still avoid leaking other workspaces' data in the package — the package is filtered to the target user_id only.

## §9. Provider-proof boundary
- D1: local proof via `cf:d1-restore-rehearsal` + repository tests. Hosted proof via `wrangler d1 execute` readback after applying migrations to `ARCH_DB` (per standing authorization in `AGENTS.md`).
- R2: local proof via Miniflare/`wrangler r2` local; hosted proof via the DSAR receipt object in `ARCH_UPLOADS_R2`.
- Better Auth: revocation API proof (local dev auth + hosted). DISCOVERY-REQUIRED in Phase 4 to confirm the exact revocation surface.
- Workers Observability + Email logs: hosted dashboard/config readback only (platform-managed).

## §10. API contracts (admin surface)

### `POST /api/admin/privacy-requests/[id]/transition` (Server Action)
- Authz: platform-admin.
- Body: `{ toStatus, reason }`.
- Responses: `200 {status, auditId}`, `409 {code:"PRIVACY_REQUEST_ILLEGAL_TRANSITION"}`, `403`, `404`, `500`.
- Idempotency: status guard.

### `POST /api/admin/privacy-requests/[id]/export` (Server Action)
- Authz: platform-admin.
- Body: `{ format?: "json" }`.
- Responses: `200 {downloadUrl, expiresAt, packageSizeBytes}`, `429` (rate limit), `404`, `500`.
- Idempotency: cached package within TTL.

### `POST /api/admin/privacy-requests/[id]/erasure` (Server Action)
- Authz: platform-admin + typed confirmation phrase.
- Body: `{ confirmationPhrase }`.
- Responses: `200 {correlationId, affectedCounts, receiptKey}`, `409` (already erased / illegal state), `403`, `500`.
- Idempotency: correlation ID + status guard.

### `GET /api/admin/privacy-requests` (Server Component data)
- Authz: platform-admin.
- Query: `?status=&limit=&cursor=`.
- Response: paginated list (cursor pagination on `(created_at, id)`).

All admin routes: `Cache-Control: no-store`; no `NEXT_PUBLIC_` secrets; server-only repository calls.

## §11. Network behavior
- Admin routes are authenticated server routes; standard timeouts.
- DSAR export build may take > 1s for large users → run behind a Server Action with a pending state; do not block the request thread (consider a Queue handoff for very large exports — Phase 3 decision point; default is inline with a 30s budget, matching proposal-export `maxDuration=60`).
- R2 signed URL short TTL (default 15 min).
- Better Auth revocation: direct API call; bounded timeout; failure → `revoke_failed` audit, no `completed`.

## §12. Rollback / fix-forward
- Migrations: each blueprint has a DROP rollback or a fix-forward (nullable columns).
- Data: DSAR erasure is reversible within 30d (R2 objects retained); after 30d, R2 purge is irreversible (by design). D1 anonymization is **not reversible** — this is the intended privacy behavior; the `privacy_requests` row + audit are the evidence.
- Cron: `RETENTION_DRY_RUN=1` reverts to dry-run instantly; no data impact.
