# Current Advisor Warning Triage

Date: 2026-06-14
Last updated: 2026-06-15

## Provider Scope

Project: `ebxxqidacheyapmmzavr` (`Archestimator`)

The local Supabase profile and connector both resolve this project as the linked
Archestimator project. archestimator remains unlinked and was not touched.

## Current WARN Breakdown

Fresh security advisor run:

```bash
SUPABASE_TELEMETRY_DISABLED=1 supabase db advisors --linked --type security --level info --fail-on none --output-format json
```

Result:

| Warning | Count | Notes |
| --- | ---: | --- |
| `anon_security_definer_function_executable` | 1 | `resolve_collaboration_invitation(text)`, intentionally public for invite landing pages. |
| `authenticated_security_definer_function_executable` | 71 | Public `SECURITY DEFINER` RPCs/helpers executable by signed-in users. |
| `auth_leaked_password_protection` | 0 | Resolved through the Management API helper on 2026-06-15. |

Total current WARN items: `72`.

Provider SQL independently confirms `72` public `SECURITY DEFINER` functions
remain executable by API roles: `1` by `anon` and `71` by `authenticated`.

## Leaked Password Protection

Current official docs put leaked password protection under Auth password
security and state that Supabase Auth uses HaveIBeenPwned Pwned Passwords to
reject leaked passwords. The Management API OpenAPI schema exposes the setting
as:

```json
{ "password_hibp_enabled": true }
```

Endpoint:

```text
PATCH /v1/projects/{ref}/config/auth
```

Required permissions/scopes shown by the OpenAPI schema:

- `auth_config_write`
- `project_admin_write`
- OAuth scope `auth:write`

The repo now includes a token-safe helper:

```bash
.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/enable-leaked-password-protection.sh
```

It reads `SUPABASE_ACCESS_TOKEN` from the environment, patches only
`password_hibp_enabled`, and verifies the final value with a GET request. It
does not write the token to disk.

The repo root also includes a convenience wrapper:

```bash
./enable-leaked-password-protection.sh
```

On 2026-06-15, Philip ran the wrapper, pasted a Supabase Management API token at
the prompt, and the helper verified the provider state:

```text
Before password_hibp_enabled=false
PATCH response password_hibp_enabled=true
After password_hibp_enabled=true
Leaked password protection is enabled for project ebxxqidacheyapmmzavr.
```

Supabase CLI `2.106.0` maps local auth config keys for password length and
required characters, but the local TOML schema/mapping inspected in the CLI
binary does not expose a safe narrow `password_hibp_enabled` key for
`config push`; the current local `supabase/config.toml` also contains broad
development Auth values. Do not use `supabase config push` for this toggle.

Fresh advisor verification after the helper reports only the remaining SECURITY
DEFINER warnings:

```text
total=72
WARN=72
by_name:
  anon_security_definer_function_executable=1
  authenticated_security_definer_function_executable=71
```

## Authenticated SECURITY DEFINER Warnings

The 71 authenticated warnings are not a single grant mistake. They split into:

- app-facing RPC contracts currently called from `src/`, such as
  `*_with_history`, invite, bulk delete/archive, cost-library, beta-allowlist,
  and AI package-builder RPCs;
- authorization helper predicates used by RLS and server actions, such as
  `can_edit_estimate`, `can_edit_project`, `is_workspace_member`, and access
  rank helpers.

Blanket `REVOKE EXECUTE FROM authenticated` would break app behavior. A
separate architecture check also rejected a blanket private-implementation /
public-wrapper migration for the full warning set: it would mix caller-RLS-safe
read endpoints with definer-backed policy helpers and mutation RPCs that need
their current privilege boundary.

The only safe cleanup class is narrower:

1. split the 71 warnings by function class;
2. convert only pure read endpoints that already work under caller RLS directly
   to `SECURITY INVOKER`;
3. leave policy helpers, mutating RPCs, and intentional public invite resolution
   out of an advisor-cleanup sweep unless the surrounding access contract is
   redesigned and proven.

This should be treated as a separate high-blast-radius migration, not a blind
advisor cleanup.

## INFO Findings

Sequential security advisor run reproduced the dashboard's `5` INFO findings:

| Info finding | Count | Tables |
| --- | ---: | --- |
| `rls_enabled_no_policy` | 5 | `account_security_events`, `closed_beta_allowed_emails`, `collaboration_audit_events`, `collaboration_invitation_tokens`, `profile_role_hardening_audit` |

Provider inspection showed each table had RLS enabled and no policies.
`collaboration_audit_events` also had leftover direct API-role grants. The
tables are internal/server-mediated, so the applied fix preserves the existing
no-direct-client-row contract:

- migration `20260614152946_explicit_internal_table_deny_policies.sql`;
- applied to linked project `ebxxqidacheyapmmzavr`;
- recorded with `supabase migration repair --linked --status applied 20260614152946`;
- each table now has a restrictive `deny direct api access` policy with
  `using (false)` and `with check (false)`;
- direct `public`, `anon`, and `authenticated` table grants are revoked.

Verification after apply:

```text
supabase db advisors --linked --type security --level info --fail-on none --output-format json
total=72
WARN=72
```

The security dashboard's five INFO findings are resolved, and the leaked-password
protection security WARN is resolved. A full all-advisors INFO run can still
report performance INFO backlog items (`unindexed_foreign_keys`, `unused_index`,
and `auth_db_connections_absolute`), which are outside the security dashboard
count and should be handled as a separate performance pass.
