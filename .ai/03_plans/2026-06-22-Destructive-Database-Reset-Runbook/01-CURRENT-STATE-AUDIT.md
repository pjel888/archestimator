# 01 Current State Audit

All provider facts in this file came from read-only Supabase MCP calls, local file reads, and official documentation research on 2026-06-22. No destructive command was run.

## Linked Supabase Project

| Fact | Value |
|---|---|
| Project name | `Archestimator` |
| Project id/ref | `ebxxqidacheyapmmzavr` |
| Organization id | `unfair-black-sb5unhb` |
| Region | `ap-southeast-2` |
| Status | `ACTIVE_HEALTHY` |
| Linked Postgres | `17.6.1.121` provider metadata, `server_version = 17.6` from SQL |
| Database queried | `postgres` |
| Current SQL schema | `public` |
| Edge Functions | none |
| Development branches | list call failed provider-side: `Project reference is missing when validating permissions` |

Local Supabase temp metadata:

- `supabase/.temp/project-ref`: `ebxxqidacheyapmmzavr`
- Postgres version temp file: `17.6.1.121`
- Storage version temp file: `v1.60.4`
- GoTrue/Auth version temp file: `v2.189.0`
- PostgREST version temp file: `v14.5`

`supabase/config.toml` has `db.major_version = 17`, matching the linked provider major version.

## Exact Public Row Counts

These are exact counts from a read-only dynamic SQL pass over public base tables.

| Table | Rows |
|---|---:|
| `account_security_events` | 48 |
| `ai_action_runs` | 7 |
| `ai_data_access_events` | 7 |
| `ai_package_apply_commands` | 0 |
| `ai_tool_calls` | 0 |
| `beta_feedback_submissions` | 0 |
| `closed_beta_allowed_emails` | 1 |
| `collaboration_audit_events` | 5 |
| `collaboration_invitation_tokens` | 1 |
| `collaboration_invitations` | 6 |
| `component_brands` | 36 |
| `component_category_nodes` | 685 |
| `component_suppliers` | 22 |
| `cost_library_item_price_history` | 156 |
| `cost_library_item_price_options` | 155 |
| `cost_library_item_state_history` | 156 |
| `cost_library_item_variant_attachments` | 0 |
| `cost_library_item_variant_cost_entries` | 155 |
| `cost_library_item_versions` | 157 |
| `cost_library_items` | 154 |
| `estimate_favorites` | 1 |
| `estimate_nodes` | 123 |
| `estimate_row_items` | 137 |
| `estimate_sheet_access_settings` | 0 |
| `estimate_sheet_events` | 223 |
| `estimate_sheet_members` | 0 |
| `estimate_sheet_versions` | 3 |
| `estimate_tabs` | 5 |
| `estimate_template_nodes` | 10 |
| `estimate_template_row_items` | 16 |
| `estimate_templates` | 3 |
| `estimates` | 3 |
| `legal_terms_acceptances` | 1 |
| `library_folders` | 685 |
| `mass_deletion_events` | 2 |
| `notification_definitions` | 0 |
| `notification_deliveries` | 0 |
| `profile_role_hardening_audit` | 0 |
| `profiles` | 4 |
| `project_favorites` | 2 |
| `project_group_memberships` | 1 |
| `project_groups` | 1 |
| `project_locations` | 1 |
| `project_members` | 0 |
| `project_publication_events` | 1169 |
| `project_publications` | 11 |
| `projects` | 3 |
| `publication_digest_log` | 0 |
| `security_rate_limit_events` | 3 |
| `shared_link_comments` | 1 |
| `shared_link_events` | 6 |
| `shared_link_recipients` | 3 |
| `shared_link_responses` | 0 |
| `user_onboarding_profiles` | 1 |
| `workspace_account_settings` | 1 |
| `workspace_members` | 1 |
| `workspaces` | 1 |

Auth boundary count:

- `auth.users`: 4 rows from verbose table inventory.

## Storage Buckets And Objects

Read-only bucket/object count:

| Bucket | Public | Objects | Reset posture |
|---|---:|---:|---|
| `component-attachments` | false | 1 | export objects, then empty objects only if chosen |
| `component-images` | true | 840 | export objects, then empty objects only if chosen |
| `project-images` | false | 6 | export objects, then empty objects only if chosen |

Supabase database backups do not include Storage objects, so database backup proof is not sufficient for media recovery.

## RLS, Functions, Triggers, And Security Surface

Read-only provider inspection found:

- every public table listed above has RLS enabled;
- public schema has 135 functions;
- 104 public functions are `SECURITY DEFINER`;
- 31 public functions are invoker functions;
- `auth.users` has one trigger: `on_auth_user_created`, `AFTER INSERT`, executing profile bootstrap;
- storage policies exist for project images, component images, and component attachments;
- component images have a public read policy except project-image paths are excluded from that public component-image rule;
- project image and component attachment write/delete policies depend on authenticated workspace/project access functions.

Reset implication: deleting rows is not the only safety concern. A future reset must verify RLS, grants, Storage policies, and key `SECURITY DEFINER` functions after execution.

## Data Graph Summary

Core app graph:

- `workspaces` own most application data.
- `projects` cascade to `estimates`, project members, project locations, project favorites, project groups, publications, collaboration invitations, and notification rows.
- `estimates` cascade to tabs, nodes, row items, sheet events, versions, members, access settings, and estimate favorites.
- `cost_library_items` are workspace-scoped and cascade to price options, state/history/version, variant cost entries, and attachment rows.
- `estimate_row_items.source_library_item_id` and template row source refs set null on library item delete, preserving row snapshots but weakening source traceability.
- deleting `workspaces` sets `profiles.default_workspace_id` to null.

