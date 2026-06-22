# Database, Migration, And RPC Readiness

This file closes the database ambiguity flagged during review. It defines the
canonical state model, source snapshot schema, migration triggers, SQL probes,
RLS/RPC boundaries, and fix-forward posture for durable trust governance.
`15-DATABASE-PREFLIGHT-MIGRATION-RPC-SPEC.md` is the required Phase 0 handoff
before any durable U4/U5 migration starts.

## Existing Primitives To Preserve

| Primitive | Current use | Planning rule |
| --- | --- | --- |
| Estimate insert/replace RPCs | Write row items with history and expected row revision. | Keep server-authoritative target and revision checks; do not bypass history RPCs. |
| `source_snapshot` | Frozen row source facts. | Expand only through versioned schema and redaction-safe projection rules. |
| Cost price options and current cost entries | Existing current/active cost concept. | Do not treat "current" as "reviewed accepted" without explicit status. |
| Version/history tables | Existing audit foundation. | Prefer append-only events for review history if fields are insufficient. |
| Variant/item attachments | Store file metadata and private storage path. | Verify actual scope columns in Phase 0; do not assume `variant_id` exists. Add review lifecycle only through durable fields/events when needed. |
| RLS/grants | Workspace member policies exist for several Library tables. | Durable trust-changing actions require stricter action/RPC boundaries. |

## Canonical Cost State Decision

`accepted` is the lifecycle state. `locked` is not a peer lifecycle state; it is a
modifier on an accepted state. This removes the prior ambiguity where
`accepted` and `locked` could be interpreted as competing states.

| Concept | Canonical representation | Rule |
| --- | --- | --- |
| Proposed cost | `review_status = 'proposed'` or equivalent app-layer state. | Entered/imported but not trusted for silent reuse. |
| Needs review | `review_status = 'needs_review'`. | Stale/conflicting/missing evidence. |
| Accepted cost | `review_status = 'accepted'`. | Chosen current reviewed cost for reuse. |
| Locked accepted cost | `review_status = 'accepted'` plus `locked_at`/lock event. | Cannot change without a new review/unlock event. |
| Rejected cost | `review_status = 'rejected'`. | Reviewed and not used. |
| Superseded cost | `review_status = 'superseded'` plus replacement reference when available. | Replaced by newer cost entry; remains auditable. |

Implementation may begin with app-layer state only if the state is transient and
not persisted as audited truth. Because this plan requires accepted/current
governance, assigned stale-cost refresh, and auditable attachment review, the
default durable implementation is the additive migration shape below.

## Attachment State Decision

| Concept | Canonical representation | Rule |
| --- | --- | --- |
| Uploaded draft | `review_status = 'uploaded'` or draft-only app state. | Can be cleaned up if not persisted/approved and path is owned. |
| Approved current file | `review_status = 'approved'` plus current scope marker. | At most one current approved file per actual item/price-option/cost-entry scope when the product requires uniqueness. |
| Rejected file | `review_status = 'rejected'`. | Retained for audit if persisted. |
| Superseded file | `review_status = 'superseded'` plus replacement relation when available. | Older approved file remains visible in audit history and is not deleted by approval. |

## Source Snapshot Schema V1

When implementation expands estimate row snapshots, use a versioned object. The
private row snapshot may contain fields that the public projection excludes.

