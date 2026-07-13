# 11 — Implementation Plan

This is the authoritative execution guide. Phases are dependency-aware (see README dependency graph). Each task has a stable ID, exact repo-relative paths, symbols, inputs, outputs, failure cases, validation, completion evidence, parallelization class, and complexity.

**Plan profile:** exhaustive. **Status:** IMPLEMENTATION-READY.

**Verification before first edit:** README "Commands to run before the first edit" + stale-plan revalidation checklist.

## Phase P0 — Foundation (sequential prerequisite for all later phases)

**Objective:** one shared budget helper + extended static query inventory. Every later phase imports the shared schema.

**Requirements addressed:** PERF-002, PERF-003, PERF-007 (partial).

**Prerequisites:** none.

**Dependencies:** none.

**Exit criteria:** `scripts/lib/d1-query-budget.ts` exports `QUERY_SURFACE_SPEC`, `BUDGET_RESULT`, `percentile()`, `runSqlite()`, `measureSurface()`; `build-performance-query-inventory.ts` bucket rules include all 12 repositories and is wired to `package.json`.

### T-P0-01 — Create `scripts/lib/d1-query-budget.ts`
- **Requirement IDs:** PERF-002, PERF-007.
- **Objective:** shared budget schema + helpers consumed by every proof script and the hosted router.
- **Why:** 5+ scripts duplicate `percentile()`/`runSqlite()`/`QUERY_SPECS` (`03` §4 "Shared-helper gap").
- **Target file (new):** `scripts/lib/d1-query-budget.ts`.
- **Exported API:** `QUERY_SURFACE_SPEC` (interface: `{ id, repositoryFn, sqlShape, table, queryBudget, p95BudgetMs, fixtureTier }[]`); `BUDGET_RESULT` (interface: `{ surfaceId, plannedQueries, actualQueries, localP95Ms, hostedP95Ms?, subrequestCount, rowsRead, evidenceClass, passed }`); `percentile(values, p)` (nearest-rank); `runSqlite(db, sql, binds)`; `measureSurface(spec, fixtureDb)` → `BUDGET_RESULT`.
- **Imports/dependency direction:** consumed by `scripts/generate-cloudflare-d1-*-proof.ts` and `src/lib/cloudflare/d1-performance-proof-router.ts`.
- **Why no existing file owns this:** `scripts/lib/` has only `project-charts-payload-fixture.ts`; no budget helper exists.
- **Failure cases:** helper signature drift after P3 scripts adopt it → mitigate by landing P0 before P3.
- **Tests to add:** `tests/unit/d1-query-budget.test.ts` — `percentile` correctness on known arrays; `measureSurface` returns well-formed `BUDGET_RESULT`.
- **Validation:** `bun run type-check`; `bunx vitest run tests/unit/d1-query-budget.test.ts`.
- **Completion evidence:** file exists, exports typed, unit test green.
- **Parallelization:** sequential prerequisite. **Complexity:** Medium.

### T-P0-02 — Extend `build-performance-query-inventory.ts` + wire to package.json
- **Requirement IDs:** PERF-001, PERF-007.
- **Objective:** static per-route query inventory covers all 12 repositories (today it omits `project-activity-feed` and `estimate-favorites` buckets per `03` §4 gap 4).
- **Why:** `build-performance-query-inventory.ts` is not wired to package.json and its `BUCKET_RULES` under-count the hottest routes.
- **Target files (existing, modify):** `scripts/build-performance-query-inventory.ts` (extend `BUCKET_RULES` lines 45-54 to include all 12 repos); `package.json` (add `perf:query-inventory` script).
- **Relevant symbols:** `BUCKET_RULES`, the route-bucket classifier.
- **Inputs:** route→repo map from `03` §2.
- **Expected output:** `scripts/build-performance-query-inventory.ts` produces a JSON+MD covering every D1-backed repo.
- **Failure cases:** bucket classifier mis-routes a repo → mitigate by asserting every repo in `03` §3 appears in the inventory output.
- **Tests to add:** `tests/unit/build-performance-query-inventory.test.ts` — snapshot of expected repo coverage.
- **Validation:** `bun run perf:query-inventory`; diff output against `03` §3 repo list.
- **Completion evidence:** inventory output contains all 12 repos.
- **Parallelization:** parallel-safe with T-P0-01 (different files). **Complexity:** Small.

