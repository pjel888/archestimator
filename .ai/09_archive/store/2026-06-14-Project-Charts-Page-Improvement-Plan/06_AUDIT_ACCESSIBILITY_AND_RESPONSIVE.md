# 06 — Accessibility (WCAG 2.2 AA) & Responsive Audit

**Target: full WCAG 2.2 AA compliance.** Scope: `ProjectChartsClient.tsx`,
`CostDonutChart.tsx`, `ProjectCostBubbleChart.tsx`, `ProjectChartBucketTable.tsx`,
and the design tokens that govern them.

**System note:** DESIGN.md:354-355,371-372 *mandates* 8–9 px for meta labels and
10 px for body/controls — so several findings are the *spec* sitting below an
accessible floor for chart text. The plan therefore needs a **DESIGN.md
data-viz amendment** (`10` D-7), not just component edits, or the next component
reintroduces the same violations.

---

## DONE WELL — credit and do not regress

- **D-1 — aria-live announcement of the active slice.** `CostDonutChart.tsx:392-394`
  — a correct `sr-only` `aria-live="polite"` region. The bubble should copy it.
- **D-2 — Real `<button>` segmented controls** with `aria-pressed`
  (`ProjectChartsClient.tsx:305-316`), not divs.
- **D-3 — Data table as a genuine accessible alternative.**
  `ProjectChartBucketTable.tsx:12-43` — a real `<table>` with `aria-label`, labels,
  costs, shares. **The single most important accessibility asset on the page** and
  the compliance path for the un-zoomable SVG text.
- **D-4 — Focus-restore intent on estimate change** (`ProjectChartsClient.tsx:207-214`),
  correctly guarded so it never steals focus the user moved (robustness caveat in
  A11Y-9).
- **D-5 — Per-slice labels + focusability on the donut**
  (`CostDonutChart.tsx:341-342`), `onFocus`→`setActiveId` (tab-count caveat in
  A11Y-8).
- **D-6 — Loading state has `role="status"`** (`ProjectChartsClient.tsx:21-28`).
- **D-7 — Icon-only buttons are labeled** (`:224`, `:161`); decorative icons
  `aria-hidden` (`:163`).

---

## Findings (priority order: Level A first, then AA)

### A11Y-5 — CRITICAL (Level A, 1.4.1) — Color is the sole link between chart and table
Table rows identify their bucket *only* by a color swatch
(`ProjectChartBucketTable.tsx:24-28`); donut/bubble identify slices only by fill
(`CostDonutChart.tsx:334`, `ProjectCostBubbleChart.tsx:77`). The label text exists
in the table cell, but the **visual mapping device is pure color** — a colorblind
user can't connect "this slice" to "that row." **Fix:** add a non-color cue
(index/letter token or pattern in both swatch and mark); cross-highlight the
matching row on slice hover/focus and vice-versa (`03` UX-8); keep every mark's
label visible/reachable.

### A11Y-6 — HIGH (Level A, 1.4.1) — 12-color palette has colorblind collisions
`aggregate-project-charts.ts:17-30`. Under deuteranopia: `#d98b3a`/`#c9a227`
(orange/gold) converge; `#2f5d50`/`#4c6f9f`/`#2f8f9d` (green/blue/teal) lose
separation; `#5f6b3d`/`#8a8f98`/`#6b7280` (olive/greys) muddy; `#b84a62`/`#7a5aa6`
(rose/purple) converge; the two greys collide even for full-color vision. With up
to 12 adjacent slices, multiple neighbors become indistinguishable. **Fix:** adopt
Okabe–Ito 8-max (`04`/`08`), cap distinct colors at 8 + "Other", verify in a
deuteranopia/protanopia/tritanopia simulator, assert adjacent-bucket ΔE.

### A11Y-10 — HIGH (Level A, 2.1.1/1.1.1/4.1.2) — Bubble nodes not keyboard/SR accessible
`ProjectCostBubbleChart.tsx:73-95` — circles have `aria-label` + `<title>` but **no
`tabIndex`, no focus handler, no aria-live**; `<title>` surfaces on mouse hover
only. **Resolution:** the bubble chart is **deleted** in the redesign (`03` UX-2 /
`08`), which moots this entirely. Until deletion lands, mirror the donut (focusable
+ live region).

### A11Y-11 — HIGH (Level A, 1.1.1) — SVG `role=img` gives one opaque string; chart not tied to its table
Donut `role="img" aria-label={label}` (`CostDonutChart.tsx:322-326`) is just
"<name> <mode> cost distribution"; bubble duplicates the label on `<figure>` and
`<svg>` (`:60,62-64`). Neither chart is programmatically tied to its data table.
**Fix:** chart `role="img"` + `aria-label` stating a data table follows, +
`aria-describedby` → the table's id (give each table a stable id); remove duplicate
bubble labels; consider `aria-hidden` on the purely-decorative SVG, exposing the
table as the alternative.

