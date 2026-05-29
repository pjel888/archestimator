# 13 UI Design Pass

> Historical context notice: this document contains the pre-pivot named-version, compare, and restore-as-copy architecture. Read it as historical context only. The supported current UX is sheet `Activity` plus row details `Version History`; named-version UI/RPC exposure requires a future proposal/export snapshot plan or explicit destructive-cleanup scope.

**Date:** 2026-05-24
**Scope:** Design/spec pass only. No application code, schema, Supabase types, tests, or visual reference artifacts were implemented.
**Historical surfaces:** Row details/history panel, sheet version/history panel, compare plus restore-as-copy confirmation flow. Current supported UI keeps row details/Version History and sheet Activity only.

## Current UI Evidence

- `EstimateRowItemsTable` uses `grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_92px_108px_30px]`.
- The last 30px action cell already contains three vertical icon buttons: drag, Expand, Delete.
- The Expand button is currently inert: it has no `onClick`, open-row state, details panel, modal, drawer, or history surface.
- Row actions are plain icon `Button`s. They do not use the estimate-tree `ContextMenu` or `ActionMenuGroup` pattern.
- `EstimateSheetHeader` is a private local function in `EstimateSheetContent.tsx`; it is not an exported reusable component.
- Existing modal patterns are dense, square-edged or small-radius, border-led, and use compact app typography.
- Proposal/export preview uses large modal treatment for workbook-like tables, but row/sheet history should be smaller and less disruptive.

## Design Direction

## Survives Activity Pivot

The active UI guidance from this design pass is:

- one shared inspector shell for sheet Activity and row Version History;
- row details opens without changing row grid width or row height;
- sheet Activity opens from the local header toolbar;
- event cards align timestamp, event label, summary, changed fields, and cost delta for quick scanning;
- future event volume needs pagination, type/date filtering, and eventually search;
- actor display and correlation grouping remain required before claiming a complete audit UI;
- focus return, Escape behavior, tab semantics, loading/empty/error states, and no interference with row blur commits remain acceptance requirements.

## Historical Named-Version Scope

The sheet `Versions` tab, compare mode, create-version form, restore-as-copy confirmation, version-title editing, and `versionLabel` display rules below are historical. They are not current acceptance criteria after the Activity-only pivot.

1. Product goal and audience: construction estimators need to audit changes without losing the spreadsheet editing rhythm.
2. Tone: dense, forensic, calm.
3. Historical layout strategy: use one reusable right-side inspector shell for row history and sheet history, plus a focused confirmation dialog for restore-as-copy.
4. Typography: app-scale 8-12px text, tabular numbers for costs and deltas, compact section labels, no hero-scale type.
5. Color and surface strategy: white panels, hairline dividers, restrained accent orange for selected state, amber/red/emerald only for semantic deltas and warnings.
6. Motion strategy: panel slides/fades in quickly, closes without reflowing the sheet, no decorative animation.
7. Signature differentiator: a "cost-impact spine" in history and compare rows, where each event aligns timestamp, change type, and right-justified cost delta for fast scanning.

## Surviving Recommended Approach

Use a shared inspector pattern for the current Activity-only UI:

- Row Expand opens a row inspector, defaulting to row `Version History` for v1 history work.
- Header `Activity` opens the same inspector shell in sheet mode.
- Compare replacing the sheet inspector body is historical named-version scope.
- Restore-as-copy confirmation is historical named-version scope because the active alternative workflow is duplicate/create separate estimate sheets.

Rejected alternatives:

- Inline row expansion: rejected because it would change row height, break the spreadsheet rhythm, and complicate active blur commits.
- Full-page version dashboard: rejected because this is an operational sheet workflow, not a reporting destination.
- Row context menu entry: rejected for v1 because the current row action cell is not a context menu surface.

## Shared Inspector Shell

Desktop:

```text
Estimate sheet remains visible underneath
---------------------------------------------------------------------
| sheet/table surface                                      | Inspector |
|                                                          | 420-480px  |
|                                                          | fixed side |
---------------------------------------------------------------------
```

Mobile/narrow:

```text
Bottom sheet
--------------------------------------
| compact handle / title / close      |
| selected tab row                    |
| scrollable body                     |
--------------------------------------
```

Behavior:

- Overlay the sheet without changing the row grid width.
- Do not push, resize, or reflow editable cells.
- Only one inspector may be open at a time. Opening row details closes/replaces sheet Activity, and opening sheet Activity closes/replaces row details. Restore confirmation is historical named-version scope only.
- Close on Escape, close button, or outside overlay click if no nested dialog is open.
- Return focus to the triggering Expand, row-menu, or Activity button on close.
- Keep active quantity/Misc Cost blur commits intact. Opening the panel should not swallow the existing blur-save path.
- Support deep links later with local UI state first; URL state is not required in v1.

Implementation note:

- If the first implementation stays inside `EstimateSheetContent.tsx`, keep the shell small and extract once the file grows. Do not treat `EstimateSheetHeader` as an importable seam unless it is deliberately extracted.

