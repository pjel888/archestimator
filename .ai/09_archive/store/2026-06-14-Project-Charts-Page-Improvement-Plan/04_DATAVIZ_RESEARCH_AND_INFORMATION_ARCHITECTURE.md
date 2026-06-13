# 04 — Data-Viz Best Practice Research & Information Architecture

Evidence-grounded research backing the redesign. The page's job: help an
estimator/PM **compare 2–3 cost estimates** for one project and understand cost
**structure** (by area / category / supplier) and **variance** between estimates
(which is cheaper, and *why*). Every recommendation carries a citation and an
"apply to archestimator" note.

---

## 1. Chart selection

### The perceptual foundation (the tiebreaker for every chart choice)

Cleveland & McGill ranked how accurately humans decode quantitative values,
best→worst: **(1) position on a common scale → (2) position on non-aligned scales
→ (3) length / direction / angle / slope → (4) area → (5) volume / curvature →
(6) color saturation / shading.** Rule: *"employ elementary tasks as high in the
ordering as possible."*
- Cleveland & McGill, "Graphical Perception," *JASA* 79(387), 1984 — https://www.math.pku.edu.cn/teachers/xirb/Courses/biostatistics/Biostatistics2016/GraphicalPerception_Jasa1984.pdf
- **Apply:** make this the explicit tiebreaker. Encode the numbers estimators read
  precisely (totals, deltas) as **bar length / position on a shared axis** — never
  pie angle, bubble area, or color intensity. (Directly indicts the current donut
  + bubble — `03` UX-2.)

### Part-to-whole across 2–3 estimates → grouped/stacked bars or dot plots, NOT side-by-side donuts

The pie/donut's only strength is signaling part-to-whole, but humans compare slices
poorly, and it degrades sharply across multiple pies. Few calls the pie "by far the
least effective" quantitative graph.
- Few, "Save the Pies for Dessert," Perceptual Edge — https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf
- **Apply:** for "compare 2–3 estimates by category/area/supplier," use a **grouped
  horizontal bar** (one bar per estimate within each category) or a **dot plot**.
  Reserve **100%-stacked bars** for one estimate's internal composition.

### When a single donut is justified — one chart, ≤ 5 slices

Acceptable only for a *single* part-to-whole snapshot with few, well-separated
slices; readability ceiling ~3–5 slices with the tail in "Other."
- Domo, "What Is a Donut Chart?" — https://www.domo.com/learn/charts/donut-charts
- **Apply:** permit a single donut only for "this one estimate's split" with ≤ 5
  buckets. The instant you compare two estimates or exceed 5 buckets, switch to
  bars.

### Delta / variance between two estimates → waterfall (headline), diverging bar, dumbbell

- **Waterfall / bridge — IBCS (strongest variance authority):** purpose-built to
  analyze the structural root causes of the difference between two statuses;
  absolute variances as bars sorted by magnitude, **red = unfavorable /
  green = favorable**, +/− signs. — https://www.ibcs.com/resource/chart-template-06/
- **Diverging bar:** best for over/under a single baseline; bars left/right of a
  center line, sorted. — https://insightsoftware.com/encyclopedia/diverging-bar-chart/
- **Dumbbell / dot plot:** best when you want both endpoint values *and* the gap
  per category. — https://www.storytellingwithdata.com/blog/2017/10/13/novel-vs-the-boring-old-bar-chart
- **Apply:** make a **waterfall/bridge** the headline "Estimate A → Estimate B"
  view (start = A total, one ±bar per bucket variance, end = B total, IBCS
  red/green). Offer a sorted **diverging bar** for per-bucket over/under, and a
  **dumbbell** for both actuals + gap. Skip slope charts — no time dimension here.

### Biggest cost drivers → ranked horizontal bars / Pareto

A **Pareto** (descending sorted bars + cumulative-% line) surfaces the "vital few"
drivers; a sorted horizontal bar is the simpler form. Horizontal keeps long
supplier/category labels readable.
- Spotfire, "Pareto Chart" — https://www.spotfire.com/glossary/what-is-a-pareto-chart
- **Apply:** for "what drives this estimate," show a **Pareto** so estimators see
  the top 3 trades carrying ~80% of cost.

### Why bubble / circle-packing is a poor analytical choice

Encodes value as **area** — fourth-tier on Cleveland & McGill — so readers
systematically misjudge magnitudes; circle-pack position is meaningless.
- UC Berkeley Library, "Choosing a Chart Type" — https://guides.lib.berkeley.edu/data-visualization/type
- **Apply:** never use bubble/circle-packing for cost magnitude. A ₱1.2M bucket
  looks deceptively close to ₱0.6M. **Delete it** (`03` UX-2).

---

## 2. Dashboard / analytics layout patterns

