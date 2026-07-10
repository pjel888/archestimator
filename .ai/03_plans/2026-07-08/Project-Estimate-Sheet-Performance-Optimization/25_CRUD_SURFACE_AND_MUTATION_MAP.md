# 25 - CRUD Surface And Mutation Map

## Purpose

This document maps every Create / Read / Update / Delete operation in the Project Estimate Sheet: which Server Action is called, which D1 compatibility action it dispatches to, the optimistic-update behavior, the rollback behavior, the history event written, and the authorization gate. The action identifiers retain RPC-shaped names for compatibility; they are handled by the active D1 dispatcher and do not imply an active Supabase/provider RPC dependency. It is the complete CRUD contract for the MVP surface.

This is a planning/reference document. It does not authorize code changes.

Source-anchor policy: paths and symbol names are durable anchors. Numeric line locators are audit-time snapshots only and must be re-resolved before implementation; this document does not claim they remain current.

## Authorization Model (all writes)

Every write Server Action in `src/lib/estimates/actions.ts` follows the same gate:

1. **`assertCanEditEstimate({projectId, estimateId})`** or **`assertCanEditProject({projectId})`** — dispatches the `can_edit_estimate` / `can_edit_project` D1 compatibility action.
2. **Rate limiting** — per-action rate limit.
3. The set of compatibility-action names requiring edit authorization is `ESTIMATE_EDIT_ACTIONS` in `d1-action-client.ts`.
4. **Fail-closed**: `EstimateSheetContent` defaults `canEditEstimate` to `false`. The edit-capability query reconciles server truth.

The client also rejects viewer writes with `authz_denied` telemetry before dispatch (tested in `estimate-sheet-library-insert.test.tsx`).

## Estimate CRUD

| Operation | Server Action | D1 compatibility action | History Event | Notes |
|---|---|---|---|---|
| Create | `createEstimate` (`actions.ts:2315`) | `create_estimate_with_default_tab` | — | `FormData`; inserts estimate + default tab |
| Create (draft) | `createEstimateSheetDraft` (`:2338`) | — | — | programmatic |
| Duplicate | `duplicateEstimateSheet` (`:2370`) | — | — | full clone of tabs/nodes/rows |
| Update details | `updateEstimateDetails` (`:2687`) | `update_estimate_details_with_history` | yes | name/notes/sheetCode/projectBudget |
| Regenerate code | `regenerateEstimateSheetCode` (`:2737`) | — | — | new `ES`-prefixed code |
| Update adjustment | `updateEstimateSheetAdjustment` (`:3353`) | `update_estimate_sheet_adjustment_with_history` | yes | estimate-level adjustment mode |
| Delete (single) | `deleteEstimateSheet` (`:2677`) | — | — | single-sheet delete |
| Delete (bulk preview) | `previewBulkDeleteEstimateSheets` (`:2569`) | — | — | eligibility + hash |
| Delete (bulk execute) | `executeBulkDeleteEstimateSheets` (`:2610`) | — | — | hash-gated cascade delete |

## Tab CRUD

| Operation | Server Action | D1 compatibility action | Notes |
|---|---|---|---|
| Create | `createEstimateTab` (`:2793`) | — | returns `EstimateTabMutationResult` |
| Rename | `renameEstimateTab` (`:2808`) | — | |
| Reorder | `reorderEstimateTabs` (`:2824`) | — | client writes canonical tab array to query cache (`EstimateWorkspaceClient.tsx:199-204`, label R10) instead of refetch |
| Duplicate | `duplicateEstimateTab` (`:2845`) | — | |
| Archive | `archiveEstimateTab` (`:2861`) | — | |
| Delete | `deleteEstimateTab` (`:2875`) | — | |

Tab state: `useEstimateActiveTab` (localStorage-backed). Fallback synthetic tab `[{id: "legacy-main", ...}]` when no tabs (pre-tab compat).

## Node (Area/Group) CRUD

The P6 single-node model: **any node may parent any node** (no area/group gate). `kind` is `"group"` or `"area"`.