| Key | Required? | Meaning | Public projection |
| --- | --- | --- | --- |
| `schemaVersion` | Yes | `1` for this contract. | Allowed only as internal metadata if already exposed nowhere public. |
| `sourceType` | Yes | `library`, `project`, `template`, `detached`, or `express`. | Safe enum may be allowed if product copy needs it. |
| `sourceLibraryItemId` | When Library source | Library item ID. | Excluded. |
| `sourceProjectId` | When Project source | Project source scope. | Excluded. |
| `priceOptionId` | When price option exists | Price option used for cost. | Excluded. |
| `costEntryId` | When cost entry exists | Cost entry used for decision. | Excluded. |
| `pricingDate` | When available | Date used for freshness. | Allowed only by explicit public copy decision. |
| `pricingFreshnessTier` | Yes | `current`, `stale`, `very_stale`, or `missing`. | Excluded by default. |
| `lifecycleState` | Yes | Source lifecycle at insertion/replacement time. | Excluded by default. |
| `linkState` | Yes | Relationship between row and source snapshot. | Excluded by default. |
| `acceptedCostStatus` | When cost exists | Review state at decision time. | Excluded. |
| `costLocked` | When cost exists | Boolean snapshot of lock state. | Excluded. |
| `reviewedAt` | Optional | Cost or attachment review timestamp if durable. | Excluded. |
| `safeSourceLabel` | Optional | Derived non-sensitive label. | Allowed only if explicitly classified public-safe. |

Raw `sourceUrl`, storage paths, filenames, confidence prose, and reviewer notes
are excluded from public projection even if present in a private row snapshot.

## Migration Decision Matrix

| Need | Existing schema fit | Decision gate | Migration path | Verification |
| --- | --- | --- | --- | --- |
| Display stale/current derived from pricing date | Fits existing data. | No migration when derived only. | App-layer helper/test. | `library-source-trust.test.ts`. |
| Persist accepted cost across reloads | Current boolean is insufficient for reviewed trust. | Migration required by this plan. | Add `review_status` fields to cost entries plus append-only review events and partial uniqueness for accepted current. | SQL-001, schema test, RLS/RPC test. |
| Lock accepted cost | No safe existing durable field. | Migration required by this plan. | Add `locked_at`, `locked_by`, `lock_reason`; lock only when `review_status = 'accepted'`. | Schema test plus unauthorized update denial. |
| Assign stale-cost refresh | Existing metadata only if transient. | Migration required by this plan. | Add `assigned_to`, `review_due_at`, and assignment review event. | Assignment reload test. |
| Attachment approval | Existing rows can store file metadata, not durable approval. | Migration required by this plan. | Add attachment `review_status`, current-approved fields, supersede relation, and append-only attachment events. | SQL-003 plus attachment lifecycle test. |
| Source snapshot v1 | Existing JSON can hold object. | Migration not required for JSON shape; generated types/tests required if typed fields change. | Add schemaVersion and projection helpers. | Snapshot schema/redaction tests. |
| Trust-changing authz | Broad member policies are too loose for durable governance. | RPC/action boundary required when durable trust state changes. | SECURITY DEFINER or server action with strict checks; narrow grants if table columns added. | RLS/RPC denial tests. |

## Phase 0 DB Preflight Gate

Before implementing the durable migration shape, fill
`_evidence/phase-0/db-preflight.md` using
`15-DATABASE-PREFLIGHT-MIGRATION-RPC-SPEC.md`. The preflight must prove:

- project ref is `ebxxqidacheyapmmzavr`;
- current columns, RLS policies, grants, and function grants are known;
- attachment scope columns are known;
- SQL-001 through SQL-005 are captured or explicitly blocked, plus SQL-006A
  and SQL-006B where applicable;
- generated-type impact is understood;
- direct-write prevention strategy is selected;
- no PITR/paid add-on assumption is introduced.

## Chosen Additive Migration Shape

This is the implementation contract. Do not choose between columns and events
during coding; implement both the current-state columns and append-only events so
the UI can query current state cheaply while audit history remains durable.

### Cost Governance Schema

Create enum:

```sql
create type public.cost_library_cost_review_status as enum (
  'proposed',
  'needs_review',
  'accepted',
  'rejected',
  'superseded'
);

create type public.cost_library_cost_review_event_type as enum (
  'proposed',
  'marked_needs_review',
  'assigned',
  'accepted',
  'locked',
  'unlocked',
  'rejected',
  'superseded'
);
```

Add columns to `public.cost_library_item_variant_cost_entries`:

| Column | Type | Rule |
| --- | --- | --- |
| `review_status` | `public.cost_library_cost_review_status not null default 'proposed'` | Current review state. |
| `reviewed_by` | `uuid references auth.users(id) on delete set null` | Required when status becomes accepted/rejected/superseded after migration. |
| `reviewed_at` | `timestamptz` | Required when status becomes accepted/rejected/superseded after migration. |
| `review_note` | `text` | Private audit note; excluded from public/telemetry surfaces. |
| `assigned_to` | `uuid references auth.users(id) on delete set null` | Same-workspace assignee only; validated by RPC/action. |
| `review_due_at` | `timestamptz` | Optional stale-refresh due date. |
| `locked_by` | `uuid references auth.users(id) on delete set null` | Set only when accepted cost is locked. |
| `locked_at` | `timestamptz` | Set only when accepted cost is locked. |
| `lock_reason` | `text` | Private audit note; excluded from public/telemetry surfaces. |
| `superseded_by` | `uuid references public.cost_library_item_variant_cost_entries(id) on delete set null` | Same price option/workspace replacement, validated by RPC/action. |
| `review_revision` | `integer not null default 1` | Optimistic concurrency token for governance RPCs. |

Add constraints/indexes:

- Check `locked_at is null and locked_by is null` unless `review_status = 'accepted'`.
- Check `locked_at is null` iff `locked_by is null`.
- Check `review_status <> 'superseded' or superseded_by is not null`.
- Partial unique index `cost_entries_one_accepted_current_per_option` on
  `(price_option_id)` where `deleted_at is null and is_current and review_status = 'accepted'`.
- Index `(workspace_id, review_status, review_due_at)` for stale-review queues.

The migration must include lock/statement timeout settings, idempotent enum
ordering, named constraints/indexes, and a duplicate repair report or
deterministic repair rule if SQL-001/SQL-002 find existing conflicts.

Create append-only table `public.cost_library_cost_review_events`:

| Column | Type | Rule |
| --- | --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` | Event ID. |
| `workspace_id` | `uuid not null` | Must match cost entry workspace. |
| `price_option_id` | `uuid not null` | Price option scope. |
| `cost_entry_id` | `uuid not null references public.cost_library_item_variant_cost_entries(id)` | Reviewed cost entry. |
| `event_type` | `public.cost_library_cost_review_event_type not null` | Governance event. |
| `actor_id` | `uuid not null references auth.users(id)` | Actor. |
| `from_status` | `public.cost_library_cost_review_status` | Prior state. |
| `to_status` | `public.cost_library_cost_review_status` | New state. |
| `reason` | `text` | Private audit text; never public/telemetry. |
| `metadata` | `jsonb not null default '{}'::jsonb` | Safe internal metadata only. |
| `created_at` | `timestamptz not null default now()` | Event time. |

### Attachment Governance Schema

Create enum:

```sql
create type public.cost_library_attachment_review_status as enum (
  'uploaded',
  'approved',
  'rejected',
  'superseded'
);

