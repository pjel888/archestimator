# Security And Performance Hardening Log

Date: 2026-06-14

## Starting Advisor Counts

Collected after upgrading Supabase CLI to `2.106.0`:

| Finding | Count | Category |
| --- | ---: | --- |
| `anon_security_definer_function_executable` | 32 | Security |
| `authenticated_security_definer_function_executable` | 75 | Security |
| `function_search_path_mutable` | 3 | Security |
| `auth_leaked_password_protection` | 1 | Security |
| `auth_rls_initplan` | 13 | Performance |
| `multiple_permissive_policies` | 169 | Performance |

## Migration Added

`supabase/migrations/20260614140923_harden_security_advisor_findings.sql`

Planned fixes:

- Set `search_path = public, pg_temp` for:
  - `resolve_app_role_for_email(text)`
  - `set_updated_at()`
  - `collaboration_role_rank(public.collaboration_role)`
- Rewrite the 13 advisor-reported RLS policies to wrap `auth.uid()` and
  `auth.jwt()` as initplans.
- Revoke broad `EXECUTE` from helper/trigger functions:
  - `add_workspace_owner_membership()`
  - `enforce_estimate_row_item_area_node()`
  - `enforce_library_folder_tree()`
  - `handle_new_auth_user()`
- Remove `anon`/`PUBLIC` execute from authenticated-only RPCs:
  - `list_pending_collaboration_invitations()`
  - `set_cost_library_component_lifecycle_state(...)`

## Deliberately Deferred

- `resolve_collaboration_invitation(text)` remains callable by `anon` and
  `authenticated` because the public invite landing page depends on it.
- Public shared-link/client-publication RPC grants were not changed in this
  pass because app call sites use those flows and some migrations intentionally
  route them through service-role contexts.
- Broad policy-helper functions such as `can_access_project`,
  `can_access_estimate`, and `is_workspace_member` need a separate
  policy-surface audit before removing `anon` execute; revoking them blindly can
  turn RLS checks into permission errors on anonymous table access.
- The 169 `multiple_permissive_policies` findings remain a later performance
  consolidation pass, not a blocker for this hardening migration.
- Leaked password protection is not represented in the current local
  `supabase/config.toml`; it is a Dashboard or Management API auth-config action
  unless a supported narrow CLI config key is confirmed.
- Continuation check: the linked organization is on Supabase Pro, so leaked
  password protection is plan-eligible. Current docs place the setting under
  Auth password security, and the Management API exposes
  `PATCH /v1/projects/{ref}/config/auth`. The later owner-run helper resolved
  this setting without writing the token to disk.

## Applied And Verified

- Applied the SQL to linked project `ebxxqidacheyapmmzavr`.
- Recorded migration history with
  `supabase migration repair --linked --status applied 20260614140923`.
- Verified `supabase migration list --linked` reports local and remote
  `20260614140923` aligned, with no remote-only rows.
- Re-ran official advisors. Cleared:
  - `function_search_path_mutable`: `3 -> 0`
  - `auth_rls_initplan`: `13 -> 0`
  - `anon_security_definer_function_executable`: `32 -> 26`
  - `authenticated_security_definer_function_executable`: `75 -> 71`
- Provider proof query:
  `evidence/probe-hardening-advisor-fixes.sql`.
- Advisor proof summary:
  `evidence/supabase-advisors-after-hardening.md`.

## Continuation Hardening

Added and applied:

- `supabase/migrations/20260614143000_harden_non_public_helper_execute.sql`
- `supabase/migrations/20260614144000_consolidate_low_risk_permissive_policies.sql`
- `supabase/migrations/20260614144136_command_split_core_public_policies.sql`
- `supabase/migrations/20260614144359_command_split_remaining_public_policies.sql`
- `supabase/migrations/20260614144712_narrow_private_rls_policies_to_authenticated.sql`

`20260614143000` revokes inherited `PUBLIC`/`anon` execute from 10
SECURITY DEFINER helper functions that have zero public-role RLS policy
references and are not anonymous RPC contracts:

- `can_access_realtime_topic(text)`
- `can_access_workspace_account_scope(uuid)`
- `can_manage_project_access(uuid)`
- `can_send_realtime_topic(text)`
- `current_estimate_access_rank(uuid)`
- `current_project_access_rank(uuid)`
- `current_user_profile()`
- `estimate_inherits_project_access(uuid)`
- `has_other_estimate_access_manager(uuid, uuid)`
- `has_other_project_access_manager(uuid, uuid)`