| Operation | Server Action | D1 compatibility action | History Event | Notes |
|---|---|---|---|---|
| Create | `createEstimateNode` (`:2889`) | `create_estimate_node_with_history` | yes | `formData`; kind enforced by `readEstimateNodeKind` |
| Rename | `renameEstimateNode` (`:2985`) | — | yes | |
| Delete (single) | `deleteEstimateNode` (`:3010`) | `delete_estimate_node_with_history` | yes | |
| Delete (bulk) | `deleteEstimateNodesBulk` (`:3048`) | — | yes | multi-root; `dedupeSelectedRoots` |
| Reorder | `reorderEstimateTreeNodes` (`:2207`) | `reorder_estimate_nodes_with_history` | yes | validated by `validateProjectedEstimateTreeReorder` |
| **Restore** | `restoreDeletedEstimateNodes` | `restore_deleted_estimate_nodes_with_history` | yes | Implemented and dispatched by `restoreDeletedEstimateNodes` in `d1-action-client.ts` |

**Optimistic-create dance** (left panel): new nodes get `optimistic-area-...` ids in `EstimateSheetTree.tsx`, resolved to server ids asynchronously via `pendingNodeCreatesRef` / `resolveServerNodeId`. Reorders/renames targeting optimistic ids await the create promise.

## Row Item CRUD

This is the core estimate-sheet write surface.

| Operation | Server Action | D1 compatibility action | History Event | Notes |
|---|---|---|---|---|
| Insert from library | `insertEstimateRowItemFromLibrary` (`:3288`) | `insert_estimate_row_item_with_history` | yes | row gets `sourceLibraryItemId` + variant projection; `linkState: "linked-clean"` |
| Insert blank (express) | (same compatibility action, different payload) | `insert_estimate_row_item_with_history` | yes | emits express template (`pricingSource: "Express component"`, `metadata.expressComponent`) |
| Update | `updateEstimateRowItem` (`:3386`) | `update_estimate_row_item_with_history` | yes | builds `row_patch`; **flips `linkState` to `linked-overridden` if `source_library_item_id` set** (line 3430); triggers server fan-out for project components |
| Replace (library) | `replaceEstimateRowItemWithLibrary` (`:3448`) | `replace_estimate_row_item_with_history` | yes | replaces row's component with a different library item/variant |
| Detach from library | `detachEstimateRowItemFromLibrary` (`:3466`) | `unlink_estimate_row_item_from_library_with_history` | yes | sets `linkState: "detached"`; row becomes project-level |
| Delete (single) | `deleteEstimateRowItem` (`:3494`) | `delete_estimate_row_item_with_history` | yes | |
| Delete (bulk) | `deleteEstimateRowItemsBulk` (`:3634`) | `delete_estimate_row_items_bulk_with_history` | yes | ≤100 rows; all-or-nothing |
| Move component | `moveEstimateRowComponentWithHistory` (`:3509`) | `move_estimate_row_component_with_history` | yes | swaps two rows' components |
| Move row (reorder/reparent) | `moveEstimateRowItemWithHistory` (`:3562`) | `move_estimate_row_item_with_history` | yes | reorder/reparent rows |
| **Restore** | `restoreDeletedEstimateRows` | `restore_deleted_estimate_rows_with_history` | mandatory pre-baseline repair | The dispatch branch still throws on D1 even though the UI offers Undo; the current positive server-action test mocks the client, and the UI omits `mutationId`. `UNIT-002` owns native/historical snapshot, first-call subset, denial, same-correlation, and fresh-correlation source-event idempotency proof, bulk-event alias normalization, implementation, and node-restore regression before browser collection, while `UNIT-009` preserves it under revision/concurrency proof. |
| Promote to library | `promoteEstimateRowToLibraryComponent` / `promoteExpressRowToLibraryComponent` (`express-promotion-actions.ts:241, :518`) | `promote_express_component` | — | converts row into library component; updates source row linkage |

## Row Mutation Flow (client → server)

