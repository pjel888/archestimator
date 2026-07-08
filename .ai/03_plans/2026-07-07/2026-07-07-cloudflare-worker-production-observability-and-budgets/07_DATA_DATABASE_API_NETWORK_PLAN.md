# 07 — Data, Database, API, and Network Plan

## 7.1 Data-plane impact summary

This plan does **not** change the D1 schema, the R2 object-key policy, the DO
class migration, the queue contract, or app-authorization paths. The data-plane
impact is limited to:

1. **D1 write volume** — the retention budget (REL-02) *reduces* worst-case D1
   writes per tick; no new writes are added by observability itself (metrics go
   to Analytics Engine, not D1). One small caveat: `data_retention_events` rows
   already inserted by `recordRetentionEventInD1` continue unchanged.
2. **D1 read volume** — unchanged (no new observability queries against D1 in the
   hot path). Optional `traced(...)` wrapping of repos does not add queries.
3. **R2** — unchanged. Proof receipts (`provider-proof/jobs/*.json`) continue as
   today; the plan adds a `batchId` to the receipt JSON (non-breaking).
4. **DO** — `collaboration-room.ts` gains fan-out cap + metrics + logging; no
   storage/migration change.
5. **Queue** — consumer gains `batchId` logging; idempotencyKey contract
   unchanged; DLQ behavior unchanged.

**No migration is required.** The Database Change Blueprint section below is
therefore scoped to "no schema change, document the read-path/query-count impact
of observability code" — not a new migration. This is documented explicitly
because the suite rule requires a blueprint *for database work*; here the
database work is "none, and here is the proof."

## 7.2 D1 query-count / index expectations (observability code)

| Observability surface | D1 reads/writes added | Reason |
|---|---|---|
| `request-id.ts` | 0 | pure compute |
| `logger.ts` / `route-error.ts` | 0 | console + ndjson only |
| `metrics.ts` (AE) | 0 | writes to Analytics Engine, not D1 |
| `server-timing-header.ts` | 0 | response header only |
| `retention-core.ts` budget | 0 net new (early-stop *reduces* writes when budget hit) | guard |
| `collaboration-room.ts` metrics | 0 | DO does not use D1 today |
| per-request KPI | 0 | AE only |

**Conclusion:** the observability layer adds zero D1 queries in the request hot
path. The 5M rows-read/day and 100k rows-written/day free-tier ceilings are
unaffected by this plan. The only D1-touching change is the retention budget,
which can only *lower* writes.

## 7.3 Database Change Blueprint (no-op, with proof)

- **Migration filename:** none. No `0039_*.sql` is created by this plan.
- **Tables/columns/indexes/constraints affected:** none.
- **Repository/query helpers affected:** none (no new repo; optional `traced()`
  wraps existing calls without changing SQL).
- **App-authz checks affected:** none.
- **Backfill:** n/a.
- **Data-volume assumptions:** retention rules unchanged; budget guards protect
  against backlog.
- **Concurrency/lock strategy:** unchanged (retention uses batched DELETE by id).
- **Expected query count per route/action:** unchanged by observability.
- **Cardinality at 1x/10x/100x/1000x:** the retention budget becomes load-bearing
  at 100x+ on `estimate_sheet_events` / `account_security_events` — the
  `maxRowsDeletedPerTick` guard prevents a single cron from consuming the daily
  rows-written quota. Suggested default 5000/tick leaves headroom under 100k/day.
- **Index selectivity:** unchanged. Retention `SELECT id ... WHERE created_at < ?
  LIMIT N` already relies on the `created_at` index coverage from the existing
  schema (verify in implementation via `EXPLAIN`).
- **D1 cost/authz:** n/a (no new queries).
- **Generated type impact:** none (no binding type change except the new AE
  binding — see 7.5; `bun run cf:typegen` will be needed once when AE binding is
  added, not for D1).
- **Rollback/fix-forward:** n/a (no schema change). The retention budget guard is
  config-driven (`maxDurationMs`, `maxRowsDeletedPerTick`) and can be relaxed
  without a migration.
- **Local proof command:** `wrangler d1 execute ARCH_DB --local --command="..."` (P2-4: no `cf:d1-local` script exists in `package.json` — use the wrangler CLI directly; the retention unit test uses a mock D1 so no real local DB is required).
- **Linked-provider proof boundary:** retention progress visible in Workers Logs
  (`retention.rule` events) + existing `data_retention_events` D1 rows.

## 7.4 API contracts (no breaking changes)

### `x-request-id` response header (new, additive)
- **On every HTTP response** from `worker.ts` (including fast-path
  short-circuits, proof routes, DO routes).
- Format: UUIDv4 or validated inbound value.
- Clients MAY send `x-request-id` inbound; the Worker reuses it if valid.
- No auth required to send/receive; not a security primitive.

### Error envelope (unchanged shape, stronger id)
- `errorResponse()` → `{ ok:false, trace_id, error:{kind,code,message} }`.
- `problemDetailsResponse()` → RFC 9457 `application/problem+json` with `requestId`.
- `trace_id`/`requestId` is now the real edge id (was on-error `err_*`).

### `Server-Timing` (new, gated)
- Present only when `ARCH_OBSERVABILITY_SERVER_TIMING=1`.
- Whitelisted labels (`total`, `db`, `r2`, `upstream`); integer ms durations.
- Suppressed on `Cache-Control: public`/`no-store` auth/share responses.

