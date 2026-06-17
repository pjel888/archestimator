# R7 — Validation & Benchmark System Dossier

Research agent R7. READ-ONLY inventory (no suites/scripts executed). Feeds the
performance-refactor plan pack. Every claim cites `path:line-range`.

Scope note: 361 Vitest DOM test files, 5 unit tests, 18 Playwright specs, 86
Storybook stories. `package.json` `scripts` block enumerated below.

---

## Existing perf scripts (per-script: file, measures, threshold, fixture)

### Wired into `package.json`

**`perf:measure-routes` → `scripts/measure-route-transitions.ts`**
- Measures: real-browser (Playwright `chromium`) route-transition latency. For
  each scenario: median `durationMs` (click→pathname change→overlay hidden→
  networkidle), `overlayVisibilityRate`, and `_rsc=` request count
  (`scripts/measure-route-transitions.ts:156-238`).
- Threshold: **none — this is a generator only.** It writes a benchmark JSON
  payload and exits 1 only if a scenario got 0 runs (`:285-306`). Budgets are
  enforced by the separate readiness checker (below).
- Fixture: a running app at `BASE_URL` (default `http://localhost:3000`,
  `:19`). 3 runs/scenario (`:20`). Network presets No throttle / Fast 3G / Slow
  3G (`:33-37`). 7 scenarios: 3 public (Landing→Login, About→Contact,
  Pricing→Contact) + 4 authenticated workshop sidebar transitions
  (Projects/Library/Templates/Settings) (`:70-135`). Authenticated scenarios are
  **skipped unless** `INCLUDE_AUTHENTICATED=1` or `PLAYWRIGHT_STORAGE_STATE`
  (`:24-25, 251-252`).

**`perf:check-routes` → `scripts/check-route-transition-readiness.ts`**
- Measures: nothing live — it validates the JSON artifact from
  `measure-route-transitions.ts` against budgets and exits 1 if not ready
  (`scripts/check-route-transition-readiness.ts:165-211`).
- Thresholds (env-overridable, defaults): `minRuns=3`,
  `publicMedianBudgetMs=15000`, `slow3gPublicMedianBudgetMs=30000`,
  `authenticatedMedianBudgetMs=10000`, `overlayVisibilityRateMax=1`
  (`:108-113`). Budget picked by scenario name ("authenticated") / network
  profile ("Slow 3G") (`:121-131`). A scenario fails if runs<min, any failure,
  missing median, median>budget, or overlay rate>max (`:140-149`).
- Fixture: `ROUTE_TRANSITION_BENCHMARK_FILE` (required, `:100-103`).
- NOTE: budgets are extremely loose (15s/10s/30s medians) and overlay-rate cap
  is 1.0 (i.e. always passes). Self-described as not verifying production-user
  behavior (`:196`).

**`perf:seed-fixture` → `scripts/seed-performance-test-data.ts`**
- Measures: nothing. Generates a **manifest-only** peak-load seed file; it
  deliberately does NOT write to Supabase (`scripts/seed-performance-test-data.ts:116`).
- Scale (env defaults): 50 projects × 30 estimates × 200 rows; 3 sampled rows/
  estimate (`:130-135`). Default output
  `.ai/09_archive/store/performance-seed-manifest.json` (`:136`).
- No threshold. This is a data-shape generator, not a DB seeder — a real large-
  estimate/large-tree DB fixture does not exist (see Gaps).

**`perf:profile-peak-load` → `tests/vitest/route-transition-peak-load-profile.test.tsx`**
- Measures: jsdom render time for `ProjectEstimatesTable` (50 estimates) and
  `EstimateSheetContent` (200 rows). Records `initialRenderMs` +
  `renderedElementCount` (`:184-235`).
- Thresholds: `initialRenderMs < 10_000` for both renders (`:206, :235`) — a
  very loose ceiling. Asserts virtualization actually windows rows: mounted row
  count > 0 and < 200, and `data-estimate-row-virtual-total-count` == 200
  (`:230-234`). Test timeout 30s (`:236`).
- Fixture: synthetic in-memory (`makeEstimate`/`makeRow`/`makeEstimateTree`,
  `:84-151`), all server actions/repos mocked (`:22-50`).
- Self-described as "not a production Chrome profiler trace" (`:167`).
- The virtualization decision is encoded as deferred: `virtualizationDecision`/
  `memoizationDecision` strings (`:202-203, 227-228`).

### NOT wired into `package.json` (orphan benchmark scripts — run manually)

`grep` confirms none of these have a `package.json` script.

- **`scripts/benchmark-proposal-workbook.ts`** — proposal XLSX export build time
  + buffer size + RSS/heap, at 500/1000/2500 rows
  (`scripts/benchmark-proposal-workbook.ts:14-29, DEFAULT_ROW_COUNTS:33`). **No
  budget/threshold** — pure measurement, prints MiB (`:288-290`).
