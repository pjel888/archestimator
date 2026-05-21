# shadcn Context Menu Readiness Audit

**Date:** 2026-05-21
**Mode:** Documentation-only audit
**Scope:** Estimate tree Group Node and Area Node rows first; reusable menu architecture for later filter and icon menus.

## Summary

The estimate tree is the correct first integration point. It is a client component, owns the visible React Complex Tree row rendering, and already centralizes tree selection, drag/drop, add-node actions, and local cache updates.

The codebase is ready for a shadcn Context Menu primitive, but not ready for `Rename` and `Delete` without backend work. `createEstimateNode` and `reorderEstimateTreeNodes` exist; `renameEstimateNode` and `deleteEstimateNode` do not.

The first draft was not explicit enough about UX. The required interaction is now:

- `Rename` turns the clicked Group/Area row into an inline input in place.
- `Delete` removes the node optimistically from the visible tree and query cache after confirmation, without full reload, `router.refresh()`, or a server-action redirect.

## Local Evidence

| Area | Evidence | Meaning |
| --- | --- | --- |
| Target route | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:37` renders tree, sheet, and sidebar. | The left tree is available as a client island inside a server route. |
| Tree owner | `src/components/workshop/EstimateSheetTree.tsx:172` exports `EstimateSheetTree`. | Context menu wiring belongs here for the first pass. |
| Tree row rendering | `src/components/workshop/EstimateSheetTree.tsx:577` customizes React Complex Tree `renderItem`; `:635` renders the interactive row button. | The future `ContextMenuTrigger asChild` should wrap this row button, not the whole tree. |
| Selection behavior | `EstimateSheetTree.tsx:513-524` updates scoped selected-node state, focus override, and route navigation. | Right-click must not trigger primary navigation unless Radix/DOM events do it explicitly. |
| Existing toolbar icons | `src/components/ui/header-icon-toolbar.tsx:51-88` renders filter/group/add/expand/collapse icon actions. | Future icon menu work should use the same shared action model, not tree-local menu code. |
| Tooltip portal | `src/components/ui/toolbar-tooltip.tsx:49-59` portals tooltips to `document.body` with `z-[1100]`. | Context menu must also portal and use a compatible z-index policy. |
| Modal portal | `src/components/ui/modal.tsx` is already tested for fixed viewport portal behavior. | Delete confirmation can initially use existing `Modal` to avoid pulling Alert Dialog into the first shadcn pass. |
| Current shadcn state | No `components.json` found; `package.json` has no `@radix-ui/react-context-menu`, no `lucide-react`, and no `tw-animate-css`. | shadcn CLI setup is prerequisite work. |
| Tailwind v4 | `src/app/globals.css:1` imports Tailwind CSS; `:31` uses `@theme inline`; `package.json` uses `tailwindcss` v4. | shadcn must be configured for Tailwind v4 with an empty tailwind config path. |
| `cn` helper | `src/lib/ui/cn.ts:4-6` exports `cn` using `clsx` and `tailwind-merge`. | shadcn generated code should use this helper through a stable alias. |
| Compact UI contract | `.ai/03_plans/ui-componentization-and-storybook-plan.md` sets 12px max outside landing and 10px default controls. | Generated shadcn styles need to be compacted before use. |

## shadcn/Radix Docs Findings

Evidence from current docs checked on 2026-05-21:

- shadcn Context Menu installs via the shadcn CLI and exposes `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, groups, separators, submenus, checkbox/radio items, shortcuts, icons, and destructive variants.
- shadcn requires `components.json` only when using the CLI. The docs state Tailwind v4 projects should leave `tailwind.config` blank and point `tailwind.css` to the CSS file that imports Tailwind.
- shadcn Tailwind v4 docs state new components support Tailwind v4 and React 19, use `data-slot` attributes, remove old `forwardRef` patterns, and deprecate `default` style in favor of `new-york`.
- Radix Context Menu is specifically for menus located at the pointer, triggered by right click or long press. It supports modal/non-modal modes, focus management, keyboard navigation, typeahead, collision handling, and portals.

## Architecture Fit

### What Fits Well

- Radix Context Menu solves the accessibility and portal/focus work that a custom menu would otherwise need.
- shadcn's copied-component model fits this repo's existing `src/components/ui` ownership pattern.
- The existing UI stack already has `clsx`, `tailwind-merge`, and `class-variance-authority`.
- Tailwind v4 and React 19 are first-class in current shadcn docs.

### What Does Not Fit Automatically

- shadcn defaults are visually larger than Archestimator's app scale. Menu content and items must be compacted to 10px text, tight padding, crisp borders, and the existing black/white/orange/danger palette.
- shadcn defaults expect semantic variables such as popover/border/ring/destructive. Archestimator already has custom variables in `globals.css`; the future implementation should map shadcn variables to existing tokens rather than replacing the design language.
- Context Menu is not the right trigger primitive for normal left-click filter icon menus. Future icon menus should share the same action item/content styling, but likely use shadcn Dropdown Menu or Popover as the left-click trigger adapter.

## Estimate Tree Findings

The left tree currently:

