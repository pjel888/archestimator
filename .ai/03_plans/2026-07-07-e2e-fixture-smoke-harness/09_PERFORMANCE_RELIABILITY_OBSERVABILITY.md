# 09 — Performance, Reliability, and Observability

## Performance budget (PERF-FLAKE1)

The smoke suite is the routine-CI gate, so it must be **fast** and **stable**.

| Metric | Target | Measurement | Regression threshold |
|---|---|---|---|
| Full `@smoke` chromium suite wall-clock (CI) | ≤ 4 min | CI job duration (runner timestamp) | > 6 min ⇒ investigate/quarantine slowest flow |
| Single flow median | ≤ 15 s | Playwright test timing in manifest | > 30 s ⇒ quarantine |
| `webServer` boot | ≤ 60 s (within 120s cap) | `webServer.timeout` | boot > 90s ⇒ seed/probe too slow |
| Seed + reset | ≤ 20 s | globalSetup phase timing | > 40s ⇒ seed too heavy |

**Evaluator contract (performance-goal style):**
- Baseline: executor captures first green run's per-flow timings into `e2e-smoke-baseline.json` (committed under `e2e/` or `.ai/.../`).
- Target: table above.
- Measurement: Playwright reporter JSON (`--reporter=json`) → per-test duration; suite wall-clock from CI.
- Dataset/fixture size: 1 profile, 1 workspace, 1 project, 1 estimate (3 rows), 1 library item, 2 publications, 1 recipient, 1 upload file (<1KB). Deliberately tiny.
- Runs/flake: 3 consecutive local runs must be green with no test varying > 2× its median.
- Regression threshold: any flow exceeding its target → quarantine.
- Related functional tests: the smoke specs themselves.
- Evidence artifact: `e2e-smoke-manifest-<ts>.json` (per-flow pass/fail + timing) + `e2e-smoke-baseline.json`.

This is **not** app-user-perf (that's `route-transition-performance.spec.ts` + `.ai/03_plans/2026-07-07-bundle-and-route-performance-gate-hardening/`). This is **harness** perf.

## Performance design choices (keep it lean)

- **Single chromium project** for routine CI (D-3). Extended matrix is opt-in/non-blocking.
- **`reuseExistingServer:true`** so a local dev already running on 3020 is reused (faster local iteration).
- **`globalSetup` runs once** (not per worker); seed/reset are O(seconds) on tiny data.
- **No `test.slow()`** in core smoke; retries limited to 1.
- **Parallelism:** Playwright default worker parallelism within the smoke project is fine (flows are independent given seeded data); executor confirms no shared mutable state collisions (sentinel data is per-suite, not per-test).
- **Traces** only on first retry (`trace:"on-first-retry"`) to avoid overhead on green runs.

## Reliability (REL-1)

- **Idempotent seed + reset** ⇒ deterministic across runs and machines.
- **Sentinel-scoped data** ⇒ no collision with real data or other local users.
- **Fresh publication token per lockout test** ⇒ no cross-run rate-limit bleed.
- **Binding reachability probe in globalSetup** ⇒ fail fast with a clear message if `next dev` can't reach local D1/R2 (instead of every authed test failing opaquely).
- **`reuseExistingServer` + fresh seed** ⇒ survives a developer's already-running dev server.
- **Quarantine lane** ⇒ a flaky flow stops blocking PRs while being fixed.

## Failure / degraded modes

| Failure | Detection | Behavior |
|---|---|---|
| `next dev` won't boot | `webServer.timeout` | Suite fails at setup; clear error |
| Local D1 unreachable (migrations not applied) | binding probe in globalSetup | Setup fails with "run `wrangler d1 migrations apply ARCH_DB --local`" |
| Smoke profile missing | FR-S2 fails (or probe) | Setup fails with "run `bun run e2e:seed`" |
| Preview R2 unreachable | FR-S13 fails | Quarantine upload flow; report |
| Real flake (timing) | retries:1 + 2-strike | Quarantine after 2 failures/14 days |
| App regression | deterministic failure | PR blocked; fix the app |

## Observability (of the harness)

- **HTML report** (`playwright-report/`) — attached on CI failure.
- **Traces** (`test-results/`) — on first retry.
- **JSON manifest** (`e2e-smoke-manifest-<ts>.json`) — flow→result→timing, machine-readable for trend tracking.
- **Baseline** (`e2e-smoke-baseline.json`) — committed; compared on each run.
- **Skip reasons** — printed with the missing flag/env and a one-line fix.
- No app-telemetry changes (Workers Observability / Web Analytics are separate concerns, owned by `.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets/`).

## Operations (harness lifecycle)

- **Local run:** `bun run e2e:reset && bun run e2e:seed && bun run test:e2e:smoke` (or a wrapper `test:e2e:smoke:local` that does all three).
- **CI run:** the job does reset→seed→smoke→(implicit cleanup via `globalTeardown`).
- **Quarantine workflow:** move a test's tag from `@smoke` to `@quarantine`; the `@quarantine` project runs but is non-blocking; create a follow-up issue.
- **Adding a flow:** add a spec under `e2e/smoke/`, add its fixture if needed, add its seed row if needed, add to traceability (`16_*`), update baseline.

## Rollout gates (performance/reliability)

- **Blocks merge:** a real (non-flake) smoke failure on `@smoke` chromium.
- **Blocks closed-beta exposure:** smoke suite must be green on `main` for ≥ 3 consecutive runs before beta (operational gate, owner decision).
- **Triggers rollback of the harness itself:** if smoke goes red on green PRs > 20% of runs in a week ⇒ disable the job, investigate, do not let a flaky gate block all PRs.
