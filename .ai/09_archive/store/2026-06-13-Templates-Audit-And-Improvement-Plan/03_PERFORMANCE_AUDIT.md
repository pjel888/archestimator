# 03 — Performance Audit

**Lens:** Fetching strategy, query fan-out / N+1, caching, unbounded reads, render performance, and compliance with the origin plan's performance budgets. Findings labelled VERIFIED (structural, from code) or ASSUMPTION (needs runtime measurement).

**Context note:** The origin budgets live at `.ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates/02_TARGET_ARCHITECTURE.md:174-178`. They assume `estimate_tabs` is applied; today it is not (see [01](01_CURRENT_STATE_AUDIT.md) §6), so the reusable-source outline path **500s before any perf budget is reached**. The findings below describe the steady-state behaviour once the outline path is fixed — they remain the performance shape of the feature and must be addressed as part of any "make this a top feature" effort.

---

## Fetching & caching map

| Surface | Data | Server/Client | Trigger | Cache | Round-trips |
|---|---|---|---|---|---|
| Templates route load | all custom templates (+nodes +rows) and the project list | Server (`page.tsx:13-16`) | route load | Next dynamic (auth ⇒ no static); no `revalidate` | templates: 1+1+1 (unbounded); `listReusableProjectSources` ⇒ `listCurrentWorkspaceProjects` (~6) |
| Browse: expand project | estimate list | server action `listReusableProjectEstimateSources` (`TemplatesBrowseManager.tsx:654`) | click | local state + `projectEstimateLoadedProjectIds` (session-cached) | re-runs `listCurrentWorkspaceProjects` (~6) + 1 estimates query |
| Browse: expand estimate (outline) | all tabs + full node/row tree of every tab | server action `getReusableEstimateOutline` (`:688`) | click | local state, **guarded only by `hasReusableEstimateOutline` — no loaded-id set; collapse+re-expand refetches** | 1 estimate + 1 tabs + **per tab**: 1 estimate + 1 tab + 1 nodes + 1 rows |
| Dock search (estimate page) | projects → estimates → tabs → **full tab trees** | server action `searchReusableProjectSources` (`index.tsx:977`) | debounced typing (250ms) | **none** | `listCurrentWorkspaceProjects` + N estimate queries + per-estimate per-tab (tabs + tabTree×T) |
| Insert picker open | projects + estimate lists | server action `listEstimateInsertTargets` (`actions.ts:1301`) | open | **none** | `listCurrentWorkspaceProjects` (~6) + 1 estimate query per accessible project |
| Editor initial tab | active tab tree | Server (`[nodeId]/page.tsx:35`) | route load | seeds TanStack `tabTree(estimateId,tabId)` via `initialData` | 1 node-route + 1 estimate + 1 tab + 1 nodes + 1 rows |
| Editor tab switch | other tab tree | client `useEstimateTabTreeQuery` (`use-estimate-query.ts:102`) | in-place | `staleTime 5m`, no focus refetch, per `(estimateId,tabId)` | ≤1 `fetchEstimateTabTree` (cached after first) |
| Editor dock library | component library + templates | client `useQuery(["workspace-component-library"])` (`EstimateSheetContent.tsx:722`) | open | `staleTime 5m`, mutation-invalidated | **~12 queries / ~4 serial stages** (lazy, post-hydration — gates the whole sidebar; see PERF-9) |
| Insert template (RPC) | set-based copy + history | server action → RPC | confirm | n/a | 1 RPC (2 bulk inserts + whole-estimate validation) |

---

## Findings

