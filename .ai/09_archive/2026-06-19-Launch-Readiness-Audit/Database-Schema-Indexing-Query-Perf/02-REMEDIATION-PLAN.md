# DB Schema, Indexing & Query Performance — Remediation Plan

**Date:** 2026-06-19 · **Pass:** adversarial verification + remediation planning
**Verifier verdict (headline):** Confirmed the prior audit's headline — **no launch
blocker in this domain**. One finding (DBPERF-03, RLS init-plan) is **REFUTED**: the
init-plan remediation is already applied live (zero unwrapped `auth.*()` policies in the
catalog), so it is removed from the remediation backlog. Everything else is deferred scale
debt, safe to land post-beta, with one small read-hot FK-index batch as the most defensible
pre-launch action.

This plan covers only CONFIRMED / ADJUSTED findings. See `03-EVIDENCE-AND-VERIFICATION.md`
for the per-finding verdicts and the refutation of DBPERF-03.

---

## Launch-blocker count: 0

Nothing here blocks closed-beta. Data is tiny (largest table 154 rows; projects=3,
estimates=3, estimate_nodes=123, estimate_row_items=129). All lints are INFO-level and
currently cheap. This plan is **scale-debt hygiene** sequenced for "before the first
data-heavy tenant," not "before launch."

---

## Sequenced remediation (priority order)

### R1 — Read-hot FK index batch (DBPERF-01) · P1 · effort S
**Why first:** highest-leverage, lowest-risk, additive-only, reversible. Backs the join /
cascade-delete / RLS-predicate paths that grow with any real tenant.

**Verified-missing targets (live `pg_index` check, 2026-06-19):**
- `estimate_nodes(parent_id)` — tree-descent + parent cascade delete
- `estimate_sheet_members(estimate_project)`
- `notification_deliveries(project_id)` (and `estimate_id`, `workspace_id` per advisor)
- `project_favorites(project_workspace)`
- `project_group_memberships(project_workspace)`
- `project_members(project_workspace)`
- `project_publications(project_workspace)`

**Scope correction vs prior audit:** `estimate_favorites(estimate_id)` already HAS a leading
index — drop it from the add list (DBPERF-01 over-listed it). Verify each candidate against
`pg_index` immediately before authoring DDL; do not trust the static list.

**Steps:**
1. EXPLAIN (ANALYZE, BUFFERS) the join/cascade paths for each target table BEFORE adding,
   to capture the seq-scan baseline (directional only at this volume — see evidence doc on
   what EXPLAIN can/can't prove on a tiny DB).
2. Author ONE additive migration under `supabase/migrations/` using
   `CREATE INDEX CONCURRENTLY IF NOT EXISTS …` (CONCURRENTLY cannot run inside a txn block —
   the migration must not be wrapped in BEGIN/COMMIT; one statement per index).
3. Keep the read-hot subset only (~7–10 indexes). **Defer the ~70 audit/AI FK indexes**
   (write-heavy, read-cold; they only speed cascade deletes and add write cost now).
4. Re-run `get_advisors(performance)` and confirm the targeted `unindexed_foreign_keys`
   lints clear with no new `unused_index` regressions.

**Files:** one new `supabase/migrations/<ts>_readhot_fk_indexes.sql`.
**Migration/RLS notes:** purely additive; no RLS change. CONCURRENTLY = no table lock.
**Risk:** Low. **Effort:** S. **Dependencies:** none. Must precede R3 (drop gate reads the
post-add advisor set — Phase-8 GAP-7).
**Overlap:** covered-by `2026-06-17-Performance-Refactor/14_PHASE_8_SUPABASE_DB_PLAN.md` §2.1
(unapplied). This plan is the execution of that subset.

---

### R2 — Bound the unbounded `cost_library_items` library read (DBPERF-04) · P2 · effort M
**Why:** highest-leverage *read* risk in the domain. Today 154 items is fine; a thousand-item
workspace ships the entire library (items + price options + variant cost entries) on every
library open, with the ORDER BY falling back to an in-memory sort (no covering index).

**Steps:**
1. Add covering index `cost_library_items(workspace_id, category, name)
   WHERE lifecycle_state <> 'archived'` (partial, to match the live query's `.neq` filter at
   `component-library-repository.ts:564`). This serves the ordered scan in R1's migration or a
   sibling migration.
2. In `src/lib/repositories/component-library-repository.ts:560-567`:
   - Replace `select("*")` with an explicit column list.
   - Add the `.limit(N+1)` overflow pattern (PAT-23) + a "library truncated" affordance, OR
     coordinate a paginated/virtualized load with Domain 8 / Performance-Refactor Phase 4.
3. The fan-out `price_options` / `variant_cost_entries` reads (`:602-625`) are already
   `.in("item_id", itemIds)`-batched and scoped — they inherit the bound once item count is
   capped; no change needed beyond confirming they stay capped to the limited item set.

**Files:** `src/lib/repositories/component-library-repository.ts`; one migration for the index.
**Migration/RLS notes:** additive index; no RLS change. Confirm the partial-index predicate
matches the query predicate exactly or Postgres won't use it.
**Risk:** Low-Med (limit changes user-visible payload — needs the truncation affordance to be
honest). **Effort:** M. **Dependencies:** Domain 8 (fetch-shape ownership) for the
pagination decision; the index half is independent and can ship in R1's migration.
**Overlap:** covered-by Phase-8 §1#1 / Q-E (unapplied). Resolve Q-E (Lite vs full loader call
path) before changing the limit — the in-estimate Lite panel and the Library management surface
have different tolerance for truncation.

