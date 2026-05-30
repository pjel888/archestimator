# Performance Budget & Regression Gates

**Last updated:** 2026-05-30
**Purpose:** Makes performance unavoidable in every Codex implementation. No feature ships without considering perf. Applies at three tiers: Beta, Enterprise MVP, Public Launch.

## Global Performance Rules

These rules apply to ALL Codex goal implementations:

1. **No new heavy dependency** without owner approval or bundle-impact analysis. If a dependency adds >50KB gzipped, document and get approval.
2. **Heavy modules must be dynamically imported.** ExcelJS, D3, Three.js, large tables, large trees, and AI routes must NOT bloat initial public/workshop route bundles. Use `next/dynamic` with `ssr: false`.
3. **Every feature touching estimate editor** must consider row-edit perceived latency. Optimistic UI with TanStack Query. No blocking saves.
4. **Every feature touching tree, library, charts, XLSX, share receiver, or AI** must include a benchmark or baseline measurement.
5. **No route should introduce avoidable full-page reloads.** Use Next.js Link component. Prefetch where appropriate.
6. **Loading states must use design-system Skeleton.** No spinners, no "Loading..." text, no unstyled loading states.
7. **Long operations must show progress** or clear waiting state. XLSX export, AI requests, large data loads.
8. **Serverless operations must document timeout risk.** Vercel Functions have 60s max (Hobby). Document expected durations.
9. **Bundle size must not regress.** If a change adds >10KB gzipped to main bundle, flag it.

## Enterprise MVP Stricter Rules

In addition to the Global Performance Rules, Enterprise MVP imposes these stricter rules. Any violation is a hard block — the goal card cannot move to DONE:

1. **Every goal card must include expected bundle impact.** State the estimated KB gzipped added/removed. If zero, state "0 KB gzipped — no bundle impact."
2. **No new heavy dependency without explicit owner approval.** Even if the dependency is under 50KB, it requires documented approval if it touches the critical path (route transition, estimate editor, share receiver, or initial bundle).
3. **ExcelJS, D3, Three.js, React Complex Tree, AI routes, and large table components must not bloat initial routes.** All must be lazily loaded. Verify with bundle analyzer: main chunk < 150KB gzipped.
4. **PDF implementation must be lazy-loaded or server-generated.** If client-side PDF (e.g., react-pdf), it must be dynamically imported. If server-generated, it must not block estimate editing or proposal viewing.
5. **Immutable snapshot generation must not block estimate editing.** Snapshots must be non-blocking (background job, web worker, or server-side RPC that returns immediately with a polling endpoint).
6. **Instrumentation must not add user-visible latency.** Performance marks, analytics beacons, and timing measurements must use `requestIdleCallback`, `scheduler.postTask`, or be deferred to after paint.
7. **Sentry/logging must scrub PII.** No user emails, names, workspace names, project names, estimate costs, or shared-link tokens in error payloads or log messages.
8. **Performance smoke test must run before beta.** The full smoke test (bundle check + Lighthouse + route transitions + XLSX export) must pass before the beta go/no-go decision.

## Three-Tier Performance Targets

| Area | Beta Target | Enterprise MVP Target | Public Launch Target |
|---|---|---|---|
| Workshop transition | <200ms acceptable | <100ms target | <100ms |
| Row edit perceived latency | <200ms | <100ms target | <100ms |
| Tree render 500 nodes | <1s | <500ms target | <500ms |
| Component library 1,000 items | <1.5s | <1s target | <1s target |
| XLSX export 100 rows | <3s | <2s | <2s |
| XLSX export 500 rows | <10s | <5s or background job | <5s |
| Share receiver FMP | <2s | <1.5s | <1.5s |
| PDF generation | not required | <10s for normal proposal | <5s or async |
| AI Ask timeout | Clear UI by 30s | Retry/degraded mode | Retry/degraded mode |
| Initial public LCP | <2.5s | <2.0s | <2.0s |
| Main bundle chunk | <200KB gzipped | <150KB gzipped | <150KB gzipped |
| Total JS bundle | <500KB gzipped | <400KB gzipped | <400KB gzipped |

## Performance Budget by Layer

Each layer of the application has a budget. No single goal card may cause any layer to exceed its budget without documented owner approval.

### Route-Level Budgets

| Route | Main Bundle Chunk | LCP/FMP | Critical Path JS | Notes |
|---|---|---|---|---|
| `/` (landing) | <60KB gzipped | LCP < 2.0s | <80KB gzipped | A/B testing overhead included |
| `/share/[token]` | <50KB gzipped | FMP < 1.5s | <70KB gzipped | No heavy modules in initial payload |
| `/workshop/*` | <80KB gzipped | — | <120KB gzipped | Shell only; lazy-load sheet/charts |
| `/workshop/projects/[id]/estimates/[id]` | <150KB gzipped total | Transition < 100ms | — | Lazy tree + sheet; inline only after load |
| `/login` | <30KB gzipped | LCP < 1.5s | <40KB gzipped | No heavy deps; Turnstile async |

