# R3 — Tree & Hierarchy Systems Dossier

Research agent R3. Read-only on source. Every claim cites `path:line-range`.
Guiding insight: *small-scale UI differences hide large-scale structural sameness.*

## Executive summary

There are **two presentation kernels** plus **~30 standalone traversal helpers** that
all re-solve the same hierarchy problems (index, flatten, find, descendant-collect,
filter, cascade-select, rollup, signature/diff, immutable patch).

- `src/components/ui/tree.tsx` (`Tree`) — the real kernel: flatten-to-virtual-rows,
  ARIA, roving focus, keyboard nav, intra/external DnD, root drop zones, cascade
  indeterminate state, TanStack virtualization. **Estimate sheet, library folders,
  templates/project-sources, and the template-structure editor all render through it.**
- `src/components/workshop/workshop-tree.tsx` (`WorkshopTree<TNode>`) — a second,
  simpler recursive `<ul role=tree>` renderer with **no virtualization, no flatten,
  no DnD**. Only the **share** read-only view still uses it (`src/components/share/ShareEstimateTreeView.tsx:298`).
- `react-complex-tree` (package.json `^2.6.1`) is **effectively dead**: only its CSS
  (`src/app/workshop/layout.tsx:15`) and its `TreeItemIndex` type
  (`src/lib/component-library/library-folder-reorder.ts:1,86`) are imported. No
  `ControlledTreeEnvironment`/`TreeItem`/provider is rendered anywhere. **Removable dependency.**

The structural sameness is overwhelming: I count **at least 8 independent
`findNode`/`findNodeLocation`/`findEstimateNode`/`findTreeNode`/`findNodeById`
implementations**, **6+ `descendant-id collector`s**, **5+ `index into Map`
builders**, **4+ recursive `filter` (keep-matches-with-ancestors)**, and **3
distinct cascade-selection engines**. Most run as un-memoized recursive DFS on every
render or every keystroke.

---

## Tree inventory (one subsection per family)

Columns: source shape | render shape | lookup | mutation | filter/search | selection | drag/drop | virtualization | persistence | tests | perf risks | kernel candidate.

### 1. Estimate sheet tree (the primary, unified single-node model)

Primary files: `src/components/workshop/EstimateSheetTree.tsx` (1587 LoC),
`src/components/workshop/estimate-tree-data.ts`, `src/lib/estimates/estimate-tree-reorder.ts`,
`src/lib/estimates/estimate-tree-edit.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`,
`src/lib/domain/estimate-tree.ts`, `src/lib/estimates/tree-hierarchy.ts`.

| dim | observation |
|---|---|
| source shape | `EstimateTreeNode[]` (nested `children`, `estimateRowItems`, `kind`, `total`); built from flat DB rows. `kind` is vestigial post-unification (`src/lib/domain/estimate-tree.ts:1-13`, `tree-hierarchy.ts:11-25`). |
| render shape | `UiTreeNode[]` via `buildUiTreeModel`→`toUiNode` DFS, deriving folder/leaf from `children.length` not `kind` (`EstimateSheetTree.tsx:165-190`). |
| lookup | `findEstimateNode` DFS (`estimate-tree-data.ts:395-402`); `findNodeLocation` (reorder, `estimate-tree-reorder.ts:63-71`); `findNodePosition`/`findTreeNode` (edit, `estimate-tree-edit.ts:78-99`); `getNodeById`/`isDescendantNode` ancestor-walk (`estimate-tree.ts:54-67`). **4 separate finders.** |
| mutation | rename (`estimate-tree-edit.ts:16-35`), delete+fallback (`:54-123`), reorder plan (`estimate-tree-reorder.ts:253-346`), row patch (`estimate-row-tree-patch.ts:65-91`) — each its own immutable recursive rebuild. |
| filter/search | name-match keep-ancestors `filterEstimateTreeNodes` (`EstimateSheetTree.tsx:193-207`) + structural `filterEstimateTreeByStructure` hide-empty (`:216-236`). Recompute per keystroke via `useMemo` on `displayedNodes` (`:328-339`). |
| selection | cascade via `src/lib/bulk-selection/tree-selection.ts` + `buildEstimateTreeSelectionNodes` (`EstimateSheetTree.tsx:247`); kernel computes indeterminate itself (`tree.tsx:628-642`). |
| drag/drop | full intra-tree reorder (`evaluateEstimateTreeDrop` `estimate-tree-reorder.ts:318-346`), external drop of templates/project-sources via `treeExternalDrop` (`EstimateSheetTree.tsx:649-680`), `allowInsideOnLeaves`, bottom root drop zone (`:1465-1474`). |
| virtualization | kernel TanStack, `WORKSHOP_TREE_VIRTUALIZATION` flag, minRows 150 (`virtualization-flags.ts`). |
| persistence | `expandedNodeIds` controlled state; current node derived from route pathname (`EstimateSheetTree.tsx:260-323`). Structure/content signatures for cache reconciliation (`estimate-tree-reorder.ts:168-220`). |
| tests | `estimate-tree-reorder.test.ts` (385), `-edit.test.ts` (189), `-filter.test.tsx` (250), `-bulk-selection.test.tsx` (180), `-context-menu.test.tsx` (827), `-modal.test.tsx`, `-data.test.ts`, `-node-icon.test.tsx`, `estimate-sheet-tree-dom.test.tsx`, `estimate-sheet-tree-dnd.test.tsx`, `tree-external-drop.test.tsx`, `workshop-tree-row-affordances.test.tsx`, `estimate-row-tree-patch.test.ts` (116). |
| perf risks | **HIGH.** Per-keystroke filter does 2 full-tree rebuilds → `toUiNode` full rebuild → `flattenTree` (kernel) → new row props every render. `findEstimateNode` called ~15× across handlers, each a fresh DFS. Two full-tree signature serializations on every reorder (`getEstimateTreeContentSignature` JSON.stringifies every row field, `:181-220`). |
| kernel candidate | **YES — canonical consumer.** Already on `Tree`; needs a shared `TreeIndex` (id→node, id→parent, id→path, descendant sets) computed once. |

