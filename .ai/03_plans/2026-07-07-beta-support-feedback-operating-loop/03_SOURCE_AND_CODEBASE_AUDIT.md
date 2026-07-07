# 03 — Source and Codebase Audit

Evidence gathered by 4 read-only `Explore` subagents (concurrent). All paths are repo-relative. "Source strength" tags: `repo evidence` (read from file), `derived` (inferred from code), `official docs` (framework/provider), `provider readback` (runtime), `assumption`.

## A. Feedback capture surfaces

| Path | Type | Responsibility | Key symbols | Relevance | Must change? |
|---|---|---|---|---|---|
| `src/app/workshop/feedback/page.tsx` | Server Component (async) | Renders `/workshop/feedback`; surfaces redirect-mode acknowledgement boxes (`?saved=1`, `?fallback=1`, `?error=<code>`) via `<output>` | `WorkshopFeedbackPage`, `feedbackErrorMessage(error?)` | Main acknowledgement UX; status-expectation copy goes here | extend (copy + a11y) |
| `src/components/workshop/BetaFeedbackForm.tsx` | Client Component (`"use client"`) | The capture form; two modes `redirect` (page) and `inline` (`useActionState` → `submitBetaFeedbackInline`); fields: hidden `pagePath`, `feedbackType`, `severity`, `projectId?`, `message` (10–4000 chars) | `BetaFeedbackFormProps`, `inlineState`, `isInline` | Capture + inline acknowledgement; a11y label gap on Type/Severity | extend (a11y + copy) |
| `src/components/workshop/WorkshopFeedbackModal.tsx` | Client Component | Floating Lifebuoy button on every workshop page (mounted in `WorkshopPageShell` footer); opens `Modal` with `BetaFeedbackForm` in `inline` mode; form `dynamic(...,{ssr:false})` code-split | `WorkshopFeedbackModal` | Primary in-app entry point | leave as-is |
| `src/app/workshop/settings/feedback/page.tsx` | Server Component | **Operator review queue** (platform-admin gated). Table of submissions, status filter, per-row status `<select>` → `updateBetaFeedbackReviewStatus`; hard `LIMIT 50`, `ORDER BY created_at DESC`. **Note:** the page calls `readBetaFeedbackReviewQueue(params.status)`; the `canReviewBetaFeedback(context.role) → isPlatformAdminRole` gate lives inside `src/lib/workshop/beta-feedback-review.ts:28-30` (one indirection away from the page), and the `LIMIT 50` lives in `readBetaFeedbackReviewQueueFromD1` at `beta-feedback-d1-store.ts:95`. | `BetaFeedbackReviewPage`, `statusLabels`, `readBetaFeedbackReviewQueue(status)` | Triage UI; pagination + SLA badges + breach flag go here | extend |
| `src/components/workshop/WorkshopSettingsModalContentView.tsx:69` | Client | "Send feedback" card linking to `/workshop/feedback` (second nav path) | — | Navigation context | leave as-is |
| `src/app/contact/page.tsx` + `src/components/landing/ContactForm.tsx` + `src/components/landing/contact-mailto.ts` | Server + Client (`"use client"`) | **Public/unauthenticated** "Talk to the founder"; builds a `mailto:` only, stores nothing | `ContactForm`, `buildSupportMailto` | Separate funnel; NOT in the D1 loop (`OPEN-FUNNEL-01` deferred) | leave as-is |

### Form fields captured today (`source strength: repo evidence`)

- `feedbackType` ∈ `{bug, confusing_ux, missing_feature, export_issue, estimate_accuracy, other}`
- `severity` ∈ `{blocker, high, medium, low}`
- `message` (required, `length(trim) ∈ [10, 4000]`)
- `projectId` (optional, UUID validated server-side)
- `pagePath` (auto, client `usePathname()`)
- server-attached: `user_id`, `user_email`, `workspace_id` (from `requireCurrentUserContext`)
- **NOT captured**: contact email (uses session email), screenshot/upload, user-agent, browser/OS, device

## B. Submission / validation / Server Actions