- **`scripts/benchmark-estimate-cursor-broadcast.ts`** — counts how many cursor
  broadcasts `shouldQueueCursorBroadcast` would queue under 120 tiny same-cell
  moves vs 120 row-change moves (`benchmark-estimate-cursor-broadcast.ts:38-60`).
  Pure measurement, no threshold.
- **`scripts/benchmark-shared-link-activity.ts`** — shared-link activity
  composition pressure; no budget.
- **`scripts/build-performance-query-inventory.ts`** — **static** scan of
  `src/app`, repositories, publication, collaboration, ai for Supabase
  query call-sites; classifies select/insert/update/upsert/delete/rpc, counts
  explicit-columns vs wildcard selects, max selected column count per bucket
  (`build-performance-query-inventory.ts:6-46`). This is the closest thing to a
  query-cost inventory but it is **descriptive, not gated** (no per-route query
  budget).

### Perf-adjacent Vitest render-cost tests (`tests/vitest/perf/`)

These are the real per-keystroke render-isolation gates (jsdom):

- **`estimate-sheet-render-baseline.test.tsx`** — types into a quantity input,
  records `keystrokeMsAvg/Worst`, `editedTableRenders`, `otherTableRendersTotal`
  via a render probe (`:47-184`). Asserts only `editedTableRenders > 0`
  (`:204-214`) — **no upper bound on render count or keystroke ms** (baseline
  capture, not a hard budget).
- **`estimate-sheet-render-relief.test.tsx`** — asserts editing one area's row
  causes **0 renders outside** that area (`rendersOutside === 0`, `:162`) and
  sibling rows render 0 times (`:182-183`). This IS a hard render-isolation gate.
- **`estimate-sheet-memoization.test.tsx`** — asserts memo compute counts:
  `proposalSignatureComputes===0`, `selectedPresentationComputes===0` on
  keystroke (`:166-167`), `nodeTotalsComputes===1` (`:201`), sibling areas render
  0 (`:182-183`). Hard memoization gate.
- **`estimate-sheet-cursor-isolation.test.tsx`** — remote cursor broadcasts cause
  `contentRenders()===0` / `totalTableRenders===0` while typing (`:186-232`).
  Hard gate that realtime cursors don't re-render the sheet.
- **`estimate-row-table-virtualization.test.tsx`** (in `tests/vitest/`) covers the
  virtualizer; source is `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`
  and `row-table.tsx`.

---

## Test inventory (unit/dom/e2e/storybook counts & coverage)

- **Unit (`tests/unit/`, `bun test`):** 5 files — `compare-href`,
  `p3-shared-link-migration-red`, `relative-time`, `reset-baseline`,
  `tree-selection`. Pure logic, no perf.
- **Vitest DOM (`tests/vitest/`, `vitest run --maxWorkers=1`):** 361 test files.
  `fileParallelism:false` and 30s testTimeout are load-bearing
  (`vitest.config.ts:11-17`) — the suite already runs serially and a full run is
  ~525s under GC pressure (`:13-15`). jsdom env, `server-only` stubbed (`:22`).
  Coverage spans tree (dnd/filter/reorder/context-menu/bulk-selection/modal),
  tabs, component-library, templates, charts (golden-master, aggregation,
  cache-freshness), proposal-export, share. This is the densest correctness
  surface but almost all of it is behavioral, not perf-budgeted.
- **Playwright e2e (`e2e/`, 18 specs):** see Coverage matrix. Perf-specific:
  `route-transition-performance.spec.ts`, `estimates-crud-latency.spec.ts`,
  `landing-audit.spec.ts`, `estimates-shell-streaming.spec.ts`.
- **Storybook (86 `*.stories.tsx`):** validated by
  `storybook:validate` = component-coverage + boundary + static build.

### Storybook coverage / boundary checks

- **`scripts/check-storybook-component-coverage.mjs`** — asserts a fixed list of
  required story titles + required exports per title + required top-level groups
  exist; exits 1 on any miss (`:185-303`). Also requires each story link to a
  real `@/components/` import or declare a `storybookContract`
  (`:137-145, 202-205`). It is a **presence/contract gate, not a visual or perf
  gate** (no chromatic/visual-regression).
- **`scripts/check-storybook-boundary.mjs`** — forbids stories importing
  supabase/auth/email/api/actions/repository/analytics or touching `process.env`
  (`:8-30`). Keeps stories pure.

### Bundle analyzer

- `next.config.ts:190-194` wraps config in `@next/bundle-analyzer`, enabled only
  when `ANALYZE=true`. **No `package.json` script, no size budget, no CI gate** —
  manual visual report only. `optimizePackageImports: ["@phosphor-icons/react"]`
  and `staleTimes {dynamic:60, static:180}` are the only perf-config knobs
  (`next.config.ts:54-68`).

