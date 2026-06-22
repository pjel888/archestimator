# 25 — Observability, RUM & Resource Budgets

> **Status:** Round-2 plan-pack artifact (Writer W-OBS). Authoritative inputs:
> `_research/_SYNTHESIS.md` (V2 IMPROVEMENT CONTRACT + §V2-FACTS),
> `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md` (the per-flow benchmark matrix this
> doc layers field/resource budgets onto), `06_PHASE_0_BASELINE_PLAN.md` (the
> measurement sequence S1–S8). Conventions per contract §4: Priority `P0–P3`,
> Risk `Low/Medium/High/Critical`, evidence `path:line — observation`. All new
> scripts/gates are marked **(new, Phase N)** — none exist today.
>
> **Hard constraint (contract §4):** planning only. No `src/**`, `tests/**`,
> `e2e/**`, `scripts/**`, `supabase/**`, or config changes. Every artifact below
> is a proposal to be built in a future implementation session.

---

## 0. Why this doc exists (the three CATEGORY omissions)

The round-2 panel scored **performance rigor 88/100** with three *category*
omissions for a performance-focused pack:

1. **No field RUM.** Without real-user LCP/INP/CLS/TTFB, the pack's headline
   budgets (LCP < 2.5 s, the §4.2 interaction ceilings in file 03) are
   **unmeasurable in production** — they only exist as jsdom counts and loose
   Playwright timings, both self-flagged non-production (file 03 §0; file 06 §1).
2. **No memory / leak budget.** Nothing today asserts that listeners, timers,
   subscriptions, and observers return to baseline after unmount, or that heap
   stays bounded over a long edit session (**RISK-18**).
3. **No execution-time / TBT budget.** File 03 §4.4 budgets **kb only**; a small
   chunk can still be expensive to hydrate and evaluate. With a 2949-LOC client
   island and ~196 `"use client"` modules (verified, §3), hydration + script-eval
   — not transfer size — drives TTI and INP-on-load.

Plus two narrower gaps this doc owns: **server-render / TTFB compute** (no target
exists) and **measurement-methodology rules** (today's gates use too few samples
and mix mean/median with percentiles).

**Division of labour:** file 03 keeps the per-flow **benchmark matrix** (§5) and
the kb/route/render-count budget categories (§4); **this doc** owns the
field-RUM, memory/leak, execution-time/TBT, server/TTFB, and methodology layers,
and ties file-03 §4 budgets to **field percentiles** rather than jsdom counts.
File 03 should reference this doc from §4.1 (route → TTFB), §4.2 (interaction →
field INP), §4.4 (bundle kb → TBT/exec-time), and the matrix's Landing /
Estimate-sheet-initial-load / Charts / Share rows.

---

## 1. Field Web-Vitals / RUM wiring (D-016)

### 1.1 Verified current state (why budgets are unmeasurable today)

- **`@vercel/speed-insights` is NOT installed.** Only `@vercel/analytics@^2.0.1`
  is present (`package.json:62`). Page-view analytics ≠ Web Vitals; `@vercel/analytics`
  does **not** emit LCP/INP/CLS/TTFB. The root layout mounts only
  `VercelWebAnalytics` (`src/app/layout.tsx:3,28`) — no vitals reporter.
- **`WebVitalsProbe` is dev-gated, console-only, never POSTs.** It calls
  `useReportWebVitals` but early-returns unless `NEXT_PUBLIC_PERF_TRACE === "1"`
  and then only `console.log`s (`WebVitalsProbe.tsx:8-13`). It collects FCP, LCP,
  INP, CLS, TTFB but ships them **nowhere**.
- **It is mounted only on the workshop shell.** `WorkshopPageShell.tsx:113`
  renders `<WebVitalsProbe />`; landing and `/share/[token]` mount **no** vitals
  reporter at all, so two of the routes that most need a field LCP budget
  (marketing + public share) emit **zero** vitals even in dev.
