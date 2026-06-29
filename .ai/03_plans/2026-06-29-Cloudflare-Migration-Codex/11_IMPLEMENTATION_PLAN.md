---
title: Future Implementation Plan
plan_id: 2026-06-29-cloudflare-migration-codex
document: 11
---

# Future Implementation Plan

This document is a future execution map, not an instruction to implement in this planning task.

## Phase 0A: Cloudflare Skill And Source Refresh

Goal: ensure the execution team uses current Cloudflare guidance instead of stale plan memory.

Tasks:

- Load the installed Cloudflare, Workers best-practices, Wrangler, Cloudflare One, and migration skills relevant to the selected slice.
- Refresh official Cloudflare docs and product changelogs for the selected products.
- Inspect the current Wrangler config schema and current Workers type package before planning binding shapes or config fields.
- Re-check OpenNext/Cloudflare adapter support against the current Next.js version and local Next.js platform docs.
- Record exact source dates and separate current provider facts from assumptions.

Exit gate:

- Execution can name the current Cloudflare docs, schema/type sources, affected products, stale-plan claims replaced, and remaining docs gaps.

## Phase 0: Cost And Inventory Workbook

Goal: decide whether Cloudflare is materially cheaper for Archestimator's actual usage.

Tasks:

- Inventory current Vercel, Supabase, Resend, storage, and bandwidth spend.
- Capture monthly requests, dynamic route requests, CPU/build usage if available, storage GB, object operations, database size, rows read/written estimates, email sends, webhook volume, and cron/job counts.
- Build cost scenarios for current stack, hybrid stack, and full Cloudflare candidate.
- Identify break-even points and hidden costs.
- Replace any stale numeric assumptions in this package with execution-date pricing and limit inputs from Cloudflare and current provider docs.

Exit gate:

- Owner can compare current monthly cost against Cloudflare projected monthly cost with assumptions listed.

## Phase 1: Cloudflare Front Door

Goal: get WAF/DDoS/CDN benefit without replacing app/runtime/database/auth.

Tasks:

- Design DNS/proxy path to existing origin.
- Define cache bypass for auth, workshop, share, API, upload, OAuth, and webhook routes.
- Stage WAF/rate-limit rules.
- Define allowlists for OAuth, Resend/webhooks, Supabase callbacks if applicable, and owner IPs where needed.
- Define rollback to direct origin.

Exit gate:

- No protected-route caching.
- No auth/OAuth/share/upload/email regression.
- Security events visible.
- Rollback tested.

## Phase 2: R2 Storage Pilot

Goal: prove R2 with a non-critical or easily reversible asset class.

Tasks:

- Choose one asset class.
- Design object-key scheme.
- Design private access and signed URL/session behavior.
- Design scan/cleanup lifecycle.
- Preserve Supabase Storage fallback until parity passes.
- Update future proof scripts before production use.

Exit gate:

- Upload, download, authorization, scan, delete, rollback, and cost are proven.

## Phase 3: Queues Pilot

Goal: move retryable background work from cron-only routes to durable queues.

Tasks:

- Choose upload scan/cleanup or webhook fanout as first queue.
- Define message schema and idempotency key.
- Define retries, poison messages, dead-letter handling, and operator visibility.
- Preserve current scheduled route fallback until proof passes.

Exit gate:

- Duplicate delivery does not corrupt data.
- Failures are visible.
- Fallback works.

## Phase 4: Workers Sidecars And Hyperdrive

Goal: use Workers where they add value without moving the full app.

Tasks:

- Identify sidecar candidates: upload signing, webhook intake, queue producer/consumer, cache warmer, lightweight API.
- If sidecar needs Postgres, evaluate Hyperdrive with Supabase Postgres or an external Postgres origin.
- Measure latency, error rate, and query count.
- Define `wrangler.jsonc`, compatibility date/flags, generated `Env` types, bindings, service bindings, secrets, observability, startup check, and local/preview parity requirements before implementation.

Exit gate:

- Worker sidecar can be disabled without breaking core app.
- Current Wrangler/types/runtime proof exists and no secret or binding drift remains.

## Phase 5: Next.js On Workers Proof

Goal: determine whether Cloudflare Workers can host the primary Next.js 16 app safely.

Tasks:

- Build a preview proof using Cloudflare OpenNext adapter.
- Verify App Router, RSC, Server Actions, streaming, middleware/proxy, image handling, cache behavior, environment variables, `sharp`/image dependencies, CSP headers, and route handlers.
- Compare against local Next.js platform docs and adapter feature matrix.

Exit gate:

- All critical routes match current behavior or differences are documented with approved changes.

## Phase 6: Better Auth Proof

Goal: decide whether Better Auth should replace Supabase Auth.

Tasks:

- Map Supabase Auth behaviors and code paths.
- Prototype Better Auth for Workers and current origin context.
- Prove OAuth, magic links, SSR sessions, proxy route gate, closed-beta access, legal terms gate, invite flows, admin operations, and test mocks.
- Decide database backing: existing Postgres, D1, or transitional dual mode.

Exit gate:

- Unauthorized access fails closed.
- Session migration strategy exists.
- Data authorization identity is proven.

## Phase 7: D1 Decision Gate

Goal: decide whether D1 should hold any production domain data.

Tasks:

- Convert schema map to compatibility matrix.
- Identify blockers: RLS, RPCs, triggers, extensions, transactions, realtime, typegen.
- Choose between no D1, D1 for bounded new data, or full domain redesign.

Exit gate:

- Either D1 is rejected for core data, or a separate D1 migration plan is approved with complete parity proof.

## Phase 8: Production Migration Slices

Goal: only after proofs, migrate one reversible slice at a time.

Tasks:

- Create slice-specific implementation plan.
- Execute maker/checker workflow.
- Run targeted tests and provider proof.
- Roll out behind flags or routing controls.
- Monitor and keep rollback available.

Exit gate:

- Slice has stable production evidence and no unresolved P0/P1 risks.
