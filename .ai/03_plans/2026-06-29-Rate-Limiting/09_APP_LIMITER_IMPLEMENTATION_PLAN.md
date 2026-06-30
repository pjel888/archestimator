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
2. Introduce a central policy registry and identity helper without changing thresholds.
3. Migrate one surface at a time behind behavior-preserving tests.
4. Add observability events in shadow mode.
5. Add rollout modes: `off`, `shadow`, `enforce`, `challenge`.
6. Replace process-local production-critical controls with durable stores.
7. Add Cloudflare edge layers only after app-layer behavior is proven.

## Conceptual Module

`src/lib/rate-limits/` should be the only new boundary if implementation proceeds.

| Module | Contract |
| --- | --- |
| `types.ts` | Shared `RateLimitPolicy`, `RateLimitResult`, `RateLimitWindow`, `RateLimitMode`. |
| `policies.ts` | Enumerates all route/action policy IDs and windows. |
| `identity.ts` | Normalizes request identity and hashed dimensions. |
| `evaluate.ts` | Main `checkRateLimit(policyId, context)` function. |
| `stores/postgres-events.ts` | Reuses `security_rate_limit_events`. |
| `stores/postgres-reservation.ts` | Uses advisory-lock/RPC patterns for exact reservations. |
| `stores/memory.ts` | Local dev/test or supplemental-only controls. |
| `stores/cloudflare.ts` | Future Worker/DO adapters after proof. |
| `responses.ts` | NextResponse/action result helpers. |
| `telemetry.ts` | Structured events and redaction. |
| `test-helpers.ts` | Reset/time helpers for tests only. |

## Migration Order

| Step | Surface | Reason |
| --- | --- | --- |
| 1 | Shared-link publication helpers | Most mature durable controls; centralize without changing behavior. |
| 2 | Invite entry helpers | Similar durable store and HMAC IP pattern. |
| 3 | AI ask and proposal export | Expensive surfaces already durable. |
| 4 | Upload admission | Replace local-only request/concurrency maps with durable capacity or define local-only as supplemental. |
| 5 | Estimate actions | Preserve burst-friendly editing while making scaled behavior explicit. |
| 6 | Client error intake | Keep fail-soft/drop semantics; add standardized hashing. |
| 7 | Auth/contact/email/webhook/internal | Add or document appropriate controls around provider/signature/idempotency boundaries. |
| 8 | Cloudflare adapters | Only after hosted Worker/provider proof. |

## Behavior Preservation Requirements

- Preserve current user-facing messages unless explicitly changed by a future implementation plan.
- Preserve `Retry-After` on route denials.
- Preserve same-origin and fetch metadata guards.
- Preserve service-role-only table access.
- Preserve fail-closed behavior for AI quota storage unavailability.
- Preserve graceful degradation for email delivery failures.
- Preserve current Cloudflare migration NO-GO gates.

## Adapter And Response Contract

| Contract | Requirement |
| --- | --- |
| Store adapter result | Return `allowed`, `limited`, `store_error`, or `bypass` with `retryAfterSeconds`, evaluated window, policy ID, and store name. |
| Route response helper | For route handlers, centralize 429 JSON/native body, `Retry-After`, `Cache-Control: no-store` on sensitive/public surfaces, and no provider error details. |
| Server action helper | For Server Functions, return existing action-result shapes or throw the existing domain error type; do not introduce transport-only response assumptions. |
| Failure mode | Security, auth, public-token mutation, upload, export, and AI cost controls fail closed; telemetry drops/fails soft. |
| Rollout mode | Every policy supports `off`, `shadow`, `enforce`, and, only for eligible public flows, `challenge`. |
| Env/config ownership | Policy defaults live in code; runtime overrides use a reviewed config source, not scattered env reads. Secret peppers remain in provider secrets. |
| Test clock | Unit tests must inject clock/window state; production code must not depend on global mutable counters for exact quotas. |

## Data Model Options

| Option | Use |
| --- | --- |
| Existing `security_rate_limit_events` event table | Immediate compatibility and audit. |
| Exact reservation RPC with advisory locks | Strict one-slot or low-rate exact reservations. |
| Aggregated bucket table | Future optimization if event-table count queries become hot. |
| Durable Object counters | Future Cloudflare exact counters. |
| D1 ledgers | Future lower-rate metadata after D1 proof. |

## Non-Goals

- No new dependency for rate limiting unless explicitly approved.
- No Redis assumption.
- No provider cutover.
- No replacing Cloudflare migration plan gates.
- No global lock or singleton counter.
