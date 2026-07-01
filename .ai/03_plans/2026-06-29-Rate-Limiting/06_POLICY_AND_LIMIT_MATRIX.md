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
| Auth provider authority | Better Auth built-in limiter and app auth limiter must have one authoritative source per auth surface; do not stack duplicate lockouts. |
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
| Invite/auth/contact/beta feedback | Pending submit, preserved input, per-email/token cooldown copy, adaptive challenge only when server asks. | Better Auth/provider-coordinated throttles, CSRF/same-origin posture, no enumeration, single authoritative lockout source. |
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
| Auth login/magic | Better Auth built-in rule or app rule must be authoritative; provisional app hypothesis remains 5/min per email hash + client and 20/hour per client only if it does not duplicate provider limits | email hash + client + provider identity | Better Auth storage/app durable as explicitly chosen in `SCE-018` | Fail closed but recovery-friendly | Better Auth v1.6 has built-in limits and `X-Retry-After`; configure customRules/storage/IP headers before app enforcement. |
| OAuth callback | 30/min per client/session | session/client | App durable or provider | Fail soft for callback idempotency, fail closed for invalid state floods | Must not break normal OAuth retries. |
| Contact/support server intake | 3/min, 10/hour plus Turnstile | email/client | Postgres + Turnstile | Fail soft to mailto fallback | Today mailto only. |
| Upload session/init | 12/min requests; 3 active actor; 6 active workspace | workspace + user + client | Durable capacity plus local fast path | Fail closed for storage provider cost | Replace process-local maps for distributed runtimes. |
| Image transform | 20/min per workspace/client; size/type caps | workspace + user + object | Durable/edge | Fail closed | Keep MIME and size checks. |
| XLSX export | Keep 12/min, 120/hour; add daily budget if needed | user + client + estimate | Postgres | Fail closed | Heavy CPU/DB route. |
| AI ask | Keep 10/min, 60/hour; add daily token budget | workspace + user + client | Postgres/provider spend ledger | Fail closed | Add cost dimensions before paid launch. |
| AI package-builder | 3/min, 20/hour, daily cost budget | workspace + user + feature | Durable | Fail closed | Confirm route handler chain first. |
| Email digest/resend | 5/hour resend; 1 digest reservation/window | user + recipient + publication | Durable exact slot + Cloudflare Email/provider circuit | Fail closed for send request, degrade actual email failure | Keep idempotent delivery log; replace stale Resend-specific assumptions with Cloudflare Email/provider-neutral spend and reputation controls. |
| Email provider webhook/callback | No generic quota first; signature, body cap, event id idempotency if callback exists | provider event id/signature | DB idempotency | Fail closed on invalid signature | P0 must confirm whether current Cloudflare Email path has any callback; rate limit remains secondary. |
| Internal cron/jobs | No generic quota first; secret + idempotency + queue dedupe | job id + schedule + secret | DB/Queue/DO lock as chosen | Fail closed on missing secret | Define Cloudflare/Vercel duplicate-trigger posture, max runtime, skip-if-running/queue-if-running, and downstream budgets. |
| Queue consumers | Producer backpressure before enqueue; consumer retry/backoff on downstream 429; DLQ threshold alert | actor + workspace/resource + job type + queue message | Queue + app event ledger + DLQ | Fail closed on producer overflow; retry/delay or DLQ on consumer failures | Cloudflare Queue retries can redeliver whole batches; downstream provider limits must not amplify into retry storms. |
| Client error intake | 10/min now; future 20/min per client with sampling | client hash + route | Memory now; telemetry limiter later | Fail soft/drop | Do not let telemetry degrade app. |
| Realtime room connect/message | 10 joins/min per user; 100 room connections soft cap; per-message/presence/cursor/fanout caps to be selected in `SCE-016`/`CP-009` | room + user + client | Existing `CollaborationRoom` DO only after hosted proof | Fail closed for room abuse | Existing DO is room transport/fanout infrastructure, not a generic limiter. |
| Estimate mutation | 40/10s, 120/min now; move to workspace/resource durable if needed | user + estimate/project | Durable for scaled runtime; local immediate | Fail closed with user-friendly retry | High-frequency editing requires lenient burst. |
| Cloudflare Images transforms | Explicit per-source/parameter cardinality and spend budget before enabling edge transforms | source image + transform params + actor/resource | Cloudflare Images/cache + app policy | Fail closed for invalid source/params; shed excessive variants | Cache hits may bypass origin; unique transformation variants can still bill. |
| Cacheable public/static GETs | Edge/WAF viewer-request policy plus origin-miss app policy | cache key + normalized query + client/resource | Cloudflare cache + app limiter on misses | Fail safe with cache-key normalization | Origin limiters see misses, not all cache hits; cache-busting query params need controls. |
| App-side denial event ledger | 100% intended denial emission for security/cost surfaces; sampled allows/near-limits permitted | policy + actor/resource/client hash | App event store/queue/log sink | Fail according to surface; do not rely on sampled Worker logs | `wrangler.jsonc` logs sample at 0.1, so Workers Logs are correlation only. |

