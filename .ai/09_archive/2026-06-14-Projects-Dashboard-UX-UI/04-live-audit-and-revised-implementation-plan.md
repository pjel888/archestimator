# Project Dashboard — Live Audit & Revised Implementation Plan

**Date:** 2026-06-14 (revision of plan pack started earlier today)  
**Surface:** `http://localhost:3000/workshop/projects/{projectId}` Dashboard tab  
**Status:** Backend + first UI pass already landed; this document records what the live audit found and the targeted fixes required.

---

## 1. What already works

The server assembly (`project-dashboard-repository.ts`), types, activity query, and most UI components are in place and type-check / test clean:

- `bun run type-check` passes.
- All dashboard vitests pass (37 + 35 tests).
- `impeccable detect --strict` passes.
- The headline card, breakdown table, activity strip, and estimate-list scaffold render without runtime errors.
- Console is clean on the live page.

## 2. Critical findings from the live browser audit

### 2.1 The donut chart is broken in `hideCallouts` mode (P0)

**What renders:** a tiny, misplaced ring that overflows its container. In a narrow viewport the ring disappears entirely and only the center label floats in the page.

**Root cause:** `CostDonutChart` generates D3 arc paths centered at the SVG user-space origin `(0,0)`. In `hideCallouts` mode the `viewBox` is cropped to a square around `(CENTER_X, CENTER_Y)` so the ring should sit concentric with the center label, but the `<g>` containing the arcs has **no `transform`**, so the arcs remain at the origin and render outside the viewport.

**Evidence from the DOM (live page):**
- `viewBox="136 76 248 248"`
- First arc path: `M0.792,-108.934 A112,112...` (centered at full-coord origin)
- Arc `getBBox()`: `x: -23.3, y: -111.9` (outside the viewBox)
- Screen rect of the arc vs. its SVG container: arc is at `x: 334.9, y: 59.0` while the SVG is at `x: 457, y: 203` — the ring is painted **outside** its own `<svg>`.

**Fix:** wrap the arcs `<g>` in `transform={`translate(${CENTER_X},${CENTER_Y})`}` so the ring is concentric with the center label in both `hideCallouts` and full-callout modes. Verify it does not regress the share-page or Compare-tab donuts.

### 2.2 Hero figure lacks typographic hierarchy

**What renders:** the label "Project cost" and the value "₱89,670" are both `text-[12px]`, so neither dominates. The sublabel is only slightly smaller (`text-[10px]`). The card does not read as the primary number for the page.

**Fix:**
- Label: `text-[10px] uppercase tracking-wider text-white/70`.
- Value: `text-[28px] font-semibold tabular-nums leading-tight` (or `text-[32px]` if the card allows).
- Sublabel: keep `text-[10px] text-white/70`.
- Keep the card as the single dark `FinancialTotalCard`; do not add co-equal stat tiles.

### 2.3 Cost-mix zone feels stretched and undersized at the same time

**What renders:**
- The donut is locked to `190px × 190px`, which is too small for a dashboard hero zone on desktop.
- The breakdown table occupies the remaining width with only two rows, so headers (SEGMENT / AMOUNT / SHARE) are far apart and the zone looks empty.
- On narrow viewports the single-column stack loses the donut ring entirely (because of bug 2.1).

**Fix:**
- Increase the donut to `240px × 240px` in dashboard contexts while keeping it responsive.
- Give the cost-mix section a contained card-like panel (white background, hairline border, `rounded-xs`, `p-4`) so the donut + table read as one unit instead of floating in a sea of whitespace.
- Cap the table column widths so it does not stretch to full 5xl width; keep the zone compact and scannable.
- Stack vertically below `sm` breakpoint; side-by-side at `sm` and up.

### 2.4 Left detail panel layout waste

**What renders:** the 274px aside works but its vertical spacing is loose and the timestamp footer is crammed at the bottom.

**Decision:** per the original plan, the left aside is out of scope for this refactor. The redesign targets `<main>` only. (Noted for a future polish pass.)

### 2.5 Empty / low-data states are honest but too quiet

**What renders:**
- "No recent activity" is a single muted line — correct per plan, but the surrounding whitespace makes the page feel unfinished.
- For a 1-estimate project there is no "Other estimates" list, which is correct, but the page collapses to only three short zones.

**Fix:**
- Add a subtle project-wide rollup caption to the headline meta line when all estimates share a currency (e.g., "1 estimate · ₱89,670 total · updated 22 hours ago").
- Wrap each zone in a lightweight panel so the page has structure even with minimal data.
- Keep "No recent activity" as a single line; do not inflate it.

### 2.6 Section headings and toggle spacing

**What renders:** the "Cost mix" heading and the Space/Category/Supplier toggle are right/left aligned via `justify-between`, which is fine, but the heading baseline feels slightly low compared to the toggle.

