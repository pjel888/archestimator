# 01 — Codebase Audit (Performance Refactor Plan Pack)

> **Authoring agent:** W1. **Status:** Evidence-backed factual backbone for the pack. Cite findings by stable ID (`A-01`…). Every finding uses the contract's evidence format `path:line — observation` and the priority (P0–P3) / risk (Low/Med/High/Critical) labels from `_SYNTHESIS.md §4`.
>
> **Inputs:** `_SYNTHESIS.md` (authoritative; PINNED facts reproduced verbatim) + dossiers R1–R7 in `_research/`. Where my reading would diverge from a PINNED fact I use the pinned value and flag the delta for `19_OPEN_QUESTIONS.md`.
>
> **Repo facts (verbatim, `_SYNTHESIS.md §0`):** Next.js 16.2.6 (App Router), React 19.2.6, Bun, TS strict, Tailwind v4. Supabase/Postgres + RLS; TanStack Query 5.100.14; Zustand 5.0.14; TanStack Table 8.21, TanStack Virtual 3.14. Aggregate gate `bun run validate` = type-check + lint + lint:design-system + lint:design + test (5 unit) + test:dom (361 Vitest DOM); it does **not** run e2e/perf/storybook/bundle. Branch when planned: `feat/sidebar-redesign`. Date: 2026-06-17.

**How to read each finding:** *current shape → hidden repeated pattern → performance concern → refactor direction → safe first move → unsafe move to avoid → validation proof.* Severities and the phase that addresses each finding are collected in the index at the bottom.

---

## 1. App Router / RSC boundaries (from R1)

### A-01 — Authed-only global providers mount on public/landing routes — **P0 / High**
- **Current shape:** `src/app/layout.tsx:25-31` wraps every route in `<AppProviders>`; `src/app/providers.tsx:30-46` (`"use client"`) mounts `QueryClientProvider`, `ToastProvider`, `NotificationProvider`, `BfcacheHandler`, `PerformanceMonitor`, `NavigationListener`, `RealtimeAuthBridge`, `RouteLoadingOverlay` for *all* routes including `/`, `/pricing`, etc.
- **Hidden repeated pattern:** authed-app concerns leaking into the shared client shell. `RealtimeAuthBridge` (`src/components/realtime-auth-bridge.tsx:22-66`) on mount calls `createSupabaseBrowserClient()`, `supabase.auth.getSession()`, and subscribes to `onAuthStateChange`.
- **Performance concern:** pulls `@supabase/ssr` + `@supabase/supabase-js` into the bundle that loads on marketing pages, and fires an auth roundtrip where no realtime channel exists. Biggest app-shell win.
- **Refactor direction:** move `RealtimeAuthBridge`, `NotificationProvider`, and likely `PerformanceMonitor`/`NavigationListener` into `src/app/workshop/layout.tsx`; keep only the minimal set (QueryClient/Toast) on public routes.
- **Safe first move:** confirm with `ANALYZE=true bun run build` that supabase is actually in the landing chunk (Q below), then relocate providers to the workshop layout — isolated, no data-shape change.
- **Unsafe move to avoid:** removing `QueryClientProvider` from root if any public route uses a query hook; deleting `PerformanceMonitor` outright (it backs perf telemetry).
- **Validation proof:** `bun run validate`; before/after `ANALYZE=true bun run build` landing-chunk diff; e2e `landing-audit.spec.ts`. Addressed in **Phase 7** (early-win candidate per `_SYNTHESIS.md §2`).

### A-02 — Sparse streaming; heavy reliance on client islands + `router.refresh()` — **P2 / Med**
- **Current shape:** only ~4 files use `Suspense`; the well-built case is `src/app/workshop/projects/[projectId]/layout.tsx:42-51` (header chrome + content each `<Suspense>`-wrapped) and `WorkshopPageShell.tsx:141`. All 32 `page.tsx` are Server Components (good RSC discipline, R1 A0). Most authed routes fetch via TanStack Query inside large client islands behind route-level `loading.tsx`.
- **Performance concern:** `router.refresh()` re-runs the whole server segment + RSC payload. **`router.refresh()` spans 12 files (enumerated); `project-estimates-store.ts:11,16` are prose comments only — a real call is `ProjectEstimatesClient.tsx:215`.**
- **Refactor direction:** audit each `router.refresh()` for "needs fresh RSC payload" vs "scoped TanStack invalidation"; add server-projection/streaming for estimates list + library overview.
- **Safe first move:** inventory the 12 files and classify (no edits); pull obvious cache-invalidation candidates first.
- **Unsafe move to avoid:** blanket replacing `router.refresh()` with invalidation — some genuinely need fresh server data (auth/permission transitions).
- **Validation proof:** per-flow e2e (`estimates-crud-latency`, `estimates-shell-streaming`); `perf:check-routes` (loose, see A-23). Addressed in **Phase 4**.

### A-03 — Bundle analyzer wired but no npm script — **P3 / Low**
- `next.config.ts:2,190-194` wraps config in `@next/bundle-analyzer` (gated `ANALYZE=true`); **no `analyze` script in `package.json`** (R1 A5, R7). Invoke via `ANALYZE=true bun run build`.
- **Refactor direction / safe move:** add `"analyze"` script (Phase 0/7). **Validation:** running the analyzer is itself the proof. Addressed in **Phase 0/7**.

---

## 2. Client component hotspots (from R1, R4)

### A-04 — `EstimateSheetContent.tsx` god-component — **P0 / Critical**
- **Current shape (PINNED):** `src/components/workshop/EstimateSheetContent.tsx` = **2949 LOC**; exported component function = **~1884 LOC** (`:1042-2925`); **~17 distinct responsibilities**; **~40 state atoms**; **109 `useState/useMemo/useRef/useCallback`** occurrences (R2). Highest blast radius unit in the repo.
- **Hidden repeated pattern:** one function owns query/tree-source switching (`:1066-1090`), lazy library load (`:1179-1218`), editable-row state (`:1093`), express-insert drafts, column widths, selection, search/facet/group, collapse/expand, bulk selection, totals, activity history, proposal preview/export, ~15 row-mutation callbacks (`:1811-2539`), command palette, tab strip, cross-tree header-action registration (`:2548-2576`), and the full render tree (`:2578-2922`). Module-level helpers above it (`:178-1040`) add ~8 more concerns (DFS path/code utils, clone/mutate helpers, proposal signature, activity scope builder, search/facet transforms, cursor layer).
- **Performance concern:** any of ~40 state atoms re-runs the entire ~1884-LOC render (`reportEstimateSheetContentRender`, `:1065`). The cursor layer (`:866-1040`) is **already extracted** — the extraction template.
- **Refactor direction:** decompose along R4's responsibility map — `useEstimateEditableRows`, `useEstimateTotals`, `useProposalExport`+`<ProposalExportController>`, `useEstimateActivityHistory`, `useEstimateRowOperations`, `useSheetDisplayTransforms`, `<EstimateSheetCenterColumn>`.
- **Safe first move:** extract already-gated, side-effect-isolated concerns first (activity history is well-gated behind `inspector || rowDetails || projectSpecificRowId`, R4).
- **Unsafe move to avoid:** breaking the load-bearing memo guards (see A-08) or destabilizing `useStableCallback` identity (`:1071, 1811+`).
- **Validation proof:** `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`, `-memoization.test.tsx`, `-cursor-isolation.test.tsx` must stay green; `perf:profile-peak-load`. Addressed in **Phase 3**.

