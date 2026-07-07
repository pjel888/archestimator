# 04 — Requirements Specification

Every requirement has a stable ID, statement, rationale, source, priority,
dependencies, objective acceptance criteria, validation method, affected code,
risks, and status. Priorities: **P0** (blocks launch), **P1** (should have),
**P2** (nice to have / defer-eligible). Source strength legend: `brief` =
PROMPT.md, `repo evidence` = file:line, `official docs` = Cloudflare docs (see
`19_…`), `derived` = inferred from evidence, `assumption`.

## FR — Functional

### FR-01 (P0) — End-to-end request id at the Worker edge
- **Statement:** Every inbound HTTP request to the Worker generates (or reuses)
  an app-level request id, sets it as the response `x-request-id` header, and
  propagates it to OpenNext via a request header + `AsyncLocalStorage`.
- **Rationale:** `cf-ray` is not shareable across cron/queue/DO calls and is not
  echoed today; without an app id, request→job→DO correlation is impossible.
- **Source:** brief + repo evidence (`03_…` §3.5).
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-FR-01a: Every HTTP response served by `worker.ts` `fetch()` includes
    `x-request-id: <uuid>` (or the inbound `x-request-id` when present and
    valid).
  - AC-FR-01b: The id is a UUIDv4 (`crypto.randomUUID()`) when no inbound
    `x-request-id` header is present; an inbound well-formed value (≤128 chars,
    `^[A-Za-z0-9._:-]{1,128}$`) is reused.
  - AC-FR-01c: The id is readable inside OpenNext (Server Components, Route
    Handlers, Server Actions) without a separate fetch round-trip.
  - AC-FR-01d: Fast-path short-circuits (`worker-route-optimizations.ts`) also
    set the header.
- **Validation:** unit test of the id helper; integration test that asserts the
  header on a real route; `wrangler tail` manual proof in dev.
- **Affected code:** `worker.ts`, `worker-route-optimizations.ts`, new
  `src/lib/observability/request-id.ts`, `src/lib/observability/route-error.ts`,
  `src/lib/observability/logger.ts`.
- **Risks:** header injection (mitigate: validate inbound id; never reflect
  unsanitized).
- **Status:** planned.

### FR-02 (P0) — Cron and queue correlation ids
- **Statement:** Each cron tick and each queue batch emit a correlation id in
  their first structured log line and (for queue) embed it in any produced
  message payload.
- **Rationale:** cron/queue invocations get fresh `cf-ray`; the only reliable
  cross-boundary thread on free tier is an app id in the message/log.
- **Source:** official docs (`19_…` §3) + repo evidence (`03_…` §3.2, §3.11).
- **Priority:** P0.
- **Dependencies:** FR-01 (shared id helper).
- **Acceptance criteria:**
  - AC-FR-02a: `scheduled()` logs one line `{"event":"cron.start","cron":...,"cronRunId":...}` and one `{"event":"cron.complete",...,"summary":...}` per `ctx.waitUntil`.
  - AC-FR-02b: `queue()` logs `{"event":"queue.batch.start","batchSize":...,"messageIds":[...]}` and `queue.batch.complete` with per-outcome counts.
  - AC-FR-02c: `idempotencyKey` already in `upload-job-queue.ts` is preserved; a fresh `batchId` is added and logged.
- **Validation:** unit test of cron/queue log helpers; proof route asserts the
  structured shape.
- **Affected code:** `worker.ts`, `upload-job-queue.ts`, `scheduled-upload-jobs.ts`.
- **Risks:** message-id list could be large (cap logged ids to first 10).
- **Status:** planned.

### FR-03 (P0) — Worker dispatch try/catch
- **Statement:** `worker.ts` `fetch()`, `scheduled()`, and `queue()` wrap their
  dispatch chains in try/catch that logs a structured error and returns a safe
  response (HTTP 500 / cron summary with `ok:false` / queue `retry` or `ack`).
- **Rationale:** today an unhandled rejection surfaces only as a Cloudflare
  invocation error with no app context.
- **Source:** brief + repo evidence (`03_…` §3.2).
- **Priority:** P0.
- **Dependencies:** FR-01, FR-02.
- **Acceptance criteria:**
  - AC-FR-03a: A thrown error in any fast-path or the OpenNext dispatch is
    caught, logged via `logAppError({event:"worker.fetch.unhandled"})` with the
    request id, and returns a 500 `problemDetailsResponse`.
  - AC-FR-03b: `scheduled()` and `queue()` catch and log with `event:"worker.scheduled.unhandled"` / `"worker.queue.unhandled"` without crashing the handler.
  - AC-FR-03c (P1-4): For any route returning a streaming `Response` (SSE for
    `/api/share/[token]/events`, AI `/api/ai/ask` streaming, any `ReadableStream`
    body), an error thrown **after** headers are committed is caught **inside**
    the stream, logged with `request_id`, and the stream closes cleanly — the
    client must not receive a truncated 200 with a garbage body and no envelope.
