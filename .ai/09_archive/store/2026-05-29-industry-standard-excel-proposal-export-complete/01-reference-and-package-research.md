# 01 — Reference and Package Research

**Date:** 2026-05-23  
**Scope:** Industry-standard Excel proposal export, read-only preview, npm package selection.

---

## Source context reviewed

Project files/specs reviewed for this planning pass:

- `.ai/README.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/03_plans/README.md`
- `.ai/06_specs/proposal-package-system.md`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`
- `.ai/06_specs/live-project-estimate-bootstrap.md`
- `.ai/06_specs/initial-data-model.md`
- `DESIGN.md`
- `package.json`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/ProjectEstimateMetadataStrip.tsx`
- `src/hooks/use-estimate-query.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/domain/estimate-tree.ts`
- `src/lib/domain/estimate-totals.ts`
- `src/lib/repositories/estimate-repository.ts`

Reference PDF checked:

- `/Users/philiplewis/Downloads/GRAND%20HYATT%20CONSTRUCTION%20PROPOSAL%20COMPLETE.pdf`

PDF extraction method:

- Python + PyMuPDF (`fitz`) text extraction;
- structural term scan for proposal table and commercial terms;
- only structural lessons are captured here; personal/client-specific content is intentionally not reproduced.

---

## Reference proposal findings

The sample proposal is not a raw room-by-room spreadsheet. It behaves like a contractor proposal package with several layers:

1. identity / project context;
2. formal transmittal or offer letter;
3. detailed estimate table;
4. owner-supplied/exclusion/terms sections;
5. validity, duration, warranty/payment terms, and sign-off.

The detailed estimate table uses this contractor-style column pattern:

| Column | Purpose |
|--------|---------|
| `NO.` | Proposal row number / outline. |
| `TAG` | Drawing/spec/item tag or shorthand reference. |
| `PARTICULARS` | Work item or material description. |
| `QTY` | Consolidated quantity. |
| `UNIT` | Unit of measure. |
| `MATERIAL UNIT COST` | Material unit rate. |
| `LABOR UNIT COST` | Labor unit rate. |
| `MATERIAL SUBTOTAL` | `QTY × MATERIAL UNIT COST`. |
| `LABOR SUBTOTAL` | `QTY × LABOR UNIT COST`. |
| `COST AMOUNT` | Material subtotal + labor subtotal + explicit extras if supported. |
| `REMARKS` | Scope notes, assumptions, OSM/OSCI, provisional/verify notes. |

Commercial sections found structurally in the sample include:

- Owner Supplied Materials / OSM;
- owner-supplied but contractor-installed items;
- finishing material approval language;
- terms and conditions;
- down payment / payment terms;
- proposal validity;
- project duration.

### Product implication

The export must not be treated as “whatever the estimate grid currently shows.” It is a generated contractor document. The estimate grid may be organized by spaces; the proposal workbook should be organized by line-item logic.

---

## The key industry-standard consolidation rule

If the same tile appears in Bedroom A and Bedroom B, the client-facing BOQ should usually show one tile line:

- `PARTICULARS`: Tile item / installation line;
- `QTY`: Bedroom A quantity + Bedroom B quantity;
- `UNIT`: same unit;
- costs: same material/labor unit costs;
- remarks: shared commercial/scope note.

Room/area breakdown remains available in an audit sheet:

| Area path | Source row | Quantity | Unit | Included in consolidated row |
|-----------|------------|----------|------|------------------------------|
| Bedroom A | Tile row | 12.00 | sqm | Row 14 |
| Bedroom B | Tile row | 10.00 | sqm | Row 14 |

This keeps the proposal professional while preserving traceability.

---

## Package research method

Current npm metadata was checked with `npm view` on 2026-05-23.

Project already has:

- `@tanstack/react-table` `^8.21.3`
- `@tanstack/react-query` `5.100.10`
- Next.js `16.2.6`
- React `19.2.4`
- Bun scripts for validation.

