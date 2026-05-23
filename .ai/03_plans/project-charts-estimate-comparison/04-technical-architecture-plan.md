# Technical Architecture Plan

## Recommended File Additions

```txt
src/app/workshop/projects/[projectId]/charts/page.tsx
src/components/workshop/project-charts/ProjectChartsClient.tsx
src/components/workshop/project-charts/ProjectChartPanel.tsx
src/components/workshop/project-charts/ProjectCostDonutChart.tsx
src/components/workshop/project-charts/ProjectChartsComparisonTable.tsx
src/lib/project-charts/aggregate-project-charts.ts
src/lib/project-charts/types.ts
tests/vitest/project-charts-aggregation.test.ts
tests/vitest/project-charts-ui.test.tsx
```

Alternative: place the loader in `src/lib/repositories/project-charts-repository.ts` if it directly calls Supabase. Keep pure aggregation in `src/lib/project-charts/aggregate-project-charts.ts`.

## Existing File Changes

Expected minimal existing changes:

```txt
src/components/workshop/ProjectMiniSidebar.tsx
```

Possible existing changes:

```txt
src/lib/repositories/workspace-repository.ts
package.json
bun.lock
```

Only modify `workspace-repository.ts` if adding a project-scoped chart loader there. Prefer a new repository file to avoid widening the existing estimates-list behavior.

Only modify `package.json` and `bun.lock` if the final implementation accepts a chart dependency.

## Route Page Boundary

`charts/page.tsx` should be an async Server Component:

1. Resolve `projectId` from params.
2. Call a project-scoped chart loader.
3. `notFound()` when project is absent.
4. Render `ProjectChartsClient`.

This follows Next.js App Router guidance: fetch data in the Server Component, pass serializable props to a Client Component for interactivity.

## Client Boundary

`ProjectChartsClient` should own:

- selected left estimate id;
- selected right estimate id;
- grouping mode;
- selected-pair validation;
- local aggregation if normalized facts are passed from server.

It should not call Supabase directly.

## Chart Rendering Choice

### Recommended Default: `@nivo/pie`

Recommended dependency default: `@nivo/pie`.

Project working agreements still require explicit approval before adding a new dependency. If the implementation request does not explicitly approve dependency changes, use the isolated hand-rolled SVG path or pause at Phase 0 for the dependency decision.

Why:

- It is purpose-built for responsive pie/donut charts.
- Current package metadata advertises React 19 peer support.
- It is materially smaller than whole-suite chart options in refreshed npm unpacked-size checks.
- The API supports `innerRadius`, legends, tooltips, theming, and active-slice states without custom geometry math.

Implementation notes:

- isolate the chart component in a Client Component;
- keep the responsive chart inside a parent with stable height;
- use custom tooltip styled with compact app text;
- disable or tightly control arc labels if they threaten the 12px workshop text cap;
- provide the comparison table as the accessible detail source.

Install candidate:

```bash
bun add @nivo/pie
```

After install, verify `package.json` and `bun.lock` changes are limited to the chart dependency chain. Then run:

```bash
rg -n "@nivo|recharts" src
```

The only allowed implementation hits should be under `src/components/workshop/project-charts/`.

### Feature-Local Components

Add `ProjectChartPanel` or an equivalent feature-local panel component so the two chart panels do not duplicate class strings, heading structure, legend placement, or empty states.

Do not create a new shared UI primitive unless the same panel pattern is needed outside Charts.

### Secondary Option: Recharts

Use Recharts if the near-term roadmap expects more chart types beyond donuts.

Pros:

- supports `PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend`, and `ResponsiveContainer`;
- donut charts are straightforward through `innerRadius`;
- current package metadata advertises React 19 peer support.

Cons:

- npm metadata shows a much larger unpacked package than `@nivo/pie`;
- dependency graph includes broader state/data packages than this two-donut feature needs;
- Recharts peer metadata includes `react-is`, so peer resolution must be verified if this fallback is chosen.

### Alternative: Hand-Rolled SVG Donut

Use if avoiding dependencies is more important than tooltip/responsive polish.

Pros:

- no package churn;
- tiny, fully controlled design;
- sufficient for two static donut charts.

Cons:

- more math and edge cases;
- custom tooltip/legend/accessibility burden;
- future chart types will require more custom work.

### Not Recommended For V1

- D3 direct integration: too much imperative surface.
- Visx: strong low-level primitives, but current package peer metadata only lists React through 18, while this app is on React 19.
- ECharts: powerful, but much larger and more imperative than needed for two donuts.
- Canvas charts: unnecessary and weaker for accessibility.

## Visual Design Direction

Use a compact, product-workspace chart style:

- white background;
- thin hairline borders;
- no large rounded marketing cards;
- chart panel radius <= 8px;
- muted, non-monochrome palette with orange reserved for emphasis, not every segment;
- tabular numeric totals;
- small labels and high contrast;
- selector/tool rows preserve the current 38px compact row rhythm where `SearchInput` or toolbar primitives are used, with no extra parent vertical padding.

Responsive behavior:

- desktop and wide tablet: two chart panels in two columns;
- narrow tablet/mobile: stack the two chart panels vertically;
- selector rows wrap cleanly before controls overflow;
- the comparison table remains the precise text surface when chart panels stack.

Recommended palette:

```txt
#FF7A1A accent orange
#2563EB blue
#16A34A green
#A855F7 violet
#DC2626 red
#0891B2 cyan
#CA8A04 amber
#64748B slate
#111111 ink / Other
```

Avoid a one-note orange/brown or purple theme.

## Impact Radius

Likely low-to-moderate:

- Adding a route is isolated under the existing project layout.
- Adding a sidebar link affects project navigation snapshots/tests.
- Adding a new dependency affects `package.json` and `bun.lock`.
- Adding chart aggregation touches estimate rows, taxonomy, suppliers, and project auth boundaries.

High-risk files to avoid editing unless necessary:

- `EstimateSheetContent.tsx`
- `EstimateSheetTree.tsx`
- current export feature files in the dirty worktree

## Dirty Worktree Constraint

The current branch has unrelated uncommitted export work. Implementation should avoid touching those files unless required:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/app/api/`
- `src/lib/proposal-export/`
- proposal export tests

Charts can be planned and mostly implemented without overlapping that work.

## Supabase Boundary

No schema change is planned. Current schema already has:

- row category ids;
- row supplier ids;
- source snapshots;
- cost fields;
- indexes for category/supplier ids.

If implementation later introduces a SQL view or RPC for chart aggregation:

- verify current Supabase docs first;
- use `security_invoker = true` for views when exposed;
- keep RLS enabled and project/workspace policies intact;
- avoid `security definer` functions in exposed schemas.

For v1, prefer normal server-side Supabase queries through the existing authenticated server client.