| Path | Directive | Symbols | Notes |
|---|---|---|---|
| `src/lib/workshop/beta-feedback.ts` | none (shared) | Exported: `BETA_FEEDBACK_TYPES`, `BETA_FEEDBACK_SEVERITIES`, `BETA_FEEDBACK_STATUSES`, the union types, `parseBetaFeedbackSubmission(formData)`, `isBetaFeedbackStatus()`, `buildBetaFeedbackMailto({...})`. **Module-private (NOT exported):** `SUPPORT_EMAIL="support@archestimator.com"`, `MAX_MESSAGE_LENGTH=4000`, `MIN_MESSAGE_LENGTH=10`, `UUID_PATTERN` (declared without `export` at `:29-31`). | Manual parse → tagged union `{ok:true,payload}|{ok:false,code}`. **No zod anywhere in the repo** — match this pattern. If new code needs `SUPPORT_EMAIL`, it must either be exported or re-declared; do not assume it is importable today. |
| `src/lib/workshop/beta-feedback-actions.ts` | `"use server"` | `submitBetaFeedback(formData)` (redirect), `submitBetaFeedbackInline(_prev,formData)` (`useActionState`), private `saveBetaFeedback(formData)`, `feedbackRedirect(params)`, `betaFeedbackInlineErrorMessage(code)`, type `BetaFeedbackInlineState` | Calls `requireAuth()` → `parseBetaFeedbackSubmission` → `requireCurrentUserContext()` → `saveBetaFeedbackToD1`. On failure: `?fallback=1` (redirect) or `status:"fallback"` (inline). **Both modes preserve the auth+validation path; D1 failure → mailto fallback.** |
| `src/lib/workshop/beta-feedback-review.ts` | `"server-only"` | `readBetaFeedbackReviewQueue(status?)`, `canReviewBetaFeedback(role)` → `isPlatformAdminRole`, `parseBetaFeedbackStatusUpdate(formData)`, types `BetaFeedbackReviewRow`, `BetaFeedbackReviewQueue` | Returns `{authorized, error, submissions}`. |
| `src/lib/workshop/beta-feedback-review-actions.ts` | `"use server"` | `updateBetaFeedbackReviewStatus(formData)` | Admin status update → `revalidatePath("/workshop/settings/feedback")` + redirect. |

### Dead-code finding (`source strength: repo evidence`)

`buildBetaFeedbackMailto({...})` is **defined (`beta-feedback.ts:76`) but not imported anywhere in `src/`** (verified `rg "buildBetaFeedbackMailto" src/`). The redirect-mode action (`submitBetaFeedback`) does NOT build a mailto — it calls `feedbackRedirect({ fallback: "1" })` (`beta-feedback-actions.ts:41`); the static `mailto:support@archestimator.com?subject=...` link is hardcoded in `src/app/workshop/feedback/page.tsx:21`. The inline fallback hardcodes the text `"Email support@archestimator.com instead."` (`beta-feedback-actions.ts:64`). Neither path uses `buildBetaFeedbackMailto`. **Gap:** if the D1 write fails, the user's typed `message`/`type`/`severity` is lost in both modes. Fix: wire `buildBetaFeedbackMailto` into the fallback path — see FR-ACK-02 (which absorbs the intent previously mislabeled "FR-ACK-03"; no separate FR-ACK-03 requirement exists).

## C. D1 storage

Migration: `migrations/0001_closed_beta_feedback.sql` (also creates `closed_beta_allowed_emails`, `closed_beta_allowlist_audit_events`).

### `beta_feedback_submissions`

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | `crypto.randomUUID()` |
| `user_id` | TEXT NOT NULL | — | reporter |
| `workspace_id` | TEXT | nullable | `context.profile.default_workspace_id` |
| `project_id` | TEXT | nullable | optional UUID |
| `user_email` | TEXT NOT NULL | — | reporter email |
| `feedback_type` | TEXT NOT NULL | CHECK (6 values) | |
| `severity` | TEXT NOT NULL | CHECK (4 values) | |
| `page_path` | TEXT | nullable | |
| `message` | TEXT NOT NULL | CHECK `length(trim) BETWEEN 10 AND 4000` | |
| `metadata_json` | TEXT NOT NULL DEFAULT `'{}'` | — | currently `{source:"workshop_feedback_form"}` |
| `status` | TEXT NOT NULL DEFAULT `'new'` | CHECK (4 values: new/reviewing/resolved/archived) | |
| `created_at` | TEXT NOT NULL | — | ISO UTC |
| `updated_at` | TEXT NOT NULL | — | ISO UTC |

