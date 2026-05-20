# Estimate Tree Drag Stability Design

**Date:** 2026-05-20
**Status:** Superseded on 2026-05-20 by removal of estimate-tree drag/drop reorganization
**Scope:** `src/components/workshop/EstimateSheetTree.tsx` drag/reorder UX only

> Superseded note: this design is retained only as historical context. Do not implement or restore this drag/drop workflow; the current product state removes estimate-tree drag/drop entirely pending a replacement move design.

## Problem

Reorganizing estimate tree nodes currently feels unstable. While dragging a Group Node or Area Node, the dragged row and landing indicator can flicker, and the drop target is hard to hold. This makes the tree feel unreliable even though the underlying move planner, optimistic reorder, and Supabase persistence path are already covered by tests.

The likely issue is the interaction layer, not the data layer:

- React Complex Tree renders its own between-row drag preview through `renderDragBetweenLine`.
- `EstimateSheetTree` mirrors that preview into local `dropPreview` state.
- Separate custom insertion zones also own hover state through `hoveredInsertionZone`.
- `dragEnter` / `dragLeave` across nested indicator children can clear the custom hover state even when the pointer has not left the intended drop zone.

The result is two competing visual sources of truth for the same user intent.

## Non-Goals

- Do not rewrite estimate move persistence.
- Do not change the hierarchy rules in `tree-hierarchy.ts`.
- Do not replace React Complex Tree or introduce another drag/drop dependency.
- Do not restore the removed Move modal.
- Do not expand this into tree search, keyboard editing, or component-library insertion work.

## Design

Use one canonical drag/drop visual intent for the tree.

### 1. Single Between-Row Intent

Use `EstimateTreeDropPreview` as the canonical between-row/root visual intent inside `EstimateSheetTree`.

React Complex Tree `DraggingPosition` updates that preview through `DropPreviewPositionBridge`. Custom insertion zones may remain as forgiving hit areas, but they must no longer own a separate hover-state source. Hovering a custom zone updates the same `dropPreview` state, and the visible rail is rendered from that state only.

The inside-group target remains tied to `context.isDraggingOver` for valid Group Nodes because it is a distinct drop mode, not another between-row placement rail.

### 2. Stable Indicator Rendering

Render one active rail for between-row/root placement:

- Root top and root bottom remain visually distinct through `data-root-drop-placement`.
- Nested between-row targets use the same rail language but label as `Drop between rows`.
- The rail does not resize every possible gap.
- Pointer movement over rail child elements must not clear the active intent.

Render inside-group feedback only when the canonical intent is `inside`, and keep it visually distinct from between-row placement.

### 3. Drag Leave Guard

Any remaining custom hit zone `dragLeave` logic must ignore leaves where `event.currentTarget.contains(event.relatedTarget)`.

This prevents the indicator from disappearing when the pointer crosses the dot, line, label, or nested child elements inside the same drop zone.

### 4. Preserve Existing Data Behavior

The following must continue unchanged:

- `canDropAt` validates target legality.
- `applyEstimateNodeMoveToTree` provides optimistic UI tree updates.
- `moveEstimateNode` persists through the existing server action/RPC path.
- Successful moves announce through the polite live region.
- Focus returns to the moved node after persistence settles.
- Destination groups do not force-expand after successful moves.

## Alternatives Considered

### Recommended: Stable Single-Intent Layer

Keep React Complex Tree as the semantic DnD engine, but make local visual feedback derive from one intent object. This is the smallest fix that addresses flicker at its source.

### Minimal Patch: Only Guard `dragLeave`

This is lower risk and may reduce flicker, but it leaves the two visual systems competing. It is acceptable only as a first sub-step, not the whole solution.

### Replace Tree DnD

Moving to a custom pointer sensor or dnd-kit tree would increase blast radius and risk. It is not justified for this focused UX defect.

## Acceptance Criteria

- Dragging a Group Node or Area Node shows exactly one landing indicator at a time.
- The indicator does not disappear when moving across its own child elements.
- Root top and root bottom drop targets remain available.
- Nested between-row drops remain available.
- Group hover still shows a distinct `Drop inside` state.
- Invalid drops do not show an actionable indicator.
- Moving a node still updates the visible tree optimistically before persistence resolves.
- Persistence failure still rolls back the visible tree and shows the existing safe error.
- Existing selected-node, focus, expand/collapse, and live-region behavior remain intact.

## Test Plan

Extend `tests/vitest/estimate-tree-optimistic-reorder.test.tsx` with focused DOM tests:

- Hover churn across adjacent insertion zones does not create multiple active previews.
- `dragLeave` with `relatedTarget` inside the same insertion zone does not clear the active preview.
- `dragLeave` to an outside target clears the preview.
- `dragOver` on a valid insertion zone calls `preventDefault`, stops propagation, and sets `dataTransfer.dropEffect = "move"`.
- `dragEnd` clears both preview and custom hit-zone state.
- Existing optimistic move, rollback, root placement, nested placement, and `Drop inside` tests still pass.

When browser auth is available, add or run a Playwright drag smoke test on:

`/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777716`

Manual QA check:

1. Drag a top-level Group Node to the top root slot.
2. Drag a nested Group Node between sibling rows.
3. Drag an Area Node into a valid Group Node.
4. Confirm the rail stays stable and the target remains easy to hold.

## Validation

Minimum focused validation:

```bash
bun run test:dom -- tests/vitest/estimate-tree-move-plan.test.ts tests/vitest/estimate-tree-optimistic-reorder.test.tsx
```

Implementation validation:

```bash
bun run validate
git diff --check
```

Run `bun run build` if route/build behavior changes beyond this component.

## Risk Notes

`EstimateSheetTree.tsx` is a high-blast-radius UI file because it combines tree rendering, drag/drop, optimistic moves, React Query cache updates, route-backed selection, and focus restoration. Keep edits localized to drag intent/indicator code and tests.
