---
title: Source And Codebase Audit
plan_id: 2026-06-29-cloudflare-migration-codex
document: 03
---

# Source And Codebase Audit

## Baseline Stack Evidence

`README.md:30-43` identifies the current stack:

- Next.js 16.2.6 App Router/RSC.
- React 19.2.6.
- Bun.
- TypeScript.
- Tailwind CSS v4.
- Supabase/PostgreSQL 17.
- Supabase Auth.
- TanStack Query and Zustand.
- Resend.
- Bun/Vitest/Playwright validation.

`README.md:35` and `README.md:180` still say 67 local migration files. Live read-only count on 2026-06-29 found:

- `supabase/migrations`: 181 SQL files.
- `supabase/migrations-pending-review`: 15 SQL files.

This count gap should be corrected in a separate documentation cleanup, not in this planning task.

## Core Architecture Evidence

`README.md:168-174` states the architecture:

- Server actions handle writes.
- TanStack Query caches server state with optimistic rollbacks.
- Zustand stores high-frequency UI state.
- Supabase Realtime broadcasts cursor positions and presence.
- RLS on every user-data table enforces access.

Provider migration impact: replacing Supabase is not only a database port. It changes auth, authorization, generated types, realtime, storage, RPCs, and provider-readback proof.

## Package And Script Evidence

`package.json:26` generates Supabase types from project `ebxxqidacheyapmmzavr`.

`package.json:45-55` defines launch checks for Supabase readiness, backups, migrations, support DNS, Vercel env/health/production, legal owner, Resend readiness, and linked Supabase readiness.

`package.json:76-93` includes:

- `@supabase/ssr`
- `@supabase/supabase-js`
- `@vercel/analytics`
- `@vercel/speed-insights`
- `next`
- `react`
- `resend`
- `sharp`

Provider migration impact: readiness scripts and observability assumptions must be replaced or adapted, not deleted.

## Supabase Client Evidence

`src/lib/supabase/server.ts:31-56` creates a Supabase SSR server client with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, request cookies, and instrumented fetch.

`src/lib/supabase/client.ts:4-20` intentionally shares one browser Supabase client so Realtime hooks and auth bridge share a single websocket/auth context.

`src/lib/supabase/service-role.ts:6-24` creates a service-role Supabase client requiring `SUPABASE_SERVICE_ROLE_KEY`.

Provider migration impact:

- Workers environment bindings do not map directly to the current Next/server/client environment split.
- Better Auth cannot be evaluated only as a login UI replacement. It must replace SSR cookie behavior, claims, user identity, session refresh, closed-beta gates, legal terms gates, service-role equivalents, and database authorization identity.

## Auth Proxy Evidence

`src/proxy.ts:39-40` checks for Supabase auth environment variables.

`src/proxy.ts:165-183` creates a Supabase SSR client and reads auth claims.

`src/proxy.ts:194-224` gates closed-beta access and legal terms acceptance for protected routes.

Provider migration impact:

- Cloudflare OpenNext middleware/proxy behavior must be proven in `workerd`.
- Better Auth must provide an equivalent protected-route gate.
- Auth migration must not weaken closed-beta, terms, share, or protected workshop behavior.

## Storage And Image Evidence

`next.config.ts:19-21` and `next.config.ts:32-34` include Supabase domains and websockets in CSP.

`next.config.ts:48-67` derives a Supabase Storage image remote pattern from `NEXT_PUBLIC_SUPABASE_URL`.

`next.config.ts:73-80` declares local image patterns, including `/api/projects/images`.

Known storage routes include:

- `src/app/api/projects/images/route.ts`
- `src/app/api/estimate-row-images/route.ts`
- `src/app/api/component-library/images/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/attachments/direct-upload/route.ts`

Provider migration impact:

- R2 can likely replace some object storage, but signed access, authorization, image optimization, CSP, and upload scan lifecycle must be re-proven.

## Realtime Evidence

Realtime hooks:

- `src/hooks/use-project-presence.ts`
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/hooks/use-estimate-row-update-broadcast.ts`

Provider migration impact:

- D1/KV/R2/Queues do not replace Supabase Realtime.
- A replacement likely requires Durable Objects/WebSockets or a separate realtime provider. That is outside the user's listed stack and must be explicitly scoped.

## Background Job Evidence

`vercel.json:3-11` defines Vercel cron entries:

- `/api/internal/upload-cleanup`
- `/api/internal/upload-scan`

Related files:

- `src/app/api/internal/upload-scan/route.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/app/api/internal/upload-runtime/route.ts`
- `src/lib/uploads/scan-job.ts`

Provider migration impact:

- Cloudflare Queues can be a good fit for retryable jobs, but schedule, retry, idempotency, poison message handling, and proof scripts must be designed.

## Email Evidence

`src/lib/email/resend-client.ts:42-56` reads Resend configuration and enablement flags.

`src/lib/email/resend-client.ts:71-100` implements an email circuit breaker.

`src/lib/email/resend-client.ts:118-215` sends email through Resend and returns structured failures.

Other email surfaces:

- `src/app/api/webhooks/resend/route.ts`
- `src/lib/email/resend-webhooks.ts`
- `scripts/check-resend-readiness.ts`
- `tests/vitest/resend-readiness-*`
- `tests/vitest/resend-webhook-*`

Provider migration impact:

- Cloudflare Email Service must prove outbound send, verified domains, webhooks/events, bounces, retries, suppression, analytics, circuit breaker semantics, and test mocking.

## Highest-Risk Existing Couplings

1. Supabase Auth + RLS + RPC + Storage + generated types.
2. Supabase Realtime for collaboration.
3. Upload signed-session/scan lifecycle and provider proof.
4. Vercel cron for scheduled internal jobs.
5. Resend webhook/event contracts.
6. Next.js 16 platform semantics and Cloudflare adapter fidelity.