Targeted proof:

- Before: each target had `anon_execute=true`, `authenticated_execute=true`,
  `public_execute=true`.
- After: each target has `anon_execute=false`,
  `authenticated_execute=true`, `public_execute=false`.
- Probe: `evidence/probe-non-public-helper-execute.sql`.

`20260614144000` consolidates OR-equivalent permissive policy pairs on:

- `ai_action_runs`
- `ai_data_access_events`
- `ai_tool_calls`
- `estimate_favorites`
- `project_favorites`

Targeted proof:

- Before: each target command/role group had `policy_count=2`.
- After: each target command/role group has `policy_count=1`.
- Probe: `evidence/probe-low-risk-policy-consolidation.sql`.

`20260614144136` and `20260614144359` split broad `ALL` policies into
command-specific `SELECT`/`INSERT`/`UPDATE`/`DELETE` policies on the remaining
shared public tables, preserving the previous read and write predicates as
explicit OR predicates per command. Targeted probes:

- `evidence/probe-command-split-core-public-policies.sql`
- `evidence/probe-command-split-remaining-public-policies.sql`

`20260614144712` narrows private app RLS policies from `public` to
`authenticated` where anonymous users had no product contract, then revokes
inherited `PUBLIC`/`anon` execute from the remaining helper functions used by
those policies. The anonymous invite resolver is intentionally left callable.
Probe: `evidence/probe-narrow-private-rls-policy-roles.sql`.

Official advisor deltas after the continuation:

| Finding | Before hardening | After `20260614140923` | After final continuation |
| --- | ---: | ---: | ---: |
| `function_search_path_mutable` | 3 | 0 | 0 |
| `auth_rls_initplan` | 13 | 0 | 0 |
| `anon_security_definer_function_executable` | 32 | 26 | 1 |
| `authenticated_security_definer_function_executable` | 75 | 71 | 71 |
| `auth_leaked_password_protection` | 1 | 1 | 0 |
| `multiple_permissive_policies` | 169 | 169 | 0 |

## Current Advisor Continuation

Fresh WARN triage after the hardening pass originally confirmed the dashboard's
`73` warnings:

- `1` leaked-password protection Auth setting.
- `1` intentional anon-executable invite resolver.
- `71` authenticated public `SECURITY DEFINER` RPC/helper warnings.

The dashboard's five security INFO findings were also reproduced and resolved.
`20260614152946_explicit_internal_table_deny_policies.sql` adds explicit
restrictive deny-all RLS policies to the five internal tables that previously
had RLS enabled with no policies:

- `account_security_events`
- `closed_beta_allowed_emails`
- `collaboration_audit_events`
- `collaboration_invitation_tokens`
- `profile_role_hardening_audit`

The same pass revoked direct `public`, `anon`, and `authenticated` table grants
from those tables. Provider catalog verification now shows one restrictive
`deny direct api access` policy per table and no direct API-role grants. Official
security advisors at INFO level initially reported `73` total items, all `WARN`, with
no remaining security `INFO` findings. Migration history was repaired for
`20260614152946` after applying the reviewed SQL through the connector.

Leaked-password protection is now mapped to the Management API field
`password_hibp_enabled` on `PATCH /v1/projects/{ref}/config/auth`. On
2026-06-15, Philip ran the root wrapper `./enable-leaked-password-protection.sh`,
pasted a Supabase Management API token at the prompt, and the helper verified:

```text
Before password_hibp_enabled=false
PATCH response password_hibp_enabled=true
After password_hibp_enabled=true
Leaked password protection is enabled for project ebxxqidacheyapmmzavr.
```

Fresh security advisor verification now reports `72` total items, all `WARN`,
with no remaining security `INFO` findings and no
`auth_leaked_password_protection` warning:

```text
anon_security_definer_function_executable=1
authenticated_security_definer_function_executable=71
```

The remaining authenticated `SECURITY DEFINER` warnings are not safe to resolve
with blanket revoke or blanket private-schema wrappers. App-facing mutation RPCs
and policy helper predicates depend on their current privilege boundaries.
Only pure read endpoints with caller-RLS proof should be considered for direct
`SECURITY INVOKER` conversion in a separate migration.