### Most-important content top-left; size = importance; "summary → primary viz → detail"

Few: most important info in the **upper-left** ("the most expensive real estate");
least important lower-right. Tableau Blueprint: most important content top/left,
users move right and down for specifics; KPIs/summary visuals should be **larger**.
- Few, "Formatting and Layout Matter" — https://www.perceptualedge.com/articles/Whitepapers/Formatting_and_Layout_Matter.pdf
- Tableau Blueprint, "Visual Best Practices" — https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm
- **Apply:** anchor the top-left with the comparison verdict + a KPI strip (total
  per estimate, delta, % variance), physically larger than everything else; push
  breakdown chart + detail table down/right.

### KPI cards: number + comparison + trend, never a bare figure

- Tableau, "What Is a KPI Dashboard?" — https://www.tableau.com/kpi/what-is-kpi-dashboard
- **Apply:** each estimate's total is a KPI card with a variance arrow vs the
  baseline estimate + a mini bar — not a bare number.

### F-pattern: why top-left wins

NN/g eye-tracking: horizontal sweep across the top, shorter sweep lower, vertical
scan down the left; first words on the left get the most fixations.
- NN/g, "F-Shaped Pattern of Reading" — https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- **Apply:** the single decision-relevant fact ("Estimate B is 12% higher") sits
  top-left where first fixations land; estimate labels run down the left.

### Canonical three-band structure

Filters/controls top → KPI summary row → primary variance viz → supporting detail
table.
- Tableau Blueprint (above); DataCamp, "Effective Dashboard Design" — https://www.datacamp.com/tutorial/dashboard-design-tutorial
- **Apply:** adopt this exact band order (`08`).

---

## 3. Insight-first / narrative analytics

### Surface the plain-language answer above the chart

The market tools auto-write the takeaway: Tableau Data Stories, Tableau Explain
Data (careful "correlation is not causation" framing), Power BI Smart Narratives.
- Tableau, "Natural Language Data Stories" — https://www.tableau.com/blog/tableau-natural-language-data-stories
- Microsoft Learn, "Smart Narrative" — https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-smart-narrative
- **Apply:** auto-generate a sentence above the breakdown: *"Estimate B is 12%
  higher than Estimate A, driven by +₱2.4M in Structural and +₱0.6M in MEP."* On
  clicking a variance bar, surface the line-items behind the delta, labeled
  **"largest contributors to the difference,"** not "causes." Generate from the
  same data powering the charts (single source of truth); let PMs pin it into
  exported proposals.

### Declarative takeaway titles, not descriptive labels

Knaflic: state the "so what?"; convert descriptive titles to takeaway titles;
declutter (remove gridlines/borders); one accent color flags the higher estimate,
gray the rest; label bars directly.
- Storytelling with Data, "so what?" — https://www.storytellingwithdata.com/blog/2017/3/22/so-what
- **Apply:** every chart/table title is the takeaway — "**Structural drives 68% of
  the variance**", not "Cost by Division."

---

## 4. Accessible data-viz

### Colorblind-safe categorical palette — Okabe–Ito 8-color (exact hex)

| Name | Hex |
|------|-----|
| Black | `#000000` |
| Orange | `#E69F00` |
| Sky Blue | `#56B4E9` |
| Bluish Green | `#009E73` |
| Yellow | `#F0E442` |
| Blue | `#0072B2` |
| Vermillion | `#D55E00` |
| Reddish Purple | `#CC79A7` |

- Okabe & Ito, "Color Universal Design" — https://jfly.uni-koeln.de/color/
- Wong, "Points of view: Color blindness," *Nature Methods* 8, 441 (2011) — https://www.nature.com/articles/nmeth.1618
- **Apply:** hardcode these as the categorical token set; reserve black for
  text/axes → 7 distinct safe series colors. For > 7 categories, fold the tail into
  "Other" (the existing collapse, `aggregate:387`). Alternative: ColorBrewer
  **Dark2 / Set2** (colorblind-safe filter) — https://colorbrewer2.org/

### Minimum font sizes — 12 px floor for chart labels, 14 px default

WCAG sets no absolute pixel minimum (it governs contrast + resize, SC 1.4.4), but
dataviz guidance gives a floor: "everything below 12px will likely be too small."
- Datawrapper, "Which fonts to use for charts and tables" — https://www.datawrapper.de/blog/fonts-for-data-visualization
- WCAG 2.1 SC 1.4.4 Resize Text — https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html
- **Apply tension note:** archestimator's DESIGN.md deliberately runs a compact
  10 px control/data scale (which conflicts with the 12 px viz floor). The
  resolution adopted (`06` A11Y-1, `08`, `10` D-7): a **DESIGN.md data-viz
  amendment** setting an **11 px minimum for chart `<text>`** (SVG text does not
  reflow on zoom) and **10 px floor for HTML controls/values**, and designating the
  **data table as the zoom-safe text alternative**. We don't blindly import 12 px;
  we reconcile the two systems explicitly.