Indexes: `idx_beta_feedback_created_at(created_at DESC)`, `idx_beta_feedback_status_created_at(status, created_at DESC)`, `idx_beta_feedback_user_created_at(user_id, created_at DESC)`.

### `beta_feedback_status_events`

`id`, `feedback_id` (FK CASCADE), `status` (CHECK 4 values), `actor_user_id`, `created_at`, **`UNIQUE(feedback_id, status)`** (one event per status per feedback — note: this means a status can only be *entered* once in the audit; reverting to a prior status re-inserts nothing). This is relevant to SLA timing: `first_response_at` is best derived as the first `reviewing` event *or* a dedicated column.

### Proposed additive columns (migration `0039`) — see `21_DATABASE_CHANGE_BLUEPRINTS.md`

- `first_response_at TEXT` (nullable) — set when status first leaves `new`
- `responded_at TEXT` (nullable) — set when status reaches `resolved` (reporter follow-up trigger)
- `alerted_at TEXT` (nullable) — set when an SLA-breach alert fires (idempotency for the sweep)

All nullable, additive, zero downtime, no backfill needed (existing rows → null → treated as "SLA not tracked").

## D. Auth & gating

| Path | Symbols | Notes |
|---|---|---|
| `src/lib/auth/session.ts` | `getCurrentUserContext` (cached), `requireCurrentUserContext({enforceTermsAcceptance})`, `requireAuth()` (alias), type `CurrentUserContext` | The reusable helper. Imports: `import { requireCurrentUserContext, requireAuth, type CurrentUserContext } from "@/lib/auth/session"`. |
| `src/lib/auth/roles.ts` | `APP_PLATFORM_ROLES=["ceo","admin","member"]`, `isPlatformAdminRole(value)` → true for `ceo`/`admin`, `WorkspaceAccountRole`, `ProjectEstimateCollaborationRole` | **Plain string check against D1 role field, not Better Auth admin plugin.** Reuse for operator gate (`OPEN-OPS-01`). |
| `src/lib/auth/profile-d1-store.ts` | `AppRole`, `CurrentUserProfile` (source of `default_workspace_id`) | |

`source strength: repo evidence`. No changes to auth/roles planned.

## E. Email sending (reusable, not yet wired to feedback)

| Path | Symbols | Notes |
|---|---|---|
| `src/lib/email/transactional-email-client.ts` | **`sendEmail(input: SendEmailInput): Promise<SendEmailResult>`** (the one to call), `readEmailDeliveryConfig(env?)`, `isEmailDeliveryEnabled(env?)`, `TransactionalEmailClient`, types `SendEmailInput`/`SendEmailResult` | Circuit breaker: 5-min window, 50% failure threshold over 4 samples → 10-min cooldown (`code:"CIRCUIT_OPEN"`). Returns `{ok:false,code:"EMAIL_NOT_CONFIGURED"}` if env not set. **Degrades gracefully — never throws.** |
| `src/lib/email/cloudflare-email-client.ts` | `sendCloudflareEmail(input, options?)` | Low-level; resolves `EMAIL` binding via `getCloudflareContext()`. |
| `wrangler.jsonc:25-29` | `"send_email": [ { "name": "EMAIL" } ]` | Binding `EMAIL` → typed `EMAIL: SendEmail` in `cloudflare-env.d.ts:7`. |
| `.dev.vars.example` | `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`, `CLOUDFLARE_EMAIL_FROM`, `CLOUDFLARE_EMAIL_REPLY_TO=support@archestimator.com` | Env required for sends to fire. |
| `src/lib/publication/actions.ts` | `sendSharedLinkRecipientInvitationEmail` (~:1265), owner digests (~:1793), tracks `resend_email_id` columns | **The existing email consumer to model feedback notifications on.** No Resend SDK dependency; `resend_email_id` is legacy/audit only. |

`source strength: repo evidence`. Feedback will add new `sendEmail` call sites in `beta-feedback-actions.ts` (operator notify) and `beta-feedback-review-actions.ts` (reporter follow-up).

## F. Alerting (reusable template)

