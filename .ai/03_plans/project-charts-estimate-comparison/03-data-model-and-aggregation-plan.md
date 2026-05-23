# Data Model And Aggregation Plan

## Required Input Rows

For all selected estimates in the project, load:

```txt
estimate_row_items:
- id
- estimate_id
- node_id
- category_node_id
- supplier_id
- supplier
- source_snapshot
- quantity
- unit_cost
- misc_cost
```

Also load:

```txt
estimate_nodes:
- id
- estimate_id
- parent_id
- kind
- name
- sort_order
```

Note: `estimate_nodes.kind` is the correct field for estimate tree nodes. Do not confuse it with `component_category_nodes.node_type`, which is the correct field for component taxonomy nodes.

For labels:

```txt
component_category_nodes:
- id
- parent_id
- label
- node_type
- sort_order

component_suppliers:
- id
- workspace_id
- name
- normalized_name
- sort_order
```

Project and estimate scope must be enforced through the project workspace boundary, matching `getCurrentWorkspaceProject`.

## Output Shape

Recommended domain types:

```ts
export type ProjectChartGroupingMode = "space" | "component-category" | "supplier";

export type ProjectChartsEstimateOption = {
  id: string;
  name: string;
  sheetCode: string;
  currencyCode: string;
  total: number;
  rowCount: number;
};

export type ProjectChartBucket = {
  key: string;
  label: string;
  amount: number;
  rowCount: number;
  share: number;
  colorKey: string;
  fallback: boolean;
};

export type ProjectChartComparisonRow = {
  key: string;
  label: string;
  leftAmount: number;
  rightAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
  leftShare: number;
  rightShare: number;
};
```

Use the current app contract from normalized estimate rows: `estimates.sheet_code`. The historical `revision_label` column was renamed by migration and should only appear through compatibility fallback code.

## Total Formula

Always compute:

```ts
const amount = Number(quantity) * Number(unit_cost) + Number(misc_cost);
```

Guard against invalid numeric strings:

- `quantity`: invalid -> 0
- `unit_cost`: invalid -> 0
- `misc_cost`: invalid -> 0

Do not include negative row amounts unless the schema later supports credits. Current schema checks non-negative cost fields.

## Space Aggregation

Rows are attached to Area Nodes via `node_id`. To group by space:

1. Build `nodeById`.
2. For each row, find its Area Node.
3. Walk ancestry upward.
4. Pick the highest ancestor whose `parent_id === null`, or the Area Node itself if the row is attached to an unexpected root Area.
5. Bucket by that node id/name.

This means the first version answers "where in the project tree is money concentrated?" using the same left-sidebar organization users already understand.

Future-ready option:

```ts
spaceDepth: "top-level" | "second-level" | "area"
```

Do not ship depth switching until top-level comparison is verified.

## Component Category Aggregation

Primary key:

```txt
estimate_row_items.category_node_id
```

If the id exists in `component_category_nodes`, map it to a reporting category:

- If `node_type` is `category`, use it.
- If `node_type` is `subcategory`, walk to the parent category.
- If `node_type` is `organizer`, do not infer a descendant unless the taxonomy contract proves there is exactly one reporting child. First try snapshot fallback data, then `Uncategorized`.

Important: top-level organizer rows such as `Architecture`, `Materials`, and `Systems` are not reporting categories. The plan should preserve the V3 taxonomy rule that the first child is the reporting category and the next child is the subcategory.

Fallbacks:

1. `source_snapshot.categoryNodeId`
2. `source_snapshot.category`
3. row-level category if exposed by a projection
4. `Uncategorized`

Deterministic organizer fallback:

1. If `category_node_id` points to an organizer, inspect `source_snapshot.categoryNodeId`.
2. If that snapshot id maps to a category or subcategory, use the reporting category for that snapshot id.
3. Else use `source_snapshot.category` as a label-only fallback bucket.
4. Else use a row-level category label if a future projection exposes one.
5. Else bucket as `Uncategorized`.

## Supplier Aggregation

Primary key:

```txt
estimate_row_items.supplier_id
```

If the id exists in `component_suppliers`, use `component_suppliers.name`.

Supplier labels must be loaded with the same workspace boundary as the current project. The loader should explicitly constrain `component_suppliers.workspace_id` to the current workspace id, matching existing component-library repository behavior.

Fallbacks:

1. `source_snapshot.supplierId`, resolved against workspace-constrained suppliers
2. row `supplier`
3. `source_snapshot.supplier`
4. `No supplier`

Normalize blank values to `No supplier`.

Generated `estimate_node_kind` can still include historical enum values. Active estimate tree rows are constrained to the current Group Node / Area Node model; normalize any non-area storage kind as a Group Node for display/reporting, matching existing tree behavior.

## Shared Bucket Union

To compare two charts fairly:

1. Aggregate each estimate independently.
2. Build a union of bucket keys from both estimates.
3. Sort by combined amount descending.
4. Keep top N buckets.
5. Roll the rest into `Other`.
6. Assign colors by bucket key from the union order.

Recommended:

```txt
TOP_BUCKET_LIMIT = 8
```

This keeps both charts readable and prevents each donut from using different colors for the same category.

Precision rule:

- Donut charts show the top 8 buckets plus `Other`.
- The comparison table should show all buckets by default. If the UI later collapses low-rank buckets into an `Other` row, it must offer a deterministic expansion path before claiming precise per-bucket comparison.

## Delta Calculation

For each union bucket:

```ts
deltaAmount = rightAmount - leftAmount
deltaPercent = leftAmount === 0
  ? rightAmount === 0 ? 0 : null
  : deltaAmount / leftAmount
leftShare = leftTotal === 0 ? 0 : leftAmount / leftTotal
rightShare = rightTotal === 0 ? 0 : rightAmount / rightTotal
```

Use `null` delta percent when the baseline is zero and the comparison amount is non-zero. Render as `New` or `n/a`, not infinity.

## Server vs Client Work

Server should:

- enforce project/workspace access;
- load estimates and dimension tables;
- compute initial chart-ready model if selected estimate ids are known;
- return all estimate options for client selection.

Client should:

- manage selected Sheet A / Sheet B;
- manage grouping mode;
- derive chart buckets locally if the server returns row-level normalized facts; or request a route refresh/search param if server-only aggregation is preferred.

Recommendation for v1:

- Server returns normalized facts for all project estimates only when project size is within the MVP cap.
- Client derives selected pair/grouping from those facts.

Reason: switching between grouping modes and sheets should feel immediate within the explicit MVP cap. If estimates exceed the cap, move aggregation behind search params or an API route before shipping the all-facts model.

MVP cap:

```txt
project_estimate_count <= 20
total_loaded_row_items <= 5,000
```

If either cap is exceeded, v1 should aggregate only the selected pair server-side using URL search params for the selected estimate ids and grouping mode.

## Performance Guardrails

- Query only rows for estimates in the current project.
- Do not load `cost_library_items` for charts unless needed for labels; category/supplier dimension tables are enough.
- Keep the chart model serializable and compact.
- Do not send full estimate tree UI objects with formatted strings to the chart client.

## Data Quality Risks

- Older rows may have missing `category_node_id` / `supplier_id`; fallback labels are required.
- Manual rows may have no supplier and no category.
- Category taxonomy can contain organizer nodes that should not become reporting buckets.
- Supplier names can be broad allowance labels; keep labels truthful rather than over-normalizing.
