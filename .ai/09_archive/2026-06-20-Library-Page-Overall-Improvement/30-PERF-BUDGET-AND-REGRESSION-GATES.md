# 30 — Performance Budget and Regression Gates

> **Status:** PROVISIONAL — resolves
> [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md)
> C-015. Every numeric target in §3 is an **industry-default** threshold, not
> a codebase-derived budget. Budgets become **final** only after the Phase 0A
> baseline is measured and stored (§2); pre-0A the bundle/Lighthouse gates in
> §4 are **advisory, not blocking**. The Phase 0A baseline prerequisite
> (extending `scripts/seed-performance-test-data.ts` to cover
> `cost_library_items` — currently it does not, per
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
> §Performance Reality) is owned by the Perf lead (evidence: `EV-0A-PERF-BASELINE`).
> Living document, initialized 2026-06-21 by the Ultrawork audit loop. Defines
> the performance budget, measurement schema, and regression gates for the
> Library page. Replaces the provisional thresholds in
> [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md)
> with final budgets after Phase 0A baseline measurement.
>
> **Scope:** Perf budget per surface, measurement methodology, regression
> gates, artifact schema, and per-row perf targets.
>
> **Companion docs:** [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md),
> [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) (§11 — GPU one-blur-per-region budget).
>
> **§3 gap closure status (auditor index, 2026-06-21):** all five doc-25 §3 gaps for
> this doc are closed inline: (1) **per-surface perf budget** — §3 "Per-Library-surface
> budget" table binds every budget to a real file:line (12 surfaces, incl dense mode +
> glass shell); (2) **measurement methodology** — §2 (Phase 0A seed tiers, conditions,
> tools); (3) **regression gates** — §4 pre-merge + phase-exit + no-go, with 12-dim
> gate-row footers; (4) **artifact schema** — §5 JSON schema + comparison format; (5)
> **fallback decision tree** — §6 (7-node pagination/virtualization/server-search/escalation
> ladder). C-015 (provisional vs final budgets) is resolved by the explicit "PROVISIONAL
> until Phase 0A" marking on every §3 table + the §4 gate-row footer stating the baseline
> is pre-registered execution evidence (`EV-0A-PERF-BASELINE`), not a measured number.

---

## 1. Purpose

Performance must be measured, budgeted, and gated — not assumed. This doc:

1. **Defines the perf budget** per Library surface.
2. **Defines the measurement methodology** — how to measure, what tool, what conditions.
3. **Defines the regression gates** — what must pass before merge.
4. **Defines the artifact schema** — how to store and compare measurements.
5. **Defines the fallback decision tree** — when to choose pagination vs virtualization vs server search.
6. **Resolves C-015** from [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) — provisional thresholds become final after Phase 0A.

---

## 2. Measurement methodology

### Phase 0A baseline (must complete before any other phase)

1. **Seed the database** with a realistic beta-scale dataset:
   - 500 components per workspace (worst case)
   - 50 folders per workspace
   - 20 templates per workspace
   - 5 workspaces for cross-workspace testing
2. **Measure the current Library page** (before any improvements):
   - LCP, INP, CLS (Core Web Vitals)
   - TTFB, FCP, LCP (loading sequence)
   - JS bundle size (initial + lazy-loaded)
   - Response body bytes (library query)
   - Number of network requests
   - Memory usage (Chrome DevTools heap snapshot)
3. **Store the baseline** as an artifact (see §5).
4. **Run measurements on:** Chrome (desktop), Safari (desktop), Safari iOS (iPhone 15).

### Measurement conditions

- **Network:** Fast 3G, Slow 4G, Broadband (Lighthouse presets)
- **CPU:** 4x slowdown (Lighthouse), no slowdown (real user conditions)
- **Cache:** Cold cache (first load), warm cache (repeat load)
- **Data:** Seeded dataset (500 components), small dataset (50 components)

### Tools

- **Lighthouse** (Chrome DevTools) — Core Web Vitals, bundle size
- **Chrome DevTools Performance** — runtime profiling, memory
- **Playwright** — scripted measurements (TTFB, FCP, LCP via `page.evaluate`)
- **`next build`** — bundle size analysis
- **Supabase query analysis** — `EXPLAIN ANALYZE` on library queries

