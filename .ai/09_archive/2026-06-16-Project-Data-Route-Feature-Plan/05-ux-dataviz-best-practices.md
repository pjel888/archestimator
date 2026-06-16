# 05 — UX & Data-Viz Best Practices (External Research)

External, evidence-led research to ground the redesign of the project **"data"
route**. Two surfaces are in scope:

1. **Sheet cost-breakdown donut** — a single estimate sheet's cost split (by
   category / supplier / space) that re-renders when the user picks a different
   sheet.
2. **Cross-sheet cost-tracking chart** — a project-wide view across all estimate
   sheets/versions (the user gestured at "a multi-layered graph chart").

Audience: small architecture / estimating teams (non-expert dataviz consumers).
Every recommendation below carries a cited source URL + publication context. The
current page is being deleted for being "too much"; Section 6 names the specific
anti-patterns to avoid repeating.

> Note on dates: dataviz canon (pie-slice ceilings, Okabe-Ito, slopegraphs) is
> stable and the cited primary sources (Datawrapper Academy, NN/g, WCAG, Okabe &
> Ito 2002 / Wong 2011) remain the current authoritative references as of 2026.

---

## 1. Donut vs pie vs bar for cost breakdown

**The decision rule (slice-count ceiling).** Part-to-whole circular charts
collapse fast as slices multiply, because the eye compares *arc length / angle*
rather than a shared baseline.

