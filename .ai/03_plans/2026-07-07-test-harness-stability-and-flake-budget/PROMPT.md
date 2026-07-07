# GLM5.2 Plan Pack Prompt: Test Harness Stability And Flake Budget

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-test-harness-stability-and-flake-budget`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for stabilizing the test harness, reducing slow/flaky behavior, and defining a flake budget before first-user launch.

## Evidence To Start From

- Vitest configuration disables some parallelism and includes long timeouts.
- `tests/vitest/`, `tests/unit/`, and `e2e/` cover many surfaces with different fixture styles.
- CI runs lint, typecheck, unit, build, and Playwright, but stability metrics and quarantine policy are not clear.
- Launch readiness depends on fast, trustworthy proof loops.

## Required Plan Pack

Include current test inventory, slowest/flakiest candidates, fixture cleanup, parallelism strategy, quarantine policy, CI timing budgets, retry rules, evidence reporting, and owner thresholds.

## Constraints

Do not remove coverage for speed without replacement proof. Keep changes incremental and measurable.

## Stop Condition

The pack is complete when a future executor can improve test reliability with clear before/after metrics and no hidden coverage loss.
