# Component Variant Assets and Cost History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Add Component variants own measurement layout, images, attachments, and multiple dated costs.

**Architecture:** Keep `cost_library_items` as component identity and use `cost_library_item_price_options` as the variant row. Add variant-level image fields, a private attachment table/bucket, and selectable cost-entry rows while preserving denormalized current/default costs for estimate insertion.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, Bun, TypeScript, Tailwind v4, Supabase Postgres/Storage, Vitest.

---

### Task 1: Measurement UI Cleanup

**Files:**
- Modify: `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- Modify: `tests/vitest/workshop-library-consolidation-ui.test.tsx`

- [ ] **Step 1: Update the UI test**

Assert measurements render immediately, computed values are disabled controls, and mass fields are gone.

- [ ] **Step 2: Run the focused failing test**

Run: `bunx vitest run --maxWorkers=1 tests/vitest/workshop-library-consolidation-ui.test.tsx`

Expected before implementation: the old collapsible/mass assertions fail after test edits.

- [ ] **Step 3: Remove measurement collapsible state and mass UI**

Remove `measurementsOpen`, `measurementsPanelId`, Mass/Mass unit imports/options/state writes, the measurement toggle button, and mass payload writes from the modal.

- [ ] **Step 4: Render computed values as disabled input-style controls**

Use `ControlInput disabled readOnly value={...}` for:
- `Area / item` under `Length`
- `Area / unit` under `Width`
- `Volume` under `Height`

- [ ] **Step 5: Run focused test**

Run: `bunx vitest run --maxWorkers=1 tests/vitest/workshop-library-consolidation-ui.test.tsx`

Expected: pass.

### Task 2: Draft State for Variant Images, Attachments, and Cost Entries

**Files:**
- Modify: `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- Modify: `src/lib/component-library/actions.ts`
- Modify: `src/lib/estimates/types.ts`

- [ ] **Step 1: Add draft types**

Add `VariantImageDraft`, `VariantAttachmentDraft`, and `VariantCostEntryDraft`. Each `VariantDraft` gets:
- `image`
- `attachments`
- `costEntries`
- `activeCostEntryId`

- [ ] **Step 2: Preserve compatibility**

Keep `unitCost`, `miscCost`, `pricingDate`, `pricingSource`, `confidence`, `sourceUrl`, and `notes` on the variant as denormalized mirrors of the active cost entry until all downstream code reads cost entries.

- [ ] **Step 3: Add payload types**

Extend `ComponentPriceOptionInput` with optional:
- `imageBucket`, `imagePath`, `thumbnailPath`, `imageMetadata`
- `attachments`
- `costEntries`
- `activeCostEntryId`

### Task 3: Supabase Migration

**Files:**
- Create: `supabase/migrations/<timestamp>_component_variant_assets_cost_entries.sql`
- Modify: `tests/vitest/component-library-versioning-schema.test.ts`
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Create migration with Supabase CLI**

Run: `supabase migration new component_variant_assets_cost_entries`

- [ ] **Step 2: Add variant image columns**

Add nullable image bucket/path/thumbnail columns and JSON metadata to `public.cost_library_item_price_options`.

- [ ] **Step 3: Add private attachment bucket and policies**

Create `component-attachments` as private with PDF/XLS/XLSX MIME restrictions and workspace/user path policies on `storage.objects`.

- [ ] **Step 4: Add variant attachment table**

Create `public.cost_library_item_variant_attachments`, enable RLS, grant explicit authenticated privileges, and add workspace-member policies.

- [ ] **Step 5: Add cost-entry table**

Create `public.cost_library_item_variant_cost_entries`, enable RLS, grant explicit authenticated privileges, add positive cost checks, and enforce one current non-deleted row per price option.

- [ ] **Step 6: Backfill costs**

Insert one current cost entry for each existing `cost_library_item_price_options` row using its current cost/date/source fields.

### Task 4: Attachment Upload API

**Files:**
- Create: `src/app/api/component-library/attachments/route.ts`
- Test: add focused route or schema-adjacent validation coverage if route helpers are extractable

- [ ] **Step 1: Add route constants**

Use bucket `component-attachments`, 20 MB limit, and allowed MIME types for PDF, XLS, XLSX.

- [ ] **Step 2: Validate file signature**

Accept:
- PDF: `%PDF-`
- XLSX: ZIP/OOXML `PK`
- XLS: OLE Compound File Binary header

- [ ] **Step 3: Upload through server-side Supabase client**

Store paths under `<workspaceId>/<userId>/<uuid>-safe-name`.

### Task 5: RPC and Repository Wiring

**Files:**
- Modify: `src/lib/component-library/actions.ts`
- Modify: `supabase/migrations/<timestamp>_component_variant_assets_cost_entries.sql`
- Modify: `src/lib/repositories/component-library-repository.ts`
- Modify: `src/lib/estimates/types.ts`

- [ ] **Step 1: Normalize nested cost entries and attachments in actions**

Validate positive costs and allowed attachment metadata before RPC.

- [ ] **Step 2: Extend `create_cost_library_component`**

Insert cost entries and attachments after price options are created, then set active/default denormalized values.

- [ ] **Step 3: Extend snapshot functions**

Include variant image fields, active/current cost entry, and attachment summaries.

- [ ] **Step 4: Hydrate repository models**

Load attachments and cost entries for item ids, group by price option id, and attach to `ComponentPriceOption`.

### Task 6: Modal UI for Variant Assets and Costs

**Files:**
- Modify: `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- Modify: `tests/vitest/workshop-library-consolidation-ui.test.tsx`

- [ ] **Step 1: Variant image behavior**

Left thumbnail panel reads active variant image unless shared-image mode is enabled. New variant image is empty by default.

- [ ] **Step 2: Shared image checkbox**

Add `Use same image for all variants` below the thumbnail control. When checked, all variants submit the shared image data.

- [ ] **Step 3: Attachment strip**

Add active variant attachment upload/list/remove controls for PDF/XLS/XLSX.

- [ ] **Step 4: Cost-entry control**

Replace raw Cost input with a compact dropdown:
- selected/current cost in closed state
- rows with date left, amount right, delete button far right
- add-entry row with amount and date

### Task 7: Verification

**Files:**
- No source files unless fixes are required.

- [ ] **Step 1: Focused tests**

Run:
`bunx vitest run --maxWorkers=1 tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/component-library-versioning-schema.test.ts`

- [ ] **Step 2: Type/lint/build**

Run:
`bun run type-check`
`bun run lint`
`bun run lint:font-size`
`bun run build`
`git diff --check`

- [ ] **Step 3: Browser smoke**

Use the in-app browser on `/workshop/library` to verify the modal visually and interactively.

### Self-Review

- Spec coverage: every user requirement maps to Tasks 1, 3, 4, 5, and 6.
- Placeholder scan: no TBD/TODO/fill-later markers are present.
- Type consistency: `ComponentPriceOptionInput`, `ComponentPriceOption`, Supabase migration columns, and repository hydration names must be kept in sync during execution.
