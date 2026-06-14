# 04 — Rendering, State & Client Performance Audit

> Purpose: catalogue the client-side rendering and state-management cost surfaces of Archestimator — chiefly the estimate editor — so optimization can be prioritized against evidence, not guesswork.

**Status: AUDIT / PLANNING ONLY** — no source file is modified by this document.
**Date:** 2026-06-14
**Repo HEAD at audit:** ground-truth pass `3070c46c`; line-level facts re-verified read-only at `4f0ca5ab` (same).

---

## 1. Dimension summary

The estimate editor is the dominant client-cost surface and is more disciplined than its size suggests: row tables are memoized per node-slice (`areEstimateRowItemsTablePropsEqual`), all mutation handlers are identity-stabilized via `useStableCallback`, the component library loads lazily under its own lite query key, and dynamic imports + D3 submodule imports keep initial JS down.

The principal, **verified** weakness is the inline-editing re-render economy: `editableRows` is a single flat record held as state on the 2212-line `EstimateSheetContent`, so every keystroke re-renders that component and unconditionally recomputes `projectTotal`, `currentRows` (full-tree `flattenEstimateRows`) and `activityScopeItems` (full-tree O(rows+nodes) `buildActivityScopeTreeItems`) even when no activity/row-details modal is open, then fires a window `CustomEvent` (`dispatchProjectTotalChange`) each total change.

There is **no virtualization anywhere** (confirmed expected): the custom `ui/tree.tsx` flattens and `.maps` every row, `EstimateSheetBranch` recurses every node, and row tables render every row — fine for small estimates, a cliff for large ones. Two whole-tree transforms run on settle/prop-sync: `getEstimateTreeContentSignature` JSON.stringifies the entire tree + all row fields for drift detection, and `collectEditableRows` rebuilds the editable map over the whole tree in a `queueMicrotask`.

Realtime layers are well-isolated (the cursor layer is its own component with rAF interpolation and a transform-only marker update path; presence is coarse and re-tracks only on visibility/surface change).

Two ground-truth reconciliations: the shipped font is `next/font/google` Roboto_Mono (**NOT** "SF Pro" as the design system claims), and `@vercel/speed-insights` is absent from `package.json` (0 matches) so field Web Vitals RUM is not wired.

**Honest posture:** All live authenticated measurements are **blocked** this session (no dev server, dev-auth disabled, no Playwright storage state). Severities below rest on code-structure inference plus the captured Lighthouse / `measure-routes` archives — not new runs. Structural inferences are marked `Likely`; doc/dependency facts are marked `Verified`.

---

## 2. Already implemented (do not re-recommend)

Reconciled against orchestrator ground truth (verified 2026-06-14) and re-checked read-only at HEAD. These are in place; do **not** raise them as gaps.

| Area | What is already in place | Verified at |
|---|---|---|
| Row-table memoization | `EstimateRowItemsTable` wrapped in `memo` with `areEstimateRowItemsTablePropsEqual` slicing `editableRows`/selection per item id — a keystroke in one area's table does not re-render sibling tables | `rows/row-table.tsx` |
| Stable handlers | `useStableCallback` (useInsertionEffect-backed) on every mutation handler reaching memoized row tables — keeps the row-table memo effective | mutation handlers / `row-table.tsx` props |
| Editor code-splitting | `EstimateWorkspaceClient` dynamic-imports the tree + content; 10 files use `next/dynamic` (estimate tree/content, `ComponentLibraryManager`, `AddComponentModal`, `LibraryFolderTreeSurface`, `NeatWireframeBackground` ssr:false, bubble/donut chart) | `EstimateWorkspaceClient.tsx:19-31` |
| Lazy library query | Component library loads under its own lite query key (`WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY`), gcTime 30 min for warm reuse | library hooks |
| Charts payload | Charts rebuilt buckets-only; `ProjectChartsClient` dynamic-imports the donut; `CostDonutChart` imports only the `d3-shape` submodule (arc, pie) — default views ship no D3 (confirmed well-optimized; **no finding**) | `ProjectChartsClient` / `CostDonutChart` |
| Query defaults | `providers.tsx` QueryClient: staleTime 5 min, gcTime 5 min, `refetchOnWindowFocus: false`, `retry: 1`; tab/area tree queries staleTime 5 min | `providers.tsx` |
| Next config | `optimizePackageImports` (phosphor), `experimental.staleTimes { dynamic: 60, static: 180 }`, supabase `images.remotePatterns`, `@next/bundle-analyzer` (treemap only with `ANALYZE=true` **and** `--webpack`, NOT turbopack) | `next.config.ts` |
| Route transitions | Phases 0–7 largely done: 10 static `loading.tsx` shells, 7 `error.tsx`, `usePrefetchOnHover` + `router.prefetch` + sidebar hover-intent, `React.cache` on `getCurrentWorkspaceProject` | route-transition plan |
| Optimistic mutations | Per-row operation-id sequencing + per-row update queue; `refetchType:"none"` invalidations avoid refetch storms | `use-estimate-row-mutations.ts` |
| Realtime isolation | Cursor layer is its own component; transform-only marker updates via rAF; 80ms broadcast throttle + min-distance gate; presence coarse, re-tracks only on visibility/surface change | `EstimateSheetContent.tsx:639-817`, cursor/presence hooks |
| Proxy/headers | `src/proxy.ts` public-route early-return before Supabase client creation; marketing Cache-Control bfcache mitigation; workshop/invite/share hardening headers; CSP (report-only landing/workshop/invite, ENFORCED `/share`); `getUser()` (never `getSession`) | `src/proxy.ts` |

