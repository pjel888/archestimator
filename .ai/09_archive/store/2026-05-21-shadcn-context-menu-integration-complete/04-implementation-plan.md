# shadcn Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Closeout note — 2026-05-21 PHT:** The first target in this plan is implemented and archived. The unchecked task boxes below are historical execution scaffolding, not open work. The later state-first architecture supersedes the Task 5 rename shape: rename now returns `{ nodeId, name }`, does not return/reapply a full tree, does not call active-route `revalidatePath()`, and does not redirect. Delete/reorder remain structural tree reconciliation paths.

**Goal:** Add a shadcn/Radix context menu to Group Node and Area Node rows in the estimate tree, with inline `Rename` and instant optimistic `Delete`, while creating a reusable foundation for future filter/icon menus.

**Architecture:** Install one shadcn primitive, adapt it to Archestimator's compact token system, then compose it through a small action-menu abstraction. Tree edits use local pure helpers for rename/delete tree transforms so the React Complex Tree component stays focused on UI wiring. Server actions validate and persist without redirecting; the client owns optimistic state, rollback, fallback selection, and no-refresh URL reconciliation.

**Tech Stack:** Next.js 16 App Router, React 19, Bun, TypeScript, Tailwind CSS v4, shadcn/ui, Radix Context Menu, TanStack Query, Zustand, Supabase server actions, Vitest DOM tests.

---

## Implementation Rules

- No broad shadcn install. Add only context-menu in the first pass.
- No Storybook setup in this slice.
- No replacement of existing `Button`, `SearchInput`, `Modal`, `ToolbarIconButton`, `ToolbarTooltip`, `Badge`, or `Chip`.
- Preserve React Complex Tree drag/drop and primary navigation behavior.
- `Rename` must be inline in the tree row; do not use modal/drawer rename for this first tree action.
- `Delete` menu item opens confirmation; it must not delete immediately.
- Confirmed delete must be instant from the user's perspective: optimistic local tree/query-cache removal first.
- Do not call `router.refresh()` for rename/delete.
- Do not call `redirect()` from rename/delete server actions.
- Keep all app/workshop visible text at or below 12px.
- Run graph impact before editing each modified symbol, per project rules.

## Planned Files

Create:

- `components.json` - shadcn CLI config for Tailwind v4 and existing aliases.
- `src/lib/ui/index.ts` - exports existing `cn` for shadcn `aliases.utils`.
- `src/components/ui/context-menu.tsx` - shadcn generated primitive, customized to Archestimator scale.
- `src/components/ui/action-menu.tsx` - reusable action item/content abstraction for context menu now and future icon menus.
- `src/lib/estimates/estimate-tree-edit.ts` - pure local helpers for rename/delete optimistic transforms, descendant lookup, and fallback node selection.
- `tests/vitest/estimate-tree-context-menu.test.tsx` - right-click and menu action UI tests.
- `tests/vitest/estimate-tree-edit.test.ts` - pure helper tests for rename/delete/fallback selection.

Modify:

- `package.json` and `bun.lock` - add exact dependencies produced by `shadcn add context-menu`.
- `src/app/globals.css` - only if needed to map shadcn semantic variables to existing tokens.
- `src/components/ui/index.tsx` - export context/action menu primitives if useful.
- `src/components/workshop/EstimateSheetTree.tsx` - wrap node row buttons with context menu trigger and add rename/delete state handling.
- `src/lib/estimates/actions.ts` - add no-redirect `renameEstimateNode` and `deleteEstimateNode` server actions.
- `tests/vitest/estimate-node-reorder-action.test.ts` or new `tests/vitest/estimate-node-actions.test.ts` - server action coverage.
- `tests/vitest/ui-modal-tooltip.test.tsx` - portal/layering coverage for context menu if not covered elsewhere.
- `.ai/03_plans/ui-componentization-and-storybook-plan.md` - add ContextMenu/ActionMenu to the primitive matrix after implementation.
- `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` - update if the implementation changes active architecture.

## Task 1: Prepare shadcn CLI Configuration

- [ ] Confirm the working tree and branch.

Run:

```bash
git status --short --branch
```

Expected: note unrelated changes and do not overwrite them.

- [ ] Create `components.json` with Tailwind v4 config, `new-york` style, and aliases from `03-styling-and-shadcn-architecture.md`.

- [ ] Create `src/lib/ui/index.ts`:

```ts
export { cn } from "./cn";
```

- [ ] Run:

```bash
bunx shadcn@latest add context-menu
```

Expected: adds `src/components/ui/context-menu.tsx` plus only required dependencies.

- [ ] Inspect the generated diff.

Run:

```bash
git diff -- package.json bun.lock components.json src/app/globals.css src/components/ui/context-menu.tsx src/lib/ui/index.ts
```

