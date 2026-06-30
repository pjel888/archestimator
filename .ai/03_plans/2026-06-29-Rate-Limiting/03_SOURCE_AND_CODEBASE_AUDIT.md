---
title: Source And Codebase Audit
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Source And Codebase Audit

## Project Baseline

| Fact | Evidence |
| --- | --- |
| Runtime baseline is Bun, Next.js 16, React 19, TypeScript, Tailwind, Supabase/Postgres, Cloudflare proof tooling. | `package.json:5`, `package.json:103-156`. |
| Cloudflare proof scripts exist but are evidence gates, not production readiness. | `package.json:9-40`. |
| Vercel cron still declares upload cleanup and scan schedules. | `vercel.json:3-12`. |
| Wrangler proof config includes R2, D1, Durable Object, Queue/Cron, and Observability bindings. | `wrangler.jsonc:14-80`. |
| Cloudflare migration package says planning quality is pass but production cutover remains blocked. | `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/README.md:11-19`, `:86-99`. |

## Proxy And Route Boundary

| Finding | Evidence | Planning impact |
| --- | --- | --- |
| Current proxy entry is middleware plus re-export, not `src/proxy.ts`. | `src/middleware.ts:1-7`, `src/proxy/index.ts:1`. | Prompt-era file path is stale. |
| Request proxy bypasses `/api`. | `src/lib/auth/request-proxy.ts:115-121`. | API route limiters must be in-handler or at edge/WAF. |
| Public routes include `/invite` and `/share`. | `src/lib/auth/request-proxy.ts:24-27`, `:143-148`. | Public UX needs false-positive-safe limits. |

## Durable App Limiters

