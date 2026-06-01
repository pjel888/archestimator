# Excel Export Industry-Standard Plan

## Third-Pass Workbook Contract

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. Current export is not launch-grade: sheets are `Proposal Summary`, `Detailed Estimate`, `Area Breakdown`; totals are static values despite `includeFormulas`; every row is `included`; labor is always `0`; commercial/legal blocks are missing.

MVP workbook must be:

| Sheet | Purpose | Required structure |
| --- | --- | --- |
| `Bid Form` | Estimator-facing BOQ/bid sheet | Header block: project, location, owner/client, bidder/contractor, date submitted. General notes. Columns: `ITEM`, `PARTICULARS`, `UNIT`, `QTY`, `MATERIAL`, `LABOR`, `COST TOTAL`, `LINE TOTAL`, `SCOPE`, `NOTES / REMARKS`. Section subtotal rows and formula line totals. |
| `Summary` | Commercial total sheet | Section totals, running subtotal, contingency/VAT decision, grand total, amount-in-words placeholder if feasible, cost-per-sqm only if project area exists. |
| `Commercial Terms` | Proposal qualifications | Exclusions, inclusions, payment terms, validity, warranty, duration, signature/conforme blocks, export disclaimer. |
| `Source Breakdown` | Audit/support sheet | Current area/section/source rows, link state, source item name/ID where safe, validation notes, export generated timestamp. |

Reference patterns incorporated: header block; general notes requiring nonblank line totals and scope markings; material/labor or supply/installation split; scope labels `INCLUDED`, `EXCLUDED`, `BY OTHERS`, `OWNER SUPPLIED`, `OSM`, `OFCI`, `OMITTED`, `NOT APPLICABLE`; summary with contingency/VAT/grand total/exclusions/terms/signatures. Bid tabulations and PDF-style proposal letters are post-MVP.

Formula requirements: row material subtotal = quantity * material unit cost; row labor subtotal = quantity * labor unit cost; cost total = material + labor + misc/other; line total = zero for excluded/by others/owner supplied/not applicable unless explicitly included; section subtotal = sum of launch-counted line totals; grand total = summary formula. Formula tests must inspect ExcelJS formula objects and cached results where applicable.

Manual QA: landscape fit-to-width print, repeated headers, wrapped remarks, frozen header, currency formatting, open in Excel desktop and at least one secondary spreadsheet app, no blank line totals. Route remains `runtime = "nodejs"` and uses in-memory `writeBuffer()`, so add row-count/size benchmark and Vercel proof before launch.

Goal: turn the current proposal export into a professional bid/BOQ workbook matching the reference bid-form patterns supplied in the 2026-06-01 prompt.

## Current Export Code Audit

