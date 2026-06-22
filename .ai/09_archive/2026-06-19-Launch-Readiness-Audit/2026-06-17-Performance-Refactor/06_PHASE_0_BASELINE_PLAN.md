# 06 — Phase 0: Baseline, Instrumentation & Guardrails (Detailed Plan)

> **Status:** Wave-2 plan-pack artifact (Writer W6). Authoritative inputs:
> `_research/_SYNTHESIS.md` (contract), `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md`
> (the benchmark matrix this phase populates), `15_VALIDATION_MATRIX.md`
> (phase→command mapping), `04_TARGET_ARCHITECTURE.md` §11–§12, dossier
> `_research/R7-tests-perf-tooling.md`. Conventions per contract §4: Priority
> `P0–P3`, Risk `Low/Medium/High/Critical`, evidence `path:line — observation`.
>
> **Hard constraint (contract §4):** Phase 0 changes **no product code** and adds
> no `src/**`, `tests/**`, `e2e/**`, `scripts/**`, `supabase/**`, or config files.
> Everything below is either (a) a **measurement run** using commands that exist
> today, or (b) a **proposal** for scaffolding to be created in a *future
> implementation session* — every new script/fixture/test is labelled
> **(propose — Phase 0 deliverable)**. This document is the plan; it does not
> create the artifacts.

---

## 0. Why Phase 0 exists (the discipline gate)

The pack's #1 honesty constraint (file 03 §0; R7 finding-5): **the only meaningful
hard perf gates today are the 4 jsdom render-isolation tests** in
`tests/vitest/perf/`, and **`bun run validate` runs none of the perf/e2e/bundle
surface**. Almost every budget in file 03 is `PROPOSED` — a placeholder until a
real baseline replaces it.

Phase 0's single job: **make "fast" a number before we touch a line of product
code.** No later phase (1–10) may begin its first refactor commit until:

1. its relevant baseline rows in the file-03 BENCHMARK MATRIX hold a **measured**
   value (not `?`/`PROPOSED`), and
2. a regression ceiling is agreed (`baseline × margin` or a hard target).

**Discipline gate rule (P0):** "No refactor without a baseline." Concretely —
the 4 existing jsdom gates (`tests/vitest/perf/*`) MUST be green and their
recorded numbers captured (§3.4) before Phase 1 starts; the bundle reality check
(§3.1) MUST run before any Phase-7 early-win is pulled forward. This is the
mechanism that prevents "it feels faster" hand-waving. Record the gate as
decision **D-0xx** in `17_DECISION_LOG.md` and any deviation there too.

> **Early-win caveat (contract §2 quick-win note):** several Phase-7/8 items
> (provider topology move, `d3`→`d3-shape` dedup, share-page dynamic charts,
> hot-path FK indexes, shipping `get_project_chart_buckets`) MAY be pulled
> forward right after Phase 0. Each is still gated by *this* baseline +
> `bun run validate`. Phase 0 must capture their before-numbers (bundle chunks,
> query counts) so the early win is *provable*.

---

## 1. What to measure (tied to the file-03 benchmark matrix)

Every measurement maps to a row/category in `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md`.
Phase 0 fills the **"current coverage"→measured-baseline** column; it does NOT
yet set the gate (that is Phase 9). Grouped by the file-03 §4 gate categories:

| Matrix category (file 03 §4) | Phase-0 measurement | Tool (exists today) | Feeds phase |
|---|---|---|---|
| §4.4 Bundle budgets | First Load JS for landing, `/share/[token]`, workshop shell, charts route; confirm/deny supabase-js + authed providers in landing chunk; confirm `d3` full vs `d3-shape` | `ANALYZE=true bun run build` | 7, 9 |
| §4.1 Route budgets | Route-transition medians per scenario per network preset (`overlayVisibilityRate`, `_rsc=` count) | `perf:measure-routes` → `perf:check-routes` | 9 |
| §4.3 Large-fixture budgets | jsdom render time for 50-estimate table + 200-row sheet (`initialRenderMs`, `renderedElementCount`); virtualization windowing | `perf:profile-peak-load` | 3, 9 |
| §4.6 Render-count budgets | keystroke `keystrokeMsAvg/Worst`, `editedTableRenders`, `otherTableRendersTotal`, `nodeTotalsComputes`, `proposalSignatureComputes`, `rendersOutside`, cursor-isolation counts | `vitest run tests/vitest/perf` (read recorded numbers) | 1, 3, 9 |
| §4.5 Query-count budgets | static Supabase call-site inventory (select/insert/upsert/rpc, wildcard vs explicit, max columns); manual round-trip trace for sheet load + homebase load | `bun run scripts/build-performance-query-inventory.ts` + DevTools network | 4, 8, 9 |
| Proposal export (matrix row) | XLSX build time + RSS/heap at 500/1000/2500 rows | `bun run scripts/benchmark-proposal-workbook.ts` (orphan) | 9 |
| Realtime cursors (matrix row) | broadcast queue counts under move patterns | `bun run scripts/benchmark-estimate-cursor-broadcast.ts` (orphan) | 9 |
| Production fidelity (file 03 §3 item 7) | one Chrome Performance-panel capture per matrix flow to anchor the synthetic numbers | Chrome DevTools (manual) | all |

**Key honesty flags to carry into the matrix (do not paper over):**

- The peak-load profile is **synthetic ≤200 rows** (`route-transition-peak-load-profile.test.tsx:63-66`); scale wins are **unprovable beyond 200 rows** until the real DB fixture lands (§2). Mark every large-fixture row "synthetic-ceiling only" until then.
- Route budgets are **non-binding** today (15s/10s/30s medians, overlay cap 1.0 — `check-route-transition-readiness.ts:108-113`). Record the medians as *informational baseline*, not as a passed gate.
- Every jsdom/Playwright number is self-flagged non-production (`route-transition-peak-load-profile.test.tsx:167`, `check-route-transition-readiness.ts:196`) — the Chrome capture (§3.7) is the only production-fidelity anchor.

---

## 2. Fixtures — the no-large-DB-fixture gap

**Confirmed gap (file 03 §0 fact 2; R7 Gap 3):** there is **no real large-tree /
large-estimate / 100+ project DB fixture.** `scripts/seed-performance-test-data.ts:116`
is **manifest-only** — it writes a JSON shape file
(`.ai/09_archive/store/performance-seed-manifest.json`) and **deliberately never
writes Supabase**. The jsdom peak-load profile uses synthetic in-memory data
(`makeEstimate`/`makeRow`/`makeEstimateTree`, peak-load test `:84-151`). This is
"the single biggest measurement gap and Phase 0's first job" (file 03 §0).

### 2.1 `perf:seed-db-fixture` **(propose — Phase 0 deliverable, planning only)**

A future implementation session adds a **real DB seeder** that the current
manifest script intentionally is not. Design target (NOT created here):

- **Builds on** the existing manifest from `perf:seed-fixture` (reuse its scale
  knobs: 50 projects × 30 estimates × 200 rows, 3 sampled rows/estimate —
  `seed-performance-test-data.ts:130-135`) so the shape stays consistent.
- **Scales up** to the three scenarios the gates need (file 03 §4.3): a **1000+
  row** estimate sheet, a **deep multi-level tree** (≥6 levels — exercises
  `TreeIndex.depthOf`/`ancestorsOf` and the incremental-totals ancestor chain,
  file 04 §7.3), and a **100+ project** list (exercises sidebar/list windowing,
  file 03 project-list row).
- **Gated behind an approved local-only seeding step** (R7 open question notes
  the manifest "requires a separate approved local-only DB seeding step") — never
  runs against shared/prod; writes only to a local Supabase instance via the CLI
  (`supabase` local stack). Destructive-DB constraint (contract §4) means this is
  a *local-only* tool with an explicit confirm prompt; it applies **no
  migrations**.
- **Idempotent + namespaced** (e.g. all rows tagged `perf-fixture` for clean
  teardown) so repeated runs don't accumulate.

