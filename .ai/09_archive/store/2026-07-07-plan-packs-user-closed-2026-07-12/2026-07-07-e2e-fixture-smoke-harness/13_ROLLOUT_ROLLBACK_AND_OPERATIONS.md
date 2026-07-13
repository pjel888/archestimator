# 13 — Rollout, Rollback, and Operations

## Rollout shape

This is a **test-harness + CI** rollout, not a user-facing feature rollout. Rings:

| Ring | Audience | Gate to next |
|---|---|---|
| R0 local | developer machine | suite green locally 3× |
| R1 CI (PR, chromium `@smoke`) | all PRs to `main` | green on 5 PRs, ≤4 min, no flakes |
| R2 closed-beta gate | `main` must be smoke-green ≥ 3 consecutive CI runs before beta exposure | owner decision |
| R3 opt-in extended matrix | nightly/manual firefox/webkit/mobile | informational only |

## Feature flags

- No **app** feature flags introduced. Smoke flips **existing** env flags (`ARCHESTIMATOR_DEV_AUTH_BYPASS`, etc.) only in the local/CI smoke env.
- The smoke suite itself is gated by `ARCHESTIMATOR_E2E_SMOKE=1` (+ sub-flags) and the `@smoke` Playwright project. Absent ⇒ no-op (existing `test:e2e` unaffected).

## Deployment sequence (harness)

1. Merge Phase 0–3 (discovery, skeleton, fixtures, seed) — no CI impact yet (smoke specs empty or placeholder).
2. Merge Phase 4–7 (smoke specs) behind the `@smoke` tag — runnable locally, not yet CI-gating.
3. Merge Phase 8 (CI workflow) — activates the PR gate. Monitor first week for flakes.
4. After R1 stable ≥ 5 PRs, declare R2-ready (owner).

## Rollout performance gates

| Metric | Source | Block merge? | Block beta? | Trigger |
|---|---|---|---|---|
| Suite wall-clock ≤ 4 min (chromium CI) | CI job timestamp | > 6 min ⇒ investigate (not auto-block) | > 6 min persistent ⇒ block beta | quarantine slowest |
| Per-flow ≤ 15 s median | Playwright JSON | > 30 s ⇒ quarantine | — | quarantine |
| Flake rate < 5%/week | CI run history | > 20%/week ⇒ disable job | > 5%/week ⇒ block beta | disable + investigate |
| Existing e2e regression | `bun run test:e2e` | any behavior change ⇒ block | — | revert config hunk |
| Seed/reset idempotent | local 3× | failure ⇒ block | — | fix seed |

## Rollback

- **Harness rollback:** revert the additive `playwright.config.ts`/`package.json`/`.env.example` hunks; delete new `e2e/`, `scripts/e2e/`, `.env.e2e.example`, CI workflows; `bun run e2e:reset` clears local data. No remote state.
- **CI rollback:** delete `.github/workflows/e2e-smoke.yml` (and extended). PRs no longer gated. (This does NOT re-enable the other disabled workflows — separate owner decision.)
- **Data rollback:** `e2e:reset` (sentinel-scoped). Safe at any time.
- **App rollback:** N/A — no app behavior changed (only optional `data-*` testids, inert).

## Observability (harness)

- HTML report + traces on failure (attached in CI).
- JSON manifest per run (flow→result→timing) for trend tracking.
- Baseline (`e2e-smoke-baseline.json`) compared on each run.
- CI job logs show skip-reasons + the exact missing env/flag.

## Monitoring / alerts

- CI failure on `main` ⇒ GitHub PR/email notification (standard Actions behavior).
- Optional: a weekly flake-rate report (derived from CI run history) — deferred (nice-to-have).

## Support / incident

- Flaky smoke blocking PRs ⇒ quarantine the flow (`@quarantine`), file an issue, unblock PRs.
- Real smoke failure ⇒ it's catching a real regression; fix the app (the harness did its job).
- Seed corruption ⇒ `e2e:reset && e2e:seed`; deterministic by construction.

## Backward compatibility

- Existing 9 `e2e/*.spec.ts` behave identically (regression-checked).
- `vitest` suite unaffected.
- No app API/route/schema change.

## Post-release verification

- After R2 (beta gate on): confirm `main` smoke-green for 3 consecutive runs before any beta user is onboarded.
- After first beta user: smoke continues to run per-PR; any failure blocks further merges until green.

## Operations runbook (for the harness itself)

- **Add a flow:** spec under `e2e/smoke/`, fixture if needed, seed row if needed, add to `16_*` traceability, update baseline.
- **Quarantine:** move `@smoke` → `@quarantine` tag; file issue; non-blocking until fixed.
- **Rotate the dev-auth secret:** update `.env.local` + CI Actions secret; no code change.
- **Reset local data:** `bun run e2e:reset`.
- **Re-run a single flow:** `bun run test:e2e:smoke -- --grep <flow>`.
