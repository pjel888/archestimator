# 03 — Implementation Plan

Objective: implement seamless drag/drop reorganization of the live estimate tree using React Complex Tree without page reloads, route bounce, or flicker.

This plan is code-ready but does not itself implement feature code.

## Definition of done

A user can drag one estimate tree node to a valid new position and see the tree update immediately. The move persists atomically, survives reload, preserves selected/expanded/focused state, and never causes a full-page reload. Invalid drops are blocked before persistence.

Before coding from this plan, read these companion files in order:

1. `00-two-node-domain-decision.md`
2. `06-current-state-validation-memo.md`
3. `07-implementation-reference.md`
4. `08-verification-runbook-and-readiness-gate.md`

If any implementation detail here conflicts with `07-implementation-reference.md`, use `07` as the contract reference and update this file.

## Quantified success metrics

Implementation is not done until all of these are true:

- 100% of active estimate tree nodes render with technical kind `group` or `area`; no Group Nodes are hidden by `isDisplayNodeKind`.
- 100% of valid unit move cases produce deterministic `nextNodes` and atomic `updates` payloads.
- 100% of invalid unit move cases produce no persistence payload.
- 0 new DnD paths call `router.refresh()`, cause main-frame navigation, or use the removed `move_estimate_nodes` RPC.
- 0 blank tree frames are recorded during the Playwright drag/drop sampling window.
- Valid browser moves update visually before server success is observed and persist after reload.
- Selection, focus, expansion, and row attachments remain stable by node id.

## Product rules to implement

### Node kinds

Active technical source of truth:

```ts
export type EstimateNodeKind = "group" | "area";
```

Interpretation:

- Root may contain only Group Nodes (`kind: "group"`).
- Group Nodes may contain other Group Nodes and Area Nodes.
- Area Nodes may contain `EstimateRowItem` records and cannot contain child nodes.
- Domain organization labels such as Lot, General Requirements, House, Floor, Trade, or Phase are `group` node names/metadata/UI labels, not technical node kinds.

The implementation must first collapse current compatibility code to this two-kind model. Do not add drag/drop on top of the old `lot | general | structure | level` compatibility matrix.

## Phase 0 — Preflight and branch hygiene

1. Stay off `main` for feature work.
2. Before implementing, inspect and preserve unrelated working-tree changes.
3. Do not stage existing unrelated changes to `AGENTS.md` or `CLAUDE.md` unless Philip explicitly says they belong to the feature.
4. Run baseline:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-modal.test.tsx tests/vitest/live-estimate-node-route.test.ts tests/vitest/supabase-performance-migrations.test.ts
```

Baseline at planning time passed.

## Phase 1 — Replace tests that assert DnD absence

File:

- `tests/vitest/live-estimate-node-route.test.ts`

Current assertions explicitly block the feature:

- `not.toContain("canDragAndDrop")`
- `not.toContain("canDropOnFolder")`
- `not.toContain("canReorderItems")`
- `not.toContain("renderDragBetweenLine")`
- `not.toContain("moveEstimateNode")`
- `not.toContain("buildEstimateNodeReorderPlan")`
- `not.toContain('.rpc("move_estimate_nodes"')`

Action:

- Remove source-inspection assertions that DnD is absent.
- Replace with behavior-oriented tests in new files instead of relying mainly on string matching.
- Keep valuable existing route/live-data assertions.

Recommended new tests start failing before implementation:

- `tests/vitest/estimate-tree-reorder.test.ts`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-node-reorder-action.test.ts`

Commit after this phase if tests are intentionally failing only in the new target feature tests:

`test: add estimate tree drag-drop target coverage`

## Phase 2 — Collapse tree domain to two technical node kinds

Files:

- `src/lib/estimates/tree-hierarchy.ts`
- `src/lib/domain/estimate-tree.ts`
- `src/components/workshop/estimate-tree-data.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/supabase/types.ts`
- `supabase/migrations/*`
- `tests/vitest/estimate-tree-data.test.ts`
- `tests/vitest/supabase-performance-migrations.test.ts`

Current issue:

The codebase still treats `lot`, `general`, `structure`, and `level` as group-like technical kinds, and generated Supabase types still include `assembly`. Philip has now decided those must not be technical tree kinds. They are labels/names on `group` nodes.

