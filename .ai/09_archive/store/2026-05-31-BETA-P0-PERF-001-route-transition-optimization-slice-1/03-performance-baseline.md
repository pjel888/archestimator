# Performance Baseline

## Captured

- Baseline build output: `baseline-build.txt`
- Final build output: `build.txt`
- Baseline validate output: `baseline-validate.txt`
- Final validation outputs: `type-check.txt`, `lint.txt`, `design-system.txt`, `unit-tests.txt`, `dom-tests.txt`, `targeted-route-tests.txt`, `build.txt`

## Build Summary

Baseline build:

```text
Compiled successfully in 13.6s
Finished TypeScript in 14.4s
Generated static pages: 27/27 in 223ms
Proxy (Middleware) present
```

Final build:

```text
Compiled successfully in 5.2s
Finished TypeScript in 10.2s
Generated static pages: 27/27 in 284ms
Proxy (Middleware) present
```

Fresh stop-hook build:

```text
Compiled successfully in 5.5s
Finished TypeScript in 12.8s
Generated static pages: 27/27 in 374ms
Proxy (Middleware) present
```

The route table includes the relevant workshop routes:

- `/workshop`
- `/workshop/projects`
- `/workshop/projects/[projectId]`
- `/workshop/projects/[projectId]/charts`
- `/workshop/projects/[projectId]/estimates`
- `/workshop/projects/[projectId]/estimates/[nodeId]`
- `/workshop/library`
- `/workshop/templates`
- `/workshop/settings`

## Code-Level Performance Changes

- Loading skeletons no longer call async `WorkshopPageShell`, `getCurrentUserContext()`, or `cookies()` before rendering.
- Sidebar/project/estimate entry points now request RSC route prefetch through `router.prefetch()`.
- Estimate row prefetch now optionally warms only real React Query estimate data keys with real query functions.
- React Query stale time is now 5 minutes, reducing unnecessary re-fetches during short revisit windows.
- Public proxy routes return before Supabase client creation, avoiding server auth lookup on public pages.

## Not Captured

Manual/browser timings were not captured. Do not infer transition milliseconds from this evidence.

Missing benchmark items:

- Cold navigation median timings.
- Warm navigation median timings.
- Overlay visibility rate.
- Hover/focus Network screenshots proving RSC prefetch.
- bfcache restore timing.
- Chrome throttling traces.
- Lighthouse or bundle analyzer reports.

## Status

Performance evidence is sufficient to prove build stability, route inventory, and code-path corrections. It is not sufficient to claim full BETA-P0-PERF completion.