### 2. Component library tree (categories / suppliers / brands / custom)

Primary files: `src/components/workshop/component-library/tree/{buildLibraryTree,helpers,types,LibraryTree}.ts(x)`.

| dim | observation |
|---|---|
| source shape | `EstimateRowItem[]` + taxonomy + supplier/brand option lists → derived `LibraryTreeNode[]` (`types.ts:7-16`). Tree is **synthesized from flat facts**, not stored nested. |
| render shape | `buildLibraryTree` produces 4 different tree shapes by tab (`buildLibraryTree.ts:469-504`); fuzzy category matching `findBestCategoryNode` scores labels (`:46-88`). |
| lookup | own `findNodeById` (`buildLibraryTree.ts:90-97`) AND own `findNode` (`helpers.ts:39-46`) — **two more finders**; `collectItemsFromNode` DFS (`:99-113`). |
| mutation | none structural; sibling-order overrides applied via `applyLibraryTreeOrder` (`helpers.ts:67-91`), reorder plan in `library-folder-reorder.ts`. |
| filter/search | `filterTree` keep-matches-with-children (`helpers.ts:28-37`) + `matchesQuery` haystack join (`:3-26`). Full rebuild per keystroke. |
| selection | cascade reuses `tree-selection.ts`; `collectComponentIds` (`helpers.ts:52-55`). |
| drag/drop | sibling reorder only, `position!=="inside"` blocked (`LibraryTree.tsx:328-339`); items drag out as copy. Goes through kernel `Tree`. |
| virtualization | none directly in LibraryTree; LibraryFolderTree uses kernel virtualization. |
| persistence | `expandedNodeIds`; search forces all-expanded `getAllNodeIds` (`helpers.ts:48-50`, `LibraryTree.tsx:282-283`). |
| tests | indirectly via library-folder-tree-selection.test.tsx. |
| perf risks | MED-HIGH. Whole taxonomy re-synthesized + re-sorted + pruned on every items/query change (`buildLibraryTree.ts:478-504`); `attachComponentsToTree` runs `findBestCategoryNode` (O(items × nodes) fuzzy match) per build (`:126-149`). |
| kernel candidate | YES — shares finder/filter/getAllIds/cascade; the *derivation* (facts→tree) is library-specific but the *operations* are identical. |

### 3. Library folder tree (manager + picker)

