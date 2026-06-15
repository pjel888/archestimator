# Migration Ledger Map

Date: 2026-06-14  
Provider: Supabase project `ebxxqidacheyapmmzavr` (`Archestimator`)

## Provider-Alias Filenames Reconciled Locally

These files were renamed so `supabase/migrations/` uses the provider-recorded
version while preserving the existing SQL body:

| Old local filename | Provider-recorded local filename |
|---|---|
| `20260519100903_remove_estimate_status_assumptions.sql` | `20260520051728_remove_estimate_status_assumptions.sql` |
| `20260519103000_rename_estimate_revision_label_to_sheet_code.sql` | `20260520051740_rename_estimate_revision_label_to_sheet_code.sql` |
| `20260519173857_populate_lewis_residence_estimate_tree.sql` | `20260520051859_populate_lewis_residence_estimate_tree.sql` |
| `20260519190958_optimize_workspace_estimate_list_indexes.sql` | `20260520051908_optimize_workspace_estimate_list_indexes.sql` |
| `20260519192045_atomic_estimate_node_moves.sql` | `20260520052009_atomic_estimate_node_moves.sql` |
| `20260520222038_enforce_two_kind_estimate_nodes.sql` | `20260520171505_enforce_two_kind_estimate_nodes.sql` |
| `20260520231000_reorder_estimate_nodes_rpc.sql` | `20260520171544_reorder_estimate_nodes_rpc.sql` |
| `20260525013900_estimate_activity_retention_metrics.sql` | `20260524174200_estimate_activity_retention_metrics.sql` |
| `20260525023500_estimate_sheet_project_budget.sql` | `20260525024608_estimate_sheet_project_budget.sql` |
| `20260525032000_estimate_sheet_notes.sql` | `20260525032741_estimate_sheet_notes.sql` |
| `20260614120000_teamspace_membership_atomic_guards.sql` | `20260613192255_teamspace_membership_atomic_guards.sql` |
| `20260614120100_teamspace_rls_authuid_perf.sql` | `20260613192344_teamspace_rls_authuid_perf.sql` |
| `20260614161500_project_estimate_list_summaries_rpc.sql` | `20260613201251_project_estimate_list_summaries_rpc.sql` |
| `20260614162000_rls_initplan_auth_uid.sql` | `20260613201302_rls_initplan_is_workspace_member.sql` |

## Newly Applied Provider Rows

| Local canonical filename | Provider version/name | Status |
|---|---|---|
| `20260614125239_20260605113000_transactional_library_folder_delete.sql` | `20260614125239` / `20260605113000_transactional_library_folder_delete` | Applied and verified present. |
| `20260614125313_20260606090000_notification_system.sql` | `20260614125313` / `20260606090000_notification_system` | Applied and verified present. Local SQL was updated to match provider initplan RLS predicates. |

## Deferred Or Superseded Outside Auto-Apply Path

| File | New location | Decision |
|---|---|---|
| `20260528103341_ai_package_builder_memory.sql` | `supabase/migrations-pending-review/deferred/20260528103341_ai_package_builder_memory.sql` | Deferred because provider table is absent and the feature flag remains default-off. |
| `20260614021500_get_project_chart_buckets_rpc.sql` | `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql` | Deferred because app charts still use the proven server-side JS reducer and do not call the RPC. |
| `20260611031500_estimate_node_sibling_order_stored.sql` | `supabase/migrations-pending-review/superseded/20260611031500_estimate_node_sibling_order_stored.sql` | Superseded by the live 9-argument tab-aware RPC body; applying this file as-is would regress the signature. |

## Known Intentional Local-Only Items

Fresh `supabase migration list --linked` after reconciliation shows no
remote-only rows. These are the only local-only rows left in `supabase/migrations/`.
They remain because they are current test-backed historical/data-repair artifacts,
but they must not be bulk-pushed without a fresh provider decision:

- `20260520100459_remove_estimate_node_move_rpc.sql` — effect is already covered
  by later schema state; retained as a historical contract test fixture.
- `20260605123000_workspace_scoped_component_seed_ids.sql` — data-repair/helper
  drift; needs scoped provider-data review before apply.
- `20260605131500_restore_lewis_residence_seed_rows.sql` — deterministic demo
  data repair; needs scoped provider-data review before apply.

## Guardrail

Do not run a blind `supabase db push --linked`. The canonical path is provider
probe, apply one reviewed file or replacement migration, verify effect, then
record the provider version in this map.