---

## 3. Performance budget (provisional — industry defaults; to be replaced by measured Phase 0A baseline per C-015)

### Core Web Vitals targets

| Metric | Target | Threshold (no-go) | Notes |
|---|---|---|---|
| LCP | < 2.5s | > 4.0s | Largest Contentful Paint — library grid first paint |
| INP | < 200ms | > 500ms | Interaction to Next Paint — filter/search responsiveness |
| CLS | < 0.1 | > 0.25 | Cumulative Layout Shift — chip/layout stability |

### Loading budget

| Metric | Target | Threshold (no-go) | Notes |
|---|---|---|---|
| TTFB | < 800ms | > 1.5s | Time to First Byte — server response |
| FCP | < 1.8s | > 3.0s | First Contentful Paint — first render |
| LCP | < 2.5s | > 4.0s | Largest Contentful Paint — grid paint |
| TTI | < 3.5s | > 5.0s | Time to Interactive — hydration complete |

### Bundle budget

| Asset | Target | Threshold (no-go) | Notes |
|---|---|---|---|
| Initial JS | < 200KB | > 350KB | Library route initial bundle |
| Lazy JS | < 150KB | > 250KB | Lazy-loaded chunks (overlays, inspector) |
| Initial CSS | < 50KB | > 80KB | Library route CSS |
| Total (initial) | < 250KB | > 430KB | JS + CSS initial |

### Response body budget

| Query | Target | Threshold (no-go) | Notes |
|---|---|---|---|
| Library overview (500 components) | < 100KB | > 250KB | Response body bytes |
| Library overview (50 components) | < 20KB | > 50KB | Response body bytes |
| Component detail | < 30KB | > 80KB | Single component graph |
| Template detail | < 40KB | > 100KB | Template + components |
| Search (100 results) | < 50KB | > 120KB | Search response |

### Interaction budget

| Action | Target | Threshold (no-go) | Notes |
|---|---|---|---|
| Search debounce | 300ms | > 500ms | Debounce delay |
| Search results render | < 100ms | > 300ms | Results → paint |
| Filter apply | < 50ms | > 200ms | Filter chip → re-render |
| Overlay open | < 16ms | > 100ms | Click → overlay visible (1 frame) |
| Quick add submit | < 500ms | > 2s | Submit → success toast |
| Dense mode toggle | < 100ms | > 500ms | Toggle → re-render |

### Memory budget

| Metric | Target | Threshold (no-go) | Notes |
|---|---|---|---|
| Heap usage (500 components) | < 50MB | > 100MB | Chrome DevTools heap snapshot |
| Heap usage (dense mode) | < 80MB | > 150MB | Dense mode + virtualization |

### GPU / blur budget (one blur per region — glass surfaces)