## Edge Policy Hypotheses

| Edge layer | Candidate use | Do not use for |
| --- | --- | --- |
| WAF Rate Limiting | Coarse path flood protection for `/api/share/*`, `/invite/*`, auth, upload init, AI, export. | Exact quota accounting or paid-plan limits. |
| Workers Rate Limiting binding | Low-latency soft checks inside Worker for public floods. | Security-sensitive exact counters because docs say per-location/eventual consistency. |
| Turnstile | Suspicious or unauthenticated public flows: password, invite probing, contact, possibly auth. | Authenticated internal workflows unless abuse evidence justifies it. |
| Durable Objects | Exact counters, realtime room quotas, per-token coordination. | Global singleton bottlenecks or analytics warehouse use. |
| D1 | Durable metadata, lower-rate ledgers, audit/event joins. | Hot counter store for very high-frequency enforcement unless proven. |
| Cloudflare Images/cache | Edge image optimization and cacheable read shielding after route/source validation. | Origin-only limiter claims for viewer floods or unbounded transform-parameter abuse. |

## Standards Posture Matrix

These are not production constants. They are the contract fields P0 must fill before code changes.

| Surface class | Algorithm posture | Response/disclosure posture | Resource-budget posture |
| --- | --- | --- | --- |
| Public share password/session/comment/decision/unsubscribe | Exact low-rate event window or reservation; no soft-only edge authority. | Minimal safe body, `Retry-After` where retryable, `no-store`; suppress remaining/reset quota and token-existence clues. | Body size, comment payload, write frequency, recipient/session daily cap, and support override budget. |
| Invite/auth/contact | Provider-coordinated app windows; auth failed-attempt semantics must define reset and recovery before enforcement. | Generic auth/token response, `Retry-After` only when it does not aid enumeration; no draft RateLimit metadata unless explicitly approved. | Email-send count, provider lockout/challenge threshold, contact body size, beta-user recovery budget. |
| Better Auth current runtime | Single-source authority by auth path; Better Auth customRules/storage/IP headers aligned with app canonicalizer. | Normalize Better Auth `X-Retry-After` into UI cooldowns without exposing account existence; no duplicate app 429 for the same path unless explicitly selected. | Send/verify count, server-side `auth.api` bypass, D1/storage behavior, migration identity mapping, support recovery. |
| Upload/images/direct-upload | Active-slot reservation plus request/body/file/transform windows; process-local guards are supplemental only. | Surface-native 429/capacity result with retry or cleanup timing; no provider internals. | Max body bytes, file count, active actor/workspace slots, transform duration, cleanup lag, storage/provider circuit breaker. |
| XLSX export and AI/package-builder | Deny-before-work exact app policy plus provider-cost budget; idempotent retry semantics for expensive operations. | Authenticated JSON/action result with `Retry-After`; draft RateLimit metadata only after leakage review. | Workbook CPU/DB duration, query count, AI token/model spend, provider calls, daily cost cap. |
| Estimate/template/project organization editing | Lenient burst with explicit algorithm and stale-write posture; last-writer-wins must be named if accepted. | Domain-native action result; conflicts use recoverable `409`/`412` equivalents. | Per-resource mutation burst, concurrent edits, result-row/page-size, queue depth, stale-client retry budget. |
| Email/digest/republish/webhook/internal | Idempotency/signature first; quotas secondary except email reputation and provider circuit breakers. | Minimal safe route/action result; no secret, signature, event-id, or provider-window leakage. | Recipient send count, digest reservation, webhook body bytes, retry queue depth, DLQ/circuit thresholds. |
| Queue/cron/provider jobs | Backpressure and idempotency first; retries delayed or shed according to downstream provider signals. | Internal minimal response; no secret/job details. | Queue depth, batch size, max retries, DLQ age/count, max runtime, overlap lock, downstream provider operations. |
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

