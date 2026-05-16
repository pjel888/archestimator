# Estimate Grid Drop Targeting UX Micro-Spike

## Goal

Choose the cleanest and most reliable interaction model for dragging material/cost-library cards into the estimate sheet.

## Decision

Use **dnd-kit overlay + explicit grid row hit-testing** for the contractor-facing drag/drop UX.

Do not rely on native HTML `DataTransfer` as the primary interaction model for production. Native drop into Glide can work technically, but it gives weaker control over micro-interactions and is harder to make premium, predictable, and no-layout-shift.

## Why

The chosen approach gives Archestimator stronger control over:

- card lift/preview styling through `DragOverlay`;
- stable source tray layout while dragging;
- explicit visual drop indicator over the grid;
- row/section intent calculation independent of browser-native drag behavior;
- future support for richer drop targets: room header, section header, exact row, or empty area.

## Legacy v4 lesson used

Legacy `archestimator-frontend-beta_v4` had a useful estimating mental model:

`Sheet → Structure → Floor → Room/Area → items`

The old implementation used area/tree navigation and grouped estimate rows. The lesson to keep is not the old code, but the user workflow:

- contractors can organize work by physical spaces while building the estimate;
- inserting items into a room/area should feel direct;
- the final proposal/BOQ can still consolidate items into clean output sections.

## Implementation in this spike

Route: `/spikes/estimate-grid`

Changed behavior:

- Adds a left space-tree panel to make the room/area hierarchy visible.
- Changes the grid adapter to produce section header rows plus canonical line-item rows.
- Keeps Glide-specific row/cell types inside `src/lib/estimate-grid/adapter.ts`.
- Uses dnd-kit `DragOverlay` for the lifted library card.
- Computes the intended visual insertion line from pointer position and grid bounds.
- Shows a stable insertion-line indicator over the grid instead of shifting layout.
- Supports appending after the final visible line row.
- Inserts a copied editable library item into the resolved section/row.

## Output separation rule

The estimate workspace may be organized by space because that helps the user build faster.

Proposal/PDF output should remain consolidated and client-ready: summary sections, detailed BOQ where needed, inclusions/exclusions, terms, and signature blocks. The workspace organization must not force the output format to mirror every room/space branch.

## Verification

Commands passed:

```bash
bun run validate
bun run build
bun run test:e2e
```

Evidence:

- Unit tests cover section header rows, section-aware insertion targets, append-after-final-row behavior, ignored edits on section rows, and copied editable library insertions.
- E2E smoke confirms the space tree, grid, and library tray render.
- Browser visual inspection confirmed the three-column layout is stable with no obvious overlap or layout shift.
- DOM measurements showed test surfaces had matching `scrollHeight`/`clientHeight` at the inspected viewport:
  - `space-tree`: 208 / 208
  - `estimate-grid-spike`: 590 / 590
  - `library-drag-tray`: 290 / 290

## Remaining risks

- Pointer hit-testing currently assumes fixed row/header heights; production should centralize these constants with the grid config.
- The current space tree is a spike-level visual projection from estimate sections, not the final data model.
- Production data should add explicit space/area hierarchy objects before room-first estimating becomes a committed feature.
- Need browser interaction tests for actual drag path once the production target is chosen.
