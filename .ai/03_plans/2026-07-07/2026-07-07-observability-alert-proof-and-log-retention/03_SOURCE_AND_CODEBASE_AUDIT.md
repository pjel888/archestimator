# 03 — Source and Codebase Audit

Evidence-grounded inventory of every surface this plan touches. Findings cite repo-relative
`file:line`. Discovery was performed by three parallel read-only `Explore` agents (logging/redaction,
observability/alerting, retention/compliance); their consolidated findings are below.

---

## 1. Logging and redaction surface (`src/lib/observability/`)

### 1.1 Module map (10 files)

| File | LOC | Exported symbols | Responsibility |
|---|---|---|---|
| `types.ts` | 47 | `appErrorKinds`, `AppErrorKind`, `AppErrorCode`, `AppLogLevel`, `AppErrorClientJSON`, `ActionSuccess/Failure/Result<T>` | Shared error/log types |
| `app-error.ts` | 195 | `AppError` + 12 subclasses, `isAppError`, `normalizeAppError`, `serializeErrorCauseForLog` (depth 2) | Typed error hierarchy → log level |
| `logger.ts` | 221 | `LogRecord`, `AppLogger`, `consoleAppLogger`, `emitLogRecord`, `buildErrorLogRecord`, `logAppError`, `DevLogRecord` | NDJSON file writer + console mirror (the only real sink) |
| `redact.ts` | 160 | `redactMessage`, `redactForLog`, `RedactionResult` | All redaction logic (regex + key allowlist) |
| `route-error.ts` | 92 | `errorResponse`, `problemDetailsResponse` | Route handlers → NextResponse / RFC 9457 problem+json; logs `route_error` |
| `with-action-errors.ts` | 85 | `withActionErrors` (3 overloads), `withActionErrorLogging` | Server-action wrapper; logs `action_error` |
| `action-result.ts` | 24 | `actionOk`, `actionFailure`, `isActionFailure` | Action envelope |
| `client-error-report.ts` | 62 | `ClientErrorReportPayload`, `sanitizeClientErrorText`, `buildClientErrorPayload`, `postClientErrorReport` | Client-side redaction + POST `/api/internal/client-error` |
| `client-identity.ts` | 94 | `ClientIdentitySource`, `ClientIdentity`, `deriveClientIdentity` | IP / dev / preview identity from headers |
| `toast-config.ts` | 39 | `AppErrorToastTone`, `readAppErrorToastConfig` | AppError → toast UI |

**No barrel `index.ts`** — consumers import by path. **Only 7 production files import the logger**;
**`redact.ts` has only 2 production consumers** (`logger.ts`, `client-error` route).

### 1.2 Redaction coverage (`src/lib/observability/redact.ts`)

Two-tier: `redactMessage` (string regex chain) + `redactForLog` (object walk + key sets).

- **`NEVER_LOG_KEYS`** (normalized): `authorization, cookie, password, passcode, secret, setcookie,
  set_cookie, token, access_token, refreshtoken, refresh_token, apikey, api_key, jwt,
  service_role_key` → `"[REDACTED]"`.
- **`HASHED_ONLY_KEYS`:** `email, recipient_email, user_email` → `[HASHED:sha256:<16hex>]`.
- **`redactMessage` regexes** (redact.ts:50-103): control chars; emails→hashed; `Bearer <token>`;
  JWTs (`eyJ...`); `/share/<seg>` + `/invite/<seg>`; query params `*token|password|api_key|secret|
  recipient|rt|state|code|cookie`; bare `key=value` for sensitive keys; `password|token|secret
  <word>`; 32+ hex blobs; prompt-injection phrases → `[UNTRUSTED_INSTRUCTION]`.
- **`tainted_fields`:** dotted paths (e.g. `user.profile.access_token`) pushed whenever a key or
  string value is redacted; structure preserved, only leaf values replaced; `WeakSet` cycle guard.

### 1.3 Redaction coverage matrix vs. this plan's needs

