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
| Auth login, magic link, OAuth callback, account actions | Credential and mail-abuse pressure; current better-auth/Supabase boundary must be respected. |
| Contact/support | Mailto today, but future server intake needs spam controls and Turnstile planning. |
| Uploads/images/attachments | Storage, image transform, scan, signed upload, and concurrency costs. |
| XLSX proposal export | CPU/DB-heavy Excel generation. |
| AI ask and package-builder | Token/provider spend and data read fanout. |
| Email/digest/resend | Provider reputation, retry storms, circuit breaking. |
| Webhooks | Signature, replay, idempotency; rate limiting is secondary. |
| Internal cron/jobs | Secret/signature auth, replay/idempotency, job duplication; rate limiting secondary. |
| Server actions | Authenticated mutation and read-fanout surfaces outside API route handlers. |
| Frontend/client interaction controls | Repeat-click, Enter-submit, multi-tab, retry, cancellation, idempotency, cooldown, and accessibility behavior before requests leave the browser. |
| Realtime/future Durable Objects | Collaboration rooms and per-room counters. |
| Current Postgres limiters | `security_rate_limit_events` and related helper functions. |
| Future Cloudflare architecture | WAF, Workers Rate Limiting, Turnstile, Durable Objects, D1, Observability. |
| HTTP/resource/auth standards | Response profile, draft RateLimit metadata posture, RFC 9457 compatibility, resource budgets, auth recovery, cache/CDN safety, low-and-slow escalation, and retention/deletion handling. |

## Out Of Scope

- Implementing code, migrations, tests, scripts, provider resources, environment variables, or deployments.
- Treating client-side disabled state, debouncing, cooldowns, or local locks as authoritative security controls.
- Assuming paid plan availability or production Cloudflare entitlements.
- Replacing Supabase Auth, Supabase/Postgres, D1, Better Auth, Resend, or Vercel.
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
- Low-and-slow distributed-abuse dashboards and retention/deletion proof before production enforcement.
- False-positive workflows for client reviewers and beta users.
- Rollback switches for every enforcement stage.
