# 04 — Row CRUD Audit

Each operation traced from first pointer/keyboard event through DB mutation and back. See `15-PRIORITIZED-FINDINGS.md` for severity ratings.

## 9.1 Create blank or express row

**Entry paths:**
- "Add row" button per area (`drop-zones.tsx:41-63` QuietAddRowButton) → `onAddBlankRow(nodeId)` → `insertBlankRow` (`EstimateSheetContent.tsx:2647-2653`).
- "Add Area" via header → routes through EstimateSheetTree (not center column).
- Empty area state → same drop target as above.

**Flow (`commitLibraryItemInsert`, l. 2345-2393):**
1. `cloneLibraryItemForEstimate(libraryItem)` mints client UUID for the row id (l. 470-487).
2. Optimistic insert via `setEstimateTree(appendRowToTargetNode)` (l. 2366-2376) — bumps revision + `skipEditableRowsSyncRef`.
3. `setEditableRows` adds initial editable row (l. 2377).
4. For express: `setExpressInsertDrafts[rowId] = { targetNodeId, libraryItem, mutationId, status: 'creating' }` (l. 2356-2364).
5. `requestPendingRowFocus(newItem.id)` (l. 2354) — 5-frame budget.
6. `insertRow({ ..., rollback, onSuccess, onError })` (l. 2380-2390).
7. `useEstimateRowMutations.insertRow` → `insertMutation.mutate(withInsertMutationIdentity(input))` (l. 552). Mutation idempotent via `mutationId`.
8. Server `insertEstimateRowItemFromLibrary` → RPC `insert_estimate_row_item_with_history`.
9. `onSuccess`: patches tree cache via `patchEstimateRowItemInTree` (l. 306-334) with canonical result; bumps `skipEditableRowsSyncRef`.
10. For express: `handleExpressInsertSuccess` flushes buffered edits if any (l. 2269-2282).

**Status:** VERIFIED WORKING for typical case. Express drafts surface a retry/delete UI on failure (cells.tsx l. 195-225).

**Edge cases:**
- **Buffered edits while pending** — handled via `expressInsertDraftsRef` (l. 1365) + `bufferedPatch` (l. 2247-2263).
- **Server success after local draft deletion** — `deleteExpressDraft` (l. 2330-2343) removes the row from the local tree; if the server's success arrives after, `insertMutation.onSuccess`'s `patchEstimateRowItemInTree` looks for the optimistic row id in the current tree and silently no-ops. **Risk: orphan server row** — DB has the row, UI does not. The user would see it after a refresh. Not a P0 but a P2 data-divergence.
- **Tab switch while pending** — the mutation's cache key is the OLD tab; the optimistic row is in the old tab's cache; if the user switches tabs before the insert resolves, the OLD tab is patched correctly when success arrives.
- **Revision-conflict failure** — `invalidateTreeAfterMutationError` refetches; user sees canonical state.

**Coverage:** `tests/vitest/estimate-sheet-cost-inputs.test.tsx:245-256` (command palette insert), `258-270` (keyboard add-row), `272-284` (keyboard activation), `286-325` (legacy blank row conversion), `579-588` (add-library-item event).

---

## 9.2 Create from library / project component

**Entry paths:**
- Right-sidebar "+" on a library item → publishes `archestimator:add-library-item` window event → `EstimateSheetContent` (l. 2682-2688).
- Right-sidebar double-click → `LibraryTree.handleRowDoubleClick` (LibraryTree.tsx:483-490) → `onItemAdd`.
- Right-sidebar drag → `LibraryTree.handleNodeDragStart` → `onItemDragStart` sets `application/x-archestimator-library-item` MIME + `beginEstimateWorkshopDrag`.
- Drop on area strip → `ComponentDropTarget` (drop-zones.tsx:71-127) → `onInsertLibraryItem`.
- Drop on existing row's material cell → `EstimateMaterialCell.handleReplacementDrop` (cells.tsx:413-430) → `onReplace`.
- Drop on row-table root → `EstimateRowItemsTable.handleDrop` (row-table.tsx:650-656) → `onInsertLibraryItem(targetNodeId, ...)` (append).
- Command palette select → `CommandPalette.onInsert` → `insertIntoSelectedNode`.
- Project Component tab insertion → same `add-library-item` event with project-component-flavored EstimateRowItem.

