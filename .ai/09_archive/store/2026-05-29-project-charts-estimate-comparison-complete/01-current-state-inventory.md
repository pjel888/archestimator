# Current State Inventory

## Project Route Structure

The project page already has a nested layout at `src/app/workshop/projects/[projectId]/layout.tsx`. It wraps children in:

- `WorkshopPageShell`
- `ProjectMiniSidebar`
- `ProjectWorkspaceHeaderRow`

The project layout supplies the shell, mini-sidebar, and project-code row. `ProjectTotalHeader` / estimate metadata chrome is route-gated to estimate detail routes, so Charts must render its own totals and deltas inside the page body.

Current child routes:

- `src/app/workshop/projects/[projectId]/page.tsx` - Dashboard page.
- `src/app/workshop/projects/[projectId]/estimates/page.tsx` - Estimates list page.
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` - Estimate workspace page.

The Charts page should be a sibling route:

```txt
src/app/workshop/projects/[projectId]/charts/page.tsx
```

## Project Mini-Sidebar

`src/components/workshop/ProjectMiniSidebar.tsx` owns the two current project section links:

- Dashboard
- Estimates

It also hides itself on estimate sheet detail routes, which lets the estimate tree absorb the mini-sidebar width. The Charts link should be added to this same link list and should remain visible on the Dashboard, Estimates list, and Charts page. It should remain hidden only on estimate sheet detail routes.

Recommended icon: `ChartDonut`, `ChartPieSlice`, or another Phosphor chart icon if available. Keep the label `Charts`.

## Project Header

`ProjectWorkspaceHeaderRow` already detects estimate workspace routes and shows estimate metadata only there. The Charts page should behave like Dashboard/Estimates list, not like estimate detail:

- keep the project code row;
- do not publish estimate-specific metadata;
- do not show estimate tree or estimate right sidebar;
- keep mini-sidebar visible.

## Estimate List Data

`listProjectEstimates(projectId)` in `src/lib/repositories/workspace-repository.ts` already loads:

- project-scoped estimates;
- first node per estimate;
- node count;
- row count;
- total cost per estimate.

It only selects `estimate_id`, `quantity`, `unit_cost`, and `misc_cost` for row totals. This is enough for the Estimates list but not enough for Charts, because Charts needs dimensions:

- `node_id`
- `category_node_id`
- `supplier_id`
- `supplier`
- `source_snapshot`

Recommendation: keep `listProjectEstimates` narrow and create a dedicated chart aggregation loader.

## Estimate Tree Data

`getProjectEstimateTreeByEstimate(projectId, estimateId)` and `getProjectEstimateTreeByNode(projectId, nodeId)` already fetch all estimate nodes and row items for one estimate and build a nested tree using `buildEstimateTree`.

`buildEstimateTree` attaches rows to Area Nodes and recursively computes totals. It already maps row data to UI fields:

- `totalItemCosts`
- `category`
- `categoryNodeId`
- `supplier`
- `supplierId`

The Charts aggregation can reuse the same concepts but should not depend on rendered tree strings such as formatted peso totals.

## Row Cost Contract

The current row total contract is:

```ts
rowTotal = quantity * unit_cost + misc_cost
```

This is used by the project estimate list and domain total helpers. Do not reintroduce `labor_cost` or `supplementary_cost`; those were combined into `misc_cost`.

## Component Category and Supplier Dimensions

Current schema supports chart dimensions:

- `estimate_row_items.category_node_id` references `component_category_nodes`.
- `estimate_row_items.supplier_id` references `component_suppliers`.
- both are indexed by the component taxonomy migration.
- row `source_snapshot` also carries fallback category/supplier labels and ids.

The component-library repository already loads:

- `component_category_nodes`
- `component_suppliers`
- `cost_library_items`

For Charts, only taxonomy/supplier labels are needed, not the full component library item list.

## UI Primitives To Reuse

Use existing compact primitives:

- `Button` for buttons and icon buttons.
- `ControlSelect` for compact dropdowns.
- `SearchInput` if estimate selection needs search.
- `HeaderIconToolbar` only if there is a real toolbar row; avoid decorative toolbars.
- `EmptyState` for no-estimates and no-comparable-data states.
- shared `cn` helper.

There is no internal chart primitive today.

## Current Charting Dependency State

`package.json` has no charting library. Current chart mentions are icons/marketing copy only.

Candidate approaches:

1. Add `@nivo/pie` for focused responsive SVG donut charts, if dependency changes are explicitly approved for implementation.
2. Hand-roll a tiny SVG donut primitive.
3. Use Recharts later if Charts grows beyond donuts into broader chart families.

See `07-research-notes.md` and `08-second-pass-review.md` for package research.

## Live Route Evidence

The target estimate workspace route responded with HTTP 200 on localhost:

```txt
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777720
```

The HTML contained the visible estimate tree categories the user referenced, including:

- `General Requirements`
- `Lot`
- `House`
- space/area examples such as `Family Lounge`

It also contained seeded supplier names and component category payloads. This confirms the requested grouping dimensions are represented in the current app state.

Important smoke-test limit: current deterministic seed state may not contain two populated estimate sheets with row facts. Browser smoke for the implemented Charts route must either create a focused two-estimate fixture or explicitly validate the one-estimate / no-row empty states before expecting two populated donuts.