## Phase P1 — Additive indexes (parallel with P0 docs; before P2 hosted EXPLAIN)

**Objective:** close EXPLAIN-confirmed index gaps G1–G4. G5 by cache (P2).

**Requirements addressed:** PERF-004, PERF-011 (P1 indexes collapse scans → probes, reducing rows-read/request).

**Prerequisites:** confirm migration numbers free (README checklist step 5).

**Database blueprints:** `07` DB-CHG-001, DB-CHG-002.

**Exit criteria:** migrations `0037`, `0038` applied to local D1; `EXPLAIN QUERY PLAN` (local) confirms index use on G1–G4 with no `TEMP B-TREE` for the targeted ORDER BY; `cf:d1-runtime-proof` green; **no hot-path query's `EXPLAIN` shows a full scan** (PERF-011 CI gate).

### T-P1-01 — `0037_favorites_user_indexes_additive.sql` (G1 + G2)
- **Requirement IDs:** PERF-004.
- **Objective:** see `07` DB-CHG-001.
- **Target file (new):** `migrations/0037_favorites_user_indexes_additive.sql`.
- **SQL:** as in `07` DB-CHG-001.
- **Inputs:** gap analysis `03` §3 G1/G2.
- **Expected output:** two `CREATE INDEX IF NOT EXISTS`.
- **Failure cases:** index name collision → `IF NOT EXISTS` makes idempotent.
- **Tests to add:** extend `tests/vitest/migrations.test.ts` (if exists) or add `tests/vitest/migration-0037.test.ts` applying the SQL to a temp sqlite3 and asserting index presence.
- **Validation:** `wrangler d1 migrations apply ARCH_DB --local`; `wrangler d1 execute ARCH_DB --local --command "EXPLAIN QUERY PLAN SELECT … FROM estimate_favorites WHERE user_id='u' ORDER BY created_at DESC LIMIT 10"` → asserts `USING INDEX idx_estimate_favorites_user_created`.
- **Completion evidence:** EXPLAIN output shows index use, no TEMP B-TREE.
- **Rollback:** `DROP INDEX IF EXISTS …` (in `07`).
- **Parallelization:** parallel-safe with T-P1-02. **Complexity:** Small.

### T-P1-02 — `0038_responses_and_adjustments_indexes_additive.sql` (G3 + G4)
- **Requirement IDs:** PERF-004.
- **Objective:** see `07` DB-CHG-002.
- **Target file (new):** `migrations/0038_responses_and_adjustments_indexes_additive.sql`.
- **G4 is confirmed needed (no longer DISCOVERY):** the audit verification confirmed `idx_estimate_sheet_adjustments_updated` leads on `updated_at DESC` with `estimate_id` as a trailing column (`migrations/0029_estimate_actions_d1_support.sql:24-25`), so it does NOT support a leading probe on `estimate_id`. The `idx_estimate_sheet_adjustments_estimate` index is definitely required.
- **SQL:** as in `07` DB-CHG-002 (both G3 and G4 indexes, unconditionally).
- **Inputs:** `03` §3 G3/G4.
- **Expected output:** 1–2 `CREATE INDEX IF NOT EXISTS`.
- **Failure cases:** G4 confirmed already-covered → skip index (not a failure).
- **Tests to add:** `tests/vitest/migration-0038.test.ts`.
- **Validation:** local EXPLAIN on HP-7 correlated subquery → `USING INDEX idx_shared_link_responses_publication_recipient`.
- **Completion evidence:** EXPLAIN output; migration applied locally.
- **Rollback:** `07` DB-CHG-002.
- **Parallelization:** parallel-safe with T-P1-01. **Complexity:** Small.

## Phase P2 — Repository-layer fixes (highest-risk phase)

**Objective:** kill the N+1 (F1), add LIMITs, add category cache. Preserve authorization semantics exactly.

**Requirements addressed:** PERF-006 (primary), PERF-002 (enables budgets).

**Prerequisites:** P1 (indexes assumed for latency); P0 (budget helper for measurement).

**Exit criteria:** HP-5 query count ≤6 regardless of estimate count; denial-parity test green; all LIMITs sized to 10×; category cache invalidation tested.

