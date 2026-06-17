# 03 — Performance Baseline & Benchmarks

> **Status:** Plan-pack artifact (Wave 1, Writer W3). Read alongside the
> coordination contract `_research/_SYNTHESIS.md` and dossier
> `_research/R7-tests-perf-tooling.md`. Cross-references R1 (bundle), R4 (sheet
> render gates), R5 (query counts).
>
> **Purpose:** Define how we measure "fast" **before** we refactor, so every
> phase has a numeric thing to beat. Almost every budget in this file is a
> **PROPOSED target to ratify in Phase 0** after the real baseline is captured.
> The existing route budgets are deliberately loose / non-gating (contract §1,
> R7 Gaps 6); do not treat them as the bar.

---

## 0. Reading guide / honesty note

Three hard facts shape this whole document (all pinned in the contract):

1. **The only meaningful hard perf gates that exist today are the 4 jsdom
   render-isolation tests** in `tests/vitest/perf/` (R7 Top findings 1). They
   assert exact `0`/`1` render & compute counts. Everything else labelled
   "perf" is either a generator, a loose checker, or a static inventory.
2. **There is no real large-DB fixture.** `scripts/seed-performance-test-data.ts:116`
   is manifest-only and never writes Supabase; the jsdom peak-load profile uses
   synthetic ≤200-row / ≤50-estimate in-memory data
   (`tests/vitest/route-transition-peak-load-profile.test.tsx:63-66`). Until a
   genuine large fixture exists, virtualization/memo wins cannot be *proven* at
   scale — only at the 200-row ceiling. This is the single biggest measurement
   gap and Phase 0's first job.
3. **`bun run validate` runs none of the perf/e2e/storybook/bundle surface**
   (contract §0; R7 Top findings 5). Any perf gate we add must be wired into a
   *new* aggregate command and into CI explicitly — we cannot assume `validate`
   covers it.

Budgets below are written as **PROPOSED**. The Phase 0 baseline run replaces the
`?` / placeholder numbers with measured values + an agreed margin (typically
"baseline × 1.15" for a regression ceiling, or a hard target for a known-bad
flow). Ratified numbers land in `06_PHASE_0_BASELINE_PLAN.md` and become the
gates wired in Phase 9 (`09`).

---

## 1. Currently available scripts (what each measures + current threshold)

All commands are from `package.json` (lines cited) unless marked orphan. Risk
labels per contract §4.

### 1.1 Aggregate / correctness (gating today)

| Command | File / definition | Measures | Current threshold | Gating? |
|---|---|---|---|---|
| `bun run validate` | `package.json:47` | type-check + lint + lint:design-system + lint:design + test + test:dom | each sub-step's own pass/fail | **Yes** (the repo's only enforced gate) |
| `bun run type-check` | `package.json:17` (`tsc --noEmit`) | TS strict type errors | 0 errors | Yes |
| `bun run lint` | `package.json:14` (`eslint`) | ESLint rules | 0 errors | Yes |
| `bun run lint:design-system` | `package.json:15` → `scripts/enforce-app-design-system.mjs` | type-scale/weight/token rules over `src/app`+`src/components` (landing/share exempt, `:7-25`); **ZERO reuse/duplication rules** (contract §1 UI) | 0 violations | Yes |
| `bun run lint:design` | `package.json:48` → `.agents/skills/impeccable/scripts/detect.mjs --strict src/components` | anti-pattern detector (design quality) | 0 strict violations | Yes — **and NOT a no-op** (see note ↓) |
| `bun run test` | `package.json:19` (`bun test tests/unit`) | 5 unit logic tests | all pass | Yes |
| `bun run test:dom` | `package.json:20` (`vitest run --maxWorkers=1`) | 361 Vitest DOM tests incl. the 4 perf render-isolation gates | all pass | Yes |

> **Resolved open question (Q on `lint:design`):** the contract flagged
> `lint:design` as possibly a no-op loader. It is **not**. `detect.mjs:1-21` is a
> 21-line loader, but it resolves and runs a real engine at
> `.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs`, which
> exists in-tree (verified). So `lint:design` does enforce something today. (The
> contract's caveat that the impeccable anti-pattern engine "isn't in-tree" held
> for the `cli/engine/` path, which is absent — the `scripts/detector/` path is
> present.) Record this correction in `19_OPEN_QUESTIONS.md` (Q on lint:design →
> answered: enforcing). What it does *not* enforce is component reuse /
> duplication — that gap is real and is Phase 6's lint-rule work.

