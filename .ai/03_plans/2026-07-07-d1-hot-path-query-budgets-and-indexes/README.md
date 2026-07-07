# D1 Hot Path Query Budgets And Indexes — Plan Pack

- **Plan folder:** `.ai/03_plans/2026-07-07-d1-hot-path-query-budgets-and-indexes/`
- **Date:** 2026-07-07 (Asia/Manila)
- **Plan profile:** `exhaustive` (touches Cloudflare D1, indexes, migrations, app authorization, release readiness for first users)
- **Plan status:** `IMPLEMENTATION-READY`
- **verification_mode:** `emulated` (separated critique + verifier passes by the same author; no true external reviewer in this session). Per the suite authority contract this caps overall readiness at 97. A real independent/owner review of the migration sequence and hosted-proof gates is the one residual step that would unlock 98–100.
- **Implementation entrypoint:** `11_IMPLEMENTATION_PLAN.md`
- **Goal author:** this planning run (lead orchestrator).

## Master goal

Give the implementation agent a complete, codebase-specific plan to set **measurable D1 query budgets** (query-count + p95 + **rows-read** + subrequest), close **index-coverage gaps**, and add **hosted performance proof** for every first-user hot path — without adding paid Cloudflare features, and without mixing in general UX work.

**Why rows-read is the load-bearing metric:** D1 Free bills "rows read" by counting every *scanned* row (including JOIN fan-out and predicate-eliminated rows), not rows returned. The free ceiling is **5M rows read/day** (resets 00:00 UTC). At 10× first-user volume, the unindexed/un-LIMIT-ed hot paths would exceed this and the D1 API returns errors until reset. So P1 (indexes) and P2 (LIMITs + N+1 fix) are free-tier-budget necessities, not optimizations. See `09` §"Free-tier ceilings" for the full verified limit table.

Outcome: an executor can implement measurable D1 hot-path budgets (query-count + p95 + rows-read + subrequest) and prove them against representative fixture data, both locally and against hosted D1, with every active repository path covered by a budget and every budget enforced by a script.

Non-goals (explicitly out of scope): general UX redesign, bundle-size work (covered by `2026-07-07-bundle-and-route-performance-gate-hardening`), D1 migration state/schema integrity (covered by `2026-07-07-d1-migration-state-and-schema-integrity`), R2/backup ops, durable-object realtime scale. This plan consumes the additive-index migrations and query-counter infrastructure those packs or the current repo already provide, but does not redefine them.

## Phase order (dependency-aware)

```mermaid
flowchart LR
  P0[P0 Foundation: shared budget helper + repo query inventory] --> P1[P1 Additive indexes]
  P1 --> P2[P2 Repository query budgets + N+1 fixes]
  P2 --> P3[P3 Local proof per repository]
  P3 --> P4[P4 Hosted proof surface expansion]
  P4 --> P5[P5 CI/rollout gates]
```

- **P0** — `scripts/lib/d1-query-budget.ts` shared helper + extend `build-performance-query-inventory.ts` buckets. Foundation for every later phase; sequential prerequisite.
- **P1** — additive indexes only (`0037`/`0038` migration). Parallelizable with P0 doc work but must land before P2 hosted EXPLAIN proof.
- **P2** — repository-layer changes: kill the N+1 in `estimates/page.tsx`, add explicit LIMITs to unbounded reads, optional cookie-cached auth fast path. Largest phase.
- **P3** — local SQLite query-budget/p95 proof scripts per repository (8 new proof scripts).
- **P4** — hosted D1 proof surface expansion: extend `d1-performance-proof-router.ts` to cover real repository functions + subrequest capture.
- **P5** — CI gate wiring + rollout performance gate thresholds + rollback runbook.

## Requirement / task / test traceability

- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (IDs `PERF-*`, `DATA-*`, `REL-*`, `OPS-*`, `TEST-*`).
- Tasks: `11_IMPLEMENTATION_PLAN.md` (IDs `T-P0-*` … `T-P5-*`), each maps back to requirement IDs.
- Tests: `12_TEST_AND_VALIDATION_STRATEGY.md` Test Execution Matrix.
- End-to-end traceability: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Blocked decisions

None externally blocked. Every task has exact repo-relative paths and symbols. The one `DISCOVERY-REQUIRED` task (`T-P4-02`) is a safe read-only characterization of the hosted subrequest ceiling before committing a budget number; its scope, stop condition, and falsifiable evidence target are defined in `11_IMPLEMENTATION_PLAN.md`.

## Stale-plan revalidation checklist (run before first edit)

1. `git status` clean of unrelated changes; confirm no other agent owns `src/lib/repositories/`, `scripts/generate-cloudflare-d1-*`, `scripts/verify-cloudflare-d1-*`, `migrations/0037*`, `migrations/0038*`, `src/lib/cloudflare/d1-performance-proof-router.ts`.
2. Re-read `migrations/0031_performance_indexes_additive.sql` — if a later migration already added the indexes P1 proposes, skip that index.
3. Re-read `src/lib/cloudflare/d1-performance-proof-router.ts` — if it now covers more than the 5 current surfaces, adjust P4 scope.
4. Re-run `rg "canEditEstimateInD1" src/app/workshop/projects` to confirm the `estimates/page.tsx:105` N+1 still exists before implementing `T-P2-01`.
5. Re-read `.ai/03_plans/2026-07-07-d1-migration-state-and-schema-integrity/` README if it exists — confirm migration numbering `0037`/`0038` is not claimed by a sibling pack. If claimed, take the next free number.
6. Confirm `bun run cf:d1-runtime-proof` still passes against current main (baseline for regression comparison).

## Commands to run before the first edit

```bash
git status
bun run type-check
bun run cf:d1-runtime-proof        # baseline hosted D1 p95/query-count proof
bun run dbidx:audit-repo           # baseline repo query map + index inventory
ls migrations/ | tail -5            # confirm latest migration number for 0037/0038
```

## Files explicitly off-limits to this plan

- `supabase/migrations/**` — historical archaeology, never run/extend.
- `wrangler.jsonc` Durable Object / Queue / Email / cron bindings — out of scope (covered by sibling packs).
- Any file under `src/components/` for UX work — out of scope.
- Legacy Supabase provider projects (`ebxxqidacheyapmmzavr`, `archestimator`) — never mutate.

## Files and systems intentionally unaffected

- The marketing/auth static routes (`/`, `/login`, `/pricing`, `/about`) — no D1 read paths; nothing to budget.
- `estimate-repository.ts`, `estimate-schema-compat.ts`, `project-data-repository.ts` — first two have zero D1 queries; the third is a pure orchestrator whose cost is the sum of its callees (already budgeted via `listProjectEstimates` + `getProjectChartsData`).
- R2 object policies, Queue consumers, DO room semantics — covered by sibling packs.

## External proof required before production rollout

- Hosted D1 p95 + query-count evidence for every repository surface in P4 against representative fixture data (10× first-user volume). Local SQLite proof is necessary but not sufficient because D1's remote query planner + network round-trip behavior differs from local sqlite3.
- Hosted subrequest-count evidence per first-user route (P4 `T-P4-02`).
- `EXPLAIN QUERY PLAN` evidence from hosted D1 confirming the P1 indexes are actually used by the production planner (local sqlite3 plans can differ).

## Archive policy

Archive after full completion (all phases merged and hosted proof green for two consecutive release windows). Do not archive individual slices; the budget contract is only meaningful as a whole.