### T-P2-01 — Batch the `canEditEstimateInD1` per-estimate N+1 (F1) — HIGHEST RISK
- **Requirement IDs:** PERF-006.
- **Objective:** replace `Promise.all(estimateIds.map(id => canEditEstimateInD1(...)))` with a single set-based query returning the editable subset.
- **Why:** confirmed N+1 at `estimates/page.tsx:103-109`; `canEditEstimateInD1` is a 3-EXISTS + 2-creator probe (`d1-access.ts:271`). Cost = `4 + N` queries.
- **Target files (existing, modify):**
  - `src/lib/authz/d1-access.ts` — add `canEditEstimateSetInD1(userId, projectId, estimateIds: string[]): Promise<Set<string>>` alongside `canEditEstimateInD1` (`:271`). Co-located to avoid drift.
  - `src/app/workshop/projects/[projectId]/estimates/page.tsx:103-109` — call the batched variant; compute `accessibleEstimateIds` set; pass to render.
- **Relevant symbols:** `canEditEstimateInD1` (`d1-access.ts:271`), `resolveEstimateListEditCapabilities` (`estimates/page.tsx:90`), the render path in `estimates/page.tsx`.
- **Implementation instructions:** the batched SQL is the *same* predicate structure as `canEditEstimateInD1` (3 EXISTS subqueries on `estimate_sheet_members`/`workspace_members`/`project_members` + 2 `created_by` short-circuits + the `COALESCE(access.inherit_project_access…)` gate), but `WHERE estimate.id IN (?, ?, …)` instead of `WHERE estimate.id = ?`, returning all matching ids. Author it to be a literal generalization — do not invent new access rules. The route then treats any estimate in the returned set as editable and any not in the set as denied — identical to today's per-id call.
- **Security implications:** see `08` — denial-parity test `TEST-SEC-01` is mandatory. Cross-workspace scoping preserved (`project_id = ?` + workspace-membership EXISTS unchanged).
- **Failure cases:**
  - Batched query widens access → `TEST-SEC-01` must fail CI. Author SQL as literal generalization.
  - Empty `estimateIds` → return empty set (no SQL). Guard.
- **Tests to add:**
  - `tests/vitest/d1-access-batch-parity.test.ts` (TEST-SEC-01): for randomized estimate-id sets mixing allowed/denied roles, `canEditEstimateSetInD1` result === set of ids where `canEditEstimateInD1` returns true. Run ≥20 randomized cases per role.
  - `tests/vitest/d1-access-cross-workspace-deny.test.ts` (TEST-SEC-04): workspace A user cannot see workspace B estimates via the batched path.
  - `tests/vitest/estimates-page-query-count.test.ts`: HP-5 query count is constant (≤6) for project sizes 5, 20, 50 estimates.
- **Validation:** `bun run type-check`; `bunx vitest run tests/vitest/d1-access-*`; `perf:dashboard-query-count` shows flat HP-5 query count.
- **Completion evidence:** parity test green across role matrix; HP-5 query count flat in size test.
- **Rollback:** revert to the loop (the loop is still present as `canEditEstimateInD1` — fix is purely additive at the route call site).
- **Parallelization:** sequential (security-sensitive; no parallel edit to `d1-access.ts`). **Complexity:** Medium-Large.

### T-P2-02 — Add explicit LIMITs to unbounded reads
- **Requirement IDs:** PERF-002.
- **Objective:** every unbounded `SELECT` in `03` §3 "Unbounded" table gets a `LIMIT ?` sized by a budget var.
- **Why:** several hot-path reads have no LIMIT (`projects WHERE workspace_id`, `estimates WHERE project_id`, `estimate_nodes WHERE estimate_id IN`, dropdowns, etc.).
- **Target files (existing, modify):** the file:line list in `03` §3 "Unbounded" table.
- **Implementation instructions:** introduce a shared constant (e.g., in `scripts/lib/d1-query-budget.ts` or a `src/lib/repositories/limits.ts`) for default list caps (e.g., `MAX_PROJECTS_PER_WORKSPACE_LIST = 200`, `MAX_ESTIMATES_PER_PROJECT_LIST = 100`, sized to 10× per A1). Apply as `LIMIT ?` bound to these constants. Do **not** change routes that already paginate.
- **UX guard:** per `05`, if a route's existing UI has no pagination and could truncate, add a defensive "showing first N" note only if the cap is hit. If the route paginates, no UI change.
- **Failure cases:** LIMIT truncates a real user's data → sized to 10×; guard in `05`. Test boundary.
- **Tests to add:** extend repository tests with a `LIMIT` boundary case (fixture with cap+1 rows asserts only cap returned).
- **Validation:** `bun run type-check`; repository test suite; manual count check on a 10× fixture.
- **Completion evidence:** no `SELECT` in the `03` unbounded list lacks a `LIMIT` (rg check).
- **Parallelization:** parallel-safe across files (each repository file independent) but serialize within a file. **Complexity:** Medium.

