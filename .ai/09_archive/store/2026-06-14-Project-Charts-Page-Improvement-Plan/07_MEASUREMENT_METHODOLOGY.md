# 07 — Measurement Methodology

Every claim in this pack must be falsifiable with a **baseline** and an **after**
number. This document defines how each is measured, the harness, and the
acceptance thresholds. No phase is "done" without its measured/asserted delta
(`11`).

**Environment:** local `next dev` against Supabase `ebxxqidacheyapmmzavr`; Node via
nvm `v25.8.0` (PATH node v14 is too old for vitest/tsc/next). Verify in the user's
Chrome session (dev-auth bypass is disabled; a second `next dev` won't start) — see
the workshop-verification memory. Tab must be foreground (background tabs suspend).

---

## A. RSC payload bytes (headline perf + SEC-1)

**What:** the serialized size of the props handed to `ProjectChartsClient`
(`rowFacts`/`nodeFacts`/`categoryNodeFacts`/`supplierFacts` today; buckets after).
**How:**
- DevTools → Network → the RSC document/flight response for the charts navigation →
  Size (transferred + uncompressed). Filter to the charts route.
- Required implementation artifact: a Playwright network capture/HAR or route test
  that saves the charts Flight/RSC payload for the seed project and synthetic large
  fixture. Temporary `JSON.stringify(data).length` logs are allowed only as a
  cross-check, not as the acceptance proof.
**Baseline (seed project):** small (tens of rows). **Baseline (large fixture):**
the worst-case modeled in `01` PERF-2 (~1.3–1.6 MB uncompressed).
**Acceptance:** after P2, payload is **buckets only** — assert `< 50 KB`
uncompressed on the large fixture and that `rowFacts`/`nodeFacts` are absent from
the serialized runtime payload. The contract must explicitly fail if any of
`rowFacts`, `nodeFacts`, `categoryNodeFacts`, or `supplierFacts` crosses the wire.

## B. Client aggregation time (PERF-3/4)

**What:** wall time of `buildProjectChartSeries` across all columns on (a) first
paint and (b) a Group By toggle.
**How:** `performance.mark`/`measure` around the `chartColumns` memo
(`ProjectChartsClient.tsx:76-98`) in a dev build; record on the large fixture for 3
columns. Also React Profiler commit duration for the toggle interaction.
**Acceptance:** after the PERF-3 hoist (or P2 server aggregation), space-mode
aggregation time on the large fixture drops by **≥ 100×**; after P2 the client does
no per-row aggregation at all (only top-8 collapse + color), measured `< 5 ms`.

## C. INP on the Group By / View toggles (PERF-4)

**What:** Interaction-to-Next-Paint when switching grouping mode and adding a chart.
**How:** Chrome DevTools Performance panel (or the web-vitals lib) on the large
fixture, 3 columns; record INP for "Group By → Category" and "Add chart."
**Baseline:** expected multi-hundred-ms jank (`01` PERF-4). **Acceptance:** INP
**< 200 ms** (good) on the large fixture after P2.

## D. LCP / route paint + skeleton correctness (PERF-1)

**What:** Largest Contentful Paint for the charts navigation, and whether the
loading skeleton matches the final layout.
**How:** Performance panel cold navigation; visually confirm `charts/loading.tsx`
shape vs the painted page (no wrong-shape flash / CLS snap).
**Acceptance:** a chart-shaped `loading.tsx` exists and matches the redesigned
layout; **CLS < 0.1** on the charts navigation; no horizontal scrollbar at any
breakpoint (ties to G).

## E. DB query plans & RLS cost (DB-2/DB-3/DB-4)

**How (live DB, on implementation):**
- `EXPLAIN (ANALYZE, BUFFERS)` on the four loader queries (baseline) and on
  `get_project_chart_buckets` (after) — record planning/exec time, buffers, sort
  nodes.
- `EXPLAIN (ANALYZE)` the row-items query **before/after** the `(select auth.uid())`
  helper rewrite — quantify the per-row → InitPlan change.
- Supabase advisors (performance + security) before/after — confirm
  `auth_rls_initplan` clears.
**Acceptance:** the RPC returns the same per-bucket totals as the JS oracle
(golden-master, F) and runs in **< 50 ms** on the seed project; the advisor
`auth_rls_initplan` warning for the touched helpers is gone.

## F. Aggregation correctness — golden-master oracle (DB-4)

**What:** the new server/RPC aggregation must be byte-for-byte equivalent to the
current JS `buildProjectChartSeries` output for every grouping mode.
**How:** a vitest golden-master: for the seed project's estimates, snapshot the
current JS bucket totals/labels per `(estimateId, mode)`; assert the RPC path
produces identical totals (within float tolerance) and identical bucket ids/labels
and ordering, **before** the read path is swapped. Include the ancestor-walk edge
cases: highest-area selection, "Unassigned space", category top-walk,
supplier `source_snapshot` → legacy `supplier` fallback, `deltaPercent === null`
when baseline is 0.
**Acceptance:** golden-master green for space/category/supplier on the seed data;
documented red→green for the cutover.

## G. Responsive / reflow (A11Y-14)

**How:** resize to 320 / 375 / 768 / 1024 / 1440 and 400% zoom; record whether the
page scrolls horizontally and whether columns stack.
**Acceptance:** **no horizontal page scroll at 320 px**; columns stack to a single
column on small viewports; usable at 400% zoom (WCAG 1.4.10).

## H. Contrast & colorblind assertions (A11Y-2/3/4/5/6)

**How:**
- Programmatic: a vitest test computing WCAG contrast ratios for the (darkened)
  muted token on white, the connector stroke, and any text-on-fill — assert
  ≥ 4.5:1 (text) / ≥ 3:1 (graphical).
- Palette: assert the categorical palette is the Okabe–Ito set (or an approved
  CVD-safe set), ≤ 8 distinct + "Other", and run it through a CVD simulator
  (Coblis/Sim Daltonism) for deuter/protan/tritanopia; assert adjacent-bucket ΔE
  above a threshold.
- Redundant encoding: assert every chart mark has a non-color cue (direct
  label/sign), test that the chart↔table mapping survives a grayscale render.
**Acceptance:** all contrast assertions pass; palette is CVD-safe; no information is
conveyed by color alone (1.4.1).

## I. Automated a11y + keyboard/SR (A11Y-8..13)

**How:** use tools already in the repo unless a new dependency is explicitly
approved:
- Storybook addon-a11y on the provider-free Project Charts stories (zero
  serious/critical violations).
- Playwright keyboard walk on the live route or story frame: Tab order, roving
  tabindex, no trap, focus-restore on estimate change.
- VoiceOver/NVDA pass confirming the data table is announced as the chart's
  alternative and headings (h1→h2) read in order.
**Acceptance:** Storybook a11y serious/critical clean; keyboard reaches every
control in a sane order; SR users get the full data via the associated table.
Do not cite `jest-axe` or `@axe-core/playwright` unless that dependency is added
as an explicit implementation decision.

## J. "Time to insight" (the product metric)

**What:** the qualitative measure that matters most — can a user answer "which
estimate is cheaper and why?" without decoding?
**How:** a 3-task think-aloud on baseline vs redesign with the user (or a
stand-in): (1) "which estimate is cheaper, by how much %?"; (2) "what's the single
biggest driver of the difference?"; (3) "which space costs the most in Estimate
A?". Time each; note errors/hesitations.
**Acceptance:** on the redesign, all three answerable in **< 10 s each** with the
auto-generated insight sentence + variance spine doing the work; baseline expected
to require manual two-pie decoding (often unanswerable for task 2).

## K. Visual QA and Storybook artifact harness (`13` R-6)

**What:** deterministic screenshots and a11y checks for the states that are hardest
to verify on a provider-backed route.
**How:**
- Add provider-free stories under `src/stories/` for: empty/no estimates,
  single-estimate composition/share, two-estimate variance, three-estimate max,
  large/truncated, missing/null-delta, 320 px, 400% zoom, grayscale/CVD, and
  reduced-motion.
- Run `bun run storybook:validate` and save the build output location in the phase
  evidence note.
- Run a focused Playwright visual spec against Storybook or the local route and
  capture screenshots to `.ai/05_logs/<YYYY-MM-DD>-project-charts-visual-qa/`.
**Acceptance:** screenshots show no text overlap, no horizontal page scroll at
320 px/400% zoom, controls aligned across rows, and chart hues confined to marks/
legends/tables. Storybook addon-a11y reports no serious/critical issues for the
story matrix.

---

## Synthetic large fixture (required for A/B/C)

The seed project is too small to expose the perf cliff. Create a **disposable**
fixture: one project with 2–3 estimates totaling ~5,000 `estimate_row_items` across
~200 `estimate_nodes`, seeded via a script with explicit teardown (do not leave it
in the demo DB). Capture row counts in the test output. This fixture is what
sections A/B/C are measured against; the seed project covers D/E/F/G/H/I/J/K. Use
the existing `bun run perf:seed-fixture` path when it can create the required
shape; otherwise add a disposable `scripts/seed-project-charts-large-fixture.ts`
with explicit teardown and row-count logging.

---

## Reporting

Each phase PR includes a short **Measured Delta** block: metric, baseline, after,
method, and the artifact (screenshot/HAR/test output). `11` aggregates these into
the acceptance matrix. No "feels faster" / "looks better" claims without a number
or an asserted test (per `verification-before-completion`). Keep local/browser
evidence separate from live Supabase/provider evidence.

---

## Quality posture

The measurement plan is actionable after the second-pass repairs because the
headline claims now require runtime payload evidence, visual artifacts, existing
Storybook a11y checks, and explicit provider-proof boundaries. Product success is
still measured by time-to-insight, not just engineering counters.