Important Auth references:

- `profiles.id` references `auth.users(id)` with `ON DELETE CASCADE`; therefore Auth deletion would cascade profiles. The reset must not delete Auth users.
- many public rows reference `auth.users` for actor/creator/user columns, mostly `SET NULL` or `CASCADE`.
- `profiles` are the app mirror of Auth and carry role/default workspace state.

## Local Code Evidence

Current local paths relevant to a future reset:

- `src/lib/auth/session.ts` reads the current Supabase user, checks closed-beta access, reads `profiles`, and calls `ensure_current_user_profile` if a profile is missing.
- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql` creates `profiles`, `handle_new_auth_user`, and the `on_auth_user_created` trigger.
- `supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql` creates `ensure_current_user_profile`.
- `src/lib/repositories/workspace-repository.ts` auto-provisions a default workspace if a profile lacks a default workspace and no existing membership is available.
- `src/lib/projects/actions.ts` uses `preview_bulk_delete_projects`, `execute_bulk_delete_projects`, and post-commit Storage cleanup for scoped project deletion.
- `src/lib/mass-deletion/storage-cleanup.ts` contains bucket/path allow-list rules and chunked remove behavior for scoped cleanup.
- `scripts/check-supabase-backup-readiness.ts`, `scripts/check-supabase-migration-readiness.ts`, and `scripts/check-supabase-linked-readiness.ts` parse sanitized readiness evidence.
- `scripts/sql/linked-supabase-launch-readiness.sql` is read-only and checks migrations, tables, grants, functions, buckets, and a summary.

Current local package scripts relevant to future proof:

- `bun run launch:check-supabase-backup`
- `bun run launch:check-supabase-migrations`
- `bun run launch:check-supabase-linked-readiness`
- `bun run launch:supabase-readiness`
- `bun run gen:types`
- `bun run type-check`
- focused Vitest suites listed in [06-APP-SURFACE-IMPACT-MAP.md](06-APP-SURFACE-IMPACT-MAP.md)

## Seed And Demo Data

`supabase/seed.sql` seeds deterministic demo data:

- a demo workspace;
- a demo project;
- a demo estimate;
- demo cost library items;
- demo estimate nodes and row items;
- metadata with seeded markers.

Local `supabase/config.toml` has database seed enabled for local `supabase db reset`:

- `[db.seed] enabled = true`
- `sql_paths = ["./seed.sql"]`

Reset implication: local `supabase db reset` is not the same as a linked hosted app-data reset. Local reset will apply seed unless disabled or changed. The linked reset should not reseed demo data by default if the owner wants to test from scratch.

## Migration And Drift Evidence

Provider migration history is readable in `supabase_migrations.schema_migrations`. Recent recorded versions include:

- `20260621112542` `shared_link_atomic_publish_and_digest_slot`
- `20260621105407` `shared_link_d1_d11_hardening`
- `20260621051701` `shared_link_event_context_backfill_repair`
- `20260621042221` `shared_link_event_context`
- `20260620103306` `rls_initplan_hoist`
- `20260617010523` `harden_project_delete_preview_and_audit_warnings`

`supabase/migrations-pending-review/` exists and contains pending, deferred, and superseded files. Its README explicitly says pending files live outside `supabase/migrations/` so the CLI will not auto-apply them. The reset must not be combined with broad schema push or migration drift repair.

## Official Documentation Evidence

Supabase:

- Database backups and PITR: https://supabase.com/docs/guides/platform/backups
- Backup/restore using CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Branching: https://supabase.com/docs/guides/deployment/branching
- Working with branches: https://supabase.com/docs/guides/deployment/branching/working-with-branches
- Auth user management: https://supabase.com/docs/guides/auth/managing-user-data
- Securing APIs, RLS, and functions: https://supabase.com/docs/guides/api/securing-your-api
- Restore to a new project: https://supabase.com/docs/guides/platform/clone-project

PostgreSQL:

- `TRUNCATE`: https://www.postgresql.org/docs/current/sql-truncate.html
- `DELETE`: https://www.postgresql.org/docs/current/sql-delete.html
- `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html
- SQL dump backup model: https://www.postgresql.org/docs/current/backup-dump.html

Changelog facts checked:

- Supabase changed table API exposure defaults in 2026; future new tables should not assume automatic API exposure.
- Supabase restricted access on `auth`, `storage`, and `realtime` schemas in 2025; future reset work must avoid direct managed-schema mutation.

## Project Naming Evidence

Current display name is already `Archestimator`. The owner may still choose to
normalize the display name to lowercase `archestimator`.

Official-source facts checked on 2026-06-22:

- Supabase access-control docs list project management `Update (Name)` as a
  project-level permission.
- Supabase Management API OpenAPI metadata exposes `PATCH /v1/projects/{ref}`
  with a required `name` body field and `projects:write` scope.
- The same OpenAPI metadata describes `ref` as a 20-character lowercase project
  ref, matching this pack's use of `ebxxqidacheyapmmzavr` as the stable project
  boundary.

Reset implication: project display-name normalization is a separate provider
metadata change. It must not replace or weaken the `ebxxqidacheyapmmzavr`
boundary checks.
