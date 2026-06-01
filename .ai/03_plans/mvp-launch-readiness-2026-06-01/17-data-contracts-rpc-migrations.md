# Data Contracts, RPCs, and Migrations

## Third-Pass Schema Corrections

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. Local migrations and generated types were inspected; linked Supabase was not queried, so production schema readiness is a P0 proof gap.

**VERIFIED CONTRACT — checked against current local schema/types:** `estimate_row_items` has `source_library_item_id`, `source_snapshot`, `metadata`, `link_state`, and `row_revision`; `estimate_row_link_state` includes `unlinked`, `linked-clean`, `linked-overridden`, `detached`, `source-changed`; row RPCs use revision checks and write `estimate_sheet_events`.

| Contract | Current state | Launch requirement |
| --- | --- | --- |
| Project-specific rows | Persist as `estimate_row_items`, not library items. | Docs/UI must not call them reusable library components unless promoted later. |
| Detached state | Enum exists. | Use for intentional severing from a real library source; preserve source snapshot. |
| Unlinked state | Enum/default exists. | Use for manual/blank/never-linked rows with null `source_library_item_id`. |
| Source metadata | `source_snapshot` and `metadata` JSONB exist. | Store user-safe provenance; avoid oversized payloads and public leaks. |
| History | `estimate_sheet_events` stores row context and snapshots. | Detach/unlink must emit event with old/new source state. |
| RPC discipline | Existing row RPCs revision-check and increment `row_revision`. | New write path must not direct-write table or bypass revision/history. |
| Discount constraint | Signed discount migration exists locally. | Linked remote must be repaired/verified before relying on negative adjustment. |

RLS verification queries and migration rollback steps are required by `26-security-threat-model-and-rls-audit-plan.md` and `30-data-backup-disaster-recovery-plan.md`.

This document is the source of truth for row unlink/project-specific data work.

## Current `estimate_row_items`

Verified generated type: `src/lib/supabase/types.ts:1127`.

Important columns:

- `id: string`
- `estimate_id: string`
- `node_id: string`
- `item_no: string | null`
- `material: string`
- `description: string | null`
- `quantity: number`
- `unit: string`
- `item_cost: number`
- `misc_cost: number`
- `contingency_percentage: number | null`
- `source_library_item_id: string | null`
- `source_snapshot: Json | null`
- `link_state: estimate_row_link_state`
- `metadata: Json`
- `row_revision: number`
- `sort_order: number`
- `created_at`, `updated_at`

No `area_node_id`.

## Current `estimate_sheet_events`

Verified generated type: `src/lib/supabase/types.ts:1241`.

Columns:

- `id`
- `workspace_id`
- `estimate_id`
- `estimate_node_id`
- `target_row_id`
- `event_type`
- `event_source`
- `correlation_id`
- `actor_user_id`
- `row_context`
- `old_snapshot`
- `new_snapshot`
- `changed_fields`
- `total_delta`
- `payload`
- `metadata`
- `created_at`

No `project_id`, `target_type`, `target_id`, `actor_id`, or `snapshot`.

## Current Row Mutation RPC Conventions

Generated types:

- `insert_estimate_row_item_with_history(target_project_id, target_estimate_id, target_node_id, row_payload, acting_user_id?, correlation_id?)`
- `update_estimate_row_item_with_history(target_project_id, target_estimate_id, target_row_id, expected_row_revision, row_patch, acting_user_id?, correlation_id?)`
- `replace_estimate_row_item_with_history(target_project_id, target_estimate_id, target_row_id, expected_row_revision, replacement_payload, acting_user_id?, correlation_id?)`
- `delete_estimate_row_item_with_history(target_project_id, target_estimate_id, target_row_id, expected_row_revision, acting_user_id?, correlation_id?)`

Migration behavior:

- Workspace resolution uses `resolve_estimate_workspace(target_project_id,target_estimate_id,acting_user_id)`.
- Row update checks `expected_row_revision`.
- History rows write old/new snapshots and valid event columns.

