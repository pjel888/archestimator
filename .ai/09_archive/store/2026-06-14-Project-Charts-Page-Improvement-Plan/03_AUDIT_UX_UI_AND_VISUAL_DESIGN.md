# 03 — UX/UI & Visual Design Audit

**Scope:** the whole charts surface — toolbar, N-column donut/bubble layout,
bucket tables, empty/loading/error states, aggregation/color layer. Audited
against **DESIGN.md** (the project's own system) and Dieter Rams' ten principles.

**Verdict up front:** this page is a *data-decoration exercise wearing the costume
of an analytics tool.* It renders three independent pie charts side by side and
calls it a "project charts" page. The one thing it exists to do — let an estimator
**compare** estimates and understand **where the money goes and why one is more
expensive** — is the one thing it does not do, despite the comparison engine being
fully built and sitting unused. Everything else (micro-type, cramped toolbar, weak
encodings) is downstream of that missing spine.

**Current design-quality rating: 22 / 100** (justified at the end).

---

## The design system we are held to (from DESIGN.md)

The project has a real, strict, *legitimately compact* scale — it permits small
type, but with hard rules this page violates:

- **12 px hard max**; 11 px subtitles; **10 px** = body / controls / table /
  numeric values; **8–9 px** = meta / eyebrow labels **only**.
- **Hierarchy invariant (DESIGN.md:355, :372):** labels, eyebrows, metadata, and
  muted subheaders must **never render larger** than the input/control/body text
  they describe — and, conversely, body/values must never be demoted to label
  size.
- Weights **400/500 only** (no 700). Radius `xs`/3 px only. Tracking 0.
- "**Do not use subtle text for financial totals.**" (DESIGN.md:339) — strong
  `#292929` for totals; subtle `#7F7F7F` for meta only.

So this is **not** a "make everything bigger" critique. The page fails *within its
own system*: it uses label-size type for primary data, has no title hierarchy, and
picked the two worst chart encodings.

---

## Findings

### UX-1 — CRITICAL — The comparison story is missing; the page is N independent pies

**Files:** `ProjectChartsClient.tsx:76-98, 184-253`; dead engine
`aggregate-project-charts.ts:69-88` (`buildProjectChartComparison`), `:357-385`
(`buildComparisonRows`, `delta`/`deltaPercent`); type `ProjectChartComparisonRow`
(`types.ts:89-97`).
**Principle:** Rams #2 *useful*, #4 *understandable*; Tufte (a comparison display
must make the comparison *visible*).

The UI maps `chartEstimateIds` to fully **independent** `buildProjectChartSeries`
calls (`:85`). Each column is its own donut + its own table with its own per-series
share %. There is **no delta, no variance, no "which is cheaper and by how much,"
no shared baseline, no narrative.** Comparing Estimate A (₱4.2M) and B (₱3.8M)
forces the user to mentally diff two pies whose slices are in different sort
orders, different colors (UX-7), and different scales — cognitively near
impossible, and the exact task the page is named for.

`buildProjectChartComparison` already computes per bucket `leftTotal`,
`rightTotal`, `delta`, `deltaPercent`, sorted by `abs(delta)` desc (`:384`) — "the
buckets that moved the most, biggest first." **That is the entire insight product,
pre-built, wired to nothing.** This is the single highest-leverage fact in the
audit.

**Fix:** make comparison the spine (`08`). Default view = an N-estimate comparison
with an explicit **variance** visualization driven by `buildProjectChartComparison`.
Single-donut "inspect one estimate" becomes a secondary affordance, not the
homepage.

---

### UX-2 — CRITICAL — Bubble and donut are the two *worst* encodings for this data

**Files:** `ProjectCostBubbleChart.tsx` (whole; d3 pack `:44-48`);
`CostDonutChart.tsx` (whole).
**Principle:** Cleveland–McGill perceptual ranking — humans decode **position on a
common scale** best, then **length**, then **angle**, then **area** worst (`04`).
A donut encodes by *angle*; a circle-pack bubble by *area*. Ranks 4 and 5 of 5.

