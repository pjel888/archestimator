# GLM5.2 Plan Pack Prompt: E2E Fixture Smoke Harness

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-e2e-fixture-smoke-harness`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create an E2E smoke harness plan for first-user critical flows with reliable fixtures, auth setup, shared-link coverage, proposal review, and fast local/CI execution.

## Evidence To Start From

- `e2e/` contains a small set of specs relative to the app surface.
- `playwright.config.ts`, package scripts, and CI run Playwright, but some paths are skipped or gated by env.
- Critical flows include auth, onboarding, project creation, estimate editing, proposal export, share review, recipient inbox, upload, and support feedback.
- Existing Vitest coverage is much broader than browser flow coverage.

## Required Plan Pack

Define smoke-flow list, fixture factory, test accounts, environment contract, seeded D1/R2 strategy, skip policy, CI matrix, flake budget, and proof artifacts.

## Constraints

Use browser automation only where it proves real routing/interaction behavior. Keep smoke suite lean enough for routine CI.

## Stop Condition

The pack is complete when a future executor can implement a stable closed-beta E2E smoke suite.
