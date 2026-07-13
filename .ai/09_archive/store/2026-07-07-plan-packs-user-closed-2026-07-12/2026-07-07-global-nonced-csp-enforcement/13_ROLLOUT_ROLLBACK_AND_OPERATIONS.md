# 13 — Rollout, Rollback, and Operations

## 13.1 Phased rollout

| Phase | Mode | Routes | Gate to proceed | Merge gate | Closed-beta gate | Production gate |
|---|---|---|---|---|---|---|
| P1 | Report-Only | all HTML (proxy-owned) | test:dom green + browser smoke + report endpoint 204 | CI green | n/a (no behavior change) | n/a |
| P2 | Report-Only | policy gap fixes | policy unit tests + workshop/landing browser proof | CI green | n/a | n/a |
| (observation window) | — | — | OPS-02: ≥ 3–7 days telemetry, zero unexpected violations (or triaged) | — | — | — |
| P3 | Enforced | `/share`, `/invite` | P3 browser proof + 24h telemetry | CI green + browser proof | enforced on beta share/invite | enforced in prod |
| P4 | Enforced | `/workshop` | P4 browser proof (Maps + WebSocket) + 24h telemetry | CI green + browser proof | enforced on beta workshop | enforced in prod |
| P5 | Enforced | `/auth/*`, landing (DEC-11) | PERF-01 TTFB within threshold; P5 browser proof | CI green + browser proof + TTFB artifact | enforced on beta auth/landing | enforced in prod |

## 13.2 Rollback per phase

| Phase | Rollback action | Time | Risk |
|---|---|---|---|
| P1 | set `ARCHESTIMATOR_CSP_NONCE_ENABLED=false` (proxy skips nonce/CSP); restore static Report-Only CSP strings in `next.config.headers()`; redeploy | one deploy | none (reverts to today) |
| P2 | revert the policy lines in `src/lib/csp/policy.ts` | one deploy | none |
| P3 | flip share+invite route classes back to Report-Only in `policy.ts` (mode flag); redeploy | one deploy | none (Report-Only is safe) |
| P4 | flip workshop back to Report-Only in `policy.ts` | one deploy | none |
| P5 | flip auth/landing back to Report-Only in `policy.ts` (and DEC-11 B if perf) | one deploy | none |

All rollbacks are **config-flag flips + redeploy**, not history rewrites. The
env-flag fallback in P1 is the master kill-switch.

## 13.3 Rollout performance gates (PERF)

| Metric | Baseline source | Target | Regression threshold | Rollback trigger | Owner |
|---|---|---|---|---|---|
| Landing HTML TTFB p95 | `09-ttfb-baseline.md` (measured pre-P5) | < baseline + DEC-11 threshold (recommend 50ms) | > threshold | flip landing to Report-Only (DEC-11 B) | impl + owner |
| `/share` TTFB | already dynamic | no change | n/a | n/a | n/a |
| `/workshop` TTFB | already dynamic | no change | n/a | n/a | n/a |
| Error rate (proxy CSP-set failures) | Workers Observability | 0 | > 0 sustained | investigate / kill-switch | ops |
| CSP violation count (post-enforcement) | `/api/csp-report` logs | low steady-state | spike > baseline | investigate; rollback if user-facing breakage | ops |

Observability source for each: Workers Observability (logs), `launch:verify-hosted-
sensitive-routes` (hosted route probe), TTFB probe artifacts.

## 13.4 Feature flags

- `ARCHESTIMATOR_CSP_NONCE_ENABLED` (bool, default false until P1 lands, then true):
  master switch for proxy nonce/CSP.
- Route-class enforcement mode can be config-driven (e.g.
  `ARCHESTIMATOR_CSP_ENFORCED_ROUTES=share,invite`), enabling per-class flip without
  code change. Recommended for safe rollout.

## 13.5 Observability rollout

- P1: `/api/csp-report` starts receiving Report-Only violations → baseline of "expected"
  violations per route (mostly analytics/maps allowlist tuning).
- P3–P5: post-enforcement, watch for **new** violation types (indicate a missed
  script/origin) and **spikes** (indicate attack probing or regression).
- If durable violation analytics desired for OPS-02 automation: future task to add a
  Workers Analytics Engine binding or small D1 aggregate table. **Not in this plan's
  scope**; first-users volume is low enough for log-based observation.

## 13.6 Backward compatibility / deployment sequencing

- No data migration. No binding change. Deploy is `cf:build` + `cf:deploy` (or preview).
- P1 is additive (new Report-Only header + new endpoint) → safe to deploy any time.
- P3–P5 enforcement flips are config-driven → deploy, observe, flip.
- No coordinated multi-service rollout (single Worker).

## 13.7 Support / incident response

- **Symptom:** "page blank" on an enforced route after a phase flip.
- **Triage:** check `/api/csp-report` logs for the route; DevTools console for blocked
  resource.
- **Fix:** add the missing origin to the policy allowlist, or flip the route back to
  Report-Only (rollback).
- **Runbook:** add a short `cf:csp-rollback` note (env flag + redeploy) to operational
  docs after P1.

## 13.8 Post-release verification

- After each enforcement phase in production: run the Playwright proof against the
  **deployed** route (not just preview); confirm zero violations in `/api/csp-report`
  over 24h.
- Update `.ai/10_state/current-state.md` P0.2 row per phase.

## 13.9 Known gaps when hosted/production proof unavailable

- If `launch:verify-hosted-sensitive-routes` cannot reach the deployed Worker (auth,
  no preview), the header smoke is skipped → residual risk: a deployed header may
  differ from local. Mitigation: the proxy unit test is the strongest local proof;
  hosted proof is confirmatory.
- PERF-01 TTFB requires a reachable preview/prod deploy; if unavailable, DEC-11
  defaults to Option B (landing stays Report-Only) until measurable.