Registry warning observed during npm queries:

- npm warned about an unknown `always-auth` config for an existing CodeArtifact npm config. This is not caused by the export package decision, but should be cleaned separately if npm config hygiene becomes a task.

---

## Package comparison

| Package | Registry version checked | License checked | Fit | Notes |
|---------|--------------------------|-----------------|-----|-------|
| `exceljs` | `4.4.0` | MIT | **Best MVP export engine** | Purpose-built for read/write `.xlsx`; supports workbook/worksheet generation, styling, formulas, widths, freezes, hidden sheets, page setup. Best match for professional Excel output. Use server-side or route-handler generation to avoid client bundle bloat. |
| `@tanstack/react-table` | `8.21.3` | MIT | **Best MVP preview renderer** | Already installed. Headless table, light dependency cost, controlled read-only UI. Good for an export preview that should not become a spreadsheet editor. |
| `@glideapps/glide-data-grid` | `6.0.3` | MIT | Optional later | Excellent virtualized data-grid if preview rows become very large. Adds a new canvas grid mental model. Not required for first pass. |
| `xlsx` / SheetJS | `0.18.5` | Apache-2.0 | Possible but weaker for styled workbook generation | Good parser/writer utility, but not the best fit when the goal is styled proposal workbook layout with strong formatting. |
| `xlsx-populate` | `1.21.0` | MIT | Possible but not preferred | Good for editing existing workbooks/templates. Less ideal than ExcelJS for programmatic first-class generation in this app. |
| `write-excel-file` | `4.0.6` | MIT | Too limited | Useful for simple `.xlsx`; too constrained for proposal workbook styling, multiple sheets, formulas, hidden audit sheets, and page setup. |
| `@univerjs/core` + `@univerjs/sheets` | `0.23.0` | Apache-2.0 | Too heavy for MVP | Solves browser spreadsheet app use cases. Overkill and risks turning Archestimator into a spreadsheet clone. |
| `handsontable` | `17.1.0` | Commercial/custom license file | Avoid for MVP | Excellent grid but licensing and editable spreadsheet behavior do not fit the read-only preview requirement. |
| `jspreadsheet-ce` | `5.0.4` | License not returned in checked metadata | Avoid for MVP | Spreadsheet-like editor; not needed and license clarity is weaker from registry output. |
| `luckysheet` | `2.1.13` | License not returned in checked metadata | Avoid | Heavy spreadsheet app package; not the product direction. |
| `react-spreadsheet` | `0.10.1` | MIT | Avoid for MVP | Lightweight, but it is an editable spreadsheet component, not an export/proposal engine. |
| `@rowsncolumns/spreadsheet` | not found | n/a | Not available under checked package name | npm returned 404 for this package name. |

---

## Decision

### Install for implementation

```bash
bun add exceljs
```

### Do not install for MVP

- `handsontable`
- `@univerjs/*`
- `luckysheet`
- `jspreadsheet-ce`
- `react-spreadsheet`
- `@glideapps/glide-data-grid` unless preview performance requires virtualization later.

---

## Why ExcelJS + TanStack is the right first architecture

The feature has two separate problems:

1. **Workbook generation** — needs `.xlsx` output, formulas, formatting, sheets, file download.
2. **In-app preview** — needs read-only review of the assembled export model.

ExcelJS solves problem 1. TanStack Table solves problem 2. A browser spreadsheet package tries to solve both by bringing an editable spreadsheet surface into the product, which is not the requirement.

---

## Research conclusion

The first implementation should be a generated-workbook feature, not an embedded spreadsheet app.

Best path:

- `exceljs` for editable Excel download;
- current TanStack Table for read-only preview;
- shared pure export model so preview and downloaded workbook cannot drift;
- hidden source-breakdown worksheet to preserve room/area traceability while the client-facing sheet remains consolidated.