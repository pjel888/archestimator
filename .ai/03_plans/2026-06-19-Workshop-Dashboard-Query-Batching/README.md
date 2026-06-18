# Workshop Dashboard — Query Batching & Round-Trip Reduction

**Date:** 2026-06-19
**Status:** Planning only. No source, migrations, RPCs, or provider actions are created by this pack.
**Blast radius:** HIGH (data layer — Supabase reads, candidate RPC, RLS surface). Codex review gate applies before any code lands.

## Evidence Anchors

| Proof dimension | Status | Evidence |
|---|---|---|
| Repo source | Read-only investigation | Query inventory in `01-current-query-and-round-trip-inventory.md`, anchored to `src/lib/repositories/workspace-repository.ts`, `src/lib/repositories/component-library-repository.ts`, `src/app/workshop/page.tsx`. |
| Tests/checks | Not run | This is a plan. No code changed; no gates executed. |
| Migrations/provider | Not implemented | No migration or RPC created. Phase 3 RPC is a *candidate* design only, gated behind measurement + Codex review. |
| Hosted/browser proof | Not applicable | Latency proof requires the measurement protocol in `05-…` against a Supabase branch DB, not local. |
| DB-lane proof | Required before any RPC/caller switch | Phase 3 (RPC) must not start until Phase 0 baseline + Phase 1 wins are measured, Phase 2 is measured if Branch C/library load remains decision-relevant, branch-DB/security gates pass, and the work stays inside the authorized Archestimator Supabase project boundary. Fresh owner approval is required only for production, destructive, unrelated-provider, cost-changing, or policy-overriding actions. |

## Purpose

Make the `/workshop` dashboard's server-side data fetch faster by **cutting the number of sequential Supabase round-trips**, without changing behavior, breaking RLS, or losing the current degrade-gracefully resilience. The pack answers the owner's literal question — *"will batching make it faster?"* — honestly: **yes, but only for the parts that are actually serial.** See `00-executive-brief-and-scope.md`.

## Explicit Warnings

- This pack is **not evidence of implementation.**
- Do **not** create a migration or RPC until Phase 0 baseline and Phase 1 app-only wins are measured; Phase 2 is also required first if Branch C/library load remains part of the slow-path decision (`05-…`, `08-…`, `12-…`).
- Do **not** apply any RPC or index directly to production. Use a Supabase branch DB.
- Candidate SQL in `03-…` is **directional design, not ready-to-run DDL.**
- Phase 0 is measurement work, not optimization. It may add temporary/dev-only instrumentation; see `08-phase-0-instrumentation-and-measurement-harness.md`.
- Phase 1 must follow the exact query-shape/dataflow contract in `09-…`; a single `OR` query is optional, not assumed.
- `src/lib/supabase/types.ts` is hand-augmented; a raw `gen:types` overwrite breaks the build — any new RPC return type must be spliced in additively (see `06-…` and memory: *Supabase types not pure-generated*).

## Reading Order

1. `00-executive-brief-and-scope.md` — The honest efficacy verdict, scope, non-goals.
2. `01-current-query-and-round-trip-inventory.md` — Exact per-function query + round-trip wave map.
3. `02-batching-opportunities-and-strategy.md` — Ranked opportunities, mechanism per opportunity, staged lowest-risk-first strategy.
4. `03-rpc-and-lean-fetch-design.md` — Candidate `workspace_homebase_summary` RPC, the dashboard-lean library fetch, and the (rejected) caching option.
5. `04-implementation-phases-and-goal-cards.md` — Phase 0–3 goal cards.
6. `05-validation-and-measurement-protocol.md` — How to prove the win before/after.
7. `06-risk-rollback-and-maintenance.md` — RISK-20 cross-tenant, error-isolation loss, types.ts, rollback.
8. `07-codebase-ai-implementation-prompts.md` — Ready-to-run prompts per phase.
9. `08-phase-0-instrumentation-and-measurement-harness.md` — Exact measurement harness contract.
10. `09-phase-1-query-shape-and-dataflow-contract.md` — Exact app-only homebase dataflow, limits, and parity cases.
11. `10-ux-perceived-performance-and-state-contract.md` — Loading, degraded, mobile, accessibility, and visual proof gates.
12. `11-security-threat-model-and-rpc-authz.md` — RPC authz matrix, branch DB trust boundary, logging/privacy rules.
13. `12-phase-3-ownership-cutover-and-rollout.md` — RPC ownership, decision tree, feature-flag cutover, rollback.
14. `13-test-proof-matrix-and-readiness-scorecard.md` — Consolidated scores and objective implementation proof matrix.
15. `14-codebase-ai-implementation-plan.md` — Single execution guide for codebase AI implementers, including phase gates, SWOT, pros/cons, tests, and rollback.
16. `LOOP_LEDGER.md` — Iteration ledger + proof boundary + acceptance criteria.

## Relationship to Existing Packs (do not duplicate)

This pack **operationalizes, dashboard-scoped, item A-23** from the larger `2026-06-17-Performance-Refactor` pack. It does not supersede the broad performance strategy, but it **does** become the canonical owner for this specific `workspace_homebase_summary` contract if Phase 3 proceeds.

- **`.ai/03_plans/2026-06-17-Performance-Refactor/`** — owns the broad perf strategy. A-23 (`10_PHASE_4_DATA_AND_CACHE_PLAN.md`, `04_TARGET_ARCHITECTURE.md`) names "collapse the `getWorkshopHomebaseData` serial tail … into another `Promise.all` wave or a `workspace_homebase_summary` RPC." **RISK-20** owns the new-RPC cross-tenant model. This pack carries those IDs (A-23, RISK-20) forward and supplies the concrete dashboard query inventory, the cheap-wave-merge-first path, and the measurement protocol that A-23 left at strategy altitude. For this specific RPC, `12-phase-3-ownership-cutover-and-rollout.md` assigns canonical ownership here; Performance-Refactor Phase 8 should back-point to this contract and retain general DB/RLS law, other RPCs, and shared advisor/indexing practices.
  - **⚠️ Stale-anchor reconciliation (do not "reuse verbatim"):** The Performance-Refactor A-23 prompt anchors the homebase work to `workspace-repository.ts:1126-1222` and a `sharedProjects`/`sharedProjectIds` read. Those anchors **predate the homebase rewrite and are stale** — `sharedProjects` lives in `listCurrentWorkspaceProjects` (~L821/897), **not** in `getWorkshopHomebaseData`, whose current shape is the H1–H8 inventory in `01-…`. The authoritative current inventory is `01-…` here; the Performance-Refactor owner should back-point to it. Coordinate the *RPC schedule* (so it isn't authored twice — RISK-22) but treat this pack's `01-…` as the source of truth for the homebase code shape.
  - **Scope reconciliation:** If Performance-Refactor Phase 8 still lists `pending-collab summary` inside `workspace_homebase_summary`, that output is stale for this RPC. This pack keeps publications and pending-invite summary app-side best-effort; update/back-point the Performance-Refactor text before DB implementation.
- **`.ai/03_plans/database-indexing-and-query-performance/`** — complementary, not overlapping. Indexing makes each query cheaper; batching cuts the number of round-trips. The Phase-3 RPC's new query shapes should feed that pack's index candidates (`EXPLAIN` first).
