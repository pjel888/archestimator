# 07 Verification And Acceptance Matrix

## Proof Boundary

This planning pass can prove only that the plan pack exists, is planning-only, and is grounded in current read-only evidence.

Future reset execution must produce provider, SQL, Storage, and app-flow proof before claiming the app is reset.

## Pre-Execution Verification

| Gate | Evidence | Pass condition |
|---|---|---|
| Project boundary | Supabase project list and local temp project ref | exactly `ebxxqidacheyapmmzavr` |
| Optional display-name normalization | project metadata before/after | display name `archestimator` if authorized; ref still `ebxxqidacheyapmmzavr` |
| Fresh instruction | owner instruction captured in future execution notes | matches Gate 1 or Gate 2 in `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` |
| Backup proof | logical dump metadata, hash, and restore rehearsal | dump exists outside repo and restores to local/throwaway target |
| Storage export proof | object manifest/export metadata and restore samples | all objects selected for deletion exported; gaps remove affected objects from delete scope unless separately waived |
| Auth baseline | `auth.users` count | count recorded before reset |
| Public counts | exact row counts | every public table recorded |
| Storage counts | bucket object counts and byte counts | every target bucket recorded |
| Manifest review | reset manifest | every table/object has preserve/reset/decision label and no unresolved decision-required row |
| Dry run | transaction with rollback | deltas match manifest |
| No schema drift coupling | pending migrations check | no broad push or drift repair in reset window |

## Post-Database Verification

| Claim | Evidence | Pass condition |
|---|---|---|
| Auth preserved | `select count(*) from auth.users` | unchanged from baseline |
| Profiles preserved for Variant A | `select count(*) from public.profiles` | unchanged from baseline |
| Default workspace cleared for Variant A | `profiles.default_workspace_id` check | null or points only to post-reset workspace |
| Managed schemas untouched | schema/object inventory | no destructive changes to `auth`, `storage`, `realtime`, `supabase_migrations` |
| Content reset | exact counts for target tables | zero or expected seed counts |
| Preserve table row counts intact | exact counts | unchanged unless an explicit owner-approved delta exists |
| Preserve table content intact | sample hashes/column checks | unchanged except approved FK nulling such as Variant A workspace references |
| RLS intact | public table RLS query | all public tables still RLS enabled |
| Function surface intact | function baseline comparison | no unexpected owner, `search_path`, grant, definition, or `SECURITY DEFINER` drift |
| Trigger surface intact | trigger inventory | profile/bootstrap and validation triggers still present |

## Post-Storage Verification

| Claim | Evidence | Pass condition |
|---|---|---|
| Buckets preserved | storage bucket inventory | target buckets still exist with expected public/private flags |
| Old app objects cleared | object counts by bucket | zero or approved preserved list |
| Cleanup failures recorded | cleanup report | failed/rejected/missing paths documented |
| New upload works | app/API smoke | upload/read/delete works for new object |

## App Acceptance

Minimum acceptance for Variant A:

| Workflow | Pass condition |
|---|---|
| Login | existing Auth user reaches protected app |
| Closed beta | allowed user passes access gate |
| Empty/default workspace | app follows the canonical null-workspace behavior in `12-POST-RESET-UX-CONTRACT.md` |
| Project | create, view, edit basic metadata, upload image |
| Old project link | not-found or redirect with no old data exposure |
| Estimate | create sheet, create tree nodes, create row items, edit row values |
| Old estimate link | not-found or project-scoped missing state |
| Library | render empty state and create folder/component/price option |
| Library to estimate | insert a new component into a new estimate |
| Publication | create/revoke/rotate a new public link |
| Old public link | expired/not-found state with no old data exposure |
| Collaboration | invite flow reaches the expected form/send state if provider flags are configured |
| Old invite link | expired/not-found state with no token metadata leak |
| Settings | profile settings render and workspace settings show fresh workspace or setup recovery |

## Suggested Focused Commands

Planning-only verification for this pack:

```sh
git diff --check -- .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook
find .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook -type f | sort
rg -n "planning-only|Auth|ebxxqidacheyapmmzavr|Gate 2|decision-required" .ai/03_plans/2026-06-22-Destructive-Database-Reset-Runbook
```

Future reset evidence commands, chosen proportionally:

```sh
bun run launch:supabase-readiness
bun run launch:check-supabase-linked-readiness
bun run launch:check-supabase-backup
bun run launch:check-supabase-migrations
bun run type-check
```

Focused future tests to consider if related app surfaces are touched:

```sh
bun test tests/vitest/auth-onboarding-guard.test.ts
bun test tests/vitest/auth-account-data-schema.test.ts
bun test tests/vitest/mass-deletion-contract.test.ts
bun test tests/vitest/mass-deletion-action-contract.test.ts
bun test tests/vitest/project-deletion-active-publication-contract.test.ts
bun test tests/vitest/project-estimate-sheets-repository.test.ts
bun test tests/vitest/component-library-templates-repository.test.ts
bun test tests/vitest/supabase-backup-readiness-script.test.ts
bun test tests/vitest/supabase-linked-readiness-script.test.ts
```

Browser or Playwright proof is optional for this plan pack. Future execution must use manual or automated real-surface proof for Auth login, share/invite routes, and Storage upload/delete unless an equivalent application-level proof is recorded.

## Acceptance Statement Template

Use this shape only after future reset execution:

```text
Reset completed for project ebxxqidacheyapmmzavr.
Auth users preserved: before X, after X.
Variant: A/B/C.
Database backup: <sanitized id/hash>.
Storage export: <sanitized id/hash>.
Reset tables: <count> tables, all expected post-counts matched.
Storage cleanup: <removed> removed, <failed> failed, <rejected> rejected.
RLS/grants/functions: verified with <commands>.
App smoke: <flows>.
Known gaps: <none or list>.
```

Do not use that statement from this planning pass.
