# Route Transition Public Baseline

Date: 2026-06-06 (session local date; JSON timestamps are UTC)
Worktree: `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`
Branch: `feat/performance-and-speed-pr-0b-cache-safety`

## Scope

This evidence advances Step 0.4 of `05-performance-roadmap-and-workstream-plan.md` for local route-transition proof. It is **local/dev Playwright evidence only** and does not prove Vercel Speed Insights real-user p75 improvement.

## Commands

```bash
bun run test:e2e:perf

OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-route-transition-public-baseline.json \
BASE_URL=http://127.0.0.1:3039 \
RUNS=3 \
NETWORK_PROFILE="No throttle" \
SKIP_AUTHENTICATED=1 \
bun run perf:measure-routes

ROUTE_TRANSITION_BENCHMARK_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-route-transition-public-baseline.json \
OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-route-transition-public-readiness.json \
bun run perf:check-routes
```

## Playwright `test:e2e:perf` result

Status: passed.

- 6 passed.
- 2 authenticated checks skipped because no authenticated storage state/dev-auth fixture was enabled.

Observed console evidence:

| Check | Result |
| --- | --- |
| Public baseline `/`, `/features`, `/pricing` | passed |
| Slow 3G public `/features` route | passed |
| Slow 3G `/features` → `/pricing` link transition | median 5792ms; overlay visibility 0 |
| No-throttle `/features` → `/pricing` link transition | median 212ms; overlay visibility 1 |
| Public bfcache/back-forward no stuck overlay | restore 82ms; `pageshow.persisted=false` in headless Chromium |
| Signed-out protected redirect `/workshop/projects` → `/login?next=...` | 370.1ms navigation duration |

## Standalone benchmark artifact

Artifact: `2026-06-06-route-transition-public-baseline.json`.

| Scenario | Median | Overlay rate | RSC requests | Runs | Failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Public: Landing to Login | 756ms | 1.00 | 3 | 3 | 0 |
| Public: About to Contact | 701ms | 1.00 | 3 | 3 | 0 |
| Public: Pricing to Contact | 699ms | 1.00 | 3 | 3 | 0 |

Authenticated scenarios were explicitly skipped:

- Authenticated: Workshop to Projects
- Authenticated: Workshop to Library
- Authenticated: Workshop to Templates
- Authenticated: Workshop to Settings

## Readiness check artifact

Artifact: `2026-06-06-route-transition-public-readiness.json`.

Result: `routeTransitionReady: true` for the public benchmark artifact.

Thresholds:

- min runs: 3
- public median budget: 15000ms
- slow 3G public median budget: 30000ms
- authenticated median budget: 10000ms
- overlay visibility rate max: 1

## Decision

Status language: **LOCAL ROUTE-TRANSITION BASELINE CAPTURED / AUTHENTICATED AND PROVIDER PROOF OPEN**.

This evidence can support local PR validation and route-transition regression checks. It does not close the full performance plan because Speed Insights p75 route/device metrics, authenticated route-transition fixture proof, and hosted/provider evidence remain open.
