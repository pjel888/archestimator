# 08 — Excel Export Industry-Standard Plan

**Date:** 2026-06-01
**Priority:** P0 — Critical MVP blocker

## Current Export Architecture

### Files
- **Route:** `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` (69 lines)
- **Model builder:** `src/lib/proposal-export/build-proposal-export-model.ts` (371 lines)
- **Workbook creator:** `src/lib/proposal-export/create-proposal-workbook.ts` (285 lines)
- **Types:** `src/lib/proposal-export/types.ts` (158 lines)
- **Filename builder:** `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts`

### Current Output (3 sheets)

1. **Proposal Summary** — Flat table with sections, particulars, unit, qty, unit cost, subtotal, total. Grouped by area.
2. **Detailed Estimate** — Full row-by-row list with all estimate rows.
3. **Area Breakdown** — Rows grouped by area node.

### Current Gaps vs Industry Bid Form

| Requirement | Current state | Gap |
|------------|---------------|-----|
| Header block (project, location, client, bidder, date, sheet code, currency) | Missing | Build from scratch |
| General notes (LINE TOTAL, INCLUDED/EXCLUDED/BY OTHERS, formulas) | Missing | Build |
| Bid form columns (ITEM, PARTICULARS, UNIT, QTY, MATERIAL, LABOR, COST TOTAL, LINE TOTAL, REMARKS) | Generic columns | Remap and add |
| Formula-driven line totals | Static values | Add ExcelJS formulas |
| Section structure (A-H + Others) | Area-based grouping | Remap to trade sections |
| Summary (by section, running total, direct cost, contingency, VAT, grand total, cost/sqm, duration) | Partial totals only | Build |
| Commercial/legal blocks (exclusions, qualifications, terms, validity, warranty, signature) | Missing | Build |
| Scope status (INCLUDED, EXCLUDED, BY OTHERS, OSM/OFCI/OSCI) | Missing | Build |
| Material/labor split | Labor always 0 | Add minimal split or compatibility mode |
| Print layout / styling | Basic ExcelJS styling | Enhance |
| Formula-driven subtotals and grand total | Static values | Add formulas |

## Gap Analysis Against Industry Bid Forms

The reference bid forms follow this structure:

```
┌──────────────────────────────────────────────────────────────┐
│                       HEADER BLOCK                           │
│  Project:          [name]                                    │
│  Location:         [location]                                │
│  Owner/Client:     [client]                                  │
│  Bidder/Contractor:[workspace/organization]                   │
│  Date Submitted:   [date]                                    │
│  Estimate Code:    [sheet code]                              │
│  Currency:         [PHP/USD/etc.]                            │
├──────────────────────────────────────────────────────────────┤
│                      GENERAL NOTES                           │
│  1. Do not leave LINE TOTAL blank.                           │
│  2. Use INCLUDED, EXCLUDED, BY OTHERS, OSM/OFCI/OSCI.       │
│  3. Double-check formulas and subtotals.                     │
│  4. Additional items under OTHERS rows.                      │
│  5. Bidder notes/remarks column is required.                 │
├──────────────────────────────────────────────────────────────┤
│                    DETAILED BID FORM                          │
│  ITEM │ PARTICULARS │ UNIT │ QTY │ MATERIAL │ LABOR │       │
│       │             │      │     │ UNIT $   │ UNIT $ │       │
│  ─────┼─────────────┼──────┼─────┼──────────┼────────┼───────┤
│       │             │      │     │ COST     │ LINE   │ NOTES │
│       │             │      │     │ TOTAL    │ TOTAL  │       │
├───────┴─────────────┴──────┴─────┴──────────┴────────┴───────┤
│  A. GENERAL PRELIMINARIES                                    │
│  ... section rows ...                                        │
│  B. SITE WORKS                                               │
│  ...                                                         │
│  ... through H. MECHANICAL WORKS ...                         │
├──────────────────────────────────────────────────────────────┤
│                        SUMMARY                               │
│  Section A Subtotal    PHP xxx,xxx.xx                        │
│  Section B Subtotal    PHP xxx,xxx.xx                        │
│  ...                                                         │
│  Direct Cost:          PHP xxx,xxx.xx                        │
│  Contingency (x%):     PHP xxx,xxx.xx                        │
│  VAT (x%):             PHP xxx,xxx.xx                        │
│  GRAND TOTAL:          PHP xxx,xxx.xx                        │
│  Cost per sqm:         PHP xxx.xx                            │
│  Est. Duration:        x months                              │
├──────────────────────────────────────────────────────────────┤
│                   COMMERCIAL / LEGAL                          │
│  Exclusions:           [list]                                │
│  Qualifications:       [list]                                │
│  Terms of Payment:     [terms]                               │
│  Validity:             [period]                              │
│  Warranty:             [period]                              │
│  _______________________________________                     │
│  Signature / Conforme                                        │
└──────────────────────────────────────────────────────────────┘
```