| ID | Sev | Area | Finding | Evidence | Impact (assumed scale) | Optimization |
|---|---|---|---|---|---|---|
| PERF-1 | **P1** | N+1 / search | `searchReusableProjectSources` walks **every project → every estimate → every tab's full node+row tree** for the whole workspace on each debounced search; `getEstimateTabTree` re-loads the estimate row per call. | `reusable-sources/actions.ts:99-188` (loop `getEstimateTabs:137`, `Promise.all(getEstimateTabTree):138-140`); wired `index.tsx:977` | 20 projects × 5 estimates × 3 tabs ≈ 20 + 100 + 100 + **300 tab-tree** queries (full rows) **per keystroke-batch** → multi-second, heavy DB load. | Push search into one SQL/RPC over name columns (`ilike` + trigram index); return matched ids only; never materialize trees for search. |
| PERF-2 | P2 (P1 at scale) | Unbounded reads | The **project list is unbounded** (`listCurrentWorkspaceProjects` — no `.limit`), and template eager-load pulls **all** templates + all nodes + all rows at route load. | `workspace-repository.ts:707-711`; `component-library-repository.ts:716-750` | Large workspace (200 projects, 500 templates): linear route payload + tree growth; compounds PERF-1 to O(projects×tabs). | Paginate/limit the project list; lazy-load template node/row detail per expanded template. |
| PERF-3 | P2 (P1 at scale) | Caching | Outline lazy-load has **no loaded-id tracking** in `TemplatesBrowseManager` (only `hasReusableEstimateOutline` + a loading set); `mergeReusableProjectBrowseSources` strips an estimate's sub-sources on re-merge, so **collapse + re-expand refetches the full outline**. | `TemplatesBrowseManager.tsx:675-704`; merge `project-source-browse-tree.tsx:57-71` | Each re-expand = the PERF-1 fan-out for one estimate. | Track `projectOutlineLoadedEstimateIds` (mirror the project level), or adopt a `["reusable-sources","estimate",id]` TanStack key with `staleTime 60s` per the origin plan. |
| PERF-4 | P2 | Unbounded reads | Editor route + client tab-tree query **do not pass the 1200/3000 load limits** — they exist only in the export route. | editor `[nodeId]/page.tsx:35`; `fetchEstimateTabTree` (`estimates/actions.ts:1138-1139`); limits only at `export/proposal.xlsx/route.ts:15-16,61-62` | A >3000-row tab renders fully with no ceiling — unbounded DOM + payload. | Pass `maxNodeCount`/`maxRowItemCount` through the editor route and `fetchEstimateTabTree`; surface `loadLimitState` (plumbing already exists in `getEstimateTabTree`). |
| PERF-5 | P2 | N+1 / insert | Insert picker re-runs `listCurrentWorkspaceProjects` + one estimate-list query **per accessible project** on every open, uncached. | `component-library/actions.ts:1301-1307`; refetch on open `InsertIntoEstimatePicker.tsx:57-58` | 20 projects ≈ 26 queries each open. | Cache via TanStack (reuse the reusable-sources project list) or fetch estimates lazily on project selection. |
| PERF-6 | P2 | Insertion RPC | `insert_estimate_template_into_estimate` validates the **entire destination estimate tree** after a copy (three `exists` scans over all nodes + one over all rows) and takes a **tab-wide `FOR UPDATE` lock**. | `estimate_tabs_foundation.sql:970` → `validate_estimate_node_tree:208-267`; lock `:840-844` | Every small insert pays O(estimate size) validation + lock contention on large estimates. The copy itself is fine (2 set-based bulk inserts, well-indexed by `template_id`). | Scope validation to the inserted subtree / target tab where correctness allows. |
| PERF-7 | P3 | Query shape | `getEstimateTabTree` fetches rows by `.in("node_id", nodeIds)` **without** `estimate_id`; the composite index leads with `estimate_id`. | `workspace-repository.ts:1779-1784`; index `estimate_row_items_estimate_node_sort_idx (estimate_id, node_id, sort_order)` | Planner may skip the composite index's leading column on large estimates. | Add `.eq("estimate_id", estimate.id)` alongside the `.in(...)`. (Confirm with EXPLAIN.) |
| PERF-8 | P3 | Render | The full browse tree (templates + all project sources) is rebuilt on every `searchQuery` keystroke even though the project-source half doesn't depend on the query. | `TemplatesBrowseManager.tsx:215` (`useMemo` deps `[filteredTemplates, projectSources]`) | Linear per keystroke; minor unless source count is large. | Memoize project-source nodes separately from query-filtered template nodes. |
| PERF-9 | **P1** | Over-fetch / waterfall | **Root cause of the live 3–6s panel skeleton.** The in-estimate right sidebar (incl. the Templates panel) is **gated** behind `["workspace-component-library"]`, which is **not "1 lazy query"** — it's a **~12-query, ~4-stage serial waterfall fired post-hydration**: `ensureDefaultWorkspace` → `Promise.all`(4: categories/suppliers/brands/**all** `cost_library_items`) → **serial** `ensureWorkspaceLibraryFolders`→`fetchLibraryFolders` → `Promise.all`(**6 per item**: price options/versions/price history/state history/variant costs/attachments) → +templates. The panel consumes only a slim `EstimateRowItem[]` + templates and references **none** of the 6 detail tables. | loader `component-library-repository.ts:522-616`; sidebar gate `EstimateSheetContent.tsx:1857`; slim consumption `index.tsx:684-698` | The per-item 6-table detail fan-out is dead weight for this surface; cold load = the full waterfall after hydration → the observed 3–6s. | **Lite** loader for the panel (skip the 6 detail tables) + prefetch on hover/entry + longer `gcTime` — U18/U19 ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md)). Biggest user-facing win. |
| PERF-10 | P2 | Route waterfall | The node-route page calls `getEstimateTabs` **after** `Promise.all([resolveEstimateTabRouteContext, requireCurrentUserContext])`, and `getEstimateTabs` **re-runs** `getCurrentWorkspaceProject` + a fresh Supabase client + estimate lookup — duplicating the resolve step, serialized. | `app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:34-62`; `workspace-repository.ts:1691-1715` | An extra serial round-trip on every estimate page load. | Return tabs from `resolveEstimateTabRouteContext`, or fold the tabs query into the same `Promise.all` — U21. |

