# 03 — Readiness Assessment: Pre-Implementation Checklist

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Determine if the codebase, tooling, and team are ready for route transition performance optimization.

---

## Table of Contents

1. [Codebase Readiness](#1-codebase-readiness)
2. [Tooling Readiness](#2-tooling-readiness)
3. [Dependency Readiness](#3-dependency-readiness)
4. [Testing Readiness](#4-testing-readiness)
5. [Team/Process Readiness](#5-teamprocess-readiness)
6. [Go/No-Go Matrix](#6-gono-go-matrix)

---

## 1. Codebase Readiness

### 1.1 Pre-existing Foundation

| Requirement | Status | Notes |
|-------------|--------|-------|
| Next.js 16 App Router | ✅ Present | `next@16.2.6` — has full streaming, Suspense, caching support |
| React 19 | ✅ Present | `react@19.2.4` — Suspense is stable, `use()` hook available |
| TanStack Query v5 | ✅ Present | `@tanstack/react-query` — supports `prefetchQuery`, cache manipulation |
| Zustand | ✅ Present | `zustand` — lightweight global state, used for `useEstimateUiStore` |
| TypeScript strict mode | ✅ Present | Type-safe refactoring possible |
| Tailwind CSS v4 | ✅ Present | JIT compilation, no unused CSS |
| Route loading overlay | ✅ Present | Already implemented in `providers.tsx` — serves as safety net |
| `useNavigationRouter` | ✅ Present | `src/hooks/use-navigation-router.ts` — wraps `push/replace/refresh` |

### 1.2 Gaps to Address Before Optimization

| Gap | Severity | Blocking? | Resolution |
|-----|----------|-----------|------------|
| No `loading.tsx` files anywhere | Medium | No | First task: create them |
| No Suspense boundaries in layouts | Medium | No | First task: add them |
| 5 `useNavigationRouter()` instantiations in `ProjectEstimatesTable` (already migrated from raw `useRouter()`) | Low | No | Consolidate during Phase 1 |
| No performance instrumentation | Medium | **YES** | Must add baseline measurement before optimization (you can't improve what you don't measure) |
| No existing `next.config.ts` performance settings | Low | No | Can be added incrementally |
| `useTransition` used inconsistently | Low | No | Some components use it, others don't. Standardize. |
| No bundle analyzer configured | Low | No | `@next/bundle-analyzer` recommended for Phase 0 |
| No middleware.ts — auth at data-fetching layer | **HIGH** 🔴 | No (blocking for performance) | All workshop pages forced dynamic by `cookies()` in auth + WorkshopPageShell. See **`31-auth-optimization-middleware-migration.md`** for the 3-line fix. |
| 3 files import Phosphor icons from wrong path | Low | No | Fix import paths to `@phosphor-icons/react/dist/ssr` |
| Landing barrel export (32 components) | Low | No | Consider breaking into dynamic chunks for below-fold sections |

### 1.3 Route Structure Assessment

| Check | Status |
|-------|--------|
| All routes use App Router (not Pages Router) | ✅ Yes |
| Layouts are server components by default | ✅ Yes (except root layout with client providers) |
| Route groups exist for auth/public separation | ❌ No route groups |
| `middleware.ts` exists for auth gating | ❌ **No middleware exists.** Auth enforced at data-fetching layer via `requireCurrentUserContext()` → `redirect("/login")`. `proxy.ts` handles cookie-based Supabase session refresh but doesn't guard routes directly. |
| API routes are separate from page routes | ✅ Yes (`/api/ai/ask`, etc.) |
| Only 2 layouts in entire app | ✅ Root layout + `projects/[projectId]/layout.tsx`. No `/workshop/layout.tsx`. |

### 1.4 Auth Integration Risk

**Critical finding (verified):** There is **no `middleware.ts`** in the project. Workshop routes check auth inside repository functions via `requireCurrentUserContext()` → `createSupabaseServerClient()` → `cookies()` + `headers()`. This forces dynamic rendering on every request.

**Additional dynamic rendering force:** `WorkshopPageShell` (rendered by every workshop page) reads `cookies()` for side-panel width CSS variables via `getSidePanelWidthCssVariables()`. Even if auth were moved to middleware, this cookie read would still force dynamic rendering.

**Impact on Suspense/streaming strategy:** Suspense boundaries can still stream partial content while data resolves, but the page shell itself will always be server-rendered dynamically. This is acceptable — the goal is to show the shell immediately while heavy data (project lists, estimate trees, library) resolves in Suspense boundaries.

### 1.5 Additional Performance Gaps Discovered (Deep Audit)

Recent deep codebase analysis revealed critical performance bottlenecks beyond the initial audit:

| Gap | Severity | Blocking? | Impact | Resolution |
|-----|----------|-----------|--------|------------|
| **Proxy.ts auth check on every request** | **Critical** | **No (but high priority)** | **Adds ~100-200ms latency per navigation. Single largest server-side bottleneck.** | Migrate to Next.js middleware (saves 80-180ms) or optimize to use `getSession()` instead of `getUser()` (saves 60-150ms). See `17-server-side-optimization-strategy.md` §1. |
| **Zero React.memo usage** | **High** | **No** | **Causes 10x slower re-renders for list/tree components. 100+ row items re-render when only 1 is edited.** | Add strategic memoization to row items, tree nodes, project cards. See `19-react-memo-strategy.md`. |
| **Three.js on landing page (~150KB)** | **High** | **No** | **65% of landing page JS bundle. Statically imported in hero section (above-fold), blocking initial render of headline and CTA.** | Dynamically import Three.js via `next/dynamic` with `ssr: false` and CSS placeholder. See `20-font-and-bundle-optimization.md` §2. |
| **Font loading cost (4 fonts on all pages)** | **Medium** | **No** | **Landing page loads ~300KB of unused fonts (Poppins, Roboto Mono, Source Serif 4).** | Route-specific font loading. Landing page only loads Inter. See `20-font-and-bundle-optimization.md` §1. |
| **Zero error boundaries** | **High** | **No** | **Full-page crashes on component errors. Recovery requires full reload (~1000ms vs ~50ms with retry).** | Add `error.tsx` files to routes and `ErrorBoundary` components to high-risk components. See `21-error-boundary-strategy.md`. |
| **Project layout re-fetch waterfall** | **High** | **No** | **Project layout re-fetches on every sub-navigation (projects/X/estimates → projects/X/charts), wasting ~90ms per navigation.** | Cache project layout queries with `unstable_cache`. See `17-server-side-optimization-strategy.md` §2. |
| **N+1 query patterns** | **Medium** | **No** | **Sequential queries in loops (e.g., fetching metadata per project). Adds 30-150ms depending on data size.** | Batch queries, use JOINs, implement DataLoader pattern. See `17-server-side-optimization-strategy.md` §4. |
| **Detailed waterfall analysis missing** | **Low** | **No** | **Without exact timing breakdown, hard to prioritize optimizations.** | Review `16-critical-path-waterfall.md` for heaviest routes (estimate workspace, component library, projects list). |

---

## 2. Tooling Readiness

### 2.1 Required Tools

| Tool | Status | Installation |
|------|--------|-------------|
| Chrome DevTools Performance tab | ✅ Built into Chrome | N/A |
| Lighthouse CLI | ✅ `npx lighthouse` | `npm install -g lighthouse` (optional) |
| Next.js Bundle Analyzer | ❌ Not installed | `bun add -D @next/bundle-analyzer` |
| React DevTools | ✅ Browser extension | N/A |
| React Query DevTools | ❌ Not installed | `bun add -D @tanstack/react-query-devtools` (dev only) |
| `bun run build` | ✅ Working | N/A |
| `bun run validate` | ✅ Working | N/A |

### 2.2 Build Configuration

```bash
# Check current build output for per-route JS sizes
bun run build 2>&1 | grep -E "Route|First Load JS"
```

**Pre-optimization build output (to be collected):**
- [ ] Run `bun run build` and record per-route "First Load JS" sizes
- [ ] Record total build size
- [ ] Record number of chunks

---

## 3. Dependency Readiness

### 3.1 Libraries Needed for Implementation

| Library | Purpose | Status | Version |
|---------|---------|--------|---------|
| `next` | Framework (streaming, caching, prefetch) | ✅ Installed | 16.2.6 |
| `react` | UI (Suspense, useTransition) | ✅ Installed | 19.2.4 |
| `@tanstack/react-query` | Data fetching cache | ✅ Installed | v5 |
| `@tanstack/react-virtual` | List virtualization | ❌ Not installed | Need to add |
| `@next/bundle-analyzer` | Bundle size analysis | ❌ Not installed | Need to add |
| `@tanstack/react-query-devtools` | Cache debugging | ❌ Not installed | Need to add (dev) |

### 3.2 Library Compatibility Check

| Concern | Status |
|---------|--------|
| `@tanstack/react-virtual` compatible with React 19 | ✅ Yes (latest v3 supports React 18–19) |
| `@tanstack/react-virtual` compatible with TanStack Table | ✅ Yes (same ecosystem, designed to work together) |
| `next/dynamic` compatible with Server Components | ✅ Yes (client boundary is automatic) |
| Streaming SSR compatible with auth-protected routes | ⚠️ Need to verify — auth redirects may not work mid-stream |

---

## 4. Testing Readiness

### 4.1 Existing Test Coverage

| Test Type | Status | Coverage |
|-----------|--------|----------|
| Vitest (unit) | ✅ Active | Estimate domain, hooks, repositories |
| Vitest (DOM) | ✅ Active | UI components |
| Playwright (E2E) | ✅ Active | Auth flows, estimate workspace, invite flow |
| Visual regression | ❌ None | N/A |
| Performance regression | ❌ None | **Must add** before optimization |

### 4.2 Tests Needed Before Optimization

| Test | Priority | Purpose |
|------|----------|---------|
| Navigation timing smoke test | HIGH | Verify current baseline latency |
| Route commit timing test | HIGH | Measure `usePathname` change latency |
| React Query cache hit test | MEDIUM | Verify cached data is served on revisit |
| bfcache compatibility test | MEDIUM | Verify pages enter bfcache |
| Bundle size regression test | LOW | CI check that bundle size doesn't regress |

### 4.3 Test Environment

| Requirement | Status |
|-------------|--------|
| Production build for perf testing | ✅ `bun run build && bun run start` |
| Network throttling capability | ✅ Chrome DevTools |
| CPU throttling capability | ✅ Chrome DevTools |
| Isolated test data (seed projects/sheets/rows) | ❌ Need to create seed script |

---

## 5. Team/Process Readiness

### 5.1 Owner Approval Gates

| Gate | Status | Owner |
|------|--------|-------|
| Performance optimization strategy approved | ⏳ Pending | Philip |
| Bundle analyzer installation approved | ⏳ Pending | Philip |
| `@tanstack/react-virtual` installation approved | ⏳ Pending | Philip |
| `loading.tsx` skeleton design direction approved | ⏳ Pending | Philip |
| Increased `staleTime` approved | ⏳ Pending | Philip |

### 5.2 Implementation Process

| Step | Description |
|------|-------------|
| 1 | Present this plan to Philip for approval |
| 2 | Collect baseline performance metrics (Phase 0) |
| 3 | Implement Phase 1 (quick wins) |
| 4 | Re-measure and verify improvement |
| 5 | Implement Phase 2 (strategic investments) |
| 6 | Re-measure and verify |
| 7 | Implement Phase 3 (peak-load hardening) |
| 8 | Final measurement and sign-off |

### 5.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance optimization breaks existing functionality | Run full test suite (`bun run validate && bun run build && bun run test:e2e`) after each phase |
| Optimization doesn't yield expected improvement | Measure after each phase; if Phase 1 doesn't show >30% improvement, reassess |
| User reports stale data after increased `staleTime` | Can revert to 30s instantly; adjust per-query |
| Streaming breaks auth | Can revert Suspense boundaries; auth is at data-fetching layer (not middleware) — test `requireCurrentUserContext()` + streaming compatibility |

---

## 6. Go/No-Go Matrix

### BLOCKING (Must Resolve Before Implementation)

| # | Item | Status | Action |
|---|------|--------|--------|
| 1 | Performance instrumentation added | ❌ Not done | **MUST:** Add `PerformanceMonitor` component and baseline measurement before ANY optimization |
| 2 | Verify auth flow doesn't break with streaming | ❌ Not verified | **MUST:** Test auth at data-fetching layer (`requireCurrentUserContext()`) + streaming compatibility. Auth is NOT in middleware — it's in repository functions that call `cookies()` + `headers()`. |
| 3 | Seed data for peak-load testing | ❌ Not done | **MUST:** Create seed script for 50 projects, 200 rows scenarios |

### HIGH PRIORITY (Should Resolve Early — High Impact)

| # | Item | Status | Impact | Action |
|---|------|--------|--------|--------|
| 4 | **Proxy.ts auth optimization** | ❌ Not done | **Saves 100-200ms per navigation (largest single bottleneck)** | Evaluate middleware migration vs. `getSession()` optimization. See `17-server-side-optimization-strategy.md` §1. |
| 5 | **React.memo strategic memoization** | ❌ Not done | **10x faster re-renders for list/tree components** | Audit components for memoization candidates. See `19-react-memo-strategy.md`. |
| 6 | **Project layout caching** | ❌ Not done | **Saves 90ms per sub-navigation** | Implement `unstable_cache` for project layout queries. See `17-server-side-optimization-strategy.md` §2. |
| 7 | **Error boundaries** | ❌ Not done | **Prevents full-page crashes, 20x faster recovery** | Add `error.tsx` files to critical routes. See `21-error-boundary-strategy.md`. |

### RECOMMENDED (Should Resolve Before Implementation)

| # | Item | Status | Action |
|---|------|--------|--------|
| 8 | Bundle analyzer installed | ❌ Not done | Install `@next/bundle-analyzer` |
| 9 | React Query DevTools installed (dev) | ❌ Not done | Install for cache debugging during optimization |
| 10 | `@tanstack/react-virtual` evaluated | ❌ Not done | Verify compatibility with TanStack Table + React Complex Tree |
| 11 | Philip approval on skeleton design direction | ⏳ Pending | Review with owner |
| 12 | Fix 3 Phosphor icon import paths | ❌ Not done | Switch `ContactForm.tsx`, `ProjectChartsClient.tsx`, `projects-page-client.tsx` to `/dist/ssr` path |
| 13 | **Three.js dynamic import (landing page hero)** | ❌ Not done | Defer ~150KB off critical path via `next/dynamic` with `ssr: false`. **Note:** Component is in above-fold HeroSection (not below-fold) — IntersectionObserver approach will NOT defer it. See `20-font-and-bundle-optimization.md` §2. |
| 14 | **Font loading optimization** | ❌ Not done | Reduce landing page bundle by ~300KB. See `20-font-and-bundle-optimization.md` §1. |
| 15 | **N+1 query fixes** | ❌ Not done | Batch sequential queries. See `17-server-side-optimization-strategy.md` §4. |

### NICE-TO-HAVE

| # | Item | Status |
|---|------|--------|
| 16 | CI performance regression check | Not needed for initial implementation |
| 17 | Visual regression testing | Defer to later phase |
| 18 | Automated Lighthouse CI | Defer to later phase |

### Overall Readiness: ⚠️ CONDITIONALLY READY

The codebase is technically ready — all necessary libraries exist, the architecture supports the proposed changes, and the loading overlay safety net is in place. However, **three blocking items must be resolved before implementation begins:**

1. Performance instrumentation (measure baseline)
2. Auth + streaming verification (auth is at data-fetching layer, not middleware)
3. Peak-load seed data

**High-priority optimizations discovered in deep audit:**
- Proxy.ts auth check adds 100-200ms per navigation (critical bottleneck)
- Zero React.memo causes 10x slower re-renders
- Project layout re-fetch wastes 90ms per sub-navigation
- Zero error boundaries cause full-page crashes
- Three.js on landing page (150KB) and font loading (300KB) bloat initial bundle

**Good news from codebase audit:**
- bfcache: **Zero blockers found** — no `beforeunload`/`unload` listeners, no `Cache-Control: no-store` on workshop pages
- Navigation: `useNavigationRouter` hook already migrated from raw `useRouter()` — only needs consolidation of 5 instances in `ProjectEstimatesTable`
- Optimistic updates: Sophisticated patterns already in place (snapshot/restore/revision tracking)

**Recommended implementation order:**
1. Resolve blocking items (instrumentation, auth verification, seed data)
2. Tackle high-priority items (proxy.ts, React.memo, layout caching, error boundaries)
3. Implement quick wins (loading.tsx, staleTime, code splitting)
4. Address recommended items (bundle analyzer, Three.js, fonts, N+1 fixes)

Once blocking items are resolved, Phase 1 (quick wins) can begin immediately, with high-priority optimizations integrated as Phase 1.5.

---

## 7. Related Documents

For detailed analysis of the new findings:

- **`16-critical-path-waterfall.md`** — Detailed server+client waterfall diagrams showing exact timing of each step from click to interactive
- **`17-server-side-optimization-strategy.md`** — Proxy.ts optimization, React.cache expansion, N+1 query fixes, project layout caching
- **`18-performance-monitoring-production.md`** — Runtime monitoring, alerting, regression detection
- **`19-react-memo-strategy.md`** — Strategic component memoization plan with specific targets
- **`20-font-and-bundle-optimization.md`** — Font loading optimization, Three.js lazy loading, bundle analysis
- **`21-error-boundary-strategy.md`** — Route-level and component-level error boundaries

---

**Next:** See `04-implementation-plan.md` for the phased execution plan.
