# 09 — Implementation Plan

TDD-gated, sequenced by **felt-impact × risk**, each phase independently
revertible. The sequencing principle (from `02` §E): the felt problem today is the
**design**, not the milliseconds — so the design spine ships first (P0/P1), the
perf/DB cliff is fixed before it bites (P2), and a11y hardening + cross-cutting
defense follow (P3/P4). The data-contract entry gate (P-1) and the second-pass
repair gates (`13`) must be represented before P0.

**Workflow:** failing test first → implement → measured/asserted delta (`07`) →
green. Run `gitnexus_impact` on each symbol before editing (CLAUDE.md mandate);
warn on HIGH/CRITICAL. Validate + build + the targeted vitest suites green per
phase; don't run the full DOM suite alongside heavy workflows (flaky 15 s timeouts
— memory). Land via ff-push to origin/main (memory), not local `main` checkout.

Legend: ☐ task · 🔴 felt/correctness · 🟠 scaling/security · 🟡 hardening.

---

## P-1 — Data-contract entry gate (BLOCK before P0)

Freeze the contracts the redesign depends on *before* touching UI, so we don't
fabricate canonical data in the browser or couple the client to raw rows.

- ☐ **P-1.1** Define the **comparison view-model contract**: a
  `ProjectChartComparisonView` (estimates, baseline id, grouping mode, per-bucket
  `{ id, label, color, perEstimateTotals, delta, deltaPercent }`, sorted by
  `abs(delta)`, plus the insight inputs). Shared non-component module. Contract test
  asserts it is buildable purely from `buildProjectChartComparison` output. 🔴
- ☐ **P-1.2** **Stable color utility**: `colorForBucket(bucketId)` deterministic
  from a stable key against the Okabe–Ito palette (≤ 8 + "Other"); pure, unit-tested
  for stability across series and CVD-set membership. Replaces rank-index color
  (`aggregate:412-418`). 🔴 (`03` UX-7 / `06` A11Y-6)
- ☐ **P-1.3** **Insight generator**: pure function `buildInsightSentence(view)` →
  string, covering single-dominant / two-driver / no-clear-driver / `deltaPercent
  null` ("new") cases. Unit-tested against fixtures. (`08` copy template)
- ☐ **P-1.4** **Golden-master oracle** (`07` F): snapshot current
  `buildProjectChartSeries` bucket totals/labels for the seed project, all three
  modes — the equivalence baseline P2's RPC must match. Capture as a committed
  fixture.
- ☐ **P-1.5** **Invert stale tests**: any test asserting the independent-donut
  behavior or the bubble chart is marked/added as the to-be-changed contract, with
  documented expected red output for P0/P1 to turn green.
- ☐ **P-1.6** **Stale-test inventory, exact files**: update the implementation PR
  checklist with the old assertions before editing UI:
  `tests/vitest/project-charts-ui.test.tsx` currently asserts one independent
  donut, no combined `Cost bucket deltas`, bubble switch behavior, and
  focus-restore around remounted controls; `tests/vitest/project-dashboard-charts-ui.test.ts`
  asserts the old `Charts` label/pie icon and D3 assumptions; `tests/vitest/share/cost-donut-chart-hydration.test.tsx`
  protects the `/share` compact donut path and must stay green. (`13` R-1)
- ☐ **P-1.7** **Baseline ordering contract**: decide the default from actual repo
  behavior. Current `estimateOptions` are newest-first (`updated_at desc`), so do
  not call the default "oldest" unless the repository query changes and tests prove
  it. Contract tests assert default baseline id, selector override, and insight
  direction. (`10` D-3/Q-1, `13`)
- ☐ **P-1.8** **Provider-free Storybook fixtures**: create static Project Charts
  story data for empty, single-estimate, two-estimate variance, three-estimate max,
  large/truncated, missing/null-delta, 320 px, 400% zoom, grayscale/CVD, and
  reduced-motion states. These stories are the visual QA harness for P0/P1/P3.
  (`13` R-6)
