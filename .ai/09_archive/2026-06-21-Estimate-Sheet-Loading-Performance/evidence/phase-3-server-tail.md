# Phase 3 Evidence: Server Tail Streaming Split

Date: 2026-06-22

## Implemented

- Updated `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`.
- Kept Block 1 in `workshop.estimate-sheet`:
  - `estimate-sheet.route-context`
  - `estimate-sheet.current-user`
- Moved Block 2 into inline async server component `EstimateWorkspaceResolved`.
- Wrapped `EstimateWorkspaceResolved` in `<Suspense fallback={<EstimateSheetRouteSkeleton />}>`.
- Kept Block 2 trace labels:
  - `workshop.estimate-sheet-tail`
  - `estimate-sheet.tabs`
  - `estimate-sheet.edit-capability`
- Kept `canEditEstimate` server-authoritative; no edit affordance is rendered before the tail resolves.

## Scope Decision

Implemented Option 3A from `19-COMPREHENSIVE-IMPLEMENTATION-PLAN.md`.

Option 3B was not implemented because it would require a new client edit-capability hydration surface and has higher risk of permission/tab flicker. The architect lane recommended Option 3A as the mechanically compatible low-risk first pass.

## Verification

```bash
bunx vitest run tests/vitest/live-estimate-node-route.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-tree-refetch-on-mount.test.tsx tests/vitest/estimate-sheet-route-loading.test.ts --maxWorkers=1
```

Result:

```text
Test Files  7 passed (7)
Tests       30 passed (30)
```

```bash
bun run type-check
```

Result:

```text
$ tsc --noEmit
```

Passed.

```bash
bun run build
```

Result:

```text
Compiled successfully in 13.0s
Finished TypeScript in 15.4s
Generating static pages using 7 workers (35/35)
Finalizing page optimization ...
```

Build passed.

## Runtime Timing Gap

No live `[perf-json]` route trace was captured in this pass. The code-level trace split is covered by source tests and build proof, and the authenticated browser smoke observed the local sheet route skeleton during a delayed route-data client navigation, but no provider/Vercel/Supabase latency improvement is claimed.

## Rollback

Revert the `page.tsx` `Suspense`/`EstimateWorkspaceResolved` split and return Block 2 to the default page function after Block 1.
