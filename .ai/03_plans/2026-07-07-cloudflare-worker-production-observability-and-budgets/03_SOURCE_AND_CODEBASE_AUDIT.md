# 03 — Source and Codebase Audit

Evidence gathered by 2 native Explore subagents + targeted reads. All claims are
file:line referenced. Legend: **E1** = Explore-1 (routes/middleware/telemetry),
**E2** = Explore-2 (D1/DO/retention/uploads/budget vars).

## 3.1 Repository structure (observability-relevant)

```
worker.ts                                      # Worker entry: fetch/scheduled/queue
wrangler.jsonc                                 # Bindings + observability config + budget vars
src/proxy.ts                                   # Next.js proxy (renamed middleware) shim
src/lib/auth/request-proxy.ts                  # real proxy: auth gate, cache-control, state-mismatch
src/instrumentation.ts                         # Next.js register() + onRequestError
src/lib/observability/
  logger.ts                                    # consoleAppLogger → dev.ndjson + console.*
  app-error.ts                                 # AppError hierarchy + toLogLevel()
  redact.ts                                    # PII redaction (NEVER_LOG_KEYS, HASHED_ONLY_KEYS)
  route-error.ts                               # errorResponse(), problemDetailsResponse()
  client-error-report.ts                       # client-side error envelope
  client-identity.ts                           # CF-Connecting-IP /24 /48 prefix, dev/preview
  toast-config.ts, action-result.ts, types.ts, with-action-errors.ts
src/lib/perf/server-timing.ts                  # dev-only PERF_TRACE; NO Server-Timing header
src/lib/cloudflare/
  collaboration-room.ts                        # DO class (CollaborationRoom)
  collaboration-room-router.ts                 # /__cloudflare/collaboration-room/* router
  upload-job-queue.ts                          # Queue consumer + provider-proof receipts
  scheduled-upload-jobs.ts                     # cron → internal fetch
  protected-proof-routes.ts                    # /__cloudflare/* proof router
  worker-route-optimizations.ts                # edge fast-paths (host redirect, cache, etc.)
  d1.ts                                        # getCloudflareD1Database()
  estimate-history-proof-router.ts             # proof router (queries by correlation_id)
  (jobs-proof-router.ts, d1-performance-proof-router.ts, better-auth-proof-router.ts, provider-proof-router.ts)
src/lib/compliance/
  retention-core.ts                            # runRetentionPassInD1 + recordRetentionEventInD1
  retention-repository.ts                      # thin server wrapper
src/lib/uploads/                               # admission-control, object-keys, r2-storage-provider, direct-upload-records, operational-telemetry
src/lib/repositories/                          # 12 D1 repo files
src/app/api/**                                 # ~35 route handlers
src/app/**/route.ts                            # non-/api routes (auth callback, invite, pending-invite)
src/lib/**/actions.ts (+ "use server" files)   # ~28 Server Action files
```

## 3.2 Worker entry — `worker.ts`

- `fetch()` (`worker.ts:60-95`): runs edge fast-paths in order, then proof router,
  then DO router, then static-page cache, then `openNextWorker.fetch()`, then
  auth-state-mismatch normalization. **No try/catch** around the dispatch chain.
  No request id generated. No header echo. [E1]
- `scheduled()` (`worker.ts:97-116`): `ctx.waitUntil(runCloudflareScheduledUploadJobs(…))`
  on all crons; separate `ctx.waitUntil(runRetentionPassInD1(…))` on `30 3 * * *`
  with `cronRunId = crypto.randomUUID()`. Only logs summary strings (`:104,:112`). [E1,E2]
- `queue()` (`worker.ts:118-128`): `ctx.waitUntil(runCloudflareUploadJobQueueBatch(…))`,
  logs summary only (`:125`). **No try/catch.** [E1]
- Durable Object export: `export { CollaborationRoom } from "./src/lib/cloudflare/collaboration-room"`. [E2]

## 3.3 Observability library — `src/lib/observability/`

- **`logger.ts`**: `LogRecord = {timestamp, level, event, message, action?, request_id?, error?, context?, tainted_fields?}`.
  `consoleAppLogger.log()` writes (a) NDJSON to `logs/dev.ndjson` (rotates at 50MB, dev-only unless `ARCHHESTIMATOR_DEV_LOG_PATH`), (b) `console.error/warn/info` to stdout (this is what Workers Observability ingests). `buildErrorLogRecord()` + `logAppError()` canonical error path. [E1]