### 1.2 Perf scripts (wired in `package.json`, mostly non-gating)

| Command | File:line | Measures | Threshold | Gating? | Fixture |
|---|---|---|---|---|---|
| `perf:measure-routes` | `package.json:43` → `scripts/measure-route-transitions.ts:156-238` | Real Playwright route-transition latency: median `durationMs` (click→pathname→overlay hidden→networkidle), `overlayVisibilityRate`, `_rsc=` request count | **None — generator only.** Exits 1 only if a scenario got 0 runs (`:285-306`) | No | Running app at `BASE_URL` (default `localhost:3000`, `:19`); 3 runs/scenario; 7 scenarios (3 public + 4 authenticated); auth scenarios skipped unless `INCLUDE_AUTHENTICATED=1` / `PLAYWRIGHT_STORAGE_STATE` (`:24-25,251-252`) |
| `perf:check-routes` | `package.json:44` → `scripts/check-route-transition-readiness.ts:165-211` | Validates the measure-routes JSON vs budgets | **Loose & effectively non-binding:** `minRuns=3`, `publicMedianBudgetMs=15000`, `authenticatedMedianBudgetMs=10000`, `slow3gPublicMedianBudgetMs=30000`, `overlayVisibilityRateMax=1` (`:108-113`). Cap of 1.0 always passes | Technically yes (exits 1) but budgets so wide nothing real fails | `ROUTE_TRANSITION_BENCHMARK_FILE` artifact (`:100-103`) |
| `perf:seed-fixture` | `package.json:45` → `scripts/seed-performance-test-data.ts:116` | Generates **manifest-only** peak-load seed JSON | None | No | 50 projects × 30 estimates × 200 rows; 3 sampled rows/estimate (`:130-135`); output `.ai/09_archive/store/performance-seed-manifest.json` (`:136`). **Does NOT write Supabase** |
| `perf:profile-peak-load` | `package.json:46` → `tests/vitest/route-transition-peak-load-profile.test.tsx` | jsdom render time: `ProjectEstimatesTable` (50 estimates) + `EstimateSheetContent` (200 rows); records `initialRenderMs` + `renderedElementCount` (`:184-235`) | `initialRenderMs < 10_000` for both (`:206,:235`) — very loose ceiling. Also asserts virtualization windows rows: 0 < mounted < 200 and virtual-total-count == 200 (`:230-234`) | Yes (asserts), but ceiling is loose | Synthetic in-memory (`makeEstimate`/`makeRow`/`makeEstimateTree` `:84-151`); all actions/repos mocked (`:22-50`) |
| `test:e2e:perf` | `package.json:23` → `playwright test e2e/route-transition-performance.spec.ts` | Route-transition perf spec (landing nav ≤15s, resource/script/asset counts; authenticated transitions ≤10s; RSC hover-prefetch evidence) | spec-internal (loose, mirrors `perf:check-routes` budgets) | Yes if run, **but not in `validate` / not known to be in CI** | Running app |
| `perf:check-speed-insights` | `package.json:50` → `scripts/check-vercel-speed-insights-readiness.ts` | Vercel Speed Insights wiring readiness (config presence, not field metrics) | readiness pass/fail | Network/launch check, not a perf budget | Hosted |

### 1.3 The 4 jsdom render-isolation gates (`tests/vitest/perf/`) — the real model

These run inside `test:dom`. They are the **best existing template** for new
render-count gates (R7 Top findings 1).

| Test | Asserts | Hard gate? |
|---|---|---|
| `estimate-sheet-render-baseline.test.tsx:47-184,204-214` | Types a quantity; records `keystrokeMsAvg/Worst`, `editedTableRenders`, `otherTableRendersTotal`. Asserts only `editedTableRenders > 0` | **No** — measurement harness, no upper bound. Convertible to a gate (R7 Gap 7) |
| `estimate-sheet-render-relief.test.tsx:162,182-183` | Editing one area's row → **0 renders outside** that area; sibling rows render 0× | **Yes** — render-isolation gate |
| `estimate-sheet-memoization.test.tsx:166-167,201,182-183` | On keystroke: `proposalSignatureComputes===0`, `selectedPresentationComputes===0`, `nodeTotalsComputes===1`, sibling areas render 0× | **Yes** — memoization gate |
| `estimate-sheet-cursor-isolation.test.tsx:186-232` | Remote cursor broadcasts → `contentRenders()===0` / `totalTableRenders===0` while typing | **Yes** — realtime-cursor render gate |

