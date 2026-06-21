# Phase 4 Template-Node Subtree RPC Spike

## Question

Can the existing estimate-subtree insert RPC cover dragging a single template node subtree into an estimate, or does the estimate sheet need a dedicated template-node RPC?

## Current RPC Surface Reviewed

- `insert_estimate_subtree_into_estimate_with_history` copies a subtree from an existing estimate/tab/node source into a target estimate. Its source identity is an estimate tree node, not an estimate template node.
- `insert_estimate_template_into_estimate_with_history` copies a whole template into an estimate. Its source identity is a template id, not an arbitrary template-node id.
- Template rows live under `estimate_template_nodes` and `estimate_template_row_items`, while estimate rows live under estimate tree/row tables with estimate-specific ids, history rows, tab membership, and row revision semantics.

## Decision

Keep the new `insert_estimate_template_node_into_estimate_with_history` RPC for template-node subtree insertion.

The RPC accepts a `source_template_id`, `source_template_node_id`, `target_estimate_id`, and `target_parent_node_id`; verifies edit permission through the estimate-history auth path; copies only the selected template-node subtree and its template row items into the active target estimate/tab; writes estimate history for the inserted node/row ids; and returns the refreshed estimate tree from the same transactional path.

## Rejected Alternatives

- Reuse `insert_estimate_subtree_into_estimate_with_history`: rejected because it sources from estimate tree tables and would blur template provenance, tab ownership, and auth assumptions.
- Reuse whole-template insert and prune client-side: rejected because it creates extra nodes/rows, generates misleading history, and depends on follow-up deletes for correctness.
- Insert each template row/node from the client: rejected because it would require many round trips, expose partial-commit failure modes, and duplicate server-side history/id mapping logic in the UI.

## Evidence

- Action/RPC coverage exercises template subtree insert routing and auth-sensitive RPC contracts in `tests/vitest/estimate-node-reorder-action.test.ts` and `tests/vitest/security-findings-auth-contracts.test.ts`.
- The dedicated migration path lives in `supabase/migrations/20260621122125_estimate_sheet_bulk_delete_and_edit_rpc_hardening.sql` alongside the bulk delete and RPC execute-grant hardening.
