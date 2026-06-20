# Implementation Plan — Project Data Page

Winner: **Direction C (insight-led analyst worksheet)** + grafts. Calm grey canvas,
white floating panels (rounded-xs/12px, one soft shadow), SF Pro ≤12px, CVD-safe hues
on chart marks only, WCAG AA.

## Page structure (top → bottom)

- **Panel A — Sheet focus + concentration insight** (`ProjectDataInsightHeader`, NEW;
  replaces `ProjectDataKpiHeader`). Row 1: sheet `DropdownSelect` (aria "Estimate sheet")
  + `SegmentedControl` (aria "Group cost by", Category|Supplier|Space). Row 2: one
  auto-generated concentration sentence (ink, ≤12px). Row 3: inline label/value figures
  split by hairlines (NOT a card grid): **Sheet total · Top-2 groups' share · Groups
  carrying 80% · Lines**.
- **Panel B — "Cost breakdown" (`CostBreakdownSection`, CHANGED → ranked ledger).** The
  headline fix. A `CostLedger` (NEW) that **is** the table: each row = swatch · label ·
  proportional inline bar (fill = total/maxTotal, track surfaceMuted, fill = Okabe-Ito
  via inline style) · amount (tabular-nums) · share · Lines. Sorted desc, "Other (n)"
  pinned last, cumulative-80% hairline rule, **Total footer** row. A **compact label-free
  ring** (`CostDonutChart` `hideCallouts`) sits beside it at `xl` as a secondary
  part-to-whole glance (keeps the a11y img↔table contract; callouts never render).
- **Panel C — Cost composition (`CostCompositionSection`, R2 done).** Full-width
  3-segment strip DIRECT / MISC / CONTINGENCY-DISCOUNT + one sentence. Renders only
  when pre-aggregated composition scalars are present; omitted entirely otherwise.
- **Panel D — Across sheets (`CostAcrossSheetsSection`, CHANGED).** Revived variance
  sentence at top (`buildInsightSentence` of the top-two-sheet comparison) + ranked total
  bars; existing stacked mix + full table stays visible as the zoom-safe values table.

## Sequencing (verifiable rounds)

**R1 (this round) — zero payload change, the big readable win:**
1. `build-concentration-sentence.ts` (NEW, pure) + unit tests (single dominant / two
   drivers / equal / zero edge cases).
2. `ProjectDataInsightHeader.tsx` (Panel A).
3. `CostLedger.tsx` + `CostBreakdownSection.tsx` rewrite (Panel B) — kills the donut
   callouts; keeps a compact `hideCallouts` ring for the a11y contract.
4. `ProjectDataClient.tsx` — compute concentration metrics + comparison view; wire panels.
5. `CostAcrossSheetsSection.tsx` — variance sentence + disclosure (Panel D).
6. Update tests for the new structure; keep a11y intent (one h1 "Cost breakdown";
   `role=img` "Total estimate" `aria-describedby` `project-data-cost-breakdown-table`;
   table id + columnheaders; "Group cost by"; "Cost across sheets"; legend; ordering copy).
7. Verify: vitest project-data suites + typecheck + desktop/mobile screenshots of /data.

**R2 — cost composition (the deeper "analyze the cost data"):**
1. Add `composition {baseTotal,miscTotal,adjustmentTotal,grandTotal}` scalars to the
   series payload (`types.ts` + `buildEstimateSeries`), with no raw row facts crossing
   the client boundary and no forbidden per-row payload keys.
2. `CostCompositionSection.tsx` (Panel C) + reconciliation/payload test
   (`baseTotal + miscTotal + adjustmentTotal == grandTotal == series.total`) + SEC-1
   payload-shape guard.
3. Mobile polish: hide the proportional-bar ledger column below `sm`; keep label, amount,
   share, and lines visible. Keep the secondary donut desktop-only.
4. (Optional later) Space-mode inline drill: add a separate SEC-1-safe row-preview/drill
   contract before exposing tree/table row detail client-side.
5. Re-verify + visual loop until amazing.

## DOM / test contract (preserve where cheap, update deliberately where structure changes)

- Keep exactly one `h1` = **"Cost breakdown"** (Panel B section heading).
- Keep `combobox` "Estimate sheet" + `group` "Group cost by" (moved into Panel A — update
  the isolated `CostBreakdownSection` test, which previously rendered them).
- Keep the breakdown `<table id="project-data-cost-breakdown-table" aria-label="{name} cost
  groups by {mode}">` with columnheaders; the ledger renders as this semantic table.
- Keep a `role=img` named **"Total estimate"** wired `aria-describedby` to that table (the
  compact ring, desktop visual) → `project-data-a11y` stays green.
- Keep `h2` **"Cost composition"** when selected-series composition is present; it must
  render Direct, Misc, and Contingency / discount values from pre-aggregated totals.
- Panel D keeps `h2` "Cost across sheets", `role=img` "Cost across estimate sheets"
  `aria-describedby` `project-data-across-sheets-table`, legend "Cost group legend", and
  "Sheets are ordered by total cost, highest first."

## Decisions on the judge's open questions

1. Composition payload widening → **YES**, in R2 (owner asked to analyze cost data; SEC-1-safe).
2. Keep a donut? → **Yes, a compact label-free ring** (secondary, xl-only). Fixes the real
   complaint (callouts) without losing the part-to-whole glance or the a11y contract.
3. Category/Supplier drill → **defer**; R1 ships a flat ledger, Space drill in R2.
4. Across-sheets baseline → **largest sheet is baseline** (no selector for now).
5. Avg-cost-per-line column → **held back**; show "Lines" count only to keep the ledger calm.

## Guardrails

- Multi-agent dir: edits are **serialized by the lead** (me); research agents are read-only.
- Tailwind v4: dynamic bar/segment colors via **inline `style`**, never `bg-[var(--x)]`.
- Use `secondary` (#5D5D5D) for load-bearing meta; never `tertiary` (#7F7F7F) for important text.
- `CostDonutChart` API unchanged (shared by share page + legacy charts).
- Run `next build` after editing any `"use server"` actions (not expected here, but watch).