### Module-Level Budgets

| Module | Budget (gzipped) | Load Strategy | Must Not Impact |
|---|---|---|---|
| Estimate sheet (inline editing) | <100KB | Lazy on first estimate open | Landing, share receiver |
| Component library tree | <120KB | Lazy on first library open | Workshop shell, estimate editor |
| Charts (D3 donut + bubble) | <80KB | `next/dynamic`, `ssr: false` | Estimate editor, share receiver |
| XLSX export | <150KB | `next/dynamic`, `ssr: false` | All routes until export triggered |
| AI Ask chat | <80KB | Lazy on AI panel open | Workshop shell |
| AI Package Builder | <100KB | Lazy on builder open | Workshop shell, estimate editor |
| PDF generation | <200KB or server-only | Lazy or server-generated | Estimate editor, share receiver |
| Snapshot generation | <10KB (trigger only) | Non-blocking RPC | Estimate editor (must not block) |

### Operation-Level Budgets

| Operation | Budget | Measurement | Fallback |
|---|---|---|---|
| Row add/edit (optimistic) | <100ms perceived | `performance.now()` instrumentation | N/A — must meet |
| Tree expand (100 children) | <300ms | React Profiler | Virtualize if >500 children |
| Tree drag-and-drop reorder | <200ms | React Profiler | Batch mutations |
| Library search (filter 1,000 items) | <300ms | `performance.now()` | Debounce input, paginate results |
| Share link load (100-row estimate) | <2s FMP | Lighthouse /share/[token] | Skeleton + progressive hydration |
| Snapshot create (500-row estimate) | Non-blocking trigger | RPC return < 500ms, async generation | Polling endpoint |
| XLSX export trigger (500 rows) | <500ms to start download | User timing | Background job if >5s |
| PDF generation trigger | <500ms to start | User timing | Background job if >10s |

## Performance Budget by Goal Card

Every goal card must answer these questions. If the answer is "no impact," state it explicitly.

| Question | Required Answer |
|---|---|
| Does this add bundle weight? | Measure (KB gzipped) or "none" |
| Does it add a heavy dependency? | Block unless approved |
| Does it affect route transitions? | "Preserves" or explain impact |
| Does it affect estimate sheet latency? | "Must not regress" or explain |
| Does it touch XLSX/chart/tree/AI? | Add benchmark or note |
| Does it add network calls? | Explain caching/prefetch strategy |
| Does it run in serverless? | Note timeout/cold-start risk |

## Enterprise MVP Performance Gates

Before any goal card can be marked DONE at Enterprise MVP tier, these additional gates must pass:

1. **Bundle size check (Enterprise):** Run `bun run build` and confirm main chunk < 150KB gzipped, total < 400KB gzipped.
2. **Lighthouse check (Enterprise):** If goal touches public pages, LCP < 2.0s; if share receiver, FMP < 1.5s.
3. **Route transition check (Enterprise):** Workshop transitions < 100ms target.
4. **Row edit perceived latency (Enterprise):** < 100ms target. Measure with React Profiler or `performance.now()`.
5. **No blocking operations:** Snapshot generation and PDF generation must not block the estimate editor. Verify with manual timing.
6. **Lazy loading verified:** All heavy modules (ExcelJS, D3, Three.js, React Complex Tree, AI, PDF, large tables) confirmed lazy-loaded via bundle analyzer.
7. **PII scrubbing verified:** Sentry/logging payloads reviewed for PII. No emails, names, tokens, or costs in error/log output.
8. **Instrumentation latency check:** `performance.now()` instrumentation and analytics beacons deferred to idle. No user-visible latency added.
9. **Performance smoke test pass:** Full smoke suite passes before enterprise MVP go/no-go.

## Regression Gates

Before marking any goal card DONE, verify:

1. **Bundle size check:** Run `bun run build` and confirm main chunk < 200KB gzipped (Beta) or < 150KB gzipped (Enterprise MVP)
2. **Lighthouse check:** If goal touches public pages, run Lighthouse and confirm LCP < 2.5s (Beta) or < 2.0s (Enterprise MVP)
3. **Route transition check:** If goal touches workshop, confirm transitions < 200ms (Beta) or < 100ms target (Enterprise MVP)
4. **Design-system check:** Run `bun run lint:design-system` — must pass
5. **Type check:** Run `bun run type-check` — must pass
6. **Test suite:** Run `bun run test` (unit) — must not introduce failures