**Note on this document's findings vs. "already implemented":** CR06 (font) and CR07 (Speed Insights) are *reconciliations of ground-truth claims*, not re-recommendations — they correct the design-system doc ("SF Pro") and confirm the verified RUM gap. CR09 documents the realtime isolation pattern as a positive to *preserve*, not a defect.

---

## 3. Findings

### CR01 — Every keystroke recomputes whole-tree derivations (totals, flattened rows, activity scope) on the 2212-line sheet component

Severity: High
Confidence: Likely
Bottleneck class: CLIENT_RENDER
Affected surface: Estimate editor (`EstimateSheetContent`) — inline cell editing
User symptom: Typing quantity/contingency/misc in a cell feels progressively laggier as an estimate grows; keystroke-to-paint latency rises with total row count, not with the edited node's row count.
Technical cause: `editableRows` is a single flat `Record<string,EditableRowValue>` held as `useState` on `EstimateSheetContent`. Each cell `onChange` calls `setEditableRows`, re-rendering the whole component. That commit unconditionally re-runs `projectTotal` (estimate-totals over tree), `currentRows = flattenEstimateRows(estimateTree, editableRows)` (full DFS over every node+row), and `activityScopeItems = buildActivityScopeTreeItems(...)` (full DFS building one item per node AND per row, with a `Map(rows)` built each time) — all gated only on `editableRows`/`estimateTree` identity, so they fire on every keystroke even when the activity modal and row-details modal are both closed (their only consumers).
Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:1093-1110` (projectTotal, currentRows, activityScopeItems memos)
- `src/components/workshop/EstimateSheetContent.tsx:438-514` (buildActivityScopeTreeItems builds node+row items + rowById Map over full tree)
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:148-176` (flattenEstimateRows full-tree DFS)
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:241-244` (cell onChange -> setEditableRows)
- `src/components/workshop/estimate-sheet/estimate-sheet-render-probe.ts` (team already instruments sheet/row-table renders for perf tests)
Current metric:
- blocked (no authed run this session); structurally O(total_rows + total_nodes) recompute per keystroke regardless of which node is edited
Target metric:
- Per-keystroke work O(rows_in_edited_node); whole-tree `currentRows`/`activityScopeItems` built only when a modal that needs them is open
Recommended action:
- Plan to gate `currentRows`/`activityScopeItems` behind modal-open state (inspector || rowDetails || projectSpecificRowId) so they are not computed while the user is only typing; and to move `editableRows` into per-node slices or a Zustand store with selector subscriptions so a keystroke updates only the affected row-table's slice rather than the whole sheet. Treat `projectTotal`/dispatch as a separate concern (CR02). Validate with the existing render-probe harness counting `EstimateSheetContent` vs `EstimateRowItemsTable` renders per keystroke.
Validation gate:
- Render-probe test: a single keystroke triggers exactly one `EstimateRowItemsTable` render for the edited node and zero whole-tree `activityScopeItems`/`currentRows` builds when no modal is open; React Profiler commit duration during sustained typing flat vs row count.
Risk:
- Refactoring the `editableRows` ownership is high-blast-radius (every row cell, totals, proposal preview, activity scope read it); a slicing bug could desync displayed totals from edits or break optimistic rollback.
Rollback/deletion criteria:
- Any totals/row-detail desync, broken optimistic rollback, or activity-scope cache-key churn vs current behavior → revert to single-record `editableRows`.

---

### CR02 — dispatchProjectTotalChange fires a window CustomEvent on every total change (per keystroke)

Severity: Low
Confidence: Verified
Bottleneck class: STATE_INVALIDATION
Affected surface: Estimate editor → `ProjectTotalHeader` (budget meter)
User symptom: None directly visible; contributes to per-keystroke work and couples the header to every edit via a global event bus.
Technical cause: An effect keyed on `projectTotal` calls `dispatchProjectTotalChange(projectTotal)` which dispatches a global window `CustomEvent`; `ProjectTotalHeader` subscribes via a window listener + setTimeout-free setState. Since `projectTotal` is recomputed every keystroke (CR01), the event also fires every keystroke. Cross-component state is threaded through window events + `window.__archestimatorProjectBudget` globals rather than a shared store.
Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:1421-1423` (useEffect dispatchProjectTotalChange(projectTotal))
- `src/components/workshop/ProjectTotalHeader.tsx:43-46,215-225` (dispatch + window listener -> setTotal)
- `src/components/workshop/ProjectTotalHeader.tsx:64-95` (budget read from window globals via useSyncExternalStore)
Current metric:
- 1 window `CustomEvent` dispatch + 1 `ProjectTotalHeader` setState per total change (i.e. per keystroke today)
Target metric:
- Total updates coalesced (debounced/rAF) or delivered via shared store selector; header re-render only on a settled total
Recommended action:
- Plan to coalesce total propagation (rAF or trailing-debounce) and/or replace the window-event + window-global bus with a small shared store selector so the header subscribes precisely. Low priority — the header itself is cheap; the value is removing global-event coupling and shaving redundant work once CR01 lands.
Validation gate:
- `ProjectTotalHeader` receives at most one update per animation frame during sustained typing; no behavioral change to displayed budget/total.
Risk:
- Low; debouncing the displayed total could make the header lag the cell by a frame.
Rollback/deletion criteria:
- Visible total/header divergence beyond one frame, or budget-meter state regressions → revert to immediate dispatch.

