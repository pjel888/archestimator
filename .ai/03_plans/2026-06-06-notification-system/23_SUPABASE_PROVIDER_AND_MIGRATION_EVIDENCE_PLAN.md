# Supabase Provider And Migration Evidence Specialist Plan

## Goal

Separate local planning, local migration proof, branch-safe database proof, and linked/provider proof. Do not mutate production or paid provider settings during implementation unless the owner explicitly authorizes that exact action.

## Provider Boundary

- Supabase project ref: `ebxxqidacheyapmmzavr`
- Never touch SlateCamp or unrelated Supabase projects.
- Keep closed-beta cost posture: do not enable PITR or paid features without owner reapproval.
- Do not run broad `supabase db push` while migration history or target environment is unclear.
- Do not record secrets in `.ai`.

## Local Migration Gate

Required before PR:

```bash
bun run test:dom -- tests/vitest/notification-schema.test.ts
npx supabase@2.98.2 migration list
npx supabase@2.98.2 db reset
npx supabase@2.98.2 gen types typescript --local > src/lib/supabase/types.ts
git diff --check
```

Local typegen must use `--local` after `db reset`; using `--project-id ebxxqidacheyapmmzavr` at this stage would read the linked project and will not include an unapplied local migration. If local Supabase is unavailable, record the exact command failure and obtain branch-safe database proof before UI work or PR.

Actual RLS behavior proof is mandatory before UI work or PR:

- Same-user definition and delivery read succeeds.
- Cross-user definition and delivery read fails.
- Direct authenticated insert/update/delete fails.
- Anonymous read fails.

Static SQL tests alone do not satisfy this gate.

## Branch-Safe Database Gate

Before any linked production apply:

1. Confirm target environment with `supabase status` or connector metadata.
2. Confirm migration list and current remote migration history.
3. Apply only the exact notification migration to a branch-safe or preview database if available.
4. Run RLS denial proof with deterministic fixtures from `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md`.
5. Regenerate `src/lib/supabase/types.ts` from the same branch-safe/preview target project, not from linked production.
6. Record sanitized evidence under `.ai/09_archive/store/<date>-notification-system-migration-proof/` only if provider proof is part of the approved task.

Branch-safe typegen command shape:

```bash
npx supabase@2.98.2 gen types typescript --project-id <branch-or-preview-project-ref> > src/lib/supabase/types.ts
```

## Linked Production Gate

Linked production apply is blocked until all are true:

- Owner explicitly approves production migration apply in the active turn.
- Code review is clean.
- Rollback plan is ready as a forward migration.
- Seed content is sanitized and approved.
- RLS denial proof passed in a branch-safe environment or the owner accepts a named proof gap.

Linked production typegen against `ebxxqidacheyapmmzavr` is post-approval only and must happen after the notification migration is applied to that linked target. It is not the default PR typegen source.

## Rollback Evidence

Before linked apply, prepare a forward repair plan:

- Disable UI flag.
- Expire bad definitions by setting `expires_at = now()`.
- Mark affected deliveries dismissed when needed.
- Add forward migration to tighten grants/RLS if a policy is wrong.
- Do not drop notification tables with user state unless the owner explicitly approves destructive data removal.

## Evidence Log Template

```md
## Supabase Evidence

- Target project:
- Target environment:
- Migration file:
- Migration list before:
- Migration list after:
- Typegen command:
- RLS tests:
- Seed rows:
- Rollback path:
- Provider proof boundary: local-only | branch-safe | linked-provider
```

## Stop Gates

- Stop if target project is not `ebxxqidacheyapmmzavr`.
- Stop if linked apply is requested without owner approval.
- Stop if RLS denial proof fails.
- Stop before UI work or PR if no local or branch-safe RLS behavior proof exists and the owner has not accepted the exact proof gap.
- Stop if typegen changes unexpected tables outside notification additions.
