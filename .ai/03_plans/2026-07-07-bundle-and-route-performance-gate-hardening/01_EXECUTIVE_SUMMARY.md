# Executive Summary

**Plan status:** `CONDITIONALLY READY`
**Verification mode:** `emulated` (caps overall at 97; package status capped at `CONDITIONALLY READY` for this exhaustive package)
**Plan profile:** `exhaustive`
**Created:** 2026-07-07 (Asia/Manila)

## What this plan is

A planning-only pack that hardens Archestimator's **performance gates** — bundle size, route-transition latency, authenticated workshop routes, public share routes, and CI enforcement posture — so a future executor can tighten them without slowing routine iteration unnecessarily. No application code, tests, migrations, configs, or provider state are changed by this pass.

The pack deliberately **does not default to browser automation for every claim.** It specifies, per gate, when static build output, unit tests, or hosted checks are sufficient, and reserves browser automation for the route-transition smoke that already runs in CI.

## Why now

The codebase already has rich but fragmented performance tooling:

- `scripts/check-performance-budgets.mjs` reads Next 16 Turbopack's `.next/diagnostics/route-bundle-stats.json`, computes gzipped first-load JS per route, and warns on a **single global 350 KB budget** (`PERF_BUDGET_KB`). It is wired into CI as **advisory** (`continue-on-error: ${{ secrets.PERF_BUDGET_STRICT != '1' }}`).
- `e2e/route-transition-performance.spec.ts` is the **blocking** CI route-transition smoke, but its budgets (`e2e/route-transition-performance-budgets.json`) are extremely loose — e.g. public median `15 000 ms`, authenticated workshop transition `10 000 ms`, Slow 3G public `30 000 ms`. These are "does it finish" ceilings, not regression-catching budgets.
- `scripts/measure-route-transitions.ts` + `scripts/check-route-transition-readiness.ts` provide a richer harness with per-scenario ms budgets (public 15 000, auth 10 000, target direct 3 500, target general 1 000, target warm 500, overlay duration 200, sheet-content-visible 1 000) and timeline telemetry (parent-fallback, sheet-skeleton episodes, overlay duration). This harness is **not wired into CI**; it runs only on demand and needs `PLAYWRIGHT_STORAGE_STATE` or a localhost dev-auth bypass for authenticated scenarios.
- `scripts/verify-cloudflare-hosted-performance.ts` captures credential-free hosted Worker TTFB p95 against per-probe budgets (home 200 ms, login/pricing/features 200–300 ms, workshop-signed-out 600 ms, share-invalid-page 400 ms) with nearest-rank p95 over ≥ 20 runs. It requires `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL` and is **not part of CI**.
- The sibling plan `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/` already proposed `OPEN-PERF-02` (tighten CI bundle budget to strict + per-route numbers) and `OPEN-PERF-05` (2-week advisory window before promotion). This pack picks those up and extends them into a unified gate posture.

## Headline findings