## Workbook Sheet Proposal

### Sheet 1: "Bid Summary"

Purpose: Executive summary for the client.

**Rows:**
1. Header block — merged cells, centered title
2. Project metadata table (label-value pairs)
3. General notes (bullet list)
4. Summary by section (table: Section | Subtotal)
5. Direct cost
6. Contingency (if configured)
7. VAT (if configured)
8. Grand total (bold, prominent)
9. Cost per sqm (if project area available)
10. Estimated duration (if available)
11. Exclusions
12. Qualifications / assumptions
13. Terms of payment
14. Validity period
15. Warranty
16. Signature / conforme block

### Sheet 2: "Detailed Bid Form"

Purpose: Primary bid/BOQ form with columns, formulas, sections.

**Columns:**
| Col | Header | Width | Type | Source |
|-----|--------|-------|------|--------|
| A | ITEM | 8 | Integer | Row number within section |
| B | PARTICULARS | 45 | Text | Row `material` or `description` |
| C | UNIT | 10 | Text | Row `unit` |
| D | QTY | 10 | Number | Row `quantity` |
| E | MATERIAL UNIT COST | 14 | Currency | Row `unit_cost` (see material/labor split) |
| F | LABOR UNIT COST | 14 | Currency | Row `labor_cost` (see material/labor split) |
| G | COST TOTAL | 16 | Number | `=D{n}*(E{n}+F{n})` formula |
| H | LINE TOTAL | 16 | Number | Formula based on scope status |
| I | NOTES / REMARKS | 25 | Text | Row `notes` + scope status |

**Section structure (by estimate group nodes):**
Each top-level Group Node becomes a section lettered A-I:
- A: General Preliminaries
- B: Site Works
- C: Architectural Works
- D: Glass and Glazing
- E: Doors and Windows
- F: Furniture, Fixtures, Equipment
- G: Electrical Works
- H: Mechanical Works
- I: Plumbing / Sanitary / Fire Protection
- Others: remaining groups

Area Nodes become sub-sections with subtotal rows. Estimate row items become numbered rows within each section.

**Formula strategy:**
- `COST TOTAL` = `QTY * (MATERIAL UNIT COST + LABOR UNIT COST)` — Excel formula
- `LINE TOTAL` = cell reference to `COST TOTAL` — handles INCLUDED case; for EXCLUDED/BY OTHERS, set to 0 or display text
- Section subtotals = `SUM` of LINE TOTAL cells in section
- Grand total = `SUM` of section subtotals

**Scope status strategy:**
Add a `scopeStatus` field to estimate_row_items (or store in `source_snapshot` or metadata):

| Scope | LINE TOTAL behavior | Default source |
|-------|---------------------|---------------|
| `included` | Normal line total (formula) | Default for all rows |
| `excluded` | Display "EXCLUDED" text, zero in totals | User sets per row |
| `by_others` | Display "BY OTHERS" text, zero in totals | User sets per row |
| `osm` (Owner Supplied Material) | Display "OSM", zero in material column totals | User sets per row |
| `ofci` (Owner Furnished Contractor Installed) | Display "OFCI", handle specially | User sets per row |
| `osci` (Owner Supplied Contractor Installed) | Display "OSCI", handle specially | User sets per row |

**MVP approach:** Add `scope_status` to `estimate_row_items` (simplest safe path — single nullable column, default null = included). A `scope_status` enum: `included | excluded | by_others | osm | ofci | osci`. Or store in `source_snapshot` to avoid schema change. For MVP, storing in `source_snapshot.scopeStatus` avoids a schema migration.

### Sheet 3: "Area Breakdown" (keep current, polish)

Purpose: Per-area cost breakdown for detail reference.

Structure: Area Nodes as groups, rows within each area. Same columns as Detailed Bid Form, organized by area.

## Material / Labor Split Strategy

**Current state:** `estimate_row_items.unit_cost` is a single field. `itemCost` maps to it. There is no labor cost field. Export currently sets labor to 0.

**Decision: Choose the safest MVP path — Path A (compatibility mode).**

