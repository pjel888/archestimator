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
| Response | Use 429, JSON/problem-details or surface-native result, `Retry-After`, explicit cache profile, and draft RateLimit metadata only when quota disclosure is safe. |
| Algorithm/window semantics | Name fixed-window, sliding-window, token-bucket/GCRA, exact reservation, provider soft limit, or no-generic-quota semantics before implementation. |
| Resource budgets | Define request count, byte, item/page-size, duration, concurrency, provider-cost, queue-depth, and circuit-breaker budgets where applicable. |
| Auth recovery | Auth/contact policies must coordinate with provider lockouts, generic responses, reset rules, support/unlock path, and beta-user false-positive handling. |
| Cache/CDN | Sensitive token/auth/personalized/mutation denials default to `Cache-Control: no-store`; any shared or CDN-cacheable denial needs explicit rationale. |
| Failure mode | Fail closed for auth/security/cost surfaces when limiter storage is unavailable; fail soft only for telemetry. |
| Logging | Record near-limit, denied, limiter-store-failure, bypass, and operator override events. |
| Privacy | Store hashed identifiers and coarse metadata only. |
| Low-and-slow detection | Track cross-key cardinality/anomaly signals so distributed automation cannot hide below every single-key threshold. |
| Client controls | Use pending, single-flight, cooldown, cancellation, idempotency, optimistic rollback, and keyboard-accessible status as UX/backpressure only; server limits remain authoritative. |
| Direct bypass | Every high-risk policy must prove direct route/action invocation cannot bypass server gates before side effects. |

## Client Affordance Matrix

| Surface group | Required client affordance | Server truth |
| --- | --- | --- |
| Public share password/session/comment/decision/unsubscribe | Pending disable, keyboard parity, scoped `Retry-After`, draft retention for comments, focus recovery for decision dialogs. | Durable token/recipient/client policies and non-enumerating responses. |
| Invite/auth/contact/beta feedback | Pending submit, preserved input, per-email/token cooldown copy, adaptive challenge only when server asks. | Provider-coordinated throttles, CSRF/same-origin posture, no enumeration. |
| Upload/images/direct-upload | Active slot display, cancel/retry, cleanup timeout, same-resource single-flight, tab-crash recovery. | Durable capacity, byte/type validation, cleanup, idempotent release. |
| XLSX export and AI/package-builder | Same-resource pending, idempotency key reuse for retry, abort stale draft/refine where safe, scoped cooldown. | Deny before workbook/provider work; Apply/export duplicate handling. |
| Estimate/template/project organization editing | Per-resource queues, optimistic rollback or retryable pending item, stale-tab recovery, no global editor lock. | Server action policy preserves normal editing while denying scripted loops. |
| Publication/email/digest/republish | Recipient/resource cooldown, single-flight, duplicate toast suppression. | Delivery idempotency, provider circuit breaker, email cooldown. |
| Telemetry/activity | Local throttle/sample/drop without user-blocking UI. | Same-origin/fetch metadata/body-size/rate-limited drop. |

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

## Standards Posture Matrix

These are not production constants. They are the contract fields P0 must fill before code changes.

| Surface class | Algorithm posture | Response/disclosure posture | Resource-budget posture |
| --- | --- | --- | --- |
| Public share password/session/comment/decision/unsubscribe | Exact low-rate event window or reservation; no soft-only edge authority. | Minimal safe body, `Retry-After` where retryable, `no-store`; suppress remaining/reset quota and token-existence clues. | Body size, comment payload, write frequency, recipient/session daily cap, and support override budget. |
| Invite/auth/contact | Provider-coordinated app windows; auth failed-attempt semantics must define reset and recovery before enforcement. | Generic auth/token response, `Retry-After` only when it does not aid enumeration; no draft RateLimit metadata unless explicitly approved. | Email-send count, provider lockout/challenge threshold, contact body size, beta-user recovery budget. |
| Upload/images/direct-upload | Active-slot reservation plus request/body/file/transform windows; process-local guards are supplemental only. | Surface-native 429/capacity result with retry or cleanup timing; no provider internals. | Max body bytes, file count, active actor/workspace slots, transform duration, cleanup lag, storage/provider circuit breaker. |
| XLSX export and AI/package-builder | Deny-before-work exact app policy plus provider-cost budget; idempotent retry semantics for expensive operations. | Authenticated JSON/action result with `Retry-After`; draft RateLimit metadata only after leakage review. | Workbook CPU/DB duration, query count, AI token/model spend, provider calls, daily cost cap. |
| Estimate/template/project organization editing | Lenient burst with explicit algorithm and stale-write posture; last-writer-wins must be named if accepted. | Domain-native action result; conflicts use recoverable `409`/`412` equivalents. | Per-resource mutation burst, concurrent edits, result-row/page-size, queue depth, stale-client retry budget. |
| Email/digest/republish/webhook/internal | Idempotency/signature first; quotas secondary except email reputation and provider circuit breakers. | Minimal safe route/action result; no secret, signature, event-id, or provider-window leakage. | Recipient send count, digest reservation, webhook body bytes, retry queue depth, DLQ/circuit thresholds. |
| Telemetry/activity/client-error | Fail-soft local/drop or sampled app policy; not user-blocking. | Minimal response; no limiter internals. | Body size, event count, sample rate, cardinality cap, storage/log cost. |

## Performance And Cost Budget Placeholders

These are budget contracts for future implementation, not measured baselines from this planning task.

| Surface/store | Baseline method | Target statistic | Regression threshold | Rollback trigger |
| --- | --- | --- | --- | --- |
| Postgres event limiter | Targeted route/store tests plus shadow production metrics | p95 limiter check latency, query count per request, cleanup lag | p95 over agreed baseline by 25% or query count grows unexpectedly | Move policy to shadow or restore old helper. |
| Share/invite public paths | Shadow decisions during beta | Deny rate by policy/resource/client hash, reviewer success after retry | Legitimate reviewer/invite support reports or 3x denial spike | Raise threshold or scope override with expiry. |
| Upload admission | Concurrent upload fixture and beta telemetry | active actor/workspace denials, stuck-session cleanup age, provider error rate | Persistent active-cap denials for normal upload profile | Raise caps or keep local guard supplemental while durable fix lands. |
| XLSX export | Workbook fixture before/after limiter check | p95 time before denial, p95 workbook generation time, 429 before generation | Denied requests still perform heavy workbook work | Roll back export limiter integration. |
| AI routes | Provider stub plus usage ledger | requests/min, tokens/request, daily token spend, provider error rate | Provider call occurs after would-deny, or daily spend exceeds budget | Disable AI policy branch or feature flag. |
| Cloudflare WAF/Workers | Hosted proof traffic and origin comparison | origin requests during mitigation delay, per-location overshoot, false-positive reports | Origin/app events diverge beyond approved tolerance | Disable rule/binding or revert to observe-only. |
