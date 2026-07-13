# Feature Brief And Scope

## Source brief

From `PROMPT.md` (verbatim requirements data, treated as authoritative input):

> **Goal:** Create a performance gate plan for bundle size, route transition latency, authenticated workshop routes, public share routes, and CI enforcement posture.
>
> **Evidence To Start From:**
> - `package.json` includes `perf:*`, `test:e2e:perf`, and Cloudflare hosted performance scripts.
> - `scripts/check-performance-budgets.mjs` and `scripts/verify-cloudflare-hosted-performance.ts` exist.
> - CI has advisory/per-secret performance strictness; hosted performance readiness has not been unified into a launch blocker.
> - Recent plans touch transitions and loading UX, but not a full release gate.
>
> **Required Plan Pack:** Define route list, bundle budgets, latency budgets, fixture/auth setup, advisory vs blocking CI policy, hosted proof, regression triage, and links to UX plans.
>
> **Constraints:** Do not default to browser automation for every claim; specify when static build output, unit tests, or hosted checks are sufficient.
>
> **Stop Condition:** The pack is ready when a future executor can harden performance gates without slowing routine iteration unnecessarily.

## Scope (in)

1. **Route inventory** — enumerate UI + API routes that the gates must cover, classified public/authenticated/share/internal.
2. **Bundle budgets** — current single 350 KB global budget; propose per-route budgets sourced from `route-bundle-stats.json`; define backstop and promotion path.
3. **Route-transition latency budgets** — reconcile the two budget files (`e2e/route-transition-performance-budgets.json` vs `check-route-transition-readiness.ts` defaults); define CI-smoke (catch-catastrophic) vs deep-harness (regression-catching) tiers.
4. **Authenticated workshop routes** — fixture + auth setup (`PLAYWRIGHT_STORAGE_STATE` vs `ARCHESTIMATOR_DEV_AUTH_BYPASS`), sample-stable measurement, hero/target scenarios.
5. **Public share routes** — hosted TTFB p95 budgets already in `verify-cloudflare-hosted-performance.ts`; define pre-release posture and how it links to the share feature plan.
6. **CI enforcement posture** — advisory-vs-blocking per gate, `PERF_BUDGET_STRICT` secret handling, `continue-on-error`, flake policy, when to run hosted checks.
7. **Hosted proof** — credential-free hosted Worker TTFB p95 as pre-release gate; relationship to the cost/performance workbook.
8. **Regression triage** — runbook for a budget miss (is it a regression, a budget that needs updating, or a flake?).
9. **Links to UX plans** — `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/` (loading/error coverage, overlay policy, RUM), `.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets/` (observability) where they overlap.

## Scope (out / non-goals)

- **No implementation.** This pass writes only to the plan folder.
- **No RUM product build.** RUM sink selection (`OPEN-PERF-01` in the sibling plan) is referenced, not re-decided.
- **No estimate-sheet re-architecture or `RouteLoadingOverlay` replacement.** Those belong to the sibling UX plan.
- **No Cache Components / `unstable_instant` adoption.** Future, owner-gated (sibling plan `OPEN-ARCH-01`).
- **No Cloudflare paid-tier enablement.** Cost posture stays free-tier/bundled.
- **No provider mutation.** Hosted verifier is credential-free and non-mutating by design.
- **No new migration, schema, or data work.** Performance gates are not data-bearing.

## Success criteria (planning)

- Every gate names: exact file paths/symbols, exact commands, budget values (current + proposed), advisory-vs-blocking posture, flake policy, rollback, and validation evidence.
- The two route-transition budget sources are reconciled into one layered posture with explicit tier labels.
- Authenticated workshop, public share, hosted, and bundle gates each have a named evaluator and a regression-triage path.
- Browser automation is reserved for route-transition claims; bundle claims use static build output; hosted claims use the hosted verifier. Each choice is justified.
- Blocked owner decisions are isolated with options, recommendation, and impact.

## Linked plans (read-only references)

| Plan | Why linked |
|---|---|
| `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/` | Owns loading/error coverage, overlay policy, RUM sink decision (`OPEN-PERF-01`), bundle-strict promotion (`OPEN-PERF-02`/`OPEN-PERF-05`), route boundary/cache contracts. This pack depends on its Phase-0 baselines and extends its perf coverage. |
| `.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets/` | Owns Worker observability, Workers Observability/Analytics, and budget posture. Hosted p95 gate (this pack) feeds its evidence. |
| `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` | Owns the hosted performance evidence artifacts and cost/performance workbook referenced by `cf:verify-hosted-performance`. |

## Assumptions

- `ASSUMP-01:` Next.js 16 Turbopack continues to emit `.next/diagnostics/route-bundle-stats.json` with `route` + `firstLoadChunkPaths`. (Verified in `check-performance-budgets.mjs:42-55`.)
- `ASSUMP-02:` CI runs on `ubuntu-24.04` with `bunx playwright install chromium --with-deps` and `bun run build` before the perf step. (Verified in `ci.yml`.)
- `ASSUMP-03:` The hosted Worker (`archestimator-proof`, custom domain `archestimator.com`) remains the deploy target; hosted proof points there or at a preview URL. (From `wrangler.jsonc` per `AGENTS.md`.)
- `ASSUMP-04:` Free-tier/bundled Cloudflare posture is unchanged; no paid observability add-on. (From `AGENTS.md` cost posture.)
- `ASSUMP-05:` React Compiler remains off (sibling plan verified); manual memoization is the current posture. (Cited from sibling plan README.)
