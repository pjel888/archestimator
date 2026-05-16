# ADR: Estimate Sheet Grid and Drag-Drop Package Direction

**Date:** 2026-05-16
**Status:** Proposed for MVP planning

## Context

Archestimator needs a highly interactive estimate sheet:

1. User opens a project card.
2. User opens an estimate card/sheet.
3. User opens a material/cost library widget.
4. User drags a material, labor, equipment, subcontract, or assembly item into the estimate sheet.
5. The dropped item becomes an editable estimate line item with a frozen inserted-value snapshot and a source-library link state.

This is more complex than a plain HTML table because the future sheet needs row insertion, keyboard editing, virtualized rows, drag/drop from a side library, selection, copy/paste, and eventually grouped sections/areas.

## Package research snapshot

Checked with `npm view` on 2026-05-16.

- `@glideapps/glide-data-grid` 6.0.3 — MIT — React data grid for displaying/editing large amounts of data with strong performance.
- `@tanstack/react-table` 8.21.3 — MIT — headless table/data-grid primitives; excellent for normal tables but not a spreadsheet engine by itself.
- `react-spreadsheet` 0.10.1 — MIT — simple spreadsheet UI; likely too small for Archestimator's professional estimating workflow.
- `@silevis/reactgrid` 4.1.17 — MIT — spreadsheet-like React grid; useful candidate, but ecosystem/momentum needs deeper spike before adoption.
- `ag-grid-community` 35.3.0 — MIT — powerful data grid, but some advanced enterprise behaviors are paid and it can impose a large framework surface.
- `handsontable` 17.0.1 — custom/commercial license — not a default MVP choice without licensing approval.
- `@dnd-kit/core` 6.3.1 — MIT — accessible React drag/drop library.
- `@atlaskit/pragmatic-drag-and-drop` 1.8.1 — Apache-2.0 — robust cross-framework drag/drop library from Atlassian.

## Decision

Do not install a spreadsheet package in this slice.

For the next estimating-workspace slice, keep the current native table while designing the sheet behind an adapter boundary:

- `EstimateSheet` / `EstimateGrid` component API owns line-item rendering and mutation contracts.
- `CostLibraryPanel` owns library search/filter/drag source behavior.
- `insertLibraryItemIntoEstimate()` remains package-agnostic and creates copied editable rows with source-link metadata.

Recommended technical direction for the first real drag/drop spike:

1. Use `@glideapps/glide-data-grid` as the leading candidate for the main estimate sheet because it is MIT, React-oriented, performant, and spreadsheet-like.
2. Use `@dnd-kit/core` as the leading candidate for library-to-sheet drag/drop if Glide's built-in interactions are insufficient for external drag sources.
3. Keep `@tanstack/react-table` as a possible choice for non-spreadsheet lists, dashboards, proposal history, and admin tables, not the main estimating sheet.
4. Avoid Handsontable unless Philip explicitly approves commercial-license review.
5. Avoid locking the domain model to a grid vendor; all grid rows must map through Archestimator's `EstimateLineItem` model.

## Why not build the full spreadsheet natively?

Native table is acceptable for MVP proof-of-flow, but not for the mature estimating experience. Building spreadsheet-grade selection, keyboard navigation, clipboard, virtualization, resizing, and drag/drop from scratch would waste time and create hidden UX debt.

## Why not install now?

The current recommended slice is project creation, proposal history, and UI primitive hardening. Installing a grid now would mix two large concerns. The correct next step is to create clean UI/domain boundaries now, then run a focused grid spike with 2-3 candidate packages.

## Acceptance criteria for future grid spike

A package should only be adopted if it proves:

- drag from library panel into target section/row;
- insert before/after selected line item;
- keyboard edit quantity/unit costs/status;
- row virtualization for hundreds/thousands of lines;
- copy/paste path from Excel-like sources;
- accessible enough for core workflows;
- can render Archestimator statuses/link states without fighting the library;
- no unacceptable licensing constraints.

## Current implementation implication

Proceed with reusable UI primitives and project/proposal workflows now. In the future grid spike, replace only the estimate sheet presentation layer, not the data model, persistence layer, proposal snapshot model, or cost-library insertion logic.
