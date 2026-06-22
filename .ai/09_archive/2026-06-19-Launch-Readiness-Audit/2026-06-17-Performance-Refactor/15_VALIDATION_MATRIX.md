# 15 — Validation Matrix

> **Status:** Plan-pack artifact (Wave 1, Writer W3). Read with `_research/_SYNTHESIS.md`
> (contract) and `_research/R7-tests-perf-tooling.md`. Companion to
> `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md`.
>
> **Purpose:** For every validation command, state **what it actually proves**
> (and, crucially, what it does NOT). Then map each refactor phase (0–10, pinned
> order from contract §2) to its required commands + manual QA.
>
> **Rule:** only commands in the contract's §4 vocabulary exist today. Anything
> else is marked **(new, Phase N)** — a planning item, not runnable now
> (contract §4 hard constraint: no `scripts/**`/config changes in this pack).

---

## 1. Command → what it proves

| Command | Definition | Proves | Does NOT prove | Gating today |
|---|---|---|---|---|
| `bun run type-check` | `package.json:17` (`tsc --noEmit`) | TS strict type safety; no type-boundary leaks | Runtime behavior; `"use server"` export shape (see note) | Yes (in `validate`) |
| `bun run lint` | `package.json:14` (`eslint`) | ESLint rule compliance | Design tokens; reuse; perf | Yes |
| `bun run lint:design-system` | `package.json:15` → `scripts/enforce-app-design-system.mjs:7-25` | Type-scale/weight/token rules over `src/app`+`src/components` (landing/share exempt) | **Reuse/duplication** (ZERO such rules — contract §1 UI); perf | Yes |
| `bun run lint:design` | `package.json:48` → `.agents/skills/impeccable/scripts/detect.mjs --strict src/components` | Design anti-patterns. **NOT a no-op** — `detect.mjs:1-21` loads a real engine `scripts/detector/detect-antipatterns.mjs` (verified present) | Component reuse/duplication; perf | Yes (correction to contract OPEN: it *is* enforcing) |
| `bun run test` | `package.json:19` (`bun test tests/unit`) | 5 unit logic tests (compare-href, shared-link-migration, relative-time, reset-baseline, tree-selection) | DOM; integration; perf | Yes |
| `bun run test:dom` | `package.json:20` (`vitest run --maxWorkers=1`) | 361 DOM tests: tree/tabs/library/templates/charts/proposal/share **behavior** + the 4 perf render-isolation gates | Most of it is behavioral, not perf-budgeted; serial (~525s); no large fixture | Yes |
| focused test group | e.g. `vitest run tests/vitest/perf` or `vitest run tests/vitest/<area>` | Targeted subset (used per-phase to keep the loop fast) | Everything outside the path | n/a (subset of test:dom) |
| `bun run validate` | `package.json:47` | Aggregate: type-check+lint+lint:design-system+lint:design+test+test:dom | **No e2e, no perf, no storybook, no bundle** (contract §0) | **Yes — the only enforced gate** |
| `bun run test:e2e` | `package.json:22` (`playwright test`, 18 specs) | Full-flow behavior incl. auth, CRUD, dnd, share, streaming | Needs running app; not in `validate`; loose timing | If run |
| `bun run test:e2e:perf` | `package.json:23` → `route-transition-performance.spec.ts` | Route-transition timing (landing ≤15s, authed ≤10s), resource counts, RSC prefetch evidence | Budgets so loose nothing real fails (R7 Gap 6) | If run (loose) |
| `bun run perf:measure-routes` | `package.json:43` → `measure-route-transitions.ts:156-238` | **Generates** route-transition benchmark JSON (medians, overlay rate, `_rsc` count) | Nothing — generator only; exits 1 only on 0 runs (`:285-306`); needs running app + auth state for authed scenarios | No |
| `bun run perf:check-routes` | `package.json:44` → `check-route-transition-readiness.ts:165-211` | Validates that JSON vs budgets | Budgets 15s/10s/30s + overlay cap 1.0 (`:108-113`) ⇒ effectively always passes | Technically yes, practically no |
| `bun run perf:seed-fixture` | `package.json:45` → `seed-performance-test-data.ts:116` | Generates manifest-only seed JSON (50×30×200) | **Does NOT write Supabase** — no real DB fixture (R7 Gap 3) | No |
| `bun run perf:profile-peak-load` | `package.json:46` → `route-transition-peak-load-profile.test.tsx` | jsdom render time: 50-estimate table + 200-row sheet; virtualization windows rows (0<mounted<200, total==200, `:230-234`) | Synthetic ≤200 rows; ceiling loose (<10s, `:206/:235`); "not a production Chrome trace" (`:167`) | Yes (loose) |
| `bun run perf:check-speed-insights` | `package.json:50` → `check-vercel-speed-insights-readiness.ts` | Vercel Speed Insights wiring readiness | Field/RUM metrics; latency | Launch readiness, not perf budget |
| `ANALYZE=true bun run build` | `next.config.ts:190-194` | Bundle composition visual report (per-route First Load JS, chunk contents) | **No kb budget, no script, no CI gate** (R7 Gap 5) — manual read only | No |
| `bun run storybook:validate` | `package.json:12` | Story coverage (`check-storybook-component-coverage.mjs:185-303`) + boundary (`check-storybook-boundary.mjs:8-30`) + static build | Visual/chromatic regression; perf | If run; not in `validate` |
| `bun run prove:rls-initplan` | `package.json:27` | RLS init-plan remediation holds (Postgres) | App latency; closest DB-perf-shape guard | If run (DB) |
| `bun run prove:estimate-tabs-rls` / `prove:estimate-list-summaries` / `prove:notification-rls` / `prove:unify-kinds` | `package.json:24-28` | Postgres RLS/summary/kind correctness for those domains | Latency budgets | If run (DB) |
| `bun run scripts/build-performance-query-inventory.ts` | orphan (`:6-46`) | Static Supabase call-site inventory (select/insert/upsert/rpc, wildcard vs explicit, max columns) | Runtime round-trip count; N+1; ungated | No (orphan) |
| `bun run scripts/benchmark-proposal-workbook.ts` | orphan (`:14-33`) | Proposal XLSX build time + RSS @500/1000/2500 rows | No threshold | No (orphan) |
| `bun run scripts/benchmark-estimate-cursor-broadcast.ts` | orphan (`:38-60`) | Cursor-broadcast queue count under move patterns | No threshold | No (orphan) |
| Manual browser QA (Chrome DevTools Performance + real device) | n/a | The only **production-fidelity** signal — real LCP/INP/long-tasks; confirms the jsdom/Playwright synthetic numbers (both self-flagged non-production) | Reproducibility/automation; CI | No |

