# 08 — Phase 2: Tree Kernel Unification Plan

> **Status:** Detailed phase plan. Authoritative inputs: `_research/_SYNTHESIS.md` (contract — §1 Trees, §2 phase order, §3 track 1), `_research/R3-trees.md` (primary source), `_research/R4-sheet.md` (tree sections), `04_TARGET_ARCHITECTURE.md` §6 (canonical tree kernel), `01_CODEBASE_AUDIT.md` (A-14…A-21), `02_PATTERN_INVENTORY.md` (PAT-01…PAT-08).
>
> **Scope:** Planning only. No `src/**`, `tests/**`, `scripts/**`, `supabase/**`, or config changes are made by this document (contract §4 / D-011). TypeScript below is a **design target**, not code to commit verbatim. Evidence format `path:line — observation` (contract §4).
>
> **Phase position:** Phase 2 of the pinned order (contract §2). Runs after Phase 0 (baseline + render-count probes) and Phase 1 (canonical indexes, selectors, structural-hash signature primitive). Feeds Phase 3 (estimate-sheet decomposition consumes the index), Phase 5 (optimistic adapter consumes `mapNode`/`moveNode`), Phase 7 (`react-complex-tree` removal confirmed by bundle analyzer).

---

## 0. The insight this phase addresses

> *Small-scale UI differences hide large-scale structural sameness.* (R3 guiding insight)

Seven tree families re-solve the **same** hierarchy algorithms over different node types. R3 counts **≥8 find-by-id DFS**, **≥5 descendant collectors**, **≥4 keep-ancestor filters**, **≥3 cascade-selection engines**, **5+ Map-index builders**, plus duplicate clone/rollup/signature/reorder-planner code (A-14; PAT-01…PAT-08). The only true variation is (a) node field names (`children` is universal; `name`/`label`, `estimateRowItems`/`item`/`rows` vary) and (b) stored-nested vs derived-from-flat.

The fix (D-003) is **two layers**:
1. **A headless, generic index + ops library** (`src/lib/tree/tree-kernel.ts`, new) driven by a per-node-type `TreeAdapter<T>`. This is the real win: one O(1) index built **once per tree version** replaces the per-render/per-keystroke fresh DFS.
2. **A single presentation kernel** — keep `Tree` (`ui/tree.tsx`, ~1328 LOC, already virtualized/ARIA/DnD), retire `WorkshopTree`, delete the dead `react-complex-tree` dependency (A-17, D-004, PAT-08).

This phase is **strictly incremental and reversible**: each tree family converts independently behind the existing behavior, lowest-risk read-only consumer first, the estimate sheet tree (highest blast radius, RISK-01/RISK-02) **last**, after the kernel is proven on safer trees.

> **D-014 — family-1 CODE last, family-1 ADAPTER-SHAPE first (no contradiction).** Two distinct things happen at two different times: (1) the **CODE migration** of family 1 (the estimate sheet tree) runs **LAST** (step 2.7) because it has the highest blast radius. (2) The `moveNode`/`SortOrderStrategy` **adapter shape** is designed and **frozen FIRST** — validated against family-1's `ESTIMATE_TREE_SORT_ORDER_STEP` rules in the early de-risking probe (step 2.2b, a paper/throwaway adapter) — *before* the library-folder family (step 2.3) is the first real consumer to freeze it. This prevents freezing the signature wrong at the library-folder step and then churning it when family 1 finally lands. Where downstream text (e.g. §11 step 1 / "adopt estimate first") says estimate is adopted first, it refers to this **adapter-shape probe**, NOT the code migration (D-014).

---

## 1. The 7 tree consumer families (primary files + current data shapes)

From contract §1 (Trees) and R3 §1–§7. Each family below lists its primary files, current source/render data shapes, and which kernel ops it needs.

### Family 1 — Estimate sheet tree (the canonical consumer; convert LAST)
- **Primary files:** `src/components/workshop/EstimateSheetTree.tsx` (1587 LOC), `src/components/workshop/estimate-tree-data.ts`, `src/lib/estimates/estimate-tree-reorder.ts`, `src/lib/estimates/estimate-tree-edit.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`, `src/lib/domain/estimate-tree.ts`, `src/lib/estimates/tree-hierarchy.ts`.
- **Source shape:** `EstimateTreeNode[]` — nested `children`, `estimateRowItems`, `kind` (vestigial post-unification, `estimate-tree.ts:1-13`, `tree-hierarchy.ts:11-25` — Q-08d), `total`; built from flat DB rows.
- **Render shape:** `UiTreeNode[]` via `buildUiTreeModel`→`toUiNode` DFS, folder/leaf derived from `children.length` (`EstimateSheetTree.tsx:165-190`).
- **Uses every op:** `find` (4 finders: `estimate-tree-data.ts:395`, `estimate-tree-reorder.ts:63`, `estimate-tree-edit.ts:78,87`, `estimate-tree.ts:54`), descendants, ancestors, `filterKeepingAncestors` (×2, `EstimateSheetTree.tsx:193,216`), cascade selection, `moveNode`/`removeNodes`/`mapNode`, `rollup` (totals), `structuralHash` (signature). **Highest churn + blast radius** (A-15, A-16; RISK-01, RISK-02).

#### `EstimateSheetTree.tsx` 7-file split layout (Bible §3.8)

When family 1 finally converts (step 2.7, family-1-CODE-last per D-014), the 1587-LOC `EstimateSheetTree.tsx` is decomposed into the exact 7 target files below. **Goal:** isolate pure projections (index/search/folder-id derivation) from UI/event orchestration so tree ops are **testable in isolation, memoizable on the shared index (§3, D-012), and render-stable** behind the load-bearing memo guards (`branch.tsx:111-156`, `row-table.tsx:86-116`). This is NOT cosmetic file-shrinking — it is a layering boundary: pure model code must not import React, so it can run server-side and under Vitest without a DOM. The named split (Bible §3.8):

