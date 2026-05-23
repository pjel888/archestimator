# Third-Pass Implementation Readiness

**Date:** 2026-05-23  
**Status:** third-pass QA applied  
**Scope:** readiness documents only, no feature code implemented

## Readiness Verdict

The plan is now implementation-ready for a focused v1 build, with one honest constraint: no document can make the implementation 100% certain before the package install, code, tests, build, and browser smoke run. The plan is now specific enough that an implementer should not need to rediscover route seams, schema fields, chart package tradeoffs, UI governance, or rollback criteria.

## Third-Pass Corrections

### Estimate Display Field

Second-pass review overcorrected from `sheetCode` to `revisionLabel`. Current code proves the app contract is `sheet_code`:

- `src/lib/supabase/types.ts` exposes `estimates.sheet_code`;
- `supabase/migrations/20260519103000_rename_estimate_revision_label_to_sheet_code.sql` renamed `revision_label`;
- `src/lib/repositories/estimate-schema-compat.ts` normalizes legacy `revision_label` into `sheet_code`.

Implementation directive:

```txt
Use ProjectChartsEstimateOption.sheetCode from estimates.sheet_code.
Do not introduce a new revisionLabel display contract for Charts.
```

### `kind` Versus `node_type`

The plan now distinguishes the two fields:

- `estimate_nodes.kind` is correct for space/tree aggregation.
- `component_category_nodes.node_type` is correct for component taxonomy aggregation.

Implementation directive:

```txt
Use estimate_nodes.kind only for estimate tree nodes.
Use component_category_nodes.node_type only for taxonomy nodes.
```

### Nivo Package Size Nuance

`@nivo/pie` remains the recommended dependency default, but the package-size claim is now precise:

- `@nivo/pie` direct package unpacked size: 193,711 bytes.
- Primary direct Nivo/D3/runtime packages checked total about 1.28 MB before secondary transitive dependencies.
- Recharts direct package unpacked size: 6,756,347 bytes.
- ECharts direct package plus wrapper is about 60.8 MB direct unpacked size.

Implementation directive:

```txt
Default recommendation is @nivo/pie when dependency addition is explicitly approved.
Run install/build validation before committing to it.
Fallback to a hand-rolled SVG donut if package install, bundle, or styling constraints become unacceptable.
```

## Implementation Efficiency Rules

1. Keep the first code slice pure and testable: `src/lib/project-charts/aggregate-project-charts.ts`.
2. Keep Supabase access in a dedicated repository file rather than widening `listProjectEstimates`.
3. Keep chart imports isolated under `src/components/workshop/project-charts/`.
4. Do not import `@nivo/pie` in project layout, sidebar, header, or shared UI primitive files.
5. Use `sheet_code`, `category_node_id`, `supplier_id`, `source_snapshot`, `estimate_nodes.kind`, and `component_category_nodes.node_type` exactly as documented.
6. Treat the comparison table as a required output, not a fallback after visual charts.
7. Do not add saved reports, dashboard widgets, or multi-project analytics in v1.

## Hard Acceptance Gates For Implementation

Focused gates:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/project-charts-aggregation.test.ts
bunx vitest run --maxWorkers=1 tests/vitest/project-charts-ui.test.tsx
git diff --check
```

Full gates:

```bash
bun run validate
bun run build
git diff --check
```

Browser gates:

```txt
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/charts
```

Required browser evidence:

- route returns 200 under the local dev auth setup;
- Charts nav item appears and is active;
- two estimate selectors cannot select the same estimate;
- Space, Component Category, and Supplier modes change bucket labels;
- both donut charts render nonblank when a two-populated-estimate smoke fixture exists;
- otherwise, one-estimate or no-row states render correctly;
- comparison table exposes amounts, shares, and deltas in text;
- desktop layout uses two chart panels;
- narrow layout stacks panels without text/control overlap.

## Remaining Non-Guarantees

These cannot be guaranteed by documentation alone:

- exact final bundle impact after Bun resolves the full dependency tree;
- exact Nivo styling behavior inside the current app until rendered;
- exact browser smoke outcome until the route exists;
- exact two-donut smoke outcome without a two-populated-estimate fixture;
- whether unrelated dirty export work affects full validation commands.

The implementation plan is efficient because each non-guarantee has a concrete validation gate and fallback.

## Third-Pass Evidence

- Current project dependencies: Next.js 16.2.6, React 19.2.4, React DOM 19.2.4.
- Code graph stats: 727 nodes, 8278 edges, key communities include `workshop-project`, `repositories-project`, `workshop-estimate`, and `vitest-project`.
- Context7 Nivo docs confirm `ResponsivePie`, `innerRadius`, legends, tooltips, responsive parent-height requirements, theming, and React chart usage patterns.
- Package metadata was refreshed with `npm view` on 2026-05-23.
- Existing UI governance confirms the 12px app/workshop text cap and 38px shared search/toolbar row rhythm.
