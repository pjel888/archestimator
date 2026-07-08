# 03 — Source and Codebase Audit

Evidence gathered by two native read-only `Explore` subagents + lead-targeted reads. All paths repo-relative. Line numbers reflect the working tree at audit time; the implementation AI must re-read before editing.

---

## §0. Source documents traced

| Path | Purpose | Relevant section | Accurate? | Update needed? |
|---|---|---|---|---|
| `.ai/10_state/compliance/retention-schedule.md` | DRAFT TTL registry + DSAR propagation prose | Whole doc | Yes (DRAFT) | Will need status bump after `OPEN-DEC-004` |
| `.ai/01_roadmap/08-legal-privacy-compliance-readiness.md` | Privacy/compliance readiness tracker | "Data retention schedule", "DSAR / export / delete", "Data export (DSAR)" rows | Yes | Mark P1.8 in progress after impl |
| `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Program/05-compliance-roadmap-p0-p1-p2.md` | P0/P1/P2 compliance roadmap | P1.8 row; P0.6→P1.8 dependency | Yes | — |
| `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` | P1.8 source plan | P1.8 acceptance | Yes | — |
| `.ai/10_state/decisions.md` | Durable decisions | `2026-05-24` AI audit metadata-only; `2026-05-23` retention/redaction gate | Yes | Add new `OPEN-DEC-006/007/008` entries during impl |
| `migrations/0033_privacy_request_register.sql` | `privacy_requests` table | Whole | Yes | — |
| `migrations/0034_data_retention_events.sql` | `data_retention_events` table | Whole | Yes | — |
| `migrations/0035_account_security_events_hmac_checks.sql` | HMAC rebuild of audit table | Whole | Yes | — |
| `wrangler.jsonc` | Bindings + cron triggers | triggers block (lines ~59-65) | Yes | — |
| `worker.ts` | scheduled() + queue() | Lines 97-128 | Yes | — |

Document-impact matrix is maintained in `10_BLAST_RADIUS_AND_DEPENDENCIES.md`.

---

## §1. Retention engine — `src/lib/compliance/`

