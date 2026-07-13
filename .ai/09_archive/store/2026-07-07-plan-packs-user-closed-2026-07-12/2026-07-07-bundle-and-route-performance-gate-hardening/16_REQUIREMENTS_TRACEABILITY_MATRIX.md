# Requirements Traceability Matrix

| Requirement ID | Source | User outcome | Implementation phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| PERF-01 | brief + repo | One layered gate map | P1, P2, P4 | P1-T2, P2-T1, P4-T1 | `ci.yml`, budgets, scripts | AC-PERF-01a/b | `12_*.md` matrix | L1/L2/L3 wired | proposed |
| PERF-02 | repo + sibling | Per-route bundle budgets | P1 | P1-T1, P1-T2 | `check-performance-budgets.mjs`, `ci.yml` | AC-PERF-02a/b/c | unit test (proposed) + strict run | Advisory→blocking window | proposed |
| PERF-03 | repo | One route-transition budget source | P2 | P2-T1 | `e2e/…budgets.json`, `check-route-transition-readiness.ts` | AC-PERF-03a/b/c | unit test (proposed) + `test:e2e:perf` | Tier-A/B reconciled | proposed |
| PERF-04 | brief + repo | Authenticated workshop gate | P3 | P3-T1, P3-T2 | `measure-route-transitions.ts`, `ci.yml`, fixture | AC-PERF-04a/b | `perf:measure-routes`+`perf:check-routes`+`perf:profile-peak-load` | Authed readiness JSON | proposed (OPEN-PERF-02) |
| PERF-05 | sibling | Phase-0 baselines | P0 | P0-T1, P0-T2 | diagnostics, benchmark JSON | AC-PERF-05a/b | baseline artifacts | Baselines committed | proposed |
| PERF-06 | brief + repo | Public share hosted gate | P4 | P4-T1 | `verify-cloudflare-hosted-performance.ts`, workflow | AC-PERF-06a/b | `cf:verify-hosted-performance` | Pre-release gate | proposed (OPEN-PERF-03) |
| PERF-07 | repo | Flake policy | P2, P5 | P2-T2, P5-T1 | readiness checker, runbook | AC-PERF-07a/b | Tier-B min-runs + AND semantics | Policy in runbook | proposed |
| OPS-01 | brief | Regression triage runbook | P5 | P5-T1 | `.ai/` ops doc | AC-OPS-01a/b | Static review | Runbook live | proposed |
| REL-01 | brief | No-slowdown guardrail | P1, P3, P4 | P1-T2, P3-T1, P4-T1 | `ci.yml` | AC-REL-01a/b | CI wall-clock comparison | L2/L3 opt-in | proposed |
| SEC-01 | repo | Credential-free posture | P3, P4 | P3-T1, P4-T1 | verifier, dev-auth gate | AC-SEC-01a/b | Static review | Posture locked | proposed (already met by code) |
| TEST-01 | directive | Test execution matrix | all | — | — | AC-TEST-01a | `12_*.md` | Matrix complete | proposed |
| TEST-02 | directive | Adversarial matrix | P5 | — | — | AC-TEST-02a | `19_*.md` | Matrix complete | proposed |
| DOC-01 | brief | Links to UX/obs plans | P5 | P5-T2 | README, `02_*.md` | AC-DOC-01a | Static review | Links present | proposed |

## Performance-sensitive requirement mapping (baseline/target/source/threshold/rollback)

| Req | Baseline metric | Target metric | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-02 | Phase-0 gz KB/route | Per-route budget + backstop | `route-bundle-stats.json` | Any route > budget (strict) | Flip strict off / revert map |
| PERF-03 (Tier-A) | Phase-0 median | Tier-A budget | Playwright CI | Median > budget | Loosen Tier-A |
| PERF-04 (Tier-B) | Phase-0 median | Tier-B budget | `measure-route-transitions.ts` | Median > budget AND max > budget | Improvement-rate fallback / triage |
| PERF-06 | Historical p95 | `HOSTED_ROUTE_BUDGETS` | hosted verifier | Route-contract fail (hard); p95 > budget (watch) | Demote / re-run / tune |
| REL-01 | Current CI wall-clock | ≤ current + small delta | GitHub Actions timing | Increment > target | Move work to L2/L3 |

## Coverage check

- Every requirement maps to ≥ 1 task (except meta TEST-01/TEST-02/DOC-01 which are plan-internal).
- Every task maps to ≥ 1 requirement (P0→PERF-05; P1→PERF-02/01/REL-01; P2→PERF-03/07/01; P3→PERF-04/SEC-01; P4→PERF-06/SEC-01; P5→OPS-01/DOC-01/REL-01).
- No requirement untraced.
