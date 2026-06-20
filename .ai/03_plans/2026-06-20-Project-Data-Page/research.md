# Research — Project Data Page (R1)

Method: a background **workflow** (`data-page-research`) fanned out 6 agents — three
route-compared design directions (A/B/C), a cost-data opportunity analyst, and a
prior-art researcher — then an xhigh judge scored and synthesized one spec. Raw
output: `research-raw-wf1.json`.

## Diagnosis (first-hand code read)

The headline bug is structural, not cosmetic. `CostDonutChart` renders a fixed
**720×560** SVG viewBox with callout labels anchored at the extreme edges
(`LEFT_LABEL_X=24`, `RIGHT_LABEL_X=696`). `CostBreakdownSection` drops that SVG into a
`minmax(320px,0.95fr)` grid column (~380px) via `w-full`, so the whole canvas scales
~0.5× and the 11px callouts become ~5–6px → illegible, with colliding leader lines. A
full breakdown **table** sits beside it carrying every value the callouts try to show —
the callouts are pure redundancy. (`hideCallouts` already exists for this case.)

## Prior-art verdict (donut vs bar)

- **Sorted horizontal bars are the correct primary** for part-to-whole + ranking
  (Cleveland–McGill: position-along-aligned-axis is rank-1 perceptual encoding; pie/donut
  angle is rank 3–4). Direct end-of-bar labels remove legend lookup and satisfy WCAG
  1.4.1 (info not by color alone).
- Cap visible segments at **5–6 + "Other"** rollup with drill-down.
- A donut is justified **only** as a single-metric center-number ring — never a
  multi-segment breakdown with callouts.
- **Avoid 100% stacked bars for cross-sheet comparison** (only the leftmost segment reads
  accurately) → cross-sheet should use ranked totals + an insight sentence; demote the
  stacked mix behind a disclosure.

## Cost-data opportunities (the "analyze the cost data" ask)

| # | Opportunity | Cost | Where it lands |
|---|---|---|---|
| 1 | **Concentration / dominance** (top-2 share, # groups carrying 80%) | client math, **zero payload** | Panel A headline metrics |
| 2 | **Revive the dormant variance + insight engine** for cross-sheet | ~free (all series already loaded ≤20 sheets) | Panel D sentence |
| 3 | Per-bucket delta table | low | Panel D disclosure (later) |
| 4 | Avg cost per line (`total/rowCount`) | free | Panel B optional column (held back) |
| 5 | **Direct vs misc vs contingency composition** | needs 3 SEC-1-safe scalar sums on the wire | Panel C (R2) |
| 7 | Supplier exposure / "No supplier" share | reuses #1 primitive in Supplier mode | Panel A in Supplier mode |
| 8 | Coverage / data-quality footnote | fold existing truncation banner | one understated line |

**Payload gap:** the contract deliberately ships only pre-bucketed series (SEC-1 data
minimization; `project-charts-payload-contract.test.ts` bans the substrings `unitCost`,
`quantity`, `miscCost`, `contingencyPercentage`, `sourceSupplierId` on the wire). The
per-row math for composition already exists in `calculateProjectChartRowTotal` (computes
all three terms then discards the split) — so Panel C only needs **three aggregated
scalars per series** named `direct`/`misc`/`contingency` (sums, not raw rows): SEC-1-safe.

## Judge scores

| Direction | Read | Brand | Feas | Data | Total |
|---|---|---|---|---|---|
| A — Cost ledger / Pareto | 5 | 5 | 5 | 3 | 18 |
| B — Cost anatomy / composition-first | 5 | 5 | 3 | 5 | 18 |
| **C — Insight-led / analyst (WINNER)** | 5 | 5 | 4 | 5 | **19** |

**Winner: Direction C**, grafting A's ranked **ledger-IS-the-table** + Total footer +
"Other (n)", B's contingency-as-risk framing, and the concentration/variance/​supplier
data opportunities. See `plan.md` for the implementation.

## Key feasibility facts (verified in code)

- `buildProjectChartComparisonView({estimates, seriesByEstimateId, groupingMode, estimateIds})`
  → `.insight` → `buildInsightSentence()` are production-ready (`project-comparison-view.ts`,
  `build-insight-sentence.ts`).
- `ProjectDataEstimateSheet` is shape-compatible with `ProjectChartEstimateOption`.
- For ≤20-sheet projects `getProjectChartsData` loads **all** sheets' series, so the
  cross-sheet pair is already in `summary.seriesByEstimateId` → Panel D is zero-repo-change.
- `CostDonutChart` is shared by the share page + legacy charts client → keep its API
  stable; only ever use it in `hideCallouts` mode here.