Primary files: `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (1311 LoC),
`library-folder-tree-shared.ts`, `src/lib/component-library/library-folder-reorder.ts`.

| dim | observation |
|---|---|
| source shape | `LibraryFolderRecord[]` (flat, `parent_id`) → `buildLibraryFolderTree` nest (`library-folder-reorder.ts:95-125`). |
| render shape | `LibraryFolderTreeNode[]`→`UiTreeNode[]`; own `indexUiNodes` Map builder (`LibraryFolderTree.tsx:437`). |
| lookup | `getLibraryItemsForFolderNode` (`library-folder-reorder.ts:321`); buildParentMap/placement. |
| mutation | `buildLibraryFolderReorderPlan` (`:247`), `planLibraryFolderDelete` (`:217`), create-sort-order — a **parallel reorder/delete engine to the estimate one** (same shape, different types). |
| filter/search | reuses `filterTree`/`getAllNodeIds` from library helpers (`LibraryFolderTree.tsx:37,426,933`). |
| selection | **merges folder cascade selection with component selection** into one `selectedIds` (`:451-483`) — bespoke union logic. |
| drag/drop | kernel `Tree` with `canDrop`/`handleDrop` mapping to reorder plan, "inside" nests (`:542-770`). |
| virtualization | kernel `WORKSHOP_TREE_VIRTUALIZATION` (`:774`). |
| persistence | `expandedItemIds` state. |
| tests | `library-folder-tree-selection.test.tsx` (181). |
| perf risks | MED. Multiple per-render `useMemo` rebuilds (componentItemsByFolderId, filtered, uiNodes, selectionNodes) but memoized; reorder engine duplicated. |
| kernel candidate | YES — its reorder/delete planner is near-identical to estimate's (`buildEstimateNodeReorderPlan` vs `buildLibraryFolderReorderPlan`). Prime merge target. |

### 4. Templates / project-source tree (reusable sources)

Primary file: `src/components/workshop/component-library/tree/TemplatesTree.tsx` (1252 LoC); helpers in `src/components/workshop/templates*`.

| dim | observation |
|---|---|
| source shape | `EstimateTemplate[]` + `ReusableEstimateSource[]` (project/estimate/tab/node/row union). |
| render shape | `buildTemplatesTreeNodes` (`:404-438`) assembles nested `UiTreeNode` with `data.templatesNode` discriminated payload (`:47-60`); project sources reconstructed flat→nested via Map groups (`:235-402`). |
| lookup | own `nodeById` Map (`:841-849`); ancestor walks `hasCheckedNodeAncestor` (`:502-509`, again `:540-547`). |
| mutation | read-only (insert into estimate only). |
| filter/search | template filter + **indexed** project-source filter `filterProjectSourcesByQuery` (`:659-730`, ancestor-inclusion) — the **one filter built for perf** (the perf test targets it). |
| selection | cascade via kernel; checked-unit resolution `getCheckedTemplateUnits`/`getCheckedProjectSourceTargets` dedupe to top-most (`:479-596`) — bespoke "dedupe to roots" akin to `dedupeSelectedRoots` (`tree-selection.ts:80-91`). |
| drag/drop | external (drag out as copy), per-type `canDrag` (`:900-919`); kernel `Tree`. |
| virtualization | kernel (`:1243`). |
| persistence | `expandedNodeIds`; search forces all-expand `getTemplatesTreeAllNodeIds` (`:440-448,853-856`). Lazy load with skeleton injection `injectProjectSourceSkeletons` (`:87-106`). |
| tests | `templates-tree-performance.test.ts` (321) — explicitly asserts indexed filter <1000ms and hostile-input safety. |
| perf risks | MED. Totals precomputed in maps (UI-1/UI-2 fix, `:878-898`) — **evidence the team already hit per-row recompute pain here.** Tree fully rebuilt on filter/loading change (`:833-840`). |
| kernel candidate | YES for ops; its `filterProjectSourcesByQuery` indexed approach is the **model the other filters should adopt**. |

### 5. Template structure editor tree

Primary file: `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` (325 LoC).

| dim | observation |
|---|---|
| source shape | `EstimateTemplate` → `buildTemplateStructureIndex` (`:102`). |
| render | `UiTreeNode[]` (`:104`); totals map (`:119`). |
| mutation | reorder via `handleDropNode` + keyboard move-up/down (`:219-246,306`). |
| selection | single-select (scroll-to). |
| drag/drop | kernel `Tree` `onDrop` (`:306`). |
| virtualization | kernel. |
| tests | covered via template editor tests. |
| perf risks | LOW (small trees). |
| kernel candidate | YES (already on `Tree`). |

### 6. Share estimate tree (read-only public view)

Primary files: `src/components/share/ShareEstimateTreeView.tsx` (308), `ShareEstimateTreePanel.tsx`,
`src/lib/share/reconstruct-share-tree.ts`.

| dim | observation |
|---|---|
| source shape | flat `PublicationSnapshotRow[]` and/or `PublicationSnapshotTreeNode[]`. |
| render shape | `ShareTreeNode[]` via 3 strategies: from snapshot nodes (`reconstruct-share-tree.ts:267-336`), from designation strings (`:81-195`), or by-discipline fallback (`:201-260`); `getBestShareTree` selects (`:342-358`). Rendered with **`WorkshopTree<TNode>` not the kernel** (`ShareEstimateTreeView.tsx:298`). |
| lookup | depth carried on node; no interactive finder. |
| mutation | none (read-only). |
| filter/search | none; DoS guards (MAX_ROWS 500, MAX_DEPTH 20) (`reconstruct-share-tree.ts:29-36`). |
| selection | none; active-node highlight + IntersectionObserver scroll-spy. |
| drag/drop | none. |
| virtualization | **none** — full recursive `<ul>` render; capped at 500 rows by design. |
| persistence | expand/collapse local; `wrapTreeWithRoot` for nav context (`:380-405`). |
| tests | `share/reconstruct-share-tree.test.ts` (331). |
| perf risks | LOW-MED (bounded). The own `rollup` DFS (`:180-192`) duplicates estimate rollup logic. |
| kernel candidate | PARTIAL — the *reconstruction* (rows→tree, designation parsing) is share-specific; the *render* should move from `WorkshopTree` onto `Tree` (read-only mode) to retire the second renderer. |

### 7. Aggregation / export / proposal / publication traversal (non-interactive)

These never render; they DFS the same `EstimateTreeNode` shape to roll up or flatten.

| location | shape→produces | DFS |
|---|---|---|
| `src/lib/project-charts/aggregate-project-charts.ts:200-346` `buildSpaceTableRows` | node tree → hierarchical chart rows w/ depth + own/descendant rollup | YES |
| `src/lib/project-charts/aggregate-project-charts.ts:115-172` `buildSeries` | flat rows → buckets | no |
| `src/lib/share/aggregate-share-chart-buckets.ts:37-89` | snapshot rows → discipline buckets (top-8 + Other) | no |
| `src/lib/proposal-export/build-proposal-export-model.ts:355-386` `flattenEstimateTree` | node tree → flat rows w/ areaPath | YES (core) |
| `build-proposal-export-model.ts:388-487` consolidate/order/renumber/build | flat rows → proposal model | no |
| `src/app/api/.../export/proposal.xlsx/route.ts:184-196` `countTree` | node tree → counts | YES |
| `src/lib/publication/snapshot.ts:135-163` `buildSnapshotTreeNodes` | flat → nested snapshot | no (parent map) |
| `src/lib/publication/snapshot.ts:204-293` `buildSnapshot*` | nested + rows → snapshot w/ rollups | delegates |
| `src/lib/reusable-sources/source-collectors.ts:51-60` `summarizeEstimateTreeNode(s)` | node tree → {rowCount,totalCost} | YES |
| `src/lib/component-library/estimate-templates.ts:367-387` `summarizeEstimateTemplate` | template tree → counts+total | YES |
| `src/lib/domain/estimate-totals.ts:8-10` `calculateEstimateTotal` | rows only → grand total | no |
| `src/lib/share/reconstruct-share-tree.ts:180-192` `rollup` | share tree → rolled totals | YES |

Perf risk: each export/chart/snapshot re-walks the full tree independently; no shared
"indexed tree with cached subtree totals" — totals are recomputed everywhere.

---

## Structural sameness map (what every tree re-solves)

| Concern | Independent implementations (cite) |
|---|---|
| **Index id→node (Map)** | `tree.tsx:278-284 indexTree`; `TemplatesTree.tsx:841-849`; `LibraryFolderTree.tsx:437 indexUiNodes`; `buildLibraryTree.ts` (implicit); publication parent-map `snapshot.ts:135-163`. |
| **Find node by id (DFS)** | `estimate-tree-data.ts:395 findEstimateNode`; `estimate-tree-reorder.ts:63 findNodeLocation`; `estimate-tree-edit.ts:78 findTreeNode` + `:87 findNodePosition`; `tree-selection.ts:23 findNode`; `buildLibraryTree.ts:90 findNodeById`; `helpers.ts:39 findNode`; `estimate-tree.ts:54 getNodeById`. **≥8.** |
| **Descendant id collection** | `estimate-tree-reorder.ts:156 getDescendantEstimateNodeIds`; `estimate-tree-edit.ts:37 getEstimateTreeNodeAndDescendantIds`; `tree-selection.ts:40 selectableIdsForSubtree`; `helpers.ts:52 collectComponentIds`; `buildLibraryTree.ts:99 collectItemsFromNode`. |
| **Ancestor walk** | `estimate-tree.ts:58 isDescendantNode`; `tree-selection.ts:32 findAncestorIds`; `TemplatesTree.tsx:502/540 hasCheckedNodeAncestor`; share `includeAncestors` `TemplatesTree.tsx:700-713`. |
| **Flatten to visible rows** | `tree.tsx:253 flattenTree`; `estimate-tree-data.ts:373 flattenVisibleNodes` (with path!); proposal `flattenEstimateTree:355`. |
| **All ids / expand-all** | `helpers.ts:48 getAllNodeIds`; `estimate-tree-data.ts:383 getExpandedNodeIds`; `TemplatesTree.tsx:440 getTemplatesTreeAllNodeIds`; `EstimateSheetTree.tsx:238 collectEstimateFolderIds`. |
| **Filter keep-matches+ancestors** | `EstimateSheetTree.tsx:193 + 216`; `helpers.ts:28 filterTree`; `TemplatesTree.tsx:659 filterProjectSourcesByQuery`. |
| **Cascade selection + indeterminate** | `tree.tsx:628 indeterminateIds`; `tree-selection.ts:61-112` full cascade engine; library/template consumers wire it differently. |
| **Dedupe selection to roots** | `tree-selection.ts:80 dedupeSelectedRoots`; `TemplatesTree.tsx:479/570 getChecked*` |
| **Immutable move/insert/remove** | kernel `moveTreeNode tree.tsx:328`; `estimate-tree-reorder.ts` plan; `library-folder-reorder.ts` plan. |
| **Rename / patch in place** | `estimate-tree-edit.ts:16`; `estimate-row-tree-patch.ts:65`. |
| **Subtree rollup totals** | `source-collectors.ts:51`; `reconstruct-share-tree.ts:180`; `aggregate-project-charts.ts:252`; `estimate-templates.ts:367`. |
| **Structure/content signature (diffing)** | `estimate-tree-reorder.ts:168 + 181`. |
| **Clone tree** | `estimate-tree-reorder.ts:55 cloneNode`; `buildLibraryTree.ts:115 cloneTree`; share `bumpDepth:407`. |

Every list above is the SAME algorithm over a different node type. The only true
variation is (a) the node's field names (`children` is universal; `name`/`label`,
`estimateRowItems`/`item`/`rows` vary) and (b) whether the tree is stored-nested or
derived-from-flat.

---

## Candidate canonical tree kernel (interfaces)

Two layers: a **headless index/ops library** (pure, the real win) and the existing
**`Tree` presentation kernel** (already good; keep, retire `WorkshopTree`).

```ts
// 1. Adapter: describe any node type once.
interface TreeAdapter<T> {
  id: (n: T) => string;
  children: (n: T) => T[] | undefined;
  // optional, for typed ops:
  withChildren?: (n: T, c: T[]) => T;
}