| Target file | Responsibility | Imports React? |
|---|---|---|
| `src/components/workshop/estimate-tree/EstimateTreePanel.tsx` | thin view composition — wires model + commands + bulk + url-sync hooks into `Tree`; no logic | yes |
| `src/components/workshop/estimate-tree/EstimateTreeRows.tsx` | `Tree` adapter / `renderRow` only — domain node → `TreeNode`, row presentation | yes |
| `src/components/workshop/estimate-tree/use-estimate-tree-model.ts` | index (`buildTreeIndex`) + projections (`flattenVisible`, `rollup`) + search (`buildVisibleIdSetFromSearch`, §2.4) + folder IDs (`idx.folderIds()`) | hook (no JSX) |
| `src/components/workshop/estimate-tree/use-estimate-tree-commands.ts` | create / rename / delete / move / select — wraps `mapNode`/`moveNode`/`removeNodes` + optimistic flow | hook (no JSX) |
| `src/components/workshop/estimate-tree/use-estimate-tree-bulk.ts` | bulk selection (`toggleCascade`/`getSelectionState`) + descendant row IDs (`descendantsOf`) | hook (no JSX) |
| `src/components/workshop/estimate-tree/estimate-tree-url-sync.ts` | `replaceState` / router boundary — the only module that touches `history`/`router` | no (isolated side-effect seam) |
| `tests/.../estimate-tree-model.test.ts` | **pure** unit tests over the model module — no DOM, no React | n/a (test) |

The three `use-*` hooks + `estimate-tree-url-sync.ts` carry no JSX; `use-estimate-tree-model.ts` is the **pure projection layer** that `estimate-tree-model.test.ts` exercises directly (the keystroke-decoupling probe in §10 asserts `findIndexBuilds === 0` against this module). Sequencing: this split lands **only at step 2.7** (family-1-CODE-last, D-014) — the `moveNode`/`SortOrderStrategy` adapter shape it consumes was already frozen FIRST via the 2.2b probe, so the decomposition wires onto a settled kernel signature rather than churning one.

### Family 2 — Component library tree (categories / suppliers / brands / custom)
- **Primary files:** `src/components/workshop/component-library/tree/{buildLibraryTree,helpers,types,LibraryTree}.ts(x)`.
- **Source shape:** `EstimateRowItem[]` + taxonomy + supplier/brand option lists → derived `LibraryTreeNode[]` (`types.ts:7-16`). **Synthesized from flat facts**, not stored nested.
- **Render shape:** `buildLibraryTree` produces 4 tree shapes by tab (`buildLibraryTree.ts:469-504`); fuzzy `findBestCategoryNode` (`:46-88`) is O(items × nodes) (A-18).
- **Uses:** own `findNodeById` (`buildLibraryTree.ts:90`) + own `findNode` (`helpers.ts:39`), `collectComponentIds` (`helpers.ts:52`), `filterTree`/`matchesQuery` (`helpers.ts:28,3`), `getAllNodeIds` (`helpers.ts:48`), cascade via `tree-selection.ts`, `cloneTree` (`buildLibraryTree.ts:115`). The *derivation* (facts→tree) stays library-specific; the *ops* are identical.

