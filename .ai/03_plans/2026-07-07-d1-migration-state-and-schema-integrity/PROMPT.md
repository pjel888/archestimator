# GLM5.2 Plan Pack Prompt: D1 Migration State And Schema Integrity

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-d1-migration-state-and-schema-integrity`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a D1 migration integrity plan that reconciles local migration files, remote application state, schema drift, migration safety, and fix-forward procedure before first users.

## Evidence To Start From

- `migrations/` now includes migrations through `0036_cost_library_component_drafts.sql`.
- `AGENTS.md` still references an older latest migration count, creating source-of-truth drift.
- `.ai/10_state/current-state.md` records remote migration/application uncertainty around recent D1 migrations.
- Some migrations contain non-idempotent schema operations and table rebuilds; inspect `0033` through `0036` first.
- Relevant scripts include `cf:d1-*`, `scripts/audit-dbidx-repo.ts`, and `scripts/cf-d1-restore-rehearsal.mjs`.

## Required Plan Pack

Include local-vs-remote migration ledger, schema verification SQL, migration application order, destructive-change review, fix-forward policy, rollback/rehearsal limits for D1, and CI/release checks that prevent stale documentation.

## Constraints

Use only the D1 binding in `wrangler.jsonc`. Stay on free-tier assumptions. Do not mutate unrelated provider projects.

## Stop Condition

The pack enables a future executor to prove D1 migration state and schema integrity without guessing which document or provider state is canonical.
