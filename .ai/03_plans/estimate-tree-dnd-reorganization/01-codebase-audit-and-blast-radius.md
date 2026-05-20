# 01 — Codebase Audit and Blast Radius

Audit date: 2026-05-20 18:51 PST
Working branch at audit time: `docs/estimate-tree-rct-dnd-plan`
Project root: `/Users/philiplewis/archestimator`

## Scope audited

Feature goal: add drag/drop reorder and reparent support to the live estimate tree at:

`/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`

Primary component:

- `src/components/workshop/EstimateSheetTree.tsx`

Critical supporting paths:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/tree-hierarchy.ts`
- `src/components/workshop/estimate-tree-data.ts`
- `src/hooks/use-estimate-workspace-state.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/hooks/use-estimate-query.ts`
- `tests/vitest/live-estimate-node-route.test.ts`
- `tests/vitest/estimate-tree-modal.test.tsx`
- `tests/vitest/supabase-performance-migrations.test.ts`
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `supabase/migrations/20260519192045_atomic_estimate_node_moves.sql`
- `supabase/migrations/20260520100459_remove_estimate_node_move_rpc.sql`
- `src/lib/supabase/types.ts`

## GitNexus impact evidence

GitNexus was run before planning edits. Relevant upstream impact findings:

| Symbol | File | Upstream risk | Impact summary |
|---|---|---:|---|
| `EstimateSheetTree` | `src/components/workshop/EstimateSheetTree.tsx` | LOW | 1 impacted caller/process: `ProjectEstimateNodePage`; context also shows test helper `renderTree` in `tests/vitest/estimate-tree-modal.test.tsx` calls it. |
| `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | LOW | 1 impacted caller/process: `ProjectEstimateNodePage`; tests include `estimate-sheet-cost-inputs.test.tsx`. |
| `getProjectEstimateTreeByNode` | `src/lib/repositories/workspace-repository.ts` | LOW | 1 impacted caller/process: `ProjectEstimateNodePage`. |
| `getProjectEstimateTreeByEstimate` | `src/lib/repositories/workspace-repository.ts` | LOW | 3 impacted nodes; process affected: `ProjectEstimateNodePage`. |
| `buildEstimateTree` | `src/lib/repositories/workspace-repository.ts` | LOW | 4 impacted nodes; direct callers are `getProjectEstimateTreeByEstimate` and `getProjectEstimateTreeByNode`. |
| `canNestEstimateNodeKind` | `src/lib/estimates/tree-hierarchy.ts` | HIGH | Direct callers include `createEstimateNode`, `getDefaultNodeKind`, `validParentOptions`, and migration-alignment tests. Any hierarchy-rule change is high risk and must be tested against DB constraints. |
| `useEstimateWorkspaceSelection` | `src/hooks/use-estimate-workspace-state.ts` | HIGH | Direct callers include `EstimateSheetTree` and `EstimateSheetContent`; changes can affect selected route state, row focus reconciliation, and tree highlighting. |
| `getExpandedNodeIds` | `src/components/workshop/estimate-tree-data.ts` | LOW | Directly affects tree default expansion behavior. |
| `createEstimateNode` | `src/lib/estimates/actions.ts` | LOW | No upstream callers detected by GitNexus due server-action binding pattern, but it is used in `EstimateSheetTree` via `createEstimateNode.bind(...)`. Treat as functionally critical despite low graph count. |

Important context output:

- `EstimateSheetTree` incoming calls:
  - `ProjectEstimateNodePage` in `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
  - `renderTree` in `tests/vitest/estimate-tree-modal.test.tsx`
- `EstimateSheetTree` outgoing calls/components:
  - `useEstimateWorkspaceSelection`
  - `HeaderIconToolbar`
  - `Modal`
  - `SearchInput`
  - `NodeIcon`
  - `AddEstimateNodeForm`
  - `ResizableSidePanel`
- `buildEstimateTree` outgoing calls:
  - `isDisplayNodeKind`
  - `formatPeso`
  - `toUiRow`
- `canNestEstimateNodeKind` incoming calls:
  - `createEstimateNode`
  - tests deriving root/folder child matrices
  - `getDefaultNodeKind`
  - `validParentOptions`

## Current route/data flow

### Node route

`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

- Calls `getProjectEstimateTreeByNode(projectId, nodeId)`.
- If no project/estimate, calls `notFound()`.
- Passes live `tree` into both:
  - `<EstimateSheetTree nodes={tree} ... />`
  - `<EstimateSheetContent nodes={tree} ... />`

### Estimate-id route