- Datawrapper Academy is blunt: **"Pie charts work best if you only have a few
  values — four max."** Beyond that, switch to a stacked or plain bar. They also
  warn pie/donut are "not the best choice if you want readers to compare the size
  of shares" — for that, a bar/column chart wins because of the common baseline.
  — Datawrapper Academy, *What to consider when creating pie charts*
  (https://www.datawrapper.de/academy/what-to-consider-when-creating-a-pie-chart)
- Secondary guidance converges on **2–5 categories** for a donut and **≤6** for a
  pie; "consider a bar chart if you're plotting more than 5 segments, as the arc
  format doesn't scale." — Domo, *What Is a Donut Chart?*
  (https://www.domo.com/learn/charts/donut-charts)

**Implication for cost-by-category with ~5–12 categories.** A raw donut is the
*wrong default* at the top of that range. Construction cost breakdowns routinely
exceed the 4–6 slice budget (concrete, steel, labour, MEP, finishes, prelims,
contingency, fees…). Two viable paths:

- **Donut + "Other" bucket (recommended primary).** Show the top 5–6 cost
  categories as slices, roll the long tail into a single **"Other"** slice, and
  keep the donut. Datawrapper explicitly endorses this: "Consider grouping slices
  together in one bigger slice (e.g. 'others') to clean up the overall look…
  the bigger the slices, the easier they are to read (and the fewer labels you
  need)." Make "Other" expandable into a small table for detail.
  — Datawrapper Academy (URL above).
- **Horizontal bar (recommended whenever precise comparison or >6 real
  categories matters).** If users need to *rank* categories or read exact values,
  a sorted horizontal bar beats the donut outright on the common-baseline
  argument above. Treat bar as the escape hatch the UI offers, not a separate
  page.

**Center label (the hole).** The donut's one genuine advantage over a pie is the
hole: use it. Put the **sheet's total cost** (formatted, e.g. `$1.24M`) plus a
one-line label ("Total estimate") in the center. This makes the donut answer the
first question ("how big is this sheet?") before the user reads a single slice.
This is the standard, intended use of the donut hole. — Domo, *Donut Charts*
(https://www.domo.com/learn/charts/donut-charts).

**Sorting.** Order slices by descending value, largest first, starting at 12
o'clock and proceeding clockwise; "Other" always last regardless of size. This
gives a predictable reading order and makes the dominant cost drivers land in the
most-readable upper-right arc. (General convention reinforced by the
"few, large, easy-to-read slices" principle in the Datawrapper source above.)

**Direct labeling vs legend.** Prefer **direct labels on/around slices** over a
detached legend — a legend forces a back-and-forth color-match that adds
cognitive load. Datawrapper: "Consider labelling smaller pie slices outside of
the chart, since pie charts are hard to label," especially with long labels.
Practical pattern: label each slice with `Category — $value (xx%)` on a leader
line outside the ring; reserve a legend only if space is genuinely too tight.
— Datawrapper Academy (URL above).

> **Recommendation §1:** Donut with the **total in the hole**, **top ~6
> categories + an expandable "Other"**, slices **sorted descending from 12
> o'clock**, **direct/leader-line labels** (not a hunting legend), and a
> **"view as bar / table" affordance** for users who need ranked or exact
> values. If the breakdown routinely has >6 meaningful categories, make the
> **sorted horizontal bar the default** and the donut the toggle.

---

## 2. Selector → chart interaction pattern ("pick a sheet, the donut updates")

**Which control.** This is single-select among a variable, potentially long, list
of estimate sheets — not navigation between app sections. The control choice maps
cleanly to count:

- **Segmented control** — only when there are **2–5 sheets**. Best for a small,
  fixed set of mutually-exclusive options where selection swaps the view
  instantly; "2–5 choices with text labels." Above that it runs out of room.
  — Mobbin, *Segmented Control* (https://mobbin.com/glossary/segmented-control);
  Primer, *Segmented control* (https://primer.style/components/segmented-control/).
- **Dropdown / select (recommended default)** — once there are **>5 sheets**,
  use a dropdown. "If there are more than 5 choices, use another selection
  pattern such as radio inputs or a dropdown." Dropdowns trade visibility for
  space and scale to arbitrary list length, which is right when sheet counts are
  unbounded. — UX Movement, *Why Segmented Buttons Are Better Filters Than
  Dropdowns* (https://uxmovement.com/buttons/why-segmented-buttons-are-better-filters-than-dropdowns/).
- **Tabs — avoid here.** Tabs imply navigating to *different sections/pages*, not
  re-querying the same chart with a new parameter. Mixing them confuses the two
  patterns. "Segment controls change between alternate views of the same data;
  tabs navigate to different sections entirely." — Medium, Errum, *When UI Looks
  Alike* (https://medium.com/@errumaisha/when-ui-looks-alike-understanding-confusion-between-tabs-and-segmented-controls-fbdfa651f9d9).

> **Recommendation §2a:** **Segmented control for ≤5 sheets, dropdown for >5.**
> Since sheet count is unbounded, build the dropdown and only render the
> segmented form as a progressive enhancement at small counts. Do **not** use
> tabs for sheet selection.

**Keeping transitions legible.**

- **Preserve color identity across sheets.** A category (e.g. "Steel") must keep
  the *same color in every sheet* so that switching sheets reads as a change in
  the *quantity*, not a change in the *thing*. Map colors to category identity,
  not to slice index. This is the categorical-consistency principle —
  "consistency of colors, reusing the same type of graph" reduces cognitive load.
  — Storytelling with Data, Ch.3 *Clutter is your enemy*
  (https://www.oreilly.com/library/view/storytelling-with-data/9781119002253/c03.xhtml).
- **Animate the morph, gently.** A short tween of arc angles between sheets helps
  the eye track what grew/shrank, but it must respect motion preferences (see
  §5). Keep it ~200–300ms and skip it entirely under
  `prefers-reduced-motion: reduce`.

**Reflect the selection in the URL.** Store the chosen sheet as a query param
(e.g. `?sheet=<id>`) so the view is shareable, deep-linkable, and survives
reload/back — the same rationale NN/g gives for making system state visible and
linkable. This is a project convention worth honoring; the repo already URL-encodes
comparison state in `src/lib/workshop/compare-href.ts`, so mirror that approach.

> **Recommendation §2b:** Lock category→color mapping across all sheets; tween
> arcs ~250ms (disabled under reduced-motion); persist the selected sheet in the
> URL query string.

---

## 3. Cross-sheet "cost tracking" chart (the "multi-layered graph")

The user's instinct points at a **stacked area** ("layers"). The evidence says
this is the riskiest option for a non-expert and should usually be replaced.

**Why stacked area is a trap here.**

- Only the bottom band has a stable baseline; every band above it floats, so
  readers **cannot judge the true thickness** of mid-stack categories — "only the
  bottom category has a consistent baseline, making it difficult to compare
  individual categories."
- It implies a **continuous axis** (time). Estimate *sheets/versions* are
  usually **discrete, ordinal** items, not a smooth time series — area charts are
  "unsuitable for comparing non-continuous categories, where a bar chart would be
  more appropriate."
- It clutters fast: keep stacked layers to **3–5**; "anything more than that will
  be cluttered and difficult to interpret."
  — Inforiver, *Stacked area charts: when to use and avoid*
  (https://inforiver.com/insights/stacked-area-charts-when-to-use-and-avoid/);
  Luzmo, *Stacked Area Chart: When (Not) to Use It*
  (https://www.luzmo.com/blog/stacked-area-chart).

**The better fits, in priority order for a non-expert:**

1. **Stacked bar — one bar per sheet (recommended primary).** Discrete sheets on
   one axis, cost composition stacked within each bar. "Use a stacked bar chart
   when comparing part-to-whole compositions across discrete categories." This is
   exactly the "category composition per sheet" question, it shares the donut's
   color encoding, and it sidesteps the false-continuity problem of area. Same
   3–5 (max 4–5) segment budget applies; place the most important category at the
   baseline so it's the one users can compare bar-to-bar. — AFFiNE, *When To Use a
   Stacked Bar Chart* (https://affine.pro/blog/when-to-use-a-stacked-bar-chart);
   Domo, *Stacked Bar Charts* (https://www.domo.com/learn/charts/stacked-bar-charts).
2. **Slopegraph — only for "v1 vs v2" two-point comparison.** If the real question
   is "what changed between *two* sheets/versions," a slopegraph makes
   direction and magnitude of change pop. Best when "you compare exactly two
   points per category." Skip it for >2 sheets (label overlap) or for unrelated
   metrics. — Storytelling with Data, *#SWDchallenge: slopegraph*
   (https://www.storytellingwithdata.com/blog/2018/6/1/swdchallenge-slopegraph);
   Domo, *Slope Chart* (https://www.domo.com/learn/charts/slope-chart).
3. **Small multiples — when categories are many.** One small donut/bar per sheet,
   same scale and color across all, laid out in a grid. "When you have too many
   categories… break dense data into readable subsets… side-by-side enables easy
   comparison while maintaining consistent scales." Strong fallback if the
   stacked bar gets crowded. — FlowingData, *Small Multiples*
   (https://flowingdata.com/charttype/small-multiples/);
   Number Analytics, *Mastering Small Multiples*
   (https://www.numberanalytics.com/blog/ultimate-guide-small-multiples-information-design).
4. **Grouped bar — only for a few categories.** Side-by-side bars per category
   across sheets read exact values better than stacks, but blow up with many
   categories × many sheets; reserve for narrow comparisons.

> **Recommendation §3:** Default the cross-sheet view to a **stacked bar (one bar
> per sheet)** capped at ~4–5 cost segments (+"Other"), reusing the donut's
> category colors, total labeled per bar. Offer a **slopegraph** affordance for
> the common "compare two versions" case. **Do not ship a stacked area chart** —
> it's the user's instinct but it misleads non-experts on discrete, ordinal
> sheet data.

---

## 4. Cost/number-heavy dashboard UX

**Layout follows the eye.** NN/g eye-tracking shows an **F-shaped scan**: users
spend ~80% of attention on the upper-left. Put the highest-value summary there.
For repeated elements (a row of KPI cards) "attention is strongest at the first
item and drops off left-to-right" — so **cap KPI/stat headers at ~3–4**, never a
wall of five-plus that users won't register. Recommended band order: **primary
KPIs on top → the chart(s) in the middle → granular table at the bottom** for
those who dig deeper. — NN/g eye-tracking / F-pattern research, summarized in
dashboard-design syntheses (https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/);
*Dashboard Design Best Practices* (https://www.domo.com/learn/article/dashboard-design-examples-best-practices).

**Formatting money.**

- **Round and abbreviate**: show `$4.2M`, not `$4,237,891.23`; "include unit
  labels (K, M, B) so viewers don't count zeros." Keep **decimal places
  consistent** across the dashboard.
- **Maximize data-to-label ratio (BANs)**: the number is big and bold; its label
  is small and quiet beneath it.
- Always state units/currency directly on labels and axes.
  — USEReady, *Visualization Best Practices*
  (https://www.useready.com/blog/visualization-best-practices-part-one);
  MoldStud, *Best Practices for Financial Dashboard Data Visualization*
  (https://moldstud.com/articles/p-creating-an-efficient-data-visualization-strategy-for-financial-dashboards-best-practices-and-tips).

**% + absolute together.** Slice labels and tooltips should show **both** the
absolute figure and its share (`Steel — $312k (24%)`). Percentages alone hide
scale across sheets of different totals; absolutes alone hide composition.

**Empty state (no estimates yet).** NN/g's three rules for empty states in complex
apps: (1) **communicate system status** — say plainly "No estimate sheets yet,"
not a misleading blank; (2) **provide a learning cue** — explain what *would*
appear here ("Your cost breakdown will appear once a sheet has line items");
(3) **provide a direct pathway** — a primary action button ("Create estimate
sheet") that populates the view. — NN/g, *Designing Empty States in Complex
Applications* (https://www.nngroup.com/articles/empty-state-interface-design/).

**Loading skeletons.** For sub-10s loads use a **skeleton that mirrors the final
shape** (a ghost donut + ghost stat cards), not a spinner — "skeleton screens feel
faster than they actually are; spinners feel slower." Every selection (sheet
switch) should give immediate visual acknowledgement. — NN/g, *Skeleton Screens
101* (https://www.nngroup.com/articles/skeleton-screens/).

**Don't overwhelm.** Progressive disclosure / fewer simultaneous elements lowers
cognitive load materially; "the simpler the design, the easier it is to interpret
the numbers." One headline number, one chart, one optional drill-down — not three
competing visualizations on first paint. — Storytelling with Data, Ch.3
(https://www.oreilly.com/library/view/storytelling-with-data/9781119002253/c03.xhtml).

> **Recommendation §4:** ≤4 stat cards top-left (lead with total project /
> selected-sheet cost), one chart mid-page, table on demand below. Money rounded
> + abbreviated + consistent; labels carry **both $ and %**. Ship a shape-matched
> skeleton and an actionable empty state with a "Create sheet" CTA.

---

## 5. Accessibility for charts

**Color-blind-safe categorical palette.** Use a CVD-tested qualitative palette,
not arbitrary brand colors, and cap categories at the palette's safe size. The
**Okabe-Ito ("Wong") palette** is the de-facto standard for categorical
color — designed to stay distinguishable under deuteranopia, protanopia, and
tritanopia, popularized by Wong in *Nature Methods* (2011), and the default in
R 4.0+. The 8 safe hexes:

| Color | Hex |
|---|---|
| Orange | `#E69F00` |
| Sky blue | `#56B4E9` |
| Bluish green | `#009E73` |
| Yellow | `#F0E442` |
| Blue | `#0072B2` |
| Vermillion | `#D55E00` |
| Reddish purple | `#CC79A7` |
| Black/grey | `#000000` / neutral grey |

— Okabe & Ito, *Color Universal Design* (2002) via see/easystats reference
(https://easystats.github.io/see/reference/okabeito_colors.html);
thenode.biologists.com, *Data visualization with flying colors*
(https://thenode.biologists.com/data-visualization-with-flying-colors/research/).
Practical ceiling: keep distinct categorical colors to **≤6–8** and verify with a
CVD simulator (protanopia, deuteranopia, tritanopia) — colorblind-safe categorical
palettes degrade past that. — Galaxy, *Accessible Color Palette Guide*
(https://www.getgalaxy.io/learn/glossary/color-palettes-for-accessible-data-visualization).

**Contrast (WCAG).** Non-text graphical elements (slices, bars, lines) need at
least **3:1** contrast against adjacent colors/background (WCAG 1.4.11
Non-text Contrast); any text label/value needs **4.5:1** (1.4.3, AA). Add thin
white inter-slice strokes so adjacent slices meet 3:1 even when hues are close.
— W3C WCAG 2.2 (https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

**Don't encode by color alone.** WCAG 1.4.1 (Use of Color) requires a second
channel. For charts: **direct text labels on slices/bars/segments** (already
recommended in §1), and optionally pattern/texture fills. "Bar charts with pattern
fills and direct value labels are among the most accessible." — Galaxy (URL above);
W3C WCAG, *Use of Color* (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

**Text alternative / data table behind the chart.** Provide the underlying numbers
as an accessible table (visually or via a "View data" toggle / `<table>` fallback)
so screen-reader users and anyone who needs exact figures aren't locked out of a
canvas/SVG. This doubles as the §1 "view as table" affordance.
— accessibility.jhu.edu, *Accessible Data Visualization*
(https://accessibility.jhu.edu/wp-content/uploads/sites/31/AccessibleDataVisualizationPresentation.pdf).

**Focus / keyboard.** The sheet selector and any "view as bar/table" toggle must
be reachable and operable by keyboard with a visible focus ring; chart segments
that are interactive (tooltips/drill-down) need keyboard equivalents.

**Reduced motion.** Honor `@media (prefers-reduced-motion: reduce)` — disable the
arc-morph tween and any entrance animation for users who set it; this is the
standard mechanism backing WCAG 2.3.3 (Animation from Interactions). "Respect the
preference via the CSS media query — the most user-friendly solution." — Knowbility,
*WCAG 2.1 — 2.3.3 Animations from Interaction*
(https://knowbility.org/blog/2018/wcag21-233animations);
W3C WCAG technique C39 (https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html).

> **Recommendation §5:** Okabe-Ito categorical palette capped at ≤6–8 hues;
> ≥3:1 element / ≥4.5:1 text contrast; never color-only (direct labels + optional
> patterns); a "View data" table behind every chart; keyboard-operable selector
> with visible focus; all motion gated behind `prefers-reduced-motion`.

---

## 6. Anti-patterns to avoid (why the current page felt "too much")

Mapped to the documented failure modes the redesign must not repeat:

- **Too many simultaneous encodings.** "Every element you add takes up cognitive
  load… when elements have no information encoded by them, each adds another
  variable." Variance spines, secondary axes, and stacked depth layered onto one
  view are exactly this. — Storytelling with Data, Ch.3
  (https://www.oreilly.com/library/view/storytelling-with-data/9781119002253/c03.xhtml).
- **Dual comparison tables side-by-side.** Two dense tables force the eye to
  shuttle and diff manually — high clutter, low payoff. Collapse to one chart with
  the selector doing the comparison, plus a single on-demand table.
- **Stacked depth as the headline.** "Stacked bar charts add an extra layer of
  depth but also uncertainty"; stacked *area* compounds it with a floating
  baseline. Keep stacks to ≤4–5 segments and never make a hard-to-read stack the
  primary, first-paint visualization. — Storytelling with Data, Ch.2 summary
  (https://medium.com/swlh/storytelling-with-data-part-2-6f4ec8a13585);
  Inforiver (URL in §3).
- **Pie/donut past its slice budget.** A donut with 10–12 unbucketed slices is
  unreadable arc-soup — the exact failure §1's "Other" bucket and bar fallback
  fix. — Datawrapper (URL in §1).
- **Rainbow / brand-soup color.** "Rainbow colors will distract readers from
  comparing the shares." Use one consistent CVD-safe categorical scale, identical
  across donut + cross-sheet chart. — Datawrapper (URL in §1).
- **A wall of KPI cards.** Five-plus stat tiles where users register only the
  first two. Cap at ~3–4 meaningful numbers. — NN/g F-pattern (URL in §4).
- **Misleading/raw empty + spinner-only loading.** Blank panels and bare spinners
  erode trust; replace with a guided empty state and a shape-matched skeleton.
  — NN/g (URLs in §4).

---

## Design north star

The project data page should answer two questions at a glance and refuse to do
more: **"What does this estimate sheet cost, and where does the money go?"**
(a calm donut with the total in the hole, its top ~6 cost categories plus a
tidy "Other," driven by a single sheet selector that lives in the URL) and
**"How do my sheets/versions compare?"** (one stacked bar per sheet — never a
floating-baseline area chart — reusing the very same CVD-safe, category-locked
colors). Lead with one big honest number, show one confident chart, and keep
exact figures, ranked bars, and the full data table one deliberate click away.
Every color is Okabe-Ito-safe and never the only signal, every label carries
both dollars and percent, motion yields to `prefers-reduced-motion`, and the
empty state teaches rather than stares back. Simplicity here is the feature: the
page earns trust by showing less, accurately.