### A-05 — Oversized client-island hotlist (other monoliths) — **P2 / Med**
- `component-library/index.tsx` — 2540 LOC (`EstimateRightSidebarBase` = 1748 LOC, `index.tsx:786`); `AddComponentModal.tsx` — 2359; `ComponentLibraryManager.tsx` — 1695; `estimate-sheet/activity-history.tsx` — 1688; `EstimateSheetTree.tsx` — 1587; `projects-page-client.tsx` — 1481; `ui/tree.tsx` — 1328; `LibraryFolderTree.tsx` — 1311; `TemplatesTree.tsx` — 1252; `ProjectEstimatesTable.tsx` — 1211 (R1 A1, R4).
- **Performance concern:** each is a large client surface re-rendering on its own state churn; `LiveProjectCard.tsx` (722 LOC) is **un-memoized** (see A-19).
- **Refactor direction:** decompose secondary monoliths after the sheet (Phase 3) and tree kernel (Phase 2) land; many shrink naturally once the kernel/primitives absorb duplicated logic. Addressed across **Phases 2/3/6**.

### A-06 — Good dynamic-import discipline (positive; do not regress) — **P3 / Low**
- `EstimateWorkspaceClient.tsx:19-31` lazy-loads `EstimateSheetTree` + `EstimateSheetContent` (the 2949-LOC chunk is code-split); `LibraryPageClient.tsx:20-23`, `ComponentLibraryManager.tsx:70-85`, `TemplatesBrowseManager.tsx:48-55`, `projects-page-client.tsx:105-106`, `ProjectChartsClient.tsx:26-29`, `HeroSection.tsx:11-14` all use `next/dynamic` deliberately. **Preserve these boundaries during decomposition.** Reference, not a defect.

---

## 3. State / query architecture (from R2)

### A-07 — `editableRows` single-map identity is the central fan-out coupling — **P0 / Critical**
- **Current shape (PINNED):** `useState<Record<string, EditableRowValue>>` at `EstimateSheetContent.tsx:1093` (also referenced `:1401`). `updateEditableRowValue` (`src/components/workshop/estimate-sheet/rows/editable-row-model.ts:29-52`) returns a **new top-level object** per keystroke (`row-table.tsx:344-346,378-379,396-398,434-436`), so the map *reference* changes on every keystroke.
- **Hidden repeated pattern:** ~6 whole-tree memos/effects all list `editableRows` in deps: `getProposalPreviewSignature` (`:1252,1258`), `estimateNodeTotals = computeNodeTotals(...)` (`:1401`), `displayedNodeTotals` (`:1405-1406`), `currentRows = flattenEstimateRows` (`:1413-1414`), `activityScopeItems` (`:1423,1429`), proposal model `materializeEditableEstimateTree` (`:1590,1596`) — plus ~10 mutation handlers read it as `previousRows` (`:1817,1974,2034,2081,2192,2328,2372,2434,2487,2512`).
- **Performance concern:** one keystroke in any cost cell recomputes every one of those whole-tree memos. **Per-row subscription is the single highest-leverage fix.**
- **Refactor direction:** split `editableRows` into a ref + per-row version map, or a `useSyncExternalStore`/Zustand row store; pair with a per-node totals selector (A-09).
- **Safe first move:** add the per-row subscription layer behind the existing memo guards without changing the public setter contract.
- **Unsafe move to avoid:** moving `editableRows` into the TanStack tree cache naively — it interacts with the tree-as-mutable-cache model (A-12) and the resync effect (`:1766-1783`).
- **Validation proof:** `estimate-sheet-render-relief`/`-memoization` perf tests (assert `nodeTotalsComputes===1`, `proposalSignatureComputes===0` on keystroke, R7). Addressed in **Phase 3** (foundations in Phase 1).

### A-08 — Row/branch render guards are load-bearing (positive; must preserve) — **P0 / High (preservation constraint)**
- **Current shape (PINNED):** row rendering is already shielded by granular `memo` comparators keyed on per-row `editableRows[id]` identity + stable callbacks: `areEstimateSheetBranchPropsEqual` (`branch.tsx:111-156`), `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:86-116`), `EstimateRowItemTableRow` memo (`row-table.tsx:170`). A keystroke in row A skips rows B…N and sibling branches.
- **Key insight (PINNED):** *the problem is COMPUTE work, not row re-renders.* Any refactor MUST preserve these guards; they depend on stable callback identity (`useStableCallback`) and per-item `editableRows` reference-equality.
- **Validation proof:** `estimate-sheet-render-relief.test.tsx:162` (`rendersOutside === 0`). This is a constraint, not a fix — cross-cuts **Phase 3**.

### A-09 — Full-tree totals DFS reruns on every keystroke — **P0 / High**
- **Current shape (PINNED):** `computeNodeTotals` (`src/components/workshop/estimate-sheet/rows/editable-row-model.ts:162-183`) is a full-tree DFS, memo'd on `[editableRows, estimateTree]` (`:1401`); because `editableRows` identity changes every keystroke (A-07), the full-tree total DFS reruns each keystroke. With a filter active, a **second** `computeNodeTotals` runs over the displayed subtree (`displayedNodeTotals`, `:1402-1406`).
- **Latent O(n²):** `branch.tsx:177` falls back to `computeNodeTotal(node, editableRows)` per branch if `nodeTotals` is ever absent (`src/components/workshop/estimate-sheet/rows/editable-row-model.ts:155-160`); today always passed, so latent.
- **Refactor direction:** incremental totals — recompute only the edited row's ancestor chain via a parent index built once per tree version.
- **Safe first move:** build the parent index in Phase 1 utilities; keep `computeNodeTotals` as a fallback path.
- **Unsafe move to avoid:** an incremental model that diverges from the `displayedSheetNode`-filtered second totals map without reconciling both paths (R4 open Q).
- **Validation proof:** `estimate-sheet-memoization.test.tsx` (`nodeTotalsComputes===1`). Addressed in **Phase 1 + Phase 3**.

### A-10 — 13 hand-rolled optimistic flows, 5 rollback mechanisms, 2 with none — **P1 / High**
- **Current shape (PINNED):** 13 mutation flows hand-roll onMutate-snapshot → setQueryData patch → onError rollback → onSettled invalidate-none. **5 distinct rollback mechanisms:** (a) patch-snapshot `context.previousPatch` (row update/detach, `use-estimate-row-mutations.ts:395-398,312-318`); (b) whole-tree `context.previous` (move, `use-estimate-query.ts:180`); (c) revision-guarded `restore` (reorder, `use-estimate-query.ts:70-75`); (d) cache-snapshot `ctx.previousSidebar` (favorites); (e) closure-returning `removeOptimistic` (project list, `project-estimates-store.ts:67-95`).
- **Correctness gap:** **Notifications (`useNotificationsQuery.ts:83-164`) and collaborator-role (`use-project-collaboration-query.ts:45-63`) have NO rollback.**
- **Refactor direction:** one `createOptimisticMutation({ key, patch, rollback })` adapter; subsumes `mutationId`/`operationId`/promise-queue boilerplate (`use-estimate-row-mutations.ts:411-436`).
- **Safe first move:** introduce the adapter and migrate the two no-rollback flows first (pure correctness win).
- **Unsafe move to avoid:** collapsing the revision-guarded reorder restore into a naive snapshot — the revision counter prevents stale-overwrite races.
- **Validation proof:** existing tree/tab/CRUD DOM tests; new optimistic-rollback unit tests (Phase 5). Addressed in **Phase 5** (adapter primitive in Phase 1).