| Category | Covered? | Mechanism / gap |
|---|---|---|
| Emails | ✅ | regex + `HASHED_ONLY_KEYS` |
| Passwords | ✅ | key set + regex |
| Tokens / secrets / bearer | ✅ | key set + `Bearer ` regex |
| JWTs | ✅ | `eyJ...` regex |
| API keys | ✅ | key set + `api_key=` regex |
| OAuth state | ✅ | `state` query param + bare key |
| Share / invite tokens | ✅ | dedicated segment regexes |
| Cookies (object key) | ⚠️ partial | `cookie`/`setcookie` keys redacted; **raw `Set-Cookie` header string** not regex-matched |
| Authorization (object key) | ⚠️ partial | `authorization` key redacted; **raw `Authorization: <scheme> <non-bearer>` string** not caught |
| Better Auth session cookie names | ⚠️ partial | only generic `cookie` key; `better-auth.*` names not matched |
| Password-reset tokens | ⚠️ partial | only via generic `*token`/hex |
| URLs with arbitrary PII query | ⚠️ partial | only named-list params |
| **Credit cards** | ❌ | no Luhn/`\d{4}[- ]?\d{4}...` pattern |
| **IP addresses** | ❌ | no IPv4/IPv6 pattern (`cf-connecting-ip` handled separately in `client-identity.ts`) |
| **Phone numbers** | ❌ | no pattern |
| **Server stack traces (local paths)** | ❌ | `serializeStack` (logger.ts:101) slices lines but does **not** run `redactMessage`; client-side `sanitizeClientErrorText` strips `/Users/...` but server does not |

**The 5 `❌`/structural gaps are the redaction inventory's P1 findings (§`08`).** Enforcement fix
is the sibling observability pack's `SEC-01`; this pack only inventories.

### 1.4 Logger bypass — direct `console.*` usage

**~88 logger-bypassing `console.*` calls across ~46 files** (total 90 calls incl. the legitimate
one inside `logger.ts`). Breakdown: `console.error` ≈ 41, `console.warn` ≈ 30, `console.log` ≈ 12,
`console.info` ≈ 5. By directory: `src/lib` 19 files, `src/app` 16, `src/components` 7,
`src/stories` 4, `src/` root 1.

Representative bypasses (excluding stories):
- `src/instrumentation.ts:14` (sister to a `logAppError` at :32 — dual emission)
- `src/lib/email/cloudflare-email-client.ts:163`, `transactional-email-client.ts:104,118`
- `src/lib/perf/server-timing.ts:80,94` (`[perf-json]`/`[perf]` direct)
- `src/lib/component-library/{action-errors.ts:8, library-telemetry.ts:268}`
- `src/lib/compliance/retention-core.ts:250` (structured `console.error({...})`)
- `src/lib/cloudflare/worker-route-optimizations.ts:351`
- `src/lib/uploads/operations-dashboard.ts:372`
- `src/lib/{estimates/express-components-telemetry.ts:30, estimate-mutation-telemetry.ts:117}`
- `src/lib/auth/account-audit.ts:90-91` (comment: *"structured console.error — no new dependency on a logger"*)
- `src/lib/projects/actions.ts:968,974,1224,1227`; `src/lib/publication/actions.ts:1509,1622,1764,1780`
- `src/lib/collaboration/realtime-telemetry.ts:44` (comment: prod sink Clarity/Sentry intended)
- `src/app/api/component-library/attachments/route.ts` (6 calls), `direct-upload`, `images`, `scan-override`
- `src/app/api/share/[token]/{route,decision,comment,password}.ts` — **mix `logAppError` AND raw `console.error`** (dual emission → unredacted leak to Workers Observability)
- `src/app/api/internal/{upload-scan,upload-cleanup}/route.ts`, `compliance/privacy-requests`, `auth/[...all]`, `ai/package-builder/handler.ts`
- `src/components/workshop/{component-library/index.tsx (5), EstimateSheetContent, WorkshopRouteErrorState, WebBitalsProbe}`, `components/performance-monitor`

