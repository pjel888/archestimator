# 04 — Implementation Plan

**Goal:** Add industry-standard Excel proposal export and read-only preview to the current estimate workspace.

---

## Implementation principle

Build this as a narrow export slice, not a full proposal system.

The first version should prove:

1. export model is correct;
2. consolidation works;
3. preview and workbook use the same model;
4. downloaded Excel is editable and professional;
5. room/area traceability is preserved.

---

## Affected route/screen

Primary route:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

Primary UI component likely affected:

- `src/components/workshop/EstimateSheetContent.tsx`

Supporting current files:

- `src/hooks/use-estimate-query.ts`
- `src/lib/estimates/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/components/workshop/ProjectEstimateMetadataStrip.tsx`

New files likely needed:

- `src/lib/proposal-export/types.ts`
- `src/lib/proposal-export/flatten-estimate-tree.ts`
- `src/lib/proposal-export/build-proposal-export-model.ts`
- `src/lib/proposal-export/consolidate-proposal-rows.ts`
- `src/lib/proposal-export/create-proposal-workbook.ts`
- `src/lib/proposal-export/format.ts`
- `src/components/workshop/proposal-export/ProposalExportPreview.tsx`
- `src/components/workshop/proposal-export/ProposalExportPreviewTable.tsx`
- `src/components/workshop/proposal-export/ProposalExportPreviewOverlay.tsx`
- a route handler or server action for `.xlsx` download, exact path to be selected after reading current Next.js 16 route-handler docs.

Tests likely needed:

- `tests/vitest/proposal-export-consolidation.test.ts`
- `tests/vitest/proposal-export-model.test.ts`
- `tests/vitest/proposal-workbook.test.ts`
- `tests/vitest/proposal-export-preview.test.tsx`
- optional Playwright spec for download behavior.

---

## Phase 0 — Implementation setup

1. Create isolated branch/worktree.
2. Install dependency:

```bash
bun add exceljs
```

3. Read Next.js 16 route handler/server action documentation under `node_modules/next/dist/docs/` before adding download route.
4. Confirm current `EstimateSheetContent` tree revision behavior through `useEstimateAreaTreeQuery`.
5. Confirm whether download should use:
   - preview snapshot posted to route handler; or
   - server re-fetch by project/estimate and current saved rows.

Recommended MVP decision:

- Generate preview from the client’s current query tree.
- Generate download from the same `ProposalExportModel` snapshot so preview/download match exactly.
- Validate project/estimate access server-side if posting export payload.

Later:

- Add server-authoritative export from persisted rows once mutation state exposure is mature.

---

## Phase 1 — Pure export model and consolidation tests

### Tasks

1. Create export types.
2. Create `flattenEstimateTree(tree)`:
   - returns rows with area path context;
   - confirms rows come only from area nodes;
   - preserves traversal order.

3. Create `normalizeEstimateRowForExport(sourceRow)`:
   - maps existing cost fields to export economics;
   - applies current compatibility policy for missing labor split;
   - derives tag/section/remarks.

4. Create `consolidateProposalRows(flatRows)`:
   - builds consolidation keys;
   - groups compatible rows;
   - sums quantities/subtotals;
   - preserves source area paths and row IDs.

5. Create `buildProposalExportModel(input)`:
   - metadata + settings + summary rows + detailed rows + source breakdown rows + validation issues.

### Acceptance criteria

- Bedroom A tile + Bedroom B same tile consolidate into one proposal row.
- Same tile with different unit cost does **not** consolidate.
- Same description with different unit does **not** consolidate.
- Different scope status does **not** consolidate.
- Source breakdown preserves both room paths.
- Grand total equals sum of included proposal rows.
- Empty estimate returns empty model with validation note, not crash.

---

## Phase 2 — ExcelJS workbook generator

### Tasks

1. Create `createProposalWorkbook(model)` using ExcelJS.
2. Add workbook properties:
   - creator/app name;
   - generated date;
   - workbook title/subject if supported.

3. Create `Proposal Summary` worksheet.
4. Create `Detailed Estimate` worksheet:
   - title rows;
   - metadata rows;
   - header row;
   - consolidated proposal rows;
   - formulas and/or numeric computed values;
   - currency formats;
   - frozen header row;
   - print/page setup where practical.

5. Create `Area Breakdown` worksheet:
   - source area rows;
   - row-number cross-reference;
   - source quantities/costs.

6. Optional Phase 2.5:
   - `Terms / Notes` worksheet if proposal terms are available.

