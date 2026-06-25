# 16 - DB Posture Inventory

Generated: 2026-06-25T00:15:25Z

This artifact records the current unresolved database security posture for the
InfoSec run. It is evidence for open findings, not a release approval and not a
claim that the listed functions are individually safe.

## Summary

- Applied migration SECURITY DEFINER text matches: 204
- Applied migration files containing SECURITY DEFINER: 67
- Applied migration FORCE ROW LEVEL SECURITY matches: 0
- Provider SQL executed during this checkpoint: none
- Release gate impact: `INFOSEC-DB-001` and `INFOSEC-DB-002` remain open

## Method

Commands used:

```sh
rg -i "\bsecurity\s+definer\b" supabase/migrations --glob '*.sql' | wc -l
rg -il "\bsecurity\s+definer\b" supabase/migrations --glob '*.sql' | wc -l
rg -i "\bforce\s+row\s+level\s+security\b" supabase/migrations --glob '*.sql'
```

The FORCE RLS command exited with no matches.

## High-Risk Review Buckets

These examples are not the full function set. They are the current review
anchors for destructive/admin or service-role-adjacent behavior.

| Bucket | Example migration evidence | Current local coverage | Remaining work |
|---|---|---|---|
| Estimate destructive RPCs | `supabase/migrations/20260621122125_estimate_sheet_bulk_delete_and_edit_rpc_hardening.sql` defines `delete_estimate_nodes_bulk_with_history` with authenticated execute grant | `tests/vitest/security-findings-auth-contracts.test.ts` asserts estimate edit access, revoke/grant shape, and key function names | Negative cross-tenant/provider tests and per-function review across all estimate definer RPCs |
| Project deletion RPCs | `supabase/migrations/20260617010523_harden_project_delete_preview_and_audit_warnings.sql` defines `preview_bulk_delete_projects` and `execute_bulk_delete_projects` | `tests/vitest/project-deletion-active-publication-contract.test.ts` and `tests/vitest/mass-deletion-contract.test.ts` cover source-level access and grant contracts | Identity-separated provider tests for manager/non-manager paths and final grant inventory |
| Mass deletion storage cleanup | `supabase/migrations/20260604031000_lock_mass_deletion_cleanup_result_rpc.sql` restricts `record_mass_deletion_storage_cleanup_result` to `service_role` | `tests/vitest/mass-deletion-contract.test.ts` asserts service-role-only cleanup RPC grant | Provider-side service-role/table-owner bypass posture review |
| Library trust governance | `supabase/migrations/20260622143000_library_trust_governance.sql` contains 12 SECURITY DEFINER matches across cost library review/admin functions | No complete InfoSec-specific negative matrix recorded in this run | Per-function authorization review and editor/admin negative tests |
| Public share/comment/response RPCs | `insert_client_comment`, `submit_client_response`, and publication credential functions appear in multiple hardening migrations | Public route-level tests cover CSRF and generic error responses; DB-level RPC identity tests are not complete | Provider tests for service-role-only RPC expectations and no public/authenticated direct execution |

## FORCE RLS Posture

No applied migration currently uses `FORCE ROW LEVEL SECURITY`.
`project_publication_events` is the clearest reviewed example of the current
posture: it enables RLS, revokes public/anon/authenticated table privileges, and
grants insert to `service_role` without a service-role policy. The corrected
schema test now documents that actual posture instead of expecting a nonexistent
policy.

This can be acceptable in Supabase when service-role writes are intentionally
server-only, but it is still an open release decision because SECURITY DEFINER,
service-role, and table-owner bypass behavior must be reviewed together.

## Stop Condition

Do not close `INFOSEC-DB-001` or `INFOSEC-DB-002` until:

- SECURITY DEFINER functions have a per-function authorization/grant/search-path
  review with high-risk negative tests.
- Service-role/table-owner bypass and FORCE RLS choices are explicitly decided
  for tables reached by server-only writes and SECURITY DEFINER functions.
- Provider-backed tests or read-only proofs cover the high-risk DB paths that
  local source tests cannot prove.
