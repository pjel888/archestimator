# 03 Data Model Versioning Plan

> Historical context notice: this document contains the pre-pivot named-version, compare, and restore-as-copy architecture. Read it as historical context only. The supported current UX is sheet `Activity` plus row details `Version History`; named-version UI/RPC exposure requires a future proposal/export snapshot plan or explicit destructive-cleanup scope.

## Recommended Model

Use two related concepts:

1. `estimate_sheet_events` for append-only row/sheet activity.
2. `estimate_sheet_versions` for named full-sheet snapshots.

Do not collapse autosave events, named versions, duplicate sheets, proposal snapshots, and component-library versions into one table. `.ai/06_specs/project-estimate-versioning-system.md:47-123` explicitly separates those layers.

## Proposed Tables

### `estimate_sheet_events`

Purpose: append-only event log for row and sheet changes.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `project_id uuid not null references public.projects(id) on delete cascade`
- `estimate_id uuid not null references public.estimates(id) on delete cascade`
- `target_node_id uuid references public.estimate_nodes(id) on delete set null`
- `target_row_id uuid references public.estimate_row_items(id) on delete set null`
- `event_type text not null`
- `summary text not null default ''`
- `row_context jsonb not null default '{}'::jsonb`
- `old_snapshot jsonb`
- `new_snapshot jsonb`
- `changed_fields text[] not null default '{}'::text[]`
- `event_source text not null default 'user' check (event_source in ('user', 'system', 'backfill', 'template', 'restore', 'import', 'api'))`
- `correlation_id uuid`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`

`target_row_id` should use `on delete set null`. `row_context` must store compact row identity/material/source data for deleted rows, while `old_snapshot` / `new_snapshot` should store only the changed fields or compact before/after source summaries for replacement/delete events. Do not store the full row `source_snapshot` JSONB in every event. Full `source_snapshot` belongs in named-version snapshots and restore-as-copy payloads. The AI audit migration already uses this workspace-safe reference pattern for `target_row_id` (`supabase/migrations/20260523144932_ai_audit_foundation.sql:48`, `:152`, `:224`).

### `estimate_sheet_versions`

Purpose: user-visible named versions and future export anchors.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `project_id uuid not null references public.projects(id) on delete cascade`
- `estimate_id uuid not null references public.estimates(id) on delete cascade`
- `version_number integer not null check (version_number > 0)`
- `label text not null`
- `description text not null default ''`
- `snapshot jsonb not null`
- `total_amount numeric(14, 2) not null default 0`
- `row_count integer not null default 0 check (row_count >= 0)`
- `event_count integer not null default 0 check (event_count >= 0)`
- `created_from_event_id uuid references public.estimate_sheet_events(id) on delete set null`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`
- unique `(estimate_id, version_number)`

The `snapshot` should contain canonical estimate metadata, nodes, rows, source snapshots, category/supplier ids, row metadata, discipline, designation, link state, unit/quantity/unit cost/misc cost, and computed totals.

Named-version creation should also update `estimates.metadata` with a compatibility pointer for existing readers:

```json
{
  "versionNumber": 2,
  "versionLabel": "V2",
  "latestEstimateSheetVersionId": "<estimate_sheet_versions.id>"
}
```

This reconciles new named versions with existing `readEstimateVersionLabel()` / `readVersionLabel()` readers, which currently look at `estimate.metadata` for proposal preview/export version labels. The implementation should also update those readers to prefer `versionLabel` when present.

## Indexes

The migration should define concrete read-path indexes before UI work starts:

```sql
create index estimate_sheet_events_sheet_timeline_idx
  on public.estimate_sheet_events (workspace_id, estimate_id, created_at desc, id desc);

create index estimate_sheet_events_row_history_idx
  on public.estimate_sheet_events (workspace_id, estimate_id, target_row_id, created_at desc, id desc)
  where target_row_id is not null;

create index estimate_sheet_events_correlation_idx
  on public.estimate_sheet_events (workspace_id, estimate_id, correlation_id, created_at desc, id desc)
  where correlation_id is not null;

create index estimate_sheet_versions_estimate_version_idx
  on public.estimate_sheet_versions (workspace_id, estimate_id, version_number desc);

create unique index estimate_sheet_versions_estimate_version_number_key
  on public.estimate_sheet_versions (estimate_id, version_number);
```