- **Validation:** P-04 (sync throw → 500 + logged); **P-06** (streaming mid-stream
  throw → clean close + correlated log).
- **Affected code:** `worker.ts`.
- **Risks:** swallowing errors silently (mitigate: always log at error level).
- **Status:** planned.

### FR-04 (P1) — `Server-Timing` header on HTTP responses
- **Statement:** HTTP responses include a `Server-Timing` header with safe labels
  and durations (e.g. `total;dur=42,db;dur=12`), gated so it never appears on
  auth/share/error/no-store responses unless explicitly enabled.
- **Rationale:** name-sake module never emits it; per-request timing is invisible
  in prod. Safe labels only (no ids/SQL/cookies).
- **Source:** brief + repo evidence (`03_…` §3.4).
- **Priority:** P1 (useful for incident diagnosis; can defer).
- **Dependencies:** FR-01.
- **Acceptance criteria:**
  - AC-FR-04a: Responses from the Worker include `Server-Timing` when
    `ARCH_OBSERVABILITY_SERVER_TIMING=1` (off by default).
  - AC-FR-04b: Labels are whitelisted (`total`, `db`, `r2`, `upstream`); values
    are integer ms; never include SQL, ids, paths, or cookies.
  - AC-FR-04c: Header is suppressed on responses with `Cache-Control: public` or
    `no-store` for share/auth to avoid cache poisoning / leak.
- **Validation:** unit test of the header builder; manual proof in dev.
- **Affected code:** `worker.ts`, `src/lib/perf/server-timing.ts` (rename usage),
  new `src/lib/observability/server-timing-header.ts`.
- **Risks:** cache key pollution (mitigate: gate + suppress on cacheable/auth).
- **Status:** planned.

### FR-05 (P1) — Unified error taxonomy in logs
- **Statement:** Every emitted error log carries `error.kind`, `error.code`,
  `error.status_code`, and the request id, so the Query Builder can slice by
  `outcome`/status.
- **Rationale:** `AppError` already has this; ensure all emit paths use
  `logAppError`/`buildErrorLogRecord` (no bare `console.error` for app errors).
- **Source:** repo evidence (`03_…` §3.3).
- **Priority:** P1.
- **Dependencies:** FR-01.
- **Acceptance criteria:**
  - AC-FR-05a: `with-action-errors.ts`, `route-error.ts`, `worker.ts` catch all
    use `logAppError` (or an equivalent that sets `request_id`).
  - AC-FR-05b: No app-error path logs via raw `console.error` without `request_id`.
- **Validation:** grep proof that no raw `console.error` in `src/lib/**` bypasses
  the logger; unit test that error logs include all fields.
- **Affected code:** `with-action-errors.ts`, `route-error.ts`, `worker.ts`,
  `instrumentation.ts`.
