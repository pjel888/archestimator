# Component Variant Assets and Cost History Plan

**Date:** 2026-05-24
**Route:** `/workshop/library`
**Surface:** Add Component modal
**Status:** Implemented locally; remote Supabase apply not yet run

## Goal

Make component variants the true owner of specification details, imagery, attachments, and cost history:

- Measurements stay visible in the variant tab without a collapsible/dropdown.
- Computed area/volume values sit directly under their input counterparts and render as disabled inputs.
- Mass fields leave the modal.
- Each variant can own its own image.
- A modal-level toggle can reuse one image across all variants.
- Each variant can attach PDF/Excel files.
- Each variant can maintain multiple dated cost entries, with a searchable/selectable cost dropdown and delete affordance.

## Current Evidence

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` owns the Add Component draft, variant tabs, current image upload, measurement fields, and `createCostLibraryComponent()` payload assembly.
- `src/lib/component-library/actions.ts` validates variant payloads and calls `public.create_cost_library_component`.
- `supabase/migrations/20260524120322_component_library_variants.sql` made `cost_library_item_price_options` the variant/specification table.
- `src/app/api/component-library/images/route.ts` already handles authenticated image upload, server-side image validation, WebP conversion, and Supabase Storage writes to `component-images`.
- `src/lib/repositories/component-library-repository.ts` hydrates items, price options, versions, price history, and state history into `EstimateRowItem` rows.

GitNexus impact on 2026-05-24:

- `AddComponentModal`: LOW risk; direct caller is `ComponentLibraryManager`.
- `createCostLibraryComponent`: LOW risk; direct caller is modal `submit`.
- `normalizeComponentLibraryItem`: LOW risk; direct repository read path.

## Data Model Decision

Keep the existing compatibility model:

- `cost_library_items` remains component identity and denormalized current/default price.
- `cost_library_item_price_options` remains the variant table.
- Existing estimate rows continue to copy snapshots and do not silently update when component variants/costs change.

Add three variant-owned concepts:

1. Variant image fields on `cost_library_item_price_options`:
   - `image_bucket text`
   - `image_path text`
   - `thumbnail_path text`
   - `image_metadata jsonb not null default '{}'`

2. Variant attachment rows:
   - `cost_library_item_variant_attachments`
   - `workspace_id`, `item_id`, `price_option_id`
   - `storage_bucket`, `storage_path`, `file_name`, `content_type`, `size_bytes`
   - `attachment_kind` constrained to PDF/Excel-compatible values
   - `created_by`, timestamps

3. Variant cost entries:
   - `cost_library_item_variant_cost_entries`
   - `workspace_id`, `item_id`, `price_option_id`
   - `unit_cost`, `misc_cost`, `currency`, `pricing_date`
   - `pricing_source`, `confidence`, `source_url`, `notes`
   - `is_current`, `deleted_at`
   - exactly one non-deleted current entry per variant

`cost_library_item_price_history` remains the append-only audit trail. The new cost-entry table is user-manageable selection history, so users can delete old entry choices without deleting the audit trail.

## Supabase Storage Decision

- Keep `component-images` public because thumbnails are already public visual catalogue media.
- Store PDF/Excel attachments in a new private bucket `component-attachments`.
- Use bucket-level restrictions for content type and file size.
- Add `storage.objects` policies for authenticated workspace-member upload/read/delete by workspace/user path.
- Delete storage objects through Supabase Storage API, not direct SQL, when attachment deletion becomes active.

Relevant current Supabase docs/changelog:

- Storage buckets define public/private access and upload restrictions: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Storage uses RLS policies on `storage.objects`; uploads need `INSERT`, upsert needs `SELECT` and `UPDATE`: https://supabase.com/docs/guides/storage/security/access-control
- Storage object deletion must use the Storage API to avoid orphaned files: https://supabase.com/docs/guides/storage/management/delete-objects
- New public tables need explicit grants as Supabase rolls out no-auto-exposure defaults from May 30, 2026: https://supabase.com/changelog#breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## UI Decision

### Measurements

Use a fixed two-row grid:

- Row 1: `Length`, `Width`, `Height`, `Dimension unit`
- Row 2: disabled input `Area / item`, disabled input `Area / unit`, disabled input `Volume`, empty spacer/helper

Remove:

- Measurements toggle/caret.
- Measurements short description.
- `Mass`.
- `Mass unit`.

### Variant Image

The left image panel reflects the active variant:

- If `Use same image for all variants` is checked, all variants display/use the shared image.
- If unchecked, switching or adding variants shows that variant's own image state.
- Newly added variants start with no image unless the shared-image toggle is checked.

### Attachments

Add a compact attachment strip inside the active variant tab:

- Accept PDF, XLS, XLSX.
- Show filename, type, size, and remove icon.
- Upload immediately to private storage; persist attachment metadata only when the component is saved.

### Cost Entries

Replace the raw `Cost` input with a cost-entry combobox-style control:

- Closed state shows selected/current cost.
- Dropdown rows show date on the left, amount right-aligned, delete icon at far right.
- Add-entry row lets users input amount and date.
- Deleting a row marks the cost entry as deleted in persistence and removes it from selectable entries.
- The selected/current cost entry denormalizes to `cost_library_item_price_options.unit_cost` and, for the default variant, `cost_library_items.unit_cost`.

## Implementation Sequence

1. Measurement cleanup first: no schema dependency, easy regression test.
2. Draft state refactor: add variant image, attachments, and cost entries while keeping existing payload compatibility.
3. Supabase migration: variant image columns, attachment table/bucket, cost-entry table, grants/RLS, backfill.
4. API route: authenticated PDF/Excel attachment upload with magic-byte validation and private storage writes.
5. Server actions/RPCs: accept nested attachments and cost entries; return created ids.
6. Repository/types: hydrate variant assets and cost entries.
7. Modal UI: image ownership toggle, variant attachment strip, cost-entry dropdown.
8. Verification: focused Vitest, schema string tests, type-check, lint, build, and in-app browser smoke.

## Acceptance Criteria

- Add Component no longer renders a measurement dropdown/collapsible or mass fields.
- Area/item, area/unit, and volume render as disabled input-style controls under Length, Width, and Height.
- Adding Variant 2 clears the visible image unless `Use same image for all variants` is checked.
- Each variant payload can carry its own image metadata.
- Attachment upload accepts PDF/XLS/XLSX and rejects other types.
- Attachments are stored in a private bucket and linked to the saved variant row.
- Each variant can save multiple dated cost entries.
- Cost dropdown displays date left, amount right, delete icon far right.
- The selected/current cost entry is the value used for estimate insertion compatibility.
- Existing estimate rows are not updated when component variant costs/images change.

## Verification Plan

- `bunx vitest run --maxWorkers=1 tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/component-library-versioning-schema.test.ts`
- `bun run type-check`
- `bun run lint`
- `bun run lint:font-size`
- `bun run build`
- `git diff --check`
- In-app browser smoke on `/workshop/library`: open Add Component, verify measurement layout, switch variants, verify image reset/shared toggle, add/delete cost entry, attach sample PDF/XLSX when fixture files exist.

## Implementation Evidence

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` now renders measurement computed values as disabled inputs, removes mass from the modal, switches the image preview to active-variant ownership with a shared-image checkbox, adds variant attachments, and replaces the raw cost field with a dated cost-entry dropdown.
- `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql` adds variant image columns, `component-attachments`, `cost_library_item_variant_attachments`, and `cost_library_item_variant_cost_entries`.
- `src/app/api/component-library/attachments/route.ts` uploads authenticated PDF/XLS/XLSX files to private storage after MIME and magic-byte validation.
- `src/lib/component-library/actions.ts`, `src/lib/repositories/component-library-repository.ts`, `src/lib/estimates/types.ts`, and `src/lib/supabase/types.ts` carry variant images, attachments, and cost entries through payload validation and hydration.
- Passing local checks on 2026-05-24: `bunx vitest run --maxWorkers=1 tests/vitest/workshop-library-consolidation-ui.test.tsx`, `bunx vitest run --maxWorkers=1 tests/vitest/component-library-versioning-schema.test.ts`, combined focused Vitest for both files, targeted ESLint, `bun run type-check -- --pretty false`, and `git diff --check`.
- Local Supabase migration dry-run is blocked because Docker/local Postgres is not running (`127.0.0.1:54322` refused).

## Non-Goals

- No public attachment URLs in the first pass.
- No global unit conversion system.
- No Supabase Realtime.
- No automatic estimate-row price refresh.
- No destructive removal of old nullable `mass` columns in the first migration; the UI stops writing them and a later cleanup can drop them after data review.
