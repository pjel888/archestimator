---
title: Executive Summary
plan_id: 2026-06-29-cloudflare-migration-codex
document: 01
---

# Executive Summary

## Verdict

Cloudflare is worth pursuing, but not as a single-stack replacement yet.

The practical route is a staged migration:

1. Adopt Cloudflare at the front door first: DNS, CDN, WAF, DDoS, rate limiting, and selected cache rules.
2. Pilot R2 for object storage in a bounded asset class.
3. Pilot Queues for background jobs currently represented by Vercel cron routes.
4. Use Workers for sidecar services before hosting the entire Next.js app there.
5. Keep Supabase Postgres as the source of truth until D1/Better Auth/Realtime replacement proof is complete.

Readiness classification: **CONDITIONALLY READY** for discovery and proof spikes. **NOT READY** for full cutover.

## Why Not Big-Bang

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
- Current repo count: 181 SQL files in `supabase/migrations` and 10 SQL files in `supabase/migrations-pending-review`.

## Most Attractive Cloudflare Moves

Near-term:

- WAF/DDoS/CDN in front of existing deployment.
- R2 for large object storage where signed access can be controlled by the app.
- Queues for retryable, idempotent background jobs.
- Workers as isolated edge sidecars for upload signing, webhook ingestion, lightweight API aggregation, or queue consumers.
- KV only for eventually consistent cache entries where stale reads are acceptable.

Medium-term:

- Hyperdrive if Workers need to talk to Supabase Postgres or another external Postgres database.
- Full Next.js-on-Workers proof using Cloudflare's OpenNext adapter.
- Better Auth proof of parity with existing Supabase Auth/session/claims/SSR gates.

Long-term:

- D1 only if the app can tolerate SQLite semantics, per-database size limits, lack of Postgres RLS/RPC/triggers/realtime parity, and a rewritten authorization model.

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

Approve a **Cloudflare discovery and staged proof program**, not a full migration.

The first implementation plan should be a proof program with explicit rollback:

- Phase 0: cost/inventory workbook.
- Phase 1: front-door Cloudflare with no origin/provider replacement.
- Phase 2: R2 and Queues pilots.
- Phase 3: Workers sidecars plus Hyperdrive to existing Postgres if useful.
- Phase 4: Next-on-Workers proof.
- Phase 5: Better Auth/D1 decision gate.
- Phase 6: only then consider production migration slices.
