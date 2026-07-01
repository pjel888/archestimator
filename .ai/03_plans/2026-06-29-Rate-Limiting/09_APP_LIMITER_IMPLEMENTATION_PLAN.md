---
title: App Limiter Implementation Plan
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# App Limiter Implementation Plan

This is a conceptual implementation plan only. It does not authorize code changes in this task.

## Implementation Strategy

1. Freeze current behavior with targeted tests around existing public/share/invite/upload/AI/export limiters.
2. Add a frontend-control inventory for repeat-click, Enter-submit, retry, cancellation, multi-tab, and idempotency behavior on high-risk UI actions.
3. Introduce a central policy registry and identity helper without changing thresholds.
4. Migrate one surface at a time behind behavior-preserving tests.
5. Add observability events in shadow mode.
6. Add rollout modes: `off`, `shadow`, `enforce`, `challenge`.
7. Replace process-local production-critical controls with durable stores.
8. Coordinate Better Auth built-in limiter authority, storage, client identity, and `X-Retry-After` behavior before auth app-limiters enforce.
9. Add Cloudflare edge layers only after app-layer behavior is proven and hosted WAF/Server Action proof exists.

## Conceptual Module

`src/lib/rate-limits/` should be the only new boundary if implementation proceeds.

| Module | Contract |
| --- | --- |
| `types.ts` | Shared `RateLimitPolicy`, `RateLimitResult`, `RateLimitWindow`, `RateLimitMode`, `RateLimitAlgorithm`, `ResponseProfile`, and `ResourceBudget`. |
| `policies.ts` | Enumerates all route/action policy IDs, algorithms/windows, burst/reset semantics, resource budgets, response profiles, and disclosure posture. |
| `identity.ts` | Normalizes request identity and hashed dimensions. |
| `evaluate.ts` | Main `checkRateLimit(policyId, context)` function, including multi-window combination, retry-after math, algorithm semantics, and overshoot classification. |
| `budgets.ts` | Resource-budget evaluation for body bytes, item counts, duration, concurrency, provider cost units, queue depth, and circuit breakers. |
| `stores/postgres-events.ts` | Reuses `security_rate_limit_events`. |
| `stores/postgres-reservation.ts` | Uses advisory-lock/RPC patterns for exact reservations. |
| `stores/better-auth.ts` | Coordinates Better Auth built-in limiter authority, custom rules, storage, identity headers, and `X-Retry-After` normalization for auth paths only. |
| `stores/d1.ts` | Candidate low-churn metadata/ledger adapter after D1 query-budget proof; not a blind replacement for hot Postgres counters. |
| `stores/memory.ts` | Local dev/test or supplemental-only controls. |
| `stores/cloudflare.ts` | Future Worker/DO adapters after proof, with `CollaborationRoom` realtime quotas separate from generic counter DOs. |
| `responses.ts` | NextResponse/action result helpers for `Retry-After`, Problem Details where selected, draft RateLimit metadata where safe, no-store/cache headers, and server-action domain equivalents. |
| `telemetry.ts` | Structured events and redaction. |
| `test-helpers.ts` | Reset/time helpers for tests only. |

## Conceptual Client Module

If implementation creates shared frontend helpers, keep them separate from authoritative rate-limit evaluation. A likely future boundary is `src/lib/client-action-guards/` or a colocated hook under existing feature patterns.