### Family 3 — Library folder tree (manager + picker)
- **Primary files:** `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (1311 LOC), `library-folder-tree-shared.ts`, `src/lib/component-library/library-folder-reorder.ts`.
- **Source shape:** `LibraryFolderRecord[]` (flat, `parent_id`) → `buildLibraryFolderTree` nest (`library-folder-reorder.ts:95-125`).
- **Render shape:** `LibraryFolderTreeNode[]` → `UiTreeNode[]`; own `indexUiNodes` Map (`LibraryFolderTree.tsx:437`).
- **Uses:** `buildLibraryFolderReorderPlan` (`library-folder-reorder.ts:247`) + `planLibraryFolderDelete` (`:217`) — a **parallel reorder/delete engine to estimate's** (PAT-06; prime merge target). Merges folder cascade + component selection into one `selectedIds` (`LibraryFolderTree.tsx:451-483`). Imports the dead `react-complex-tree` `TreeItemIndex` type alias (`library-folder-reorder.ts:1,86`).

### Family 4 — Templates / project-source tree (reusable sources)
- **Primary files:** `src/components/workshop/component-library/tree/TemplatesTree.tsx` (1252 LOC); helpers in `src/components/workshop/templates*`.
- **Source shape:** `EstimateTemplate[]` + `ReusableEstimateSource[]` (project/estimate/tab/node/row union).
- **Render shape:** `buildTemplatesTreeNodes` (`:404-438`) → nested `UiTreeNode` with `data.templatesNode` discriminated payload (`:47-60`).
- **Uses:** own `nodeById` Map (`:841-849`), `hasCheckedNodeAncestor` (`:502,540`), `getChecked*` dedupe-to-roots (`:479-596`), **the one indexed filter** `filterProjectSourcesByQuery` (`:659-730`) — donate as the kernel filter model (A-14, PAT-04). Totals precomputed in maps (UI-1/UI-2 fix, `:878-898`) — prior evidence the team hit per-row recompute pain.

### Family 5 — Template structure editor tree
- **Primary file:** `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` (325 LOC).
- **Source shape:** `EstimateTemplate` → `buildTemplateStructureIndex` (`:102`).
- **Render shape:** `UiTreeNode[]` (`:104`); totals map (`:119`). Reorder via `handleDropNode` + keyboard move (`:219-246,306`). **Low risk (small trees), already on `Tree`.**

### Family 6 — Share estimate tree (read-only public view; convert FIRST)
- **Primary files:** `src/components/share/ShareEstimateTreeView.tsx` (308 LOC), `ShareEstimateTreePanel.tsx`, `src/lib/share/reconstruct-share-tree.ts`.
- **Source shape:** flat `PublicationSnapshotRow[]` and/or `PublicationSnapshotTreeNode[]`.
- **Render shape:** `ShareTreeNode[]` via 3 reconstruction strategies (`reconstruct-share-tree.ts:267-336`, `:81-195`, `:201-260`); `getBestShareTree` selects (`:342-358`). **Rendered with `WorkshopTree<TNode>`, not the kernel** (`ShareEstimateTreeView.tsx:298`). DoS guards MAX_ROWS 500, MAX_DEPTH 20 (`:29-36`). Own `rollup` DFS (`:180-192`) duplicates estimate rollup.
- **Uses:** read-only — no finder/mutation/DnD/selection. Just render + expand/collapse + scroll-spy. **The single safest migration** (no mutations to break; the `WorkshopTree`→`Tree` move is pure render).

### Family 7 — Non-render aggregation / export / proposal / publication traversal
- **Primary files (R3 §7):** `src/lib/project-charts/aggregate-project-charts.ts:200-346` (`buildSpaceTableRows`), `src/lib/proposal-export/build-proposal-export-model.ts:355-386` (`flattenEstimateTree`), `src/app/api/.../export/proposal.xlsx/route.ts:184-196` (`countTree`), `src/lib/publication/snapshot.ts:135-163,204-293` (`buildSnapshotTreeNodes`), `src/lib/reusable-sources/source-collectors.ts:51-60` (`summarizeEstimateTreeNode(s)`), `src/lib/component-library/estimate-templates.ts:367-387` (`summarizeEstimateTemplate`), `src/lib/share/reconstruct-share-tree.ts:180-192` (`rollup`), `src/lib/domain/estimate-totals.ts:8-10`.
- **Shape:** all DFS the same `EstimateTreeNode` shape to roll up / flatten. **No shared memoized subtree-totals cache — totals recomputed everywhere** (R3 §7, PAT-07).
- **Uses:** `rollup`, `flattenVisible`, descendants. **Mostly server/one-shot** — converting these is a code-dedup win, not a hot-path perf win; hot-path payoff gated on Q (do they run client-side often, R3 open Q). Convert opportunistically, NOT before the interactive families.

---

## 2. Canonical tree kernel interfaces (design targets)

New canonical home: **`src/lib/tree/tree-kernel.ts`** (pure, headless, framework-agnostic, server-and-client safe). Mirrors `04_TARGET_ARCHITECTURE.md §6.1` and `R3-trees.md:208-245`. These are **design sketches**, not commit-ready code.

### 2.1 Adapter — describe any node type once

```ts
// src/lib/tree/tree-kernel.ts
interface TreeAdapter<T> {
  id:       (n: T) => string;
  children: (n: T) => readonly T[] | undefined;
  // optional, for typed immutable ops:
  withChildren?: (n: T, c: readonly T[]) => T;   // rebuild node with new children
}
```

One adapter per family: `estimateTreeAdapter` (`children`, `id`), `libraryFolderAdapter`, `libraryTreeAdapter`, `templatesTreeAdapter`, `shareTreeAdapter`. The adapter is the *only* per-family code; everything below is generic.

### 2.2 `TreeIndex` — computed once per tree version, reused everywhere

```ts
interface FlatRow<T> { node: T; id: string; depth: number; parentId: string | null; }

interface TreeIndex<T> {
  byId:          ReadonlyMap<string, T>;
  parentOf:      ReadonlyMap<string, string | null>;
  depthOf:       ReadonlyMap<string, number>;
  pathOf:        ReadonlyMap<string, readonly string[]>;   // ancestor ids, root→node
  find:          (id: string) => T | undefined;            // O(1) — replaces ≥8 DFS finders (PAT-02)
  descendantsOf: (id: string) => ReadonlySet<string>;      // memoized — replaces ≥5 collectors (PAT-03)
  ancestorsOf:   (id: string) => readonly string[];        // replaces ancestor walks (PAT-04)
  flattenVisible:(expanded: ReadonlySet<string>) => readonly FlatRow<T>[];
  allIds:        () => readonly string[];
  folderIds:     () => ReadonlySet<string>;                // nodes with children
}

function buildTreeIndex<T>(roots: readonly T[], a: TreeAdapter<T>): TreeIndex<T>;
```

**Replaces (PAT-01/02/03/04):** `indexTree` (`tree.tsx:278-284`), `nodeById` (`TemplatesTree.tsx:841-849`), `indexUiNodes` (`LibraryFolderTree.tsx:437`), `buildSnapshotTreeNodes` parent-map (`snapshot.ts:135-163`); all 8 finders; all 5 descendant collectors; the ancestor walks.

### 2.3 Immutable ops — ONE engine (estimate + library reorder collapse here)

```ts
interface ReorderResult<T> { next: readonly T[]; moved: boolean; sortOrderPatches?: SortOrderPatch[]; }

function moveNode<T>(
  roots: readonly T[], a: TreeAdapter<T>,
  draggedId: string,
  target: { id: string; pos: "before" | "after" | "inside" },
  opts?: { allowInsideOnLeaves?: boolean; sortOrder?: SortOrderStrategy },   // adapter-supplied divergence
): ReorderResult<T>;

function removeNodes<T>(roots: readonly T[], a: TreeAdapter<T>, ids: ReadonlySet<string>):
  { next: readonly T[]; fallbackId: string | null };

