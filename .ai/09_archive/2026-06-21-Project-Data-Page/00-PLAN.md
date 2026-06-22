# 00 — Project Data Page: Donut-First, Per-Column Cost Comparison Redesign

**Route:** `/workshop/projects/[projectId]/data` (legacy `/charts` 302-redirects here).
**Status:** plan, awaiting owner approval.
**Skill inputs:** `$impeccable` (product register), `$hallmark`, `$Explore Codebase`.
**Owner decisions (2026-06-21):** (a) breakdown is **per-column** (no shared
table); (b) **delete the 4 orphaned** project-data sections in this PR.

---

## 1. The problem

The Data page's hero is a **dense `[9px]` comparison table with 2px-tall bar
slivers**; there's no actual chart on the page, and "add a sheet to compare"
is a value picker — so the project's main cost-visualization surface fails to
*visualize* and fails to let users compare estimates side by side.

Owner's directive: each estimate becomes a **column crowned by its own donut
chart**, and a **`+` button on the rightmost edge** (same interaction spirit as
the estimate-sheet `ResizableSidePanel` expand/collapse toggle) adds the next
estimate column for side-by-side comparison.

## 2. The redesign (target layout — per-column)

```
┌─ COST DATA ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ [Category|Supplier|Space]─┐
│  Cost breakdown  (single <h1>)                                   │
│  See where each estimate's money goes. Add sheets to compare.     │
│  insight sentence · mixed-currency / partial-coverage banners     │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐                  │
│  │ BASELINE │ │ −33%  ✕  │ │ +33%  ✕  │ │  +  │ ← AddEstimateCol │
│  │ Est 001  │ │ Est 002  │ │ Est 003  │ │ add │   (ADD_BUTTON tint)│
│  │ ₱1,800   │ │ ₱1,200   │ │ ₱2,400   │ │ est │   disabled at 3 /  │
│  │ 180 ln   │ │ 120 ln   │ │ 240 ln   │ │     │   none-left        │
│  │ (donut)  │ │ (donut)  │ │ (donut)  │ │     │                    │
│  │ Breakdown│ │ Breakdown│ │ Breakdown│ │     │ ← per-column list  │
│  │ ●Found720│ │ ●Found300│ │ ●Found960│ │     │   (each donut's    │
│  │ ●Fin 540 │ │ ●Fin …   │ │ ●Fin …   │ │     │    a11y surface)   │
│  │ [swap ▾] │ │ [swap ▾] │ │ [swap ▾] │ │     │                    │
│  └──────────┘ └──────────┘ └──────────┘ └─────┘                  │
│  Hover a slice/row → same bucket highlights across every column.  │
└───────────────────────────────────────────────────────────────────┘
```

- **One donut per estimate** (`CostDonutChart`, `hideCallouts compact`); data
  from the already-loaded `seriesByEstimateId[id][mode]`, collapsed to top-8 +
  Other via the existing `collapseProjectChartBuckets`. **No new fetch.**
- **Per-column breakdown list** (swatch + label + amount + share) sits under
  each donut and is that donut's `aria-describedby` target — each column is
  self-contained (owner's call; no shared comparison table).
- **Rightmost `+` tile** appends a compare column (cap 3 total / 2 compares —
  existing `MAX_COMPARE_COLUMNS` gate). Uses the estimate-sheet
  `ADD_BUTTON_CLASSNAME` tint; disabled (not hidden) when full.
- **Shared `activeBucketId`**: hovering a slice/list-row highlights the
  matching bucket in every column — legible because `colorForBucket` is stable.

## 3. Why this is low-risk (keep the right layers, replace the rest)

- **Untouched:** server route, repository, route-state resolver,
  `buildProjectChartComparisonView`, `colorForBucket`, the shared
  `CostDonutChart`, and the URL contract (`sheet`/`compare`/`mode`; legacy
  `left`/`right` still read). Data-minimization preserved.
- **One prop-signature-frozen rewrite:** `CostComparisonBoard.tsx` keeps the
  exact props `ProjectDataClient` passes, so the call site is unchanged. Two
  new sibling files (`EstimateColumn.tsx`, `AddEstimateColumn.tsx`) carry the
  column card and the `+` tile.
- **Delete the 4 orphaned sections** (`CostBreakdownSection`,
  `CostAcrossSheetsSection`, `ProjectDataInsightHeader`, `CostLedger`) + their
  3 UI tests, and update the 2 governance-test files that read them.

## 4. Files

| File | Action |
|------|--------|
| `src/components/workshop/project-data/CostComparisonBoard.tsx` | **Rewrite** — header + donut columns (no shared table). Same export + props. |
| `src/components/workshop/project-data/EstimateColumn.tsx` | **New**. |
| `src/components/workshop/project-data/AddEstimateColumn.tsx` | **New**. |
| `src/app/workshop/projects/[projectId]/data/loading.tsx` | **Light edit** (keep governance skeleton strings). |
| `CostBreakdownSection.tsx`, `CostAcrossSheetsSection.tsx`, `ProjectDataInsightHeader.tsx`, `CostLedger.tsx` | **Delete** |
| `project-data-cost-breakdown-ui.test.tsx`, `…-cost-across-sheets-ui.test.tsx`, `…-insight-header-ui.test.tsx` | **Delete** |
| `tests/vitest/project-dashboard-ui-fixtures.ts` | **Update** — `readOptional` for the 4 deletions. |
| `tests/vitest/project-dashboard-charts-ui.test.ts` | **Update** — rewrite board-contract block to donut-first; keep nav/scroll/skeleton/d3 tests. |
| `tests/vitest/project-data-a11y.test.tsx` | **Update** — per-column a11y contract. |
| `tests/vitest/project-data-estimate-column.test.tsx`, `…-add-estimate-column.test.tsx`, `…-board-donut-first.test.tsx` | **New** |

Reuse (no reinvention): `CostDonutChart`, `SegmentedControl`, `DropdownSelect`,
`Banner`, `EmptyState`, `ADD_BUTTON_CLASSNAME`, `Button`,
`collapseProjectChartBuckets`, `buildProjectChartComparisonView`,
`buildInsightSentence`, `formatChart*`, `colorForBucket`.

## 5. Sequencing

1. Add `EstimateColumn.tsx` + test. 2. Add `AddEstimateColumn.tsx` + test.
3. Rewrite `CostComparisonBoard.tsx` (per-column; same props).
4. Update `data/loading.tsx` skeleton.
5. Delete 4 orphans + 3 UI tests.
6. Update governance tests (`fixtures` → `readOptional`; rewrite board-contract block).
7. Update `project-data-a11y.test.tsx`; add donut-first board test.
8. Verify: `tsc --noEmit`, `vitest run` (project-data + governance), `lint`, `build`.

## 6. Definition of done

- `/data` shows one self-contained donut column per selected estimate (donut +
  per-column breakdown list), `+` tile adds columns (disabled at 3 / none).
- Grouping re-buckets every donut + list; hover/focus → shared highlight.
- Each donut `role="img"` with `aria-describedby` → its own list; one `<h1>`;
  no shared table.
- URL behaves as before; legacy `left`/`right` read.
- Orphans + their tests deleted; governance tests updated; all green;
  `tsc --noEmit` clean; build succeeds.

## 7. Full plan pack

`README.md` (index) + `01`–`07` in this folder.
