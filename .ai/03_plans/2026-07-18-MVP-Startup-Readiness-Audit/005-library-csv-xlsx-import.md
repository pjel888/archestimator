# UNIT-005 · Library CSV/XLSX import

- **Requirement:** REQ-004, REQ-005 (variant accommodation extends this unit)
- **Priority:** P1 · **Effort:** M · **Risk:** MED · **Status:** PLANNED
- **Depends on:** UNIT-002 (instrument funnel first)
- **Evidence:** EVID-005
- **Cross-reference:** quality master `IMPROVE-031` records the old spike as
  duplicate/external-owner work; this unit implements it and UNIT-006 adds
  variant accommodation.

## Goal

A solo estimator can upload an existing spreadsheet of priced components and
bulk-insert them into their library, with column mapping, validation, and
per-workspace caps. The import accommodates the one-component-many-variants
pattern (per REQ-005, UNIT-006).

## Source evidence (commit `a41a07d01`)

- Negative grep over `src/` and `scripts/` for `xlsx.read`, `sheet_to_json`,
  `papaparse`, `csv-parse`, `read-excel`, `sheetjs` → only export-side
  matches. XLS/XLSX attachments are accepted as reference uploads only and
  are never parsed.
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  (2688 lines) is single-row create only. No bulk path.
- The only `INSERT INTO cost_library_items` paths are single-row:
  `src/lib/component-library/component-mutation-d1.ts:1418`,
  `src/lib/estimates/express-promotion-actions.ts:1309`,
  `src/lib/ai/package-builder/apply.ts:1848`.
- The existing improve-audit spike `031-spike-library-bulk-import.md`
  scopes the same job but is variant-blind (it reuses the exporter's
  one-row-per-component shape, which carries no variant dimension).

## Implementation

- Accept `.csv` and `.xlsx`. Use the already-declared `exceljs` dep
  (`package.json`), or extend the in-house `xlsx-workbook.ts` reader.
- Wizard: upload → auto-detect header row → map columns
  (`name, unit, unit_cost, misc_cost, supplier, brand, category,
  pricing_date`) → preview first 20 rows with validation errors
  highlighted → confirm bulk insert.
- **Variant-aware** (UNIT-006 amendment): accept a row-grouped shape —
  group key = component name+SKU; member rows = variants with their own
  `label, sku, unit_cost, supplier, pricing_source, pricing_date`. Validation
  reuses `validatePriceOptions` (`actions.ts:688`) and the ≥1-variant /
  exactly-one-default invariants.
- Per-workspace cap (e.g. 1000 rows/import, 10k items/workspace) to bound
  R2/D1 cost.
- Insert via batched `INSERT INTO cost_library_items` and
  `cost_library_item_price_options` (reuse `component-mutation-d1.ts`
  patterns; honor the existing FK `ON DELETE CASCADE`).

## Acceptance evidence

- A real spreadsheet imports cleanly; invalid rows are reported with
  row-level errors.
- A multi-variant spreadsheet produces one component with N variants (not N
  components).
- Library reflects new items; per-variant price history rows are seeded.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped manual import proves
correctness. `TEST_PROPOSAL`: focused parser test once column mapping lands;
risk: silent data corruption on malformed spreadsheets.

## Recovery

A bad import is reversible per-workspace: the bulk-insert uses a D1 batch;
on any row failure the batch rolls back. The library's existing archive
path (`executeBulkArchiveLibraryComponents`) cleans up unintended inserts.

## Completion signal

A user uploads a 50-row spreadsheet (with 5 multi-variant groups) and the
library reflects exactly 45 components (the 5 groups become 5 multi-variant
items), each variant correctly priced and historically logged.
