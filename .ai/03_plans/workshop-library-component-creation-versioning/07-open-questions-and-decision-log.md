# 07 Open Questions and Decision Log

## Planning Decisions

### Decision: Keep `cost_library_items` as component identity

Reason: the current route, estimate sidebar, and estimate insertion flow already treat it as the source component row table. Replacing it would increase migration and compatibility risk.

### Decision: Add append-only history tables

Reason: the user specifically requested proper version control, pricing changes over time, state changes, and logged dates. JSON-only metadata would be too weak and hard to query.

### Decision: Preserve estimate snapshot immutability

Reason: current architecture treats estimate rows as copied snapshots. Component library changes should not silently rewrite issued or in-progress estimates.

### Decision: Structured category/folder/supplier selection

Reason: the existing Supabase shape already has `category_node_id`, `supplier_id`, and `library_folder_id`. Free-text category entry would continue the current legacy weakness.

### Decision: No new visualization dependency in the first slice

Reason: the current route already depends on `react-complex-tree` and shared compact UI primitives. The first implementation needs a category/folder picker, pricing dropdowns, state badges, and a timeline/list; none require a new graph or hierarchy package.

### Decision: SQL RPCs are required for component create/update writes

Reason: component creation writes identity, default pricing, version, price history, and state history together. Splitting that across independent Supabase client calls would allow partial writes and corrupt version history.

## Open Questions

1. Should `in_production` and `available` both exist?
   - Recommended: yes. `in_production` describes manufacturing/sourcing state; `available` describes estimating-library availability.

2. Should archived components be hidden from default browse?
   - Recommended: yes, hidden by default but available through a future filter/history view.

3. Should discontinued components be insertable?
   - Recommended: warn but allow insertion for historical/repair estimates, unless product direction decides discontinued means blocked.

4. Should price options be global to the component or supplier-specific?
   - Recommended: price options belong to the component and may optionally point to a supplier.

5. Should component versions be created for every price option edit?
   - Recommended: yes for default price changes and any field that affects estimate insertion. Pure notes/source URL corrections can still create price history without bumping the whole component version if desired.

6. Should the first implementation include edit component, or only add component?
   - Recommended: include add plus minimal edit for price/state because version control cannot be verified properly without at least one update path.

7. Should source snapshots include full price option JSON?
   - Recommended: include enough copied fields for estimate independence plus ids for traceability.

8. Should new tables be exposed to client-side Supabase?
   - Recommended: server actions should own writes. Reads can stay server-side through repository loaders unless a later client detail panel needs direct fetches.

9. Should `active_price_option_id` be required?
   - Recommended: no for first release. Enforce the current default through a partial unique index on active default price options, then optionally keep `active_price_option_id` as a denormalized pointer after backfill.

## Recommended Next Plan Review Question

Before implementation, decide whether state values should be exactly:

`draft`, `in_production`, `available`, `discontinued`, `archived`

or whether `available` should be renamed to `active` for user-facing clarity.
