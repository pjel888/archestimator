# 03 — Source And Codebase Audit

> Evidence backbone for this plan. Every claim is grounded in a repo-relative path with line numbers. Audit performed by a native `Explore` subagent plus lead read-verification of the two primary files. No files were modified.

## A. Privacy-request surfaces

### A.1 Intake route — `src/app/api/compliance/privacy-requests/route.ts`

- **Exports `POST` only** (line 42). No `GET`, `PATCH`, `PUT`, `DELETE`. No sibling route directory, no `[id]` route.
- **Anonymous by design.** No session check, no CSRF/origin check, no rate limit. `deriveClientIp` (lines 14–20) trusts only `cf-connecting-ip` (spoofing closed in sibling pack 2026-07-02; explicitly ignores `X-Forwarded-For`).
- **Request body** (`parseBody`, lines 22–40): `{ requestKind, description, requesterEmail?, requesterName?, workspaceId?, metadata? }`.
- **Validation** (lines 55–81): `requestKind` ∈ `PRIVACY_REQUEST_KINDS`; `description` required, trimmed, ≤ 4000 chars. **No email/identity validation.**
- **Repository call** (lines 84–99): `createPrivacyRequest(...)`.
- **Response** (lines 106–113): `201 { id, status:"submitted", createdAt }`, `Cache-Control: no-store`.
- **No confirmation email** (lines 101–104): the `after(() => Promise.resolve())` is a no-op placeholder; comment cites counsel sign-off (`OPEN-DEC-002` in the old roadmap → now `OPEN-LEGAL-01` here).
- **Error handling** (lines 114–125): opaque 500; logs `{ privacy_request_intake_failed: true, request_kind, error_name }` — never leaks DB/provider detail.
- **`dynamic = "force-dynamic"`** (line 9) and `no-store` — correct for anonymous write intake.

**Relevance:** This is the only existing piece. The plan adds identity verification, rate limiting, the confirmation email (in the existing `after` hook), and leaves intake otherwise stable.

### A.2 Repository — `src/lib/compliance/privacy-request-repository.ts`

- `"server-only"` (line 1).
- **Kinds** (`PRIVACY_REQUEST_KINDS`, lines 6–15): `access, rectification, erasure, restriction, portability, objection, other`.
- **Statuses** (`PRIVACY_REQUEST_STATUSES`, lines 17–24): `submitted, in_triage, in_progress, completed, rejected`.
- **`PrivacyRequestInput`** (lines 26–36) and **`PrivacyRequestRow`** (lines 38–55) — the row model. Note email/IP/UA are **HMAC hashes** via `hashAccountSecurityValue` (imported line 4); only `requester_name` and `description` are raw.
- **`createPrivacyRequest(input, dbOverride?)`** (lines 100–147):
  - `assertRequestKind` (63–69), `normalizeDescription` (71–80), `sanitizeMetadata` (82–93 — drops keys matching `token|secret|password|cookie|authorization`), `optionalEmailHash` (95–98).
  - Generates `crypto.randomUUID()` id, ISO timestamps, INSERT with 13 binds.
  - Returns `{ id, status:"submitted", createdAt }`.
  - Throws if D1 binding unavailable (lines 111–113).
- **`listPrivacyRequests({status?, limit?}, dbOverride?)`** (lines 149–163): SELECT with optional status filter, `ORDER BY created_at DESC`, limit clamped 1–500 (default 100). **Zero callers outside tests.**

**Gaps the plan must fill (no functions exist for):** `getById`, `transitionStatus` (state-machine-guarded), `assignToOperator`, `addNote`, `attachEvidence`, `setVerificationToken`/`verifyRequest`, `recordFulfillment`, `listForOperatorQueue`. Lifecycle columns (`triaged_at`, `resolved_at`, `triaged_by`) are present in the row model but never written.

### A.3 Sibling compliance modules (referenced, not changed)

- `src/lib/compliance/retention-repository.ts` (1–24) — thin D1-resolving wrapper re-exporting `retention-core`.
- `src/lib/compliance/retention-core.ts` (1–269) — retention engine; see §C.