| Area | Evidence | Gap |
| --- | --- | --- |
| Route | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:41` fetches tree, builds model, creates workbook, returns attachment. | Route is usable but model/workbook contract is too thin. |
| Filename | `filename.ts:1` sanitizes project/estimate. | Keep. |
| Types | `src/lib/proposal-export/types.ts:1` to `:157`. Scope supports only `included`, `excluded`, `alternate`. | Add bid-form scope labels/status strategy without breaking current data. |
| Model | `build-proposal-export-model.ts:24` defaults `includeFormulas=true`; `:89` labor cost is 0; `:96` every row is `included`; `:351` emits compatibility info. | Add explicit material/labor compatibility contract and commercial defaults. |
| Workbook | `create-proposal-workbook.ts:15` defines current columns; sheets created at `:271`. | Needs professional sheet layout, formulas, notes, commercial blocks. |
| Static totals | Detail rows at `create-proposal-workbook.ts:186`; total row at `:204` uses static values. | Must use formulas where possible. |
| Preview | `ProposalExportPreviewDialog.tsx:40`; preview path uses `buildProposalExportModel` impact path. | Preview/download parity must be tested. |

## Reference Bid-Form Requirements

Local search found no attached industry bid XLSX/PDF files in the repo. This spec is grounded in the user-provided reference summary from the 2026-06-01 prompt. Full attached-file review remains a manual launch evidence item in `18-excel-reference-analysis.md`.

Observed requirements:

- Header block: Project, Location, Owner/Client, Bidder/Contractor, Date Submitted.
- General notes:
  1. Do not leave LINE TOTAL blank.
  2. Indicate INCLUDED, EXCLUDED, BY OTHERS, etc.
  3. Double-check formulas and subtotals.
  4. Additional items must be under OTHERS.
  5. Use Bidder's Notes / Remarks for specifications or considerations.
- Detail columns: ITEM, PARTICULARS, UNIT, QTY, UNIT COSTS MATERIAL, LABOR, COST TOTAL, LINE TOTAL, NOTES/REMARKS.
- Sections: A General Preliminaries, B Site Works, C Architectural Works, D Glass and Glazing, E Doors and Windows, F Furniture Fixtures and Equipment, G Electrical Works, H Mechanical Works, I Plumbing / Sanitary / Fire Protection, Others / Miscellaneous.
- Summary: section totals, direct cost, contingency, VAT, grand total, cost per sqm, estimated duration.
- Commercial blocks: exclusions, qualifications, payment terms, validity, warranty, signature/conforme.
- Scope/status language: INCLUDED, EXCLUDED, BY OTHERS, OWNER, OSM, OFCI, OSCI, omitted, not applicable.

## Export Model Proposal

Add model fields in `src/lib/proposal-export/types.ts`:

```ts
// IMPLEMENTATION SKETCH - type names to verify during coding.
type BidScopeStatus =
  | "included"
  | "excluded"
  | "by_others"
  | "owner"
  | "osm"
  | "ofci"
  | "osci"
  | "omitted"
  | "not_applicable";

type CommercialTerms = {
  exclusions: string[];
  qualifications: string[];
  paymentTerms: string[];
  validityDays: number | null;
  warranty: string | null;
  estimatedDuration: string | null;
  vatRate: number;
  projectAreaSqm: number | null;
};
```

MVP default if no UI exists:

- `scopeStatus = included` for all current rows.
- `vatRate = 0` unless owner chooses 12% default before implementation.
- `projectAreaSqm = null`; cost per sqm cell shows `0` or `N/A` per chosen display contract.
- Terms/exclusions/qualifications use safe defaults approved by owner before launch.

## Sheet-by-Sheet Workbook Spec

### Sheet 1: `Bid Form`

| Row range | Content |
| --- | --- |
| 1 | Workbook title: `BID FORM / BILL OF QUANTITIES`. Merge `A1:J1`. |
| 2-7 | Header block: Project, Location, Owner/Client, Bidder/Contractor, Estimate/Revision, Date Submitted. |
| 9-15 | General Notes block with five required notes. |
| 17 | Detail table header. Freeze pane at row 18. Repeat print header row 17. |
| 18:N | Detail rows grouped by section. |
| N+1 | Final detail grand-total row. |

Columns:

| Column | Width | Header | Format |
| --- | --- | --- | --- |
| A | 9 | ITEM | text |
| B | 42 | PARTICULARS | wrapped text |
| C | 10 | UNIT | text |
| D | 12 | QTY | `#,##0.####` |
| E | 16 | MATERIAL | PHP currency |
| F | 16 | LABOR | PHP currency |
| G | 16 | COST TOTAL | PHP currency |
| H | 16 | LINE TOTAL | PHP currency/formula |
| I | 16 | SCOPE | text |
| J | 42 | NOTES / REMARKS | wrapped text |

Formula examples:

```text
EXAMPLE ONLY - actual row numbers depend on generated row offsets.
G18 = E18+F18
H18 = IF(OR(I18="EXCLUDED",I18="BY OTHERS",I18="OWNER",I18="OSM",I18="OFCI",I18="OSCI",I18="OMITTED",I18="NOT APPLICABLE"),0,D18*G18)
Section subtotal = SUM(H18:H42)
```

No blank total rule:

- Numeric total cells (`G`, `H`) must always contain either a formula or `0`.
- Text scope labels live in `I`, never in numeric total columns.
- Excluded/by-others rows show `0` in `LINE TOTAL` and the status in `SCOPE`.

### Sheet 2: `Summary`