Plus `tests/vitest/estimate-row-table-virtualization.test.tsx` exercises the
virtualizer (`virtual-branch-list.tsx`, `row-table.tsx`).

### 1.4 Orphan benchmark scripts (NOT in `package.json`; run via `bun run scripts/...`)

No threshold, not gated. Cheap to wire (R7 Open questions).

| Script | Measures | Threshold |
|---|---|---|
| `scripts/benchmark-proposal-workbook.ts:14-33,288-290` | Proposal XLSX build time + buffer size + RSS/heap at 500/1000/2500 rows | None (prints MiB) |
| `scripts/benchmark-estimate-cursor-broadcast.ts:38-60` | Cursor broadcasts `shouldQueueCursorBroadcast` queues over 120 same-cell vs 120 row-change moves | None |
| `scripts/benchmark-shared-link-activity.ts` | Shared-link activity composition pressure | None |
| `scripts/build-performance-query-inventory.ts:6-46` | **Static** scan of `src/app`/repos/publication/collaboration/ai for Supabase call-sites; classifies select/insert/update/upsert/delete/rpc, counts explicit-columns vs wildcard, max columns/bucket | None — descriptive, not gated. Closest thing to a query-cost inventory |

### 1.5 Bundle & Supabase-proof scripts

- **Bundle analyzer:** `next.config.ts:190-194` wraps config in
  `@next/bundle-analyzer`, enabled only on `ANALYZE=true`. **No `package.json`
  script, no kb budget, no CI gate** (R7 Gap 5). Invoke via `ANALYZE=true bun run build`.
  Only perf-config knobs are `optimizePackageImports:["@phosphor-icons/react"]`
  and `staleTimes{dynamic:60,static:180}` (`next.config.ts:54-68`).
- **`prove:*`** (`package.json:24-28`): `prove:notification-rls`,
  `prove:estimate-tabs-rls`, `prove:estimate-list-summaries`, `prove:rls-initplan`,
  `prove:unify-kinds` — Postgres RLS/initplan/kinds/summaries proofs against a DB.
  These prove **correctness/RLS-cost shape**, not latency budgets, but
  `prove:rls-initplan` is the closest thing to a DB-perf regression guard.

---

## 2. New recommended scripts (to add in Phase 0 / Phase 9)

> All marked clearly as **(new)**. None exist today. They are planning items
> only (contract §4 hard constraint: no `scripts/**` changes in this pack).

| Proposed script | Adds | Phase | Builds on |
|---|---|---|---|
| `perf:seed-db-fixture` **(new, Phase 0)** | Real large-tree / large-estimate / 100+ project **DB** seeder (the thing `seed-performance-test-data.ts:116` deliberately is not). Gated behind an approved local-only seeding step | 0 | manifest from `perf:seed-fixture` |
| `perf:query-count` **(new, Phase 0 measure → Phase 9 gate)** | Wraps `build-performance-query-inventory.ts` + a runtime counter to assert "flow X issues ≤ N Supabase round-trips / 0 N+1" | 0 / 8 / 9 | `build-performance-query-inventory.ts`; R5 query counts |
| `perf:bundle-budget` **(new, Phase 7/9)** | `ANALYZE=true bun run build` + parse the analyzer JSON; assert per-route/per-chunk kb ceilings (e.g. landing/share First Load JS, no authed-provider/supabase-js in landing chunk) | 7 / 9 | analyzer (`next.config.ts:190`); R1 |
| `perf:render-budget` **(new, Phase 9)** | Generalizes the 4 jsdom gates to **tree expand/collapse, tree filter, tab switch, sidebar search, charts** with exact render-count ceilings | 9 | `tests/vitest/perf/*` template |
| `perf:profile-peak-load-large` **(new, Phase 0/9)** | Re-runs the peak-load profile against the real large fixture (1000+ row sheet, deep tree, 100+ projects) with **tightened** `initialRenderMs` ceilings | 0 / 9 | `route-transition-peak-load-profile.test.tsx` |
| `perf:gate` **(new, Phase 9)** | Aggregate command = render-budget + query-count + bundle-budget + profile-peak-load + tightened perf:check-routes. The "perf `validate`" wired into CI | 9 | all above |
| wire `benchmark-proposal-workbook` + `benchmark-estimate-cursor-broadcast` **(new, Phase 9)** | Add `package.json` scripts + thresholds (export build-time ceiling; cursor-broadcast queue cap) | 9 | orphan scripts (§1.4) |
| tighten `perf:check-routes` budgets **(Phase 9, edits a JSON)** | Replace 15s/10s/30s & overlay-cap-1.0 with measured warm targets (e.g. p75 < 300ms) | 9 | `e2e/route-transition-performance-budgets.json`, `check-route-transition-readiness.ts:108-113` |