The row-history index is intentionally workspace-scoped and partial so deleted-row sheet history can still paginate by sheet timeline while live row history remains fast.

The correlation index supports both grouped activity display and idempotent retry detection inside history-aware RPCs.

History read queries should be cursor paginated:

- sheet history: `(workspace_id, estimate_id, created_at desc, id desc) limit 50`;
- next page cursor: `created_at < cursor.created_at or (created_at = cursor.created_at and id < cursor.id)`;
- row history: same cursor, plus `target_row_id = row_id` or snapshot identity fallback for deleted rows.

## Event Types

First-slice event types:

- `row_added`
- `row_blank_added`
- `row_replaced`
- `row_quantity_changed`
- `row_misc_cost_changed`
- `row_deleted`
- `template_inserted`
- `node_created`
- `node_renamed`
- `node_deleted`
- `node_deleted_with_children`
- `tree_reordered`
- `estimate_metadata_changed`
- `sheet_code_regenerated`
- `sheet_named_version_created`
- `sheet_restored_as_copy`
- `baseline_backfilled`

`row_link_state_changed` is not required as a standalone v1 event if `link_state` is included in `changed_fields` and old/new row snapshots for quantity, misc cost, replacement, and refresh events.

The row-history UI can filter `estimate_sheet_events` by `target_row_id` or row snapshot identity. Sheet history reads by `estimate_id`.

## Write Boundaries

History writes must happen through server actions backed by SQL RPC transactions after ownership validation:

- `insertEstimateRowItemFromLibrary()`
- `replaceEstimateRowItemWithLibrary()`
- `updateEstimateRowItem()`
- `deleteEstimateRowItem()`
- `insertEstimateTemplateIntoEstimate()`
- `createEstimateNode()`, `renameEstimateNode()`, `deleteEstimateNode()`
- `reorderEstimateTreeNodes()`
- `updateEstimateDetails()`
- `regenerateEstimateSheetCode()`

Any mutation that writes current estimate rows and history must use a single SQL RPC or equivalent transaction boundary. Do not rely on a client follow-up write or two independent Supabase calls to record history. This mirrors the implemented component-library versioning migration, where RPCs lock the current item row `for update`, write history/version rows, and return a normalized payload in one transaction (`supabase/migrations/20260523120957_component_library_item_versioning.sql:352`, `:617`, `:707`, `:928`).

Required transaction rules:

- validate workspace/project/estimate access before mutation;
- lock the target estimate row or parent estimate with `for update` before computing old snapshots or next version numbers;
- check idempotency before mutation by looking for an existing event with the same `(estimate_id, correlation_id)` under the estimate lock;
- collect compact `row_context` and changed-field `old_snapshot` before mutation;
- perform the row/node/version mutation;
- insert the matching `estimate_sheet_events` row in the same transaction;
- return canonical row/version/event ids only after all writes succeed;
- raise exceptions for missing target, ownership failure, invalid payload, version conflict, and event validation failure;
- never catch a failed event insert and still report a successful row mutation.

For `row_deleted`, the RPC must snapshot the row, insert `estimate_sheet_events`, and delete the row in that order inside one transaction.

For `deleteEstimateNode()`, the RPC/action boundary must account for cascade semantics from `planEstimateTreeDelete()`: either insert one `node_deleted_with_children` event with deleted node ids and affected row summaries, or insert one node event plus N `row_deleted` child-row events under the same `correlation_id`.

For `reorderEstimateTreeNodes()`, record a `tree_reordered` event with old/new parent ids and sort orders for each moved node. The snapshot will preserve final structure, but the event log still needs a human-readable "tree reordered" milestone.

