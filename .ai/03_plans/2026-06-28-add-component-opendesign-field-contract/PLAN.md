# Add Component OpenDesign Field Contract

Date: 2026-06-28

## Job

Redesign the `Add Component` modal so the OpenDesign artifact is the source of truth for both visible fields and the create-component persistence contract.

OpenDesign source:
`/Users/philiplewis/Library/Application Support/Open Design/namespaces/release-stable/data/projects/48c33336-06b3-4b4a-be58-e0bb3014cbfc/add-component-modal.html`

## Field Contract

Keep these Add Component fields:

- Component media: thumbnail upload, "same image for all variants".
- Component: `Name`, `Description`.
- Catalogue: `Category`, `Supplier`, `Brand`.
- Base cost: `Unit cost`, `Unit` while no explicit variant is active.
- Variant drawer: variant thumbnail, `Variant Name`, `Variant Description`, `SKU / Reference`, variant `Unit cost`, variant `Unit`, equivalency quantity/unit, attachments.
- Activity: `Component state`, `Effective date`, disabled `Currency`, `Change note`.

Remove these from the Add Component user/persistence contract:

- Separate nesting tree / `Nest Component Under` field surface.
- Pricing evidence fields in the create form: pricing source, pricing date, confidence.
- Cost manager and multi-entry cost history fields: misc cost, source URL, notes, dated entries.
- Advanced measurements: length, width, height, dimension unit, computed area/volume, mass.

## Supabase Boundary

The immediate database-safe contract is to stop Add Component from accepting or writing non-OpenDesign fields. Broad shared tables/columns that other library, estimate, trust, audit, or legacy surfaces still read are not dropped blindly in this pass; they remain legacy/internal until callers are removed or a separate contract migration can safely drop them.

This still satisfies the Add Component Supabase requirement by pruning the create RPC payload and server-side normalization for new Add Component writes.

## Expected Files

- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/quick-add-validation.ts`
- targeted Vitest files for the modal and library manager
- one Supabase migration if the create RPC/snapshot contract must be tightened
- `src/lib/supabase/types.ts` only if generated/provider types are refreshed

## Validation Gate

- Targeted Add Component DOM tests updated to the OpenDesign field contract.
- Type check or focused TypeScript diagnostics for changed files.
- `git diff --check`.
- Browser/visual proof only after the field contract and component compile, because the task is explicitly visual.

## Stop Condition

Stop when the modal shows only OpenDesign fields, the create payload no longer sends removed fields, targeted tests prove the contract, and any remaining Supabase shared-schema legacy is recorded explicitly.
