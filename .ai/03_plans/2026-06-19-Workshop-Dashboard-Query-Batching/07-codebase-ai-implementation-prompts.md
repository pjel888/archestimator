# 07 — Codebase AI Implementation Prompts

Ready-to-run prompts for a coding agent. Each assumes the bounded-loop posture (`.ai/08_prompts/templates/codebase-ai-loop-task.md`) and proportional verification. **Run phases in order; do not start Phase 3 until Phase 0/1 measurement and `12-…` justify it; Phase 2 must also run first if Branch C/library load remains decision-relevant.** Use repo-relative paths only.

## Phase 0 — Baseline

> GOAL: Instrument and baseline the `/workshop` dashboard data fetch — do NOT optimize yet.
> 1. Implement the `08-phase-0-instrumentation-and-measurement-harness.md` contract: request-correlated branch/wave timings, safe labels, actual Supabase round-trip counter, and explicit handling for whether `Server-Timing` is available.
> 2. Write a seed script under `scripts/` for Small, Medium, and Large fixture profiles (sizes in `04-…` U2) targeting a Supabase BRANCH db when available.
> 3. Record baseline round-trip counts, latency waves, per-branch timings, payload estimates, `pg_stat_statements`, concurrency results, and `EXPLAIN (ANALYZE, BUFFERS)` of the homebase reads into `.ai/03_plans/2026-06-19-Workshop-Dashboard-Query-Batching/LOOP_LEDGER.md`.
> Verify: harness evidence exists and is request-correlated; identify the empirically slowest branch. No optimization. Do not create any migration.

## Phase 1 — Homebase wave-merge (app-only)

> GOAL: Reduce sequential round-trip waves in `getWorkshopHomebaseData` (`src/lib/repositories/workspace-repository.ts`) with APP CODE ONLY — no migration, no types change. Follow `03-…` §A and `04-…` U3–U5.
> - Follow `09-phase-1-query-shape-and-dataflow-contract.md`: preferred two bounded estimate arms in one `Promise.all` latency wave; use a single `OR` query only if the contract proofs pass.
> - Compute recent-estimate project ids from `recentProjectIds ∪ favoriteProjectIds`, then merge the favorite + missing `projects` backfills into one id-batched read after estimates; Map-dedupe; re-apply ordering.
> - Run `readOptionalProjectPublications` + `readPendingCollaborationVisibilitySummary` + the `estimate_nodes` read as ONE `Promise.all` wave, each keeping its own try/tolerate path.
> Constraints: identical `WorkshopHomebaseData` output vs baseline for the same fixture; preserve RLS filters, ordering, limits, and per-read error isolation.
> Verify: `tests/vitest` parity tests (all `09-…` hostile cases) green; `bun run type-check`; `next build`; Branch A latency-wave count drops vs the Phase-0 baseline; Small/Medium regression within tolerance; killing one optional table still degrades only that field.

## Phase 2 — Dashboard-lean library fetch (app-only)

> GOAL: Add `getLibraryDashboardSpotlight()` to `src/lib/repositories/component-library-repository.ts` returning the existing `DashboardLibrarySpotlight` type, fetching ONLY fields the dashboard currently renders: componentCount, recent components(5), and templateCount. Return `recentTemplates: []` unless a separate UI scope starts rendering template detail. Switch `loadDashboardLibrarySpotlight` (`src/app/workshop/page.tsx`) to it. Leave `getLibraryOverview` untouched for the Library page. Preserve the `try/catch → null` best-effort contract. Fix the inaccurate "all React-cached" comment in `page.tsx`.
> Verify: new tests (U6 scenarios) green; Library page output unchanged; dashboard renders when the spotlight is null; Branch C query count drops 11→<=3; `next build`; UX degraded-state gate in `10-…`.

## Phase 3 — RPC (GATED — only if measurement justifies; HIGH blast radius)

> PRECONDITION: Phase 0/1 measurement and `12-phase-3-ownership-cutover-and-rollout.md` show the residual homebase tail still dominates Medium/Large and the RPC predicts material additional p95 improvement. Phase 2 measurement is also required first if Branch C/library load remains decision-relevant. If not, STOP — the app-only result stands.
> GOAL: Author `supabase/migrations/<ts>_workspace_homebase_summary.sql` per `03-…` §C and `11-…` — `security invoker`, `set search_path = public`, every sub-select membership-joined and workspace-scoped, user-scoped favorites, clamped `recent_limit`, `jsonb` return; publications + invites stay app-side. Splice the return type ADDITIVELY into `src/lib/supabase/types.ts` (never regenerate-and-overwrite). Add `prove:workspace-homebase-summary` with cross-tenant and same-workspace user-favorite denial. Include `revoke execute … from public, anon` and deterministic `ORDER BY updated_at DESC, id DESC` in the RPC. Switch `getWorkshopHomebaseData` to the RPC only behind the server-only flag/fallback in `12-…`.
> Verify (all hard gates): `EXPLAIN (ANALYZE, BUFFERS)` shows index use + buffers ≤ sum of replaced reads on Small/Medium/Large; byte-parity vs the app path; cross-tenant denial and same-workspace user isolation proof green; `get_advisors` clean; `next build`; flag-off fallback proven; **Codex review pass**. If the planner regresses smaller workspaces, REJECT the RPC and keep Phase 1.

## Coordination note for every phase

`src/lib/repositories/workspace-repository.ts` is a hot shared file and other agents may touch `src/components/workshop/**` concurrently. Check `git status` before editing, land small reviewable commits, and coordinate the RPC contract with the Performance-Refactor Phase 4/8 owner (A-23 / RISK-20 / RISK-22) so it is not authored twice.