## Third-Pass Advanced Policy Gates

These rows are contract gates, not production thresholds.

| Gate | Default planning decision | Required proof |
| --- | --- | --- |
| Client identity canonicalization | Use trusted proxy source order and versioned HMAC inputs; aggregate IPv6 to `/64` by default unless provider/account evidence justifies `/56` or `/48`; never persist raw full IP in limiter logs. | `PROOF-RL-016`. |
| Supabase Auth provider limits | Treat provider limits as constraints to coordinate with, not replacements for app-level beta-safe throttles; refresh endpoint limits, custom SMTP status, and `Sb-Forwarded-For` configuration before enforcement. | `PROOF-RL-017` and `PROOF-RL-021`. |
| Secret/timing parity | Security-sensitive token/signature/password checks use timing-safe comparison or equivalent constant-envelope behavior with fake/real parity tests. | `PROOF-RL-018`. |
| Cache-fill stampede | Expensive cache fills choose coalescing/stale/shed behavior and max waiters before enabling public or authenticated high-cost limits. | `PROOF-RL-019`. |
| Retry full jitter | Server `Retry-After` has precedence; otherwise retryable clients/workers use capped full-jitter backoff and unsafe mutation retries require idempotency. | `PROOF-RL-020`. |
| Deep pagination/count | List/search/export reads define max page size, max depth, count policy, query timeout, and index proof before quota enforcement. | `PROOF-RL-022`. |
| `OPTIONS` and preflight | Same-origin remains default unless a route explicitly opts into CORS; preflight behavior must be body-free, cache-aware, and observable under flood. | `PROOF-RL-023`. |
| Realtime message/fanout | Realtime policies separate token issue/connect quotas from message, presence, cursor, and fanout quotas. | `PROOF-RL-024`. |
| Service-worker/offline replay | If no service worker/offline queue exists, record no-SW proof; if one exists or is added, define queue caps, purge, idempotency, and denial halt behavior. | `PROOF-RL-025`. |
| Chunked/multipart body budgets | Missing `Content-Length`, chunked transfer, multipart part counts, resumable session TTL, transformed bytes, and cleanup paths are explicit. | `PROOF-RL-026`. |
| Bot-management escalation | Bot signals are observe-first, entitlement-gated, false-positive reviewed, and never treated as proof of human legitimacy. | `PROOF-RL-027`. |
| Better Auth limiter authority | Built-in Better Auth limits must be explicitly configured, disabled, or made authoritative per auth route; app auth limits cannot duplicate lockouts. | `PROOF-RL-028`. |
| WAF and Server Actions | Hosted Worker Server Action POST sweeps and Cloudflare Security Events/Ray-ID correlation are required before WAF observe data or skip/allow decisions are trusted. | `PROOF-RL-029`. |
| App-side denial events | Sampled Workers Logs cannot be the primary ledger at 10% sampling; app-side denials must meet completeness targets for security/cost surfaces. | `PROOF-RL-030`. |