> **`"use server"` note (project memory):** `tsc` + Vitest both MISS the
> "exports only async" rule for `use server` files — only `next build` catches it.
> Any phase that edits server actions MUST run `bun run build` (or
> `ANALYZE=true bun run build`) in addition to `validate`.

### Proposed validation commands — performance / network (planning items)

| Command | Adds | Proves | Phase | Source doc |
|---|---|---|---|---|
| `perf:render-budget` **(new, Phase 9)** | Exact render-count gates for tree/tabs/sidebar/charts, modelled on `tests/vitest/perf/*` | jsdom render-COUNT invariants (not ms) | 9 | R7 |
| `perf:query-count` **(new, Phase 0→9)** | Runtime Supabase round-trip / N+1 budget per route (DEFINED concretely now, not deferred): wraps the network call-sites, counts requests-per-route-load and asserts ≤ the per-route ceiling (`23` §2.1) | 0 new N+1, 0 new unbounded query per hot route; round-trip count ≤ ceiling | 0 measure → 8/9 gate | `23` §2 |
| `perf:realtime-cost` **(new, Phase 9 / measure Phase 0)** | Realtime channel/subscription budget: per-route channel count (≤2, hard cap ≤3), inbound-render budget (0 render on remote cursor), teardown (`removeChannel` once on unmount; 0 leaked subs/timers). Wraps `benchmark-estimate-cursor-broadcast` + inbound render count | Channel count + inbound-render cost + clean teardown (RISK-17/18) | 9 measure from 0 | `23` §1 |
| `perf:payload-size` **(new, Phase 9 / measure Phase 0)** — **Q-30** (payload-size ceiling) | Max rows + serialized bytes per hot-path response (component library, projects sidebar/list, charts). Same harness as `perf:query-count` — one wrapper, two metrics | Bounded rows + byte ceiling per hot path | 9 measure from 0 | `23` §3 (Q-30) |
| `perf:memory-leak` **(new, Phase 0→9)** — **Q-34** (client memory/leak ceiling) | Mount/unmount listener+timer+subscription(+observer, +per-row `subscribeRow`) symmetry baseline + heap ceiling over a scripted ~5-min edit session vs the large fixture | Listeners/timers/subs return to baseline on unmount; heap stays bounded (RISK-18) | 0 measure → 9 gate | `25` §2 (Q-34) |
| `perf:tbt` / exec-time **(new, Phase 0→9)** | Total-Blocking-Time + main-thread long-task count/duration + `EstimateWorkspaceClient` hydration-time ceiling (distinct from kb) | Execution-time / TBT / hydration cost (proves Phase-3 decomposition; kb gate cannot) | 0 measure → 9 gate | `25` §3 |
| RUM field dashboard **(new, Phase 0→9)** | Per-route p75/p95 field Web-Vitals (LCP/INP/CLS/FCP/TTFB) via **provider-dashboard Speed Insights export (no package)** — D-016 **reversed**, Q-28; **must NOT assume `@vercel/speed-insights`** (forbidden by `tests/vitest/vercel-web-analytics-integration.test.ts`) — or a first-party `/api/vitals` sink **only if the owner approves the PII/consent work**. Phase 0 captures field baseline; Phase 9 the LCP/INP/CLS gates assert against **field p75/p95**, not jsdom | Real-user latency percentiles (the headline LCP/INP/CLS targets, otherwise unmeasurable) | 0 wire → 9 gate | `25` §1 |
| `perf:explain-evidence` **(new, Phase 8 / measure Phase 0)** — Bible §10.2/§15.2 | EXPLAIN-evidence gate: any Supabase query measured **> 50 ms on local/staging** OR with **p95 > 200 ms** MUST ship a captured `EXPLAIN ANALYZE` plan as evidence; a slow query with no plan **fails closed**. Wraps the `prove:rls-initplan` harness + the `perf:query-count` timing wrapper | Slow hot-path queries have a reviewed query plan (no un-analyzed seq-scan/N+1 ships) — Bible §10.2/§15.2 | 0 measure → 8 gate | Bible §10.2/§15.2; `03` §4.2c |
| `perf:bundle-budget` **(new, Phase 7/9)** | Parse analyzer output; assert per-route kb + no-supabase-in-landing | Per-route First Load JS kb budget | 7/9 | R7 / `23` |
| `perf:seed-db-fixture` **(new, Phase 0)** | Real large-tree/large-estimate/100+ project DB seeder | A real DB fixture exists (not manifest-only) | 0 | R7 |
| `perf:profile-peak-load-large` **(new, Phase 0/9)** | Peak-load profile vs the real large fixture, tightened ceilings | Peak-load render time on real-scale data | 0/9 | R7 |
| `perf:scoped-delta-totals` **(new, Phase 4)** — **RISK-25 / SEV-3** | Scoped-delta totals-correctness: assert a recompute-from-`affectedNodeIds` is **byte-equal** to a full-tree recompute over the post-mutation cache | The SERVER scope hint (`affectedNodeIds`) is **complete** — no node that should change is left stale (correctness, **independent of render-count**) | 4 | `16` RISK-25 |
| `perf:memo-guard-snapshot` **(new, `tests/vitest/perf/`)** — **SEV-5** | Memo-guard comparator-snapshot: assert the compared-key set of `areEstimateSheetBranchPropsEqual` / `areEstimateRowItemsTablePropsEqual` matches a checked-in snapshot (converts the manual guard-preservation check into a CI gate) | The memo comparators still compare exactly the intended prop keys — no silent key add/drop that would break render isolation | 2 / 3 / 5 (every phase touching the sheet) | `16` SEV-5 |
| `perf:gate` **(new, Phase 9)** | Aggregate "perf validate" wired into CI — composes `perf:render-budget` + `perf:query-count` + `perf:realtime-cost` + `perf:payload-size` + `perf:memory-leak` + `perf:tbt` + `perf:bundle-budget` + `perf:profile-peak-load(-large)` + tightened `perf:check-routes` | The whole perf set passes in CI | 9 | R7 / `23` / `25` |

