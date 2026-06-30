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
| Unit | Policy registry, identity extraction, hashing, algorithm/window math, response profiles, resource-budget decisions. | Header precedence, HMAC stability, `Retry-After`, window expiry, burst/reset, Problem Details shape, metadata suppression. |
| Client DOM | Frontend repeat-action and cooldown behavior. | Rapid click, Enter submit, pending disable, no stuck disabled state, accessible status. |
| Route/action | Current public and authenticated behavior. | Share password/session/comment/decision, invite accept, AI ask, export, upload init. |
| Store | Durable Postgres/RPC behavior. | insert/count, cleanup, advisory-lock reservation, failure handling. |
| Distributed simulation | Catch process-local bugs. | Two evaluator instances, concurrent upload/estimate mutation, race/overshoot. |
| Cloudflare proof | Edge/provider-specific claims. | WAF log-only hit, Turnstile siteverify, Workers RL overshoot, DO exact counter. |
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
| HTTP/resource/auth standards | response profile, draft RateLimit disclosure posture, `application/problem+json` where selected, cache/CDN header profile, algorithm/window/burst/reset semantics, resource-budget dimensions, auth failed-attempt reset/recovery, low-and-slow anomaly, retention/deletion cleanup. |

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
| PROOF-RL-008 | RL-FR-012, RL-FR-013, RL-FR-015 | WAF, Workers RL, Turnstile | Provider/hosted | Bot-like requests, token replay, multi-location traffic | Edge layers reduce pressure but app limiter remains authoritative; Turnstile tokens are server-validated. | Provider readback and hosted proof only. |
| PROOF-RL-009 | RL-FR-014, RL-NFR-006 | Durable Object exact counters | Provider/hosted | Concurrent increments on one partition and many partitions | Transactional exact count or explicit rejection of cutover. | Hosted Worker/DO proof, provider evidence. |
| PROOF-RL-010 | RL-NFR-004, RL-NFR-005, RL-NFR-007 | Observability, rollback, false positives | Operations | Shadow denials, override, kill switch, support case | Event fields are redacted, cardinality capped, rollback verified, override expires. | Dashboard/runbook drill. |
| PROOF-RL-011 | RL-FR-016, RL-FR-017, RL-NFR-009 | Frontend client controls | Client DOM plus route/action | Double clicks, Enter submit, two tabs, direct `fetch`, `429 Retry-After`, abort, offline retry, screen-reader/keyboard path | UI drops or scopes accidental repeats, never sticks disabled, preserves accessibility, and direct scripted calls remain server-controlled. | Future DOM/integration/browser proof where behavior is browser-only; local automated route/action proof for bypass. |
| PROOF-RL-012 | RL-FR-018, RL-FR-019, RL-NFR-010 | Frontend operational edge contracts | Client DOM plus route/action/store | Reused idempotency key with changed payload, concurrent same-key request, expired key, stale resource version, unsafe mutation retry, hidden-tab cooldown, offline queue overflow, `BroadcastChannel`/Web Locks fallback, disabled cooldown control | Mismatched payload is rejected without side effects; concurrent duplicate is existing/in-progress/conflict; stale write returns recoverable `409`/`412`; no unsafe auto-retry without idempotency; `Retry-After` parser handles delay seconds and HTTP-date; queue caps/purges; lifecycle refreshes; accessible status is outside disabled controls. | Future local automated DOM/integration/route/action proof; browser proof only for browser-only behavior. |
| PROOF-RL-013 | RL-FR-020, RL-NFR-011 | HTTP response, quota disclosure, and cache profile | Route/action/static review | Sensitive public/auth/token denials, authenticated expensive route denial, selected problem-details route, server-action equivalent | `429` includes safe body and retry timing where allowed; draft RateLimit metadata is emitted only on approved surfaces; sensitive denials use no-store/cache-safe profile; server actions keep domain-native equivalents. | Local route/action tests plus static response contract inspection. |
| PROOF-RL-014 | RL-FR-021 | Algorithm/window and resource budgets | Unit/route/store/provider stub | Window boundary, burst, reset/refill, concurrent attempts, body bytes, item counts, export duration, AI token budget, upload active slots | Policy semantics are deterministic; denies happen before expensive CPU/DB/provider/storage work; provider soft limits are labeled approximate. | Unit tests, route tests, provider stubs, distributed simulation where needed. |
| PROOF-RL-015 | RL-FR-022, RL-NFR-012, RL-NFR-013 | Auth failed attempts, low-and-slow escalation, retention/deletion | Route/action/operations | Fake and real emails, failed and successful auth attempts, many below-threshold actors, expired limiter/idempotency rows, pepper rotation window | Auth responses avoid enumeration and duplicate provider lockouts; anomaly dashboards detect distributed abuse; expired/private limiter data is cleaned or anonymized with audit exceptions documented. | Targeted route/action tests, operations harness, cleanup proof. |

## UltraQA Adversarial Scenario Matrix

| Scenario | Expected proof |
| --- | --- |
| 1,000 invalid share password attempts across 10 IPs | Durable per-token/client controls deny without leaking token existence. |
| Shared office NAT with 5 legitimate proposal reviewers | Narrow recipient/session keys prevent broad IP lockout. |
| Owner exports XLSX repeatedly during client call | Clear retry and no partial file corruption. |
| Upload tab crash before release | Durable/session cleanup or timeout prevents permanent capacity loss. |
| AI prompt loop from one user | Quota denies before provider spend escalates. |
| Resend webhook replay | Signature/idempotency blocks duplicate side effects independent of IP. |
| Cloudflare WAF rule active | Origin still protected by app limiter if WAF counters lag. |
| Turnstile token replay | Server-side validation rejects reused/expired token. |
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
| Auth flow receives failed attempts for real and fake emails | Generic response and recovery behavior are equivalent enough to avoid enumeration, provider lockout is not duplicated, and successful recovery resets the documented counters. |
| Export/AI/upload request exceeds body, item, duration, concurrency, or provider-cost budget | Denial or circuit breaker triggers before workbook generation, provider call, storage write, or image transform starts. |
| Many IPs/accounts/tokens stay below single-key thresholds | Low-and-slow dashboard/anomaly signal triggers escalation review without country/ASN-only blocking. |
| Limiter/idempotency rows expire or user deletion/anonymization applies | Cleanup removes or anonymizes expired/private data while preserving allowed security audit summaries. |

## Validation Commands For This Package

Planning artifact verification:

```bash
find .ai/03_plans/2026-06-29-Rate-Limiting -maxdepth 1 -type f | sort
git diff --check -- .ai/03_plans/2026-06-29-Rate-Limiting
git diff --stat -- .ai/03_plans/2026-06-29-Rate-Limiting
git status --short -- .ai/03_plans/2026-06-29-Rate-Limiting
```

Future implementation verification should use targeted tests first, then typecheck/lint/build only when the implementation touches shared source, auth, database, runtime, or provider integration.
