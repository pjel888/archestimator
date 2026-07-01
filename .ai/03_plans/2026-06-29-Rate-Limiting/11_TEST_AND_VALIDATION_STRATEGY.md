---
title: Test And Validation Strategy
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Test And Validation Strategy

## Test Principle

Lock current behavior before changing implementation. Then prove each new limiter with the smallest test that demonstrates allow, near-limit, deny, retry, failure, and rollback behavior.

## Required Test Layers

| Layer | Purpose | Example checks |
| --- | --- | --- |
| Unit | Policy registry, identity extraction, hashing, algorithm/window math, response profiles, resource-budget decisions. | Header precedence, HMAC stability, `Retry-After`, draft `RateLimit` syntax, window expiry, burst/reset, Problem Details shape, metadata suppression, memory/decompressed/media budget decisions. |
| Client DOM | Frontend repeat-action and cooldown behavior. | Rapid click, Enter submit, pending disable, no stuck disabled state, accessible status. |
| Route/action | Current public and authenticated behavior. | Share password/session/comment/decision, invite accept, AI ask, export, upload init. |
| Store | Durable Postgres/RPC behavior. | insert/count, cleanup, advisory-lock reservation, failure handling. |
| Distributed simulation | Catch process-local bugs. | Two evaluator instances, concurrent upload/estimate mutation, race/overshoot. |
| Cloudflare proof | Edge/provider-specific claims. | WAF log-only hit, Turnstile Siteverify response binding, Workers RL overshoot, DO exact counter. |
| Operations | Dashboards, alerts, rollback, low-and-slow escalation, retention/deletion. | Denial event emitted, kill switch works, false-positive runbook exercised, anomaly signal triggered, expired rows cleaned. |

## Current Behavior Regression Targets

| Surface | Required assertions |
| --- | --- |
| Shared-link password | durable pre-check denies after threshold, failure records delay, success clears durable failures, local lockout behavior is understood. |
| Shared-link comment/decision | recipient/publication keying, write/read windows, no raw token logs. |
| Invite resolve/accept/continue/create/resend | token/HMAC IP keying, action result shape, no enumeration. |
| AI ask | 10/min and 60/hour windows, 503 on quota store unavailable, 429 body on deny. |
| Proposal XLSX export | 429 with `Retry-After` before workbook generation. |
| Upload admission | actor/workspace active caps, release idempotency, request window retry. |
| Estimate actions | burst windows preserve normal editing and deny runaway loops. |
| Client error intake | same-origin/fetch metadata, body size, rate-limited drop. |
| Frontend repeat controls | pending/single-flight/cooldown/idempotency behavior on high-risk UI actions, idempotency fingerprint/TTL/mismatch behavior, stale-write conflict recovery, retry/offline caps, browser lifecycle recomputation, multi-tab fallback, disabled-control accessibility, plus direct request bypass proof at the server. |
| HTTP/resource/auth standards | response profile, exact draft RateLimit disclosure syntax, `application/problem+json` where selected, cache/CDN header profile, algorithm/window/burst/reset semantics, resource/runtime/platform budget dimensions, auth failed-attempt timing/NIST reset/recovery, Turnstile validation binding, low-and-slow plus business-flow anomaly, retention/deletion cleanup. |

## Proof Contract Rows