For `updateEstimateDetails()` and `regenerateEstimateSheetCode()`, record `estimate_metadata_changed` / `sheet_code_regenerated` events. These are sheet-level events and should not appear in row history unless the row details panel is showing the full sheet timeline.

Existing RPC composition:

- `reorderEstimateTreeNodes()` currently calls `public.reorder_estimate_nodes`.
- `insertEstimateTemplateIntoEstimate()` currently calls `public.insert_estimate_template_into_estimate`.

History cannot be appended in the server action after either RPC returns, because that would create split success.

V1 signature strategy: add wrapper RPCs and migrate server actions to the wrappers.

- Add `reorder_estimate_nodes_with_history` and `insert_estimate_template_into_estimate_with_history`.
- Wrapper RPCs should snapshot relevant before state, call the existing RPC operation inside the same SQL transaction, snapshot relevant after state, then insert events before returning.
- Keep the existing RPC names/signatures available for rollback compatibility in v1.
- Static and server-action tests must prove history-enabled server actions call the wrappers, not the original RPCs.
- New history-aware RPC contracts must include `target_project_id`, `acting_user_id uuid default null`, and optional `correlation_id uuid default gen_random_uuid()`.
- Update grants for the new/changed RPC signatures.
- Regenerate Supabase types after the migration so server action payloads match the new RPC contracts.
- A later cleanup migration may deprecate or revoke the old RPC grants only after all callers are proven migrated.

`correlation_id` and idempotency usage:

- generated by the client/hook for user-initiated row mutations where retry safety matters, then passed through the server action into the RPC;
- generated server-side only for actions that cannot be retried by the browser or are internally initiated;
- reused for multi-event actions such as template insert, node delete cascades, and restore-as-copy;
- checked at the start of each history-aware RPC after locking the estimate row. If any event already exists for the same `(estimate_id, correlation_id)`, the RPC must return a duplicate/no-op result or the current canonical state without writing another mutation/event;
- not globally unique across estimates.

The current `useEstimateRowMutations()` hook already maintains per-row operation ids for optimistic reconciliation. Implementation should add a stable UUID request id per mutation and pass it as `correlation_id`; the existing numeric operation id remains client-only ordering state.

## Current Row Concurrency Guardrail

Add an explicit optimistic-concurrency column to current rows:

```sql
alter table public.estimate_row_items
  add column row_revision integer not null default 1 check (row_revision > 0);
```

The migration should add a trigger or RPC-owned update rule that increments `row_revision` on every current-row update. History-aware row update, replace, and delete RPCs should accept `expected_row_revision integer`. Under the row lock, the RPC must compare the expected revision to the current revision before mutating:

- match: apply mutation, increment `row_revision`, write event, return canonical row and new revision;
- mismatch: raise a typed `estimate_row_conflict` / `row_revision_conflict` exception, do not mutate the row, and do not write a success event.

This rejects silent last-write-wins for same-row edits in v1. The UI should rollback/refetch through the existing optimistic error path and may later show a conflict-specific message. `updated_at` remains useful for display/cache invalidation, but it is not precise enough as the only compare-and-swap key.

Actor/user attribution:

- Existing server actions often resolve `requireCurrentUserContext().userId`.
- RPCs should accept `acting_user_id uuid default null`, not assume `auth.uid()` is always populated.
- Inside SQL, resolve `current_user_id := coalesce(auth.uid(), acting_user_id)`.
- Server actions should pass the resolved user id for writes that create `created_by` / `created_by`-like event fields, especially in dev-auth/admin-DB paths where `auth.uid()` may be unavailable.
- Workspace membership checks inside security-definer RPCs must use the resolved user id, not only `auth.uid()`.

### Required RPC Shapes

The exact SQL can evolve during implementation, but the migration must expose these transaction shapes before UI wiring:

```sql
create or replace function public.replace_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  replacement_payload jsonb,
  expected_row_revision integer,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
-- validate workspace membership
-- resolve current_user_id := coalesce(auth.uid(), acting_user_id)
-- select target estimate and current row for update
-- if correlation_id already exists for this estimate, return duplicate/no-op canonical state
-- compare expected_row_revision to current row_revision; raise conflict on mismatch
-- build compact row_context and changed-field old_snapshot
-- update estimate_row_items with replacement snapshot
-- build changed-field new_snapshot
-- insert row_replaced event
-- return jsonb_build_object('row', ..., 'event_id', ...)
$$;
```

