# 04 Blast Radius and Integration Audit

## Risk Level

Expected risk: **broad**.

Reason: the component library is a shared source used by `/workshop/library`, the estimate-page right sidebar, estimate row insertion snapshots, template row snapshots, Supabase generated types, and route tests.

## Directly Affected Areas

### Supabase

- New migration for lifecycle enum and history/version tables.
- Generated `src/lib/supabase/types.ts`.
- RLS policies and grants.
- Potential SQL RPCs for atomic create/update/version writes.
- Advisors must be run before closing the database work.

### Repository/Data Layer

- `src/lib/repositories/component-library-repository.ts`
  - Load active price options or default active option.
  - Normalize lifecycle state into `EstimateRowItem`.
  - Preserve fallback behavior.

- `src/lib/component-library/actions.ts`
  - Add persisted component actions.
  - Keep folder actions stable.
  - Consider splitting component actions into `component-actions.ts` if file size becomes unclear.

- `src/components/workshop/component-library/helpers.ts`
  - Existing local `createComponent()` helper may need to be demoted to sidebar-only or replaced by server-backed form normalization.

### `/workshop/library`

- `ComponentLibraryManager`
  - Add `Add Component` affordance.
  - Add modal state.
  - Add local optimistic insert/update or route revalidation strategy.
  - Add lifecycle state rendering.

- Center sheet rows
  - Add status badge/column.
  - Add pricing option dropdown or preview.

- Tree panel
  - Provide current folder/supplier context to modal defaults.

### Estimate Workspace

- Estimate sidebar still uses component library rows for drag/click insertion.
- Component version and price option fields should enter `source_snapshot`.
- Existing row edits must stay quantity/Misc Cost only unless a later plan changes that.
- Component pricing changes must not silently mutate already inserted estimate rows.

### Templates

- `estimate_template_row_items` can link to `source_library_item_id`.
- Template row snapshots should also preserve component version/price option metadata when created in future template authoring workflows.
- Current `/workshop/templates` should not show components as templates.

### Tests

Likely tests to update or add:

- `tests/vitest/workshop-library-consolidation-ui.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/component-library-helpers.test.ts`
- New schema test for component versioning migration.
- New repository test for price option normalization.
- New action test for create component if server actions are testable in the current harness.
- Estimate insertion tests if `source_snapshot` shape changes.

## Known Existing Contracts to Preserve

- `/workshop/components` remains redirect-only.
- `/workshop/library` keeps the center sheet and right tree layout.
- Default view is folder-scoped.
- Supplier view is supplier-scoped.
- Component rows stay out of the route tree.
- Existing folder create/rename/delete/reorder remains intact.
- Category placement prefers `category_node_id`.
- Supplier placement prefers `supplier_id`.
- Library organization prefers `library_folder_id`.
- Static `estimateLibraryItems` remain fallback/test fixtures only.

## Migration Risks

1. **Atomicity risk:** creating item, default price option, version, and state history with separate Supabase client calls can leave partial records. Use RPC or explicit database transaction.
2. **RLS risk:** new history tables must restrict by workspace membership.
3. **Grant risk:** new public tables/functions need explicit authenticated grants.
4. **Type drift risk:** generated Supabase types must be refreshed.
5. **Backfill risk:** existing 70 component rows need initial default price option, initial version, and state history.
6. **Snapshot risk:** estimate rows linked to components should retain old pricing and record the source component version used at insertion time.
7. **UI density risk:** the modal can become too large. Use sections/tabs/stepper only if the one-modal layout becomes cramped.

## Blast-Radius Commands Before Implementation

Run graph impact before editing symbols:

- `get_impact_radius` / GitNexus impact for `ComponentLibraryManager`
- impact for `normalizeComponentLibraryItem`
- impact for `getCurrentWorkspaceComponentRowsLibrary`
- impact for `insertEstimateRowItemFromLibrary`
- impact for `EstimateRowItem` type

Then run:

- `bun run validate`
- focused Vitest:
  - `bun test tests/vitest/workshop-library-consolidation-ui.test.tsx`
  - `bun test tests/vitest/component-library-ui.test.tsx`
  - `bun test tests/vitest/component-library-helpers.test.ts`
  - relevant estimate insertion tests
- `git diff --check`

