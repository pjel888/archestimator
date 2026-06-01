# Project-Specific / Unlink Components Plan

## Third-Pass Schema-Accurate Decision

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. The plan below is constrained by current local migrations and generated types. No linked Supabase query was run in this pass, so production schema readiness remains a P0 proof gate.

Final language:

- A project-specific component is an `estimate_row_items` row, not a reusable `cost_library_items` record.
- `unlinked` means a row was never backed by a real source library UUID or is a manual/blank row with `source_library_item_id = null`.
- `detached` means a row was previously linked to a real library item and has been intentionally severed for project-specific editing while preserving `source_snapshot` provenance.
- `linked-overridden` means a linked row has local scalar overrides but is still traceable to its source library item.
- Do not persist fallback/static IDs such as `lib-sofa` into `source_library_item_id`.

Required contract for `UNLINK-001`:

| Layer | Current fact | Required implementation |
| --- | --- | --- |
| Schema | `estimate_row_items` has `source_library_item_id`, `source_snapshot`, `metadata`, `link_state`, `row_revision`. | Use existing columns; add migration only for missing metadata constraints/indexes after linked verification. |
| RPC | Insert/update/replace/delete RPCs are revision-aware and emit `estimate_sheet_events`. | Add a dedicated revision-aware unlink/detach RPC or prove existing update RPC can safely set `link_state='detached'` and emit history. |
| Server action | Existing actions set linked/manual states during insert/update/replace. | Add `detachEstimateRowItemFromLibrary` or equivalent; never direct-write table outside RPC. |
| Hook | `useEstimateRowMutations` has no unlink mutation. | Add queued mutation using `row_revision` conflict handling and cache reconciliation. |
| UI | Row details distinguishes library/manual but not launch-grade detached copy. | Add explicit "Project-specific" state, source snapshot summary, and confirm copy explaining library remains unchanged. |
| History | `estimate_sheet_events` can store row snapshots/payload. | Event type/payload must include previous source ID, previous link state, new link state, and reason/user action. |
| Public/share | Publication DTOs must avoid leaking raw metadata. | Share page may show user-safe project-specific label, not internal snapshot JSON. |

**VERIFIED CONTRACT — checked against current local schema/types:** valid columns are `source_library_item_id`, `source_snapshot`, `metadata`, `link_state`, and `row_revision`; valid enum includes `detached`.

Tests required: RPC revision conflict, action mapping, hook cache update, UI label/confirm, library unchanged assertion, publication metadata redaction, migration rollback. Manual QA: insert library row, detach it, edit cost/description, confirm source library item remains unchanged and Activity records detach.

This document replaces the first-pass unlink plan. The first-pass SQL was schema-invalid and must not be reused.

## Current State Evidence

| Area | Evidence |
| --- | --- |
| Row table uses `node_id`. | `src/lib/supabase/types.ts:1127`; migration `20260518090000_archestimator_core_schema.sql:96`. |
| No `area_node_id` exists. | Repo search found no `area_node_id` in `src/`, `supabase/`, `tests/`, or `e2e/`. |
| `estimates.workspace_id` does not exist. | `src/lib/supabase/types.ts:1609`; workspace is on `projects.workspace_id` at `types.ts:2432`. |
| Resolver joins estimate to project. | `20260524033151_estimate_sheet_version_control.sql:77`. |
| Event columns are fixed. | `src/lib/supabase/types.ts:1241`; `20260524033151_estimate_sheet_version_control.sql:11`. |
| Event type is text, not enum. | `20260524033151_estimate_sheet_version_control.sql:17`. |
| Row mutation RPCs exist. | Generated RPC types at `src/lib/supabase/types.ts:2595` to `:2630`. |
| Server actions exist for insert/update/replace/delete. | `src/lib/estimates/actions.ts:1677`, `:1745`, `:1771`, `:1808`. |
| Hook exists for insert/update/replace/delete, not unlink. | `src/hooks/use-estimate-row-mutations.ts:114`. |
| UI uses row buttons/modal, not a generic row action menu. | `EstimateSheetContent.tsx:889`, `EstimateSheetContent.tsx:2504`. |

## Final Data Decisions