- **Risks:** double-logging (mitigate: ensure instrumentation and route-error
  don't both log the same error at full fidelity).
- **Status:** planned.

## REL — Reliability / budget

### REL-01 (P0) — Runtime budget definitions (evaluator + ceiling + threshold + rollback)
- **Statement:** Define and (where feasible) enforce budgets for CPU, wall-clock,
  subrequests, memory, D1 rows, and DO connections/messages — each with a
  declared evaluator, a free-tier ceiling, a regression threshold, and a rollback
  trigger. Full table in `09_…`.
- **Rationale:** free tier has hard ceilings (10ms CPU, 50 subrequests, 128MB,
  100k D1 rows-written/day); the app must stay under them and detect breaches.
- **Source:** official docs (`19_…` §2).
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-REL-01a: Every budget in the `09_…` table has all 5 fields filled.
  - AC-REL-01b: The tightest budgets (CPU, subrequests, D1 rows-written, DO
    fan-out, retention duration) have an enforcement point or guard in code.
- **Validation:** static review of `09_…`; unit test of guards.
- **Affected code:** `worker.ts`, `retention-core.ts`, `collaboration-room.ts`,
  `direct-upload/route.ts`, `admission-control.ts`.
- **Status:** planned.

### REL-02 (P0) — Retention pass time + row budget
- **Statement:** The retention pass is bounded by a max wall-clock per tick and a
  max rows-deleted per tick, with progress logging per rule.
- **Rationale:** unbounded today (`03_…` §3.10) against the 15-min cron
  wall-clock and 100k D1 rows-written/day.
- **Source:** brief + repo evidence.
- **Priority:** P0.
- **Dependencies:** REL-01.
- **Acceptance criteria:**
  - AC-REL-02a: `runRetentionPassInD1` accepts `maxDurationMs` and
    `maxRowsDeletedPerTick` options and stops early with a `budget_reached`
    result when either is hit.
  - AC-REL-02b: Each rule logs `{"event":"retention.rule","class_name":...,"rowsAffected":...,"elapsedMs":...}` at info.
  - AC-REL-02c: `worker.ts` passes defaults (e.g. 120s, 5000 rows) so a backlogged table cannot blow the cron.
- **Validation:** unit test that a large fixture triggers `budget_reached`.
- **Affected code:** `retention-core.ts`, `worker.ts`.
- **Status:** planned.

### REL-03 (P1) — DO fan-out cap
- **Statement:** `collaboration-room.ts` caps broadcast/presence fan-out per
  message and avoids the `TextEncoder` re-encode for length.
- **Rationale:** O(N) per presence event + full byte re-encode (`03_…` §3.9).
- **Source:** repo evidence.
- **Priority:** P1.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-REL-03a: Message length uses `message.byteLength` (for `ArrayBuffer`/typed
    array) or a single `Buffer.byteLength` (Node) — no double-encode.
  - AC-REL-03b: Broadcast loop has a configurable `MAX_BROADCAST_TARGETS` (e.g.
    256) and logs a `broadcast_truncated` metric when exceeded.
- **Validation:** unit test with N>cap sockets.
- **Affected code:** `collaboration-room.ts`.
- **Status:** planned.

## OBS — Observability / metrics

### OBS-01 (P1) — Free-tier metrics via Analytics Engine
- **Statement:** Add an `analytics_engine` binding and emit 3–5 KPIs per request
  (request count by route/outcome, D1 query count, upload count, DO active
  rooms) with PII-free dimensions.
- **Rationale:** free up to 100k points/day, 250/invocation; survives the 3-day
  log purge; doesn't eat the logs quota.
- **Source:** official docs (`19_…` §5).
- **Priority:** P1.
- **Dependencies:** FR-01.
- **Acceptance criteria:**
  - AC-OBS-01a: `wrangler.jsonc` adds an `analytics_engine` binding (name
    pending owner decision — DEC-07).
  - AC-OBS-01b: A `src/lib/observability/metrics.ts` exposes `writeDataPoint`
    with a redaction-safe dimension allowlist.
  - AC-OBS-01c: Dimensions never include email, token, path with id, user id, or
    free-form strings (only enum buckets: route-class, outcome, code).
- **Validation:** unit test that PII dimensions are rejected; proof route asserts
  the binding exists.
- **Affected code:** `wrangler.jsonc`, new `src/lib/observability/metrics.ts`,
  `worker.ts`, representative route.
- **Risks:** cost if traffic spikes (mitigate: cap points/invocation at 250;
  sample KPIs; monitor quota via GraphQL).
- **Status:** planned.

### OBS-02 (P1) — Sampling tuned for pre-launch
- **Statement:** `wrangler.jsonc` observability config is tuned: logs near 100%
  pre-launch, traces disabled (or 0.01), because traces share the logs quota
  since 2026-03-01.
- **Rationale:** pre-launch traffic is low; full log fidelity aids triage; traces
  are Open Beta and quota-shared.
- **Source:** official docs (`19_…` §1, §6).
- **Priority:** P1.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-OBS-02a: Config sets `logs.head_sampling_rate: 1.0` (or 0.5 with comment)
    and `traces.enabled: false` (with commented 0.01 alternative).
  - AC-OBS-02b: A documented walk-down schedule (→ 0.1 → 0.05) tied to traffic
    thresholds.
- **Validation:** static config review; documented schedule.
- **Affected code:** `wrangler.jsonc`.
- **Status:** planned.

### OBS-03 (P1) — Dashboard/alert query definitions
- **Statement:** Document Query Builder + GraphQL queries for: error rate by
  route, `exceededCpu`/`exceededMemory` outcomes, p95 duration, D1 row budget
  headroom, queue DLQ depth, cron duration.
- **Rationale:** free-tier native Worker alerting is weak; queries are the
  day-to-day investigation tool.
- **Source:** official docs (`19_…` §4, §6).
- **Priority:** P1.
- **Dependencies:** OBS-01, OBS-02.
- **Acceptance criteria:**
  - AC-OBS-03a: `13_…` includes copy-paste Query Builder + GraphQL for each
    signal.
  - AC-OBS-03b: Alert options are honest: self-poll GraphQL from a free external
    cron is the realistic free path; native Worker alerting is limited.
- **Validation:** static review.
- **Affected code:** docs only.
- **Status:** planned.

## SEC — Privacy / redaction

### SEC-01 (P0) — Redaction on every emit path
- **Statement:** Every log/metric/console emit path routes through redaction.
  Specifically: Analytics Engine dimensions (OBS-01), any `Server-Timing`
  labels (FR-04), and any `console.*` outside the logger.
- **Rationale:** `redact.ts` covers structured app logs only; new paths are not
  covered.
- **Source:** brief (keep sensitive payloads out of logs/evidence).
- **Priority:** P0.
- **Dependencies:** OBS-01, FR-04.
- **Acceptance criteria:**
  - AC-SEC-01a: `metrics.ts` rejects any dimension value not in an allowlist
    (test proves rejection of email-shaped and token-shaped strings).
  - AC-SEC-01b: `Server-Timing` label allowlist is enforced (test).
  - AC-SEC-01c: A grep audit lists every `console.*` in `src/` and confirms each
    is either inside the logger or routes user-data-free messages.
- **Validation:** unit tests; grep audit artifact in `19_…`.
- **Affected code:** `metrics.ts`, `server-timing-header.ts`, audit doc.
- **Status:** planned.

### SEC-02 (P1) — Evidence redaction
- **Statement:** Provider-proof routes and `cf:*` evidence scripts redact
  secrets/ids/tokens before emitting artifacts; proof artifacts never include
  raw headers, cookies, or full URLs.
- **Rationale:** brief constraint.
- **Source:** brief.
- **Priority:** P1.
- **Dependencies:** SEC-01.
- **Acceptance criteria:**
  - AC-SEC-02a: Existing proof routes reviewed; any that emit request samples
    are wrapped in `redactForLog`.
  - AC-SEC-02b: Evidence scripts document the redaction applied.
- **Validation:** static review.
- **Affected code:** `src/app/api/internal/*-proof/*`, evidence scripts.
- **Status:** planned.

## TEST / DOC

### TEST-01 (P0) — Test coverage for new observability code
- **Statement:** Unit tests for: request-id helper (generate/validate/reuse),
  budget guards (retention, DO fan-out), metrics dimension allowlist, server-timing
  builder. Integration test for the request-lifecycle log line and the 500 path.
- **Source:** repo evidence (test gaps in `03_…` §3.14).
- **Priority:** P0.
- **Dependencies:** FR-01..05, REL-02..03, OBS-01, SEC-01.
- **Acceptance criteria:** test files listed in `12_…` test matrix, all green.
- **Status:** planned.

### DOC-01 (P1) — Observability runbook
- **Statement:** A runbook (`13_…` + a short ops doc) covering: how to find a
  request by id, how to read an error log, budget thresholds, rollback triggers,
  escalation.
- **Source:** brief (evidence scripts + dashboard/alert expectations).
- **Priority:** P1.
- **Dependencies:** OBS-03.
- **Status:** planned.

## Shadow-path matrix (consolidated for the request-lifecycle flow)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| HTTP request lifecycle (FR-01/03/05) | 200 + `x-request-id` | malformed inbound id → new id generated | n/a | inbound id >128 → new id | auth-denied AppError logged w/ id | upstream 502 → `UpstreamError` logged w/ id | two concurrent requests get distinct ids | n/a | response always has header | unit + integration |
| Cron tick (FR-02) | `cron.start`+`cron.complete` | missing secret → `missing_secret` skip logged | no jobs match → `unmatched_cron` logged | bad cron → skip | n/a | internal fetch 500 → `ok:false` logged | two ticks overlap → distinct `cronRunId` | idempotencyKey dedupes | summary logged | unit |
| Queue batch (FR-02) | `batch.start`+`batch.complete` | empty batch → no-op | n/a | invalid message → `ack("invalid-message")` | n/a | job 500 → `retry("job-failed")` | duplicate idempotencyKey → `ack("duplicate")` | max 3 retries → DLQ | summary + receipt | unit |
| Retention pass (REL-02) | rules run, events inserted | no rows → 0 affected | n/a | bad SQL → `retention_pass_failed` | n/a | D1 timeout → caught, logged | single-flight via cron | re-runnable (DELETE idempotent) | summary logged | unit (budget_reached) |
| Direct upload (background budget) | reserve→PUT→finalize | missing admission → rejected | 0-byte body → rejected | oversize → 413 | non-owner → 403 | R2 PUT fail → 502 | per-actor cap (3) | finalize idempotent | error envelope | unit |
| DO broadcast (REL-03) | all sockets receive | 0 sockets → no-op | n/a | oversized msg → 1011 | bad token → `auth_failed` | send fail → close 1011 | single-threaded DO | n/a | typed error JSON | unit (cap) |

(Per-flow shadow-path matrices for individual API routes live in `07_…` where
their behavior diverges; this is the consolidated cross-cutting view.)
