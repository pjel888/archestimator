# 05 Implementation Sequence

## Phase 0: Approval Gate

Do not implement until the plan pack is reviewed. This is a broad schema/UI/source-of-truth change.

## Phase 1: Schema and Backfill Plan

1. Create migration with `supabase migration new component_library_item_versioning`.
2. Add enum and non-cyclic current-state/version columns on `cost_library_items`.
3. Create price option table, version table, price history table, and state history table.
4. Add `active_price_option_id` only after the price option table exists, or omit the pointer until after backfill if the partial unique default-price index is enough for first release.
5. Backfill every existing `cost_library_items` row:
   - lifecycle state `available`
   - one default price option from current `unit_cost`, `misc_cost`, `unit`, `pricing_source`, `pricing_date`, `confidence`
   - version 1 snapshot
   - initial state history row
6. Add indexes:
   - `(workspace_id, lifecycle_state)`
   - `(item_id, version_number)`
   - `(item_id, is_active)`
   - default active price option partial unique index on `(item_id)` where `is_default and is_active`.
7. Add RLS and grants.
8. Add RPCs for atomic create, update, lifecycle state change, default price change, and price option upsert.
9. Regenerate Supabase types.
10. Drain deferred constraints with `set constraints all immediate;` before RLS/ALTER blocks where deferrable constraints or seed/backfill paths require it.
11. Run schema/advisor checks.

Phase 1 is a hard prerequisite. Do not build UI against mock local-only writes; it risks repeating the existing `NewComponentForm` trap.

## Phase 2: Repository Read Model

1. Extend component-library repository to load default active price options.
2. Normalize component rows with lifecycle state and active pricing metadata.
3. Keep current denormalized `cost_library_items` columns as fallback when version tables are absent or not backfilled.
4. Add repository tests for:
   - current rows without price options
   - rows with multiple price options
   - discontinued/archived states

## Phase 3: Server Actions

1. Add `createCostLibraryComponent` action/RPC wrapper.
2. Add wrappers for update component, price option upsert/default change, and lifecycle state change.
3. Validate:
   - workspace membership
   - folder belongs to workspace
   - supplier belongs to workspace
   - category node exists
   - at least one valid price option
   - exactly one default active price option
4. Return the created/updated normalized row or enough data to revalidate and select it.
5. Revalidate `/workshop/library` and `/workshop/components`.
6. Add failure-shape tests before wiring the modal so validation errors are stable.

## Phase 4: Add Component Modal

1. Add modal shell from existing shared UI primitives.
2. Build form state with sections:
   - Identity
   - Classify
   - Pricing
   - Lifecycle
   - Review
3. Use selected folder/supplier context as defaults.
4. Use structured pickers for folder/category/supplier, not free-text category.
5. On save:
   - call server action
   - close modal only on success
   - select the target folder or supplier context
   - show status/error inline
6. Do not introduce a new visualization package in this phase. Reuse React Complex Tree for folder/category picking and shared compact primitives for pricing/state/history.
7. Keep the modal route-local and use the existing `ComponentLibrarySheet` toolbar `addActions` slot as the entry point.

## Phase 5: Sheet Rendering

1. Add state badge to rows.
2. Add pricing option dropdown/display if row details are expanded or selected.
3. Keep compact list density.
4. Hide archived rows by default unless a filter is added in a later slice.

## Phase 6: History Read View

1. Add read-only history surface from component row details.
2. Show component version log, price option history, and state history.
3. Render history as a compact vertical timeline/list in the first implementation.
4. This is required if edit price/state flows ship in the first slice. It can be deferred only if the first slice is add-only and verifies history through repository/database tests.

## Phase 7: Estimate Insertion Snapshot

1. Extend inserted `source_snapshot`.
2. Extend estimate template snapshot handling or explicitly keep template reads backward-compatible until template insertion is updated.
3. Preserve existing quantity/Misc Cost edit behavior.
4. Add tests that pricing changes in the library do not mutate existing estimate rows.
5. Add compatibility tests for legacy snapshots missing `componentVersionId` and `priceOptionId`.

## Phase 8: Validation and Closeout

1. Run focused tests.
2. Run `bun run validate`.
3. Run `bun run build`.
4. Run Supabase advisors or MCP fallback if CLI advisor is unavailable.
5. Start a clean dev server with protected-route dev-auth env and browser-smoke `/workshop/library`.
6. Update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` after implementation.
