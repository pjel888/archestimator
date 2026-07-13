# GLM5.2 Plan Pack Prompt: Bundle And Route Performance Gate Hardening

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-bundle-and-route-performance-gate-hardening`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a performance gate plan for bundle size, route transition latency, authenticated workshop routes, public share routes, and CI enforcement posture.

## Evidence To Start From

- `package.json` includes `perf:*`, `test:e2e:perf`, and Cloudflare hosted performance scripts.
- `scripts/check-performance-budgets.mjs` and `scripts/verify-cloudflare-hosted-performance.ts` exist.
- CI has advisory/per-secret performance strictness; hosted performance readiness has not been unified into a launch blocker.
- Recent plans touch transitions and loading UX, but not a full release gate.

## Required Plan Pack

Define route list, bundle budgets, latency budgets, fixture/auth setup, advisory vs blocking CI policy, hosted proof, regression triage, and links to UX plans.

## Constraints

Do not default to browser automation for every claim; specify when static build output, unit tests, or hosted checks are sufficient.

## Stop Condition

The pack is ready when a future executor can harden performance gates without slowing routine iteration unnecessarily.
