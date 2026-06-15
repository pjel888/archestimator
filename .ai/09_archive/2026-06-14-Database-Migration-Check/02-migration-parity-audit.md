# Migration Parity Audit

> Implementation status, 2026-06-14: this is the pre-repair ledger snapshot.
> Known timestamp aliases were reconciled locally to the provider-recorded
> versions. Current ledger truth lives in `evidence/migration-ledger-map.md`.

## Inventory

| Surface | Count / status |
| --- | --- |
| Local canonical migration files in `supabase/migrations/` | 93 |
| Remote entries in `supabase_migrations.schema_migrations` | 85 |
| Local duplicate migration versions | 0 |
| Local nonconforming migration filenames | 0 |
| Pending-review SQL drafts outside canonical migrations | 3 |
| Edge functions | 0 |

Local migration folder is structurally clean, but the local ledger is not aligned to the remote ledger.

## `supabase migration list --linked` Result

The linked CLI comparison showed:

- 22 local-only versions.
- 14 remote-only versions.
- Multiple timestamp alias pairs where local and remote represent the same intent under different versions.
- Several true local-only migrations whose database objects are missing remotely.

Main-lane CLI advisor/query attempts later hit temporary pooler auth/circuit-breaker failures, but `supabase migration list --linked` completed and direct MCP SQL confirmed the remote migration count and latest remote version.

## Remote First And Last Migration

| Item | Version |
| --- | --- |
| First remote migration | `20260518090000` |
| Latest remote migration | `20260614013638_enable_estimate_node_mixed_writes_p6` |

The latest remote migration is the P6 mixed-node writes migration. A live data check found mixed nodes already exist, so rollback-style thinking is inappropriate. Any repair should be forward-only.

## Timestamp Alias Drift

These local files appear to represent work that is already applied remotely under different versions:

| Local version | Remote version | Intent |
| --- | --- | --- |
| `20260519100903` | `20260520051728` | remove estimate status assumptions |
| `20260519103000` | `20260520051740` | rename estimate revision label to sheet code |
| `20260519173857` | `20260520051859` | populate Lewis Residence estimate tree |
| `20260519190958` | `20260520051908` | optimize workspace estimate list indexes |
| `20260519192045` | `20260520052009` | atomic estimate node moves |
| `20260520222038` | `20260520171505` | enforce two-kind estimate nodes |
| `20260520231000` | `20260520171544` | reorder estimate nodes RPC |
| `20260525013900` | `20260524174200` | estimate activity retention metrics |
| `20260525023500` | `20260525024608` | estimate sheet project budget |
| `20260525032000` | `20260525032741` | estimate sheet notes |
| `20260614120000` | `20260613192255` | teamspace membership atomic guards |
| `20260614120100` | `20260613192344` | teamspace RLS auth.uid performance |
| `20260614161500` | `20260613201251` | project estimate list summaries RPC |
| `20260614162000` | `20260613201302` | RLS initplan auth.uid |

Recommendation: build a formal alias map before any migration repair. Do not assume name similarity is sufficient; compare object definitions and function bodies where the migration is not idempotent.

## True Local-Only Candidates

These local migration files are not represented by live objects or remote history in the linked project:

| Local migration | Remote evidence | Classification |
| --- | --- | --- |
| `20260520100459_remove_estimate_node_move_rpc.sql` | `move_estimate_nodes` was not found remotely | Likely already superseded by later schema state; still ledger drift |
| `20260528103341_ai_package_builder_memory.sql` | `ai_package_builder_memory_preferences` table missing remotely | True deferred feature/schema drift |
| `20260605113000_transactional_library_folder_delete.sql` | `delete_library_folder` RPC missing remotely | App-facing missing object |
| `20260605123000_workspace_scoped_component_seed_ids.sql` | `component_library_seed_uuid` function missing remotely | Data-repair/helper drift |
| `20260605131500_restore_lewis_residence_seed_rows.sql` | deterministic restored row IDs absent, but estimate still has rows | Seed/data repair drift |
| `20260606090000_notification_system.sql` | notification tables missing remotely | App-facing missing schema |
| `20260611031500_estimate_node_sibling_order_stored.sql` | remote `create_estimate_node_with_history` is newer 9-arg tab-aware form; migration is not recorded | Contract drift; likely needs rewrite before apply |
| `20260614021500_get_project_chart_buckets_rpc.sql` | `get_project_chart_buckets` RPC missing remotely | Deferred optimization; not currently called |

## P6 File Status

Git status showed an untracked local file:

`supabase/migrations/20260614013638_enable_estimate_node_mixed_writes_p6.sql`

Remote history contains the same version, and live data shows P6 behavior is in use. A parallel data-integrity lane reported the local file is not byte-identical to the SQL text recorded remotely and includes a comment saying it intentionally matches hosted version / skips production history.

Recommendation: do not commit this file as canonical evidence until it is reconciled against the actual remote version. If the repository needs a replayable P6 migration, make the file match the intended canonical remote semantics exactly and document why the version already exists remotely.

## Do Not Apply Blindly

The local-only list should not be mass-applied in current order. Reasons:

- Some are alias drift, not missing work.
- Some are helper/data repairs that may already be superseded.
- `20260611031500_estimate_node_sibling_order_stored.sql` likely predates the current tab-aware `create_estimate_node_with_history` signature and needs a new migration rather than direct application.
- Pending-review SQL has live preconditions that are not all satisfied.
