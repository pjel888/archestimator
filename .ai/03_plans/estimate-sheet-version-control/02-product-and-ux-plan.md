# 02 Product and UX Plan

> Historical context notice: this document contains the pre-pivot named-version, compare, and restore-as-copy architecture. Read it as historical context only. The supported current UX is sheet `Activity` plus row details `Version History`; named-version UI/RPC exposure requires a future proposal/export snapshot plan or explicit destructive-cleanup scope.

## User-Facing Concepts

## Survives Activity Pivot

The following concepts remain active guidance:

- row details/Version History should explain row additions, scalar edits, source replacement, delete context, and source snapshot changes;
- sheet Activity should show committed sheet/row events without exposing named versions;
- the shared inspector/card language should stay dense, keyboard reachable, and non-disruptive to spreadsheet blur/Enter commits;
- row history should use the existing row details entry points and must not grow the row grid;
- event reads should be bounded, paginated, and eventually filterable/searchable before broad activity volume grows.

## Historical Named-Version Scope

Named sheet versions, compare, create-version forms, and restore-as-copy UI below are historical pre-pivot context only. They are not current app UX and must not be implemented from this document without a future proposal/export snapshot plan.

### Row History

Every estimate row should expose a compact history log that explains material changes in plain language:

- row added from Component Library or blank/manual row;
- row source replaced, for example `Tile A` changed to `Tile B`;
- quantity changed;
- Misc Cost changed;
- row deleted;
- row restored through a version copy later;
- source snapshot changed because the user explicitly replaced or refreshed the row.

The first UI should be read-only. Row history should show before/after values for material, source component, supplier, category, unit, unit cost, quantity, misc cost, link state, and row total when those fields changed.

V1 row-history entry point:

```text
Current row grid:
grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_92px_108px_30px]

Last 30px action cell today:
- Drag icon button
- Expand icon button
- Delete icon button

V1 behavior:
- Keep the 30px action cell width.
- Do not add a fourth icon.
- Do not assume a dropdown/context menu exists.
- Reuse the existing Expand icon slot as the trigger.
- Build the row details/history surface; it does not exist today.
- Put History as a tab/section inside the new row details panel.
```

The existing row action column in `EstimateSheetContent.tsx` is three plain `Button` icons, not the estimate-tree `ContextMenu`/`ActionMenuGroup` pattern. The Expand button currently has no handler and no backing row-details panel. V1 should wire that button to a new row details/history surface. A later UX pass may replace the icon stack with an overflow menu, but that is a separate design change with its own keyboard and density tests.

Minimum row details/history surface:

```text
Row details panel
------------------------------------------------
Tile B                         Total: PHP 42,300
Source: Component Library / Supplier / Category

Tabs or sections:
Summary | Source snapshot | History

History
10:42  Replaced source: Tile A -> Tile B
10:17  Quantity changed: 10 -> 12
09:55  Link state: linked-clean -> linked-overridden
```

This is new UI work, not a small menu addition. It needs focus management, Escape/close behavior, keyboard reachability from the Expand button, and no interference with quantity/Misc Cost blur commits.

### Sheet History

The estimate sheet should expose a sheet-level version/history control in the existing compact toolbar rhythm. It should include:

- current working sheet;
- named versions;
- recent autosave/event milestones;
- total delta from prior version;
- count of rows added/replaced/edited/deleted;
- create named version action;
- compare selected version to current;
- restore as copy.

V1 sheet-history panel sketch:

```text
EstimateSheetHeader local toolbar: [Version history]

Version history panel
------------------------------------------------
Current working sheet        Total: PHP 1,234,567

Named versions
V2 - Tile substitution       +PHP 42,300   Compare  Restore copy
V1 - Initial baseline        PHP 1,192,267 Compare  Restore copy

Recent activity
10:42  Tile A replaced with Tile B
10:17  Quantity changed: Tile B 10 -> 12
09:55  Blank row added in Floor Finishes
```

The panel should be a dense modal/sheet-style surface, not a large dashboard. It can show a narrow activity feed first and defer full row-by-row diff rendering until compare is selected.

### Named Versions

Named versions are intentional user milestones. Examples:

- `Initial estimate`;
- `V2 - Tile substitution`;
- `Option B - Value engineered`;
- `For contract review`.