### A-11 — 5 query-key conventions + repeated `tabTree/areaTree` branch — **P1 / Med**
- **Current shape (PINNED):** 5 styles — nested factory ×3 (`use-estimate-query.ts:10-16`; `favorites/query-keys.ts:1-5`; `notifications/useNotificationsQuery.ts:19-24`), bare-const+builders (`component-library/query-keys.ts:7-47`), inline standalone fn (`use-project-collaboration-query.ts:16-18`), plus ad-hoc inline keys (`EstimateSheetContent.tsx:1181-1183`). `areaTree` flagged **legacy** (`use-estimate-query.ts:14`); the `estimateTabId ? tabTree : areaTree` ternary is replicated **~14×** (`use-estimate-row-mutations.ts:204,212,229,278,303,313,328,353,383,394`).
- **Refactor direction:** one nested-factory module (favorites/notifications are the template); fold the branch into `estimateQueryKeys.tree(estimateId, tabId?)`.
- **Safe first move:** add the resolver and migrate the ternary sites mechanically.
- **Unsafe move to avoid:** retiring `areaTree` before confirming no non-tab estimate still reads it (open Q).
- **Validation proof:** `bun run type-check` + tree/tab DOM tests. Addressed in **Phase 1**.

### A-12 — TanStack tree cache doubles as mutable optimistic state — **P1 / Med**
- **Current shape (PINNED):** `useEstimateAreaTreeQuery`/`useEstimateTabTreeQuery` expose `setTree`/`snapshot`/`restore`/revision (`use-estimate-query.ts:59-82,120-143`); a hand-rolled revision counter is stored under a sibling `[...queryKey,"revision"]` key (`:40,101`). `patchAndMarkStale` idiom (`setQueryData` + invalidate `refetchType:"none"`) repeated at **22 sites** (R2; `use-estimate-row-mutations.ts:212,213,253,254,308,309,388,389,401`).
- **Refactor direction:** `patchAndMarkStale(client, key, updater)` helper (22 sites); formalize the tree-as-mutable-cache as an explicit adapter so the revision protocol is centralized.
- **Safe first move:** extract `patchAndMarkStale` (pure refactor, mechanical).
- **Unsafe move to avoid:** changing the revision-key sibling protocol without updating reorder rollback (A-10c).
- **Validation proof:** tree reorder DOM/DnD tests. Addressed in **Phase 1 + Phase 4/5**.

### A-13 — Zustand: server state in store, duplicate selection stores, hot dragState, arrays-for-sets — **P2 / Med**
- **Current shape (PINNED):** `project-estimates-store.ts:35-102` holds server state (estimate list rows) with its **own** optimistic engine (a 2nd engine beside TanStack). `estimate-ui-store` overlaps `use-estimate-workspace-state` on selection/expansion (two stores model the same concept). `dragState` mutates on every drag-over (`estimate-ui-store.ts:49`) inside a shared store. `selectedRowIds`/`expandedNodeIds` are **arrays** (O(n) `areNodeIdsEqual`, `use-estimate-workspace-state.ts:105-108`) where Set/Map fit; `expandedNodeIds` stored as `string[]`. **Bulk selection is a local `bulkSelectedRowIds` Set** (`EstimateSheetContent.tsx:1099`), correct.
- **Refactor direction:** merge selection/expansion stores; switch arrays→Set/Map; split high-frequency `dragState` into its own atom; migrate `project-estimates-store` server state to TanStack.
- **Safe first move:** isolate `dragState` (highest-frequency, lowest-coupling).
- **Unsafe move to avoid:** merging the local bulk Set into a shared store without regression coverage (open Q `_SYNTHESIS.md §5`).
- **Validation proof:** selection/expansion + DnD DOM tests. Addressed in **Phase 5**.

---

## 4. Tree / hierarchy systems (from R3) — structural sameness

### A-14 — 7 tree families re-solve the same hierarchy problems — **P0 / High**
- **Current shape (PINNED):** **7 tree families** (estimate sheet; component-library; library-folder; templates/project-source; template-structure editor; share read-only; non-render aggregation/export/proposal/publication traversal — `_SYNTHESIS.md` enumerates exact files). Guiding insight: *small-scale UI differences hide large-scale structural sameness.*
- **Hidden repeated pattern (the core insight):** the same algorithm over different node types — **≥8 find-by-id DFS** (`estimate-tree-data.ts:395`; `estimate-tree-reorder.ts:63`; `estimate-tree-edit.ts:78,87`; `tree-selection.ts:23`; `buildLibraryTree.ts:90`; `helpers.ts:39`; `estimate-tree.ts:54`), **≥5 descendant collectors** (`estimate-tree-reorder.ts:156`; `estimate-tree-edit.ts:37`; `tree-selection.ts:40`; `helpers.ts:52`; `buildLibraryTree.ts:99`), **≥4 keep-ancestor filters** (`EstimateSheetTree.tsx:193,216`; `helpers.ts:28`; `TemplatesTree.tsx:659`), **≥3 cascade-selection engines**, **5+ Map index builders** (`tree.tsx:278-284`; `TemplatesTree.tsx:841-849`; `LibraryFolderTree.tsx:437`; publication parent-map `snapshot.ts:135-163`), plus clone/rollup/signature duplicates. Only true variation: field names (`children` universal; `name`/`label`, `estimateRowItems`/`item`/`rows` vary) and stored-nested vs derived-from-flat.
- **Performance concern:** most run un-memoized recursive DFS per render/keystroke; the estimate + library reorder/delete planners are near-identical engines over different types (`buildEstimateNodeReorderPlan` vs `buildLibraryFolderReorderPlan`).
- **Refactor direction:** one headless `TreeIndex<T>` + ops layer over a `TreeAdapter<T>` (R3 interface sketch): `byId/parentOf/depthOf/pathOf/descendantsOf/ancestorsOf/find(O(1))/flattenVisible/allIds/folderIds`, plus `moveNode/removeNodes/mapNode/filterKeepingAncestors/rollup`. Donate `TemplatesTree`'s indexed `filterProjectSourcesByQuery` (`:659-730`) as the filter model.
- **Safe first move:** adopt `TreeIndex` in the estimate sheet first (highest churn), behind existing behavior; leave other families on current code until proven.
- **Unsafe move to avoid:** forcing the estimate and library reorder planners into one core before confirming their distinct `sortOrder` persistence rules unify (open Q).
- **Validation proof:** full tree DOM suite (reorder 385, edit 189, filter 250, bulk-selection 180, context-menu 827, dnd, external-drop, row-patch 116 — R3); `tree-selection` unit test. Addressed in **Phase 2**.

### A-15 — EstimateSheetTree rebuilds the whole tree on every keystroke — **P0 / High**
- **Current shape (PINNED):** EstimateSheetTree runs 2 filters → full `toUiNode` rebuild → kernel `flattenTree` per query char (`filterEstimateTreeNodes` `:193-207` + `filterEstimateTreeByStructure` `:216-236` + `buildUiTreeModel`, chained at `EstimateSheetTree.tsx:328-339`); `findEstimateNode` is called ~15× as fresh DFS across handlers.
- **Refactor direction:** one `TreeIndex` per tree version fixes both (O(1) find, indexed filter).
- **Cross-seam (PINNED open Q):** does the left tree run its own totals DFS, doubling per-keystroke compute vs the sheet? — measurement (R3↔R4 seam).
- **Validation proof:** `estimate-tree-filter.test.tsx`; new tree render-count budget (Phase 9, none exists today). Addressed in **Phase 2**.

