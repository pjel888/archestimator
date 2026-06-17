# Archestimator React/Next.js Performance Engineering Bible — Repo-Tailored Update

**Date:** 2026-06-17  
**Repository assumed:** `pjel888/archestimator` on `main`  
**Target stack:** Next.js 16.2.6, React 19.2.6, TypeScript 6, Bun, Supabase/Postgres 17, TanStack Query 5, Zustand 5, TanStack Virtual 3, Tailwind CSS v4  
**Purpose:** This is the refactor backbone for turning Archestimator into a fast, predictable, measurable, high-performance React/Next.js application. It is not generic React advice. It is written against the actual shapes already present in the repo: estimate trees, sheet rows, component libraries, templates, right sidebars, route overlays, optimistic mutations, RLS-backed Supabase data, and design-system constraints.

---

## 0. Executive Standard

Archestimator already has the right raw materials: App Router/RSC, server-actions-first writes, TanStack Query, Zustand for high-frequency UI, Supabase RLS, custom validation scripts, route performance scripts, a shared UI tree, and centralized virtualization flags. The performance risk is not that the stack is weak. The risk is that repeated shapes are still implemented differently across the app, causing duplicated tree logic, repeated data shaping, oversized client files, broad render fan-out, and full-tree/full-route refreshes where scoped reconciliation would be faster.

The repo-wide rule is:

> **Normalize once, index once, project once, render only the visible subset, mutate optimistically, reconcile with authoritative server deltas, and measure every phase.**

For Archestimator, this rule applies to trees, estimate sheets, component libraries, templates, charts, command palettes, sidebar panels, project lists, collaboration cursors, and Supabase repositories. The flagship example is the tree, but the same architectural pattern should become the law for every repeated data shape in the product.

---

## 1. Current Repo Diagnosis

### 1.1 Foundations that should be preserved

These are not refactor targets. They are assets to standardize around.

| Existing foundation | Repo evidence | Standard to preserve |
|---|---|---|
| **Next 16 + React 19 App Router stack** | `package.json`, `README.md` | Keep RSC/server actions as the default route architecture. Do not regress into SPA-style client fetching for server-owned data. |
| **TanStack Query + Zustand split** | `src/app/providers.tsx`, `src/hooks/use-estimate-query.ts`, `src/hooks/use-estimate-workspace-state.ts` | TanStack Query owns server state. Zustand owns high-frequency UI state only. Local component state owns ephemeral editing state. Refs own non-rendering transient state. |
| **Shared virtualized tree primitive** | `src/components/ui/tree.tsx` | This is the canonical tree renderer. New trees should use this primitive, not bespoke recursive UI or `react-complex-tree`. |
| **Centralized virtualization flags** | `src/lib/workshop/virtualization-flags.ts` | Treat thresholds as product-level budgets: tree min rows, estimate row min rows, overscan, row heights. Do not scatter thresholds. |
| **Request-scoped server memoization** | `src/lib/repositories/workspace-repository.ts` uses `cache()` for workspace bootstrapping | Keep request deduping for repeated server repository reads. Next 16 Cache Components should be layered in carefully, not blindly enabled across auth code. |
| **Design-system gates** | `README.md`, `DESIGN.md`, custom linters | Performance refactors must preserve the 12px app UI, shared primitives, SF Pro discipline, neutral palette, small-radius system, and no one-off controls. |
| **Existing performance scripts** | `perf:measure-routes`, `perf:check-routes`, `perf:profile-peak-load`, `test:e2e:perf` | Turn these into CI budgets, not optional diagnostics. |

### 1.2 Main performance risks found in the repo

These are the highest-leverage refactor areas.

| Risk | Why it matters | Primary paths |
|---|---|---|
| **Tree data has multiple representations without one official kernel** | The repo has flat domain trees, nested UI trees, flattened visible trees, and project/template source trees. Without a single kernel, every feature reinvents traversal, search, expansion, DnD, and totals. | `src/lib/domain/estimate-tree.ts`, `src/lib/estimates/types.ts`, `src/components/ui/tree.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, template/project-source tree code |
| **Hot client files are doing too much orchestration** | Large client modules increase parse/evaluate cost and make render fan-out hard to control. Splitting by “model → commands → view” lets React render less and lets tests pin the hot logic. | `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/EstimateSheetContent.tsx` |
| **Full-tree refetch/rebuild after scalar mutations** | The browser repository often returns a whole tree after insert/update/delete. That is simple but expensive as sheets grow. Fast apps reconcile scoped deltas and invalidate narrowly. | `src/lib/repositories/estimate-repository.ts`, row mutation hooks, estimate query hooks |
| **Recursive totals and searches can silently become O(n²)** | A tree with thousands of rows feels fine until a render path calls `.find()` inside loops or recomputes every branch total for every branch. | `src/lib/domain/estimate-tree.ts`, `editable-row-model.ts`, sheet/tree filters/search |
| **Barrel/re-export imports inside hot client modules** | Route/client entry files should not import helper barrels or re-export helper surfaces. It increases module graph size and makes dead-code elimination harder. | `EstimateSheetContent.tsx` helper import/re-export surface |
| **Overlay and route refresh patterns can hide real performance** | The repo already fixed some overlay behavior, but the law should be explicit: loading states must be content-driven and skeleton-shaped, not global blur-first. | `navigation-ui-store.ts`, `NavigationListener`, route performance specs |
| **React Compiler/Next Cache Components are not yet enabled** | These are powerful in Next 16/React 19, but they need gated adoption because auth, cookies/headers, and mutable workshop routes can be harmed by careless caching. | `next.config.ts` |

---

## 2. The Archestimator Pattern Law

Every repeated frontend shape must have exactly one canonical implementation. A feature is allowed to customize presentation, not reinvent the data kernel.

### Law 1 — Server state, UI state, and transient state must not mix

**Canonical ownership:**

| State type | Owner | Examples in Archestimator | Rule |
|---|---|---|---|
| Durable business truth | Supabase/Postgres + RLS + server actions/RPCs | estimates, nodes, rows, project permissions, publications, component library | Client never becomes the source of truth. |
| Server snapshot/cache | TanStack Query | estimate tree, tabs, component library datasets, project lists | Query keys must include scope. Mutations update cache optimistically then reconcile. |
| High-frequency UI state | Zustand with atomic selectors | selected node, expanded node IDs, focused cell, route overlay, drag state | Never subscribe to a whole store in a hot component. Use selectors/equality. |
| Local edit state | Component/hook-local state | active cell draft, menu open state, temporary search text | Keep close to the UI. Commit intentionally. |
| Non-rendering event/transient state | `useRef` or external event store | drag payload, pointer position, cursor throttling, pending timers | Do not use React state for values that do not need render. |

**Bad pattern:** one client component owns server data, filter state, expanded state, mutation orchestration, route sync, row editing, totals, menu state, and drag state.

**Good pattern:** a route server component loads authoritative data, a query hook owns server snapshots, a model hook derives indexes/projections, a command hook owns mutations, and a thin view renders primitives.

### Law 2 — Do not store derived data unless it is an indexed cache

React’s own guidance is clear: if data can be calculated from props or state, don’t put it in state; calculate during render or memoize an expensive pure calculation. In Archestimator terms:

- `selectedNodeId` is state.
- `selectedNode` is derived.
- `nodeById` is an indexed cache derived from server data.
- `visibleTreeRows` is a projection derived from `treeIndex + expandedSet + filter`.
- `nodeTotalsById` is a pure computed map derived from rows and nodes.

State should answer “what did the user choose?” or “what is externally true?” It should not duplicate a filtered list, selected object, full path, or total unless the value is an explicit indexed cache with a clear invalidation key.

### Law 3 — Every large shape follows normalize → index → project → virtualize

This is the general version of the tree example.

| Shape | Normalize | Index | Project | Virtualize/render |
|---|---|---|---|---|
| Estimate tree | flat `nodes[]`, `rows[]` | `nodeById`, `childrenByParentId`, `rowsByNodeId`, `parentById` | nested UI tree, visible flat rows, breadcrumb path, totals | `src/components/ui/tree.tsx`, branch row virtualizer |
| Estimate sheet rows | flat editable rows | `rowById`, `rowIdsByNodeId`, `nodeTotalsById` | visible branches, row cards, subtotal summaries | row/branch virtualization |
| Component library | flat items + folders + taxonomy | `itemById`, `childrenByFolderId`, `itemsByFolderId`, search index | sidebar tree, manager table, command palette result set | virtual list/tree |
| Templates/project source | flat projects/estimates/tabs/areas/rows | descendant/ancestor indexes | filtered hierarchy with ancestor closure | shared tree/list primitives |
| Project lists | flat row DTOs | `rowById`, favorite/shared indexes | visible sorted rows/cards | table/list virtualization only when volume needs it |
| Charts | normalized aggregates | keyed aggregate maps | chart series | lazy chart island, not full app re-render |

If a new feature cannot name its normalize/index/project/render layers, it is not ready to merge.

---

## 3. Canonical Tree Architecture

The tree pattern is the backbone because Archestimator is a hierarchy-heavy product. The existing custom `Tree` is already close to the right solution: it receives nested `TreeNode[]`, flattens only expanded visible nodes, and uses TanStack Virtual when row count crosses a threshold.

### 3.1 The canonical tree kernel

Create or formalize a shared tree kernel under a stable path such as:

```txt
src/lib/tree/tree-index.ts
src/lib/tree/tree-projection.ts
src/lib/tree/tree-search.ts
src/lib/tree/tree-mutation.ts
```

Minimum API:

```ts
export type TreeEntity = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type TreeIndex<TNode extends TreeEntity, TRow extends { id: string; nodeId: string }> = {
  roots: string[];
  nodeById: Map<string, TNode>;
  parentIdById: Map<string, string | null>;
  childrenByParentId: Map<string | null, string[]>;
  rowsByNodeId: Map<string, TRow[]>;
};