## Final Unlink RPC Proposal

Name:

`unlink_estimate_row_item_from_library_with_history`

Arguments:

```sql
-- VERIFIED CONTRACT
target_project_id uuid,
target_estimate_id uuid,
target_row_id uuid,
expected_row_revision integer,
acting_user_id uuid default null,
correlation_id uuid default gen_random_uuid(),
reason text default null
```

Return:

- JSONB canonical row snapshot, matching the style of existing row RPCs.

Behavior:

- Resolve workspace using existing resolver.
- Lock row with `FOR UPDATE`.
- Reject missing row, workspace mismatch, stale revision, and already-unlinked row.
- Set `source_library_item_id = null`.
- Set `link_state = 'detached'`.
- Preserve `source_snapshot`.
- Merge unlink metadata into `metadata`.
- Increment `row_revision`.
- Insert `estimate_sheet_events` row with `event_type='row_unlinked'`.

## Project-Specific Row Update Proposal

Use existing `update_estimate_row_item_with_history` for scalar edits after a row is detached/unlinked.

Action signature:

```ts
// IMPLEMENTATION SKETCH
updateProjectSpecificEstimateRowItem(input: {
  projectId: string;
  estimateId: string;
  rowId: string;
  expectedRowRevision: number;
  patch: {
    material?: string;
    description?: string | null;
    supplier?: string | null;
    brand?: string | null;
    pricingSource?: string | null;
    pricingDate?: string | null;
    confidence?: string | null;
    notes?: string | null;
  };
}): Promise<{ row: EstimateRowItem }>
```

Guard:

- Only allow component/provenance field edits when current row `link_state` is `detached` or `unlinked`.
- Linked row scalar cost edits can continue using existing update behavior, which may mark `linked-overridden`.

## Enum/Event Requirements

- Existing enum already supports `detached`.
- `estimate_sheet_events.event_type` is text, not enum.
- No enum migration required for `row_unlinked`.
- Function migration and grant are required.

## RLS / Grant Strategy

- Define RPC as `security definer` following existing row RPC pattern.
- Use `set search_path = public`.
- Call `resolve_estimate_workspace` to enforce project/estimate/workspace/user access.
- Grant execute to the same roles as existing row mutation RPCs.
- Do not grant table write paths directly beyond existing policies.

## Transaction Boundaries

The RPC is one transaction:

1. Resolve workspace/access.
2. Lock row.
3. Validate revision/link state.
4. Update row.
5. Insert event.
6. Return row JSON.

If event insert fails, row update must roll back.

## Row Revision Conflict Behavior

- Required input: `expected_row_revision`.
- Reject when stored revision differs.
- Return/raise same conflict convention as existing update/replace/delete RPCs.
- Client must refresh cached tree and display a retry message.

## History/Audit Payload

Use:

- `old_snapshot`: `to_jsonb(old_row)`
- `new_snapshot`: `to_jsonb(new_row)`
- `changed_fields`: `array['source_library_item_id','link_state','metadata']`
- `total_delta`: `0`
- `payload`: `{ "reason": reason }`
- `metadata`: `{ "detachedFromSourceLibraryItemId": old_row.source_library_item_id }`
- `row_context`: at minimum `{ "nodeId": new_row.node_id }`

## Type Generation Requirement

After migration:

- Regenerate `src/lib/supabase/types.ts`.
- Add the new RPC to action union types if needed.
- Update `EstimateRowItem` DTO with `linkState`, `metadata`, and source snapshot fields needed by UI.

## Rollback Strategy

```sql
-- VERIFIED CONTRACT - rollback function name only; execute in reviewed migration.
drop function if exists public.unlink_estimate_row_item_from_library_with_history(
  uuid, uuid, uuid, integer, uuid, uuid, text
);
```

Data rows already detached remain valid row data. Repair only through reviewed targeted migration.

## SQL Draft

See `07-project-specific-unlink-components-plan.md` for the implementation sketch. It references only verified columns but still must be tested during implementation.