```
Inline cell edit (row-table.tsx)
  → onChange: updateQuantityDraft / updateContingencyPercentageDraft / ...
      → setEditableRows(updateEditableRowValue(current, item, patch))  [local reducer state]
      → onMarkRowDirty(item.id)                                        [marks save state "dirty"]
  → onBlur: commitQuantityFields / commitContingencyPercentage / ...
      → onUpdateRowItem(rowItemId, serverPatch)                        [prop from EstimateSheetContent]
          → useEstimateRowHandlers.updateRowItem (use-estimate-row-handlers.ts:674)
              → (if express draft pending) buffer the patch in the draft, return
              → commitRowItemUpdate(rowItemId, values)  (line 516)
                  → snapshot previousTree / previousRows (collectEditableRows — O(N))
                  → updateRow({ projectId, estimateId, rowId, ...sourceSnapshot, metadata,
                                 onSuccess: patch tree + re-seed editable rows,
                                 onError: revert local editable row,
                                 rollback: restoreEstimateState(previousTree, previousRows, rev) })
                      → useEstimateRowMutations.updateRow (enqueueRowUpdate, line 1319)
                          → updateMutation.mutateAsync (line 1197)
                              ├─ onMutate: cancelQueries → snapshot
                              │            → patchProjectComponentInstanceRowsInTree (CLIENT fan-out, O(N))
                              │            → patchProjectComponentProjectionCaches
                              │            → setQueryData(optimistic tree)
                              ├─ mutationFn: updateEstimateRowItem (Server Action)
                              ├─ onSuccess: setQueryData(server patch)
                              │            → invalidateQueries (refetch active ONLY if fan-out >1 row)
                              └─ onError: restoreEstimateRowPatchesInTree (unless offline — keeps draft)
```

The mutation layer's direct `queryClient.setQueryData` calls update tree data but do not increment the sibling revision key owned by the `use-estimate-query.ts` tree helpers. `UNIT-001` must characterize the mismatch before `UNIT-006` changes graph/cache ownership, and `UNIT-009` must prove rollback/restore paths observe the same revision contract.

For project-component edits, the server path does not perform one constant-time relational update. `propagateProjectComponentRowPatch` runs a JSON-identity-filtering SELECT across project rows, materializes each match, builds one revisioned UPDATE statement per matching sibling, and sends those statements through a D1 batch. Match count, statement construction, and batch execution belong in `UNIT-001`/`UNIT-003`; `UNIT-006`–`UNIT-009` must preserve the fan-out result while changing client/cache structure.

**Two-phase draft-then-commit**: typing writes to local `editableRows` synchronously (instant feel); persistence happens on blur.

**Editable-rows sync effect** (`use-estimate-row-handlers.ts:462-476`): when saveState is idle and tree changes (and `skipEditableRowsSyncRef === 0`), re-seeds editable rows from the tree via `collectEditableRows`, but **preserves** rows that are: actively being edited, pending mutation, offline-failed, or diverged from baseline (`mergeSyncedEditableRows` / `shouldPreserveLocalEditableRow`).

## Component Library Component CRUD (master)

These mutate the library master, distinct from row projections.

| Operation | Server Action | Location | Notes |
|---|---|---|---|
| Create | `createCostLibraryComponent` | `component-library/actions.ts:1242` | inserts `cost_library_items` + price options; enforces `LIBRARY_COMPONENT_CAP`; `fieldContract: "opendesign-add-component"` → `sanitizeOpenDesignAddComponentPriceOption` |
| Save draft | `saveCostLibraryComponentDraft` | `:1394` | |
| Update | `updateCostLibraryComponent` | `:1437` | used by EditComponentDrawer |
| Upsert price option | `upsertCostLibraryComponentPriceOption` | `:1507` | used by EditComponentDrawer |

## Optimistic Update + Rollback Matrix

| Mutation | Optimistic method | Rollback method | Notes |
|---|---|---|---|
| Row update | `setQueryData(patchEstimateRowItemInTree)` + `patchProjectComponentInstanceRowsInTree` | `restoreEstimateRowPatchesInTree` (pre-collected inverse patches) | rollback suppressed if offline (keeps draft) |
| Row insert | `setQueryData` (touched row) | `restoreEstimateState(previousTree, previousRows, rev)` | |
| Row replace (library) | `setQueryData` (touched row) | `restoreEstimateState(...)` | |
| Row delete | `setQueryData` (remove row) | `restoreEstimateState(...)` | |
| Row move | `setQueryData` (source + target) | `restoreEstimateState(...)` | wrapped in `flushSync` so moved row DOM appears before focus rAF |
| Bulk delete | `setQueryData` (remove rows) | all-or-nothing server contract | |
| Template insert | `setEstimateTree(appendTemplateNodesToParent)` | `restoreEstimateState(...)` | stale-snapshot guard: reconcile only if revision matches |
| Node create | optimistic `optimistic-area-...` id | resolved to server id async | reorders/renames targeting optimistic ids await create promise |
| Node reorder/rename | optimistic patch | restore | |
| Tab reorder | `queryClient.setQueryData` (canonical array) | — | label R10; no refetch |