---

## 3. Manual measurement checklist (Phase 0 baseline capture)

Run once before refactoring to populate the BENCHMARK MATRIX with real numbers.
Capture on a pinned device/network profile (to be pinned in Phase 0 — see the
target-profile Open Question in `19_OPEN_QUESTIONS.md`).

1. **Bundle reality:** `ANALYZE=true bun run build`. Record First Load JS for
   landing, `/share/[token]`, workshop shell, charts route. Confirm/deny R1
   claims: authed providers + supabase-js in landing chunk
   (`providers.tsx:30-46`, `realtime-auth-bridge.tsx:22-66`); d3 charts eager on
   Data + Share (`CostBreakdownSection.tsx:5`, `SharePageTabs.tsx:23`); full `d3`
   present though only `d3-shape` used.
2. **Route transitions:** `bun run dev` (or prod build), then
   `INCLUDE_AUTHENTICATED=1 PLAYWRIGHT_STORAGE_STATE=… bun run perf:measure-routes`
   → `bun run perf:check-routes`. Record medians per scenario per network preset.
3. **Peak-load render profile:** `bun run perf:profile-peak-load`. Record
   `initialRenderMs` + `renderedElementCount` for the 50-estimate table and
   200-row sheet. (Synthetic ceiling — flag as not-at-scale.)
4. **Keystroke render isolation:** run `tests/vitest/perf/*` and read off the
   `keystrokeMsAvg/Worst` and render counts the baseline test *records* (it does
   not gate them yet).
5. **Query counts:** `bun run scripts/build-performance-query-inventory.ts` for
   the static call-site inventory; manually trace estimate-sheet load + homebase
   load round-trips (R5). Note wildcard `.select("*")` hot paths
   (component-library `:530-746`; sidebar projects `:837/908`).
6. **Proposal export:** `bun run scripts/benchmark-proposal-workbook.ts` →
   record build-time + RSS at 500/1000/2500 rows.
7. **Manual browser QA (Chrome DevTools, real profiler):** every test today is
   jsdom or loose Playwright timing (self-flagged non-production:
   `route-transition-peak-load-profile.test.tsx:167`,
   `check-route-transition-readiness.ts:196`). Do **one** real Chrome
   Performance-panel capture per matrix flow to anchor the synthetic numbers:
   sheet initial load, tab switch, tree expand, tree filter, drag/drop, add/edit
   row, sidebar search, export preview, charts, share viewer.

---

## 4. Proposed gate categories (ratify thresholds in Phase 0)

These are the **categories** of budget. The numeric value for each is PROPOSED
and replaced by measured baseline + margin in Phase 0.

### 4.1 Route budgets (tighten existing, non-gating today)
Current: public median 15s, authed 10s, Slow-3G public 30s, overlay cap 1.0
(`check-route-transition-readiness.ts:108-113`). **Proposed:** warm p75
transition < 300 ms (authed shell), < 500 ms cold; overlay visibility rate ≤ 0.2
(overlay should rarely flash). Ratify after measure-routes baseline.

