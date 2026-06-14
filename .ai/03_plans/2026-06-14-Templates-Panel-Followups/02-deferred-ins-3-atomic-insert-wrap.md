# INS-3 — Make template node-insert & area-wrap atomic

**Last updated:** 2026-06-14
**Status:** Deferred — real data-integrity hazard; needs a server-side transaction.
**Severity:** High · **Effort:** Medium · **Risk:** Medium

## Problem

Two insert server actions are **non-atomic** — they loop several history-aware RPCs, and a mid-way failure leaves partially-created rows in the DB:

- `insertEstimateTemplateNodeIntoEstimate` (`src/lib/estimates/actions.ts`) — loops `create_estimate_node_with_history` then `insert_estimate_row_item_with_history` per subtree node/row. The doc comment even states a mid-way failure "leaves the already-created nodes visible and deletable rather than rolling back."
- `wrapEstimateAreaAndInsertTemplate` — worse: it (1) creates a wrapper group, (2) **moves the area into it** (`reorder_estimate_nodes_with_history`), then (3) inserts the template content. If step 3 fails, the DB is left with the area already re-parented into an orphan group with no sibling content.

On the client, the `.catch` rolls back to the pre-insert snapshot — which now **contradicts** the DB. The next refetch (window focus / navigation) snaps to the orphaned/half-grouped state.

> Note: the 2026-06-14 pass made the client refresh **tab-aware** (RS-1), which means a re-fetch-on-catch is now viable per-tab — but the underlying DB orphan is the real bug and should be fixed server-side.

## Approach

**Preferred — server-side transaction.** Wrap each composed action in a single Postgres function so it's all-or-nothing:

- `insert_estimate_template_node_subtree_with_history(...)` — does the node + row creation loop inside one function/transaction.
- `wrap_estimate_area_and_insert_template_with_history(...)` — does create-group → move-area → insert-template atomically; on any failure the whole thing rolls back, leaving the area exactly where it was.

These mirror the existing single-RPC pattern (`insert_estimate_template_into_estimate_with_history` is already one atomic RPC). Keep the same `correlation_id` idempotency + `assert_can_edit_estimate` gate.

**Fallback (if the SQL is too large to land now) — re-fetch on catch.** In the client `.catch` for these two handlers, instead of restoring the stale snapshot, re-fetch the authoritative tree for the active tab (`fetchEstimateTabTree({ projectId, estimateId, tabId: dataTabId })`) and apply it. This shows the true post-failure state (including any orphan), so the UI matches the DB and the user can delete the orphan. This is a stopgap, not a fix for the orphan itself.

## Risk / mitigation

- Writing/moving the loops into plpgsql needs care around the deferred tree-validation constraint trigger (`estimate_nodes_enforce_tree`) and sort-order uniqueness. Reuse the helpers the existing `_with_history` RPCs use.
- Owner-gated only if it requires a hosted migration (it does — schedule with the next migration window). The DB layer is otherwise fully applied (see A5 audit).

## Acceptance criteria

- Inject a forced failure on the final step of each composed action → DB has **zero** new nodes/rows afterward (true rollback).
- Client state after a failure matches the DB (no contradiction across a refetch).
- Existing insert tests green; add a partial-failure test (mock the last RPC to error) asserting no orphan.

## References

- Audit finding INS-3 (insert-flows audit) + adversarial verification ("real but the naive client re-fetch fix is unsafe under multi-tab; prefer server transaction").
- `src/lib/estimates/actions.ts` (`insertEstimateTemplateNodeIntoEstimate`, `wrapEstimateAreaAndInsertTemplate`).