| Path | Symbols | Notes |
|---|---|---|
| `src/lib/uploads/operational-telemetry.ts:147` | **`sendUploadOperationalAlert(record, fetchImpl=fetch)`**, `shouldSendUploadOperationalAlert(record)` (severity gate warning/critical), `buildUploadOperationalAlertPayload(record)`, types `UploadOperationalAlertDeliveryResult` | Env triplet: `UPLOAD_OPERATIONS_ALERTS_ENABLED` / `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL` (must `https:`) / `UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN`. Headers: `x-archestimator-alert-event`, `authorization: Bearer`. Payload `{schemaVersion:"v1", source, event, emittedAt, severity, ...}`. **The clone template for `sendFeedbackAlert`.** |

No Slack/Discord/Telegram native integration exists (`source strength: repo evidence`).

## G. Cron / Queue / Worker

| Path | Symbols | Notes |
|---|---|---|
| `worker.ts:97-116` | `scheduled(controller, env, ctx)` | **3 crons** (AGENTS.md:40 stale says "two"). Routing: `0 3 * * *` and `15 3 * * *` are NOT switch arms in `worker.ts` — they flow through `runCloudflareScheduledUploadJobs({ cron: controller.cron, ... })` inside an **ungated** `ctx.waitUntil` (`worker.ts:99-105`), which internally maps `0 3`→`upload-cleanup` / `15 3`→`upload-scan` via `CLOUDFLARE_SCHEDULED_UPLOAD_JOBS` in `src/lib/cloudflare/scheduled-upload-jobs.ts`. The `30 3 * * *` retention pass IS a direct gate: `if (controller.cron === "30 3 * * *")` (`worker.ts:109`) → `runRetentionPassInD1(env.ARCH_DB, undefined, {...})`. Comment at `worker.ts:107`: `// ponytail: P1.8 retention pass — dispatch on the "30 3 * * *" cron only.` **Critical for the feedback sweep:** the new branch MUST be gated `if (controller.cron === "45 3 * * *")` (matching the retention-pass pattern), NOT added to the ungated `ctx.waitUntil` — otherwise the sweep would run on every cron. |
| `src/lib/cloudflare/scheduled-upload-jobs.ts` | `CLOUDFLARE_SCHEDULED_UPLOAD_JOBS`, `CLOUDFLARE_UPLOAD_CLEANUP_CRON`, `CLOUDFLARE_UPLOAD_SCAN_CRON` | Job registry. |
| `src/lib/cloudflare/upload-job-queue.ts` | `enqueueCloudflareUploadJobJobs`, `runCloudflareUploadJobQueueBatch`, `CloudflareUploadJobQueueMessage` (discriminated `jobName` union), `buildJobRequest` (cron→internal-route→secret) | Producer/consumer. **For feedback, a daily SLA sweep via a new cron branch in `scheduled()` is cleaner than a queue job** (event-frequency is low at beta scale). |
| `wrangler.jsonc` | `triggers.crons`, queue binding `UPLOAD_JOBS_QUEUE` → `archestimator-upload-jobs` + DLQ `archestimator-upload-jobs-dlq` (consumer `max_batch_size:5, max_retries:3`) | |

**SLA sweep placement decision:** add a 4th cron `45 3 * * *` (or reuse a tighter hourly `0 * * * *` if SLA demands). Daily is sufficient for a business-day SLA at beta scale. See `OPEN-SLA-01`.

## H. Logging / observability / analytics

| Path | Symbols | Notes |
|---|---|---|
| `src/lib/observability/logger.ts` | **`consoleAppLogger: AppLogger`**, `emitLogRecord(record)`, `logAppError(error,{event,action,...})`, `LogRecord` | Structured logger (JSON console + dev NDJSON). **Use `emitLogRecord` for loop events**, e.g. `event:"feedback_alerted"`. |
| `src/lib/observability/redact.ts` | `redactForLog`, `redacted`/`tainted_fields` | Feedback `message` may contain PII → redact before logging. |
| `src/lib/uploads/operations-dashboard.ts` | reads D1 aggregates directly | Pattern for any feedback dashboard aggregation. |
| `wrangler.jsonc` observability | Workers Logs (10% head sampling) + traces (5%) | Platform-side log sink. |
| `src/components/landing/CloudflareWebAnalytics.tsx` | beacon (public pages only) | Not in workshop; not relevant. |

No PostHog/Plausible/GA. No general metrics sink → feedback metrics stored as D1 rows + structured logs.

## I. Config / env

