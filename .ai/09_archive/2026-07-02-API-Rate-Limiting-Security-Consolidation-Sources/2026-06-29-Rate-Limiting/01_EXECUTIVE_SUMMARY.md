---
title: Executive Summary
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Executive Summary

## Root Problem

Archestimator has multiple high-value public and authenticated surfaces: shared proposal review, invitations, authentication, estimate mutation, upload/image processing, exports, AI, email delivery, webhooks, internal jobs, and future realtime collaboration. Abuse can create cost spikes, degraded client-facing review UX, brute-force or enumeration pressure, mail reputation damage, storage churn, and noisy operational telemetry.

The current codebase already contains rate-limiting work, but it is not one system. Durable historical Postgres-backed limiters exist for share, invite, AI, and export surfaces. Other controls are process-local maps or provider circuit state. Header handling is inconsistent. API routes bypass the request proxy, and the current checkout now includes Better Auth/D1/Cloudflare Email/Queues/Cron/Images/DO bindings, so route-level, server-action-level, and provider-coordinated enforcement remain mandatory.

## Current Shape

| Finding | Evidence | Risk |
| --- | --- | --- |
| API proxy bypass | `src/lib/auth/request-proxy.ts:85-92` returns next for `/api`. | Middleware cannot be treated as API protection. |
| Durable shared-link limiter exists | `src/lib/publication/public-repository.ts:342-489`, `:513-735`. | Good foundation but scattered and Postgres-bound. |
| Durable invite limiter exists | `src/lib/collaboration/invite-entry.ts:147-237`, `:244-316`. | Good foundation but separate from publication policy. |
| In-memory upload limiter exists | `src/lib/uploads/admission-control.ts:24-148`. | Per-process only; not durable across hosts/Workers. |
| In-memory estimate action limiter exists | `src/lib/estimates/action-rate-limit.ts:14-82`. | May undercount in scaled runtime. |
| AI ask quota uses security table | `src/lib/ai/rate-limit.ts:17-79`. | Good control, but fails closed on quota storage outage. |
| Better Auth is current auth runtime candidate | `src/lib/auth/better-auth-cloudflare.ts`, `src/lib/auth/cloudflare-better-auth-runtime.ts`, and `auth-provider-selection.ts`. | Built-in limiter can double-lock users unless coordinated. |
| Email provider path has drifted | Current email code is Cloudflare Email/provider wrapper oriented; older Resend-specific refs are stale. | Delivery idempotency and provider spend controls must be refreshed. |
| Cloudflare operational bindings exist | `wrangler.jsonc` declares D1, R2, DO, Queues, Cron, Images, Email, and sampled observability. | Queue/cron/image/cache/log sampling now affect the rate-limit plan. |
| Frontend repeat-action controls are scattered | Share decisions/comments, notifications, favorites, cursor collaboration, and package-builder have local pending/throttle/idempotency patterns. | Good UX hints exist, but no shared client-control contract or direct-bypass proof requirement exists. |

## Recommended Layered Model

1. **Frontend interaction guards**: pending state, single-flight, idempotency, cancellation, scoped cooldowns, and accessible recovery for accidental repeated user actions. These are UX/backpressure only.
2. **Route/server-action policy registry**: one canonical catalog for surface, actor key, client key, algorithm/window/burst semantics, resource budgets, response profile, logging, and failure mode.
3. **Durable app limiter**: immediate behavior-lock target remains existing durable event patterns and/or a future atomic RPC/slot reservation for exact app quotas; P0 must decide the Postgres/D1/DO path before new enforcement.
4. **Edge coarse mitigation**: WAF Rate Limiting Rules for obvious floods and high-cost public paths.
5. **Human challenge**: Turnstile on suspicious public proposal, invite, auth, contact, and upload paths, with server-side validation.
6. **Cloudflare-native exact path**: existing `CollaborationRoom` DO only for realtime room quota proof; generic exact counters need a separate DO/Postgres/D1 design after hosted proof.
7. **Observability, anomaly, and false-positive loop**: log hashed dimensions, return `Retry-After`, dashboard denials, detect distributed low-and-slow pressure, enforce retention/deletion rules, and run staged shadow/enforce rollout with app-side denial events as primary evidence when Workers Logs are sampled.

## GO / NO-GO

| Area | Verdict | Reason |
| --- | --- | --- |
| Planning package | GO | This package defines scope, inventory, policy, tests, rollout, and traceability. |
| Immediate app implementation | CONDITIONAL GO | Safe only as a separate scoped task that re-validates route inventory and writes tests first. |
| Production enforcement | NO-GO | Thresholds need shadow metrics, false-positive review, and rollback toggles. |
| Cloudflare WAF/Turnstile proof | CONDITIONAL GO | Reversible proof slice; must not imply full provider cutover. |
| Cloudflare exact counter migration | NO-GO | Cloudflare migration package still blocks production cutover on hosted Worker, D1/Auth/Realtime, provider, cost, and performance evidence. |
| Production provider/cutover changes | NO-GO | This package may document Better Auth/Cloudflare current planning inputs, but it does not cancel providers, change DNS, mutate WAF, or claim production Cloudflare readiness. |

## Third-Pass Gap-Closure Update

The pasted 2026-06-30 review found that the second-pass package was coherent but incomplete for provider identity and advanced-abuse planning. This package now carries those themes explicitly instead of burying them under generic resource-budget language:

- IPv6/client identity canonicalization and trusted proxy/header order, including `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`, and Supabase `Sb-Forwarded-For` compatibility decisions.
- Supabase Auth built-in limit enumeration and app/provider lockout coordination before auth, OTP, magic-link, or future MFA enforcement.
- Timing-safe equality, cache-fill stampede control, full-jitter retry, deep pagination/count budgets, `OPTIONS`/CORS posture, realtime message quotas, service-worker/offline replay, chunked/multipart abuse, and Bot Management escalation.

These additions improve planning traceability but do not change the readiness cap: the safe next step is still a scoped P0 implementation plan with route/action/client/provider contract expansion and tests before any enforcement work.

## Fourth-Pass Gap-Closure Update

The 2026-07-01 audit found four decision-blocking planning gaps caused by current-checkout drift and current provider behavior. This package now carries them explicitly:

- Better Auth built-in limiter coordination, including per-path authority, storage, `cf-connecting-ip`/trusted proxy/IPv6 `/64`, `X-Retry-After`, and server-side `auth.api` bypass behavior.
- Hosted Server Action edge/runtime proof, including OpenNext #1224's `Next-Action` and multipart-body failure signal, Ray-ID/Security Events correlation when edge/WAF behavior is suspected, and narrow CVE-aware skip strategy only if a Cloudflare rule is proven.
- Current inventory refresh for Cloudflare Email, D1, R2, DO, Queues, Cron, Images, sampled Workers Logs, and legacy/stale Resend/Supabase/Vercel references.
- CollaborationRoom DO split: room quota proof may use the existing room DO, while generic exact counters remain a separate future design.