`src/app/workshop/projects/[projectId]/estimates/page.tsx` and route helpers open estimates by estimate id for empty estimates. `getProjectEstimateTreeByEstimate(projectId, estimateId)` returns `selectedNodeId: tree[0]?.id ?? null`.

### Repository tree build

`src/lib/repositories/workspace-repository.ts`

- Fetches all `estimate_nodes` ordered by `sort_order`.
- Fetches all `estimate_row_items` ordered by `sort_order`.
- `buildEstimateTree(nodes, rows)`:
  - groups rows by `node_id`;
  - maps database rows into `EstimateAreaNode` objects;
  - attaches each node to its parent based on `parent_id`;
  - computes roll-up totals.

Critical current issue:

```ts
function isDisplayNodeKind(kind: EstimateNodeKind): kind is EstimateAreaNode["kind"] {
  return kind === "lot" || kind === "general" || kind === "structure" || kind === "level" || kind === "area";
}
```

This excludes `kind === "group"` even though:

- `EstimateAreaNode.kind` includes `"group"`.
- `createEstimateNode` stores add-form group nodes as `kind: "group"`.
- seed/migration data contains many `group` nodes, including root nodes like `General Requirements`, `Site Works`, `Lot`, `House`, etc.

This must be fixed or explicitly re-decided before DnD implementation. If `group` stays hidden in `buildEstimateTree`, drag/drop cannot operate on the real hierarchy and reparenting can produce confusing visual roots.

## Current tree component behavior

`src/components/workshop/EstimateSheetTree.tsx`

Current RCT usage:

- Imports `ControlledTreeEnvironment`, `InteractionMode`, `Tree`, `TreeItem`, `TreeItemIndex`, and `TreeViewState` from `react-complex-tree`.
- Builds an RCT item map with synthetic root item `estimate-tree-root`.
- Treats all group-like nodes as RCT folders using `isEstimateGroupNodeKind`.
- Uses controlled `viewState`:
  - `expandedItems`
  - `selectedItems`
  - `focusedItem`
- Uses `InteractionMode.ClickArrowToExpand`.
- Handles expand/collapse locally with `expandedOverrides`.
- Handles primary action by:
  - setting selected node in the workspace selection store;
  - setting focused override;
  - `router.push('/workshop/projects/${projectId}/estimates/${node.id}')` inside `startTransition`.
- Custom renderers are already in place for tree container, item list, item title, arrow, and item row.
- Node buttons already carry stable selectors:
  - `data-estimate-tree-active-node`
  - `data-estimate-tree-node-id`

Current missing DnD capabilities:

- No `canDragAndDrop`.
- No `canReorderItems`.
- No `canDropOnFolder`.
- No `canDropAt`.
- No `onDrop`.
- No `renderDragBetweenLine`.
- No server action for moving tree nodes.
- No optimistic tree state; `treeModel` is derived directly from server-provided `nodes` props.

This means a future drop handler must not rely on server props changing immediately. A local optimistic tree state is required.

## Current state-management implications

### Selection/focus

`src/hooks/use-estimate-workspace-state.ts`

- `useEstimateWorkspaceSelection(estimateId, routeSelectedNodeId)` is used by both `EstimateSheetTree` and `EstimateSheetContent`.
- GitNexus marks it HIGH risk because tree and sheet selection/focus are coupled.
- Implementation must preserve route-selected node id during drag/drop unless the user intentionally selects a different node.

### Expansion

`EstimateSheetTree` computes:

- `defaultExpandedItems = Array.from(getExpandedNodeIds(nodes))`
- local `expandedOverrides = { expanded: [], collapsed: [] }`
- `expandedItems = defaultExpandedItems - collapsed + expanded`

Because defaults derive from props, an optimistic reorder must either:

1. update `nodes` locally before `getExpandedNodeIds` and `buildTreeModel`; or
2. maintain expansion in a state set keyed only by node ids, not by tree object identity.

Recommended: introduce `optimisticNodes` and derive both `treeModel` and default expanded ids from it, while preserving existing explicit expand/collapse overrides.

### Row/sheet content

`EstimateSheetContent.tsx` receives the same `nodes` tree. If the tree panel changes optimistically but the sheet content does not, totals/row context may appear inconsistent. Either:

- lift optimistic tree state to a parent that passes it to both tree and sheet; or
- use a shared client store/query cache for the live estimate tree; or
- if only tree order/reparent changes and selected area rows remain unchanged, accept temporary tree-only optimism but ensure server-returned tree reconciles both surfaces without reload.

For seamless UX, prefer lifting to a small client boundary around both tree and sheet only if the current server-component route allows it without architectural churn. If not, tree-local optimism is acceptable for MVP only with explicit tests proving no content mismatch on selected node moves.

