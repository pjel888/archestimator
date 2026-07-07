# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the in-scope stack
layers. This plan is backend/observability-only; frontend layers are "no change"
(see `05_…`).

## 18.1 Next.js 16 / App Router

- **Rendering:** no Server/Client boundary changes. The request id propagates via
  `AsyncLocalStorage` (same Worker isolate) + a request header (belt-and-suspenders).
- **Route handlers:** inherit request id; error path uses existing
  `errorResponse`/`problemDetailsResponse` (shape unchanged, id strengthened).
- **Server Actions:** inherit id via context; `with-action-errors` now logs it.
- **`onRequestError` instrumentation:** edge branch gains `request_id` from
  context (guarded); nodejs branch already uses `logAppError`.
- **Cache/Cache Components:** **no change**. `Server-Timing` is **suppressed** on
  `Cache-Control: public`/`no-store` responses to avoid cache-key pollution and
  leak (DEC-08). No `use cache`/`cacheLife`/`cacheTag` change.
- **No new `"use client"`** boundary.
- **Local docs rule (AGENTS.md):** implementation must consult
  `node_modules/next/dist/docs/` if it touches route/rendering/cache behavior.
  This plan does not change that behavior, but the impl should re-confirm the
  ALS-across-OpenNext assumption.

## 18.2 React 19

- No component/hook/effect/memoization changes (`05_…`).
- The error envelope contract (client reads `trace_id`) is unchanged.

## 18.3 TypeScript / validation

- New modules (`request-id.ts`, `server-timing-header.ts`, `metrics.ts`) are
  fully typed; no `any`; runtime validation at trust boundaries (inbound id
  regex, AE dimension allowlist, Server-Timing label allowlist).
- `cloudflare-env.d.ts` regenerated via `bun run cf:typegen` after the AE binding
  is added (T-7.2).
- Discriminated unions: `outcome` enum, `AppErrorCode` set reused as metric
  dimension allowlist.

## 18.4 Tailwind v4 / design system

- **No change.** No UI work (`05_…`).

## 18.5 Cloudflare Workers / OpenNext

- `compatibility_date: 2026-06-29`, `nodejs_compat` — ALS + `crypto.randomUUID()`
  supported (already in use).
- Worker `fetch`/`scheduled`/`queue` wrapped in try/catch (FR-03).
- **Workers Observability** already enabled; sampling tuned (OBS-02): logs ~1.0
  pre-launch, traces disabled (shared quota since 2026-03-01).
- **Workers Logs (GA)** is the persisted-log store; 200k/day free, 3-day retention.
- **Workers Tracing (Open Beta)** deferred; `traceparent` re-enable path documented.
- **No paid add-on** (DEC-09): no Logpush, no Workers Paid, no Smart Placement
  paid, no dedicated egress. Upgrade triggers in `13_…`.
- Provider boundary: only `wrangler.jsonc`-bound resources (Worker
  `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`,
  Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`, new AE
  `ARCH_METRICS`). Legacy Supabase out of scope.

## 18.6 Cloudflare D1

- **No schema change** (`07_…` proves). No migration.
- Observability adds **zero D1 queries** in the request hot path (metrics go to AE).
- Retention budget (`retention-core.ts`) only **reduces** worst-case D1 writes.
- Free-tier ceilings watched: 5M rows-read/day, **100k rows-written/day** (the
  tightest), 500MB storage/DB.
- `EXPLAIN` on retention `SELECT` to be verified at implementation (ASSUMP-08).

## 18.7 Cloudflare R2

- **No change** to object-key policy or namespaces.
- Proof receipts gain `batchId` field (non-breaking).
- Direct-upload path unchanged; admission control unchanged.

## 18.8 Durable Objects (`CollaborationRoom`)

- Hibernation WebSockets (`ctx.acceptWebSocket`) — unchanged, keeps memory bounded.
- **New:** fan-out cap (`MAX_BROADCAST_TARGETS=256`), single byteLength (no
  double-encode), logging on errors/auth-fail, metric stub.
- Limits watched: 30s CPU/invocation, 128MB memory, "thousands" of WebSockets
  (no hard cap; Hibernation).

## 18.9 Queues / Cron

- **3 crons** (`0 3`, `15 3`, `30 3`); retention on the third.
- Queue consumer: batch 5, retries 3, DLQ; idempotencyKey + new `batchId`.
- 15-min cron wall-clock watched; retention budget guard prevents blowout.

## 18.10 Cloudflare Email

- **No change.** (Mentioned for completeness; not in scope.)

## 18.11 Better Auth

- **No change** to auth path. `recordAccountSecurityEvent` already writes
  `request_id`; once FR-01 lands, that id will be the real edge id (stronger).

## 18.12 Security / privacy

- `redact.ts` covers all structured app logs; **extended** to cover AE dimensions
  (allowlist) and Server-Timing labels (allowlist). `console.*` audit (T-9.1).
- `requestId` is a public marker (non-secret), per `08_…` credential taxonomy.
- No new authz, mutation, upload, or integration surface.

## 18.13 Performance / reliability

- Budgets table (`09_…`) is the canonical contract; evaluators declared.
- Free-tier ceilings respected; sampling walk-down schedule documented.
- `exceededCpu`/`exceededMemory` outcomes watched.

## 18.14 Observability production standards (cross-cutting)

- **One canonical NDJSON log schema** (`LogRecord` in `logger.ts`) — extended, not replaced.
- **Every emit path redacted** (SEC-01).
- **Every request has a correlation id** (FR-01/02).
- **Every unhandled error is caught and logged with id** (FR-03/05).
- **Metrics are PII-free and quota-aware** (OBS-01).
- **Dashboards/alerts documented; hosted proof honestly deferred** (OBS-03).
