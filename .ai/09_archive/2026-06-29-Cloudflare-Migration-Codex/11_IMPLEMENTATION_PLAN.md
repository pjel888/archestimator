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

- Complete `26_INVENTORY_WORKSHEETS.md`.
- Complete `28_COST_AND_PERFORMANCE_WORKBOOK_TEMPLATE.md`.
- Inventory current Vercel, Supabase, Resend, storage, and bandwidth spend.
- Capture monthly requests, dynamic route requests, CPU/build usage if available, storage GB, object operations, database size, rows read/written estimates, email sends, webhook volume, and cron/job counts.
- Build cost scenarios for current stack, hybrid stack, and the preferred full Cloudflare-native target.
- Identify break-even points and hidden costs.
- Replace any stale numeric assumptions in this package with execution-date pricing and limit inputs from Cloudflare and current provider docs.

Exit gate:

- Owner can compare current monthly cost against Cloudflare projected monthly cost with assumptions listed.

## Phase 1: Full-Native Target Architecture

Goal: turn the owner preference into a concrete Cloudflare-native architecture while keeping current providers as fallback.

Tasks:

- Produce route/action/provider ownership matrix.
- Define final product ownership: Workers/OpenNext, D1, Better Auth, R2, Queues/Cron, Durable Objects/WebSockets, KV, Email Service, WAF/rate limiting/DDoS, Turnstile, Web Analytics/Workers Observability.
- Define rollback/comparison path to current Vercel/Supabase/Resend stack.
- Define protected-route no-cache policy and public/static cache policy.
- Define performance budgets and proof fixtures.

Exit gate:

- Architecture explains every current provider responsibility and its Cloudflare replacement or fallback.
- No provider is removed.
- Performance budgets and rollback map are reviewable.

## Phase 2: D1, Auth, And Realtime Redesign

Goal: decide how to move the database away from Supabase without losing authorization, transaction, realtime, or restore guarantees.

Tasks:

- Build table/RPC/RLS/trigger/typegen inventory.
- Redesign app-layer authorization for D1.
- Redesign RPCs as service/repository functions with transaction/idempotency proof.
- Choose generated type strategy.
- Choose backup/export/restore strategy.
- Design Better Auth identity/session mapping.
- Design Durable Objects/WebSockets rooms for realtime presence/cursors/collaboration.

Exit gate:

- Every current Supabase data/auth/realtime responsibility has a Cloudflare-native design, explicit fallback, or blocker.

## Phase 3: Cloudflare Product Proof Spikes

Goal: prove the Cloudflare products on realistic slices before production routing.

Tasks:

- Execute proof spikes in the order defined in `27_PROOF_SPIKE_BACKLOG.md`.
- Next.js on Workers/OpenNext route proof.
- Better Auth on Workers/D1 session and route-gate proof.
- D1 schema/data/action proof on representative domains.
- R2 private object proof.
- Queues/Cron idempotency and retry proof.
- Durable Objects/WebSockets realtime proof.
- Email Service deliverability and event proof.
- WAF/rate-limit/DDoS/Turnstile staging proof.

Exit gate:

- Each proof has targeted tests, provider evidence, observed performance, and rollback.

## Phase 4: Performance And Cost Proof

Goal: prove the redesign is fast and cheaper enough before production migration.

Tasks:

- Measure current baseline for public routes, share routes, workshop routes, key Server Actions, uploads, realtime, and email.
- Measure Cloudflare preview/proof equivalents.
- Fill the scorecard in `25_EXECUTION_READINESS_SCORECARD.md`.
- Model Workers CPU, requests, subrequests, D1 rows read/written, R2 ops/GB, Queues ops, Email Service volume, and WAF/rate-limit plan needs.
- Tune route caching, bundle size, data access, and queue boundaries until budgets pass or blocker is recorded.

Exit gate:

- Full-native target is equal or faster for critical flows and has a cost case that justifies migration effort.

## Phase 5: Production Migration Slices

Goal: only after proofs, migrate one reversible slice at a time toward the full-native target.

Tasks:

- Create slice-specific implementation plan.
- Execute maker/checker workflow.
- Run targeted tests and provider proof.
- Roll out behind flags or routing controls.
- Monitor and keep rollback available.

Exit gate:

- Slice has stable production evidence and no unresolved P0/P1 risks.