## Surface 1: Row Details / History Panel

### Entry Point

Use the existing Expand icon in the 30px action cell.

Required behavior:

- Add `onClick` to the current Expand button.
- Change the label from `Expand {material}` to `Open row details for {material}` or equivalent.
- Keep the 30px action column.
- Do not add a fourth row icon.
- Do not add a row history column.
- Do not introduce a row context menu in this slice.

### Panel Layout

```text
Row inspector
------------------------------------------------
Tile B                                PHP 42,300
Floor Finishes / Living Room          linked-overridden

[Summary] [Source] [History]

History
------------------------------------------------
10:42 AM  Replaced source              +PHP 4,200
          Tile A -> Tile B
          Supplier A -> Supplier B

10:17 AM  Quantity changed             +PHP 8,500
          10 sqm -> 12 sqm

09:55 AM  Link state changed            no total change
          linked-clean -> linked-overridden
```

Tab intent:

- `Summary`: current row facts only. Material, description, quantity, unit, unit cost, misc cost, total, area path, tags, and row revision. Source this from the current TanStack area-tree cache first, then refetch/canonicalize on panel open if the row is stale or missing.
- `Source`: source snapshot and row metadata. Component id/version, category, supplier, price option, lifecycle state, discipline, designation, link state.
- `History`: append-only event list for the row. First page loads 50 events by `(created_at, id)`.

History event anatomy:

```text
timestamp | event label | actor
short plain-language summary
before -> after field table, only for changed fields
right-aligned total delta, if measurable
correlation tag, if part of a template insert or cascade
```

States:

- Empty: `No row history yet` plus current row summary. Do not imply history failed.
- Loading: skeleton rows sized to the final event rows.
- Error: inline compact error with retry, not a toast-only failure.
- Deleted-row context: show row snapshot details from event payload even if `target_row_id` is null.

Non-interference contract:

- Opening the row inspector must not dirty the row.
- History reads must not write events.
- If a user opens the panel while a quantity/Misc Cost cell is focused, normal blur commit still happens through the existing path.
- If a row update fails, the row inspector must not show a successful event.
- If the server returns a row revision conflict, the panel should show the refetched canonical row state and a compact conflict note rather than preserving stale optimistic values.

## Surface 2: Sheet Version / History Panel

### Entry Point

Add one compact header toolbar action in the local `EstimateSheetHeader`.

Recommended toolbar item:

```text
[clock/history icon] Versions
```

Rules:

- Place it in the existing `HeaderIconToolbar` add-actions area near export, not as a new page section.
- The visible label can be `Versions` on desktop. On very narrow widths, icon-only with tooltip/aria label is acceptable.
- The header function should receive `onOpenVersionHistory` locally, or be extracted deliberately if the implementation pass decides that is cleaner.

### Panel Layout

```text
Sheet history
------------------------------------------------
ES-001       Lewis Residence Estimate       V2
Current total                         PHP 1,234,567

[Activity] [Versions]

Activity
------------------------------------------------
10:42 AM  Row replaced                 +PHP 42,300
          Floor Finishes / Tile A -> Tile B

10:17 AM  Quantity changed              +PHP 8,500
          Living Room / Tile B / 10 -> 12

Versions
------------------------------------------------
V2  Tile substitution             PHP 1,234,567
    Created today by Philip       Compare  Restore copy

V1  Initial estimate              PHP 1,192,267
    Created May 24                Compare  Restore copy

[Create version]
```

Activity tab:

- Shows sheet-level events and rolled-up row events.
- First page is 50 events.
- Group multi-row operations by `correlation_id` where available.
- Node delete cascades should appear as one high-level destructive event with expandable affected rows, not a wall of identical delete rows by default.

Versions tab:

- Named versions are intentional milestones, not every edit.
- Show `versionLabel` (`V1`, `V2`) separately from `sheet_code` (`ES-001`).
- Show editable version title after the label, for example `V2 - Tile substitution`.
- The metadata strip continues to show the current `versionLabel`; the history panel explains version title and snapshot status.

Create version form:

```text
Create version
------------------------------------------------
Label: V3                         auto, locked
Title: [For client review        ]
Note:  [Optional short note       ]

Summary preview:
12 edits since V2
+PHP 42,300 total delta

[Cancel] [Create version]
```

States:

- No named versions: show current sheet total and a primary `Create version` action.
- Backfill baseline only: show `V1 - Baseline` as system/backfill-sourced.
- Error: keep the panel open, show retry for read failure, and disable destructive actions.
- Pagination: event feed must never render the entire event table at once.

## Surface 3: Compare + Restore-As-Copy Flow

### Compare Entry

Compare starts from a named version row inside the sheet panel.

Recommended behavior:

- `Compare` replaces the panel body with compare mode.
- Keep a back affordance to return to Versions.
- Compare selected version against current working sheet in v1.
- Do not implement arbitrary version-to-version compare in the first slice.

### Compare Layout

