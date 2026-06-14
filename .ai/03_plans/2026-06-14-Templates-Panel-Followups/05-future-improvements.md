# Future improvements — templates panel & insert flows

**Last updated:** 2026-06-14
**Status:** Ideas / backlog — not yet scoped into the fix pass. Mix of quick wins and larger bets.

These go beyond the strictly-deferred audit findings. Roughly ordered by value-to-effort.

---

## A. Quick wins (low risk, do soon)

### A1. Hover-prefetch the lite library query (audit PERF-2) — **recommended next**
The panel's data (`WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY`) is only fetched once the sheet route mounts, so every navigation pays a blocking skeleton. The infra already exists (`usePrefetchOnHover`, `src/hooks/use-prefetch-on-hover.ts`) and the query-keys file even documents that hover-prefetch "must use the EXACT same key" — but no caller wires it. **Wire `usePrefetchOnHover` on the estimate/project links that lead into the sheet** so the panel renders warm. Low risk, high felt speedup. Pairs well with PERF-1 (lazy nodes) for a near-instant warm panel.

### A2. Regression tests for the 2026-06-14 fixes — **lock in what we fixed**
Add focused tests so these can't silently regress:
- **RS-1:** inserting a template/project-source while the active tab is a **non-default** tab refreshes *that* tab (assert the action receives `targetTabId` and the displayed tree is the active tab's). This was the highest-impact bug and currently has no direct test.
- **INS-1:** a category drop (multiple templateIds) onto a group calls the **batched** `insertEstimateTemplatesIntoEstimate` once (not N single inserts) and ends with all templates present.
- **INS-2:** a failing template insert shows an error toast.
- **PERF-5:** EstimateRightSidebar is wrapped in `React.memo` (source-string or render-count assertion).

### A3. Split skeleton injection from the base tree build (audit UI-10)
`TemplatesTree` rebuilds the entire JSX-bearing `uiNodes` whenever a loading-id set changes, just to inject ~3 skeleton rows under one expanding node. Memoize the base `buildTemplatesTreeNodes(filteredTemplates, filteredProjectSources)` (depends only on filtered data), then apply `injectProjectSourceSkeletons` as a cheap second memo keyed on base + loading sets. The expensive JSX build then skips recompute on loading-id churn.

### A4. Collapse the remaining parallel tree builds (audit UI-3, partial)
The 2026-06-14 pass removed the per-render `templatesAllNodeIds` build (PERF-4). Still remaining: `buildTemplatesSelectionNodes` builds a parallel selection structure from the same source the tree already builds. Derive selection ids from one shared plain-data structure instead of a second full walk.

---

## B. Larger bets

### B1. Memoize the shared `Tree` primitive's row props (root cause of per-row cost)
`src/components/ui/tree.tsx` (~`1129-1148`) rebuilds fresh `state`/`rowProps` objects for **every** flattened row on every render, which defeats the `memo` on `DefaultTreeRow` — so `renderRow` re-executes for all visible rows on every parent re-render. This is the **multiplier** behind several template-panel perf findings (and it's shared by the estimate sheet, library, and templates trees). Memoizing per-row `state`/`rowProps` (stable keys + `useCallback`'d handlers reading `data-*`) would benefit the whole app. **High leverage but high blast radius** — needs its own plan + careful regression testing across every Tree consumer.

### B2. Virtualize the templates / library / source trees
For large workspaces the trees render every visible node. Once B1 lands, add windowing (e.g. virtual rows) so render cost is bounded by viewport, not total node count. Gate on a node-count threshold so small trees stay simple.

### B3. Optimistic project-source insert
Project-source inserts are non-optimistic today (the source subtree isn't resident client-side), so they feel laggy and have the RS-6 bulk race. If PERF-1's on-demand node loading lands, the source subtree could be made resident on drag/expand, enabling an optimistic insert with the same revision-guard discipline as template inserts — smoother UX and a cleaner fix for RS-6.

### B4. Panel-open latency telemetry
There's no production timing for "panel ready". Add a lightweight performance mark from panel mount → first interactive (and the lite query resolve) so PERF-1/PERF-2 wins are measurable in the field, not just in dev. (Tie into whatever RUM is reinstated — see the site-wide perf audit pack.)

---

## C. Owner-gated DB hygiene (from the A5 DB/RPC audit — no urgency, schedule with a migration window)

All template/subtree functions and tables are **already applied on hosted with no drift** (verified 2026-06-14). The only DB items are cheap hygiene, owner-gated because they're hosted writes:

- **Drop the redundant index** `estimate_nodes_tab_parent_sort_idx` — it duplicates the `(estimate_tab_id, parent_id, sort_order)` unique-constraint index and the perf advisor flags it **unused**; it only adds write amplification on the hot insert path.
- **Before estimates grow large,** add `index on estimate_nodes(parent_id)` and `estimate_template_nodes(parent_id)` — the recursive subtree copy and the per-row `validate_estimate_node_tree` cycle-walk join on `parent_id` (no live impact at current ~139 nodes).
- **Revisit double validation** — `validate_estimate_node_tree` runs both as an explicit in-RPC call and as a per-row deferred constraint trigger (N+1 full-tree walks per bulk insert). Consider a statement-level trigger or dropping the explicit call at scale.
- **Advisor noise (optional):** `revoke execute … from anon` on `can_access_estimate` / `can_edit_estimate` to quiet the security advisor (they already return false for anon — no behavior change).

## References

- 2026-06-14 audit set (UI, insert-flows, reusable-sources, data/caching, DB/RPC) + the templates-panel fix report.
- Site-wide performance pack: `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/`.