| Proof ID | Requirement IDs | Target | Layer | Fixture/input | Assertion | Evidence command/class |
| --- | --- | --- | --- | --- | --- | --- |
| PROOF-RL-001 | RL-FR-001, RL-NFR-002 | Policy registry and response helper | Unit | Fixed windows, test clock, route/action response profiles | Same current thresholds and `Retry-After` math, no raw identifiers. | Targeted unit test, local automated. |
| PROOF-RL-002 | RL-FR-002, RL-FR-003 | Share root/session/password/comment/decision/unsubscribe | Route/store | Valid token, invalid token, repeated attempts, reviewer session | Current 429/Retry-After/no-store behavior preserved; no token existence leak. | Targeted route/store tests, local automated. |
| PROOF-RL-003 | RL-FR-004 | Invite create/resend/resolve/continue/accept/sign-out | Route/action | Valid/invalid token, same-origin failure, repeated accept/resend | Existing durable limits preserved; sign-out has explicit no-policy or limiter rationale. | Targeted route/action tests, local automated. |
| PROOF-RL-004 | RL-FR-006, RL-FR-007 | Upload and XLSX export | Route/store/distributed | Concurrent uploads, crash-before-release, repeated workbook export | Durable/session capacity and 429 occur before expensive provider/workbook work. | Local automated plus distributed simulation. |
| PROOF-RL-005 | RL-FR-008 | Server action groups | Action | Function-level inventory from 27 action files | Each action has no-policy, mutation, expensive read, email/provider, storage, or public-token classification. | Static inventory plus targeted action tests. |
| PROOF-RL-006 | RL-FR-009 | AI ask/package-builder | Route/provider | Ask loop, package-builder draft/refine/feedback/apply, provider unavailable | Cost quotas deny before spend; feedback/apply branches are classified; 503/429 contracts preserved. | Route tests plus provider stub, local automated. |
| PROOF-RL-007 | RL-FR-011 | Webhooks/internal jobs | Route/store | Invalid signature, replayed event, repeated cron secret call | Signature/replay/idempotency block side effects independent of IP. | Route tests plus idempotency fixture. |
| PROOF-RL-008 | RL-FR-012, RL-FR-013, RL-FR-015, RL-FR-024 | WAF, Workers RL, Turnstile | Provider/hosted | Bot-like requests, token replay, cross-surface challenge token, multi-location traffic | Edge layers reduce pressure but app limiter remains authoritative; Turnstile tokens are server-validated, single-use/expiry is enforced, expected hostname/action/cdata match, and Siteverify retries use an idempotency key. | Provider readback and hosted proof only. |
| PROOF-RL-009 | RL-FR-014, RL-NFR-006 | Durable Object exact counters | Provider/hosted | Concurrent increments on one partition and many partitions | Transactional exact count or explicit rejection of cutover. | Hosted Worker/DO proof, provider evidence. |
| PROOF-RL-010 | RL-NFR-004, RL-NFR-005, RL-NFR-007 | Observability, rollback, false positives | Operations | Shadow denials, override, kill switch, support case | Event fields are redacted, cardinality capped, rollback verified, override expires. | Dashboard/runbook drill. |
| PROOF-RL-011 | RL-FR-016, RL-FR-017, RL-NFR-009 | Frontend client controls | Client DOM plus route/action | Double clicks, Enter submit, two tabs, direct `fetch`, `429 Retry-After`, abort, offline retry, screen-reader/keyboard path | UI drops or scopes accidental repeats, never sticks disabled, preserves accessibility, and direct scripted calls remain server-controlled. | Future DOM/integration/browser proof where behavior is browser-only; local automated route/action proof for bypass. |
| PROOF-RL-012 | RL-FR-018, RL-FR-019, RL-NFR-010 | Frontend operational edge contracts | Client DOM plus route/action/store | Reused idempotency key with changed payload, concurrent same-key request, expired key, stale resource version, unsafe mutation retry, hidden-tab cooldown, offline queue overflow, `BroadcastChannel`/Web Locks fallback, disabled cooldown control | Mismatched payload is rejected without side effects; concurrent duplicate is existing/in-progress/conflict; stale write returns recoverable `409`/`412`; no unsafe auto-retry without idempotency; `Retry-After` parser handles delay seconds and HTTP-date; queue caps/purges; lifecycle refreshes; accessible status is outside disabled controls. | Future local automated DOM/integration/route/action proof; browser proof only for browser-only behavior. |
| PROOF-RL-013 | RL-FR-020, RL-FR-023, RL-NFR-011 | HTTP response, quota disclosure, and cache profile | Route/action/static review | Sensitive public/auth/token denials, authenticated expensive route denial, selected problem-details route, server-action equivalent, approved RateLimit metadata route | `429` includes safe body and retry timing where allowed; draft RateLimit metadata is emitted only on approved surfaces with exact `RateLimit-Policy` `q`/`qu`/`w`/`pk` semantics and `RateLimit` `r`/`t` semantics, bounded client retry behavior, and cache/current-age handling; sensitive denials use no-store/cache-safe profile; server actions keep domain-native equivalents. | Local route/action tests plus static response contract inspection. |
| PROOF-RL-014 | RL-FR-021, RL-NFR-014 | Algorithm/window and resource budgets | Unit/route/store/provider stub | Window boundary, burst, reset/refill, concurrent attempts, body bytes, decompressed bytes, image dimensions, memory ceiling, item counts, export duration, AI token budget, upload active slots, platform operation budget | Policy semantics are deterministic; denies happen before expensive CPU/DB/memory/provider/storage/platform work; provider soft limits are labeled approximate; billing alerts and transformed-payload ceilings are explicit. | Unit tests, route tests, provider stubs, distributed simulation where needed. |
| PROOF-RL-015 | RL-FR-022, RL-FR-025, RL-NFR-012, RL-NFR-013, RL-NFR-015 | Auth failed attempts, low-and-slow escalation, business-flow anomaly, retention/deletion | Route/action/operations | Fake and real emails, response timing, failed and successful auth attempts, new-secret generation, many below-threshold actors, flow-sequence abuse, expired limiter/idempotency rows, pepper rotation window | Auth responses avoid enumeration and duplicate provider lockouts; NIST counter behavior is explicit; anomaly dashboards detect distributed and sequence-aware abuse; expired/private limiter data is cleaned or anonymized with audit exceptions documented. | Targeted route/action tests, operations harness, cleanup proof. |
| PROOF-RL-016 | RL-FR-026 | Trusted client identity and IPv6 canonicalization | Unit/route/static | IPv4, IPv6 compressed/expanded, IPv4-mapped IPv6, invalid IP, multiple forwarded headers, Cloudflare/Vercel/Supabase header variants | Trusted source order is deterministic; IPv6 is masked before HMAC; raw full IP is not persisted; key version and separators avoid ambiguous composite inputs. | Unit tests plus route/header static review. |
| PROOF-RL-017 | RL-FR-027 | Supabase Auth provider limits and forwarded IP | Docs/provider readback/route/action | Current Supabase Auth rate-limit table, custom SMTP status, `Sb-Forwarded-For` setting, `sb_secret_*` server-client proof, auth route/action retries | App auth limits coordinate with provider limits; `Sb-Forwarded-For` is either intentionally disabled or enabled only through the documented server-key path; beta recovery is preserved. | Official docs refresh, provider/account readback, targeted auth tests. |
| PROOF-RL-018 | RL-FR-028, RL-NFR-016 | Timing-safe equality and parity | Unit/route/action | Valid/invalid token, wrong-length token, fake/real account or token path, password/challenge/draft-token comparisons | Comparison path avoids early-exit leaks where security depends on secret equality; wrong length gets the same safe response envelope; fake/real paths meet timing-parity target. | Unit tests and route/action timing-envelope tests. |
| PROOF-RL-019 | RL-FR-029 | Cache-fill stampede control | Unit/concurrency/distributed simulation | Many simultaneous cache misses, slow provider fill, fill error, negative result, max-waiter overflow, store unavailable | One fill or bounded fills run; waiters receive stale, result, shed, or safe error according to contract; no thundering herd reaches provider/store. | Concurrency test and distributed simulation. |
| PROOF-RL-020 | RL-NFR-017, FCE-008 | Full-jitter retry and `Retry-After` precedence | Unit/client DOM/worker | Delay-seconds `Retry-After`, HTTP-date `Retry-After`, missing server hint, invalid hint, network failure, unsafe mutation with/without idempotency | Server retry hint wins; fallback uses capped full jitter; unsafe mutations do not auto-retry without idempotency; max attempts/elapsed/abort behavior is bounded. | Client/worker unit tests; DOM proof where browser-only. |
| PROOF-RL-021 | RL-FR-030 | OTP/MFA bombing controls | Docs/provider readback/route/action | Magic-link/OTP send bursts, verify attempts, future MFA send/verify, shared NAT, fake/real identity, support recovery | Provider limits and app limits do not duplicate lockout; send/verify are separately bounded; generic responses and support recovery remain intact. | Provider docs/account readback plus auth tests. |
| PROOF-RL-022 | RL-FR-031 | Deep pagination and count budgets | Repository/route/static | Max page, over-max page, deep offset, cursor path, `COUNT(*)`, unindexed filter, timeout | Large list/count requests are denied, degraded, or cursor-bounded before expensive query work; approved counts have index/timeout proof. | Repository tests and static query review. |
| PROOF-RL-023 | RL-FR-032 | CORS `OPTIONS` and preflight posture | Route/static/edge | `OPTIONS` flood, disallowed origin, allowed origin, missing headers, cached preflight, body on preflight | Same-origin default or explicit CORS behavior is stable; preflight is body-free and low-cost; flood behavior is observable and does not bypass app auth/limiter decisions. | Route tests/static headers review. |
| PROOF-RL-024 | RL-FR-033 | Realtime connect/message/presence quotas | Realtime harness/provider | Token issue loop, connect flood, cursor storm, presence update storm, broadcast fanout, disconnect cleanup | Token/connect quotas are separate from message/fanout quotas; room/user/client budgets are enforced or explicitly shadowed; cleanup prevents stale capacity. | Realtime harness plus provider proof when hosted. |
| PROOF-RL-025 | RL-FR-034, FCE-009 | Service-worker/offline replay | Static/client DOM/browser | No service worker registration; or queued mutation after sign-out/workspace switch, stale token, reconnect flush, server `429`/`401`/`403`/`409`/`412` | If absent, no-SW proof is recorded; if present, queue caps, purge rules, idempotency, auth refresh, and server-denial halt behavior are proven. | Static no-SW proof or browser/DOM proof. |
| PROOF-RL-026 | RL-FR-035 | Chunked/multipart/resumable resource budgets | Route/provider stub/distributed simulation | Missing `Content-Length`, chunked body, too many parts, oversized part, resumable session leak, abort mid-upload, transformed-byte expansion | Parser/storage work is bounded; legitimate resumable uploads still work; leaked sessions clean up; denials happen before expensive storage/scan/transform. | Upload route tests, provider stub, distributed simulation. |
| PROOF-RL-027 | RL-FR-036 | Bot-management escalation governance | Provider readback/hosted/operations | Observe-only bot rule, bot-score/signal sample, suspected bot reviewer, beta user, false-positive review, rollback | Bot signals are observe-first and entitlement-gated; false-positive review and support path exist before challenge/block; app limiter remains authoritative. | Provider readback, hosted logs, support/runbook drill. |
| PROOF-RL-028 | RL-FR-037, RL-FR-039 | Better Auth limiter authority, storage, and migration identity | Docs/provider readback/route/action/migration review | `/sign-in/email`, session/get-session, OAuth callback, fake/real account, shared NAT, 2FA/future MFA, same human with Supabase and Better Auth IDs | Better Auth and app limiter do not double-lock; `X-Retry-After` is normalized; server-side `auth.api` bypass has app/provider-budget controls where needed; migration identity does not unintentionally double quota unless accepted. | Official Better Auth docs, provider/account config readback, targeted auth tests, migration mapping review. |
| PROOF-RL-029 | RL-FR-038 | Hosted Worker WAF/Server Action interaction | Hosted/provider | Estimate save, invite accept/create/resend, share comment/decision, upload/source/init with multipart bodies, AI ask/apply, export/publication/email actions, `Next-Action` header cases | Legitimate Server Actions reach Worker or have documented WAF/Security Event evidence and rollback/skip strategy; any Cloudflare 403/HTML/hang is tied to Ray ID or explicit no-event provider readback. | Hosted Worker proof plus Cloudflare Security Events/Ray-ID readback; local dev is insufficient. |
| PROOF-RL-030 | RL-NFR-018 | App-side denial event completeness under sampled Workers Logs | Local automated/operations/hosted cross-check | Shadow-mode denials across auth/share/invite/upload/AI/export/queue/cron/DO/image paths, with `wrangler.jsonc` logs sampled at 0.1 | Denied security/cost events are persisted or delivered at at least 99% completeness for scoped proof traffic; sampled Workers Logs are treated as correlation only. | App event tests, operations harness, and hosted/provider cross-check when available. |