### A-16 — `getEstimateTreeContentSignature` JSON.stringifies the whole tree per reorder — **P1 / High**
- **Current shape (PINNED):** `src/lib/estimates/estimate-tree-reorder.ts:181-220` builds a nested array of **~19 fields × every row of the whole tree** then `JSON.stringify`s it; called **5×** in `EstimateSheetTree.tsx` (`:300,301,411,418,440`), including two refs computed on **initial render** (`:300-301`). `mergeEstimateTreeStructureWithCachedNodes` (`:222-251`) rebuilds a Map index + clones every node each call.
- **Refactor direction:** replace with structural hashing / per-row dirty tracking (revision counters already exist for structure, A-12).
- **Safe first move:** introduce a structural-hash signature primitive in Phase 1; swap the 5 call sites.
- **Unsafe move to avoid:** changing signature semantics without verifying the cache-reconciliation diff (`mergeEstimateTreeStructureWithCachedNodes`) still detects the same changes.
- **Validation proof:** reorder/DnD DOM tests + cache-freshness tests. Addressed in **Phase 1 (primitive) → Phase 2/3**.

### A-17 — Two presentation kernels + a dead dependency (`react-complex-tree`) — **P2 / Med**
- **Current shape (PINNED):** two kernels — `Tree` (`ui/tree.tsx`, ~1328 LOC, virtualized, used by estimate/library/templates/template-editor) vs `WorkshopTree` (`workshop-tree.tsx`, no virtualization), the latter used **only** by Share (`ShareEstimateTreeView.tsx:298`). `react-complex-tree@2.6.1` is imported for **CSS only** (`app/workshop/layout.tsx:15`) + **one type alias** `TreeItemIndex` (`library-folder-reorder.ts:1,86`) — no runtime component rendered → **removable** (R1 B7: 2.7M install, likely not bundled; verify with analyzer).
- **Refactor direction:** move Share's render onto `Tree` (read-only mode), delete `WorkshopTree` + the `react-complex-tree` dep.
- **Safe first move:** drop `react-complex-tree`'s value surface (already type/CSS-only) after analyzer confirms no value import; convert Share last.
- **Unsafe move to avoid:** retiring `WorkshopTree` before deciding whether Share's 500-row cap (`reconstruct-share-tree.ts:29`) is a hard product limit (open Q).
- **Validation proof:** `share/reconstruct-share-tree.test.ts` (331); `ANALYZE=true bun run build`. Addressed in **Phase 2 / Phase 7**.

### A-18 — Library category tree re-synthesizes + fuzzy-matches the full taxonomy per build — **P2 / Med**
- **Current shape:** `buildLibraryTree.ts:478-504` re-synthesizes/re-sorts/prunes the whole taxonomy per items/query change; `attachComponentsToTree` runs `findBestCategoryNode` (O(items × nodes) fuzzy match, `:126-149,46-88`) per build. The team already pre-cached totals in `TemplatesTree` UI-1/UI-2 (`:878-898`) — evidence they hit this pain before.
- **Refactor direction:** cache the taxonomy shell + precompute a category→node map once.
- **Validation proof:** `library-folder-tree-selection.test.tsx`; new library render budget (Phase 9). Addressed in **Phase 2**.

---

## 5. Estimate sheet / grid systems (from R4)

