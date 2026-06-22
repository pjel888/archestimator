# 05 Schema Migration Seed And Types Plan

## Default

A future app-data reset should be data-only and object-only. It should not require schema migrations, generated type changes, dependency changes, or app code changes.

## Migration Rules

Do not run:

- `supabase db push --linked`;
- broad migration repair;
- pending-review migrations;
- Auth config push;
- destructive DDL;
- schema rewrite;
- generated-type refresh.

The pending-review folder is real:

- `supabase/migrations-pending-review/`
- deferred and superseded migrations exist;
- its README says the files live outside `supabase/migrations/` so the CLI will not auto-apply them;
- some pending items were partially applied directly to provider with evidence, while others remain gated.

Future reset must not mix data deletion with schema drift correction.

## When A Migration Would Be Needed

Return to planning if execution discovers that reset safety requires schema changes, such as:

- a missing FK causes orphan risk;
- a needed cleanup RPC does not exist and must be introduced;
- Storage cleanup needs durable outbox infrastructure;
- profile/workspace bootstrap cannot handle Variant A empty state;
- a preserve table needs a new audit column;
- an RLS or grant gap would expose reset artifacts.

Those are implementation tasks, not part of a pure data reset.

## Seed Posture

Default for linked reset: **do not reseed**.

Reason:

- the owner wants to test from scratch;
- current `supabase/seed.sql` creates deterministic demo workspace/project/estimate/library rows;
- seeding immediately after reset would reintroduce demo app data.

Local development note:

- `supabase/config.toml` has `[db.seed] enabled = true`;
- local `supabase db reset` applies `supabase/seed.sql`;
- local reset proof is not equivalent to linked hosted reset unless seed behavior is aligned with the target outcome.

If the owner later wants a minimal smoke seed:

- create a separate reviewed seed plan;
- avoid reusing demo project/library data unless explicitly desired;
- seed only the smallest data needed for smoke tests;
- record seed counts as expected post-counts.

## Type Generation

Do not run `bun run gen:types` for a pure data reset.

Run type generation only if future schema work changes table/function/type signatures. If run:

- verify linked project id first;
- inspect generated diff carefully;
- do not mix typegen churn into the reset evidence unless required.

## Branch And Local Rehearsal

Safe rehearsal options:

- local Supabase reset for reset-script syntax, with seed disabled or accounted for;
- preview branch for schema/seed behavior, knowing branches are data-less by default;
- restore-to-new-project clone for data-bearing rehearsal if current cost and limitations are approved.

Branch creation and clone/restore may have cost or beta-product implications. Do not create either from this plan pack without current cost confirmation and owner instruction.

## Existing Readiness Scripts

Use these as evidence parsers, not as destructive tools:

- `scripts/check-supabase-backup-readiness.ts`
- `scripts/check-supabase-migration-readiness.ts`
- `scripts/check-supabase-linked-readiness.ts`
- `scripts/sql/linked-supabase-launch-readiness.sql`

Relevant package scripts:

- `bun run launch:check-supabase-backup`
- `bun run launch:check-supabase-migrations`
- `bun run launch:check-supabase-linked-readiness`
- `bun run launch:supabase-readiness`

These scripts prove readiness evidence shape. They do not prove a backup can be restored unless a restore drill is separately performed.