- **Donut:** comparing slice angles *across two separate donuts* is the canonical
  bad-viz example.
- **Bubble:** strictly worse — area is hard to compare even within one chart, and
  `d3-hierarchy` pack positions bubbles by its own algorithm, so **spatial
  position carries no meaning** while reading as if it does. Labels only render at
  `r ≥ 34`, values at `r ≥ 46` (`:69-70`), so small-but-important buckets become
  anonymous colored circles. Decoration that actively misleads.

**Fix:** replace both as the *primary* encoding with **horizontal / grouped /
stacked bars and dot plots** (position + length). For deltas, a **waterfall /
diverging bar** sorted by `abs(delta)`. Keep an *optional* single donut for
one-estimate "share at a glance"; **delete the bubble chart** — it has no
analytical job a bar does not do better.

---

### UX-7 — CRITICAL/HIGH — Color is the only chart↔table link, is not stable across columns, and is not CVD-checked

**Files:** palette `aggregate-project-charts.ts:17-30` (12 hexes); assignment
`toBucket:412-418` → `color = PROJECT_CHART_COLORS[index % length]` where `index`
= **per-series rank order** (`:130-132`).
**Principle:** Rams #4 *understandable*; WCAG 1.4.1 *Use of Color* (Level A);
colorblind safety.

Two compounding problems:

1. **Color is the only cross-reference.** Donut slice ↔ table row ↔ other estimate
   are linked *purely by hue*. For ~8% of men, the palette's greens/olive/greys
   (`#2f5d50`, `#5f6b3d`, `#4d7c63`, `#6b7280`, `#8a8f98`) and red/brown collapse
   into mush. Never CVD-checked.
2. **Color is assigned by per-series rank, so it is NOT stable across columns.**
   `index` is the bucket's position *after sorting by total within that estimate*
   (`:130`). "Structural" might be color[0] in Estimate A (where it's largest) and
   color[3] in Estimate B (where it ranks 4th) — **the same category is a different
   color in each column**, which torpedoes the only cross-reference the user has.
   This is a **correctness-level design bug**, not polish.

**Fix:** assign color by a **stable key** (bucket id/label hash), not rank index.
Adopt a CVD-safe categorical palette (Okabe–Ito 8-max, `04`/`08`), cap visible
categories (lean on the existing "Other" collapse at limit 8, `:387`), and put the
**label + value directly on/next to the mark** so color is reinforcement, not the
message.

---

### UX-3 — HIGH — Sub-spec micro-typography: primary data rendered at label/meta sizes

**Principle:** DESIGN.md:355 hierarchy invariant + :354 (10 px = body / controls /
numeric; 8–9 px = labels only).

The violations (data wearing label clothes), not merely "small":

| file:line | class | content | verdict |
|---|---|---|---|
| `CostDonutChart.tsx:306-307` | `text-[9px]`/`text-[8px]` | callout **label + ₱ value + %** | **Worst offender** — these carry the numbers a user reads off the chart; 8 px is below the meta floor and effectively unreadable in a 220 px column |
| `CostDonutChart.tsx:304` | `text-[11px]`/`text-[10px]` | donut center total | underweight for the hero figure |
| `ProjectChartsClient.tsx:287, 310` | `text-[9px]` | toolbar labels **and the segmented button text** | controls must be 10 px (DESIGN.md:354); 9 px tappable buttons fail the floor |
| `ProjectChartsClient.tsx:218` | `text-[10px]` | column total ₱-value | borderline; the column's grand total should be the loudest thing, not a caption |
| `ProjectCostBubbleChart.tsx:84,89` | `fontSize 8–11px`, `fontWeight 700/600` | bubble labels | values squeezed to 8 px; **700/600 weights violate the 400/500-only rule** |
| `ProjectChartBucketTable.tsx:12-13` | `text-[10px]`/`text-[9px]` | table body / header | **correct** — the one component using the scale properly |

**Pattern:** the page systematically renders *values* at the *label* tier,
inverting the hierarchy invariant. The chart's reason to exist — the numbers — is
the smallest type on the page.
**Fix:** callout values → 10 px; donut center total → 12 px/500 (the legit hero
exception); control button text → 10 px; column total → 12 px and visually the
anchor. **Never render a value below 10 px.** Kill the 700/600 weights.

---

### UX-4 — HIGH — No title, no project context, no entry point

**Files:** `ProjectChartsClient.tsx:127-174` — the entire chrome is one `border-b`
strip of toggles + an add button (`px-2 py-0`, `min-h-[38px]`).
**Principle:** Rams #4 *understandable*, #6 *honest*; IA (every analytical surface
needs "what / for which project / compared to what").