> **Methodology (binding on every latency/percentile gate above — `25` §5):** any
> latency-percentile gate needs **≥20 samples** per scenario per profile; **all
> interaction budgets are p95/p99** (p99 for the cost-cell keystroke — never
> mean/median); **cold vs warm runs separated**; and a **TIME budget is NEVER
> derived from jsdom** — jsdom asserts **COUNTS only** (ms come from Playwright on
> a pinned profile or from field RUM).

### Proposed validation commands — static guardrails (planning items)

Static lint/grep guards (Phase 0, fail **closed**) defined in `27`. None run inside
`bun run validate` today (contract §0); they aggregate into `perf:gate`/CI by Phase 9.
Source: `27` (static-guardrails plan).

| Guardrail | Type | Proves | Phase | Source doc |
|---|---|---|---|---|
| **SC-1** (forbid `react-complex-tree` import) **(new, Phase 0)** | static/lint | No new `react-complex-tree` import enters the codebase (tree-kernel migration is one-way) — **gated on Q-10** (don't fail-close until Q-10 resolves the legacy-import disposition) | 0 | `27` |
| **SC-2** (forbid selector-less Zustand store hooks) **(new, Phase 0)** | static/lint | No `useStore()` without a selector (whole-store subscription = render storm) | 0 | `27` |
| **SC-3** `no-hot-barrel-imports` **(new, Phase 0)** | static/lint | Hot paths don't import barrel/full-package modules (backs `perf:bundle-budget`; see Bible §15.3 `no-hot-barrel-imports.test.ts`) | 0 | `27` |
| **SC-4** (grep `select("*")`) **(new, Phase 0)** | static/grep | No wildcard `select("*")` reads (select discipline; complements Phase-4 query inventory) | 0 | `27` |
| **SC-5** (grep unwrapped RLS `auth.uid()`) **(new, Phase 0)** | static/grep | No bare `auth.uid()` in RLS policies (must be wrapped `(select auth.uid())` for init-plan) | 0 | `27` |
| **SC-6** (enforce `src/components/ui/tree` for new trees) **(new, Phase 0)** | static/lint | New tree UIs are built on the canonical `src/components/ui/tree` primitive — **full strictness only after Phase 2** (kernel must exist before it can be mandated) | 0 | `27` |

> **Aggregation:** all six SC-* guards fold into the Phase-9 `perf:gate`/CI enforced
> set (§3). SC-1 stays advisory until **Q-10** resolves; SC-6 runs from Phase 0 but
> reaches **full strictness after Phase 2** (post tree-kernel unification).

### Proposed validation commands — Track-F cache gates (planning items)

`use cache` adoption (Track F) guards, fail **closed**; defined in `26`.

| Gate | Type | Proves | Track | Source doc |
|---|---|---|---|---|
| `lint:no-request-in-cache` **(new, Track F)** | static/lint | No `cookies()`/`headers()` (request-scoped state) read inside a `use cache` scope — cached output stays request-independent | Track F | `26` |
| `prove:no-private-in-public-cache` **(new, Track F)** | prove (fail-closed) | No stale private/auth-scoped data leaks into a cached/public scope — public cache holds only public data | Track F | `26` |

### Proposed validation commands — security `prove:*` (planning items)

All fail **closed**; none run inside `bun run validate` today (contract §0). Source: `22_SECURITY_AND_RLS_THREAT_PLAN.md`.

| Command | Adds | Proves | Phase | Source doc |
|---|---|---|---|---|
| `prove:workshop-auth-boundary` **(new, Phase 7)** | e2e: an **unauthenticated** GET of a `/workshop/**` route → **302 to `/login`** (any 200 with workshop shell = FAIL); + RSC structural check (no `"use client"` at top of `workshop/layout.tsx`, `redirect` import retained) | The provider/topology move did not drop the route-level auth redirect (RISK-19) | 7 | `22` §1 |
| `prove:project-chart-buckets` (cross-tenant denial) **(new, Phase 8)** | Extends the golden-master SQL==JS check with a **cross-tenant denial**: caller in workspace A passing a valid `project_id` from workspace B → RPC returns **empty**, not B's buckets | New chart RPC can't leak across tenants (RISK-20) | 8 | `22` §2 |
| `prove:workspace-homebase-summary` (cross-tenant + user-favorite isolation) **(new, Phase 8)** | Caller in workspace A passing B's id cannot read B's summary; same-workspace User A cannot read User B's favorites | New homebase summary RPC can't leak across tenants or users (RISK-20); contract canonical in `2026-06-19-Workshop-Dashboard-Query-Batching` | 8 | `22` §2; June 19 Query Batching pack |
| `prove:estimate-tabs-rls` (CTE multi-role axis) **(extend, Phase 8)** | Adds an `estimate_activity_node_scope` / CTE descendant-set axis run under multiple user contexts: sheet-member gets full descendant set; non-sheet-member workspace user gets an **empty** set (RLS denies anchor + every recursive step); respects `includeDescendants=false` | The recursive CTE isolates across roles (RISK-20) | 8 | `22` §2/§5 |
| `prove:action-authz` **(new, Phase 4)** | Per wrapped action: a **no-session** (and where applicable **wrong-role**) call returns `{ ok: false, error.code: "FORBIDDEN" }` — never `ok: true`; parametrized over the wrapped action set | `ActionResult<T>` wrapping didn't silently drop an interior authz check (RISK-21) | 4 | `22` §3 |
| `optimistic-mutation-contract.test.tsx` (FORBIDDEN-path axis) **(extend, Phase 5)** **(contract defined in doc 11 §1–§5)** | Server FORBIDDEN response → rollback restores pre-mutation state (client defense-in-depth for RISK-21) | Optimistic rollback handles the FORBIDDEN path | 5 | `22` §4 |
| `prove:share-*` **(new, Track F / C1)** — mitigation gate for **RISK-23 (Critical)** | The public `/share/[token]` cache layer under Next 16 Cache Components is tenant- and token-isolated, fail-closed, on four properties: **(a)** a revoked/expired/rotated token is never served stale from a cached scope; **(b)** a P10 password-gated publication is not served from cache past the gate; **(c)** the `cacheTag` key includes the publication id and NEVER a bare/raw token; **(d)** one recipient's snapshot is never served to another | The four cache-isolation properties above (revocation freshness, P10 non-bypass, key hygiene, cross-recipient isolation) hold over the C1 share cache | Track F / C1 | `22` §5b |

### Proposed validation commands — UX / a11y gates (planning items)

`bun run storybook:validate` (Storybook a11y addon + boundary + static build) is a **REQUIRED** gate at **Phases 2, 3, and 6** (a11y + visual). It is **NOT** in `bun run validate` (contract §0), so it must be invoked explicitly and recorded in each phase's DoD. Source: `20_UX_UI_AND_INTERACTION_PLAN.md`.

| Gate | Type | Proves | Phase | Source doc |
|---|---|---|---|---|
| `bun run storybook:validate` (a11y + visual) **(REQUIRED, not in `validate`)** | Storybook a11y + boundary + static build | a11y + visual coverage at convergence/primitive points | 2, 3, 6 | `20` §3/§6 |
| **GATE-EDIT-INIT** | jsdom/DOM test | Per-row store init does not reset an unsaved cell value to the server value | 3 (Step 4) | `20` §1.3 |
| **GATE-EDIT-RECONCILE** | jsdom/DOM test | A mid-edit server reconcile does not overwrite the in-progress value | 3 (Step 4) | `20` §1.3 |
| **GATE-EDIT-IDENTITY** | jsdom/DOM test | After a keystroke in row A, untouched rows B…N keep per-row reference equality (memo guard intact); they don't blur/rerender | 3 (Step 4) | `20` §1.3 |
| **GATE-NO-TOTAL-FLASH** | jsdom/DOM test | Branch/project total transitions old→new with no `₱0.00` / stale intermediate | 3 (Step 5) | `20` §2 |
| **GATE-CELL-KEYBOARD** | jsdom/DOM test | Tab/Enter/Escape cell navigation/commit/cancel unchanged after center-column extraction | 3 (Step 9) | `20` §3 |
| **GATE-STALE-BADGE-EAGER** | jsdom/DOM test | Proposal stale-badge correct in the first commit on dialog open (no debounce delay) | 3 (Step 7) | `20` §5 |
| **GATE-TRANSIENT-SURVIVAL** | jsdom/DOM test | Scroll/expansion/bulk-selection/active-cell-focus/search query survive the refactor's triggering action | 2 & 3 (per step) | `20` §1 |
| **GATE-DND-AFFORDANCE** | manual QA (per family, recorded in DoD) | Drop indicator only on valid `inside` targets; inserted node at correct parent; name in drag ghost | 2 | `20` (DnD) |
| **GATE-FOCUS-AFTER-MUTATION** | jsdom/DOM test (extend `optimistic-mutation-contract.test.tsx`) | Focus is preserved/restored after insert/delete/move | 5 | `20` §5 |
| **GATE-URL-SYNC** | jsdom/DOM test | URL ⇄ state sync (active tab/selection/route params) survives the decomposition + streaming/provider-topology moves — no drift, no stale deep-link | 3 & 7 | `20` §6a |
| Manual CLS check (Chrome DevTools Layout Shift) | manual QA | Suspense fallback is pixel-isomorphic to resolved layout; CLS ≈ 0 before/after Phase-7 streaming | 7 (before/after) | `20` §4 |

### Required-test manifest (Bible §15.3)

The 8 target test files the Bible §15.3 mandates this refactor must land, each
mapped to the pack's named gate (created here where missing). All are **(new,
Phase N)** — none exist today; they are the concrete files behind the proposed
`perf:*` commands above. The Bible §15.3 manifest is the source of truth for the
filenames; this table binds each to a pack gate + phase.

