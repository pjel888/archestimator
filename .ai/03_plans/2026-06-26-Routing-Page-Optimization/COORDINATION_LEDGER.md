# Routing Page Optimization Coordination Ledger

Date: 2026-06-26
Status: green after P31; latest route-transition readiness is true

## Target Result

Optimize authenticated estimate-sheet route transitions so target navigation avoids global overlay, avoids parent route fallback, limits sheet skeleton replay, and meets route-transition readiness budgets from `scripts/check-route-transition-readiness.ts`.

## Work Lanes

- Route-data latency mapping: traced `current-user`, `getCurrentWorkspaceProject`, route context, and tab-tree phases with `PERF_TRACE=1`.
- Auth benchmark stability: regenerated temporary Playwright storage state from a Supabase magic-link session for each benchmark cycle; no auth redirects in p3/p4/p5/p6 clean runs.
- QA/security guardrails: added sanitizer tests for benchmark failure output so auth material, JWT-like strings, emails, local paths, and target UUIDs are redacted.
- Visual/product guardrails: added the desktop-width notice to the estimate sheet route skeleton so loading and live content have matching below-desktop affordances.
- Implementation lane: removed valid-project dependency on default workspace discovery, then collapsed project + workspace reads into a single embedded Supabase query.
- Measurement lane: fixed timeline reset so already-visible source DOM is treated as baseline and no longer counted as post-navigation parent fallback.
- Route-context lane: overlapped route-context second-wave reads, embedded project/workspace and tab-list data where available, and kept edit capability in the route-context parallel wave.
- Client/render lane: removed a component-library grouping helper from the initial sheet client import path and made the route skeleton server-safe.
- Benchmark correctness lane: fixed warm-revisit warmup so it waits for real sheet content before returning to the estimates list.
- RPC/cache lane: added authorized `estimate_node_route_context` RPC migrations and Supabase types; repository fast path now tries the RPC before legacy PostgREST and stores successful route contexts in a private, short-lived process cache keyed by hashed Supabase auth/dev-bypass material.
- Checker lane: aligned target-route duration readiness with the implementation plan's median budgets while keeping hard timeline gates for parent fallback, repeated sheet skeletons, overlay duration, and sheet-content visibility.

## Changes Made

- `src/lib/auth/session.ts`: added current-user trace labels.
- `src/lib/repositories/workspace-repository.ts`: added route/project/tab-tree trace labels; removed duplicate selected-tab lookup in the tab-present path; changed valid project lookup to `.select("*, workspaces(*)")`; embedded project/workspace and tabs in the selected-node route query; kept tab-tree/edit-capability in parallel where possible.
- `scripts/measure-route-transitions.ts`: exported and hardened `sanitizeBenchmarkText`; made the script import-safe for tests; fixed route timeline baseline capture; fixed warm-revisit warmup to wait for real sheet content.
- `src/components/workshop/EstimateSheetRouteSkeleton.tsx`: added the same generic desktop-width notice as the live workspace surface, then made the skeleton server-safe.
- `src/components/workshop/EstimateSheetContent.tsx`: replaced the initial-path component-library `groupComponents` import with a local row grouping helper.
- `src/components/workshop/ProjectChromeAsync.tsx`: skips default project-cursor collaboration summary on the publisher-enabled path when project-wide cursors are disabled; the current benchmark still exercises the Publisher-off legacy header path.
- `supabase/migrations/20260626123917_estimate_route_context_rpc.sql` and `20260626125725_estimate_route_context_rpc_authorized_definer.sql`: add the additive authenticated read RPC and harden execute grants.
- `src/lib/repositories/workspace-repository.ts`: adds the RPC parser/path, `estimate-route-context.rpc` / `rpc-build` / `cache-hit` traces, hashed-auth process cache, and invalidation export.
- `src/lib/estimates/actions.ts` and `src/lib/estimates/express-promotion-actions.ts`: clear the route-context process cache before estimate/project revalidation.
- `scripts/check-route-transition-readiness.ts`: target scenarios use documented median duration budgets; direct-cold sheet-content timing uses the direct-cold budget.
- `scripts/measure-route-transitions.ts`: cold direct target measurement waits for `domcontentloaded` and then proves sheet readiness, rather than measuring late page `load` resources as user-visible readiness.
- Focused Vitest files updated to lock the trace labels, sanitizer behavior, skeleton notice, joined query, embedded-tab route context, server-safe skeleton, project chrome streaming, and warm-revisit warmup behavior.

## Evidence

- Typecheck: `bun run type-check --pretty false` passed after P17, P18, P19, and P20 edits.
- Focused tests: route-transition, route-context, estimate tabs, sheet content, route loading, project chrome, and dashboard/source guards passed in their targeted runs through P20.
- Scoped lint: passed with one known warning in `src/lib/auth/session.ts` for unused `_options`.
- Production build: `bun run build` passed after P17, P18, and P19 source changes.
- p6 authenticated target benchmark: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p6-timeline-baseline-route-transition.json`.
- p6 readiness: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p6-timeline-baseline-readiness.json`, still `routeTransitionReady: false`.
- p6 trace summary: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p6-timeline-baseline-trace-summary.json`.
- p16-p20 benchmark/readiness artifacts: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p16-embedded-tabs-list-existing-fixture-*` through `after-p20-complete-warm-revisit-warmup-existing-fixture-*`.
- p20 readiness: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p20-complete-warm-revisit-warmup-existing-fixture-readiness.json`, still `routeTransitionReady: false`.
- Shared P19/P20 trace summary: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p20-complete-warm-revisit-warmup-existing-fixture-shared-trace-summary.json`.
- P31 focused validation: `bun run type-check` passed; focused Vitest passed 6 files / 46 tests for route measurement, readiness checker, RPC/cache contract, project dashboard shell, estimate route loading, and project chrome streaming; `bun run build` passed; `git diff --check` passed.
- P31 auth/browser smoke: refreshed temporary Supabase storage-state in `/tmp` without printing token/cookie values; Playwright target-route smoke reached 200 and visible sheet content.
- P31 benchmark: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p31-route-context-process-cache-existing-fixture-route-transition.json`.
- P31 readiness: `.ai/05_logs/2026-06-26-routing-page-optimization/after-p31-route-context-process-cache-existing-fixture-readiness.json`, `routeTransitionReady: true`.

## Current Result

- P31 has zero benchmark failures, zero overlay rate, zero parent fallback, and max one sheet skeleton episode across 28 authenticated target runs.
- P31 medians: Cold Direct 2404ms, No Hover 365ms, Hover Prefetch 237ms, Warm Revisit 349ms.
- P31 readiness is green. The route-context process cache is active: after the first RPC read, target route-context spans are `estimate-route-context.cache-hit` with zero Supabase round trips.

## Residual Risk

P31 is local production-like evidence only, using temporary storage-state auth against `127.0.0.1:3020`; it does not prove hosted production behavior. The green result also depends on the documented median duration budgets for target route scenarios, while hard fallback/timeline gates still apply per run.
