# Blast Radius and Risk Analysis

**Date:** 2026-05-21
**Tooling used:** code-review-graph MCP plus local file inspection
**Future change scope analyzed:** `EstimateSheetTree`, a new shared shadcn `context-menu` primitive, action-menu abstraction, server node actions, and related tests.

## Graph Evidence

code-review-graph minimal context reported:

- 620 nodes
- 6235 edges
- 136 files
- key communities: `workshop-estimate`, `estimates-estimate`, `workshop-project`
- initial repo risk: low before planned edits

Architecture overview highlighted:

- `workshop-estimate` community centered on `src/components/workshop/EstimateSheetContent.tsx`
- `workshop-node` community centered on `src/components/workshop/EstimateSheetTree.tsx`
- `estimates-estimate` community centered on `src/lib/estimates/actions.ts`
- existing warning: high coupling between `workshop-estimate` and `ui-cn`

## Focused Impact Results

Initial projected edit set:

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/ui/context-menu.tsx`
- `tests/vitest/estimate-tree-modal.test.tsx`
- `tests/vitest/ui-modal-tooltip.test.tsx`

code-review-graph `get_impact_radius` at depth 1 returned:

- 25 directly changed nodes
- 30 impacted nodes within one hop
- 15 additional files affected
- risk: high
- key entities included:
  - `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
  - `ProjectEstimateNodePage`
  - `src/components/ui/button.tsx`
  - `Button`
  - `src/components/ui/control-input.tsx`

At depth 2 for only `EstimateSheetTree.tsx` plus a future `context-menu.tsx`, the graph reported:

- 11 directly changed nodes
- 286 impacted nodes within two hops
- 94 additional files affected

Interpretation:

- The immediate code edit is narrow.
- The transitive impact is broad because `EstimateSheetTree` is part of the live estimate workspace route and imports shared UI/state/data paths.
- The future implementation must be treated as a high-risk UI/data mutation slice, not as a cosmetic component add.

After adding the expected server/action-menu files to the projection:

- projected edit set: `EstimateSheetTree.tsx`, `src/lib/estimates/actions.ts`, `src/components/ui/context-menu.tsx`, `src/components/ui/action-menu.tsx`
- `get_impact_radius` depth 1 reported 36 directly changed nodes, 47 impacted nodes, 22 additional files affected, risk high
- key impacted entities again included `ProjectEstimateNodePage`, `Button`, and `ControlInput`

Interpretation: the revised no-reload strategy improves UX but increases the need for careful local state and rollback tests.

## Direct Callers and Importers

