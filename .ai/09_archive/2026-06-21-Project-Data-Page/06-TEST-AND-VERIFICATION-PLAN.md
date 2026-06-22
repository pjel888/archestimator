# 06 — Test and Verification Plan

> **Owner decisions reflected:** per-column breakdown (no shared table) +
> delete the four orphaned sections in this PR. Both change the test surface.

## Verification posture (per AGENTS.md)

UI-surface change, no auth/data-integrity/security blast (repository + route
state untouched). Verification is **proportional**: targeted vitest
updates/additions, `tsc --noEmit`, and a build. Browser/Playwright proof is
opt-in only if a claim can't be proven by static/DOM checks.

## Tests to UPDATE (DOM/source contract changed)

### `tests/vitest/project-data-a11y.test.tsx`
Old assertions (single `<h1>` "Cost comparison"; `combobox` "Baseline estimate
sheet"; `combobox` "Add sheet to compare";
`table#project-data-cost-comparison-table`) are tied to the old board. Update:

- exactly one `<h1>` (now `Cost breakdown`);
- **no** `table#project-data-cost-comparison-table` (shared table is gone);
- one `CostDonutChart` SVG (`[data-testid="d3-donut-chart"]`) **per selected
  estimate**;
- each donut SVG has `role="img"` and `aria-describedby` pointing at its own
  column's breakdown list (`estimate-<id>-breakdown`);
- the per-column breakdown lists render with the expected bucket labels/amounts;
- the `+` add control is present and labeled;
- per-column swap `DropdownSelect`(es) are labeled;
- adding/removing a compare column still writes `compare=` to the URL (mocked
  `router.replace` assertions stay, driven by the new controls).

### `tests/vitest/project-dashboard-ui-fixtures.ts` (governance fixtures)
Convert the four deleted-component reads from `readFileSync` → `readOptional`
(the precedent already set for `ProjectCostBubbleChart` / `project-charts/*`):

```ts
export const projectDataInsightHeader   = readOptional("…/ProjectDataInsightHeader.tsx");
export const projectDataCostBreakdown    = readOptional("…/CostBreakdownSection.tsx");
export const projectDataCostLedger       = readOptional("…/CostLedger.tsx");
export const projectDataCostAcrossSheets = readOptional("…/CostAcrossSheetsSection.tsx");
```

`readOptional` returns `""` when the file is gone, so imports don't break and
absence assertions work.

### `tests/vitest/project-dashboard-charts-ui.test.ts` (governance)
Rewrite the "uses a comparison-first data board…" block. Old assertions locked
the *old* contract:

```ts
expect(projectDataComparisonBoard).toContain("Cost comparison");          // old h1
expect(projectDataComparisonBoard).toContain("Baseline estimate sheet");  // old combo
expect(projectDataComparisonBoard).toContain("Add sheet to compare");     // old combo
expect(projectDataComparisonBoard).toContain("project-data-cost-comparison-table"); // old table
expect(projectDataInsightHeader).toContain("Estimate sheet");             // deleted
expect(projectDataCostBreakdown).toContain("CostLedger");                 // deleted
expect(projectDataCostLedger).toContain("hidden w-full px-2 py-1.5 …");   // deleted
expect(projectDataCostAcrossSheets).toContain("Cost across sheets");      // deleted
```

New block locks the *donut-first, per-column* contract:

```ts
expect(projectDataClient).toContain("CostComparisonBoard");
expect(projectDataClient).not.toContain("ProjectDataInsightHeader");
expect(projectDataClient).not.toContain("CostAcrossSheetsSection");
expect(projectDataClient).not.toContain("CostCompositionSection");
// orphans are gone:
expect(projectDataInsightHeader).toBe("");
expect(projectDataCostBreakdown).toBe("");
expect(projectDataCostLedger).toBe("");
expect(projectDataCostAcrossSheets).toBe("");
// new donut-first board composition:
expect(projectDataComparisonBoard).toContain("Cost breakdown");              // new h1
expect(projectDataComparisonBoard).toContain("CostDonutChart");
expect(projectDataComparisonBoard).toContain("EstimateColumn");
expect(projectDataComparisonBoard).toContain("AddEstimateColumn");
expect(projectDataComparisonBoard).toContain("collapseProjectChartBuckets");
expect(projectDataComparisonBoard).toContain("buildProjectChartComparisonView");
expect(projectDataComparisonBoard).toContain("buildInsightSentence");
// shared cross-column table is intentionally absent now:
expect(projectDataComparisonBoard).not.toContain("project-data-cost-comparison-table");
```

**Keep the other governance tests** (nav "Data" label/icon, the fixed-shell
scroll contract on `projectDataClient`, the skeleton contract, d3-isolation
in `sharedCostDonutChart` only, d3 kept out of dashboard/estimates). Re-verify
each of those strings still matches after the rewrite (the scroll-shell test
reads `ProjectDataClient.tsx`, which is unchanged, so it holds; the skeleton
test reads `loading.tsx`, which we lightly edit — keep
`data-project-data-loading`, `Loading project data`,
`data-project-data-grid="comparison-board"`, `project-data-grid__board`).

## Tests to ADD

### `tests/vitest/project-data-estimate-column.test.tsx` (new)
- Baseline column: sheet name, hero total, rowCount, donut present, breakdown
  list present, no remove `✕`, donut `describedById` → its list id.
- Non-baseline column: delta badge + remove `✕`; clicking remove calls `onRemove`.
- Donut `buckets` equal `collapseProjectChartBuckets(series.allBuckets, 8)`.
- `activeBucketId` dims non-matching slices (`opacity`) and non-matching list rows.

### `tests/vitest/project-data-add-estimate-column.test.tsx` (new)
- `+` enabled when `canAdd`; picking a sheet calls `onAdd(id)`.
- Disabled + titled when `!canAdd`.

### `tests/vitest/project-data-board-donut-first.test.tsx` (new, or fold into a11y)
- `CostComparisonBoard` renders N donuts + N breakdown lists for N display
  estimates; **no** shared `<table>`.
- `+` appends a column and calls `onCompareEstimateIdsChange`.
- Shared `activeBucketId`: setting it highlights the matching slice in every
  donut and the matching row in every list.

## Tests DELETED (test the deleted components)

- `tests/vitest/project-data-cost-breakdown-ui.test.tsx`
- `tests/vitest/project-data-cost-across-sheets-ui.test.tsx`
- `tests/vitest/project-data-insight-header-ui.test.tsx`

## Tests that MUST stay green (contract preserved)

- `project-data-route-state.test.ts` — URL parsing unchanged.
- `project-data-repository.test.ts` — repository unchanged.
- `project-data-concentration-sentence.test.ts` — sentence builder unchanged.

## Gates (in order)

1. `bunx tsc --noEmit` — new components + rewritten board typecheck against the
   unchanged `ProjectDataClient` prop signature; deleted files have no callers.
2. `bunx vitest run tests/vitest/project-data tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/project-dashboard-ui-fixtures.ts` — green (updated + new + governance).
3. `bun run lint` on changed files.
4. `bun run build` — catch any RSC/client-boundary regressions.

## Browser proof (opt-in, conditional)

Attempt type + vitest first. Only if a visual claim stays unproven (e.g. the
side-by-side donut layout or `+`-tile sticky-right at breakpoints) run a single
Playwright/visual pass on `/workshop/projects/<id>/data` at 1/2/3 columns.
Report as skipped otherwise (AGENTS.md speed guardrail).