### A11Y-12 — HIGH (1.3.1/2.4.6/4.1.2) — No `<h1>`, chart columns are unnamed `<section>`s, no landmarks
Outer `<section data-project-charts-page>` (`:127`) has no name/heading; each
column `<section>` (`:189`) has no `<h*>`/`aria-label` → "unnamed regions." No
`<h1>` anywhere. (Toolbar groups *are* correctly named, `:131,143`.) **Fix:** add a
page `<h1>` ("Project cost comparison"); give each column region `aria-labelledby`
→ an `<h2>` naming the estimate; heading order h1 → h2. This also anchors A11Y-11.

### A11Y-1 — HIGH (1.4.4/1.4.10) — Sub-minimum chart & meta text (8/9/10 px)
SVG `<text>` does not reflow on zoom — it only scales with the viewBox, so 8–9 px
chart text defeats resize. Sites: donut callouts `text-[8px]`/`[9px]`
(`CostDonutChart.tsx:306-307`); bubble `fontSize 8`(`ProjectCostBubbleChart.tsx:84,89`);
toolbar buttons `text-[9px]` (`ProjectChartsClient.tsx:310`). **Fix:** SVG chart
text **min 11 px**; UI control/table text **min 10 px** on this surface; amend
DESIGN.md with a data-viz/interactive-control minimum exception (`10` D-7). Because
SVG text doesn't reflow, the **table (D-3) is the compliance path** — guarantee it
always renders (it does, `ProjectChartsClient.tsx:250`) and associate it (A11Y-11).

### A11Y-2 — HIGH (1.4.3) — Muted/tertiary text fails contrast on white
`text-muted-foreground`/`text-tertiary` resolve to **#7F7F7F** (`globals.css:12,20`;
`--muted-foreground` is **not even defined** — confirmed — so it's a non-deterministic
fallback). #7F7F7F on #FFF ≈ **4.0:1 — FAILS 4.5:1.** Affects callout values
(`CostDonutChart.tsx:382`), toolbar labels (`:287`), table share column
(`ProjectChartBucketTable.tsx:32`), table header, large-project note. **Fix:**
darken the muted token to ≥ **#767676** (4.54:1) — practically **#6B6B6B/#5D5D5D**;
**define `--muted-foreground` explicitly** so contrast is deterministic. One token
change fixes most sites.

### A11Y-3 — HIGH (1.4.3) — White text on the 12 categorical fills fails contrast
Bubble labels are white on the fill at `fillOpacity={0.84}` over white
(`ProjectCostBubbleChart.tsx:77,84`) — opacity *lightens* the fill, worsening it.
Spot-checks white-on-fill: `#d98b3a` ≈ 2.3:1, `#c9a227` ≈ 2.0:1, `#2f8f9d` ≈ 2.9:1,
`#8a8f98` ≈ 2.6:1, `#6b7280` ≈ 3.4:1, `#b84a62` ≈ 3.6:1 — all **FAIL** 4.5:1 for
< 18 px text; worse at 0.84 opacity. **Resolution:** mooted by deleting the bubble
(`08`); the donut puts values in dark-on-white callouts already (the correct
pattern). If any colored fill ever carries text, choose label color per-fill by
luminance and re-tune the palette to clear 4.5:1.

### A11Y-14 — HIGH (1.4.10 Reflow) — Fixed `minmax(220px,1fr)` forces horizontal scroll; nothing stacks
`repeat(N, minmax(220px,1fr))` (`ProjectChartsClient.tsx:182`) in `overflow-auto`
(`:176`). At 3 columns the grid demands ≥ 660 px + gaps → at 320–375 px the whole
page scrolls horizontally (1.4.10 failure). Charts also carry `min-h-[520px]`. No
`sm:`/`md:` stacking. **Fix:** responsive grid — single column small,
2-up at `md`, N-up at `lg+`; e.g. `repeat(auto-fit, minmax(min(100%, 360px), 1fr))`
so columns wrap/stack, never horizontal-scroll. Reduce `min-h` on small viewports.
Confirm no horizontal scroll at 320 px and usable at 400% zoom (`08` layout).

### A11Y-4 — MEDIUM (1.4.11) — Donut callout connectors too light
`stroke="#E5E5E5"` (`CostDonutChart.tsx:367`) ≈ **1.3:1 — FAILS 3:1** for a
graphical object essential to understanding (the only link between slice and
callout). **Fix:** darken connectors to ≥ #949494 (3:1) — reuse the darkened
secondary token.

