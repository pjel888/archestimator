# 11 Implementation Closeout

**Date:** 2026-05-23
**Status:** Implemented and locally verified.
**Route:** `/workshop/library`
**Supabase project:** `ebxxqidacheyapmmzavr`

## Implemented Scope

- Added migration `20260523120957_component_library_item_versioning.sql`.
- Kept `cost_library_items` as the stable component identity table.
- Added `component_lifecycle_state`, current lifecycle fields, `active_price_option_id`, and `current_version_number`.
- Added `cost_library_item_versions`, `cost_library_item_price_options`, `cost_library_item_price_history`, and `cost_library_item_state_history`.
- Added security-definer RPCs for component create/update, price-option upsert/default switching, and lifecycle-state transitions.
- Backfilled existing components into default price options, initial version rows, price history, and state history.
- Added `/workshop/library` Add Component modal using existing compact shared primitives.
- Added center-sheet pricing dropdowns, lifecycle dropdowns, lifecycle badges, and compact history display.
- Extended estimate insertion snapshots with component version, price option, lifecycle, source id, and price fields.

## Remote Verification

Linked database verification immediately after applying the migration:

```txt
cost_library_items: 70
cost_library_item_price_options: 70
cost_library_item_versions: 70
cost_library_item_price_history: 70
cost_library_item_state_history: 70
schema_migrations version 20260523120957: recorded
```

Browser smoke then created `Smoke Component 1779540034483` from `/workshop/library` with two price options. Post-smoke linked database counts:

```txt
cost_library_items: 71
cost_library_item_price_options: 72
cost_library_item_versions: 71
cost_library_item_price_history: 72
cost_library_item_state_history: 71
smoke component rows: 1
smoke component price options: 2
```

Row-control smoke then switched the same component to the `Installed` price option and `discontinued` lifecycle state. Linked database verification for that row:

```txt
lifecycle_state: discontinued
current_version_number: 4
active_price_label: Installed
active_unit_cost: 1678.00
version_count: 4
price_history_count: 3
state_history_count: 3
```

Security-definer RPCs verified in `information_schema.routines`:

```txt
create_cost_library_component: DEFINER
update_cost_library_component: DEFINER
upsert_cost_library_component_price_option: DEFINER
set_cost_library_component_lifecycle_state: DEFINER
```

## Local Verification

Focused verification passed:

```bash
bun run type-check
bunx vitest run --maxWorkers=1 \
  tests/vitest/component-library-versioning-schema.test.ts \
  tests/vitest/workshop-library-consolidation-ui.test.tsx \
  tests/vitest/component-library-manager-ui.test.tsx \
  tests/vitest/estimate-sheet-library-insert.test.tsx \
  tests/vitest/library-folder-schema.test.ts \
  tests/vitest/component-library-templates-repository.test.ts \
  tests/vitest/workspace-repository-estimate-tree.test.ts \
  tests/vitest/estimate-node-reorder-action.test.ts
```

Result: 8 test files passed, 55 tests passed.

Full validation after implementation:

```txt
bun run validate: passed
bun run build: passed
git diff --check: passed
Playwright smoke for http://localhost:3000/workshop/library: passed
```

## Notes

- No new visualization package was added; the implementation uses existing `Modal`, `ControlSelect`, `Badge`, `EmptyState`, `HeaderIconToolbar`, and existing tree primitives.
- The route keeps line-item rows out of the tree. Folder/supplier navigation remains the tree responsibility; rows render in the center sheet.
- Direct migration application was required because the linked remote migration history contains older versions not present in the local migrations directory. The new version was recorded in `supabase_migrations.schema_migrations` after successful DDL application.
- `supabase db lint --linked` still reports the older `insert_estimate_template_into_estimate` temporary-table relation as missing during lint analysis. This is outside the component-versioning migration and should be handled in a focused template-RPC lint cleanup.