```text
Compare
------------------------------------------------
V1 Initial estimate       ->        Current V2
PHP 1,192,267                       PHP 1,234,567
Delta: +PHP 42,300

[Summary] [Rows] [Areas]

Summary
------------------------------------------------
Rows added: 2
Rows deleted: 1
Rows replaced: 1
Rows edited: 4

Rows
------------------------------------------------
REPLACED  Floor Finishes / Tile Finish   +PHP 42,300
          Tile A -> Tile B

EDITED    Living Room / Tile B            +PHP 8,500
          Qty 10 -> 12

DELETED   Kitchen / Backsplash            -PHP 3,000
          Source snapshot retained
```

Compare principles:

- Use a list/table hybrid, not side-by-side spreadsheets.
- Group by change type first, then area path.
- Every row should show material, area path, source change when relevant, and total delta when measurable.
- Added rows use nullable `then` values; deleted rows use nullable `now` values. Do not display fake zeroes as if they were real historic values.
- Preserve cost direction with sign, color, and text; do not rely on color alone.

### Restore-As-Copy Confirmation

Restore is not a compare-row action. It is a version-level action available from Versions and Compare.

Confirmation dialog:

```text
Restore V1 as a new estimate
------------------------------------------------
This creates a new estimate from the V1 snapshot.
The current ES-001 estimate will not be changed.

New sheet name
[Lewis Residence Estimate - restored from V1]

New sheet code
[Auto-generate next code]  preview: ES-004

Snapshot summary
Rows: 186
Areas: 14
Total: PHP 1,192,267

[Cancel] [Create restored copy]
```

Behavior:

- Default name should include the source version label, not the current working version label.
- Sheet code should auto-generate by default using the existing next-code pattern.
- On success, return the new `estimateId`, first node id, and sheet code.
- Offer navigation to the new estimate or navigate automatically if that matches existing duplicate-sheet behavior.
- The original estimate remains unchanged and must be stated in the dialog copy.
- Disable the submit button while restoring and show a compact failure state in the dialog if the action fails.

Restore implementation contract:

- Restore-as-copy must mirror `duplicateEstimateSheet()` semantics: create new estimate, insert nodes parent-first with remapped parent ids, then insert rows with fresh row ids and remapped node ids.
- The copied rows must preserve `source_snapshot`, `metadata`, `discipline`, `designation`, and `link_state`.
- Insert a `sheet_restored_as_copy` event on the new estimate after the copy is created within the server-defined restore transaction.

## Accessibility And Keyboard

- Expand icon: focusable button, clear aria label, opens dialog/panel.
- Activity button: focusable toolbar action with tooltip and aria label.
- Inspector: `role="dialog"` or an equivalent accessible disclosure pattern, labelled by the panel title.
- Tabs: use `role="tablist"`, arrow-key navigation, `aria-selected`, and stable panel ids.
- Escape closes the inspector. Nested restore confirmation behavior is historical named-version scope only.
- Focus returns to the opener.
- Destructive or copy-creating actions require explicit button press; no Enter-from-text-field accidental restore.
- Deltas use sign and text, not color alone.

## Responsive Rules

- Desktop and tablet: right-side inspector, 420-480px, maximum `min(480px, 42vw)`.
- Small screens: bottom sheet with max height around 80dvh.
- The row table should remain horizontally scrollable if it already is; history UI must not add grid columns.
- Compare tables/lists can scroll inside the panel body.
- Sticky compare header is allowed inside the panel; sticky global page headers should not be added.

## Visual QA Handoff

This pass does not run `$visual-verdict` because there is no approved reference image and no implemented screenshot to compare.

After this design is accepted, the visual implementation loop should be:

1. Create a lightweight workspace reference for the active states: row inspector and sheet Activity.
2. Save the approved reference under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/`.
3. Implement with `$ralph`.
4. Capture desktop and mobile screenshots on the protected estimate route.
5. Run `$visual-verdict` against the approved reference before each next visual edit if this becomes a visual implementation task.
6. Stop only when the score is 90 or higher, or document accepted deviations.

## Implementation Acceptance Checks

- Row Expand opens row details/history and no longer does nothing.
- No row action column growth is introduced unless separately approved.
- Sheet `Activity` opens from the local header toolbar.
- The sheet activity surface has no `Versions` tab, `Compare` action, create-version form, or restore-as-copy dialog.
- Actor attribution is displayed once actor display work is in scope.
- Correlation-id groups can be visually grouped once bulk event grouping is in scope.
- Empty, loading, error, and deleted-row snapshot states are visible and tested.
- The UI does not interfere with Enter/blur spreadsheet edit commits.
- Event feeds are paginated and do not load unbounded histories.

## Open Product Acceptance Items

These are the only product-level decisions this UI pass still needs before implementation:

1. Accept the shared inspector pattern for row Version History and sheet Activity.
2. Decide how actor names should resolve from `actorUserId` without widening profile exposure.
3. Decide whether Activity filter/search is required before node activity expansion or can follow pagination.
4. Decide whether Activity export belongs in the next slice or stays deferred to proposal/change-order scope.