| Bible §15.3 test file | Type | Pack gate it implements | Phase |
|---|---|---|---|
| `tree-index.test.ts` | unit | Backs **Phase-1/2 tree kernel** — headless `TreeIndex` flatten/expand/select invariants; underpins the §3.7 flatten micro-budget (`03` §4.2a) | **(new, Phase 1/2)** |
| `ui-tree-virtualization-budget.test.tsx` | jsdom render-count | **`perf:render-budget`** (tree slice) — windowed mounted-row invariant `<= viewportRows + overscan*2 + chrome`; DnD-hover 0-render (`03` §4.2a) | **(new, Phase 2)** |
| `estimate-tree-model.test.ts` | unit | Backs **Phase-2 tree ops** — model-level reorder/move/edit correctness feeding the kernel | **(new, Phase 2)** |
| `estimate-sheet-totals-budget.test.ts` | unit/compute-count | **`perf:render-budget`** (memoization slice) — totals recompute count (extends `estimate-sheet-memoization.test.tsx` `nodeTotalsComputes===1`) | **(new, Phase 3)** |
| `estimate-sheet-render-budget.test.tsx` | jsdom render-count | **`perf:render-budget`** (sheet slice) — keystroke ⇒ 0 renders outside edited area incl. left tree; generalizes the 4 existing perf gates (§1.3) | **(new, Phase 3)** |
| `query-key-contract.test.ts` | unit | Backs **Phase-1 query-key factory** + **`perf:query-count`** contract — stable/canonical query keys, no key drift causing refetch | **(new, Phase 1)** |
| `no-hot-barrel-imports.test.ts` | static/lint | **`perf:bundle-budget`** companion — asserts hot paths don't import barrel/full-package modules (e.g. full `d3`, authed providers in landing); prevents bundle regression | **(new, Phase 7)** |
| `e2e/estimate-editor-interaction-performance.spec.ts` | Playwright (ms, pinned profile) | **`perf:gate`** interaction-latency slice — supplies the **ms** budgets jsdom cannot (keystroke p95 < 16 ms, tab switch, tree expand <= 16/50 ms per `03` §4.2c); obeys `25` §5 methodology | **(new, Phase 9)** |

