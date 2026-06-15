# Provider Before Snapshot

Captured during implementation on 2026-06-14 against linked Supabase project
`ebxxqidacheyapmmzavr` (`Archestimator`, `ap-southeast-2`, Postgres 17.6.1.121).

## Access Notes

- `supabase migration list --linked` and linked SQL query commands were blocked by
  CLI Postgres password/SASL failures. No schema mutation was attempted through
  the password-gated linked CLI path.
- Supabase MCP project lookup succeeded and confirmed the linked project boundary:
  `ebxxqidacheyapmmzavr`, name `Archestimator`, status `ACTIVE_HEALTHY`.

## Missing App Surfaces Before Repair

Provider probes showed:

```json
{
  "has_delete_library_folder": false
}
```

The existing `create_estimate_node_with_history` provider function already used
the current 9-argument, tab-aware signature and ordered siblings by stored
`sort_order, created_at, id`, so the stale sibling-order migration was not safe
to apply as-is.

## Advisor Baseline

Security/performance advisors remained broad and mostly pre-existing:

- RLS-enabled/no-policy warnings for service/audit tables:
  `account_security_events`, `closed_beta_allowed_emails`,
  `collaboration_audit_events`, `collaboration_invitation_tokens`,
  `profile_role_hardening_audit`.
- Function search-path warnings for `resolve_app_role_for_email`,
  `set_updated_at`, and `collaboration_role_rank`.
- Many SECURITY DEFINER execute warnings on intentionally exposed RPCs.
- Performance warnings for unindexed foreign keys and multiple permissive
  policies. These map to the deferred T4/index-policy hardening bundle and were
  not applied in this repair pass.