- **`app-error.ts`**: `AppError` hierarchy: `AuthRequiredError` (401), `AuthSessionExpiredError` (401), `AuthPermissionDeniedError` (403), `AuthRateLimitedError` (429), `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409), `DatabaseError` (500), `UpstreamError` (502), `RateLimitError` (429), `NetworkError` (503), `InternalError` (500). `toLogLevel()` maps codes → info/warn/error. `normalizeAppError()` wraps unknowns. `serializeErrorCauseForLog()` caps depth at 2. [E1]
- **`redact.ts`**: `NEVER_LOG_KEYS` (authorization, cookie, password, token, jwt, api_key, service_role_key, …), `HASHED_ONLY_KEYS` (email, recipient_email, user_email). Regex redaction for emails (sha256:16hex), Bearer, JWT (eyJ…), `/share/`/`/invite/` path segments, query-param secrets, hex ≥32, prompt-injection phrases. `redactValue()` recurses with cycle protection. [E1]
- **`route-error.ts`**: `errorResponse()` → `{ok:false, trace_id, error}` JSON + `logAppError({event:"route_error"})`. `problemDetailsResponse()` → RFC 9457 `application/problem+json` with `no-store, private`. `readTraceId()` prefers explicit → `getCurrentPerfTraceSnapshot()?.requestId` → fresh `err_*`. [E1]
- **`client-identity.ts`**: derives IP from `CF-Connecting-IP` (trusted), computes /24 (IPv4) or /48 (IPv6) prefix, classifies dev/preview. Replaced insecure X-Forwarded-For helper. [E1]
- **`with-action-errors.ts`**: wraps Server Actions; calls `logAppError({event:"action_error", action})`. **No requestId** — Server Actions run outside the per-request perf trace context. [E1]

## 3.4 Perf instrumentation — `src/lib/perf/server-timing.ts`

- **Dev-only** (`PERF_TRACE === "1"`). `makeRequestId()` → `wsh_<ts36><rand>` (`:37`). Stored in `AsyncLocalStorage`. [E1,E2]
- `withPerfTraceRequest(scope, fn)` wraps ~16 workshop server-component fetches. [E1]
- `traced(label, fn)` / `traceDatabaseFetch(label, op, relation, fn)` — used in 2 repos only (`recipient-proposals-repository.ts`, `workspace-repository.ts`). [E2]
- `instrumentDatabaseFetch()` monkey-patches `fetch` to tag RPC/REST by relation. [E2]
- **Does NOT emit a `Server-Timing` header** despite the name; only `console.log("[perf-json] …")` / `console.log("[perf] …")`. [E1]

## 3.5 Request-id / correlation handling (current)

- **Read from inbound headers**: `src/app/auth/callback/route.ts:19`, `src/lib/auth/actions.ts:31` — `headersList.get("x-request-id") ?? headersList.get("cf-ray")` for `recordAccountSecurityEvent`. Written to D1 `request_id` column via `account-audit.ts` / `account-audit-d1-store.ts`. [E1]
- **Generated internally (dev/on-error)**: `server-timing.ts:37` (`wsh_*`), `route-error.ts:28-33` (`err_*`). These are independent and not propagated to responses or logs except `route-error.ts` → `trace_id`. [E1]
- **Domain `correlationId` ≠ request trace id**: persisted to D1 `correlation_id` columns for idempotency + activity grouping. Heavy use in `src/lib/estimates/actions.ts` (~30 sites via `getMutationCorrelationId`), `d1-action-client.ts` (~20 sites), `ai/package-builder/apply.ts`, `projects/actions.ts`, `component-library/actions.ts`, `mass-deletion/bulk-action.ts`, `reusable-sources/actions.ts`, `activity/*`, `cloudflare/estimate-history-proof-router.ts:407-618`. [E1]
- **Client-side `requestId`**: UI-only fetch de-duplication counters in several components — NOT telemetry. [E1]
- **KEY GAP**: No worker-level request id on inbound fetch; no `x-request-id` response header; no correlation between `cf-ray`, `wsh_*`, `err_*`; Server Actions carry no request id at all. [E1]

## 3.6 API route surface — critical flows

~35 route files. [E1] Full list in `07_…`. Critical for budgets:

| Route | File | Budget concern |
|---|---|---|
| Auth catch-all | `src/app/api/auth/[...all]/route.ts` | subrequest (Better-Auth RPC), CPU |
| Direct upload reserve | `src/app/api/component-library/attachments/direct-upload/route.ts` POST | D1 write (upload_sessions), memory |
| Direct upload bytes | same, PUT | memory (arrayBuffer), R2 PUT latency, body limit |
| Direct upload finalize | same, POST | D1 writes (upload_assets, upload_events), R2 head/download |
| Share token resolve | `src/app/api/share/[token]/route.ts` GET | D1 read; public; cache/no-store |
| Share events SSE | `src/app/api/share/[token]/events/route.ts` POST | long-lived; duration |
| AI ask / package-builder | `src/app/api/ai/ask/route.ts`, `package-builder/route.ts` | upstream timeout; CPU; correlation |
| Proposal xlsx export | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | **CPU-bound on 10ms free tier** |
| Client error ingest | `src/app/api/internal/client-error/route.ts` POST | rate-limited 10/min/IP, 16KB cap |
| Internal cron job routes | `src/app/api/internal/upload-cleanup|upload-scan|upload-runtime|upload-lifecycle-proof|estimate-history-proof|collaboration-invitation-proof/route.ts` | background; proof artifacts |

## 3.7 Middleware/Proxy — `src/proxy.ts` → `src/lib/auth/request-proxy.ts`

- No `middleware.ts`. `proxy.ts` (Next.js 15+ renamed middleware) delegates to `request-proxy.ts`. [E1]
- `PROTECTED_PREFIXES = ["/workshop"]`; Better-Auth session cookie; public allowlist (`/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/trust`, `/signup`, `/invite`, `/share`, `/access-required`). [E1]
- Terms-acceptance gate; OAuth state-mismatch recovery (`Clear-Site-Data` + cookie cleanup). [E1]
- Cache-Control: marketing pages `s-maxage=31536000`; sensitive `private, no-cache, no-store, max-age=0, must-revalidate`. [E1]
- Worker `worker.ts` duplicates several of these concerns at the edge (canonical host redirect, OAuth state recovery, share-token validation). [E1]

## 3.8 D1 repository pattern — `src/lib/repositories/` + `src/lib/cloudflare/d1.ts`

- `getCloudflareD1Database()` (`d1.ts:41-53`) → dynamic import `@opennextjs/cloudflare` `getCloudflareContext({async:true})` → `context.env.ARCH_DB`. Returns `null` on failure (swallows errors). [E2]
- Each repo defines private `requireXxxD1Database()` + `all<T>()`/`first<T>()` around `database.prepare(sql).bind(...values).all<T>()`. No shared base class. [E2]
- Examples: `project-charts-repository.ts:392,405-408`, `component-library-repository.ts:294,304-307`, `project-activity-feed-repository.ts:201,208-212`. [E2]
- `workspace-repository.ts` (160KB) is the heaviest; uses `traced(...)` around many D1 reads. [E2]
- **All other repos have NO timing/observability wrap** — raw `prepare/bind/all`. [E2]

## 3.9 Durable Object — `src/lib/cloudflare/collaboration-room.ts`

- Hibernation WebSocket API (`ctx.acceptWebSocket(server)` `:94`). Per-socket attachment `{authorized?, presence?, roomName?}`. [E2]
- **No persisted state** (sqlite-backed class, but `ctx.storage` unused). Volatile. [E2]
- **Zero `console.*`/logger calls.** Errors handled by closing socket (1011) or returning typed JSON `{type:"error", code}`. [E2]
- **No metrics.** [E2]
- **CPU/duration concerns**: `webSocketMessage` synchronous JSON parse + `TextEncoder().encode(message).byteLength` (full re-encode just for length, `:108`); presence broadcast O(N) per track/untrack; `readPresenceState` (`:186-202`) re-iterates + re-deserializes every socket on every presence change. Fan-out unbounded. [E2]

## 3.10 Retention — `src/lib/compliance/retention-core.ts`

- `runRetentionPassInD1(db, rules, options)` (`:180-268`) iterates `DEFAULT_RETENTION_RULES` (`:79-143`). Per rule: `cutoffTimestamp`, `SELECT ... LIMIT N`, batched `DELETE ... WHERE id IN (json_each)`. [E2]
- **7 rules defined** (account_security_events 365d/500batch, account_audit_legacy_sha256 180d, collaboration_audit_events 365d, shared_link_events 90d, estimate_sheet_events 365d, privacy_requests_completed 2555d/100batch, privacy_requests_rejected 365d). **7 of 14 `RetentionClassName` values have no rule/no-op** (ai_action_runs, ai_tool_calls, ai_data_access_events, logs_worker_observability, logs_email_delivery, uploads_orphaned, sessions_expired). [E2]
- `recordRetentionEventInD1` (`:145-178`) → single `INSERT INTO data_retention_events`. [E2]
- **Logs only on error**: `console.error({retention_pass_failed:true, class_name, error_name})` (`:250-254`) — `error.name` only, no message/stack. [E2]
- **Unbounded**: no max-duration guard, no overall row budget, no per-pass time budget. Per-rule LIMIT bounds batch size, not total pass duration. Runs fire-and-forget in `ctx.waitUntil` (`worker.ts:109-115`). [E2]

## 3.11 Upload flows — two distinct paths

**Flow A — Cron maintenance queue** (not client uploads):
- `scheduled-upload-jobs.ts:40-53` defines 2 jobs: `upload-cleanup` (`0 3 * * *`), `upload-scan` (`15 3 * * *`). Worker calls `fetch()` on internal routes directly (`worker.ts:65-72`). [E2]
- Queue producer `enqueueCloudflareScheduledUploadJobs` (`upload-job-queue.ts:143-176`) exists but **not wired into `worker.ts`** — only invoked by proof routers. [E2]
- Consumer `runCloudflareUploadJobQueueBatch` (`:329-410`): idempotency dedupe (`:348`), ack/retry with 60s delay + max 3 retries (`:12-13`), DLQ expectation flag (`:321`). Calls back into `runCloudflareScheduledUploadJobs`. [E2]
- Job IDs: `idempotencyKey = "${jobName}:${cron}:${minute}"` (`:119-122`). `providerProof.id` validated `/^[a-zA-Z0-9-]{16,80}$/`. R2 proof receipts at `provider-proof/jobs/${proofId}.json` (`:220-280`) with `queueLatencyMs`. [E2]
- Error handling (`:359-397`): invalid → `ack("invalid-message")`; duplicate → `ack("duplicate")`; unmatched cron → `ack("unmatched-cron")`; success → `ack("executed")`; non-OK → `retry("job-failed")`; thrown → `retry("exception", error.message)`. Every terminal outcome writes a proof receipt. [E2]

**Flow B — Client attachment direct upload** (R2 + D1):
- POST `action=create` (reserve): `createSignedUpload` (`direct-upload/route.ts:194-296`), admission control `reserveUploadAdmission` (`:200`), object key `buildUploadObjectKey` (`:238`), D1 pending session `recordPendingUploadSessionSession` (`:254`). [E2]
- PUT (bytes): `uploadToCloudflareR2` (`:407-464`), `request.arrayBuffer()` (`:439`), `r2.put(...)` via `r2-storage-provider.ts:66-73`. [E2]
- POST `action=finalize`: `finalizeSignedUpload` (`:298-405`), `headObject`/`downloadObject` verify (`:355-358`), `finalizeUploadSessionAsset` (`:378`) → `UPDATE upload_sessions` + `INSERT upload_assets` + `INSERT upload_events`. [E2]
- IDs: `randomUUID()` from `node:crypto`. Admission rejection telemetry via `reportUploadAdmissionRejected` → `operational-telemetry.ts:281-309`. [E2]
- **Logging**: only `console.error("Cloudflare R2 upload storage is not configured")` (`:350,:445`). R2 PUT latency, finalize duration, event-write failures NOT logged/metriced. [E2]

## 3.12 Budget vars — read sites

All 5 vars in `wrangler.jsonc:98-104`. **Exactly ONE file reads them**, and it is a **secret-gated, non-mutating dry-run proof route** — none enforced live:

| Var | Read at | Enforced live? |
|---|---|---|
| `ARCH_UPLOAD_HOSTED_MEMORY_MB` | `src/app/api/internal/upload-runtime/route.ts:93` | No (echoed in `configuredLimits`) |
| `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` | `:94` | No |
| `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS` | `:95` | No |
| `ARCH_UPLOAD_CONCURRENT_UPLOADS` | `:96` | No |
| `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` | `:97` | No |

Real upload guards use **hardcoded constants**: `direct-upload/route.ts:8,28-33` (body limits), `admission-control.ts:24-28` (MAX_ACTIVE_PER_ACTOR=3, _WORKSPACE=6, MAX_REQUESTS_PER_WINDOW=12), `direct-upload/route.ts:32-33` (MAX_RESERVED_DIRECT_UPLOAD_SESSIONS). [E2]

## 3.13 Other ad-hoc telemetry

- `src/lib/collaboration/realtime-telemetry.ts` — swappable `RealtimeTelemetrySink` (events: subscribed, channel_error, closed, auth_refresh_failed, rate_limited, identity_rejected). **No sink registered in prod** → `console.warn` in non-prod only. Comment notes Clarity/Sentry intended. [E1]
- `src/lib/estimates/express-components-telemetry.ts` — `recordExpressComponentEvent()` → `console.warn("[express-components]")`. Beta seam, no prod sink. [E1]
- `src/lib/collaboration/actions.ts:750,1031,1153` — ad-hoc `console.warn("[collaboration]")`. [E1]
- `worker.ts:104,112,125` — only prod-stable structured worker logs. [E1]
- `worker-route-optimizations.ts:352` — `console.warn("Cloudflare static public page cache write failed")`. [E1]
- **No `cf.colo`/`request.cf` reads anywhere in `src/`.** [E1]
- **No Sentry, Clarity, Analytics Engine binding.** [E1]

## 3.14 Existing tests for observability surfaces

- `tests/vitest/logger.test.ts`, `logger-perf.test.ts` — logger
- `tests/vitest/redact.test.ts` — redaction
- `tests/vitest/app-error.test.ts` — AppError + subclasses
- `tests/vitest/route-error.test.ts`, `route-error-smoke-gate.test.ts` — error responses
- `tests/vitest/workshop-route-error-boundaries.test.tsx` (+ `e2e/workshop-route-error-boundaries.spec.ts`) — UI error boundaries
- `tests/vitest/share-snapshot-redaction.test.tsx` — redaction snapshots
- `tests/vitest/compliance-retention-repository.test.ts` — retention core
- `tests/vitest/library-telemetry-emit.test.ts`, `component-library-durable-telemetry.test.ts`, `estimate-mutation-telemetry.test.ts` — related telemetry
- **Gaps**: no test for `server-timing.ts` (`withPerfTraceRequest`/`traced`/`traceDatabaseFetch`/`instrumentDatabaseFetch`); no retention duration/progress test; no `upload-runtime/route.ts` test; no upload-job-queue retry/DLQ outcome test. [E2]

## 3.15 Config — `wrangler.jsonc`

- Bindings: `ARCH_DB` (D1), `ARCH_UPLOADS_R2` (R2), `COLLAB_ROOMS` (DO), `UPLOAD_JOBS_QUEUE` (Queue + DLQ), `IMAGES`, `EMAIL`, `ASSETS`.
- 3 crons: `0 3 * * *`, `15 3 * * *`, `30 3 * * *`.
- Queue consumer: `max_batch_size:5, max_batch_timeout:30, max_retries:3, dead_letter_queue:"archestimator-upload-jobs-dlq"`.
- `observability`: enabled, logs head 0.1 + invocation_logs + persist, traces head 0.05 + persist.
- `compatibility_date: 2026-06-29`, `compatibility_flags: ["nodejs_compat"]`.

## 3.16 Gap summary (drives the requirements)

1. No end-to-end request id; `cf-ray`/`wsh_*`/`err_*` independent.
2. No `Server-Timing` header.
3. No production metrics sink; realtime/express sinks stubbed unregistered.
4. Worker `fetch`/`scheduled`/`queue` have no try/catch.
5. Budget vars never enforced; hardcoded constants instead.
6. Retention pass unbounded (duration + rows).
7. DO has no logging/metrics; O(N) fan-out; re-encodes message bytes.
8. No `cf.colo`/`request.cf` capture.
9. D1 repo layer has no prod timing (only 2 repos use dev-only `traced`).
10. Server Actions carry no request id in error logs.