## B. Migrations

- **Canonical dir:** `migrations/`. **Count: 36. Highest-numbered: `0036_cost_library_component_drafts.sql`.** → Next migration sequences at **`0037`**.
- `migrations/0033_privacy_request_register.sql` (1–47) — creates `privacy_requests`:
  - Cols: `id TEXT PK`, `request_kind TEXT CHECK(7 enum)`, `status TEXT DEFAULT 'submitted' CHECK(5 enum)`, `requester_email_hash TEXT`, `requester_name TEXT`, `requester_user_id TEXT`, `description TEXT NOT NULL`, `workspace_id TEXT`, `ip_hash TEXT`, `user_agent_hash TEXT`, `metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid+object)`, `created_at/updated_at TEXT NOT NULL`, `triaged_at/resolved_at/triaged_by TEXT` (nullable lifecycle, currently never written).
  - Indexes: `idx_privacy_requests_status_created`, `idx_privacy_requests_request_kind_created`.
  - Constraints: enum CHECKs; JSON-validity CHECK. **No FKs, no UNIQUE, no FK to `users`.**
- `migrations/0034_data_retention_events.sql` (1–53) — creates `data_retention_events` (the audit sink the retention cron writes):
  - Cols: `id TEXT PK`, `class_name TEXT CHECK(14 enum incl. privacy_requests_completed/rejected)`, `action TEXT CHECK(5 enum: tombstoned/anonymized/purged/soft_deleted/skipped_legal_hold)`, `rows_affected INTEGER >=0`, `cutoff_timestamp TEXT`, `ran_at TEXT`, `cron_run_id TEXT`, `notes TEXT`, `metadata_json TEXT CHECK(json_valid+object)`.
  - Indexes: `idx_data_retention_events_class_ran_at`, `idx_data_retention_events_action_ran_at`.
- `migrations/0004_account_security_events.sql` + `migrations/0035_account_security_events_hmac_checks.sql` — `account_security_events` (HMAC-digest support; the hashing used by the privacy-request repository).
- **No migrations** for `ropa`, `processor` register, breach log, `data_subject` table, or any privacy-request notes/history/verification-token/evidence tables.

**Relevance:** The new migration (`0037_*`) **adds** SLA/notes/verification/evidence columns (and possibly a `privacy_request_events` history table) to support the workflow. It must not alter 0033's existing rows (additive only) and must preserve the existing CHECK constraints.

## C. Retention engine + cron (referenced, coexists with erasure)

- `src/lib/compliance/retention-core.ts`:
  - `DEFAULT_RETENTION_RULES` (≈ lines 79–143): includes `privacy_requests_completed` (2555d / 7yr) and `privacy_requests_rejected` (365d). Each rule has `selectSql`/`applySql` using D1 positional `?1` binds + `json_each` for batched DELETE (LIMIT 100–500).
  - `runRetentionPassInD1(db, rules, {dryRun?, cronRunId?})` (≈ line 180): per-rule cutoff → select → optional dry-run → batch DELETE → `recordRetentionEventInD1`. Minimized audit metadata (only `{selected_count}`, never row ids).
  - `recordRetentionEventInD1` (≈ line 145): writes `data_retention_events`; no-ops if db null.
- `worker.ts` (≈ lines 97–116): `scheduled()` runs retention on cron `"30 3 * * *"` (daily 03:30 UTC) via `ctx.waitUntil(...)`, in parallel with upload jobs.

**Relevance (critical for `P3`):** Operator-initiated erasure (`P3`) and schedule-driven purge **both delete user data**. `P3` must record into the same `data_retention_events` sink and reconcile with the cron so an approved erasure isn't double-counted or skipped. This is the core of `OPEN-ERASE-01`.

## D. Tests

