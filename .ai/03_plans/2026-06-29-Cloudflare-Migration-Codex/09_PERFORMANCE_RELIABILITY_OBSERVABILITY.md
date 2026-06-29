---
title: Performance Reliability Observability
plan_id: 2026-06-29-cloudflare-migration-codex
document: 09
---

# Performance Reliability Observability

## Performance Hypotheses

H-001 Cloudflare front-door CDN/WAF may reduce static and public-page latency without touching app logic.

H-002 R2 may reduce object egress cost and provide acceptable object latency for images/attachments.

H-003 Queues may improve background job reliability over cron-only scheduled routes.

H-004 Workers sidecars may lower latency for small edge tasks.

H-005 Hyperdrive may improve Worker-to-Postgres connection behavior when Workers call external Postgres.

H-006 D1 may improve latency for small local SQLite-shaped data but may not fit core relational/RLS workloads.

## Cloudflare Limits To Respect

Numbers in this section are categories to model. Refresh official Cloudflare docs, product changelogs, and Wrangler schema immediately before implementation or purchasing decisions; do not treat this package's date-stamped limits as durable constants.

Workers:

- Paid plan request and CPU billing must be modeled.
- Workers have memory limits and CPU limits per invocation.
- `waitUntil()` post-response work is bounded.
- Queue and Cron consumers have separate duration behavior.
- Subrequest limits differ by plan and changed in 2026.
- Startup time, Node compatibility flags, binding availability, and observability config must be proven from the current Wrangler config/schema and runtime preview.

D1:

- Per-DB size and per-invocation query limits matter.
- Pricing is rows read, rows written, and storage.
- Time Travel restore is in-place/destructive.

KV:

- Eventual consistency and same-key write limits.
- 25 MiB value limit.
- Not suitable for strongly consistent cache or auth state.

R2:

- Class A/B operations must be modeled.
- Object size limits and same-key write limits matter.
- Custom-domain caching changes effective consistency behavior.

Queues:

- Operation count is based on 64 KB units.
- Message size, retry count, retention, concurrency, and backlog limits matter.

Hyperdrive:

- Applies to external Postgres/MySQL from Workers, not D1.
- Origin DB limits still matter.
- Query duration and cached response size limits matter.

Email Service:

- Outbound volume, arbitrary recipient eligibility, and DNS/domain configuration matter.

WAF/rate limiting:

- Plan quotas and body-inspection sizes matter.
- Rate-limit enforcement is not exact and can fail open.

## Observability Requirements

OBS-001 Preserve existing server-timing or request-timing evidence around Supabase calls.

OBS-002 Add per-slice metrics before migration:

- Request count.
- CPU time.
- Database query count and latency.
- Rows read/written.
- Object Class A/B operations.
- Queue produce/read/delete operations.
- Queue retry/dead-letter counts.
- Email sends, bounces, failures, webhook latency.
- WAF/rate-limit allow/block/challenge counts.

OBS-003 Every Cloudflare Worker/Queue consumer needs structured logs with request/job IDs.

OBS-004 Every storage migration needs object count, byte count, access count, and error rate.

OBS-005 Every auth migration proof needs login success, refresh success, route gate success, and unauthorized access denial metrics.

OBS-006 Every database proof needs representative query latency and error rates at realistic volumes.

OBS-007 Every Worker slice needs Cloudflare-side evidence for startup/runtime health, binding availability, error rate, CPU/duration pressure, subrequest pressure, and tail/log sampling posture.

## Reliability Requirements

- Sidecars must degrade without breaking core estimating when possible.
- Queue consumers must be idempotent.
- Email failures must preserve current graceful degradation.
- R2 storage writes must reconcile with database state.
- WAF rules must have a fast rollback.
- DNS/front-door cutover must have low TTL and origin bypass fallback.