### Internal cron/queue log contract (new schema, internal-only)
- `{"event":"cron.start","cron":...,"cronRunId":...,"ts":...}`
- `{"event":"cron.complete","cron":...,"cronRunId":...,"summary":...,"durationMs":...,"ts":...}`
- `{"event":"queue.batch.start","batchSize":...,"batchId":...,"messageIds":[≤10],...}`
- `{"event":"queue.batch.complete","batchId":...,"ack":N,"retry":N,"dlq":N,"durationMs":...}`

### Proof routes (additive fields only)
- `upload-job-queue.ts` proof receipt JSON gains `batchId` (non-breaking for
  readers that parse defensively; old readers ignore the field).

## 7.5 Cloudflare binding additions

| Binding | Type | Purpose | Free-tier impact |
|---|---|---|---|
| `ARCH_METRICS` (name pending DEC-07) | `analytics_engine` | KPI data points | 100k writes/day, 10k reads/day, 250/invocation — all free |

**No new D1, R2, DO, Queue, KV, Email, or Images binding.** The AE binding is the
only infrastructure addition. Adding it requires:
- `wrangler.jsonc` `analytics_engine_bindings: [{ binding: "ARCH_METRICS", dataset: "archestimator-metrics" }]`.
- `bun run cf:typegen` to refresh `cloudflare-env.d.ts` Worker Env type.
- No migration, no provider mutation beyond the bound resource.

## 7.6 Access-path matrix (observability sources)

| Source | Chosen path | Runtime role | Authorization | Posture | Proof | Fallback |
|---|---|---|---|---|---|---|
| Request id | `request-id.ts` ALS | same isolate | none (per-request) | new | header echo + unit test | generate fresh |
| Cron correlation | local var + console log | scheduled() | cron trigger (Cloudflare) | new | Workers Logs query | summary line |
| Queue correlation | message payload + console log | queue() | queue consumer | new (idempotencyKey existing) | R2 proof receipt | ack/retry |
| Retention progress | console log + D1 `data_retention_events` | cron → waitUntil | cron trigger | extended | Workers Logs + D1 readback | early-stop |
| Custom KPI | Analytics Engine writeDataPoint | request/cron/queue | AE binding | new | AE GraphQL read | swallow on fail |
| Error context | `logAppError` console + dev ndjson | any | none | extended | Workers Logs query | redact-all on fail |

No source path requires a new D1/R2/DO authorization rule, so there is no P0
access-path defect.

## 7.7 Shadow-path matrices (per critical API flow)

### Direct upload reserve/PUT/finalize
| Flow | Happy | Nil/empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|
| POST reserve | 200 + session id | missing fields → 400 | oversize → 413 | non-owner → 403 | D1 fail → 500 logged w/ id | per-actor cap (3) → 429 | session id unique | error envelope w/ trace | unit |
| PUT bytes | 200 + R2 key | 0-byte → 400 | oversize → 413 | signed-url invalid → 403 | R2 PUT fail → 502 logged w/ id | n/a | re-upload ok | error envelope | unit |
| POST finalize | 200 + asset row | missing object → 400 | head mismatch → 409 | non-owner → 403 | D1 fail → 500 | n/a | finalize idempotent | error envelope | unit |

### Share token resolve/session/comment/decision
| Flow | Happy | Nil/empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|
| GET resolve | 200 + sanitized snapshot | not found → 404 | malformed → 404 (worker fast-path) | password required → 401/403 | D1 fail → 500 | n/a | n/a | sanitized JSON | unit + redaction test |
| POST comment | 200 + comment id | missing → 400 | invalid → 400 | no session cookie → 403 | D1 fail → 500 | optimistic insert guarded by unique | dup-submit idempotencyKey | error envelope | unit |
| POST decision | 200 + decision | missing → 400 | invalid → 400 | no session → 403 | D1 fail → 500 | last-write-wins | re-submit ok | error envelope | unit |

### AI ask / package-builder
| Flow | Happy | Nil/empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|
| POST ask | 200 stream | empty prompt → 400 | invalid → 400 | non-member → 403 | LLM timeout → 504 logged w/ id | per-user rate limit | n/a | error envelope | unit |
| POST package-builder | 200 + correlationId | empty → 400 | invalid → 400 | non-member → 403 | LLM fail → 502 logged w/ id | deterministic correlationId | apply idempotent | error envelope | unit |

### Proposal xlsx export
| Flow | Happy | Nil/empty | Invalid | Auth denied | Upstream err | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|
| GET export | 200 + xlsx | not found → 404 | bad id → 404 | non-member → 403 | CPU overrun → 500 (logged, `exceededCpu` in Workers Logs) | one per user | n/a | error envelope | unit + budget watch |

## 7.8 Network behavior

- **No new outbound calls.** Metrics go to the in-platform AE binding (not a
  network fetch).
- **No new timeouts/retries** introduced by observability. Existing upstream
  timeouts (AI LLM, R2) unchanged; they just get logged with the request id now.
- **`ctx.waitUntil`** continues to attribute CPU/logs to the originating
  invocation — the new logging inside `scheduled`/`queue` honors this.
