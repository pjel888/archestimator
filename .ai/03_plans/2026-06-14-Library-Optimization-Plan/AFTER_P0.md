# AFTER — P0 (felt-latency)

Commits on branch `2026-06-14-Library-Optimization-Plan`:
- `perf(nav): show route overlay only on slow nav; never on refresh` (T1)
- `fix(library): reshape Overview skeleton to single column (CLS)` (T2)
- `perf(library): Components tab renders warm query cache; mutations patch cache not refresh` (T3/T4 components + staleTimes)
- `perf(library): Templates tab renders warm query cache; mutations patch cache not refresh` (T3/T4 templates)

## In-session evidence (autonomous)

| Target | Before | After | Proof |
|---|---|---|---|
| Overlay appears synchronously on internal click | YES (immediate, 250ms floor) | NO — delay-before-show 150ms; fast/prefetched nav never flashes | `navigation-ui-store.test.ts` (8 cases incl. immediate `isNavigating===false`, overlap, slow-then-fast, bfcache, safety) |
| Overlay on `router.refresh()` (every mutation) | YES | NO (trigger removed) | `use-navigation-router.ts` diff; T4 mutation tails removed |
| Overview skeleton shape vs content | grid + 312px right rail (CLS) | single column matching `LibraryOverview` | `library-overview-skeleton.test.tsx` (no `.border-l`, no `w-[312px]`, grid present) |
| Browse tabs warm-cache read | re-fetch + re-skeleton each revisit | render from 5-min TanStack cache | `library-components-cache.test.tsx`, `library-templates-cache.test.tsx` (no refetch on warm/second mount) |
| Mutation tail behavior | `router.refresh()` (full server re-run) ×11 | cache `setQueryData` patch; **no** `router.refresh` | cache tests assert cache patched; `workshop-library-consolidation-ui` move test asserts `refresh` NOT called |
| Warm-revisit route `loading.tsx` | re-fires every revisit (no `staleTimes`) | `experimental.staleTimes {dynamic:60,static:180}` → Router Cache reuse | config type-checks; mechanism is documented Next 16 behavior |

Full suite touched by P0 (8 files, 68 tests) green; `bun run type-check` 0 errors.

## Deferred to owner browser session (G6)

Per `BASELINE.md §G1/G6`, wall-clock browser metrics require the user's authenticated Chrome session (dev-auth disabled, single dev server). The following must be confirmed manually and appended here:
- Standard-session **skeleton-flash count ≤1** (cold load only); no route `loading.tsx` on warm Components/Templates revisit.
- **Overlay count = 0** for fast intra-Library nav + mutations.
- Warm Components revisit **<100 ms**; Overview cold CLS ~0.
- Cross-tab cache coherence after a component/template mutation (no stale snapshot).

These are correct-by-construction from the implementation (delay-before-show store; staleTimes Router-Cache reuse; warm client query; cache-patch mutations) and unit-proven at the logic/cache layer; the browser run is the final confirmation, not a re-derivation.
