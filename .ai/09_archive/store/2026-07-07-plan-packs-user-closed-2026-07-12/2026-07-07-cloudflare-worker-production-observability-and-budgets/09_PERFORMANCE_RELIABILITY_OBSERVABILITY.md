# 09 — Performance, Reliability, and Observability

## 9.1 Runtime budget table (free-tier ceilings)

Each row is the canonical budget contract. **Evaluator** = how to measure;
**Ceiling** = the free-tier hard/soft limit; **Threshold** = regression gate;
**Rollback** = when to revert; **Enforcement** = code guard if any.

| Budget | Evaluator | Free-tier ceiling | Threshold (regression) | Rollback trigger | Enforcement (this plan) |
|---|---|---|---|---|---|
| **CPU / HTTP request** | Workers Logs `outcome=exceededCpu`; GraphQL `workersInvocationsAdaptive` | **10 ms** (free) | any `exceededCpu` > 0 on a non-cron route in 24h | disable suspected heavy route / ship fix-forward | n/a (Cloudflare enforces); log heavy-route durations; watch export/ai |
| **CPU / cron or queue handler** | Workers Logs + cron `durationMs` log | **15 min wall** (CPU-bounded by plan) | `cron.complete` `durationMs` > 600s | reduce batch sizes / disable cron | `retention-core.ts` `maxDurationMs` guard |
| **Wall-clock / HTTP request** | `Server-Timing total` (dev) + Workers Logs | **15 s** | p95 > 10s on any route | revert offending change | n/a (Cloudflare) |
| **Subrequests / request** | count `fetch()`/D1/R2 calls per route (instrumented) | **50** (free) | a route approaching 40 | refactor to batch / cache | (advisory; document hot routes) |
| **Memory** | `process.memoryUsage()` (already in `upload-runtime` proof); Workers Logs `outcome=exceededMemory` | **128 MB** | any `exceededMemory` > 0 | reduce in-memory buffering (upload `arrayBuffer`) | `admission-control.ts` already caps; keep |
| **D1 rows read / day** | GraphQL D1 analytics | **5,000,000** | > 70% of ceiling | add indexes / cache | (D1 hot-path plan owns indexes) |
| **D1 rows written / day** | GraphQL D1 analytics | **100,000** | > 70% of ceiling | reduce writes / move metrics to AE | retention `maxRowsDeletedPerTick`; metrics → AE (not D1) |
| **Workers Logs events / day** | Workers Observability dashboard | **200,000** (logs+traces shared since 2026-03) | > 70% | lower sampling | `wrangler.jsonc` sampling; traces disabled pre-launch |
| **AE data points / day** | AE GraphQL | **100,000** | > 70% | sample KPIs | `metrics.ts` ≤1 point/req; 250/invocation cap |
| **AE queries / day** | AE GraphQL | **10,000** | > 70% | cache query results | (operational) |
| **Log retention** | dashboard | **3 days** (free) | n/a | upgrade to paid for 7-day | (defer; documented) |
| **DO WebSocket connections / instance** | DO `getWebSockets().length` (Hibernation) | "thousands" (no hard cap) | > 1000 live in one room | shard room | fan-out cap (REL-03); Hibernation already used |
| **DO CPU / invocation** | Workers Logs | **30 s** | broadcast loop > 5s | cap fan-out | `MAX_BROADCAST_TARGETS` |
| **Queue batch size / retries** | wrangler config + consumer log | batch 5 (max 100); retries 3 (max 10) | retries→DLQ spike | inspect DLQ | unchanged config; DLQ depth alert (OBS-03) |
| **Workers requests / day** | GraphQL | **100,000** | > 70% | cache more / upgrade | marketing cache already; (operational) |

**Source for ceilings:** official Cloudflare docs (see `19_…` §2). The single
most action-relevant fact: **traces share the logs quota since 2026-03-01**, so
the pre-launch config disables traces and keeps logs near 100%.

## 9.2 Performance evaluator contract (suite-required)

For each performance-sensitive slice:

| Slice | Baseline | Target | Measurement | Fixture | Runs | Threshold | Tests | Evidence |
|---|---|---|---|---|---|---|---|---|
| Request-id resolution | n/a (new) | < 0.1 ms | `performance.now()` around `resolveRequestId` | 1000 ids | 5 runs | p99 < 0.5 ms | unit | `tests/vitest/request-id.test.ts` |
| Worker dispatch overhead | current `worker.ts` | < 1 ms added | before/after `performance.now()` in dev | synthetic request | 10 runs | < 1 ms added | integration | `tests/vitest/worker-dispatch.test.ts` |
| Retention pass (budget) | unbounded | stops at 120s / 5000 rows | fixture with 50k rows | seed script | 1 run | stops, `budget_reached` | unit | `tests/vitest/retention-budget.test.ts` |
| DO broadcast (cap) | O(N) re-encode | ≤ cap, single byteLength | 300 sockets | mock sockets | 5 runs | < 10 ms broadcast | unit | `tests/vitest/collaboration-room-broadcast.test.ts` |
| Metrics emit | n/a (new) | < 0.2 ms | `performance.now()` around `writeDataPoint` | 100 points | 5 runs | p99 < 0.5 ms | unit | `tests/vitest/metrics.test.ts` |
| Proposal export (CPU watch) | current | no `exceededCpu` | Workers Logs outcome query (manual) | real export | 1 prod run | 0 exceededCpu | (operational) | runbook |