// 2. Computed once per tree version, reused by every consumer + handler.
interface TreeIndex<T> {
  byId: ReadonlyMap<string, T>;
  parentOf: ReadonlyMap<string, string | null>;
  depthOf: ReadonlyMap<string, number>;
  pathOf: ReadonlyMap<string, string[]>;          // ancestor ids
  descendantsOf: (id: string) => ReadonlySet<string>; // memoized
  ancestorsOf: (id: string) => string[];
  find: (id: string) => T | undefined;            // O(1)
  flattenVisible: (expanded: ReadonlySet<string>) => FlatRow<T>[];
  allIds: () => string[];
  folderIds: () => Set<string>;
}
function buildTreeIndex<T>(roots: T[], a: TreeAdapter<T>): TreeIndex<T>;

// 3. Immutable mutations (one engine; estimate + library reorder collapse into this).
function moveNode<T>(roots, a, draggedId, target: {id; pos:"before"|"after"|"inside"}): ReorderResult<T>;
function removeNodes<T>(roots, a, ids: Set<string>): { next: T[]; fallbackId: string|null };
function mapNode<T>(roots, a, id, fn: (n:T)=>T): T[];   // rename/patch

// 4. Filtering (keep matches + ancestors), indexed.
function filterKeepingAncestors<T>(idx: TreeIndex<T>, predicate: (n:T)=>boolean): T[];