**Path A — Compatibility mode (recommended for MVP):**
- Keep single `unit_cost` as material unit cost
- Labor unit cost appears as 0 (or blank) in the bid form
- COST TOTAL = QTY * UNIT COST (material only)
- Add a note in General Notes: "Unit costs are material costs unless otherwise noted. Labor costs are not separately itemized."
- The workbook still looks professional — just honest about current data model limits.

**Path B — Add material/labor split (more work, more risk):**
- Add `labor_unit_cost` and `labor_cost` columns to `estimate_row_items`
- Add inline editing for labor cost in estimate sheet
- Update totals, charts, templates, snapshots, RPCs
- **Risk:** Touches every row mutation path, chart aggregation, template insertion, proposal export

**Recommendation: Path A for MVP.** If a client specifically needs material/labor split, it can be added post-MVP with proper schema migration and full regression testing. The compatibility mode is honest and professional.

## VAT / Contingency Strategy

- **Contingency:** Already stored per-row as `contingency_percentage`. Calculate contingency amount = SUM(subtotal * contingency_percentage / 100). Display as separate line in Summary.
- **VAT:** Not currently stored. Add `vat_percentage` to `estimate_sheet.metadata` (or a settings field). Display as separate line in Summary.
- Both contingency and VAT are optional — only show if configured.

## Styling / Print Layout Strategy

**ExcelJS styling:**
- **Font:** Calibri 10pt body, Calibri 11pt bold headers, Calibri 14pt bold title
- **Colors:** White background, #292929 header text, #F5F5F5 section banding
- **Borders:** Thin borders on all data cells, medium bottom border on section totals
- **Number format:** `#,##0.00` for costs, `#,##0` for quantities
- **Alignment:** Left for text, right for numbers and currency
- **Column widths:** Fixed widths matching bid form layout
- **Row heights:** 20px data rows, 24px section headers, 30px title row
- **Freeze panes:** Freeze header row(s)
- **Print layout:** Landscape, fit to width, repeat header rows on each page
- **Footer:** Page number, filename, date generated

## Exclusions / Terms / Warranty / Signature Block Strategy

**Source of data:** Estimate sheet metadata OR project metadata. Store as structured fields in `estimate_sheets.metadata`:

```json
{
  "exportSettings": {
    "exclusions": ["string list"],
    "qualifications": ["string list"],
    "termsOfPayment": "30 days from invoice date",
    "validityPeriod": "30 days from date of bid",
    "warranty": "1 year on workmanship, manufacturer warranty on materials",
    "estimatedDuration": "4 months",
    "vatPercentage": 12
  }
}
```

**MVP approach:** Hardcode reasonable defaults in the export, with a note that these should be customized. Add UI to edit these later (post-MVP). The export should not ship with blank exclusions/terms blocks.

**Default values for MVP:**
- Exclusions: "See detailed bid form for scope. Items marked EXCLUDED, BY OTHERS, OSM, OFCI, or OSCI are not included in this bid."
- Qualifications: "Prices are based on current supplier quotations. Material prices subject to change without notice."
- Terms of Payment: "As per contract agreement."
- Validity: "30 days from date of submission."
- Warranty: "As per contract agreement and manufacturer warranties."

## Column Proposal Detail

For the Detailed Bid Form sheet, row-by-row:

```
Row 1-3:  Header block (merged cells)
Row 4:    (blank)
Row 5:    Column headers: ITEM | PARTICULARS | UNIT | QTY | MATERIAL UNIT COST | LABOR UNIT COST | COST TOTAL | LINE TOTAL | NOTES / REMARKS
Row 6:    (blank)
Row 7:    A. GENERAL PRELIMINARIES (section header, bold, merged)
Row 8-N:  Rows for section A
Row N+1:  Section A Subtotal
Row N+2:  (blank)
Row N+3:  B. SITE WORKS
...
Last:     GRAND TOTAL (bold, double underline)
```

## Test Plan

### Vitest (Unit)

1. **Workbook structure tests:**
   - Export produces valid XLSX with expected sheet names
   - Sheet 1 has header block, metadata, general notes, summary, legal blocks
   - Sheet 2 has column headers: ITEM, PARTICULARS, UNIT, QTY, MATERIAL UNIT COST, LABOR UNIT COST, COST TOTAL, LINE TOTAL, NOTES/REMARKS
   - Sheet 2 has section headers (A-I or as configured)
   - Sheet 3 has area breakdown