### Design-system linters

- `lint:design-system` / `lint:font-size` → `scripts/enforce-app-design-system.mjs`
  — static type-scale/weight/token enforcement over `src/app`+`src/components`
  with landing + share path exemptions (`:7-25`). Not perf.
- `lint:design` → `.agents/skills/impeccable/scripts/detect.mjs --strict
  src/components` — anti-pattern detector (design quality, not perf).

---

## Validation commands available

| Command | What it gates |
|---|---|
| `bun run validate` | type-check + lint + lint:design-system + lint:design + test + test:dom (the aggregate gate; **no perf, no e2e, no storybook**) (`package.json` validate) |
| `bun test tests/unit` (`test`) | 5 unit logic tests |
| `vitest run --maxWorkers=1` (`test:dom`) | 361 DOM tests incl. perf/ render-isolation gates |
| `playwright test` (`test:e2e`) | all 18 e2e specs |
| `playwright test e2e/route-transition-performance.spec.ts` (`test:e2e:perf`) | route-transition budgets (loose) |
| `perf:measure-routes` | generates route-transition benchmark JSON (needs running app) |
| `perf:check-routes` | gates that JSON vs budgets |
| `perf:seed-fixture` | generates manifest-only seed JSON (no DB write) |
| `perf:profile-peak-load` | jsdom 50-estimate/200-row render-time profile (<10s ceiling) |
| `storybook:validate` | story coverage + boundary + static build |
| `lint:design-system` / `lint:design` | design-system static lint |
| `ANALYZE=true bun run build` | bundle analyzer report (manual, ungated) |
| `prove:*` (5) | Postgres RLS/initplan/kinds/summaries proofs (DB) |
| `launch:*` (~14) | hosted/Supabase/Vercel/Resend readiness checks (network) |

**Not wired (manual `bun run scripts/...`):** the 3 `benchmark-*` scripts and
`build-performance-query-inventory.ts`.

---

## Coverage matrix (flow → existing coverage?)