`EstimateSheetTree` direct callers:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx::ProjectEstimateNodePage`
- `tests/vitest/estimate-tree-modal.test.tsx::renderTree`

`EstimateSheetTree.tsx` direct importers:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `tests/vitest/estimate-tree-modal.test.tsx`

Direct caller count is small, which makes the first UI integration manageable. The risk comes from the tree's internal responsibilities: RCT rendering, selection, route navigation, drag/drop, server actions, optimistic state, query cache, and toolbar behavior all meet in one file.

## Affected Execution Flows

code-review-graph `get_affected_flows` reported 6 affected flows for the planned tree/UI primitive change set. The largest affected path is `ProjectEstimateNodePage` with criticality `0.7207`, passing through:

- `ProjectEstimateNodePage`
- `getProjectEstimateTreeByNode`
- `ProjectEstimateMetadataPublisher`
- `EstimateSheetTree`
- `EstimateSheetContent`
- `EstimateRightSidebar`
- `buildEstimateTree`
- `useEstimateWorkspaceSelection`
- `ResizableSidePanel`
- `HeaderIconToolbar`
- `cn`
- `Modal`
- `ToolbarIconButton`
- estimate row mutation actions

The remaining affected flows are Vitest flows around tree add-node, parent-choice, default root group, and UI portal behavior.

## Risk Register

| Risk | Severity | Why it matters | Mitigation |
| --- | --- | --- | --- |
| Context menu opens and also triggers node navigation | High | Tree rows are buttons with primary action bound to route navigation. | Use `ContextMenuTrigger asChild`, test `contextmenu` event, and verify no `router.push` on right-click. |
| Context menu conflicts with drag/drop | High | RCT uses drag props on the same row button. | Preserve RCT props, avoid custom `onMouseDown`, test existing DnD suite after menu integration. |
| Delete cascades more data than expected | High | `estimate_nodes` and `estimate_row_items` cascade on delete. | Menu `Delete` opens confirmation; server action scopes project/estimate/node; tests cover area and group deletion semantics. |
| Deleted selected node leaves route on missing node id | High | Route path is node id based. | Client computes fallback before optimistic delete, updates selection immediately, and uses `router.replace()` only when current route points at a deleted node/descendant. |
| Rename/delete bypass project/workspace scope | High | Tree data is protected by Supabase/Auth scope. | Follow `createEstimateNode` validation pattern with `getCurrentWorkspaceProject`, estimate project check, and node estimate check. |
| Delete causes page reload or visible refresh | High | User explicitly requires instant behavior. | Server action must not call `redirect()`; client must not call `router.refresh()`; tests assert both. |
| Inline rename breaks RCT keyboard/focus behavior | High | Row buttons currently own tree focus and primary action. | Render input only inside title span, stop key propagation, disable drag while editing, restore focus after commit/cancel. |
| Optimistic delete rollback loses selection | High | Local tree, query cache, selected node, and route can diverge. | Snapshot previous tree, selected id, focused item, and URL target before delete; restore all on failure. |
| Generated shadcn styles violate 12px app text max | Medium | Project has strict compact UI governance. | Customize `context-menu.tsx` immediately after generation and run `bun run lint:font-size`. |
| shadcn CLI overwrites or changes existing primitives unexpectedly | Medium | `src/components/ui` already contains custom primitives. | Add only `context-menu`; inspect diff; do not run `add --all` or overwrite unrelated components. |
| Missing shadcn semantic CSS variables | Medium | Current `globals.css` has Archestimator tokens, not all shadcn variables. | Either map missing variables to existing tokens or adapt generated component classes to existing tokens. |
| Portal layering conflicts with tooltip/modal | Medium | Tooltip uses `z-[1100]`; modal root uses `z-[1000]`. | Set context menu content z-index deliberately and add portal test. |
| Filter/icon menu reuse incorrectly forces Context Menu for left-click | Medium | Radix Context Menu is right-click/long-press oriented. | Create shared action menu content model; use Context Menu for right-click now and Dropdown Menu/Popover adapter later for icon click. |

## File-Level Blast Radius

| File | Future role | Risk |
| --- | --- | --- |
| `components.json` | New shadcn CLI config. | Low, but wrong aliases create bad imports. |
| `src/lib/ui/index.ts` | Optional alias target exporting `cn`. | Low. |
| `src/components/ui/context-menu.tsx` | Generated and customized shadcn primitive. | Medium due shared UI primitive behavior. |
| `src/components/ui/index.tsx` | Export new primitive. | Low. |
| `src/components/ui/action-menu.tsx` or equivalent | Shared action item/content model for context and later icon menus. | Medium because it sets future architecture. |
| `src/components/workshop/EstimateSheetTree.tsx` | Initial right-click trigger and Rename/Delete UI state. | High because it owns RCT, routing, state, DnD, and add-node behavior. |
| `src/lib/estimates/actions.ts` | Add project-scoped rename/delete node actions. | High because it mutates persisted estimate hierarchy. |
| `src/lib/repositories/workspace-repository.ts` | Possibly reuse tree rebuild/fallback helpers. | Medium if touched; avoid if possible. |
| `tests/vitest/estimate-tree-context-menu.test.tsx` | New focused UI tests. | Low. |
| `tests/vitest/estimate-node-actions.test.ts` or existing action tests | Server action tests for rename/delete. | Medium. |
| `tests/vitest/ui-modal-tooltip.test.tsx` | Add context menu portal/layer test. | Low. |

## Implementation Guardrails

- Do not install broad shadcn sets. Use only `context-menu` for the first pass.
- Do not replace existing `Button`, `Modal`, `ToolbarIconButton`, `SearchInput`, `Badge`, or `Chip`.
- Do not add Storybook in this slice.
- Do not implement icon-triggered filter menus in the first slice unless the tree context menu is stable.
- Do not immediately delete on context menu item select. Open confirmation first.
- Do not hand-roll focus management or pointer positioning.
- Do not use `router.refresh()` for rename/delete.
- Do not call `redirect()` from `renameEstimateNode` or `deleteEstimateNode`.
- Do not delay visible delete until the server returns; confirm, optimistically remove, then rollback on failure.
- Do not navigate after delete unless the current selected/route node was deleted or was inside the deleted subtree.

## Required Verification For Future Code Pass

Minimum verification after implementation:

```bash
bun run type-check
bun run lint
bun run lint:font-size
bun run test:dom -- tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-modal.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/ui-modal-tooltip.test.tsx
git diff --check
```

Preferred full gate:

```bash
bun run validate
bun run build
git diff --check
```

Browser smoke when local dev auth is available:

- open the target URL;
- right-click a Group Node and an Area Node;
- verify menu placement, compact styling, `Rename`, and `Delete`;
- verify Rename converts the clicked row into an inline input and updates the row;
- verify Delete opens confirmation, removes the node instantly, and does not reload the page;
- verify drag/drop still works after context menu integration;
- verify filter toolbar still opens its existing filter panel until the future icon-menu adapter is implemented.
