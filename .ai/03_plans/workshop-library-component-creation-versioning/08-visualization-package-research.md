# 08 Visualization Package Research

**Date:** 2026-05-23
**Question:** Should the Add Component and versioning implementation add an npm package for better visualization?

## Recommendation

Do **not** add a new visualization package for the first implementation.

The codebase already has the needed interaction primitives, so the route should adopt them instead of adding another visualization package:

- `react-complex-tree@2.6.1`, already used by `/workshop/library`, for accessible folder/tree interaction.
- `HeaderIconToolbar`, already used by the component sheet, for the entry point.
- `Modal`, available as a shared primitive, for the Add Component workflow.
- `ControlSelect`, available as a shared primitive, for compact dropdowns.
- `Badge`, available as a shared primitive, for lifecycle states.
- `EmptyState`, available as a shared primitive, for no-row/no-history states.
- Existing compact tree rows and app density rules in `DESIGN.md`.

The first version should render:

- folder/category selection as a tree/list picker;
- pricing options as compact rows plus a default option dropdown;
- lifecycle state as a badge/dropdown;
- version/status/price history as a vertical timeline/list.

A graph or hierarchy package should be deferred until there is a real graph-shaped user job, such as visualizing branched component versions, supplier relationships, substitution networks, or taxonomy analytics.

## Package Findings

### Keep: `react-complex-tree`

Current project dependency: `react-complex-tree` is already installed.

Current npm check:

- version: `2.6.1`
- license: MIT
- peer dependency: `react >=16.0.0`

Fit:

- Already used by the route.
- Accessible tree semantics and keyboard/tree behavior match the current UI.
- No extra dependency churn.
- Best fit for folder/category selection in the modal.

Decision: use it for folder/category pickers in this slice.

### Defer: `@xyflow/react`

Current npm check:

- version: `12.10.2`
- license: MIT
- dependencies include `zustand`, `@xyflow/system`, and `classcat`
- peer dependencies: `react >=17`, `react-dom >=17`

Fit:

- Strong option for node-link graphs and canvas-like workflows.
- Useful later for component lineage, supplier substitution graphs, or version branching.
- Overkill for a modal that needs a tree picker and price/history list.

Decision: do not install now. Re-evaluate only if the UI becomes a graph/canvas workflow.

### Avoid for this slice: `react-arborist`

Current npm check:

- version: `3.7.0`
- license: MIT
- dependencies include `react-dnd`, `react-dnd-html5-backend`, `react-window`, `redux`, and `use-sync-external-store`
- peer dependencies: `react >=16.14`, `react-dom >=16.14`

Fit:

- Good tree package generally.
- Duplicates `react-complex-tree` and adds meaningful dependency surface.
- Would create two tree interaction models in the same route family.

Decision: avoid unless the project intentionally migrates away from React Complex Tree.

### Avoid for React 19 app surfaces: `@visx/hierarchy`

Current npm check:

- version: `3.12.0`
- license: MIT
- peer dependency range: React 16/17/18 prerelease ranges, not React 19.

Fit:

- Useful for static hierarchy charts.
- Not aligned with the current React 19 app dependency contract.
- Not needed for an editable modal tree picker.

Decision: avoid for this slice.

### Watchlist: `@headless-tree/react`

Current npm check:

- version: `1.7.0`
- license: MIT
- peer dependencies: `@headless-tree/core`, `react`, `react-dom`

Fit:

- Relevant only as a possible future successor/migration candidate for existing tree infrastructure.
- Would still be a tree-system migration, not a visualization add-on.

Decision: do not add during Add Component work.

## UI Visualization Plan Without New Packages

### Categorization

Use existing tree package and list UI:

- left side of modal: selected folder/category path;
- embedded compact tree for folder selection;
- modal-local taxonomy picker for reporting category selection, backed by existing `categoryTree` data;
- breadcrumbs for confirmed path;
- optional supplier select/list.

### Pricing Options

Use compact rows:

```txt
[ Retail quote      PHP 12,500 / set   default ]
  Wilcon / 2026-05-17 / Demo seed

[ Allowance         PHP 14,000 / set           ]
  Contractor allowance / 2026-05-23
```

The dropdown should switch the default/active option, while the row list makes all options visible.

### Version History

Use vertical timeline/list:

```txt
v3  Price changed      2026-05-23
    Retail quote from PHP 12,500 to PHP 13,200

v2  State changed      2026-05-22
    available -> discontinued

v1  Component created  2026-05-21
```

This is more scannable and cheaper than a graph for the first implementation.

## Sources Checked

- npm package metadata through `npm view`.
- React Flow / xyflow package and docs search.
- React Complex Tree npm package.
- React Arborist npm package.
- visx hierarchy npm package.