---

### CR03 — No virtualization on estimate tree, estimate sheet, or row tables — full render of every node/row

Severity: High
Confidence: Verified
Bottleneck class: CLIENT_RENDER
Affected surface: Estimate left tree (`ui/tree.tsx`), estimate sheet (`EstimateSheetBranch`), row tables (`EstimateRowItemsTable`)
User symptom: Large estimates (deep tree, many areas with long row lists) are slow to open the sheet, scroll, expand/collapse, and edit; initial mount of a heavy node renders hundreds of rows at once.
Technical cause: `react-complex-tree` is a dependency but the left tree is a custom implementation (`ui/tree.tsx`) that `flattenTree()`s the expanded set and `.maps` every flat node to a DOM row with no windowing. The sheet recursively renders `EstimateSheetBranch` for every node and `EstimateRowItemsTable` maps every item in a node (`computedRows` builds a fully-derived object per row). Nothing uses `react-window`/`@tanstack/react-virtual`.
Evidence:
- `src/components/ui/tree.tsx:218-236` (flattenTree recursion), `tree.tsx:1129` (flatNodes.map renders all)
- grep: no react-window/react-virtual/virtuoso/virtual in `ui/tree.tsx`; package.json has react-complex-tree but `tree.tsx` does not import it
- `src/components/workshop/estimate-sheet/rows/branch.tsx:211-259` (recursive branch render + EstimateRowItemsTable for every node)
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:100-127,177` (computedRows over all items, render all rows)
Current metric:
- blocked for live; render count = O(visible_nodes + visible_rows) with no upper bound
Target metric:
- Windowed rendering for long row tables / large trees so DOM/render cost is bounded by viewport, not dataset size
Recommended action:
- Plan virtualization for the two unbounded lists: long `EstimateRowItemsTable` bodies and the flattened left tree, gated by a row/node-count threshold so small estimates keep the simpler non-virtual path. Establish a representative large-estimate fixture first to set a budget. Confirm the absence of virtualization is acceptable for the current p95 estimate size before investing.
Validation gate:
- Large-estimate fixture: sheet mount and scroll FPS bounded by viewport row count; React Profiler mount commit time roughly flat past the threshold.
Risk:
- Virtualization complicates sticky branch headers, drag-and-drop reorder, cursor row-anchoring (`data-estimate-row-id` lookups in `resolveCursorTarget`), and find-in-sheet scroll-to; partial measures can break collaboration cursor anchoring.
Rollback/deletion criteria:
- Any regression in drag reorder, sticky headers, cursor anchoring, or focus/scroll-into-view → revert to full render.

---

### CR04 — Whole-tree JSON.stringify signature computed on every prop sync to detect drift

Severity: Medium
Confidence: Verified
Bottleneck class: CLIENT_RENDER
Affected surface: Estimate left tree (`EstimateSheetTree`) prop/cache reconciliation
User symptom: On large estimates, each server-prop refresh or settle triggers a synchronous full-tree serialization that can add jank to tree updates after reorder/create/delete.
Technical cause: `getEstimateTreeContentSignature` walks the entire tree and JSON.stringifies an array containing ~19 fields per row plus node fields, and is called to compare incoming props vs current/last-accepted signatures inside `syncLocalNodesFromProps` and the prop-observer effect. For an estimate with thousands of rows this is a non-trivial main-thread serialization on every prop change.
Evidence:
- `src/lib/estimates/estimate-tree-reorder.ts:183-222` (getEstimateTreeContentSignature full-tree JSON.stringify of 19 row fields)
- `src/components/workshop/EstimateSheetTree.tsx:261-264,356-396` (signature refs + syncLocalNodesFromProps + prop-observer effect call it)
Current metric:
- blocked for live; O(total_rows * fields) string build per prop sync
Target metric:
- Drift detection via cheap structural revision/hash or reference checks, avoiding full serialization on the common no-change path
Recommended action:
- Plan to short-circuit with reference equality (already partly done via `lastObservedPropNodesRef`) before serializing, and/or replace the JSON signature with an incremental revision counter from the cache layer so the expensive stringify runs only when a fast pre-check indicates a real change. Measure first on a large fixture to confirm it is material.
Validation gate:
- Large-estimate fixture: no full-tree JSON.stringify on prop syncs where nodes reference is unchanged; tree-reorder/create/delete correctness tests stay green.
Risk:
- Signature is load-bearing for the optimistic-vs-server drift logic (`stalePropSignatureToIgnoreRef`); a weaker check could let a stale prop overwrite an optimistic tree.
Rollback/deletion criteria:
- Any optimistic tree being clobbered by stale props, or reorder/create flicker → revert to full signature.

---

### CR05 — collectEditableRows rebuilds the full editable map over the whole tree on every settle

Severity: Medium
Confidence: Verified
Bottleneck class: STATE_INVALIDATION
Affected surface: Estimate editor — `editableRows` reseed after tree settles
User symptom: After a mutation settles or the tree query refreshes, a full-tree rebuild + setState runs (in a microtask), causing an extra full sheet re-render on large estimates.
Technical cause: An effect keyed on `[estimateTree, saveState]` calls `queueMicrotask(() => setEditableRows(collectEditableRows(estimateTree)))` whenever not dirty/saving and the skip-counter is 0. `collectEditableRows` walks every node and row to rebuild the entire editable map, discarding the prior map; this forces another whole-sheet render and, with CR01, another whole-tree derivation pass.
Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:1447-1456` (effect reseeds editableRows from whole tree)
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:92-104` (collectEditableRows full-tree DFS)
- `src/components/workshop/EstimateSheetContent.tsx:1435-1445` (skipEditableRowsSyncRef dance to suppress some reseeds)
Current metric:
- blocked for live; O(total_rows) rebuild + 1 whole-sheet render per qualifying settle
Target metric:
- Incremental merge of only changed rows into `editableRows`, or reseed only the affected subtree
Recommended action:
- Plan to reconcile `editableRows` incrementally (merge new/removed row ids, keep untouched entries) instead of full rebuild-and-replace, removing the skip-counter heuristic. Sequence after CR01 since both touch `editableRows` ownership.
Validation gate:
- Settle after a single-row mutation does not change `editableRows` identity for untouched rows; no extra full-sheet render attributable to reseed in the profiler.
Risk:
- The skip-counter currently papers over optimistic/settle ordering; an incremental merge must preserve in-flight edits and rollback semantics.
Rollback/deletion criteria:
- In-flight edits lost on settle, or rollback restoring wrong row values → revert.

---

### CR06 — Shipped font is next/font/google Roboto_Mono, not the design-system's claimed 'SF Pro'

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: App-wide (`layout.tsx` body font variable)
User symptom: App renders in Roboto Mono everywhere via `--font-roboto-mono`; any docs/QA expecting SF Pro are wrong, and a remote Google Font is fetched/self-hosted by next/font rather than using a system font.
Technical cause: `layout.tsx` imports `Roboto_Mono` from `next/font/google` and applies its variable to `<body>`. The README/design-system reportedly says "SF Pro". `next/font` self-hosts the Google font at build, so it is not a runtime third-party request, but it is still a downloaded webfont rather than the documented system font.
Evidence:
- `src/app/layout.tsx:2` (import { Roboto_Mono } from "next/font/google")
- `src/app/layout.tsx:7` (Roboto_Mono variable --font-roboto-mono)
- `src/app/layout.tsx:26` (<body className={robotoMono.variable}>)
Current metric:
- One self-hosted Google webfont (Roboto Mono, latin subset) loaded app-wide
Target metric:
- Documented font matches shipped font; if SF Pro/system stack is intended, zero webfont download
Recommended action:
- Reconcile the design-system doc with reality: either update docs to state Roboto Mono is the shipped font, or (if SF Pro/system stack is the intent) plan a font swap to a system stack to drop the webfont entirely. Decide with design before changing rendered type.
Validation gate:
- Doc and `layout.tsx` agree on the font; if switched to system stack, no font file in the network waterfall and no CLS from font swap.
Risk:
- Changing the font is a visible design change (metrics/CLS) — must be a design decision, not a perf-only edit.
Rollback/deletion criteria:
- Any unwanted visual/type regression → revert font choice.

---

### CR07 — @vercel/speed-insights absent — no field Web Vitals RUM despite readiness script

Severity: Medium
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: Whole app — production performance observability
User symptom: No production field data (real-user LCP/INP/CLS) to confirm whether the heavy editor and route transitions are actually slow for users; all perf claims rest on lab Lighthouse + measure-routes archives.
Technical cause: `package.json` has `@vercel/analytics` but grep for `@vercel/speed-insights` returns 0, while `scripts/check-vercel-speed-insights-readiness.ts` and a `perf:check-speed-insights` npm script exist — indicating Speed Insights was intended but the package/component is not wired, so no Web Vitals RUM is collected in production.
Evidence:
- package.json: 0 matches for @vercel/speed-insights; line 60 @vercel/analytics present
- package.json:49 perf:check-speed-insights script references scripts/check-vercel-speed-insights-readiness.ts
- measurement-environment note: live authed runs blocked this session
Current metric:
- 0 field RUM signals (Speed Insights not installed)
Target metric:
- Web Vitals RUM (LCP/INP/CLS) flowing for authed workshop + public routes to validate lab findings against real users
Recommended action:
- Plan to wire `@vercel/speed-insights` (add package + `<SpeedInsights/>` in the root layout/providers) so the editor and route-transition hypotheses (CR01–CR05) can be validated against production INP/LCP rather than lab-only numbers. Treat as the enabling gate for prioritizing the other findings.
Validation gate:
- Speed Insights dashboard shows INP/LCP/CLS for `/workshop/projects/*` estimate routes within a deploy cycle; readiness script passes.
Risk:
- Adds a small third-party client script + data egress; INP attribution may reveal the editor is worse than lab suggests.
Rollback/deletion criteria:
- Material bundle/INP regression from the script itself, or privacy/compliance objection → remove.

---

### CR08 — Two heavy client components (EstimateSheetContent 2212 lines, ComponentLibraryManager 1569) own large client-bundle weight on the editor route

Severity: Medium
Confidence: Likely
Bottleneck class: BUNDLE_WEIGHT
Affected surface: Estimate workspace route initial JS
User symptom: Estimate workspace remains one of the largest initial-JS routes (per ground-truth archive note), affecting TBT/INP-readiness on the most complex surface.
Technical cause: `EstimateSheetContent` (2212 lines, `'use client'`) is the editor core and is dynamic-imported by `EstimateWorkspaceClient` (good), but it itself statically imports ExcelJS-model builders (`buildProposalExportModel`), the full activity-history module, the right sidebar (`EstimateRightSidebar` barrel), `CommandPalette`, and proposal export preview — much of which is only needed on user action (export preview, activity, command palette). The library manager (1569 lines) is separately dynamic-imported. Mitigations already present: tree/content/sidebar dynamic imports, `optimizePackageImports` for phosphor icons, lazy lite library query, D3 submodule imports, dynamic donut.
Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:24` (buildProposalExportModel static import), `:34` (CommandPalette), `:48` (ProposalExportPreviewDialog), `:28` (EstimateRightSidebar barrel)
- `src/components/workshop/EstimateWorkspaceClient.tsx:19-31` (tree+content dynamic-imported)
- ground-truth: 'Largest remaining initial-JS routes: project estimates, charts, estimate workspace, project detail'
- `next.config.ts` optimizePackageImports + bundle-analyzer only under ANALYZE webpack build (Turbopack build emits no report)
Current metric:
- blocked — no analyzer report this session (Turbopack build emits none; `ANALYZE=true` requires `--webpack`)
Target metric:
- Export-preview/activity/command-palette code split out of the editor's initial chunk; verified via an ANALYZE webpack treemap
Recommended action:
- Plan to lazy-load the proposal-export model builder + preview dialog, activity-history modal, and command palette behind their open triggers (dynamic import / `React.lazy`) so they leave the editor's initial chunk; first generate an `ANALYZE=true --webpack` treemap to confirm which modules dominate before splitting. Keep the existing dynamic-import boundaries.
Validation gate:
- ANALYZE webpack treemap shows ExcelJS/export + activity modules in async chunks, not the editor entry; `.next` client-reference manifest initial-JS for the estimate route drops measurably.
Risk:
- Over-splitting can add request waterfalls on first export/activity open; ExcelJS is large and must stay out of the critical path without breaking the fetch-then-blob download flow.
Rollback/deletion criteria:
- First-open latency for export/activity regresses noticeably, or split chunks fail to load → revert specific splits.

---

### CR09 — Cursor + presence realtime layers are well-isolated (positive) but mount per-surface with rAF loops

Severity: Low
Confidence: Verified
Bottleneck class: REALTIME
Affected surface: Estimate sheet cursor layer + project presence
User symptom: Generally none — collaboration overlay is decoupled from sheet rows; minor: a persistent rAF interpolation loop and a 1s stale-sweep interval run while remote cursors are present.
Technical cause: `EstimateSheetCursorLayer` is its own component so remote cursor frames re-render only that layer, not branches/row tables; marker movement is applied imperatively via `element.style.transform` inside a `requestAnimationFrame` loop (no React re-render per frame), with reduced-motion snap. Presence is coarse-by-contract and re-tracks only on visibility/surface change, not continuously. Broadcast is throttled (80ms) + min-distance gated. This is a strong pattern; the only ongoing cost is the rAF loop + 1s interval while cursors exist, and per-frame DOM `querySelector` in `resolveCursorTarget` for row/cell anchoring.
Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:639-708` (cursor layer isolation comment + component), `:723-751` (rAF interpolation loop, transform-only)
- `src/components/workshop/EstimateSheetContent.tsx:620-637` (resolveCursorTarget does surface.querySelector per cursor per frame)
- `src/hooks/use-estimate-cursor-broadcast.ts:107,262-273,283-315` (80ms throttle, min-distance, 1s stale sweep)
- `src/hooks/use-project-presence.ts:224-235` (re-track only on surface change)
Current metric:
- rAF loop + 1s interval active only while `remoteCursors>0`; per-frame querySelector per remote cursor
Target metric:
- Maintain isolation; cache cursor anchor elements per frame batch to avoid repeated querySelector under many cursors
Recommended action:
- No structural change needed — document this as the reference pattern. If many concurrent editors become common, plan to cache resolved anchor elements (or batch the DOM reads once per frame) in `resolveCursorTarget` to avoid N querySelector calls per frame. Otherwise leave as-is.
Validation gate:
- With N remote cursors, frame time stays bounded; sheet row tables show zero re-renders attributable to cursor traffic in the render probe.
Risk:
- Caching anchors risks stale positions when rows expand/collapse mid-frame; must invalidate on layout changes.
Rollback/deletion criteria:
- Cursor drift/anchoring regressions → revert to per-frame query.

---

## 4. Dimension tables & notes

### Estimate-editor render/state map (highest-complexity surface)

| Surface | File:lines | Client? | Memoized? | Per-keystroke recompute? | Virtualized? |
|---|---|---|---|---|---|
| EstimateSheetContent (editor core) | EstimateSheetContent.tsx (2212) | yes (dynamic-imported) | partial | YES — projectTotal, currentRows, activityScopeItems all recompute | n/a |
| EstimateSheetBranch (recursive node render) | rows/branch.tsx (285) | yes | NO memo; recomputes computeNodeTotal(node) per render | yes (re-renders on parent commit) | NO |
| EstimateRowItemsTable (row grid) | rows/row-table.tsx (387) | yes | YES (memo + areEstimateRowItemsTablePropsEqual on item/editableRow/selection slices) | only edited table | NO |
| EstimateSheetTree (left tree) | EstimateSheetTree.tsx (1518) | yes (dynamic) | many useMemo | builds UiTree model + folderIds + selection nodes on localNodes change | NO (custom ui/tree.tsx, flatten+map) |
| ui/tree.tsx (generic tree) | ui/tree.tsx (1163) | yes | flattenTree memo | n/a | NO — confirmed no react-window/virtual; react-complex-tree dep present but unused here |
| Cursor layer | EstimateSheetContent.tsx:639-817 | yes | isolated component | NO (imperative rAF transforms) | n/a |

### Totals / tree math (domain)

- `src/lib/domain/estimate-totals.ts` is a flat-rows reducer (legacy shape, `unitCost`); the LIVE editor uses `computeNodeTotal`/`computeRowTotal`/`flattenEstimateRows` in `estimate-sheet/rows/editable-row-model.ts` (tree shape, `itemCost`). `projectTotal = estimateTree.reduce(computeNodeTotal)` — full recursive DFS per render.
- `buildActivityScopeTreeItems` (EstimateSheetContent.tsx:438-514): builds a `Map(rows)` + one `ActivityScopeTreeItem` per node AND per row, full DFS — recomputed every keystroke though only the activity modal consumes it.
- `getEstimateTreeContentSignature` (estimate-tree-reorder.ts:183-222): `JSON.stringify` of full tree + 19 fields/row, on every prop sync.
- `collectEditableRows` (editable-row-model.ts:92-104): full-tree rebuild of the editable map, fired in `queueMicrotask` on every qualifying settle (EstimateSheetContent.tsx:1447-1456).

### Per-keystroke cost chain (CR01/CR02/CR05)

```
cell onChange
  → setEditableRows (sheet state)
    → EstimateSheetContent re-render
      → { projectTotal DFS, currentRows DFS, activityScopeItems DFS }
        → useEffect → dispatchProjectTotalChange (window CustomEvent)
          → ProjectTotalHeader setState
```

`EstimateRowItemsTable` memo correctly limits sibling-table re-renders; the **parent recompute** is the unbounded part.

### Ground-truth reconciliation

| Ground-truth claim | Verified now | Result |
|---|---|---|
| Font is 'SF Pro' (design system) | layout.tsx imports next/font/google **Roboto_Mono** | CONTRADICTED — ships Roboto Mono (CR06) |
| @vercel/speed-insights likely NOT wired | `grep @vercel/speed-insights package.json` = 0; analytics present | CONFIRMED absent (CR07) |
| Charts rebuilt buckets-only, D3 dynamic | ProjectChartsClient dynamic-imports donut; CostDonutChart imports `d3-shape` submodule (arc, pie) only; default views ship no d3 | CONFIRMED well-optimized (no finding) |
| Virtualization NONE expected | ui/tree.tsx flatten+map, branch recursion, row-table maps all — no react-window/virtual | CONFIRMED none (CR03) |
| Estimate-tree single-node unification corridor landed | branch.tsx `canReceiveRows = true`; moveEstimateRowItem no longer throws on non-area; buildActivityScopeTreeItems emits row-scope for every node | CONFIRMED in code |
| QueryClient staleTime/gcTime 5min, refetchOnWindowFocus false | tab/area tree queries set staleTime 5min, refetchOnWindowFocus false; lite library gcTime 30min | CONFIRMED |
| EstimateWorkspaceClient dynamic-imports tree+content | EstimateWorkspaceClient.tsx:19-31 | CONFIRMED |

### Positive patterns to preserve (anti-regression)

- `useStableCallback` (useInsertionEffect-backed) on every mutation handler reaching memoized row tables — keeps `EstimateRowItemsTable` memo effective. Do not pass inline handlers to the row table.
- Per-table memo comparator (`areEstimateRowItemsTablePropsEqual`) slices `editableRows`/selection by item id — a keystroke in one area's table does not re-render sibling tables.
- Cursor layer isolation + rAF transform-only marker updates + 80ms throttle + min-distance gate (reference realtime pattern).
- Lazy lite library query under its own key (`WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY`), gcTime 30min for warm reuse.
- Optimistic row mutations with per-row operation-id sequencing + per-row update queue (`use-estimate-row-mutations.ts`) — `refetchType:"none"` invalidations avoid refetch storms.

### Measurement status (this session)

- Live authed `measure-route-transitions`: **BLOCKED** (no dev server ports 3000–3020, dev-auth disabled, no Playwright storage state). `bun run build` / `next dev` deliberately NOT run (shared `.next`, concurrent agents). `ANALYZE` build BLOCKED.
- Numbers cited come only from captured archives in the prompt (route-transition Lighthouse, `perf:measure-routes` medians) — not re-run here. No new metrics fabricated; structural findings marked `Likely`, doc/dep facts `Verified`.

**Captured evidence carried forward (observed, not re-run):** authed `/workshop/projects` Lighthouse perf 0.86 / FCP 1208ms / LCP 3865ms / CLS 0 / TBT 124ms / SpeedIndex 3514ms / serverResponse 630ms; earlier authed runs perf 0.71–0.73 / LCP 3585–3960 / TBT 422–533 / serverResponse ~2300ms; standalone authed no-throttle medians Projects 2325 / Library 2675 / Templates 1857 / Settings 2725 ms; `/workshop/library` initial JS 618KB → ~232KB after dynamic-import work. bfcache `pageshow.persisted=false` under Playwright (inconclusive).

### Suggested sequencing

1. **CR07** (wire Speed Insights) — enabling gate to validate editor INP hypotheses with field data.
2. **CR01 + CR02 + CR05** (editor re-render economy) — same `editableRows` ownership area; biggest felt-editing win.
3. **CR03** (virtualization) — only after a large-estimate fixture sets a budget; high blast radius (drag, cursor anchoring, sticky headers).
4. **CR08** (split export/activity/palette out of editor initial chunk) — after an ANALYZE webpack treemap.
5. **CR04** (signature) — measure first; may be immaterial below large sizes.
6. **CR06** (font/doc reconciliation) — design decision, not perf-only.
7. **CR09** — document as reference pattern; optional anchor caching only if many concurrent editors emerge.

---

## 5. Cross-references

- **`03_ROUTE_SPEED_MATRIX.md`** — per-route lab timings for the estimate workspace / projects / library / templates / settings routes that frame CR01/CR03/CR08; this audit explains *why* the estimate workspace sits at the heavy end of that matrix.
- **`12_OPTIMIZATION_BACKLOG.md`** — destination for the prioritized CR01–CR09 actions and the sequencing list above (Speed Insights gate → editor re-render economy → virtualization → bundle splits).
- **`13_RISK_REGISTER_AND_BLAST_RADIUS.md`** — the high-blast-radius items here (CR01 `editableRows` ownership, CR03 virtualization vs cursor anchoring/drag, CR04 drift-signature load-bearing logic, CR05 optimistic/settle ordering) belong in the risk register.
- **`15_READINESS_DECISION.md`** — CR07 is the readiness blocker for *any* field-validated claim: without Speed Insights RUM, all editor/route findings remain lab-only inference and no readiness assertion can be made.