**Target resolution:**
- Click/command-palette paths: **selected area** (`insertTargetNodeId` = `selectedNode?.id`).
- Drop on area strip / row table: **drop-target area** (`nodeId` of the `ComponentDropTarget`).
- Drop on material cell: **replaces that row** (target row id, not node id).
- **Can selected area differ from drop target?** YES. The selected area may be X, and the user drops onto area Y's strip. The drop wins for the target.
- **Trust-gate behavior:** Click + drag both route through `insertLibraryItem` → `shouldGateLibraryCommit` → `getLibraryCommitTrustGate`. If `warn` or `block`, modal opens with `targetNodeId` captured. See ESC-P1-05 for stale-target concern.

**Callback success before confirmation:** The sidebar's `onInsertComponent` callback (signature `(item) => boolean | void`) returns `true` from `commitLibraryItemInsert` immediately (l. 2392) — meaning the sidebar sees "success" the moment the optimistic insert is queued, **regardless of whether the trust-gate modal later blocks the commit**. This is misleading feedback (spec hypothesis H4). The sidebar's recents update on this `true` signal (typical pattern in LibraryTree). **ESC-P1-05 adjacent finding.**

**Server re-read of library source:** `assertCurrentLibrarySourceForEstimateCommit` (actions.ts:879-903) re-reads the source `cost_library_items` row at insert/replace time. If archived or `updated_at` differs from the snapshot, throws. **GOOD** — this closes the stale-source window.

**Coverage:** `tests/vitest/estimate-sheet-cost-inputs.test.tsx:579-602` (event + command palette), `863-893` (drag-replace preserving editable fields).

---

## 9.3 Read and display

Every displayed field maps to either canonical (from `estimateTree` cache) or editable (from `editableRows`) state. See `02-ROW-DOMAIN-AND-SOURCE-OF-TRUTH.md` for the source-of-truth ledger.

**Field-by-field:**
- Row number: computed from DOM order, NOT persisted (row-table.tsx:282-284).
- Selection checkbox: `SelectionCheckbox` (selection-checkbox.tsx) with `aria-checked="mixed"` for indeterminate.
- Component image: `getComponentImageUrl` (activity-history-model.ts:111-122) — returns `item.imageUrl` if set, else **Unsplash fallback by category** (ESC-P3-17).
- Component name: `item.material` for library; `editableRow.name` for express/blank.
- Supplier: `item.supplier` for library; `editableRow.supplier` for express/blank.
- Source classification: rendered via `getComponentSourceLabel` (cells.tsx:44-55) → `Library Component \| Project Component`.
- Unit cost: `item.itemCost` for library (read-only); `editableRow.unitCost` for express.
- Unit: same pattern.
- Quantity / Adjustment / Misc cost: numeric cells (see `06-EDITING-MATH-AND-TOTALS-AUDIT.md`).
- Subtotal / Total Item Cost: computed in row-table.tsx:209-246 (`computedItem` memo).
- Source rail (left border): `getComponentSourceRailClass` (cells.tsx:57-68) — color by `sourceTone`.
- Linked/overridden/source-changed state: `linkState` chip is NOT shown on the row itself (only in row details modal). The rail color is the only on-row signal.

**Findings:**
- Library rows with overrides are NOT mislabeled — `linkState === "linked-overridden"` renders with the library rail (orange), which is correct.
- Failed images do not break layout — `getComponentImageUrl` always returns a string (Unsplash fallback if category matches, or furniture Unsplash as last resort).
- Zero/blank distinction: `MoneyInput` shows formatted "₱ 0.00" when not focused, raw "0" when focused (cells.tsx:582-603).

---

## 9.4 Update numeric row fields

See `06-EDITING-MATH-AND-TOTALS-AUDIT.md` for full numeric-input audit.

**Fields:** Quantity (cell index 0), Adjustment percentage (cell index 1), Misc cost (cell index 2). For express rows: also unit cost via MoneyInput.

**Blur commit flow:**
1. `onChange` updates `editableRows` via `setEditableRows` + `onMarkRowDirty(item.id)` (row-table.tsx:351-354, etc.).
2. `onBlur` checks if the parsed value differs from the stored value; if so, calls `onUpdateRowItem(item.id, { fieldName: editableString })` (row-table.tsx:356-359).
3. `updateRowItem` (EstimateSheetContent.tsx:2246-2267) routes through `commitRowItemUpdate` (l. 2187-2244) which calls `updateRow({...})`.
4. `useEstimateRowMutations.updateRow` → `enqueueRowUpdate` → `enqueueRowMutation` → per-row queue.
5. Server `updateEstimateRowItem` validates `expectedRowRevision`; on success returns canonical row.
6. `updateMutation.onSuccess` checks operation-id; if match, patches tree cache.