create type public.cost_library_attachment_review_event_type as enum (
  'uploaded',
  'approved',
  'rejected',
  'superseded',
  'download_url_issued'
);
```

Add columns to `public.cost_library_item_variant_attachments` after preflight
confirms the actual scope columns:

| Column | Type | Rule |
| --- | --- | --- |
| `review_status` | `public.cost_library_attachment_review_status not null default 'uploaded'` | Current attachment state. |
| `applicable_cost_entry_id` | `uuid references public.cost_library_item_variant_cost_entries(id) on delete set null` | Optional cost-entry scope. |
| `is_current_approved` | `boolean not null default false` | True only for the current approved file in its scope. |
| `reviewed_by` | `uuid references auth.users(id) on delete set null` | Required when approved/rejected/superseded after migration. |
| `reviewed_at` | `timestamptz` | Required when approved/rejected/superseded after migration. |
| `review_note` | `text` | Private audit note; excluded from public/telemetry. |
| `superseded_by` | `uuid references public.cost_library_item_variant_attachments(id) on delete set null` | Replacement attachment in same workspace/variant scope. |
| `review_revision` | `integer not null default 1` | Optimistic concurrency token for governance RPCs. |

Add constraints/indexes:

- Check `is_current_approved is false or review_status = 'approved'`.
- Check `review_status <> 'superseded' or superseded_by is not null`.
- Partial unique index for one current approved attachment per
  `(workspace_id, item_id)` when `price_option_id is null` and
  `applicable_cost_entry_id is null`.
- Partial unique index for one current approved attachment per
  `(workspace_id, item_id, price_option_id)` when `price_option_id is not null`
  and `applicable_cost_entry_id is null`.
- Partial unique index for one current approved attachment per
  `(workspace_id, item_id, price_option_id, applicable_cost_entry_id)` when
  `applicable_cost_entry_id is not null`.
- If `price_option_id` can be null in the cost-entry-specific scope after
  preflight, the uniqueness design must use `NULLS NOT DISTINCT`, an expression
  index, or a non-null invariant. A standard unique index over nullable scope
  columns is not sufficient.
- Index `(workspace_id, review_status, reviewed_at)`.

Create append-only table `public.cost_library_attachment_review_events` with
the same event shape as cost review events, using `attachment_id`,
actual item/price-option scope, optional `applicable_cost_entry_id`, event type,
actor, reason, metadata, and timestamp. Do not reference `variant_id` unless DB
preflight proves the column exists and this plan is updated in the same change.

### Required RPC Names

Durable trust changes must go through these server actions or RPCs. If server
actions wrap the database write directly, they must enforce the same checks and
transactionality.

| RPC/action | Purpose |
| --- | --- |
| `public.assign_cost_library_cost_refresh(target_cost_entry_id uuid, assignee_id uuid, target_review_due_at timestamptz, expected_review_revision integer, reason text default null)` | Assign stale-cost refresh. |
| `public.accept_cost_library_cost_entry(target_cost_entry_id uuid, expected_review_revision integer, reason text default null)` | Mark one cost entry accepted/current. |
| `public.lock_cost_library_cost_entry(target_cost_entry_id uuid, expected_review_revision integer, reason text default null)` | Lock an accepted cost. |
| `public.unlock_cost_library_cost_entry(target_cost_entry_id uuid, expected_review_revision integer, reason text default null)` | Unlock accepted cost for new review. |
| `public.reject_cost_library_cost_entry(target_cost_entry_id uuid, expected_review_revision integer, reason text default null)` | Reject a cost entry. |
| `public.supersede_cost_library_cost_entry(target_cost_entry_id uuid, replacement_cost_entry_id uuid, expected_review_revision integer, reason text default null)` | Supersede an old cost entry with a same-option/workspace replacement. |
| `public.approve_cost_library_attachment(target_attachment_id uuid, expected_review_revision integer, target_applicable_cost_entry_id uuid default null, reason text default null)` | Approve and optionally mark current attachment. |
| `public.reject_cost_library_attachment(target_attachment_id uuid, expected_review_revision integer, reason text default null)` | Reject attachment. |
| `public.supersede_cost_library_attachment(target_attachment_id uuid, replacement_attachment_id uuid, expected_review_revision integer, reason text default null)` | Supersede attachment without deleting either object. |

### RLS, Grants, And Backfill

- Existing direct table policies may continue to allow draft cost/attachment
  creation where current Library editing already allows it, but review-state
  mutation must be blocked except through the governance RPC/action path.
- Direct-write prevention must use the default concrete mechanism in `17`:
  column-level revoke/grant for added governance columns, append-only event
  tables with no ordinary `UPDATE`/`DELETE` grants, and RPC/action writes for
  trust changes. If Phase 0 preflight proves that cannot fit the existing grant
  model, the alternate mechanism from `15` must be recorded in `db-preflight.md`
  before migration. Comment-only intent fails SEC-6.
- Governance RPCs allow only `public.is_platform_admin()` or
  `public.is_workspace_admin(workspace_id)`. Workspace members/editors and
  estimate-only collaborators are denied.
- Private audit prose (`review_note`, `lock_reason`, event `reason`, event
  `metadata`) is readable only to platform/workspace admins for beta. Workspace
  editors/members may see status enums when authorized for private Library
  detail, but not private audit prose unless a later role plan changes this.
- Revoke broad `PUBLIC`/`anon` execute grants and grant execute only to
  `authenticated` when the function itself performs strict caller checks.
- Backfill existing current non-deleted cost entries as `proposed`, not
  `accepted`, unless a deterministic reviewed source exists. This avoids
  pretending old active costs were reviewed.
- Backfill existing attachments as `uploaded`, not `approved`, unless a
  deterministic reviewed source exists.
- Generated Supabase types must be refreshed after the migration and
  `tests/vitest/component-library-versioning-schema.test.ts` must assert the new
  enums, columns, partial unique indexes, grants, and RPC hardening.
- Event tables must be proven append-only for ordinary app roles. Tests must
  deny non-RPC `UPDATE` and `DELETE` attempts against cost and attachment review
  events.
- `reviewed_by` and `reviewed_at` requirements for accepted, rejected,
  superseded, approved, and rejected durable states must have a concrete DB or
  RPC enforcement path; UI-only convention is not enough.

## Migration Required / Not Required Rules

No migration is allowed only when all are true:

- State is transient UI/reducer state.
- State is not shown as audited truth.
- State is not used for permission, locking, or insert/replace decisions.
- State is not required after reload.
- State is not written into estimate source snapshots.

Migration is required when any are true:

- Accepted, lock-modified accepted, rejected, or superseded state must survive reloads.
- Reviewer, assignee, review date, lock reason, or approval state is user-visible.
- Insert/replace decisions depend on accepted status.
- Attachment approval history must be auditable.
- Public/proposal redaction depends on new fields.
- Multiple agents/features need to query the state consistently.

RPC/action boundary is required when an operation changes durable trust state:
accept, lock, unlock, reject, supersede, assign refresh, approve attachment, or
supersede attachment.

## RPC Hardening Contract

If a durable trust-changing operation uses a database RPC, especially a
`SECURITY DEFINER` function, it must satisfy this contract before the migration
or action is accepted:

| Control | Required behavior |
| --- | --- |
| Search path | Function sets a fixed `search_path` and does not rely on caller search path. |
| Qualification | Public table, function, and type references are schema-qualified. |
| Execute grants | Revoke broad `PUBLIC` execution; grant only the app roles that should call the function. |
| Direct table writes | Trust-state columns/tables cannot be mutated by ordinary broad member table grants after RPC ownership is introduced. |
| Caller checks | Function or server action verifies workspace, project/estimate visibility, source ownership, and reviewer/curator authority. |
| Transactionality | Accept/lock/approve/supersede operations are atomic and preserve the prior accepted/current row on failure. |
| Tests | Include unauthorized RPC call denial, direct table mutation denial, private read denial, duplicate accepted/current conflict, atomic rollback, and stale/replayed request denial. |

## Preflight SQL Probes

These probes must return zero rows before a governance migration that depends on
the corresponding invariant.

```sql
-- SQL-001: current cost invariant
select price_option_id, count(*)
from public.cost_library_item_variant_cost_entries
where is_current and deleted_at is null
group by price_option_id
having count(*) > 1;
```

```sql
-- SQL-002: active cost entry must be same option/workspace and not deleted
select option_row.id, option_row.workspace_id, option_row.active_cost_entry_id
from public.cost_library_item_price_options option_row
left join public.cost_library_item_variant_cost_entries entry
  on entry.id = option_row.active_cost_entry_id