No page title, no project name, no "Cost distribution across estimates," no
estimate count, no currency indicator, no timestamp. The user lands inside a
crammed hairline toolbar where "Group By", "View By", and "Add chart" shout at the
same 9–12 px volume; the *implied* primary action (compare) doesn't exist as a
control at all.
**Fix:** a real header band — project name + "Cost comparison" title (12 px/500), a
one-line subtitle naming the estimates + currency compared, controls demoted to a
secondary row. Give the eye a top-left anchor (`04` F-pattern).

---

### UX-5 — HIGH — Layout: 220 px columns asphyxiate a 720 px donut

**Files:** `ProjectChartsClient.tsx:180-183`
`gridTemplateColumns: repeat(N, minmax(220px,1fr))` inside `overflow-auto`
(`:176`); donut viewBox 720×560 (`CostDonutChart.tsx:50-62`), non-compact path
`max-w-[720px]` (`:316`).

At 3 columns the donut renders its **full 720×560 viewBox** (workshop passes no
`compact` prop, `:236`) scaled into a ~220–300 px column → 9 px callout text becomes
~3–4 px effective, connectors collapse, the donut becomes a tiny ring with
illegible confetti. On a 1440 px laptop minus sidebars, three 220 px columns barely
fit; when they don't, `overflow-auto` produces a **horizontal scrollbar inside the
page** — a workshop anti-pattern. No stacking strategy at narrow widths (see `06`
A11Y-14 / WCAG 1.4.10).
**Fix:** comparison-first layout sheds the N-column grid; if columns survive, min
width ≥ 360 px and **stack vertically** beyond the fit budget, never horizontal
scroll. The donut must accept a responsive/compact in-column size.

---

### UX-6 — MEDIUM — Empty / loading / error states are thin, and one is missing

**Files:** `ProjectChartsClient.tsx:261-270` (only empty path), `:169-173`
("Large project mode" helper), `:21-30` + `ProjectCostBubbleChart.tsx:51-57`
(dashed "Loading chart" / "No cost rows"); **no `loading.tsx`** in the route.

- **Empty (`:262`)** fires only when `estimateOptions.length === 0`; copy promises
  comparison ("Create at least two estimates before comparing…") the body never
  delivers, and with exactly 1 estimate shows a lone donut with no guidance.
- **Route loading:** no `loading.tsx` → the server fetch blocks with **zero
  chart-shaped skeleton** (the most-felt gap; `01` PERF-1).
- **Bubble loading (`:21-30`):** a dashed box reading "Loading chart" — text, not a
  shaped skeleton.
- **"Large project mode loads selected comparisons only." (`:170`)** — cryptic
  internal mode surfaced as user copy (UX-9 / `02` DB-6).

**Fix:** add `loading.tsx` matching the comparison layout; a real `< 2 estimates`
state explaining comparison needs two + "Create estimate"; shaped bubble/empty
skeletons; unified copy.

---

### UX-8 — MEDIUM — Motion / micro-interaction is threadbare and one-directional

**Files:** `CostDonutChart.tsx:271` active slice `+4` radius; `:337-338`
`transition-opacity`, non-active → `0.4`; hover/focus only (`:339-340`). Bubble: no
interaction beyond a native `<title>` (`ProjectCostBubbleChart.tsx:82`).

