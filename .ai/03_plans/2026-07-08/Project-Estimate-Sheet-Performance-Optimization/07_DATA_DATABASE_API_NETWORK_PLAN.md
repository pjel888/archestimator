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

## Index Candidate Hypotheses

Do not apply these until proof confirms:

- `estimate_nodes(estimate_id, estimate_tab_id, sort_order, id)`
- `estimate_nodes(estimate_id, estimate_tab_id, parent_id, sort_order, id)`
- `estimate_row_items(estimate_id, node_id, sort_order, id)`
- partial row index for active/non-deleted rows only if an active/deleted predicate exists or is added.

## Required D1 Proof Before Index Migration

For each candidate query:
- Capture SQL shape.
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

Search:
- Phase 1 loaded-tree search only.
- Phase 2 optional server-assisted search with explicit product decision and query budget.

## API/Action Boundaries

Do not weaken authorization:
- Server actions remain the write boundary.
- Client graph is a convenience cache only.
- Edit capability remains UX gating, not authority.
- D1 repository authorization checks remain source of truth.

## Provider Constraints

- Stay inside `wrangler.jsonc` Cloudflare resources only.
- No paid Cloudflare add-ons without owner approval.
- No mutation of historical Supabase resources.
- Hosted D1 proof is allowed only with explicit env gates and sanitized output.

