# DB Schema, Indexing & Query Performance — Audit Findings

**Date:** 2026-06-19 · **Auditor domain:** 3 (DB Schema/Indexing/Query Perf)
**Live target inspected:** Supabase `ebxxqidacheyapmmzavr` (read-only), 55 base tables,
113 RLS policies, ~89 index DDL statements across 111 migrations.

## Scope & coverage

**Read deeply:** all 111 `supabase/migrations/*.sql` (index/FK/constraint grep + targeted
reads of core schema, estimate tabs, mass-deletion, shared-link), `src/lib/repositories/*`
(component-library, cost-library, estimate, project-charts, project-data, workspace, est-sheets,
favorites), `src/lib/projects/*`, `src/lib/project-charts/*`, `src/lib/supabase/types.ts`
(4,505 lines), `scripts/audit-dbidx-repo.ts`, `scripts/sql/*`.

**Live evidence captured (not assumed):** `get_advisors(performance)` = 84 `unindexed_foreign_keys`
+ 18 `unused_index` + 1 `auth_db_connections_absolute` (all INFO); `pg_stat_user_tables`
(volumes + seq/idx scans); `pg_indexes` for hot tables; `pg_policies` auth-wrapping scan;
`pg_proc` volatility/secdef for RLS helpers; `pg_get_functiondef` for the list-summaries RPC;
live table list vs `types.ts` diff.

