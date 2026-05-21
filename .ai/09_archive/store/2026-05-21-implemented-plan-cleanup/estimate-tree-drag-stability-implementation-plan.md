# Estimate Tree Drag Stability Implementation Plan

**Date:** 2026-05-20
**Design spec:** `.ai/06_specs/estimate-tree-drag-stability-design.md`
**Scope:** Focused drag/drop indicator stability in `EstimateSheetTree`.

## Goal

Make estimate-tree reordering feel stable by ensuring a single visible drop indicator owns the drag state at any moment, without changing hierarchy rules, optimistic move planning, persistence, or route-backed selection.

## Acceptance

- Exactly one active drop preview is visible during between-row/root drag placement.
- Indicator state does not clear when the pointer moves over child elements inside the active hit zone.
- Root top, root bottom, nested between-row, and inside-group targets remain distinct.
- Existing optimistic reorder and rollback behavior still pass.
- Focus/live-region behavior after a successful move remains unchanged.

## Implementation Steps

1. Use `EstimateTreeDropPreview` as the single between-row/root visual intent and add helper functions in `EstimateSheetTree.tsx`.
2. Convert `DropPreviewPositionBridge` from a visible indicator into a state bridge for React Complex Tree between-row positions.
3. Make `InsertionDropZone` render the visible active rail only from canonical drop intent state.
4. Update custom hit-zone `dragLeave` handling to ignore child-to-child pointer movement with `relatedTarget` containment.
5. Keep `Drop inside` tied to React Complex Tree item dragging-over state, but avoid overlapping it with between-row intent.
6. Add regression tests for hover churn, child `dragLeave`, outside `dragLeave`, valid `dragOver`, and drag-end cleanup.
7. Run targeted tests, then broader validation if the focused tests pass.

## Files

- `src/components/workshop/EstimateSheetTree.tsx`
- `tests/vitest/estimate-tree-optimistic-reorder.test.tsx`
- Existing helpers/tests remain unchanged unless the implementation exposes a necessary helper.

## Verification

Run:

```bash
bun run test:dom -- tests/vitest/estimate-tree-move-plan.test.ts tests/vitest/estimate-tree-optimistic-reorder.test.tsx
git diff --check
```

If focused tests pass after code edits, run:

```bash
bun run validate
```

Browser/manual QA remains blocked unless a logged-in browser session or the localhost dev auth service-role key is available.
