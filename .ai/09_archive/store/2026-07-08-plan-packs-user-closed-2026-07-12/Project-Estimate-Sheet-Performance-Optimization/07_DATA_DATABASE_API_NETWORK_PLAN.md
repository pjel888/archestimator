# 07 - Data, Database, API, And Network Plan

## Current D1 Reads

Dominant route/tab tree reads:

- Nodes:
  - `WHERE estimate_id = ?`
  - optional `AND estimate_tab_id = ?`
  - optional `AND id IN (...)`
  - optional `AND parent_id IN (...)`
  - `ORDER BY sort_order ASC, id ASC`

- Rows:
  - `WHERE estimate_id = ?`
  - `AND node_id IS NOT NULL`
  - optional `AND node_id IN (...)`
  - `ORDER BY sort_order ASC, id ASC`

Current ceiling risk:
- `readEstimateTabTreePayloadForResolvedTabId` passes the complete limited node-id list into one `readEstimateRows` call.
- At the supported 1,500-node ceiling, the resulting `node_id IN (...)` shape can carry up to 1,500 node-id binds in one statement, plus the estimate and optional limit binds.
- `UNIT-001` must freeze the exact statement and bind-count fixtures. `UNIT-003` must prove the active D1 bind ceiling without product edits; if the current shape exceeds it, `UNIT-005` implements deterministic chunking/replacement with row-deduplication and limit semantics preserved.

## Index Candidate Hypotheses

Do not apply these until proof confirms:

- `estimate_nodes(estimate_id, estimate_tab_id, sort_order, id)`
- `estimate_nodes(estimate_id, estimate_tab_id, parent_id, sort_order, id)`
- `estimate_row_items(estimate_id, node_id, sort_order, id)`
- partial row index for active/non-deleted rows only if an active/deleted predicate exists or is added.

## Required D1 Proof Before Index Migration

For each candidate query:
- Capture SQL shape.
- Capture bind count and compare it with the active D1 ceiling for small, limit, and over-limit fixtures.
- Capture current `EXPLAIN QUERY PLAN`.
- Capture current `rows_read`, `rows_written`, and p95 duration.
- Apply index in temporary/local proof database.
- Run `PRAGMA optimize` after schema/index changes.
- Capture after `EXPLAIN QUERY PLAN`, `rows_read`, `rows_written`, and p95 duration.
- Compare write cost for row update/insert/delete paths.

## Route Fast Path Plan

Current:
- `readEstimateNodeRouteContextD1FastPath` returns `null`.

Future:
- Implement only after the D1 proof establishes exact query and index shape.
- Inputs:
  - project id
  - route segment that may be node id or tab route identifier
  - load limits
- Output:
  - workspace/project/estimate context
  - selected tab
  - selected node id
  - capped active tab tree
  - tabs summary
  - edit capability if cheap or already joined safely
  - load-limit state
- Must fail closed on unauthorized IDs.

## Query Key Plan

Current keys are estimate/tab scoped. Future keys need loaded-window dimensions:

```ts
estimateQueryKeys.tabTree(estimateId, tabId)
estimateQueryKeys.subtree(estimateId, tabId, nodeId, { depth, rowLimit, nodeLimit })
estimateQueryKeys.rowWindow(estimateId, tabId, nodeId, { cursor, limit, sort, filters })
estimateQueryKeys.search(estimateId, tabId, { query, filters, scopeNodeId })
```

Rules:
- Every fetch-changing variable must be in the key.
- Keys remain serializable.
- Query data remains JSON-compatible to preserve TanStack structural sharing.
- Client graph state is derived from query payloads but not conflated with transport freshness.

Current revision gap:
- `useEstimateAreaTreeQuery` and `useEstimateTabTreeQuery` increment the sibling revision key only through their `setTree` and `restore` helpers.
- Row mutation paths also write the same query data directly with `queryClient.setQueryData`; those writes do not advance the sibling revision.
- `UNIT-001` must characterize concurrent optimistic/server writes and stale rollback/reconciliation. `UNIT-009` must make every accepted cache mutation participate in one monotonic client revision contract; `UNIT-006` may move that contract into the normalized graph store when activated.

## Network Plan

Initial route:
- Fetch only active tab summary/tree within caps.
- Keep component library lazy.
- Stream meaningful loading state.

Expansion:
- Fetch subtree by node id.
- Deduplicate in-flight subtree requests.
- Coalesce sibling expansion bursts when feasible.
- Merge into graph state.

Mutations:
- Optimistic update graph immediately.
- Server action confirms and returns revision/affected data.
- Invalidate narrow subtree/window keys, not full estimate unless necessary.
- Project-component server fan-out currently filters identity through `json_extract` over `source_snapshot_json`/`metadata_json`, then creates one revisioned update statement per matching sibling and sends those statements as a D1 batch. `UNIT-003` measures JSON-filter rows read, match count, statement count, batch size, and duration; the path is not presumed O(1).

Search:
- Phase 1 loaded-tree search only.
- Phase 2 optional server-assisted search with explicit product decision and query budget.

## API/Action Boundaries

Do not weaken authorization:
- Server actions remain the write boundary.
- Client graph is a convenience cache only.
- Edit capability remains UX gating, not authority.
- D1 repository authorization checks remain source of truth.

## Client Projection Boundaries

- `EstimateWorkspaceClient` seeds the same nested tree into the left tree and center sheet. Both panes subscribe to the active query and build separate projections.
- The center pane also passes the full mutable tree to the memoized component-library sidebar, so a tree identity change can wake its large derivation block.
- Full-tree move-target options are currently derived even when the move dialog is closed.
- `UNIT-001` owns render/derivation counters for these boundaries. Selector/graph isolation belongs to `UNIT-006`-`UNIT-008`; on-demand move-option derivation belongs to `UNIT-007` when activated.

## Provider Constraints

- Stay inside `wrangler.jsonc` Cloudflare resources only.
- No paid Cloudflare add-ons without owner approval.
- Active schema authority is `migrations/`. `supabase/migrations/` is provider-exit archaeology only: do not execute, extend, or cite it as the current schema contract.
- Hosted D1 proof is allowed only with explicit env gates and sanitized output.
