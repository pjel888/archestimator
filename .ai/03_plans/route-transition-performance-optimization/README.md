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
| **Server** | Proxy auth optimization, React.cache, N+1 query fixes | Reduce server latency 100-300ms per navigation |
| **Prefetch** | Preload next route data on hover/focus | Instant navigation for predictable paths |
| **Cache** | Aggressive React Query caching + Next.js stale-while-revalidate | Instant revisits, non-blocking background refresh |
| **Suspend** | `loading.tsx` + Suspense boundaries with skeletons | Non-blocking navigation for slow server components |
| **Split** | `next/dynamic` code splitting for heavy client components | Reduced initial JS payload, faster hydration |
| **Memoize** | Strategic `React.memo` for list items and tree nodes | 10x faster re-renders (50-100ms → 5-10ms) |
| **Optimize** | Font subsetting, Three.js dynamic import, bundle analysis | Reduce landing page critical path 150KB+, workshop pages 60KB+ |
| **Protect** | Error boundaries at route and component level | Prevent full-page crashes, 20x faster recovery |
| **Static** | Static generation for rarely-changing pages (landing, settings) | Zero server compute for static surfaces |
| **Measure** | Navigation Timing API + custom performance marks + production monitoring | Data-driven optimization, regression detection |

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
| 1 | `01-performance-audit.md` | Deep-dive analysis of what's slow, where, and why. Route-by-route breakdown with specific bottlenecks. Verified against actual codebase. |
| 2 | `02-blast-radius-analysis.md` | What files, components, and execution flows are affected by each performance optimization. Risk assessment per technique. Includes verified `useNavigationRouter` call sites. |
| 3 | `03-readiness-assessment.md` | Pre-implementation checklist: what must exist before optimization can begin. Dependencies, blockers, pre-requisites. Notes: no middleware exists — auth at data layer. |
| 4 | `04-implementation-plan.md` | Phased, ordered implementation strategy. Each phase is independently shippable. Includes verification gates. **⚠️ Code splitting examples corrected for named exports (see doc 14).** |
| 5 | `05-benchmark-scenarios.md` | Concrete performance measurement scenarios: many project thumbnails, many estimate sheets, many row items, slow network, etc. |
| 6 | `06-strategy-adrs.md` | Architecture Decision Records for key performance choices. Justifies why each approach was chosen over alternatives. **ADR-005 updated with verified named export pattern.** |
| 7 | `07-baseline-metrics-template.md` | Fill-in template for collecting actual baseline measurements. Paired with the automated measurement script. |
| 8 | `08-risks-and-mitigations.md` | Risk matrix: 20 identified risks, critical-path blockers, acceptance criteria, rollback strategy. **R16 updated with verified export findings.** |
| 9 | `09-handoff-next-steps.md` | Concrete next-steps: owner approval gates, Phase 0 actions, Phase 1 execution order, documentation map, branch strategy. **Updated with verified findings.** |
| 10 | `10-skeleton-design-system.md` | Consistent skeleton UI system for all Suspense fallbacks and code-split loading states. Base primitives + route-specific skeletons. **Dynamic import examples corrected.** |
| 11 | `11-prefetch-wiring-map.md` | ⚠️ **Partially superseded** — RSC payload prefetch wiring remains valid. React Query key claims are corrected in doc 15. |
| 12 | `12-overlay-fallback-strategy.md` | Strategy for making the loading overlay a rare fallback (< 5% of navigations). Layered defense model with decision tree. |
| 13 | `13-verified-codebase-facts.md` | 🆕 **Canonical reference.** Every codebase claim verified via direct inspection. Source file + line numbers. Replace any conflicting claims from other docs. |
| 14 | `14-code-splitting-named-exports.md` | 🆕 **Critical.** Correct `next/dynamic` pattern for named exports. ALL 5 targets use `export function`. Default-import pattern WILL FAIL. Updated code examples. |
| 15 | `15-server-component-prefetch-reality.md` | 🆕 **Critical.** Corrected prefetch strategy. Most React Query keys in doc 11 do not exist. Only the estimate workspace benefits from both RSC + React Query prefetch. |
| 16 | `16-critical-path-waterfall.md` | 🆕 Detailed server+client waterfall diagrams for the heaviest routes. Identifies exact timing of each step from click to interactive. Quantifies optimization opportunities. |
| 17 | `17-server-side-optimization-strategy.md` | 🆕 Server-side bottleneck fixes: proxy.ts auth optimization, React.cache expansion, N+1 query fixes, query batching, unstable_cache strategy. Targets 100-300ms savings per navigation. |
| 18 | `18-performance-monitoring-production.md` | 🆕 Runtime monitoring, alerting thresholds, regression detection, CI/CD integration, dashboards, and incident response playbook for maintaining performance in production. |
| 19 | `19-react-memo-strategy.md` | 🆕 Component memoization plan. Currently 0 `React.memo` usage despite 245+ `useMemo`/`useCallback`. Targets 10x faster re-renders for list items and tree nodes. |
| 20 | `20-font-and-bundle-optimization.md` | 🆕 Font loading optimization (4 fonts on all pages → route-specific), Three.js dynamic import in hero section (above-fold — see ⚠️ correction), strategic code splitting, tree shaking improvements. |
| 21 | `21-error-boundary-strategy.md` | 🆕 Route-level and component-level error boundaries. Currently 0 `error.tsx` files. Prevents full-page crashes, enables 20x faster recovery (1000ms → 50ms). |