(The sheet's highest-severity findings are A-04 god-component, A-07 fan-out, A-08 guards, A-09 totals — above. This section adds the grid/virtualization-specific findings.)

### A-19 — Proposal preview signature rebuilt per keystroke once dialog opened — **P1 / High**
- **Current shape (PINNED):** `createProposalPreviewSignature` (`EstimateSheetContent.tsx:287-318`) is a full-tree DFS string-joining every node + every row's **15 fields**. Wrapped in `getProposalPreviewSignature` (`:1250-1259`) memo'd on `[editableRows, estimateTree, …]` and `currentProposalPreviewSignature` (`:1260-1263`) recomputes whenever a preview model exists → **once the dialog has been opened, every keystroke rebuilds the entire signature** to drive the stale badge (`isProposalPreviewStale`, `:1663`).
- **Refactor direction:** move the signature off the keystroke path — compute lazily on dialog open / debounced; or derive from the structural hash (A-16).
- **Safe first move:** gate signature recompute behind dialog-open + debounce (no semantic change to staleness UX).
- **Validation proof:** `estimate-sheet-memoization.test.tsx` (`proposalSignatureComputes===0` on keystroke); `proposal-export-preview.test.tsx`. Addressed in **Phase 3**.

### A-41 — Proposal-export staleness signature omits export inputs (found bug) — **P1 / High**
- **Current shape:** `createProposalPreviewSignature` (`EstimateSheetContent.tsx:296-313`) drives the stale-badge (`isProposalPreviewStale`), but it does NOT cover the full input set the export actually reads. The export reads `row.discipline` (`lib/proposal-export/build-proposal-export-model.ts:130,144`) and depends on the `ProposalExportSettings` inputs (`contingencyMode`, `contingencyRate`, `vatMode`, `vatRate`, `includeZeroRows`, `showSupplierInRemarks`, `audience`) — none of which are in the signature.
- **Why it matters (found bug):** because the staleness signature is narrower than the export's true input set, a change to `discipline` or any `ProposalExportSettings` value produces a stale-badge FALSE-NEGATIVE — the preview looks current while the underlying workbook would differ, so a wrong proposal workbook can ship to a client. This is a pre-existing latent correctness bug, not a refactor regression.
- **Refactor direction:** the corrected signature/structural hash (A-16/A-19 work) MUST cover the export input set DERIVED FROM `build-proposal-export-model.ts` — including `discipline` and the `ProposalExportSettings` inputs — not the legacy field list.
- **Fix-as-found:** repaired in **Phase 3** as part of the A-19 signature work; the RISK-03 field-differential parity test asserts the corrected signature fires on each export input.
- **Validation proof:** RISK-03 field-differential parity test (doc 09 Step 7); `proposal-export-preview.test.tsx`. Cross-ref **RISK-03**, doc 09 Step 7. Addressed in **Phase 3**.

### A-20 — Virtualization is on by default but threshold-gated — **P2 / Med**
- **Current shape (PINNED):** the workshop virtualization flags are **DEFAULT ON** — `src/lib/workshop/virtualization-flags.ts:11-13` sets tree / EMC / rows to `true` (only column-resize is `false` at `:14`). The real risk is the **thresholds**, not an off-by-default flag: estimate rows virtualize only at `minRows=75` (`:21`), EMC sections at `minSections=80` (`:24`), and the tree at `minRows=150` (`:18`). So trees with many small areas (many sections/tables, few rows each), or any sheet below these thresholds, render fully — `virtual-branch-list.tsx:74-125,93` gates the branch list on `minSections`; rows gate per-table on `minRows` (`row-table.tsx:4,22`).
- **Supporting hotspots:** `flattenVisibleBranches` re-flattens on every collapse/expand (`virtual-branch-list.tsx:44-72`, memo'd `:80-92`); `findScrollParent` walks DOM with `getComputedStyle` per call (`virtual-branch-list.tsx:34-42`, `row-table.tsx:130-138`); `visibleSheetRowIds` full-subtree DFS per `displayedSheetNode` change (`:1345-1354`); `collectAllNodeIds([selectedNode])` DFS per `selectedNode` change (`:1442`).
- **PINNED open Q:** do the default-ON flags survive any production/env override, and what real estimate shapes fall below the thresholds? — measurement (hand to Phase 0).
- **Refactor direction:** lower the thresholds (`minRows=75/150`, `minSections=80`) after measuring so the many-small-areas case still virtualizes; cache `getScrollElement`.
- **Unsafe move to avoid:** forcing virtualization on without the large-tree fixture (A-22) to prove no regression.
- **Validation proof:** `estimate-row-table-virtualization.test.tsx`; `route-transition-peak-load-profile.test.tsx` (asserts windowing). Addressed in **Phase 3**.

### A-21 — Tree→editableRows resync effect rebuilds the entire map after reconcile — **P2 / Med**
- **Current shape (PINNED):** the resync effect (`EstimateSheetContent.tsx:1766-1783`) runs `collectEditableRows` (full-tree DFS, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:131-143`) on every `estimateTree`/`saveState` change, guarded by `skipEditableRowsSyncRef`. After a server reconcile this rebuilds the **entire** `editableRows` map, changing its identity (compounds A-07).
- **Refactor direction:** patch only changed rows on reconcile (diff against the index) rather than rebuilding the whole map.
- **Validation proof:** `estimate-sheet-render-relief`/`-baseline` perf tests after a simulated reconcile. Addressed in **Phase 3**.

---

## 6. Data fetching and repositories (from R5)

### A-22 — Component-library load is `.select("*")` on 8 tables + unbounded — **P1 / High**
- **Current shape (PINNED):** `loadCurrentWorkspaceComponentRowsLibrary` (`src/lib/repositories/component-library-repository.ts:530-746`) uses `.select("*")` on 8 tables (`:547` category_nodes, `:562` cost_library_items, `:606` price_options, `:614` variant_cost_entries, `:634` versions, `:640` price_history, `:646` state_history, `:652` variant_attachments); **no `.limit()` on `cost_library_items` (`:562-566`)** and **no per-item limit on audit/history (`:630-656`)**. Parallelized (`Promise.all`) and N+1-free, but volume-unbounded. Lite variant (`:1169`, `includeDetailGraph:false`) skips audit tables.
- **PINNED open Q:** does prod call the full loader or the Lite variant? — decides whether this is live (`_SYNTHESIS.md §5`).
- **Refactor direction:** explicit column lists + `.limit()` on `cost_library_items` and audit/history reads.
- **Safe first move:** answer the Lite-vs-full question (caller trace) before column surgery.
- **Unsafe move to avoid:** trimming columns the sheet relies on (cross-check `source_snapshot`/`metadata` consumption with R4, A-25).
- **Validation proof:** `build-performance-query-inventory.ts` (orphan; wire it Phase 9); library DOM tests. Addressed in **Phase 4 (discipline) + Phase 8**.

### A-23 — `getWorkshopHomebaseData` serial round-trip tail — **P1 / High**
- **Current shape (PINNED):** `src/lib/repositories/workspace-repository.ts:1126-1222` (function `:1050-1261`) — after a 6-way `Promise.all` (`:1061`), 5–7 **sequential** awaits (favoriteProjects `:1128`, recentEstimates `:1155`, favoriteEstimates `:1167`, missingProjects `:1184`, `readOptionalProjectPublications` `:1194`, pending-collab summary `:1204`, firstNodes `:1214`), several mutually independent. Columns are explicit (good).
- **Refactor direction:** collapse independent awaits into another `Promise.all` wave or a `workspace_homebase_summary` RPC.
- **Safe first move:** parallelize the provably-independent trio (favoriteProjects / favoriteEstimates / recentEstimates) first.
- **Unsafe move to avoid:** parallelizing `sharedProjects` follow-up (`:905-913`) which legitimately depends on `sharedProjectIds`.
- **Validation proof:** query-count budget (Phase 9, none exists); homebase e2e. Addressed in **Phase 8**.

### A-24 — Chart aggregation in JS; push-down RPC designed but never shipped — **P2 / Med**
- **Current shape (PINNED):** `project-charts-repository.ts:101-128` does per-estimate totals `.reduce` + category/supplier bucketing in JS over ≤5000 rows / ≤1500 nodes per chart load. Comment `:113-118` cites `get_project_chart_buckets` as a "ready migration" — **but no migration defines it** (`rg get_project_chart_buckets supabase/migrations` → 0). Fetch discipline otherwise exemplary (explicit columns, `.limit(N+1)` overflow detection, 4-way `Promise.all`).
- **Refactor direction:** ship `get_project_chart_buckets` (golden-master tests exist for charts).
- **Validation proof:** `project-charts-*` DOM golden-master tests; `prove:*` proof harness pattern. Addressed in **Phase 8**.

### A-25 — `.select("*")` on `projects` in sidebar/list path + activity-history N+1 — **P2 / Med**
- **Current shape (PINNED):** `.select("*")` on `projects` at `workspace-repository.ts:837` and `:908` (sidebar/list boundary carries every column); `getCurrentWorkspaceProject` `.select("*")` `:1356/1367` (cached per request). Activity history: `resolveEstimateActivityNodeScope` fetches **every node** of the estimate (`actions.ts:698-701`, no limit) then JS BFS (`collectDescendantNodeIds` `:640-662`) — belongs in `WITH RECURSIVE`; actor-label N+1 second `profiles` hop (`actions.ts:600-622`); event payload SELECT pulls `old_snapshot,new_snapshot,payload` (`:1277`, capped ≤101).
- **Refactor direction:** explicit columns on `projects`; recursive-CTE RPC for node scope; fold actor labels into the event read.
- **Validation proof:** query-inventory + DOM activity tests. Addressed in **Phase 4 + Phase 8**.

### A-26 — `listProjectEstimates` first-node oracle still fetches all nodes in JS — **P3 / Low**
- `workspace-repository.ts:1620-1683` — the RPC `project_estimate_list_summaries` already moved counts/total-cost to SQL (the *fixed* F8/P2-1 path); but the nodes query (`:1661-1665`) still fetches ALL nodes for ALL estimates to compute first-node in JS (`selectFirstEstimateNodeIds`). RPC returns `first_node_id = NULL` deliberately (flat SQL pick mis-targets links). Bounded; a window-function RPC honoring depth/area ordering could fold it. Addressed in **Phase 8 (optional)**.

---

## 7. Supabase / RLS / RPC (from R5)

### A-27 — 87 unindexed foreign keys (live Supabase advisor) — **P1 / High**
- **Current shape (PINNED):** Supabase performance advisor (project `ebxxqidacheyapmmzavr`, 101 INFO lints) reports **87 `unindexed_foreign_keys`**. **Hot-path subset that matters for reads:** `estimate_nodes.parent_id`, `estimate_nodes.estimate_tab_id`, `project_favorites`, `estimate_favorites`, `project_members`, `project_group_memberships`, `estimate_sheet_members`, `notification_deliveries(project|estimate|workspace)`. Most others are write-heavy audit/AI tables (`ai_*`, `*_history`) → cascade-delete cost only, defer. Also **13 `unused_index`** (write-cost waste; `estimate_nodes_tab_parent_sort_idx` etc.) — confirm traffic before dropping.
- **Refactor direction:** add the hot-path FK indexes (planning items only — no migrations applied per `_SYNTHESIS.md §4`).
- **Safe first move:** index the read-hot subset; defer audit/AI FK indexes.
- **Unsafe move to avoid:** dropping `unused_index` entries on a young/low-traffic DB without a longer `pg_stat_user_indexes` window (open Q).
- **Validation proof:** `get_advisors` re-run; `prove:*` harness. Addressed in **Phase 8** (early-win candidate per `_SYNTHESIS.md §2`).

### A-28 — Strong existing patterns to generalize (positive; do not rebuild) — **P3 / Low (reference)**
- **Current shape (PINNED):** `publication/public-repository.ts` is best-in-class (`cache()` `:85`, split `ACCESS_LOOKUP_COLUMNS`/`SNAPSHOT_LOOKUP_COLUMNS` `:96-97` so the heavy `snapshot_json` blob is only read when needed, count via `head:true`). `project_estimate_list_summaries` RPC already replaced a JS fold. Project-charts limit-with-overflow discipline. Active RLS-initplan remediation (migration `…162000`, harness `bun run prove:rls-initplan`; 211 `auth.uid()`, 64 wrapped `(select auth.uid())`, most unwrapped live in SECURITY DEFINER bodies not policy clauses → no per-row initplan re-eval).
- **Action:** generalize these patterns; **do not** spend effort rebuilding them. **PINNED open Q:** has any policy added after `…162000` reintroduced a bare `auth.uid()` in a USING/CHECK clause? — run `prove:rls-initplan` + advisor security scan. Addressed in **Phase 8 (verification)**.

---

## 8. UI primitives / design system (from R6)

### A-29 — DS linter enforces tokens but has ZERO reuse/duplication rules (root cause) — **P1 / Med**
- **Current shape (PINNED):** `scripts/enforce-app-design-system.mjs:148-237` enforces tokens (font-size ≤12px, `rounded-xs`, weights, tracking, globals) but has **no** reuse/adoption rule, so every duplicate below passes CI silently because the raw class strings are individually token-compliant. `DESIGN.md:426` calls a visible duplicate "a blocking design-system defect" — unenforced.
- **CAVEAT (PINNED):** `.agents/skills/impeccable/detect.mjs` is a thin loader; its anti-pattern engine isn't in-tree → `enforce-app-design-system.mjs` is the only verifiable CI gate. **Open Q:** is `lint:design` a no-op? — eng.
- **Refactor direction:** add a primitive-adoption / duplication lint rule (+ dead-primitive + skeleton-consistency rules).
- **Validation proof:** the new lint rule run against the current tree must flag the known duplicates (A-30…A-33). Addressed in **Phase 6 + Phase 10**.

### A-30 — `Card` primitive bypassed by every product card; `LiveProjectCard` un-memoized — **P2 / Med**
- **Current shape (PINNED):** `Card` imported **0×** in workshop. `LiveProjectCard.tsx:1-722` is a 722-LOC bespoke card, **un-memoized** (churn + bloat); plus `ProjectCard.tsx`, `EstimateListCard.tsx`.
- **Refactor direction:** make `Card` the structural base (header/media/body/footer slots); feature cards compose it; memoize `LiveProjectCard`.
- **Validation proof:** card DOM/story coverage; the new duplication lint. Addressed in **Phase 6**.

### A-31 — Icon-button forked 3 ways + dead primitive + 19 raw class strings — **P2 / Med**
- **Current shape (PINNED):** `ui/icon-button.tsx`, `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx`; `IconButton` dead (0 non-story uses); `ToolbarIconButton` in only 3 files; **19 raw icon-button class strings** across ~12 workshop files (`ProjectEstimatesTable.tsx:302,312,344`, `ProjectTeamspaceHeader.tsx:494`, `ComponentLibraryManager.tsx:451,581`, `EstimateColumnRuler.tsx:90`, `EstimateSheetContent.tsx:2753`, `AddComponentModal.tsx` ×4, `LiveProjectCard.tsx` ×2). Violates `DESIGN.md:421`.
- **Refactor direction:** collapse into one `Button variant="icon"`; migrate the 19 sites.
- **Validation proof:** `bun run lint:design-system` + new adoption lint; story coverage. Addressed in **Phase 6**.

### A-32 — `BulkActionToolbar` exists twice; `EstimateTabStrip` ignores `tab-strip.tsx`; 70 raw `<input>` — **P2 / Med**
- **Current shape (PINNED):** `BulkActionToolbar` built twice (`ui/bulk-action-toolbar.tsx:1-219` vs `workshop/BulkActionToolbar.tsx:1-135`, latter doesn't import former). `EstimateTabStrip.tsx:1-655` (654 LOC) extends neither `TabStrip` nor `Tabs`. `SearchInput` adopted in only 2 files; **70 raw `<input>`** across workshop/app; 8 files hand-roll `role="dialog"`. **6 forked primitive families** total (BulkActionToolbar, Card, icon-button, tab-strip, search/input, skeleton).
- **Refactor direction:** delete the workshop BulkActionToolbar copy; compose `EstimateTabStrip` on the primitive (keep DnD/scroll behavior feature-local); mandate `SearchInput`/`ControlInput`.
- **Open Q (PINNED):** is `EstimateTabStrip`'s divergence intentional (DnD + scroll + add-affordance)? — decides refactor vs bless.
- **Validation proof:** tab-strip + bulk-toolbar DOM tests. Addressed in **Phase 6**.

### A-33 — Loading/skeleton drift — **P3 / Low**
- **Current shape (PINNED):** 6 bespoke `animate-pulse` blocks bypass `Skeleton` (some skip `motion-reduce:animate-none`) — `data-table.tsx` ×2, `TemplatesTree.tsx`, `component-library/index.tsx`, 2 stories; `loading.tsx` route shells diverge (`library/loading.tsx:1` has no shared shell vs `workshop/loading.tsx`/`projects/loading.tsx` using `StaticWorkshopLoadingShell`).
- **Refactor direction:** shared `<Skeleton.List>` + route-skeleton shell contract.
- **Validation proof:** new skeleton-consistency lint. Addressed in **Phase 6**.

---

## 9. Bundle / runtime dependencies (from R1)

### A-34 — Redundant `d3` dependency (only `d3-shape` used) — **P1 / Low**
- **Current shape (PINNED):** full `d3` (~868K) installed; only `d3-shape` imported anywhere (`CostDonutChart.tsx:4-5` uses `arc`/`pie`; no bare `d3` usage). Remove `d3` from `package.json` (verify no transitive need). Install sizes (R1 B1): `three` 38M (transitive via `@firecms/neat`), `exceljs` 22M, `@phosphor-icons/react` 57M, `react-complex-tree` 2.7M.
- **Validation proof:** `ANALYZE=true bun run build` + `bun run validate`. Addressed in **Phase 7** (early win).

### A-35 — d3-shape charts shipped eagerly to Data route AND public Share page — **P1 / Med**
- **Current shape (PINNED):** `CostDonutChart` is dynamic only on the charts route (`ProjectChartsClient.tsx:26-29`); imported **statically** at `CostBreakdownSection.tsx:5` (Data route via `ProjectDataClient.tsx:82`) and `SharePageTabs.tsx:23` (public `/share/[token]`) → ships d3-shape to external recipients even when the cost tab isn't open.
- **Refactor direction:** make CostDonutChart dynamic / tab-gated at all three consumers, especially the external share page.
- **Validation proof:** `ANALYZE=true bun run build` share-chunk diff; `shared-link-receiver.spec.ts`. Addressed in **Phase 7** (early win).

### A-36 — `optimizePackageImports` covers only phosphor — **P3 / Low**
- **Current shape (PINNED):** `next.config.ts:55` lists only `@phosphor-icons/react`; no `modularizeImports`. Extend to `@tanstack/react-table`, `@tanstack/react-virtual`, `@radix-ui/react-context-menu`, `d3-shape`. A few files still import phosphor from the bare barrel (2 value imports) vs `/dist/ssr` (R1 B6) — normalize.
- **Validation proof:** analyzer. Addressed in **Phase 7**.

### A-37 — Confirmed bundle positives (do NOT spend effort) — **P3 / Low (reference)**
- **PINNED:** `exceljs` cleanly server-only (only `create-proposal-workbook.ts:1` → API route; no client import). NeatWireframe WebGL lifecycle **exemplary** (dynamic import `HeroSection.tsx:11-14` + inner `await import('@firecms/neat')` `:117` + `requestIdleCallback` activation + `IntersectionObserver` pause `:132-141` + `destroy()` on unmount). All 32 `page.tsx` are Server Components. Landing-only libs (`lenis`, `roughjs`, `rough-notation`) scoped to `components/landing/**`. **Reference patterns; no action.**

---

## 10. Tests / performance tooling (from R7)

### A-38 — Only 4 jsdom render-isolation gates exist (the template to replicate) — **P1 / Med**
- **Current shape (PINNED):** the only hard, meaningful perf gates are 4 jsdom tests in `tests/vitest/perf/`: `estimate-sheet-render-relief.test.tsx:162` (`rendersOutside===0`), `-memoization.test.tsx` (`nodeTotalsComputes===1`, `proposalSignatureComputes===0`, `:166-201`), `-cursor-isolation.test.tsx` (`contentRenders()===0` while typing), and `-render-baseline.test.tsx` (records but asserts only `>0`, `:204-214` — measurement, not budget). These are the best model to replicate.
- **Refactor direction:** replicate render-count budgets for tree/tabs/sidebar/charts (none exist); convert the baseline harness to a bounded gate.
- **Validation proof:** the new gates themselves. Addressed in **Phase 0 (instrument) + Phase 9 (gate)**.

### A-39 — No real large-tree / large-estimate DB fixture — **P1 / Med**
- **Current shape (PINNED):** `perf:seed-fixture` (`scripts/seed-performance-test-data.ts:116`) is **manifest-only** (never writes Supabase); `perf:profile-peak-load` uses synthetic ≤200 rows / 50 estimates in jsdom (`route-transition-peak-load-profile.test.tsx:63-66`, `<10s` ceiling). No 1000+ row sheet, no deep tree, no 100+ project list against a real DB.
- **Refactor direction:** build a genuine large-tree/large-estimate fixture (DB or in-memory) to expose virtualization/memo wins (needed before A-20).
- **Validation proof:** the fixture + a budgeted profile run. Addressed in **Phase 0 + Phase 9**.

### A-40 — Route-transition + bundle + query budgets are non-binding or absent — **P2 / Med**
- **Current shape (PINNED):** route-transition budgets are loose and non-gating — `publicMedianBudgetMs=15000`, `authenticatedMedianBudgetMs=10000`, `slow3gPublicMedianBudgetMs=30000`, `overlayVisibilityRateMax=1.0` (`check-route-transition-readiness.ts:108-113`), so essentially nothing fails. No bundle-size budget (analyzer behind `ANALYZE`, no script, no kb ceiling). No Supabase query-count/N+1 budget (`build-performance-query-inventory.ts` is orphan, ungated). Orphan benchmark scripts (no thresholds, not in package.json): `benchmark-proposal-workbook`, `benchmark-estimate-cursor-broadcast`, `benchmark-shared-link-activity`, `build-performance-query-inventory`. `bun run validate` runs **none** of e2e/perf/storybook/bundle.
- **Refactor direction:** tighten route budgets to real warm-nav targets; add bundle-size + query-count budgets; wire the orphan benchmarks with thresholds; integrate a perf step into CI.
- **PINNED open Q:** does CI run anything beyond `validate`? (no `.github/` inspected) — measurement/eng.
- **Validation proof:** the tightened budgets must fail on a deliberate regression. Addressed in **Phase 9**.

---

## Open questions surfaced for `19_OPEN_QUESTIONS.md`

These reproduce/extend `_SYNTHESIS.md §5` (cross-reference by `Q-NN` once W11 assigns IDs):
- Does prod call the full component-library loader or the Lite variant? (severity of A-22) — eng + measurement.
- Does the left EstimateSheetTree run its own totals DFS, doubling per-keystroke compute? (A-15, R3↔R4 seam) — measurement.
- Does CI run anything beyond `bun run validate`? (A-40) — eng.
- Is `lint:design` (impeccable `detect.mjs`) enforcing anything or a no-op loader? (A-29) — eng.
- Bundle reality: run `ANALYZE=true bun run build` to confirm all import-graph-derived "ships into bundle X" claims (A-01, A-17, A-34, A-35) before acting — Phase 0.
- Can `bulkSelectedRowIds` (local Set) and `estimate-ui-store`/`use-estimate-workspace-state` selection merge without regressions? (A-13) — eng.
- Virtualization flags default ON (`virtualization-flags.ts:11-13`); which real estimate shapes fall below the `minRows=75/150` / `minSections=80` thresholds, and does any prod/env override flip the defaults? (A-20) — measurement.
- Has any policy added after migration `…162000` reintroduced a bare `auth.uid()` in a USING/CHECK clause? (A-28) — `prove:rls-initplan` + advisor.

**No contradictions with PINNED facts were found.** One numeric reconciliation applied per the contract: `router.refresh()` spans **12 files** (verified by enumeration against live code) — see A-02.

---

## Severity-ranked findings index

| ID | Finding | Key files | Priority / Severity | Phase |
|---|---|---|---|---|
| A-04 | EstimateSheetContent god-component (2949 LOC / ~1884-LOC fn / ~17 resp / ~40 atoms) | `EstimateSheetContent.tsx:1042-2925` | P0 / Critical | 3 |
| A-07 | `editableRows` single-map identity fan-out (6+ whole-tree memos per keystroke) | `EstimateSheetContent.tsx:1093,1401`; `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:29-52` | P0 / Critical | 3 (P1 foundations) |
| A-01 | Authed providers mount on public/landing routes (supabase in landing bundle) | `providers.tsx:30-46`; `realtime-auth-bridge.tsx:22-66`; `layout.tsx:25` | P0 / High | 7 (early win) |
| A-09 | Full-tree totals DFS reruns every keystroke | `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:162-183`; `EstimateSheetContent.tsx:1401-1406` | P0 / High | 1 + 3 |
| A-08 | Row/branch memo guards are load-bearing (preservation constraint) | `branch.tsx:111-156`; `row-table.tsx:86-116` | P0 / High | 3 (constraint) |
| A-14 | 7 tree families re-solve the same hierarchy ops (≥8 finders etc.) | `estimate-tree-*`, `tree-selection.ts`, `component-library/tree/*`, `library-folder-reorder.ts`, `TemplatesTree.tsx` | P0 / High | 2 |
| A-15 | EstimateSheetTree rebuilds whole tree per keystroke; ~15 DFS finds | `EstimateSheetTree.tsx:193-236,328-339` | P0 / High | 2 |
| A-16 | `getEstimateTreeContentSignature` JSON.stringifies whole tree per reorder | `estimate-tree-reorder.ts:181-220`; `EstimateSheetTree.tsx:300,301,411,418,440` | P1 / High | 1 → 2/3 |
| A-19 | Proposal signature rebuilt per keystroke once dialog opened | `EstimateSheetContent.tsx:287-318,1250-1263` | P1 / High | 3 |
| A-41 | Proposal-export staleness signature omits export inputs (`discipline` + `ProposalExportSettings`) → wrong-workbook false-negative (found bug) | `EstimateSheetContent.tsx:296-313`; `lib/proposal-export/build-proposal-export-model.ts:130,144` | P1 / High | 3 (fix-as-found) |
| A-10 | 13 optimistic flows / 5 rollbacks; 2 flows with no rollback | `use-estimate-row-mutations.ts`; `use-estimate-query.ts:167-184`; `useNotificationsQuery.ts:83-164`; `use-project-collaboration-query.ts:45-63` | P1 / High | 5 (P1 adapter) |
| A-22 | Component-library load `.select("*")` ×8 tables, unbounded | `component-library-repository.ts:530-746` | P1 / High | 4 + 8 |
| A-23 | `getWorkshopHomebaseData` serial round-trip tail | `workspace-repository.ts:1126-1222` | P1 / High | 8 |
| A-27 | 87 unindexed FKs (hot-path subset backs sidebar/homebase/list) | Supabase advisor; `estimate_nodes.parent_id`, favorites, members, notification_deliveries | P1 / High | 8 (early win) |
| A-11 | 5 query-key conventions + ~14× tabTree/areaTree branch | `use-estimate-query.ts:10-16`; component-library/favorites/notifications key files | P1 / Med | 1 |
| A-12 | TanStack tree cache doubles as mutable state; `patchAndMarkStale` ×22 | `use-estimate-query.ts:40,59-143`; `use-estimate-row-mutations.ts` | P1 / Med | 1 + 4/5 |
| A-29 | DS linter enforces tokens but zero reuse/duplication rules (root cause) | `scripts/enforce-app-design-system.mjs:148-237`; `DESIGN.md:426` | P1 / Med | 6 + 10 |
| A-34 | Redundant `d3` dep (only `d3-shape` used) | `package.json`; `CostDonutChart.tsx:4-5` | P1 / Low | 7 (early win) |
| A-35 | d3-shape charts eager on Data route + public Share page | `CostBreakdownSection.tsx:5`; `SharePageTabs.tsx:23`; `ProjectChartsClient.tsx:26-29` | P1 / Med | 7 (early win) |
| A-38 | Only 4 jsdom render-isolation gates exist | `tests/vitest/perf/*` | P1 / Med | 0 + 9 |
| A-39 | No real large-tree/large-estimate DB fixture | `seed-performance-test-data.ts:116`; `route-transition-peak-load-profile.test.tsx:63-66` | P1 / Med | 0 + 9 |
| A-05 | Secondary oversized client islands (≥10 files >1200 LOC) | `component-library/index.tsx`, `AddComponentModal.tsx`, `activity-history.tsx`, etc. | P2 / Med | 2/3/6 |
| A-13 | Zustand: server state in store, dup selection stores, hot dragState, arrays | `project-estimates-store.ts:35-102`; `estimate-ui-store.ts:34-51`; `use-estimate-workspace-state.ts:105-108` | P2 / Med | 5 |
| A-17 | Two presentation kernels + dead `react-complex-tree` dep | `workshop-tree.tsx`; `ShareEstimateTreeView.tsx:298`; `library-folder-reorder.ts:1,86` | P2 / Med | 2 / 7 |
| A-18 | Library tree re-synthesizes + fuzzy-matches full taxonomy per build | `buildLibraryTree.ts:46-149,478-504` | P2 / Med | 2 |
| A-20 | Virtualization default-ON but threshold-gated (rows ≥75, EMC ≥80, tree ≥150) | `virtualization-flags.ts:11-24`; `virtual-branch-list.tsx:74-125,93`; `row-table.tsx:22` | P2 / Med | 3 |
| A-21 | Tree→editableRows resync rebuilds whole map after reconcile | `EstimateSheetContent.tsx:1766-1783`; `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:131-143` | P2 / Med | 3 |
| A-24 | Chart aggregation in JS; `get_project_chart_buckets` RPC unshipped | `project-charts-repository.ts:101-128` | P2 / Med | 8 |
| A-25 | `.select("*")` on projects sidebar path + activity-history N+1 | `workspace-repository.ts:837,908`; `estimates/actions.ts:670-719,600-622` | P2 / Med | 4 + 8 |
| A-02 | Sparse streaming; `router.refresh()` across 12 files | `ProjectEstimatesClient.tsx:215`; project layout `:42-51` | P2 / Med | 4 |
| A-30 | `Card` bypassed by all product cards; `LiveProjectCard` un-memoized (722 LOC) | `LiveProjectCard.tsx:1-722`; `ProjectCard.tsx`; `EstimateListCard.tsx` | P2 / Med | 6 |
| A-31 | Icon-button forked 3× + dead primitive + 19 raw class strings | `ui/icon-button.tsx`, `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx`; 19 sites | P2 / Med | 6 |
| A-32 | BulkActionToolbar ×2; EstimateTabStrip ignores tab-strip; 70 raw inputs | `ui/bulk-action-toolbar.tsx` vs `workshop/BulkActionToolbar.tsx`; `EstimateTabStrip.tsx:1-655` | P2 / Med | 6 |
| A-40 | Route/bundle/query budgets non-binding or absent; validate runs no perf | `check-route-transition-readiness.ts:108-113`; orphan benchmarks | P2 / Med | 9 |
| A-03 | Bundle analyzer wired, no npm script | `next.config.ts:190-194`; `package.json` | P3 / Low | 0/7 |
| A-06 | Good dynamic-import discipline (preserve) | `EstimateWorkspaceClient.tsx:19-31` etc. | P3 / Low | — (constraint) |
| A-26 | `listProjectEstimates` first-node oracle fetches all nodes in JS | `workspace-repository.ts:1620-1683` | P3 / Low | 8 (optional) |
| A-28 | Strong existing data patterns to generalize (reference) | `public-repository.ts:85-97`; `project_estimate_list_summaries` RPC | P3 / Low | 8 (verify) |
| A-33 | Loading/skeleton drift (6 bespoke animate-pulse; divergent loading.tsx) | `data-table.tsx`; `TemplatesTree.tsx`; `library/loading.tsx:1` | P3 / Low | 6 |
| A-36 | `optimizePackageImports` covers only phosphor | `next.config.ts:55` | P3 / Low | 7 |
| A-37 | Confirmed bundle positives (do not spend effort) | `create-proposal-workbook.ts`; `NeatWireframeBackground.tsx` | P3 / Low | — (reference) |
