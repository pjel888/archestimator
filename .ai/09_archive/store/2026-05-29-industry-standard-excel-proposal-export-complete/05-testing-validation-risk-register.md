# 05 — Testing, Validation, and Risk Register

**Goal:** Define proof requirements before the Excel proposal export can be considered reliable.

---

## Testing strategy

Use TDD for the export engine before UI.

Reason:

- consolidation errors are business-critical;
- totals must reconcile exactly;
- preview/download drift would destroy user trust;
- UI tests alone cannot catch cost grouping mistakes.

---

## Unit test plan

### `proposal-export-consolidation.test.ts`

Core cases:

1. **Consolidates identical items across rooms**
   - Bedroom A tile, 12 sqm;
   - Bedroom B same tile, 10 sqm;
   - result: one proposal row, 22 sqm;
   - source breakdown has two rows.

2. **Does not consolidate different units**
   - same description, `sqm` vs `pc`;
   - result: two proposal rows.

3. **Does not consolidate different costs**
   - same tile, same unit, different unit cost;
   - result: two proposal rows.

4. **Does not consolidate different remarks/scope**
   - one included, one OSM/by-others/provisional later;
   - result: separate rows.

5. **Preserves source path**
   - Lot > Main House > Second Floor > Bedroom A;
   - source breakdown string matches expected path.

6. **Sorts deterministically**
   - repeated runs with same input produce same row order.

7. **Handles empty estimates**
   - returns empty proposal rows and validation issue.

8. **Handles zero quantity**
   - hidden or validation-warning depending settings.

9. **Handles missing unit**
   - validation warning;
   - no crash.

10. **Handles floating decimals**
   - quantity and currency math rounds consistently.

---

## Export model test plan

### `proposal-export-model.test.ts`

Cases:

- metadata is copied correctly from project/estimate;
- current `itemCost` maps to `materialUnitCost` under compatibility mode;
- current `miscCost` maps to `miscSubtotal`;
- grand total equals proposal rows total;
- validation issue appears when labor split is unavailable;
- source breakdown rows point to proposal row IDs;
- `includeSourceBreakdownSheet` setting controls breakdown model/sheet inclusion later.

---

## Workbook test plan

### `proposal-workbook.test.ts`

Use ExcelJS to generate and read back the workbook.

Assertions:

- workbook has expected sheets:
  - `Proposal Summary`;
  - `Detailed Estimate`;
  - `Area Breakdown`.

- `Detailed Estimate` has expected headers:
  - `NO.`;
  - `TAG`;
  - `PARTICULARS`;
  - `QTY`;
  - `UNIT`;
  - `MATERIAL UNIT COST`;
  - `LABOR UNIT COST`;
  - `MATERIAL SUBTOTAL`;
  - `LABOR SUBTOTAL`;
  - `MISC / OTHER` if compatibility mode;
  - `COST AMOUNT`;
  - `REMARKS`.

- consolidated tile row has expected quantity;
- cost amount matches model;
- totals row matches model;
- workbook buffer is non-empty;
- generated file can be parsed back by ExcelJS;
- number formats exist on money columns;
- area breakdown contains expected source paths.

---

## Preview UI test plan

### `proposal-export-preview.test.tsx`

Cases:

- clicking `Preview Excel Export` renders preview overlay;
- preview table contains consolidated row;
- preview cells are not editable inputs/textareas/contenteditable;
- preview shows `Fresh` after generation;
- changing the tree revision shows `Out of date`;
- stale preview disables or blocks standard download;
- `Refresh preview` regenerates model;
- empty estimate shows empty state.

---

## E2E test plan

Add Playwright coverage only after unit/DOM tests are stable.

Scenario:

1. Log in / use dev auth path if available.
2. Open a project estimate workspace.
3. Add same component/tile to two different area nodes or use seeded fixture route.
4. Generate preview.
5. Confirm one consolidated line appears in `Detailed Estimate` preview.
6. Open `Area Breakdown`; confirm both source rooms appear.
7. Download Excel.
8. Verify file downloads with `.xlsx` extension.
9. Optionally parse downloaded file in test runtime and assert workbook sheet names/totals.

