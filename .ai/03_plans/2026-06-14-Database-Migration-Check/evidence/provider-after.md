# Provider After Snapshot

Captured during implementation on 2026-06-14 against linked Supabase project
`ebxxqidacheyapmmzavr`.

## Applied Provider Migrations

The two missing app-facing surfaces were applied through Supabase MCP:

| Provider version | Provider name | Effect |
|---|---|---|
| `20260614125239` | `20260605113000_transactional_library_folder_delete` | Adds `public.delete_library_folder(uuid, uuid)` and grants authenticated execute. |
| `20260614125313` | `20260606090000_notification_system` | Adds `notification_definitions`, `notification_deliveries`, indexes, RLS, grants, and initplan-style `(select auth.uid())` predicates. |

After local filename reconciliation, `supabase migration list --linked` showed no
remote-only rows. The only remaining local-only rows were `20260520100459`,
`20260605123000`, and `20260605131500`; each is listed in
`migration-ledger-map.md`.

An accidental MCP no-op migration row named `noop_test_should_not_apply` was
created with statement `select 1;`. It had no schema/data effect and was removed
from `supabase_migrations.schema_migrations` by exact version/name/statement
match. A subsequent provider migration list confirmed it was gone.

## Post-Repair Surface Probe

```json
{
  "project_ref": "ebxxqidacheyapmmzavr",
  "has_ai_memory_preferences": false,
  "has_delete_library_folder": true,
  "has_notification_deliveries": true,
  "has_notification_definitions": true,
  "has_get_project_chart_buckets": false
}
```

Notification RLS policy probe:

```json
[
  {
    "tablename": "notification_definitions",
    "policyname": "users can read definitions delivered to them",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual_contains": "( SELECT auth.uid() AS uid)"
  },
  {
    "tablename": "notification_deliveries",
    "policyname": "users can read own notification deliveries",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual_contains": "( SELECT auth.uid() AS uid)"
  }
]
```

Sibling-order probe:

```json
{
  "function_name": "create_estimate_node_with_history",
  "args": "target_project_id uuid, target_estimate_id uuid, parent_node_id uuid, node_kind estimate_node_kind, node_name text, initial_sort_order integer, acting_user_id uuid, correlation_id uuid, target_tab_id uuid",
  "orders_by_stored_sort_order": true,
  "has_target_tab_id": true
}
```

## Residual Deferred Surfaces

- `ai_package_builder_memory_preferences` remains absent because
  `AI_PACKAGE_BUILDER_MEMORY_ENABLED` defaults off and runtime now probes schema
  availability before memory reads/writes. The SQL is moved to
  `supabase/migrations-pending-review/deferred/`.
- `get_project_chart_buckets(uuid[], text)` remains absent because charts still
  use the proven server-side JS reducer. The SQL is moved to
  `supabase/migrations-pending-review/deferred/`.
- Shared-link pending-review probes found the response recipient FK still uses
  `ON DELETE CASCADE`, and no duplicate published project publications currently
  block AC-MOD-06. Both AC-MOD files remain outside `supabase/migrations/`.
- The same five RLS-enabled/no-policy service/audit tables remain residual
  warnings and are out of scope for this targeted repair.
