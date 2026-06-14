# Design Directions & Decision

**Date:** 2026-06-14
**Method:** 3 route-compared directions generated independently, scored by a judge panel, then stress-tested by two adversarial critics (a data-feasibility skeptic and a minimalism / anti-AI-slop critic). The critics **disagreed on the winner** — that disagreement is the most useful output, and the chosen design resolves both of their blockers.

---

## 1. The three directions

| # | Direction | One-liner |
|---|-----------|-----------|
| D1 | **KPI-First Minimal** | A tight row of stat cards over one compact cost-mix donut and a lean activity list. Least ink, most reuse. |
| D2 | **Primary-Estimate Hero** | The latest estimate *is* the dashboard — its total + donut + composition dominate; other estimates are a roster; activity is a slim rail. |
| D3 | **Cost + Activity Split** | Two columns: cost (2/3) on the left, a permanent recent-activity lane (1/3) on the right. |

---

## 2. Scorecard (judge panel, 1–10 per axis)

| Direction | Information value | Minimalism | Feasibility | Reuse | **Total** |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **D1 KPI-First Minimal** | 8 | 10 | 9 | 9 | **36** |
| D2 Primary-Estimate Hero | 9 | 6 | 6 | 9 | 30 |
| D3 Cost + Activity Split | 8 | 7 | 6 | 8 | 29 |

**Judge's pick:** D1, on minimalism (10) and feasibility (9) — the two axes that matter most for a project *entry* route where Compare and Estimates already own depth. D1 sequences risk correctly: the cost zones use only data that exists; the expensive, not-yet-instrumented activity work is gated behind a flag.

---

## 3. The adversarial disagreement (why the raw winner isn't the final design)

The two critics split — and each landed a **blocker** that the naïve winner fails:

### Feasibility skeptic → favoured D1's *honesty*, but killed a shared assumption
- **BLOCKER:** the `estimateCostSeries()` "thin wrapper over `getProjectChartsData`" that D2/D3 assumed **does not work** — in `all-estimates` mode (≤20 estimates) that repo loads rows+nodes for *every* estimate and ignores the selection. → A **dedicated single-estimate query** is required.
- **BLOCKER:** project activity is real backend work in *every* direction (no `project_id` on `estimate_sheet_events`, no project-activity RPC, no `composeCollaborationActivity`). → Flag it; ship cost-first.
- **MAJOR:** the "latest estimate" headline is an `updated_at`-inferred heuristic with no `is_primary` flag — editing an old estimate silently re-promotes it. → Label honestly.
- **MAJOR:** mixed-currency rollup is unsafe. → Single-currency guard.

### Minimalism critic → favoured **D2's hierarchy**, and rejected D1's layout as slop
- **BLOCKER:** D1's **four equal-weight `FinancialTotalCard`s defeat the single-most-important-number mandate.** Because `FinancialTotalCard` renders label *and* value at 12px/500, a 4-up grid makes "Currency: PHP" as loud as "₱12,480,000". This is exactly the generic-SaaS stat-grid the brief warns against.
- **BLOCKER:** D1 **omits the chart data table** (it specified "legend via callouts"), violating DESIGN.md's hard `aria-describedby` rule (lines 387-390) and WCAG 1.4.4/1.4.10.
- **MAJOR:** two of D1's four cards (Currency, Last-updated) are **vanity/redundant ink**.
- **MAJOR:** D3's permanent 38% activity lane over-weights the most expensive, least-vital, not-yet-built widget.

**Reading the split:** the feasibility critic is right that D1's *risk-sequencing* is the correct skeleton; the minimalism critic is right that D1's *KPI presentation* is slop and D2's *hierarchy* is the correct treatment. The winning design is therefore **D1's skeleton with D2's hierarchy**, both blockers fixed.

---

## 4. Chosen design — "Honest Hero"

**D1 risk-sequencing (cost-first, activity flagged) + D2 single-hero hierarchy + every adversarial blocker resolved.**

### Layout (main `<main>` area only — left 274px `aside` untouched)