If test setup cannot reliably create rows through UI yet, use a test fixture model at unit level and postpone E2E download parsing.

---

## Manual QA checklist

- Open estimate workspace.
- Create/use at least two area nodes with same line item.
- Generate preview.
- Confirm line items consolidate.
- Confirm area breakdown shows rooms/areas.
- Edit a quantity.
- Confirm preview becomes stale.
- Refresh preview.
- Confirm total changes.
- Download `.xlsx`.
- Open in Excel/Numbers/Google Sheets.
- Confirm workbook is editable.
- Confirm formulas/totals make sense.
- Confirm no room-by-room duplication in main BOQ unless rows are commercially different.

---

## Validation gates

Required before completion:

```bash
bun run validate
bun run build
bun run test:e2e
git diff --check
```

If Playwright is blocked by environment/auth, document the blocker and run all unit/DOM/build gates.

For documentation-only planning changes, minimum verification:

```bash
git diff --check
```

---

## Risk register

| Risk | Severity | Why it matters | Mitigation |
|------|----------|----------------|------------|
| Wrong consolidation merges commercially different rows | Critical | Client proposal total/details become misleading. | Strict consolidation key; unit tests for differing unit/cost/remarks/scope; source breakdown sheet. |
| Room/area quantities disappear from client review | High | Contractor cannot defend quantity basis. | Always preserve source breakdown rows; include/visible `Area Breakdown` sheet in MVP. |
| Preview and downloaded workbook drift | High | User sees one thing, downloads another. | Shared `ProposalExportModel`; download from fresh preview snapshot or same transformer; tests compare model/workbook. |
| Current model lacks labor split | High | Reference format expects material/labor split. | Compatibility column `MISC / OTHER`; validation warning; follow-up cost-model migration plan. |
| ExcelJS bloats client bundle | Medium | App performance degrades. | Keep ExcelJS generation in route/server boundary where possible; avoid importing workbook generator into always-loaded UI components. |
| Route handler trusts posted data blindly | Medium | Security/data integrity issue. | Validate project/estimate access server-side; avoid logging payload; later server-authoritative export. |
| Full spreadsheet package sneaks into MVP | Medium | Product turns into a spreadsheet clone and slows implementation. | Explicitly avoid Univer/Handsontable/Luckysheet; use TanStack read-only preview. |
| Floating point rounding mismatch | Medium | Totals differ by cents. | Central money formatting helpers; test decimal quantities and currency rounding; consider integer minor units later. |
| Download stale while mutations pending | Medium | Export misses latest edit. | Stale/revision detection; disable or require refresh; pending-save state if exposed. |
| Workbook formatting looks unprofessional | Medium | Export fails the contractor proposal goal. | Use reference column structure; manual QA in Excel; iterate widths/headers/page setup. |

---

## Open questions before coding

1. Should Phase 1 workbook include visible `MISC / OTHER`, or should we first add labor/material split fields?
2. Should the main export always use the full estimate, or should users later export only the selected branch?
3. Should `Area Breakdown` be visible by default or hidden by default?
4. Should export settings be introduced now, or should MVP hard-code contractor-standard defaults?
5. Should download generation be from preview snapshot or server re-fetch after pending mutations settle?

Recommended answers for MVP:

1. Include visible `MISC / OTHER` for honesty; plan split fields later.
2. Full estimate by default.
3. Visible by default during MVP validation; hide later only when users understand the behavior.
4. Hard-code defaults first; add settings after behavior is proven.
5. Generate from fresh preview snapshot first so preview and download match; later add server-authoritative issued snapshots.

---

## Definition of done for QA

This feature is not done until a repeated item across two rooms produces:

- one consolidated row in `Detailed Estimate`;
- two source rows in `Area Breakdown`;
- a grand total that matches the app-side model;
- an editable downloaded `.xlsx` workbook;
- a stale preview warning after any subsequent estimate edit.