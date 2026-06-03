# 07 Performance Scalability And Operational Plan

## Purpose

This document defines performance and operational expectations for bulk deletion/archive. The goal is predictable beta behavior, not unbounded admin-scale deletion.

## Preview Performance Strategy

- Use aggregate SQL counts in preview RPCs.
- Do not fetch dependent rows into server actions.
- Return only labels needed for confirmation: first N target names/codes plus counts.
- Use indexes listed in `03_data_dependency_and_schema_decisions.md`.
- Block or truncate UI label lists after 5 visible names; counts remain exact.

Expected preview targets:

- 50 projects with hundreds of estimates should preview within ordinary server-action timeout if indexes are present.
- 100 estimate sheets with thousands of rows should preview through aggregate counts.
- 500 component archive rows should preview through item ids and reference counts.

## Execution Performance Strategy

- Use one set-based execution RPC per action.
- Delete/update child tables through existing cascades where verified.
- Avoid explicit deletes for tables already guaranteed to cascade unless needed to count/return summary.
- Use `INSERT ... SELECT` for audit/state history rows.
- Keep storage cleanup outside the SQL transaction.

## Set-Based SQL Requirements

Required patterns:

```sql
delete from public.estimates
where project_id = target_project_id
  and id = any(eligible_estimate_ids);
```

```sql
update public.cost_library_items
set lifecycle_state = 'archived',
    lifecycle_state_changed_at = now(),
    updated_at = now()
where workspace_id = target_workspace_id
  and id = any(eligible_item_ids)
  and lifecycle_state <> 'archived';
```

Forbidden patterns:

- loops over selected ids in React;
- loops over selected ids in server actions;
- PL/pgSQL row-by-row deletion loops except for tiny metadata transformations where a set-based expression is impossible.

## Index Verification Checklist

Before writing migrations, verify active DB has:

- `projects_workspace_id_idx`
- `estimates_project_id_idx`
- `estimate_nodes_estimate_parent_sort_idx`
- `estimate_row_items_estimate_node_sort_idx`
- `estimate_sheet_events_estimate_created_idx`
- `estimate_sheet_versions_workspace_estimate_idx`
- `project_publications_project_status_idx`
- `project_favorites_project_id_idx`
- `estimate_favorites_estimate_id_idx`
- collaboration invitation/member indexes listed in `03`.
- shared-link indexes listed in `03`.

Likely add if missing:

- `estimate_row_items_source_library_item_id_idx`
- `estimate_template_row_items_source_library_item_id_idx`
- `cost_library_item_variant_attachments_item_idx`

## Batch-Size Rationale

| Batch | Max | Why |
|---|---:|---|
| Projects | 50 | Most expensive dependency graph and storage cleanup. |
| Estimates | 100 | Common cleanup case; cascades are indexed. |
| Component archive | 500 | Single state update plus history insert, no storage delete. |
| Component hard delete | 100 | Requires reference proof and storage cleanup. |

If users need larger cleanups later, build an admin background job. Do not expand caps casually.

## Storage Cleanup Chunking

- Chunk `storage.remove()` calls at 100 paths per bucket per call.
- Group cleanup by bucket.
- Use DB-derived path list only.
- Record failed paths and messages.
- Do not retry infinitely in the request.

## Large Dataset Expectations

Preview should remain fast because it counts via indexes. Execution may be slower for:

- projects with many estimates and Activity events;
- publications with many recipients/comments/events if project deletion is allowed after revocation;
- component hard delete with many attachments.

If execution exceeds normal server-action tolerances, the implementation must stop and introduce a background-job plan rather than increasing timeouts blindly.

## Timeout Risks

Risks:

- unindexed `source_library_item_id` reference scans;
- storage cleanup on many objects;
- deleting projects with large `estimate_sheet_events` history;
- route revalidation over too many per-project paths.

Mitigations:

- add indexes before hard-delete reference preview;
- keep hard-delete caps lower than archive caps;
- chunk storage cleanup;
- revalidate parent/list routes rather than every stale child route where route no longer exists.

## Concurrency Risks

| Risk | Strategy |
|---|---|
| Two destructive operations touch the same project graph. | one shared project-graph advisory transaction lock used by both project delete and estimate sheet delete. |
| User confirms preview while publication is created. | execution reruns preview and blocks. |
| Component archive while estimate insertion reads dataset. | archive is state update; insertion RPC/server action must reject archived source ids after Phase 4 filtering. |
| Estimate delete while row mutation is in flight. | database FK delete wins; row mutation returns not found/conflict and UI refreshes. |

## Locking Strategy

- Use `pg_advisory_xact_lock` for canonical project-graph and component-lifecycle locks.
- Use `SELECT ... FOR UPDATE` on target rows during execution after eligibility resolution.
- Do not lock entire workspace tables.
- Keep transaction short: no storage cleanup or route revalidation inside transaction.
- Project delete and estimate sheet delete must share the same project-id-derived lock family so they cannot overlap on the same project graph.
- Component archive and optional component hard delete may use a workspace-id-derived component lifecycle lock because they do not delete project/estimate rows.

## Monitoring And Logging Recommendations

Record in `mass_deletion_events`:

- preview count size;
- execution duration if easy to capture in server action;
- storage cleanup attempted/deleted/failed;
- blockers encountered.

Emit server logs for:

- `permission_denied` execute attempts;
- active publication blockers;
- storage cleanup failures;
- preview hash mismatch.

Avoid logging:

- tokens;
- password hashes;
- full snapshot JSON;
- attachment contents.

## Operational Recovery If Storage Cleanup Fails

1. User sees success with warning.
2. Audit event stores failed bucket/path/message.
3. Implementer may add later admin retry action if failures occur.
4. Manual cleanup can use audit event paths after verifying bucket/path allow-list.

Do not attempt to recreate deleted database rows because object deletion failed.

## Rollback Strategy During Implementation PRs

Phase rollback:

- Preview-only RPCs/actions can be reverted without data change.
- Execution RPC migrations must be additive and guarded behind UI not yet enabled until tests pass.
- UI phases should keep destructive controls disabled until backend is available.
- Component archive can be reversed by setting lifecycle state back from `archived`, but only through a deliberate future unarchive action.
- Hard delete is irreversible; keep Phase 6 separate.

## Suggested Beta Telemetry

No external telemetry is required for implementation. If internal app events are added, record only metadata:

- target type;
- selected count;
- preview blocked vs executed;
- storage cleanup failed count;
- duration bucket.

Do not record target names, tokens, raw snapshots, or comments in telemetry.