Required TypeScript target:

```ts
export type EstimateNodeKind = "group" | "area";

export function isEstimateGroupNodeKind(kind: EstimateNodeKind) {
  return kind === "group";
}

export function canNestEstimateNodeKind(childKind: EstimateNodeKind, parentKind: EstimateNodeKind | null) {
  if (parentKind === null) return childKind === "group";
  return parentKind === "group";
}
```

Repository target:

```ts
function isDisplayNodeKind(kind: EstimateNodeKind): kind is EstimateAreaNode["kind"] {
  return kind === "group" || kind === "area";
}
```

Required actions:

- Remove legacy node-kind unions from source types.
- Rename or alias the stale `EstimateAreaNode` view-model type if it continues to represent both Group Nodes and Area Nodes; do not let the type name imply every tree node is an Area Node.
- Convert sample/static tree records from `lot`, `general`, `structure`, and `level` to `group`.
- Keep visible names such as `Lot`, `General Requirements`, `House`, etc. as `name` values.
- Ensure the add-node form presents exactly Group Node and Area Node choices.
- Ensure the server action can create only `group` and `area` nodes.
- Add or update a Supabase migration to normalize legacy rows to `group` and enforce the two-kind matrix.
- Regenerate/update Supabase types after migration changes.
- Update tests to assert the two-kind hierarchy matrix.

Tests:

- `tests/vitest/estimate-tree-data.test.ts`: expected node kinds must be only `group | area`.
- `tests/vitest/supabase-performance-migrations.test.ts`: active test fixture must use `["group", "area"]` and SQL expectations must match `root -> group`, `group -> group|area`.
- Add a repository/unit test proving `group` nodes from DB appear in `buildEstimateTree` output.
- Add a route/source or behavior test proving newly created Group Nodes are not hidden.

Risk:

- High hierarchy risk because GitNexus marks `canNestEstimateNodeKind` as HIGH impact and SQL constraints must stay exactly aligned.
- Medium/high functional risk because `buildEstimateTree` controls the visible tree shape.
- Database migration risk if narrowing a PostgreSQL enum after remote data already exists; normalize values before narrowing/enforcing.

Commit:

`feat: simplify estimate tree node kinds`

## Phase 3 — Add pure reorder domain helpers

New file:

- `src/lib/estimates/tree-reorder.ts`

Purpose:

Keep RCT target translation and Archestimator validation out of the component and server action. This enables unit tests and prevents drift.

Recommended types:

```ts
import type { DraggingPosition, TreeItemIndex } from "react-complex-tree";
import type { EstimateAreaNode } from "@/components/workshop/estimate-tree-data";

export type EstimateNodeReorderUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type EstimateTreeReorderPlan = {
  movedIds: string[];
  targetParentId: string | null;
  nextNodes: EstimateAreaNode[];
  updates: EstimateNodeReorderUpdate[];
  affectedParentIds: Array<string | null>;
};

export type EstimateTreeReorderErrorCode =
  | "empty-drag"
  | "multi-drag-not-supported"
  | "unknown-dragged-node"
  | "unknown-target-node"
  | "invalid-root-child"
  | "invalid-parent-kind"
  | "cycle"
  | "no-op";

export type EstimateTreeReorderEvaluation =
  | { ok: true; plan: EstimateTreeReorderPlan }
  | { ok: false; code: EstimateTreeReorderErrorCode; message: string };
```

Recommended functions:

```ts
export function evaluateEstimateTreeDrop(args: {
  nodes: EstimateAreaNode[];
  draggedItemIds: TreeItemIndex[];
  target: DraggingPosition;
}): EstimateTreeReorderEvaluation;

export function buildEstimateNodeReorderPlan(args: {
  nodes: EstimateAreaNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateTreeReorderEvaluation;

export function applyEstimateNodeReorder(args: {
  nodes: EstimateAreaNode[];
  draggedNodeId: string;
  targetParentId: string | null;
  targetIndex: number;
}): EstimateTreeReorderPlan;

export function flattenEstimateTree(nodes: EstimateAreaNode[]): Array<{
  node: EstimateAreaNode;
  parentId: string | null;
  sortIndex: number;
}>;
```

Validation details:

1. Reject multi-drag for MVP.
2. Reject synthetic root as dragged item.
3. Find dragged node and target parent in the flattened tree.
4. Convert RCT target to target parent and index:
   - `item`: parent = target item id, index = current child count / append.
   - `between-items`: parent = target.parentItem mapped through root => null, index = target.childIndex.
   - `root`: parent = null, index = root child count / append.
5. Use `canNestEstimateNodeKind(child.kind, parent?.kind ?? null)`.
6. Reject moving a node under itself or descendant.
7. Remove dragged node from old sibling list before applying target index. If moving within same parent and source index is before target index, adjust insertion index downward by 1.
8. Rebuild only affected branches while preserving object identity for unaffected nodes if practical.
9. Generate `updates` for affected sibling sets with deterministic `sortOrder` values.
10. Return `no-op` if parent and normalized order do not change.

Sort order recommendation:

```ts
const SORT_ORDER_STEP = 10;
const sortOrder = (index: number) => (index + 1) * SORT_ORDER_STEP;
```

Rationale:

- Gap values support later insertion strategies.
- Full normalization of affected siblings is deterministic and testable.

Unit test file:

- `tests/vitest/estimate-tree-reorder.test.ts`

Test cases:

- Group root sibling reorder.
- Sibling reorder under same Group Node.
- Reparent Group Node into Group Node.
- Reparent Area Node into Group Node.
- Reject Area Node as parent.
- Reject Area Node at root.
- Reject legacy node kinds if fixture/data tries `lot`, `general`, `structure`, `level`, or `assembly`.
- Reject cycle/descendant move.
- Reject unknown node.
- Reject no-op.
- Preserve row items on moved area.
- Preserve nested subtree on moved group.
- Produce unique sort orders per affected parent.

Commit:

`feat: add estimate tree reorder planning helpers`

## Phase 4 — Add atomic persistence

### Database migration

New file:

- `supabase/migrations/<timestamp>_reintroduce_estimate_tree_reorder.sql`

Do not edit historical migration files.

This phase depends on Phase 2. The new migration must either physically narrow `estimate_node_kind` to `group | area` or enforce that active `estimate_nodes.kind` values are only `group` and `area` after normalizing legacy rows.

Required hierarchy enforcement:

```sql
(child.parent_id is null and child.kind = 'group')
or (parent.kind = 'group' and child.kind in ('group', 'area'))
```

Area Nodes must remain leaf nodes for estimate tree children, and row ownership must remain restricted to Area Nodes.

Recommended function name:

- `public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)`

Reason for new name:

- `public.move_estimate_nodes` was explicitly dropped by `20260520100459_remove_estimate_node_move_rpc.sql` because the old drag/drop UI was removed.
- New request is a deliberate reintroduction with better UI/state management; a new function name avoids ambiguity and lets tests assert the old removal migration remains historically true.

Function requirements:

- owner/membership authorization is enforced at the database boundary; if `SECURITY INVOKER` is used, RLS remains active; if `SECURITY DEFINER` is used, the function checks `auth.uid()` against `workspace_members` via `estimates -> projects -> workspace_members` before any update;
- `target_estimate_id` required.
- `move_updates` must be a JSON array.
- Each update requires:
  - `id`: uuid
  - `parent_id`: uuid or null
  - `sort_order`: integer >= 0
- Reject duplicate moved ids.
- Reject duplicate `(parent_id, sort_order)` inside payload.
- Reject moved ids not in `target_estimate_id`.
- Reject parent ids not in `target_estimate_id`.
- Lock affected estimate nodes with `for update`.
- Use `SECURITY INVOKER` by default. If `SECURITY DEFINER` is chosen, include the explicit workspace-membership check documented in `07-implementation-reference.md` and add a test that direct RPC access by a non-member fails.
- Apply all row updates in one statement/transaction.
- Reject if update count differs from payload count.
- Run or rely on deferred `validate_estimate_node_tree` constraints to catch cycles/hierarchy/area row violations.
- Grant execute only to `authenticated` if RLS/session identity is required.

Reuse the old migration logic in `20260519192045_atomic_estimate_node_moves.sql` as audited source material, but update names/contracts and tests.

### Supabase types

File:

- `src/lib/supabase/types.ts`

Add generated/hand-updated function type for `reorder_estimate_nodes` under `Database.public.Functions`.

Expected shape:

```ts
reorder_estimate_nodes: {
  Args: {
    target_estimate_id: string;
    move_updates: Json;
  };
  Returns: number;
};
```

Use actual generated type output if Supabase CLI is available. Returning the updated row count is preferred because the action/tests can verify the RPC updated exactly the intended number of nodes.

### Server action

File:

- `src/lib/estimates/actions.ts`

Add:

```ts
export type ReorderEstimateTreeNodesInput = {
  updates: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
};

export async function reorderEstimateTreeNodes(
  projectId: string,
  estimateId: string,
  input: ReorderEstimateTreeNodesInput,
) {
  // validate auth/project/estimate scope
  // validate updates are non-empty and scoped
  // call rpc("reorder_estimate_nodes", ...)
  // return getProjectEstimateTreeByEstimate(projectId, estimateId).tree or similar
}
```

Action validation must repeat important client rules:

- updates array non-empty;
- moved node ids unique;
- all moved nodes exist and belong to the estimate;
- all moved/parent nodes have active kind `group` or `area` only;
- all parent ids exist and belong to the estimate;
- no Area Node parent;
- no Area Node root child;
- no cycles after move;
- project-scoped estimate ownership via `estimates!inner` / `project_id` patterns already used elsewhere.

Even if DB validates, server action should return user-friendly error messages for common invalid drops.

Revalidation policy:

- Do not call `redirect()`.
- Do not require `router.refresh()` from client.
- It is acceptable to call `revalidatePath('/workshop/projects/${projectId}/estimates')` for future navigations, but active UX must rely on optimistic state and returned data.

Tests:

- Add server action tests with mocked Supabase client if current test style supports it.
- Add migration test to assert new migration creates/grants `reorder_estimate_nodes` and contains validation logic.

Commit:

`feat: add atomic estimate tree reorder persistence`

## Phase 5 — Add client optimistic DnD state

File:

- `src/components/workshop/EstimateSheetTree.tsx`

### Props

Add prop for server action if testability improves:

```ts
type EstimateSheetTreeProps = {
  ...
  onReorderNodes?: typeof reorderEstimateTreeNodes;
};
```

Or import the server action directly if the existing project pattern prefers direct imports. For component tests, dependency injection is cleaner.

### State

Add local optimistic state with a stale-props guard:

```ts
const [optimisticNodes, setOptimisticNodes] = useState(nodes);
const rollbackRef = useRef<EstimateTreeNode[] | null>(null);
const localConfirmedTreeSignatureRef = useRef<string | null>(null);
const [moveState, setMoveState] = useState<"idle" | "saving" | "failed">("idle");
const [moveError, setMoveError] = useState<string | null>(null);
```

Reconcile server props carefully:

```ts
useEffect(() => {
  if (moveState === "saving") return;

  const incomingSignature = getEstimateTreeStructureSignature(nodes);
  if (
    localConfirmedTreeSignatureRef.current !== null &&
    localConfirmedTreeSignatureRef.current !== incomingSignature
  ) {
    return;
  }

  localConfirmedTreeSignatureRef.current = null;
  setOptimisticNodes(nodes);
}, [nodes, moveState]);
```

This guard is mandatory. Without it, a successful `setOptimisticNodes(result.tree)` can be immediately overwritten by still-stale route props when `moveState` returns to `idle`, causing the exact flicker/stale-tree behavior this feature is meant to avoid.

If multiple moves can happen before persistence returns, use a queue/version instead of a single pending state. MVP can disable or serialize new moves while saving.

Recommended MVP behavior:

- Allow one move at a time.
- While saving, keep the tree interactive for selection/expansion but reject another drop with a polite status.
- If product wants rapid reordering, implement a mutation queue in a later phase.

### Derived model

Change derivation to use optimistic state:

```ts
const treeModel = useMemo(() => buildTreeModel(optimisticNodes), [optimisticNodes]);
const defaultExpandedItems = useMemo(() => Array.from(getExpandedNodeIds(optimisticNodes)), [optimisticNodes]);
```

### Drag handlers

