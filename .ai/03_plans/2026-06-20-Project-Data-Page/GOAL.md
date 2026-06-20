# Project Data Page — Redesign Goal

**Created:** 2026-06-20
**Owner:** Philip (lead: Claude, ultracode autonomous loop)
**Route:** `/workshop/projects/[projectId]/data` → `ProjectDataClient`

## The problem (owner's words)

> "I am really not satisfied with the UX and UI of the data page. Look at it now —
> can't even read the chart callouts. Maybe there is a better way to display and
> work on this. Don't forget to analyze the cost data too."

## Diagnosis (first-hand code read, R1)

1. **Unreadable callouts (headline bug).** `CostDonutChart` renders a fixed
   **720×560** viewBox with callout labels anchored at the extreme edges
   (`LEFT_LABEL_X=24`, `RIGHT_LABEL_X=696`). In `CostBreakdownSection` that SVG is
   placed in a `minmax(320px,0.95fr)` grid column (~380px wide) via `w-full`, so the
   whole 720px canvas is scaled to ~0.5×. The `text-[11px]` callouts become ~5–6px
   on screen → illegible. The connector leader-lines collide.
2. **Redundancy.** A full breakdown **table** (Label / Amount / Share) sits directly
   beside the donut, carrying every value the callouts try to show. The callouts add
   nothing but clutter. (`hideCallouts` already exists for exactly this case.)
3. **Donut is the wrong primary.** A donut is poor for ranking/reading concentration;
   a ranked horizontal bar ("cost ledger") is more readable and far more on-brand
   ("precise, architectural, understated"; PRODUCT.md bans generic dashboards).
4. **Cost data underused.** The row facts carry `quantity·unitCost`, `miscCost`, and
   `contingency%` — so **direct vs misc vs contingency composition** is computable but
   never shown. Supplier concentration, space hierarchy (tableRows tree), and the
   largest line items are also latent. "Analyze the cost data" = surface these.
5. **Double tables.** "Cost across sheets" shows a stacked-bar chart AND a full data
   table repeating the same numbers.

## Success criteria ("amazing")

- [x] No illegible text anywhere; every label/number readable at desktop + mobile.
- [x] The cost breakdown is scannable in one glance (ranked, largest-first).
- [x] Cost composition (direct / misc / contingency) is surfaced and trustworthy.
- [x] Reads like a precise financial statement, not a generic SaaS dashboard.
- [x] On-brand: SF Pro ≤12px, 3px radius, neutral chrome, CVD-safe chart hues only.
- [x] WCAG AA contrast; keyboard + screen-reader parity (table is the a11y surface).
- [x] project-data vitest suites green (updated deliberately where structure changes).
- [x] Verified with real desktop + mobile screenshots of `/data`.

## Loop

research → plan → implement → verify(tests+screenshots) → critique → repeat until amazing.
See `research.md`, `plan.md`, `LOOP_LEDGER.md`.