Donut hover dims others — fine, but it's the *only* interaction. **No
cross-highlight to the table** (hovering a slice doesn't light the matching row, or
vice-versa), no click-to-pin, no shared hover across the two estimates. The bubble
has essentially no interaction model. Nothing connects the three surfaces the page
is trying to relate.
**Fix:** one shared `activeBucketId` across chart + table + comparison column;
hover/focus anywhere highlights that bucket *everywhere*; click-to-pin. That single
connective interaction does more for comprehension than any slice animation.

---

### UX-9 — LOW/MEDIUM — Microcopy is terse, inconsistent, occasionally cryptic

**Files:** `ProjectChartsClient.tsx:45-48, 130, 142, 50-53, 163, 170, 265`;
"Unassigned space" (`aggregate:186`), "No supplier"/"Uncategorized"/"Other".

- "Group By"/"View By" — Title-Cased label-noise → lowercase eyebrows, or better
  "Break down by" + "Chart type."
- **"Suppliers"** (plural) beside "Space"/"Category" (singular) in one toggle
  (`:45-47`) — mismatched.
- **"Large project mode loads selected comparisons only."** — cryptic; should be
  guidance: "Showing only the estimates you selected. This project is large, so
  pick estimates to compare."
- **"Add chart"** describes the mechanic, not intent → "Add estimate" / "Compare
  another."
- Empty-cell copy inconsistent ("No cost rows" vs "No cost rows.").

**Fix:** outcome-oriented, consistent voice; align singular/plural; plain-language
large-project explanation; unify punctuation.

---

### UX-10 — MEDIUM — Anti-patterns to avoid in the redesign (AI-slop guardrails)

Things this page does, or a naive redesign would reach for — explicitly do **not**:

- **"Three KPI donuts/gauges in a row."** The current page IS this slop pattern.
- **Rainbow categorical overload** (12 hues, no stable mapping). Cap categories;
  stabilize color; use one accent + neutrals for delta direction
  (success = lower cost, danger = higher, DESIGN.md:343).
- **Decorative motion** (count-up odometers, spinning slices) — keep motion
  functional (cross-highlight), gated on reduced-motion.
- **Tooltip-as-only-data** (the bubble `<title>`). Numbers belong on the surface,
  mobile-safe.
- **Heavy cards / shadows / gradients / >12 px type / 700 weight** — all banned by
  the system; the bubble's `fontWeight={700}` already violates it.
- **Fake precision:** `deltaPercent` is `null` when baseline is 0 (`aggregate:381`)
  — render as "new" / "—", never "∞%".

---

## Current design-quality rating: 22 / 100

**Earned (22):** a coherent token system is respected at the table level; the
aggregation/comparison engine is competently written and complete; the D3
callout-stacking and the dynamic import of the heavy chart show real engineering
care; empty/error scaffolding exists; accessibility has some thought (aria-labels,
`aria-live`, focusable slices).

**Lost (78):** the page **does not perform its core job** — comparison is absent
while the engine for it sits unused (−30; a tool that doesn't do its one task can't
score above the 30s regardless of polish). It compounds that with the **two worst
chart encodings** (−15), a **color scheme that lies across columns** and isn't
CVD-safe (−10), **primary data at 8–9 px** inverting the system's hierarchy
invariant (−8), **no title/IA/entry point** (−6), a **layout that can't display its
own charts at 3 columns** + missing route skeleton (−6), threadbare interaction +
cryptic copy + a 700-weight system violation (−3).

It is **22 because it is a beautifully-tokenized answer to the wrong question.** Fix
the spine (use the engine), swap donut/bubble for position-encoded bars, stabilize
color, and lift values off the 8 px floor, and the same underlying engine supports
an 80+ page. The raw materials are nearly all here — assembled into three pies
instead of one insight. The redesign target is detailed in `08`.

---

## Quality posture

This audit holds the page to its own design system, names exact offending class
strings/file anchors, and distinguishes compact-by-spec from spec-violating. The
second-pass visual QA gates in `13` are required before implementation can claim
the redesigned UI is visually sound.