| Concept | Contract |
| --- | --- |
| Action key builder | Derive stable client keys from operation, actor/resource IDs already visible to the component, and request intent. No raw secrets or public bearer tokens. |
| Single-flight guard | Prevent or join duplicate in-flight work for the same key and release on success, handled failure, abort, timeout, navigation cleanup, or rollback/kill-switch refresh. |
| Cooldown helper | Convert safe server `Retry-After` headers/action fields into scoped retry state, plain-language copy, preserved draft/form state, and retry enablement. |
| Retry policy helper | Disable automatic unsafe mutation retry unless the same user intent has a valid idempotency key; apply capped attempts, bounded backoff, optional jitter, timeout/abort, and `Retry-After` precedence. |
| Idempotency helper | Generate operation IDs for retryable expensive/destructive actions, preserve them only for the same user intent, and carry enough stable intent metadata for the server to validate fingerprint, TTL, concurrent same-key, and mismatch behavior. |
| Precondition/conflict adapter | Attach resource version, revision hash, or `If-Match`/ETag-style precondition fields where the route/action contract requires lost-update protection; preserve draft state on `409`/`412` recovery. |
| Offline queue governor | Bound any persisted/offline work by max queued items, max age, max bytes, dedupe key, flush order, storage/privacy class, and purge rules for sign-out, workspace switch, token invalidation, and server denial. |
| Browser lifecycle adapter | Recompute pending, cooldown, queue, optimistic, and kill-switch state on `visibilitychange`, focus, reconnect, navigation cleanup, timeout, and server/config refresh. |
| Accessibility adapter | Standardize native `disabled`, optional `aria-disabled`, `aria-busy`, live-region status, focus restore, keyboard-submit behavior, separate cooldown explanation text, and no-stuck-disabled assertions for guarded actions. |
| Multi-tab helper | Share in-flight/cooldown hints only for high-cost same-origin actions with `BroadcastChannel` or storage-event fallback; reserve Web Locks for deliberately chosen high-cost singleton work; stale tabs refresh from server response and never become the source of truth. |
| Client identity canonicalizer | Parse trusted client IP/header input, normalize IPv4/IPv6, mask IPv6 before HMAC, version composite keys, and expose only hashed/coarse dimensions to events. |
| Provider auth coordinator | Load current Better Auth limiter authority/storage/customRules/IP header decisions, Supabase migration/provider-limit remnants, `Sb-Forwarded-For` posture, OTP/MFA send/verify policy, OAuth-state binding, and duplicate-lockout recovery rules into auth/contact contract rows. |
| Timing-safe comparison wrapper | Centralize length handling, timing-safe equality, and uniform response-envelope hooks for secret/token comparisons where source modules currently differ. |
| Cache-fill coordinator | Provide single-flight/coalescing, max waiters, stale serve, negative-cache, timeout, shed, and provider/store-outage decisions for expensive reads and provider fills. |
| Resource/protocol budget helper | Evaluate page depth, count budget, CORS `OPTIONS`, body bytes, missing `Content-Length`, chunked transfer, multipart/resumable state, transformed bytes, and route timeouts before expensive work. |
| Realtime quota adapter | Separate token/connect quotas from message, presence, cursor, broadcast, fanout, and disconnect-cleanup quotas. |
| Bot escalation adapter | Consume Cloudflare bot signals only after provider readback and observe-mode proof, and never as a replacement for app policy. |
| Queue/cron/cache/images coordinator | Define queue producer backpressure, consumer retry/DLQ, cron overlap/max runtime, cache-key normalization, origin-miss behavior, and Cloudflare Images unique-transform/spend budgets. |

## Migration Order

| Step | Surface | Reason |
| --- | --- | --- |
| 0 | Frontend interaction inventory | Mark each high-risk UI action with pending, single-flight, idempotency, debounce/throttle, cancellation, cooldown, multi-tab, optimistic rollback, or no-guard rationale. |
| 1 | Shared-link publication helpers | Most mature durable controls; centralize without changing behavior. |
| 2 | Invite entry helpers | Similar durable store and HMAC IP pattern. |
| 3 | AI ask and proposal export | Expensive surfaces already durable. |
| 4 | Upload admission | Replace local-only request/concurrency maps with durable capacity or define local-only as supplemental. |
| 5 | Estimate actions | Preserve burst-friendly editing while making scaled behavior explicit. |
| 6 | Client error intake | Keep fail-soft/drop semantics; add standardized hashing. |
| 7 | Better Auth/contact/email/webhook/internal | Fill `SCE-018` for auth authority/storage/IP/`X-Retry-After`; refresh Cloudflare Email/provider callbacks; keep signature/idempotency first. |
| 8 | Provider identity and advanced-abuse contracts | Fill `SCE-010` through `SCE-020`, `FCE-008`, `FCE-009`, `CP-008`, and `CP-009` before touching shared limiter helpers. |
| 9 | Queue/cron/cache/images and app-denial observability | Fill queue backpressure/DLQ, cron overlap, cache/key, Images transform budget, and `PROOF-RL-030` app event completeness contracts. |
| 10 | Cloudflare adapters | Only after hosted Worker/provider proof, including `PROOF-RL-029` for WAF/Server Action behavior. |

## Behavior Preservation Requirements

- Preserve current user-facing messages unless explicitly changed by a future implementation plan.
- Preserve `Retry-After` on route denials.
- Preserve same-origin and fetch metadata guards.
- Preserve service-role-only table access.
- Preserve fail-closed behavior for AI quota storage unavailability.
- Preserve graceful degradation for email delivery failures.
- Preserve current Cloudflare migration NO-GO gates.
- Preserve Better Auth provider recovery and do not stack app/provider auth lockouts without an explicit `SCE-018` decision.
- Preserve app-side denial event completeness for security/cost surfaces; sampled Workers Logs are not a substitute.
- Preserve explicit idempotency fingerprint/TTL/mismatch behavior for expensive and destructive retryable mutations.
- Preserve resource-version or `If-Match`/ETag-style precondition behavior where lost-update protection is required.
- Preserve retry caps, backoff bounds, `Retry-After` precedence, and no automatic unsafe mutation retry without idempotency.
- Preserve offline queue max count, max age, max bytes, purge rules, and privacy/storage boundaries.
- Preserve `visibilitychange`, focus, reconnect, navigation cleanup, and rollback/kill-switch recomputation for stale client state.
- Preserve tab-local or `BroadcastChannel`/Web Locks choices as optimizations only; server enforcement remains authoritative when browser coordination is absent.
- Preserve keyboard submit, visible focus, screen-reader status, form/draft retention, and no-stuck-disabled recovery for frontend guarded actions.