### `src/lib/compliance/retention-core.ts` (framework-agnostic engine, no `"server-only"`)
- `RetentionClassName` union (lines 28-42): the 14 classes.
- `RetentionAction` union (lines 21-26): `tombstoned | anonymized | purged | soft_deleted | skipped_legal_hold`.
- `RetentionRule` type (lines 44-50): `{ className, ttlDays, action, selectSql, applySql }`.
- `DEFAULT_RETENTION_RULES` (lines 79-143): **7 rules only**, all `action: "purged"`:
  - `account_security_events` (365d) — `DELETE FROM account_security_events WHERE id IN (...)`.
  - `account_audit_legacy_sha256` (180d) — same table, filter `ip_hash LIKE 'sha256:%'`.
  - `collaboration_audit_events` (365d).
  - `shared_link_events` (90d).
  - `estimate_sheet_events` (365d).
  - `privacy_requests_completed` (2555d/~7y, filter `status='completed'`).
  - `privacy_requests_rejected` (365d, filter `status='rejected'`).
  - **Missing rules**: `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `logs_worker_observability`, `logs_email_delivery`, `uploads_orphaned`, `sessions_expired`.
- `recordRetentionEventInD1(db, input)` (lines 145-178): INSERT into `data_retention_events`. No-ops if `db` null.
- `runRetentionPassInD1(db, rules, options)` (lines 180-268): the driver. Per rule: compute cutoff, run `selectSql` bind cutoff, dry-run returns skipped (no audit write), apply runs `applySql` bind `JSON.stringify(ids)`, reads `meta.changes`, then writes audit. Per-rule errors caught → skipped with `notes:"error: <name>"` (error details discarded).
- `RetentionPassOptions` (lines 72-75): `{ dryRun?, cronRunId? }`.

### `src/lib/compliance/retention-repository.ts` (server-only adapter, ~25 lines)
- Re-exports `retention-core` (line 13).
- `recordRetentionEvent(input)` → resolves D1 via `getCloudflareD1Database()` then delegates.
- `runRetentionPass(rules, options)` → same delegation.

### `.ai/10_state/compliance/retention-schedule.md`
- 14-class TTL table; only 7 enforced (see `retention-core.ts`).
- Class-action matrix: `purged`/`tombstoned`/`anonymized`/`soft_deleted`/`skipped_legal_hold`.
- **DSAR erasure propagation section (lines 46-56)** lists intended targets (`users`/`account_security_events`/`estimate_sheet_events`/`collaboration_audit_events`/R2 uploads/`privacy_requests`) and states: *"This propagation logic is NOT yet implemented."*
- Counsel review checklist gated on `OPEN-DEC-004`.

---

## §2. DSAR / privacy request intake

### `src/lib/compliance/privacy-request-repository.ts` (server-only)
- `PRIVACY_REQUEST_KINDS` (lines 6-14): `access | rectification | erasure | restriction | portability | objection | other`.
- `PRIVACY_REQUEST_STATUSES` (lines 17-23): `submitted | in_triage | in_progress | completed | rejected`.
- `PrivacyRequestInput` (lines 26-36), `PrivacyRequestRow` (lines 38-55), `CreatePrivacyRequestResult` (lines 57-61).
- `createPrivacyRequest(input, dbOverride?)` (lines 149-200): INSERT into `privacy_requests`. Hashes `requesterEmail`/`ipAddress`/`userAgent` via `hashAccountSecurityValue` (HMAC-SHA256, pepper `AUTH_AUDIT_HASH_PEPPER`). Stores only hashes. Status defaults `submitted`.
- `listPrivacyRequests({status, limit}, dbOverride?)` (lines 202-216): SELECT for triage; limit capped 1-500.
- Helpers: `assertRequestKind`, `normalizeDescription` (≤4000 chars), `sanitizeMetadata` (strips `token|secret|password|cookie|authorization` keys, ≤16 keys/4096 bytes).
- **GAP**: No `updatePrivacyRequest` / triage transition function. No export-build function. No erasure orchestrator.

### `src/app/api/compliance/privacy-requests/route.ts` (public POST intake)
- `POST(request)` (lines ~305-400): anonymous intake. 16 KiB body cap (`REQUEST_BODY_MAX_BYTES`). Validates `requestKind` + description. Client IP from `cf-connecting-ip` only (never X-Forwarded-For).
- Rate limiting via `security_rate_limit_events`: `reserveRateLimitSlots` (lines 275-303) — per-email 3/hr (`scope=privacy_request_email`), per-IP 5/hr (`scope=privacy_request_ip`), window 3600s. Reservations released on validation failure.
- On success: 201 `{id, status, createdAt}`, `Cache-Control: no-store`. On error: opaque message + structured log.
- **GAP**: no admin/triage route, no GET for admin, no consumer of `listPrivacyRequests` in `src/app/`.

### Migration `migrations/0033_privacy_request_register.sql`
- `privacy_requests`: `id`, `request_kind` (7 values), `status` (5 values, default `submitted`), `requester_email_hash`, `requester_name`, `requester_user_id`, `description`, `workspace_id`, `ip_hash`, `user_agent_hash`, `metadata_json`, `created_at`, `updated_at`, `triaged_at`, `resolved_at`, `triaged_by`.
- Indexes: `(status, created_at DESC)`, `(request_kind, created_at DESC)`.
- Anonymous intake accepted; identity verification during triage.

---

## §3. Cron / scheduled jobs

### `worker.ts` (Cloudflare Worker entry)
- `scheduled(controller, env, ctx)` (lines 97-116): always runs `runCloudflareScheduledUploadJobs`. **Additionally** when `controller.cron === "30 3 * * *"`, runs `runRetentionPassInD1(env.ARCH_DB, undefined, { cronRunId: crypto.randomUUID() })` in a second `ctx.waitUntil`.
- `queue(batch, env, ctx)` (lines 118-128): `runCloudflareUploadJobQueueBatch` for `UPLOAD_JOBS_QUEUE`.
- `fetch` (lines 61-95): canonical host, auth-state retries, health, share tokens, proofs, collab rooms, OpenNext fallback.
- **GAP**: retention pass has no env-gated dry-run; always apply mode in the Worker.

### `wrangler.jsonc` — triggers (lines ~59-65)
- `"0 3 * * *"` → upload-cleanup.
- `"15 3 * * *"` → upload-scan.
- `"30 3 * * *"` → retention pass (+ upload-jobs dispatch, which finds no matching job → `skipped: unmatched_cron`).

### `src/lib/cloudflare/scheduled-upload-jobs.ts`
- `CLOUDFLARE_UPLOAD_CLEANUP_CRON = "0 3 * * *"`, `CLOUDFLARE_UPLOAD_SCAN_CRON = "15 3 * * *"`.
- `CLOUDFLARE_SCHEDULED_UPLOAD_JOBS` (lines 40-53): `upload-cleanup` → `/api/internal/upload-cleanup`, `upload-scan` → `/api/internal/upload-scan`.
- `runCloudflareScheduledUploadJobs({cron, env, fetcher})` (lines 91-131): filters jobs by cron, reads secret (`UPLOAD_CLEANUP_JOB_SECRET`/`UPLOAD_SCAN_JOB_SECRET` or fallback `CRON_SECRET`), POSTs internal route with bearer + cron headers. Respects dry-run (`UPLOAD_JOBS_ENABLED`/`CLOUDFLARE_UPLOAD_JOBS_DRY_RUN`).

### `src/lib/cloudflare/upload-job-queue.ts`
- `runCloudflareUploadJobQueueBatch({batch, env, fetcher})` (lines 329-410): validates message shape, dedupes via `idempotencyKey`, calls the upload-jobs dispatcher, acks/retries, DLQ flag when `attempts >= MAX_RETRIES(3)`. Writes R2 proof receipts at `provider-proof/jobs/<proofId>.json`.

### Internal routes
- `src/app/api/internal/upload-cleanup/route.ts` — bearer auth; reads `upload_assets` (status `deleted`) + `upload_sessions` (status in reserved/failed/expired/deleted); dry-run supported; calls `runUploadCleanupJob`.
- `src/app/api/internal/upload-scan/route.ts` — bearer auth; clamd scan.

### `src/lib/uploads/cleanup-job.ts`
- `listUploadCleanupJobRecords(db, {now, limit})` (lines 454-498) — reads `upload_assets` + `upload_sessions` via `buildUploadRetentionCutoffs`.
- `runUploadCleanupJob` (lines 279-385) — writes `cleanup_queued`/`cleanup_succeeded`/`cleanup_failed` to **`upload_events`** (not `data_retention_events`).
- `createUploadCleanupEventWriter(db)` (lines 243-277) — INSERT into `upload_events`.

### `src/lib/uploads/cleanup.ts`
- `DEFAULT_UPLOAD_RETENTION_POLICY` (lines 83-88): failedAsset 7d, deletedAsset 30d, expiredSession 1d, auditEvent 365d.
- `buildUploadRetentionCutoffs`, `planUploadStorageCleanup`, `summarizeUploadCleanup`, `buildUploadCleanupOperationalSnapshot`.

> **Note**: `data_retention_events` (retention/DSAR surface) and `upload_events` (upload cleanup surface) are **distinct** audit tables. This pack unifies retention/DSAR audit through `data_retention_events` and treats `upload_events` as the upload-domain detail (DSAR R2 erasure writes a `data_retention_events` row that references the upload cleanup correlation).

---

## §4. R2 upload lifecycle

### `src/lib/uploads/r2-storage-provider.ts`
- `buildCloudflareR2ObjectKey(bucket, path)` (line 53): keys `<bucket>/<path>`; validates bucket + path (no `..`, `//`, `\`, leading `/`).
- `createCloudflareR2UploadStorageProvider(r2, options)` (lines 59-116): `uploadObject` (`r2.put`), `removeObjects` (per-path `r2.delete`), `downloadObject`, `headObject`, `createSignedReadUrl`, `getPublicUrl`.