---

### R3 — Drop confirmed-duplicate indexes (DBPERF-02) · P3 · effort S · GATED
**Why:** pure write-cost waste, zero read benefit. But destructive — gate hard.

**Verified-duplicate pairs (live `pg_indexes`, 2026-06-19):**
- `projects_workspace_id_idx (workspace_id)` — strict left-prefix of
  `projects_workspace_updated_at_idx (workspace_id, updated_at DESC)`. Drop the single-col one.
- `estimate_nodes_tab_parent_sort_idx` (plain `(estimate_tab_id, parent_id, sort_order)`) —
  redundant with the two UNIQUE indexes on the same tuple (`estimate_nodes_tab_unique_sort`,
  `estimate_nodes_tab_unique_sort_with_root NULLS NOT DISTINCT`). Drop the plain one.
- `project_publications_token_hash_idx` (plain) — redundant with
  `project_publications_token_hash_key` (UNIQUE) on `token_hash`. Drop the plain one.

**Steps:**
1. **Run R1 FIRST**, then re-run `get_advisors`. Per Phase-8 GAP-7, confirm none of these is
   the better backing for a narrower add R1 introduced (esp. the `estimate_nodes` tab family vs
   any `estimate_nodes(parent_id)` single-col add — they cover different leading columns, so
   this is safe, but verify).
2. Author a SEPARATE migration: `DROP INDEX CONCURRENTLY IF EXISTS …` for the three plain
   duplicates only. Keep the original `CREATE` DDL inline as a comment for instant rollback.
3. Do NOT touch the unique indexes — they back constraints.
4. Re-run advisor; confirm no new seq-scan regressions on the affected tables' hot paths.

**Files:** one new `supabase/migrations/<ts>_drop_duplicate_indexes.sql`.
**Risk:** Medium (destructive, but the dropped indexes are provably redundant left-prefixes /
plain-of-unique, so the unique/composite siblings still serve every read). **Effort:** S.
**Dependencies:** must follow R1.
**Overlap:** partial Phase-8 §2.3/Q-J — Phase-8 names the unused *set* but does not call out
these three as exact duplicate pairs; this plan adds that precision.

---

### R4 — Chart row-fact ordering (DBPERF-05) · P4 · effort S · accept-for-beta
**Why:** `project-charts-repository.ts:174-182` orders `estimate_row_items` by `id`
(`.limit(5001)`), which is not the leading-edge of `estimate_row_items_estimate_node_sort_idx
(estimate_id, node_id, sort_order)`, so the matched rows get an in-memory sort before
truncation. Immaterial at 129 rows.

**Steps (only if chart load becomes a hotspot at scale):**
- Option A: order by an indexed key (`node_id, sort_order`) for index-ordered truncation
  determinism (note: changes WHICH rows survive truncation — must keep `didTruncate` banner).