| 22 | `22-testing-and-validation-guide.md` | 🆕 Comprehensive testing strategy with baseline metrics collection, unit/integration/E2E tests, and regression prevention |
| 23 | `23-browser-compatibility-and-mobile-guide.md` | 🆕 Browser support matrix, mobile-specific scenarios, touch prefetch, and platform-specific considerations |
| 24 | `24-accessibility-and-security-guide.md` | 🆕 WCAG 2.1 compliance, screen reader support, keyboard navigation, auth security, and CSP implementation |
| 25 | `25-troubleshooting-guide.md` | 🆕 Common issues and solutions for build errors, hydration, navigation, caching, performance, and bfcache |
| 26 | `26-performance-budgets-and-monitoring.md` | 🆕 Bundle size limits, latency budgets, Core Web Vitals targets, and production monitoring strategy |
| 27 | `27-gradual-rollout-strategy.md` | 🆕 Feature flags, percentage rollouts, canary deployments, and rollback procedures for safe deployment |
| 28 | `28-code-style-guide.md` | 🆕 Coding standards, performance patterns, anti-patterns to avoid, and documentation guidelines |
| 29 | `29-future-roadmap.md` | 🆕 Long-term vision with Phase 5-6 ideas, emerging technologies, and 2027-2028 goals |
| 30 | `30-dynamic-rendering-analysis.md` | 🆕 **Critical.** Every route's dynamic rendering triggers mapped with verified codebase evidence. Identifies caching opportunities and quantifies unavoidable server overhead (~250ms per navigation). |
| 31 | `31-auth-optimization-middleware-migration.md` | 🆕 **Critical.** Concrete plan for migrating auth from WorkshopPageShell to edge middleware. proxy.ts has correct `config.matcher` but is dead code at runtime (no middleware.ts exists). 3-line fix with outsized impact. |
| 32 | `32-bfcache-strategy.md` | 🆕 **Critical.** bfcache compatibility plan for instant back/forward navigation (< 50ms restore). Without bfcache, back navigation triggers full 300-800ms server round-trip. This is the single highest-impact optimization for multi-step navigation flows. |
| 33 | `33-loading-sequence-progressive-enhancement.md` | 🆕 **Unifies the UX.** Defines the exact user experience from click to interactive for all three navigation scenarios (Ideal/Cold/Fallback). Bridges skeleton design (doc 10), overlay (doc 12), bfcache (doc 32), and prefetch (docs 11/15) into one coherent UX timeline. Mandatory reading before implementing any loading UI. Updated during audit: corrected 150ms delay claim, API naming, added gap audit section. |
| 34 | `34-implementation-handoff.md` | 🆕 **Implementation handoff.** Source-code changes made during the audit: BfcacheHandler, PerformanceMonitor, usePrefetchOnHover, Skeleton, 6× loading.tsx, store update, providers wiring. Design decisions, known issues, verification checklist, and gaps still open. **READ THIS FIRST before any code changes.** |

**Supporting tool:**
| — | `scripts/measure-route-transitions.ts` | Automated Playwright script that measures route transition timing for all major navigation paths. Run with `bun run scripts/measure-route-transitions.ts`. |

---

## 3. Reading Order

