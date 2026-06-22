# Database Preflight, Migration, And RPC Specification

This document is the implementation-ready DB handoff. It narrows the broader
database contract in `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` into Phase 0
preflight artifacts, exact migration-review requirements, direct-write
prevention options, RPC algorithms, and fixture requirements.

No durable U4/U5 implementation may start until the Phase 0 preflight artifact
exists at `_evidence/phase-0/db-preflight.md`.

## Phase 0 DB Preflight Artifact

The implementer must capture:

- Supabase project ref: `ebxxqidacheyapmmzavr`.
- Current table columns for:
  - `public.cost_library_item_price_options`
  - `public.cost_library_item_variant_cost_entries`
  - `public.cost_library_item_variant_attachments`
  - any existing version/history tables used by Library costs or attachments
- Existing RLS policies and table grants for those tables.
- Existing function execute grants for Library cost/attachment actions.
- Results for SQL-001 through SQL-005 from `10`, plus SQL-006A and SQL-006B
  where applicable.
- Generated type impact: which Supabase type file changes, and whether any
  exported app types compile against the new enums/columns.
- Current attachment scope columns. The audit found existing attachment rows use
  `item_id`, `price_option_id`, and `workspace_id`; do not assume `variant_id`
  exists unless preflight proves it.
- Backup/recovery posture: no PITR/paid add-on assumption; record local reset,
  migration-test, and logical-dump or fix-forward plan appropriate for beta.

## Migration DDL Review Checklist

The migration file must be exact enough for review and must include:

| Area | Required detail |
| --- | --- |
| Enum creation | Idempotent guard or migration ordering that cannot fail on re-run in local reset. |
| Timeouts | `lock_timeout` and `statement_timeout` appropriate for additive beta migration. |
| Columns | `alter table` statements with names, types, defaults, nullability, and comments where helpful. |
| Checks | Lock/status consistency, supersede replacement requirement, current-approved attachment requirement. |
| Foreign keys | Names, delete behavior, and same-workspace validation path. |
| Partial unique indexes | One accepted/current cost per price option; one current approved attachment per actual attachment scope. |
| Event tables | Append-only cost and attachment event tables with actor, reason, metadata, and created-at. |
| RLS/grants | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and RPC execute rules, including private audit read policy. |
| Direct-write prevention | One chosen mechanism from the section below, not a comment-only intent. |
| Backfill | Existing current costs become `proposed`; existing attachments become `uploaded`; duplicates produce repair report or deterministic rule. |
| Type generation | Supabase generated types are refreshed and schema tests assert the new shape. |

## Attachment Scope Decision

Use the actual preflight schema:

- Default component attachment scope is `workspace_id + item_id`.
- Price-option-specific attachment scope adds `price_option_id` when present.
- Cost-entry-specific attachment scope adds `applicable_cost_entry_id` when
  present.
- Do not create an index on `variant_id` unless Phase 0 preflight proves the
  column exists and the plan is updated in the same patch.

Required uniqueness intent:

| Scope | Current-approved uniqueness |
| --- | --- |
| Component/item attachment | One `is_current_approved` row per `workspace_id, item_id` where `price_option_id is null` and `applicable_cost_entry_id is null`. |
| Price-option attachment | One `is_current_approved` row per `workspace_id, item_id, price_option_id` where `applicable_cost_entry_id is null`. |
| Cost-entry attachment | One `is_current_approved` row per `workspace_id, item_id, price_option_id, applicable_cost_entry_id`. |

## Direct-Write Prevention Decision

The default codebase-AI implementation decision is column-level revoke/grant for
added governance columns, append-only event tables with no ordinary
`UPDATE`/`DELETE` grants, and RPC/action writes for trust changes. Record this
choice in `_evidence/phase-0/db-preflight.md`.

If Phase 0 preflight proves the default cannot preserve existing draft editing
or grant behavior, pause durable U4/U5 work, record the reason in DB preflight,
and choose one alternate strategy before writing the migration:

| Strategy | When to choose | Required proof |
| --- | --- | --- |
| Column-level revoke/grant | Existing broad table update can be narrowed without breaking draft editing. | Member/editor can update non-governance draft fields but cannot update review fields. |
| Governance side tables | Existing table grants are too broad to safely narrow during beta. | Durable review state is only in RPC-owned governance tables; base table cannot be used to bypass it. |
| Trigger guard | Broad update must remain temporarily for compatibility. | Trigger rejects unauthorized review-field changes and tests cover direct table update attempts. |

Comment-only intent is not enough. SEC-6 and DB-002 fail unless direct table
mutation is actually blocked or review state is stored outside the broad grant.