### Styling requirements

- Professional, contractor-style formatting.
- Clear title and project identity.
- Bold table headers.
- Right-aligned quantities and money.
- PHP currency number format.
- Usable column widths.
- Freeze panes for header row.
- Totals row with clear border.
- No decorative UI styling copied into Excel.

### Acceptance criteria

- `.xlsx` opens in Excel/Numbers/Google Sheets.
- Main sheet is editable after download.
- Workbook has `Proposal Summary`, `Detailed Estimate`, and `Area Breakdown` sheets.
- Detailed Estimate columns match the planned MVP format.
- Workbook totals reconcile with app-side export model totals.

---

## Phase 3 — Download route/action

Exact implementation should follow current Next.js 16 docs before coding.

Candidate architecture:

- Client builds `ProposalExportModel` from preview snapshot.
- Client sends model to a route handler.
- Route handler validates the current user has access to the project/estimate.
- Route handler creates workbook buffer with ExcelJS.
- Route handler returns response with:
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="...xlsx"`

Candidate paths:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/exports/proposal-xlsx/route.ts`
- or `src/app/api/workshop/projects/[projectId]/estimates/[estimateId]/proposal-xlsx/route.ts`

Preferred path after review:

- use an API route if payload is posted and the URL is not intended to be a visible page;
- keep route project-scoped and estimate-scoped.

Security/access requirements:

- Do not trust posted project/estimate identity alone.
- Validate access using existing workspace/project repository boundaries.
- Do not expose other users’ estimate data.
- Do not log full estimate payload in production.

---

## Phase 4 — Read-only preview UI

### Tasks

1. Add `Preview Excel Export` action in `EstimateSheetContent` header.
2. Create preview overlay component.
3. Use current TanStack Query area-tree data and tree revision.
4. On preview open/refresh:
   - build export model;
   - store generation revision;
   - render read-only preview.

5. Detect stale state:
   - compare current tree revision with preview revision;
   - show `Out of date` banner;
   - disable or warn download until refreshed.

6. Add tabs:
   - `Detailed Estimate`;
   - `Area Breakdown`;
   - `Validation`.

7. Add `Download editable Excel` button:
   - uses current fresh preview model;
   - calls download route/action;
   - handles failure.

### UI constraints

- App/workshop text max 12px.
- Buttons use shared primitives where possible.
- No new raw button/search patterns if shared primitives exist.
- Read-only table only.
- No spreadsheet selection handles.
- No formula bar.

---

## Phase 5 — Optional cost-model enhancement

This phase needs explicit approval if it touches persistence/migrations.

Problem:

- Current estimate rows have `unitCost`/`itemCost` and `miscCost`, but the contractor proposal format expects material and labor split.

Options:

### Option A — No migration MVP

- Export current `unitCost` as material unit cost.
- Export labor as `0`.
- Export `miscCost` as visible `MISC / OTHER` column.
- Add validation warning that material/labor split is not yet modeled.

Pros:

- fastest;
- no database changes;
- honest math.

Cons:

- not a perfect match to reference proposal columns;
- less contractor-standard than final target.

### Option B — Add split-cost fields

Potential fields:

- `material_unit_cost`
- `labor_unit_cost`
- `equipment_unit_cost`
- `subcontract_unit_cost`
- `scope_status`
- `remarks`
- `tag_code`

Pros:

- closer to industry format;
- improves estimating model long-term.

Cons:

- migration required;
- UI editing changes required;
- more test surface.

Recommended sequence:

- Implement Option A first to validate export UX.
- Plan Option B as a follow-up migration once Philip approves the cost model expansion.

---

## Phase 6 — Documentation update

After implementation:

- update `.ai/06_specs/proposal-package-system.md` if the export model becomes canonical;
- update `.ai/10_state/current-state.md` with implemented behavior;
- update `.ai/10_state/decisions.md` with package decision if accepted;
- add user-facing notes if workbook export behavior needs explanation.

---

## Definition of done

The slice is complete when:

1. `exceljs` is installed and used only where needed.
2. Export model is pure and tested.
3. Consolidation logic is tested against repeated room items.
4. Preview and workbook are generated from the same model.
5. In-app preview is read-only and refreshable.
6. Stale state works after estimate changes.
7. Downloaded `.xlsx` opens and is editable.
8. Workbook includes summary, detailed estimate, and area breakdown sheets.
9. Validation gates pass.
10. Implementation docs/current state are updated.