**Invalid input handling:**
- `parseNonNegativeEditableNumber` (editable-row-model.ts:78-80) strips non-numeric chars via regex `[^0-9.-]` then `Math.max(0, parsed)`. So `"abc"` becomes 0, `"-5"` becomes 0, `"5.5.5"` becomes 5.5.
- Adjustment % is clamped to `[0, 100]` magnitude (`clampCostAdjustmentMagnitude` l. 82-85); sign applied by mode (contingency=+, discount=-).
- This silent-normalization is **acceptable per spec hypothesis H8** (rejecting would be more confusing for spreadsheet users).

**Duplicate blur/Enter:** `handleEstimateCellKeyDown` (cells-model.ts:27-55) calls `event.currentTarget.blur()` on Enter (l. 36-37). The blur handler checks `computedItem.quantity !== computedItem.storedQuantity` before firing (row-table.tsx:358) — so Enter→blur does NOT double-submit.

**Stale-response protection:** Per-row operation-id gate (`rowOperationIdsRef` l. 272). **GOOD.**

---

## 9.5 Update inline Project Component fields

For express/blank rows only (cells.tsx:541-553). Inline editor: `ExpressMaterialEditor` (cells.tsx:157-354).

**Fields:** name, description, supplier, unit, unitCost (MoneyInput), imageUrl (URL input), sourceUrl (URL input).

**Commit behavior:**
- Enter (single-line) → `commitField(field)` via `handleExpressFieldKeyDown` (cells.tsx:134-155).
- Cmd/Ctrl+Enter (multi-line description) → same.
- Blur → `commitField(field)` (cells.tsx:244-247, 263-266, etc.).
- Escape → `onRevert(field)` resets to initial value from `getInitialEditableRow(item)`.

**Commit patch:** `commitExpressFields` (row-table.tsx:257-268) builds a patch ONLY for fields whose value differs from the stored value. So a no-op blur does not fire a mutation.

**Coverage:** `tests/vitest/estimate-sheet-cost-inputs.test.tsx:604-633` (Enter commit), `635-652` (blur commit), `654-669` (no save state shown while editing).

**Edge case: virtualization unmounts the active editor** — addressed by `hasActiveExpressEditor` virtualization kill-switch (row-table.tsx:545-546). The trade-off is ESC-P1-06.

---

## 9.6 Replace row component