### Redundant encoding — never color alone (WCAG 1.4.1)

- https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html
- **Apply:** distinguish series by more than hue — direct text labels, marker
  shapes, and/or sign + bar direction for deltas.

### Direct labeling vs legends

- Datawrapper, "10 ways to use fewer colors" — https://www.datawrapper.de/blog/10-ways-to-use-fewer-colors-in-your-data-visualizations
- **Apply:** direct-label series ends and the largest bars/segments with name +
  value; drop the standalone desktop legend (collapsed key on mobile). A direct
  label *is also* the color-independent redundant encoding.

---

## 5. Interaction patterns

### Shneiderman's mantra

*"Overview first, zoom and filter, then details-on-demand."*
- Shneiderman, "The Eyes Have It," 1996 — https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf
- **Apply:** land on an overview (all estimates at category level); expose
  filter/zoom (by estimate, area, supplier); reserve line-item granularity for an
  on-demand detail view.

### Brushing & linking + drill-down; keyboard-accessible tooltips (not hover-only)

Selecting in one view highlights corresponding rows in the linked table/charts;
drill area → group → item. Detail-on-interaction must meet WCAG 1.4.13 (Content on
Hover or Focus): **Dismissible, Hoverable, Persistent**, and keyboard-reachable.
- WCAG 2.1 SC 1.4.13 — https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html
- **Apply:** wire chart selection ↔ breakdown table (`03` UX-8); area→group→item
  drill-down; every tooltip Tab/arrow-reachable, Esc-dismissible, persistent while
  focused.

---

## 6. Micro-interactions & polish

### Animated transitions preserve object constancy

Animating between data states helps users track which mark became which.
- Heer & Robertson, "Animated Transitions in Statistical Data Graphics," IEEE TVCG
  13(6), 2007 — http://vis.stanford.edu/papers/animated-transitions
- **Apply:** short (~300–500 ms) eased transitions on data change; functional, not
  decorative.

### Warn against gratuitous motion (WCAG 2.3.3)

- https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- **Apply:** gate all motion behind `prefers-reduced-motion: reduce` (instant
  updates); no parallax/looping/bouncy motion in an analytical UI (`06` A11Y-15).

---

## Top 10 evidence-based principles for the redesign (ranked)

1. **Encode comparable numbers as bar length/position — never angle, area, or
   color.** The master tiebreaker. (Cleveland & McGill)
2. **Lead with the plain-language verdict, top-left.** Auto-generate "Estimate B is
   12% higher, driven by +₱2.4M in Structural." (Gartner/Tableau/Power BI; NN/g;
   Few)
3. **Make variance the headline via an IBCS waterfall (red=unfavorable,
   green=favorable),** with diverging bar + dumbbell as supporting variance views.
   (IBCS; insightsoftware; SWD)
4. **Kill side-by-side donuts for comparison; use grouped horizontal bars / dot
   plots.** Single donut only for one estimate's split, ≤ 5 slices. (Few; Domo)
5. **Three-band layout: filters → KPI summary → primary viz → detail table;** KPI =
   number + variance arrow + sparkline; size signals importance. (Tableau; Few)
6. **Declarative takeaway titles + declutter + one accent color** for the higher
   estimate. (Knaflic)
7. **Find drivers with a Pareto / sorted bars.** (Spotfire; Juran)
8. **Okabe–Ito palette + redundant encoding** (shape/sign/direct label, never color
   alone). (Okabe & Ito; Wong; WCAG 1.4.1)
9. **Direct-label data; respect the 11–12 px chart-text floor; survive 200% zoom;
   drop the desktop legend.** (Datawrapper; WCAG 1.4.4)
10. **Overview → zoom/filter → details-on-demand with brushing/linking;
    keyboard-accessible dismissible persistent tooltips; ~300–500 ms transitions,
    all behind `prefers-reduced-motion`.** (Shneiderman; WCAG 1.4.13 & 2.3.3; Heer
    & Robertson)

*Sourcing honesty:* the Gartner "data storytelling dominates BI" stat is reported
via TechTarget citing Gartner, not a primary Gartner URL; the Okabe–Ito hex table
has a known original RGB-vs-CMYK nuance but these 8 codes are the de-facto standard
(ggplot2/matplotlib/seaborn). No fabricated citations.

---

## Quality posture

Recommendations are mapped to named authorities and applied to this page, with the
12 px external-viz guidance reconciled against Archestimator's compact type system.
If the citations are kept in the implementation handoff, refresh external source
links before treating them as current.