// 5. Cascade selection (already exists, generalize tree-selection.ts).
//    toggleCascade / getSelectionState / dedupeRoots over TreeAdapter.

// 6. Rollup: bottom-up reduce with memoized subtree cache.
function rollup<T, A>(idx, seed:(n:T)=>A, combine:(parent:A, child:A)=>A): Map<string, A>;
```

Adoption path: estimate sheet first (highest churn), then library/folders (collapse
the duplicate reorder planner), then templates (donate its indexed filter), then move
share's render onto `Tree` and delete `WorkshopTree` + the `react-complex-tree` dep.

---

## Top findings (ranked)

1. **One headless `TreeIndex` would replace ≥8 finders, ≥5 descendant collectors, ≥4
   filters, ≥3 cascade engines.** The duplication is across `estimate-tree-*`,
   `bulk-selection/tree-selection.ts`, `component-library/tree/{helpers,buildLibraryTree}`,
   `library-folder-reorder.ts`, `TemplatesTree.tsx`. This is the single biggest
   simplification + perf lever.
2. **EstimateSheetTree recomputes the whole tree on every keystroke and DFS-finds on
   every handler call.** `filterEstimateTreeByStructure`+`filterEstimateTreeNodes`+
   `buildUiTreeModel` chain (`EstimateSheetTree.tsx:328-339`) rebuilds the full tree per
   query char; `findEstimateNode` is called ~15× as fresh DFS. An index built once per
   tree version fixes both. (HIGH risk symbol — coordinate with R4.)
3. **`getEstimateTreeContentSignature` JSON.stringifies every row field of the entire
   tree on every reorder** (`estimate-tree-reorder.ts:181-220`) — O(rows × fields)
   serialization in the hot reconcile path. Replace with structural hashing / version
   counters.
4. **Two presentation kernels + a dead dependency.** `WorkshopTree` (no virtualization)
   survives only for share (`ShareEstimateTreeView.tsx:298`); `react-complex-tree` is
   imported for CSS + one type alias only (`library-folder-reorder.ts:1`,
   `app/workshop/layout.tsx:15`). Consolidating onto `Tree` removes a renderer and a
   package.
5. **Library category tree re-synthesizes + re-sorts + fuzzy-matches the full taxonomy
   per build** (`buildLibraryTree.ts:126-149,478-504`), `findBestCategoryNode` is
   O(items × nodes). Cache the taxonomy shell + precompute category→node map once.
   (The team already pre-cached totals in TemplatesTree UI-1/UI-2 — same pattern needed
   in library + estimate.)

## Open questions

- Is the share view's 500-row cap (`reconstruct-share-tree.ts:29`) a hard product
  limit? If so, moving it onto virtualized `Tree` is optional; if it must scale,
  virtualization (and the kernel) becomes mandatory there too.
- Do export/chart/snapshot paths run client-side often enough that their redundant
  full-tree rollups matter, or are they mostly server/one-shot? (R2/state agent likely
  knows where these execute.) A shared memoized `rollup` only pays off on hot paths.
- Should `EstimateTreeNode.kind` be removed entirely (it is already vestigial,
  `estimate-tree.ts`, `tree-hierarchy.ts:18-25`) — would simplify several traversals.
- Can the estimate and library **reorder planners** truly unify, or do their distinct
  `sortOrder` persistence rules (`ESTIMATE_TREE_SORT_ORDER_STEP` vs library folder
  sort) force separate adapters over a shared core?

## Overlaps to reconcile with other agents

- **R4 (estimate-sheet):** EstimateSheetTree (§1) is shared turf. R3 owns the *tree
  algorithm/index* angle; R4 owns the *sheet/row-grid* angle. The per-keystroke
  rebuild (finding #2) and content-signature serialization (#3) sit at the seam — these
  are tree-data costs that surface as sheet jank. Coordinate before either proposes a
  fix to `estimate-tree-data.ts` / `estimate-tree-reorder.ts`.
- **R2 (state):** `expandedNodeIds`, `bulkSelectedNodeIds`, cache reconciliation
  (`mergeEstimateTreeStructureWithCachedNodes` `estimate-tree-reorder.ts:222-251`, the
  structure/content signatures), and the TanStack scoped cache (per MEMORY: favorites
  Route A) all touch tree state R2 is mapping. The proposed `TreeIndex` is *derived*
  state — confirm with R2 whether it lives in a selector/memo layer vs store.
