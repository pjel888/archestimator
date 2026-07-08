# 09 — Performance, Reliability, and Observability

## Performance profile

This is a **background-jobs** subsystem, not a user-facing hot path. Performance
matters for: (a) staying within free-tier Worker CPU/D1 quotas, (b) not
degrading the 03:00–03:30 UTC maintenance window into a slow crawl at scale.

### Budgets (justified or marked N/A)

| Metric | Budget | Rationale | Source |
|---|---|---|---|
| Cron maintenance window | 03:00–03:30 UTC, < 5 min wall each job | off-peak; `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000` per route | `wrangler.jsonc:101` |
| Retention pass wall time | < 60s at current volume | 7 rules × (SELECT LIMIT 500 + DELETE + INSERT) | inference |
| Queue batch processing | `max_batch_size=5`, `max_batch_timeout=30s` | Cloudflare consumer config | `wrangler.jsonc:76-77` |
| D1 rows-read per retention rule | range scan, not full scan (post DB-INDEX) | avoid free-tier row-read spike | DATA-001 |
| Worker CPU per cron invocation | < freetier limit | once-daily | n/a |
| User-perceived latency | **N/A** | not user-facing | — |
| LCP/INP/CLS | **N/A** | no UI change | — |
| Bundle / RSC payload | **N/A** | no frontend change | — |

### Performance evaluator contract (PERF)

| Field | Value |
|---|---|
| Baseline | retention SELECT wall + rows-read at current volume (preview D1) |
| Target | post DB-INDEX: `EXPLAIN` shows range scan, not full scan; wall < baseline at 10x rows |
| Measurement | `EXPLAIN QUERY PLAN` on preview D1 + `wrangler d1 execute --command` timing; optionally instrument `runRetentionPassInD1` result timestamps |
| Fixture | seed N rows per table on preview DB (N = 100, 1000) |
| Runs | 3 per rule; report median |
| Regression threshold | rows-read doubles vs baseline without a corresponding row-count doubling → flag |
| Related tests | `compliance-retention-repository.test.ts` |
| Evidence artifact | append to `evidence/` as `retention-index-explain.json` |
| Rollback trigger | index causes write regression on `upload_events` inserts → `DROP INDEX` (DB-INDEX rollback) |

**Browser proof:** intentionally skipped — no browser-only claim. Static/DB
proof suffices (per repo verification policy).

## Reliability

### Failure modes & recovery (summary; full matrix in `13`)

- Cron silent skip → detect via missing `data_retention_events`/`upload_events`
  for the day; recovery = manual dry-run then live.
- Route 503/401 → cron logs failed status; queue retries to DLQ.
- Scanner down → rows stay `failed_transient`, retried next day.
- R2 partial → cleanup idempotent, re-runs.
- Retention per-rule error → caught, rule skipped, others proceed.
- DLQ saturation → operator drains (FR-005).

### Retry/circuit-breaking

- Queue: `max_retries=3`, `delaySeconds=60`, then DLQ. No app-level circuit
  breaker (Cloudflare Queues handles backoff).
- Retention: no retry (once-daily; next day's run is the natural retry).
- Routes: no self-retry (cron/queue drive retries).

### Availability expectations

- Cron: best-effort on Cloudflare Cron Triggers (no strict SLA on free tier;
  occasional missed/skewed firing is possible). Detection is via audit-row
  absence, not a guarantee.
- Queue: at-least-once delivery (hence the idempotency contract).

## Observability

### Signals (deterministic, not sampling-dependent)

| Signal | Source | Detection use |
|---|---|---|
| `data_retention_events` rows per day | D1 query | retention ran + row counts |
| `upload_events` cleanup/scan rows per day | D1 query | jobs ran + outcomes |
| DLQ message count | `wrangler queues` / dashboard | sustained > 0 = problem |
| Queue message age | Cloudflare Analytics | p95 growth = backlog |
| Proof receipts in R2 `provider-proof/jobs/` | R2 list | consumer executed |
| `cf:jobs-proof` hosted probe | script | `productionJobsMessagingReady` |
| Worker `console.log` summaries | Workers Observability (sampled 0.1) | supportive only — NOT a reliable signal due to sampling |

**Important:** Workers Observability logs are head-sampled at 0.1 and traces at
0.05 (`wrangler.jsonc:84-96`). Do NOT treat log-line presence as proof a cron
fired. Use the D1 audit rows (deterministic) as the primary signal. See RISK-007.

### Metrics / dashboards

- Platform-admin upload-operations dashboard (`/workshop/settings/upload-operations`)
  already aggregates upload outcomes, scan backlog, cleanup backlog/retention
  cutoffs, event counts (path-safe). Reuse it as the operator dashboard.
- `cf:verify-hosted-upload-operations` script reads the hosted snapshot.

### Alert thresholds (REL-001) — proposed (owner to confirm)

| Metric | Source | Threshold | Action |
|---|---|---|---|
| DLQ message count | queue dashboard / `wrangler queues` | > 0 sustained > 1 batch cycle | inspect DLQ, find root cause (FR-005) |
| Scan backlog (`scan_status=pending` rows) | D1 / upload-ops dashboard | > 500 rows OR age > 3 days | check scanner provider health |
| Scan backlog (`failed_transient`) | D1 | > 50 rows | investigate persistent scan failures |
| Cleanup backlog (`status=deleted` rows with R2 object still present) | D1+R2 | > 200 rows | check R2 delete errors |
| Retention run with any `skipped:true, notes:"error:*"` | `data_retention_events` | any in last run | inspect rule SQL / table |
| Cron did not fire today | `data_retention_events` + `upload_events` | no rows for today's UTC date by 04:00 UTC | manual dry-run + investigate Cron Trigger |
| Queue message age p95 | Cloudflare Analytics | > 5 min | check consumer health / Worker errors |
| `productionJobsMessagingReady` | `cf:jobs-proof` | false after a deploy | re-run hosted proof |

Thresholds are `assumption`/`derived` — pre-launch, no production traffic
history to calibrate. Owner to adjust after the 30-day observation window
(REL-003).

## Rollback triggers (perf-related)

- DB-INDEX causes insert/write regression on audit tables → `DROP INDEX`
  (reversible).
- Retention running too long / too hot → set `RETENTION_DRY_RUN=1` (if D-RETDRY
  implemented) or temporarily comment the retention `waitUntil` in `worker.ts`
  (fix-forward, redeploy).
