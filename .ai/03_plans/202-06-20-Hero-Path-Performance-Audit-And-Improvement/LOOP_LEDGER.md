# Loop Ledger

## 2026-06-20 - Loop 1 Discover

Evidence collected:

- Route/data-flow subagents mapped the requested chain and found the route loaders are partially parallelized but the benchmark harness lacks exact hero scenarios.
- Query-path subagent identified `listProjectEstimateSheetsForProject` as over-fetching on the project dashboard because only `.length` is used there.
- Test-path subagent identified the existing benchmark scripts:
  - `scripts/measure-route-transitions.ts`
  - `scripts/check-route-transition-readiness.ts`
  - `e2e/route-transition-performance.spec.ts`
- Supabase changelog review showed no relevant hosted REST query breaking change for existing `.select`/`count` usage as of 2026-06-20.

Decision:

- Implement exact benchmark coverage first so later speed claims are measurable.
- Make small query-shaping changes that do not change UX or authorization.
- Do not add Redis in Loop 1.

## 2026-06-20 - Loop 1 Execute Plan

Planned edits:

- Add hero route constants, scenarios, dev-auth cookie support, base URL preflight, and git status metadata to `scripts/measure-route-transitions.ts`.
- Add required hero scenario checks to `scripts/check-route-transition-readiness.ts`.
- Add/update Vitest governance tests for benchmark/readiness behavior.
- Add `countProjectEstimateSheetsForProject` and use it on the project dashboard.
- Add server `withPerfTraceRequest` scopes around project dashboard, estimates list, and estimate sheet loaders.

Validation targets:

- `bun test tests/vitest/project-estimate-sheets-repository.test.ts`
- `bun test tests/vitest/route-transition-measure-script.test.ts tests/vitest/route-transition-readiness-script.test.ts`
- `bun test tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts`
- `bun run type-check` if targeted tests pass quickly.

Benchmark targets:

- `RUNS=5 INCLUDE_AUTHENTICATED=1 SCENARIO_FILTER="Authenticated Hero" OUTPUT_FILE=.ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks/hero-route-transition-local.json bun run perf:measure-routes`
- `ROUTE_TRANSITION_REQUIRE_HERO=1 ROUTE_TRANSITION_BENCHMARK_FILE=.ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks/hero-route-transition-local.json OUTPUT_FILE=.ai/03_plans/202-06-20-Hero-Path-Performance-Audit-And-Improvement/benchmarks/hero-route-readiness-local.json bun run perf:check-routes`

## 2026-06-20 - Loop 2 Implement

Implemented:

- Added exact authenticated hero scenarios to `scripts/measure-route-transitions.ts`:
  `/workshop -> /workshop/projects -> /workshop/projects/22222222-2222-4222-8222-222222222222 -> /workshop/projects/22222222-2222-4222-8222-222222222222/estimates -> /workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db`.
- Made route-transition measurement fail closed on scenario failures, missing runnable scenarios, hidden duplicate links, missing base URL, and skipped authenticated hero scenarios.
- Added storage-state/dev-auth-bypass metadata plus sanitized git status metadata to benchmark artifacts. No cookie, token, or auth state is written to this plan directory.
- Changed measurement readiness from mandatory `networkidle` waiting to route-path plus route-overlay readiness. `ROUTE_TRANSITION_WAIT_FOR_NETWORK_IDLE=1` remains available for slower diagnostic runs.
- Added click-transition warm-up so measured runs exercise the same client-navigation path they benchmark.
- Added `ROUTE_TRANSITION_REQUIRE_HERO=1` to `scripts/check-route-transition-readiness.ts`, requiring all four exact hero transitions before readiness can pass.
- Replaced project dashboard estimate count over-fetch with `countProjectEstimateSheetsForProject`, using Supabase `head: true` exact count instead of fetching rows for `.length`.
- Kept the existing manual estimate-link hover/focus prefetch path. A stateful `<Link prefetch>` attempt was rejected because quick-click testing showed a first-click race from hover-state rerendering.
- Reduced estimate-sheet route resolver duplicate validation on the tab-aware node path by reusing project-scoped selected-node data, reading tabs with the existing Supabase client, and avoiding a second project/estimate resolution round-trip.
- Added `withPerfTraceRequest`/`traced` scopes around the project dashboard, estimates list, and estimate sheet route-loader waves so future benchmark logs can correlate route slowness to server work.