Revision caveat: all direct row-mutation cache writes in this matrix bypass the tree revision increment unless they are routed through the query-hook helper. Revision-dependent stale-snapshot guards therefore cannot be assumed to observe every cache change until the `UNIT-006`/`UNIT-009` ownership repair is proven.

## Conflict Handling

- **`row_revision`** is the monotonic conflict guard. Server rejects stale revisions.
- **Realtime broadcast** (`estimate-row-update-broadcast`): accepts current payloads scoped to active estimate/tab, rejects stale/future/wrong-scope, applies only newer revisions.
- **Stale library source commit blocking**: tested in `estimate-sheet-version-control-actions.test.ts`.
- **Out-of-order quantity response suppression** + **rapid same-row edit queueing**: tested in `estimate-sheet-library-insert.test.tsx`.
- **Active-tree refetch on conflict**: tested.

## CRUD Gaps & Risks

| Gap | Severity | Notes |
|---|---|---|
| Row restore throws on D1 while row delete offers Undo | High | The affordance is false on the active substrate, and the current positive server-action test is false-green for D1 because it mocks the client. Mandatory `UNIT-002` repair adds the edit-action guard, scoped event/type validation, native D1 plus historical snapshot parsing, first-call subset/parent/collision/zero-match checks, authoritative revisions, atomic rows plus one restore event, same-correlation replay, fresh-correlation source-event idempotency that prevents stale resurrection, public bulk-event alias normalization, and direct D1 proof; keep node restore covered and re-prove both in `UNIT-009`. Documented as GAP-07 in doc 22. |
| Bulk delete capped at ≤100 rows | Low | Acceptable for MVP; UI should batch or warn above 100. |
| Optimistic node create race | Low | Handled via `pendingNodeCreatesRef` / `resolveServerNodeId`; tested. |
| `collectEditableRows` in every mutation snapshot | Medium (perf) | O(N) per mutation; addressed by normalized graph (doc 06 Phase 5). |
| Server fan-out uses JSON identity filtering plus per-match batched updates, while client fan-out is an O(N) tree-walk | Medium to high at scale | Measure both paths in `UNIT-003`; address client lookup with `componentInstanceRowIdsByIdentity` when activated. |
| Direct query-cache writes bypass tree revision increments | High (correctness/perf) | Characterize in `UNIT-001`; make graph/query revision ownership explicit in `UNIT-006`; prove mutation, rollback, and restore behavior in `UNIT-009`. |
| The 1,500-node read ceiling can become one `node_id IN (...)` statement | Medium to high at scale | `readEstimateRows` emits one placeholder per node id. `UNIT-001` characterizes the shape, `UNIT-003` proves the D1 bind ceiling without product edits, and `UNIT-005` chunks or otherwise bounds it if activated. |
| Move-target options derive while the dialog is closed | Medium (perf) | `collectRowMoveNodeOptions` is keyed only by tree identity. Characterize in `UNIT-001`; gate/index it in `UNIT-007`. |
| Component-library sidebar wakes on tree identity | Medium (perf) | The memoized sidebar receives the full tree. Measure in `UNIT-001`; narrow selector/prop ownership in `UNIT-007` if activated. |
| Left and center panes both build active-tree projections | Medium (perf/memory) | Establish per-pane work in `UNIT-001`; normalize and split pane selectors through `UNIT-006`–`UNIT-008`. |

## Verification

- Planning provenance: source-grounded audit of `actions.ts`, `d1-action-client.ts`, `use-estimate-row-mutations.ts`, and `use-estimate-row-handlers.ts`.
- Test coverage: `estimate-sheet-actions-authz.test.ts` (17 tests — every action auth-gated), `estimate-sheet-library-insert.test.tsx` (38 tests — insert/variant/express/template/move/rollback), `estimate-sheet-version-control-actions.test.ts` (33 tests — history/conflict/restore), `estimate-sheet-center-atomic-contracts.test.ts` (8 tests — single atomic mutation paths).
- Source references are symbol-based for this refresh; any retained numeric locator is non-authoritative and must be re-resolved.
