# Destructive Database Reset Runbook

Date: 2026-06-22

Status: planning-only. No Supabase data, Storage object, Auth user, migration, or application source file was changed by this plan pack.

## Goal

Prepare a future destructive reset of Archestimator app data in linked Supabase project `ebxxqidacheyapmmzavr` so the owner can test the app from a clean state while preserving Supabase Auth.

The recommended reset target is an auth-preserving, app-content reset:

- preserve Supabase-managed schemas, Auth users, identity/access scaffolding, migration history, RLS, policies, grants, functions, and bucket definitions;
- reset workspace/project/estimate/library/publication/collaboration content and app media objects after backup/export proof;
- leave the app able to log in with existing Auth users and create fresh workspace, project, estimate, library, publication, and collaboration data.

## Start Here

1. Read [00-PLAN.md](00-PLAN.md) for scope, decisions, and the default reset variant.
2. Read [01-CURRENT-STATE-AUDIT.md](01-CURRENT-STATE-AUDIT.md) for live provider facts gathered before this pack.
3. Read [02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md](02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md) before writing any SQL, script, or Storage cleanup.
4. Read [03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md](03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md) before any destructive command.
5. Read [04-RESET-RUNBOOK.md](04-RESET-RUNBOOK.md) for the future execution sequence.
6. Read [05-SCHEMA-MIGRATION-SEED-AND-TYPES-PLAN.md](05-SCHEMA-MIGRATION-SEED-AND-TYPES-PLAN.md) before touching migrations, seed, or generated types.
7. Read [06-APP-SURFACE-IMPACT-MAP.md](06-APP-SURFACE-IMPACT-MAP.md) for routes, workflows, and tests affected by empty data.
8. Read [07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md](07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md) for proof gates.
9. Read [08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md](08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md) for stop conditions.
10. Read [09-IMPLEMENTATION-HANDOFF.md](09-IMPLEMENTATION-HANDOFF.md) if another agent or operator executes the reset later.
11. Read [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md) for the canonical two-gate authorization contract.
12. Read [11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md](11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md) before generating SQL, Storage cleanup manifests, or proof transcripts.
13. Read [12-POST-RESET-UX-CONTRACT.md](12-POST-RESET-UX-CONTRACT.md) before claiming the post-reset app experience is acceptable.
14. Read [13-ADVERSARIAL-QA-SCENARIO-MATRIX.md](13-ADVERSARIAL-QA-SCENARIO-MATRIX.md) for stress cases that must be closed before execution.
15. Read [14-PLAN-QUALITY-SCORECARD.md](14-PLAN-QUALITY-SCORECARD.md) for the audit rating and repaired gaps.
16. Read [15-SUPABASE-PROJECT-NAMING-PLAN.md](15-SUPABASE-PROJECT-NAMING-PLAN.md) if the owner wants the Supabase display name normalized to `archestimator`.
17. Read [16-CODEBASE-AI-IMPLEMENTATION-PLAN.md](16-CODEBASE-AI-IMPLEMENTATION-PLAN.md) as the canonical codebase-AI execution guide before preparing or running the reset.
18. Keep [LOOP_LEDGER.md](LOOP_LEDGER.md) current when execution evidence is added later.

## Non-Negotiable Gate

This pack is not approval to reset data. A future executor must follow the two-gate authorization contract in [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md):

- Gate 1 authorizes preparation only: read-only inspection, backup/export, restore rehearsal, manifest generation, and rollback-only dry run.
- Gate 2 authorizes the destructive step only after Gate 1 evidence exists and is reviewed.

Gate 2 fresh instruction must include:

- project id/ref confirmation: `ebxxqidacheyapmmzavr`;
- chosen reset variant from [02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md](02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md);
- Storage deletion scope by bucket/object set;
- every decision-required table/object resolution;
- backup/export proof location and sanitized hash metadata;
- restore rehearsal proof;
- dry-run proof;
- confirmation that Supabase Auth users must remain intact;
- acceptance of the Storage object cleanup scope.
- post-reset verification owner.