- **`perf:check-speed-insights`** (`package.json:50` →
  `scripts/check-vercel-speed-insights-readiness.ts`, file 03 §1.2) checks
  *config readiness*, not field metrics — and the dependency it checks for is not
  installed, so it cannot be a live data source.

**Conclusion:** the pack's LCP < 2.5 s and INP interaction budgets are currently
**unmeasurable in the field**. They must be wired to a real RUM stream before
Phase 9 can enforce anything beyond jsdom counts.

### 1.2 Owner-ruled approach — D-016 (REVERSED)

This is **D-016** in `17_DECISION_LOG.md` (field-RUM wiring approach). **The owner
reversed the earlier "install `@vercel/speed-insights`" lean (Q-28,
`19_OPEN_QUESTIONS.md`):** the package MUST NOT be added. A repo test —
`tests/vitest/vercel-web-analytics-integration.test.ts` (telemetry-lock guard) —
**explicitly forbids the `@vercel/speed-insights` dependency**; the project's
telemetry lock is **provider-dashboard / export-only Speed Insights, no package
change**. Any recommendation to `npm i @vercel/speed-insights` is therefore out of
scope and would fail that test.

| | **DEFAULT — no package change** | Alternative — first-party `/api/vitals` sink |
|---|---|---|
| **When** | Always (the owner-ruled baseline) | ONLY if the owner accepts the PII/consent work below |
| **Wiring** | Rely on **Vercel's provider-dashboard Speed Insights** (zero-config on Vercel deploys — collected by the platform, **no app dependency, no `<SpeedInsights />` import**), plus the existing dev **`WebVitalsProbe`** (`WebVitalsProbe.tsx:8-13`) for local FCP/LCP/INP/CLS/TTFB console traces. Field percentiles come from the Vercel dashboard. | Keep `useReportWebVitals` in `WebVitalsProbe`; replace the dev `console.log` with `navigator.sendBeacon('/api/vitals', …)`; mount the probe in **root** `layout.tsx` (not just `WorkshopPageShell.tsx:113`) so landing/share also report |
| **Percentile surface** | Vercel dashboard p75 per route (LCP/INP/CLS/FCP/TTFB) — read from the provider console/export, no query infra | Own a `/api/vitals` route → write to a metrics table / log drain; build a p75/p95 query per route ourselves |
| **Pros** | Zero dep, zero bytes, **passes the telemetry-lock test**; no PII/consent surface added; INP/route attribution out of the box | Full control of retention, sampling, PII scrubbing; works on any host; landing/share covered without relying on Vercel hosting |
| **Cons** | Field data lives in the Vercel dashboard (no in-repo query); tied to Vercel hosting; dashboard not in CI | We build storage + p75/p95 aggregation + a dashboard; **must** resolve retention/sampling/session-id/share-page PII (Q-28) before shipping |
| **kb impact** | **None** — no import, no First Load JS delta (this is the point of the lock) | Negligible (reuses already-shipped `next/web-vitals`) |

**Default (owner-ruled):** **no package change** — use the provider-dashboard
Speed Insights (zero-config on Vercel) + the dev `WebVitalsProbe`. The
first-party `/api/vitals` sink is the **alternative only if the owner accepts the
PII/consent work** in §1.3. **Do not install `@vercel/speed-insights`** — it is
forbidden by `tests/vitest/vercel-web-analytics-integration.test.ts` and by the
reversed D-016. For the workshop dev probe, mounting in root `layout.tsx` (not
just `WorkshopPageShell.tsx:113`) is still the right place so landing and
`/share/[token]` are covered in dev.

### 1.3 What to expose, and the PII/consent question

- **Expose p75 (and p95 for INP) per route** for: **LCP, INP, CLS, FCP, TTFB**.
  Route attribution matters because landing, `/share/[token]`, and the workshop
  shell have wildly different budgets.