**FALLBACK + risk pointer (AR3 finding 5):** This seeder is **unprototyped
against the RLS-governed schema** (self-referential `estimate_nodes.parent_id`
at 1000+ rows, FK ordering, multi-tenant policies) — see **RISK-15**. **Prototype
it EARLY in Phase 0.** If it can't be built cheaply, fall back to an **anonymized
prod-shaped export** OR a **scaled-up synthetic fixture WITH a stated fidelity
caveat**, and record that the "improved vs baseline" exit criteria in
Phases 2/3/4/7/8 are then **bounded by that fidelity**. Do not let an infeasible
seeder silently push the program into reasoning-only mode.

**Risk:** Medium (DB writes — local only; must not touch prod). **Validation
when built (Phase 0 impl session):** seed runs against local Supabase, then
`perf:profile-peak-load-large` (§4 deliverable) renders against it and records
numbers far above the 200-row synthetic ceiling.

### 2.2 Fixtures usable *today* (no new code)

- The **manifest** (`perf:seed-fixture`) — confirm it generates and inspect the
  shape; it is the input contract for `perf:seed-db-fixture`.
- The **synthetic in-memory** generators inside the peak-load profile — usable
  now for the 200-row ceiling baseline (§3.3).
- A **real authed session storage state** for `perf:measure-routes` authenticated
  scenarios (`PLAYWRIGHT_STORAGE_STATE`, `measure-route-transitions.ts:24-25`) —
  needs an existing test account; capture once.

---

## 3. Measurement sequence (ordered, bite-sized; validation per step)

Each step is independently runnable, records into the file-03 matrix, and has an
explicit "done when". **No product code changes in any step.** Steps S1–S6 use
**existing** commands; S7 is manual. Run on a **pinned device/network profile**
(open question Q — see §7; record the profile alongside every number).

### S1 — Establish the green correctness floor (P0)
- **Run:** `bun run validate`.
- **Why:** Phase 0 must start from a known-green tree so later deltas are
  attributable. `validate` = type-check + lint + lint:design-system + lint:design
  + test (5 unit) + test:dom (361 DOM incl. the 4 perf gates) (`package.json:47`).
- **Done when:** `validate` exits 0; record commit SHA + date as the baseline
  anchor in `17_DECISION_LOG.md`.

### S2 — Capture the 4 jsdom render-isolation baselines (P0, the discipline anchor)
- **Run:** `vitest run tests/vitest/perf` (subset of `test:dom`).
- **Record** (these are the numbers every later phase must not regress):
  - `estimate-sheet-render-baseline.test.tsx` — `keystrokeMsAvg`, `keystrokeMsWorst`, `editedTableRenders`, `otherTableRendersTotal` (asserts only `>0` today — `:204-214`; **no upper bound**, so capture the value to set one in Phase 9).
  - `estimate-sheet-render-relief.test.tsx` — confirm `rendersOutside === 0`, sibling rows render `0` (`:162,182-183`).
  - `estimate-sheet-memoization.test.tsx` — confirm `proposalSignatureComputes === 0`, `selectedPresentationComputes === 0`, `nodeTotalsComputes === 1`, sibling areas `0` (`:166-167,201,182-183`).
  - `estimate-sheet-cursor-isolation.test.tsx` — confirm `contentRenders() === 0`, `totalTableRenders === 0` while typing (`:186-232`).
- **Confirm Q-05 (AR3 finding 1):** does the left `EstimateSheetTree` run its own per-keystroke totals DFS? Start from the AR1 observation that `EstimateSheetTree.tsx:154` has **no** `computeNodeTotals` call and renders `node.total` from the tree-data model. The outcome **gates D-013** (whether the Phase 2→3 edge is hard or parallel).
- **Probe surface to lean on:** `src/components/workshop/estimate-sheet-render-probe.ts` already exposes setters/reporters for content/row/branch/proposal-signature/node-total/node-totals/selected-presentation (`:19-83`). This is the **render-count harness pattern** Phase 9 generalizes (file 04 §11) — Phase 0 only reads from it.
- **Done when:** all 4 gates green; the 4 numeric tuples recorded in the file-03 §4.6 matrix rows.