## Adapter And Response Contract

| Contract | Requirement |
| --- | --- |
| Store adapter result | Return `allowed`, `limited`, `store_error`, or `bypass` with `retryAfterSeconds`, evaluated window, policy ID, and store name. |
| Algorithm/window contract | Store and evaluator adapters must declare fixed-window, sliding-window, token-bucket/GCRA, exact reservation, provider soft limit, or no-generic-quota semantics, including clock source, boundary behavior, burst capacity, multi-window combination, reset/refill, and retry-after math. |
| Resource-budget contract | Each policy must define applicable request, body-byte, item/page-size, duration, concurrency, provider-cost, queue-depth, and circuit-breaker budgets or mark them not applicable with rationale. |
| Route response helper | For route handlers, centralize 429 JSON/native/problem-details body, `Retry-After`, optional draft RateLimit metadata, `Cache-Control: no-store` on sensitive/public surfaces, `Vary`/cache posture, and no provider error details. |
| Server action helper | For Server Functions, return existing action-result shapes or throw the existing domain error type; do not introduce transport-only response assumptions. Each action contract must define same-origin/CSRF posture, direct invocation behavior, and idempotency/replay posture. |
| Quota disclosure posture | Sensitive auth/token/public flows suppress exact remaining/reset values unless explicitly approved; authenticated expensive routes may expose scoped retry timing after leakage review. |
| Auth failed-attempt contract | Auth rows must define what counts as a failed attempt, which successes clear counters, how OAuth/magic callback invalid-state attempts are handled, how provider lockouts coordinate, and how beta/support recovery works. |
| Client cooldown contract | For retryable denials, expose `retryAfterSeconds` or equivalent safe retry timing to the UI; preserve draft/form state; render scoped accessible wait/retry copy; re-enable the operation on expiry or refreshed server state. |
| Retry-After parser contract | Client helpers must parse delay seconds and HTTP-date, reject invalid values, clamp extreme values, account for stale hidden tabs, and refresh server/config state on visibility/focus/reconnect before trusting local expiry. |
| Idempotency mismatch contract | Route/action rows must define same-key/same-fingerprint, same-key/different-fingerprint, concurrent same-key, failed, and expired-key results before enabling automatic retry or offline flush. HTTP route candidates should consider `409` for in-progress conflicts and `422` for changed-payload mismatch; Server Functions keep domain-native result shapes. |
| Precondition conflict contract | Resource-edit rows must define version/precondition inputs and recoverable `409`/`412` UI behavior, or explicitly justify last-writer-wins for that flow. |
| Offline queue contract | Any queue must document max count, max age, max bytes, dedupe key, flush order, purge triggers, storage/privacy class, and server-denial halt behavior. |
| Server-authoritative gate | Every route/action row must name the gate that runs before side effects, provider spend, email send, file write, or destructive mutation. |
| Failure mode | Security, auth, public-token mutation, upload, export, and AI cost controls fail closed; telemetry drops/fails soft. |
| Rollout mode | Every policy supports `off`, `shadow`, `enforce`, and, only for eligible public flows, `challenge`. |
| Env/config ownership | Policy defaults live in code; runtime overrides use a reviewed config source, not scattered env reads. Secret peppers remain in provider secrets. |
| Test clock | Unit tests must inject clock/window state; production code must not depend on global mutable counters for exact quotas. |
| IPv6 and forwarded-header contract | Central identity helper owns `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`, and optional `Sb-Forwarded-For` decisions; app code must not read them ad hoc for limiter keys after migration. |
| Full-jitter retry contract | Any shared retry helper must document server `Retry-After` precedence, capped full-jitter fallback, max attempts, max elapsed time, cancellation, and idempotency requirements for unsafe operations. |
| Cache-fill contract | Any expensive cache/provider fill must declare max waiters, max fill duration, stale/negative cache behavior, and shed status before it is protected only by a request-count limit. |
| Pagination/body protocol contract | Any route/action that can read many rows or parse large/streaming bodies must declare page/count/body/chunk/multipart/transformed-byte budgets before enforcement mode. |

## Data Model Options

| Option | Use |
| --- | --- |
| Existing `security_rate_limit_events` event table | Immediate compatibility and audit. |
| Exact reservation RPC with advisory locks | Strict one-slot or low-rate exact reservations. |
| Aggregated bucket table | Future optimization if event-table count queries become hot. |
| Idempotency key/result table | Expensive/destructive replay protection with TTL cleanup and mismatch audit. |
| Anomaly aggregate table or dashboard materialization | Low-and-slow distributed abuse detection using hashed dimensions and coarse cohorts. |
| Durable Object counters | Future Cloudflare exact counters. |
| D1 ledgers | Future lower-rate metadata after D1 proof. |

## Non-Goals

- No new dependency for rate limiting unless explicitly approved.
- No Redis assumption.
- No provider cutover.
- No replacing Cloudflare migration plan gates.
- No global lock or singleton counter.
- No client-only protection claim for scripted or direct API requests.