## UltraQA Adversarial Scenario Matrix

| Scenario | Expected proof |
| --- | --- |
| 1,000 invalid share password attempts across 10 IPs | Durable per-token/client controls deny without leaking token existence. |
| Shared office NAT with 5 legitimate proposal reviewers | Narrow recipient/session keys prevent broad IP lockout. |
| Owner exports XLSX repeatedly during client call | Clear retry and no partial file corruption. |
| Upload tab crash before release | Durable/session cleanup or timeout prevents permanent capacity loss. |
| AI prompt loop from one user | Quota denies before provider spend escalates. |
| Provider webhook or internal job replay | Signature/secret/idempotency blocks duplicate side effects independent of IP; P0 confirms whether any Cloudflare Email callback exists before carrying old Resend-specific rows forward. |
| Cloudflare WAF rule active | Origin still protected by app limiter if WAF counters lag. |
| Turnstile token replay | Server-side validation rejects reused/expired token. |
| Turnstile token from another hostname/action/cdata context | Server-side validation rejects valid-looking tokens whose Siteverify response does not match the expected challenge context; Siteverify retry uses `idempotency_key`. |
| Limiter store outage | Security/cost surfaces fail closed; telemetry drops/fails soft. |
| Policy kill switch toggled | Denials stop for that policy without deploy. |
| User double-clicks export, AI Apply, invite resend, or share decision | One visible in-flight action, no duplicate side effects, direct repeated route/action call still server-denied or idempotent. |
| User presses Enter repeatedly during a pending form submit | Keyboard path follows the same pending/single-flight contract as pointer click. |
| Browser receives 429 with `Retry-After` | UI shows scoped cooldown, does not freeze unrelated controls, preserves form/draft state, and re-enables cleanly when safe to retry. |
| Network fails after server success and the user retries | Idempotency returns existing result or blocks duplicate side effects. |
| Two tabs trigger the same high-cost action | Client coordination may reduce duplicate work, but server remains authoritative. |
| Logged-in user runs a console script against upload, export, estimate, package-builder, or publication/email routes/actions | Server-side policy denies, throttles, authorizes, or returns idempotent result before side effects/provider spend. |
| User reuses one idempotency key for a different payload | Server detects fingerprint mismatch and rejects without side effects; UI rotates key only for a new intent. |
| Two tabs submit stale edits to the same estimate, template, project, or publication resource | Resource version or `If-Match`/ETag-style precondition fails with recoverable `409`/`412`; draft is preserved for reconcile/retry. |
| Unsafe mutation sees a network failure while idempotency is absent | Client does not silently auto-retry; user gets bounded recovery copy. |
| Offline queue exceeds max count, max age, or max bytes | Queue rejects or purges according to contract and removes private queued data on sign-out/workspace switch. |
| Hidden tab resumes after `Retry-After` should have expired | UI recomputes cooldown on `visibilitychange`, focus, or reconnect before enabling retry. |
| `Retry-After` arrives as delay seconds, HTTP-date, invalid value, or huge value | Parser handles valid formats, clamps extremes, and safely falls back on invalid values. |
| Browser lacks `BroadcastChannel` or Web Locks | Client falls back without correctness loss because server idempotency/limiter/precondition checks remain authoritative. |
| A native disabled button is the active cooldown affordance | Explanation, retry time, support path, and dynamic `aria-live`/`aria-busy` status remain outside the disabled control and discoverable by keyboard/screen-reader users. |
| Sensitive public route returns `429` | Response body is safe, `Retry-After` is present only where retryable, draft quota metadata is suppressed, and cache headers prevent shared caching. |
| Approved route emits draft `RateLimit` metadata | Header syntax uses documented quota, window, quota-unit, partition, remaining/reset, and unit semantics; client parser caps unreasonable waits, adds jitter where needed, and ignores stale cached quota hints. |
| Auth flow receives failed attempts for real and fake emails | Generic response and recovery behavior are equivalent enough to avoid enumeration, provider lockout is not duplicated, and successful recovery resets the documented counters. |
| Auth reset/magic flow responds to real and fake identities | Message and timing stay equivalent enough to avoid enumeration; new secret generation does not reset failed-attempt counters unless the selected standard/provider contract explicitly allows it. |
| Export/AI/upload request exceeds body, item, duration, concurrency, or provider-cost budget | Denial or circuit breaker triggers before workbook generation, provider call, storage write, or image transform starts. |
| Upload/image request expands after decompression or image decode | Decompressed-size, dimension/megapixel, memory, and platform-operation ceilings reject before expensive transform or storage write. |
| Many IPs/accounts/tokens stay below single-key thresholds | Low-and-slow dashboard/anomaly signal triggers escalation review without country/ASN-only blocking. |
| Valid authenticated requests abuse a sensitive business flow | Sequence-aware anomaly signal identifies impossible journeys or abnormal invite/share/contact/publication funnels even when every single request is individually valid. |
| Limiter/idempotency rows expire or user deletion/anonymization applies | Cleanup removes or anonymizes expired/private data while preserving allowed security audit summaries. |
| IPv6 privacy address rotates across many addresses in one prefix | Canonicalizer masks before HMAC and keeps token/resource dimensions narrow enough to avoid both fragmentation and broad lockout. |
| `Sb-Forwarded-For` is missing, disabled, or misconfigured | Auth provider coordination falls back to documented app behavior and does not assume provider sees the real client IP. |
| 100 concurrent requests miss the same expensive cache entry | Cache-fill control coalesces, serves stale, sheds, or fails safely without sending 100 provider/database fills. |
| Client receives no `Retry-After` and retries a safe/idempotent operation | Capped full-jitter backoff spreads retries; unsafe mutation retry remains blocked without idempotency. |
| Magic-link/OTP or future MFA send is hammered for one email and many IPs | Provider and app gates coordinate without revealing account existence or permanently locking a beta user out. |
| Client requests page 10,000 or an expensive exact count | Route/repository denies, degrades, or requires cursor/index/timeout proof before running expensive query work. |
| Public route receives high-volume CORS preflight requests | `OPTIONS` posture is explicit, low-cost, observable, and cannot bypass later route/action security controls. |
| Realtime client sends cursor/presence/messages below connect quota but above room fanout budget | Per-message/fanout quotas trigger separately from token/connect quotas. |
| Service worker or offline queue replays a mutation after sign-out | Queue purge or fresh server rejection prevents stale-auth side effects. |
| Chunked or multipart upload omits `Content-Length` and streams many parts | Body/session budgets reject or abort before unbounded storage/scan/transform work. |
| Bot-score rule flags a legitimate client reviewer or beta user | Observe-only evidence and false-positive review prevent challenge/block until support/rollback exists. |
| Better Auth `/sign-in/email` is hit 4 times in 10 seconds while app auth policy is also enabled | Exactly one intended limiter owns the denial; the UI shows one cooldown source and support recovery remains intact. |
| Same human has a Supabase user ID and a Better Auth user ID during migration | User-keyed quotas use a documented unification mapping or explicitly accepted temporary double-quota posture with compensating client/resource limits. |
| Hosted Server Action upload contains a `Next-Action` header and a representative multipart body | Worker receives the request, or the failure is classified as app/runtime/edge/unknown. Cloudflare Security Events must identify a managed rule before the plan claims WAF causality or proposes a skip. |
| Shadow-mode deny occurs while Workers Logs sample at 10% | App-side denial event is present even when no sampled Worker log exists. |
| Upload queue floods with messages and downstream provider returns `429` | Producer backpressure or consumer delayed retry prevents batch retry amplification; DLQ alert threshold fires when retry budget is exhausted. |
| Cloudflare cron trigger overlaps with a legacy Vercel cron or a long-running previous invocation | Job idempotency and overlap policy skip, queue, or lock according to contract and does not double-spend provider operations. |
| Cacheable route is flooded with cache-busting query params | Cache-key normalization or WAF/edge policy limits viewer flood while origin-miss app limiter still protects expensive fills. |
| Cloudflare Images transform receives many unique width/quality/source combinations | Parameter cardinality and provider-spend budgets deny or shed before unbounded unique transformation billing. |

## Validation Commands For This Package

Planning artifact verification:

```bash
find .ai/03_plans/2026-06-29-Rate-Limiting -maxdepth 1 -type f | sort
git diff --check -- .ai/03_plans/2026-06-29-Rate-Limiting
git diff --stat -- .ai/03_plans/2026-06-29-Rate-Limiting
git status --short -- .ai/03_plans/2026-06-29-Rate-Limiting
```

Future implementation verification should use targeted tests first, then typecheck/lint/build only when the implementation touches shared source, auth, database, runtime, or provider integration.
