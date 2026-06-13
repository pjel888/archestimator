# 10 — Decisions & Open Questions

Resolved design decisions (with rationale) and the few owner calls required — each
with an implementation-unblocking **default** so P-1/P0 can start without waiting.

---

## Resolved decisions

### D-1 — Comparison is the spine; independent donuts are removed as the default
The page's core job is comparison; `buildProjectChartComparison` already computes
it. The default view is variance (dumbbell + Δ), not N independent donuts. (`03`
UX-1, `08`.)

### D-2 — Primary encoding is position/length (bars/dumbbell), not angle/area
Per Cleveland–McGill (`04` §1). Donut demoted to optional single-estimate "Share
view"; **bubble deleted**. (`03` UX-2.)

### D-3 — Baseline = first by current repository order; user-overridable
Deltas need a reference. Current `estimateOptions` are ordered newest-first by
`updated_at desc`, and `getProjectChartDefaultPair` uses the first option as the
left/default baseline. Do **not** describe this as "oldest" unless the repository
query changes and tests prove the new order. Expose a baseline selector either
way. (See Q-1 for the owner semantics question.)

### D-4 — Color is assigned by stable category key, not per-series rank
Fixes the cross-column color lie (`03` UX-7). Palette = Okabe–Ito 8-max + "Other",
capped via the existing `collapseTopBuckets`. (`06` A11Y-6, `08`.)

### D-5 — Aggregation moves server-side (RPC); only buckets cross the wire
One change closes the perf headline (`01` PERF-2), the per-row Map bug, the
hydration cost, and the data-minimization finding (`05` SEC-1). JS path kept until
the golden-master proves the RPC equivalent. (`02` DB-4.)

### D-6 — Sequence by felt-impact: design spine (P0/P1) before perf/DB (P2)
The audited project has tens of rows; today's felt pain is the *design*, not
latency. Fix the visible product first; fix the latent cliff before it bites.
(`02` §E, `09`.)

### D-7 — Amend DESIGN.md with a data-viz / interactive-control type floor
External viz guidance wants 12 px labels; DESIGN.md runs a compact 10 px scale. The
reconciliation: **11 px minimum for SVG chart `<text>`** (it doesn't reflow on
zoom), **10 px floor for HTML controls/values**, and the **data table is the
zoom-safe text alternative**. This is a documented amendment, not a one-off, so the
violations don't regenerate. (`04` §4, `06` A11Y-1.)

### D-8 — Keep the existing limits/`requiresSelectedPair` semantics, but make truncation honest
The RPC removes the row caps for aggregation; any residual guard gets deterministic
ordering + an explicit "totals incomplete" banner rather than a silent/cryptic
mode-switch. (`02` DB-6, `03` UX-6/UX-9.)

### D-9 — RLS `(select auth.uid())` fix is applied repo-wide, once
`is_workspace_member` and its siblings are shared by many policies; coordinate the
one-line wrap with the estimates/library plans so it lands once, not three times.
(`02` DB-3.)

### D-10 — Donut changes must not regress `/share/*`
`CostDonutChart` is shared (cross-surface blast radius, memory). All changes go
behind the existing `compact` prop; the share page's path is screenshot-diffed and
its tests kept green. (`08`, `11`.)

### D-11 — `/workshop` security headers are referenced, not owned by this plan
A cross-cutting gap shared with sibling plans (`05` SEC-2). This plan links it (P4),
doesn't duplicate it.

### D-12 — AI Ask is a downstream contract, not an incidental consumer
`src/lib/ai/read-context.ts` reads project chart context today. The RPC/buckets-only
cutover must keep AI Ask's `projectCharts` context compact, read-only, and useful,
or version the context deliberately. It must not accidentally serialize raw row,
node, category, or supplier facts into model context. (`13` R-4.)

### D-13 — Cache freshness is part of chart correctness
Estimate actions already revalidate `/workshop/projects/${projectId}/charts`, but
shared component-library/category/supplier changes need an explicit chart freshness
strategy. Default: add targeted revalidation or cache-tag invalidation for affected
project chart paths when a mutation can change existing chart labels/totals; prove
with a regression test. (`13` R-3.)

