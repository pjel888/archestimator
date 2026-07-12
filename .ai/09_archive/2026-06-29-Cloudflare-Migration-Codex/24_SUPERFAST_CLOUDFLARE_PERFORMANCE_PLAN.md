---
title: Superfast Cloudflare Performance Plan
plan_id: 2026-06-29-cloudflare-migration-codex
document: 24
---

# Superfast Cloudflare Performance Plan

## Goal

Make the Cloudflare redesign very fast without weakening privacy, authorization, or correctness. Edge placement helps only if the app avoids protected-route caching mistakes, oversized Worker bundles, chatty D1 queries, and unnecessary client JavaScript.

## Proposed Budgets

These budgets are proposed targets for proof. Capture current baseline before treating them as release gates.

| Surface | Target |
| --- | --- |
| Public/static route p95 TTFB | under 200 ms |
| Share/public dynamic route p95 TTFB | under 400 ms |
| Protected workshop route p95 TTFB | under 600 ms |
| Common estimating read/action p95 duration | under 500 ms |
| LCP | under 2.5 s |
| INP | under 200 ms |
| CLS | under 0.1 |
| Critical Worker error rate | below current baseline |
| D1 hot-path query count | capped per route/action before proof |
| Queue latency | budgeted per job type |

## Speed Strategy

Runtime:

- Keep Worker bundles small.
- Avoid unnecessary Node compatibility usage.
- Use bindings, not runtime REST calls to Cloudflare services.
- Track startup, CPU, duration, memory, and subrequest pressure.

Caching:

- Cache public/static assets aggressively.
- Keep protected workshop, auth, upload, share-sensitive, webhook, and mutation routes no-store unless proven safe.
- Use KV only where stale reads are acceptable.
- Use Cloudflare cache rules deliberately; do not let edge cache become an authorization layer.

Database:

- Design D1 access paths around route/action needs.
- Budget query count per route.
- Prefer intentional denormalization or precomputed views where it avoids repeated joins/lookups.
- Measure rows read/written, latency, and failure rate.

Assets:

- Put private objects and generated exports in R2 with signed/app-authorized access.
- Use stable cache keys for public/generated assets.
- Verify image delivery and CSP behavior under the Cloudflare route.

Realtime:

- Keep presence/cursor payloads small.
- Use Durable Object rooms scoped to workspace/project/estimate/publication.
- Measure reconnect behavior and room latency.

Client:

- Preserve server-actions-first writes where it remains faster and simpler.
- Keep client JS and hydration cost low on workshop pages.
- Avoid adding large client libraries only to support migration.

## Evidence Matrix

| Claim | Evidence |
| --- | --- |
| Public pages are faster | Baseline vs Cloudflare route timing and Web Vitals |
| Workshop remains fast | Authenticated fixture p50/p95 TTFB and action duration |
| D1 is not chatty | Query count and rows read/written per hot path |
| Workers runtime is healthy | Startup, CPU, duration, memory, subrequest metrics |
| R2 does not slow uploads/assets | Upload/download latency and error rate |
| Queues improve reliability | Retry/dead-letter/backlog and latency metrics |
| Realtime is acceptable | Durable Object room latency, reconnect, drop rate |
| Security rules do not hurt users | WAF/Turnstile challenge/block/false-positive review |

## Anti-Goals

- Do not cache private data to make numbers look better.
- Do not remove authorization checks for speed.
- Do not use KV for sessions, locks, permission state, or precise counters.
- Do not claim speed from local-only tests.
- Do not optimize for one region if first users are elsewhere.

## Stop Condition

The Cloudflare redesign is performance-ready only when measured critical flows meet or beat the accepted baseline and the cost workbook uses observed operation counts from the same proof.