| Source | Keys | Notes |
|---|---|---|
| `wrangler.jsonc [vars]` | upload-tuning only (`ARCH_UPLOAD_*`) | No feedback vars; non-secret config like SLA hours could go here (world-readable is fine for thresholds, not secrets). |
| `.dev.vars.example` | job secrets, email env, upload-alert triplet | Feedback will add: `FEEDBACK_ALERTS_ENABLED`, `FEEDBACK_ALERT_WEBHOOK_URL`, `FEEDBACK_ALERT_WEBHOOK_TOKEN`, operator email (reuse `CLOUDFLARE_EMAIL_REPLY_TO` or a new `FEEDBACK_OPERATOR_EMAIL`). |
| `cloudflare-env.d.ts` | generated (`wrangler types`); alert triplet is notably **absent** (read off raw `process.env` in `operational-telemetry.ts`) | Follow the raw-`process.env` read pattern for the feedback alert triplet to match precedent, OR add + regenerate types. Either is acceptable; the plan recommends matching the precedent (raw `process.env`) for consistency. |

## J. Tests (existing, to extend)

| Path | Covers | Extend? |
|---|---|---|
| `tests/vitest/beta-feedback-*.test.ts` | parsing, action save, mailto fallback | add SLA/alert/email cases |
| `tests/vitest/feedback-admin-*.test.ts` | review queue read, status update | add pagination, SLA badge, breach |
| `tests/vitest/beta-admin-action-boundaries.test.ts` | non-admin cannot update review status; `ceo`/`admin` can | extend for new operator actions (notify, follow-up) |
| `tests/vitest/support-contact-readiness.test.ts` | contact/mailto readiness | leave |

## K. Scripts (coupled readiness)

| Path | Purpose | Coupling |
|---|---|---|
| `scripts/check-support-monitoring-readiness.ts` | operator-attested support-monitoring check | **P4 readiness gate** — the loop must prove it beyond operator flags |
| `scripts/check-support-email-dns.ts` | DNS check for support email | reusable |
| `scripts/generate-cloudflare-d1-beta-feedback-proof.ts` | D1 readback proof for feedback rows | reusable for provider proof |
| `scripts/verify-upload-alert-delivery.ts` | alert delivery proof pattern | **template** for `verify-feedback-alert-delivery.ts` |

## L. Decisions / roadmap / personas (evidence summary)

`source strength: repo evidence` (`.ai/` docs)

- **`.ai/10_state/decisions.md:872`** — feedback review is app-owned for platform admins; "linked migration apply, hosted admin smoke, monitored inbox/table ownership, alert owner, and incident escalation proof remain launch gates."
- **`.ai/10_state/decisions.md:871`** — `/contact` opens a structured SUPPORT_INBOX_PLACEHOLDER email draft; "monitored inbox/form delivery, alert owner, and incident escalation proof remain external/manual launch gates."
- **`.ai/01_roadmap/README.md:257-264`** — `Support — email + tracker` (DECIDED, BETA), `Product — beta feedback loop` (DRAFTED/NEEDS OWNER APPROVAL): "Weekly review cadence, feedback triage, decision log." → this pack is the implementation plan for that milestone.
- **`.ai/16_user-experience/agent-reports/second-pass/personas/admin-support-operator-use-cases.md`** — `SUPPORT-001` (triage, latest-50 gap, no response ownership/SLA/duplicate/escalation/follow-up), `SUPPORT-002` (recover on persistence failure via email fallback), `OPS-002` (verify support inbox monitoring + feedback review ownership + alert/incident before widening beta). **Open question:** "What support response SLA or monitoring window should beta operators promise, if any?" → `OPEN-SLA-01`.
- **`.ai/10_state/compliance/retention-schedule.md`** (DRAFT, gated `OPEN-DEC-004`) — **NO retention row for `beta_feedback_submissions`** → `OPEN-RET-01`.
- **`.ai/10_state/compliance/privacy-notice-draft.md:33`** — "Customer support (email content, screenshots) | Resolve user issues | Consent + legitimate interest | Consent" — feedback content is **personal data**; retention + DSAR must apply.

## Audit completeness note

This audit systematically covered: routes, components, Server Actions, validation, D1 schema/migrations/indexes, auth/gating, email, alerting, cron/queue/worker, logging, observability, analytics, config/env, tests, scripts, decisions, roadmap, personas, and compliance docs. Evidence is repo-read unless tagged otherwise. No application code was modified during the audit.
