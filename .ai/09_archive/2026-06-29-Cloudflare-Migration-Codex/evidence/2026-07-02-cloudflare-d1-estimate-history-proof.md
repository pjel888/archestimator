# Cloudflare D1 Estimate-History Proof

Generated: 2026-07-01T19:11:13.190Z

Local D1 estimate-history proof only. It uses sanitized temporary SQLite data to exercise D1-style transactions, rollback, operation-key idempotency, query plans, and restore mechanics; it does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live Supabase RPCs, or make production D1/Auth/Realtime ready.

## Readiness

| Gate | Ready? |
| --- | --- |
| Schema Ready | yes |
| App Layer Editor Guard Ready | yes |
| Estimate Tab Mutation Ready | yes |
| Subtree Insert Ready | yes |
| Row Move Ready | yes |
| Sheet Adjustment Ready | yes |
| Package Apply Ready | yes |
| Promote To Library Ready | yes |
| Rollback Ready | yes |
| Idempotency Ready | yes |
| Query Budget Ready | yes |
| Restore Fixture Ready | yes |
| Local Estimate History D1 Slice Ready | yes |
| Production Estimate History D1 Ready | no |

## Affected RPCs

- `archive_estimate_tab_with_history`
- `create_ai_package_library_components_with_history`
- `create_estimate_tab_with_history`
- `create_project_estimate_package_with_history`
- `delete_estimate_tab_with_history`
- `duplicate_estimate_tab_with_history`
- `insert_estimate_subtree_into_estimate_with_history`
- `move_estimate_row_item_with_history`
- `promote_estimate_row_to_library_component`
- `rename_estimate_tab_with_history`
- `reorder_estimate_tabs_with_history`
- `update_estimate_sheet_adjustment_with_history`

## Fixture Facts

| Fact | Value |
| --- | ---: |
| Fixture tables | 13 |
| Rows seeded after proof | 53 |
| Viewer mutation failed closed | yes |
| Viewer mutation residue rows | 0 |
| Duplicate create tab rows | 1 |
| Duplicate reorder residue rows | 0 |
| Subtree node rows | 2 |
| Duplicate subtree operation rows | 1 |
| Moved row node id | node-move-target |
| Sheet adjustment value | 7.5 |
| Project package command rows | 1 |
| Library package command rows | 1 |
| Promoted library component rows | 1 |
| Rollback command failed closed | yes |
| Rollback residue rows | 0 |
| Restored tab rows | 8 |
| Restored node rows | 8 |
| Restored row rows | 7 |
| Restored history rows | 11 |

## Query Proof

| Surface | Query budget | Planned queries | Local p95 | Local budget | Rows | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| estimate_history_tab_list | 1 | 1 | 3.95ms | 45ms | 6 | local-pass |
| estimate_history_event_timeline | 1 | 1 | 4.52ms | 45ms | 10 | local-pass |
| estimate_history_subtree_children | 1 | 1 | 5.21ms | 45ms | 1 | local-pass |
| estimate_history_package_command_lookup | 1 | 1 | 4.89ms | 45ms | 1 | local-pass |

## Index Plan Details

- QUERY PLAN
- `--SEARCH estimate_tabs USING INDEX idx_estimate_tabs_estimate_sort (estimate_id=? AND status=?)
- QUERY PLAN
- `--SEARCH estimate_sheet_events USING INDEX idx_estimate_sheet_events_estimate_created (estimate_id=?)
- QUERY PLAN
- `--SEARCH estimate_nodes USING INDEX idx_estimate_nodes_estimate_tab_parent_sort (estimate_id=? AND tab_id=? AND parent_id=?)
- QUERY PLAN
- `--SEARCH ai_package_apply_commands USING INDEX sqlite_autoindex_ai_package_apply_commands_2 (workspace_id=? AND command_kind=? AND idempotency_key=?)

## Production Proof Still Required

- Hosted Worker+D1 estimate-history mutation proof with real D1 bindings and Better Auth-derived identity.
- D1 schema migration/readback proof for estimates, tabs, nodes, row items, history events, operation keys, and package apply commands.
- Cross-workspace denial tests against mounted Worker route/action surfaces for estimate mutations.
- Rollback/idempotency replay proof using production-shaped D1 transactions and retry/operation keys.
- Hosted Worker+D1 p95/query-count proof for tab lists, estimate tree/subtree reads, and activity timeline surfaces.
- Provider-backed D1 export/import restore proof for estimate-history tables.

## Blockers

- Hosted Worker+D1 estimate-history proof is still missing.
- Better Auth production identity handoff is still missing; keep current Supabase-backed estimate actions live.
- Provider-backed D1 export/import restore proof for estimate-history tables is still missing.
