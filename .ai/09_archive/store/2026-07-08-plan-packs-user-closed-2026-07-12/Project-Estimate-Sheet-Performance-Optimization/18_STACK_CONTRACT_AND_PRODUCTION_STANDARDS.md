# 18 - Stack Contract And Production Standards

## Repo Stack Contract

Current baseline from project guidance:
- Next.js 16
- React 19
- Bun
- TypeScript
- Tailwind v4
- Cloudflare Workers/OpenNext
- D1
- R2
- Durable Objects
- Queues/Cron
- Cloudflare Email
- Better Auth
- TanStack Query
- Zustand

## Official Guidance Applied

### Next.js

Next.js App Router docs state pages/layouts are Server Components by default and Client Components should be used for interactivity/browser APIs. They also recommend narrowing `'use client'` boundaries to reduce client JavaScript. This plan therefore keeps server route bootstrap and makes the interactive sheet boundary intentional rather than widening client state.

Next.js fetching docs call out streaming with `loading.js` or `Suspense`, and warn that uncached data should be covered by appropriate Suspense/loading boundaries. This plan keeps the current route skeleton and adds more precise measurement before changing loading shape.

Next.js cache docs distinguish `revalidateTag` stale-while-revalidate behavior from `updateTag` read-your-own-writes behavior. This plan treats estimate edits as read-your-own-writes inside actions where cache invalidation is used.

### React 19

React docs frame `useMemo` as caching expensive calculations and note the React Compiler may reduce manual memoization need. This plan therefore avoids blanket memoization and targets measured expensive selectors.

React `useDeferredValue` is appropriate when a slow list would block typing. This plan applies it to search/filter rendering.

React `useTransition` provides interruptible non-urgent updates. This plan applies it to filter/group/expand interactions where immediate input should win over expensive rendering.

React `<Profiler>` can measure render performance programmatically. This plan uses it in tests/perf mode.

### TanStack Query

TanStack Query docs require top-level serializable array query keys unique to the data. This plan expands future query keys to include subtree/window/filter/sort dimensions when those dimensions affect fetched data.

TanStack Query defaults consider query data stale by default, but `staleTime` makes data fresh until elapsed or invalidated. Current code already uses five-minute `staleTime`; future work must preserve explicit freshness semantics.

TanStack Query render optimizations use structural sharing and tracked properties. This plan keeps payloads JSON-compatible and uses query data as transport snapshots.

### TanStack Virtual

TanStack Virtual docs require accurate `count`, scroll element, and `estimateSize`; for dynamic measuring, the docs recommend estimating the largest likely item size within comfort. Current row/branch virtualizers use estimated sizes and `measureElement`; future work must validate mixed row heights.

TanStack Virtual React docs note `useFlushSync` defaults to true and may impact performance. Current flags set `useFlushSync: false`; future changes must keep this measured rather than accidental.

### web.dev

web.dev defines good INP as <= 200 ms at the 75th percentile and defines tasks over 50 ms as long tasks. This plan uses those as responsiveness constraints and sets stricter lab budgets for core sheet interactions.

### Cloudflare D1 And SQLite

Cloudflare D1 docs state indexes improve performance by reducing rows scanned for common predicates. D1 release notes state `rows_read` and `rows_written` are available per query, and `PRAGMA optimize` is supported/recommended after schema/index changes. SQLite docs require `EXPLAIN QUERY PLAN` to verify actual planner behavior.

This plan therefore requires query-plan proof before any index migration.

## Production Standards

- No production/provider claim without hosted evidence.
- No performance claim without artifact.
- No broad refactor without fallback.
- No index migration without query-plan proof.
- No React changes without targeted tests and React Doctor.
- No proof output containing sensitive raw data.