export function buildTreeIndex<TNode extends TreeEntity, TRow extends { id: string; nodeId: string }>(
  nodes: readonly TNode[],
  rows: readonly TRow[],
): TreeIndex<TNode, TRow> {
  const nodeById = new Map<string, TNode>();
  const parentIdById = new Map<string, string | null>();
  const childrenByParentId = new Map<string | null, string[]>();
  const rowsByNodeId = new Map<string, TRow[]>();

  for (const node of nodes) {
    nodeById.set(node.id, node);
    parentIdById.set(node.id, node.parentId);
    const siblings = childrenByParentId.get(node.parentId) ?? [];
    siblings.push(node.id);
    childrenByParentId.set(node.parentId, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((leftId, rightId) => {
      const left = nodeById.get(leftId);
      const right = nodeById.get(rightId);
      return (left?.sortOrder ?? 0) - (right?.sortOrder ?? 0);
    });
  }

  for (const row of rows) {
    const nodeRows = rowsByNodeId.get(row.nodeId) ?? [];
    nodeRows.push(row);
    rowsByNodeId.set(row.nodeId, nodeRows);
  }

  for (const nodeRows of rowsByNodeId.values()) {
    nodeRows.sort((left, right) => {
      const a = "sortOrder" in left ? Number(left.sortOrder) : 0;
      const b = "sortOrder" in right ? Number(right.sortOrder) : 0;
      return a - b;
    });
  }

  return {
    roots: childrenByParentId.get(null) ?? [],
    nodeById,
    parentIdById,
    childrenByParentId,
    rowsByNodeId,
  };
}
```

Why this matters in this repo: `src/lib/domain/estimate-tree.ts` currently exposes helpers such as `getNodeById(tree, nodeId)` implemented with array search. That is fine for isolated calls, but any descendant/path/search loop that calls `.find()` repeatedly can become O(n²). The official pattern must be: build `TreeIndex` once per tree revision, then all traversal uses maps.

### 3.2 Source of truth: flat adjacency, not nested mutation

Archestimator should keep flat `nodes[]` and `rows[]` as the domain truth. Nested trees are view projections.

**Do:**

```ts
const index = useMemo(
  () => buildEstimateTreeIndex(tree.nodes, tree.rows),
  [treeRevision],
);

const uiTree = useMemo(
  () => projectEstimateTreeForSidebar(index, selectedNodeId, searchQuery),
  [index, selectedNodeId, searchQuery],
);
```

**Do not:** recursively mutate nested UI trees and then reverse-engineer flat rows from them.

### 3.3 Rendering law: one tree renderer

All new tree UIs must use:

```txt
src/components/ui/tree.tsx
```

That component already owns:

- visible flattening,
- row memoization,
- expansion state inputs,
- drag/drop affordances,
- indentation and rails,
- virtualized rendering through `@tanstack/react-virtual`,
- fallback non-virtual rendering below threshold.

**New feature law:** if it looks like a tree, it uses `Tree`. If it cannot use `Tree`, first improve `Tree` or add a formal adapter. Do not introduce another tree component.

### 3.4 Tree variants are projections, not new trees

| Tree variant | What changes | What must stay shared |
|---|---|---|
| Estimate sidebar tree | labels, active row, add/context actions, mixed-content accent | index, projection, expansion, search ancestor closure, virtualization |
| Template/project-source tree | extra levels: project → estimate → tab → area → row | index, search, visible flattening, bulk selection, virtualization |
| Component library folder tree | folder/item node kinds | tree renderer, expansion, selection, drag/drop contracts |
| Publication/share tree | read-only projection and access scope | index, totals, flattening |
| Breadcrumb/path tree | projection to path only | index/path lookup |

### 3.5 Tree search law: filter by ancestor closure

Search must not recursively rebuild a nested tree by scanning every branch repeatedly. The standard is:

1. Lowercase query once.
2. Match directly against flat indexed records.
3. Build `visibleIds = directMatches + allAncestors(directMatches) + optionally descendants(directMatches)`.
4. Project only visible nodes.

This is the same optimization that was already applied to the Templates project-source panel. Generalize it.

```ts
export function buildVisibleIdSetFromSearch(
  index: Pick<TreeIndex<TreeEntity, never>, "parentIdById">,
  matchedIds: Iterable<string>,
) {
  const visible = new Set<string>();
  for (const id of matchedIds) {
    let current: string | null | undefined = id;
    while (current) {
      if (visible.has(current)) break;
      visible.add(current);
      current = index.parentIdById.get(current) ?? null;
    }
  }
  return visible;
}
```

### 3.6 Tree mutation law: validate in domain, render in UI

Drag/drop and reorder behavior must be split into:

- pure domain validation: self-drop, descendant cycle, cross-tab, orphan, missing parent, permission scope;
- pure mutation calculation: next parent, next sort order, affected siblings;
- server/RPC action: authoritative write;
- query cache reconciliation;
- UI feedback.

The UI component should not know business rules beyond disabled affordances. This preserves the P5/P6 estimate-node unification invariant: “Area” is the user-facing node type; rows can live on any node; cycles and cross-tab drops remain illegal.

### 3.7 Tree performance budgets

| Budget | Target |
|---|---:|
| Tree virtualization threshold | Keep current default: virtualize at `>= 150` visible rows unless measured otherwise. |
| Visible tree row render count | `<= viewportRows + overscan * 2 + constant chrome`. |
| Flatten visible nodes | `< 4ms` for 5k expanded nodes on development laptop; `< 12ms` on throttled CPU. |
| Search projection | `< 16ms` for 10k nodes/rows; must not block input; use `useDeferredValue` for search text. |
| Expansion/collapse interaction | No full route refresh. No full sheet re-render. |
| DnD hover | No React state update per pointer move unless it affects visible affordance. |

### 3.8 Tree refactor target: `EstimateSheetTree.tsx`

`EstimateSheetTree.tsx` should be refactored without changing behavior into:

```txt
src/components/workshop/estimate-tree/
  EstimateTreePanel.tsx              # thin view composition
  EstimateTreeRows.tsx               # Tree adapter/renderRow only
  use-estimate-tree-model.ts         # index + projections + search + folder IDs
  use-estimate-tree-commands.ts      # create, rename, delete, move, select
  use-estimate-tree-bulk.ts          # bulk selection and descendant row IDs
  estimate-tree-url-sync.ts          # replaceState/router boundary
  estimate-tree-model.test.ts        # pure tests
```

The goal is not smaller files for aesthetics. The goal is to isolate pure projections from UI/event orchestration so tree operations become testable, cached, and render-stable.

---

## 4. Estimate Sheet/Grid Architecture

The estimate sheet is the highest-value hot path because it combines hierarchy, row editing, totals, sidebar interactions, image previews, collaboration, and export semantics.

### 4.1 Official sheet model pipeline

Every sheet render should follow this shape:

```txt
server DTO / query cache
  → normalized tree index
  → editable row model
  → totals map
  → visible branch projection
  → virtual branch/row rendering
```

`editable-row-model.ts` already contains the right direction: pure functions for editable rows, row totals, node totals, materialization, and flattening. The standard is to make these functions the only place for sheet math and projection.

### 4.2 Totals law: one DFS per revision

Avoid repeated `computeNodeTotal(node)` calls during render. That pattern is easy to read but dangerous because every parent total recursively walks children again. The canonical pattern is:

```ts
const nodeTotalsById = useMemo(
  () => computeNodeTotals(estimateTree),
  [treeRevision],
);

const selectedNodeTotal = nodeTotalsById.get(selectedNodeId) ?? 0;
```

Every component reads from `nodeTotalsById`. No row component recomputes ancestor totals.

### 4.3 Row editing law: keystrokes must be local

A cell keystroke must not update the entire sheet tree. For hot row inputs:

- keep draft text in the input or row-local state;
- compute row preview locally;
- commit on blur, Enter, or controlled debounce depending on product behavior;
- perform optimistic query patch on commit;
- reconcile server result;
- update totals from one shared revision bump.

**Bad:** `onChange` updates global tree data, which recalculates every branch and rerenders the sidebar, totals, command palette, and right dock.

**Good:** `onChange` changes only the input/row. Commit changes the canonical cache.

### 4.4 Virtual branch list law

`virtual-branch-list.tsx` is a good pattern: flatten visible branches, virtualize when the count is high, fallback to normal rendering when low. Keep this model but make the flattening function index-aware and revision-keyed.

Performance targets:

| Interaction | Target |
|---|---:|
| Typing in visible row cell | Input remains responsive; visible committed update under one frame when possible. |
| Expanding/collapsing an area | Recompute visible branch list once. |
| Adding a row | Optimistic row visible immediately; no full route overlay. |
| Moving a row | Update only source/target branches and totals; no complete tree refetch unless server rejects. |
| Bulk insertion | Batch cache changes; one render transaction. |

### 4.5 Sidebar/dock law

The right sidebar must not be resident-heavy by default. Panels such as Components, Templates, AI, Proposal, and Attachments should be loaded only when opened or when a route intentionally prefetches them. The estimate page already intentionally lazy-loads the component-library dataset instead of gating first paint. Make this a formal product rule.

```txt
First paint must not wait for:
- full component library dataset
- D3 chart modules
- ExcelJS/proposal export code
- Three.js/visual effects
- AI package builder modules
- inactive right-dock panels
```

---

## 5. Data Fetching, Server Actions, and Cache Architecture

### 5.1 Server-first loading

Next App Router pages/layouts are Server Components by default. Use that. Fetch route-critical data on the server close to Supabase, shape it into narrow DTOs, then pass only the interactive subset to Client Components.

Use Client Components only for:

- event handlers,
- local state,
- browser APIs,
- drag/drop,
- realtime subscriptions,
- optimistic UI,
- virtualized rendering when the browser viewport is required.

### 5.2 Query key law

All TanStack Query keys must express scope explicitly.

```ts
export const estimateQueryKeys = {
  detail: (estimateId: string) => ["estimate", estimateId] as const,
  tabs: (estimateId: string) => ["estimate", estimateId, "tabs"] as const,
  tabTree: (estimateId: string, tabId: string) => ["estimate", estimateId, "tab", tabId, "tree"] as const,
  areaTree: (estimateId: string, nodeId: string) => ["estimate", estimateId, "area", nodeId, "tree"] as const,
};
```

This is already close to the current hook design. The next step is to unify duplicate tab/area tree hooks behind one scoped query factory.

Recommended shape:

```ts
type EstimateTreeScope =
  | { kind: "tab"; estimateId: string; tabId: string }
  | { kind: "area"; estimateId: string; nodeId: string };

export function estimateTreeQueryKey(scope: EstimateTreeScope) {
  return scope.kind === "tab"
    ? ["estimate", scope.estimateId, "tab", scope.tabId, "tree"] as const
    : ["estimate", scope.estimateId, "area", scope.nodeId, "tree"] as const;
}
```

### 5.3 Mutation protocol law

All optimistic mutations should follow the same state machine:

```txt
1. validate client-side preconditions
2. cancel scoped query
3. snapshot previous query data
4. optimistic patch
5. run server action/RPC
6. reconcile returned authoritative delta/DTO
7. on error, rollback snapshot only if revision guard still matches
8. invalidate/refetch only the scoped query/tag that can be stale
```

TanStack Query’s documented optimistic update model uses this exact shape: cancel outgoing refetches, snapshot previous value, `setQueryData`, rollback on error, invalidate on settle. Archestimator already has versions of this in `use-estimate-query.ts`; make it the universal mutation adapter.

A reusable helper can look like:

```ts
type OptimisticPatch<TData, TResult> = {
  queryKey: readonly unknown[];
  apply: (current: TData | undefined) => TData;
  commit: () => Promise<TResult>;
  reconcile: (current: TData | undefined, result: TResult) => TData;
};

export async function runOptimisticMutation<TData, TResult>(
  queryClient: QueryClient,
  patch: OptimisticPatch<TData, TResult>,
) {
  await queryClient.cancelQueries({ queryKey: patch.queryKey });
  const previous = queryClient.getQueryData<TData>(patch.queryKey);
  queryClient.setQueryData<TData>(patch.queryKey, patch.apply);

  try {
    const result = await patch.commit();
    queryClient.setQueryData<TData>(patch.queryKey, (current) => patch.reconcile(current, result));
    return result;
  } catch (error) {
    queryClient.setQueryData(patch.queryKey, previous);
    throw error;
  }
}
```

### 5.4 Stop full-tree refetches after scalar changes

`estimate-repository.ts` currently uses full `getEstimateTree()` after several writes. That is safe but not scalable. For large estimates, scalar edits should return scoped results:

| Mutation | Current simple model | Better authoritative return |
|---|---|---|
| Rename node | full tree | `{ node, updatedAt, revision }` |
| Update row quantity/cost/text | full tree | `{ row, affectedNodeIds, revision }` |
| Insert row | full tree | `{ row, siblingOrderPatch?, affectedNodeIds, revision }` |
| Delete row | full tree | `{ deletedRowId, affectedNodeIds, revision }` |
| Move row | full tree | `{ movedRow, sourceNodeId, targetNodeId, siblingOrderPatch, revision }` |
| Move node | full tree or RPC result | `{ movedNode, affectedParentIds, orderPatch, revision }` |

Full tree refetch remains acceptable after rare structural operations or after a conflict. It should not be the default for every row edit.

### 5.5 Server action return DTOs

Server actions should return UI-ready DTOs, not raw table records and not oversized `Tables<...>` rows when the client needs five fields.

Rules:

- Explicit `select` columns only.
- No `select("*")` in hot paths.
- Return scalar projections for list edits.
- Return row/node deltas for tree edits.
- Return version/revision stamps so optimistic cache can detect stale commits.
- Keep permission checks and RLS authoritative on the server/database.

---

## 6. Next.js 16 Cache Components Rollout

Next.js 16’s Cache Components model is powerful but opt-in. This repo should adopt it slowly because workshop routes are user-specific, auth-specific, and mutation-heavy.

### 6.1 Current config status

`next.config.ts` already uses:

```ts
experimental: {
  optimizePackageImports: ["@phosphor-icons/react"],
  staleTimes: {
    dynamic: 60,
    static: 180,
  },
}
```

It does not currently enable:

```ts
cacheComponents: true,
reactCompiler: true,
```

Both should be gated rollouts, not a drive-by config change.

### 6.2 Cache Components rule

Use Cache Components for deterministic, low-mutation, shareable, or scoped-but-argument-driven data. Do not put `cookies()` or `headers()` inside a cached scope. Read runtime request values outside, then pass serializable arguments into cached functions.

**Correct extraction pattern:**

```tsx
import { cacheTag, cacheLife } from "next/cache";

export default async function Page() {
  const context = await requireCurrentUserContext();
  return <CachedWorkshopTaxonomy workspaceId={context.workspaceId} />;
}

async function CachedWorkshopTaxonomy({ workspaceId }: { workspaceId: string }) {
  "use cache";
  cacheTag(`workspace:${workspaceId}:taxonomy`);
  cacheLife("minutes");

  const taxonomy = await readWorkspaceTaxonomy(workspaceId);
  return <TaxonomyPanel initialTaxonomy={taxonomy} />;
}
```

**Wrong:**

```tsx
async function CachedThing() {
  "use cache";
  const user = await requireCurrentUserContext(); // reads cookies/headers internally
  return getUserScopedData(user.id);
}
```

### 6.3 Rollout order

| Phase | Scope | Why |
|---|---|---|
| C0 | Landing/about/features/pricing/contact static shells | Low auth risk, easy to measure LCP/JS. |
| C1 | Public share chrome and immutable publication snapshots | Snapshot semantics are cache-friendly if token/security boundaries are explicit. |
| C2 | Workspace taxonomy/component categories that change rarely | Big repeated read value, low mutation frequency. |
| C3 | Component library folder/taxonomy summaries per workspace | Needs `cacheTag` + server-action invalidation. |
| C4 | Workshop estimate editor | Last. Highly interactive and mutation-heavy. Use mostly query-level cache and scoped invalidation. |

### 6.4 Revalidation standard

Use namespaced tags:

```ts
cacheTag(`workspace:${workspaceId}:component-taxonomy`);
cacheTag(`project:${projectId}:estimates`);
cacheTag(`estimate:${estimateId}:tabs`);
cacheTag(`estimate:${estimateId}:tree`);
cacheTag(`publication:${publicationId}:snapshot`);
```

Mutation actions should call:

- `updateTag(tag)` when the user needs read-your-writes immediately;
- `revalidateTag(tag, "max")` when stale-while-revalidate is acceptable;
- `refresh()` when uncached data must update on the current route.

### 6.5 Suspense law

When Cache Components is enabled, uncached async work must sit behind Suspense or inside a cached scope. For this repo, that means:

- every large right-dock panel gets its own Suspense boundary;
- every slow server panel has a skeleton shaped like the final UI;
- global blur overlays are not substitutes for route-level/content-level skeletons;
- skeletons should be table/tree/card-shaped, not generic spinners.

---

## 7. React 19 / React Compiler Rollout

React Compiler can reduce manual `memo`, `useMemo`, and `useCallback` usage, but it cannot fix bad data shape, oversized client bundles, too-broad state subscriptions, RLS scans, or rendering thousands of DOM nodes. It is a multiplier after architecture is clean, not a replacement for architecture.

### 7.1 Enable only after purity cleanup

Before turning on `reactCompiler: true`, audit hot client components for:

- mutation during render;
- non-deterministic render values (`Date.now()`, random IDs, mutable globals);
- unnecessary effects that derive state from state;
- object/array creation that crosses memoized third-party boundaries;
- ref/event code called during render;
- components depending on stale closures.

`use-stable-callback.ts` is a good local pattern: stable event identity with latest closure. Keep it for event handlers invoked after commit.

### 7.2 Manual memo law after compiler

Do not delete every memo. Keep manual memoization when:

- a third-party library relies on referential stability;
- a virtualized row renderer must preserve row identity;
- custom equality avoids expensive tree row rerendering;
- a pure computation is known expensive and not compiler-covered;
- the code sits in a compiler bailout zone.

But stop adding `useMemo`/`useCallback` by reflex. Memoization should exist because a profile or third-party boundary needs it.

### 7.3 React concurrency law

Use `useDeferredValue` and transitions where UI responsiveness matters more than immediate heavy recomputation.

Best Archestimator uses:

| Use case | Tool | Rule |
|---|---|---|
| Search input filtering a large tree/list | `useDeferredValue(query)` | Keep input instant; let results lag. Still avoid extra network requests separately. |
| Switching heavy local tabs | `startTransition` / `useTransition` | Make the tab state non-blocking if it triggers a heavy panel. |
| Bulk insert / large local projection | transition + batched cache write | One transaction, no repeated renders. |
| Route navigation | Next router/prefetch/Suspense | Do not fake speed with global overlay. |

### 7.4 Effects law

Effects are for synchronizing with external systems: browser APIs, subscriptions, timers, third-party widgets, realtime channels. Effects are not for deriving data.

Bad:

```tsx
useEffect(() => {
  setVisibleRows(filterRows(rows, query));
}, [rows, query]);
```

Good:

```tsx
const deferredQuery = useDeferredValue(query);
const visibleRows = useMemo(
  () => filterRows(index, deferredQuery),
  [index, deferredQuery],
);
```

In Archestimator, this matters for tree filtering, component-library filtering, totals, path derivation, and selected object lookup.

---

## 8. Zustand and UI State Standards

### 8.1 Selector law

Hot components must subscribe to the smallest possible store slice.

Good:

```ts
const selectedNodeId = useEstimateWorkspaceState(
  (state) => state.selectedNodeIdByEstimateId[estimateId] ?? null,
);
```

Bad:

```ts
const state = useEstimateWorkspaceState();
```

If a selector returns an object or array, use shallow equality or split into atomic selectors.

### 8.2 Equality guard law

The newer `use-estimate-workspace-state.ts` pattern is better than naive setters because it avoids returning a new state object when values are equal.

Use this style:

```ts
setExpandedNodeIds: (estimateId, tabId, nextIds) =>
  set((state) => {
    const previous = state.expandedNodeIdsByScope[scopeKey(estimateId, tabId)] ?? [];
    if (areNodeIdsEqual(previous, nextIds)) return state;
    return {
      expandedNodeIdsByScope: {
        ...state.expandedNodeIdsByScope,
        [scopeKey(estimateId, tabId)]: nextIds,
      },
    };
  });
```

Avoid setter methods that always allocate arrays/objects and trigger subscribers unnecessarily.

### 8.3 Store scope law

Global stores should not accumulate unrelated state forever. Prefer scoped stores keyed by estimate/project/tab.

State keys should include:

```txt
estimateId
estimateId + tabId
projectId
workspaceId
publicationId
```

A store must provide cleanup for closed/unmounted long-lived scopes if memory can grow with user activity.

### 8.4 Context provider law

Do not put frequently changing values in React Context at the app root. Context changes fan out to every consumer. For realtime cursor positions, selection, drag state, or overlay timers, use Zustand/ref/event stores with narrow selectors.

`AppProviders` is acceptable as a root shell for QueryClient, Toast, notifications, BFCache, performance monitor, navigation, and auth bridge. Do not add high-frequency mutable values to it.

---

## 9. Imports, Bundles, and Client Module Graph

### 9.1 Hot client import law

A file marked `"use client"` is a bundle boundary. Every import reachable from it matters.

Rules:

- No helper barrels inside hot client route files.
- No re-export blocks from hot client files.
- No D3/Three/ExcelJS imports in first-paint workshop editor bundles unless the route immediately renders them.
- Dynamic import heavy inactive panels.
- Prefer direct imports for internal modules.
- Keep `optimizePackageImports` for large third-party export surfaces, but treat the Next docs warning seriously: it is still marked experimental.

### 9.2 Specific repo issue: `EstimateSheetContent.tsx`

`EstimateSheetContent.tsx` imports and re-exports a broad helper surface. This is a hot module tax. Refactor target:

```txt
src/components/workshop/estimate-sheet/
  EstimateSheetContent.tsx          # route-level composition only
  EstimateSheetViewport.tsx         # scroll/container/branch list
  EstimateSheetToolbar.tsx          # controls
  EstimateSheetRightDockLoader.tsx  # dynamic panel loading
  model/estimate-sheet-model.ts     # pure selectors/projections
  commands/use-estimate-row-commands.ts
  rows/*                            # row components
  sidebar/*                         # panels, lazy loaded
```

The goal is to make the top-level client entry boring: compose hooks and panels, not host every helper in the product.

### 9.3 Bundle budgets

Start with measured baselines, then enforce non-regression. Initial suggested ceilings:

| Route group | Budget principle |
|---|---|
| Landing/public marketing | Optimize LCP and first-load JS aggressively; no workshop dependencies. |
| `/share/[token]` | Security + snapshot rendering; no authenticated workshop code. |
| Workshop home/project lists | Moderate JS; no D3/ExcelJS/Three unless visible. |
| Estimate editor | Larger allowed, but first interactive path must not include inactive right-dock panels. |
| Charts/data | D3 allowed here; keep out of estimate editor first paint. |
| Proposal export | ExcelJS only on export action/preview island. |

### 9.4 Lazy loading law

Use `next/dynamic` for Client Components that are heavy and not immediately needed. Use native `import()` inside event handlers for heavy libraries only used after user intent.

Examples:

```tsx
const ProjectChartsPanel = dynamic(() => import("./ProjectChartsPanel"), {
  loading: () => <ChartPanelSkeleton />,
});
```

```ts
async function exportProposal() {
  const { buildProposalWorkbook } = await import("@/lib/proposal-export/client-export");
  return buildProposalWorkbook(...);
}
```

---

## 10. Supabase/Postgres Performance Standards

The repo already has RLS proof scripts and migrations. Keep hardening this layer because database mistakes appear as frontend slowness.

### 10.1 RLS law

Every user-data table keeps RLS. Optimize policies instead of bypassing security.

Policy standards:

```sql
-- Good policy shape
create policy "Members can read project rows"
on estimate_row_items
for select
to authenticated
using (
  exists (
    select 1
    from project_members pm
    where pm.project_id = estimate_row_items.project_id
      and pm.user_id = (select auth.uid())
  )
);
```

Performance rules:

- Wrap stable auth functions: `(select auth.uid())`, `(select auth.jwt())`.
- Specify `TO authenticated` / `TO anon` explicitly.
- Index every column used in `using` and `with check` policies.
- Avoid joins in policies where set membership or security-definer functions are cleaner.
- Never expose service-role keys in browser code.
- Use provider advisors and repo proof scripts as gates.

### 10.2 Query law

Every hot query needs:

- explicit selected columns;
- scope filter (`workspace_id`, `project_id`, `estimate_id`, `tab_id`, `node_id`);
- matching index;
- stable order;
- limit/cursor for lists;
- `EXPLAIN ANALYZE` evidence for new slow paths.

Bad:

```ts
supabase.from("estimate_row_items").select("*");
```

Good:

```ts
supabase
  .from("estimate_row_items")
  .select("id, estimate_id, node_id, sort_order, material, quantity, unit_cost, metadata")
  .eq("estimate_id", estimateId)
  .order("sort_order", { ascending: true });
```

### 10.3 RPC law for hierarchy mutations

Tree writes should eventually be RPC/server-action centered because they need transactional sibling ordering, cycle checks, tab scope checks, permissions, history events, and revision stamps.

RPCs should return compact authoritative results, not force the client to refetch the universe.

---

## 11. Navigation and Perceived Performance

### 11.1 Loading states must match content

The repo has already moved away from a global overlay firing too early. Make this permanent:

- route-level skeletons must match the destination UI shape;
- a tree route gets a tree skeleton;
- a table route gets a table skeleton;
- an estimate sheet gets row/card skeletons;
- overlay is a delayed fallback, not the primary loading UX;
- do not show a spinner for navigation that completes inside the delay window.

### 11.2 URL sync law

Selection changes inside the estimate editor should not trigger a full route refresh unless they need new server data. The current manual `window.history.replaceState` pattern in the estimate tree is a valid performance tactic for selection-only route sync. Keep this distinction:

| Change | URL update method |
|---|---|
| Select visible node already in cache | `history.replaceState` or local router state; no server refresh. |
| Switch estimate/project/tab needing server data | Next router navigation/prefetch. |
| Mutate server data | server action + scoped query/tag invalidation. |
| Share/public token changes | full route semantics; preserve security. |

### 11.3 Prefetch law

Next automatically prefetches production links, but resource use matters in a dense workspace. Use intent-aware prefetch for heavy routes and hover/focus prefetch for likely next actions.

Good targets:

- project estimate list rows → prefetch estimate route on hover/focus;
- component library panel → prefetch after panel open or hover tab;
- charts route → prefetch on chart nav hover;
- do not prefetch every row in a 500-row list.

---

## 12. Component and Design-System Standards

Performance refactors must not produce UI drift. The design system is a performance asset because it reduces component diversity and CSS/DOM variation.

### 12.1 Shared primitive law

All new controls must start from `src/components/ui` primitives:

- `Button`, not local `<button>` styling;
- `SearchInput`, not a bespoke search field;
- shared dropdown/context menu primitives;
- shared `Tree` for trees;
- shared cards/badges/modals/toasts.

One-off markup is both a design defect and a performance defect because it prevents shared memoization, shared tests, and shared bundle behavior.

### 12.2 Component API law

Component props should be narrow and stable.

Bad:

```tsx
<TreeRow node={largeNodeObject} appState={entireStore} helpers={helpersObject} />
```

Good:

```tsx
<TreeRow
  id={node.id}
  label={node.name}
  depth={depth}
  isSelected={node.id === selectedNodeId}
  onSelect={selectNode}
/>
```

Pass IDs and scalar flags where possible. Let row components select or receive exactly what they need.

### 12.3 RenderRow law

Virtualized row renderers must be stable. Avoid creating heavy inline closures and objects per row if the row count is large. If using a custom `renderRow`, keep it as a small adapter and move logic into memoized row components.

---

## 13. Charts, Media, Export, and Heavy Libraries

### 13.1 D3/Three law

D3 and Three are allowed only in islands that need them. They should not appear in first-paint bundles for the workshop estimate editor unless that route visibly renders the chart/3D element.

Pattern:

```tsx
const BubbleChart = dynamic(() => import("@/components/workshop/project-charts/BubbleChart"), {
  loading: () => <ChartSkeleton />,
});
```

### 13.2 ExcelJS/proposal export law

ExcelJS belongs in export flows, not the default editor bundle. Keep workbook generation server-side when possible or dynamically import it after user intent.

### 13.3 Images law

Component images are costly in estimate rows. Standardize:

- use Next `Image` where dimensions are known and route context supports it;
- preserve dimensions to avoid CLS;
- lazy load offscreen images;
- use placeholders for missing images;
- avoid loading large source images into virtualized offscreen rows.

---

## 14. Collaboration and Realtime Standards

Realtime is high-frequency by nature. It must be isolated from full app renders.

### 14.1 Presence/cursor law

- Store raw cursor positions in refs or external store.
- Throttle/batch network and render updates.
- Render only cursors visible in the current viewport or current sheet scope.
- Do not update React Context root values per cursor tick.
- Do not let presence changes invalidate estimate tree queries.

### 14.2 Conflict law

Every optimistic mutation needs conflict semantics:

- local revision at mutation start;
- authoritative revision from server;
- rollback only if no newer local mutation superseded it;
- user-visible conflict only when automatic reconcile would lose work;
- server remains authoritative.

The estimates-list optimistic store already implemented conflict policy; use that as a template.

---

## 15. Measurement and CI Budgets

### 15.1 Core Web Vitals budgets

Use web.dev thresholds as global user-experience budgets:

| Metric | Good threshold | Repo enforcement |
|---|---:|---|
| LCP | `<= 2.5s` at p75 | Vercel Speed Insights + Playwright lab proxy. |
| INP | `<= 200ms` at p75 | Field RUM where available; lab TBT/interaction timing as proxy. |
| CLS | `<= 0.1` at p75 | Playwright layout-shift observer and field data. |

### 15.2 App-specific budgets

These should be measured first, then enforced as non-regression gates.

| Area | Starting budget |
|---|---:|
| Warm project → estimate route transition | p75 <= 300ms after prefetch/cache warmup. |
| Cold estimate editor shell paint | p75 <= 1.5s local/staging baseline, then improve. |
| Tree expand/collapse | main-thread task <= 16ms for normal sheets; <= 50ms for worst-case large sheets. |
| Row input keystroke | no visible input lag; no commit causing full sheet rerender per key. |
| Component library search | input update immediate; results may defer. |
| First-load JS route regression | fail PR when route bundle grows beyond agreed baseline + tolerance. |
| Supabase hot query | explain evidence for queries over 50ms locally/staging or p95 API over 200ms. |

### 15.3 Required test additions

Add these tests over the refactor phases:

```txt
tests/vitest/tree-index.test.ts
tests/vitest/ui-tree-virtualization-budget.test.tsx
tests/vitest/estimate-tree-model.test.ts
tests/vitest/estimate-sheet-totals-budget.test.ts
tests/vitest/estimate-sheet-render-budget.test.tsx
tests/vitest/query-key-contract.test.ts
tests/vitest/no-hot-barrel-imports.test.ts
e2e/estimate-editor-interaction-performance.spec.ts
```

### 15.4 Static checks

Add small repo checks:

- forbid importing `react-complex-tree` in new app code;
- forbid `useEstimateUiStore()` without selector;
- forbid helper barrels in `EstimateSheetContent.tsx` and other hot client files;
- grep for `select("*")` in repositories/actions except approved admin paths;
- grep RLS migrations for `auth.uid()` not wrapped by `(select auth.uid())`;
- ensure new tree UIs import `src/components/ui/tree`.

---

## 16. Phase-by-Phase Refactor Roadmap

### Phase 0 — Baseline and freeze the standard

**Goal:** establish measurement and make the current good patterns official before moving code.

Actions:

1. Add this document to the repo, recommended path:
   ```txt
   docs/engineering/react-next-performance-bible.md
   ```
   or, if this remains agent-facing:
   ```txt
   .ai/02_research/2026-06-17-react-next-performance-bible.md
   ```
2. Capture current route performance with existing scripts:
   ```bash
   bun run perf:measure-routes
   bun run perf:check-routes
   bun run perf:profile-peak-load
   bun run test:e2e:perf
   ```
3. Run bundle analyzer and save route bundle baselines.
4. Create a “no new tree primitive” rule.
5. Create a “no broad Zustand selector” rule for new code.

Exit criteria:

- baseline JSON committed or archived;
- budgets documented;
- no behavior changes;
- validation green or known pre-existing exceptions documented.

### Phase 1 — Canonical kernels

**Goal:** create pure, tested kernels before splitting UI.

Actions:

1. Add shared tree index/projection/search utilities.
2. Add estimate-specific adapters:
   ```txt
   src/lib/estimates/estimate-tree-index.ts
   src/lib/estimates/estimate-tree-projection.ts
   ```
3. Add tests for:
   - roots/children sorting;
   - missing parent behavior;
   - cycle protection helpers;
   - ancestor closure search;
   - row grouping;
   - mixed-node “Area” semantics.
4. Update existing callers incrementally to use maps instead of repeated `.find()`.

Exit criteria:

- pure tests pass;
- no UI behavior changes;
- tree projection performance measured.

### Phase 2 — Refactor `EstimateSheetTree.tsx`

**Goal:** split orchestration from rendering without changing product behavior.

Actions:

1. Extract `useEstimateTreeModel`.
2. Extract `useEstimateTreeCommands`.
3. Extract URL sync helper.
4. Keep `src/components/ui/tree.tsx` as renderer.
5. Add render-count/budget test for expanded large tree.
6. Preserve current optimistic create/rename/delete/move behavior.

Exit criteria:

- line count in top-level component drops substantially;
- model tests cover search/selection/bulk ids;
- virtualized tree test proves mounted row count stays bounded;
- e2e tree DnD still passes.

### Phase 3 — Refactor `EstimateSheetContent.tsx`

**Goal:** reduce hot client module weight and isolate sheet math.

Actions:

1. Remove helper re-export surface from hot file.
2. Extract model functions into pure modules.
3. Extract right-dock lazy loaders.
4. Ensure D3/ExcelJS/AI/proposal code is not pulled into first editor paint unless visible.
5. Standardize row edit commit protocol.
6. Add render-budget tests for row editing and branch expansion.

Exit criteria:

- first-load bundle decreases or is at least non-regressive;
- row typing does not rerender unrelated branches;
- tests prove `computeNodeTotals` is single-pass;
- no design-system regressions.

### Phase 4 — Mutation and repository deltas

**Goal:** stop using full-tree refetch as the default mutation reconciliation path.

Actions:

1. Define authoritative mutation DTOs for row/node operations.
2. Add server actions/RPCs that return scoped deltas and revision stamps.
3. Update TanStack Query cache with deltas.
4. Keep full-tree refetch as fallback on conflict/error.
5. Add tests for concurrent optimistic updates and rollback guards.

Exit criteria:

- scalar row edits do not fetch full tree;
- mutations remain RLS-safe;
- conflict behavior documented;
- no stale totals after reconcile.

### Phase 5 — Cache Components and React Compiler pilot

**Goal:** adopt Next 16/React 19 features where they fit the repo.

Actions:

1. Pilot `reactCompiler: true` in a branch; run build, DOM tests, e2e smoke, render profiles.
2. Clean compiler bailout warnings in hot components.
3. Pilot `cacheComponents: true` on marketing/public routes first.
4. Add `use cache` only to deterministic components/functions.
5. Add cache tags and invalidation for low-mutation taxonomy/library summaries.

Exit criteria:

- no auth/cookies/headers misuse inside cached scopes;
- field/lab metrics improve or stay neutral;
- no stale private data exposure;
- rollback is a single config revert if needed.

### Phase 6 — CI performance gates

**Goal:** performance becomes a merge requirement.

Actions:

1. Add budget checks to CI.
2. Fail on route transition regression beyond tolerance.
3. Fail on bundle growth beyond route-specific budget.
4. Fail on unvirtualized large tree/list tests.
5. Fail on RLS initplan/index regressions.

Exit criteria:

- performance is protected like type-check and design lint;
- every new heavy feature has a measured budget.

---

## 17. PR Checklist for Every Refactor

A PR that touches hot React/Next.js code must answer these questions:

1. **State ownership:** Is this server state, UI state, local edit state, or ref-only transient state?
2. **Data shape:** Is the data normalized? Is there an index? Is projection pure?
3. **Render fan-out:** What rerenders when the user types, expands, selects, drags, or saves?
4. **Bundle impact:** Did this add imports to a `"use client"` route file? Did bundle analyzer change?
5. **Mutation path:** Is the optimistic update scoped? Is rollback safe? Is full refetch necessary?
6. **DB impact:** Are queries filtered, indexed, explicit-column, RLS-safe, and measured if hot?
7. **Loading UX:** Is the skeleton shaped like the content? Is the overlay delayed and not masking slow code?
8. **Design system:** Did it reuse shared primitives and preserve design lint rules?
9. **Measurement:** What script/test/profile proves this is not slower?
10. **Rollback:** Can this be reverted without corrupting data or UX state?

---

## 18. Do Not Do List

These are banned unless a PR explicitly documents why the exception is necessary.

- Do not create a new tree component instead of using `src/components/ui/tree.tsx`.
- Do not import `react-complex-tree` in new app/workshop code.
- Do not subscribe to an entire Zustand store in a hot component.
- Do not put derived lists/totals/selected objects into React state via `useEffect`.
- Do not full-route-refresh for selection-only UI changes.
- Do not full-tree-refetch after every scalar row edit unless conflict/security requires it.
- Do not put D3, Three, ExcelJS, proposal export, or inactive AI panels into first-paint editor bundles.
- Do not add helper barrels/re-export surfaces to hot client entry files.
- Do not use `select("*")` in hot repositories/actions.
- Do not use unwrapped `auth.uid()`/`auth.jwt()` in RLS policies.
- Do not add root context providers with high-frequency values.
- Do not treat `useMemo` as architecture. Fix data shape first.

---

## 19. Canonical Code Patterns

### 19.1 Atomic Zustand selector

```ts
export function useSelectedEstimateNodeId(estimateId: string) {
  return useEstimateWorkspaceState(
    (state) => state.selectedNodeIdByEstimateId[estimateId] ?? null,
  );
}
```

### 19.2 Shallow multi-selector

```ts
import { useShallow } from "zustand/react/shallow";

export function useEstimateTreeUiScope(estimateId: string, tabId: string) {
  return useEstimateWorkspaceState(
    useShallow((state) => ({
      selectedNodeId: state.selectedNodeIdByEstimateId[estimateId] ?? null,
      expandedNodeIds: state.expandedNodeIdsByScope[`${estimateId}:${tabId}`] ?? [],
    })),
  );
}
```

### 19.3 Deferred search

```tsx
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);

const visibleNodeIds = useMemo(
  () => searchTreeIndex(index, deferredQuery),
  [index, deferredQuery],
);
```

### 19.4 Scoped mutation DTO

```ts
export type UpdateEstimateRowResult = {
  row: EstimateRowItem;
  affectedNodeIds: string[];
  revision: number;
  updatedAt: string;
};
```

### 19.5 Reconcile mutation result

```ts
queryClient.setQueryData<EstimateTree>(key, (current) => {
  if (!current) return current;
  return {
    ...current,
    rows: current.rows.map((row) =>
      row.id === result.row.id ? result.row : row,
    ),
  };
});
```

### 19.6 Cache Components extraction

```tsx
export default async function Page() {
  const { workspace } = await ensureDefaultWorkspace();
  return <CachedComponentLibrarySummary workspaceId={workspace.id} />;
}

async function CachedComponentLibrarySummary({ workspaceId }: { workspaceId: string }) {
  "use cache";
  cacheTag(`workspace:${workspaceId}:component-library-summary`);
  return readComponentLibrarySummary(workspaceId);
}
```

### 19.7 Route-shaped skeleton

```tsx
export function EstimateSheetSkeleton() {
  return (
    <div className="grid h-full grid-cols-[260px_1fr_320px]">
      <TreeSkeleton />
      <SheetRowsSkeleton />
      <RightDockSkeleton />
    </div>
  );
}
```

---

## 20. Repo-Specific Priority Ranking

### Highest ROI

1. **Make tree/index/projection official.** This unlocks estimate tree, templates, component library, publication, search, and bulk selection cleanup.
2. **Split `EstimateSheetContent.tsx`.** This is the likely biggest client module hotspot.
3. **Replace full-tree mutation refetches with scoped deltas.** This directly improves row editing and sheet responsiveness.
4. **Add CI render/bundle/perf gates.** Prevents regressions after the refactor.

### Medium ROI

1. Pilot React Compiler after purity cleanup.
2. Pilot Cache Components on public/static and low-mutation data.
3. Expand dynamic imports for inactive right dock panels and heavy export/chart modules.
4. Add query-key factory and mutation helper consistency.

### Lower ROI until measured

1. Micro-optimizing tiny components with manual memoization.
2. Rewriting working Supabase queries without `EXPLAIN` evidence.
3. Replacing libraries before proving they are bottlenecks.
4. Adding more global providers or abstract architecture layers.

---

## 21. Source Notes Used for This Update

### Repo files inspected

- `package.json` — stack, scripts, perf/test gates, dependencies.
- `README.md` — app structure, architecture, design system, features, testing.
- `AGENTS.md` — current pre-launch operating model and validation philosophy.
- `DESIGN.md` — strict design-system contract.
- `.ai/10_state/current-state.md` — latest estimate-tree unification, templates panel performance work, express components, database/RLS state.
- `next.config.ts` — bundle analyzer, `optimizePackageImports`, router `staleTimes`, CSP, image patterns.
- `src/app/providers.tsx` — QueryClient defaults and root providers.
- `src/stores/estimate-ui-store.ts` and `src/hooks/use-estimate-workspace-state.ts` — Zustand patterns.
- `src/hooks/use-estimate-query.ts` — estimate query keys, optimistic tree cache helpers.
- `src/lib/domain/estimate-tree.ts` and `src/lib/estimates/types.ts` — flat domain tree and nested UI tree types.
- `src/components/ui/tree.tsx` — canonical shared tree renderer with flattening and TanStack Virtual.
- `src/lib/workshop/virtualization-flags.ts` — centralized virtualization thresholds.
- `src/components/workshop/EstimateSheetTree.tsx` — tree orchestration/refactor target.
- `src/components/workshop/EstimateSheetContent.tsx` — sheet orchestration/bundle/refactor target.
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` — pure row/totals model.
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx` — virtual branch pattern.
- `src/lib/repositories/estimate-repository.ts` — tree reads and full-tree mutation refetch pattern.
- `src/lib/repositories/workspace-repository.ts` — request-scoped `cache()` and Supabase access patterns.
- `src/components/navigation-listener.tsx`, `src/components/performance-monitor.tsx`, `src/stores/navigation-ui-store.ts` — route overlay/perceived performance behavior.
- `src/hooks/use-stable-callback.ts` — stable handler pattern.

### Primary external sources

- Next.js 16 release notes: Cache Components, React Compiler support, Turbopack, routing/prefetch, revalidation APIs.  
  https://nextjs.org/blog/next-16
- Next.js Cache Components / caching docs.  
  https://nextjs.org/docs/app/getting-started/caching
- Next.js `use cache` directive docs.  
  https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js Server and Client Components docs.  
  https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js lazy loading docs.  
  https://nextjs.org/docs/app/guides/lazy-loading
- Next.js prefetching docs.  
  https://nextjs.org/docs/app/guides/prefetching
- Next.js `optimizePackageImports` docs.  
  https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
- React Compiler docs.  
  https://react.dev/learn/react-compiler
- React `memo` docs, including React Compiler note.  
  https://react.dev/reference/react/memo
- React “You Might Not Need an Effect”.  
  https://react.dev/learn/you-might-not-need-an-effect
- React `useDeferredValue` docs.  
  https://react.dev/reference/react/useDeferredValue
- React `startTransition` docs.  
  https://react.dev/reference/react/startTransition
- TanStack Query render optimizations.  
  https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations
- TanStack Query optimistic updates.  
  https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- TanStack Virtual introduction.  
  https://tanstack.com/virtual/latest/docs/introduction
- Supabase Row Level Security performance recommendations.  
  https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
- web.dev Core Web Vitals thresholds.  
  https://web.dev/articles/vitals

---

## 22. Final Recommendation

Archestimator should not begin with random component memoization. It should begin by making its repeated shapes official.

The first refactor milestone should be:

```txt
Tree Kernel + Estimate Tree Model Extraction + Tests + Budgets
```

Then proceed to:

```txt
EstimateSheetContent Split → Scoped Mutation Deltas → Cache/Compiler Pilots → CI Performance Gates
```

That sequence respects the repo’s current strengths, fixes the true structural bottlenecks, and gives the team a permanent standard for building fast React software instead of repeatedly rediscovering the same tree/list/state/data patterns in different files.
