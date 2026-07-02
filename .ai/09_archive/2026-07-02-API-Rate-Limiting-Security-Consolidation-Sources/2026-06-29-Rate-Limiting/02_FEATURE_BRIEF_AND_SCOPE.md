---
title: Feature Brief And Scope
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Feature Brief And Scope

## Goal

Prepare an abuse-resistant, observable, false-positive-aware rate-limiting design for Archestimator before first users and before any Cloudflare-native migration claims.

## In Scope

| Surface | Why it matters |
| --- | --- |
| Public share links | Public proposal review is client-facing and sensitive to both abuse and false positives. |
| Shared-link session/password/comment/decision/activity/unsubscribe | Brute force, spam, enumeration, repeated reads, and UX trust. |
| Invite create/resend/resolve/continue/accept/sign-out | Enumeration, email abuse, onboarding denial, invite token probing. |
| Auth login, magic link, OAuth callback, account actions | Credential and mail-abuse pressure; Better Auth built-in limits, historical Supabase migration state, and provider recovery boundaries must be coordinated. |
| Contact/support | Mailto today, but future server intake needs spam controls and Turnstile planning. |
| Uploads/images/attachments | Storage, image transform, scan, signed upload, and concurrency costs. |
| XLSX proposal export | CPU/DB-heavy Excel generation. |
| AI ask and package-builder | Token/provider spend and data read fanout. |
| Email/digest/resend | Cloudflare Email/provider reputation, retry storms, circuit breaking, and stale Resend-era assumptions that must be refreshed. |
| Webhooks | Signature, replay, idempotency; rate limiting is secondary. |
| Internal cron/jobs and queues | Secret/signature auth, replay/idempotency, job duplication, queue backpressure, consumer retry/DLQ, and cron overlap; request-count rate limiting is secondary. |
| Server actions | Authenticated mutation and read-fanout surfaces outside API route handlers. |
| Frontend/client interaction controls | Repeat-click, Enter-submit, multi-tab, retry, cancellation, idempotency, cooldown, and accessibility behavior before requests leave the browser. |
| Realtime/current Durable Objects | Existing `CollaborationRoom` DO for room transport/fanout quota proof, plus separate future generic counter design. |
| Current durable limiter history | `security_rate_limit_events` and related helper functions, subject to P0 store-path decision during Cloudflare/D1 migration. |
| Future Cloudflare architecture | WAF, Workers Rate Limiting, Turnstile, Durable Objects, D1, Observability, Queues, Cron, Images, and cache interactions. |
| HTTP/resource/auth standards | Response profile, draft RateLimit metadata posture, RFC 9457 compatibility, resource budgets, auth recovery, cache/CDN safety, low-and-slow escalation, and retention/deletion handling. |
| Provider identity and advanced-abuse gap closure | IPv6 prefix-aware identity, Supabase Auth built-in limit coordination, `Sb-Forwarded-For`, timing-safe equality, cache-fill stampede controls, full-jitter retry, MFA/OTP bombing, deep pagination/count, `OPTIONS`, realtime message rates, service-worker replay, chunked/multipart body handling, and bot-management escalation governance. |
| Better Auth and fourth-pass provider drift closure | Better Auth limiter authority/storage/IP/`X-Retry-After`, WAF/Server Action hosted proof, migration identity unification, sampled Workers Logs, queue/cron/cache/images refinements, and current-checkout inventory drift. |

## Out Of Scope

- Implementing code, migrations, tests, scripts, provider resources, environment variables, or deployments.
- Treating client-side disabled state, debouncing, cooldowns, or local locks as authoritative security controls.
- Assuming paid plan availability or production Cloudflare entitlements.
- Changing, canceling, or cutting over production providers, DNS, WAF rules, Better Auth configuration, D1/DO schemas, Cloudflare Email, Queues, Cron, Images, Supabase/Postgres remnants, Resend-era paths, or Vercel metadata from this planning pass.
- Production cutover or provider cancellation.
- Business-tier quotas or paid-plan pricing policy.
- Final production threshold approval.

## Acceptance Criteria For A Future Implementation Plan

- One policy source of truth for route and server-action controls.
- Consistent client identity extraction and proxy trust rules.
- Durable exact counters for security-sensitive or expensive surfaces.
- Explicit algorithm/window/burst/reset semantics for every policy.
- Per-route/action HTTP response profile, quota metadata disclosure posture, cache/CDN profile, and resource budget dimensions.
- Client-side pending, single-flight, idempotency, cooldown, cancellation, and accessibility contracts for high-risk UI actions, always paired with server-side proof.
- Clear fail-open/fail-closed behavior per surface.
- Observable denial and near-limit events.
- Auth failed-attempt recovery and provider-lockout coordination before auth/contact enforcement.
- Better Auth built-in limits, Supabase migration remnants, `Sb-Forwarded-For` behavior, and provider/account configuration refreshed before auth/OTP/magic-link/MFA enforcement.
- WAF/Server Action hosted proof completed before Cloudflare observe data or skip rules are trusted.
- Queue/cron/cache/images and app-side denial-event completeness contracts are filled before implementation starts.
- IPv6 client identity canonicalization masks and hashes before persistence, uses trusted proxy source order, and has a versioned migration/rollback path.
- Cache-fill, retry, pagination/count, preflight, realtime-message, service-worker/offline, multipart/chunked, and bot-escalation contracts are filled before implementation starts.
- Low-and-slow distributed-abuse dashboards and retention/deletion proof before production enforcement.
- False-positive workflows for client reviewers and beta users.
- Rollback switches for every enforcement stage.
