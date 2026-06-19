# DB Schema, Indexing & Query Performance — Evidence & Verification

**Date:** 2026-06-19 · Adversarial verification pass over `01-AUDIT-FINDINGS.md`.
Method: re-derived each claim against the **live** catalog (`ebxxqidacheyapmmzavr`, read-only
SQL) and the cited source files, trying to **refute** each finding. Live evidence captured
fresh — not inherited from the prior audit's reported numbers.

---

## Verification verdicts

| ID | Verdict | Severity (was → now) | Launch blocker | Key evidence |
|---|---|---|---|---|
| DBPERF-01 | **Confirmed** (minor scope adjust) | medium → medium | false | 84 unindexed FKs live; 7/8 named read-hot targets verified missing |
| DBPERF-02 | **Confirmed** | low → low | false | All 3 duplicate index pairs verified in live `pg_indexes` |
| DBPERF-03 | **REFUTED** | medium → n/a | false | **Zero** unwrapped `auth.*()` policies live; remediation already applied |
| DBPERF-04 | **Confirmed** | medium → medium | false | `select("*")` no-limit at repo `:560-567`; no covering index; 154 rows |
| DBPERF-05 | **Confirmed** | low → low | false | `.order("id")` at repo `:181`; chart-buckets RPC NOT shipped |
| DBPERF-06 | **Confirmed** | low → low | false | 18 `unused_index` live (up from 13) |
| DBPERF-07 | **Confirmed** | info → info | false | types.ts parity; process foot-gun only |
| DBPERF-08 | **Adjusted** | low → low | false | Real but RPC fix non-trivial (deliberate NULL); line citation stale |

**Launch blockers in this domain: 0.**

---

## Per-finding detail

### DBPERF-01 — CONFIRMED (scope corrected)
- **Live query:** counted FK constraints whose leading column lacks a covering index →
  **84 / 169** total FKs unindexed. Matches the advisor's `unindexed_foreign_keys = 84`.
- **Targeted check** of the 8 named read-hot FKs → 7 genuinely missing a leading index
  (`estimate_nodes.parent_id`, `estimate_sheet_members.estimate_project`,
  `notification_deliveries.project_id`, `project_favorites.project_workspace`,
  `project_group_memberships.project_workspace`, `project_members.project_workspace`,
  `project_publications.project_workspace`).
- **Refutation that landed:** `estimate_favorites(estimate_id)` **already has** a leading index
  → the prior audit over-listed it. Scope corrected in R1.
- **Overlap re-checked:** Phase-8 §2.1 exists on disk and names this subset → `covered-by`
  confirmed, unapplied.

### DBPERF-02 — CONFIRMED
- **Live `pg_indexes`** proved all three pairs:
  - `projects_workspace_id_idx (workspace_id)` IS a strict left-prefix of
    `projects_workspace_updated_at_idx (workspace_id, updated_at DESC)`.
  - `estimate_nodes` carries the plain `estimate_nodes_tab_parent_sort_idx` alongside two UNIQUE
    indexes on the identical `(estimate_tab_id, parent_id, sort_order)` tuple.
  - `project_publications` has both `_token_hash_idx` (plain) and `_token_hash_key` (UNIQUE).
- **Overlap re-checked:** Phase-8 §2.3 lists the unused *set* but not these as exact duplicate
  *pairs* → `partial` confirmed (this plan adds the precision).

### DBPERF-03 — **REFUTED** (the important one)
- **Prior claim:** "22 policies call `auth.uid()`/`auth.jwt()`/`auth.role()` NOT wrapped in
  `(select …)` … 22 policies remain unwrapped live, so [R5] remediation is incomplete."
- **What I did:** queried `pg_policies` directly and (a) counted policies using `auth.*()` and
  (b) counted those NOT wrapped in `( select auth.* )`. Result: **23 use auth, 0 unwrapped.**
- **Cross-check:** dumped the raw `qual`/`with_check` for every table the prior audit named as
  unwrapped (`profiles`, `project_favorites`, `estimate_favorites`, `project_groups`,
  `component_category_nodes`, `user_onboarding_profiles`). **Every** `auth.uid()` appears as
  `( SELECT auth.uid() AS uid )`. A second pass searching for ANY bare `auth.*()` not preceded
  by `select ` returned an **empty set**.
- **Corroborating artifacts:** migration `20260613201302_rls_initplan_is_workspace_member.sql`
  exists, and `bun run prove:rls-initplan` is a registered script.
- **Conclusion:** the init-plan remediation is **already applied across the catalog**. The prior
  finding's `pg_policies` scan was wrong — most likely it scanned migration *source text*
  (older un-wrapped CREATE POLICY statements that were later superseded) or used a regex that
  mis-classified the wrapped form. Phase-8 R5's "active RLS-initplan remediation" strength note
  is in fact **complete**, not incomplete. Removed from the remediation backlog.
- **Honesty note:** this verifies the *performance* shape (wrapped = InitPlan), NOT RLS
  *correctness* — that remains Domain 2's lane.

### DBPERF-04 — CONFIRMED
- **Source read** `src/lib/repositories/component-library-repository.ts:560-567`: confirmed
  `select("*")` on `cost_library_items`, `.eq(workspace_id)`, `.neq(lifecycle_state,'archived')`,
  `.order(category).order(name)`, **no `.limit()`**.
- **Live check:** no `cost_library_items(...category...name...)` index exists; 154 rows today.
- **Refinement:** the prior audit omitted the `.neq("lifecycle_state","archived")` filter — the
  remediation index should be PARTIAL (`WHERE lifecycle_state <> 'archived'`) to match.
