# 08 — Redesign North Star & Design Spec

This is the target. It translates the audits (`03`) and research (`04`) into a
concrete, buildable design: information architecture, layout, the chart system,
type scale, palette, interaction model, motion, and copy. The implementation plan
(`09`) builds *to this spec*; the QA matrix (`11`) verifies against it.

---

## The reframe: "Charts" → "Cost comparison"

Rename the mental model from *"look at pretty distributions"* to **"understand why
these estimates differ and where the money concentrates."** The page answers three
questions, in priority order:

1. **Which estimate is cheaper, and by how much?** (the verdict)
2. **What drives the difference?** (variance by bucket, biggest first)
3. **Where does the money go within an estimate?** (composition, by space /
   category / supplier)

Everything on the page serves one of these three. If an element doesn't, it's
decoration and it's cut.

The enabling fact (`03` UX-1): `buildProjectChartComparison` already computes the
data for questions 1 and 2. **We are wiring up an existing engine, not building a
new one.**

---

## Information architecture — three bands, top to bottom

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER BAND                                                            │
│  Lewis Residence · Cost comparison                          [PHP]      │
│  Comparing Schematic (₱4.20M) vs Tender (₱3.80M) · grouped by Space    │
│                                                                        │
│  ┌─ Insight ─────────────────────────────────────────────────────┐    │
│  │ ▲ Tender is ₱400k (9.5%) lower than Schematic, driven mostly   │    │
│  │   by Structural (−₱520k) and MEP (−₱180k).                     │    │
│  └────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│ CONTROL ROW                                                            │
│  Break down by [ Space | Category | Supplier ]   Baseline ▾ Schematic │
│  Estimates: [Schematic ×] [Tender ×] [+ Add estimate]   View ▾ Variance│
├──────────────────────────────────────────────────────────────────────┤
│ PRIMARY — VARIANCE SPINE (the headline view)                          │
│                                                                        │
│   Structural   Schematic ●━━━━━━━━━━━━━━━━━━━━● Tender   −₱520k  −18%  │
│   MEP          Schematic ●━━━━━━━━━● Tender              −₱180k  −12%  │
│   Finishes     Schematic ●━━━● Tender                    +₱90k   +4%   │
│   Sitework     Schematic ●━● Tender                      −₱40k   −6%   │
│   … sorted by |Δ|, biggest first                                       │
├──────────────────────────────────────────────────────────────────────┤
│ SECONDARY — COMPOSITION + DETAIL (side by side or stacked)            │
│  100%-stacked composition bars        Comparison detail table         │
│  Schematic ▓▓▓▓▓░░░▒▒                 Space   Schem.  Tender   Δ   Δ%  │
│  Tender    ▓▓▓░░░▒▒                   Structural …    …      −520k -18%│
│  (shared, stable category colors)     …                               │
└──────────────────────────────────────────────────────────────────────┘
```

(Single-estimate state collapses bands 3–4 to one composition view + an optional
donut "share view"; comparison controls hide when only one estimate exists.)

### Band 1 — Header
- **Project name + "Cost comparison"** title (12 px/500 — the page's one largest
  element), currency chip top-right.
- **Subtitle** naming what's compared: estimate names + totals + grouping
  (11 px/400). Fixes `03` UX-4.
- **Insight panel** (new, the product's heart): an auto-generated sentence —
  *"Tender is ₱400k (9.5%) lower than Schematic, driven mostly by Structural
  (−₱520k) and MEP (−₱180k)."* Generated from `buildProjectChartComparison` rows
  (top 1–2 by `abs(delta)`), using semantic direction words and the
  success/danger accent. Pinnable into proposal export later. (`04` §3.) When
  `deltaPercent` is `null` (baseline 0), render "new" — never "∞%" (`03` UX-10).

### Band 2 — Controls (demoted from today's hero strip)
- **Break down by:** Space / Category / Supplier — segmented control, 10 px
  buttons, real `<button aria-pressed>` (keep D-2), arrow-key roving within the
  group.
- **Baseline selector:** which estimate is the reference for deltas (defaults to the
  first estimate in the current repository order, which is newest-first today; see
  `10` D-3/Q-1).
- **Estimate chips:** add/remove comparands, **max 3** (the existing
  `MAX_CHART_COLUMNS`). "Add estimate" not "Add chart" (`03` UX-9).
- **View:** Variance (default) · Composition · Share (single-estimate donut). The
  encoding toggle is minimized, not a co-equal hero.
- **Primitive contract:** controls use shared UI primitives from
  `src/components/ui/*` or one new shared primitive; no route-local button, chip,
  segmented-control, dropdown, or table-control class strings. Labels, control
  tops/heights, helper/error slots, caret padding, and clear-button insets align as
  one row system (`13` R-5).

### Band 3 — Variance spine (PRIMARY)
The headline visualization. One row per bucket, **sorted by `abs(delta)`
descending** (the engine already does this, `aggregate:384`):
- **Default form — dumbbell / connected dot plot:** each row shows both estimates'
  actual values as dots on a shared horizontal axis, connected by a bar; the gap
  *is* the variance, read by **position + length** (Cleveland-rank #1). Direction
  colored success (lower) / danger (higher) with the **Δ amount + Δ% labeled
  directly** at the row end (`04` §1, §4).
- **Alternate form — IBCS waterfall/bridge** ("Schematic → Tender"): start = baseline
  total, one ±bar per bucket variance sorted by magnitude, end = comparand total;
  red = unfavorable, green = favorable, +/− signs. Available via the View control
  for users who want the bridge. (`04` §1.)
- For **3 estimates**, the dumbbell generalizes to a row of 3 dots vs baseline; the
  waterfall stays pairwise (baseline vs the selected comparand).

### Band 4 — Composition + detail (SECONDARY)
- **Composition:** per estimate, a **100%-stacked horizontal bar** (share-of-total)
  with a **shared, stable color legend** — one color per category across *all*
  estimates (fixes `03` UX-7 / `06` A11Y-5). Optionally a **grouped horizontal bar**
  (one bar per estimate within each category) for absolute comparison. A single
  **donut** is available only in single-estimate "Share view," ≤ 5 slices + Other
  (`04` §1).
- **Comparison detail table** (upgrade of `ProjectChartBucketTable` — the best-built
  component): columns **Bucket · Est A cost / share · Est B cost / share · Δ · Δ%**,
  preserving the Space tree hierarchy + indentation. This is also the **accessible
  text alternative** for the charts (`06` A11Y-11), with a stable id each chart
  points at via `aria-describedby`.

**Deleted:** the bubble/circle-pack chart entirely (`03` UX-2, `04` §1) — no
analytical job a bar doesn't do better, and it removes `d3-hierarchy` from the
bundle (`01` PERF-5).

---

## Type scale (within DESIGN.md, fixing `03` UX-3 / `06` A11Y-1)

| Element | Size / weight | Notes |
|---|---|---|
| Page title ("Cost comparison") | 12 px / 500 | the one largest element |
| Header subtitle | 11 px / 400 | |
| Insight sentence | 11 px / 400, accent on the number | direction word + Δ in success/danger |
| Section labels / eyebrows | 9 px / 500 uppercase | labels **only** |
| **All chart values, bar/dot labels, axis ticks** | **≥ 11 px** (SVG `<text>`) | never below; SVG text doesn't reflow |
| **Controls / table / numeric values** | **≥ 10 px** | never below (DESIGN.md control floor) |
| KPI / column total (hero number) | 12 px / 500, strong `#292929` | "don't use subtle text for totals" (DESIGN.md:339) |

Weights **400/500 only** — delete the bubble's 700/600 (`03` UX-3). Radius `xs`/3 px.
Tracking 0. Requires the **DESIGN.md data-viz amendment** (`10` D-7) so this floor
is the documented rule, not a one-off.

---

## Color (fixing `03` UX-7 / `06` A11Y-5/6)

- **Stable mapping:** color is assigned by a **stable category key** (bucket
  id/label hash), not per-series rank index. The same category is the same color in
  every estimate, every band. This is the correctness fix.
- **Palette:** the **Okabe–Ito 8-color** CVD-safe set (`04` §4) — 7 series colors
  (black reserved for text/axes) + a neutral "Other." Cap distinct categories at 8
  via the existing `collapseTopBuckets` (`aggregate:387`); the tail folds into
  "Other."
- **Delta direction** uses semantic **success (lower cost) / danger (higher cost)**
  per DESIGN.md:343 — the one place color carries strong meaning, always reinforced
  by **bar direction + sign**, so it is never color-alone (WCAG 1.4.1).
- **Redundant encoding everywhere:** direct labels on marks; never rely on the
  swatch alone to link chart ↔ table (`06` A11Y-5).
- **Named exception:** Okabe-Ito orange is permitted only as a data-viz categorical
  hue in chart marks, legends, and data tables. It must not leak into page chrome,
  navigation, controls, buttons, or headers (`10` D-15, `13` R-8).

---

## Interaction model (`03` UX-8, `04` §5)

- **One shared `activeBucketId`** across the insight, variance spine, composition
  bars, and detail table. Hover/focus anywhere highlights that bucket *everywhere*
  (dot/bar emphasized, table row tinted `accentSoft`, the matching mark in other
  estimates outlined). **Click to pin** so a user can lock a category while reading.
- **Overview → zoom/filter → details-on-demand** (Shneiderman): land on the
  category-level overview; the Break-down-by + estimate controls are the
  zoom/filter; the detail table + (future) drill area→group→item is
  details-on-demand.
- **Tooltips** (where used) are keyboard-reachable, Esc-dismissible, persistent
  while focused (WCAG 1.4.13) — not the bubble's hover-only `<title>`.
- **Keyboard:** roving tabindex within mark groups (`06` A11Y-8); the detail table
  is the full keyboard/SR surface (D-3). No remount-on-estimate-change focus loss
  (`06` A11Y-9 — drop the estimate id from the column `key`).

---

## Motion (`04` §6, `06` A11Y-15)

- Short (~300–500 ms) eased transitions on data change (grouping switch, estimate
  add/remove, baseline change) for **object constancy** — dots/bars tween to their
  new positions so the eye tracks which became which.
- **No** count-up odometers, spinning slices, parallax, or bouncy motion (`03`
  UX-10). Functional only.
- **All motion gated behind `prefers-reduced-motion: reduce`** (instant updates).

---

## Copy (`03` UX-9)

| Old | New |
|---|---|
| "Group By" / "View By" | "Break down by" / "View" (lowercase, demoted) |
| "Space / Category / **Suppliers**" | "Space / Category / **Supplier**" (singular agreement) |
| "Add chart" | "Add estimate" |
| "Large project mode loads selected comparisons only." | "This project is large — showing only the estimates you picked. Choose estimates to compare." |
| "No cost rows" / "No cost rows." | unified: "No cost rows yet." |
| empty: "Create at least two estimates before comparing…" | "Add a second estimate to compare costs." + [Create estimate] (when exactly 1 exists) |

Navigation copy follows the same reframe: the sidebar/dashboard label becomes
`Cost comparison` or compact `Compare`, with a comparison/bar icon instead of a
pie icon. The URL may stay `/charts` for compatibility (`13` R-7).

Insight sentence template:
`"{Comparand} is {₱Δ} ({Δ%}) {lower|higher} than {Baseline}, driven mostly by {topBucket} ({±₱}){ and {second} ({±₱})}."`
(omit the "driven by" clause when there's a single dominant bucket or none stands
out; use "new" when `deltaPercent` is null).

---

## Layout & responsive (`03` UX-5, `06` A11Y-14)

- Full-width workshop canvas; **no 220 px columns, no inner horizontal scroll.**
- Variance spine gets the dominant vertical space; composition + table below.
- Bands 3–4 stack responsively: single column < `md`, side-by-side ≥ `lg`. The
  estimate comparison never forces horizontal page scroll — **stacks vertically**
  beyond the fit budget. Confirm at 320 px (`07` G).
- `charts/loading.tsx` mirrors this shape (header band + insight skeleton + variance
  rows + table) — not the current column grid (`01` PERF-1).
- Provider-free Storybook states cover empty, single-estimate, two-estimate
  variance, three-estimate max, large/truncated, missing/null-delta, 320 px, 400%
  zoom, grayscale/CVD, and reduced-motion. These are part of the design target, not
  optional QA polish (`13` R-6).

---

## What to delete / reuse / build

| Action | Component |
|---|---|
| **Delete** | `ProjectCostBubbleChart.tsx` (worst encoding; removes d3-hierarchy) |
| **Wire up (already built)** | `buildProjectChartComparison` + `buildComparisonRows` (currently dead, `aggregate:69-88, 357-385`) |
| **Keep & extend** | `ProjectChartBucketTable.tsx` → comparison detail table + a11y alternative |
| **Demote** | `CostDonutChart.tsx` → optional single-estimate "Share view," `dynamic`-imported, responsive in-column size (note its cross-surface use on `/share/*` — change behind the existing `compact` prop, don't regress the share page) |
| **Build new** | Insight panel; variance spine (dumbbell + waterfall); stable color util; shared `activeBucketId` highlight; composition stacked/grouped bars |

**Cross-surface guardrail:** `CostDonutChart` is shared with `/share/[token]`
(memory: cross-surface blast radius). Any change to it must keep the share page's
`compact` path pixel-stable — verified by the existing share tests + a screenshot
diff (`11`).

---

## Target rating

Current: **22 / 100** (`03`). This spec, fully built, targets **≥ 85 / 100** — the
ceiling is set by doing the core job (comparison), using position-based encodings,
stable CVD-safe color, the data lifted off the 8 px floor, and a real IA/entry
point. The remaining headroom to 100 is future drill-down (area→group→item),
proposal-export integration of the insight, and saved comparison presets — out of
scope here, noted in `10`.

---

## Quality posture

The target remains concrete and buildable, but the second pass adds the guardrails
that keep the design from drifting during implementation: shared primitives,
aligned controls, explicit palette scope, route/navigation naming, and deterministic
Storybook/visual QA states.
