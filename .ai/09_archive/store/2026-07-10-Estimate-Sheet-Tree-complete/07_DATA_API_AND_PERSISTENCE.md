# Data API And Persistence

## Server Action Contract

`reorderEstimateTreeNodes(projectId, estimateId, input)` accepts a list of `{ id, parentId, sortOrder }` updates and optional `targetTabId`.

Required contract:

- Reject empty updates.
- Reject duplicate update ids.
- Reject optimistic ids.
- Reject invalid sort orders.
- Enforce current workspace project and estimate ownership via `getCurrentWorkspaceProject` (`actions.ts:2187`).
- Enforce edit capability.
- Enforce same-estimate parent ownership.
- Enforce tab isolation for node and parent when both tab ids are present.
- **Include `target_project_id: project.id` in the D1/RPC payload so reorder history is scoped to the active project.** This is the RC0 fix; currently missing at `actions.ts:2252`.
- Enforce projected-tree cycle validation before any D1 write. This can live in the action before adapter call or inside the D1 adapter, but tests must prove the active D1 path rejects cycles (RC5 residual; Phase 3).
- Return refreshed tree for the target tab.

## Active D1 Reorder Contract

### Current (verified 2026-07-06)

- `reorderEstimateTreeNodes` creates a Cloudflare D1 action client at `actions.ts:2190` via `createEstimateActionsD1Client` (`d1-action-client.ts:969`).
- Its reorder payload (`actions.ts:2252-2257`) includes `target_estimate_id`, `move_updates`, `acting_user_id`, and `correlation_id`, but **omits `target_project_id`**. This is the root cause of the user-reported "Estimate history event workspace could not be resolved" error.
- The D1 reorder adapter `reorderEstimateNodes` (`d1-action-client.ts:1343-1361`) reads `args.target_project_id` (defaults to `""`), batch-updates `estimate_nodes` via `UPDATE estimate_nodes SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?`, and writes one history event via `insertHistoryEvent`.
- `insertHistoryEvent` (`d1-action-client.ts:435-502`) resolves `workspace_id` by:
  1. Idempotency check on `(estimate_id, correlation_id)` at line 436-447.
  2. If `input.workspaceId` is provided, skip the project lookup.
  3. Otherwise call `readProjectContext(database, input.projectId)` (line 406) which queries `SELECT id, workspace_id FROM projects WHERE id = ? LIMIT 1`.
  4. Use `input.workspaceId ?? project?.workspace_id`.
  5. If null, throw `"Estimate history event workspace could not be resolved."` (line 451).
- The D1 reorder adapter currently does not validate the projected tree before writing.

### Required implementation

1. **Phase 0 (RC0):** Add `target_project_id: project.id` to the reorder payload at `actions.ts:2252`.
2. Add action-wrapper tests proving:
   - Existing reorder RPC payload expectations now include `target_project_id` (T-RC0-1).
   - Nesting succeeds through the wrapper without the workspace-resolution error (T-RC0-3).
3. Add D1 adapter/local-provider tests proving:
   - History project scoping is non-null in the actual `estimate_sheet_events` row (T-RC0-2).
   - Missing, empty, or unknown `target_project_id` fails cleanly before history insert (T-RC0-4).
4. **Phase 3 (RC5 residual):** Add projected-tree validation for the active D1 path:
   - no self/cycle after applying updates;
   - every updated node and parent exists in the same estimate;
   - parent/node tab isolation is preserved;
   - duplicate impossible sibling state is rejected or normalized consistently with the persisted order contract.
5. Add readback proof that reordered branches render in `sort_order ASC, id ASC`.

## Mutation Surface Matrix

| Mutation | Current project-scope payload | Active D1 provider status | Plan requirement |
| --- | --- | --- | --- |
| Reorder nodes | Missing `target_project_id` today | Writes updates and history after Phase 0, but projected-tree validation is missing | Phase 0 payload fix plus Phase 3 validation proof |
| Rename node | Passes `target_project_id` | D1 adapter writes rename history | Preserve as baseline |
| Delete node | Passes `target_project_id` | D1 adapter deletes and writes history | Preserve as baseline |
| Bulk delete nodes | Passes `target_project_id` | D1 adapter deletes and writes history | Preserve as baseline |
| Restore deleted nodes | Passes `target_project_id` from wrapper | D1 adapter currently throws for restore | Prove D1 restore or label Undo provider gap |
| Template/project/row external drops | Dispatch domain events; not reorder RPCs | Separate insert/move action paths | Preserve inside-only semantics unless separately expanded |

## Readback Contract

- Repository query orders by `sort_order ASC, id ASC` (verified at `src/lib/repositories/workspace-repository.ts` — `buildEstimateTree`).
- UI must not apply kind-based display sorting.
- Tests should persist a branch reorder and read it back through the repository or action refresh path.

## Schema Reality (verified)

