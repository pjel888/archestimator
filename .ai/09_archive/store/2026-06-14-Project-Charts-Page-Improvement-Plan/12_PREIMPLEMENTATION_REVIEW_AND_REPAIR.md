# 12 — Preimplementation Review & Repair Gate

Date: 2026-06-14
Scope: `/workshop/projects/[projectId]/charts`
Status: Implementation-ready **after** the P-1 data-contract entry gate (`09`) and
the second-pass repair gates (`13`) are green. This file is the first adversarial
pass; `13` records the follow-up gaps found by deeper codebase inspection.

This pack was built from six independent read-only audit lanes (performance,
database, UX/visual design, data-viz research, infosec, accessibility), each
grounded in the live code with file:line evidence. This review synthesizes their
verdicts, records the BLOCK findings, and defines the entry gate.

---

## Executive verdict

The diagnosis is strong and convergent: **the page renders independent donuts while
the comparison engine that is its entire reason to exist
(`buildProjectChartComparison`, `aggregate-project-charts.ts:69-88`) is dead code.**
All six lanes trace back to that spine. The redesign is therefore lower-risk than it
looks — it mostly *uses code that already exists and is tested-shaped* — but it is
**not safe to execute as a free-for-all**, for the same reason the sibling estimates
plan needed repair: optimizing the UI before freezing the data/color/insight
contracts invites fabricated client-side data and a cross-column color lie that the
redesign is specifically meant to kill.

The required repair is the **P-1 entry gate** in `09`.

---

## Confirmed current-implementation facts (evidence snapshot)

| Fact | Evidence |
|------|----------|
| UI calls only `buildProjectChartSeries` (independent columns) | `ProjectChartsClient.tsx:85` |
| `buildProjectChartComparison` + delta engine referenced by **zero** components | `aggregate-project-charts.ts:69-88, 357-385` (grep: no importers) |
| Color assigned by per-series **rank index** | `aggregate-project-charts.ts:130-132, 412-418` |
| Server ships raw `rowFacts`/`nodeFacts`/`categoryNodeFacts`/`supplierFacts` | `project-charts-repository.ts:112-130` |
| Lookup `Map` rebuilt **per row** in `resolveSpaceBucket`/`resolveCategoryBucket`/`resolveSupplierBucket` | `aggregate-project-charts.ts:169-170, 323-324, 346-347` |
| `chartColumns` memo depends on whole `data` object | `ProjectChartsClient.tsx:97` |
| Donut statically imported; bubble dynamic | `ProjectChartsClient.tsx:16, 18-31` |
| No `charts/loading.tsx` | `ls charts/` → only `page.tsx`, `error.tsx` |
| Primary values at 8–9 px; bubble uses 700/600 weights | `CostDonutChart.tsx:306-307`; `ProjectCostBubbleChart.tsx:84,89` |
| `loadRowFacts` has no `.order()` before `.limit(5001)` | `project-charts-repository.ts:157-161` |
| `is_workspace_member` uses bare `auth.uid()` | core schema `:176` |
| Donut shared with `/share/*` via `compact` prop | `CostDonutChart.tsx:16-25, 314-316` |
| `component_category_nodes` loaded with no workspace filter (global taxonomy) | `project-charts-repository.ts:223-227`; `20260522064018:5-16, 59-60` |
| Seed project volume ~tens of rows | seed migrations (`02` §E) |
| AI Ask reads project chart context | `src/lib/ai/read-context.ts` projectCharts path |
| Component-library actions do not revalidate project charts | `src/lib/component-library/actions.ts:36-39,160-163` |
| Existing UI tests assert old donut/bubble/navigation behavior | `tests/vitest/project-charts-ui.test.tsx`; `tests/vitest/project-dashboard-charts-ui.test.ts` |

---

## BLOCKING findings (must be resolved before P0)

### BLOCK-1 — HIGH — No frozen comparison view-model before UI work
The redesign's spine (insight + variance) must be built from a stable
`ProjectChartComparisonView` derived from `buildProjectChartComparison`, not
assembled ad-hoc in the component. Building the UI first risks recomputing
comparison logic in the view layer and drifting from the engine.
**Repair:** P-1.1 (view-model contract + test) before P0.3.

### BLOCK-2 — HIGH — Color must be stabilized before any chart renders
The current rank-indexed color is a correctness bug the redesign exists to fix
(`03` UX-7). If P0 ships the variance spine on the old color util, the
"same-category-different-color" lie persists into the new design.
**Repair:** P-1.2 (stable `colorForBucket` + CVD-set test) is a prerequisite for
P0.3/P0.5.

### BLOCK-3 — MEDIUM — Server aggregation must be proven equivalent before cutover
The RPC (`02` DB-4) reproduces three non-trivial ancestor-walk semantics (highest
area, highest category, supplier fallback) and the exact row-total formula. Swapping
the read path without a golden-master invites silent total drift — the worst failure
for a cost tool.
**Repair:** P-1.4 (oracle) + P2.2 (prove green before swap), JS path retained until
proven.

