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
| 5 `useRouter()` in `ProjectEstimatesTable` | Low | No | Consolidate during Phase 1 |
| No performance instrumentation | Medium | **YES** | Must add baseline measurement before optimization (you can't improve what you don't measure) |
| No existing `next.config.ts` performance settings | Low | No | Can be added incrementally |
| `useTransition` used inconsistently | Low | No | Some components use it, others don't. Standardize. |
| No bundle analyzer configured | Low | No | `@next/bundle-analyzer` recommended for Phase 0 |

### 1.3 Route Structure Assessment

| Check | Status |
|-------|--------|
| All routes use App Router (not Pages Router) | ✅ Yes |
| Layouts are server components by default | ✅ Yes (except root layout with client providers) |
| Route groups exist for auth/public separation | ❌ No route groups |
| `middleware.ts` exists for auth gating | Need to verify — not found in `src/middleware.ts` |
| API routes are separate from page routes | ✅ Yes (`/api/ai/ask`, etc.) |

### 1.4 Auth Integration Risk

**Critical finding:** Workshop routes check auth inside layouts or pages (using `cookies()` or Supabase session), which forces dynamic rendering. Adding Server Component caching requires careful cache key scoping to avoid cross-user data leaks.

**Recommendation:** Verify auth middleware exists at `src/middleware.ts` or the auth proxy. If auth is checked in layouts, Server Component caching must be user-scoped or use `cacheTag` with user-specific tags.

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
| Streaming breaks auth | Can revert Suspense boundaries; auth middleware testing beforehand |

---

## 6. Go/No-Go Matrix

### BLOCKING (Must Resolve Before Implementation)

| # | Item | Status | Action |
|---|------|--------|--------|
| 1 | Performance instrumentation added | ❌ Not done | **MUST:** Add `PerformanceMonitor` component and baseline measurement before ANY optimization |
| 2 | Verify auth flow doesn't break with streaming | ❌ Not verified | **MUST:** Test auth middleware + streaming compatibility |
| 3 | Seed data for peak-load testing | ❌ Not done | **MUST:** Create seed script for 50 projects, 200 rows scenarios |

### RECOMMENDED (Should Resolve Before Implementation)

| # | Item | Status | Action |
|---|------|--------|--------|
| 4 | Bundle analyzer installed | ❌ Not done | Install `@next/bundle-analyzer` |
| 5 | React Query DevTools installed (dev) | ❌ Not done | Install for cache debugging during optimization |
| 6 | `@tanstack/react-virtual` evaluated | ❌ Not done | Verify compatibility with TanStack Table + React Complex Tree |
| 7 | Philip approval on skeleton design direction | ⏳ Pending | Review with owner |

### NICE-TO-HAVE

| # | Item | Status |
|---|------|--------|
| 8 | CI performance regression check | Not needed for initial implementation |
| 9 | Visual regression testing | Defer to later phase |
| 10 | Automated Lighthouse CI | Defer to later phase |

### Overall Readiness: ⚠️ CONDITIONALLY READY

The codebase is technically ready — all necessary libraries exist, the architecture supports the proposed changes, and the loading overlay safety net is in place. However, **three blocking items must be resolved before implementation begins:**

1. Performance instrumentation (measure baseline)
2. Auth + streaming verification
3. Peak-load seed data

Once these are resolved, Phase 1 (quick wins) can begin immediately.

---

**Next:** See `04-implementation-plan.md` for the phased execution plan.