**Passing ordinary tests is not enough to claim performance readiness** unless
the test *is* the declared evaluator (as above).

## 9.3 Hot paths and bottlenecks

1. **Proposal xlsx export** — CPU-bound on the 10 ms free CPU ceiling. **Watch.**
   Mitigation if it trips: paginate/stream the workbook, or move to a Queue +
   email-deliver pattern (defer; not in scope).
2. **Direct upload PUT** — `request.arrayBuffer()` buffers whole body in memory
   (capped by `MAX_BODY_PROBE_BYTES=4MB` + multipart threshold). Memory budget.
   Mitigation: keep the existing body limits; AE metric on upload count + size
   bucket.
3. **DO presence fan-out** — O(N) per presence event. Mitigation: REL-03 cap +
   single byteLength.
4. **Retention DELETE** — can saturate D1 rows-written/day. Mitigation:
   REL-02 budget.
5. **Auth catch-all (Better-Auth RPC)** — subrequest-heavy. Mitigation:
   document subrequest count; no code change unless >40.

## 9.4 Reliability / failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Worker fetch throws | try/catch (FR-03) → 500 + logged | fix-forward |
| OpenNext route throws | `onRequestError` + `errorResponse` → 500 + logged | fix-forward |
| Server Action throws | `with-action-errors` → logged w/ id (FR-05) | client error envelope |
| Cron throws | try/catch → `cron.complete ok:false` | next cron tick; manual rerun |
| Queue consumer throws | try/catch → `retry("exception")` | retry × 3 → DLQ |
| DO message throws | per-message catch → close 1011 + logged | client reconnect |
| Retention budget hit | `budget_reached` result logged | resumes next tick |
| AE write fails | swallowed | none (best-effort) |
| Redaction fails | fail-safe redact-all | none (log still safe) |
| Cloudflare logs sampling drops a request | n/a | grep by `x-request-id` may miss; raise sampling |

## 9.5 Observability sources (consolidated)

| Source | Where | Retention | Cost |
|---|---|---|---|
| Workers Logs (console.*) | Cloudflare | 3 days (free) | 200k/day shared w/ traces |
| Workers invocation metrics | Cloudflare dashboard + GraphQL | per Cloudflare | free (account-level) |
| Analytics Engine KPIs | `ARCH_METRICS` binding | per AE policy | 100k/day free |
| `x-request-id` header | every response | ephemeral | free |
| `Server-Timing` header | gated responses | ephemeral | free |
| R2 proof receipts | `provider-proof/jobs/*.json` | indefinite (R2) | free-tier R2 |
| D1 `data_retention_events` | ARCH_DB | per retention rules | counts toward rows-written |
| dev `logs/dev.ndjson` | local only | rotated 50MB | free (dev) |

**Free-tier-safe monitoring options** (per brief): Workers Observability (already
on) + Analytics Engine + GraphQL self-poll. No Sentry/Logpush required. The plan
documents the realistic free-tier alert path (self-poll GraphQL from a free
external cron) and is explicit that native Worker alerting is limited on Free.

## 9.6 Dashboards / alerts (queries in `13_…`)

- Error rate by route (Query Builder: `outcome IN ('exception','exceededCpu')`).
- p95 duration by route (GraphQL `workersInvocationsAdaptive`).
- D1 rows-written/day headroom (D1 analytics GraphQL).
- Queue DLQ depth (Queue dashboard / consumer `dlq` count in log).
- Cron duration (filter `event:"cron.complete"` in Workers Logs).
- AE KPI trends (AE GraphQL).

**Honest alerting gap:** Cloudflare native Worker error-rate alerting is weak on
Free; the realistic path is self-polling GraphQL from a free external cron (e.g.
GitHub Actions, UptimeRobot) and alerting on `exceededCpu`/`exception` counts.
This is documented as a known gap, not claimed as solved.

## 9.7 Rollout performance gates

| Gate | Metric | Source | Pass/fail | Action on fail |
|---|---|---|---|---|
| Merge | type-check + lint + focused tests green | local | green | fix |
| Closed-beta rollout | error rate < 0.5% by route | Workers Logs | below | hold |
| Production | no `exceededCpu` in 24h on non-cron | Workers Logs | 0 | reduce load / fix-forward |
| Production | D1 rows-written/day < 70% ceiling | D1 analytics | below | reduce writes |
| Production | AE points/day < 70% ceiling | AE analytics | below | sample KPIs |
| Rollback | any gate fails after rollout | above | n/a | `git revert` + lower sampling |

Baseline and target metrics for affected routes (TTFB, p95 duration, error rate)
are captured per the table in 9.2; the observability *source* for each is
Workers Observability/Analytics (hosted proof, not local).