```
main : single vertical scroll · p-lg(20) · gap-lg(20) · bg-white · NO centered max-width
┌───────────────────────────────────────────────────────────────────────────┐
│ ZONE A — HEADLINE STRIP                                                      │
│ ┌─────────────────────────────────┐                                         │
│ │ ₱12,480,000        [4% over ▲]  │   4 estimates · updated 2 days ago      │
│ │ HEADLINE COST                   │   ← quiet meta line, app-label 9px      │
│ │ Most recently updated · Tower B │     (NO Currency tile, NO Updated tile)  │
│ └─────────────────────────────────┘                                         │
│   ONE primary (dark) FinancialTotalCard.  Variance pill = semantic colour    │
│   + sign/arrow. Anchor labelled honestly ("Most recently updated").          │
├───────────────────────────────────────────────────────────────────────────┤
│ ZONE B — COST MIX                          [ Space | Category | Supplier ]   │
│ Cost mix · Tower B – Rev 4   (SectionHeading 11px/500)                       │
│ ┌──────────────────┐   ┌─────────────────────────────────────────────┐     │
│ │      donut        │   │ ▩ Concrete      ₱4.1M    33%                 │     │
│ │  centre = total   │   │ ▩ Steel         ₱3.0M    24%                 │     │
│ │  ≤5 segments+Other│   │ ▩ Finishes      ₱2.2M    18%   ← BreakdownTable
│ │                   │   │ ▩ MEP           ₱1.9M    15%     = aria-describedby
│ │                   │   │ ▩ Other         ₱1.3M    10%     data table       │
│ └──────────────────┘   └─────────────────────────────────────────────┘     │
│  Default grouping = Category (cheapest path; Space walks the node tree).     │
├───────────────────────────────────────────────────────────────────────────┤
│ ZONE C — OTHER ESTIMATES                                                     │
│ Estimates (SectionHeading)                                                   │
│ Tower B – Rev 3   ₱11.9M           [open →] [compare ⇄]                      │
│ Tower B – Concept ₱9.4M  [over]    [open →] [compare ⇄]                      │
│ … ≤6 rows …                                          View all 9 estimates → │
│  Lean read-only list — NOT the 8-column estimates table. Reuses its          │
│  peso/variance formatters only. compare ⇄ deep-links Compare pre-selected.   │
├───────────────────────────────────────────────────────────────────────────┤
│ ZONE D — RECENT ACTIVITY        (feature-flagged; full-width, slim)          │
│ Recent activity (SectionHeading)                                            │
│ Philip · updated Materials in Tower B – Rev 4 · 2h ago                       │
│ Sarah · approved Tower B – Rev 3 · Yesterday                                 │
│ … ≤8 rows, day-grouped, no cursor pagination v1 …          View all → /log  │
│  Flag OFF or empty → single muted line "No recent activity".                 │
└───────────────────────────────────────────────────────────────────────────┘

EMPTY PROJECT (0 estimates) → render the EXISTING EmptyState unchanged
(current copy + 3 links). Zones B/C/D collapse. The page only adds weight
when there is something worth showing.
```

### How each blocker is resolved

| Blocker (critic) | Resolution in "Honest Hero" |
|------------------|------------------------------|
| 4-up grid = slop (minimalism) | **One** primary dark `FinancialTotalCard` for headline cost; everything else demoted to a 9px meta line. No equal-weight grid. |
| Missing chart data table (minimalism) | `BreakdownTable` (swatch · label · ₱ · share) **always** rendered beside the donut and wired as its `aria-describedby`. |
| Vanity Currency / Last-updated tiles (minimalism) | Deleted. `₱` glyph carries currency; freshness lives in the meta line / hero subtitle. |
| `getProjectChartsData` mis-reuse (feasibility) | **New dedicated single-estimate query** → `buildEstimateSeries`. Not a wrapper. |
| Activity is unbuilt (feasibility) | Zone D **feature-flagged**, JOIN-based `LIMIT 8`, no cursor v1; ships after cost. |
| `is_primary` heuristic (feasibility) | Anchor labelled "**Most recently updated · {name}**" — never "Primary". |
| Mixed-currency sum (feasibility) | Cross-estimate rollup only when all share a currency; else "mixed currencies" caption. Default model is headline-estimate-only (sidesteps it). |
| Permanent 38% activity lane (minimalism) | Activity is a slim full-width strip, not a fixed third of the canvas. |

### Minimalism guarantees
- **One scroll region** in `<main>` (avoids D2's three-scroller fatigue).
- **One chart, one lean list, one quiet activity strip** — no composition bars, no variance spine, no 8-column table duplicated from `/estimates`.
- Donut colours/formatters **identical to Compare** (same `colorForBucket`) — a category that's blue here is blue there.
- 8–12px type, 3px radius, hairline borders, spacing tokens, flat white — reads as the same product as the estimate grid, not a marketing surface.

### Grafts carried from the runners-up (judge)
- From **D2**: per-row open/compare deep-links on the estimate list; the breakdown legend-table doubling as the aria data table; budget variance foregrounded in the hero subtitle (reusing `ProjectTotalHeader` health logic).
- From **D3**: the graceful activity fallback contract (flag-gated / "No recent activity") so the page is shippable cost-first; the optional single-currency rollup tile.

---

## 5. Why not just ship D2 (the minimalism critic's pick)?

D2 is the best *information design* but over-commits v1 engineering: a permanent activity rail with full cursor pagination + focus-refresh + aria-live is the heaviest ask for the least-vital, not-yet-instrumented widget. "Honest Hero" keeps D2's hero hierarchy and breakdown table while adopting D1's flag-gated, cost-first sequencing — best of both, with the lowest risk of a "Recent activity coming soon" placeholder occupying real estate on launch day.
