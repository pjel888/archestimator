# Workshop Library Component Creation and Versioning Plan

**Date:** 2026-05-23
**Route:** `/workshop/library`
**Status:** Implemented on 2026-05-23; keep as implementation/audit source.
**Supabase project checked:** `ebxxqidacheyapmmzavr` (`Archestimator`)

## Goal

Add a production-quality Add Component workflow to `/workshop/library` that creates persisted Supabase-backed components, places them correctly in the existing folder/category/supplier organization, supports multiple pricing options, records pricing changes over time, and records component lifecycle state changes over time.

## Current Evidence

- `/workshop/library` is the canonical component route. `/workshop/components` redirects to it.
- The route loads `getCurrentWorkspaceComponentRowsLibrary()` and renders `ComponentLibraryManager`.
- Current Supabase identity table is `public.cost_library_items`.
- Current organization tables are `public.component_category_nodes`, `public.component_suppliers`, and `public.library_folders`.
- Live remote counts on 2026-05-23:
  - `component_category_nodes`: 685
  - `component_suppliers`: 43
  - `library_folders`: 685
  - `cost_library_items`: 70
  - linked estimate rows with `source_library_item_id`: 2
- Current table shape has `unit_cost`, `misc_cost`, `pricing_source`, `pricing_date`, `confidence`, `category_node_id`, `supplier_id`, and `library_folder_id`, but no component version table, no pricing option table, and no lifecycle-state history table.

## Plan Documents

1. `01-current-state-and-supabase-shape.md` - current route, source, schema, and gap audit.
2. `02-product-and-ux-plan.md` - modal workflow and component categorization UX.
3. `03-data-model-versioning-plan.md` - proposed Supabase schema and versioning contracts.
4. `04-blast-radius-and-integration-audit.md` - affected pages, repositories, tests, and migration risks.
5. `05-implementation-sequence.md` - staged rollout plan.
6. `06-test-validation-and-release-readiness.md` - readiness gates and QA matrix.
7. `07-open-questions-and-decision-log.md` - decisions made for the plan and unresolved choices.
8. `08-visualization-package-research.md` - second-pass package research for tree, graph, timeline, and hierarchy visualization.
9. `09-second-pass-readiness-audit.md` - second-pass code/schema/UX verification and corrections.
10. `10-third-pass-implementation-readiness-gate.md` - final pre-implementation QA gate, sequencing locks, and evidence.
11. `11-implementation-closeout.md` - implemented schema/UI/test/remote verification evidence.

## Implemented Result

As of 2026-05-23, `/workshop/library` has a Supabase-backed Add Component workflow in the center sheet toolbar. The modal persists component identity, workspace folder, reporting category, supplier, lifecycle state, and multiple pricing options through SQL RPCs. Existing components now expose compact lifecycle state controls, pricing-option dropdowns when more than one price option exists, and a read-only history list.

The linked Supabase project `ebxxqidacheyapmmzavr` has migration `20260523120957_component_library_item_versioning` applied and recorded. Existing 70 `cost_library_items` were backfilled into 70 price-option rows, 70 whole-component version rows, 70 price-history rows, and 70 lifecycle-state history rows.

## Recommended Architecture

Keep `cost_library_items` as the stable component identity table and add append-only history around it:

- `component_lifecycle_state` enum plus current lifecycle fields on `cost_library_items`.
- `cost_library_item_versions` for whole-component revision snapshots.
- `cost_library_item_price_options` for multiple selectable price options per component.
- `cost_library_item_price_history` or append-only version rows for price option changes.
- `cost_library_item_state_history` for status transitions.

The current `cost_library_items.unit_cost` and `misc_cost` should remain denormalized current defaults for fast existing reads and estimate insertion compatibility. New version/price tables should become the source of truth for history and UI option selection.

For the first implementation, the canonical current price is the single active default row in `cost_library_item_price_options`. `cost_library_items.active_price_option_id` may be added only after `cost_library_item_price_options` exists, and should be treated as an optional denormalized pointer, not the primary integrity mechanism.

## Second-Pass Visualization Decision

Do not add a new visualization dependency for the first Add Component implementation. The route already uses `react-complex-tree@2.6.1`, shared compact tree rows, and `HeaderIconToolbar`. Shared primitives such as `Modal`, `ControlSelect`, `Badge`, and `EmptyState` exist in the codebase and should be adopted for the modal/dropdown/badge/empty-history surfaces instead of adding route-local replacements. Those are enough for a structured folder/category/supplier picker, pricing-option dropdowns, state badges, and a read-only version timeline.

If a later release needs a true node-link graph for component lineage, supplier relationships, or version branching, evaluate `@xyflow/react` then. It is not required for the first modal/sheet workflow.

## Non-Goals

- Do not restore the rejected old standalone component manager chrome.
- Do not put component rows back into the tree; the tree remains folder/supplier navigation and rows remain in the center sheet.
- Do not mutate existing estimate rows when component library pricing changes. Existing estimates should preserve copied snapshots unless an explicit future "refresh from source" workflow is built.
- Do not add Supabase Realtime as part of this slice.
