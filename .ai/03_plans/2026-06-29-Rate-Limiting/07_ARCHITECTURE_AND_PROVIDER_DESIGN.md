---
title: Architecture And Provider Design
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Architecture And Provider Design

## Target Architecture

The target is a layered limiter, not a single mechanism:

0. Client UI applies non-authoritative interaction guards for repeated clicks, duplicate submits, request cancellation, and retry UX.
1. Request enters edge/WAF.
2. Optional Turnstile challenge gates suspicious public flows.
3. Route/server action calls a central app policy helper.
4. Helper normalizes actor, resource, and client identity.
5. Helper evaluates one or more algorithms/windows using the configured store and any resource-budget dimensions.
6. Helper emits structured allow/deny/near-limit/anomaly events.
7. Route returns the chosen response profile with `Retry-After` where retryable and quota metadata only where disclosure is safe.

Fourth-pass update on 2026-07-01: auth surfaces add an explicit provider-authority step before app policy evaluation. If Better Auth's built-in limiter is authoritative for a path, the app policy must avoid a duplicate lockout and must normalize Better Auth's `X-Retry-After` into the selected user-facing response behavior. If app policy is authoritative, Better Auth custom rules/storage/IP header behavior must be configured or disabled so the route has one intended throttle source.

## App Policy Registry

Future conceptual module: `src/lib/rate-limits/`.

| File concept | Responsibility |
| --- | --- |
| `policies.ts` | Policy IDs, algorithms/windows, burst/reset semantics, key dimensions, resource-budget class, failure mode, rollout mode, response profile. |
| `identity.ts` | Trusted client IP and country extraction, HMAC hashing, proxy/source trust. |
| `stores/postgres.ts` | Current `security_rate_limit_events` implementation and atomic slot helpers. |
| `stores/better-auth.ts` | Adapter/coordination layer for Better Auth built-in limiter decisions, storage mode, custom rules, and `X-Retry-After` handling; never assumes server-side `auth.api` calls are rate-limited. |
| `stores/d1.ts` | D1 metadata/low-churn ledger candidate after query-budget and hot-key proof; not a blind port of Postgres event counting. |
| `stores/memory.ts` | Test/dev-only or explicitly local fast path, never production-only for distributed quotas. |
| `stores/cloudflare-worker.ts` | Workers Rate Limiting soft limiter adapter after proof. |
| `stores/durable-object.ts` | Exact Cloudflare counter adapter after proof. |
| `responses.ts` | Route/action result builders, `Retry-After`, optional Problem Details, draft RateLimit metadata posture, cache profile, no-store headers. |
| `resource-budgets.ts` | Request count, body byte, item/page-size, duration, concurrency, provider-cost-unit, queue-depth, and circuit-breaker contracts. |
| `observability.ts` | Events, metrics, redaction, dashboards, low-and-slow anomaly signals, retention/deletion proof fields. |
| `rollout.ts` | shadow/log-only/enforce/challenge modes and kill switches. |

## Frontend Interaction Guard Boundary

Future frontend controls should live in a small shared client pattern, not as new security logic in every component. The goal is to reduce accidental duplicate pressure while leaving enforcement at the server boundary.

| Client concern | Planning rule |
| --- | --- |
| Pending buttons/forms | Use existing button/form primitives and React pending state where possible. Disable only the triggering control or operation group, not unrelated app regions. |
| Single-flight operations | Key by action, actor, and resource. Joining, dropping, or reusing an in-flight request is valid only for the same user intent. |
| Debounce/throttle | Use for non-critical reads, telemetry, collaboration cursors, search, and autosave. Do not debounce destructive confirmation in a way that hides whether the click worked. |
| Cancellation | Use browser-native abort/latest-wins behavior for superseded reads and previews. Treat cancellation as bandwidth/backpressure only because the server may already have received the request. |
| Idempotency | Required for expensive or destructive retries: upload session init/finalize, export, AI package Apply, publication email/send, decision submit, and bulk mutations. |
| `Retry-After` | Route headers or action result payloads must be translated into scoped cooldown UI with accessible status. |
| Multi-tab | Use same-origin coordination only for high-cost duplicate work such as uploads, exports, AI Apply, and bulk destructive actions. Server enforcement remains authoritative. |
| Programmatic bypass | Future tests must call the route/action directly while the UI would be disabled and prove server denial or idempotency. |
| Same-origin and CSRF posture | Each browser-origin mutation must declare its server-side origin, Fetch Metadata, CSRF token, content-type, and body-size posture or an explicit exemption. |

