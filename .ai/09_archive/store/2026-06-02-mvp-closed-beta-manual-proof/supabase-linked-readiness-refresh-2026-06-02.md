# Supabase Linked Readiness Refresh - 2026-06-02

Scope: read-only linked Supabase readiness refresh for closed-beta launch blockers. No migrations, repairs, data writes, policy changes, storage changes, or auth settings were changed.

Result: negative/blocked. Linked Supabase still does not have the closed-beta allowlist, project-specific unlink, beta allowlist admin, or beta feedback migrations applied. The linked schema also still lacks the launch-critical allowlist/unlink/feedback objects, and the `component-images` bucket remains public.

## Commands

```bash
supabase --version
supabase projects list
supabase migration list --linked
supabase db advisors --linked --type security --output json
supabase db advisors --linked --type performance --output json
supabase db query --linked --output json "<read-only schema parity query>"
supabase db advisors --linked --type security --output json | jq 'group_by(.name) | map({name: .[0].name, count: length})'
```

## CLI And Project Evidence

- Supabase CLI version: `2.98.2`; CLI reported newer `2.104.0` available.
- Linked project: `Archestimator`, reference id `ebxxqidacheyapmmzavr`, region `Oceania (Sydney)`.
- Non-linked project also listed: `archestimator`, reference id `hrpdwqurngnyajuhbkdg`.

## Linked CLI Read Evidence

- `supabase migration list --linked` failed after repeated temp-role pooler retries with `FATAL: (ECIRCUITBREAKER) too many authentication failures` and then `Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD`.
- `supabase db advisors --linked --type performance --output json` failed with the same temp-role pooler circuit breaker and `SUPABASE_DB_PASSWORD` message.
- `supabase db advisors --linked --type security --output json` succeeded and returned WARN findings.
- A targeted read-only `supabase db query --linked --output json` initially hit the same temp-role circuit breaker but eventually returned schema parity rows.

## Linked Schema Parity Query Result

| Check | Present |
| --- | --- |
| `migration_20260601182522` | false |
| `migration_20260601184343` | false |
| `migration_20260602005649` | false |
| `migration_20260602083000` | false |
| `migration_20260602084500` | false |
| `table_closed_beta_allowed_emails` | false |
| `table_beta_feedback_submissions` | false |
| `function_check_closed_beta_access` | false |
| `function_unlink_estimate_row_item_from_library_with_history` | false |
| `bucket_component_images_public` | true |

## Security Advisor Summary

The compact current security-advisor count returned:

| Advisor | Count |
| --- | ---: |
| `anon_security_definer_function_executable` | 36 |
| `authenticated_security_definer_function_executable` | 62 |
| `function_search_path_mutable` | 3 |
| `public_bucket_allows_listing` | 1 |
| `auth_leaked_password_protection` | 1 |

## Launch Meaning

Closed beta remains **NO-GO** for linked Supabase. The remote project still lacks launch-critical migrations and objects, and linked CLI migration/performance reads are still unstable through the temp-role pooler. Do not run hosted allowlist, feedback, or project-specific unlink pass candidates until backup/PITR proof exists and the required linked migrations/RPCs/tables are applied and directly verified.
