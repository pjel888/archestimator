---
title: Blast Radius And Dependencies
plan_id: 2026-06-29-cloudflare-migration-codex
document: 10
---

# Blast Radius And Dependencies

## Provider Dependency Table

| Surface | Current provider | Cloudflare candidate | Blast radius |
| --- | --- | --- | --- |
| App runtime | Vercel/Next.js | Workers + OpenNext | Broad |
| Database | Supabase Postgres | D1 or external Postgres through Hyperdrive | Critical |
| Auth | Supabase Auth | Better Auth | Critical |
| Authorization | Postgres RLS + app checks | App-layer authz + D1/DB checks | Critical |
| Realtime | Supabase Realtime | Durable Objects/WebSockets or separate provider | Broad |
| Object storage | Supabase Storage | R2 | Broad |
| Cache | Next/TanStack/Supabase/client | KV + Cloudflare cache + existing app cache | Moderate |
| Background jobs | Vercel cron routes | Queues + Workers/Cron Triggers | Moderate |
| Email | Resend | Cloudflare Email Service | Moderate |
| WAF/DDoS | Vercel/platform + app | Cloudflare WAF/DDoS | Moderate |
| Analytics | Vercel Analytics/Speed Insights | Cloudflare Analytics/Logs or alternative | Moderate |

## Critical Product Domains

Estimating and cost library:

- Server Actions and repositories.
- RPC-heavy reads/writes.
- RLS and workspace isolation.
- Optimistic UI rollback.

Collaboration:

- Invites and permissions.
- Realtime presence and cursors.
- Audit events.

Publication/share:

- Hashed tokens.
- Optional passwords.
- Recipient emails.
- Comments, responses, decisions.
- Sensitive route cache control.

Uploads:

- Signed upload sessions.
- Private/public asset access.
- Scan lifecycle.
- Cleanup jobs.
- Storage policies.

Auth/security:

- Supabase claims.
- Closed-beta access.
- Terms acceptance.
- Service-role operations.
- Dev bypass in local/test contexts.

## Dependency Notes

D1 cannot be evaluated only by schema conversion. It depends on:

- RLS replacement.
- RPC replacement.
- Transaction and trigger replacement.
- Realtime replacement.
- Generated type replacement.
- Backup/restore replacement.

Full-native Cloudflare proof depends on:

- Next-on-Workers route/runtime parity.
- D1 data authority redesign.
- Better Auth session and identity parity.
- Durable Objects/WebSockets realtime room design.
- R2 private object authorization.
- Queue/Cron idempotency.
- Email Service deliverability and event parity.
- WAF/rate-limit/Turnstile false-positive handling.
- Web Analytics/Workers Observability replacement for current speed/readiness checks.

Better Auth cannot be evaluated only by login success. It depends on:

- SSR cookie/session semantics.
- `src/proxy.ts` route gate behavior.
- OAuth/magic link parity.
- User claims and email identity.
- Admin/service-role workflows.
- Database identity for authorization.

R2 cannot be evaluated only by upload/download. It depends on:

- Private asset authorization.
- Signed URL/session semantics.
- Image optimization behavior.
- Scan/cleanup lifecycle.
- CSP/image remote patterns.

Queues cannot be evaluated only by message delivery. They depend on:

- Idempotency.
- Retry policy.
- Duplicate handling.
- Job visibility.
- Dead-letter/recovery design.