## Header Trust And Identity

The implementation must stop scattering raw header reads. Current patterns differ across publication, invite, upload, AI, and client-error paths. The central identity helper should:

- Accept `Request` or `Headers`.
- Prefer a deployment-specific trusted source order.
- Treat `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip` as configurable by runtime.
- Hash client identifiers with HMAC and a dedicated limiter pepper.
- Record only hashed client values in durable events.
- Record country/ASN only as coarse metadata when needed for operations.
- Parse IPv4 and IPv6 with a structured parser rather than string-prefix logic.
- Normalize IPv4-mapped IPv6 to the chosen IPv4 representation.
- Mask IPv6 before HMAC, defaulting to `/64` unless P0 records provider/account evidence for `/56` or `/48`.
- Use explicit separators such as `|` and a version tag in HMAC input material to avoid ambiguous composite keys.
- Decide whether Supabase Auth server clients pass `Sb-Forwarded-For`, and only through the documented `sb_secret_*` server-key path.
- Align Better Auth `advanced.ipAddress` with the same source order, especially `cf-connecting-ip`, trusted proxy handling, IPv6 `/64`, and IPv4-mapped IPv6 behavior.

## Advanced Abuse Control Boundary

| Boundary | Architectural rule |
| --- | --- |
| Timing-safe comparison | Token, signature, invite, password, draft-token, and challenge comparisons that protect secret material must use timing-safe equality or an equivalent constant-envelope wrapper; length mismatch still follows the same response profile. |
| Cache-fill stampede | Expensive reads and provider fills need a local or durable single-flight/coalescing plan before rate-limit enforcement changes user-visible behavior. |
| Retry and backoff | Server-provided `Retry-After` wins; fallback retry uses capped full jitter and requires idempotency for unsafe mutations. |
| Pagination and counts | List/search/export routes define max page size, max depth, count policy, timeout, and index proof before resource policies enforce. |
| Protocol/body budget | `OPTIONS`, missing `Content-Length`, chunked transfer, multipart/resumable uploads, and transformed bytes are explicit resource-budget dimensions, not generic "request count" cases. |
| Realtime and offline replay | Realtime connect quotas do not cover per-message/presence/fanout abuse; service-worker/offline replay is either proven absent or bounded by queue/idempotency/purge contracts. |
| Bot escalation | Bot Management or Bot Fight products are escalation layers after app policy and observe-only evidence, not source-of-truth enforcement. |

## Store Consistency

| Store | Strength | Use |
| --- | --- | --- |
| Current Postgres events | Durable and queryable historical behavior, but existing insert/count is not strictly atomic for all windows and the app is migrating toward Cloudflare data stores. | Immediate behavior-lock and audit reference unless P0 chooses a different current durable store. |
| Postgres RPC/advisory lock | Stronger atomicity for exact reservations. | One-per-window or strict quota reservations. |
| Process memory | Fast but local and resettable. | Dev/test or supplemental backpressure only. |
| Better Auth built-in limiter | Provider/library-native auth throttling with default and path-specific rules, storage choices, and `X-Retry-After`. | Auth paths only, after `SCE-018` selects authority, storage, IP headers, and recovery behavior. |
| WAF Rate Limiting | Edge mitigation with documented counter delay. | Coarse origin protection. |
| Workers Rate Limiting | Fast per-location eventual soft limit. | Worker-local soft guard, not exact accounting. |
| CollaborationRoom Durable Object | Existing Cloudflare room transport/fanout object. | Realtime room quotas only after hosted proof; not a generic limiter. |
| New RateLimitCounter Durable Object | Future exact Cloudflare counter class if P0/P11 selects DO storage. | Generic exact counters after partitioning, transaction, cleanup, and hotspot proof. |
| D1 | Durable SQLite semantics but not ideal hot counter path. | Metadata, slower ledgers, Better Auth database storage, or lower-rate counters after proof. |

