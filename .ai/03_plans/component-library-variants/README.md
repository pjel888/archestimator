# Component Library Variants

**Date:** 2026-05-24
**Surface:** `/workshop/library` Add Component modal

## Outcome

One component can now carry multiple variants. Component identity stays on `cost_library_items`, while variant-specific cost, unit, package, dimensions, mass, and description live on the component's variant rows.

## Implementation Shape

- Reuse the existing Add Component modal structure and compact workshop tab visual language.
- Keep the top identity fields as component-level facts: name, brand, supplier, kind, and SKU/reference.
- Place variant tabs directly under the Kind and SKU/reference row.
- Create one default `Variant 1` tab for every new component draft.
- Treat the current `cost_library_item_price_options` records as the first persisted variant layer, extended with variant metadata columns instead of creating a disconnected table.
- Preserve compatibility with current estimate insertion/versioning by keeping the default active variant as the current component price.
- Keep component mutation RPCs authenticated-only and keep trigger helper functions off the public RPC surface.

## Acceptance

- Add Component opens with a `Variant 1` tab beneath Kind/SKU.
- Variant tab content owns Cost, Unit, Package contains, Dimensions, Mass, and Description.
- Users can add another variant before saving.
- The Supabase migration is additive and keeps existing components valid.
- Existing price/version/history snapshots include the new variant fields.