> These 8 files are the Bible-mandated coverage floor; each MUST exist and pass
> before its phase's DoD is met, and all are folded into the Phase-9 `perf:gate`
> aggregate (§3). jsdom files assert **COUNTS**; the `e2e/*` spec is the only one
> permitted to assert **ms** (per `25` §5 — never derive a time budget from jsdom).

---

## 2. Phase → validation mapping

Phase order pinned by contract §2. Every phase runs **`bun run validate`** as the
floor (it is the only enforced gate). Listed extras are *in addition*. Commands
without "(new…)" exist today; "(new, Phase N)" are planning items.

| Phase | Required commands (beyond `bun run validate`) | Manual / browser QA |
|---|---|---|
| **0 — Baseline, instrumentation, guardrails** | `ANALYZE=true bun run build` (bundle reality); `perf:measure-routes` + `perf:check-routes` (capture medians); `perf:profile-peak-load`; `bun run scripts/build-performance-query-inventory.ts`; `bun run scripts/benchmark-proposal-workbook.ts`; build the real DB fixture **(new: `perf:seed-db-fixture`)** + **(new: `perf:profile-peak-load-large`)**; **measure-only** baselines for **(new: `perf:query-count`)**, **(new: `perf:realtime-cost`)**, **(new: `perf:payload-size`)**, **(new: `perf:memory-leak`)**, **(new: `perf:tbt`/exec-time)**; wire the **(new: RUM field dashboard)** reporter (D-016) + capture field p75/p95 baseline; stand up the static guardrails **(new: SC-1**, gated on Q-10**, SC-2, SC-3 `no-hot-barrel-imports`, SC-4 `select("*")` grep, SC-5 unwrapped `auth.uid()` grep, SC-6** `src/components/ui/tree` — full strictness after Phase 2**)** | Chrome Performance capture of every matrix flow to anchor synthetic numbers; ratify all PROPOSED budgets (file 03 §6) incl. provisional channel/query/payload/heap ceilings (Q-28..Q-31); methodology rules (`25` §5: ≥20 samples, p95/p99, cold/warm split, no jsdom-derived ms) bind every latency baseline captured here |
| **1 — Canonical indexes/selectors/perf utils** (structural-hash signature, `patchAndMarkStale` helper, query-key factory) | `test:dom` focused on new util tests + `tests/vitest/perf/*` (must stay green — relief/memoization/cursor); `type-check` | Spot-check one estimate sheet: keystroke isolation unchanged |
| **2 — Tree kernel unification** (headless TreeIndex + ops) | focused `vitest run tests/vitest` tree groups (dnd/filter/reorder/context-menu/bulk-selection); `test:e2e` tree specs (`estimate-tree-dnd.spec.ts`); **(new: `perf:render-budget`)** for tree expand/filter once it exists; **`bun run storybook:validate` (REQUIRED — a11y + visual, not in `validate`)**; **GATE-TRANSIENT-SURVIVAL** (jsdom, per family); **(new: `perf:memo-guard-snapshot`, SEV-5)** (sheet comparators touched) | Manual: expand/collapse, filter, drag-drop on all 7 tree families incl. Share viewer + Templates; **GATE-DND-AFFORDANCE** (manual, per family — drop indicator/ghost/parent) |
| **3 — Estimate sheet decomposition + render isolation** (break `editableRows` fan-out) | `tests/vitest/perf/*` (relief/memoization/cursor/baseline) — **the load-bearing gate**; `perf:profile-peak-load`; **(new: `perf:profile-peak-load-large`)**; full `test:dom`; `test:e2e` (`estimates-crud-latency.spec.ts`); **(new: `perf:query-count`)** (decomposition adds 0 new round-trips / 0 N+1 on sheet load); **(new: `perf:realtime-cost`)** (inbound 0-render preserved); **(new: `perf:memory-leak`)** (`subscribeRow` symmetry gates Phase-3 exit); **(new: `perf:tbt`/exec-time)** (decomposition is the lever that moves TBT); **`bun run storybook:validate` (REQUIRED — a11y + visual)**; **GATE-EDIT-INIT / GATE-EDIT-RECONCILE / GATE-EDIT-IDENTITY** (Step 4); **GATE-NO-TOTAL-FLASH** (Step 5); **GATE-STALE-BADGE-EAGER** (Step 7); **GATE-CELL-KEYBOARD** (Step 9); **GATE-TRANSIENT-SURVIVAL** (per step); **GATE-URL-SYNC** (URL ⇄ state survives decomposition); **(new: `perf:memo-guard-snapshot`, SEV-5)** (sheet comparators touched) | Chrome capture: keystroke into cost cell, confirm 0 cross-area work + left-tree DFS not doubled (Q-sheet/tree seam); tab switch |
| **4 — Query/server-action/DTO standardization + select discipline** | `bun run build` (**`use server` async-export check**); `prove:estimate-list-summaries`, `prove:estimate-tabs-rls`; `bun run scripts/build-performance-query-inventory.ts` (wildcard count down); **(new: `perf:query-count`)** (0 refetch on hydrated first paint); **(new: `perf:payload-size`)** (trimmed `.select` reads); **(new: `prove:action-authz`)** (no-session/wrong-role wrapped action → `ok:false FORBIDDEN`, fail-closed); **(new: `perf:scoped-delta-totals`, RISK-25/SEV-3)** (recompute-from-`affectedNodeIds` byte-equal to full-tree recompute over the post-mutation cache — proves the SERVER scope hint is complete, independent of render-count) | Manual: sheet load, list load — verify behavior unchanged; DevTools network round-trip count |
| **5 — Optimistic mutation lifecycle** (1 adapter, standard rollback) | full `test:dom` (mutation/rollback DOM tests); `test:e2e` CRUD + collaboration specs; `tests/vitest/perf/*` (no render regression); **(extend: `optimistic-mutation-contract.test.tsx` FORBIDDEN-path axis)** (server FORBIDDEN → rollback restores pre-mutation state; **contract defined in doc 11 §1–§5**); **GATE-FOCUS-AFTER-MUTATION** (focus preserved after insert/delete/move); **(new: `perf:memo-guard-snapshot`, SEV-5)** (sheet comparators touched) | Manual: force a server error → confirm rollback on notifications + collaborator-role (had NO rollback before, contract §1 State) |
| **6 — UI primitive consolidation + loading cleanup + DS duplication lint rule** | `lint:design-system` + `lint:design` (+ **new DS duplication rule** added here); **`bun run storybook:validate` (REQUIRED — a11y + visual, not in `validate`)**; `test:dom` (skeleton/primitive + retained dialog focus-trap/return-focus assertions) | Visual QA: cards, icon-buttons, bulk-action toolbar, tab strip, skeletons; `motion-reduce` honored |
| **7 — Bundle/code-splitting/runtime cleanup** (provider topology, d3 dedup, share charts) | `ANALYZE=true bun run build` (confirm provider/d3/share-chart wins); `bun run build`; `test:e2e` (`landing-audit.spec.ts`, `shared-link-receiver.spec.ts`, streaming); **(new: `perf:bundle-budget`)**; **(new: `prove:workshop-auth-boundary`)** (unauthenticated `/workshop/**` GET → 302 login + RSC structural check — proves the provider move didn't drop auth, RISK-19); **(new: `perf:realtime-cost`)** (realtime-auth-bridge off public bundle); **GATE-URL-SYNC** (URL ⇄ state survives the provider-topology + streaming moves) | Manual: load landing + `/share/[token]` with network panel — confirm no supabase-js/authed providers; charts lazy; **manual CLS check** (Chrome DevTools Layout Shift) before/after streaming — fallback pixel-isomorphic to resolved layout |
| **8 — Supabase/RPC/index/RLS performance pass** (FK indexes, chart RPC, homebase RPC) | `prove:rls-initplan`, `prove:estimate-list-summaries`, `prove:unify-kinds`; **(new: `perf:query-count`)** (homebase round-trips down; chart RPC push-down); **(new: `perf:payload-size`)** (charts buckets-only, library bounded); `get_advisors` (security); **(new: `prove:project-chart-buckets`)** cross-tenant denial; **(new: `prove:workspace-homebase-summary`)** cross-tenant denial; **(extend: `prove:estimate-tabs-rls`)** CTE multi-role axis (non-sheet-member → empty node-scope set); `bun run build` if actions touched | Manual + DevTools: homebase load, charts load — round-trip + latency vs Phase 0 baseline (planning-only: migrations are items w/ risk+validation, not applied — contract §4) |
| **9 — CI benchmark gates & regression prevention** | Wire + run **(new: `perf:gate`)** = `perf:render-budget` + `perf:query-count` + `perf:realtime-cost` + `perf:payload-size` + `perf:memory-leak` + `perf:tbt`/exec-time + `perf:bundle-budget` + `perf:profile-peak-load(-large)` + tightened `perf:check-routes` + the static guardrails **(new: SC-1** (Q-10-gated)**, SC-2, SC-3, SC-4, SC-5, SC-6** at full strictness)**; flip the **(new: RUM field dashboard)** LCP/INP/CLS gates to assert field p75/p95; wire the security `prove:*` set (`prove:workshop-auth-boundary`, `prove:project-chart-buckets`, `prove:workspace-homebase-summary`, `prove:estimate-tabs-rls` multi-role, `prove:action-authz`) into the gated set; wire orphan benchmarks with thresholds | Confirm CI runs the new gate (answers Q: does CI run beyond `validate`?) |
| **10 — Documentation, examples, enforcement** | `bun run validate`; **`bun run storybook:validate`**; re-run **`perf:gate`** + the security `prove:*` set to confirm green (regression re-run — no new failures vs Phase 9) | Docs review; confirm every new gate documented + referenced from this matrix |

> **Track F (`use cache` adoption track — not a pinned numbered phase, runs per `26`):**
> the cache gates **(new: `lint:no-request-in-cache`)** (no `cookies()`/`headers()`
> inside a `use cache` scope), **(new: `prove:no-private-in-public-cache`)** (no
> stale private/auth data in a cached/public scope), and — at the **C1** public-share-chrome
> step — **(new: `prove:share-*`)** (the public `/share/[token]` cache layer is tenant- and
> token-isolated under Next 16 Cache Components: no stale serve after revoke/expire/rotate;
> no P10 password-gate bypass from cache; `cacheTag` keyed on publication id never a raw token;
> no cross-recipient snapshot bleed — **mitigation gate for RISK-23, Critical**, fail-closed)
> are REQUIRED on every Track-F change and fold into `perf:gate`/CI alongside the Phase-9
> enforced set.

---

## 3. Gate summary (the proposed enforced set after Phase 9)

Today the enforced set is exactly **`bun run validate`** (no perf/e2e/bundle).

**After Phase 9 the enforced set is:** `validate` **+** `perf:gate` (the perf
aggregate — it composes `perf:render-budget`, `perf:query-count`,
`perf:realtime-cost`, `perf:payload-size`, `perf:memory-leak`, `perf:tbt`/
exec-time, `perf:bundle-budget`, `perf:profile-peak-load(-large)`, tightened
`perf:check-routes`, the RUM field-percentile LCP/INP/CLS gates, and the static
guardrails SC-1 (Q-10-gated) / SC-2 / SC-3 / SC-4 / SC-5 / SC-6 (full strictness
after Phase 2)) **+** the
security `prove:*` set (`prove:workshop-auth-boundary`,
`prove:project-chart-buckets` cross-tenant, `prove:workspace-homebase-summary`
cross-tenant, `prove:estimate-tabs-rls` CTE multi-role, `prove:action-authz`, and
the existing `prove:rls-initplan`/`prove:estimate-list-summaries`/etc.). All
security gates fail **closed**. **`bun run storybook:validate` (a11y + visual) is
NOT in `validate`** and remains a separately-invoked REQUIRED gate at Phases 2/3/6.

**Phase 10 re-runs the final gate** (`validate` + `perf:gate` + the security
`prove:*` set + `storybook:validate`) to confirm **no regression** versus Phase 9
— a clean green re-run, not new work.

All latency/percentile members of `perf:gate` obey the `25` §5 methodology
(≥20 samples, p95/p99 interaction budgets, cold/warm split, never derive a TIME
budget from jsdom). Until these exist, the 4 jsdom render-isolation gates in
`tests/vitest/perf/` remain the only meaningful hard perf gates and MUST stay
green through every phase.

---

## 4. Cross-references

- Budgets & matrix: `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md`.
- Phase 0 mechanics: `06_PHASE_0_BASELINE_PLAN.md`. Phase 9 gates:
  `09_*` / Phase-9 plan.
- **Round-2 gate sources:** UX/a11y gates → `20_UX_UI_AND_INTERACTION_PLAN.md`;
  security `prove:*` gates → `22_SECURITY_AND_RLS_THREAT_PLAN.md`; query-count /
  realtime-cost / payload-size gates → `23_NETWORK_AND_DATA_FLOW_PLAN.md`; memory-
  leak / TBT-exec-time / RUM dashboard / measurement methodology →
  `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md`; Track-F `use cache` gates → `26`;
  static guardrails SC-1..SC-6 → `27`; optimistic-mutation/rollback contract →
  `11`; scoped-delta (RISK-25/SEV-3) + memo-guard-snapshot (SEV-5) → `16`.
- Open questions seeded here (record in `19_OPEN_QUESTIONS.md`): (a) `lint:design`
  **is** enforcing (engine present) — contract caveat corrected; (b) does CI run
  beyond `validate`? (no `.github/` inspected); (c) target device/network profile
  for binding budgets; (d) tighten loose route budgets in place vs new warm-budget
  file. Risks/decisions cross-ref `16_RISK_REGISTER.md` / `17_DECISION_LOG.md`.
