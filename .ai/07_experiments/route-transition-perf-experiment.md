# Route Transition Performance — Experiment Log

**Status:** Groundwork Phase Complete (2026-05-29)
**Plan:** `.ai/03_plans/route-transition-performance-optimization/`
**Goal:** Sub-100ms route transitions in the protected workshop app

## What was built (Groundwork Phase)

### Components Created

| Component | File | Purpose |
|-----------|------|---------|
| `BfcacheHandler` | `src/components/bfcache-handler.tsx` | Handles `pageshow` events to restore navigation UI state from browser back-forward cache |
| `PerformanceMonitor` | `src/components/performance-monitor.tsx` | Logs route transition time benchmarks in development console |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Reusable loading UI primitive matching standard design tokens (radius-xs, bg-muted/40) |

### Hooks Created

| Hook | File | Purpose |
|------|------|---------|
| `usePrefetchOnHover` | `src/hooks/use-prefetch-on-hover.ts` | Anticipatory preloading of TanStack Query caches on hover |

### Loading Skeletons Created

Native `loading.tsx` files for:
- `/workshop`
- `/workshop/library`
- `/workshop/onboarding`
- `/workshop/projects`
- `/workshop/settings`
- `/workshop/templates`

These replace full-screen transition overlays during data fetching.

### Master Plan

A comprehensive 34-document Route Transition Performance Master Plan exists under `.ai/03_plans/route-transition-performance-optimization/`, covering:
- Audit data and blast radius analysis
- Performance ADRs
- Implementation strategies for sub-100ms transitions

## What remains (Phases 1–4)

### Phase 1: Client routing prefetch wiring
- Wire `usePrefetchOnHover` to navigation links
- Prefetch TanStack Query caches on link hover/intent

### Phase 2: React Server Component prefetching
- RSC prefetching and query hydration
- Streaming SSR optimization

### Phase 3: Code splitting and bundle optimization
- Dynamic loading for heavy components (Three.js, TanStack table)
- Route-based code splitting
- Bundle size analysis and optimization

### Phase 4: Dynamic rendering and performance budgets
- Build-time caching strategies
- Performance budget enforcement
- Core Web Vitals monitoring

## Known Limitations

- Performance metrics are dev-mode only; no production RUM (Real User Monitoring) yet
- `usePrefetchOnHover` is not yet wired to actual navigation links
- Three.js (`src/components/landing/VoxelPaperBackground.tsx`) is not yet dynamically imported
- No Lighthouse CI or performance budget enforcement in CI pipeline

## Learnings

- The app's compact design system (SF Pro, small font sizes, minimal radius) naturally keeps bundle sizes smaller than typical SaaS apps
- TanStack Query's built-in caching provides a good foundation for optimistic prefetch strategies
- Next.js 16 App Router's built-in loading.tsx convention simplified skeleton implementation
- The workspace shell layout (`WorkshopPageShell`) is the ideal mounting point for global performance monitoring