2. **Formula tests:**
   - COST TOTAL column contains formula referencing QTY * (MATERIAL + LABOR)
   - LINE TOTAL column contains formula for INCLUDED rows
   - LINE TOTAL displays text for EXCLUDED/BY OTHERS rows
   - Section subtotals are SUM formulas
   - Grand total is SUM of all section subtotals

3. **Value tests:**
   - Row quantity matches estimate_row_items.quantity
   - Material unit cost matches estimate_row_items.unit_cost
   - Labor unit cost is 0 (compatibility mode)
   - Detached row values used (not library values)
   - Totals are correct

4. **Scope status tests:**
   - INCLUDED rows have normal LINE TOTAL formula
   - EXCLUDED rows show "EXCLUDED" text
   - BY OTHERS rows show "BY OTHERS" text
   - OSM/OFCI/OSCI rows show appropriate text
   - Subtotals exclude EXCLUDED/BY OTHERS rows

### E2E (Playwright)

5. **Download + verify:**
   - Navigate to estimate workspace → click export → download XLSX
   - Verify file can be opened (file type check)
   - Optionally: Use ExcelJS to read the downloaded file and verify structure

### Manual QA Checklist

Open the downloaded workbook in:
- [ ] Microsoft Excel (desktop) — opens cleanly, formulas calculate, print layout correct
- [ ] Apple Numbers — opens cleanly, formatting preserved
- [ ] LibreOffice Calc — opens cleanly, formulas calculate
- [ ] Google Sheets (upload) — imports correctly

Verify:
- [ ] Header block has project name, location, client, date, sheet code, currency
- [ ] General notes are present and accurate
- [ ] Sections are lettered and organized
- [ ] Row numbering is sequential within sections
- [ ] COST TOTAL column has formulas
- [ ] LINE TOTAL column not blank for any row
- [ ] Section subtotals are formulas
- [ ] Grand total is formula
- [ ] INCLUSIONS/EXCLUSIONS handled correctly
- [ ] Exclusions/qualifications/terms/warranty/signature blocks present
- [ ] Print layout fits page width
- [ ] No blank total cells
- [ ] Currency formatting consistent (PHP with comma separators)
- [ ] No raw "NaN", "undefined", or "null" in any cell

## MVP vs Post-MVP Export Roadmap

**MVP (this plan):**
- Professional bid/BOQ format with sections, formulas, summary
- Material-only unit costs (compatibility mode)
- Hardcoded reasonable defaults for legal blocks
- Basic styling

**Post-MVP:**
- Material/labor split with separate columns
- Configurable export settings UI (exclusions, terms, VAT, warranty)
- Multiple export templates (bid form, quotation, BOQ)
- PDF export with formal proposal letter
- Customizable header/footer branding
- Multi-currency support
- Export history / snapshot tracking

## Files Likely Touched

- `src/lib/proposal-export/types.ts` — new types for sections, scope status, legal blocks
- `src/lib/proposal-export/build-proposal-export-model.ts` — major rewrite for bid form structure
- `src/lib/proposal-export/create-proposal-workbook.ts` — major rewrite for bid form layout, formulas, styling
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — minor updates
- `tests/vitest/export-bid-form.test.ts` — new comprehensive test file

## Impact-Analysis Targets

Before editing, run impact analysis on:
- `buildProposalExportModel` — blast radius ~3 callers
- `createProposalWorkbook` — blast radius ~3 callers
- `ProposalExportPreviewDialog` — depends on export model structure

## Acceptance Criteria

- [ ] Workbook opens cleanly in Excel, Numbers, LibreOffice
- [ ] Workbook has professional bid-form summary sheet
- [ ] Detailed sheet has: ITEM, PARTICULARS, UNIT, QTY, MATERIAL UNIT COST, LABOR UNIT COST, COST TOTAL, LINE TOTAL, NOTES/REMARKS
- [ ] COST TOTAL is formula-driven (QTY * UNIT COST)
- [ ] LINE TOTAL is formula-driven for included rows
- [ ] Section subtotals are formula-driven
- [ ] Grand total is formula-driven
- [ ] No blank LINE TOTAL cells
- [ ] INCLUDED/EXCLUDED/BY OTHERS handled correctly
- [ ] Header block populated with project metadata
- [ ] General notes present
- [ ] Summary section with direct cost, contingency, VAT, grand total
- [ ] Commercial/legal blocks present (exclusions, terms, warranty, signature)
- [ ] Export uses current estimate row values (not stale)
- [ ] Export handles detached (project-specific) row values
- [ ] Print layout is landscape, fits to page width
- [ ] Currency formatting is consistent
- [ ] Styling is professional (not raw data dump)
