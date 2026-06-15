# Supabase Advisors After Hardening

Date: 2026-06-14

## Migration Applied

`20260614140923_harden_security_advisor_findings.sql`
`20260614143000_harden_non_public_helper_execute.sql`
`20260614144000_consolidate_low_risk_permissive_policies.sql`
`20260614144136_command_split_core_public_policies.sql`
`20260614144359_command_split_remaining_public_policies.sql`
`20260614144712_narrow_private_rls_policies_to_authenticated.sql`

Application path:

1. `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260614140923_harden_security_advisor_findings.sql --output json`
2. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair --linked --status applied 20260614140923`
3. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration list --linked`
4. `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260614143000_harden_non_public_helper_execute.sql --output json`
5. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair --linked --status applied 20260614143000`
6. `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260614144000_consolidate_low_risk_permissive_policies.sql --output json`
7. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair --linked --status applied 20260614144000`
8. `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260614144136_command_split_core_public_policies.sql --output json`
9. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair --linked --status applied 20260614144136`
10. `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260614144359_command_split_remaining_public_policies.sql --output json`
11. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair --linked --status applied 20260614144359`
12. `SUPABASE_TELEMETRY_DISABLED=1 supabase db query --linked --file supabase/migrations/20260614144712_narrow_private_rls_policies_to_authenticated.sql --output json`
13. `SUPABASE_TELEMETRY_DISABLED=1 supabase migration repair --linked --status applied 20260614144712`

Ledger result:

- Local `20260614140923` is recorded remotely as `20260614140923`.
- Local `20260614143000` is recorded remotely as `20260614143000`.
- Local `20260614144000` is recorded remotely as `20260614144000`.
- Local `20260614144136` is recorded remotely as `20260614144136`.
- Local `20260614144359` is recorded remotely as `20260614144359`.
- Local `20260614144712` is recorded remotely as `20260614144712`.
- No remote-only rows.
- The only local-only rows remain the documented deferred versions:
  - `20260520100459`
  - `20260605123000`
  - `20260605131500`

## Advisor Delta

Command:

```bash
SUPABASE_TELEMETRY_DISABLED=1 supabase db advisors --linked --type all --level warn --fail-on none
```

| Finding | Before | After | Delta |
| --- | ---: | ---: | ---: |
| `function_search_path_mutable` | 3 | 0 | -3 |
| `auth_rls_initplan` | 13 | 0 | -13 |
| `anon_security_definer_function_executable` | 32 | 1 | -31 |
| `authenticated_security_definer_function_executable` | 75 | 71 | -4 |
| `auth_leaked_password_protection` | 1 | 1 | 0 |
| `multiple_permissive_policies` | 169 | 0 | -169 |

## Provider Proof

`probe-hardening-advisor-fixes.sql` confirms:

- `resolve_app_role_for_email(text)`, `set_updated_at()`, and
  `collaboration_role_rank(public.collaboration_role)` now have
  `search_path=public, pg_temp`.
- The 13 targeted RLS policies now render `auth.uid()` / `auth.jwt()` as
  `SELECT auth.uid()` or `SELECT auth.jwt()` initplans in `pg_policies`.
- Helper/trigger functions no longer execute for `anon` or `authenticated`:
  - `add_workspace_owner_membership()`
  - `enforce_estimate_row_item_area_node()`
  - `enforce_library_folder_tree()`
  - `handle_new_auth_user()`
- Authenticated-only RPCs keep `authenticated` execute and no longer execute
  for `anon`:
  - `list_pending_collaboration_invitations()`
  - `set_cost_library_component_lifecycle_state(...)`
- 10 non-public helper functions have zero public-role RLS policy references,
  no longer execute for `anon`/`PUBLIC`, and still execute for `authenticated`.
- Five low-risk duplicate policy groups now have one OR-equivalent policy each:
  - `ai_action_runs`
  - `ai_data_access_events`
  - `ai_tool_calls`
  - `estimate_favorites`
  - `project_favorites`
- Remaining `multiple_permissive_policies` were cleared by command-splitting
  broad `ALL` policies and preserving old access predicates per command.
- Private app RLS policies that depended on helper SECURITY DEFINER functions
  are now scoped to `authenticated`; targeted helpers no longer execute for
  `anon`/`PUBLIC` and still execute for `authenticated`.

## Remaining Backlog

- Enable leaked-password protection through Supabase Auth settings. Current
  docs describe this under Auth password security and note it is available on
  Pro Plan and above:
  `https://supabase.com/docs/guides/auth/password-security`.
  Continuation proof: organization `unfair-black-sb5unhb` is on Pro, but this
  session has no Supabase Management API access token, no connector tool for
  auth config mutation, and no confirmed local CLI config key for this setting.
- The only remaining anon-executable SECURITY DEFINER function is
  `resolve_collaboration_invitation(text)`, which is intentionally callable for
  the public invite landing page.
- Authenticated SECURITY DEFINER warnings remain for app-facing RPCs and helper
  predicates. Treat these as a separate private-schema/refactor decision, not a
  blind grant-revoke task.
