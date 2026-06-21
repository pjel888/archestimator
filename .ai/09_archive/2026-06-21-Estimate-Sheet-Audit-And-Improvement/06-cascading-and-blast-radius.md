---
title: Estimate Sheet Cascading And Blast Radius
date: 2026-06-21
status: read-only-audit
---

# Cascading And Blast Radius

This document checks cascading row/tree errors, wrong-tab refreshes,
partial-success mutations, and blast radius for the current estimate-sheet plan.
It uses source inspection and OpenCode-corrected assumptions. No application
code or database state was changed by this plan document.

## Executive Notices

### P1: Bulk row delete can roll back unrelated selected rows

`deleteSelectedRows` loops over selected row ids and each `deleteRowItem` captures
the whole pre-delete tree/rows snapshot. If row A delete succeeds and row B
fails, B's whole-tree rollback can visually restore A even though the database
deleted it. If a failure resolves after a later optimistic revision, the rollback
can be skipped and leave a failed row visually deleted.

Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:2532` defines `deleteRowItem`.
- `src/components/workshop/EstimateSheetContent.tsx:2535` captures rollback state.
- `src/components/workshop/EstimateSheetContent.tsx:2540` filters the target row id.
- `src/components/workshop/EstimateSheetContent.tsx:2557` restores the whole snapshot.
- `src/components/workshop/EstimateSheetContent.tsx:2563` loops `bulkSelectedRowIds`.
- `src/hooks/use-estimate-query.ts:71` makes rollback conditional on global tree revision.

Smallest safe fix:
- Prefer one bulk row-delete mutation with one optimistic snapshot and row-scoped
  reconciliation, or make per-row rollback restore only the failed row.
- Regression test: select rows A/B, mock one delete success and one failure, then
  assert only the failed row is restored.

### P1: Component move is two independent row mutations

Moving a component from source row A to target row B calls `replaceRowItem(B)`
and `clearRowComponent(A)` independently. Each has its own optimistic whole-tree
snapshot and rollback. Partial failure can duplicate, lose, or visually restore
the wrong row state.

Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:2522` defines `moveRowComponent`.
- `src/components/workshop/EstimateSheetContent.tsx:2528` replaces the target row.
- `src/components/workshop/EstimateSheetContent.tsx:2529` clears the source row.
- `src/components/workshop/EstimateSheetContent.tsx:2347` and `:2387` define the two
  underlying mutation paths.
- `src/components/workshop/EstimateSheetContent.tsx:2380` and `:2432` use whole-tree
  rollback callbacks.

Smallest safe fix:
- Model move as one row-pair operation, or make the two local rollbacks row-scoped
  and explicitly reconcile the other row after either failure.
- Regression test both orders: target replace succeeds/source clear fails, and
  target replace fails/source clear succeeds.

### P1: Non-default tab structural mutations refresh the default tab tree

Reorder, single delete, and bulk delete can validate and persist the right node,
then refresh through `getProjectEstimateTreeByEstimate`, which resolves the
default tab. On a non-default tab, the client can write the default tab tree into
the active tab cache.

Evidence:
- `src/lib/estimates/actions.ts:1508` refreshes reorder through the default-tree loader.
- `src/lib/estimates/actions.ts:2208` refreshes single delete the same way.
- `src/lib/estimates/actions.ts:2281` refreshes bulk delete the same way.
- `src/lib/repositories/workspace-repository.ts:2749` resolves default tab in
  `getProjectEstimateTreeByEstimate`.
- `src/components/workshop/EstimateSheetTree.tsx:996` and `:1097` apply confirmed trees.

Smallest safe fix:
- Thread `targetTabId` into reorder/delete/bulk delete or infer it from affected
  nodes server-side, then refresh with `getEstimateTabTree(projectId, estimateId, tabId)`.
- Compute delete fallback from the same tab-scoped tree.

### P1: Bulk tree delete is not atomic across selected roots

`deleteEstimateNodesBulk` dedupes selected roots but deletes each root with a
separate RPC. If root A commits and root B fails, the action throws after partial
server-side deletion. The UI rollback can show the pre-delete tree until refetch,
while the database has already changed.

Evidence:
- `src/lib/estimates/actions.ts:2259` plans bulk deletion root by root.
- `src/lib/estimates/actions.ts:2269` loops root deletes.
- `src/lib/estimates/actions.ts:2270` calls `delete_estimate_node_with_history`
  once per root.
- `src/components/workshop/EstimateSheetTree.tsx:1107` restores the optimistic tree
  after any thrown error.
- `supabase/migrations/20260518090000_archestimator_core_schema.sql:82` and `:96`
  define node and row cascading FKs.

Smallest safe fix:
- Replace the loop with one `delete_estimate_nodes_bulk_with_history` RPC that
  validates all roots and deletes in one transaction.
- Regression test a mid-bulk failure and assert no partial delete/event survives.

### P1: Template-node subtree insert is slow and partial-success prone

Whole-template insertion uses one RPC, but inserting a selected node inside a
template loops node RPCs and row RPCs. The current comment documents that a
mid-way failure leaves already-created nodes visible and deletable. That is a
known partial-persistence contract, not just performance debt.