- **RUM field dashboard (new, Phase 0 wire → Phase 9 gate):** a per-route
  p75/p95 view of the five metrics. In Phase 0 it captures the field baseline; in
  Phase 9 the LCP/INP/CLS gates assert against **field p75/p95**, not jsdom.
- **PII / consent (Q-28, `19_OPEN_QUESTIONS.md` — owner-ruled):** vitals payloads
  carry route paths and timing — low-PII but still user telemetry. **The owner
  ruled the DEFAULT is the provider-dashboard Speed Insights with no package
  change**, which keeps field data in the Vercel platform console and adds **no
  new in-app collection path or consent surface**. The first-party `/api/vitals`
  sink is taken up **only if the owner accepts** the PII/consent work: deciding
  retention window, sampling rate, whether to attach a (hashed) session id, and
  whether share-page (unauthenticated, external) vitals are collected at all. If
  that alternative is approved, the safe sub-default is no session id, route-path
  only, 90-day retention, sample 100% until volume forces sampling. **Do not
  install `@vercel/speed-insights`** under either path (telemetry-lock test +
  reversed D-016).

### 1.4 Tie file-03 budgets to FIELD percentiles

This is the load-bearing cross-reference. File 03 §4.1/§4.2 and the matrix's
LCP/INP cells must read **field p75/p95 from the RUM stream**, not jsdom counts or
single-machine Playwright medians:

- **LCP < 2.5 s** → field **p75** per route (landing, share, workshop shell).
- **INP** → field **p75** route-level **and** p95 for the keystroke/tab/expand
  interactions in file-03 §4.2 (jsdom asserts the *render-count* invariant; the
  *ms* budget is the field INP — never derive ms from jsdom, §5).
- **CLS / TTFB** → field p75 per route (TTFB also gated server-side, §4).

---

## 2. Memory & leak budget (RISK-18)

**No memory budget exists today.** This section defines **`perf:memory-leak`**
(new, Phase 0 measure → Phase 9 gate) and owns **RISK-18** (client memory growth /
listener-timer-subscription-observer leak).

> **Q-30 / Q-34 split (do not conflate):** payload-**size** ceilings (rows /
> serialized bytes per hot-path response) are **Q-30**, owned by doc `23`
> (`perf:payload-size`). The **client memory / leak ceiling** is **Q-34**, owned
> by *this* doc (`perf:memory-leak`). This §2 cross-references **Q-34**, not Q-30.

### 2.1 The leak gate — mount/unmount baseline

A jsdom (or Playwright, for observer fidelity) gate that mounts then unmounts the
heavy surfaces and asserts every resource count returns to its pre-mount
baseline. Surfaces: the **estimate sheet** + **estimate tree** + **cursor
broadcast layer** (mount → interact → unmount):

- **Event listeners.** `EstimateSheetContent.tsx` registers (non-exhaustive)
  `pointermove` on the surface (`:915-916`), three `keydown` handlers
  (`:1723-1724`, `:1736-1737`, `:2275-2276`), the custom
  `archestimator:add-library-item` window listener (`:2284-2285`), and the
  `INSERT_ESTIMATE_TEMPLATE_EVENT` (`:2305-2306`) and `INSERT_PROJECT_SOURCE_EVENT`
  (`:2317-2318`) window listeners. **Do NOT treat this list as the closed
  checklist** — the Phase-3 decomposition moves and renames handlers. The gate
  assertion is **net-zero retained over ALL registered listeners**: enumerate the
  full `addEventListener`/`removeEventListener` set at implementation time **via
  grep** (not from this list) and assert `addEventListener` count ==
  `removeEventListener` count after unmount (net 0 retained). This keeps the gate
  robust to the decomposition.
- **Timers.** `use-estimate-cursor-broadcast.ts` holds a `setInterval`
  (`:264`, cleared `:272`) and a throttled `setTimeout` (`:297`, cleared `:247`).
  The gate asserts no live timer survives unmount.
