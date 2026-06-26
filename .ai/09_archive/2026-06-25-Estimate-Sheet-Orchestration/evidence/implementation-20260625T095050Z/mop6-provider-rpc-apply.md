---
title: MOP-6 Provider RPC Apply Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-6 Provider RPC Apply Evidence

## Scope

This evidence records the scoped hosted Supabase apply for the estimate-sheet
row/tree RPC work. It applies only to linked project `ebxxqidacheyapmmzavr`.

## Preflight

- `supabase/.temp/project-ref`: `ebxxqidacheyapmmzavr`.
- `supabase migration list --linked` still showed broad migration-history
  drift. Because of that drift, this pass did not run `supabase db push`.
- Corrected pre-apply function catalog:
  `mop6-provider-rpc-readiness-before-corrected.json`.
- Before apply, the linked project had helper functions
  `estimate_row_item_snapshot`, `estimate_row_line_total`, and
  `estimate_row_context`; it did not have
  `move_estimate_row_component_with_history`,
  `delete_estimate_row_items_bulk_with_history`, or
  `delete_estimate_nodes_bulk_with_history`.
- Before apply, `delete_estimate_node_with_history` and
  `rename_estimate_node_with_history` did not use
  `assert_can_edit_estimate_for_history`.

## Provider Apply

Commands:

```bash
supabase db query --linked --file supabase/migrations/20260625183000_estimate_center_atomic_row_mutations.sql --output json
supabase db query --linked --file supabase/migrations/20260625193000_estimate_tree_delete_authority_and_authz.sql --output json
```

Results:

- `mop6-provider-apply-20260625183000.json`: success, no result rows.
- `mop6-provider-apply-20260625193000.json`: success, no result rows.
- The tree migration was transaction-wrapped locally before apply.

## Post-Apply Proof

Post-apply function catalog: `mop6-provider-rpc-readiness-after.json`.

Verified remote state:

- `move_estimate_row_component_with_history`: exists, returns `jsonb`,
  `SECURITY DEFINER`, `search_path=public`, authenticated EXECUTE granted,
  anon EXECUTE denied, edit assertion present, idempotency lookup present.
- `delete_estimate_row_items_bulk_with_history`: exists with the same security,
  grant, edit-assertion, and idempotency properties.
- `delete_estimate_node_with_history`: still exists and now returns
  `deletedNodeIds` plus `fallbackNodeId`, uses edit assertion, authenticated
  EXECUTE granted, anon EXECUTE denied.
- `delete_estimate_nodes_bulk_with_history`: exists, returns `deletedNodeIds`
  plus `fallbackNodeId`, uses edit assertion, authenticated EXECUTE granted,
  anon EXECUTE denied.
- `rename_estimate_node_with_history`: uses edit assertion after the patch.

## Validation

- `bun x vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`:
  1 file / 11 tests passed after adding the transaction wrapper.
- `bun x vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1`:
  3 files / 69 tests passed after provider apply.
- `bun run type-check`: passed.
- `git diff --check`: passed.

## Remaining Limitation

The two migration versions remain unrecorded in
`supabase_migrations.schema_migrations` because this pass intentionally used
direct scoped SQL apply instead of broad `supabase db push`. The post-apply
`supabase-migration-list-after-direct-rpc-apply-20260625.txt` evidence still
shows `20260625183000` and `20260625193000` as local-only migration-history
rows even though the functions are present on the linked project.
