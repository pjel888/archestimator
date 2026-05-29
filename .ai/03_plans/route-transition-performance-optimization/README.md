# Route Transition Performance Optimization — Master Plan

**Status:** Planning  
**Created:** 2026-05-29  
**Phase:** Pre-implementation audit, research, readiness, and strategy  
**Goal:** Sub-100ms route transitions with zero perceived lag; loading overlays relegated to truly slow components only

---

## Plan Metadata (per `.ai/03_plans/README.md` rules)

| Field | Value |
|-------|-------|
| **Exact user job** | Users navigate between workshop pages (projects, estimates, library, charts, settings) and expect instant transitions. Currently transitions take 300–800ms with a loading overlay. Users want pages so snappy there's basically 0 lag — only truly slow components should show spinners. |
| **Routes/screens affected** | All 23 routes in `src/app/`: landing pages (`/`, `/features`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`), auth (`/login`, `/auth/callback`, `/invite/[token]`), workshop protected (`/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/projects/[projectId]/estimates/[nodeId]`, `/workshop/projects/[projectId]/charts`, `/workshop/library`, `/workshop/templates`, `/workshop/components`, `/workshop/settings`, `/workshop/settings/profile`, `/workshop/settings/workspace`, `/workshop/onboarding`), shared (`/share/[token]`) |
| **Non-goals** | Supabase query optimization; CDN/edge caching; PWA/service worker; removing the loading overlay; server-side rendering framework migration; image optimization |
| **Files expected to change** | See `04-implementation-plan.md` §8 (40+ files: 10 new, 20+ modified, 10 audited) |
| **Validation gate** | `bun run validate && bun run build && bun run test:e2e` after each phase. Benchmark scenarios measured against Phase 0 baseline. |
| **Deletion criteria if rejected** | Delete `route-transition-performance-optimization/` folder and `scripts/measure-route-transitions.ts`. Revert `staleTime` in `providers.tsx` if changed. Remove any `loading.tsx` files created. No other files modified in Phase 0. |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Document Inventory](#2-document-inventory)
3. [Reading Order](#3-reading-order)
4. [Success Criteria](#4-success-criteria)
5. [Non-Goals](#5-non-goals)
6. [Relationship to Archived Loading Overlay](#6-relationship-to-archived-loading-overlay)

---

## 1. Executive Summary

### The Problem

The archestimator app currently has ~23 pages across landing, auth, workshop, shared, and settings surfaces. Navigation between pages relies on a global loading overlay (implemented from `.ai/09_archive/route-transition-loading-overlay/`) to mask latency. But masking latency is not the same as eliminating it.

**Current reality:**
- Most workshop pages are Server Components that fetch Supabase data on every render
- Zero route prefetching — every navigation is a cold start
- Zero Suspense boundaries — entire route blocks until all data resolves
- Zero `next/dynamic` code splitting — all JavaScript is eagerly loaded
- React Query `staleTime` of only 30 seconds — data revalidates frequently
- Heavy components like `ProjectEstimatesTable`, `EstimateSheetTree`, and `ComponentLibraryManager` hydrate large DOM trees on every render

**What users experience:**
- Click a sidebar link → 300–800ms of blank screen before anything renders
- First visit to `/workshop/projects` → Supabase round-trip latency + React hydration
- Navigate to a heavy estimate sheet → full tree + table hydration on every visit
- Browser back/forward → complete re-fetch and re-render

### The Vision

**Pages must be so snappy that basically 0 lag.** When a user changes pages, it should feel instantaneous. Only truly slow components (massive tables, complex charts) should show loading spinners. The route transition loading overlay becomes a safety net, not the primary UX.

### The Approach

This is NOT a single feature. It's a multi-layered performance strategy:

| Layer | Technique | Target |
|-------|-----------|--------|
| **Prefetch** | Preload next route data on hover/focus | Instant navigation for predictable paths |
| **Cache** | Aggressive React Query caching + Next.js stale-while-revalidate | Instant revisits, non-blocking background refresh |
| **Suspend** | `loading.tsx` + Suspense boundaries with skeletons | Non-blocking navigation for slow server components |
| **Split** | `next/dynamic` code splitting for heavy client components | Reduced initial JS payload, faster hydration |
| **Static** | Static generation for rarely-changing pages (landing, settings) | Zero server compute for static surfaces |
| **Measure** | Navigation Timing API + custom performance marks | Data-driven optimization, not guessing |

### The Target

| Metric | Current (estimated) | Target |
|--------|---------------------|--------|
| Route transition (click to visible) | 300–800ms | < 100ms |
| Revisit to cached page | 200–500ms | < 50ms |
| Heavy estimate sheet first load | 500–1500ms | < 500ms with skeleton |
| Back/forward navigation | 300–800ms | < 50ms (from bfcache) |
| Initial JS bundle (workshop) | Unknown | < 150KB (compressed) |

---

## 2. Document Inventory

| # | Document | Purpose |
|---|----------|---------|
| 1 | `01-performance-audit.md` | Deep-dive analysis of what's slow, where, and why. Route-by-route breakdown with specific bottlenecks. |
| 2 | `02-blast-radius-analysis.md` | What files, components, and execution flows are affected by each performance optimization. Risk assessment per technique. |
| 3 | `03-readiness-assessment.md` | Pre-implementation checklist: what must exist before optimization can begin. Dependencies, blockers, pre-requisites. |
| 4 | `04-implementation-plan.md` | Phased, ordered implementation strategy. Each phase is independently shippable. Includes verification gates. |
| 5 | `05-benchmark-scenarios.md` | Concrete performance measurement scenarios: many project thumbnails, many estimate sheets, many row items, slow network, etc. |
| 6 | `06-strategy-adrs.md` | Architecture Decision Records for key performance choices. Justifies why each approach was chosen over alternatives. |
| 7 | `07-baseline-metrics-template.md` | Fill-in template for collecting actual baseline measurements. Paired with the automated measurement script. |
| 8 | `08-risks-and-mitigations.md` | Risk matrix: 15 identified risks, critical-path blockers, acceptance criteria, rollback strategy. |
| 9 | `09-handoff-next-steps.md` | Concrete next-steps: owner approval gates, Phase 0 actions, Phase 1 execution order, documentation map, branch strategy. |

**Supporting tool:**
| — | `scripts/measure-route-transitions.ts` | Automated Playwright script that measures route transition timing for all major navigation paths. Run with `bun run scripts/measure-route-transitions.ts`. |

---

## 3. Reading Order

1. **Start here** (`README.md`) — understand the vision and document inventory
2. **`01-performance-audit.md`** — understand exactly what's slow and why
3. **`05-benchmark-scenarios.md`** — understand how we'll measure success
4. **`02-blast-radius-analysis.md`** — understand impact of proposed changes
5. **`03-readiness-assessment.md`** — check if we're ready to implement
6. **`06-strategy-adrs.md`** — understand architectural decisions
7. **`04-implementation-plan.md`** — phased execution plan

---

## 4. Success Criteria

### Functional

- [ ] Clicking any sidebar link or project card shows the new page content within 100ms
- [ ] Hovering a link triggers background data prefetch before the click
- [ ] Revisiting a recently-viewed page is instantaneous (from cache, no loading overlay)
- [ ] Browser back/forward restores the previous page instantly (bfcache-compatible)
- [ ] Heavy estimate sheets render a skeleton UI within 50ms, full content within 500ms
- [ ] The route loading overlay only appears when a route takes > 200ms to commit

### Observational

- [ ] Lighthouse Performance score ≥ 90 for all workshop pages
- [ ] Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Next.js build output shows minimal "First Load JS" per route (< 150KB compressed)
- [ ] DevTools Network tab shows cached responses (304 or disk cache) for revisits
- [ ] React DevTools profiler shows no unnecessary re-renders on navigation

### Non-regression

- [ ] All existing Playwright E2E tests pass
- [ ] All existing Vitest unit tests pass
- [ ] `bun run build` succeeds with zero errors
- [ ] `bun run validate` passes
- [ ] No visual regressions in landing pages or workshop surfaces
- [ ] Auth flows (login, callback, invite, share) unchanged

---

## 5. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| **Server-side rendering framework migration** | Next.js 16 App Router is the committed stack |
| **Supabase query optimization** | This plan focuses on the client-side transition experience; server query optimization is a separate concern |
| **New state management library** | Zustand + TanStack Query are sufficient |
| **Service Worker / PWA** | Out of scope for this performance initiative |
| **CDN / edge caching configuration** | Deployment-level concern; focus is app-level optimization |
| **Image optimization / lazy loading** | Covered by existing Next.js Image component patterns |
| **CSS / Tailwind bundle optimization** | Covered by Tailwind v4's JIT engine |
| **Removing or replacing the route overlay** | The overlay is a safety net; this plan makes it rarely visible, not removed |

---

## 6. Relationship to Archived Loading Overlay

The route transition loading overlay (`.ai/09_archive/route-transition-loading-overlay/`) is already implemented and active in `src/app/providers.tsx`. It provides a global dark scrim + spinner on every navigation.

**This plan does NOT remove or replace the overlay.** It works in concert:

- **Before this plan:** Every navigation triggers a dark scrim overlay. Users see a spinner for 300–800ms. The overlay masks latency but does nothing to reduce it.

- **After this plan:** Cached/prefetched routes commit in < 100ms — the overlay's 250ms minimum display timer means it won't even appear. Slower routes (first-visit estimate sheets with hundreds of rows) show skeleton UIs instead of blank screens, and the overlay only appears as a last resort for exceptionally slow (> 500ms) transitions.

**The overlay becomes a safety net, not the primary experience.**

---

## Sign-off

| Role | Date | Status |
|------|------|--------|
| Research & Audit | 2026-05-29 | ✅ Complete |
| Blast Radius Analysis | 2026-05-29 | ✅ Complete |
| Readiness Assessment | 2026-05-29 | ✅ Complete |
| Implementation Plan | 2026-05-29 | ✅ Complete |
| Owner Approval | — | ⏳ Pending |
