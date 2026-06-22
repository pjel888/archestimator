# 07 — Blast Radius, Sequencing, and Rollback

> **Owner decisions reflected:** per-column breakdown (no shared table) +
> delete the four orphaned sections + their three UI tests, and update the two
> governance-test files that read them.

## Blast radius

| Layer | Touched? | Why |
|-------|----------|-----|
| Server route (`data/page.tsx`) | No | Same `ProjectDataClient` + same summary. |
| Repository (`project-data-repository.ts`) | No | Payload already has everything. |
| Route state (`project-data-route-state.ts`) | No | URL contract preserved. |
| Charts engine (`project-charts/*`) | No | Consumed unchanged. |
| Shared donut (`charts/CostDonutChart.tsx`) | No | Used via existing props. |
| Client (`ProjectDataClient.tsx`) | No | Call site props identical. |
| **Board (`CostComparisonBoard.tsx`)** | **Rewritten** | Donut-first, per-column; same export + props. |
| **New: `EstimateColumn.tsx`, `AddEstimateColumn.tsx`** | **Added** | Column card + `+` tile. |
| Loading skeleton (`data/loading.tsx`) | Light edit | Match new shape (keep governance strings). |
| **Delete 4 orphan components** | **Deleted** | `CostBreakdownSection`, `CostAcrossSheetsSection`, `ProjectDataInsightHeader`, `CostLedger`. |
| **Delete 3 UI tests** | **Deleted** | Their subjects are gone. |
| **2 governance-test files** | **Updated** | `project-dashboard-ui-fixtures.ts` (`readOptional` for deletions) + `project-dashboard-charts-ui.test.ts` (rewrite the board-contract block). |
| `project-data-a11y.test.tsx` | **Updated** | New per-column DOM/a11y contract. |

**Risk level: low–medium.** Still pure client-side, single route, no
data/auth impact. The *external* contract (props, URL, data payload) is
frozen; the *internal* DOM/source contract changes, and the governance tests
that encoded the old contract are updated alongside.

## Sequencing (each step leaves the repo compiling + tests runnable)

1. **Add `EstimateColumn.tsx` + test.** Not yet mounted.
   → `vitest run project-data-estimate-column` green.
2. **Add `AddEstimateColumn.tsx` + test.** → green.
3. **Rewrite `CostComparisonBoard.tsx`** to compose 1 + 2 (per-column donut +
   breakdown list; no shared table), keeping the exact prop signature. Reuse
   `buildProjectChartComparisonView` (header insight + deltas),
   `collapseProjectChartBuckets` (per-column buckets), `buildInsightSentence`.
4. **Update `data/loading.tsx`** skeleton to the columns-row shape, preserving
   the governance strings (`data-project-data-loading`,
   `Loading project data`, `data-project-data-grid="comparison-board"`,
   `project-data-grid__board`).
5. **Delete the 4 orphan components** + their 3 UI test files.
6. **Update governance tests:** `project-dashboard-ui-fixtures.ts`
   (`readOptional` for the 4 deletions) and `project-dashboard-charts-ui.test.ts`
   (rewrite the board-contract block to the donut-first contract; keep the
   nav/scroll/skeleton/d3-isolation tests).
7. **Update `project-data-a11y.test.tsx`** to the new per-column contract; add
   the donut-first board test.
8. **Verify:** `tsc --noEmit`; `vitest run` the project-data + governance tests;
   `bun run lint`; `bun run build`. Browser pass only if a visual claim is
   unproven.

Steps 5–6 are coupled (deletions + the fixtures/tests that read them) — do
them together so the suite is never referencing missing files.

## Rollback

Concentrated in `CostComparisonBoard.tsx` (+ two new siblings) plus the
deletions and governance-test edits — all in one PR. Rollback is `git revert`
of the PR. No migration, no data, no URL breakage to undo.

## Out of scope (explicitly)

- Any change to the `/charts` redirect, the repository, or the route-state
  resolver.
- New server queries or RPCs.
- Redesigning `ProjectDataClient.tsx`, `ProjectMiniSidebar`, or the shell.

## Definition of done

- `/workshop/projects/[projectId]/data` shows one self-contained donut column
  per selected estimate (donut + per-column breakdown list), with a rightmost
  `+` tile that adds the next estimate column (disabled at 3 / none).
- Grouping (Category/Supplier/Space) re-buckets every donut + list.
- Hover/focus a slice or row → shared highlight across all donuts + lists.
- Each donut is `role="img"` with `aria-describedby` → its own breakdown list;
  exactly one `<h1>`; **no** shared comparison table.
- URL (`sheet`/`compare`/`mode`) behaves as before; legacy `left`/`right` read.
- The 4 orphan components and their 3 UI tests are deleted; the 2 governance
  test files updated; all project-data + governance vitest tests green;
  `tsc --noEmit` clean; `bun run build` succeeds.