1. **The blocking CI gate is the route-transition smoke, not the bundle gate.** The bundle gate is advisory and secret-gated; most PRs cannot tighten it. The route-transition smoke is the real blocker, but its budgets are so loose they only catch catastrophic regressions.
2. **Two parallel route-transition budgets exist with different values and different scopes.** `e2e/route-transition-performance-budgets.json` (loose, CI-blocking) and `scripts/check-route-transition-readiness.ts` env defaults (tighter, not in CI). The pack reconciles them into one layered posture instead of leaving a split brain.
3. **Authenticated workshop latency has no sample-stable, fixture-driven gate.** The e2e authed test is skipped without `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + secret or `PLAYWRIGHT_STORAGE_STATE`; CI's `bun run test:e2e:perf` therefore runs only the public + redirect scenarios. The richer `measure-route-transitions.ts` authenticated scenarios need a seeded fixture and a storage state.
4. **Bundle budget is a single global number.** There is no per-route budget, so a heavy authenticated route (estimate sheet) and a light public route (login) share one 350 KB ceiling. The diagnostics artifact supports per-route budgets; the script just does not read them.
5. **Hosted performance is not unified into a launch blocker.** It lives in `cf:verify-hosted-performance` + the cost/performance workbook, separate from the CI gate. The plan defines how it becomes a pre-release gate without forcing it into every PR.
6. **Flake/time risk is real.** Route-transition tests run in CI on `ubuntu-24.04` with `bunx playwright install chromium`; the budgets are loose partly to absorb CI variance. Tightening must be paired with a flake policy (median-of-N, run count, retry) or CI will become unreliable.

## Critical decisions (proposed)

- **DEC-01:** Layer the gates — CI (static bundle + route smoke, fast, every PR) → pre-merge deep (richer route-transition harness on demand) → pre-release (hosted p95). Do not force hosted p95 into per-PR CI.
- **DEC-02:** Promote the bundle gate to blocking **after** Phase-0 baseline capture and a documented advisory window, with **per-route** budgets sourced from `route-bundle-stats.json` rather than one global number. Keep the global number as a backstop.
- **DEC-03:** Reconcile the two route-transition budget files into one source of truth with tiers (catch-catastrophic for CI smoke; regression-catching for the on-demand harness).
- **DEC-04:** Use static build output (`route-bundle-stats.json`, `@next/bundle-analyzer` via `ANALYZE=true`) for bundle claims; reserve Playwright for route-transition claims. Hosted TTFB p95 only for pre-release hosted proof.
- **DEC-05:** Define a flake policy (median-of-N, minimum successful runs, no single-run fail) before tightening any route budget, so the gate stays reliable.

## Blocked owner decisions

| ID | Decision | Blocks | Recommended |
|---|---|---|---|
| OPEN-PERF-01 | Strict-bundle promotion date + per-route numbers | DEC-02 execution | After Phase-0 baselines; default to a 2-week advisory window |
| OPEN-PERF-02 | Authenticated workshop fixture + storage-state pipeline in CI | Authed route gate in CI | Owner decides dev-auth-bypass vs storage-state; see `07_*.md` |
| OPEN-PERF-03 | Hosted p95 as pre-release gate (vs advisory-only) | Hosted launch blocker | Owner; depends on prod URL stability |
| OPEN-PERF-04 | Tightened CI route-transition budget values (ms) | DEC-03 execution | Owner after baseline capture |

## Blast-radius summary

Direct impact (future executor): `.github/workflows/ci.yml`, `scripts/check-performance-budgets.mjs`, `e2e/route-transition-performance-budgets.json`, `e2e/route-transition-performance.spec.ts`, `scripts/check-route-transition-readiness.ts`, `package.json` (new/changed `perf:*` scripts), `scripts/verify-cloudflare-hosted-performance.ts` (pre-release wiring). Indirect/verification-only: estimate sheet chunks, library routes, share routes, dev-auth gate. Provider boundary: hosted verifier targets the bound Worker (`archestimator-proof`) only, credential-free. See `10_BLAST_RADIUS_AND_DEPENDENCIES.md`.

## Stack-contract summary

Next.js 16 Turbopack `.next/diagnostics/route-bundle-stats.json` is the bundle source of truth. `@next/bundle-analyzer` (`ANALYZE=true`) is the deep-dive tool. Route-transition proof is Playwright + RSC request counting + the in-page `__routeTransitionTimeline` telemetry already in `measure-route-transitions.ts`. Hosted proof is credential-free TTFB p95 via `verify-cloudflare-hosted-performance.ts`. All Cloudflare work stays inside the `wrangler.jsonc`-bound resources; this pack mutates none of them.

## Performance evaluator summary

Each gate has a named evaluator: bundle → `check-performance-budgets.mjs` over `route-bundle-stats.json`; route-transition CI → `route-transition-performance.spec.ts`; route-transition deep → `measure-route-transitions.ts` + `check-route-transition-readiness.ts`; hosted → `verify-cloudflare-hosted-performance.ts`. Baselines, targets, sample counts, flake policy, regression thresholds, and rollback triggers are defined per gate in `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` and `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.

## Next steps for an executor

1. Re-verify the cited script/CI/budget files against current `main` (stale-plan checklist in `README.md`).
2. Resolve the four `OPEN-PERF-*` owner decisions or proceed with the recommended defaults.
3. Execute Phase 0 (baselines) → Phase 1 (bundle gate) → Phase 2 (route-transition reconciliation) → Phase 3 (authenticated fixture) → Phase 4 (hosted pre-release gate) → Phase 5 (runbook + telemetry).
