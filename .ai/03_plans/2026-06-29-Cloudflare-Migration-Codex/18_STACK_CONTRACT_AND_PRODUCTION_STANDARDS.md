---
title: Stack Contract And Production Standards
plan_id: 2026-06-29-cloudflare-migration-codex
document: 18
---

# Stack Contract And Production Standards

## Current Stack Contract

Archestimator currently treats these as one production system:

- Next.js 16.2.6 App Router/RSC.
- React 19.2.6.
- Bun package/test runner.
- TypeScript strict.
- Tailwind v4.
- Supabase Postgres/Auth/Storage/Realtime.
- TanStack Query.
- Zustand.
- Resend.
- Vercel deployment/runtime/cron/analytics checks.

Any Cloudflare migration must preserve the contracts below or replace them with reviewed equivalents.

## Next.js Contract

- App Router routes and route handlers must behave the same.
- Server Components and Server Actions must be proven on target runtime.
- `src/proxy.ts` behavior must be proven in the target runtime.
- Cookies and headers must behave the same for auth and terms gates.
- Image optimization and local/remote image patterns must be tested.
- CSP/security headers must be preserved.
- Cache/revalidation behavior must be explicit.
- Local `next dev` is insufficient for Cloudflare runtime proof.

## React/TanStack/Zustand Contract

- Optimistic updates must preserve rollback behavior.
- Client state must not become server authority.
- Realtime-driven state must have a replacement before Supabase Realtime removal.
- Loading and error states must not regress.

## Supabase/Postgres Contract

- RLS-equivalent protection is mandatory.
- RPC-equivalent transaction behavior must be proven.
- Generated type strategy must remain accurate.
- Service-role/admin paths must remain isolated.
- Backup/restore and provider-readback proof must remain available.
- Database project boundary remains Archestimator only unless explicitly changed by owner.

## Cloudflare Contract

Global:

- Refresh official Cloudflare docs, changelogs, Wrangler schema, and product-specific skill guidance before exact pricing, limits, API fields, config, or binding decisions.
- Prefer platform bindings, service bindings, and scoped secrets over Cloudflare REST calls from runtime code.
- Do not hand-write Worker binding interfaces when generated types can be produced from config.
- Keep local simulation, Cloudflare preview, provider readback, and production evidence separate.

Workers:

- Bindings and environment variables must be scoped per environment.
- CPU, memory, subrequests, duration, and `waitUntil()` limits must be monitored.
- Sidecars must have rollback.
- Use `wrangler.jsonc`, current compatibility date/flags, generated `Env` types, and structured observability for any Worker slice.
- Avoid module-level mutable request state, floating promises, unbounded body reads, and `Math.random()` for security-sensitive values.

D1:

- Treat as SQLite, not Postgres.
- Do not rely on RLS/RPC/triggers/realtime parity.
- Use only after compatibility proof.

KV:

- Use only for eventually consistent cache values.
- Never use for permissions, sessions, locks, or strong counters.

R2:

- Keep objects private by default.
- Authorize through app logic.
- Track object count/bytes/ops.
- Reconcile DB/object state.

Queues:

- Every message has idempotency.
- Every consumer handles duplicates and retries.
- Every queue has failure visibility.

Hyperdrive:

- Use only for Worker-to-external-Postgres/MySQL.
- Do not treat as D1 or general database acceleration.

Email Service:

- Distinguish inbound routing from outbound transactional sending.
- Prove deliverability, event handling, and failure semantics before replacing Resend.

WAF/DDoS:

- Stage rules carefully.
- Monitor false positives and fail-open behavior.
- Keep rollback route.

## Production Standard

No Cloudflare slice is production-ready until it has:

- Current official-doc, product changelog, installed skill, Wrangler schema, and Workers type check.
- Local repo impact map.
- Targeted test plan.
- Provider proof.
- Security review.
- Rollback.
- Observability.
- Cost model update.
