---
title: Executive Summary
plan_id: 2026-06-29-cloudflare-migration-codex
document: 01
---

# Executive Summary

## Verdict

Cloudflare is worth pursuing as the preferred prelaunch redesign target.

Because Archestimator has not launched and has no external users yet, the team can prepare the higher-risk full-Cloudflare path now. The practical route is not a production big-bang; it is a proof program whose target end state is Cloudflare-native:

1. Host the app on Cloudflare Workers through the current Cloudflare/OpenNext path if route proof passes.
2. Move durable relational data to D1 only through a domain redesign, not schema conversion.
3. Replace Supabase Auth with Better Auth only after SSR/session/claims/closed-beta/invite proof passes.
4. Replace Supabase Realtime with Durable Objects/WebSockets or another Cloudflare-native realtime design.
5. Move storage to R2, background work to Queues/Cron Triggers, email to Cloudflare Email Service, and edge protection to WAF/rate limiting/DDoS/Turnstile.
6. Keep current providers as rollback and comparison surfaces until each proof gate passes.

Readiness classification: **CONDITIONALLY READY** for full-native redesign planning and reversible proof spikes. **NOT READY** for production cutover.

## Why Proof Before Cutover

The current application is not just "Next.js plus SQL." It is a coupled product system:

- Next.js 16.2.6 App Router/RSC, React 19.2.6, Bun, TypeScript, Tailwind v4.
- Supabase/PostgreSQL 17 with RLS everywhere, RPCs, generated types, Auth, Storage, Realtime, service role, provider-readback proof scripts.
- Vercel cron for internal upload cleanup and scan jobs.
- Resend for transactional email plus webhook verification and readiness tests.

Local evidence:

- `README.md:30-43` defines the baseline stack.
- `README.md:168-174` describes server-actions-first writes, TanStack Query, Zustand, Supabase Realtime, and RLS.
- `package.json:45-55` has Supabase/Vercel/Resend launch readiness scripts.
- `src/proxy.ts:165-183` verifies auth with Supabase claims in the route gate.
- `src/lib/supabase/server.ts:31-56` creates request-scoped Supabase SSR clients.
- `src/lib/supabase/client.ts:4-20` shares one browser Supabase client because Realtime auth depends on it.
- `vercel.json:3-11` defines scheduled upload cleanup and scan routes.
- Current repo count: 181 SQL files in `supabase/migrations` and 15 SQL files in `supabase/migrations-pending-review`.

## Target Cloudflare Moves

Preferred target:

- Workers/OpenNext for the main app runtime.
- D1 for redesigned relational domains after RLS/RPC/realtime parity decisions are made.
- Better Auth for auth if Workers + D1/session proof passes.
- Durable Objects/WebSockets for collaboration, presence, cursors, or strongly coordinated realtime rooms.
- R2 for private assets, generated exports, attachments, and image delivery.
- Queues and Cron Triggers for upload scans, cleanup, retries, email fanout, and long-running background jobs.
- KV only for eventually consistent cache/config, never auth/session/permission/lock authority.
- Cloudflare Email Service for outbound email only after deliverability/event proof.
- WAF/rate limiting/DDoS/Turnstile for abuse protection.
- Web Analytics, Workers Observability, logs, and custom metrics for speed and operations proof.

Fallback target:

- Hybrid Cloudflare edge/storage/jobs with Supabase/Vercel/Resend retained if the full-native proof is slower, riskier, or more expensive than expected.
- Workers + external Postgres via Hyperdrive if D1 is rejected for core data.

## Cost Recommendation

Do not claim savings yet. Build a cost workbook first.

Cloudflare can be cheaper for several surfaces, especially R2 egress, Workers static assets, included D1 rows, and Queues at modest volume. But Archestimator's real cost depends on:

- Dynamic requests and CPU.
- Object storage GB and operation class mix.
- Rows read/written and database size.
- Queue operation count.
- Email send volume.
- Cache read/write/list operations.
- WAF plan tier and rate-limit quota needs.
- Whether Supabase Postgres remains as an origin behind Hyperdrive.
- Current Vercel/Supabase/Resend paid plan usage.

## Recommendation

Approve a **full Cloudflare-native redesign proof program**, not a production cutover.

The first implementation plan should be a proof program with explicit rollback:

- Phase 0: source refresh, provider inventory, cost workbook, performance baseline.
- Phase 1: Cloudflare-native target architecture, route map, and rollback map.
- Phase 2: D1 domain redesign and auth/realtime replacement design.
- Phase 3: Next-on-Workers, Better Auth, D1, R2, Queues, Email Service, and Durable Objects proof spikes.
- Phase 4: performance proof against explicit speed budgets.
- Phase 5: only then consider production migration slices.