Cross-ref [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §11 Performance guardrails. Glass `backdrop-filter` is GPU-expensive; the hard rule is **never stack a blur inside a blur** and cap simultaneous frosted regions.

| Rule | Target | Threshold (no-go) | Binding |
|---|---|---|---|
| Simultaneous glass panels | ≤ workspace shell + one drawer/modal | any second nested `backdrop-filter` inside a `backdrop-filter` | [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §11 "GPU budget" |
| Blur radius | ≤ 18px (`--glass-blur`) | > 18px | `globals.css:110` |
| Phase-1 card glass | translucent **fills**, not extra blurs | frosted cards in Phase 1 (content-grade card glass is Phase 2/5, and only if the 0A-measured GPU budget allows) | [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §0, §4 |
| Deferred arming | blur armed only after `<html data-glass="ready">` | blur in the first paint path | `LiquidGlassReady.tsx:25` |
| No animated blur | blur value never transitions (except the one readiness ramp) | any blur `transition` outside the readiness ramp | [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §8 |

Measure the GPU budget as part of the Phase 0A baseline (§2); the card-glass
decision in Phase 2/5 is gated on the 0A measurement, not asserted here.

### Per-Library-surface budget (PROVISIONAL — industry defaults applied to each surface; superseded by Phase 0A measurement)

Each row binds a metric-type budget (above) to one real Library surface. Every
target is PROVISIONAL until the Phase 0A baseline (§2) replaces it with a
measured number (C-015). Bindings sourced from
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths.

| Surface | Binding (real file:line) | LCP target | INP target | CLS target | Initial JS | Response body | Heap (500 rows) | Phase | Flag | Rollback | Evidence | Browser-proof | i18n |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Library overview | `src/components/workshop/library/overview/LibraryOverview.tsx` | < 2.5s | < 200ms | < 0.1 | < 200KB | < 100KB (500) / < 20KB (50) | n/a (card grid) | 0A | n/a | revert overview changes | EV-PERF-01 | Playwright | key-based |
| Components browse (card grid) | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:877` (`facetedItems`); `:881-882` (`itemMatchesSheetQuery`) | < 2.5s | < 50ms (client filter) | < 0.1 | < 200KB | < 100KB (500) | < 50MB | 0A | n/a | revert payload change | EV-PERF-01 | Playwright | n/a |
| Component inspector dock | `src/components/workshop/library/ComponentInspectorDock.tsx:68` | < 2.5s (shared route) | < 16ms (open) | < 0.1 | lazy (< 150KB) | < 30KB (detail graph) | n/a (single item) | 0B | `library_component_deep_link` | redeploy flag=false | EV-BE-05 | Playwright | key-based |
| Quick add modal | `src/components/workshop/component-library-manager/AddComponentModal.tsx` | < 2.5s (shared route) | < 500ms (submit) | < 0.1 | lazy (< 150KB) | n/a (mutation) | n/a | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 | Playwright | key-based |
| Folder management | `ComponentLibraryManager.tsx:1493-1534` (native-prompt debt) | < 2.5s (shared route) | < 16ms (action) | < 0.1 | < 200KB | n/a (mutation) | n/a | 0B | `library_folder_dialogs` | redeploy flag=false | EV-FRONTEND-02 | Playwright | key-based |
| Template preview / insert | `src/components/workshop/library/templates-browse/`; insert `resolveEstimateTemplateInsertTarget` | < 2.5s | < 500ms (insert) | < 0.1 | lazy (< 150KB) | < 40KB (template+components) | n/a | 4 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-07 | Playwright | key-based |
| Dense mode row (Phase 5) | `src/lib/workshop/virtualization-flags.ts` (reuse) | < 2.5s | < 100ms (keystroke, 500 rows) | < 0.1 | < 200KB + virtualization chunk | < 100KB (500) | < 80MB | 5 | `library_dense_mode` | redeploy flag=false | EV-PERF-01 | Playwright | n/a |
| Search/filter (client-side) | `ComponentLibraryManager.tsx:881` (`itemMatchesSheetQuery`) | < 2.5s (shared route) | < 50ms (100 results) / < 200ms (5000 results) | < 0.1 | < 200KB | < 50KB (100 results) | n/a | 0A | n/a | n/a (client-side today) | EV-PERF-01 | Playwright | n/a |
| Public snapshot | `src/app/share/[token]`; `snapshot_json` from `project_publications` | < 2.5s | < 200ms | < 0.1 | < 200KB | < 30KB (single component) | n/a | 0B | n/a (always-on surface) | n/a | EV-SEC-03 | Playwright | key-based |
| Overlay / modal | `ui/overlays/modal.tsx` (`AppModal`/`BlurModal`), `ui/overlays/sheet-drawer.tsx` | n/a (overlay) | < 16ms (open) | < 0.1 (no layout shift) | lazy (< 150KB) | n/a | n/a | all phases | n/a | revert overlay change | per-feature | Playwright | key-based |
| Trust chip | `component-facet-filter.tsx:61` (`getComponentPricingFreshness`) | n/a (inline) | < 16ms (render) | < 0.1 | n/a (inline) | n/a | n/a | 2 | `library_trust_chips` | redeploy flag=false | EV-BE-04 | jsdom | n/a |
| Library glass shell (Phase 1) | `LiquidGlassReady.tsx:25` (deferred arming); `globals.css:110` (`--glass-blur: 18px`) | < 2.5s (glass must not delay first paint — blur armed after `data-glass="ready"`) | < 200ms (blur arming is idle-callback) | < 0.1 (blur ramp is `@property --glass-blur-amount`) | n/a (no extra JS — CSS only) | n/a | n/a (GPU, not heap) | 1 | `library_glass_arming` (distinct from dense/virtualization) | remove `<LiquidGlassReady/>` from layout | EV-FRONTEND-02 | Playwright | n/a |

> **Card-glass posture (Phase 2/5 decision gate):** content-grade card glass (frosted
> component/template cards) is Phase 2/5 and is **gated on the 0A-measured GPU budget**.
> If the 0A measurement shows the workspace-shell + one-drawer blur leaves no GPU headroom
> for per-card translucent fills, cards stay paper-filled and only the shell/drawer carry
> glass. This is a measurement-gated decision, not an assertion (per C-015 + doc 35 §11).

---

## 4. Regression gates

### Pre-merge gate (every PR touching Library)

> **GATE-INACTIVE until Phase 0A baseline is stored (§2).** Pre-0A the
> bundle-size and Lighthouse rows are **advisory, not blocking** — there is no
> measured baseline to regress against, and
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
> §Performance Reality confirms the perf seed does **not** cover
> `cost_library_items` yet. 0A must first extend
> `scripts/seed-performance-test-data.ts` before any threshold is enforced
> (evidence: `EV-0A-PERF-BASELINE`).

| Gate | Command | Pass condition | Phase |
|---|---|---|---|
| Bundle size | `bun run build && du -sh .next/static/chunks/` | Initial JS < 200KB (advisory pre-0A) | 0A-gated |
| Lighthouse (desktop) | `lighthouse http://localhost:3000/workshop/library --only-categories=performance` (use `/workshop/library/components` and `/workshop/library/templates` where the grid/gallery rendering actually happens) | LCP < 2.5s, INP < 200ms, CLS < 0.1 (advisory pre-0A) | 0A-gated |
| jsdom tests | `bun run test:dom` (all) or `vitest run tests/vitest/<file>` (one) — see keystone §Test Commands; `bun run test:dom -- --grep library` only if the suite supports a grep filter | All pass | all phases |
| Playwright smoke | `bun run test:e2e` (confirm the real suite/grep naming against `tests/e2e` before relying on `--grep "library smoke"`) | All pass | all phases |
| Query analysis | `EXPLAIN ANALYZE` on `loadCurrentWorkspaceComponentRowsLibrary` (the real browse query; see §5) | Seq scan < 100ms, index scan < 20ms | 0A-gated |

### Phase exit gate (per phase)

| Gate | Command | Pass condition |
|---|---|---|
| All pre-merge gates | (above) | All pass |
| Lighthouse (mobile) | `lighthouse --emulated-form-factor=mobile http://localhost:3000/workshop/library` | LCP < 4.0s, INP < 500ms |
| Full Playwright suite | `bun run test:e2e` | All pass |
| Perf measurement | Phase 0A methodology (§2) | Within budget (§3) |
| Memory measurement | Chrome DevTools heap snapshot | Within budget (§3) |
| GPU / blur budget | Playwright visual (no nested `backdrop-filter`); see §3 GPU budget | ≤ workspace shell + one drawer/modal frosted | [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §11 |
| Evidence ledger | All EV rows for phase green | [24](24-EXECUTION-EVIDENCE-LEDGER.md) |

### No-go conditions (block release)

| Condition | Consequence |
|---|---|
| LCP > 4.0s on desktop | No-go — must fix before release |
| INP > 500ms | No-go — must fix before release |
| CLS > 0.25 | No-go — must fix before release |
| Initial JS > 350KB | No-go — must optimize bundle |
| Heap > 100MB (500 components) | No-go — must optimize memory |
| Any ADV scenario fails | No-go — see [18](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md) |

### Gate-row 12-dim footers (acceptance gates — per doc 34 §3)

The pre-merge and phase-exit gate tables above are **acceptance gate rows** (doc 34 §3).
Their 12-dim coverage:

| Gate row | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-merge bundle/Lighthouse/jsdom/Playwright/EXPLAIN gates (§4 pre-merge) | Perf lead | 0A-gated → all | per-feature | revert offending change | EV-0A-PERF-BASELINE (0A) / per-phase EV rows | `library_find_*` (find), `quick_add_*` (quick add) — see doc 20 §6 | `library.error.network` (doc 22) on failure | n/a (perf gate) | THIS table §3 (budgets provisional pre-0A) | Playwright (visual) + jsdom (logic) per doc 29 §5 | n/a (perf gate) | `scripts/seed-performance-test-data.ts` (0A extension); `loadCurrentWorkspaceComponentRowsLibrary` `src/lib/component-library/actions.ts:445` |
| Phase-exit gates (§4 phase-exit) | Perf lead | per-phase | per-feature | hold phase merge | per-phase EV rows in doc 24 | per-feature events (doc 20 §12) | n/a | see doc 31 (mobile heap-affecting changes must pass a11y gate) | THIS table §3 | Playwright + Lighthouse mobile | n/a | doc 24 per-phase rows |
| No-go conditions (above) | Perf lead | release | n/a | hold release | ADV rows in doc 18 | n/a | n/a | n/a | THIS table §3 | n/a | n/a | doc 18 ADV rows |

> **Phase 0A baseline is PRE-REGISTERED execution evidence, not a measured number.**
> Until 0A lands, the §3 budgets and §4 gate thresholds are industry defaults
> (C-015), and the pre-merge bundle/Lighthouse/EXPLAIN rows are advisory. The 0A
> task (extend `scripts/seed-performance-test-data.ts` to cover `cost_library_items`,
> seed 100/500/5,000/10,000 tiers, measure LCP/INP/CLS/TTFB/FCP/TTI/heap/initial-JS/
> response-body, store under `evidence/perf/0A/_PHASE-0A-PERF-BASELINE.md` per §5
> schema) is owned by the Perf lead and pre-registered as `EV-0A-PERF-BASELINE` in
> [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md). No numeric
> budget in this doc is asserted as measured — they are all provisional until that
> row turns green.

---

## 5. Artifact schema

### Perf measurement file

```
.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/perf/
  <phase>/
    <surface>/
      <measurement-id>.json
```

### JSON schema

```json
{
  "measurement_id": "PERF-001",
  "phase": "0A",
  "surface": "library-overview",
  "measured_at": "2026-06-21T12:00:00Z",
  "measured_by": "Perf lead",
  "git_commit": "abc1234",
  "conditions": {
    "browser": "chrome",
    "network": "fast-3g",
    "cpu_slowdown": "4x",
    "cache": "cold",
    "dataset": "500-components"
  },
  "metrics": {
    "lcp_ms": 2300,
    "inp_ms": 180,
    "cls": 0.08,
    "ttfb_ms": 650,
    "fcp_ms": 1500,
    "tti_ms": 3200,
    "initial_js_kb": 180,
    "initial_css_kb": 40,
    "response_body_kb": 85,
    "heap_mb": 42
  },
  "budget": {
    "lcp_target_ms": 2500,
    "lcp_threshold_ms": 4000,
    "inp_target_ms": 200,
    "inp_threshold_ms": 500,
    "cls_target": 0.1,
    "cls_threshold": 0.25
  },
  "verdict": "pass",
  "notes": "Within budget. LCP 2.3s < 2.5s target."
}
```

### Comparison (regression detection)

```json
{
  "comparison_id": "PERF-CMP-001",
  "baseline": "PERF-001",
  "candidate": "PERF-002",
  "regressions": [],
  "improvements": [
    { "metric": "lcp_ms", "baseline": 2300, "candidate": 2100, "delta": -200 }
  ]
}
```

---

## 6. Fallback decision tree

When the Library page exceeds budget, choose the first applicable fallback:

```
1. Response body > 100KB (500 components)?
   → Yes: Reduce the eager nested-detail graph in loadCurrentWorkspaceComponentRowsLibrary (src/lib/component-library/actions.ts) — per 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md §Performance Reality it "eagerly loads the FULL nested detail graph (versions, price history, state history, attachments) per item". Add a shallow/includeDetailGraph option and make detail lazy + inspector-scoped. Re-measure.
   → Still > 100KB? Go to step 2.

2. LCP > 2.5s after payload reduction?
   → Yes: Add route segment caching (unstable_cache with cacheTag). Re-measure.
   → Still > 2.5s? Go to step 3.

3. LCP > 2.5s after caching?
   → Yes: Split library overview into server-rendered summary + client-rendered detail. Re-measure.
   → Still > 2.5s? Go to step 4.

4. Heap > 50MB (500 components)?
   → Yes: Enable virtualization via WORKSHOP_VIRTUALIZATION_FLAGS (src/lib/workshop/virtualization-flags.ts; per keystone §Infrastructure already present — reuse, do not add a parallel virtualizer). Re-measure.
   → Still > 50MB? Go to step 5.

5. Heap > 80MB with virtualization?
   → Yes: Paginate library query (50 components per page). Re-measure.
   → Still > 80MB? Go to step 6.

6. Search INP > 200ms (client-side)?
   → Yes: The components-tab search/filter is 100% client-side synchronous today (ComponentLibraryManager.tsx:876-882, per keystone §Performance Reality) — there is no async race. Only move search to a server-side RPC/FTS if the measured INP budget is exceeded; FTS/trigram does not exist yet (keystone §Infrastructure). Re-measure.
   → Still > 200ms? Go to step 7.

7. All fallbacks exhausted?
   → No-go. Escalate to Perf lead + Planning lead. Re-scope or re-architect.
```

---

## 7. Per-row perf budget template

Every actionable row in every doc must declare:

```
Perf: <target> | <measurement-id> | <gate>
```

Examples:
```
Perf: LCP < 2.5s | PERF-001 | pre-merge
Perf: INP < 200ms | PERF-002 | phase-exit
Perf: Bundle < 200KB | PERF-003 | pre-merge
Perf: n/a (static route, no runtime cost)
```

---

## 8. Verification

```bash
# Phase 0A baseline exists (post-0A only)
ls .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/perf/0A/ 2>&1
# Expected pre-0A: "No such file or directory" — dir is created in Phase 0A (EV-0A-PERF-BASELINE; 0A must extend scripts/seed-performance-test-data.ts to cover cost_library_items first).
# Expected post-0A: baseline measurements for all surfaces.

# Every actionable row has a Perf: field
rg "Perf:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: measured baseline is ~1 pack-wide today (only doc 16 has Perf-ish rows); the "26+ files" target is aspirational until Wave 2 adds the field per doc. Final measured baseline: see 34-ROW-LEVEL-COMPLETENESS-MATRIX.md §4 Perf column.

# Provisional thresholds remain until Phase 0A (C-015)
rg "provisional" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md"
# Expected pre-0A: >0 matches (this doc's §3 heading + Status banner + §9 deliberately say "provisional until Phase 0A").
# Expected post-0A: 0 matches (after the baseline finalizes budgets in EV-0A-PERF-BASELINE).
```

---

## 9. Gap closure

### Current state

- Doc 16 has provisional thresholds (to be replaced after Phase 0A) ✓
- Doc 05 references perf numbers as provisional ✓
- Doc 24 has perf evidence rows ✓
- No final budget (this doc defines it, pending Phase 0A measurement)
- No artifact schema (this doc defines it)
- No fallback decision tree (this doc defines it)

### Required updates to other docs

- [16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md](16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md): replace provisional thresholds with "See [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md) §3"
- [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md): update perf rows to reference doc 30
- [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md): add perf artifact schema (§5)
- Every doc with actionable rows: add `Perf:` field per row

---

## 10. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| Perf lead | pending | — | — |
| Backend lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The perf budget is complete when:
1. Phase 0A baseline is measured and stored (§2).
2. Every surface has a budget (§3).
3. Every regression gate passes (§4).
4. Every actionable row has a `Perf:` field (§7).
5. All four reviewers sign off above.