## 2026-06-20 - Loop 2 Benchmark Evidence

Authenticated local benchmark:

- Artifact: `benchmarks/hero-route-transition-localhost3000-storage-state-final.json`
- Generated: `2026-06-20T02:57:05.555Z`
- Base URL: `http://localhost:3000`
- Auth mode: `storage-state`
- Runs per scenario: 5
- Warm routes before measure: `true`
- Wait for network idle: `false`
- Network profile: no throttle

Results:

| Scenario | Runs | Failures | Durations (ms) | Median (ms) |
| --- | ---: | ---: | --- | ---: |
| Authenticated Hero: Workshop to Projects | 5 | 0 | 717, 1176, 750, 704, 889 | 750 |
| Authenticated Hero: Projects to Target Project | 5 | 0 | 698, 958, 1278, 1226, 963 | 963 |
| Authenticated Hero: Target Project to Estimates | 5 | 0 | 629, 1714, 1210, 690, 799 | 799 |
| Authenticated Hero: Estimates to Target Estimate | 5 | 0 | 11201, 978, 1041, 866, 710 | 978 |

Readiness gate:

- Artifact: `benchmarks/hero-route-readiness-localhost3000-storage-state-final.json`
- `routeTransitionReady`: `true`
- Required hero scenarios present: 4/4
- Scenario failures: 0
- Median budget: 10000 ms for authenticated scenarios
- Readiness medians: 750 ms, 963 ms, 799 ms, 978 ms

Caveat:

- The deepest transition still had one first measured run at 11201 ms, even after a throwaway click-transition warm-up. The median is under 1 second and readiness passes, but this remains the next performance investigation target before claiming cold-path production behavior.
- This is local dev proof against `localhost:3000` with temporary Playwright storage-state auth. It is not hosted, production, CDN, or manual-user proof.

## 2026-06-20 - Loop 2 Validation

Passed:

- `bun test tests/vitest/estimate-tabs-domain.test.ts tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/route-transition-measure-script.test.ts tests/vitest/route-transition-readiness-script.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/live-estimate-node-route.test.ts`
  - 33 tests passed.
- `bun run type-check`
  - `tsc --noEmit` passed.
- `git diff --check`
  - Passed with no whitespace errors.

Known validation gap:

- `tests/vitest/project-estimates-table-inline-edit.test.tsx` was not used as completion evidence because the current dirty worktree has unrelated concurrent edits and the Bun harness hits an existing `server-only`/`vi.hoisted` issue there. The performance changes are covered by the targeted route/repository/harness tests above.

## 2026-06-20 - Loop 3 Reviewer Hardening

Implemented after review:

- Added bounded RPC `project_estimate_list_summaries_for_estimates(target_project_id uuid, target_estimate_ids uuid[])` and changed the dashboard recent-estimates path to aggregate only the already-selected recent estimate ids.
- Hardened the route benchmark auth path: dev-auth bypass is local-only, the bypass cookie is `httpOnly`, and artifacts no longer record whole-worktree `gitStatusShort`.
- Tightened readiness so any individual authenticated hero run over the 10000 ms budget fails the gate, not only over-budget medians.
- Fixed benchmark path readiness to wait for the actual target pathname and route overlay, so failed client navigations cannot be counted as fast.
- Removed the expensive estimates-table hover query prefetch for `fetchEstimateTree`, `estimateRepository.getEstimateTree`, and `loadProjectComponentLibraryLite`; the open link now prefetches only the destination route. This eliminated click-time contention from full tree and component-library server actions.
- Set estimate tree query hooks to `refetchOnMount: false`, so server-seeded route trees are not re-fetched on first client mount.

Provider evidence:

- Applied `supabase/migrations/20260620030500_project_estimate_list_summaries_for_estimates.sql` to linked Supabase project `ebxxqidacheyapmmzavr` with exit 0.
- Live bounded RPC call returned only the requested project-owned estimate row; fake id returned no row.
- Grant check returned `authenticated_can_execute: true` and `anon_can_execute: false`.
- A later extra catalog query hit transient Supabase CLI temp-role auth failures; no further provider mutation was needed.

## 2026-06-20 - Loop 3 Final Benchmark Evidence

Authenticated local benchmark:

- Artifact: `benchmarks/hero-route-transition-localhost3000-storage-state-final.json`
- Readiness artifact: `benchmarks/hero-route-readiness-localhost3000-storage-state-final.json`
- Generated: `2026-06-20T03:45:50.062Z`
- Base URL: `http://localhost:3000`
- Auth mode: `storage-state`
- Runs per scenario: 5
- Warm routes before measure: `true`
- Wait for network idle: `false`
- `gitStatusShort` in artifact: absent

Results:

| Scenario | Runs | Failures | Durations (ms) | Median (ms) | Max (ms) |
| --- | ---: | ---: | --- | ---: | ---: |
| Authenticated Hero: Workshop to Projects | 5 | 0 | 659, 641, 686, 766, 665 | 665 | 766 |
| Authenticated Hero: Projects to Target Project | 5 | 0 | 699, 908, 1013, 918, 891 | 908 | 1013 |
| Authenticated Hero: Target Project to Estimates | 5 | 0 | 829, 737, 774, 725, 690 | 737 | 829 |
| Authenticated Hero: Estimates to Target Estimate | 5 | 0 | 817, 1318, 674, 1065, 665 | 817 | 1318 |

Readiness gate:

- `routeTransitionReady`: `true`
- Missing requirements: none
- Required hero scenarios present: 4/4
- Scenario failures: 0
- Authenticated max-duration budget: 10000 ms
- Worst observed run: 1318 ms

Remaining caveats:

- This is local dev proof against `localhost:3000` with temporary Playwright storage-state auth. It is not hosted, production, CDN, or manual-user proof.
- The full estimates-list route still renders the current all-rows UX; pagination/windowing remains a future scalability improvement if estimate count grows materially.

## 2026-06-20 - Loop 3 Final Validation

Passed:

- `bun test tests/vitest/project-estimate-sheets-repository.test.ts tests/vitest/route-transition-measure-script.test.ts tests/vitest/route-transition-readiness-script.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-estimate-list-summaries-parity.test.ts`
  - 40 tests passed.
- `bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/list-project-estimates-columns.test.ts --maxWorkers=1`
  - 2 files, 16 tests passed.
- `bun run type-check`
  - `tsc --noEmit` passed.
- `git diff --check`
  - Passed.

Completion state:

- Handoff updated at `HANDOFF.md` for low-credit takeover.
- Final benchmark/readiness artifacts are current and route-transition-ready.

## 2026-06-20 - Loop 4 Independent Verification + Gap Closure (parallel-agent sweep)

A fresh takeover ran a 5-lane parallel verification of the prior "complete" claim (not trusting the handoff), then closed every real gap found. All implementation lanes used disjoint file scopes to stay safe under concurrent multi-agent editing; the orchestrator ran the authoritative full validation on the integrated tree.

Verification lanes (independent, read-only):