**Significance for this plan:** these bypasses are what Workers Observability (`head_sampling_rate
0.1`, `persist:true`) actually ingests. Until the sibling pack's `SEC-01` routes them through
`redactForLog`, the *inventory* (§`08`) must treat every bypass as a potential PII/secret leak
source. This pack's evidence-redaction requirement (SEC-02 here / DEC-09) ensures *new* proof
artifacts do not add to this leak surface.

### 1.5 Persistent log sinks

- **Dev NDJSON** (`logger.ts`): `appendFileSync` to `ARCHESTIMATOR_DEV_LOG_PATH ?? cwd()/logs/dev.ndjson`;
  rotation at 50 MB (env `ARCHESTIMATOR_DEV_LOG_MAX_BYTES`); **only 1 rotated file kept** (`.1`);
  gated by `shouldWriteDevLog()` (disabled `ARCHESTIMATOR_DEV_LOG_DISABLED=1`; writes when
  `NODE_ENV!=="production"` OR `ARCHESTIMATOR_DEV_LOG_PATH` set). `/logs/` is gitignored (`.gitignore:35`).
- **Console mirror** → Workers Observability (the production ingestion path).
- **No prod log shipping to R2/D1**; no Logpush; no tail consumer.
- `retention-core.ts:39` declares `logs_worker_observability`/`logs_email_delivery` retention
  *class names* but no rule ships them (§3 below).

### 1.6 Tests covering logging/redaction

`tests/vitest/redact.test.ts` (6 cases), `logger.test.ts` (redacts before write; rotation),
`logger-perf.test.ts` (P95 < 1ms), `route-error.test.ts` (asserts no `"password leaked"`),
`tests/unit/tail-dev-logs.test.ts` (8 cases — NDJSON parser), `client-error.test.ts`,
`instrumentation.test.ts`, `with-action-errors.test.ts`, `problem-details.test.ts`,
`app-error.test.ts`, `client-identity.test.ts`. **No test asserts the readiness script fails on
missing artifacts** — that is the test gap this plan closes (TEST-02).

---

## 2. Observability and alerting config

### 2.1 `wrangler.jsonc` (lines 83–97)

```jsonc
"observability": {
  "enabled": true,
  "head_sampling_rate": 0.1,
  "logs": { "enabled": true, "head_sampling_rate": 0.1, "invocation_logs": true, "persist": true },
  "traces": { "enabled": true, "head_sampling_rate": 0.05, "persist": true }
}
```

**Not present:** `analytics_engine`, `tail_consumers`, `logpush`, top-level `metrics`/`limits`.
Sibling observability pack OBS-01/OBS-02 own adding `analytics_engine` + tuning sampling — out of
scope here.

### 2.2 Alert-delivery mechanisms (the crux of this plan)

Repo-wide search for `logpush | tail consumer | analytics_engine | datadog | sentry | loki |
grafana | prometheus | pagerduty | slack webhook | escalat`:

- **No Logpush, no tail consumer, no Analytics Engine binding, no third-party sink.**
- **Sentry is stubbed** (`src/instrumentation.ts:8` *"Sentry/provider registration is intentionally
  deferred"*; `realtime-telemetry.ts:7`, `express-components-telemetry.ts:28`).
- **Exactly ONE real alert-delivery path:** `src/lib/uploads/operational-telemetry.ts`
  - `sendUploadOperationalAlert(record, fetchImpl)` (line 147). Gated
    `UPLOAD_OPERATIONS_ALERTS_ENABLED === "1"`; skipped unless `severity ∈ {warning, critical}`
    (`shouldSendUploadOperationalAlert`, line 91). Requires HTTPS
    `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL` + `_TOKEN`. POSTs JSON with `Authorization: Bearer
    <token>` + header `x-archestimator-alert-event`.
  - Wired into `reportUploadCleanupJobTelemetry`, `reportUploadScanJobTelemetry`,
    `reportUploadAdmissionRejected`.
  - **Fire-and-forget:** `void sendUploadOperationalAlert(record).catch(()=>{})` (line 200) —
    delivery failures are swallowed and never change upload behavior. **This is the proof gap.**
- **Proof of that one path:** `scripts/verify-upload-alert-delivery.ts` — sends one synthetic
  `upload_backpressure_rejected` warning through the live webhook only when
  `ARCH_UPLOAD_ALERT_DELIVERY_PROOF=1` + `ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED=1` +
  `UPLOAD_OPERATIONS_ALERTS_ENABLED=1`. Validates HTTPS + token + bearer-redaction +
  payload-path-safety. Its own `note` (line 250) scopes it narrowly: *"does not prove cleanup/scan
  hosted routes, live scanner/CDR execution, dashboard observation, backpressure traffic, retention
  runbooks, or hosted runtime limits."*

**This is the model this plan generalizes** (DEC-02): every alert scenario gets a
`verify-*-alert-delivery.ts` that does a real send→receive→acknowledged round-trip and writes a
redacted JSON receipt.

### 2.3 Crons and `scheduled()` handler

`worker.ts:97-116` (`scheduled`) runs two parallel `ctx.waitUntil` branches:

1. **All crons** → `runCloudflareScheduledUploadJobs({cron, env, fetcher})`
   (`src/lib/cloudflare/scheduled-upload-jobs.ts`). Maps:
   - `0 3 * * *` (`CLOUDFLARE_UPLOAD_CLEANUP_CRON`) → POST `/api/internal/upload-cleanup`
     (secret `UPLOAD_CLEANUP_JOB_SECRET` or `CRON_SECRET`)
   - `15 3 * * *` (`CLOUDFLARE_UPLOAD_SCAN_CRON`) → POST `/api/internal/upload-scan`
   - **Dry-run by default** (`shouldDryRun` line 63: dry unless `UPLOAD_JOBS_ENABLED=1` AND
     `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`).
2. **`30 3 * * *` only** (worker.ts:109) → `runRetentionPassInD1(env.ARCH_DB, undefined,
   {cronRunId})` (`src/lib/compliance/retention-core.ts`).

Each branch ends with `console.log(...)` of a JSON summary — the only "delivery" of cron outcomes
is a Workers Observability log line. **No cron-failure alert exists.** → FR-01 scenario S-06
(cron failure) + OPS-01 triage row.

### 2.4 Readiness/proof scripts (`scripts/`)

| Script | What it does | Real proof? |
|---|---|---|
| `check-support-monitoring-readiness.ts` | 5 `*_CONFIRMED` flags + 4 owner labels; `note` admits it proves nothing | ❌ operator flags |
| `verify-upload-alert-delivery.ts` | Real webhook round-trip for upload-ops alert | ✅ but narrowly scoped |
| `check-cloudflare-email-readiness.ts` | Verifies EMAIL binding + domain onboarding; records secret *names* only | readiness, not delivery |
| `check-cloudflare-platform-toolchain.ts` | Reads wrangler `observability.*` into report rows; *"does not prove observability receipt"* | ❌ readback only |
| `check-cloudflare-provider-readiness.ts` | `analytics-provider` check passes if `webAnalyticsPropertyCreated &&
  webAnalyticsReceivingDataProven` OR `observabilityReady` (operator-supplied `CLOUDFLARE_OBSERVABILITY_PROOF_FILE` JSON) | ⚠️ operator-supplied proof file |
| `check-cloudflare-release-gates.ts:588` | String gate text "Web Analytics/Workers Observability receipt is incomplete" | text only |
| `emit-test-log.mjs` | Emits one synthetic `synthetic_test_error` via `logAppError` (seeds Workers Observability) | seed only |
| `generate-cloudflare-queues-cron-proof.ts` | Cron/queue wiring proof (not delivery) | wiring only |

### 2.5 Email binding (operational alert path candidate)

`EMAIL` binding (wrangler.jsonc:25-29). `sendCloudflareEmail`
(`src/lib/email/cloudflare-email-client.ts:121`) requires
`ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=1` + `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare*` +
`CLOUDFLARE_EMAIL_FROM`. `TransactionalEmailClient` wraps it with a circuit breaker. **Only 3
production callers** — publication share notify, collaboration invite, magic-link auth. **No
operational/alert email is sent today.** `support@archestimator.com` appears as `mailto:`/display
only. → FR-02 alert channel S-02 (email-to-support) is a *new* use of the EMAIL binding for
operational alerts; in scope.

---

## 3. Retention, compliance, and data model

### 3.1 Retention enforcement engine (`src/lib/compliance/`)

- `retention-core.ts` — `runRetentionPassInD1()` selects rows past cutoff, batches (500/100),
  hard-`DELETE`s, writes `data_retention_events` audit rows; supports `dryRun`.
- `DEFAULT_RETENTION_RULES` (lines 79–143) — **7 rules currently active:**
  - `account_security_events` 365d purged
  - `account_audit_legacy_sha256` 180d purged (selects `ip_hash LIKE 'sha256:%'`)
  - `collaboration_audit_events` 365d purged
  - `shared_link_events` 90d purged
  - `estimate_sheet_events` 365d purged
  - `privacy_requests_completed` 2555d (~7y) purged
  - `privacy_requests_rejected` 365d purged
- `retention-repository.ts` — D1-bound wrapper (`runRetentionPass`, `recordRetentionEvent`).
- Tests: `tests/vitest/compliance-retention-repository.test.ts` (5 tests).

### 3.2 The 7 UNENFORCED classes (this plan's DATA-02 scope)

Per `retention-schedule.md` these have a declared TTL but **no rule in
`DEFAULT_RETENTION_RULES`:**

| Class | Draft TTL | Action | Note |
|---|---|---|---|
| `logs_worker_observability` | 30d (schedule) → **corrected ~3d free-tier** (F-03) | platform-managed | Cloudflare Workers Logs free-tier retention is ~3 days, not 30. Logpush/Workers Paid unlocks longer. |
| `logs_email_delivery` | 90d | platform-managed | Cloudflare Email delivery logs; depends on provider logging surface. |
| `uploads_orphaned` | 30d | purged | Aligns with upload-cleanup cron `0 3 * * *`. |
| `sessions_expired` | 30d | purged | Expired Better Auth sessions. |
| `ai_action_runs` | 365d | purged | AI feature deferred; rule added for forward-compat. |
| `ai_tool_calls` | 365d | purged | Same. |
| `ai_data_access_events` | 365d | purged | Same. |

**`uploads_orphaned` and `sessions_expired` are the two this plan can actually enforce via D1
rules** (the rows live in `upload_assets`/`upload_sessions` and Better Auth's `session` table).
The three AI classes have no data yet (feature deferred) — rules are forward-compat no-ops.
`logs_worker_observability`/`logs_email_delivery` are platform-managed (not D1 rows) — the "rule"
is a *policy acknowledgement row* + a documented upgrade path, not a D1 DELETE. This nuance is
captured in DATA-02/DATA-03.

### 3.3 Incident/feedback/support tables

- `beta_feedback_submissions` (`migrations/0001_closed_beta_feedback.sql:33`): `user_id,
  workspace_id, project_id, user_email, feedback_type, severity, page_path, message,
  metadata_json, status (new/reviewing/resolved/archived), created_at, updated_at`. **No
  retention column.** `beta_feedback_status_events` (status audit).
- `notification_definitions`/`notification_deliveries` (`migrations/0009_notifications.sql`):
  **in-app only** (kinds: release_announcement, system_notice, collaboration, publication_activity,
  beta_feedback, security_notice). Surface center/modal/toast — not email/webhook.
- Audit tables: `account_security_events` (0004 + HMAC rebuild 0035),
  `collaboration_audit_events` (0007), `estimate_sheet_events` (0025), AI/rate-limit audit
  (0006), `mass_deletion_storage_cleanup_results` (0012), `data_retention_events` (0034).
- **NO `incidents`, `alerts`, or `event_log` table exists.** → DATA-01 adds
  `operational_incidents` + `operational_incident_events` (migration `0040`).

### 3.4 Compliance state docs (`.ai/10_state/compliance/`)

- `retention-schedule.md` — DRAFT, gated `OPEN-DEC-004`. 14-class TTL registry + class-action
  matrix + DSAR propagation (unimplemented) + counsel checklist.
- `privacy-notice-draft.md` §5 — user-facing retention summary (account 30d post-erasure, audit
  365d, share 90d, privacy requests 7y, orphaned uploads 30d). Gated `OPEN-DEC-004`.
- `ropa.md` — RoPA (GDPR Art. 30 + PH DPA IRR §14). Invite tokens 7d default. Gated
  `OPEN-DEC-002`/`004`.
- `dpia-screening.md` — 365d audit-log retention + HMAC pepper as balancing measure; 90d share.
- `processor-register.md` — sub-processors (Cloudflare D1/R2/Images/Email, Google). Gated
  `OPEN-DEC-003`.

### 3.5 Backup reality (orthogonal to retention but referenced)

`AGENTS.md:44` says "daily D1 backups + `cf:d1-restore-rehearsal`". The d1-r2-backup pack
`07_…:80-91` clarifies this is **aspirational**: actual is 7-day free-tier Time Travel (30d paid),
manual `wrangler d1 export`, no automated export cron, all 3 cron slots taken. **This plan does
not own backup** but records that retention ≠ backup (a restore resurrects purged rows — REQ-SEC-03
in the backup pack).

---

## 4. Document-impact matrix

| Document | Relevant section | Impact |
|---|---|---|
| `AGENTS.md:44` | "daily D1 backups" cost posture | Unchanged by this plan; referenced. Retention policy does not change backup posture. |
| `.ai/10_state/compliance/retention-schedule.md` | Per-class TTL registry | **Updated** by DATA-02/DATA-03: correct `logs_worker_observability` to ~3d free-tier; add the 7 enforcement rules' status. Still gated `OPEN-DEC-004` for final TTLs. |
| `.ai/10_state/compliance/privacy-notice-draft.md` §5 | User-facing retention | Cross-check: "audit logs 365d" already matches; "orphaned uploads 30d" matches `uploads_orphaned`. No user-facing change from enforcing the draft values. |
| `.ai/10_state/current-state.md` | Fast-path stage | Append a planning entry when implementation lands (not in this planning task). |
| Sibling `2026-07-07-cloudflare-worker-production-observability-and-budgets/04_…` SEC-01/SEC-02 | Redaction enforcement | **Consumed, not edited**: this pack's `08` redaction inventory feeds that pack's SEC-01 gap list. |
| `.ai/03_plans/2026-07-07-beta-support-feedback-operating-loop/` DATA-02 | Feedback purge 365d archived-only | **Referenced, not duplicated**: feedback retention couples to `OPEN-DEC-004`; this pack's incident/escalation record format is orthogonal. |
| `.ai/17_InfoSec/2026-06-24-InfoSec-Run/18-release-gates-traceability.md:39,78` | "Monitoring, incident, rollout, rollback / log retention" blocked gate | **Closes** those gate items: this pack defines the incident record format, log-retention enforcement, and the alert-delivery proof that the InfoSec run lists as missing. |

---

## 5. blast-radius summary (full matrix in `10_…`)

- **Direct:** `scripts/check-support-monitoring-readiness.ts` (rewritten → artifact-based),
  `src/lib/compliance/retention-core.ts` (7 rules added), new migration `0040` (incident tables),
  new `scripts/verify-*-alert-delivery.ts`, new `src/lib/observability/incident-record.ts`,
  new `src/lib/observability/alert-scenarios.ts`, runbook doc.
- **Probable:** `worker.ts` (cron-failure alert hook, after sibling pack's try/catch lands),
  `wrangler.jsonc` (only if evidence artifacts need a binding — they don't by default).
- **Verification-only:** redaction gaps (owned by sibling), console-bypass migration (owned by
  sibling), feedback SLA columns (owned by beta-feedback pack).
- **Explicitly unaffected:** application estimate/auth/publication business logic, R2 object
  policies, Durable Object room semantics, queue retry config.