**Entry paths:**
- Drag library item onto material cell (`handleReplacementDrop` cells.tsx:413-430).
- (No keyboard equivalent — ESC-P2-09 / Open Question #14.)

**Flow (`commitReplaceRowItem`, l. 2724-2763):**
1. `applyEditableValuesToLibraryItem(libraryItem, editableReplacement)` — preserves the row's current quantity/adjustment/misc from editableRows.
2. `replaceRowItemWithLibraryItem(rowItemId, replacementLibraryItem)` (l. 609-625) — keeps the row id, replaces everything else.
3. `setEstimateTree` patches the row in tree (l. 2730-2743) — bumps revision + skip-ref.
4. `setEditableRows` resets the row to initial (l. 2745-2750).
5. `replaceRow({...})` → server `replaceEstimateRowItemWithLibrary`.
6. Server re-reads library source via `assertCurrentLibrarySourceForEstimateCommit`.

**What is preserved:** row id, quantity, contingencyPercentage, contingencyValue, miscCost (via `applyEditableValuesToLibraryItem`).
**What is replaced:** material, description, supplier, unit, unitCost, image, sourceUrl, category, linkState, sourceLibraryItemId, sourceSnapshot.

**Trust gate:** `replaceRowItem` (l. 2765-2793) calls `getLibraryCommitTrustGate(replacementLibraryItem, { action: 'replace', existingRow })` BEFORE committing. If warn/block, modal opens with `rowItemId` captured.

**Tests:** `estimate-sheet-cost-inputs.test.tsx:722-741` (drag-replace preserves editable fields), `743-757` (replace express with library), `759-776` (replace express with moved component), `863-893` (drag-replace with trust gate).

---

## 9.7 Clear component vs Delete row

**Clear component** — `clearRowComponent` (EstimateSheetContent.tsx:2832-2881):
- If express: same as delete row (calls `onDeleteRowItem` from row-table.tsx:325-327).
- Else: `replaceRowItem(rowItemId, createBlankEstimateRowTemplate())` — keeps the row, replaces the component with a blank.

**Delete row** — `deleteRowItem` (l. 3041-3065):
- Optimistic remove via `setEstimateTree(removeEstimateRowItem)`.
- `setEditableRows` deletes the entry.
- `deleteRow({...})` → server `deleteEstimateRowItem`.

**Icon confusion** — Both buttons use `<Trash/>` (cells.tsx:499-512 for clear, row-table.tsx:481-490 for delete). **ESC-P2-08.**

**Confirmation policy** — Neither has a confirmation step. **Open Question #2.**

---

## 9.8 Delete single row

See above. Per-row deletion is **atomic** (single RPC).

**Focus after deletion:** NOT explicitly managed. The browser default-focus (document body) applies. **OPEN GAP** — no test asserts focus moves to next/previous row. **Open Question #32.**

---

## 9.9 Bulk delete rows

`deleteSelectedRows` (l. 3067-3070) — iterates `bulkSelectedRowIds.forEach(deleteRowItem)`. Each is an independent delete in its own queue. Selection cleared BEFORE settles.

**ESC-P1-03.** See `15-PRIORITIZED-FINDINGS.md` for full detail.

---

## 9.10 Move component between rows

`moveRowComponent` (l. 2967-3039). **ESC-P0-01.** See findings for full detail.

**Eligibility:** Express rows CANNOT be moved (l. 2969-2972 — explicit reject with toast).

---

## 9.11 Make Project Component (detach)

**Entry:** `EstimateMaterialCell` "Make Project Component" button (cells.tsx:466-481) → `onRequestProjectSpecific` → `setProjectSpecificRowId(rowId)` opens confirm dialog (l. 3241-3267).

**Confirm:** `confirmProjectSpecific` (l. 2947-2965) → `detachRow({...})` → server `detachEstimateRowItemFromLibrary` → linkState becomes "detached", source becomes "project", sourceLibraryItemId becomes null.

**Eligibility:** `canMakeProjectSpecific` (cells-model.ts:62-65) — must be library-linked and not already detached/express.

**Rollback:** Full `restoreEstimateState`.

---

## 9.12 Promote to library

**Entry:** `EstimateMaterialCell` "Promote to library" button (cells.tsx:482-498) → `onPromoteRowToLibrary` → `setPromotingRowId(rowId)` + `promoteRow({...})`.

**Flow (`promoteRowToLibrary`, l. 2889-2945):**
1. Eligibility check via `canPromoteEstimateRowToLibrary` (cells-model.ts:67-69) — must be express or detached.
2. Save-state guard: rejects if `saveState === 'dirty' || 'saving'` (l. 2896-2899).
3. `promoteRow({...})` → server `promoteEstimateRowToLibraryComponent` (creates a library item, links the row).
4. `onSuccess`: patches tree to set `source: "library"`, `sourceLibraryItemId: result.itemId`, `linkState: "linked-clean"`, strips express/projection metadata.
5. `refetchProjectComponentProjection` invalidates the project component cache.
6. `handleLibraryDataChanged` invalidates the library cache.

**Coverage:** No dedicated test for the full promote flow. **GAP** — `tests/vitest/estimate-sheet-cost-inputs.test.tsx` does not exercise promote.

---

## Coverage gaps (per operation)

| Operation | Existing tests | Gap |
|-----------|----------------|-----|
| Add blank row | 4 tests | None for in-flight buffered edits |
| Add library item (event) | 2 tests | None for trust-gate target-stale (ESC-P1-05) |
| Add library item (drag-area) | implicit | None for malformed payload |
| Add library item (drag-cell replace) | 4 tests | Good coverage |
| Read/display | many | None for failed image fallback |
| Update quantity | 4 tests | None for non-numeric paste |
| Update express name | 2 tests | Good |
| Replace component | 4 tests | Good |
| Clear component | 1 test (l. 707-720) | None for clear-link-state edge cases |
| Delete row | implicit | None for focus management after delete |
| **Bulk delete** | **none for atomicity** | **ESC-P1-03 has no regression test** |
| **Move component** | **3 tests for happy path, none for atomicity** | **ESC-P0-01 has no regression test** |
| Make Project Component | none | full detach flow untested |
| Promote to library | none | full promote flow untested |
| Insert template | none for happy path | optimistic-revision gate untested |
| Insert project source | none | **ESC-P0-02 has no regression test** |
