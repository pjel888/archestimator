# 09 — Performance, Reliability, and Observability

## 9.1 Performance budgets

| Metric | Target | Scope | Rationale |
|---|---|---|---|
| Overview route TTFB (p95) | ≤ 600 ms | `/admin` | Server-fetch + cache; ≤ 1000 users |
| Overview LCP | ≤ 2.0 s | `/admin` | Streamed RSC + skeletons |
| Client navigation | ≤ 300 ms | between admin sections | RSC prefetch off (operator-only) |
| Presence freshness | ≤ 5 s | live count | WS push on change |
| Analytics tile load | ≤ 2 s or degrade | CF/GA/Clarity tiles | cache-first |
| Admin client JS (gzip) | ≤ 250 KB | admin chunk only | `next/dynamic` for recharts |
| API `/metrics/*` p95 | ≤ 400 ms (cached) / ≤ 1.5 s (refresh) | admin APIs | cache + provider timeout 8 s |
| D1 query count per route | ≤ 5 | admin list/detail routes | aggregated `COUNT(*)` |

## 9.2 Performance evaluator contract

- **Baseline:** before implementation, capture `/admin` (or proxy `/workshop/settings/users`)
  TTFB + LCP via a local Playwright/profiler run; record the admin chunk size
  from `bun run build`.
- **Target:** the budgets above.
- **Measurement:** Playwright `page.goto('/admin')` with `waitUntil:'networkidle'`
  × 10 runs, report p50/p95; `bun run build` + bundle analyzer for JS size.
- **Fixture:** seed 100, 1000 users via existing seed scripts (or synthetic).
- **Runs/flake:** 10 runs, discard top/bottom outlier, report median + p95.
- **Regression threshold:** TTFB p95 +20% or chunk +20 KB → fail.
- **Related functional tests:** metrics repository tests (cache hit/miss).
- **Evidence artifact:** `logs/admin-perf-baseline.md` + build-analyzer screenshot.

## 9.3 Scalability analysis (D1 cardinality)

| Table | Now | 10× | 100× | 1000× | Notes |
|---|---|---|---|---|---|
| `support_conversations` | ~10² | 10³ | 10⁴ | 10⁵ | indexed by (user, last_message_at), (status, last_message_at) |
| `support_messages` | ~10³ | 10⁴ | 10⁵ | 10⁶ | indexed by (conversation_id, created_at); consider archival > 10⁶ |
| `feature_flags` | ~10¹ | 10¹ | 10² | 10² | tiny; cached |
| `admin_audit_events` | ~10² | 10³ | 10⁴ | 10⁵ | prune > 90d via retention cron |
| `admin_metric_cache` | ~10¹ | 10¹ | 10² | 10² | tiny; TTL rows |

All within D1 free-tier comfort at solo-dev scale.

## 9.4 Reliability

- **Failure modes & handling:**
  - External provider down → tile degrades to link-out (REL-DEGRADE-01).
  - D1 read fail → section error state + retry; sibling sections unaffected.
  - DO unreachable → presence last-known; inbox poll fallback.
  - Email send fail → draft kept, `send_status='send_failed'`, retryable (REL-INBOX-02).
  - WS disconnect → auto-reconnect backoff; idempotent presence + message dedupe.
- **Retries:** provider pulls 1 retry; WS auto-reconnect; admin actions
  single-attempt (user retries) to avoid double-writes (idempotency key covers it).
- **Circuit breaking:** optional simple per-provider "skip for N min after K
  failures" in the cache helper to avoid hammering a down provider.
- **Availability:** operator-only surface; degraded tiles are acceptable. SLA =
  "best effort, link-out always available".

## 9.5 Observability

- **Structured logging:** reuse `emitLogRecord` / `logAppError` for all admin
  errors (`event: 'admin_*'`, `action`, `request_id`).
- **Metrics:** Analytics Engine data point per presence-alarm (optional);
  D1-cached provider metrics; `admin_audit_events` for admin activity.
- **Traces:** `wrangler.jsonc` currently `traces.enabled:false`; leave off
  (free-tier). Worker fetch errors already structured-logged (`worker.ts:74`).
- **Dashboards:** the admin dashboard IS the dashboard; plus links to Cloudflare
  Workers Observability for raw logs.
- **Alerts:** none required for MVP (operator watches the overview). P2: email
  alert on `operational_incidents` sev1 via existing `EMAIL` binding.
- **Runbooks:** `DOC-RUNBOOK-01`.

## 9.6 Rollout performance gates

| Metric | Observability source | Merge gate | Beta gate | Prod gate | Rollback trigger |
|---|---|---|---|---|---|
| `/admin` TTFB p95 | local Playwright | ≤ 600 ms | n/a | ≤ 600 ms | > 720 ms |
| Admin chunk gzip | build analyzer | ≤ 250 KB | n/a | ≤ 250 KB | > 300 KB |
| Denial tests pass | vitest | 100% | n/a | 100% | any red |
| Inbox idempotency | action test | pass | n/a | pass | any duplicate |
| Provider tile degrade | unit test | pass | n/a | pass | hard failure |

No hosted/perf regression comparison window needed (operator-only, low traffic);
the baseline + thresholds suffice.

## 9.7 Rollback

- `ADMIN_DASHBOARD_ENABLED` flag off → all `/admin` routes redirect to
  `/access-required` (or 404); DO bindings can be left in place (idle).
- Per-table rollback SQL in `07`. DO rollback = remove route + binding.
- Audit/support data retained across rollback (no destructive op).