| Mechanism | Evidence | Notes |
| --- | --- | --- |
| Shared publication/security scopes | `src/lib/publication/public-repository.ts:342-364`. | Covers snapshots, events, password, activity, export, session, comments, decisions, unsubscribe. |
| Publication limiter writes/cleans/counts events | `src/lib/publication/public-repository.ts:380-489`. | Insert-before-count can overshoot by one; not atomic for multi-window strictness. |
| Publication helper methods | `src/lib/publication/public-repository.ts:513-735`. | Windows are hardcoded near implementation. |
| Invite limiter writes/counts security events | `src/lib/collaboration/invite-entry.ts:147-237`. | Uses HMAC for IP hash. |
| Invite limiter public helpers | `src/lib/collaboration/invite-entry.ts:244-316`. | Create/resend/resolve/continue/accept. |
| AI ask quota | `src/lib/ai/rate-limit.ts:17-79`. | Uses `security_rate_limit_events`; fails closed if audit storage unavailable. |
| Proposal export limiter | `src/lib/publication/public-repository.ts:528-548`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:374-380`. | Protects heavy XLSX route. |
| Rate-limit table | `supabase/migrations/20260601003000_security_rate_limit_events.sql:1-19`. | Service-role only. |
| Atomic single-slot helper | `supabase/migrations/20260621112542_shared_link_atomic_publish_and_digest_slot.sql:5-52`. | Useful pattern for future exact reservations. |

## Process-Local Limiters And Circuit State

| Mechanism | Evidence | Risk |
| --- | --- | --- |
| Upload admission request/concurrency maps | `src/lib/uploads/admission-control.ts:24-148`. | Per-process only, not distributed. |
| Estimate action buckets | `src/lib/estimates/action-rate-limit.ts:14-82`. | High-frequency editing can undercount across instances. |
| Shared-link password in-memory hard lockout | `src/lib/publication/security.ts:549-626`. | Supplements durable events but resets on process restart. |
| Client error intake map | `src/app/api/internal/client-error/route.ts:8-57`, `:111-118`. | Protects logging endpoint locally only. |
| Email circuit breaker state | `src/lib/email/resend-client.ts:71-127`. | Protects a process; not account-wide. |

## Header And Key Handling

| Area | Evidence | Gap |
| --- | --- | --- |
| Publication country headers | `src/lib/publication/public-repository.ts:286-287`. | Reads Vercel and Cloudflare country headers. |
| Publication request IP | `src/lib/publication/public-repository.ts:509-511`; `src/lib/publication/security.ts:575-578`. | Header order differs from other modules. |
| Invite IP hash | `src/lib/collaboration/invite-entry.ts:114-140`. | Stronger HMAC, but fallback path uses secrets with different intent. |
| Upload IP extraction | `src/lib/uploads/admission-control.ts:34-39`. | Uses `cf-connecting-ip` before `x-real-ip`. |
| AI quota client key | `src/lib/ai/rate-limit.ts:49`. | Reuses publication `getClientIp`, so it inherits that header order. |

## Missing Or Changed Prompt Targets

- `src/proxy.ts`: absent; use `src/middleware.ts`, `src/proxy/index.ts`, and `src/lib/auth/request-proxy.ts`.
- `src/app/api/share/[token]/recipient-session/route.ts`: absent; current path is `src/app/api/share/[token]/session/route.ts`.
- `src/app/api/share/[token]/snapshot/route.ts`: absent; current snapshot-like GET is `src/app/api/share/[token]/route.ts`.

## Audit Conclusion

The repo already has a usable durable security-events substrate, but implementation readiness is blocked by scattered policy, mixed key derivation, process-local limiters, non-atomic insert/count patterns, and Cloudflare production gates. The safest next implementation phase is central policy and identity normalization around existing controls, not immediate provider migration.

## Third-Pass Gap Scan On 2026-06-30

| Topic | Local evidence | Planning implication |
| --- | --- | --- |
| IPv6 limiter identity | `rg` found IPv6 only in `supabase/config.toml` comments, not in app limiter identity helpers. | `SCE-010` must define IPv6 parse/canonicalize/mask-before-HMAC behavior before source edits. |
| `Sb-Forwarded-For` | `rg` found no app source usage of `Sb-Forwarded-For`; current auth actions read `x-forwarded-for` directly. | `SCE-011` must decide whether Supabase Auth forwarding is enabled and prove the server-client `sb_secret_*` constraint. |
| Trusted header order | Header extraction differs across `src/lib/publication/security.ts`, `src/lib/collaboration/invite-entry.ts`, `src/lib/uploads/admission-control.ts`, `src/lib/publication/actions.ts`, and share route handlers. | P0 needs one trusted-source order with Cloudflare/Vercel/Supabase compatibility and route tests. |
| Timing-safe equality | `timingSafeEqual` exists in `src/lib/publication/security.ts`, `src/lib/ai/package-builder/draft-token.ts`, and `src/lib/collaboration/pending-invite.ts`, but not as a package-wide limiter contract. | `SCE-013` must define where timing-safe equality and response-time parity are mandatory. |
| Multipart/resumable upload | `src/lib/uploads/session-strategy.ts` and `src/lib/uploads/provider-portability.ts` include multipart/resumable concepts. | `SCE-017` must distinguish legitimate resumable uploads from abuse and define part/session/cleanup budgets. |
| Retry behavior | Route handlers emit `Retry-After`, but source scan did not find a shared full-jitter retry helper for limiter clients/workers. | `FCE-008` and `PROOF-RL-020` must define server-hint precedence and jittered fallback. |
| Deep pagination/count | Source scan found `.range(...)` list queries and `COUNT(*)` in Cloudflare proof routers, but no rate-limiting package contract for deep pagination/count abuse. | `SCE-014` must require page-depth, count, index, and timeout answers before list/search/export enforcement. |
| Realtime message rates | Collaboration/realtime modules exist, but this scan did not find a global per-message/presence/fanout quota contract. | `SCE-016` must separate token/connect limits from room message-rate limits. |
| Service-worker replay | No stable app service-worker replay handling surfaced in the scan. | `FCE-009` must either record a no-SW proof or define offline/background replay caps if introduced. |
| Bot escalation | Bot heuristics are local to publication/security paths; no global Bot Management proof or entitlement evidence exists. | `CP-008` keeps bot products observe-first and provider-proof gated. |