`estimate_sheet_events` (migration `0025_reusable_source_insert_support.sql:8-51`):

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | TEXT | PRIMARY KEY, `length(trim(id)) > 0` |
| `estimate_id` | TEXT | NOT NULL, FK → `estimates(id)` ON DELETE CASCADE |
| `workspace_id` | TEXT | NOT NULL, FK → `workspaces(id)` ON DELETE CASCADE |
| `project_id` | TEXT | NOT NULL |
| `estimate_node_id` | TEXT | nullable |
| `estimate_tab_id` | TEXT | nullable |
| `target_row_id` | TEXT | nullable |
| `event_type` | TEXT | NOT NULL, `length(trim(event_type)) > 0` |
| `event_source` | TEXT | NOT NULL, default `'server_action'` |
| `correlation_id` | TEXT | NOT NULL, `length(trim(correlation_id)) > 0` |
| `actor_user_id` | TEXT | nullable |
| `changed_fields` | TEXT | NOT NULL, `json_valid`, default `'[]'` |
| `row_context` | TEXT | NOT NULL, `json_valid` + object, default `'{}'` |
| `old_snapshot` | TEXT | nullable, `json_valid` if present |
| `new_snapshot` | TEXT | nullable, `json_valid` if present |
| `payload` | TEXT | NOT NULL, `json_valid` + object, default `'{}'` |
| `metadata` | TEXT | NOT NULL, `json_valid` + object, default `'{}'` |
| `total_delta` | REAL | nullable |
| `created_at` | TEXT | NOT NULL |

Composite FKs:
- `FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE`
- `FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE`

Indexes:
- `idx_estimate_sheet_events_correlation` UNIQUE on `(estimate_id, correlation_id)`
- `idx_estimate_sheet_events_project_created` on `(project_id, created_at DESC, id DESC)`
- `idx_estimate_sheet_events_workspace_project_created` on `(workspace_id, project_id, created_at DESC, id DESC)`
- `idx_estimate_sheet_events_estimate_created` on `(estimate_id, created_at DESC, id DESC)`

**Implication:** the NOT NULL `workspace_id` is enforced at the database layer. The application-layer guard at `d1-action-client.ts:451` is a defense-in-depth check that produces a cleaner error than the underlying FK violation would. Do not use a `workspace_id IS NULL` data audit as proof; the schema forbids such rows. Use payload/static audits and adapter tests for missing project scope.

## Migration Position

No D1 migration is planned for Phase 0. The schema already enforces the invariant; only the payload is broken.

If Phase 3 implementation discovers a missing database invariant (e.g. an index that would make cycle detection cheaper), create a separate migration plan and keep it inside active `migrations/`, not legacy Supabase migrations.

## Concurrency Model

The reorder action is currently **last-write-wins**. There is no version field, etag, or `updated_at` CAS check. Two users reordering the same tree concurrently will both succeed; the second overwrites the first. This is acceptable pre-first-user (single-user mode); a separate plan should address multi-user concurrency once collaboration is live (Durable Object broadcast already exists).

## D1 Query Cost Per Reorder

For a reorder of one node:
1. `requireAuth()` — Better Auth session read.
2. `getCurrentWorkspaceProject(projectId)` — 1 query (`SELECT ... FROM projects ...`).
3. `createEstimateActionsD1Client()` — bind initialization.
4. Estimate lookup (`dataStore.from("estimates").select(...).eq(...).maybeSingle()`) — 1 query.
5. `assertCanEditEstimate(...)` — typically 1 query.
6. `referencedNodeIds` lookup (`dataStore.from("estimate_nodes").select(...).in(...)`) — 1 query.
7. `requireCurrentUserContext()` — typically 1 query.
8. RPC `reorder_estimate_nodes_with_history` → `reorderEstimateNodes`:
   - `runBatch` of UPDATEs — 1 batch (n statements).
   - `insertHistoryEvent`:
     - Idempotency check — 1 query.
     - `readProjectContext` (after Phase 0) — 1 query.
     - INSERT — 1 query.
9. `refreshInsertedEstimateTree(...)` — typically 1-2 queries.

Total: ~8-10 D1 queries + n update statements for n moved nodes. This is acceptable for early use, but implementation must watch Cloudflare D1 limits for large branch moves, including per-query bound-parameter counts, Worker subrequest limits, query duration, and batch statement limits.

Cloudflare D1 docs checked on July 6, 2026:

- Prepared statements with `bind()` remain the required pattern for dynamic SQL and injection safety.
- `D1Database.batch()` executes statements sequentially and rolls back the sequence if one statement fails; verify local `runBatch` really maps to that API before claiming atomicity.
- Wrangler local D1 proof is not hosted/provider proof. Remote proof must use the bound `ARCH_DB` resource from `wrangler.jsonc` and must be labeled as remote.

Next.js docs checked on July 6, 2026:

- Server Functions are reachable via direct POST and must verify auth/authz inside the function.
- Do not add `revalidatePath`, `refresh()`, or route refresh as a reorder-settle reflex unless there is a specific stale RSC/cache claim. TanStack optimistic settle/readback is the primary proof for this plan.