Expected: no unrelated primitive overwrite and no broad shadcn component set.

## Task 2: Customize the Generated Context Menu Primitive

- [ ] Edit `src/components/ui/context-menu.tsx` to use Archestimator density and tokens:
  - item text `text-[10px]`;
  - compact item height around 26px to 28px;
  - `border-hairline`, `bg-white`, `text-ink`, `text-tertiary`, `text-danger`;
  - `z-[1050]` for content/subcontent unless tests require another value;
  - destructive item variant uses danger text and danger-soft hover;
  - keep Radix data attributes and keyboard/focus support intact.

- [ ] Export the primitive from `src/components/ui/index.tsx` only if consumers will import from the barrel.

- [ ] Add a focused primitive test if portal/layering is not already covered by tree tests.

## Task 3: Add Shared Action Menu Model

- [ ] Create `src/components/ui/action-menu.tsx`.

Minimum API:

```ts
export type ActionMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  tone?: "default" | "destructive";
  disabled?: boolean;
  onSelect: () => void;
};

export type ActionMenuGroup = {
  id: string;
  items: ActionMenuItem[];
};
```

- [ ] Implement a renderer that maps groups/items to shadcn `ContextMenuGroup`, `ContextMenuItem`, `ContextMenuSeparator`, and optional shortcut.

- [ ] Keep this renderer trigger-agnostic enough that a later Dropdown Menu adapter can reuse the same item model.

## Task 4: Add Pure Tree Edit Helpers

- [ ] Create `src/lib/estimates/estimate-tree-edit.ts`.

The helper module owns local optimistic transforms, not server calls.

Required exports:

```ts
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

export type EstimateTreeDeletePlan = {
  nextNodes: EstimateTreeNode[];
  deletedNodeIds: Set<string>;
  fallbackNodeId: string | null;
};

export function renameEstimateTreeNode(
  nodes: EstimateTreeNode[],
  nodeId: string,
  name: string,
): EstimateTreeNode[];

export function getEstimateTreeNodeAndDescendantIds(
  nodes: EstimateTreeNode[],
  nodeId: string,
): Set<string>;

export function planEstimateTreeDelete(
  nodes: EstimateTreeNode[],
  nodeId: string,
  selectedNodeId: string | null,
): EstimateTreeDeletePlan;
```

- [ ] Implement fallback selection in this order:
  - next sibling after the deleted node;
  - previous sibling before the deleted node;
  - parent node;
  - first remaining visible node in depth-first order;
  - `null` when the tree becomes empty.

- [ ] Preserve original node ordering and structure outside the edited/deleted subtree.

- [ ] Add `tests/vitest/estimate-tree-edit.test.ts` cases:
  - rename changes only the target node name;
  - rename preserves children and row items;
  - deleting an Area Node removes only that Area Node;
  - deleting a Group Node removes descendants;
  - fallback prefers next sibling;
  - fallback uses parent when no sibling remains;
  - fallback returns `null` for empty tree.

## Task 5: Add Server Actions For Rename and Delete

- [ ] In `src/lib/estimates/actions.ts`, add a shared node validation helper following the existing project/estimate checks in `createEstimateNode`.

Validation must prove:

- project exists in the current workspace;
- estimate id belongs to project;
- node id belongs to estimate;
- node belongs to that project through the estimate relation.

- [ ] Add `renameEstimateNode(projectId, estimateId, nodeId, formDataOrName)`.

Behavior:

- trim name;
- reject empty names;
- update only `estimate_nodes.name`;
- revalidate `/workshop/projects/${project.id}/estimates`;
- revalidate `/workshop/projects/${project.id}/estimates/${nodeId}`;
- return `{ tree, nodeId, name }`;
- never call `redirect()`;
- never call `router.refresh()` from the client after this action.

- [ ] Add `deleteEstimateNode(projectId, estimateId, nodeId)`.

Behavior:

- validate scope;
- delete the node scoped by `id` and `estimate_id`;
- rely on database cascade only after confirmation UI has warned about descendants/rows;
- revalidate estimate paths;
- return `{ tree, deletedNodeIds, fallbackNodeId }` where `fallbackNodeId` can be `null`;
- never call `redirect()`.

- [ ] Add server action tests for:
  - rename trims and updates scoped node;
  - rename rejects empty names;
  - delete scopes project/estimate/node;
  - delete returns refreshed tree and deleted ids;
  - delete action source contains no `redirect(` call.

## Task 6: Integrate Context Menu Into EstimateSheetTree

- [ ] In `EstimateSheetTree.tsx`, import the new action menu primitives and server actions.

- [ ] Add local UI state:
  - `editingNodeId`;
  - `editingNodeName`;
  - `editingNodeError`;
  - delete target node;
  - pending action status;
  - rollback snapshots for tree, selected node, and focus where needed.