Named versions should store a full sheet snapshot and a summary generated from event rows since the previous named version. They should not be a loose label on mutable current state.

### Restore Behavior

First implementation should restore by creating a copy/new estimate from the selected version. It should not overwrite the current working estimate in place. This avoids accidental data loss and aligns with the existing duplicate-sheet model.

### Compare Behavior

Comparison should start with a narrow summary:

- sheet total then vs now;
- rows added;
- rows deleted;
- rows whose source component changed;
- rows whose quantity or misc cost changed;
- group/area totals changed.

A row-level diff can be a list/table before a visual diff. Full side-by-side spreadsheet rendering is not required in the first slice.

Compare summary DTO contract:

```ts
type EstimateVersionCompareSummary = {
  totalThen: number;
  totalNow: number;
  totalDelta: number;
  rowCountThen: number;
  rowCountNow: number;
  addedRows: EstimateVersionCompareRow[];
  deletedRows: EstimateVersionCompareRow[];
  replacedRows: EstimateVersionCompareRow[];
  editedRows: EstimateVersionCompareRow[];
  changedAreas: EstimateVersionCompareArea[];
};
```

`EstimateVersionCompareRow` must include a stable row identity fallback for deleted rows: `rowId`, `nodeId`, `material`, `sourceComponentId`, `sourceComponentVersionId`, `supplierName`, `categoryName`, `quantityThen`, `quantityNow`, `miscCostThen`, `miscCostNow`, `unitCostThen`, `unitCostNow`, `totalThen`, and `totalNow`.

Fields for missing sides must be nullable: added rows have `*Then: null`, deleted rows have `*Now: null`. Do not force fake zero values into deleted-row comparisons.

`EstimateVersionCompareArea` must include `nodeId`, `areaName`, `totalThen`, `totalNow`, `totalDelta`, `rowCountThen`, and `rowCountNow`.

## UX Placement

See `13-ui-design-pass.md` for the historical focused UI design pass covering the shared inspector shell, row details/history tabs, sheet version/history panel, compare mode, responsive behavior, accessibility, and restore-as-copy confirmation dialog. After the Activity-only pivot, use the row details/history and sheet Activity patterns as context only; sheet versions, compare, and restore-as-copy are not the current implementation-facing visual contract.

### Estimate Sheet Toolbar

Add a compact version/history affordance to `EstimateSheetHeader`, which is currently a private local function inside `EstimateSheetContent.tsx`, not a reusable exported component. Implementation should add an `onOpenVersionHistory` prop to that local function or extract it deliberately if the file becomes too large. Do not treat it as an importable component seam.

### Row Surface

Add history access through a new row details/history panel, opened by the existing Expand icon slot in the 30px action column. Do not add a visible always-on history column in the first release; the sheet is already dense. Do not add a fourth icon unless a visual pass proves the 30px column can grow without harming the spreadsheet feel.

### Estimate List

`ProjectEstimatesTable.tsx` already has a disabled `View version history` icon button. V1 must either leave that button disabled with the current "not wired yet" behavior, or wire it to the same sheet-history surface only after route behavior for opening the workspace panel is implemented. Do not create a second estimate-list-only history UI.

## Required Interaction Semantics

- Row edits must still feel spreadsheet-like.
- History recording must not block typing or focus movement.
- Scalar edit history must not build full-sheet snapshots on blur.
- Failed persistence must not create successful-looking history events.
- V1 should have no split-success state where the row update succeeds but the history event fails. If the history write fails, the row mutation should fail through the same server action/RPC result and the existing optimistic rollback/error path should handle the UI.
- Client optimistic state may preview the change, but canonical history ordering must come from the server.
- Same-row stale edits should not silently overwrite a newer committed edit. V1 should use row revision conflict detection; on conflict, rollback/refetch the canonical row and show the existing row-save failure state or a compact conflict message.
- Browser/network retries should not create duplicate events. The same committed user action should reuse one mutation UUID/correlation id through retry.
- Deleting a row must preserve its history context through snapshots, because the row record itself can disappear.
- Event lists must be paginated. V1 should load a first page of 50 events and paginate by `(created_at, id)`.

## Deferred UX

- Branching visual graph of versions.
- Proposal-issued legal record UI.
- Realtime multi-user activity.
- Full workbook-like side-by-side diff.
- AI-authored change summaries.