### T-P2-03 — App-layer TTL cache for `component_category_nodes` (G5)
- **Requirement IDs:** PERF-004 (G5 resolution), PERF-002.
- **Objective:** remove the HP-6 global FULL SCAN of `component_category_nodes` by caching the small static taxonomy.
- **Why:** no index helps a global `ORDER BY sort_order, label` scan; the table is static (`using(true)` RLS). Cache is the right resolution.
- **Target file (existing, modify):** `src/lib/repositories/component-library-repository.ts:1114-1117` (the category read) — wrap in a process-local TTL cache (e.g., a simple `Map` with timestamp, or reuse an existing cache util if present). Invalidation: clear on category write actions in `src/lib/component-library/actions.ts`.
- **Implementation instructions:** cache key = none (global); TTL = `CATEGORY_CACHE_TTL_MS` (e.g., 5 min); invalidate in category create/update/delete/reorder actions.
- **Failure cases:** stale category after edit → bounded by TTL + write-time invalidation. Test invalidation.
- **Tests to add:** `tests/vitest/category-cache-invalidation.test.ts` — after a category write, the cache is cleared and the next read returns fresh data.
- **Validation:** `bun run type-check`; vitest; HP-6 proof (P3) shows the scan happens once per TTL, not per request.
- **Completion evidence:** cache test green; HP-6 query count drops by 1 per warm request.
- **Parallelization:** parallel-safe with T-P2-02 (different file regions). **Complexity:** Small-Medium.

### T-P2-04 — (Optional, gated) Denormalized `estimate_summary` for `listProjectEstimates` correlated subqueries
- **Requirement IDs:** PERF-002 (optional).
- **Objective:** eliminate the 3-correlated-subquery cost in `workspace-repository.ts:2930-2944`.
- **Why:** the cost is O(estimates × rows); index-covered but grows. At first-user volume (A1) it is acceptable.
- **Gating condition:** **only implement if** P4 hosted proof shows HP-5/HP-3 p95 exceeds budget at 10× volume. Otherwise defer. This is explicitly optional to avoid a blind schema change.
- **Target files (if implemented):** new migration `0039_estimate_summary_table.sql` (table + triggers to keep node_count/row_count/total_cost fresh); `workspace-repository.ts:2930-2944` read from summary.
- **Failure cases:** trigger drift on write → keep triggers simple; test write-then-read parity.
- **Decision owner:** Philip (data-model change). Marked `BLOCKED-EXTERNAL` until P4 hosted evidence justifies it; do not implement speculatively.
- **Parallelization:** n/a until unblocked. **Complexity:** Large (if unblocked).

## Phase P3 — Local proof per repository

**Objective:** one local SQLite proof script per uncovered repository, all emitting the shared budget schema.

**Requirements addressed:** PERF-005, PERF-007.

**Prerequisites:** P0 (`d1-query-budget.ts`); `03` §3 query shapes.

**Exit criteria:** 8 new `cf:d1-{repo}-proof` scripts exist, wired to package.json, each producing JSON+MD with `queryBudget`/`plannedQueries`/`localP95Ms`/`evidenceClass`, each passing against a 10× fixture.

### T-P3-00 — Extend `seed-performance-test-data.ts` fixture tiers
- **Requirement IDs:** PERF-005.
- **Objective:** fixture tiers 1×/10×/100× for workspaces/projects/estimates/rows/library items.
- **Target file (existing, modify):** `scripts/seed-performance-test-data.ts` (today: 50p×30e×200r default; lib tiers 100/500/5k/10k). Add explicit 1×/10×/100× named tiers.
- **Failure cases:** 100× too large for local sqlite3 → cap local at 10×; 100× is hosted-only.
- **Tests to add:** manifest shape assertion.
- **Validation:** `bun run perf:seed-fixture`; inspect manifest.
- **Completion evidence:** manifest has 1×/10×/100× tiers.
- **Parallelization:** sequential prerequisite for T-P3-01…08. **Complexity:** Small.