- **Subscriptions.** Zustand `.subscribe` callbacks (e.g. `PerformanceMonitor`
  `useNavigationUiStore.subscribe` returns its unsub, `performance-monitor.tsx:10,29`)
  and TanStack/realtime channel subscriptions must all unsubscribe on unmount.
- **IntersectionObserver.** Any observer created by the surface (and the NeatWireframe
  pattern, confirmed exemplary in the contract) must `disconnect()` on unmount —
  asserted observer-count back to baseline.
- **Per-row store symmetry (RISK-18 core).** The **new per-row
  `editable-rows-store.ts`** (file 04 §7.2 — the central Phase-3 fix that severs
  the `editableRows` map-identity fan-out, `EstimateSheetContent.tsx:1093/1401`)
  introduces a `subscribeRow(rowId, cb)` API. **Every `subscribeRow` MUST return a
  symmetric unsubscribe, and the gate MUST assert that after unmounting a sheet
  with N rows, the store holds 0 row subscribers.** A per-row subscription model
  is exactly where leaks hide (one un-cleaned subscriber per row × thousands of
  rows). This assertion is a **hard gate** the moment that store lands in Phase 3.

### 2.2 Heap-growth ceiling — scripted edit session

A Playwright (real Chrome, `performance.measureUserAgentSpecificMemory()` or
heap-snapshot diff) script that drives a **~5-minute edit session** against the
**large DB fixture** (`perf:seed-db-fixture`, file 06 §2.1): repeated cost-cell
edits, tab switches, tree expand/collapse, add/delete row, open/close proposal
preview. Assert **heap after a forced GC at the end ≤ baseline-after-warmup ×
(1 + ε)** — the ceiling value (ε) is **Q-34** (owner = eng/measurement; safe
default = grows no more than 15% over the session, ratified from the Phase-0
baseline run). Because the fixture is the gating dependency, this is a Phase-0
*measure* and a Phase-9 *gate* (it cannot bind until the fixture exists — file 06
§2.1 fallback/RISK-15 applies).

### 2.3 Gate name & phase

- **`perf:memory-leak` (new, Phase 0 measure → Phase 9 gate).** The mount/unmount
  symmetry assertions can run in jsdom **now** (listeners/timers/subscriptions);
  the IntersectionObserver + heap-ceiling parts need Playwright + the fixture.
  The `subscribeRow`-symmetry assertion is added the moment `editable-rows-store.ts`
  lands (Phase 3) and gates Phase 3 exit.

---

## 3. Bundle EXECUTION-time / TBT budget (distinct from kb)

File 03 §4.4 budgets **kb only**. A 30 kb chunk that hydrates a 1881-LOC
component can block the main thread longer than a 100 kb static chunk. This
section defines an **execution-time / Total-Blocking-Time** budget — **`perf:tbt`
(new, Phase 0 measure → Phase 9 gate)**.

**Verified scale of the problem:**

- `EstimateSheetContent.tsx` = **2949 LOC**, exported component span `:1042-2925`
  (~1884 LOC) — §V2-FACTS / contract correction 5. Highest-blast-radius client
  island in the repo.
- **~196 `"use client"` modules** (verified: `grep -rl '"use client"' src` =
  196). Every one is hydration + script-eval cost on the routes that include it.

**Budgets (measured via Chrome Performance capture — file 06 S7 — + Lighthouse):**

- **Total Blocking Time** for the **estimate-sheet initial load** (Chrome
  Performance / Lighthouse TBT). Proposed: TBT p75 < a Phase-0-ratified ceiling
  (Lighthouse "good" is < 200 ms; the authed sheet will baseline higher — set the
  ceiling from the Phase-0 number × margin, not from the lab ideal).
- **Main-thread long-task budget:** count and total duration of long tasks
  (> 50 ms) during estimate-sheet load and first interaction. Proposed: **0 long
  tasks > 100 ms** after the Phase-3 decomposition; the per-row store + memo
  guards should keep hydration chunked.
