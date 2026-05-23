# Project Charts Estimate Comparison Plan

**Date:** 2026-05-23  
**Status:** readiness plan, not implemented  
**Route scope:** `/workshop/projects/[projectId]/charts`  
**Related routes:** `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/projects/[projectId]/estimates/[nodeId]`

## User Job

Contractors need a project-level Charts page where they can select two estimate sheets and compare cost distribution visually. The page must show two donut charts side by side, one per selected estimate sheet, and let the user switch the grouping between:

1. Space, using the estimate tree organization visible in the estimate workspace left rail.
2. Component category, using the shared Component Library taxonomy.
3. Supplier, using persisted supplier metadata.

## Readiness Summary

The route is ready to plan but not ready to code without a focused implementation pass. The current repo already has the needed project shell, estimate list route, estimate tree totals, row category ids, supplier ids, and compact UI primitives. It does not have an internal chart primitive or charting dependency.

Second-pass QA found issues in the first readiness pack and this pack now reflects those corrections:

- category taxonomy uses `node_type`, not `kind`;
- supplier lookup must be workspace-scoped;
- the chart package default is `@nivo/pie`, with explicit fallbacks;
- estimate display uses the current normalized `sheet_code` app contract;
- the chart surface is scoped to two-estimate comparison only, not a dashboard revival;
- v1 data-volume, mobile visual, accessibility, and rollback gates are explicit.

Recommended implementation path:

1. Add a server-side chart aggregation repository that loads project estimates, rows, nodes, categories, and suppliers.
2. Add a client Charts page for local sheet selection and grouping mode.
3. Add a small reusable donut chart primitive, preferably backed by `@nivo/pie` if dependency changes are explicitly approved.
4. Add `Charts` to `ProjectMiniSidebar`.
5. Cover aggregation with focused unit tests before visual/component tests.

## Plan Pack

- `01-current-state-inventory.md` - current routes, data contracts, UI primitives, and live route evidence.
- `02-product-and-ux-brief.md` - user workflow, layout, controls, states, and non-goals.
- `03-data-model-and-aggregation-plan.md` - aggregation rules for space, component category, supplier, deltas, empty buckets, and fallback labels.
- `04-technical-architecture-plan.md` - proposed files, component boundaries, dependency choice, and impact/blast radius.
- `05-implementation-sequence.md` - ordered implementation slices with pass/fail gates.
- `06-testing-validation-risk-register.md` - unit, DOM, visual/browser, build gates, and known risks.
- `07-research-notes.md` - local code research, live route observations, and current docs research.
- `08-second-pass-review.md` - QA findings, package decision matrix, and corrected implementation gates.
- `09-third-pass-implementation-readiness.md` - final red-team corrections, implementation efficiency rules, and hard acceptance gates.

## Scope Authority

Charts is a narrow estimating workflow under one project. It exists only to compare two estimate sheets through cost distribution donuts and a text comparison table.

Do not use this feature to add:

- dashboard widgets;
- a project analytics suite;
- saved reports;
- multi-project reporting;
- estimate versioning;
- route-family expansion beyond `/workshop/projects/[projectId]/charts`.

## Acceptance Criteria

- `/workshop/projects/[projectId]/charts` exists under the current project layout and appears as a third mini-sidebar item beside Dashboard and Estimates.
- Users can select two different estimate sheets from the current project.
- The page renders exactly two donut charts for the selected pair.
- Grouping mode can switch between Space, Component Category, and Supplier without navigating away.
- Both charts use the same category/order/color mapping for the selected mode so segments are comparable.
- The comparison surface shows totals and deltas in compact, numeric-first UI.
- The comparison table exposes every bucket amount, share, and delta in text; color is never the only signal.
- Empty, one-estimate, and no-row states are explicit and use shared primitives.
- Aggregation uses the current row total formula: `quantity * unit_cost + misc_cost`.
- Component category grouping prefers `estimate_row_items.category_node_id`.
- Supplier grouping prefers `estimate_row_items.supplier_id`.
- Space grouping uses `estimate_row_items.node_id` and `estimate_nodes` ancestry.
- App typography stays within the `/workshop` hard cap: visible text <= 12px, normal controls around 10px.

## Non-Goals

- No proposal export changes.
- No estimate versioning/diff engine.
- No chart editing, saved chart presets, or collaboration.
- No database schema changes unless implementation proves current indexes are insufficient.
- No broad dashboard redesign.
- No restoration of rejected prototype dashboard modules.
- No Supabase Realtime.

## Deletion Criteria

If Philip rejects the Charts direction, remove:

- `src/app/workshop/projects/[projectId]/charts/page.tsx`
- chart-specific client components under `src/components/workshop/project-charts/`
- chart aggregation helpers under `src/lib/repositories/` or `src/lib/project-charts/`
- `Charts` link in `ProjectMiniSidebar`
- chart-specific tests
- chart-specific dynamic import wrappers, CSS/test fixtures, and snapshot artifacts
- chart package entries from `package.json` and `bun.lock` if a dependency was added

Do not remove existing Dashboard, Estimates, estimate workspace, component-library, or export work.

Post-removal gate:

```bash
bun install
bun run validate
bun run build
git diff --check
```

## Implementation Gate

Before implementation, run impact analysis for each symbol being edited, especially:

- `ProjectMiniSidebar`
- any new or changed project layout/header component
- `listProjectEstimates` if it is modified instead of adding a dedicated chart repository
- any estimate tree row projection helpers if reused

Prefer adding a dedicated chart aggregation helper instead of widening `listProjectEstimates` unless the list route also needs the new data.