### 4.2 Interaction budgets (none bite today, R7 Gap 2)
Proposed per-interaction latency ceilings: keystroke→cell-commit p95 < 16 ms
(one frame); tab switch < 100 ms; tree expand/collapse main-thread task <= 16 ms
normal / <= 50 ms worst-case large sheet (Bible §15.2, reconciled — see §4.2c);
filter keystroke
debounced-commit < 150 ms; drag-drop reorder commit < 200 ms; sidebar component
search keystroke < 100 ms; create/insert overlay-not-flashed + commit < 2 s
(existing `estimates-crud-latency.spec.ts:56` create<2s is the only timed gate).

### 4.2a Tree micro-budgets (Bible §3.7)

Explicit numeric budgets transcribed from **Bible §3.7** for the unified tree
kernel (Phase 2). These are the per-operation main-thread ceilings that the
TreeIndex/selectors must hit; they are measurement-anchored in Phase 0 and
become `perf:render-budget` / latency-gate assertions in Phase 9.

| Budget (Bible §3.7) | Threshold | Scale / condition | Notes |
|---|---|---|---|
| **Flatten visible nodes** | `< 4 ms` | 5,000 expanded nodes, dev laptop | `< 12 ms` on throttled (4×/6× CPU) profile. Pure compute; never on the keystroke critical path. |
| **Search projection** | `< 16 ms` | 10,000 nodes / rows | **Must NOT block input** — drive via `useDeferredValue` so typing stays responsive while the projection recomputes off the urgent render. |
| **Visible tree row render count** | `<= viewportRows + overscan*2 + constant chrome` | any tree size | Windowed mounted-row invariant; mounted rows must not scale with total nodes. Exact-count gate (jsdom), not a ms gate. |
| **DnD hover** | **0 React state updates per pointer move** | drag in progress | A pointer move may update React state **only** when it changes a *visible affordance* (drop indicator, valid-target highlight). Plain hover over non-affordance area = zero re-render. |
| **Virtualization threshold** | virtualize at `>= 150` visible rows | matches `treeMinRows` | Below the threshold, plain render is allowed; at/above, the virtualizer (`virtual-branch-list.tsx`, `row-table.tsx`) must window. |

> Cross-check: the row-render-count and DnD-hover budgets extend the existing 4
> jsdom render-isolation gates (§1.3) to the **left tree**; the flatten/search
> compute budgets feed `perf:render-budget` + a Playwright/pinned-profile latency
> gate (jsdom asserts COUNTS, ms come from Playwright/RUM — `15` §1 methodology).

### 4.2b Core Web Vitals — exact field thresholds (Bible §15.1)

Headline RUM targets, pinned at **p75** per **Bible §15.1** (the LCP-only pin
elsewhere in this pack is completed here with INP/CLS):

| Web Vital | Threshold (p75) | Source |
|---|---|---|
| **LCP** (Largest Contentful Paint) | `<= 2.5 s` | Bible §15.1 |
| **INP** (Interaction to Next Paint) | `<= 200 ms` | Bible §15.1 |
| **CLS** (Cumulative Layout Shift) | `<= 0.1` | Bible §15.1 |

These are **field** percentiles (RUM dashboard, `15` §1), never jsdom-derived.
The Phase-9 RUM gates assert LCP/INP/CLS against field p75.

### 4.2c App-budget reconciliation with the Bible (Bible §15.2)

Two pack budgets diverge from **Bible §15.2**; reconciled here:

| Flow | Bible §15.2 | This pack (prior) | Reconciliation |
|---|---|---|---|
| **Cold estimate-editor shell paint** | p75 `<= 1.5 s` | 500 ms (§4.1 "cold") | **Intentional tightening, kept.** The 500 ms cold figure is an *internal stretch target* for the authed shell transition; the **Bible §15.2 p75 <= 1.5 s is the binding ceiling** (a release-blocking regression). Rationale: 500 ms is the goal we measure against in Phase 0; 1.5 s is the hard fail line. If the measured baseline cannot credibly reach 500 ms, fall back to the Bible's 1.5 s as the gate. |
| **Tree expand/collapse** | main-thread task `<= 16 ms` normal / `<= 50 ms` worst-case large sheet | `< 100 ms` (§4.2, §5 matrix) | **Adopt the Bible numbers.** The `< 100 ms` figure was a loose interaction-latency placeholder; replace with **`<= 16 ms` main-thread task (normal)** and **`<= 50 ms` worst-case (large/deep sheet)** per Bible §15.2. The 16 ms normal budget aligns with the §4.2a flatten budget (one frame). §4.2 and the §5 matrix rows below are updated accordingly. |