### S3 — Peak-load render profile (synthetic ceiling) (P1)
- **Run:** `bun run perf:profile-peak-load`.
- **Record:** `initialRenderMs` + `renderedElementCount` for the 50-estimate
  `ProjectEstimatesTable` and the 200-row `EstimateSheetContent`
  (peak-load `:184-235`); confirm virtualization windows rows (0 < mounted < 200,
  total == 200, `:230-234`).
- **Flag:** ceiling is the loose `< 10_000ms` (`:206,235`); this is synthetic
  ≤200-row, **not at scale** — annotate the matrix row accordingly.
- **Done when:** numbers recorded into file-03 §4.3 / estimate-sheet-initial-load
  rows, flagged "synthetic 200-row ceiling."

### S4 — Bundle reality check (P0 — confirms contract §5 open question Q-bundle)
- **Run:** `ANALYZE=true bun run build` (analyzer wired at `next.config.ts:190-194`;
  no npm script — invoke via env var, contract §0).
- **Confirm or refute the R1 import-graph claims** (this is the contract §5
  "Bundle reality" open question, owner = measurement/Phase 0):
  - authed-only providers + supabase-js present in the **landing/shared chunk**? (`providers.tsx:30-46`, `realtime-auth-bridge.tsx:22-66`).
  - d3 charts shipped **eagerly** to the Data route AND public `/share/[token]`? (`CostBreakdownSection.tsx:5`, `SharePageTabs.tsx:23`).
  - full `d3` present though only `d3-shape` used? (R1 / contract §1 RSC-bundle).
- **Record:** First Load JS (kb) for landing, `/share/[token]`, workshop shell,
  charts route → file-03 §4.4 + matrix rows (landing, share-viewer, charts).
