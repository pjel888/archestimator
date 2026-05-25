# Component Library Identity and Brand View

**Date:** 2026-05-24
**Status:** In implementation
**Route:** `/workshop/library`

## Decision

Component identity no longer needs a `Kind` field. SKU/reference belongs to each variant because dimensions, color/finish, supplier references, and price records vary by variant.

Brand is now a peer organization view beside Default folders and Suppliers. Default remains the only true editable folder hierarchy; Suppliers and Brand are database-backed grouping views from `component_suppliers` and `component_brands`.

## UX Contract

- Add Component identity fields: Name, Brand, Supplier.
- Variant tab fields: Variant name, SKU / Reference, Cost entries, Unit, Package contains, Dimensions, Description, image, attachments.
- Default variant button label: `Default`.
- `View By`: `Default`, `Suppliers`, `Brand`.
- Add Folder can be triggered from any view, but it creates/selects a Default folder and moves the view back to Default so folder placement is unambiguous.
- Selecting or typing a supplier in Add Component selects that supplier/pending supplier in the Suppliers tree view. Brand follows the same rule in Brand view.

## Data Contract

- Remove component `kind` from UI, action payloads, generated types, and current Supabase schema.
- Store SKU/reference on `cost_library_item_price_options.sku`.
- Backfill legacy `cost_library_items.sku` into the default variant before retiring component-level use.

## Verification

Use the `.omx` handoffs:

- `.omx/plans/prd-component-library-identity-and-brand-view.md`
- `.omx/plans/test-spec-component-library-identity-and-brand-view.md`
