# 01 Current State and Supabase Shape

## Route State

`/workshop/library` currently renders:

- `src/app/workshop/library/page.tsx`
- `src/components/workshop/LibraryPageClient.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

`/workshop/components` is a compatibility redirect and should not receive new feature code.

The visible route is already component-only:

- One tree tab: `Components`.
- Two tree view modes:
  - `View By: Default` for workspace-scoped `library_folders`.
  - `Suppliers` for supplier-backed organization.
- Center sheet renders component rows based on the selected folder or supplier.
- Component row items are not tree leaves on `/workshop/library`.

## Current Local Implementation

Primary read path:

1. `getCurrentWorkspaceComponentRowsLibrary()`
2. `loadCurrentWorkspaceComponentRowsLibrary()`
3. Supabase queries:
   - `component_category_nodes`
   - `component_suppliers`
   - `cost_library_items`
4. `ensureWorkspaceLibraryFolders()` creates workspace folder mirrors when missing.
5. `normalizeComponentLibraryItem()` maps `cost_library_items` into `EstimateRowItem` objects for shared UI/estimate insertion compatibility.

Existing folder actions:

- `createLibraryFolder()`
- `renameLibraryFolder()`
- `deleteLibraryFolder()`
- `reorderLibraryFolders()`

Missing persisted component actions:

- Create component.
- Edit component.
- Duplicate component into same or selected folder.
- Change component lifecycle state.
- Add/edit/deactivate price option.
- View historical price/status/version log.

There is an older `NewComponentForm` and local helper `createComponent()`, but that helper creates an in-memory `custom-*` item and is used by the estimate sidebar surface, not the canonical persisted `/workshop/library` route.

## Live Supabase Shape Checked on 2026-05-23

`public.cost_library_items` has:

- `id uuid`
- `workspace_id uuid`
- `kind cost_library_item_kind`
- `name text`
- `description text`
- `category text`
- `supplier text`
- `brand text`
- `sku text`
- `unit text`
- `unit_cost numeric`
- `pricing_source text`
- `pricing_date date`
- `confidence text`
- `thumbnail_path text`
- `metadata jsonb`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`
- `misc_cost numeric`
- `category_node_id text`
- `supplier_id uuid`
- `library_folder_id uuid`

Related organization tables:

- `component_category_nodes`: global taxonomy, 685 rows, text ids.
- `component_suppliers`: workspace-scoped suppliers, 43 rows.
- `library_folders`: workspace-scoped folder organization, 685 rows.

Existing enum values:

- `cost_library_item_kind`: `material`, `labor`, `equipment`, `subcontract`, `assembly`, `allowance`.
- `estimate_row_link_state`: `unlinked`, `linked-clean`, `linked-overridden`, `detached`, `source-changed`.

## Gaps

1. No persistent add-component action.
2. No first-class state/status column for components.
3. No append-only lifecycle-state history.
4. No multiple pricing options per component.
5. No historical pricing timeline.
6. No whole-component version table.
7. No active price option relation.
8. No UI for selecting taxonomy/folder/supplier from the existing tree structure.
9. No update to estimate insertion snapshots to include component version and price option ids.
10. No tests for route-level Add Component persistence.

