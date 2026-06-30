---
title: Policy And Limit Matrix
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Policy And Limit Matrix

All numbers below are **starting hypotheses**, not final production constants. They must be validated in shadow mode, adjusted for beta traffic, reviewed for false positives, and approved before broad enforcement.

## Policy Dimensions

| Dimension | Standard |
| --- | --- |
| Actor key | Prefer authenticated user/workspace/project/recipient where available. |
| Client key | Use normalized trusted client IP hash, not raw IP. |
| Token key | Hash public tokens with HMAC/secret where possible. |
| Response | Use 429, JSON or surface-native result, `Retry-After`, `Cache-Control: no-store` for sensitive public APIs. |
| Failure mode | Fail closed for auth/security/cost surfaces when limiter storage is unavailable; fail soft only for telemetry. |
| Logging | Record near-limit, denied, limiter-store-failure, bypass, and operator override events. |
| Privacy | Store hashed identifiers and coarse metadata only. |

## Recommended Starting Matrix

| Surface | Proposed windows | Key | Store | Failure mode | Notes |
| --- | --- | --- | --- | --- | --- |
| Share snapshot/root GET | Keep 60/min; add WAF coarse path rule | token + client | Postgres now; DO later | Fail closed if token exists and store fails; fail soft for anonymous not-found only after review | Current value exists. |
| Share session start | Keep 10/min, 50/hour | token + client | Postgres | Fail closed | Public client entry point. |
| Share password | 5/15min plus progressive delay | token + client | Postgres exact; no local-only enforcement | Fail closed | Migrate local hard lockout into durable policy or make it supplemental only. |
| Share comment write | Keep 5/min, 20/hour; consider 50/day per recipient | publication + recipient + client | Postgres | Fail closed | Avoid blocking owner-invited reviewer. |
| Share decision write | Keep 5/min; add idempotency by recipient | publication + recipient | Postgres | Fail closed | Decisions are high-trust; retries should be recoverable. |
| Share reads/activity/comments | 60/min | publication + recipient/client | Postgres or soft edge | Fail soft only after testing | Reads can be noisy but false-positive cost is high. |
| Invite resolve | 30/min | token + client | Postgres | Fail closed | Avoid token enumeration. |
| Invite accept/continue | 5/min accept; 10/min continue | token + user/client | Postgres | Fail closed | Same-origin and auth stay mandatory. |
| Invite create/resend | 20/hour create; 5/hour resend | user + project/invite + client | Postgres | Fail closed | Protect email reputation. |
| Auth login/magic | 5/min per email hash + client; 20/hour per client | email hash + client | Provider/app durable | Fail closed but recovery-friendly | Coordinate with auth provider to prevent duplicate lockouts. |
| OAuth callback | 30/min per client/session | session/client | App durable or provider | Fail soft for callback idempotency, fail closed for invalid state floods | Must not break normal OAuth retries. |
| Contact/support server intake | 3/min, 10/hour plus Turnstile | email/client | Postgres + Turnstile | Fail soft to mailto fallback | Today mailto only. |
| Upload session/init | 12/min requests; 3 active actor; 6 active workspace | workspace + user + client | Durable capacity plus local fast path | Fail closed for storage provider cost | Replace process-local maps for distributed runtimes. |
| Image transform | 20/min per workspace/client; size/type caps | workspace + user + object | Durable/edge | Fail closed | Keep MIME and size checks. |
| XLSX export | Keep 12/min, 120/hour; add daily budget if needed | user + client + estimate | Postgres | Fail closed | Heavy CPU/DB route. |
| AI ask | Keep 10/min, 60/hour; add daily token budget | workspace + user + client | Postgres/provider spend ledger | Fail closed | Add cost dimensions before paid launch. |
| AI package-builder | 3/min, 20/hour, daily cost budget | workspace + user + feature | Durable | Fail closed | Confirm route handler chain first. |
| Email digest/resend | 5/hour resend; 1 digest reservation/window | user + recipient + publication | Postgres exact slot + email circuit | Fail closed for send request, degrade actual email failure | Keep idempotent delivery log. |
| Resend webhook | No generic quota first; signature, body cap, event id idempotency | svix id/signature | DB idempotency | Fail closed on invalid signature | Add WAF coarse if attacked. |
| Internal cron/jobs | No generic quota first; secret + idempotency + queue dedupe | job id + schedule + secret | DB/Queue | Fail closed on missing secret | Duplicate prevention matters more. |
| Client error intake | 10/min now; future 20/min per client with sampling | client hash + route | Memory now; telemetry limiter later | Fail soft/drop | Do not let telemetry degrade app. |
| Realtime room connect | 10 joins/min per user; 100 room connections soft cap | room + user + client | Durable Object | Fail closed for room abuse | Needs DO production proof. |
| Estimate mutation | 40/10s, 120/min now; move to workspace/resource durable if needed | user + estimate/project | Durable for scaled runtime; local immediate | Fail closed with user-friendly retry | High-frequency editing requires lenient burst. |

## Edge Policy Hypotheses

| Edge layer | Candidate use | Do not use for |
| --- | --- | --- |
| WAF Rate Limiting | Coarse path flood protection for `/api/share/*`, `/invite/*`, auth, upload init, AI, export. | Exact quota accounting or paid-plan limits. |
| Workers Rate Limiting binding | Low-latency soft checks inside Worker for public floods. | Security-sensitive exact counters because docs say per-location/eventual consistency. |
| Turnstile | Suspicious or unauthenticated public flows: password, invite probing, contact, possibly auth. | Authenticated internal workflows unless abuse evidence justifies it. |
| Durable Objects | Exact counters, realtime room quotas, per-token coordination. | Global singleton bottlenecks or analytics warehouse use. |
| D1 | Durable metadata, lower-rate ledgers, audit/event joins. | Hot counter store for very high-frequency enforcement unless proven. |