| Link state | Meaning for MVP |
| --- | --- |
| `detached` | Project-specific row that was previously linked and is now explicitly unlinked. |
| `unlinked` | Manual row that was never linked to a library item. |
| `linked-clean` | Linked to library and unchanged locally. |
| `linked-overridden` | Linked with local scalar overrides. |
| `source-changed` | Future/dormant unless already set by existing data. Do not introduce new behavior in MVP. |

Metadata decision:

- Preserve `source_snapshot` as the frozen original source/provenance snapshot.
- Store unlink metadata in `estimate_row_items.metadata` and history event `payload`/`metadata`.
- Do not append unlink metadata to `source_snapshot`.

## Final RPC Contract

Preferred function name:

`unlink_estimate_row_item_from_library_with_history`

Inputs follow existing convention:

```sql
-- VERIFIED CONTRACT - argument names/types match current RPC style and generated-type conventions.
target_project_id uuid,
target_estimate_id uuid,
target_row_id uuid,
expected_row_revision integer,
acting_user_id uuid default null,
correlation_id uuid default gen_random_uuid(),
reason text default null
```

Required behavior:

1. Resolve workspace through existing `resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id)`.
2. Lock target row with `FOR UPDATE`.
3. Require row belongs to `target_estimate_id`.
4. Require `row_revision = expected_row_revision`; raise the same conflict shape/convention as existing row RPCs.
5. Require `source_library_item_id is not null` or return current row as no-op only if product explicitly chooses idempotent unlink. Default: raise invalid operation.
6. Update `estimate_row_items` only:
   - `source_library_item_id = null`
   - `link_state = 'detached'`
   - `metadata = coalesced existing metadata merged with detached metadata`
   - `row_revision = row_revision + 1`
   - Preserve `source_snapshot`.
7. Do not mutate `cost_library_items`.
8. Insert one valid `estimate_sheet_events` row using actual columns:
   - `workspace_id`
   - `estimate_id`
   - `estimate_node_id`
   - `target_row_id`
   - `event_type = 'row_unlinked'`
   - `event_source = 'user'`
   - `correlation_id`
   - `actor_user_id`
   - `row_context`
   - `old_snapshot`
   - `new_snapshot`
   - `changed_fields`
   - `total_delta = 0`
   - `payload`
   - `metadata`
9. Return the canonical row JSON shape expected by current actions.

No enum migration is required for event type because `event_type` is text. A migration is required to add the RPC function and grants.

## SQL Draft

```sql
-- IMPLEMENTATION SKETCH - schema columns verified, full PL/pgSQL must be tested during implementation.
create or replace function public.unlink_estimate_row_item_from_library_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  expected_row_revision integer,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid(),
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_record record;
  old_row record;
  new_row record;
  old_snapshot jsonb;
  new_snapshot jsonb;
  next_metadata jsonb;
begin
  workspace_record := resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);

  select *
    into old_row
    from public.estimate_row_items
   where id = target_row_id
     and estimate_id = target_estimate_id
   for update;

  if not found then
    raise exception 'estimate row item not found';
  end if;

  if old_row.row_revision is distinct from expected_row_revision then
    raise exception 'estimate row item revision conflict';
  end if;

  if old_row.source_library_item_id is null then
    raise exception 'estimate row item is not linked to a library item';
  end if;

  old_snapshot := to_jsonb(old_row);
  next_metadata := coalesce(old_row.metadata, '{}'::jsonb) || jsonb_build_object(
    'detachedAt', timezone('utc', now()),
    'detachedFromSourceLibraryItemId', old_row.source_library_item_id,
    'detachedReason', nullif(reason, '')
  );

  update public.estimate_row_items
     set source_library_item_id = null,
         link_state = 'detached',
         metadata = next_metadata,
         row_revision = old_row.row_revision + 1
   where id = target_row_id
   returning * into new_row;

  new_snapshot := to_jsonb(new_row);

  insert into public.estimate_sheet_events (
    workspace_id,
    estimate_id,
    estimate_node_id,
    target_row_id,
    event_type,
    event_source,
    correlation_id,
    actor_user_id,
    row_context,
    old_snapshot,
    new_snapshot,
    changed_fields,
    total_delta,
    payload,
    metadata
  )
  values (
    workspace_record.workspace_id,
    target_estimate_id,
    new_row.node_id,
    new_row.id,
    'row_unlinked',
    'user',
    correlation_id,
    acting_user_id,
    jsonb_build_object('nodeId', new_row.node_id),
    old_snapshot,
    new_snapshot,
    array['source_library_item_id', 'link_state', 'metadata'],
    0,
    jsonb_build_object('reason', reason),
    jsonb_build_object('detachedFromSourceLibraryItemId', old_row.source_library_item_id)
  );

  return new_snapshot;
end;
$$;
```

