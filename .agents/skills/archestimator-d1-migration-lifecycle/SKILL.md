---
name: archestimator-d1-migration-lifecycle
description: "Manage the active Archestimator Cloudflare D1 migration lifecycle for schema, index, constraint, query, backfill, and migration-order changes under migrations/. Do not use for legacy Supabase migrations, unrelated Cloudflare databases, destructive data loss, remote apply, deployment, or automated tests unless the current request explicitly authorizes that exact scope."
---

# Archestimator D1 Migration Lifecycle

## Authority

- Read `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, and `.ai/00_system/VALIDATION_MATRIX.md`.
- Treat current `wrangler.jsonc`, `migrations/`, schema consumers, repositories, and queries as executable truth. Treat `supabase/migrations/` only as historical provider-exit evidence.
- Inspect any active migration lease or plan constraint before choosing a migration number; do not infer ownership from filenames alone.

## Workflow

1. Define the required invariant, affected data and query paths, reversibility, authorized environment, non-test evidence, and stop condition.
2. Inspect `git status --short --branch`, the current migration tail, and all direct schema consumers. For broad, high-risk, or unfamiliar shared-symbol changes, use available Code Review Graph or GitNexus impact analysis when configured; for narrow reversible work, targeted source, `rg`, and LSP inspection is sufficient.
3. Choose the smallest forward-only migration that preserves existing rows or makes any irreversible consequence explicit. Prefer additive schema, bounded backfills, and query-compatible transitions over compatibility layers.
4. Keep the migration, repository SQL, indexes, constraints, and typed boundaries coherent. Do not edit an issued migration blindly, renumber concurrent work, or create a parallel migration directory.
5. Separate local migration authoring from provider mutation. Apply only when the current request and `AGENTS.md` authority cover the bound `ARCH_DB`; do not treat file creation as permission for remote mutation.

## Boundaries

- Stay on the current branch and shared worktree. Do not reset, clean, stash, revert, commit, push, or overwrite unfamiliar migration work.
- Never mutate `supabase/migrations/`, the retired Supabase project, unrelated Cloudflare projects, unbound resources, paid add-ons, or destructive data without explicit authority. Do not deploy by default.
- Default to `NOT_REQUIRED`. Do not create or run tests, builds, browser automation, screenshots, Storybook, or visual QA unless explicitly requested. Use static SQL review, source/readback evidence allowed by the task, or a `TEST_PROPOSAL` instead.

## Evidence And Stop

- Reconcile the migration against current schema consumers, migration ordering, SQL semantics, and the focused diff. Use provider readback only when authorized and relevant; never claim an unapplied migration is live.
- Stop when the schema and all affected current-source consumers agree, migration ownership is unambiguous, authorized evidence is recorded, and any apply, backfill, recovery, or destructive boundary is explicit.