```ts
const canDragEstimateItems = useCallback((items: TreeItem<EstimateTreeItemData>[]) => {
  return moveState !== "saving" && items.length === 1 && items.every((item) => item.data.node !== null);
}, [moveState]);

const canDropEstimateItemsAt = useCallback((items, target) => {
  if (moveState === "saving") return false;
  return evaluateEstimateTreeDrop({
    nodes: optimisticNodes,
    draggedItemIds: items.map((item) => item.index),
    target,
  }).ok;
}, [moveState, optimisticNodes]);

const handleDrop = useCallback(async (items, target) => {
  const evaluation = evaluateEstimateTreeDrop({
    nodes: optimisticNodes,
    draggedItemIds: items.map((item) => item.index),
    target,
  });

  if (!evaluation.ok) {
    setMoveError(evaluation.message);
    return;
  }

  rollbackRef.current = optimisticNodes;
  setMoveError(null);
  setMoveState("saving");
  setOptimisticNodes(evaluation.plan.nextNodes);

  try {
    const result = await reorderEstimateTreeNodes(projectId, estimateId, { updates: evaluation.plan.updates });
    const confirmedTree = result.tree ?? evaluation.plan.nextNodes;
    localConfirmedTreeSignatureRef.current = getEstimateTreeStructureSignature(confirmedTree);
    setOptimisticNodes(confirmedTree);
    setMoveState("idle");
    rollbackRef.current = null;
  } catch (error) {
    setOptimisticNodes(rollbackRef.current ?? nodes);
    rollbackRef.current = null;
    setMoveState("failed");
    setMoveError(error instanceof Error ? error.message : "Could not move estimate node.");
  }
}, [estimateId, optimisticNodes, projectId, nodes]);
```

Use the actual action return shape once implemented.

### RCT props

Add to `ControlledTreeEnvironment`:

```tsx
canDragAndDrop
canReorderItems
canDropOnFolder
canDropBelowOpenFolders
canDropOnNonFolder={false}
canDrag={canDragEstimateItems}
canDropAt={canDropEstimateItemsAt}
onDrop={handleDrop}
renderDragBetweenLine={...}
```

### Drop visual design

Keep design aligned with existing compact workshop UI:

- Do not enlarge tree row height.
- Add subtle drag handle affordance only if needed; avoid clutter.
- Use a clear accent drop line for between-items.
- Use a light background/outline for drop-inside target.
- Add a small `role="status"` text for saving/failure near the tree toolbar/header, not a blocking overlay.
- Avoid global page spinners.

Recommended row states:

- `data-estimate-tree-dragging-over="true"` when `context.isDraggingOver`.
- `data-estimate-tree-can-drop="true"` if useful for tests.
- `data-estimate-tree-moving="true"` on container while saving.

### No navigation guarantee

`onPrimaryAction` currently navigates by `router.push`. Ensure `onDrop` does not trigger primary action. Component tests must mock router and assert:

- `router.push` not called on drop.
- `router.refresh` not called on drop.

Commit:

`feat: enable optimistic estimate tree drag-drop`

## Phase 6 — Shared tree state decision

Default MVP path:

- Keep optimistic DnD state local to `EstimateSheetTree`.
- Reconcile from the server action's returned fresh tree.
- Update/invalidate TanStack Query area-tree cache after persistence succeeds if `EstimateSheetContent` depends on that tree snapshot.

After tree-local MVP implementation, test these cases in component tests and Playwright:

1. Move selected area under a different group while center sheet displays its rows.
2. Move a parent group that contains selected area.
3. Move non-selected node while center sheet displays another area.
4. Trigger server failure while center sheet has dirty/saving row input state.

Tree-local optimism remains acceptable only if all of these are true:

- center sheet row data remains attached to the selected Area Node;
- breadcrumbs/path/totals do not show stale parent context after successful move;
- no query refetch reverts the left tree after the optimistic move;
- no flicker appears because two components hold competing tree snapshots.

Escalate to a shared client boundary if any visible mismatch appears.

New file option:

- `src/components/workshop/EstimateWorkspaceClientBoundary.tsx`

Responsibilities:

- Own `optimisticNodes` once.
- Pass nodes to `EstimateSheetTree` and `EstimateSheetContent`.
- Own reorder action state or provide handler to tree.
- Reconcile TanStack Query cache after success.
- Keep route selection state in the existing scoped Zustand store.

Route page becomes:

```tsx
<EstimateWorkspaceClientBoundary
  project={project}
  estimate={estimate}
  initialNodes={tree}
  selectedNodeId={selectedNodeId}
/>
```