> **Supabase EXPLAIN rule (Bible §15.2 / §10.2):** any Supabase query whose
> measured time is **> 50 ms on local/staging** *or* whose **p95 > 200 ms**
> REQUIRES an `EXPLAIN ANALYZE` plan captured as evidence before the query is
> accepted (no plan ⇒ the query fails the gate). This is the DB-latency
> companion to the query-count budget (§4.5) and is enforced via the
> EXPLAIN-evidence validation row in `15_VALIDATION_MATRIX.md` §1.

### 4.3 Large-fixture budgets (no fixture today, R7 Gap 3)
Proposed once `perf:seed-db-fixture` exists: 1000-row sheet `initialRenderMs`
ceiling (tightened from the loose 10 s), deep tree (≥6 levels) expand < 150 ms,
100+ project list render windowed (mounted ≪ total). Acknowledge openly: **until
the fixture lands, scale wins are unprovable beyond the 200-row synthetic
ceiling.**

### 4.4 Bundle budgets (none today, R7 Gap 5)
Proposed: landing First Load JS ceiling with **0 bytes** of supabase-js / authed
providers; `/share/[token]` ceiling with charts dynamically imported (not in
initial chunk); per-route kb ceiling = baseline × 1.0 (no growth without sign-off).

### 4.5 Query-count budgets (none today, R7 Gap 4)
Proposed: estimate-sheet load ≤ N round-trips; homebase load ≤ M (target: the
serial tail `workspace-repository.ts:1126-1222` collapsed); **0 new N+1**;
**0 new unbounded `.select("*")`** on hot paths. Seeded by R5.

### 4.6 Render-count budgets (only sheet-row today, R7 Gap 1)
Proposed: replicate the 4 jsdom gates' exact-count style to tree, tabs, sidebar,
charts. Keystroke into a cost cell ⇒ 0 renders outside edited area (already gated
for rows; extend assertion to the left `EstimateSheetTree`). Tab switch ⇒ only
the activated tab subtree renders. Tree filter ⇒ no full `toUiNode` rebuild
fan-out (R3: rebuilds whole tree per keystroke today).

---

## 5. BENCHMARK MATRIX

Columns: **flow | metric | proposed budget | how measured | current coverage
(R7 matrix) | gap**. All budgets PROPOSED; ratify in Phase 0.