## Postgres Sunset And D1/DO Storage Decision

P0 must not assume the existing Postgres `security_rate_limit_events` table can be copied directly into D1. Before implementation, choose one of these paths per limiter class:

| Path | When acceptable | Required proof |
| --- | --- | --- |
| Keep Postgres as limiter-only substrate | Cloudflare data migration is incomplete or hot-counter exactness matters more than provider consolidation. | Current project boundary, migrations, latency, cleanup, and backup/readiness proof. |
| Use Better Auth storage for auth paths only | Better Auth is authoritative for a specific auth route and D1/database storage is configured safely. | `SCE-018` plus dual-provider lockout tests and provider recovery proof. |
| Use D1 for low-churn limiter metadata | Policy is low-rate, query budget is bounded, and hot-key contention is explicitly rejected or sharded. | D1 query-count, latency, backup/restore, and hot-key rejection proof. |
| Use a DO exact counter | Policy needs exact global coordination and can be partitioned by room/resource/policy without singleton hotspots. | Hosted Worker/DO transaction, concurrency, cleanup, and rollback proof. |

## Failure Modes

| Surface type | Store unavailable behavior |
| --- | --- |
| Auth, invite, password, public share mutation, upload, AI, export | Fail closed with safe user message and operational alert. |
| Public read with invalid/missing token | Prefer uniform not-found path; avoid leaking limiter failures. |
| Client error telemetry | Drop/fail soft to protect core app. |
| Webhook/internal jobs | Fail closed for auth/signature; idempotent retry for transient store failure. |

## Cloudflare Migration Boundary

Cloudflare-native enforcement must not outrun the Cloudflare migration package. `wrangler.jsonc:22-96` has proof/current bindings for Images, Email, R2, D1, Durable Objects, Cron, Queues, and Observability, but production cutover remains NO-GO until hosted Worker, Better Auth/D1/Realtime, provider resource, cost, performance, observability receipt, secrets, WAF/Server Action proof, and rollback proof pass.

## Next.js 16 Request Boundary Contract

| Boundary | Planning rule | Source/evidence |
| --- | --- | --- |
| Route Handlers | Treat API route limiters as request-time controls. Non-GET methods are not cached by default, and GET handlers that read runtime data run at request time. | Local Next docs `15-route-handlers.md:85-112`. |
| Server Functions | Do not rely on page/proxy coverage. Server Functions are POST requests to the route where they are used; auth, authorization, input validation, and rate limits belong inside the action/DAL boundary. | Local Next docs `proxy.md:213-215`, `use-server.md:146-155`. |
| Proxy | Proxy can run before routes, but this checkout bypasses `/api` in `src/lib/auth/request-proxy.ts:90`; it is not the app-layer limiter. | Local source plus local Next docs `proxy.md:13-21`, `:84-95`. |
| Request APIs | `headers()` and `cookies()` are request-time signals; cached scopes must not become quota stores or hide per-request limiter state. | Local Next docs `headers.md:48`, `cookies.md:69`, `use-cache.md:196`. |
| Runtime | Proxy-runtime guidance in the local Next docs has drift; use the Proxy-specific docs for planning and verify Cloudflare adapter behavior separately. | Local docs `proxy.md:219`, `authentication.md:1124`, `edge.md:11`. |
| Response contract | Sensitive limiter denials must use safe response profiles, `Cache-Control: no-store`, no raw identifiers, no token/account existence leaks, and `Retry-After` where retry is allowed; draft `RateLimit` metadata and Problem Details are opt-in by surface. | Plan sections 06, 09, 14, 19, 21. |

## Avoided Designs

- A single global Durable Object for all counters: bottleneck and blast radius.
- WAF-only rate limiting: not exact and has origin overshoot caveats.
- Raw-IP storage: privacy and compliance risk.
- Per-route ad hoc constants without registry: current fragmentation persists.
- Replacing current durable Postgres controls before Cloudflare proof: unnecessary risk.