**Deferred:** EXPLAIN ANALYZE under representative seed (DB is tiny today — directional only;
this is the prior packs' Phase-3 work). Domain-2 RLS *correctness*. Domain-8 fetch-shape refactor.

## Headline verdict

**No hard launch blocker in this domain.** Data volume is tiny (largest table 1,168 rows;
projects=3, estimates=3, estimate_nodes=123). Cache hit rates are effectively 100%; all
"unindexed FK" and "unused index" lints are INFO-level and currently cheap. The schema is
well-designed: scoped composite indexes on the true hot paths exist, the chart repo is
column-projected + bounded, and the aggregation RPC is set-based. The real risk is **deferred
scale debt**: the FK-index and duplicate-index work is *planned but not applied*, and a handful
of RLS predicates re-evaluate `auth.*()` per row. None of this bites at beta volume, but it
should land before any data-heavy tenant arrives. The most defensible launch action is to ship
the small read-hot FK-index batch and let the rest ride.

---

## Reconciliation vs prior packs

| Prior pack | What it covers | This pack's relation |
|---|---|---|
| `database-indexing-and-query-performance` (DBIDX-001..005) | Full audit method, query SQL, FK-bucket policy, candidate index list, EXPLAIN protocol — **planning only, never executed; shared-link drift was an open question** | Executes the live read-only inventory the pack asked for; **resolves the shared-link drift (NOT drift — tables exist live)**; confirms candidates still unapplied. |
| `2026-06-17-Performance-Refactor/14_PHASE_8_SUPABASE_DB_PLAN.md` | Read-hot FK-index ADD subset (§2.1), unused-index DROP gate Q-J (§2.3), unbounded component-library read (§1#1), RPC hardening | Confirms all still unapplied with fresh advisor numbers (87→84 FK lints, 13→18 unused); re-affirms the GAP-7 "don't drop the composite that backs §2.1 adds" caveat. |
| archived `.ai/09_archive/2026-06-19-Projects-Page-Performance/` | App-side projects-page fetch perf | Adjacent; DB-side index support noted, no overlap on schema. |
| `.ai/09_archive/2026-06-19-Workshop-Dashboard-Query-Batching` | `workspace_homebase_summary` RPC + serial-tail batching | Cross-ref only; that RPC's batching is Domain 8. |
| memory: `supabase-types-not-pure-generated` | `types.ts` hand-edited; raw `gen:types` overwrite breaks build | **Confirmed parity today** (DBPERF-07): 55 live tables == 55 types.ts tables, zero drift. Risk is the *regeneration process*, not current state. |

---

## Findings

### DBPERF-01 — Read-hot foreign-key indexes still unapplied (84 unindexed FKs live)
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Evidence:** `get_advisors(performance)` → 84 `unindexed_foreign_keys` (INFO). Read-relevant
  subset confirmed still missing live: `estimate_nodes_parent_id_fkey`,
  `estimate_favorites(estimate_id/project_workspace)`, `project_favorites_project_workspace_fkey`,
  `project_members_project_workspace_fkey`, `project_group_memberships_project_workspace_fkey`,
  `estimate_sheet_members(estimate_project)`, `notification_deliveries(project_id/estimate_id/workspace_id)`,
  `project_publications_project_workspace_fkey`. Plan: `2026-06-17-Performance-Refactor/14_PHASE_8_SUPABASE_DB_PLAN.md` §2.1.
- **Impact:** At beta volume, joins/cascade-deletes seq-scan tiny tables — negligible now. As any
  tenant grows estimate trees / favorites / notifications, these become slow joins and slow parent
  cascade deletes (mass-deletion governance path). RLS predicates that hop through these FKs inherit the cost.
- **Recommendation:** Apply the §2.1 read-hot subset only (~12 indexes) via `CREATE INDEX CONCURRENTLY`
  in one additive migration, after EXPLAIN evidence. **Defer the ~70 audit/AI FK indexes** (write-heavy,
  read-cold — they only slow cascade deletes).
- **effort:** S · **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor/14_PHASE_8 (§2.1) — unapplied

### DBPERF-02 — Duplicate / redundant indexes burning write cost
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Evidence (live `pg_indexes`):**
  (a) `projects_workspace_id_idx (workspace_id)` is a strict left-prefix of
  `projects_workspace_updated_at_idx (workspace_id, updated_at DESC)` → fully redundant for reads.
  (b) `estimate_nodes` carries THREE indexes on `(estimate_tab_id, parent_id, sort_order)`:
  `estimate_nodes_tab_parent_sort_idx` (plain, advisor-flagged **unused**),
  `estimate_nodes_tab_unique_sort` (unique), `estimate_nodes_tab_unique_sort_with_root`
  (unique, NULLS NOT DISTINCT). The plain one is redundant with the unique ones.
  (c) `project_publications` has both `project_publications_token_hash_idx` (plain) and
  `project_publications_token_hash_key` (unique) on `token_hash` → duplicate.
- **Impact:** Each estimate-node insert/reorder maintains 4 tab-scoped index entries where 1–2 suffice;
  each publication token write maintains 2 hash indexes. Pure write overhead, no read benefit. Trivial now.
- **Recommendation:** Drop `projects_workspace_id_idx`, `estimate_nodes_tab_parent_sort_idx`, and one of
  the `token_hash` indexes — but **per Phase-8 GAP-7, re-run `get_advisors` AFTER any FK adds and confirm
  the dropped composite is not the better backing for a narrower add** (esp. the `estimate_nodes` tab-scope
  family vs a proposed `estimate_nodes(estimate_tab_id)` single-col). Gate behind a longer observation window.
- **effort:** S · **existing_plan_overlap:** partial:2026-06-17-Performance-Refactor/14_PHASE_8 (§2.3, Q-J) — names the unused set but does not call out (a)/(c) as exact duplicate pairs

### DBPERF-03 — RLS predicates re-evaluate `auth.*()` per row (init-plan cost)
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Evidence:** `pg_policies` scan → 22 policies call `auth.uid()`/`auth.jwt()`/`auth.role()`
  **not** wrapped in `(select …)`, so Postgres treats them as volatile-per-row instead of an InitPlan.
  Affected tables incl. `profiles` (2), `project_favorites`, `project_group_memberships`, `project_groups`,
  `estimate_favorites`, `component_category_nodes` (3), `notification_definitions/deliveries`,
  `ai_*` (insert checks), `legal_terms_acceptances`, `user_onboarding_profiles`, `collaboration_invitations`.
  Counter-evidence that the cost is bounded today: RLS helper functions (`is_workspace_member`,
  `can_access_project`, etc.) are `STABLE SECURITY DEFINER` (cached within a statement); `workspace_members`
  (1 row) shows 1.36M seq-scans and `profiles` (4 rows) 806K — huge *counts* but trivial *cost* at this size.
- **Impact:** On any table that returns many rows under one of these policies (favorites lists, notification
  feeds, category nodes), the unwrapped `auth.*()` re-runs per candidate row. Negligible at 3–685 rows; a real
  CPU tax once a tenant has thousands of rows in those tables.
- **Recommendation:** Wrap each `auth.*()` in `(select auth.*())` so it becomes a one-time InitPlan. This is a
  mechanical, behavior-preserving rewrite. **Policy *correctness* is Domain 2's lane** — see cross_domain_notes;
  this finding asserts only the performance characterization and the fix shape. Supabase's own advisor does NOT
  flag these (it has no `auth_rls_initplan` lint enabled here), so it is a genuine gap.
- **effort:** M · **existing_plan_overlap:** partial:2026-06-17-Performance-Refactor (R5 notes "active RLS-initplan remediation" as a strength — but 22 policies remain unwrapped live, so that remediation is incomplete)

### DBPERF-04 — Unbounded `cost_library_items` + full price/variant graph read
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Evidence:** `src/lib/repositories/component-library-repository.ts:560-567` selects `*` from
  `cost_library_items WHERE workspace_id … ORDER BY category, name` with **no `.limit()`**; then `:602-652`
  fan out `price_options` / `variant_cost_entries` / history via `.in("item_id", itemIds)` over **all** item ids.
  No `cost_library_items_workspace_category_name_idx` exists live (would back the ORDER BY); item count today=154.
- **Impact:** The whole library payload is unbounded by design. At 154 items it is fine; a workspace with
  thousands of cost items ships the entire library (plus all price options/variants/history) on every library
  open, and the ORDER BY falls back to a sort. This is the highest-leverage *read* risk in the domain.
- **Recommendation:** (1) Add a covering index `(workspace_id, category, name)` to serve the ordered scan.
  (2) Bound the read with the `.limit(N+1)` overflow pattern + a "library truncated" affordance, OR move to a
  paginated/virtualized library load (coordinate with Domain 8 / Phase-4). Replace `select("*")` with explicit columns.
- **effort:** M · **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor/14_PHASE_8 (§1#1, gated Q-E) — unapplied

### DBPERF-05 — Chart row facts ordered by a non-indexed column (`id`)
- **Severity:** low · **launch_blocker:** false · **confidence:** medium
- **Evidence:** `project-charts-repository.ts:174-182` loads `estimate_row_items` filtered
  `.in("estimate_id", …)` ordered `.order("id")` with `.limit(5001)`. The only matching index is
  `estimate_row_items_estimate_node_sort_idx (estimate_id, node_id, sort_order)` — it serves the
  `estimate_id` filter but the `ORDER BY id` forces a sort of the matched rows. Node facts (`:216-221`)
  order by `sort_order`, partially served by `(estimate_id, parent_id, sort_order)`.
- **Impact:** When an estimate approaches the 5,000-row cap, the ordered-by-`id` truncation sorts up to 5k rows
  in memory per chart load. Correct and bounded, just not index-ordered. Immaterial at 129 rows total today.
- **Recommendation:** Acceptable for beta. If chart load becomes a hotspot at scale, either order by an
  indexed key (`node_id, sort_order`) for truncation determinism, or push aggregation into the
  `get_project_chart_buckets` RPC (already drafted, deferred) so rows never cross the wire un-aggregated.
- **effort:** S · **existing_plan_overlap:** partial:2026-06-17-Performance-Refactor/14_PHASE_8 (§3 chart-buckets RPC supersedes this read)

### DBPERF-06 — 18 `unused_index` entries (write-cost waste, statistics-based)
- **Severity:** low · **launch_blocker:** false · **confidence:** medium
- **Evidence:** `get_advisors` → 18 `unused_index` (up from 13 in the Phase-8 snapshot): incl.
  `shared_link_recipients_*` (×4), `notification_definitions_*` (×3), `project_publications_published_by_idx`,
  `project_publications_workspace_idx`, `collaboration_invitations_estimate_email_idx`, `profiles_role_idx`,
  `estimate_nodes_tab_parent_sort_idx`, `workspace_account_settings_country_idx`, etc.
- **Impact:** Each maintained on writes for zero current read benefit. Trivial today; the count *growing*
  (13→18) means more dead-index write cost is accruing as features land.
- **Recommendation:** Do NOT drop on a young/low-traffic DB — the advisor is statistics-based and low traffic
  ≠ dead (a `token_hash`/`unsubscribe` index may be hit rarely but critically). Defer to a post-beta observation
  window; only the confirmed-duplicate subset in DBPERF-02 is safe to drop sooner.
- **effort:** S · **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor/14_PHASE_8 (§2.3 Q-J)

### DBPERF-07 — `types.ts` is in parity now, but the regeneration process is a foot-gun
- **Severity:** info · **launch_blocker:** false · **confidence:** high
- **Evidence:** Diff of `Tables:` keys in `src/lib/supabase/types.ts` (55) vs live base tables (55) =
  **zero drift in either direction**. Per memory `supabase-types-not-pure-generated`, the file has been
  hand-spliced and a raw `gen:types` overwrite breaks the build.
- **Impact:** No current correctness risk. The risk is a future agent running `bun run gen:types` and
  overwriting hand-added pieces, breaking `next build` (which is the only gate that catches it).
- **Recommendation:** No change needed for launch. Keep the "splice additively, never raw-overwrite" note
  near the gen script; out of scope to fix here.
- **effort:** S · **existing_plan_overlap:** covered-by:memory/supabase-types-not-pure-generated

### DBPERF-08 — `listProjectEstimates` first-node oracle fetches all nodes for all estimates
- **Severity:** low · **launch_blocker:** false · **confidence:** medium
- **Evidence:** `2026-06-17-Performance-Refactor/14_PHASE_8` §1#7 cites
  `workspace-repository.ts:1620-1683 (:1661-1665)` — fetches every node of every estimate to pick one
  first-node per estimate in JS. Bounded but wasteful; the `project_estimate_list_summaries` RPC
  (verified live: `STABLE`, set-based, single pass) already returns aggregates and is the right home for this.
- **Impact:** Extra node volume pulled into the app on the estimate-list path; immaterial at 123 nodes.
- **Recommendation:** Fold the first-node pick into `project_estimate_list_summaries` (the RPC already returns
  a `first_node_id` column that is currently always NULL — `null::uuid as first_node_id`), eliminating the JS oracle.
- **effort:** M · **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor/14_PHASE_8 (§1#7)

---

## What is explicitly NOT a problem (do not re-flag)

- **Shared-link schema drift** — RESOLVED. `shared_link_recipients/comments/events/responses` all exist live;
  the DBIDX-001 "possible drift" caveat is stale.
- **N+1 in repositories** — none found. Fan-out reads use `.in(item_id, ids)` batching, not per-row loops.
- **`project_estimate_list_summaries` / chart repo fetch discipline** — strong (set-based RPC, explicit columns,
  `.limit(N+1)` overflow). Generalize, don't rebuild.
- **Migration count** — 111 live migrations (the task prompt's "~57" is stale).
