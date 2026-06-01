# Excel Reference Analysis

## Reference File Inventory

Local repo search:

```bash
rg --files | rg -i '(bid|quotation|quote|boq|reference|proposal|xlsx|xls|pdf)'
```

Result: no attached industry bid/quotation XLSX/PDF files were found. Matches were Archestimator PDFs, proposal export source/tests, and pitch-deck screenshots.

Therefore this analysis is grounded in the user-provided reference summary in the 2026-06-01 prompt. Full attached-file review is a required manual follow-up before launch.

## Common Bid Form Structure Observed

- Header block.
- General notes.
- Detailed line-item table.
- Trade/section grouping.
- Summary totals.
- Commercial/legal blocks.
- Signature/conforme block.

## Header Fields Observed

- Project.
- Location.
- Owner/Client.
- Bidder/Contractor.
- Date Submitted.

Archestimator mapping:

- Project: `ProposalExportMetadata.projectName`.
- Location: `projectAddress`.
- Owner/Client: not guaranteed in current export metadata; add nullable field or safe blank.
- Bidder/Contractor: owner-approved static/default field.
- Date Submitted: generated/export date unless UI field is added.

## Summary Fields Observed

- Section line totals.
- Running totals where useful.
- Direct cost.
- Contingency.
- VAT.
- Grand total.
- Cost per sqm.
- Estimated duration.

Archestimator mapping:

- Section totals from `ProposalSummaryRow`.
- Direct cost from included line totals.
- Contingency strategy requires owner decision to avoid double counting.
- VAT default requires owner decision.
- Cost per sqm requires project area; no verified current field in export model.
- Duration requires owner-approved default or nullable field.

## Detailed Line-Item Columns Observed

Required MVP columns:

- ITEM.
- PARTICULARS.
- UNIT.
- QTY.
- UNIT COSTS - MATERIAL.
- UNIT COSTS - LABOR.
- COST TOTAL.
- LINE TOTAL.
- SCOPE.
- NOTES / REMARKS.

Current workbook has similar but not identical columns at `create-proposal-workbook.ts:15`.

## Common Sections/Trades Observed

- A General Preliminaries.
- B Site Works.
- C Architectural Works.
- D Glass and Glazing.
- E Doors and Windows.
- F Furniture, Fixtures, and Equipment.
- G Electrical Works.
- H Mechanical Works.
- I Plumbing / Sanitary / Fire Protection.
- Others / Miscellaneous.

Mapping rule:

- Normalize current `category`/`discipline`.
- Map known terms into A-I.
- Put unmatched categories under Others / Miscellaneous.
- Preserve original category in remarks/source breakdown.

## Common Scope/Status Labels

- INCLUDED.
- EXCLUDED.
- BY OTHERS.
- OWNER.
- OSM.
- OFCI.
- OSCI.
- omitted.
- not applicable.

MVP support:

- Export model must support these labels.
- Current app may default all rows to INCLUDED until UI exists.
- Numeric LINE TOTAL cells must remain numeric formula/0 cells; statuses go in SCOPE column.

## General Notes Observed

1. Do not leave LINE TOTAL blank.
2. Indicate INCLUDED, EXCLUDED, BY OTHERS, etc.
3. Double-check formulas and subtotals.
4. Additional items must be under OTHERS.
5. Use Bidder's Notes / Remarks for specifications or considerations.

These notes must appear in `Bid Form` rows 9-15.

## Commercial/Legal Blocks Observed

- Exclusions.
- Qualifications.
- Payment terms.
- Validity.
- Warranty.
- Signature/conforme.

MVP:

- Include blocks even if defaults are sparse.
- Owner must approve default text before launch.
- Do not imply legal commitments without owner sign-off.

## Styling/Print Patterns Observed

- Clear header block.
- Bold/dark table headers.
- Trade section rows.
- Wrapped particulars/remarks.
- Landscape print.
- Repeated headers.
- Totals emphasized.

## Formula and No-Blank-Total Behavior

Requirements:

- `LINE TOTAL` is never blank.
- Included rows contain formulas.
- Excluded/by-others/owner rows contain `0` or formula returning `0`.
- Section subtotals use `SUM`.
- Grand total references summary totals.
- Formulas should survive Excel/Numbers/LibreOffice/Google Sheets import.

## Current Data Model Fit

| Requirement | Current fit |
| --- | --- |
| Material unit cost | `EstimateRowItem.itemCost`. |
| Labor unit cost | Not separate in current schema; current export uses 0 compatibility mode. |
| Misc/other | `miscCost`; workbook must decide whether to include in cost total or remarks. |
| Contingency | `contingencyPercentage`; must avoid double count. |
| Scope status | Current export type limited; app defaults all to included. |
| Commercial terms | Not in current export model. |
| Project area/duration | Not in current export model. |

## MVP Will Support

- Professional workbook sheets.
- Bid-form header and general notes.
- Trade sections A-I plus Others.
- Formula-driven line totals and section/grand totals.
- Scope/status labels with default INCLUDED.
- Commercial blocks with owner-approved defaults.
- Manual QA across spreadsheet apps.

## MVP Will Not Support

- Full UI for per-row scope status unless added in export PR.
- Editable commercial terms UI unless owner scopes it in.
- Separate labor cost data model migration.
- Multi-currency formatting beyond current currency field and PHP-first format.
- Legal contract generation.

## Export Acceptance Criteria

- Workbook sheet names match spec.
- Header/general notes present.
- Every detail row has nonblank numeric `LINE TOTAL`.
- Scope labels never appear in numeric total cells.
- Section totals and grand total are formula-driven.
- Commercial blocks exist.
- Current compatibility mode is visible in validation/remarks.
- Manual QA proof captured before launch.
