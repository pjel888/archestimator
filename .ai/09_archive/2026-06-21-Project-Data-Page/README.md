---
title: Project Data Page — Donut-First Cost Comparison Redesign
date: 2026-06-21
route: /workshop/projects/[projectId]/data
status: current-plan
execution: knowledge-work
---

# Project Data Page — Donut-First Cost Comparison Redesign

## Scope

This plan package redesigns the **Project Data page** at
`/workshop/projects/[projectId]/data` (the route the legacy `/charts` path
302-redirects into). Today the page renders a single dense comparison
**table** (`CostComparisonBoard`) with `[9px]`/`[10px]` text, 2px-tall bar
slivers, and `[8px]` delta badges as its *primary* surface. The owner has
directed a **donut-first redesign**: each selected estimate becomes a column
crowned by its own donut chart showing the cost breakdown, and a **`+` button
on the rightmost edge** (the same affordance shape as the estimate-sheet
`ResizableSidePanel` collapse/expand toggle) adds the next estimate column for
side-by-side comparison.

Owner's words: *"this is supposed to be the main data visualization for the
page… make users know and understand the cost of the project through the
estimates… a donut chart per estimate/div… a + button on the rightmost side
(similar to the expand/collapse sidebar button) which adds another field for
estimate 002 in order to compare them side by side… right now it's bad and the
ux is non existent… you can even delete all of it."*

## Files in this package

| File | Purpose |
|------|---------|
| `08-IMPLEMENTATION-GUIDE.md` | **Authoritative codebase-AI implementation guide (read this FIRST for implementation).** Code-verified 2026-06-22 via a 6-agent audit + adversarial review; corrects 5 errors in `00`/`03`/`04`/`06`, adds SWOT, a 12-item risk register, a 5-commit green-at-every-commit sequence, and copy-pasteable component specs. |
| `00-PLAN.md` | The original implementation plan (design rationale; for implementation specifics defer to `08`, which corrects its errors). |
| `01-CURRENT-STATE-AUDIT.md` | What the page is today, the data contract, and why it reads as unusable. |
| `02-TARGET-UX-AND-LAYOUT.md` | The donut-first target layout, column anatomy, the `+` affordance, states. |
| `03-COMPONENT-AND-FILE-PLAN.md` | New/changed/deleted files, shared-primitive reuse, type additions. |
| `04-DATA-AND-ROUTE-CONTRACT.md` | Repository/route-state/query-param contract kept stable; new per-estimate series accessors. |
| `05-RESPONSIVE-A11Y-INTERACTION.md` | Responsive behavior, keyboard, a11y (data-table-as-alt-text rule), motion. |
| `06-TEST-AND-VERIFICATION-PLAN.md` | Tests to add, tests to update, verification gates. |
| `07-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | What the change touches, safe order, rollback. |

## Guiding principles (from DESIGN.md + impeccable product register)

- **One surface, one shadow.** Paper panel floats on the grey canvas; inside
  stays flat (thin borders + whitespace), no nested cards.
- **Data-viz amendment.** SVG chart text floor `11px`; the **data table is the
  zoom-safe / screen-reader surface** — every donut points at its table via
  `aria-describedby` and may be `role="img"`. Categorical hues come only from
  `colorForBucket` (Okabe–Ito), applied as inline `fill`, never Tailwind classes.
- **Reuse over reinvent.** The shared `CostDonutChart`
  (`src/components/charts/CostDonutChart.tsx`) already supports
  `hideCallouts`, `compact`, `activeBucketId`, and `describedById` — exactly
  the knobs a column-donut needs. The `+` add affordance reuses the
  estimate-sheet `ADD_BUTTON_CLASSNAME` light-orange exception. The
  grouping control reuses `SegmentedControl`; sheet pickers reuse
  `DropdownSelect`.
- **Don't block on design-system lint.** DESIGN.md is alpha-stage; the owner's
  direction wins. This redesign follows the owner's donut-first mandate.

## Owner decisions (2026-06-21)

1. **Breakdown is per-column.** Each estimate column is self-contained — its
   own donut + its own breakdown list (swatch/label/amount/share). There is
   **no shared comparison table** beneath the columns. Each donut's accessible
   text alternative is its own in-column list (`aria-describedby`).
2. **Delete the 4 orphaned sections** (`CostBreakdownSection`,
   `CostAcrossSheetsSection`, `ProjectDataInsightHeader`, `CostLedger`) and
   their 3 UI tests in this PR, and update the 2 governance-test files that
   read them.

## Decision: keep the right layers, replace the hero

The owner offered "you can even delete all of it." We replace the board's hero
surface and delete the dead sections, but **preserve** the data layer, the
`buildProjectChartComparisonView` engine, the URL state contract, and the
repository/route-state tests. Deletion of *those* would throw away a correct,
pre-bucketed, CVD-safe aggregation pipeline the new donut-first view rides
directly.