### T-P3-01 … T-P3-08 — One proof script per uncovered repository
For each of: `project-activity-feed`, `project-estimate-sheets`, `project-activity`, `project-charts`, `project-data` (orchestrator; prove via callees), `project-location`, `recipient-proposals`, `estimate-favorites`:

- **Requirement IDs:** PERF-007.
- **Target file (new):** `scripts/generate-cloudflare-d1-{repo}-proof.ts`.
- **Shape:** follow the existing `cf:d1-component-library-proof` precedent (`03` §4) — `QUERY_SPECS` array, `runSqlite`, `measureQuery`, `localP95Ms`, `localOnly:true`, `localBudgetMs` from the `09` table. Import shared helpers from `scripts/lib/d1-query-budget.ts` (T-P0-01).
- **Use real repository SQL** (not synthetic `__archestimator_d1_proof_*` tables) so local and hosted are comparable — pull the SQL string from the repository via a new exported `REPO_SQL_CONSTANTS` or by importing the repository function and calling it against the fixture DB. If the repository function is too coupled to fetch live bindings, extract the SQL string to a constant the repository uses — this is a small refactor that improves testability and is in scope for PERF-007.
- **package.json:** add `cf:d1-{repo}-proof` script per file.
- **Failure cases:** repository SQL too coupled to extract → fall back to a documented near-identical SQL string with a comment; record the divergence in the proof output's `evidenceClass`.
- **Tests to add:** each proof script smoke-runs in CI (P5).
- **Validation:** `bun run cf:d1-{repo}-proof`; JSON output well-formed; `passed:true` against 10× fixture.
- **Completion evidence:** 8 scripts green.
- **Parallelization:** parallel-safe across repositories (8 independent files). **Complexity:** Medium each.

## Phase P4 — Hosted proof surface expansion

**Objective:** extend `d1-performance-proof-router.ts` from 5 synthetic surfaces to real repository functions; add subrequest capture; add hosted `EXPLAIN QUERY PLAN` gate.

**Requirements addressed:** PERF-003, PERF-007.

**Prerequisites:** P3 (real repository SQL available); P1 (indexes to EXPLAIN).

**Exit criteria:** hosted proof covers HP-1/HP-2/HP-4/HP-5/HP-7 with real repository functions; outputs include `subrequestCount` and `explainPlan`; `cf:d1-runtime-proof` green against hosted D1.

### T-P4-01 — Extend `d1-performance-proof-router.ts` to real repository functions
- **Requirement IDs:** PERF-007.
- **Objective:** router surfaces map 1:1 to repository functions (`getWorkshopHomebaseData`, `listCurrentWorkspaceProjects`, `resolveEstimateTabRouteContext`, `listProjectEstimates`, `listRecipientProposals`) using fixture-scoped workspace/project ids.
- **Target file (existing, modify):** `src/lib/cloudflare/d1-performance-proof-router.ts:148-223`.
- **Security:** fixture-scoped ids only; output redacts PII (`TEST-SEC-02`); read-only SQL only.
- **Failure cases:** repository function writes → guard: only read-path functions wired.
- **Tests to add:** `tests/vitest/d1-performance-proof-router.test.ts` — surfaces return expected shape; no `@` in JSON (TEST-SEC-02); 401 without secret (TEST-SEC-03).
- **Validation:** local Worker dev `bun run cf:preview` + curl the route; then `cf:d1-runtime-proof` against hosted.
- **Completion evidence:** hosted proof JSON contains real-repo surfaces.
- **Parallelization:** sequential with T-P4-02 (same file). **Complexity:** Medium-Large.

### T-P4-02 — Hosted subrequest capture (DISCOVERY-REQUIRED + implementation)
- **Requirement IDs:** PERF-003.
- **Objective:** capture the Worker subrequest count per proof surface.
- **DISCOVERY-REQUIRED sub-step (read-only):** determine the current method to read subrequest count in the Worker runtime. Stop condition: a confirmed API (e.g., a binding, `ctx` property, or a documented Workers limit readback) is identified. Expected evidence: a `console.log` in dev showing the count, or official docs citation. If no API exists, fall back to counting D1 `prepare().bind()` calls in the proof harness and document the gap.
- **Implementation:** add `subrequestCount` to each proof surface's `BUDGET_RESULT`.
- **Failure cases:** no runtime API → fallback to D1-call counting (documented as `evidenceClass: local-count-proxy`).
- **Tests to add:** assertion that `subrequestCount` is present and ≤ budget from `09`.
- **Validation:** `cf:d1-runtime-proof` output includes subrequest counts for all surfaces.
- **Completion evidence:** subrequest column populated for HP-1/HP-2/HP-4/HP-5/HP-7.
- **Parallelization:** sequential with T-P4-01. **Complexity:** Medium.