- **Done when:** each R1 claim marked **confirmed**/**refuted** in
  `19_OPEN_QUESTIONS.md` (resolve the Q-bundle open question) and kb numbers in
  the matrix. **Note (project memory):** `next build` is also the only thing that
  catches a non-async `"use server"` export — keep this run handy as the
  build-correctness check for later action-editing phases.

### S5 — Route-transition medians (P1, informational baseline)
- **Run (needs a running app):** `bun run dev` (or a prod build), then
  `INCLUDE_AUTHENTICATED=1 PLAYWRIGHT_STORAGE_STATE=… bun run perf:measure-routes`
  → `bun run perf:check-routes`.
- **Record:** median `durationMs`, `overlayVisibilityRate`, `_rsc=` request count
  per scenario per network preset (No-throttle / Fast-3G / Slow-3G,
  `measure-route-transitions.ts:33-37`). 7 scenarios (3 public + 4 authed;
  authed skipped without storage state, `:24-25,251-252`).
- **Flag:** budgets are non-binding (15s/10s/30s, overlay cap 1.0). Treat the
  medians as **informational baseline only**, not a passed gate (file 03 §4.1).
- **Done when:** medians recorded into file-03 §4.1 + matrix route rows, flagged
  "loose/non-binding — to tighten in Phase 9."

### S6 — Query-count inventory + manual round-trip trace (P1)
- **Run:** `bun run scripts/build-performance-query-inventory.ts` (orphan, static
  scan, `:6-46`) — classifies select/insert/upsert/delete/rpc, counts wildcard vs
  explicit, max columns per bucket.
- **Manually trace** (DevTools network, real app): estimate-sheet load and
  homebase load round-trip counts (R5). Note the hot wildcard `.select("*")`
  paths: component-library `:530-746` (and answer contract §5 Q-E: does prod call
  the full loader or the Lite variant?), sidebar projects `workspace-repository.ts:837/908`,
  homebase serial tail `workspace-repository.ts:1126-1222`.
- **Done when:** inventory output + round-trip counts recorded into file-03 §4.5;
  the component-library full-vs-Lite question logged/answered in
  `19_OPEN_QUESTIONS.md` (Q-E).

### S7 — Production-fidelity Chrome capture (P1 — the anchor for all synthetic numbers)
- **Run (manual, real Chrome Performance panel + real device):** one capture per
  matrix flow (file 03 §3 item 7): sheet initial load, tab switch, tree expand,
  tree filter, drag/drop, add/edit row, sidebar search, export preview, charts,
  share viewer.
- **Why:** every automated number is jsdom or loose Playwright (self-flagged
  non-production). The Chrome capture is the only signal that the synthetic
  numbers are directionally honest (real LCP/INP/long-tasks).
- **Done when:** one trace per flow saved; long-task/INP anomalies noted against
  the matrix rows they belong to.

### S8 — Orphan benchmark snapshots (P2, cheap)
- **Run:** `bun run scripts/benchmark-proposal-workbook.ts` (build time + RSS at
  500/1000/2500 rows) and `bun run scripts/benchmark-estimate-cursor-broadcast.ts`
  (queue counts). Both orphan, no threshold (R7 §1.4).
- **Done when:** numbers recorded into the proposal-export and realtime-cursor
  matrix rows — they become Phase-9 thresholds when these scripts are wired.

---

## 4. Scaffolding to add later (proposals — clearly marked, NOT created in Phase 0)

All are **planning items only** (contract §4: no `scripts/**` changes in this
pack). They are listed in file 03 §2 / file 15 §1; this phase commits to
*building these in the Phase-0 implementation session or Phase 9*, not to writing
them now.

| Proposed artifact | What it adds | Build phase | Builds on |
|---|---|---|---|
| `perf:seed-db-fixture` **(propose — Phase 0)** | Real large-tree/large-estimate/100+ project **DB** seeder; local-only, gated, idempotent (§2.1) | 0 (impl session) | manifest from `perf:seed-fixture` |
| `perf:profile-peak-load-large` **(propose — Phase 0/9)** | Re-runs the peak-load profile against the real fixture with **tightened** `initialRenderMs` ceilings (vs the loose 10s) | 0 / 9 | `route-transition-peak-load-profile.test.tsx`; `perf:seed-db-fixture` |
| `perf:query-count` **(propose — Phase 0 measure → Phase 9 gate)** | Wraps `build-performance-query-inventory.ts` + a runtime counter; asserts "flow X ≤ N round-trips / 0 N+1" | 0 / 8 / 9 | orphan inventory script; R5 |
| `analyze` npm script **(propose — Phase 0/7)** | Wraps `ANALYZE=true next build` for ergonomics (file 04 §1.5) | 0 / 7 | analyzer (`next.config.ts:190`) |
| `perf:bundle-budget` **(propose — Phase 7/9)** | Parses analyzer JSON; per-route/chunk kb ceilings; asserts 0 supabase-js/authed-providers in landing chunk | 7 / 9 | analyzer; R1 |
| `perf:render-budget` **(propose — Phase 9)** | Generalizes the 4 jsdom gates to tree expand/collapse, tree filter, tab switch, sidebar search, charts (exact render-count ceilings) via a reusable render probe (file 04 §11) | 9 | `tests/vitest/perf/*` template; `estimate-sheet-render-probe.ts` |
| `perf:gate` **(propose — Phase 9)** | Aggregate "perf validate" = render-budget + query-count + bundle-budget + profile-peak-load(-large) + tightened check-routes; wired into CI | 9 | all above |
| wire `benchmark-proposal-workbook` + `benchmark-estimate-cursor-broadcast` **(propose — Phase 9)** | Add `package.json` scripts + thresholds | 9 | orphan scripts |

### 4.1 Author the 6 static guardrail checks (SC-1..6, doc 27) — **Phase-0 deliverable**

Doc 27 defines six static guardrail checks but does not schedule their creation.
**Phase 0 AUTHORS all six** so they are runnable locally during the baseline;
Phase 9 CI-wires them (doc 27 "CI-wired in Phase 9"). Each is implemented either as
an ESLint rule (`no-restricted-imports` / `no-restricted-syntax`) or as a
`scripts/*.mjs` grep gate, and is run locally in Phase 0:

| Check | Enforces | Mechanism | Notes |
|---|---|---|---|
| **SC-1** | forbid `react-complex-tree` import | ESLint `no-restricted-imports` | **Gated on Q-10** — author the rule NOW (disabled/warn), **enable** when the CSS/type imports are removed in Phase 2 (`library-folder-reorder.ts:1,86`, `app/workshop/layout.tsx:15`). |
| **SC-2** | forbid selector-less Zustand store hooks | ESLint `no-restricted-syntax` | catches whole-store subscriptions that defeat selector isolation. |
| **SC-3** | `no-hot-barrel-imports` | ESLint `no-restricted-imports` / grep | blocks bare-barrel imports on hot paths (e.g. phosphor → `/dist/ssr`). |
| **SC-4** | grep `select("*")` | `scripts/*.mjs` grep gate | flags new wildcard reads on the read seam (Phase 4 discipline). |
| **SC-5** | grep unwrapped RLS `auth.uid()` | `scripts/*.mjs` grep gate | **extends `prove:rls-initplan`** — no bare `auth.uid()` in a USING/CHECK clause. |
| **SC-6** | enforce `src/components/ui/tree` for new trees | ESLint `no-restricted-imports` / grep | author NOW; **full strictness after Phase 2** (once `WorkshopTree`/`react-complex-tree` retire and `Tree` is canonical). |

- **Authored in Phase 0** (no product code; these are lint config + `scripts/*.mjs`
  guardrails, which the contract permits as tooling — they assert against the tree,
  they do not change `src/**`). Run locally in Phase 0 to confirm they execute.
- **CI-wired in Phase 9** (aggregated alongside `perf:gate`; see file 18 Phase-9
  prompt). SC-1 enables once Q-10/Phase-2 removes `react-complex-tree`; SC-6 reaches
  full strictness after Phase 2.

**Traces to capture in Phase 0 (summary):** (a) `ANALYZE=true bun run build`
analyzer report — the load-bearing trace that confirms/refutes every import-graph
bundle claim (contract §5 Q-bundle); (b) the 4 jsdom perf-test recorded numbers;
(c) the peak-load profile numbers; (d) route-transition JSON; (e) the static
query inventory; (f) the manual Chrome Performance traces (one per flow).

---

## 5. Open questions to resolve / seed in Phase 0 (for `19_OPEN_QUESTIONS.md`)

These are the contract §5 open questions whose **owner is "measurement (Phase 0)"**:

- **Q-bundle (contract §5):** Run `ANALYZE=true bun run build` to confirm/refute
  all import-graph-derived "ships into bundle X" claims **before** any Phase-7
  early-win acts on them (S4). → resolved by S4.
- **Q-E (contract §5):** Does prod call the full component-library loader or a
  "Lite" variant? Decides severity of the `.select("*")` finding
  (`component-library-repository.ts:530-746`). → measured in S6.
- **Q-13 (CI scope) — ANSWERED by owner (`.github/workflows/ci.yml:21-31`):** CI
  ALREADY runs build, `lint:design`, Playwright install, `test:e2e`, and
  `test:e2e:perf` — but NOT Storybook, the analyzer, or package-level perf
  scripts. Phase 0 does **not** need to re-discover this. Record the known CI
  baseline as fact; the implication stands (file 03 §0 fact 3): every new perf
  gate (`perf:gate` and friends, §4) needs explicit NEW CI wiring since the
  analyzer + package-level perf scripts are not in CI today.
- **Q (target profile):** What device/network profile anchors the binding
  budgets? The presets stop at Slow-3G (`measure-route-transitions.ts:33-37`).
  Pin this before any number is treated as a gate (§3 preamble).
- **Q-D (contract §5 / R3↔R4 seam):** Does the left `EstimateSheetTree` run its
  own totals DFS, doubling per-keystroke compute vs the sheet? → measure via the
  render probe + Chrome capture in S2/S7 (informs Phase 3).

> **Already resolved by Wave 1 (record, don't re-litigate):** `lint:design` is
> **not** a no-op — `detect.mjs:1-21` loads a real engine at
> `scripts/detector/detect-antipatterns.mjs` (file 03 §1.1 / file 15 §1). What it
> does NOT enforce is component reuse/duplication (Phase 6's job).

---

## 6. Phase 0 exit criteria (definition of done)

Phase 0 is complete (file 03 §6) when:

- [ ] **(a)** Every `?`/`PROPOSED` cell in the file-03 BENCHMARK MATRIX that can
  be measured today holds a **measured** baseline number (S1–S8), each tagged
  with the device/network profile.
- [ ] **(b)** Each regression ceiling is **recorded as an artifact** — `baseline ×
  margin` (e.g. ×1.15) or a hard target for a known-bad flow, written into
  `17_DECISION_LOG.md` (or the benchmark-matrix file) **per matrix row** — not
  merely "agreed". A ceiling with no recorded `baseline × margin` (or hard-target)
  value against its matrix row does NOT satisfy (b). These become the Phase-9 gates.
- [ ] **(c)** EITHER the real large-DB fixture exists and
  `perf:profile-peak-load-large` has run against it (at-scale numbers recorded),
  OR T4 has tripped (fixture proven infeasible per RISK-15/Q-24), the D-018
  synthetic-only downgrade is recorded in `17_DECISION_LOG.md`, and affected
  Phase 2/3/4/7/8 exits are tagged "synthetic-only". One of these two states
  MUST hold; the fixture being merely "not yet attempted" does NOT satisfy (c).
- [ ] **(d)** The bundle reality check (S4) has **confirmed or refuted** every R1
  import-graph claim (Q-bundle resolved in `19_OPEN_QUESTIONS.md`).
- [ ] **(e)** The 4 jsdom render-isolation gates are green and their numbers
  recorded — the discipline anchor for Phases 1–10.
- [ ] **(f)** All open questions in §5 are answered OR explicitly carried with a
  **named owner + deadline + safe default** (per doc 24 §6.1). Punting an open
  question with no owner/deadline/safe-default does NOT satisfy (f).
- [ ] **(g)** SC-1..6 authored and runnable (§4.1, doc 27) — each executes locally
  in Phase 0 (SC-1 authored but gated on Q-10, enabled when Phase 2 removes
  `react-complex-tree`; SC-6 reaches full strictness after Phase 2). CI-wiring is
  Phase 9.

Only after (a)–(g) may Phase 1 begin its first commit. The discipline gate
(§0) is the contract that makes the whole pack's "measure before refactor"
promise real.

---

## 7. Risks & cross-phase dependencies

| Item | Risk | Note |
|---|---|---|
| `perf:seed-db-fixture` DB writes | **Medium** | Local-only, gated, idempotent, applies no migrations (contract §4 destructive-DB constraint). RISK candidate for `16_RISK_REGISTER.md`. |
| Treating loose route medians as a gate | Medium | They are non-binding (S5); record as informational only or a later phase will "pass" a meaningless gate. |
| Synthetic ceiling mistaken for at-scale proof | Medium | Until (c), do not claim virtualization/memo wins beyond 200 rows (file 03 §0 fact 2). |
| CI wiring for new perf gates | Medium | Q-13 answered: CI today runs build, `lint:design`, `test:e2e`, `test:e2e:perf` (`.github/workflows/ci.yml:21-31`) but NOT the analyzer or package-level perf scripts. Every Phase-9 perf gate needs explicit NEW CI wiring (file 03 §0 fact 3). |

**Dependencies:**
- **Phase 1** consumes S2 (render-isolation baselines must stay green as the
  foundation primitives land) and the contract's structural-hash target.
- **Phase 3** consumes S2/S3/S7 (sheet decomposition is gated on the
  render-isolation + peak-load numbers, and Q-D).
- **Phase 7 early wins** consume S4 (bundle before-numbers) and S5.
- **Phase 8** consumes S6 (query-count baseline) + `perf:query-count`.
- **Phase 9** consumes **all** Phase-0 numbers to set the binding `perf:gate`
  thresholds.