### `src/lib/uploads/storage-provider.ts`
- `UploadStorageProvider` interface.

### `src/lib/uploads/runtime-storage-provider.ts`
- `createRuntimeUploadStorageProvider()` factory wiring R2.

### `src/lib/uploads/upload-records.ts` / `direct-upload-records.ts`
- `recordUploadAsset` (INSERT `upload_sessions`/`upload_assets`/`upload_events`).
- Direct/multipart lifecycle: `recordPendingUploadSession`, `readActiveUploadSessionCapacity`, `readUploadSessionForFinalize`, `finalizeUploadSessionAsset`, capacity quotas (`active_actor`/`active_workspace`).

### R2 object deletion sites
- Upload cleanup: `src/lib/uploads/cleanup-job.ts` `createUploadCleanupStorageFromProvider` (lines 209-241) chunks paths by 100, calls `storageProvider.removeObjects`.
- Mass deletion: `src/lib/mass-deletion/bulk-action.ts` exports `StorageCleanupTarget`, `StorageCleanupReport`, `createBulkActionCorrelationId`, `validateTypedConfirmationPhrase`; writes `mass_deletion_events`.

### R2 object creation sites
- `r2-storage-provider.ts` `uploadObject`.
- Queue provider-proof receipts: `upload-job-queue.ts` `writeProviderProofReceipt` (lines 220-280) writes `provider-proof/jobs/<id>.json` via `env.ARCH_UPLOADS_R2.put`.

