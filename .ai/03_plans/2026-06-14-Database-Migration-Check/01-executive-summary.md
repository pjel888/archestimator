# Executive Summary

## Current Provider State

- Supabase project: `ebxxqidacheyapmmzavr` (`Archestimator`).
- Region: `ap-southeast-2`.
- Status: `ACTIVE_HEALTHY`.
- Postgres: `17.6.1.121` / engine 17.
- Edge functions: none.
- Installed notable extensions: `pgcrypto 1.3`, `uuid-ossp 1.1`, `pg_stat_statements 1.11`, `supabase_vault 0.3.1`.
- `pg_graphql` is available but not installed, so the June 2026 pg_graphql introspection change is not currently applicable.

## Top Findings

### 1. High: migration history is not clean between repo and linked remote

Local repository inventory found 93 canonical migration files. The linked provider reports 85 migration history entries. `supabase migration list --linked` showed 22 local-only versions and 14 remote-only versions.

Some of this is timestamp alias drift where the same migration intent appears applied remotely under a different version. Some of it is true app-facing schema drift.

Impact: future `supabase db push`, branch rebuilds, and forensic replay are unsafe until the ledger is reconciled. Supabase compares migration versions, not developer intent.

### 2. High: app code and generated types reference objects missing from linked remote

Live provider probes did not find these local/type-level objects:

| Object | Local source | Current remote status | Risk |
| --- | --- | --- | --- |
| `public.delete_library_folder(...)` | `20260605113000_transactional_library_folder_delete.sql`; `src/lib/component-library/actions.ts` calls the RPC | Missing | Runtime break for folder delete path if exercised |
| `public.notification_definitions` | `20260606090000_notification_system.sql`; `src/lib/notifications/*`; generated types | Missing | Notification code/types are ahead of provider |
| `public.notification_deliveries` | `20260606090000_notification_system.sql`; `src/lib/notifications/*`; generated types | Missing | Notification code/types are ahead of provider |
| `public.ai_package_builder_memory_preferences` | `20260528103341_ai_package_builder_memory.sql`; package-builder memory code; generated types | Missing | Safe only while default-off flag remains off |
| `public.get_project_chart_buckets(...)` | `20260614021500_get_project_chart_buckets_rpc.sql` | Missing | Low current runtime risk because repository code still aggregates charts server-side |

### 3. High: generated Supabase types are ahead of linked provider truth

`src/lib/supabase/types.ts` is generated for PostgREST 14.5 and includes objects that are not present on the linked database. This is more severe than ordinary type lag because TypeScript can now approve calls that the provider cannot satisfy.

Current hash observed during audit: `6a746d68d06aecf1ff720a6465741de011edfdf58aee1d7a12959dc1ba14fee9`.

### 4. High: recent applied database work exists under timestamp aliases

Recent remote history includes migrations equivalent to local files, but under different versions:

| Local file version | Remote applied version | Intent |
| --- | --- | --- |
| `20260614120000` | `20260613192255` | teamspace membership atomic guards |
| `20260614120100` | `20260613192344` | teamspace RLS auth.uid performance |
| `20260614161500` | `20260613201251` | project estimate list summaries RPC |
| `20260614162000` | `20260613201302` | RLS initplan auth.uid |

This is a future migration footgun even when the live schema is functionally correct today.

### 5. Medium: RLS is broadly enabled, but security posture still needs a hardening pass

Good current state:

- All 51 live `public` tables reported RLS enabled.
- No live `public` views were found.
- No `DISABLE ROW LEVEL SECURITY` pattern was found.
- Security-definer functions checked in direct SQL all had explicit `search_path`.

Remaining review items:

- Five RLS-enabled public tables have no policies: `account_security_events`, `closed_beta_allowed_emails`, `collaboration_audit_events`, `collaboration_invitation_tokens`, `profile_role_hardening_audit`.
- Broad `anon` / `authenticated` table grants rely heavily on RLS as the protection boundary.
- 32 security-definer functions were reported as executable by `public` or `anon`; most appear to be helper functions, but exposed-schema function execute posture should be tightened deliberately.
- Remaining `auth.uid()` initplan warnings exist in policies and helper paths. Recent work reduced this but did not finish it.

### 6. Medium: pending-review SQL is not applied and should not be applied blindly

`supabase/migrations-pending-review/` contains three SQL drafts:

- `AC-MOD-04_shared_link_responses_recipient_set_null.sql`
- `AC-MOD-06_one_published_publication_per_project.sql`
- `T4-database-pass.sql`

Live checks show these are not applied. At least one T4 drop gate is not satisfied because `project_publications_token_hash_idx` has live index scans.

### 7. Low: Supabase CLI is outdated relative to current changelog

Installed CLI: `2.98.2`. Current changelog reported `2.106.0`. The package dependency `@supabase/supabase-js` is already `2.106.2`.

This is not a direct production bug, but update the CLI before doing migration repair work so command behavior and advisor output are current.

## Bottom Line

The database is not simply "up to date" or "out of date." It is partially updated:

- Provider health is good.
- Some recent intended migrations are applied under different versions.
- Some local migrations are truly not represented remotely.
- Generated types and app code are ahead of the linked provider for notification, AI memory, and library folder delete surfaces.
- Security posture is acceptable for closed beta iteration, but not yet clean enough to treat as launch-ready without a focused hardening pass.