| Flow | Perf coverage | Behavioral/e2e coverage | Source |
|---|---|---|---|
| Landing load | Partial (e2e nav duration ≤15s, resource/script/asset counts) | `landing-audit.spec.ts` (perf+SEO+a11y) | route-transition spec `:145-166`, `e2e/landing-audit.spec.ts` |
| Login / auth callback | Weak (Landing→Login median in measure-routes, default-skipped) | `auth.spec.ts` | measure-routes `:72-78`; `e2e/auth.spec.ts` |
| Workshop homebase | Authenticated transition budget ≤10s (skipped w/o auth) | implicit | route-transition spec `:327-380` |
| Project list | RSC hover-prefetch evidence only (no latency budget) | `route-transition-performance.spec.ts:382` | `:382-448` |
| Estimates list | CRUD-latency e2e (overlay gates + create<2s); jsdom 50-row profile | `estimates-crud-latency`, `estimates-shell-streaming` | `e2e/estimates-crud-latency.spec.ts:41-88`; peak-load `:189-205` |
| Estimate sheet initial load | jsdom render <10s; render baseline (no upper bound) | many DOM tests | peak-load `:211-235`; perf/baseline |
| Sheet tab switch | NONE perf | `estimate-tabs.spec.ts`, `estimate-tab-strip.test.tsx` | e2e + DOM |
| Tree expand/collapse | NONE perf | tree DOM tests | `tests/vitest/estimate-sheet-tree-dom.test.tsx` |
| Tree search/filter | NONE perf | `estimate-tree-filter.test.tsx` | DOM |
| Tree drag/drop | NONE perf | `estimate-tree-dnd.spec.ts` (3 e2e) + DOM dnd tests | e2e + `estimate-sheet-tree-dnd.test.tsx` |
| Add/rename/delete area | NONE perf | `estimate-tree-edit.test.ts`, context-menu/modal DOM | DOM |
| Add/edit/delete row | render-isolation gates (relief/memoization/baseline) | CRUD-latency e2e, DOM | perf/* tests; `estimates-crud-latency` |
| Right sidebar component search | NONE perf | `component-library-*` DOM (~10 files), library demo smoke e2e | DOM + `workshop-library-demo-smoke.spec.ts` |
| Template / project-source insertion | NONE perf | `workshop-template-insert-smoke.spec.ts`, drop-zone DOM | e2e + `estimate-template-drop-zones.test.tsx` |
| Proposal export preview | benchmark-proposal-workbook (orphan, no budget) | `proposal-export-preview.test.tsx` + export DOM | orphan script + DOM |
| Charts page | NONE perf | `project-charts-*` DOM (~10 files incl golden-master) | DOM |
| Share link viewer | NONE perf | `shared-link-receiver.spec.ts`, `tests/vitest/share/*` | e2e + DOM |
| Realtime cursors | cursor-isolation render gate + orphan broadcast benchmark | `teamspace-collaboration.spec.ts` | perf/cursor-isolation; e2e |

---

## Gaps (what to build for a refactor gate)

1. **No render-count / re-render budget for tree, tabs, sidebar, charts.** Only
   the estimate-sheet *row table* has render-isolation gates
   (`tests/vitest/perf/estimate-sheet-render-relief.test.tsx:162`). Tree expand/
   collapse, filter, tab switch, and right-sidebar search have ZERO render-cost
   assertions. A refactor could regress these silently.
2. **No interaction-latency budget that actually bites.** `estimates-crud-latency`
   asserts overlay-not-flashed booleans (`e2e/estimates-crud-latency.spec.ts:60,73,81`)
   but the only timed gate is create<2s (`:56`). Tree drag, tab switch, search
   filter, sidebar insert have no latency ceiling.
3. **No real large-tree / large-estimate DB fixture.** `seed-performance-test-data.ts`
   is manifest-only and never writes Supabase (`:116`); the jsdom peak-load
   profile uses 200 rows / 50 estimates of synthetic in-memory data
   (`route-transition-peak-load-profile.test.tsx:63-66`). No 1000+ row sheet, no
   deep multi-level tree, no 100+ project list against a real DB.
4. **No Supabase query-count / N+1 budget.** `build-performance-query-inventory.ts`
   inventories call-sites statically but is orphan and ungated; nothing asserts
   "estimate sheet load issues ≤ N queries" or catches a new N+1.
5. **No bundle-size budget.** `@next/bundle-analyzer` is wired but only on
   `ANALYZE=true`, has no script, and no kb ceiling per route/chunk
   (`next.config.ts:190-194`). A refactor adding a heavy dep is invisible.
6. **Route-transition budgets are non-binding.** 15s/10s/30s medians and
   `overlayVisibilityRateMax=1` (`check-route-transition-readiness.ts:109-112`)
   mean essentially nothing fails. These need to be tightened to real targets
   (e.g. p75 transition <300ms warm) before they can gate a refactor.
7. **Render-baseline has no upper bound.** It records keystroke ms and render
   counts but only asserts `>0` (`estimate-sheet-render-baseline.test.tsx:204-214`).
   It's a measurement harness, not a regression gate — easy to convert.
8. **No memory / leak budget** beyond the orphan proposal-workbook RSS print.
9. **No CI-integrated perf step.** `validate` excludes e2e, perf, storybook, and
   bundle analysis — so none of the perf surface runs in the standard gate.
10. **No production/Chrome profiler trace** — every "perf" test is jsdom or
    loose Playwright timing (both self-flagged as non-production:
    `route-transition-peak-load-profile.test.tsx:167`, `check-route-transition-readiness.ts:196`).

---

## Top findings (ranked)

1. The **only hard, meaningful perf gates today** are the 4 jsdom render-
   isolation tests in `tests/vitest/perf/` (relief, memoization, cursor-isolation
   assert exact `0`/`1` render counts) — these are the best existing model to
   replicate across tree/tabs/sidebar for a refactor gate.
2. The headline `perf:*` route-transition system is a **generator + loose
   checker** with budgets so wide (15s medians, overlay cap 1.0) they cannot
   detect regressions; budgets live in `e2e/route-transition-performance-budgets.json`
   and `check-route-transition-readiness.ts:108-113` and are trivially tightenable.
3. There is **no real-data large fixture path**: seed script is manifest-only,
   profiles are synthetic ≤200 rows — a refactor gate needs a genuine large-tree/
   large-estimate fixture (DB or in-memory) to expose virtualization/memo wins.
4. **Bundle size and query count are measured but never gated** (analyzer behind
   `ANALYZE`, query-inventory orphan) — two cheap budgets to add.
5. **`validate` runs none of the perf/e2e/storybook surface**, so any perf gate
   must be added to CI explicitly, not assumed covered.

---

## Open questions

- Does CI run `test:e2e`, `perf:*`, `storybook:validate`, or `ANALYZE` builds at
  all, or only `validate`? (No CI config inspected here — confirm in `.github/`.)
- Is the manifest-only seed (`:116`) deliberately gated behind an "approved
  local-only DB seeding step" that exists elsewhere, or does a real seeder not
  exist? (Note says it "requires a separate approved local-only DB seeding step.")
- Should the refactor gate tighten the existing loose route-transition budgets in
  place, or introduce a separate warm-navigation budget file?
- Are the orphan `benchmark-*` scripts intended to be wired, or one-off evidence
  generators? Wiring proposal-workbook + cursor-broadcast with thresholds is low
  cost.
- What is the real target device/network profile for the binding budgets (the
  current presets stop at Slow 3G, `measure-route-transitions.ts:33-37`)?