---

## §5. Migrations relevant to retention / privacy / DSAR

| Migration | Tables / change | Relevance |
|---|---|---|
| `0001_closed_beta_feedback.sql` | `closed_beta_allowed_emails`, `closed_beta_allowlist_audit_events`, `beta_feedback_submissions`, `beta_feedback_status_events` | Feedback/support + audit; DSAR export must include |
| `0002_legal_terms_acceptance.sql` | `legal_terms_acceptances` (terms_key/version/hash, privacy_policy_version, acceptance_method, acceptance_context) | Consent ledger; DSAR export must include |
| `0003_profiles.sql` | `profiles` (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at) | **D1 user record** (Better Auth `user` is separate). DSAR soft-delete target. No `deleted_at`. |
| `0004_account_security_events.sql` + `0035_*` | `account_security_events` (event_type, user_id, workspace_id, request_id, ip_hash [sha256: or hmac-sha256:], user_agent_hash, metadata_json, created_at) | Audit log; DSAR anonymize target |
| `0005_account_settings.sql` | `user_onboarding_profiles` (incl. `marketing_consent_at`), `workspace_account_settings` | Consent; DSAR export |
| `0006_ai_audit_rate_limits.sql` | `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `security_rate_limit_events` | AI audit (retention targets, unwired); rate-limit table used by DSAR intake |
| `0007_collaboration_invitations.sql` | `workspaces`, `projects`, `estimates`, `project_members`, `estimate_sheet_members`, `collaboration_invitations`, `collaboration_invitation_tokens`, `collaboration_audit_events` | Collab audit (retention target); projects/estimates (DSAR scope) |
| `0010_upload_metadata.sql` | `upload_sessions`, `upload_assets`, `upload_events` | Upload lifecycle; DSAR R2 erasure targets |
| `0014_publication_shared_links.sql` | `project_publications`, `project_publication_events`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, `publication_digest_log` | Publication/share (retention target + DSAR recipient data) |
| `0023_mass_deletion_events.sql` | `mass_deletion_events` (target_type, action, status incl. `storage_cleanup_*`, preview_hash, correlation_id, storage_targets_json) | Existing hard-delete + R2 cleanup pattern — **reuse for DSAR** |
| `0025_reusable_source_insert_support.sql` | `estimate_sheet_events` (estimate edit history) | Retention target |
| `0028_*` | `cost_library_item_variant_cost_entries.deleted_at` | **Only `deleted_at` in all of D1** |
| `0033_privacy_request_register.sql` | `privacy_requests` | DSAR register |
| `0034_data_retention_events.sql` | `data_retention_events` (class_name CHECK 14 values, action CHECK 5 values, rows_affected, cutoff, ran_at, cron_run_id, notes, metadata_json) | Retention audit |
| `0035_account_security_events_hmac_checks.sql` | Rebuilds `account_security_events` for `hmac-sha256:` digests | Mid-flight hash rotation |
| `0036–0039` | Component drafts / taxonomy removal / draft limits / project status | Not retention-relevant |

**NOT found**: `legal_hold` column/table anywhere; `deleted_at` on `users`/`profiles`/`projects`/`estimates`; `logs_worker_observability`/`logs_email_delivery`/`sessions_expired` tables (platform-managed, only recorded as accepted).

---

## §6. Logging / observability surfaces

### Account security audit
- `src/lib/auth/account-audit.ts`: `recordAccountSecurityEvent`, `hashAccountSecurityValue` (HMAC-SHA256, pepper `AUTH_AUDIT_HASH_PEPPER`, throws in prod if unset), `LEGACY_PLAIN_SHA256_PREFIX = "sha256"`, `isLegacyPlainSha256Digest`, `buildAccountSecurityAuditRow`. Swallowed-failure → opaque `console.error({audit_write_failed, ...})`.
- `src/lib/auth/account-audit-d1-store.ts`: `recordAccountSecurityEventInD1`/`recordAccountSecurityEventInCloudflareD1`. Writes `account_security_events`.

### Worker structured logs
- `worker.ts` emits `console.log` for "Cloudflare scheduled upload jobs completed", "Retention pass completed", "Cloudflare upload job queue batch completed". Wrangler observability persists logs/traces.

### D1 audit tables (write sites)
- `account_security_events` — `account-audit-d1-store.ts`.
- `collaboration_audit_events` — collaboration invitation actions (`src/lib/collaboration/`).
- `upload_events` — `cleanup-job.ts`, `upload-records.ts`.
- `data_retention_events` — `retention-core.ts` (the only writer).
- `security_rate_limit_events` — privacy intake + publication (`cleanupExpiredRateLimitEvents`, `deleteRateLimitEvents`).
- `project_publication_events` / `shared_link_events` — `publication/d1-store.ts` `insertPublicationEvent`/`insertSharedLinkEvent`.
- `publication_digest_log` — email digest delivery.
- `mass_deletion_events` — bulk-action.
- `closed_beta_allowlist_audit_events` / `beta_feedback_status_events` — beta + feedback audit.

### App error logger
- `logAppError` from `src/lib/observability/logger`.

---

## §7. Feedback / support surfaces

### Workshop in-app feedback (authenticated)
- `src/lib/workshop/beta-feedback.ts` — payload types/enums.
- `src/lib/workshop/beta-feedback-d1-store.ts` — `saveBetaFeedbackToD1` (INSERT `beta_feedback_submissions`, status `new`), `readBetaFeedbackReviewQueueFromD1` (limit 50), `updateBetaFeedbackReviewStatusInD1` (INSERT `beta_feedback_status_events`).
- `src/lib/workshop/beta-feedback-actions.ts` — server actions.
- `src/lib/workshop/beta-feedback-review.ts` + `beta-feedback-review-actions.ts` — admin review queue.
- UI: `src/app/workshop/feedback/page.tsx`, `src/app/workshop/settings/feedback/page.tsx`, `src/components/workshop/BetaFeedbackForm`.

### Public contact
- `src/app/contact/page.tsx` — renders `ContactForm`/`ContactFormFromSearchParams` from `@/components/landing`; `force-static`. No DB write path. Landing/marketing surface.

**GAP**: No dedicated support-ticket table. Support runs through `beta_feedback_submissions` + `support@archestimator.com` mailto. DSAR export must include `beta_feedback_submissions` rows for the requesting user.

---

## §8. Shares / proposals / publication

### `src/lib/publication/`
- `d1-store.ts` (24KB): `insertPublicationEvent` (line ~324), `insertSharedLinkEvent` (line ~377), `incrementPublicationOpen`, `markRecipientOpened`, `markRecipientUnsubscribed`, `getRecipientByTokenHash`, `cleanupExpiredRateLimitEvents`.
- `public-repository.ts` (40KB): public share-token resolution; `checkProposalExportRateLimit`.
- `actions.ts` (78KB): server actions publish/revoke/recipient invite/comment/decision.
- `security.ts` (21KB): `createPublicationToken`, `hashPublicationToken` (HMAC), `encryptPublicationToken`/`decryptPublicationToken` (AES), `hashPublicationPassword`/`verifyPublicationPassword` (scrypt), CSRF tokens, access cookies, `createPublicationViewToken`, `createSharedLinkSessionCookieName`.
- `admin-d1-client.ts` (22KB): admin-side D1 client.

### Publisher activity feed
- `src/lib/publisher/activity-repository.ts` `readPublisherWorkspaceActivity` (line ~246) reads across `project_publications`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`.