- **Hydration-time ceiling for `EstimateWorkspaceClient`** (the island that
  mounts `EstimateSheetContent` — one of its 8 src consumers, §V2-FACTS): measure
  time from chunk-eval-start to interactive via a `performance.mark`/`measure`
  pair around hydration (instrumentation proposed for Phase 0) or React's
  `onRender` profiler. Proposed ceiling ratified from Phase-0 baseline.

**Why this is separate from kb:** Phase 7 (bundle/code-split) can shrink kb while
TBT stays bad if the same JS still hydrates. The Phase-3 decomposition (smaller
islands, per-row subscription) is the lever that moves TBT — so `perf:tbt` is the
gate that *proves* the decomposition helped TTI/INP-on-load, which a kb budget
alone cannot.

**Phase:** measured in Phase 0 (S7 Chrome capture + a Lighthouse run), gated in
Phase 9. Cross-reference from file 03 §4.4.

---

## 4. Server-render / RSC compute + TTFB budget

**TTFB has no target today.** This section adds a per-route **TTFB budget** and a
**server-side traversal-cost budget** for the export/snapshot/publication cluster.

- **TTFB p75 per authed route** (workshop shell, project list, estimate sheet,
  charts). Source: the **field RUM stream** (§1, TTFB is one of the five emitted
  metrics) **plus** the `perf:measure-routes` `_rsc=` timing as a lab cross-check.
  Proposed ceiling ratified from Phase-0 baseline × margin. This directly covers
  the homebase serial-tail finding (`workspace-repository.ts:1126-1222`, contract
  §1 Data) — collapsing the serial awaits should *show up* as a TTFB drop.
- **Server-side traversal cost at the large fixture.** R3 §7 notes the
  publication/snapshot/export cluster each **independently DFS the full tree
  server-side**: `lib/publication/snapshot.ts` and `lib/proposal-export/build-proposal-export-model.ts`
  (plus `lib/project-charts/`) all re-walk the tree per request. Budget the
  **server compute time** for publish, snapshot, and export-model build at the
  1000+ row fixture (measured via `benchmark-proposal-workbook.ts` for export —
  file 03 §1.4 — extended with a snapshot/publication timer). Proposed: server
  build time per operation ≤ a Phase-0-ratified ceiling at 1000/2500 rows.
- **Apply the shared memoized `rollup` to the SERVER DFS cluster too.** The
  Phase-1 canonical totals/rollup primitive (contract §3 track 3; the structural
  -hash + memoized index) must be applied to the **server** traversals
  (snapshot/export/charts), not only the client totals Map. Today client and
  server re-implement the same DFS; the server side is unbudgeted and runs on
  every publish/export. Folding it into the shared `rollup` is a TTFB and
  server-CPU win. Record as a Phase-1/Phase-8 cross-reference; gate via the
  server-compute budget above.

**Phase:** TTFB baseline in Phase 0 (S5 `_rsc` + RUM); server-traversal baseline
in Phase 0 (S8 `benchmark-proposal-workbook` + a proposed snapshot timer); gated
in Phase 9.

---

## 5. Measurement methodology rules (binding on every latency gate)

These rules bind every percentile/latency gate in the pack (file 03 §4, file 15).
They fix the panel's methodology gaps.

1. **≥ 20 samples for any latency-percentile gate.** `perf:measure-routes`
   **defaults** to `RUNS = 3`, but `RUNS` is **env-overridable** —
   `process.env.RUNS ?? "3"` (`measure-route-transitions.ts:20`). So **no code
   change is needed**: the requirement is a **gate-invocation contract**, not a
   source edit. The gate MUST be invoked with **`RUNS >= 20`** (3 is far too few
   to estimate a p75/p95 stably), and **CI pins that env** (`RUNS=20+`) so the
   percentile gate always runs with enough samples per scenario per profile.
   (Field RUM percentiles, §1, are exempt — they aggregate thousands of real
   samples; the rule targets *lab* gates.)