- uses React Complex Tree with custom renderers;
- allows drag/drop reorganization through `canDragAndDrop`, `canReorderItems`, `canDropOnFolder`, `onDrop`, and custom root drop zones;
- stores local optimistic tree state in `localNodes`;
- syncs with TanStack Query key `estimateQueryKeys.areaTree(estimateId)`;
- uses Zustand-backed selected and expanded state through `useEstimateWorkspaceSelection` and `useEstimateWorkspaceExpansion`;
- renders every visible node as a `button` with `data-estimate-tree-node-id`.

Implications for the context menu:

- Wrap only the row button with `ContextMenuTrigger asChild`.
- Do not attach the menu to root drop zones or the tree container.
- Preserve RCT drag/drop props from `context.interactiveElementProps`.
- Keep arrow expand/collapse outside the context menu trigger path.
- Ensure context menu opening does not start a drag or trigger route navigation.
- Use the node object from `item.data.node` as the action target.

## Rename/Delete Backend Gap

Existing server actions:

- `createEstimateNode(projectId, estimateId, formData)` inserts a validated Group or Area node and redirects to the new node.
- `reorderEstimateTreeNodes(projectId, estimateId, input)` validates node and parent scope, calls `reorder_estimate_nodes`, and returns a refreshed tree.
- row-level insert/update/replace/delete actions exist for estimate row items.

Missing server actions:

- `renameEstimateNode(projectId, estimateId, nodeId, name)`
- `deleteEstimateNode(projectId, estimateId, nodeId)`

These server actions should not call `redirect()`. The existing `createEstimateNode` action redirects because creating a new route target is its job. Rename/delete must be different: the client already owns the visible tree, selected node, focused row, and route reconciliation, so the server action should validate, mutate, and return enough data for the client to confirm or correct optimistic state.

Delete is sensitive because the database schema has cascading relationships:

- `estimate_nodes.parent_id references public.estimate_nodes(id) on delete cascade`
- `estimate_row_items.node_id references public.estimate_nodes(id) on delete cascade`

That means deleting a Group Node can delete its full subtree and all row items under descendant Area Nodes. The UI must make this explicit through confirmation. The context menu can include `Delete`, but selecting it should open a confirmation modal rather than deleting immediately.

## Revised Product Interaction Contract

### Rename

Evidence: the tree row button is rendered in `EstimateSheetTree.tsx:635-678`, with the title inside `data-estimate-tree-title-offset`. That is the correct insertion point for inline editing.

Required behavior:

- Choosing `Rename` from the context menu closes the menu and sets `editingNodeId`.
- The same tree row replaces only the title text with a compact input.
- The folder/cube icon and indentation remain stable so the row does not jump.
- The input is focused on the next animation frame and the current name is selected.
- `Enter` commits, `Escape` cancels, and blur commits if the value is valid and changed.
- Empty trimmed names do not commit; the row stays in edit mode and exposes a compact error message through the existing status area or row-local `aria-describedby`.
- During edit, dragging that row is disabled and primary route navigation is suppressed.
- On success, update `localNodes`, `estimateQueryKeys.areaTree(estimateId)`, and keep current selection/focus intact.
- On failure, rollback to the previous tree and keep the input open with the failed value so the user can correct it.

### Delete

Required behavior:

- Choosing `Delete` from the context menu opens confirmation.
- Confirming delete immediately removes the node/subtree from `localNodes` and `estimateQueryKeys.areaTree(estimateId)`.
- No `router.refresh()` is allowed.
- The server action must not call `redirect()`.
- If the deleted node or one of its descendants is currently selected, the client immediately selects a fallback node before or at the same time as the optimistic removal.
- Route reconciliation uses `router.replace()` only when the URL points at a deleted node or descendant. This is client-side navigation, not a full reload, and must happen after local state is already updated.
- If no fallback node exists, route to `/workshop/projects/${projectId}/estimates/${estimateId}` and let the current route fallback render the empty estimate state.
- On server failure, restore the previous tree/query cache/selection and show a compact error status.

## Current Test Coverage Relevant To This Work

| Test file | Current coverage |
| --- | --- |
| `tests/vitest/estimate-tree-modal.test.tsx` | Tree toolbar, add Group/Area actions, optimistic add, rollback, area/root restrictions. |
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | React Complex Tree drag/drop behavior and reorder integration. |
| `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx` | DOM-facing RCT affordances. |
| `tests/vitest/estimate-node-reorder-action.test.ts` | Server action and reorder RPC behavior, plus create-node tests. |
| `tests/vitest/ui-modal-tooltip.test.tsx` | Portal expectations for modal and toolbar tooltip primitives. |
| `tests/vitest/component-library-ui.test.tsx` | Toolbar filter icon behavior, filter panel, group toggling, and component actions. |

## Readiness Verdict

Ready to implement after creating the shadcn setup and backend node actions.

The implementation should be done in three thin slices:

1. Add and style the shadcn Context Menu primitive with a reusable action-menu API and tree right-click menu.
2. Add inline rename with optimistic local/query-cache update.
3. Add instant optimistic delete with confirmation, client-owned fallback selection, no reload, no `router.refresh()`, and no server redirect.

Do not combine this first shadcn pass with broader icon menu, Dropdown Menu, Popover, filter redesign, Storybook setup, or app-wide primitive migration.