### Share API routes
- `src/app/api/share/[token]/` — `route.ts` + `password/`, `activity/`, `comment/`, `decision/`, `events/`, `session/`, `unsubscribe/`.

### Proposal export (the *existing* export path — DSAR export can learn from it)
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — `runtime=nodejs`, `maxDuration=60`, generates `.xlsx` via `buildProposalExportModel` from `src/lib/proposal-export/`. Auth-gated `isWorkspaceMemberInD1`; rate-limited `checkProposalExportRateLimit`. Caps: 1200 nodes, 3000 row items, 50 tabs.

> **DSAR export reuse**: the proposal-export model (`buildProposalExportModel`, size caps, node/row limits, rate limiting) is a credible pattern for the DSAR data-subject package builder. Phase 3 of `11_` references it.

---

## §9. D1 access-authorization pattern

### `src/lib/authz/d1-access.ts` (`"server-only"`) — the canonical `can*InD1` helpers
SQL `EXISTS` probe pattern; `runAllowedProbe` fails closed on D1 error. Platform admins (`isPlatformAdminRole`) short-circuit `true`.

| Function | Lines | Purpose |
|---|---|---|
| `readProjectFromD1` | 40-52 | Read project (no authz check) |
| `readProjectInWorkspaceFromD1` | 54-67 | Read project scoped to workspace |
| `readEstimateInProjectFromD1` | 69-82 | Read estimate scoped to project |
| `readEstimateRowItemInEstimateFromD1` | 84-97 | Read row scoped to estimate |
| `canAccessProjectInD1` | 99-138 | Project read gate (workspace OR project OR sheet member) |
| `canAccessWholeProjectInD1` | 140-173 | Project read gate (workspace OR project member) |
| `canEditProjectInD1` | 175-210 | Project write gate |
| `canAccessEstimateInD1` | 212-259 | Estimate read gate |
| `canEditEstimateInD1` | 261-311 | Estimate write gate |
| `isWorkspaceEditorInD1` | 313-334 | Workspace editor gate |
| `isWorkspaceMemberInD1` | 336-356 | Workspace member gate |

