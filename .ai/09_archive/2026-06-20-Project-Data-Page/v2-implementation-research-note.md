# Project Data Page - v2 comparison board implementation note

**Date:** 2026-06-20/21 implementation pass
**Route:** `/workshop/projects/[projectId]/data`
**Goal:** express cost per estimate sheet and let users compare that sheet against up to two other estimate sheets in the same project.

## UX evidence used

- NN/g comparison-table guidance favors small comparison sets and notes dynamic comparison tables commonly accept 3-4 items. That supports a baseline plus up to two compare sheets instead of an unbounded dashboard grid: <https://www.nngroup.com/articles/comparison-tables/>
- NN/g data-table guidance names comparison as one of the core table tasks. That supports making one exact, aligned ledger the primary artifact, with chart marks embedded in cells: <https://www.nngroup.com/articles/data-tables/>
- NN/g chart-choice guidance favors bar charts over pie charts for quickly perceiving value differences. That supports shared-scale horizontal bars instead of separate donuts as the comparison spine: <https://www.nngroup.com/articles/choosing-chart-types/>
- NN/g mobile-table guidance calls for preserving table context on small screens. That supports a horizontally scrollable ledger with sticky row labels and compact columns rather than card stacks that destroy adjacency: <https://www.nngroup.com/articles/mobile-tables/>
- WCAG 2.2 SC 1.4.1 requires that color not be the only information channel. That supports signed delta text and percent labels in addition to success/danger colors: <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>

## Implemented product shape

- Replaced the active Project Data client surface with a single `CostComparisonBoard`.
- Board grammar:
  - one `Group cost by` segmented control applies to all columns;
  - one `Baseline estimate sheet` selector;
  - one `Add sheet to compare` selector capped at three total displayed sheets;
  - baseline and compare chips, with compare chips removable;
  - one semantic comparison table with cost-group rows and one sheet column per displayed estimate.
- The URL contract is now canonical:
  - `sheet=<baselineEstimateId>`;
  - `compare=<estimateId,estimateId>` for up to two compare sheets;
  - `compare=none` when a user explicitly clears comparisons;
  - legacy `left`/`right` remain read-only fallbacks and are removed on interaction.
- The repository now loads pre-bucketed chart series for `[baseline, ...compare]` instead of only the selected sheet. If no compare preference is present and another sheet exists, the route defaults to one comparison sheet.
- Mixed-currency projects still show per-sheet totals but suppress deltas.
- Mixed-currency handling is scoped to the selected board sheets, not the whole
  project; an unselected foreign-currency sheet does not suppress valid deltas
  between same-currency selected sheets.
- Partial chart payloads surface a warning when the repository reports truncation.
- Three-sheet bucket ordering uses the largest movement across every comparand,
  so the second comparison sheet cannot hide its biggest driver in `Other`.
- The collapsed `Other` row sums line counts from the same hidden bucket set as
  the displayed totals.

## Validation evidence

Passed:

- `bun test tests/unit/compare-href.test.ts`
- `bunx vitest run tests/vitest/project-data-route-state.test.ts tests/vitest/project-data-repository.test.ts tests/vitest/project-data-a11y.test.tsx tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/project-data-cost-across-sheets-ui.test.tsx --maxWorkers=1`
- `bunx vitest run tests/vitest/project-charts-comparison-view.test.ts tests/vitest/project-charts-payload-contract.test.ts tests/vitest/project-charts-cache-freshness.test.ts --maxWorkers=1`
- `bun run type-check` after clearing a stale ignored `.next/` cache
- targeted ESLint on touched project-data source and tests
- `node .agents/skills/impeccable/scripts/detect.mjs --strict src/components/workshop/project-data/CostComparisonBoard.tsx src/components/workshop/project-data/ProjectDataClient.tsx`
- `git diff --check`

Reviewer follow-up:

- A read-only verifier flagged selected-subset currency, mobile flex sizing,
  three-sheet bucket ranking, and `Other` line-count risks. Those were fixed and
  covered by regression tests in `tests/vitest/project-data-a11y.test.tsx`.

Known validation gap:

- Browser proof against `http://localhost:3000/.../data` was not collected. The existing port-3000 dev server accepted TCP but returned no bytes within a 10-second bounded curl. An isolated dev server on port 3001 was healthy, but this shell had no `ARCHESTIMATOR_DEV_AUTH_BYPASS` secret/email configured, so the protected route correctly redirected to `/login`.

Unrelated worktree note:

- Concurrent/unrelated changes existed outside the project-data surface during this pass, including the removed `newdesign` route that caused stale `.next/types` validation. Those files were left alone.
