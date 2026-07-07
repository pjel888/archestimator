# Rollout, Rollback, and Operations

## Rollout sequencing (per gate)

| Gate | Merge | Closed-beta rollout | Production rollout | Staged? | Rollback trigger |
|---|---|---|---|---|---|
| L1 bundle (per-route, advisory) | Any time | n/a (tooling) | n/a | No | Revert script change; advisory never blocks |
| L1 bundle (strict promotion) | After advisory window + owner sign-off (OPEN-PERF-01) | n/a | n/a | Advisory window (2 weeks recommended) | Flip `PERF_BUDGET_STRICT` back to unset; or revert per-route budget map |
| L1 Tier-A route smoke | Stays blocking (status quo) | n/a | n/a | No | Loosen Tier-A value back to pre-tightening (if tightened post-Phase-0) |
| L2 Tier-B deep | Optional CI job (dispatch/label); not per-PR critical path | n/a | n/a | No | Disable the optional job / remove label trigger |
| L3 hosted p95 | Pre-release/scheduled | After prod URL stable | After owner promotes (OPEN-PERF-03) | Advisory → blocking | Demote to advisory; re-run; tune budgets |

## Rollout performance gates (per directive §13)

| Route/action | Baseline | Target | Observability source | Pass/fail | Rollback trigger |
|---|---|---|---|---|---|
| Bundle per route | Phase-0 gz KB | Per-route budget + backstop | `route-bundle-stats.json` (build) | Any route > budget (strict) | Revert + re-baseline |
| Public route nav (Tier-A) | Phase-0 median | Tier-A budget (loose) | Playwright CI | Median > budget | Loosen / triage |
| Authed workshop transition (Tier-B) | Phase-0 median | Tier-B budget (tight) | `measure-route-transitions.ts` | Median > budget AND max > budget | Triage / improvement-rate fallback |
| Hosted TTFB p95 | Historical p95 | `HOSTED_ROUTE_BUDGETS` | `cf:verify-hosted-performance` | Route-contract fail (hard); p95 > budget (watch→blocking) | Demote / re-run / tune |
| CI wall-clock (REL-01) | Current CI time | ≤ current + small delta | GitHub Actions timing | Per-PR increment > target | Move new work to L2/L3 |

**Regression comparison window:** when hosted/provider metrics are used, compare against the last N pre-change releases (owner defines N; recommend ≥ 3). **Minimum sample size:** hosted p95 requires ≥ 20 runs (`MIN_P95_RUNS`); Tier-B requires ≥ 3 successful runs (`ROUTE_TRANSITION_MIN_RUNS`).

## Rollback procedures

- **Bundle gate regression:** (a) flip `PERF_BUDGET_STRICT` off, (b) revert per-route budget map commit, (c) re-baseline and re-propose. The advisory posture is the safe default.
- **Tier-A smoke false-failures:** loosen the offending Tier-A value back to its pre-tightening number; open a triage task; do not silently delete the test.
- **Tier-B harness flake:** quarantine the scenario (`@quarantine`), keep the budget, track the fix; improvement-rate fallback already prevents blocking a still-improving route.
- **Hosted gate false-block:** demote p95 to advisory (route-contract stays hard); re-run from a different location/time; tune the budget if location-sensitive.

## Observability for the gates themselves

- CI status + annotations (bundle, Tier-A).
- Evidence artifacts committed to `.ai/03_plans/2026-07-07-…/evidence/` (Phase-0 baselines, Tier-B readiness JSON, hosted reports).
- `.ai/10_state/current-state.md` append on phase completion.
- No new alerting introduced by this pack (Workers Observability owned by sibling plan).

## Operational support notes

- Budget values are not static; the OPS-01 runbook defines re-baselining cadence (e.g. after major dependency bumps, after Next.js upgrades, after design-system changes).
- A budget update is **not** a silent loosening: it requires Phase-0 re-capture + owner sign-off + a runbook entry.

## Known gaps when hosted/production proof is unavailable

- Hosted p95 cannot run without `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL` (prod/preview URL). Until the URL is stable, hosted stays operator-run advisory.
- Authenticated Tier-B cannot run in CI without OPEN-PERF-02 resolution. Until then, authed regressions are caught on-demand only.