where option_row.active_cost_entry_id is not null
  and (
    entry.id is null
    or entry.price_option_id <> option_row.id
    or entry.workspace_id <> option_row.workspace_id
    or entry.deleted_at is not null
  );
```

```sql
-- SQL-003: attachment rows must point at owned component attachment paths
select id, workspace_id, storage_bucket, storage_path
from public.cost_library_item_variant_attachments
where storage_bucket <> 'component-attachments'
   or storage_path !~ '^[0-9a-f-]+/[0-9a-f-]+/';
```

```sql
-- SQL-004: grant audit for governance tables
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'cost_library_item_price_options',
    'cost_library_item_variant_cost_entries',
    'cost_library_item_variant_attachments'
  )
order by table_name, grantee, privilege_type;
```

```sql
-- SQL-005: function execute grants for governance RPCs
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and (
    routine_name like '%cost%review%'
    or routine_name like '%attachment%review%'
    or routine_name like 'accept_cost_library_%'
    or routine_name like 'lock_cost_library_%'
    or routine_name like 'unlock_cost_library_%'
    or routine_name like 'reject_cost_library_%'
    or routine_name like 'supersede_cost_library_%'
    or routine_name like 'approve_cost_library_%'
  )
order by routine_schema, routine_name, grantee;
```

When SQL-005 is adapted to the actual function names, it must prove no broad
`PUBLIC` execute grant exists for durable trust-changing RPCs.

```sql
-- SQL-006A: large sidebar lite query-plan proof
-- Adapt table/filter/join/aggregate names to the implemented query or RPC, but
-- preserve the workspace-scoped limit/cursor and batched row-shape claim.
explain (analyze, buffers, format json)
select id
from public.cost_library_items
where workspace_id = '<workspace-id>'
order by updated_at desc
limit 100;
```

SQL-006A must show the implemented sidebar lite query path uses scoped indexes,
avoids N+1 row loading, and avoids an unbounded sequential scan at the
registered large-fixture size.

When U4 governance queues ship, add SQL-006B for the implemented queue query/RPC.
It must cover review status, assignee, due date, updated-time, and conflict
filters where applicable, and it must avoid unbounded scans or sorts over all
workspace rows.

## Required DB/RPC Tests

| ID | Test | Pass condition |
| --- | --- | --- |
| DB-001 | Governance schema test | Accepted, lock-modified accepted, rejected, and superseded state cannot create two active accepted costs for the same scope. |
| DB-002 | RLS/RPC denial test | Viewer/member without trust authority cannot accept, lock, approve, reject, or supersede. |
| DB-003 | Source snapshot test | Insert/replace freezes cost-entry ID and accepted status at decision time. |
| DB-004 | Redaction projection test | Source URLs, attachment paths, filenames, and confidence prose never enter public snapshots. |
| DB-005 | Rollback atomicity test | Failed accept/approve/replace leaves previous current/approved row unchanged. |
| DB-006 | Attachment supersede test | Approving a new file marks the old one superseded without deleting storage/audit rows. |
| DB-007 | RPC hardening test | Durable trust RPCs have fixed search path, narrow execute grants, strict caller checks, and unauthorized/direct-table denial coverage. |
| DB-008 | Permission mapping test | `member`/editor is denied for accept/lock/approve/supersede; workspace owner/admin and platform admin are allowed. |
| DB-009 | Private read policy test | Workspace member/editor cannot read private audit prose; workspace/platform admin can. |
| DB-010 | RPC transaction algorithm test | Accept/lock/reject/supersede/approve paths verify revision, lock rows deterministically, insert events, and preserve prior state on failure. |

## Fix-Forward Rules

| Situation | Required response |
| --- | --- |
| Migration applied and UI must be disabled | Hide/disable UI path, preserve new data, and document re-enable condition. |
| Backfill finds duplicates | Do not auto-pick a winner without product rule; create repair report or deterministic migration only if rule is in this pack. |
| Trust RPC fails mid-operation | Transaction rolls back; previous accepted/current/approved row remains unchanged. |
| Public redaction failure after migration | Fail closed by excluding new fields from projection and telemetry first, then repair UI copy. |
| Rollback requested after data writes | Prefer fix-forward and UI disable; no destructive column drops or audit-row deletion in beta without owner decision. |
