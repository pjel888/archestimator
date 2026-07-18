# UNIT-006 · Variant accommodation (import + BOQ export)

- **Requirement:** REQ-005
- **Priority:** P1 · **Effort:** S+M · **Risk:** LOW · **Status:** PLANNED
- **Depends on:** UNIT-005 (amends the import spike); UNIT-006b (export
  extension) should land before UNIT-005 implementation so the round-trip
  is consistent.
- **Evidence:** EVID-006
- **Decision:** `DEC-AUTO-010` (variants are CORE, not auxiliary)

## Goal

The import and BOQ-export surfaces accommodate the one-component-many-variants
pattern, because PH bid-prep routinely has 2–3 supplier variants per line
item.

## Source evidence (commit `a41a07d01`)

- Variant schema is mature: `cost_library_item_price_options` (the variants,
  `migrations/0026_…sql:77-104`), `cost_library_items.active_price_option_id`
  (`0026:54`), `cost_library_item_variant_cost_entries` (per-variant price
  history, `0028:65-90`). Cardinality 1 item → N variants → M history rows.
- Variant UI is built: `AddComponentModal.tsx` (variant drawer, add/remove
  buttons, default-invariant enforcement); row-level variant picker
  `MaterialVariantControl` at `src/components/workshop/estimate-sheet/rows/cells.tsx:362-425`
  (only renders when ≥2 variants); inspector dock surfaces per-variant price
  history.
- Variant deletion is guarded: blocked upstream when a row references it
  (`component-mutation-d1.ts:1584`); requires explicit replacement. No silent
  default-variant fallback.
- Linked templates carry variant selections: `0092_…sql:88` serializes
  `selectedVariantId`; `template-propagation-d1.ts:163-168,182-183,233-234`
  re-resolves the variant and writes `priceOptionId` + `priceOptionLabel`
  into propagated rows.
- **Import is variant-blind:** `2026-07-18-Codebase-Improve-Audit-Plan-Pack/031-spike-library-bulk-import.md`
  mentions `variant` / `price_option` / `price_option` zero times. It reuses
  the exporter's one-row-per-component shape.
- **BOQ export is variant-blind:** negative grep for
  `priceOption|price_option|variant|Variant|priceOptionLabel` over
  `src/lib/proposal-export/` → zero matches. The exporter writes only the
  resolved unit price per row, even though the row source snapshot carries
  `priceOptionId` and `priceOptionLabel`.

So the schema, in-product authoring, and template propagation all speak
variants; the highest-leverage onboarding path (import) and the
client-facing artifact (BOQ export) do not.

## Implementation

Two pieces; no schema migration (tables exist):

- **006a (amends UNIT-005 / improve spike 031):** require row-grouped
  ingestion. Group key = component name+SKU; member rows = variants with
  `label, sku, unit_cost, supplier, pricing_source, pricing_date`. Validation
  reuses `validatePriceOptions` (`actions.ts:688`) and the ≥1-variant /
  exactly-one-default invariants.
- **006b (small, standalone):** extend `build-proposal-export-model.ts` to
  carry `priceOptionLabel` and optionally an alternates column on each row,
  so the BOQ labels which variant was chosen. Update `create-proposal-workbook.ts`
  to render the column. This is also the precondition that makes the exporter
  shape a valid round-trip import spec for 006a, and it independently improves
  the PH bid artifact (addresses the G-09 credibility gap).

## Acceptance evidence

- Import of a spreadsheet with 5 multi-variant groups produces 5 components,
  each with 2–3 variants — not 15 separate components.
- BOQ export labels the chosen variant per row; alternates column is
  populated when more than one variant exists.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped round-trip (export →
import → re-export) proves correctness.

## Recovery

If the alternates column is unwanted by a particular client, it is
toggleable in `ProposalExportPreviewDialog.tsx` (extend the existing
audience selector). Import variant-grouping is reversible per-row by
re-keying the group column.

## Completion signal

A spreadsheet with one component and three brand alternates round-trips
through Archestimator (import → estimate → BOQ export) and the export
labels all three variants correctly.