## Current server action state

`src/lib/estimates/actions.ts`

Existing relevant action:

- `createEstimateNode(projectId, estimateId, formData)`
  - validates project/workspace ownership;
  - validates parent belongs to same estimate;
  - validates hierarchy with `canNestEstimateNodeKind(kind, parentKind)`;
  - computes next sibling `sort_order` as `(max sort_order ?? -1) + 1`;
  - inserts into `estimate_nodes`;
  - calls `revalidatePath('/workshop/projects/${projectId}/estimates')`.

No current tree-move action exists. Existing source-inspection tests assert this absence.

Implementation needs a new action such as:

```ts
moveEstimateTreeNodes(projectId, estimateId, payload)
```

It must:

- verify current user/workspace/project/estimate scope;
- verify all moved ids and target parents belong to the same estimate;
- reject invalid hierarchy/cycles/no-ops;
- call an atomic database function or transaction-safe server-side path;
- return the fresh tree or a normalized move result;
- not redirect;
- not require active route refresh for visual success.

## Database/migration state

### Base schema

`supabase/migrations/20260518090000_archestimator_core_schema.sql`

- `estimate_nodes.parent_id` references `estimate_nodes(id)`.
- `estimate_nodes.sort_order` is `integer not null default 0`.
- Unique constraint:
  - `estimate_nodes_unique_sort unique (estimate_id, parent_id, sort_order) deferrable initially deferred`
- Index:
  - `estimate_nodes_estimate_parent_sort_idx on public.estimate_nodes(estimate_id, parent_id, sort_order)`

### Existing hierarchy/move migration

`supabase/migrations/20260519192045_atomic_estimate_node_moves.sql`

This migration:

- normalized duplicate root sort orders;
- added `estimate_nodes_unique_sort_with_root unique nulls not distinct (estimate_id, parent_id, sort_order) deferrable initially deferred`;
- created `validate_estimate_node_tree(target_estimate_id uuid)`;
- created deferred constraint trigger `estimate_nodes_enforce_tree`;
- created deferred constraint trigger `estimate_row_items_enforce_area_node`;
- created `public.move_estimate_nodes(target_estimate_id uuid, move_updates jsonb)`;
- granted execute to `authenticated`.

The old `move_estimate_nodes` function had useful validations:

- target estimate id required;
- payload must be JSON array;
- no duplicate moved ids;
- ids and sort orders required/non-negative;
- moved nodes must belong to target estimate;
- parents must belong to target estimate;
- locks relevant estimate nodes;
- rejects missing parent references;
- rejects hierarchy violations;
- rejects cycles;
- rejects duplicate sibling sort orders;
- defers uniqueness constraints;
- updates all requested rows atomically;
- errors if not all requested rows updated.

### Removal migration

`supabase/migrations/20260520100459_remove_estimate_node_move_rpc.sql`

```sql
-- Estimate-tree drag/drop reorganization has been removed from the product.
-- Drop the RPC that previously enabled persisted tree moves so authenticated
-- clients cannot keep using the old reorder path outside the UI.
drop function if exists public.move_estimate_nodes(uuid, jsonb);
```

This is a product decision recorded in code. The user has now requested the feature again, so implementation must deliberately reverse/reframe this decision with a new migration and tests. Do not silently assume the old RPC exists; in current database order it is dropped.

Recommended database direction:

- Add a new migration after the removal migration.
- Prefer a new function name, e.g. `public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)`, to avoid confusion with the explicitly removed/deprecated `move_estimate_nodes` path.
- Reuse the validation logic from the old migration where correct, but treat it as source material to audit, not as an unquestioned copy/paste.
- Regenerate/update `src/lib/supabase/types.ts` so the new RPC is typed under `Database.public.Functions`.

## Existing tests and required test changes

### Tests currently passing at audit time

Command run:

```bash
bun run type-check && bun run test:dom -- tests/vitest/estimate-tree-modal.test.tsx tests/vitest/live-estimate-node-route.test.ts tests/vitest/supabase-performance-migrations.test.ts
```

Result:

- TypeScript check passed.
- 3 Vitest files passed.
- 15 tests passed.

### Tests that currently assert DnD is absent

`tests/vitest/live-estimate-node-route.test.ts`

The test currently contains negative assertions such as:

- `expect(estimateTree).not.toContain("canDragAndDrop")`
- `expect(estimateTree).not.toContain("canDropOnFolder")`
- `expect(estimateTree).not.toContain("canReorderItems")`
- `expect(estimateTree).not.toContain("renderDragBetweenLine")`
- `expect(estimateTree).not.toContain("moveEstimateNode")`
- `expect(estimateActions).not.toContain("moveEstimateNode")`
- `expect(estimateActions).not.toContain("buildEstimateNodeMovePlan")`
- `expect(estimateActions).not.toContain('.rpc("move_estimate_nodes"')`

These must be removed or rewritten. They are source-inspection tests for a removed feature and will block correct implementation.

Recommended replacement: behavior tests for:

- RCT DnD props enabled;
- invalid drops blocked;
- valid drops call the server action once;
- no router refresh/push on drop;
- optimistic DOM order before server resolution;
- rollback on server rejection.

### Existing modal/tree tests

`tests/vitest/estimate-tree-modal.test.tsx`

- Renders `EstimateSheetTree` through a helper.
- Tests add-node modal/default parent behavior.
- Will likely need updates if tree state is lifted or component props change.

### Existing database migration tests

`tests/vitest/supabase-performance-migrations.test.ts`

- Confirms the old atomic migration contains hierarchy enforcement and old move RPC.
- Confirms the removal migration drops `move_estimate_nodes`.
- Confirms DB hierarchy rules match `canNestEstimateNodeKind`.

When reintroducing DnD persistence, add new assertions for the new migration/function rather than deleting hierarchy-enforcement coverage.

## Browser audit result

Browser navigation attempted to:

`http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`

Actual result:

- Redirected to `/login?next=%2Fworkshop%2Fprojects%2F22222222-2222-4222-8222-222222222222%2Festimates%2F77777777-7777-4777-8777-777777777729`.
- Login page visible with heading `Sign in to workshop`.

Implication:

- Browser QA for the actual drag/drop route requires authenticated state or dev auth bypass.
- Existing `e2e/auth.spec.ts` only covers signed-out redirect/login UI.
- Add authenticated/dev-bypass Playwright setup before implementing browser DnD tests.

## React Complex Tree package state

`package.json` declares:

- `react-complex-tree`: `^2.6.1`
- installed package inspected in `node_modules/react-complex-tree/package.json`: `2.6.1`

The current component already imports the package. No new package is needed.

## Exact blast-radius classification

### Low-risk UI additions if contained

- Adding DnD props and custom `renderDragBetweenLine` inside `EstimateSheetTree`.
- Adding tree-only optimistic state inside `EstimateSheetTree`.
- Adding stable test selectors and drag indicator markup.

Why low: upstream impact is mostly the route page and existing tree tests.

### Medium-risk shared-state changes

- Lifting optimistic tree state above both `EstimateSheetTree` and `EstimateSheetContent`.
- Introducing a shared query/store for live estimate tree state.
- Reconciling selected node route state after moves.

Why medium: affects both left tree and center sheet surface.

### High-risk hierarchy changes

- Changing `canNestEstimateNodeKind`.
- Changing database hierarchy constraints/triggers.
- Changing selected-node global store semantics.

Why high: GitNexus reports HIGH risk for `canNestEstimateNodeKind` and `useEstimateWorkspaceSelection`; database constraints must stay aligned with TypeScript hierarchy rules.

### High-risk persistence changes

- Reintroducing an atomic RPC/function.
- Updating `src/lib/supabase/types.ts` function definitions.
- Any change that updates multiple `estimate_nodes` rows.

Why high: unique sibling sort constraints and deferred triggers make partial or non-atomic updates unsafe.

## Required implementation sequence from audit

1. Replace source-inspection tests that assert DnD absence with behavior-oriented pending/target tests.
2. Fix/decide `group` node visibility in `buildEstimateTree`.
3. Add pure tree-reorder domain helpers and unit tests.
4. Add atomic persistence migration/function and Supabase types.
5. Add server action that validates project/estimate scope and calls persistence atomically.
6. Add controlled RCT DnD props and custom drop indicators.
7. Add local optimistic tree state and rollback handling.
8. Add component tests for optimistic/no-refresh behavior.
9. Add authenticated Playwright setup and browser DnD/no-flicker tests.
10. Run full validation gates.

## Do not do

- Do not use direct client-side multi-row updates for persistence.
- Do not call `router.refresh()` after every drop.
- Do not rely on RCT to enforce Archestimator hierarchy rules.
- Do not allow area nodes to become parents.
- Do not use `DraggingPosition.linearIndex` or `depth` as persisted order.
- Do not update `canNestEstimateNodeKind` without also updating database tests/migrations.
- Do not stage or commit pre-existing unrelated `AGENTS.md` / `CLAUDE.md` changes.