- Option B (preferred long-term): ship `get_project_chart_buckets` RPC (drafted in code
  comment at `project-charts-repository.ts:117`, NOT yet a migration) so rows aggregate
  server-side and never cross the wire un-aggregated. This supersedes the read entirely.

**Files:** `src/lib/repositories/project-charts-repository.ts` + (Option B) a new RPC migration.
**Risk:** Low. **Effort:** S (Option A) / M (Option B). **Dependencies:** Option B is the
deferred Phase-8 §3 chart-buckets work. **Recommendation: defer; accept for beta.**
**Overlap:** partial Phase-8 §3.

---

### R5 — Unused-index re-evaluation (DBPERF-06) · P5 · effort S · DEFER
**Why:** 18 `unused_index` entries live (up from 13 at Phase-8 snapshot). Each is write cost
for zero current read benefit — BUT the advisor is statistics-based on a young/low-traffic DB;
low traffic ≠ dead (a `token_hash` / `unsubscribe` index may be hit rarely but critically).

**Steps:** Do NOT drop on beta volume. Open a longer `pg_stat_user_indexes` observation window
post-beta; only then evaluate. The only safe-to-drop-now subset is the three exact duplicates
in R3 (which the advisor will keep listing until R3 runs).
**Risk:** dropping prematurely = critical-but-rare index loss. **Effort:** S. **Defer.**
**Overlap:** covered-by Phase-8 §2.3/Q-J.

---

### R6 — First-node oracle into RPC (DBPERF-08) · P5 · effort M · DEFER (adjusted)
**Why (adjusted from prior audit):** `listProjectEstimates` at
`workspace-repository.ts:2004-2020` fetches a narrow-column projection of **all** nodes for all
estimates of a project (`id, estimate_id, kind, parent_id, sort_order`) only to pick one
first-node per estimate in JS via `selectFirstEstimateNodeIds`. Bounded and narrow, immaterial
at 123 nodes.

**Adjustment vs prior audit:** the prior finding (and Phase-8 §1#7) implied a clean fold into
`project_estimate_list_summaries`. That RPC **deliberately** returns `first_node_id = NULL`
(`…rpc.sql:14-17`, per Phase-8 line 93) because a flat SQL pick mis-targets *link* nodes — the
JS oracle honors a depth-first/area-first ordering a naive `min(sort_order)` does not
reproduce. So this is NOT a trivial column fill; it needs a window-function pick that exactly
matches `selectFirstEstimateNodeIds`. **Only do this if measurement justifies it.** The prior
audit's line citation (`1620-1683`) is stale — the code is at `2004-2020` now.

**Files:** the `project_estimate_list_summaries` RPC migration + remove the JS oracle.
**Risk:** Medium (must byte-match the JS oracle's link-aware ordering or first-node selection
silently changes). **Effort:** M. **Defer.**
**Overlap:** covered-by Phase-8 §1#7 (P3, "only if measurement justifies").

---

## Out of scope / removed from backlog

- **DBPERF-03 (RLS init-plan)** — **REFUTED, removed.** The live catalog shows **zero**
  unwrapped `auth.*()` predicates; every reference is `( SELECT auth.uid() AS uid )`. Migration
  `20260613201302_rls_initplan_is_workspace_member.sql` + `prove:rls-initplan` already cover it.
  No remediation needed. (Details in evidence doc.)
- **DBPERF-07 (types.ts)** — info only; process foot-gun, not a code defect. Keep the
  "splice additively, never raw `gen:types` overwrite" note near the gen script. No change.
- **The ~70 audit/AI FK indexes** — write-heavy, read-cold; deliberately deferred.

---

## Suggested execution order

1. R1 (read-hot FK indexes) — ship pre-launch if shipping anything; it's the defensible one.
2. R2 index half (covering index) can ride in R1's migration; R2 app-code bound coordinates
   with Domain 8 — can land post-launch.
3. R3 (drop duplicates) — after R1 + a fresh advisor pass.
4. R4/R5/R6 — defer to post-beta observation window.

Any *implementation* spun from this plan is HIGH-BLAST-RADIUS (DB/index) → run as its own dated
pack with a Codex review gate per `AGENT_OPERATING_PROTOCOL.md`. This pack is audit+plan only.