### T-P4-03 — Hosted `EXPLAIN QUERY PLAN` gate
- **Requirement IDs:** PERF-004.
- **Objective:** for each P1 index gap (G1–G4), the hosted proof runs `EXPLAIN QUERY PLAN` on the real query and asserts the index is used (no `TEMP B-TREE` for the targeted ORDER BY).
- **Target file (existing, modify):** `src/lib/cloudflare/d1-performance-proof-router.ts` — add an `EXPLAIN` surface; `scripts/verify-cloudflare-d1-runtime-performance-proof.ts` — assert on the explain output.
- **Failure cases:** hosted planner chooses a different index than local → record and investigate; may indicate a stats/staleness issue.
- **Tests to add:** assertion in the verifier that G1–G4 explain plans show the expected index.
- **Validation:** `cf:d1-runtime-proof` green with explain assertions.
- **Completion evidence:** hosted EXPLAIN evidence in proof JSON.
- **Parallelization:** parallel-safe with T-P4-02 (different code regions of same file — coordinate). **Complexity:** Small-Medium.

## Phase P5 — CI / rollout gates

**Objective:** wire local proof into CI; define hosted-proof release gates + rollback runbook.

**Requirements addressed:** PERF-007, PERF-010.

**Prerequisites:** P3, P4.

**Exit criteria:** CI runs all local proofs on PRs; release gate runs hosted proof pre-rollout; rollback runbook in `13`.

### T-P5-01 — CI gate wiring
- **Requirement IDs:** PERF-007.
- **Target file (existing, modify):** `.github/workflows/ci.yml` — add a job running `bun run cf:d1-*-proof` (all local proofs) and asserting `passed:true`. Mirror how `check-performance-budgets.mjs` is wired (per `03` §4 note).
- **Failure cases:** local proof flaky in CI → 5-run nearest-rank p95; rerun policy.
- **Validation:** CI green on a PR touching only docs (proves the gate doesn't false-positive).
- **Completion evidence:** CI job exists and passes.
- **Parallelization:** sequential (CI config). **Complexity:** Small.

### T-P5-02 — Release gate + rollback runbook
- **Requirement IDs:** PERF-010.
- **Target files:** `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` (this plan, already drafted) — finalize thresholds; `.ai/10_state/decisions.md` — record the D1 budget contract decision.
- **Validation:** doc review; dry-run the rollback steps locally.
- **Completion evidence:** `13` complete; decisions entry added.
- **Parallelization:** parallel-safe with T-P5-01. **Complexity:** Small.

## Durable-goal contract per phase (directive 4A ULTRAGOAL-style)

| Phase | Goal ID | Stop condition | Blocker condition | Review gate | QA gate |
|---|---|---|---|---|---|
| P0 | G-P0 | helper + inventory land; unit tests green | helper signature rejected by P3 | type-check + unit | n/a (foundation) |
| P1 | G-P1 | migrations applied locally; local EXPLAIN confirms | migration number collision | migration test | hosted EXPLAIN (P4) |
| P2 | G-P2 | N+1 parity test green; LIMITs in place; cache test green | denial-parity fails | TEST-SEC-01/04 | HP-5 query-count flat |
| P3 | G-P3 | 8 local proofs green at 10× | repository SQL uncouplable | proof JSON well-formed | n/a (local) |
| P4 | G-P4 | hosted proof covers real repos + subrequest + EXPLAIN | no subrequest API (fallback) | TEST-SEC-02/03 | hosted p95 ≤ budget |
| P5 | G-P5 | CI gate + release gate + runbook live | CI false-positives | CI green on docs PR | hosted release gate |

## Files off-limits within this plan (re-stated)

- `supabase/migrations/**`, `wrangler.jsonc` DO/Queue/Email/cron bindings, `src/components/**` (UX), any provider project outside `wrangler.jsonc`.