- Local validation re-run: 40 + 16 tests pass, `type-check` clean, `git diff --check` clean — matched the handoff exactly.
- Code-claims audit: all 9 claimed code changes confirmed EXISTS with file:line evidence.
- Provider verify: RPC live, grants correct (authenticated=true, anon/public=false), DDL matches local file, bounded behavior confirmed (fake estimate id returns 0 rows). FOUND GAP: migration `20260620030500` was applied via direct `supabase db query` DDL and was NOT recorded in the remote migration ledger (`schema_migrations`); local dir and remote ledger were out of sync.
- Adversarial correctness/security review: NO blocking regressions across the bounded RPC, dev-auth bypass, head-count, `refetchOnMount:false`, hover-prefetch removal, resolver dedup, and readiness max-duration logic. FOUND 2 testing gaps: no cross-project-scoping guard for the RPC call site/SQL; no freshness guard for `refetchOnMount:false`.
- Cold-path root cause: the deepest-transition one-time ~10.6s spike (artifact value 10622ms; the handoff's "11201ms" was a recall) is a `next dev` on-demand route-compilation artifact, NOT a production defect. Server query path verified bounded (indexed single-node lookup, parallel `Promise.all` waves, `limit`-capped tree/row-item fetches, no N+1). It disappeared on a later identical rerun (run-1 = 817ms) and showed `rscRequestCount: 1` even during the spike.

Gaps closed:

- Provider ledger reconciled: `supabase migration repair --status applied 20260620030500` (ledger-only write, no DDL re-run). Confirmed via `supabase migration list --linked` (Remote column now populated) and MCP `list_migrations` (final entry now `20260620030500 / project_estimate_list_summaries_for_estimates`). Project `ebxxqidacheyapmmzavr` only.
- Added `tests/vitest/project-estimate-list-summaries-scoping.test.ts` (6 tests): guards that the dashboard recent-estimates path always calls the RPC with both `target_project_id` and `target_estimate_ids` (cross-project-leak vector), and that the migration SQL keeps SECURITY INVOKER + `set search_path = public` + revoke-from-anon/public + grant-to-authenticated.
- Added `tests/vitest/estimate-tree-refetch-on-mount.test.tsx` (4 tests, mutation-tested): guards prop-sync reconciliation (`syncLocalNodesFromProps` updates the cache on fresh server props) and that both tree hooks keep `refetchOnMount: false`.
- Hardened benchmark warm-up in `scripts/measure-route-transitions.ts`: extracted `settleAfterTransition(page)` and reused it on BOTH the warm-up and measurement paths so warm-up now awaits the same overlay + optional network-idle readiness as measurement. Previously warm-up skipped the network-idle wait, deferring first-hit compilation tail into the first measured run. Measurement timing/scenarios/budgets/artifact shape unchanged.

Authoritative validation (orchestrator, integrated tree):

- `bun test` (7 handoff files): 40 pass, 0 fail.
- `bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/list-project-estimates-columns.test.ts tests/vitest/project-estimate-list-summaries-scoping.test.ts tests/vitest/estimate-tree-refetch-on-mount.test.tsx --maxWorkers=1`: 26 pass (4 files).
- `bun run type-check`: clean (exit 0).
- `git diff --check`: clean (exit 0).

Updated cold-path caveat: the deepest-transition cold spike is now root-caused as a dev-only compilation artifact and the warm-up has been hardened to absorb it; it is no longer an open production-performance investigation item. Production-like cold-path proof (`next build && next start`, or hosted) remains the only way to fully characterize cold behavior, but there is no evidence of a server-side data defect.

## 2026-06-20 - Loop 5 Production-Speed Investigation + Optimization Wave

Goal escalated by owner: make the hero path production-grade fast for real users, no UX/UI change, proven by benchmark.

Discovery / measurement:
- Built a real-browser soft-nav benchmark driven through the owner's signed-in Chrome via Kimi WebBridge against a local `next start` production build (`scripts/bench-hero-browser.mjs`), and an authenticated server-timing harness (`scripts/bench-hero-server.mjs`).
- Recovered a full 8-lane performance audit from a prior workflow whose runner died before synthesis (transcripts salvaged). Headline measured issues: estimate-sheet route 759 kB First Load JS (~2× others); per-row RLS `can_access_estimate()` 47 ms/53 rows.
- DEFINITIVE FINDING: local hero-path slowness is network-bound — dev machine → hosted Supabase RTT is 0.3–5 s/call (measured), DB executes in <1 ms in-region, unauth `/login` serves in 4–17 ms. Local `next start` on a residential link cannot represent production.
- Live `www.archestimator.com` is ~13 days stale (no latest main, no these changes) → not a valid measure either.

Implemented (safe, zero-UX, parallel agents, disjoint file scopes; all type-check/build/test green):
- A4 React `cache()` memoization of `createSupabaseServerClient`; A6 parallelized shell loader tail; A3 dynamic-imported 4 estimate-sheet modals off the 759 kB route; A9 dynamic-imported settings/feedback modal bodies; A11 dynamic-imported flag-off copilot; A5 dashboard→sheet hover-prefetch; A8 immutable image-proxy cache; A16 tabs `refetchOnMount:false`. Auth path already deduped via `cache()`.
- Reverted a stray exploratory `clickHref` edit to `measure-route-transitions.ts` (was unused; broke a guard test). Cleared stale `.next/dev/types` (false type-check error).

Validation (integrated tree): `bun run type-check` exit 0; `bun run build` exit 0; targeted Vitest across auth/estimate/dashboard/settings/route-transition suites green.

Owner decision (recorded): SKIP production proof for now (multiple coding agents active in the codebase). Created `DEPLOY-AND-MEASURE.md` runbook so a full `main` deploy + re-benchmark can be run later. Changes left uncommitted in the working tree by design. Owner-decision wins (RLS hoist B1, list pagination B2, browserslist trim B5, dashboard server-shell B4, speed-insights A1) documented, not implemented.

Artifacts: `audit/AUDIT-2026-06-20.md`, `DEPLOY-AND-MEASURE.md`, `benchmarks/hero-browser-*.json`, `benchmarks/hero-server-*.json`.
