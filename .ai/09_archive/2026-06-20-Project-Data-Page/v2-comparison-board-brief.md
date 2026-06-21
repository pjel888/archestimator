# Project Data Page — v2 reframe: comparison-first board

**Created:** 2026-06-20 (ultracode loop, lead: Claude)
**Supersedes the emphasis of:** `plan.md` (Direction C "analyst worksheet")

## Why v2 (owner's new framing)

> "The main feature of that page is for users to see, side by side, 2–3 data
> visualizations of each estimate sheet… 1 display of 1 sheet, and if a user wants
> to compare, they can bring another sheet to view and analyze both on the same
> screen. Organized by suppliers, categories, etc. I feel like it has so many
> elements that it ends up confusing."

The R1/R2 redesign fixed the unreadable-callouts bug and built a strong **single-sheet**
worksheet — but it **demoted comparison to a bottom panel** ("Cost across sheets", behind a
disclosure, using 100%-stacked bars the research itself flagged as a weak comparison
encoding). The owner wants the inverse: **comparison is the primary job of this page.**

The "too many elements / confusing" complaint is structural: the current page stacks **four
different visual languages** on one screen — KPI figure-row + concentration sentence (Panel A),
ledger + donut (Panel B), Direct/Misc/Contingency composition strip (Panel C), and
cross-sheet stacked bars + a second data table (Panel D). Four grammars, one screen.

## The fix in one line

Collapse to **one repeatable per-sheet vocabulary** and make "compare" = **"add a sheet column."**
1 sheet = 1 column (clean single-sheet read). 2–3 sheets = 2–3 columns, same grammar, side by side.

## Key feasibility (from first-hand code read; recon agent verifying edges)

- `buildProjectChartComparisonView` (`project-comparison-view.ts`) **already supports up to 3
  estimates** — `perEstimateTotals`, `perEstimateShares`, baseline-relative `delta`/`deltaPercent`,
  and a `buildInsightSentence` narration. It is described as the "frozen" view-model and is
  **currently unused on this page.** This is the backbone.
- `CostAcrossSheetsSection` already reads **every** sheet's series from `summary.seriesByEstimateId`
  → for ≤20-sheet projects, all sheets' pre-aggregated buckets are **already on the client**. A
  side-by-side board is therefore **near-zero repo change** for the common case.
- SEC-1 data-minimization holds: everything is pre-bucketed; no per-row facts cross the wire.
- Old `left`/`right` query params are vestigial (the client deletes them) — there *was* a
  2-sheet comparison concept that got abandoned. v2 revives it generalized to ≤3 sheets.

## Visual thesis

A **cost comparison board** that reads like a precise financial statement laid in columns: a
calm grey canvas, white floating panel, SF Pro ≤12px, CVD-safe hues on chart marks only. One
control bar; 1–3 sheet columns that share one grammar; the breakdown bars are the data table.
Quiet, architectural, analyst-grade — never a generic dashboard.

## Content plan (top → bottom)

1. **Control bar (one, calm):** Group-by segmented control (Category | Supplier | Space) applying
   to *all* columns · sheet chips for the 1–3 sheets on the board (first = baseline, each
   removable) · "+ Add sheet to compare" (disabled at 3 / when only one sheet exists) ·
   currency/mixed-currency guard · partial-coverage note when truncated.
2. **Sheet column heads (1–3):** sheet name · total (hero number) · for comparands, a baseline
   delta chip (e.g. "−₱340k · −8.1% vs Base Bid", semantic colour + sign, never colour-alone) ·
   a small label-free donut **ring** (part-to-whole identity) · optional quiet
   Direct/Misc/Contingency micro-strip.
3. **One aligned breakdown** = rows are categories/suppliers/areas (union across the sheets,
   sorted by baseline), each sheet a sub-column of {aligned proportional bar on a **shared
   scale**, amount, share}, plus a Δ column vs baseline. This single element **is** both the
   visualization (bars = position encoding, Cleveland–McGill rank-1) and the a11y data table.
   "Other (n)" pinned last; cumulative-80% rule; Total footer.

When only one sheet is on the board, columns 2–3 and the Δ column are absent and this is simply a
clean single-sheet ledger + ring — the strong R1 read, minus the panel sprawl.

## Interaction plan

- **Hovering a breakdown row** highlights that category across **every** column + every donut
  (the shared `activeBucketId` already does cross-highlight — reuse it).
- **Add/remove sheet** updates a `compare=` URL param list (generalize route-state from
  `sheet`/`left`/`right` to baseline `sheet=` + `compare=a,b`); server already ships all series.
- Motion: 150–250ms state transitions only (bar width, active tint). No page-load choreography.

## The open question for Philip (the one he raised: "what's the best way to compare?")

Three genuinely different comparison mechanics — to be put to Philip with ASCII previews once
recon lands. Recommendation: **shared-scale aligned bars + per-sheet ring** (strongest, on-brand),
over independent donut-per-sheet cards, over dumbbell/slope. He decides; whatever he picks,
build immediately.

## Guardrails (carry over from plan.md)

- Tailwind v4: dynamic bar/swatch colour via inline `style`, never `bg-[var(--x)]`.
- `secondary` (#5D5D5D) for load-bearing meta; never `tertiary` (#7F7F7F).
- `CostDonutChart` API stays stable (shared by share page); only ever `hideCallouts` here.
- Reuse `SegmentedControl`/`DropdownSelect`/`EmptyState`/`Banner`/`Button` — no one-off controls.
- Preserve real a11y contract (role=img names, table ids + aria-describedby, headings); update
  only the invariants genuinely tied to the old 4-panel layout, deliberately, with the tests.