- **Overlap re-checked:** Phase-8 §1#1/Q-E → `covered-by`, unapplied. Confirmed.

### DBPERF-05 — CONFIRMED
- **Source read** `project-charts-repository.ts:174-182`: rows `.order("id")` `.limit(5001)`;
  nodes (`:216-221`) `.order("sort_order")`. The matching index
  `estimate_row_items_estimate_node_sort_idx` leads on `(estimate_id, node_id, sort_order)` —
  serves the filter, not the `ORDER BY id`.
- **File-path note:** prior audit cited the path without the `repositories/` segment; the file
  is `src/lib/repositories/project-charts-repository.ts`. Content matches.
- **Live check:** `get_project_chart_buckets` is NOT in migrations or shipped code — only a
  forward-looking comment at `:117`. So "RPC supersedes this read" = deferred, accurate.

### DBPERF-06 — CONFIRMED
- **Live `pg_stat_user_indexes`:** 18 non-unique, non-primary indexes with `idx_scan = 0`.
  Matches the advisor's `unused_index = 18` (Phase-8 snapshot was 13 → growing). Confirmed.

### DBPERF-07 — CONFIRMED (info)
- Not re-counted against live (prior audit reported 55==55). The substance — types.ts is
  hand-spliced and a raw `gen:types` overwrite breaks the build — is corroborated by memory
  `supabase-types-not-pure-generated`. Process foot-gun, not a defect. No remediation.

### DBPERF-08 — ADJUSTED
- **Source read** `workspace-repository.ts:2004-2020`: `listProjectEstimates` runs the
  `project_estimate_list_summaries` RPC **in parallel with** a narrow all-nodes fetch
  (`id, estimate_id, kind, parent_id, sort_order`, no limit) solely to feed
  `selectFirstEstimateNodeIds`. Bounded, narrow, immaterial at 123 nodes.
- **Adjustments:**
  1. **Line citation stale:** prior audit (inheriting Phase-8) cited `1620-1683`; the live code
     is `2004-2020`. (1620-1683 is a *different* code path, `:1570`/`:1600`, also using the
     oracle — the oracle is used in 3 places.)
  2. **Fix is non-trivial:** the RPC returns `first_node_id = NULL` *deliberately*
     (`…rpc.sql:14-17`, Phase-8 line 93) because a flat SQL pick mis-targets link nodes; the JS
     oracle is link-aware/depth-first. Folding it in needs a window-function pick that exactly
     reproduces the JS, not a trivial column fill. Severity unchanged (low); effort/risk note
     corrected. Defer "only if measurement justifies."

---

## Proof gates per remediation item

| Item | Proof gate | What it proves | What it CANNOT prove |
|---|---|---|---|
| R1 (FK indexes) | `get_advisors(performance)` re-run shows the targeted `unindexed_foreign_keys` cleared, no new `unused_index`; EXPLAIN (ANALYZE) on each touched join/cascade path shows index use; `prove:membership-floor-triggers` / `prove:estimate-list-summaries` unchanged | indexes exist + planner *can* use them | real-world speedup — DB is too small for EXPLAIN timings to be meaningful (directional only; true validation needs representative seed = prior packs' Phase-3) |
| R2 (library bound) | `next build` (the "use server"/async gate); a targeted repo test that the limit + truncation flag fire; partial-index used in EXPLAIN; `get_advisors` no new lint | the limit + index land and the ORDER BY is index-served | UX acceptability of truncation — needs Domain 8 + owner sign-off on the affordance |
| R3 (drop duplicates) | Re-run `get_advisors` AFTER R1; EXPLAIN the affected tables' hot paths shows the surviving unique/composite index still used; `prove:*` unchanged | the dropped index was redundant (sibling still serves reads) | that the index is dead under *future* traffic — mitigated by it being a provable left-prefix/plain-of-unique, not a stats guess |
| R4 (chart order) | golden-master chart payload test stays green; (Option B) `get_project_chart_buckets` golden-master | aggregation parity / order determinism | scale behavior at the 5k cap — only matters post-beta |
| R5 (unused drop) | **N/A pre-beta — deferred.** Gate = longer `pg_stat_user_indexes` window + explicit sign-off | — | nothing locally; statistics-based, needs real traffic |
| R6 (first-node RPC) | a test that RPC `first_node_id` byte-matches `selectFirstEstimateNodeIds` across link/area/depth fixtures | the window-function pick equals the JS oracle | — |

### Honest limits of local checks (whole domain)
- **EXPLAIN ANALYZE is directional only** at current volume (largest table 154 rows). Plans
  will pick seq scans regardless of index presence because the tables fit in a page or two.
  True query-perf validation requires representative seed data — explicitly the prior packs'
  deferred Phase-3 work, not redone here.
- **Advisor lints are statistics-based** — "unused" on a young DB ≠ dead.
- This pass verified **performance shape and schema facts**, not RLS **correctness** (Domain 2)
  nor the app-side **fetch-shape refactor** (Domain 8).

---

## Cross-domain hand-offs
- **Domain 2 (RLS/RPC security):** DBPERF-03 is REFUTED on performance grounds (init-plan done);
  RLS *correctness* of the wrapped predicates still belongs to D2.
- **Domain 8 (data-fetch shape):** R2 library pagination and R6 first-node RPC need D2/D8
  coordination on user-visible truncation and RPC shape.