Evidence:
- `src/lib/estimates/actions.ts:2410` documents the partial-created-node behavior.
- `src/lib/estimates/actions.ts:2502` loops copied nodes.
- `src/lib/estimates/actions.ts:2507` calls `create_estimate_node_with_history`.
- `src/lib/estimates/actions.ts:2531` loops copied rows.
- `src/lib/estimates/actions.ts:2541` calls `insert_estimate_row_item_with_history`.

Smallest safe fix:
- Route this path through the existing
  `insert_estimate_subtree_into_estimate_with_history` RPC first, preserving
  history semantics and returning the inserted root id plus refreshed tab tree.
- Add a new migration only if a focused spike proves the existing RPC cannot
  satisfy selected-template-node semantics.
- If partial visibility remains intentional, make that user-visible and test it.

### P2: Template insert refresh trusts caller tab id

Template insert SQL decides the committed tab from the target parent node, but
the action refreshes using caller-provided `targetTabId`. A mismatched caller can
return the wrong tree and reconcile a successful insert into the wrong tab cache.

Evidence:
- `src/lib/estimates/actions.ts:2296` refreshes by caller `targetTabId`.
- `src/lib/estimates/actions.ts:2337` uses that refresh for whole-template insert.
- `src/lib/estimates/actions.ts:2381` uses it for multi-template insert.
- `src/lib/estimates/actions.ts:2574` uses it for selected-template-node insert.

Smallest safe fix:
- Read the committed `estimateTabId` from the RPC result, assert caller tab matches
  when provided, and refresh the committed tab.

### P2: Project-source bulk insert is a caller-side snapshot race

The single project-source action is tab-scoped, but the sidebar can fan out bulk
source inserts while the sheet applies each returned tree as authoritative. Out
of order responses can drop earlier inserted subtrees from the visible tree.

Evidence:
- `src/components/workshop/EstimateSheetContent.tsx:2167` starts the insert.
- `src/components/workshop/EstimateSheetContent.tsx:2184` applies `result.tree` directly.
- `src/components/workshop/component-library/index.tsx:1804` loops bulk project-source inserts.
- `src/lib/reusable-sources/actions.ts:361` is the single-insert action boundary.

Smallest safe fix:
- Serialize bulk project-source inserts per tab, or use a batch action that returns
  one coherent refreshed tree.

### P2: Tab tree fetch failures can look like empty tabs

The query hook exposes error state, but the render path checks loading and empty
state without a visible error branch. Network/auth/provider failures can look
like "This tab is empty."

Evidence:
- `src/hooks/use-estimate-query.ts:103` exposes the tab tree query state.
- `src/components/workshop/EstimateSheetContent.tsx:2819` renders loading.
- `src/components/workshop/EstimateSheetContent.tsx:2896` renders empty tab copy.

Smallest safe fix:
- Render retryable load errors before empty-state copy and disable mutation
  controls while the active tree query is unhealthy.

## Confirmed Guards

This source review did not find evidence that a normal row-delete action can
delete unrelated row ids server-side. The server path validates the exact row by
project/estimate and the SQL deletes by exact row id plus estimate id.

Evidence:
- `src/lib/estimates/actions.ts:2738` validates the row with `getValidatedEstimateRow`.
- `src/lib/estimates/actions.ts:2741` passes `target_row_id: row.id`.
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:742`
  selects `old_row` by `row_item.id = target_row_id` and estimate id.
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:797`
  deletes with the same exact predicates.
- `supabase/migrations/20260518090000_archestimator_core_schema.sql:96` defines
  `estimate_row_items.id` as the primary key.

This means the priority should be client rollback granularity, atomic bulk
operations, and tab-scoped refresh contracts, not a search for sibling-index
deletes in the row RPC.

## Blast Radius

Code-review graph impact analysis on the likely fix files reported high risk:
6 changed file candidates, 258 directly changed graph nodes, 330 impacted nodes,
and 153 files within one hop. The graph index was last updated on 2026-06-19, so
this is directional rather than exact.

Likely shared files for fixes:
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/hooks/use-estimate-query.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/repositories/workspace-repository.ts`
- relevant Supabase migrations only when an existing RPC cannot satisfy a
  focused fix path

Hidden coupling to preserve:
- `setEstimateTree` is not a plain setter; it increments the editable-row sync skip.
- `getProjectEstimateTreeByEstimate` is a default-tab loader, not a generic active-tab loader.
- Row mutation revision is currently derived from cached tree state.
- Non-optimistic insert flows replace whole tree snapshots unless serialized or merged.

## Test Gaps To Add First

1. Bulk row delete partial failure: one delete succeeds, one fails; assert only the
   failed row returns.
2. Component move partial failure in both orders; assert source and target rows
   reconcile independently.
3. Non-default tab reorder/single-delete/bulk-delete; assert returned tree and
   fallback stay within the active tab.
4. Bulk tree delete partial server failure; after future RPC fix, assert no partial
   delete/event survives.
5. Template insert mismatched `targetTabId`; assert refresh uses committed tab.
6. Project-source bulk insert out-of-order responses; assert no inserted subtree is lost.
7. Tab-tree fetch rejection; assert retryable error, not empty-tab copy.