Event tables are append-only for ordinary app roles. Tests must deny ordinary
`UPDATE` and `DELETE` attempts against cost and attachment review event tables.

## Private Governance Read Policy

Private audit prose includes:

- `review_note`
- `lock_reason`
- event `reason`
- event `metadata`
- attachment filenames and storage paths
- reviewer/assignee private identifiers where product has not approved display

Read policy:

| Caller | Status enum | Private audit prose | Raw storage/path/source fields |
| --- | --- | --- | --- |
| Workspace/platform admin | Allowed in private governance UI. | Allowed. | Allowed only where needed for private admin/debug UI; never public. |
| Workspace editor/member | Allowed if they can view the private Library item. | Denied by default for beta. | Denied except safe display labels. |
| Estimate-only collaborator | Allowed only if copied into private estimate source snapshot by existing access rules. | Denied. | Denied. |
| Public/proposal viewer | Denied by default. | Denied. | Denied. |

Required evidence: SQL/RLS tests prove admin allowed, member/editor denied for
private audit prose, and public/proposal serializers denied.

## RPC Transaction Algorithms

Every durable trust RPC/action follows this template:

1. Resolve caller and target row inside the transaction.
2. Verify workspace/project/estimate relation where applicable.
3. Verify authority: platform admin or workspace admin for durable governance.
4. Verify `expected_review_revision`.
5. Lock target rows in deterministic order.
6. Validate same-workspace and same-scope relationships.
7. Apply current-state column update.
8. Insert append-only event.
9. Increment `review_revision`.
10. Return a redacted payload with IDs/status/revision only.

RPC-specific rules:

| RPC/action | Extra required steps |
| --- | --- |
| `assign_cost_library_cost_refresh` | Assignee must be a member of the same workspace; assignment event records assignee ID only in private metadata. |
| `accept_cost_library_cost_entry` | Mark competing accepted/current entry superseded or reject with conflict according to migration rule; partial unique index protects race. |
| `lock_cost_library_cost_entry` | Target must already be accepted; lock fields/event set atomically. |
| `unlock_cost_library_cost_entry` | Target must be accepted and locked; event records unlock reason privately. |
| `reject_cost_library_cost_entry` | Reject cannot leave required accepted cost empty if the product policy requires one; otherwise warning state remains visible. |
| `supersede_cost_library_cost_entry` | Replacement must share workspace and price option; old accepted/current remains until replacement succeeds. |
| `approve_cost_library_attachment` | Attachment path, bucket, MIME, workspace, scope, and optional cost entry validated before current-approved switch. |
| `reject_cost_library_attachment` | Rejected file remains auditable if persisted. |
| `supersede_cost_library_attachment` | Replacement must share workspace and actual attachment scope; old storage object is not deleted. |

Failure rule: failed accept/approve/supersede leaves the previous
accepted/current/approved row unchanged.

## Required Fixtures

DB/RPC tests must create or seed:

- Workspace admin and platform admin allowed actors.
- Workspace editor/member denied actor.
- Workspace viewer denied actor.
- Non-member/foreign workspace denied actor.
- Cost option with two candidate current entries.
- Duplicate accepted race scenario.
- Stale `review_revision` replay.
- Cross-workspace cost entry and attachment.
- Attachment with bad bucket/path.
- Attachment with bad MIME and one valid approved file.
- Old approved attachment supersede race.
- Public/proposal snapshot input containing nested private metadata.

## SQL-006A And SQL-006B Query-Plan Probes

Add provider/local Postgres probes before claiming large-dataset readiness.
Adapt exact table, join, aggregate, filter, RPC, and cursor names to the
implemented query, but preserve the claim being proven.

```sql
-- SQL-006A: sidebar lite query must use scoped indexes and batched row shape
explain (analyze, buffers, format json)
select id
from public.cost_library_items
where workspace_id = '<workspace-id>'
order by updated_at desc
limit 100;
```

```sql
-- SQL-006B: governance queue query must use scoped review indexes when U4 ships
-- Replace with the implemented queue query/RPC, including review status,
-- assignee, due date, updated-time, and conflict filters where applicable.
explain (analyze, buffers, format json)
select id
from public.cost_library_item_variant_cost_entries
where workspace_id = '<workspace-id>'
  and review_status in ('needs_review', 'proposed')
order by review_due_at nulls last, updated_at desc
limit 100;
```

Evidence must record whether the implemented queries use workspace-scoped
indexes, avoid unbounded scans and sorts at the registered fixture size, avoid
N+1 row loading, and stay within the query-count, payload, and timing budgets in
`11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md`. An id-only probe does not satisfy
SQL-006A for the real sidebar lite row shape.
