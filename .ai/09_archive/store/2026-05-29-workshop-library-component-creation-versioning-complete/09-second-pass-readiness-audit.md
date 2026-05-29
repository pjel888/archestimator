# 09 Second-Pass Readiness Audit

**Date:** 2026-05-23
**Status:** Second-pass QA complete for planning documents.

## What Was Rechecked

### Live schema

Rechecked the linked Archestimator Supabase project `ebxxqidacheyapmmzavr`.

Confirmed current component-library tables still match the first plan:

- `cost_library_items` has current identity, pricing, category, supplier, and folder fields.
- `component_category_nodes` uses text ids and parent-child hierarchy.
- `component_suppliers` is workspace-scoped.
- `library_folders` is workspace-scoped and links back to category nodes through `source_category_node_id`.
- `estimate_row_items` and `estimate_template_row_items` both have `source_library_item_id`, `source_snapshot`, `category_node_id`, and `supplier_id`.

Still missing:

- lifecycle state field on `cost_library_items`;
- price option table;
- version table;
- state history table;
- price history table.

### Current code paths

Rechecked these anchors:

- `/workshop/library` loads `getCurrentWorkspaceComponentRowsLibrary`.
- `LibraryPageClient` renders `ComponentLibraryManager`.
- `ComponentLibrarySheet` currently renders `HeaderIconToolbar` with `addActions={[]}`.
- `ComponentLibraryManager` already receives `libraryFolders`, `suppliers`, `categoryTree`, and `libraryItems`.
- `component-library/index.tsx` has the older `NewComponentForm`, `Modal`, and local `createComponent()` flow for the estimate sidebar, not persisted `/workshop/library`.
- `insertEstimateRowItemFromLibrary()` and `replaceEstimateRowItemWithLibrary()` write `source_snapshot`, `category_node_id`, `supplier_id`, and `source_library_item_id`.

Correction added to the plan: the Add Component entry should use the existing center-sheet toolbar action slot rather than introduce a new header surface.

### UX/UI standards

Rechecked:

- `DESIGN.md`
- `.ai/03_plans/ui-componentization-and-storybook-plan.md`
- `src/components/ui/modal.tsx`
- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/control-select.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/empty-state.tsx`

Second-pass conclusions:

- Use shared primitives before adding route-local controls.
- Keep app/workshop text at or below `12px`.
- Use existing `Modal`; widen by prop/class if needed.
- Use `ControlSelect` for compact pricing/state dropdowns where native select is enough.
- Use `Badge` for lifecycle state.
- Use `EmptyState` for empty folder/history states.
- Do not add a new chart/graph package for the first implementation.

### Visualization package research

Checked current npm metadata:

- `react-complex-tree`: current project tree package, `2.6.1`, MIT, React peer `>=16`.
- `@xyflow/react`: `12.10.2`, MIT, React 17+ peer, good for future node-link graph workflows but overkill now.
- `react-arborist`: `3.7.0`, MIT, useful but duplicates tree infrastructure and brings DnD/windowing/redux dependency surface.
- `@visx/hierarchy`: `3.12.0`, MIT, React peer range does not include React 19.
- `@headless-tree/react`: `1.7.0`, MIT, potential future tree-system migration candidate only.

Plan correction: first implementation should visualize history as a compact timeline/list and categorization as tree/list pickers using existing dependencies.

### Route smoke

Attempted:

- `curl -I --max-time 5 http://localhost:3000/workshop/library`
- `curl -I --max-time 5 http://localhost:3000/workshop/components`

Both timed out with no bytes received. Treat browser smoke as not completed in this pass. The implementation phase must start a clean dev server with the protected-route dev-auth environment before route-level visual/browser QA.

## Readiness Verdict

The original plan direction is sound, but the second pass tightened it in three important ways:

1. No new visualization package should be added for the first Add Component slice.
2. The Add Component button should use the current center-sheet toolbar action slot.
3. The first version/history visualization should be a timeline/list, not a graph.

## Remaining Risks

- The current `Modal` default width may be too narrow for the full form; implementation should widen it through `className`, not create a new modal primitive.
- Existing `NewComponentForm` is not sufficient because it is free-text category based and local-only.
- Supabase create/update/version writes should be atomic through RPC or an equivalent transaction boundary.
- Route browser smoke was not available in this pass because localhost timed out.