1. **Start here** (`README.md`) — understand the vision and document inventory
2. **`13-verified-codebase-facts.md`** 🆕 — READ FIRST before any implementation. Canonical codebase claims with source verification.
3. **`30-dynamic-rendering-analysis.md`** 🆕 — understand what forces every route to be dynamic and how to minimize it (READ BEFORE server-side optimization)
4. **`31-auth-optimization-middleware-migration.md`** 🆕 — plan for creating middleware.ts (proxy.ts dead code fix). READ BEFORE server-side optimization — this is the highest-ROI fix.
5. **`32-bfcache-strategy.md`** 🆕 — plan for instant back/forward navigation. bfcache alone eliminates overlay for most back/forward flows.
6. **`16-critical-path-waterfall.md`** 🆕 — understand the exact timing bottlenecks in heaviest routes
7. **`01-performance-audit.md`** — understand exactly what's slow and why
8. **`17-server-side-optimization-strategy.md`** 🆕 — server-side fixes (proxy auth, React.cache, N+1 queries)
9. **`14-code-splitting-named-exports.md`** 🆕 — correct `next/dynamic` patterns (the original examples are wrong)
10. **`15-server-component-prefetch-reality.md`** 🆕 — corrected prefetch strategy (React Query keys don't exist as assumed)
11. **`19-react-memo-strategy.md`** 🆕 — component memoization (0 → strategic usage)
12. **`20-font-and-bundle-optimization.md`** 🆕 — font loading, Three.js, bundle size reductions
13. **`21-error-boundary-strategy.md`** 🆕 — resilience via error boundaries (0 → comprehensive coverage)
14. **`05-benchmark-scenarios.md`** — understand how we'll measure success
15. **`02-blast-radius-analysis.md`** — understand impact of proposed changes
16. **`03-readiness-assessment.md`** — check if we're ready to implement
17. **`06-strategy-adrs.md`** — understand architectural decisions (ADR-005 updated)
18. **`12-overlay-fallback-strategy.md`** — understand the layered defense model for making the overlay rare
19. **`10-skeleton-design-system.md`** — understand the skeleton UI patterns for Suspense/code-split fallbacks
20. **`11-prefetch-wiring-map.md`** — RSC payload prefetch wiring (⚠️ see doc 15 for React Query corrections)
21. **`18-performance-monitoring-production.md`** 🆕 — monitoring, alerting, regression detection
22. **`04-implementation-plan.md`** — phased execution plan (code examples corrected)
23. **`22-testing-and-validation-guide.md`** 🆕 — baseline metrics collection and testing strategy (read before implementation)
24. **`28-code-style-guide.md`** 🆕 — coding standards, patterns, and anti-patterns (read before implementation)
25. **`23-browser-compatibility-and-mobile-guide.md`** 🆕 — browser support matrix and mobile considerations
26. **`24-accessibility-and-security-guide.md`** 🆕 — WCAG compliance and security requirements
27. **`26-performance-budgets-and-monitoring.md`** 🆕 — performance budgets and monitoring strategy
28. **`25-troubleshooting-guide.md`** 🆕 — common issues and solutions (reference during implementation)
29. **`27-gradual-rollout-strategy.md`** 🆕 — feature flags and safe deployment (read before deployment)
30. **`29-future-roadmap.md`** 🆕 — long-term vision and Phase 5+ ideas (read after deployment)
31. **`33-loading-sequence-progressive-enhancement.md`** 🆕 — the unified UX timeline (read before implementing ANY loading UI)
32. **`34-implementation-handoff.md`** 🆕 — source-code changes, design decisions, known issues, and open gaps (READ BEFORE WRITING CODE)

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
| Codebase Verification Audit | 2026-05-29 | ✅ Complete — `13-verified-codebase-facts.md` |
| Code Splitting Pattern Fix | 2026-05-29 | ✅ Complete — `14-code-splitting-named-exports.md` |
| Prefetch Strategy Correction | 2026-05-29 | ✅ Complete — `15-server-component-prefetch-reality.md` |
| Critical Path Analysis | 2026-05-29 | ✅ Complete — `16-critical-path-waterfall.md` |
| Server-Side Optimization | 2026-05-29 | ✅ Complete — `17-server-side-optimization-strategy.md` |
| Production Monitoring | 2026-05-29 | ✅ Complete — `18-performance-monitoring-production.md` |
| React.memo Strategy | 2026-05-29 | ✅ Complete — `19-react-memo-strategy.md` |
| Font & Bundle Optimization | 2026-05-29 | ✅ Complete — `20-font-and-bundle-optimization.md` |
| Error Boundary Strategy | 2026-05-29 | ✅ Complete — `21-error-boundary-strategy.md` |
| Dynamic Rendering Analysis | 2026-05-29 | ✅ Complete — `30-dynamic-rendering-analysis.md` |
| Auth Optimization & Middleware Migration | 2026-05-29 | ✅ Complete — `31-auth-optimization-middleware-migration.md` |
| bfcache Strategy | 2026-05-29 | ✅ Complete — `32-bfcache-strategy.md` |
| Loading Sequence & Progressive Enhancement | 2026-05-29 | ✅ Complete — `33-loading-sequence-progressive-enhancement.md` |
| Owner Approval | — | ⏳ Pending |