Risk:

- This converts more of the page to client-rendered state, so only do it if tests prove tree-local state cannot meet seamless UX.
- Do not introduce this boundary preemptively; simpler architecture wins unless a verified mismatch requires it.

Reference: `07-implementation-reference.md` section “Shared state conditional path”.

## Phase 7 — Browser/auth setup

Current browser result is signed-out redirect to `/login`.

Files:

- `src/lib/auth/dev-auth.ts`
- `src/lib/auth/dev-auth-gate.ts`
- `playwright.config.ts`
- `e2e/auth.spec.ts`

Implementation needs authenticated Playwright setup:

- Keep existing signed-out redirect test.
- Add a separate authenticated project/config or setup file.
- Use dev auth env variables already supported by app code.
- Do not commit secrets.

Candidate env for local/CI:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
ARCHESTIMATOR_DEV_AUTH_EMAIL=e2e@archestimator.local
```

Only use service-role or anon keys from environment/CI secrets, never hard-coded files.

Commit:

`test: add authenticated estimate tree e2e setup`

## Phase 8 — Final validation gates

Run before final PR/merge:

```bash
bun run type-check
bun run lint
bun run lint:font-size
bun run test
bun run test:dom
bun run test:e2e
```

Additional targeted browser QA:

```bash
bun run test:e2e -- e2e/estimate-tree-dnd.spec.ts
```

Manual browser checks:

- Target route loads authenticated.
- Drag root sibling above another root sibling.
- Drag area under another group.
- Drag group with subtree under another group.
- Try invalid area-as-parent drop.
- Reload and verify persisted structure.
- Observe no page reload/flicker/drop-induced route change.

## Expected changed files by final implementation

### Code

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/lib/estimates/tree-hierarchy.ts`
- `src/lib/domain/estimate-tree.ts`
- `src/components/workshop/estimate-tree-data.ts`
- `src/lib/estimates/tree-reorder.ts` (new)
- `src/lib/estimates/actions.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/supabase/types.ts`
- Optional: `src/components/workshop/EstimateWorkspaceClientBoundary.tsx` (new, only if shared optimistic state needed)

### Database

- `supabase/migrations/<timestamp>_simplify_estimate_node_kinds.sql` (new, if enum/check constraint narrowing is separated from reorder)
- `supabase/migrations/<timestamp>_reintroduce_estimate_tree_reorder.sql` (new)

### Tests

- `tests/vitest/estimate-tree-data.test.ts` (update)
- `tests/vitest/estimate-tree-reorder.test.ts` (new)
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx` (new)
- `tests/vitest/estimate-node-reorder-action.test.ts` (new or equivalent)
- `tests/vitest/live-estimate-node-route.test.ts` (update)
- `tests/vitest/estimate-tree-modal.test.tsx` (possibly update)
- `tests/vitest/supabase-performance-migrations.test.ts` (update)
- `e2e/estimate-tree-dnd.spec.ts` (new)
- Optional: `e2e/fixtures/estimate-tree.ts` / `e2e/utils/perf-instrumentation.ts`

### Docs/state

- `.ai/10_state/current-state.md` if implementation changes product state.
- `.ai/10_state/decisions.md` if reintroducing tree DnD reverses/remediates the removal decision.
- This plan folder if implementation discoveries invalidate assumptions.

## Acceptance checklist

- [ ] Technical estimate node kinds are only `group | area` in TypeScript/domain/sample data/tests.
- [ ] Database normalizes or rejects legacy estimate node kinds and enforces only Group/Area hierarchy.
- [ ] Drag/drop is enabled in RCT.
- [ ] Valid Group Node root sibling reorder works.
- [ ] Valid same-parent reorder works.
- [ ] Valid group reparent works.
- [ ] Valid area reparent under group works.
- [ ] Area cannot be parent.
- [ ] Area cannot be root child.
- [ ] Node cannot move into descendant.
- [ ] Drop updates UI before server response.
- [ ] Failed persistence rolls back.
- [ ] Selected node remains selected.
- [ ] Expanded/collapsed state remains stable.
- [ ] No `router.refresh()` from drop.
- [ ] No document request/frame navigation during drop.
- [ ] Persistence survives reload.
- [ ] New server function is atomic and tested.
- [ ] Full validation gates pass.