**No `assertWorkspaceMember`/`authorizeProjectRead` — the convention is `can*InD1` returning boolean.** DSAR admin actions must use a **platform-admin** gate (new helper or `isPlatformAdminRole` check), not a workspace gate, because DSAR fulfillment is cross-workspace.

Primary callers: `workspace-repository.ts`, `projects/actions.ts`, `workshop/actions.ts`, `collaboration/realtime-identity-actions.ts`, `reusable-sources/actions.ts`, `estimates/*-actions.ts`, `component-library/*`, `ai/package-builder/apply.ts`, and several `src/app/api/...` routes.

---

## §10. Cross-cutting findings for the plan

1. **Retention enforcement gap**: 7 of 14 classes enforced; 3 AI classes + 2 logs classes + `uploads_orphaned` + `sessions_expired` missing.
2. **DSAR erasure propagation absent**: `privacy_requests` supports create+list only; no triage/export/erasure; no admin UI; no consumer of `listPrivacyRequests`.
3. **Dual audit tables**: `data_retention_events` (retention/DSAR) vs `upload_events` (upload cleanup). Plan unifies retention/DSAR audit through `data_retention_events`.
4. **`deleted_at` scarce**: only `cost_library_item_variant_cost_entries.deleted_at`. No soft-delete on users/profiles/projects/estimates.
5. **No `legal_hold` column anywhere** despite `skipped_legal_hold` action.
6. **HMAC audit hashing mid-flight**: `account_security_events` accepts both `sha256:` (legacy, 180d) and `hmac-sha256:` (current, 365d). Prod requires `AUTH_AUDIT_HASH_PEPPER`.
7. **Open decision gates**: `OPEN-DEC-002` (privacy-notice wording → DSAR email confirmation), `OPEN-DEC-004` (counsel sign-off on TTLs). New gates proposed: `OPEN-DEC-006` (legal hold), `OPEN-DEC-007` (DSAR SLA), `OPEN-DEC-008` (export format).
8. **`profiles` is the D1 user record**; Better Auth `user`/`session`/`account`/`verification` live outside the migration set. DSAR erasure uses a privacy ledger + revocation, not Better Auth schema mutation.
9. **Existing patterns to reuse**: `mass-deletion` (correlation/audit/R2), `proposal-export` (size caps/rate-limit/builder), upload `cleanup-job` (R2 chunked delete), retention `runRetentionPassInD1` (batched select/apply + audit).
10. **Cron is unconditional apply**: no env-gated dry-run staging for the retention pass. Must add for safe rollout.
