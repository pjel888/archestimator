# Commands And Evidence

This audit used read-only local commands, Supabase MCP/provider tools, Supabase CLI checks, and parallel subagent lanes. No provider mutation was performed.

## Local Repository Evidence

Commands and checks used:

- `git status --short --branch`
- `find supabase -maxdepth 3 -type f`
- `find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l`
- filename/version duplicate checks for `supabase/migrations`
- `sed` reads of `package.json`, Supabase client factories, repository files, and relevant `.ai` state docs
- `rg` searches for Supabase clients, RPC calls, generated type objects, notification code, and database proof scripts

Key local results:

- Branch/worktree had pre-existing dirty changes unrelated to this audit and one untracked P6 migration file.
- Canonical migrations: 93.
- Pending-review SQL drafts: 3.
- Local nonconforming migration filenames: 0.
- Local duplicate migration versions: 0.
- Supabase package versions:
  - `@supabase/supabase-js`: `2.106.2`
  - `@supabase/ssr`: `0.10.3`
- Supabase CLI installed version: `2.98.2`.

## Supabase Provider Evidence

Provider tools and SQL checks queried project `ebxxqidacheyapmmzavr` only.

Key provider results:

- Project `Archestimator`, status `ACTIVE_HEALTHY`.
- Database `17.6.1.121`, Postgres 17.
- Remote migration history count: 85.
- First remote migration: `20260518090000`.
- Latest remote migration: `20260614013638_enable_estimate_node_mixed_writes_p6`.
- Public tables: 51.
- Public tables with RLS enabled: 51.
- Public tables with RLS disabled: 0.
- Public views: 0.
- Public security-definer functions: 96.
- Security-definer functions without explicit search path: 0.
- Security-definer functions executable by public or anon: 32.
- Edge functions: none.
- Storage buckets:
  - `component-images`, public, 840 objects.
  - `project-images`, private, 6 objects.
  - `component-attachments`, private, 1 object.

Objects specifically checked and not found remotely:

- `public.notification_definitions`
- `public.notification_deliveries`
- `public.ai_package_builder_memory_preferences`
- `public.delete_library_folder`
- `public.component_library_seed_uuid`
- `public.move_estimate_nodes`
- `public.get_project_chart_buckets`

Objects checked and found remotely:

- `public.project_estimate_list_summaries`
- `public.create_estimate_node_with_history` with tab-aware `target_tab_id` argument.
- `public.reorder_library_folders`

## Migration CLI Evidence

`supabase migration list --linked` completed and showed:

- 22 local-only versions.
- 14 remote-only versions.
- timestamp alias drift for multiple applied migrations.
- true local-only candidates listed in `02-migration-parity-audit.md`.

Leader-lane attempts to run some `supabase db advisors --linked` and `supabase db query --linked` checks later hit temporary Supabase pooler auth/circuit-breaker errors:

- password authentication failure for `cli_login_postgres`;
- `ECIRCUITBREAKER` too many authentication failures.

MCP SQL remained available and supplied direct schema/security checks. A parallel data-integrity subagent reported additional advisor findings that aligned with the direct SQL posture.

## Subagent Lanes

Three independent read-only lanes were used:

1. Local Supabase migration/config inventory.
   - Reported 93 local canonical migrations, 3 pending-review drafts, no edge functions, no storage folder, no duplicate/nonconforming migration names.
2. Codebase database surface and generated type inventory.
   - Mapped Supabase client factories, major database call sites, generated type drift, and type-cast hot spots.
3. Data integrity / migration security review.
   - Reported timestamp drift, untracked P6 risk, security-definer exposure, remaining auth initplan warnings, and pending function/grant hardening items.

## External Supabase Changelog Evidence

Current Supabase changelog review found:

- Supabase CLI current version is `v2.106.0`.
- Data API / GraphQL exposure changes are relevant to broad grants and exposed schemas.
- pg_graphql introspection default change is not currently applicable because `pg_graphql` is not installed.
- Postgres 14 support end is not applicable because Archestimator is on Postgres 17.

## Validation Gaps

Known gaps in this audit:

- No database mutations were performed, by request.
- Official advisor output could not be fully reproduced in the leader lane after CLI auth/circuit-breaker failures.
- Supabase branch listing failed with a project-reference permission validation error.
- Remote P6 exact SQL text was not extracted into this audit pack; only version/effect evidence and subagent comparison findings were recorded.
- Function-body equivalence for timestamp aliases was not exhaustively diffed. That should be part of the repair phase, not this audit.
