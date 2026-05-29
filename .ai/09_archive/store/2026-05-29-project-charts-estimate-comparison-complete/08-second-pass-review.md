# Second-Pass Review

**Date:** 2026-05-23  
**Status:** second-pass QA applied  
**Scope:** readiness documents only, no feature code implemented

## Verdict

The first plan pack was directionally correct but not implementation-ready. The second pass found concrete issues that would have produced bad code if followed literally:

- taxonomy field name was wrong;
- supplier lookup needed a stronger workspace boundary;
- dependency choice was under-researched;
- the route needed a sharper scope boundary;
- mobile, accessibility, rollback, and data-volume gates needed to be explicit.

Those issues are now corrected in the plan pack.

## Code Path Recheck

Confirmed route and UI seams:

- route addition should be `src/app/workshop/projects/[projectId]/charts/page.tsx`;
- existing project layout is the correct parent boundary;
- `ProjectMiniSidebar` is the right navigation seam;
- current project mini-sidebar has Dashboard and Estimates only;
- estimate-detail routes hide the mini-sidebar and should keep doing so;
- `ProjectWorkspaceHeaderRow` behaves like Dashboard/Estimates list for non-detail routes.

Confirmed data seams:

- `listProjectEstimates` is enough for list totals but does not select chart dimensions;
- full estimate-tree loaders already prove row projection of category, supplier, and totals;
- a dedicated `project-charts-repository.ts` is still the preferred implementation boundary;
- no schema change is required for v1.

## Schema Corrections

Use current generated types and migrations:

```txt
component_category_nodes.node_type
estimate_row_items.category_node_id
estimate_row_items.supplier_id
estimate_row_items.source_snapshot
component_suppliers.workspace_id
```

Do not use `component_category_nodes.kind`.

Use `ProjectChartsEstimateOption.sheetCode` from the current normalized estimate app contract. `revision_label` is historical migration/compatibility context, not the field a new chart implementation should target.

## Package Decision Matrix

Package metadata was checked with `npm view` on 2026-05-23.

| Option | Version | React 19 peer support | Direct npm unpacked size | Decision |
| --- | ---: | --- | ---: | --- |
| `@nivo/pie` | 0.99.0 | yes | 193,711 bytes direct package; about 1.28 MB across primary direct Nivo/D3/runtime packages checked | Default recommendation |
| `recharts` | 3.8.1 | yes | 6,756,347 bytes | Fallback for broader future charts |
| `@visx/shape` + `@visx/group` + `@visx/responsive` | 3.12.0 | no, peer metadata stops at React 18 | 356,803 bytes | Avoid for current React 19 app |
| `echarts` + `echarts-for-react` | 6.1.0 + 3.0.6 | wrapper accepts broad React range | 60,827,803 bytes | Too large for v1 |
| hand-rolled SVG | n/a | n/a | 0 bytes | Dependency-free fallback |

Decision rule:

1. Use `@nivo/pie` if package addition is explicitly approved.
2. Use Recharts only if Charts is expected to expand into broader chart families soon.
3. Use hand-rolled SVG only if avoiding dependency churn matters more than tooltip, legend, and responsive polish.

Install candidate:

```bash
bun add @nivo/pie
```

Implementation must keep chart imports inside the Charts client boundary and must not import chart code from shared layout, shell, or sidebar files.

## UX And UI Corrections

Charts is not a dashboard revival. It is a scoped two-estimate comparison workflow.

Required layout behavior:

- two chart panels in two columns on desktop;
- stacked chart panels below the chosen narrow breakpoint;
- selector rows wrap before overflow;
- control rows preserve the existing compact 38px rhythm where shared search/toolbar primitives are used;
- visible workshop text remains <= 12px;
- donut labels should not crowd the chart; use legend/table text instead.

Required accessibility behavior:

- the comparison table exposes every bucket amount, share, and delta in text;
- color is never the only signal;
- donut `Other` grouping does not remove precise comparison data unless an explicit expansion rule exists.

## Data Volume Gate

V1 may load normalized facts for all project estimates only when both are true:

```txt
project_estimate_count <= 20
total_loaded_row_items <= 5,000
```

If either cap is exceeded, aggregate only the selected pair server-side using URL search params for the selected estimate ids and grouping mode.

## Test And Verification Corrections

Required before implementation closeout:

- pure aggregation test for `node_type` category mapping;
- pure aggregation test that organizer nodes are not reported as category buckets;
- supplier workspace scoping test or documented protected-route smoke fallback;
- comparison-table test proving all chart data is available as text;
- narrow viewport browser smoke for stacked chart layout;
- dependency isolation check proving chart library imports do not enter shared shell/layout files.

## Rollback Corrections

Rollback must remove:

- route;
- chart components;
- chart aggregation helpers;
- sidebar link;
- chart tests;
- dynamic import wrappers;
- chart CSS or fixtures;
- package entries from `package.json` and `bun.lock` if a dependency was added.

Rollback verification:

```bash
bun install
bun run validate
bun run build
git diff --check
```