## Performance Smoke Test (Quick Gate)

Before beta or enterprise MVP go/no-go, run this minimal perf smoke:

```bash
# Bundle size
bun run build
# Check: Beta: main chunk < 200KB, total < 500KB
# Check: Enterprise MVP: main chunk < 150KB, total < 400KB

# Lighthouse on key pages
# / → LCP < 2.5s (Beta) or < 2.0s (Enterprise MVP)
# /workshop → route transition < 200ms (Beta) or < 100ms target (Enterprise MVP)
# /share/[test-token] → FMP < 2s (Beta) or < 1.5s (Enterprise MVP)

# Estimate operations
# Create estimate with 100 rows → edit latency < 200ms (Beta) or < 100ms target (Enterprise MVP)
# Export XLSX 100 rows → < 3s (Beta) or < 2s (Enterprise MVP)
# Tree expand 50 nodes → < 500ms

# Enterprise MVP additional:
# Snapshot create (500 rows) → non-blocking trigger, editor stays responsive
# PDF generation trigger → non-blocking, editor stays responsive
# PII scrub check → no PII in Sentry/logging payloads
# Instrumentation latency → no user-visible latency from perf marks or analytics
```

## Performance Regression Policy

If a goal card causes a performance regression:

1. **Stop.** Do not mark DONE.
2. **Diagnose.** Use bundle analyzer and React Profiler.
3. **Fix or document.** Either fix the regression, or document it as `ACCEPTED RISK` with Philip approval.
4. **No silent regressions.** If a metric degrades and it's not documented, it's a bug.

## Heavy Modules Map

These modules are known to be large and must be dynamically imported:

| Module | Size (approx) | Where Used | Import Strategy |
|---|---|---|---|
| ExcelJS | ~500KB | XLSX export | `next/dynamic` with `ssr: false` |
| D3 v7 | ~200KB | Project charts | `next/dynamic` with `ssr: false` |
| Three.js | ~600KB | @firecms/neat (background) | `next/dynamic` with `ssr: false` |
| react-complex-tree | ~100KB | Estimate tree | Already lazy-loaded |
| @supabase/ssr | ~50KB | Auth | Acceptable in main bundle |
| @tanstack/react-query | ~30KB | Data fetching | Acceptable in main bundle |

## Instrumentation Commands

When benchmarks don't exist yet, use these to establish baselines:

```bash
# Lighthouse (requires Chrome)
npx lighthouse http://localhost:3000 --output json --output-path .ai/09_archive/store/YYYY-MM-DD-lighthouse.json

# Bundle analysis
ANALYZE=true bun run build
# Opens interactive treemap in browser

# React Profiler
# Use React DevTools Profiler tab during manual testing

# Performance timing (in browser console)
performance.mark('edit-start')
// ... edit a row ...
performance.mark('edit-end')
performance.measure('edit-latency', 'edit-start', 'edit-end')
```

## Accepted Risks (Beta)

Until full perf optimization is complete, these risks are documented:

| Risk | Current State | Beta Acceptable? | Mitigation |
|---|---|---|---|
| No APM/error tracking | Not configured | No — BETA P0 blocker | Wave 2: BETA-P0-OBS-001 |
| Heavy modules not code-split | Unknown | No — BETA P0 blocker | Wave 3: BETA-P0-PERF-002 |
| No performance benchmarks | No baselines | No — BETA P0 blocker | Wave 3: BETA-P0-PERF-001 |
| Cold starts unknown | Not measured | Accept if documented | Wave 3 measurement |
| Large estimate performance unknown | Not tested | Accept if <500 rows is ok for beta | Wave 3 benchmark |
| XLSX large export timeout | Not tested | Accept if documented | Wave 3 benchmark |

## Accepted Risks (Enterprise MVP)

| Risk | Current State | Enterprise MVP Acceptable? | Mitigation |
|---|---|---|---|
| Rate limiting not persistent | In-memory only | No — BETA P0 blocker (SEC-005) | Wave 1: BETA-P0-SEC-005 (Redis/Upstash) |
| PDF generation >10s for large proposals | Not implemented | Accept if <10s for normal (<200 row) proposals | Async generation for large proposals |
| Snapshot generation blocks editor | Not implemented | No — Enterprise MVP hard block | Non-blocking RPC + polling (ENTERPRISE-P1-PROD-001) |
| Main bundle exceeds 150KB | Unknown | Accept if 150-170KB with documented plan to reduce | Bundle split plan required |
| Instrumentation adds latency | Not measured | Accept if <10ms total overhead | Defer to idle; measure with trace |
| No performance regression CI gate | Not configured | Accept if manual smoke test passes before go/no-go | CI gate deferred to public launch |
