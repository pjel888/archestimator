# Spike: Estimate Grid + Library Drag/Drop

**Date:** 2026-05-16
**Branch:** `spike/estimate-grid-glide-dndkit`
**Route:** `/spikes/estimate-grid`
**Status:** Implemented for feasibility testing

## Question

Given Archestimator's canonical `Estimate` data model, when we render estimate rows through a spreadsheet package and drag a cost-library item toward the sheet, then can the UI feel spreadsheet-like without letting package-specific cell objects become the application data model?

## Packages tested

- `@glideapps/glide-data-grid@6.0.3`
- `@dnd-kit/core@6.3.1`
- `@dnd-kit/utilities@3.2.2`

## What was built

- Adapter: `src/lib/estimate-grid/adapter.ts`
  - maps `Estimate` + `EstimateLineItem` to Glide `GridCell`s;
  - applies edited cells back to canonical line items;
  - inserts a copied editable line item from a `CostLibraryItem` at a grid row.
- Prototype route: `src/app/spikes/estimate-grid/page.tsx`
- Client prototype: `src/components/estimate-grid-spike.tsx`
- Unit tests: `tests/unit/estimate-grid-adapter.test.ts`
- E2E smoke coverage for the spike route.

## Findings

### What worked

- Glide can render the existing estimate line items in a spreadsheet-like canvas.
- Cell edits can be routed back through a clean adapter rather than stored as grid-native objects.
- Library item insertion can remain the same copied-row model used by the current workspace.
- `dnd-kit` works well for the draggable tray side of the experience.
- Keeping adapter functions pure made the behavior easy to unit test.

### What is partial

- Native HTML drag/drop onto Glide's canvas is possible through `onDrop`, but combining that with `dnd-kit` is not fully solved in this spike because `dnd-kit` pointer sensors do not automatically produce `DataTransfer` payloads.
- The spike includes both a dnd-kit draggable tray and a fallback insert-row flow. A production version should decide whether to:
  1. use Glide's native `onDrop` with HTML drag/drop; or
  2. use dnd-kit overlays and explicit hit-testing/drop-zone state outside Glide.
- Accessibility and keyboard-edit behavior need deeper validation before production adoption.

### What did not get implemented yet

- Row reordering.
- Section-aware visual drop bands.
- Formula/copy/fill behavior.
- Persisting grid edits through server actions.
- Production-quality cell editors for scope statuses and currency formatting.

## Verdict: PARTIAL / PROMISING

The adapter direction is validated. Glide Data Grid is a credible estimate-sheet candidate, and `dnd-kit` is credible for the material-library tray. The main unresolved risk is the exact drop-target architecture between dnd-kit and Glide's canvas.

## Recommendation for real build

1. Keep `src/lib/estimate-grid/adapter.ts` as the boundary pattern.
2. Run one more focused micro-spike only on drop targeting:
   - option A: pure native HTML drag/drop into Glide `onDrop`;
   - option B: dnd-kit drag overlay with explicit row hit-testing around the grid.
3. If option A or B feels reliable, promote the grid route into the main project estimate workspace.
4. Do not let `GridCell`, `Item`, or Glide row state leak into persistence or proposal calculations.
