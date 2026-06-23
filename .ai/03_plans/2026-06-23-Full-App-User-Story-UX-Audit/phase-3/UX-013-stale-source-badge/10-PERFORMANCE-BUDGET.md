# UX-013 — Performance Budget

Date: 2026-06-23 | Surface: **Estimates**

## Context

Heaviest surface: tree + table + DnD + optimistic mutations. Memoization critical.

## Core Web Vitals

| Metric | Budget (p75) | Tool |
|---|---|---|
| LCP | < 2.5s | Lighthouse / Vercel Analytics |
| INP | < 200ms | RUM |
| CLS | < 0.1 | Lighthouse |
| TTFB | < 800ms | Vercel + Supabase |
| FCP | < 1.8s | Lighthouse |

## Bundle Rules

- Prefer `src/components/ui/` over new npm packages
- `next/dynamic` + Suspense for below-fold
- `next/image` with `priority` above-fold
- No >5KB gzip per page

## Network Waterfall

| Risk | Mitigation |
|---|---|
| Supabase latency | TanStack Query 30s staleTime; prefetch on hover |
| Realtime overhead | Join on mount, leave on unmount |
| Large rows | Paginate (20-100/page) |
| Third-party scripts | Maps load only on location surfaces |

## Memoization

- `React.memo` / `useMemo` on tree nodes and D3 transforms
- `useCallback` for stable handlers
- Prefer RSC for data fetching

## Regression Gates

| Gate | Command |
|---|---|
| Lighthouse | `bun run build && lighthouse` >= 90 |
| Bundle size | `bun run build && analyze` |
| Type check | `bun run type-check` = 0 |

## Issue-Specific: UX-013

- Stale library metadata or thumbnail mismatch can lead to wrong insert/replace choices.
- Skeleton loaders must match content dimensions (no CLS)
- No blocking JS during initial render

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [09-UX-UI-DESIGN-SPEC.md](09-UX-UI-DESIGN-SPEC.md) | [13-NETWORK-AND-API-CONTRACT.md](13-NETWORK-AND-API-CONTRACT.md)