## Server Action Contract

```ts
// IMPLEMENTATION SKETCH - match action error/refresh conventions during coding.
export async function unlinkEstimateRowItemFromLibrary(input: {
  projectId: string;
  estimateId: string;
  rowId: string;
  expectedRowRevision: number;
  reason?: string;
}): Promise<{ row: EstimateRowItem }>;
```

Action rules:

- Use current Supabase server client and user context conventions.
- Pass `acting_user_id` consistently with existing actions.
- Pass a generated `correlation_id`.
- Map returned row to current `EstimateRowItem` plus new link-state fields required by UI.
- Revalidate the same estimate/workshop paths as update/replace/delete actions.

## Hook Contract

Add to `useEstimateRowMutations`:

```ts
// IMPLEMENTATION SKETCH
unlinkRowComponent: (input: {
  rowId: string;
  expectedRowRevision: number;
  reason?: string;
}) => Promise<void>
```

Hook rules:

- Use same operation identity/queue model as insert/update/replace/delete.
- Use cached row revision from `getCachedRowRevision`.
- Optimistically patch row to `detached` only after mutation starts, rollback on failure.
- Surface revision conflict as user-readable "Row changed elsewhere. Refresh and try again."

## UI Contract

| Element | Location | Behavior |
| --- | --- | --- |
| Link-state badge | Row component cell and row details modal. | `Linked`, `Overridden`, `Project-specific`, `Manual` labels mapped from link state. |
| Unlink action | Existing component details/row details controls, not invented context menu. | Visible only for `linked-clean` and `linked-overridden`. |
| Confirmation modal | Existing modal/dialog style. | Copy: "Make this row project-specific? It will stop following library updates. Current values stay in this estimate." |
| Detached field editor | Row details component tab. | Enable editable supplier/brand/pricing/source notes only for `detached`/`unlinked`; linked states remain protected or routed through replacement. |
| Disabled states | No source library id, pending mutation, revision conflict. | Disable action and explain reason. |

## Tests

| Test | File | Assertions |
| --- | --- | --- |
| RPC schema | new migration test | Uses `node_id`; inserts event with real columns; no `area_node_id`/invalid event columns. |
| RPC behavior | SQL/action test | `source_library_item_id` null, `link_state='detached'`, `source_snapshot` preserved, metadata merged, revision increments. |
| Conflict | action test | stale `expected_row_revision` rejects and leaves row unchanged. |
| Hook | `use-estimate-row-mutations` test | queued mutation, optimistic patch, rollback on error. |
| UI | `EstimateSheetContent` DOM test | badge text, confirmation, disabled states, success/error copy. |
| History | activity/history test | `row_unlinked` event appears with old/new snapshots and target row id. |

## Migration Plan

1. Create migration containing function and grants.
2. Run linked apply with exact file only after local tests.
3. Regenerate Supabase types.
4. Add action/hook/UI.
5. Run targeted row tests and full command baseline.

## Rollback

- UI rollback: hide unlink action and badges.
- App rollback: stop calling new action/hook.
- DB rollback: drop `unlink_estimate_row_item_from_library_with_history` function if needed.
- Data rollback: no table rollback needed; detached rows are normal rows. If a bad unlink occurred, relink manually by setting `source_library_item_id`, `link_state`, and `row_revision` through a reviewed repair migration.

## Edge Cases

- Row already unlinked: reject by default.
- Row is `linked-overridden`: allow detach and preserve current scalar overrides.
- Row has JSON null `source_snapshot`: preserve as-is and rely on metadata.
- User lacks workspace editor access: resolver/RLS rejects.
- Row revision conflict: reject.
- Concurrent replace/delete: reject through row lock/revision.

## Acceptance Criteria

- No schema-invalid SQL remains in this package.
- Unlink does not mutate `cost_library_items`.
- Source snapshot remains frozen.
- Unlink metadata lives in `metadata` and history event metadata/payload.
- Row revision increments exactly once.
- Valid `estimate_sheet_events` row is written.
- UI matches actual row buttons/modal surface.
