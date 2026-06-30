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

1. Request enters edge/WAF.
2. Optional Turnstile challenge gates suspicious public flows.
3. Route/server action calls a central app policy helper.
4. Helper normalizes actor, resource, and client identity.
5. Helper evaluates one or more windows using the configured store.
6. Helper emits structured allow/deny/near-limit events.
7. Route returns surface-specific response with `Retry-After`.

## App Policy Registry

Future conceptual module: `src/lib/rate-limits/`.

| File concept | Responsibility |
| --- | --- |
| `policies.ts` | Policy IDs, windows, key dimensions, failure mode, rollout mode, response profile. |
| `identity.ts` | Trusted client IP and country extraction, HMAC hashing, proxy/source trust. |
| `stores/postgres.ts` | Current `security_rate_limit_events` implementation and atomic slot helpers. |
| `stores/memory.ts` | Test/dev-only or explicitly local fast path, never production-only for distributed quotas. |
| `stores/cloudflare-worker.ts` | Workers Rate Limiting soft limiter adapter after proof. |
| `stores/durable-object.ts` | Exact Cloudflare counter adapter after proof. |
| `responses.ts` | Route/action result builders, `Retry-After`, no-store headers. |
| `observability.ts` | Events, metrics, redaction, dashboards. |
| `rollout.ts` | shadow/log-only/enforce/challenge modes and kill switches. |

## Header Trust And Identity

The implementation must stop scattering raw header reads. Current patterns differ across publication, invite, upload, AI, and client-error paths. The central identity helper should:

- Accept `Request` or `Headers`.
- Prefer a deployment-specific trusted source order.
- Treat `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip` as configurable by runtime.
- Hash client identifiers with HMAC and a dedicated limiter pepper.
- Record only hashed client values in durable events.
- Record country/ASN only as coarse metadata when needed for operations.

## Store Consistency

| Store | Strength | Use |
| --- | --- | --- |
| Current Postgres events | Durable and queryable, but existing insert/count is not strictly atomic for all windows. | Immediate app limiter and audit trail. |
| Postgres RPC/advisory lock | Stronger atomicity for exact reservations. | One-per-window or strict quota reservations. |
| Process memory | Fast but local and resettable. | Dev/test or supplemental backpressure only. |
| WAF Rate Limiting | Edge mitigation with documented counter delay. | Coarse origin protection. |
| Workers Rate Limiting | Fast per-location eventual soft limit. | Worker-local soft guard, not exact accounting. |
| Durable Objects | Strong per-object coordination with transactional storage. | Exact counters and realtime room limits after proof. |
| D1 | Durable SQLite semantics but not ideal hot counter path. | Metadata, slower ledgers, lower-rate counters after proof. |

## Failure Modes

| Surface type | Store unavailable behavior |
| --- | --- |
| Auth, invite, password, public share mutation, upload, AI, export | Fail closed with safe user message and operational alert. |
| Public read with invalid/missing token | Prefer uniform not-found path; avoid leaking limiter failures. |
| Client error telemetry | Drop/fail soft to protect core app. |
| Webhook/internal jobs | Fail closed for auth/signature; idempotent retry for transient store failure. |

## Cloudflare Migration Boundary

Cloudflare-native enforcement must not outrun the Cloudflare migration package. `wrangler.jsonc:14-80` has proof bindings, and the migration package records local proofs, but production cutover remains NO-GO until hosted Worker, D1/Auth/Realtime, provider resource, cost, performance, observability receipt, secrets, and rollback proof pass.

## Next.js 16 Request Boundary Contract

| Boundary | Planning rule | Source/evidence |
| --- | --- | --- |
| Route Handlers | Treat API route limiters as request-time controls. Non-GET methods are not cached by default, and GET handlers that read runtime data run at request time. | Local Next docs `15-route-handlers.md:85-112`. |
| Server Functions | Do not rely on page/proxy coverage. Server Functions are POST requests to the route where they are used; auth, authorization, input validation, and rate limits belong inside the action/DAL boundary. | Local Next docs `proxy.md:213-215`, `use-server.md:146-155`. |
| Proxy | Proxy can run before routes, but this checkout bypasses `/api` in `src/lib/auth/request-proxy.ts:115-121`; it is not the app-layer limiter. | Local source plus local Next docs `proxy.md:13-21`, `:84-95`. |
| Request APIs | `headers()` and `cookies()` are request-time signals; cached scopes must not become quota stores or hide per-request limiter state. | Local Next docs `headers.md:48`, `cookies.md:69`, `use-cache.md:196`. |
| Runtime | Proxy-runtime guidance in the local Next docs has drift; use the Proxy-specific docs for planning and verify Cloudflare adapter behavior separately. | Local docs `proxy.md:219`, `authentication.md:1124`, `edge.md:11`. |
| Response contract | Sensitive limiter denials must use `Cache-Control: no-store`, no raw identifiers, no token/account existence leaks, and `Retry-After` where retry is allowed. | Plan sections 06, 09, 14, 19. |

## Avoided Designs

- A single global Durable Object for all counters: bottleneck and blast radius.
- WAF-only rate limiting: not exact and has origin overshoot caveats.
- Raw-IP storage: privacy and compliance risk.
- Per-route ad hoc constants without registry: current fragmentation persists.
- Replacing current durable Postgres controls before Cloudflare proof: unnecessary risk.