```sql
create or replace function public.update_estimate_row_item_values_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  row_patch jsonb,
  expected_row_revision integer,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
-- validate workspace membership
-- resolve current_user_id := coalesce(auth.uid(), acting_user_id)
-- select target estimate and current row for update
-- if correlation_id already exists for this estimate, return duplicate/no-op canonical state
-- compare expected_row_revision to current row_revision; raise conflict on mismatch
-- build compact row_context and changed-field old_snapshot
-- apply quantity/misc/unit-cost fields only when changed
-- increment row_revision
-- build changed-field new_snapshot
-- insert row_quantity_changed and/or row_misc_cost_changed event
-- include link_state in changed_fields when linked-clean becomes linked-overridden
-- return jsonb_build_object('row', ..., 'event_id', ...)
$$;
```

```sql
create or replace function public.create_estimate_sheet_version(
  target_project_id uuid,
  target_estimate_id uuid,
  version_label text,
  version_description text default '',
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
-- validate workspace membership
-- resolve current_user_id := coalesce(auth.uid(), acting_user_id)
-- select estimate for update
-- compute next version_number under lock
-- build full snapshot
-- insert sheet_named_version_created event
-- insert estimate_sheet_versions with created_from_event_id
-- return version metadata and event id
$$;
```

Additional RPCs should follow the same shape for row insert, row delete, template insertion, and restore-as-copy.

Minimum additional signatures:

```sql
create or replace function public.delete_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_row_id uuid,
  expected_row_revision integer,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb;
```

```sql
create or replace function public.reorder_estimate_nodes_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  move_updates jsonb,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb;
```

```sql
create or replace function public.insert_estimate_template_into_estimate_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb;
```

Row mutation RPC return payloads must include the canonical row fields required by the sheet cache plus `row_revision`. Wrapper RPC return payloads must include enough canonical ids/counts for the existing server actions to revalidate and for tests to assert the event ids/correlation id.

Server actions remain responsible for cache invalidation. RPCs cannot call Next.js `revalidatePath()`. Each server action should call the appropriate existing revalidation paths only after the RPC returns successfully.

## RLS and Grants

Mirror the existing workspace-member policies for `estimates`, `estimate_nodes`, and `estimate_row_items`:

- members can select sheet events/versions in their workspace;
- insert should be limited to authenticated users who can access the target estimate;
- updates/deletes should not be granted for append-only event rows;
- named versions may allow update only for a narrow editable note/label state before an implementation-defined lock, or simply use insert-only for v1.

If these tables are exposed through Supabase Data API, enable RLS and explicit grants. Regenerate `src/lib/supabase/types.ts` after migration.

## Canonical Snapshot Format

Store version snapshots as flat, restorable data, not only as a rendered tree projection:

```ts
type EstimateSheetVersionSnapshot = {
  schemaVersion: "2026-05-24.estimate-sheet-version-control.v1";
  capturedAt: string;
  estimate: {
    id: string;
    projectId: string;
    name: string;
    sheetCode: string;
    currencyCode: string;
    metadata: Json;
  };
  totals: {
    rowCount: number;
    totalAmount: number;
  };
  nodes: EstimateSheetVersionNodeSnapshot[];
  rows: EstimateSheetVersionRowSnapshot[];
};
```

Node snapshots:

```ts
type EstimateSheetVersionNodeSnapshot = {
  id: string;
  parentId: string | null;
  kind: "group" | "area";
  name: string;
  sortOrder: number;
  metadata: Json;
};
```

Row snapshots:

```ts
type EstimateSheetVersionRowSnapshot = {
  id: string;
  nodeId: string;
  categoryNodeId: string | null;
  supplierId: string | null;
  sourceLibraryItemId: string | null;
  sourceSnapshot: Json | null;
  metadata: Json;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  unitCost: number;
  miscCost: number;
  sortOrder: number;
  discipline: string;
  designation: string;
  linkState: "linked-clean" | "linked-overridden" | "unlinked";
};
```

`sourceSnapshot` must stay compatible with the existing `getSourceSnapshot()` contract in `src/lib/estimates/actions.ts`, including `categoryNodeId`, `categoryPath`, `componentVersionId`, `componentVersionNumber`, `priceOptionId`, `priceOptionLabel`, `supplierId`, `sourceLibraryItemId`, `lifecycleState`, `tags`, `taxonomyVersion`, unit cost, misc cost, and currency.

`metadata` must stay compatible with the existing `getEstimateRowMetadata()` contract, including `categoryNodeId`, `categoryPath`, `supplierId`, `sourceComponentId`, `componentVersionId`, `componentVersionNumber`, `priceOptionId`, and `tags`.

Snapshot schema evolution:

- keep `schemaVersion` required;
- readers must tolerate missing fields from older snapshots and use explicit defaults, not assume current table columns always exist in historic JSON;
- restore-as-copy should support the current v1 snapshot schema before any future v2 schema is introduced;
- adding a new restorable row column later requires a snapshot reader migration note and a defaulting rule before that column is required by restore.

## Snapshot Builder

Create one server-side snapshot builder that serializes the estimate sheet consistently. It should reuse the same domain math as `buildEstimateTree()` where possible and avoid relying on UI-only state. The snapshot should be stable enough for:

- named versions;
- compare summaries;
- restore-as-copy;
- future export/proposal snapshot references.

The builder may use `buildEstimateTree()` to compute totals and compare groupings, but the stored snapshot must keep flat `nodes` and `rows` arrays so restore-as-copy can remap UUIDs deterministically.

Storage guardrail: store full snapshots for named versions only, not for every row event. A 200-row estimate snapshot may reasonably land in the hundreds of KB to low MB range depending on source snapshots and metadata. Implementation should measure representative `pg_column_size(snapshot)` values and fail a focused test or readiness gate if a normal 200-row snapshot exceeds 2 MB. Anything above 5 MB requires a design review before remote apply.

## Event Volume And Storage Budget

V1 event payloads must be changed-fields-first, not full-row-snapshot-first.

Order-of-magnitude model for a busy 200-row estimate:

- 3 committed scalar edits per row per week = 600 scalar events/week.
- Scalar event target payload: 0.75-1.5 KB because it stores `row_context`, `changed_fields`, and changed old/new values only.
- Estimated scalar event payload growth: about 0.45-0.9 MB/week before index/table overhead.
- 20 row replacements/week at 2-6 KB compact source summaries = about 40-120 KB/week.
- 4 named versions/month at 0.5-2 MB each = about 2-8 MB/month in version snapshots.

These are planning estimates, not proof. Implementation must measure:

- `pg_column_size(row_context)`;
- `pg_column_size(old_snapshot)`;
- `pg_column_size(new_snapshot)`;
- `pg_column_size(snapshot)` for named versions.

Guardrails:

- P95 scalar row event payload should stay under 2 KB.
- P95 replacement/delete event payload should stay under 8 KB.
- Any single event payload above 32 KB requires implementation review before remote apply.
- Full row `source_snapshot` should target 16 KB or less per row and should block broad rollout above 32 KB unless a design review accepts the payload.
- Representative 200-row named-version snapshot should stay under 2 MB; above 5 MB requires design review.
- Average named-version snapshot density should target 10 KB or less per row.
- One committed row save should create at most one row event. If quantity and Misc Cost are committed together, combine them into one event with both fields in `changed_fields`.
- Template insert and node-delete cascades should write one bulk event by default. Per-row child events are allowed only when affected rows are 50 or fewer. Above 50 affected rows, store one bulk event with compact affected-row summaries capped at 100 row summaries plus counts.

Retention decision remains "no deletion/suppression in v1", but it is conditional on these measurements. Revisit archive/compaction before broad rollout if either threshold is crossed:

- one workspace exceeds 250 MB combined `estimate_sheet_events` plus `estimate_sheet_versions` storage;
- one estimate exceeds 10,000 events.

If measured event payloads exceed the guardrails, do not ship broad scalar edit history until the event shape is reduced.

## Restore-As-Copy Mapping

Restore-as-copy should mirror `duplicateEstimateSheet()` in `src/lib/estimates/actions.ts`:

1. Create a new estimate with a new `sheet_code` from the same sheet-code generator.
2. Copy estimate currency and metadata, then update metadata to reflect the restored source version.
3. Create `nodeIdBySourceId`.
4. Insert nodes parent-first with fresh UUIDs and remapped `parent_id`.
5. Insert rows with fresh UUIDs and remapped `node_id`.
6. Copy `category_node_id`, `supplier_id`, `source_library_item_id`, `source_snapshot`, `metadata`, `discipline`, `designation`, and `link_state`.
7. Insert `sheet_restored_as_copy` on the new estimate using the same `correlation_id`.

Do not restore from the tree projection alone. The flat rows/nodes snapshot is the source of truth for UUID remapping.

## Backfill

Do not build full snapshots for every existing estimate inside the all-or-nothing schema migration.

The schema migration should create:

- tables;
- indexes;
- RLS/grants;
- helper functions/RPCs;
- idempotent backfill function or script entrypoint.

Backfill itself should run as a separate re-entrant data step after schema apply, through a CLI/script or explicitly invoked SQL helper that can batch and resume.

Preflight before backfill:

- count estimates;
- count total rows;
- estimate projected baseline snapshot bytes from a representative sample using `pg_column_size`;
- decide inline helper call vs batched backfill.

Inline backfill is allowed only if existing estimates are 100 or fewer, total rows are 20,000 or fewer, and projected baseline snapshot storage is 200 MB or less. Otherwise use batched backfill.

Batched defaults:

- 50 estimates or 10,000 rows per batch, whichever comes first;
- `lock_timeout = '5s'`;
- `statement_timeout = '120s'`;
- post-run report: estimate count, row count, baseline versions inserted, skipped estimates, total `pg_column_size(snapshot)`, max snapshot bytes.

Backfill should create one baseline version per existing estimate with:

- `version_number = 1`;
- label `Initial baseline`;
- a full snapshot from current estimate rows/nodes;
- an optional `sheet_named_version_created` or `baseline_backfilled` event.

Do not generate fake detailed row event history for changes that happened before the feature existed.

Backfill order:

1. Create schema and helper functions.
2. Run backfill in estimate batches ordered by `created_at, id`.
3. Build one canonical snapshot per estimate in the batch.
4. Insert an optional `baseline_backfilled` event for each estimate.
5. Insert `estimate_sheet_versions.version_number = 1` with `created_from_event_id` pointing to the baseline event when present.
6. Include estimates with zero rows; their snapshot should contain empty `nodes`/`rows`, `row_count = 0`, and `total_amount = 0`.
7. Use idempotent `where not exists` guards so re-running the backfill does not duplicate baseline versions.
8. Record progress counts in the closeout evidence.
9. Run `set constraints all immediate;` before RLS-sensitive schema transitions, matching the component-library versioning migration's deferred-constraint cleanup pattern (`supabase/migrations/20260523120957_component_library_item_versioning.sql:1159`).

## Reversion and Repair Strategy

Supabase migrations are forward-applied in this project. Before remote apply, create a documented forward-repair path rather than relying on an untested destructive rollback:

- non-destructive disable path: hide UI, revoke execute on new RPCs, leave event/version data intact;
- repair path: re-run idempotent helper grants/policies/backfill checks if remote migration history needs correction;
- destructive rollback path for pre-production only: revoke grants, drop policies, drop RPCs/helpers, drop child references, drop `estimate_sheet_versions`, drop `estimate_sheet_events`, then drop any new types/functions.

Do not drop event/version data from a linked remote project unless the user explicitly requests that destructive cleanup.
