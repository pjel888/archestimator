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

The current codebase already contains rate-limiting work, but it is not one system. Durable Supabase/Postgres-backed limiters exist for share, invite, AI, and export surfaces. Other controls are process-local maps or circuit state. Header handling is inconsistent. API routes bypass the request proxy, so route-level and server-action-level enforcement remain mandatory.

## Current Shape

| Finding | Evidence | Risk |
| --- | --- | --- |
| API proxy bypass | `src/lib/auth/request-proxy.ts:120` returns next for `/api`. | Middleware cannot be treated as API protection. |
| Durable shared-link limiter exists | `src/lib/publication/public-repository.ts:342-489`, `:513-735`. | Good foundation but scattered and Postgres-bound. |
| Durable invite limiter exists | `src/lib/collaboration/invite-entry.ts:147-237`, `:244-316`. | Good foundation but separate from publication policy. |
| In-memory upload limiter exists | `src/lib/uploads/admission-control.ts:24-148`. | Per-process only; not durable across hosts/Workers. |
| In-memory estimate action limiter exists | `src/lib/estimates/action-rate-limit.ts:14-82`. | May undercount in scaled runtime. |
| AI ask quota uses security table | `src/lib/ai/rate-limit.ts:17-79`. | Good control, but fails closed on quota storage outage. |
| Email circuit is process-local | `src/lib/email/resend-client.ts:71-127`. | Protects callers but not distributed. |
| Frontend repeat-action controls are scattered | Share decisions/comments, notifications, favorites, cursor collaboration, and package-builder have local pending/throttle/idempotency patterns. | Good UX hints exist, but no shared client-control contract or direct-bypass proof requirement exists. |

## Recommended Layered Model

1. **Frontend interaction guards**: pending state, single-flight, idempotency, cancellation, scoped cooldowns, and accessible recovery for accidental repeated user actions. These are UX/backpressure only.
2. **Route/server-action policy registry**: one canonical catalog for surface, actor key, client key, algorithm/window/burst semantics, resource budgets, response profile, logging, and failure mode.
3. **Durable app limiter**: immediate store remains `security_rate_limit_events` and/or a future atomic RPC/slot reservation for exact app quotas.
4. **Edge coarse mitigation**: WAF Rate Limiting Rules for obvious floods and high-cost public paths.
5. **Human challenge**: Turnstile on suspicious public proposal, invite, auth, contact, and upload paths, with server-side validation.
6. **Cloudflare-native exact path**: Durable Objects for exact counters only after Cloudflare Worker/provider proof gates pass.
7. **Observability, anomaly, and false-positive loop**: log hashed dimensions, return `Retry-After`, dashboard denials, detect distributed low-and-slow pressure, enforce retention/deletion rules, and run staged shadow/enforce rollout.

## GO / NO-GO

| Area | Verdict | Reason |
| --- | --- | --- |
| Planning package | GO | This package defines scope, inventory, policy, tests, rollout, and traceability. |
| Immediate app implementation | CONDITIONAL GO | Safe only as a separate scoped task that re-validates route inventory and writes tests first. |
| Production enforcement | NO-GO | Thresholds need shadow metrics, false-positive review, and rollback toggles. |
| Cloudflare WAF/Turnstile proof | CONDITIONAL GO | Reversible proof slice; must not imply full provider cutover. |
| Cloudflare exact counter migration | NO-GO | Cloudflare migration package still blocks production cutover on hosted Worker, D1/Auth/Realtime, provider, cost, and performance evidence. |
| Removing current providers | NO-GO | Current Cloudflare plan explicitly keeps Vercel/Supabase/Resend as rollback/comparison boundaries. |

## Third-Pass Gap-Closure Update

The pasted 2026-06-30 review found that the second-pass package was coherent but incomplete for provider identity and advanced-abuse planning. This package now carries those themes explicitly instead of burying them under generic resource-budget language:

- IPv6/client identity canonicalization and trusted proxy/header order, including `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`, and Supabase `Sb-Forwarded-For` compatibility decisions.
- Supabase Auth built-in limit enumeration and app/provider lockout coordination before auth, OTP, magic-link, or future MFA enforcement.
- Timing-safe equality, cache-fill stampede control, full-jitter retry, deep pagination/count budgets, `OPTIONS`/CORS posture, realtime message quotas, service-worker/offline replay, chunked/multipart abuse, and Bot Management escalation.

These additions improve planning traceability but do not change the readiness cap: the safe next step is still a scoped P0 implementation plan with route/action/client/provider contract expansion and tests before any enforcement work.