**Fix:** align both on the same baseline with `items-center` in the `SectionHeading` wrapper; keep the 11px/500 token.

### 2.7 Variance pill not verified live

No project in the local seed has a positive `project_budget`, so the red/green variance pill has not been visually validated. The code path exists and is unit-tested; we will visually verify after manually setting a budget in a test project or by inspecting a project that has one.

---

## 3. Revised implementation plan

### Phase A — Fix the donut (P0, blocks everything else)

**Files:**
- `src/components/charts/CostDonutChart.tsx`
- `tests/vitest/cost-donut-chart-ui.test.tsx` (new)

**Changes:**
1. Wrap the arcs `<g>` in `transform={`translate(${CENTER_X}, ${CENTER_Y})`}`.
2. Confirm the center label coordinates remain valid (they already target `CENTER_X, CENTER_Y`).
3. Add a regression test asserting the first arc's bounding box is inside the SVG viewBox / container and concentric with the center label.
4. Manually verify the dashboard donut, and do a quick smoke check of the share-page donut path by temporarily rendering it in Storybook or by auditing `/share/[token]` if a token is available.

### Phase B — Refactor dashboard zone components

**Files:**
- `src/components/ui/financial-total-card.tsx` — keep existing API, allow consumer to override value styling; OR create a dashboard-specific headline wrapper.
- `src/components/workshop/dashboard/DashboardHeadline.tsx`
- `src/components/workshop/dashboard/DashboardCostMix.tsx`
- `src/components/workshop/dashboard/DashboardBreakdownTable.tsx`
- `src/components/workshop/dashboard/DashboardEstimateList.tsx`
- `src/components/workshop/dashboard/ProjectActivityList.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`

**Changes:**
1. `DashboardHeadline`:
   - Increase value size dramatically (`text-[28px]` or `text-[32px]`).
   - Reduce label size and set uppercase/tracked style.
   - Add project-wide rollup to the meta line when `rollup.kind === "single-currency"`.
   - Keep variance pill absolute-top-right inside the card.
2. `DashboardCostMix`:
   - Wrap in a white bordered panel (`rounded-xs border border-hairline bg-white p-4`).
   - Increase donut size to `240px × 240px` (dashboard only; do not change `CostDonutChart` sizing props).
   - Keep grid `1col → 2col` at `sm`.
   - Ensure the breakdown table does not exceed a readable max width.
3. `DashboardBreakdownTable`:
   - Keep accessible table markup.
   - Improve column widths (segment flexible, amount/share fixed-ish at `w-24`).
   - Add a subtle hover state on rows.
4. `DashboardEstimateList`:
   - Wrap in a panel.
   - Add empty-state line when no other estimates exist? No — the component already returns `null`; keep it that way.
5. `ProjectActivityList`:
   - Wrap the populated state in a panel; keep the "No recent activity" fallback as a plain line.
6. `ProjectDashboardClient`:
   - Keep the left aside untouched.
   - Ensure `<main>` zones stack with consistent panel spacing.

### Phase C — Responsive / density verification

1. Audit at 3440px, 1280px, and 768px viewports.
2. Confirm the donut is fully inside its container at all widths.
3. Confirm text does not overflow the headline card.
4. Confirm the table remains readable on narrow viewports.

### Phase D — Tests and validation

1. Update/add vitest coverage for:
   - Donut centering regression.
   - DashboardHeadline value size / rollup caption (if testable).
   - DashboardCostMix responsive layout classes.
2. Run `bun run type-check`.
3. Run `bun run test:dom tests/vitest/project-dashboard-*.test.* tests/vitest/dashboard-*.test.*`.
4. Run `bun run lint:design`.
5. Browser proof across viewports.

---

## 4. Scope boundaries (unchanged)

- **In scope:** `<main>` cost overview, donut fix, dashboard zone styling, responsive density.
- **Out of scope:** left aside redesign, estimates table, Compare tab logic, activity instrumentation backend (already landed), fleet KPIs.

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Donut transform fix could regress share/Compare donuts | Add regression test; smoke-test share page if possible; keep transform scoped to the arcs group only. |
| Larger hero value may overflow on small cards | Use `leading-tight` and `overflow-hidden` on the card; verify at 320px equivalent. |
| Activity flag off by default makes the zone look empty | Keep the slim "No recent activity" line; do not add a large placeholder. |

---

## 6. Open questions resolved by this audit

1. **Is the plan enough?** No — it correctly identified the data and structure, but it missed the live rendering bug in `CostDonutChart.hideCallouts` and underestimated the visual hierarchy problem. This document adds those fixes.
2. **Does the page need a full refactor?** The server/data layer does not; the `<main>` client zones do, primarily for visual hierarchy, donut correctness, and density.
3. **Is the donut actually broken or just small?** It is actually broken — the arcs render outside the SVG viewport in `hideCallouts` mode.