*Severity note: PERF-2 and PERF-3 are scored **P2 today** (no users are broken — the outline path 500s first, [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) DEF-1) and rise to **P1 at workspace scale** once the feature works and the workspace grows.*

---

## Budget compliance (origin §12)

| Budget | Verdict | Reasoning |
|---|---|---|
| **Tab switch:** ≤1 tabs read + ≤1 tabTree read; no whole-estimate row fetch; don't render previous tab's tables; 1200/3000 per-tab | **Partially met** | In-place client query keyed `(estimateId,tabId)`, `staleTime 5m`, no focus refetch — ≤1 tabTree read per switch; per-tab node query uses the per-tab index; tab strip is a sibling above the row tables (`EstimateSheetContent.tsx:1713-1728`), not nested in a memoized branch. **VIOLATED** on the 1200/3000-per-tab clause (PERF-4). Whole-estimate-no-render and EXPLAIN proof: cannot-verify-statically. |
| **Templates panel browsing:** 1 project-list + 1 estimate-list/expanded project + 1 outline/expanded estimate + zero row-detail until preview/insert; outline p95 < 500ms; `staleTime 60s` | **At-risk / partially violated** | Lazy per-level expansion is implemented, but the **outline call itself is a per-tab row-detail fan-out** (loads full trees to compute totals — violates "zero row-detail until preview/insert"); there is **no `staleTime 60s` cache** (PERF-3); project list unbounded (PERF-2). p95<500ms: cannot-verify-statically and at-risk. |
| **Export:** single-tab within 10% of current; 5×500 rows <1.5s & buffer <10MB; keep 413 limits global | **Met (static)** | Single-tab mirrors the prior model with 1200/3000 limits; multi-tab enforces **per-tab + global** caps (`export/proposal.xlsx/route.ts:166-176`). Actual 1.5s/10MB: cannot-verify-statically (needs the benchmark run). |

---

## Top optimizations (impact / effort)

**Top user-facing win (PERF-9, the 3–6s skeleton):** a **lite in-estimate library loader** that skips the unused 6-table per-item detail fan-out, plus **prefetch** on estimate-row hover/workshop entry and a longer `gcTime` for the workspace-global library (U18/U19). The estimate-page bundle is already `next/dynamic` code-split (`EstimateWorkspaceClient.tsx:18-30`), so the bottleneck is the **data waterfall**, not JS size. Optionally stream the (lite) library via an RSC `<Suspense>` boundary so it overlaps the route's work instead of firing after hydration (U20).

1. **Server-side reusable-source search** (PERF-1) — eliminates the per-keystroke workspace-wide tree fan-out (note: the loop is **serial per estimate**, so latency compounds beyond the raw query count). Highest impact for search.
2. **Cache outlines + track loaded estimate ids** (PERF-3) — low effort; stops refetch-on-re-expand.
3. **Bound the project list + thread editor load limits** (PERF-2, PERF-4) — caps unbounded reads.
4. **Make the outline a lightweight aggregate** (PERF-3 root) — compute rowCount/total via SQL aggregate instead of pulling full trees.
5. **Scope insert-RPC validation to the subtree/tab** (PERF-6).
6. **Cache/lazy insert-target estimates** (PERF-5).

These are sequenced in [08_SOLUTIONS_AND_OPTIMIZATIONS.md](08_SOLUTIONS_AND_OPTIMIZATIONS.md). Blast radius for each is in [06_BLAST_RADIUS_ANALYSIS.md](06_BLAST_RADIUS_ANALYSIS.md).

---

## Evidence used

`src/lib/reusable-sources/actions.ts`, `source-collectors.ts`, `src/lib/repositories/workspace-repository.ts` (`listCurrentWorkspaceProjects:702`, `getEstimateTabs:1691`, `getEstimateTabTree:1731`), `component-library-repository.ts:709-766`, `component-library/actions.ts:1301`, `templates-browse/TemplatesBrowseManager.tsx`, `component-library/index.tsx:977`, `app/.../estimates/[nodeId]/page.tsx:35`, `hooks/use-estimate-query.ts`, `export/proposal.xlsx/route.ts`, `estimate_tabs_foundation.sql` (RPC `:771-979`, validation `:208-267`), budget doc `.ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates/02_TARGET_ARCHITECTURE.md:174-178`. Live browser: server-action round-trip counts (1 per project expand) and ~3–6s initial dock skeleton.

## Truth & integrity

- **VERIFIED (structural):** PERF-1..PERF-8 query shapes; tab-switch caching; export per-tab + global caps.
- **ASSUMPTION (needs runtime):** all query-count figures use the origin 20×5×3 fixture or stated scale; PERF-7 index usage needs EXPLAIN; outline p95<500ms, export 1.5s/10MB, "single-tab within 10%" are runtime budgets — **manual-proof-pending**.