- [ ] In `renderItem`, create menu actions from `node`:
  - `Rename`
  - `Delete`

- [ ] Wrap the existing row `button` with `ContextMenu` and `ContextMenuTrigger asChild`.

Important: preserve all existing RCT props, drag handlers, `aria-current`, data attributes, selected styling, and `buttonClassName` merge.

- [ ] Ensure right-click opens the menu without calling the primary action route navigation.

- [ ] Implement `Rename`:
  - selecting menu item sets `editingNodeId` and `editingNodeName`;
  - render a compact inline input inside the row title area in place of the name;
  - keep icon, row height, selected background, and indentation stable;
  - focus and select the input value on the next animation frame;
  - `Enter` commits;
  - `Escape` cancels;
  - blur commits if trimmed value is valid and changed;
  - empty trimmed value keeps edit mode open and shows a compact error;
  - stop propagation for input keyboard/pointer events that would trigger RCT navigation;
  - disable drag for the editing row;
  - submit through `renameEstimateNode`;
  - optimistically update `localNodes` and `estimateQueryKeys.areaTree(estimateId)`;
  - rollback on server failure and keep edit mode open with the attempted value.

- [ ] Implement `Delete`:
  - open confirmation modal;
  - state clearly that deleting a group removes child nodes and rows;
  - before the server call, use `planEstimateTreeDelete` to compute `nextNodes`, `deletedNodeIds`, and `fallbackNodeId`;
  - snapshot previous `localNodes`, query cache, selected node id, and focused item;
  - optimistically set `localNodes` and `estimateQueryKeys.areaTree(estimateId)` to `nextNodes`;
  - if `activeSelectedNodeId` is deleted, immediately set selected node to fallback;
  - if current URL points at a deleted node or descendant, call `router.replace()` to the fallback route in `startTransition`;
  - do not call `router.refresh()`;
  - submit through `deleteEstimateNode`;
  - reconcile with returned `tree`;
  - rollback tree/query-cache/selection/focus on failure.

## Task 7: Add UI Tests

- [ ] Create `tests/vitest/estimate-tree-context-menu.test.tsx`.

Required tests:

- right-clicking a Group Node opens a menu with `Rename` and `Delete`;
- right-clicking an Area Node opens a menu with `Rename` and `Delete`;
- right-clicking a node does not call `router.push`;
- selecting `Rename` converts that row title into an inline input with the current node name selected;
- `Escape` cancels inline rename and restores the original row text;
- `Enter` commits inline rename optimistically and calls the server action;
- blur commits inline rename when value changed;
- empty rename keeps input open and shows an error;
- submitting rename calls the server action with project id, estimate id, node id, and trimmed name;
- selecting `Delete` opens confirmation instead of deleting immediately;
- confirming delete removes the node from the visible tree before the server action resolves;
- confirming delete does not call `router.refresh`;
- deleting an unselected node does not navigate;
- deleting the selected node updates selected state and uses `router.replace` to fallback;
- delete failure rolls back visible tree and selection;
- menu content is portaled and not clipped by the sidebar container.

- [ ] Extend existing tests only where necessary:
  - `estimate-tree-modal.test.tsx` for interactions with existing add-node toolbar;
  - `estimate-sheet-tree-dnd.test.tsx` for DnD regression if the new wrapper affects row events.

## Task 8: Validate

- [ ] Run targeted validation:

```bash
bun run type-check
bun run lint
bun run lint:font-size
bun run test:dom -- tests/vitest/estimate-tree-edit.test.ts tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-modal.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/ui-modal-tooltip.test.tsx
git diff --check
```

- [ ] If targeted validation passes, run the full code gate:

```bash
bun run validate
bun run build
git diff --check
```

- [ ] Browser smoke with local dev server and dev auth:
  - open the target URL;
  - right-click a Group Node;
  - right-click an Area Node;
  - verify compact menu styling and placement;
  - verify Rename turns the row into an inline input, then commits with Enter and cancels with Escape;
  - verify Delete removes the node instantly after confirmation and does not reload the page;
  - verify selected-node fallback after deleting the selected node;
  - verify tree drag/drop still works;
  - verify existing filter icon still opens the current filter panel until the icon-menu adapter is separately implemented.

## Future Follow-Up Slice

After the tree context menu is stable:

- add a Dropdown Menu or Popover action-menu trigger adapter for filter and toolbar icons;
- migrate `HeaderIconToolbar` filter/group buttons to the shared menu model only when their menus are actually designed;
- consider shadcn `Alert Dialog` for destructive confirmations if more destructive flows repeat;
- update the UI primitive matrix with any repeated pattern that emerges.