| Flow | Metric | Proposed budget | How measured | Current coverage | Gap |
|---|---|---|---|---|---|
| Landing load | First Load JS; nav duration; supabase-js present? | kb ≤ baseline; **0 bytes supabase-js/authed providers**; LCP < 2.5s | `ANALYZE=true bun run build`; `landing-audit.spec.ts` | Partial — e2e nav ≤15s + resource/script counts (`route-transition spec :145-166`) | No bundle budget; loose nav; provider leak unverified (`providers.tsx:30-46`) |
| Login / auth callback | transition median | < 1 s warm | `perf:measure-routes` Landing→Login | Weak — median default-skipped; `auth.spec.ts` (`measure-routes :72-78`) | Authed scenarios skipped w/o storage state; no real budget |
| Workshop homebase | load + query count | transition < 500 ms; round-trips ≤ M | `perf:measure-routes` authed; `perf:query-count` (new) | Authed transition ≤10s, skipped (`route-transition spec :327-380`) | Loose; serial tail uncounted (`workspace-repository.ts:1126-1222`) |
| Project list | render windowing; prefetch | mounted ≪ total; transition < 400 ms | `perf:profile-peak-load`; e2e | RSC hover-prefetch evidence only, no latency budget (`:382-448`) | No 100+ project DB fixture; `.select("*")` (`:837/908`) |
| Estimates list | create latency; render time | create < 2 s (exists); 50-est render tightened | `estimates-crud-latency.spec.ts:56`; peak-load `:189-205` | CRUD-latency e2e + jsdom 50-row profile | Only create timed; profile loose ≤10s |
| Estimate sheet initial load | `initialRenderMs`; query count | < tightened ceiling at 1000 rows; round-trips ≤ N | `perf:profile-peak-load(-large)`; `perf:query-count` | jsdom render <10s; baseline (no upper bound) (`peak-load :211-235`) | Synthetic 200-row only; no large fixture; no query budget |
| Sheet tab switch | render count; latency | only activated subtree renders; < 100 ms | `perf:render-budget` (new) | **NONE perf**; `estimate-tabs.spec.ts` behavioral | No render-count gate, no latency ceiling |
| Tree expand/collapse | render count; latency | siblings render 0×; main-thread task <= 16 ms normal / <= 50 ms worst-case large sheet (Bible §15.2) | `perf:render-budget` (new) | **NONE perf**; `estimate-sheet-tree-dom.test.tsx` | No perf gate |
| Tree search/filter | full-rebuild avoided; latency | no whole-tree `toUiNode` rebuild fan-out; < 150 ms | `perf:render-budget` (new) | **NONE perf**; `estimate-tree-filter.test.tsx` | No perf gate; today rebuilds whole tree per keystroke (R3) |
| Tree drag/drop | reorder commit latency; signature cost | < 200 ms; no whole-tree `JSON.stringify` per reorder | new latency gate; `perf:query-count` | **NONE perf**; `estimate-tree-dnd.spec.ts` (3 e2e) + DOM | No latency ceiling; `getEstimateTreeContentSignature` JSON.stringifies 19 fields × every row, 5× (`estimate-tree-reorder.ts:181-220`) |
| Add/rename/delete area | render count; latency | scoped re-render; < 150 ms | `perf:render-budget` (new) | **NONE perf**; `estimate-tree-edit.test.ts` | No perf gate |
| Add/edit/delete row | keystroke render isolation; ms | 0 renders outside edited area; keystroke p95 < 16 ms | `tests/vitest/perf/render-relief + memoization`; baseline ms | **Has gates** (relief/memoization) + CRUD e2e | Baseline has no ms upper bound (R7 Gap 7); left tree DFS uncounted (Q-sheet/tree seam) |
| Right sidebar component search | render count; latency | scoped; < 100 ms | `perf:render-budget` (new) | **NONE perf**; `component-library-*` DOM | No perf gate; component-lib `.select("*")` ×8 unbounded (`:530-746`) |
| Template / project-source insertion | insert commit latency | < 200 ms | new latency gate | **NONE perf**; `workshop-template-insert-smoke.spec.ts` | No latency ceiling |
| Proposal export preview | build time; RSS; signature cost | build < ceiling @1000 rows; no per-keystroke full-tree signature DFS | `benchmark-proposal-workbook.ts` (wire it) | Orphan benchmark, **no budget** + DOM test | Ungated; `createProposalPreviewSignature` full-tree DFS per keystroke once dialog opened (`EstimateSheetContent.tsx:287-318,1260-1263`) |
| Charts page | aggregation locus; render | RPC-backed (push-down); render windowed | `perf:query-count`; `perf:render-budget` | **NONE perf**; `project-charts-*` DOM | JS aggregation; `get_project_chart_buckets` RPC never shipped (`project-charts-repository.ts:101-128`) |
| Share link viewer | First Load JS; charts dynamic? | `/share/[token]` kb ≤ baseline; charts NOT in initial chunk | `ANALYZE=true bun run build`; `perf:render-budget` | **NONE perf**; `shared-link-receiver.spec.ts` + DOM | No bundle budget; charts statically imported (`SharePageTabs.tsx:23`) |
| (bonus) Realtime cursors | render isolation | 0 sheet renders while typing | `tests/vitest/perf/cursor-isolation` | **Has gate** + orphan broadcast benchmark | Broadcast benchmark ungated |

---

## 6. What "ratified" looks like (Phase 0 exit)

Phase 0 is done for measurement purposes when: (a) every `?`/PROPOSED cell above
has a measured baseline number; (b) each regression ceiling is agreed (baseline ×
margin or hard target); (c) the real large-DB fixture (`perf:seed-db-fixture`)
exists and the peak-load profile has been re-run against it; (d) the bundle
reality check has confirmed or refuted the R1 import-graph claims. Those ratified
numbers become the Phase 9 gates wired into a new `perf:gate` aggregate + CI. See
`06_PHASE_0_BASELINE_PLAN.md` and `09_PHASE_3_ESTIMATE_SHEET_PLAN.md` /
`15_VALIDATION_MATRIX.md`.