function mapNode<T>(roots: readonly T[], a: TreeAdapter<T>, id: string, fn: (n: T) => T): readonly T[];
```

**Replaces (PAT-06):** `evaluateEstimateTreeDrop` + reorder plan (`estimate-tree-reorder.ts:253-346`), `buildLibraryFolderReorderPlan`/`planLibraryFolderDelete` (`library-folder-reorder.ts:217-247`), `estimate-tree-edit.ts` delete+fallback (`:54-123`), kernel `moveTreeNode` (`tree.tsx:328`), `cloneNode`/`cloneTree`/`bumpDepth`. The **legitimate divergence** — `ESTIMATE_TREE_SORT_ORDER_STEP` vs library-folder sort persistence (RISK-02, Q-08) — is a `SortOrderStrategy` adapter param, **not** a duplicate engine (D-003). **Q-08 timing (D-014):** the "do the estimate + library reorder planners truly unify?" question MUST be probed (step 2.2b) **before** this `moveNode` signature is written for *any* family — probing it after the signature exists forces a retroactive signature churn. If the planners diverge, the "one engine" claim becomes "one engine + estimate special-case" and must be stated openly here, not silently absorbed. `mapNode` is the substrate for rename/patch (`estimate-tree-edit.ts:16`, `estimate-row-tree-patch.ts:65`) and for the Phase 5 optimistic `apply`/`reconcile` (§9).

### 2.4 Indexed filter — keep matches + ancestors

```ts
function filterKeepingAncestors<T>(idx: TreeIndex<T>, predicate: (n: T) => boolean): readonly T[];
```

**Replaces (PAT-04):** `filterEstimateTreeNodes` + `filterEstimateTreeByStructure` (`EstimateSheetTree.tsx:193,216`), `filterTree` (`helpers.ts:28`). **Model:** TemplatesTree's already-indexed `filterProjectSourcesByQuery` (`TemplatesTree.tsx:659-730`) — the perf-built filter the others should adopt (A-14, R3 §4).

#### `buildVisibleIdSetFromSearch` — the canonical ancestor-closure standard (Bible §3.5)

`filterKeepingAncestors` is the kernel *op*; `buildVisibleIdSetFromSearch` is its **canonical implementation** — the indexed ancestor-closure that every search/filter caller MUST use. It is the explicit standard form of the `filterProjectSourcesByQuery` optimization already applied to the Templates project-source panel (`TemplatesTree.tsx:659-730`); Bible §3.5 generalizes that one-off into the kernel default. The 4-step standard:

1. **Lowercase the query once** — never per-node. Hoist `q = query.trim().toLowerCase()` above the match loop (today's per-family filters re-lowercase per record, A-14).
2. **Match directly against flat indexed records** — iterate `idx.allIds()` / `idx.byId` (flat), test the predicate against each node's searchable fields; collect `directMatches: Set<string>`. No tree walk in the match step — the index is already flat.
3. **Close over ancestors (optionally descendants):** `visibleIds = directMatches + allAncestors(directMatches) [+ optionally descendants(directMatches)]`. Walk `parentIdById` (`idx.parentOf`) up to the root for each match, with a `visited` guard so shared ancestors are climbed once — O(matches × depth), not O(n²). Folder hits may also pull their `descendantsOf` set so a matched folder shows its contents (caller-configurable, default ancestors-only).
4. **Project only visible nodes** — rebuild the render tree keeping a node iff `visibleIds.has(id)` (this is the `filterKeepingAncestors` projection); preserves ancestor chain so matches stay reachable from the root.

```ts
// canonical impl of the filterKeepingAncestors op (Bible §3.5)
function buildVisibleIdSetFromSearch<T>(
  idx: TreeIndex<T>,
  query: string,
  matches: (n: T) => boolean,            // caller supplies field selection
  opts?: { includeDescendants?: boolean }, // default: ancestors-only
): ReadonlySet<string> {
  const q = query.trim().toLowerCase();          // (1) lowercase once
  if (!q) return new Set(idx.allIds());          // empty query → all visible
  const visible = new Set<string>();
  const visited = new Set<string>();             // ancestor-walk guard
  for (const id of idx.allIds()) {               // (2) match flat records
    const node = idx.find(id);
    if (!node || !matches(node)) continue;
    visible.add(id);
    // (3) climb parentOf to the root, visited-guarded
    let parent = idx.parentOf.get(id) ?? null;
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      visible.add(parent);
      parent = idx.parentOf.get(parent) ?? null;
    }
    if (opts?.includeDescendants) {
      for (const d of idx.descendantsOf(id)) visible.add(d);
    }
  }
  return visible;                                 // (4) caller projects via filterKeepingAncestors
}
```

`filterKeepingAncestors(idx, predicate)` is then `buildVisibleIdSetFromSearch` + the project-only-visible-nodes step; expose both — the id-set form feeds search-forces-all-expanded (`idx.folderIds()` ∩ visible, §6) without re-projecting. **Gate:** equivalence vs `filterProjectSourcesByQuery` on the templates fixture, plus the hostile-input/perf gate already in §10 (`templates-tree-performance.test.ts:321`, PAT-04).

### 2.5 Cascade selection — generalize `tree-selection.ts`

```ts
function toggleCascade<T>(idx: TreeIndex<T>, selected: ReadonlySet<string>, id: string): Set<string>;
function getSelectionState<T>(idx: TreeIndex<T>, selected: ReadonlySet<string>):
  { checked: ReadonlySet<string>; indeterminate: ReadonlySet<string> };