- ☐ **P-1.9** **Downstream consumer inventory**: record every consumer that reads
  chart data (`ProjectChartsClient`, route loader, AI Ask `projectCharts`, share
  donut tests) and choose whether each uses the new view model, the RPC bucket
  contract, or the retained JS fallback. (`13` R-4)

**Gate:** P-1.1–P-1.4 green, P-1.5/P-1.6 red-output captured, and P-1.7–P-1.9
documented before P0. No file says "implementation-ready" until the `12` and `13`
entry gates are satisfied.

---

## P0 — The design spine (highest felt impact)

Wire the existing engine; make the page *do its job* and read correctly. No DB
change yet — runs on the current client data.

- ☐ **P0.1** Build the **header band**: project name + "Cost comparison" title,
  currency, subtitle naming the compared estimates. 🔴 (`03` UX-4, `08` band 1)
- ☐ **P0.2** Build the **insight panel** from P-1.3 + `buildProjectChartComparison`.
  Test: given two fixture estimates, the rendered sentence names the correct
  cheaper estimate, Δ, Δ%, and top driver. 🔴
- ☐ **P0.3** Build the **variance spine** (dumbbell/connected-dot default) driven by
  the comparison view-model, sorted by `abs(delta)`, success/danger direction +
  directly-labeled Δ/Δ%. Replace the independent-donut grid as the default view. 🔴
  (`08` band 3)
- ☐ **P0.4** Apply the **type scale** (`08`): values ≥ 10 px (HTML) / ≥ 11 px (SVG),
  hero totals 12 px/500, kill 700/600 weights. 🔴 (`03` UX-3)
- ☐ **P0.5** Apply **stable color** (P-1.2) across spine + table. 🔴
- ☐ **P0.6** **Control row**: "Break down by", baseline selector, estimate chips
  ("Add estimate"), View toggle (Variance default). Copy fixes (`03` UX-9). Roving
  keyboard within the segmented group. Use existing shared UI primitives or add one
  shared `SegmentedControl`; do not add route-local button/chip/dropdown primitives.
  Align label baselines, control tops/heights, reserved helper/error rows, and
  dropdown/clear-button inset padding as a single row system. 🟡 (`13` R-5)
- ☐ **P0.7** **`charts/loading.tsx`** matching the redesigned shape (`01` PERF-1).
- ☐ **P0.8** Real **empty/low states**: `< 2 estimates` → "Add a second estimate to
  compare" + [Create estimate]; truncation banner stub for P2. (`03` UX-6)
- ☐ **P0.9** **PERF-3 quick win** (if P2 deferred): hoist the three `new Map()` out
  of the per-row path in `aggregate-project-charts.ts`. ~5 lines, ~1000× space-mode
  reduction; unit test guards it. 🟠
- ☐ **P0.10** **Navigation reframe**: update project sidebar/dashboard chrome from
  `Charts` + pie icon to `Cost comparison` or compact `Compare` + comparison/bar
  icon. Route may remain `/charts`. Update dashboard tests from old label/icon to
  the new contract. 🟡 (`08`, `13` R-7)
- ☐ **P0.11** **Storybook smoke for P0 states**: stories from P-1.8 render the
  header, insight, variance, low-state, and loading skeleton without provider data.
  Capture screenshots to `.ai/05_logs/<date>-project-charts-visual-qa/`. 🟡

