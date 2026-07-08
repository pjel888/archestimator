# 02 — Feature Brief And Scope

## Source brief

From `PROMPT.md` (the authoritative FEATURE BRIEF for this pack):

> **Goal:** Create a plan pack for stabilizing the test harness, reducing
> slow/flaky behavior, and defining a flake budget before first-user launch.
>
> **Evidence to start from:** Vitest config disables some parallelism and
> includes long timeouts; `tests/vitest/`, `tests/unit/`, and `e2e/` cover many
> surfaces with different fixture styles; CI runs lint, typecheck, unit, build,
> and Playwright, but stability metrics and quarantine policy are not clear;
> launch readiness depends on fast, trustworthy proof loops.
>
> **Required plan pack:** current test inventory, slowest/flakiest candidates,
> fixture cleanup, parallelism strategy, quarantine policy, CI timing budgets,
> retry rules, evidence reporting, owner thresholds.
>
> **Constraints:** Do not remove coverage for speed without replacement proof.
> Keep changes incremental and measurable.
>
> **Stop condition:** The pack is complete when a future executor can improve
> test reliability with clear before/after metrics and no hidden coverage loss.

> **Note on the brief's "CI runs lint…":** the brief assumed CI runs those
> steps. Current repo evidence (`03` §3) shows CI is **fully disabled** — the
> pipeline is parked in `.github/workflows-disabled/ci.yml` and
> `.github/workflows/` is empty. This is a conflict between the brief's
> assumption and repo reality. Per the authority contract, repo reality
> controls. The conflict is **not smoothed over**: it is recorded here, drives
> Phase 4 (CI timing-budget + re-enablement posture), and the owner decision to
> re-enable CI is isolated in `15` §blocked.

## Goal (converted to a planning objective)

Convert the test harness from an implicit, undocumented reliability posture to
an explicit, measurable, owner-gated reliability contract, so that:

1. The current reliability baseline is **measured** (wall-clock, per-file p95,
   N-run flake rate), not asserted.
2. Parallelism, timeout, quarantine, and retry policies are **written down**
   with rationale and rejected alternatives.
3. Every remediation has a **before/after metric** and **no coverage loss**.
4. A future executor can answer "did this make tests faster or just greener?"
   with evidence from a single command.

## Scope (what this pack owns)

| Surface | In scope |
|---|---|
| Vitest execution posture | `vitest.config.ts` parallelism, pool, timeout tiers, project splitting |
| Flake detection & reporting | `flakewatch` runner, timing JSON, N-run scan, report command |
| Quarantine policy | ledger schema, classification rules, manual/auto decision |
| Retry rules | vitest `retry`/`bail`, playwright `retries`, local rerun convention |
| CI timing budget | job timing table, split-group strategy (prescriptive, owner-gated) |
| Slow/flaky remediation | the named candidate files (Phase 3) |
| Owner thresholds | flake-rate budget, wall-clock budget, p95 budget, quarantine review cadence |

## Non-goals (explicitly out of scope / owned elsewhere)

| Out of scope | Owned by |
|---|---|
| E2E fixture factory, auth-setup, D1 seed, smoke-flow list | `2026-07-07-e2e-fixture-smoke-harness` |
| E2E browser matrix, cross-browser CI exhaustiveness | `2026-07-07-e2e-fixture-smoke-harness` |
| Production bundle-size budget | `2026-07-07-bundle-and-route-performance-gate-hardening` |
| Production route-transition latency budget | `2026-07-07-bundle-and-route-performance-gate-hardening` |
| Application feature behavior changes | (not a test-harness concern) |
| D1 schema/migrations, R2, DO, Queues, Email | (not touched) |
| Migrating off Vitest/Playwright/bun-test | (not proposed; stack stays) |

## Success metrics (observable)

| Metric | Baseline (current) | Target | How measured |
|---|---|---|---|
| Full vitest wall-clock | ~525s (`vitest.config.ts:14`) | measured baseline − measurable delta (Phase 3); **no fixed % target until Phase 0** | `time bun run test:dom` + Phase 0 `flakewatch` timing JSON |
| Per-file p95 wall-clock | unknown (not measured) | measured; top-10 slowest each have a Phase 3 before/after | Phase 0 per-file timing JSON |
| File-level flake rate (10 runs) | unknown | ≤2% recommended default (owner-confirmed) | Phase 0 N-run scan |
| Quarantine ledger entries | 0 (none exist) | every genuine flake has an entry with re-test date | Phase 2 ledger |
| Coverage delta | unknown | **0 net loss**; any removal has a recorded replacement | Phase 3 + `validate` green |
| CI job timing (when re-enabled) | n/a (disabled) | ≤ budget in `13` §timing-budget-table | Phase 4 CI timing |

## Failure metrics (anti-success signals)

- Any requirement in `validate` is deleted or `.skip`'d **without** a recorded
  replacement in the quarantine ledger.
- The full vitest wall-clock *increases* after Phase 3 without a documented
  reason and a replacement optimization.
- A "green" run is achieved by widening a timing budget past its characterization
  envelope without recording the new characterization.
- The flake-rate measurement is skipped and the budget is asserted from memory.

## Assumptions (validated/invalid)

- **ASSUMP-1 (validated):** Vitest is the DOM/component runner; bun-test is a
  separate unit runner. *Evidence:* `package.json` `test` vs `test:dom`.
- **ASSUMP-2 (validated):** `fileParallelism:false` protects perf-suite serial
  semantics. *Evidence:* `vitest.config.ts:9-17` inline comment.
- **ASSUMP-3 (validated):** No flake-quarantine skips exist; all skips are
  env/auth/provider gates. *Evidence:* `19` §A skip classification.
- **ASSUMP-4 (validated, conflict):** CI is disabled, contradicting the brief's
  "CI runs…" assumption. *Evidence:* empty `.github/workflows/`.
- **ASSUMP-5 (to-falsify in Phase 0):** The ~525s figure and ">15s individual
  tests" are still accurate at execution time. *Falsification:* Phase 0 baseline run.
- **ASSUMP-6 (to-falsify in Phase 0):** Vitest 4 project-level filtering
  (`--project`) can isolate the perf suite so non-perf tests can run
  file-parallel. *Falsification:* Phase 1 discovery task T1.1.
