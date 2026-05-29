# Research Notes

## Local Code Research

### Graph Context

Code graph minimal context reported:

- 727 nodes, 8278 edges across 138 files.
- relevant communities: `workshop-estimate`, `estimates-estimate`, `workshop-project`, `repositories-estimate`.
- initial risk: low for planning; implementation risk becomes moderate because navigation, repository data, and chart rendering cross boundaries.

### Route Findings

Relevant files:

- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/ProjectMiniSidebar.tsx`

The Charts page should be a sibling under the project layout, not part of the estimate detail route.

### Data Findings

Relevant files:

- `src/lib/repositories/workspace-repository.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/component-library/taxonomy.ts`
- `src/lib/supabase/types.ts`
- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/migrations/20260522064018_component_library_taxonomy_source.sql`

The existing estimate tree loader already proves the row/totals model. The component-library repository already proves taxonomy/supplier labels are available.

### Live Route Findings

`curl -I` against the provided estimate workspace route returned HTTP 200 on localhost. A content probe found the user-referenced left-rail categories and seeded supplier/category payloads. This confirms the current dev server has enough data shape for chart planning.

## Current Docs Research

### Next.js App Router

The app is currently on Next.js 16.2.6. Context7 was queried for current Next 16 App Router guidance; if implementation begins later, refresh the docs against the installed version before editing. Relevant current guidance:

- pages in the `app` directory are Server Components by default;
- async Server Components can fetch data directly;
- fetched data should be passed to Client Components for interactivity;
- Client Components can be nested inside Server Components.

Planning implication:

- `charts/page.tsx` should fetch project/chart data server-side and render a client component for selection and chart interactions.

### Chart Package Research

Package metadata was checked with `npm view` on 2026-05-23.

| Option | Current npm version | License | React peer metadata | npm unpacked size | Readiness verdict |
| --- | ---: | --- | --- | ---: | --- |
| `@nivo/pie` | 0.99.0 | MIT | `^16.14 || ^17.0 || ^18.0 || ^19.0` | 193,711 bytes direct package; about 1.28 MB across primary direct Nivo/D3/runtime packages checked | Recommended default for v1 donuts |
| `recharts` | 3.8.1 | MIT | React 16 through 19 | 6,756,347 bytes | Good fallback if broader chart types are likely |
| `@visx/shape` + `@visx/group` + `@visx/responsive` | 3.12.0 | MIT | React peer metadata stops at 18 | 356,803 bytes combined direct packages | Avoid for this React 19 app unless peer support changes |
| `echarts` + `echarts-for-react` | 6.1.0 + 3.0.6 | Apache-2.0 + MIT | wrapper accepts broad React range | 60,827,803 bytes combined direct packages | Too large/imperative for two donuts |
| hand-rolled SVG | n/a | n/a | n/a | 0 bytes | Viable if dependency avoidance outranks tooltip polish |

#### `@nivo/pie`

Context7 was queried for Nivo pie guidance. Relevant current guidance:

- responsive donut charts use `ResponsivePie`;
- donut charts are configured through `innerRadius`;
- `padAngle`, `cornerRadius`, legends, active-slice offsets, theming, and tooltip hooks are available;
- current package metadata advertises React 19 support.

Planning implication:

- `@nivo/pie` is the best default if a dependency is explicitly approved because this feature needs exactly responsive donut charts, not a broad chart suite.
- The implementation must override labels/tooltips/legends to match the compact workshop typography rules.

#### Recharts

Context7 was queried for Recharts. Relevant current guidance:

- donut charts are created with `PieChart` + `Pie` and `innerRadius`;
- `Cell` can assign segment colors;
- `Tooltip`, `Legend`, and `ResponsiveContainer` are available;
- responsive charts need a parent with stable dimensions;
- current examples show accessible chart support patterns, but the comparison table should remain the primary accessible text equivalent.

Planning implication:

- Recharts is a reasonable fallback if the product expects additional chart types soon.
- A hand-rolled SVG donut remains viable if dependency avoidance is prioritized.

#### Visx

Context7 was queried for Visx pie/responsive primitives. Relevant current guidance:

- `@visx/shape` provides `Pie`;
- `@visx/group` and `@visx/responsive` provide low-level SVG layout helpers;
- the implementation would own tooltips, legends, active states, and accessibility.

Planning implication:

- Visx is not the v1 default because npm peer metadata for the needed packages does not include React 19, while this app currently uses React 19.

#### ECharts

Package metadata was checked through npm. ECharts is powerful and React-wrapper compatible, but the direct package is much larger than needed for this two-donut feature.

Planning implication:

- Do not choose ECharts for v1 unless Charts is re-scoped into a broader analytics module.

## Subagent Findings

Two read-only explorer lanes were used.

### Route/Navigation Explorer

Findings:

- new route should be `src/app/workshop/projects/[projectId]/charts/page.tsx`;
- `ProjectMiniSidebar` is the navigation seam;
- no charting library or donut primitive currently exists;
- relevant compact UI primitives are available.

### Data/Aggregation Explorer

Findings:

- `estimate_row_items` has row cost and dimension fields needed for the feature;
- `category_node_id` and `supplier_id` exist and are indexed;
- `source_snapshot` has fallback metadata;
- project estimate list computes totals but does not select dimensions;
- best fit is a new server-side chart aggregation helper.

### Second-Pass QA Findings

Three read-only audit lanes were run after the first plan pack.

Corrections applied:

- `component_category_nodes` uses `node_type`, not `kind`.
- supplier labels must be queried with `workspace_id` constrained to the current project workspace.
- estimate options should use the current normalized `sheet_code` app contract; historical `revision_label` exists only as a migration/compatibility concern.
- `@nivo/pie` is the recommended dependency default; Recharts is no longer the blanket recommendation.
- v1 all-facts loading is capped at 20 estimates and 5,000 row items.
- donut charts show top 8 plus `Other`; comparison text must expose all buckets or provide explicit expansion.
- visual validation now includes narrow stacked layout checks.
- rollback now includes `package.json`, `bun.lock`, dynamic imports, chart CSS, and test fixtures.

## Assumptions

- A project will typically have a small number of estimate sheets during MVP.
- Two-sheet comparison is the requested v1 scope; three-or-more comparison is out of scope.
- Top-level space grouping is the correct first space view because it matches the left rail categories the user referenced.
- Component category reporting should avoid top-level organizer folders.

## Decided Defaults Before Coding

1. Add `@nivo/pie` when the implementation task explicitly approves dependency changes; otherwise use the isolated SVG path.
2. Order the project mini-sidebar as Dashboard, Estimates, Charts.
3. Use top-level space grouping only for v1.

Fallbacks:

1. Use hand-rolled SVG donuts if dependency changes are rejected or Nivo fails validation.
2. Use Recharts only if the scope expands to broader chart types before implementation starts; verify the `react-is` peer dependency if this fallback is chosen.
