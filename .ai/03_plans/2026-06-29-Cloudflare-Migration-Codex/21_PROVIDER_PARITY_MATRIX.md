---
title: Provider Parity Matrix
plan_id: 2026-06-29-cloudflare-migration-codex
document: 21
---

# Provider Parity Matrix

| Current capability | Current implementation | Cloudflare candidate | Parity status | Required proof |
| --- | --- | --- | --- | --- |
| Next.js app runtime | Vercel/Next.js | Workers + OpenNext | Unknown | Route/runtime proof |
| Server Actions | Next.js origin | Workers + OpenNext | Unknown | Mutation/action tests |
| Proxy auth gate | `src/proxy.ts` + Supabase claims | Workers/OpenNext middleware + Better Auth/Supabase | Unknown | Protected route proof |
| Auth | Supabase Auth | Better Auth | Unknown | OAuth, magic link, SSR session, claims, admin proof |
| Database | Supabase Postgres | D1 or external Postgres | Not equivalent | Schema/RLS/RPC compatibility proof |
| RLS | Postgres RLS | App-layer authz or redesign | Missing | Cross-workspace denial proof |
| RPCs | Postgres functions | App code/D1 SQL/Workers | Unknown | RPC behavior matrix |
| Service role | Supabase service role | Better Auth/admin/DB service path | Unknown | Admin isolation proof |
| Generated DB types | Supabase CLI | D1/Drizzle/Kysely/custom | Unknown | Typegen strategy |
| Realtime presence/cursors | Supabase Realtime | Durable Objects/WebSockets or other | Missing from listed stack | Realtime architecture proof |
| Object storage | Supabase Storage | R2 | Plausible | Signed/private access, scan, image proof |
| Image remote patterns | Next image config + Supabase URLs | R2/custom domain/Image service | Unknown | Image rendering and CSP proof |
| Cache | Next/TanStack/current | KV/Cloudflare cache | Partial | Stale/read-your-write proof |
| Background jobs | Vercel cron routes | Queues + Workers/Cron Triggers | Plausible | Idempotency/retry/dead-letter proof |
| Worker config and bindings | Vercel env + server runtime | Wrangler config, bindings, secrets, generated `Env` types | Unknown | Schema/type/preview proof |
| DB acceleration | Direct Supabase client | Hyperdrive to external Postgres | Conditional | Worker-to-Postgres proof |
| Email sending | Resend | Cloudflare Email Service | Unknown | Deliverability, event, webhook, failure proof |
| Email webhooks | Resend webhook route | Cloudflare events/webhooks if available | Unknown | Event parity proof |
| WAF/DDoS | Current host/app/platform | Cloudflare WAF/DDoS | Plausible | Rule staging and false-positive proof |
| Analytics/speed | Vercel Analytics/Speed Insights | Cloudflare Analytics/Logs or other | Unknown | Metrics replacement proof |
| Backups/restore | Supabase posture | D1 Time Travel/R2/object backup/custom | Unknown | Restore rehearsal |

## Parity Summary

Likely good candidates:

- WAF/DDoS/front door.
- R2 for bounded object storage.
- Queues for idempotent jobs.
- Workers sidecars.
- Hyperdrive only if Workers use external Postgres.

Needs proof:

- Full Next.js runtime on Workers.
- Better Auth replacement.
- Cloudflare Email Service replacement.
- Analytics/readiness script replacement.

High-risk or missing:

- D1 for core Postgres/RLS/RPC data.
- Realtime replacement.
- RLS-equivalent authorization model.