function dedupeRoots<T>(idx: TreeIndex<T>, ids: ReadonlySet<string>): ReadonlySet<string>;
```

**Replaces (PAT-05):** the full cascade engine (`tree-selection.ts:61-112`), the kernel's separate `indeterminateIds` (`tree.tsx:628-642`), the LibraryFolderTree union (`:451-483`), TemplatesTree dedupe-to-topmost (`:479-596`). `tree.tsx` consumes `getSelectionState` instead of computing indeterminate itself.

### 2.6 Rollup — bottom-up reduce with memoized subtree cache

```ts
function rollup<T, A>(
  idx: TreeIndex<T>, a: TreeAdapter<T>,
  seed: (n: T) => A, combine: (parent: A, child: A) => A,
): ReadonlyMap<string, A>;
```

**Replaces (PAT-07):** the 4+ rollup DFS in family 7 + share's `rollup` (`reconstruct-share-tree.ts:180-192`). Feeds the estimate-sheet incremental totals (Phase 3 §7.3 of target arch) via the **same shared index** (D-012, Q-05).

### 2.7 Structural hash — retire whole-tree `JSON.stringify`

```ts
function structuralHash<T>(idx: TreeIndex<T>, a: TreeAdapter<T>, fields: (n: T) => unknown[]): string;
```

**Replaces (A-16, D-010, PAT — signature):** `getEstimateTreeContentSignature` (`estimate-tree-reorder.ts:181-220`), which JSON.stringifies ~19 fields × every row on every reorder, called **5×** in `EstimateSheetTree.tsx` (`:300,301,411,418,440`) incl. initial render. **Phase 1 ships the structural-hash primitive** (contract §2 Phase 1, A-16); Phase 2 wires the 5 call sites onto it (and `createProposalPreviewSignature` `EstimateSheetContent.tsx:287-318` is retired in Phase 3 §7.4, RISK-03). The hash MUST cover the exact fields the consumers diff (signature: the ~19 reconcile fields; proposal: the 15 export fields — enumerate before swapping, RISK-03).

### 2.8 Single presentation kernel — `Tree`
- `Tree` (`ui/tree.tsx`) stays the only renderer; its `TreeNode` interface (`tree.tsx:30`) stays the render contract. Consumers map domain nodes → `TreeNode[]` via adapter + `flattenVisible`.
- `WorkshopTree` (`workshop-tree.tsx`) is **deleted** after Share moves onto `Tree` in read-only mode (A-17, PAT-08).
- `react-complex-tree` removed from `package.json` (D-004): replace its `TreeItemIndex` type with local `type TreeItemIndex = string` (`library-folder-reorder.ts:1,86`), drop the CSS import (`app/workshop/layout.tsx:15`); deletion confirmed by `ANALYZE=true bun run build` (Phase 7, Q-09).

---

## 3. Indexing strategy

- **One index per tree version, derived not stored.** `TreeIndex` is a **memoized selector layer** over the tree in the TanStack cache, NOT Zustand state (D-012, target arch §6.3, reconciled with R2). Recompute only when the tree structure/revision changes.
- **The keystroke decoupling (the central perf win, A-15/Q-05):** a cost-cell keystroke mutates `editableRows` (Phase 3 per-row store), **not** tree structure — so the index is reused untouched. This is what severs the per-keystroke whole-tree rebuild (`EstimateSheetTree.tsx:328-339`) and the ~15 fresh `findEstimateNode` DFS (R3 finding #2).
- **Build cost:** `buildTreeIndex` is a single DFS, O(n); paid once per structural change vs today's O(n) × (every keystroke + every handler call). Memoize on `[roots]` identity + the structural revision counter (the existing structure revision, A-12).
- **Shared instance across panels (D-012, Q-05):** the left `EstimateSheetTree` and the center `EstimateSheetContent` read the **same** `estimateQueryKeys.tree(...)` cache key (R4 overlap note; `EstimateWorkspaceClient.tsx:104-139`). Both consume **one** index instance from the selector layer — this is also what prevents the doubled totals DFS (Q-05; verify by measurement in Phase 0 before relying on it).

## 4. Flattening strategy

- `TreeIndex.flattenVisible(expanded)` is the single flatten path, replacing `flattenTree` (`tree.tsx:253`), `flattenVisibleNodes` (`estimate-tree-data.ts:373`, carries path), `flattenEstimateTree` (`build-proposal-export-model.ts:355`), and `flattenVisibleBranches` (`virtual-branch-list.tsx:44-72`).
- Returns `FlatRow<T>[]` carrying `depth` + `parentId` (path available via `idx.pathOf`), feeding both the `Tree` virtualizer and `EstimateSheetVirtualBranchList`.
- **Memoized on `[expandedSet, indexVersion]`** so collapse/expand re-flattens once, not per render (A-20 supporting hotspot). `findScrollParent` `getComputedStyle` DOM walks (`virtual-branch-list.tsx:34-42`, `row-table.tsx:130-138`) are cached per scroll container in Phase 3 (target arch §7.5), out of Phase 2 scope but enabled by the single flatten path.

## 5. Selection strategy (cascade + indeterminate)

- One engine: `toggleCascade` / `getSelectionState` / `dedupeRoots` (§2.5), generalizing `tree-selection.ts` over `TreeAdapter` (PAT-05).
- **Cascade:** toggling a folder selects/deselects its full `descendantsOf` set (O(1) lookup from the index, not a fresh DFS).
- **Indeterminate:** `getSelectionState` computes the indeterminate set once from `selected` + the index (a node is indeterminate iff some-but-not-all descendants are selected). `tree.tsx:628-642` consumes this instead of computing it inline.
- **Dedupe-to-roots:** `dedupeRoots` (from `tree-selection.ts:80-91`) serves both TemplatesTree `getChecked*` (`:479-596`) and any "collapse selection to top-most" caller.
- **Family-specific wiring preserved:** LibraryFolderTree's folder+component union (`:451-483`) stays as a thin consumer that calls `toggleCascade` on the folder domain and unions the component-id domain on top — the *union* is family logic; the *cascade* is kernel.
- **Local `bulkSelectedRowIds`** (`EstimateSheetContent.tsx:1099`) stays a local `Set` for now (Q-08e — merge into the Zustand store is a Phase 3/5 question, not Phase 2).

## 6. Expansion strategy (persistence)

- Expansion stays **controlled state owned by each consumer** (`expandedNodeIds`/`expandedItemIds`/`collapsedNodeIdsByScope`) — the kernel is stateless about expansion; it only consumes an `expanded: ReadonlySet<string>` in `flattenVisible`.
- **`Set<string>`, not `string[]`** (aligns with target arch §5.2): O(1) `has`/`toggle` vs today's O(n) array scans. The estimate sheet stores collapse-by-scope (`collapsedNodeIdsByScope`, `EstimateSheetContent.tsx:1098`) — kept; the kernel reads a derived `expandedSet`.
- **Expand-all / collapse-all:** `idx.allIds()` / `idx.folderIds()` replace `getAllNodeIds` (`helpers.ts:48`), `getTemplatesTreeAllNodeIds` (`TemplatesTree.tsx:440`), `collectEstimateFolderIds` (`EstimateSheetTree.tsx:238`), `collectAllNodeIds([selectedNode])` (`EstimateSheetContent.tsx:1442`). Search-forces-all-expanded (`LibraryTree.tsx:282`, `TemplatesTree.tsx:853`) becomes `idx.folderIds()` on the filtered index.

## 7. Drag/drop strategy (validation) — RISK-02

- One drop engine: `moveNode` (§2.3) + a generic `canDrop(idx, draggedId, target, rules)` validator. Replaces `evaluateEstimateTreeDrop` (`estimate-tree-reorder.ts:318-346`), the library `position!=="inside"` block (`LibraryTree.tsx:328-339`), LibraryFolderTree `canDrop`/`handleDrop` (`:542-770`), per-type `canDrag` (`TemplatesTree.tsx:900-919`), TemplateStructureTree `handleDropNode` (`:306`).
- **Validation rules are adapter/config params**, not forks: `allowInsideOnLeaves` (estimate), `inside`-only-nests (library folders), `position!=="inside"` blocked (library categories), external-drop-as-copy (templates/project-sources, estimate `treeExternalDrop` `EstimateSheetTree.tsx:649-680`), no-DnD (share, template-structure single-select).
- **No-cycle guard** is generic: reject any `target.id ∈ idx.descendantsOf(draggedId)` (was re-implemented per family via `isDescendantNode` `estimate-tree.ts:58`).
- **`sortOrder` persistence is the one true divergence (RISK-02, Q-08):** estimate `ESTIMATE_TREE_SORT_ORDER_STEP` vs library-folder sort. Resolve via a `SortOrderStrategy` adapter param. **Mitigation:** keep distinct reorder *adapters* over a shared *index* core; **golden-file the reorder planner output and byte-compare persisted `sortOrder` before/after on a fixture** before retiring either planner (RISK-02 validation). External drop of templates/project-sources into the estimate (`treeExternalDrop`) is the cross-family DnD path most likely to regress — convert it under the estimate family (LAST) with the existing `tree-external-drop.test.tsx` as the gate.

## 8. Virtualization strategy

- **Single presentation kernel `Tree`** is the convergence target (PAT-08, A-17). It already has TanStack virtualization, ARIA, roving focus, keyboard nav, intra/external DnD, root drop zones, cascade indeterminate.
- **Converge `WorkshopTree`→`Tree`:** Share (family 6, the only `WorkshopTree` consumer, `ShareEstimateTreeView.tsx:298`) moves onto `Tree` in a **read-only mode** (no DnD, no selection, no edit affordances). The 500-row cap (`reconstruct-share-tree.ts:29`) makes virtualization optional there, but it is **free** once on `Tree` (A-17 open Q / Q-02 — whether the cap is a hard product limit decides if virtualization becomes mandatory; does not block the render-converge).
- **Delete `react-complex-tree`** (D-004): type-alias + CSS only; replace + drop; confirm gone via bundle analyzer (Phase 7, Q-09).
- Lowering the conditional/high virtualization thresholds in the estimate sheet (≥80 sections + flag, `virtual-branch-list.tsx:93`; A-20) is **Phase 3**, not Phase 2 — Phase 2 only unifies the renderer + flatten path that Phase 3 then tunes.

## 9. Optimistic mutation strategy (feeding the Phase 5 adapter)

- The kernel ops are the **substrate** the Phase 5 optimistic adapter (`createOptimisticMutation`, target arch §8, D-005) builds on — Phase 2 makes the ops exist; Phase 5 wires the lifecycle.
- **`mapNode`** is the estimate-domain `apply`/`reconcile` implementation: `patchEstimateRowItemInTree` + `findEstimateRowItemInTree` + `toXxxRowPatch` (R2 candidate-kernel 4, `estimate-row-tree-patch.ts:65-91`) centralize on top of `mapNode` (target arch §8 final bullet).
- **`moveNode`/`removeNodes`** return immutable `next` trees suitable for the whole-tree snapshot rollback (`use-estimate-query.ts:167-184`) and revision-guarded restore (`:59-79`).
- **`structuralHash`** (§2.7) replaces the content signature the cache-reconciliation diff (`mergeEstimateTreeStructureWithCachedNodes`, `estimate-tree-reorder.ts:222-251`) depends on — it MUST detect the same changes the old signature did (A-16 unsafe-move; verify with the reorder/DnD + cache-freshness tests before swapping).
- **Boundary:** Phase 2 does NOT change rollback mechanisms or query keys — that is Phase 4 (keys) / Phase 5 (adapter). Phase 2 leaves the existing optimistic flows calling the *new* kernel ops with *unchanged* call signatures wherever possible (adapter-shim the old function names to the kernel) so the conversion is behavior-identical.

## 10. Test strategy

**Per-op unit tests (kernel, new — `tests/vitest/.../tree-kernel.test.ts`, "to be added in Phase 2"):**
- `buildTreeIndex`: byId/parentOf/depthOf/pathOf correctness; `find` O(1) equivalence vs each legacy finder (PAT-02 golden-equivalence).
- `descendantsOf`/`ancestorsOf`: golden-set equivalence vs each legacy collector (PAT-03).
- `filterKeepingAncestors`: equivalence vs `filterEstimateTreeNodes`+`filterEstimateTreeByStructure`+`filterTree`; hostile-input + perf (<1000ms) ported from `templates-tree-performance.test.ts:321` (PAT-04).
- `toggleCascade`/`getSelectionState`/`dedupeRoots`: equivalence vs `tree-selection.ts` engine (PAT-05).
- `moveNode`/`removeNodes`/`mapNode`: **golden-file** the reorder/delete planner output + byte-compare persisted `sortOrder` for both estimate and library fixtures (RISK-02, PAT-06).
- `rollup`: equivalence vs `summarizeEstimateTreeNode`, share `rollup`, chart `buildSpaceTableRows` (PAT-07).
- `structuralHash`: detects exactly the changes `getEstimateTreeContentSignature` did; covers the 19 reconcile fields and (Phase 3) 15 proposal fields (A-16, RISK-03).

**Reuse the existing family suites as conversion gates (R3 §1 tests):** `estimate-tree-reorder.test.ts` (385), `-edit.test.ts` (189), `-filter.test.tsx` (250), `-bulk-selection.test.tsx` (180), `-context-menu.test.tsx` (827), `estimate-sheet-tree-dnd.test.tsx`, `tree-external-drop.test.tsx`, `estimate-row-tree-patch.test.ts` (116); `library-folder-tree-selection.test.tsx` (181); `templates-tree-performance.test.ts` (321); `share/reconstruct-share-tree.test.ts` (331). Each family migration must keep its suite green (run `bun run test:dom`).

**Render-isolation gates (new, replicating the 4 jsdom perf gates in `tests/vitest/perf/`, R7/A-22):** a tree render-count probe (generalize `estimate-sheet-render-probe.ts`, target arch §11) asserting:
- tree expand/collapse re-flattens once (not per render);
- tree filter does **not** rebuild the index (keystroke → index reused, `findIndexBuilds === 0`);
- a sheet keystroke triggers **no** tree-side totals DFS (Q-05 guard).
These need the large-tree fixture (A-22, Phase 0/9) to bite — flag as "to be added."

**Validation commands (contract §4 vocabulary):** `bun run type-check`, `bun run test:dom`, `bun run validate` per migration step; `bun run test:e2e` (Playwright DnD) for RISK-02 families; `bun run storybook:validate` (a11y — the named Phase-2 gate per the V2 contract, asserting the `20_UX_UI_AND_INTERACTION_PLAN.md` tree a11y contract + `GATE-DND-AFFORDANCE`) **required after family-1 conversion** (step 2.7); `ANALYZE=true bun run build` to confirm `react-complex-tree` removal (Phase 7).

## 11. Migration sequence (lowest-risk first; sheet last)

Each step is **independently shippable behind existing behavior** (D-003) — convert one family, keep its test suite green, ship, then proceed. Do **not** start a higher-risk family until the kernel is proven on the lower-risk ones.

> **Perf-thesis caveat (don't oversell steps 2.1–2.6):** families 2–6 conversions deliver **code-dedup value but NO measurable keystroke hot-path win**. The headline perf payoff (A-15) lands only when family 1 (the estimate sheet tree) converts **LAST** (step 2.7). Do **not** claim perf wins from steps 2.1–2.6 — they de-risk and dedup; they do not move the per-keystroke metric.

| Step | Family | Why this order | Risk | Gate |
|---|---|---|---|---|
| **2.0** | **Build the kernel** (`tree-kernel.ts` + adapters), no consumers yet | Prove ops against golden-equivalence unit tests before any consumer depends on them | Low | new kernel unit tests (§10) |
| **2.1** | **Share (family 6)** — `WorkshopTree`→`Tree` read-only; share `rollup`→kernel `rollup` | **Lowest risk:** read-only, no mutations/DnD/selection to break; the renderer-converge is pure presentation; retires `WorkshopTree` early so the kernel-only invariant holds for everything after | Low-Med (RISK-04: public route — snapshot-compare) | `share/reconstruct-share-tree.test.ts`; Playwright `/share/[token]`; snapshot-compare rendered tree |
| **2.2** | **Template structure editor (family 5)** | Smallest interactive tree (325 LOC, small trees, already on `Tree`); proves cascade/move on a low-stakes editor | Low | template-editor tests |
| **2.2b** | **Adapter-shape de-risking probe — "adopt estimate FIRST" (D-014, AR3 finding 4)** — this is the *adapter-shape* probe, NOT the family-1 code migration (which is step 2.7, LAST). BEFORE 2.3 freezes the `SortOrderStrategy`/`moveNode` adapter shape, **and before any `moveNode` signature is written for any family**, resolve **Q-08** first (do the estimate + library reorder planners truly unify?): dry-run the estimate family's reorder rules (e.g. `ESTIMATE_TREE_SORT_ORDER_STEP`) against the proposed `moveNode`/`SortOrderStrategy` adapter signature — a paper exercise or throwaway adapter — to confirm BOTH the library and estimate families fit ONE core engine before committing. Probing Q-08 here (not after the signature exists) prevents the signature churning retroactively. Record the outcome in Q-08 / D-003 / D-014. If they don't fit one shape, the "one engine" claim must become "one engine + estimate special-case" explicitly, not silently. | Low (paper/throwaway) | recorded outcome in Q-08 / D-003 / D-014 |
| **2.3** | **Library folder tree (family 3)** | Collapses the duplicate reorder/delete planner (`buildLibraryFolderReorderPlan` vs estimate) onto `moveNode`/`removeNodes` — the prime PAT-06 merge; proves the `SortOrderStrategy` adapter param before the estimate sheet relies on it; replaces the `react-complex-tree` type alias | **Med-High** (RISK-02: distinct `sortOrder`) | golden-file reorder output; `library-folder-tree-selection.test.tsx`; Playwright DnD |
| **2.4** | **Library category tree (family 2)** | Proves the indexed filter + selection on derived-from-flat data; enables the A-18 taxonomy-shell caching (category→node map once) | Med | library tests; library render budget |
| **2.5** | **Templates / project-source (family 4)** | **Donate** its indexed `filterProjectSourcesByQuery` as the kernel filter model; convert its dedupe-to-roots onto `dedupeRoots` | Med | `templates-tree-performance.test.ts` (<1000ms preserved) |
| **2.6** | **Non-render aggregation/export (family 7)** | Dedup-only (mostly server/one-shot, low hot-path payoff per Q); convert opportunistically once `rollup` is proven; keeps proposal-export model unchanged until `structuralHash` proven equivalent (RISK-03) | Med | proposal-export snapshot parity; chart/snapshot equivalence |
| **2.7** | **Estimate sheet tree (family 1) — LAST** | **Highest blast radius** (A-15, A-16; RISK-01/RISK-02): every op, the keystroke hot path, the 5 signature call sites, external-drop, the doubled-totals seam (Q-05). Convert only after the kernel is battle-proven on 2.1–2.6. Preserve the load-bearing memo guards (`branch.tsx:111-156`, `row-table.tsx:86-116`) and the `displayedSheetNode === selectedNode` identity short-circuit (contract §1, target arch §0). Wire `structuralHash` into the 5 call sites (`EstimateSheetTree.tsx:300,301,411,418,440`); index replaces the per-keystroke rebuild + ~15 finds | **High** | full estimate tree suite (385/189/250/180/827 + dnd + external-drop + row-patch); reorder golden-file + `sortOrder` byte-compare; render-count probe (`findIndexBuilds===0` per keystroke); `bun run validate`; `bun run storybook:validate` (a11y + `GATE-DND-AFFORDANCE`, per doc 20) |
| **2.8** | **Cleanup** | Remove `WorkshopTree`, drop `react-complex-tree` from `package.json` + CSS import; confirm via `ANALYZE=true bun run build` (Phase 7 seam, Q-09). **SEV-4 ordering (cross-ref doc 13):** FIRST replace the `react-complex-tree/lib/style-modern.css` import (`app/workshop/layout.tsx:15`) and the `TreeItemIndex` type alias (`library-folder-reorder.ts:1,86`, → local `type TreeItemIndex = string`); THEN gate the dep deletion on **(a)** analyzer proof the dep is absent (Q-10/Q-09) **AND (b)** a visual-regression pass (`bun run storybook:validate` / pixel-diff) confirming the kept `Tree` / `LibraryFolderTree` render **pixel-identically** with the shared CSS gone (low-likelihood but easy-to-miss visual break on an authed surface) | Low | bundle analyzer; `bun run storybook:validate` (CSS-removal pixel-diff); full `validate` |

**Constraints preserved throughout (contract §1, target arch §0):**
- The estimate-sheet memo guards and identity short-circuits are **never** weakened — Phase 2 reduces *compute*, not these render guards (RISK-01).
- `getEstimateTreeContentSignature` → `structuralHash` swap (D-010, A-16) must keep `mergeEstimateTreeStructureWithCachedNodes` detecting the same changes (verify before swap).
- Reorder `sortOrder` persistence is byte-compared before retiring any planner (RISK-02).
- Each family ships independently; any step is revertible to the prior family's behavior because the kernel sits behind unchanged call signatures (adapter-shim) until the family's gate is green.

### 11.1 Two-tier Phase-2 exit criteria (D-014)

Phase 2 has **two distinct "done" states**; they must not be conflated:

- **Tier 1 — "code-dedup green":** families 2–6 converged onto the kernel, the dead `WorkshopTree` removed, `react-complex-tree` dropped from `package.json` (steps 2.1–2.6 + 2.8). This is a duplication/maintainability win only.
- **Tier 2 — "perf-win green":** the A-15 per-keystroke decoupling lands — which happens **only when family 1 (estimate sheet tree) converts** (step 2.7) and the render-count probe shows `findIndexBuilds === 0` per keystroke and no tree-side totals DFS on a sheet keystroke (Q-05).

**Gate rule:** the render-regression gate / perf metric MUST NOT be marked passed on Tier 1 (dedup) wins alone. Tier 1 green with Tier 2 still open means the headline perf thesis is **unproven** — report it as such (reinforces the perf-thesis caveat above; D-014).

---

## 12. Cross-references

- **Findings:** A-14 (7 families), A-15 (per-keystroke rebuild), A-16 (JSON.stringify signature), A-17 (two kernels + dead dep), A-18 (library re-synthesis), A-19→Phase 3 (proposal signature), A-20→Phase 3 (virtualization), A-21→Phase 3 (resync).
- **Patterns:** PAT-01 (index), PAT-02 (find), PAT-03 (descendants), PAT-04 (ancestor/filter), PAT-05 (cascade), PAT-06 (reorder/delete), PAT-07 (rollup), PAT-08 (kernels + dep).
- **Decisions:** D-003 (headless TreeIndex + single kernel), D-004 (delete react-complex-tree), D-010 (structural hashes), D-012 (shared index across sheet + left tree).
- **Risks:** RISK-01 (sheet regression), RISK-02 (DnD/reorder), RISK-03 (proposal export), RISK-04 (share).
- **Open questions:** Q-02 (500-row cap), Q-05 (doubled totals DFS), Q-08 (planners unify), Q-08d (vestigial `kind`), Q-09 (bundle confirm).
- **Target architecture:** §6 (canonical tree kernel), §6.1 (TreeIndex + ops), §6.2 (single presentation kernel), §6.3 (derived not store), §6.4 (adoption order).
- **Companion plan docs:**
  - `20_UX_UI_AND_INTERACTION_PLAN.md` — the tree **a11y contract** (roving focus, Escape-to-cancel-DnD, ARIA preservation) that all 7 families inherit when they converge onto the unified `Tree`, and the DnD **visual-affordance gate** `GATE-DND-AFFORDANCE` (drop indicators / drag preview / invalid-target affordance must be preserved on convergence).
  - `21_BLAST_RADIUS_MATRIX.md` — pinned blast radius for `ui/tree.tsx` (**9 importers**) and `EstimateSheetTree` (family-1 conversion, step 2.7).
  - `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` — the **seam-file lock protocol** for the shared kernel/seam files (RISK-22: concurrent multi-agent edits colliding on the seam cluster).
- **Downstream phases:** Phase 1 (structural-hash primitive, A-16), Phase 3 (sheet decomposition consumes the index, incremental totals, virtualization tuning), Phase 5 (optimistic adapter consumes `mapNode`/`moveNode`), Phase 7 (`react-complex-tree` removal confirmed by analyzer).