| Row range | Content |
| --- | --- |
| 1 | `SUMMARY OF BID`. |
| 3-12 | Header recap. |
| 14 | Section summary header. |
| 15-25 | Section rows A-I and Others when present. |
| 27 | Direct Cost. |
| 28 | Contingency. |
| 29 | VAT. |
| 30 | Grand Total. |
| 31 | Cost per sqm. |
| 32 | Estimated duration. |

Formula examples:

```text
EXAMPLE ONLY
B27 = SUM(B15:B25)
B28 = direct_cost * contingency_rate
B29 = (B27+B28) * vat_rate
B30 = B27+B28+B29
B31 = IF(project_area_sqm>0,B30/project_area_sqm,0)
```

### Sheet 3: `Commercial Terms`

Blocks:

- Exclusions.
- Qualifications.
- Payment terms.
- Validity.
- Warranty.
- Signature / Conforme.

No formulas required except dates if owner approves.

### Sheet 4: `Source Breakdown`

Keep optional internal sheet for traceability:

- Proposal item number.
- Source row id.
- Source node/area path.
- Original material/description.
- Quantity/unit/cost.
- Link state after row DTO mapping if available.

This sheet may be hidden by default for client exports if owner wants a cleaner deliverable.

## Styling and Print Layout

| Element | Token/format |
| --- | --- |
| Font | System/Arial-compatible. |
| Header fill | Dark ink (`FF111827`) with white text, matching current workbook style. |
| Section rows | Light grey fill (`FFF3F4F6`), bold. |
| Total rows | Bold, top border, double bottom border. |
| Page setup | Landscape, fit to width 1, narrow margins. |
| Freeze panes | `Bid Form` row 18; `Summary` row 14. |
| Repeated print headers | Detail table header row on `Bid Form`; summary header on `Summary`. |
| Number formats | PHP currency, quantity format from current workbook. |

## Section Mapping

Map current row category/discipline to the reference sections:

1. Normalize category/discipline text.
2. Map known trade names to A-I labels.
3. Put unmatched/additional items under `Others / Miscellaneous`.
4. Preserve original category in remarks or source breakdown.

## Material/Labor Compatibility

Current generated row type has no `labor_cost`; legacy migration consolidated labor/supplementary costs into `misc_cost`. MVP export must:

- Use current `itemCost` as material unit cost.
- Set labor unit cost to `0`.
- Put `miscCost` in cost total or a remarks-compatible amount according to final model.
- Include an informational validation issue explaining compatibility mode.
- Do not claim labor data is impossible historically; say current schema is consolidated.

## VAT/Contingency

- Contingency percentage exists on rows and should be represented either in line totals or summary, not both.
- First implementation must choose one calculation path and test it:
  - Option A: row-level contingency included in line total; summary contingency is 0.
  - Option B: direct row cost excludes contingency; summary contingency applies once.
- Owner decision required before coding to avoid double-counting.
- VAT default requires owner decision.

## Preview/Download Parity

- Preview model and downloaded workbook must share `buildProposalExportModel`.
- Preview must display the same summary totals, section totals, validation issues, and commercial defaults.
- Export route tests must assert headers and workbook content.

## ExcelJS Test Assertions

- Sheet names exactly match spec.
- Header cells contain required labels.
- Column widths match expected widths.
- Freeze panes and page setup are set.
- Print titles/repeated rows are set where ExcelJS exposes them.
- `LINE TOTAL` cells are never blank.
- Included rows have formulas.
- Excluded/by-others rows have numeric `0` in line total.
- Section subtotal formulas reference the correct row bands.
- Grand total formula references summary cells.
- Commercial blocks exist.
- Workbook opens from buffer and preserves formulas.

## Manual QA

Open generated workbook in:

- Microsoft Excel.
- Apple Numbers.
- LibreOffice.
- Google Sheets.

Verify:

- No blank line total cells.
- Formulas recalculate.
- Print preview fits landscape width.
- Header and notes are visible.
- Section totals and grand total match preview.
- Scope labels do not break formulas.
- Commercial blocks are legible.

## Tickets

- EXP-001 Export model contract rewrite.
- EXP-001 Workbook builder bid-form layout.
- EXP-001 Export formula/scope/status tests.