- `tests/vitest/compliance-privacy-request-repository.test.ts` (1–93) — 3 tests:
  - **PRIVACY-1**: anonymous submission returns `id`+`createdAt`, status `submitted`.
  - **VERIFY-1**: invalid `request_kind` throws `/request_kind/i`.
  - **SLA-1**: `listPrivacyRequests` returns rows ordered by `created_at DESC`.
  - Uses a hand-rolled `FakeD1`/`FakeStatement` mock. **No route-handler test, no hashing test, no transition test (none exist).**
- `tests/vitest/compliance-retention-repository.test.ts` (1–225) — 5 tests (dry-run, real-delete+audit, D1-binding injection, no-op when D1 unavailable, positional-binding compatibility).
- Runner: `vitest.config.ts` — jsdom, `fileParallelism:false`, `tests/vitest/**/*.test.{ts,tsx}`, alias `@`→`./src`, `server-only` stubbed.

**Relevance:** The plan adds route-handler tests, lifecycle/transition tests, identity-verification tests, operator-gate denial tests, fulfillment tests, and abuse/rate-limit tests. The existing `FakeD1` mock is the fixture template.

## E. Email / confirmation

- `src/lib/email/cloudflare-email-client.ts` (1–172) — `sendCloudflareEmail(input, options)` (≈ line 121): resolves `EMAIL` binding via `loadCloudflareContext`; reads `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `ARCHESTIMATOR_EMAIL_PROVIDER` (must be `cloudflare`/`cloudflare-email`/`cloudflare-email-service`), `CLOUDFLARE_EMAIL_FROM`, `CLOUDFLARE_EMAIL_REPLY_TO`. Returns `{ok, messageId?}` or `{ok:false, error, code}`. Opaque error logging (`CLOUDFLARE_EMAIL_SEND_ERROR`).
- `src/lib/email/transactional-email-client.ts` (1–155) — `sendEmail(input)` (≈ line 98): wraps `sendCloudflareEmail` with an **in-memory circuit breaker** (≈ lines 59–96: 5-min window, 10-min cooldown, opens at >50% failure over ≥4 attempts → `CIRCUIT_OPEN`). Graceful degradation in test env (`mocked:true`).
- **Callers today:** `src/lib/publication/actions.ts`, `src/lib/collaboration/actions.ts`, `src/lib/auth/better-auth-cloudflare.ts` (magic link, "Sign in to Archestimator" ≈ line 227).
- **No template files; no `src/lib/email/templates/`.** HTML/text is built inline at each call site.
- **Privacy-request confirmation email: does not exist.** The route's `after` hook (route.ts:104) is the natural insertion point.

**Relevance:** `P1` adds a confirmation email (intake) and status-update emails (transitions) using the established `sendEmail` API + circuit breaker. No new email primitive needed. Body copy is gated on `OPEN-LEGAL-01`.

## F. Auth / identity / roles

- `src/lib/auth/session.ts` (1–108): `getCurrentUserContext` (≈ line 89, React `cache`d) → `{ userId, email, role, profile, displayName, avatarUrl }` or `null`; `requireCurrentUserContext`/`requireAuth` (100–108) → `redirect("/login")`. **No `requirePlatformAdmin`/`requireOperator` helper.**
- `src/lib/auth/roles.ts` (1–72): `APP_PLATFORM_ROLES = ["ceo","admin","member"]`; `isPlatformAdminRole` = `ceo`||`admin` (≈ line 26). Workspace roles: `owner, admin, member, viewer`. **No dedicated `operator`/`dpo` role.**
- `src/lib/auth/protected-route-gate.ts` (1–39) — internal request-header flags set by the proxy/middleware. **No `src/middleware.ts` at repo root** (worker fetch-handler chain in `worker.ts`).
- **Operator-gate precedent to mirror:** `src/lib/auth/beta-allowlist-admin.ts` (≈ lines 30–83): `canManageClosedBetaAllowlist(role) = isPlatformAdminRole(role)`; `readClosedBetaAllowlistQueue` calls `requireCurrentUserContext()` then checks role, returns `{authorized, error, rows}`.
- `src/lib/authz/d1-access.ts` (≈ lines 24–25, 104, 147, 186, 239): every check short-circuits `if (isPlatformAdmin(user)) return true;`.
- `src/lib/auth/account-audit.ts` (1–99): `hashAccountSecurityValue` (≈ line 50) = HMAC-SHA256 keyed by `AUTH_AUDIT_HASH_PEPPER`; production throws if pepper absent; dev falls back to fixed non-secret. `recordAccountSecurityEvent` (≈ line 80). Opaque error logging on audit-write failure (RISK-016 fix pattern).
- **Identity verification for DSAR: none.** Migration 0033 comment defers to "triage"; no token/email-loop/KBA helper exists.

**Relevance:** `P0` builds the hashed-token email verification loop (mirrors magic-link discipline in `better-auth-cloudflare.ts`). `P1` operator gate reuses `beta-allowlist-admin.ts` pattern. `OPEN-OPS-01` recommends reusing `isPlatformAdminRole` rather than a new role.

## G. Admin / operator UI

- **No dedicated admin/operator app section.** No `src/app/admin/`, no `src/app/(admin)/`, no `src/app/operator/`.
- Closest existing operator surfaces (workshop settings):
  - `src/app/workshop/settings/users/page.tsx` — closed-beta allowlist admin UI (uses `beta-allowlist-admin-actions.ts` + `canManageClosedBetaAllowlist`). **The proven operator-queue UI pattern to mirror.**
  - `src/app/workshop/settings/scan-overrides/`, `src/app/workshop/settings/upload-operations/`.
- **No privacy-request triage/queue/fulfillment UI exists.** `listPrivacyRequests` has zero UI/route consumers. No `/api/compliance/[id]` route, no GET handler.

**Relevance:** `P1-T4` adds an operator queue page (mirror `workshop/settings/users`) + a request-detail page; `P1-T2` adds the GET/`[id]` routes that feed them.

## H. Observability / errors

- `src/lib/observability/app-error.ts` (1–196): `AppError` hierarchy — `AuthRequiredError(401)`, `AuthPermissionDeniedError(403)`, `AuthRateLimitedError(429)`, `ValidationError(400)`, `NotFoundError(404)`, `ConflictError(409)`, `DatabaseError(500)`, `RateLimitError(429)`, `InternalError(500)`. `toLogLevel()`; `serializeErrorCauseForLog` (depth-capped at 2).
- `src/lib/observability/{route-error.ts, with-action-errors.ts, client-error-report.ts, toast-config.ts, types.ts}`.

**Relevance:** Lifecycle/transition functions and operator routes map failures onto this hierarchy (e.g. `NotFoundError` for unknown request id, `AuthPermissionDeniedError` for non-operator, `ValidationError` for bad transition).

## I. Abuse / rate limiting

- **Rate-limit engine:** `src/lib/ai/rate-limit.ts` (1–78) — `checkAiAskQuota({request, userContext})`. Sliding-window counter backed by D1 (`security_rate_limit_events` via `src/lib/ai/audit-d1-store.ts`): records event with `expiresAt`, deletes expired, counts per window. Two windows (60s/10, 3600s/60). Key = SHA-256 of `workspaceId \u001F userId \u001F clientIp`. **The proven D1-backed rate-limit pattern to copy for privacy-request intake.**
- Helpers: `recordSecurityRateLimitEventInD1`, `countSecurityRateLimitEventsInD1`, `deleteExpiredSecurityRateLimitEventsInD1` (in `audit-d1-store.ts`).
- **Email circuit breaker:** `transactional-email-client.ts` (≈ lines 59–96).
- **Turnstile: not integrated.** Only a marketing mention in `src/app/trust/page.tsx`. No `TURNSTILE_*` env, no helper.
- **Origin/CSRF:** `src/lib/publication/security.ts` — `assertSameOrigin`/`assertSameOriginPublicPost`, `getClientIp` (≈ line 550). The privacy-request POST does **not** call these (acceptable for anonymous public intake).

**Relevance:** `P0-T2` adds a D1 sliding-window rate limit on intake (keyed on `cf-connecting-ip`), mirroring `ai/rate-limit.ts`. Turnstile is optional/deferred (closed-beta has low abuse risk; `AGENTS.md` cost posture avoids paid add-ons).

## J. Compliance roadmap / state docs (referenced)

- `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Program/05-compliance-roadmap-p0-p1-p2.md` — P0.1–P0.6, P1.1–P1.8, P2.1–P2.9. **Privacy-request register = P0.5; this workflow completes P0.5 and feeds P1.2 (RoPA).**
- `.ai/10_state/compliance/privacy-notice-draft.md` — full notice draft (P1.1, counsel-gated). Live page `src/app/privacy/page.tsx` is the **closed-beta** notice only; it tells users to email `support@archestimator.com` for deletion — does **not** point to `/api/compliance/privacy-requests`.
- `.ai/10_state/compliance/retention-schedule.md`, `ropa.md`, `processor-register.md`, `dpia-screening.md`, `csrf-coverage.md`, `csp-decision-brief.md`, `audit-pepper-rotation-log.md`.
- `.ai/11_skills/security/breach-response-runbook.md` — breach runbook (skill doc, not code).
- `.ai/10_state/compliance/file-scanner-status.md` — scanner implementation-complete; only `OPEN-DEC-006` (paid provider, a legacy-roadmap decision ID — **out of scope for this plan**; not mapped to any `OPEN-*` here) outstanding.

**Relevance:** This plan references but does not author these. `OPEN-LEGAL-01` (privacy-notice wording) gates the public-form copy and confirmation-email body. `OPEN-LEGAL-02` (SLA policy) gates `P4`. `P3` erasure must align with the retention schedule.

## K. Document-impact matrix

| Document | Purpose | Implementation impact |
|---|---|---|
| `src/app/privacy/page.tsx` | Live closed-beta privacy notice | **Probable update** once `OPEN-LEGAL-01` resolves: point to the request workflow (`P0-T4`) |
| `.ai/10_state/compliance/privacy-notice-draft.md` | Full notice draft | Reference only; owner/legal |
| `.ai/10_state/compliance/retention-schedule.md` | Retention TTLs | Reference; `P3` must align erasure scope |
| `.ai/10_state/current-state.md` | FAST PATH log | **Update at execution closeout** with the new workflow facts |
| `AGENTS.md` | Stack baseline / standing auth | No change (Cloudflare-resource authorization already covers this work) |
| `src/lib/compliance/retention-core.ts` | Retention rules | **Verification only** (ensure `P3` coexists; not modified unless `OPEN-ERASE-01` requires) |
| `worker.ts` | Cron wiring | **Verification only** (not modified by `P0`–`P2`; `P4` may add a SLA-breach cron slice if approved) |

## L. Coverage summary

| Capability | Status | Key path |
|---|---|---|
| Anonymous intake (POST) | Done | `route.ts` |
| Row model + intake write | Done | `privacy-request-repository.ts` |
| Lifecycle transitions | **Missing** | repo has columns/types, no functions |
| Operator queue (list) | Repo only, unwired | `listPrivacyRequests` (0 callers) |
| Operator/admin gate | Pattern exists | `beta-allowlist-admin.ts` + `isPlatformAdminRole` |
| Identity verification | **Missing** | no helper/token |
| Confirmation email | **Missing** (binding wired) | `route.ts:101-104`; `transactional-email-client.ts` |
| Erasure/export fulfillment | **Missing** | no DELETE/export driven by request row |
| Audit evidence | Pattern exists | `account_security_events` HMAC; `data_retention_events` |
| Retention of completed/rejected | Done | `retention-core.ts` + `worker.ts` cron |
| Rate limiting on intake | **Missing** | pattern at `ai/rate-limit.ts` |
| Turnstile / bot protection | **Missing** | no integration (optional/deferred) |
| Privacy notice (full) | Draft only | `.ai/10_state/compliance/privacy-notice-draft.md` |
| RoPA / processor / breach | Docs only | `.ai/10_state/compliance/`, `.ai/11_skills/security/` |
