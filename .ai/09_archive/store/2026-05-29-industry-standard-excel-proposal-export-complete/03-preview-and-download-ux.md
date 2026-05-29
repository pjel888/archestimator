# 03 — Preview and Download UX Plan

**Goal:** Let users see the assembled Excel/proposal table before download without turning the app into an editable spreadsheet.

---

## UX thesis

The preview is a **read-only export preview**, not a second estimate editor.

Users edit the estimate in the existing estimate sheet. The export preview answers:

- “What will the contractor-style Excel proposal look like?”
- “Were repeated room items consolidated correctly?”
- “Does the total reconcile?”
- “Can I download an editable Excel file now?”

---

## Placement

Primary route:

- `/workshop/projects/[projectId]/estimates/[nodeId]`

Recommended UI entry points:

1. Center estimate sheet sticky header action:
   - `Preview Excel Export`
   - compact app text, max 10px button label.

2. Optional later project/estimate list action:
   - `Download XLSX`
   - only after export model is stable.

Recommended first implementation:

- Add a compact action in the estimate sheet header near existing `Filter`, `View`, and total controls.
- Opens a right-side drawer, modal, or route-local preview panel.
- Since the current workspace already has a left tree + center sheet + right library sidebar, avoid a fourth permanent column.

Preferred MVP interaction:

- Button opens a **large overlay panel** above the estimate sheet, not another permanent sidebar.
- The Component Library sidebar remains untouched.
- Overlay can be dismissed without changing estimate data.

---

## Preview generation model

Use a refreshable preview snapshot:

1. User clicks `Preview Excel Export`.
2. App captures current estimate tree from the TanStack Query area-tree cache.
3. App builds `ProposalExportModel` locally using the pure transformer.
4. Preview renders `ProposalExportModel.proposalRows` read-only.
5. App stores the current estimate tree revision number with the preview snapshot.
6. If estimate rows change later, preview shows `Out of date`.
7. User clicks `Refresh preview` to regenerate the preview.
8. User clicks `Download editable Excel` to generate/download `.xlsx` from the same export model.

This directly supports Philip’s “maybe not live but can be updated” direction.

---

## Why refreshable preview beats live preview

A fully live preview sounds convenient but creates problems:

- it can refresh mid-review while the user is checking totals;
- consolidation groups can reorder rows unexpectedly after every quantity edit;
- expensive workbook-like computations can run too often;
- it blurs editing vs exporting.

A refreshable preview is clearer:

- estimate sheet is where edits happen;
- export preview is a generated review artifact;
- stale indicator tells the truth;
- refresh is intentional.

---

## Preview header states

### Fresh state

Display:

- `Excel export preview`
- `Fresh` or `Generated just now`
- row count;
- consolidated source row count;
- grand total;
- buttons:
  - `Refresh preview`
  - `Download editable Excel`
  - `Close`

### Stale state

Trigger:

- estimate tree revision differs from preview generation revision;
- row mutations are pending/reconciled after preview generation;
- selected estimate changes.

Display:

- `Out of date — estimate changed after preview was generated.`
- disable or warn on download if using stale model;
- primary action: `Refresh preview`.

Recommended rule:

- Do not download stale preview by default.
- If allowing it later, label as `Download previous preview` and make the risk explicit.

### Pending save state

If row mutations are still saving:

- show `Saving estimate changes…`;
- allow preview of current local values if desired;
- disable final server-authoritative download until pending mutations settle, unless the download route uses the exact client snapshot.

MVP simplification:

- Generate download from the same preview model snapshot to guarantee preview/download match.
- Later server-authoritative export can wait for persistence and re-fetch canonical rows.

---

## Preview table design

Use existing app density:

- app body/control text: 10px;
- metadata labels: 8–9px;
- strong titles max 12px;
- hairline borders;
- white/off-white backgrounds;
- no decorative spreadsheet chrome;
- no editable cells;
- no selection handles;
- no formula bar.

Preview columns:

1. `NO.`
2. `TAG`
3. `PARTICULARS`
4. `QTY`
5. `UNIT`
6. `MATERIAL UNIT COST`
7. `LABOR UNIT COST`
8. `MATERIAL SUBTOTAL`
9. `LABOR SUBTOTAL`
10. `MISC / OTHER` while needed
11. `COST AMOUNT`
12. `REMARKS`
13. optional `SOURCE AREAS` preview-only chip/list, not necessarily exported in main sheet.

Column behavior:

- `PARTICULARS` wraps to two lines in preview;
- money columns right-aligned;
- quantity right-aligned;
- unit centered or left-aligned compactly;
- remarks truncated with tooltip/popover later;
- source areas can show `Bedroom A + Bedroom B` or `3 areas`.

---

## Preview tabs

Recommended MVP tabs inside preview overlay:

1. `Detailed Estimate`
   - consolidated BOQ rows;
   - main preview.

2. `Area Breakdown`
   - source rows grouped under proposal row;
   - read-only audit view;
   - answers “why did these rooms combine?”

3. `Validation`
   - warnings for missing labor split, zero quantities, missing units, missing scope notes, etc.

Do not add editable settings in Phase 1 unless necessary. Export settings can be simple toggles later.

---

## Download behavior

Button label:

- `Download editable Excel`

File extension:

- `.xlsx`

Filename pattern:

```txt
{project-code-or-name}_{estimate-sheet-code}_proposal-export_{yyyy-mm-dd}.xlsx
```

Examples:

```txt
ARCH-001_ES-003_proposal-export_2026-05-23.xlsx
Project-Name_ES-001_proposal-export_2026-05-23.xlsx
```

Important UX copy:

- “Preview is read-only. Downloaded Excel is editable.”
- “Rows are consolidated by item/unit/cost/scope. See Area Breakdown for room sources.”

---

## Empty states

### No estimate rows

Message:

- `No proposal rows yet.`
- `Add items to Area Nodes before generating an Excel proposal export.`

Action:

- Close preview.

### Selected group node only

The export should use the whole estimate, not only the currently selected visible branch, unless a future setting says otherwise.

Message if needed:

- `Export preview uses the full estimate, not only the selected node.`

### Missing cost split

Message:

- `Current estimate rows do not yet split material and labor unit costs. Existing unit cost is exported as material unit cost; misc cost is shown separately.`

This is not a blocker, but it must be visible so the sheet does not pretend misc is labor.

---

## Error states

### Export generation failed

Show:

- `Could not generate Excel preview.`
- concise reason;
- `Try again` button.

Log technical details to console only in development.

### Download failed

Show:

- `Could not download Excel file.`
- if validation failed, show validation issue list;
- do not claim file generated.

---

## Accessibility

- Preview overlay uses dialog semantics if modal.
- Keyboard focus moves into preview when opened and returns to `Preview Excel Export` when closed.
- Table headers use semantic `<th>`.
- Download and refresh buttons are actual buttons.
- Stale/fresh status is text, not color-only.

---

## Mobile behavior

The estimate workspace is dense. For MVP:

- preview overlay can become a full-screen sheet on narrow screens;
- table horizontally scrolls;
- download button remains sticky at top or bottom;
- no attempt to make the proposal table “card-based” because the purpose is to review tabular Excel output.

---

## UX acceptance criteria

- User can generate a read-only preview from an estimate.
- Preview shows consolidated rows, not a raw room-by-room dump.
- Preview clearly explains that room/area detail is in Area Breakdown.
- Preview shows stale state after estimate change.
- Download is disabled or warns when preview is stale.
- Downloaded `.xlsx` matches the preview row order and totals.
- No cell in the preview is editable.
- No heavy spreadsheet editor UI appears in the app.