**Measured deltas (`07`):** insight/variance render correctly (B/J); type-scale +
contrast assertions pass (H); loading skeleton matches (D).
**Rollback:** P0 is a view-layer swap behind the existing data; revert restores the
donut grid. Keep the donut component importable (it's reused in "Share view").

---

## P1 — The chart system

- ☐ **P1.1** **Composition view**: 100%-stacked horizontal bars per estimate with
  the shared stable legend; optional grouped horizontal bars for absolute
  comparison. (`08` band 4) 🔴
- ☐ **P1.2** **Comparison detail table**: extend `ProjectChartBucketTable` to
  columns Bucket · per-estimate cost/share · Δ · Δ%, preserving the Space tree
  hierarchy; give it a stable id for `aria-describedby`. 🔴
- ☐ **P1.3** **Demote the donut** to single-estimate "Share view," `dynamic`-imported,
  responsive in-column. **Guardrail:** keep the `/share/*` `compact` path
  pixel-stable (existing share tests + screenshot diff, `11`). 🟠
- ☐ **P1.4** **Delete `ProjectCostBubbleChart.tsx`** and its dynamic import; remove
  `d3-hierarchy`. Update/remove its tests (P-1.5). 🟠 (`01` PERF-5, `03` UX-2)
- ☐ **P1.5** **Waterfall/bridge** alternate variance form behind the View control
  (IBCS red/green). 🟡 (`08` band 3) — defer if time-boxed; dumbbell satisfies the
  core job.
- ☐ **P1.6** **Shared `activeBucketId`** cross-highlight across insight, spine,
  composition, table; click-to-pin. 🟠 (`03` UX-8)
- ☐ **P1.7** **Design-system source review**: `bun run lint:design-system` plus
  source inspection proves new controls use shared primitives and chart hues do not
  leak into buttons, nav, headers, or chrome. 🟡 (`13` R-5/R-8)

**Measured deltas:** grayscale chart↔table mapping survives (H/redundant encoding);
bundle no longer contains d3-hierarchy (and, with bars default, no d3 on first
paint, `01` PERF-5); share-page Playwright/visual artifact is pixel-stable against
the accepted baseline.

---

## P2 — Performance & database

- ☐ **P2.1** **`get_project_chart_buckets` RPC** (`02` DB-4): recursive-CTE ancestor
  walks (space → highest area; category → highest category), supplier
  `source_snapshot` → legacy fallback, the exact row-total formula, `SECURITY
  INVOKER`, `grant execute to authenticated`. 🟠
- ☐ **P2.2** **Golden-master prove** (P-1.4 / `07` F): RPC totals/labels/order ===
  JS oracle for all three modes on the seed project, *before* swapping the read
  path. Documented red→green. 🟠
- ☐ **P2.3** **Repository swap**: `getProjectChartsData` calls the RPC and returns
  **buckets + estimateOptions only**; drop `rowFacts`/`nodeFacts`/`categoryNodeFacts`/
  `supplierFacts` from the serialized payload. Closes `01` PERF-2/7 + `05` SEC-1. 🟠
- ☐ **P2.4** **Runtime payload contract test**: assert the serialized RSC/client
  payload contains no raw fact arrays and is < 50 KB on the large fixture (`07` A).
  Evidence must be a Playwright network/HAR capture, Flight/RSC route test, or saved
  payload artifact; source grep and temporary server logs are only supporting
  evidence. 🟠 (`13` R-2)
- ☐ **P2.5** **Deterministic order + truncation banner** (`02` DB-6): the RPC
  removes the row caps; if any residual limit/guard remains, add `.order('id')` and
  surface an explicit "totals incomplete" banner. 🟡
- ☐ **P2.6** **RLS `(select auth.uid())`** wrap in `is_workspace_member` + the five
  sibling helpers (`02` DB-3) — **coordinate with the estimates/library plans so
  it's applied once repo-wide.** EXPLAIN before/after + advisor check (`07` E). 🟠
- ☐ **P2.7** Document the **global-taxonomy invariant** comment on the
  category load / RPC (`02` DB-1). 🟡
- ☐ **P2.8** **Cache/freshness contract**: component category, supplier, and linked
  library mutations either revalidate affected project chart paths, invalidate a
  chart cache tag/version, or are proven unable to affect existing chart data.
  Regression test the selected strategy. 🟡 (`13` R-3)
- ☐ **P2.9** **AI Ask `projectCharts` contract**: update `src/lib/ai/read-context.ts`
  tests so AI Ask still receives compact read-only cost context after the buckets
  cutover and never receives raw row/node/category/supplier fact arrays. 🟠 (`13`
  R-4)

**Measured deltas:** RSC payload MB → < 50 KB (A); INP < 200 ms on Group By (C);
EXPLAIN + advisor confirm RLS InitPlan (E); golden-master green (F); cache and AI
Ask regression tests green.
**Rollback:** P2 is behind the repository boundary + the RPC; revert the repository
swap to fall back to the JS path (kept until P2 is proven). RPC and RLS migrations
are independently revertible; deploy must probe the RPC (fail-open on partial
drift, per the add-new-tab deploy lesson in memory).

---

## P3 — Accessibility hardening (WCAG 2.2 AA)

- ☐ **P3.1** **DESIGN.md data-viz amendment** (`10` D-7/D-15): document the 11 px
  SVG / 10 px control floor, table-as-text-alternative rule, and data-viz-only
  categorical palette exception. Okabe-Ito hues may appear in chart marks/legends/
  tables only, never controls, chrome, nav, or buttons. 🟡
- ☐ **P3.2** **Contrast tokens**: define `--muted-foreground`, darken muted/tertiary
  to ≥ #767676, darken callout connectors to ≥ 3:1; reconcile the focus token
  (`06` A11Y-2/4/16). Contrast assertions (`07` H). 🟠
- ☐ **P3.3** **Redundant encoding + chart↔table association**: non-color cue on
  marks; `aria-describedby` from each chart to its table id; grayscale test (`06`
  A11Y-5/11). 🔴 (Level A)
- ☐ **P3.4** **Semantics**: page `<h1>`, per-estimate `<h2>` / `aria-labelledby`
  regions, heading order (`06` A11Y-12). 🟠
- ☐ **P3.5** **Roving tabindex** on mark groups (or `tabIndex=-1` + table-as-surface);
  fix focus-restore by not remounting on estimate change (`06` A11Y-8/9). 🟡
- ☐ **P3.6** **Reflow**: responsive stacking, no 320 px horizontal scroll (`06`
  A11Y-14, `07` G). 🟠
- ☐ **P3.7** **Touch targets** ≥ 24 px (remove button → `size-7`); **reduced-motion**
  gate on all transitions (`06` A11Y-13/15). 🟡
- ☐ **P3.8** **Executable visual/a11y evidence**: Storybook addon-a11y plus
  Playwright screenshots for the P-1.8 stories; no `jest-axe`/`@axe-core/playwright`
  dependency unless explicitly added. Evidence lands under the phase log folder. 🟠

**Measured deltas:** Storybook a11y clean for serious/critical issues; keyboard/SR
walk pass (I); reflow at 320 px (G); contrast + CVD assertions (H).

---

## P4 — Cross-cutting defense (reference, not owned)

- ☐ **P4.1** Reference the `/workshop/*` **security-headers** ticket (`05` SEC-2) —
  shared with the estimates/library plans; do not let this plan own it. 🟡
- ☐ **P4.2** Ops check: `ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE` unset in prod/preview
  (`05` SEC-5). 🟡

---

## Phase dependency & revert summary

| Phase | Depends on | Independently revertible? | Felt impact |
|---|---|---|---|
| P-1 | — | n/a (contracts/tests/stories) | — (gate) |
| P0 | P-1 | Yes (view swap) | **Highest** — page does its job |
| P1 | P0 | Yes (per component) | High — chart system |
| P2 | P-1.4, P-1.9 | Yes (repo boundary + RPC) | Latent perf/security + freshness |
| P3 | P0/P1 | Yes (token + a11y) | A11y compliance |
| P4 | — | Yes (reference) | Hardening |

---

## Quality posture

High confidence after gates. Sequencing still follows felt-impact × risk, but the
entry gate now covers stale tests, baseline semantics, visual fixtures, downstream
AI context, cache freshness, and runtime payload proof before implementation can
claim readiness. Each phase remains independently revertible with a named fallback.