2. **Express ALL interaction budgets as p95/p99 — never mean/median.** A mean
   hides the tail that users feel. File-03 §4.2 interaction ceilings and every
   keystroke/tab/expand/drag budget are **p95** (p99 for the cost-cell keystroke,
   the highest-frequency interaction). `perf:measure-routes` reports medians
   today (`measure-route-transitions.ts:224`) — those become *informational*, not
   gates.
3. **Separate COLD vs WARM explicitly, per row.** Cold = first visit, empty
   caches (HTTP + TanStack + RSC), no warm module graph; warm = repeat. Every
   latency matrix row in file 03 must carry **two** cells (cold / warm) with
   distinct budgets (cold is naturally looser). Never report a single blended
   number.
4. **FORBID deriving a TIME budget from jsdom.** jsdom asserts **COUNTS only**
   (render counts, compute counts — the 4 existing gates, file 03 §1.3). Any
   **ms** budget MUST come from **Chrome (Performance panel / Lighthouse)** or
   **Playwright on a pinned profile**, or from **field RUM**. The
   `keystrokeMsAvg/Worst` numbers the jsdom baseline *records*
   (`estimate-sheet-render-baseline.test.tsx`) are **directional only** and may
   NOT be promoted to a binding ms gate. This is the single most important rule —
   it prevents the pack from "passing" a fake latency gate.
5. **Pin the device/network profile** with every number (the file-06 §7 target
   -profile open question). A percentile without a profile is meaningless.

---

## 6. Phase → observability-gate mapping

| Gate / artifact | Owns | Phase 0 (baseline) | Phase 9 (enforced) |
|---|---|---|---|
| RUM field dashboard **(new)** | §1 field p75/p95 LCP/INP/CLS/FCP/TTFB per route | Wire reporter (D-016) + capture field baseline | LCP/INP/CLS/TTFB gates assert field p75/p95 |
| `perf:memory-leak` **(new)** | §2 listener/timer/subscription/observer symmetry + `subscribeRow` symmetry + heap ceiling | Capture baseline counts + heap curve; jsdom symmetry runnable now | Hard gate; `subscribeRow` symmetry gates Phase-3 exit |
| `perf:tbt` / exec-time **(new)** | §3 TBT + long-task + `EstimateWorkspaceClient` hydration time | Chrome capture (S7) + Lighthouse TBT baseline | Hard gate; proves Phase-3 decomposition |
| TTFB + server-traversal budget **(new)** | §4 TTFB p75 per route + server DFS cost | `_rsc`/RUM TTFB + `benchmark-proposal-workbook` baseline | Gate TTFB + server build time; shared `rollup` applied |
| Methodology rules (§5) | binding contract on all latency gates | adopt before any number is treated as a gate | enforced by construction (≥20 samples, p95/p99, cold/warm, no-jsdom-ms) |

- **Phase 0 (baseline):** wire the RUM reporter (D-016) and capture field
  baselines; capture memory baseline counts + heap curve; Chrome TBT/long-task +
  hydration baseline; TTFB + server-traversal baseline. Nothing *gates* yet —
  Phase 0 only measures and ratifies ceilings (file 06 §6 exit criteria).
- **Phase 9 (enforced):** all of the above become hard gates folded into the
  `perf:gate` aggregate (file 03 §2). The `perf:memory-leak` `subscribeRow`
  -symmetry assertion is the exception — it gates **Phase-3 exit** the moment the
  per-row store lands, not Phase 9.

**New open questions for `19_OPEN_QUESTIONS.md`:** **Q-28** RUM sink choice & PII
(D-016 **reversed** — owner product+eng; default = provider-dashboard Speed
Insights, **no package**; `/api/vitals` only if PII/consent accepted; never install
`@vercel/speed-insights`); **Q-34** client memory/leak (heap-growth) ceiling value
(owner eng/measurement; default +15% over a 5-min session, ratify from Phase-0).