### A11Y-8 — MEDIUM (2.4.3/2.1.1) — Every donut path is `tabIndex=0`: no roving tabindex
`CostDonutChart.tsx:341` — up to 12 slices × 3 columns ≈ **36 sequential tab stops**
before the table, each announcing only "label percent" with no group context.
Operable (no trap), but hostile. **Fix:** roving tabindex (one stop enters the
group, arrows move between slices, Tab exits) with `role="group"`/`aria-label` +
positional context ("Slice 3 of 12"); *or* — since the table already gives full
keyboard access — make slices `tabIndex=-1` and treat the donut as `role="img"`.
Pick one.

### A11Y-9 — MEDIUM (2.4.3/3.2.2) — rAF focus-restore is fragile across the remount boundary
`ProjectChartsClient.tsx:207-214`: column `key` includes the estimate id (`:190`),
so changing the estimate remounts the column; a single `requestAnimationFrame` then
queries a `data-testid` — React commit + Radix portal mount may not complete within
one rAF (focus silently lost), and coupling focus to a test attribute is fragile.
**Fix:** prefer not remounting on estimate change (drop the estimate id from `key`
so the trigger persists and focus is never lost); if remount is required, use
`useLayoutEffect` keyed on the committed estimate id targeting a stable `ref`/`id`.

### A11Y-13 — MEDIUM (2.5.8 Target Size) — Touch targets at/below the 24 px floor
Remove button `size-6` = 24×24 (`:225`) — exactly at the floor, no margin;
segmented buttons `h-6` = 24 px (`:310`) — pass. The genuinely sub-minimum targets
are donut slices/bubbles on mobile; the 2.5.8 "equivalent control" exception
applies because the **table provides ≥ 24 px tappable rows** (`py-2`). **Fix:** bump
remove button to `size-7` (28 px); designate the table the touch-accessible control
surface.

### A11Y-15 — LOW (2.3.3, AAA) — Hover/active transitions not gated on prefers-reduced-motion
`transition-opacity` (`CostDonutChart.tsx:337`), active radius `+4`, button
`transition` (`:310`). globals.css has no chart-surface reduced-motion reset (only
landing-scoped blocks `:716-739,802-808`). The opacity fade is low vestibular risk,
so AAA-tier, not an AA blocker. **Fix:** `motion-reduce:transition-none` on the
slice/button transitions. State honestly as polish for the 100% target, not an AA
gate.

### A11Y-16 — LOW/INFO — Token drift: focus color & undefined `muted-foreground`
DESIGN.md:21 says `focus:#292929` but `globals.css:26` defines `--focus:#3D3D3D` —
both pass 1.4.11 (#3D3D3D ≈ 9.8:1), so flag only as drift. `--muted-foreground` is
undefined yet widely used → A11Y-2's contrast is non-deterministic until it's
defined. **Fix:** reconcile the focus token; define `--muted-foreground` at the
darkened value.

---

## Priority order for the plan

1. **Critical / Level A:** A11Y-5 (color-only mapping), A11Y-6 (palette
   collisions), A11Y-10 (bubble — mooted by deletion), A11Y-11/A11Y-12 (img-role +
   headings/landmarks).
2. **High AA:** A11Y-1 (font floor + DESIGN.md amendment), A11Y-2 (muted contrast),
   A11Y-3 (white-on-fill — mooted by bubble deletion), A11Y-14 (reflow/stacking).
3. **Medium:** A11Y-4 (connectors), A11Y-8 (roving tabindex), A11Y-9 (focus
   restore), A11Y-13 (touch targets).
4. **Low / AAA / drift:** A11Y-15 (reduced-motion), A11Y-16 (tokens).

**Cross-cutting leverage:** the data table (D-3) is already the best accessible
asset — most chart-level failures (un-zoomable text, hidden marks, tab tedium,
touch) discharge by *formally designating the table the equivalent alternative*
(associate via `aria-describedby`/headings; it already renders in both views) and
relaxing the SVG to `role="img"`. Two token edits (darken `--muted`/`--tertiary`/
`--muted-foreground`; darken the `#E5E5E5` connector) clear A11Y-2 + A11Y-4
globally. The one irreducible design-system decision is A11Y-1/A11Y-6: the plan
**must** amend DESIGN.md's 8–9 px allowance for the data-viz surface and swap the
palette, or the violations regenerate.

---

## Quality posture

The accessibility audit carries WCAG anchors, severity, file evidence, and fixes
while preserving existing good work such as the live region, real buttons, and data
table. Completion still depends on the executable Storybook, keyboard, SR, and
responsive checks in `07`/`11`.
