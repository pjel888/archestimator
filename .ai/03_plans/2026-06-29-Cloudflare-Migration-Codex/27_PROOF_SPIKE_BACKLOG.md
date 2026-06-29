---
title: Proof Spike Backlog
plan_id: 2026-06-29-cloudflare-migration-codex
document: 27
---

# Proof Spike Backlog

This backlog is the execution order before production migration. Each spike must be reversible and must preserve current providers as fallback.

## P0: Inventory, Cost, And Baseline

Goal: know what exists before moving it.

Pass criteria:

- `26_INVENTORY_WORKSHEETS.md` has completed rows for the first selected slice.
- Current Vercel/Supabase/Resend cost and usage data is captured.
- Baseline speed measurements exist for public, share, workshop, estimate, upload, realtime, and email paths.
- Official Cloudflare docs, Wrangler schema, Workers types, and installed Cloudflare skills are refreshed.

Fail criteria:

- Provider dashboard data is unavailable.
- Route/provider ownership is unknown for the chosen slice.

## P1: Workers/OpenNext Runtime Proof

Goal: prove the app can run on Cloudflare Workers without runtime surprises.

Pass criteria:

- App Router, RSC, Server Actions, route handlers, proxy/middleware, cookies/headers, image config, CSP, env/bindings, error routes, and cache behavior match current expectations.
- `wrangler.jsonc`, generated `Env` types, compatibility flags, secrets, and observability config are present in the proof artifact.
- Worker startup, CPU, duration, memory, and subrequest evidence is captured.

Fail criteria:

- Protected-route auth or Server Actions cannot be proven.
- Required Next.js behavior is unsupported or unstable.

## P2: Better Auth Route-Gate Proof

Goal: replace Supabase Auth in the smallest realistic slice.

Pass criteria:

- OAuth/magic/session/logout/refresh work on Workers.
- Closed-beta, terms, invite, and admin/service-equivalent paths are represented.
- Unauthorized direct route/action access fails closed.
- Identity feeds the D1 authorization layer.

Fail criteria:

- Session cookies or proxy route gates are weaker than current behavior.

## P3: D1 Domain Proof

Goal: prove one critical D1 domain before attempting broad migration.

Recommended first domains:

1. Upload metadata or beta feedback if looking for lower risk.
2. Library read paths if looking for medium risk.
3. Estimate mutations only after auth and lower-risk domains pass.

Pass criteria:

- Schema, indexes, query plans, authz, RPC rewrite, transaction boundaries, type strategy, and restore rehearsal pass.
- Query count and p95 route/action latency meet budget.
- Cross-workspace denial tests pass.

Fail criteria:

- D1 query pattern is too slow.
- App-layer authz cannot match RLS guarantees.
- Restore path is unacceptable.

## P4: R2 Upload And Asset Proof

Goal: replace one private object class.

Pass criteria:

- Upload, signed access, private denial, delete, scan, cleanup, image display, CSP, and rollback pass.
- D1 metadata and R2 object state reconcile.

Fail criteria:

- Private object access cannot be proven.
- Cleanup or scan lifecycle is weaker.

## P5: Queues And Cron Proof

Goal: replace one scheduled/retryable job.

Pass criteria:

- Producer, consumer, retries, duplicate delivery, dead-letter handling, job IDs, and operator visibility are proven.
- Current cron route remains fallback until queue proof passes.

Fail criteria:

- Duplicate messages corrupt data or emit duplicate emails.
- Failures are not visible.

## P6: Durable Objects/WebSockets Realtime Proof

Goal: replace Supabase Realtime for one room type.

Pass criteria:

- Room ownership, connection authorization, presence/cursor payloads, reconnect, backpressure, rate limits, and latency are proven.
- Durable business state remains in D1/R2.

Fail criteria:

- Cross-room leakage, poor reconnect behavior, or unacceptable latency.

## P7: Email Service Proof

Goal: prove Cloudflare Email Service can replace Resend.

Pass criteria:

- Domain setup, outbound send, arbitrary-recipient eligibility, bounce/failure handling, event/webhook equivalent, retry behavior, and local/test mode are proven.

Fail criteria:

- Deliverability or event parity is weaker than Resend.

## P8: WAF, Rate Limiting, DDoS, Turnstile Proof

Goal: protect the app without blocking legitimate beta users or provider callbacks.

Pass criteria:

- Public, auth, share, upload, webhook, OAuth, and API routes have explicit allow/bypass/challenge behavior.
- False positives are visible and rollback is rehearsed.

Fail criteria:

- Auth callbacks, webhooks, or share routes are blocked unexpectedly.

## P9: Cutover Readiness Review

Goal: decide whether to proceed, fall back to hybrid, or reject the slice.

Pass criteria:

- Scorecard red items are resolved.
- Cost workbook shows acceptable savings or strategic value.
- Performance budgets pass.
- Rollback has been rehearsed.
- Provider proof is attached.

Fail criteria:

- Any critical data/auth/realtime/speed risk remains unresolved.