### BLOCK-4 — MEDIUM — Bubble deletion and donut demotion touch a shared surface
Deleting the bubble and demoting the donut to a `dynamic` "Share view" must not
regress `/share/[token]` (cross-surface blast radius, memory).
**Repair:** P1.3 guardrail — changes behind the `compact` prop, share tests +
Playwright/visual artifact (`11` scenario 13).

### BLOCK-5 — MEDIUM — Stale tests assert the behavior being removed
Tests asserting independent-donut behavior / the bubble chart will block the
redesign if not inverted up front.
**Repair:** P-1.5 — mark them, capture expected red output, turn green in P0/P1.

### BLOCK-6 — MEDIUM — Stale-test inventory is not specific enough
P-1.5 must name the actual stale assertions, not merely say "invert stale tests."
The known files are `tests/vitest/project-charts-ui.test.tsx`,
`tests/vitest/project-dashboard-charts-ui.test.ts`, and
`tests/vitest/share/cost-donut-chart-hydration.test.tsx`.
**Repair:** P-1.6 — capture exact red output and preserve the share guardrail.

### BLOCK-7 — HIGH — Payload and visual proof need executable artifacts
The previous plan language ("axe clean," "screenshot diff clean," "payload bytes
delta") was too easy to satisfy with prose or temporary logs. Runtime payload and
visual/a11y claims need saved evidence.
**Repair:** P2.4 and P3.8 — HAR/Flight payload artifact, Storybook addon-a11y,
and Playwright screenshots with named evidence paths.

### BLOCK-8 — MEDIUM — Cache freshness and AI Ask consumers were missing
Charts depend on shared category/supplier/library data, and AI Ask already reads
project chart context. A buckets-only RPC cutover that ignores either can produce
stale UI or degraded model context.
**Repair:** P2.8/P2.9 and `10` D-12/D-13 — cache/freshness test plus AI Ask
contract tests.

---

## Added perspectives from this repair pass

1. **Latent-not-live, stated honestly.** The perf cliff is real but the seed
   project is tiny (`02` §E). The plan must not over-claim present-day latency wins;
   the **felt** problem today is the design. Sequencing (P0/P1 before P2) encodes
   this — do not let a "performance-first" instinct reorder it.
2. **One color util, two consumers.** Stable color is used by both the new charts
   *and* (eventually) any export. Build it pure and standalone (P-1.2) so it isn't
   trapped in a component.
3. **The table is the a11y backbone.** Most chart-level a11y failures discharge by
   formally designating the detail table the equivalent alternative (`06`). Don't
   over-engineer SVG a11y when the table already carries the data — associate it and
   relax the SVG to `role="img"`.
4. **DESIGN.md is a gate, not a footnote.** Without the D-7 amendment, the next
   component reintroduces 8 px values. The amendment (P3.1) is a real deliverable.
5. **Coordinate shared fixes.** The `(select auth.uid())` RLS wrap and the
   `/workshop` headers gap are shared with the estimates/library plans — apply once,
   repo-wide (`10` D-9, D-11), not three times.
6. **Deploy must probe the RPC.** Per the add-new-tab lesson (memory), partial schema
   drift should fail open: the repository keeps the JS fallback until the RPC is
   confirmed present.
7. **Second-pass repairs are mandatory.** `13` adds execution gates for exact stale
   tests, runtime payload proof, cache freshness, AI Ask, shared primitives,
   navigation naming, and Storybook visual QA.

---

## Repair completion checklist (the entry gate)

- [ ] P-1.1 `ProjectChartComparisonView` contract exists; test proves it builds from
  `buildProjectChartComparison` and the UI consumes only it.
- [ ] P-1.2 `colorForBucket` is stable across series and CVD-set-conformant (test
  green); rank-indexed color is removed.
- [ ] P-1.3 insight generator covers single/two-driver/no-driver/null-delta (test
  green).
- [ ] P-1.4 golden-master oracle captured for the seed project, all three modes.
- [ ] P-1.5 stale donut/bubble tests inverted with documented expected red output.
- [ ] P-1.6 exact stale-test inventory captured with expected red output.
- [ ] P-1.7 baseline ordering contract documented against actual newest-first repo
  order.
- [ ] P-1.8 provider-free Storybook fixture matrix exists or is explicitly queued.
- [ ] P-1.9 downstream consumer inventory covers AI Ask and share/donut paths.
- [ ] No plan file claims "implementation-ready" until P-1.1–P-1.4 are green,
  P-1.5/P-1.6 red-output is captured, and `13` R-1 through R-8 are represented in
  tasks/evidence.

Until this gate is satisfied, the status everywhere is **"ready after P-1 and the
second-pass repair gates,"** matching `00_INDEX.md` and `README.md`.

---

## Quality posture

This remains an adversarial gate, not a rubber stamp. It now defers final
implementation readiness to both this file and `13`, so the plan cannot skip the
second-pass blockers while still claiming to be ready.
