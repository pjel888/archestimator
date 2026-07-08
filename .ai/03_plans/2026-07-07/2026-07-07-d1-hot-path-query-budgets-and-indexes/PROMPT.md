# GLM5.2 Plan Pack Prompt: D1 Hot Path Query Budgets And Indexes

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-d1-hot-path-query-budgets-and-indexes`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack that sets D1 query budgets, index coverage, and hosted performance proof for first-user hot paths.

## Evidence To Start From

- Repository hot paths live in `src/lib/repositories/`, especially `workspace-repository.ts` and estimate/project/library repositories.
- Existing proof scripts include `scripts/generate-cloudflare-d1-performance-proof.ts`, `scripts/verify-cloudflare-d1-runtime-performance-proof.ts`, `scripts/measure-library-performance-baseline.ts`, and `scripts/seed-performance-test-data.ts`.
- `scripts/audit-dbidx-repo.ts` exists, but current proof is not clearly tied to every active repository path.
- Performance budget and hosted checks exist in `package.json`, but some are advisory or credential-gated.

## Required Plan Pack

Map first-user flows to D1 queries, define p95/p99 and subrequest budgets, list required indexes, specify fixture sizes, identify N+1 risks, and design local plus hosted proof commands.

## Constraints

Do not add paid Cloudflare features. Avoid synthetic-only proof where hosted D1 behavior matters. Keep plan scope to D1 query/index readiness, not general UX.

## Stop Condition

The pack is ready when an executor can implement measurable D1 hot-path budgets and prove them against representative data.
