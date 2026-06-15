# Project Dashboard — Implementation Notes

**Date:** 2026-06-14  
**Status:** Phase A + Phase B implemented and validated.

---

## What was changed

### 1. Fixed the donut chart rendering bug

**File:** `src/components/charts/CostDonutChart.tsx`

- Added `containerClassName` prop so consumers can size the inner chart wrapper.
- Wrapped the arcs `<g>` in `transform={`translate(${CENTER_X}, ${CENTER_Y})`}` so the ring stays concentric with the center label in both `hideCallouts` and full-callout modes.
- This fixes the dashboard donut where arcs were rendering **outside** the SVG viewport.

### 2. Added donut regression tests

**File:** `tests/vitest/cost-donut-chart-ui.test.tsx` (new)

- Asserts arc paths are inside the SVG container in `hideCallouts` mode.
- Asserts the same for full callout mode.

### 3. Improved headline hierarchy

**Files:**
- `src/components/ui/financial-total-card.tsx`
- `src/components/workshop/dashboard/DashboardHeadline.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`

- Label is now `10px uppercase tracking-wider`.
- Primary value is `28px font-semibold`.
- Added project-wide rollup caption to the meta line when all estimates share a currency.
- Passed `rollup` from `ProjectDashboardClient` into `DashboardHeadline`.

### 4. Wrapped dashboard zones in panels and improved density

**Files:**
- `src/components/workshop/dashboard/DashboardCostMix.tsx`
- `src/components/workshop/dashboard/DashboardBreakdownTable.tsx`
- `src/components/workshop/dashboard/DashboardEstimateList.tsx`
- `src/components/workshop/dashboard/ProjectActivityList.tsx`

- Cost mix is now a white bordered panel with `p-4`.
- Dashboard donut enlarged to `240px × 240px` via `containerClassName`.
- Breakdown table columns constrained (`w-24` amount, `w-16` share) and rows have hover state.
- Other-estimates list wrapped in panel with slightly taller rows.
- Activity list (empty + populated) wrapped in panel.

### 5. Updated tests

**File:** `tests/vitest/dashboard-headline-ui.test.tsx`

- Added `rollup` prop to all renders.
- Added tests for mixed-currency caption and multi-estimate project total caption.
- Updated meta-line expectation to include the rollup total.

---

## Validation performed

- `bun run type-check` — passes.
- `bun run test:dom tests/vitest/project-dashboard-*.test.* tests/vitest/dashboard-*.test.* tests/vitest/cost-donut-chart-ui.test.tsx` — 60 tests pass.
- `bun run lint` on changed files — no new errors.
- `bun run lint:design` — passes.
- Live browser audit at wide viewport:
  - Donut renders correctly inside its container.
  - Headline value is dominant.
  - Cost mix panel is structured.
  - Empty state still renders.
- Full `next build` — see background task output.

---

## What was deliberately not changed

- Left aside (`ProjectDashboardClient` lines ~147-186) — kept untouched per plan scope.
- Estimates table and Compare tab logic — untouched.
- Activity backend/instrumentation — already landed; only UI styling changed.
- `is_primary` flag, denormalized `project_id` on events, locale parameterization — deferred per plan.

---

## Residual risks / next steps

1. **Variance pill not visually verified live** — no local project has a positive `project_budget`. The code path is unit-tested; verify on a real project with a budget when one is available.
2. **Multiple-estimate list not visually verified live** — only one estimate exists in the accessible local project. The component is unit-tested with multiple rows; verify when a second estimate is added.
3. **Share-page donut smoke test** — the transform fix should also improve/correct the share-page and Compare-tab share-view donut, but no live share link was available to screenshot.