## Evidence Summary

Live read-only inspection found:

- project `Archestimator`, ref `ebxxqidacheyapmmzavr`, status `ACTIVE_HEALTHY`, region `ap-southeast-2`, Postgres `17.6`;
- no deployed Supabase Edge Functions;
- branch listing failed provider-side with "Project reference is missing when validating permissions";
- `auth.users` has 4 rows;
- public app tables contain current beta/demo content, including 3 `projects`, 3 `estimates`, 154 `cost_library_items`, 685 `library_folders`, 685 `component_category_nodes`, and 1169 `project_publication_events`;
- Storage contains 840 `component-images` objects, 6 `project-images` objects, and 1 `component-attachments` object;
- all public tables are RLS-enabled;
- public schema has 135 functions, including 104 `SECURITY DEFINER` functions;
- `auth.users` has one `on_auth_user_created` trigger for profile bootstrap.

Official-source constraints:

- Supabase database backups do not include Storage objects: https://supabase.com/docs/guides/platform/backups
- Supabase branching creates separate environments and new preview branches are data-less by default: https://supabase.com/docs/guides/deployment/branching
- Supabase Auth user data lives in a special schema inside the project database: https://supabase.com/docs/guides/auth/managing-user-data
- PostgreSQL `TRUNCATE` is fast but locks tables, can cascade, and does not fire `ON DELETE` triggers: https://www.postgresql.org/docs/current/sql-truncate.html

## Artifact Map

- `00-PLAN.md` - planning contract, goals, non-goals, reset variants, and success criteria.
- `01-CURRENT-STATE-AUDIT.md` - provider, schema, row-count, storage, RLS, function, seed, script, and docs evidence.
- `02-DESTRUCTIVE-SCOPE-AND-GUARDRAILS.md` - reset manifest, preserve/delete/decision tables, managed-schema boundaries, and future gates.
- `03-DATA-RECOVERY-BACKUP-AND-ROLLBACK.md` - logical backup, Storage export, restore, rollback, and evidence handling plan.
- `04-RESET-RUNBOOK.md` - future execution sequence, dry-run discipline, post-reset checks, and operator notes.
- `05-SCHEMA-MIGRATION-SEED-AND-TYPES-PLAN.md` - migration, seed, typegen, branch/local reset, and pending-review rules.
- `06-APP-SURFACE-IMPACT-MAP.md` - app workflows expected to change after reset and validation surfaces.
- `07-VERIFICATION-AND-ACCEPTANCE-MATRIX.md` - proof matrix for provider, SQL, Storage, auth, app flows, and tests.
- `08-BLAST-RADIUS-RISKS-AND-GO-NO-GO.md` - risk register and binary go/no-go criteria.
- `09-IMPLEMENTATION-HANDOFF.md` - future executor instructions.
- `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` - canonical two-gate authorization contract and operator checklist.
- `11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md` - table/object/function manifest schema, initial classification, operational budgets, and rollback-only dry-run shape.
- `12-POST-RESET-UX-CONTRACT.md` - user-facing empty-state, stale-link, copy, and accessibility requirements.
- `13-ADVERSARIAL-QA-SCENARIO-MATRIX.md` - plan-level destructive-operation stress scenarios.
- `14-PLAN-QUALITY-SCORECARD.md` - baseline audit scores, repairs, and final planning-readiness rating.
- `15-SUPABASE-PROJECT-NAMING-PLAN.md` - optional provider display-name normalization and project-ref boundary.
- `16-CODEBASE-AI-IMPLEMENTATION-PLAN.md` - canonical codebase-AI implementation plan with requirements, phases, U-IDs, gates, pros/cons, SWOT, and traceability.
- `LOOP_LEDGER.md` - planning loop and evidence ledger.