### D-14 — New controls must use shared primitives
The redesigned toolbar should not grow route-local button/chip/dropdown classes.
Default: reuse existing `src/components/ui/*` primitives; if none fits, introduce
one shared primitive (for example `SegmentedControl`) and use it here. (`13` R-5.)

### D-15 — Okabe-Ito is a data-viz-only palette exception
Okabe-Ito includes orange, while DESIGN.md reserves orange for landing surfaces
unless a named exception exists. Default: permit the categorical palette only in
chart marks, legends, and data tables; never in controls, chrome, nav, buttons, or
headers. (`13` R-8.)

### D-16 — Visual/a11y proof uses existing tooling first
The repo has Storybook addon-a11y and Playwright; it does not currently carry
`jest-axe` or `@axe-core/playwright`. Default: use Storybook addon-a11y plus
Playwright screenshot/keyboard evidence unless an implementation PR explicitly
adds a dependency. (`07` I/K, `13` R-6.)

### D-17 — Product navigation follows the reframe
The route may remain `/charts` for compatibility, but user-facing navigation should
say `Cost comparison` or compact `Compare` and use a comparison/bar icon instead
of a pie-chart icon. (`13` R-7.)

---

## Open questions (owner calls — each has a default so work isn't blocked)

### Q-1 — Default baseline semantics: newest, oldest, or "primary/tender"?
Estimates are ordered by `updated_at desc` in the repository (`project-charts-repository.ts:52`).
Is "baseline" best defined as the **oldest** estimate (schematic → tender
narrative), the **newest**, or a user-flagged "primary"?
**Default if no answer:** baseline = first by the existing default-pair logic
(`getProjectChartDefaultPair` left, currently newest-first), user-overridable via
the selector. Revisit if estimators expect a specific schematic→tender direction.

### Q-2 — Variance default form: dumbbell or waterfall?
Both are specced (`08` band 3). The dumbbell reads both actuals + the gap per
bucket; the IBCS waterfall reads the bridge total-to-total.
**Default:** **dumbbell** as the default (answers "which is cheaper per bucket, and
by how much" directly for 2–3 estimates); waterfall available via the View control
(P1.5, may be time-boxed out). Confirm if the owner prefers the bridge as the
headline.

### Q-3 — How many estimates comparable at once?
Current `MAX_CHART_COLUMNS = 3`. The dumbbell/grouped-bar generalizes to 3; the
waterfall is inherently pairwise.
**Default:** keep **max 3** comparands; waterfall always pairwise (baseline vs the
selected comparand). Raise only if there's a real need (legibility degrades past 3).

### Q-4 — Insight sentence: auto-only, or editable/pinnable now?
The auto-generated sentence is in scope (P0.2). Editing it / pinning it into the
proposal export is a richer feature.
**Default:** **auto-only** in this plan; editable/pinnable insight is noted as
future headroom (below). Confirm if proposal-export integration is wanted in this
cycle.

### Q-5 — Drill-down (area → group → item) in scope now?
The Space tree hierarchy is preserved in the detail table, but interactive
drill-down (click a bucket → its line items) is a larger feature.
**Default:** **out of scope** for this plan; the detail table's hierarchy +
`buildSpaceTableRows` cover the static view. Drill-down is named headroom.

---

## Future headroom (explicitly out of scope; tracked so the 85→100 path is known)

- Interactive drill-down: bucket → group → line item, with "largest contributors to
  the difference" on a variance bar (`04` §3).
- Insight sentence editable + pinned into the proposal/spreadsheet export.
- Saved comparison presets (baseline + comparands + grouping) per project.
- The IBCS waterfall as a first-class export artifact.

These are why `08` targets **≥ 85**, not 100, for the in-scope redesign.

---

## Quality posture

The decision log now separates settled implementation defaults from true owner
calls, including second-pass concerns that would otherwise become surprise bugs:
baseline order, AI Ask context, cache freshness, shared primitives, palette scope,
visual/a11y tooling, and route naming.
