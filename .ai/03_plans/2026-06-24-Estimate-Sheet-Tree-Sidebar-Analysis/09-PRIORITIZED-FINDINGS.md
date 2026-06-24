# 09 — Prioritized Findings

Each finding follows the spec template. Severity: P0 (data loss/corruption/security), P1 (major workflow/race), P2 (noticeable defect), P3 (polish). Confidence: High (verified by source read), Medium (inferred), Low (needs runtime confirmation).

---

## F-01 · Optimistic ID + Zustand getState() race during create

- **Classification**: HIGH-RISK IMPLEMENTATION / DATA-INTEGRITY RISK
- **Severity**: **P1**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Create Area while user changes selection concurrently
- **User impact**: After server confirms a create, the client reads `useEstimateWorkspaceState.getState()` synchronously (L887, L904-906, L918-920) to decide whether to remap selection/expansion. Between the optimistic create (L857) and the server echo, the user can collapse a folder. Post-create reconciliation may then re-expand it.
- **Technical impact**: Read-after-write race on Zustand store; violates React's "don't read external state during render/transition" contract.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:887-910 (expansion reconciliation), 918-923 (selection reconciliation)
- **Reproduction steps**:
  1. Click "Add Area" (creates optimistic id `opt-1`, sets `selectedNodeId = opt-1`)
  2. Before server responds, collapse the parent folder in the sidebar
  3. Server responds with `server-id-1`
  4. Reconciliation reads `useEstimateWorkspaceState.getState().expandedNodeIdsByTabId[activeTabId]` (L888-889); the optimistic id may still be in the stored list
  5. **Actual behavior**: Expansion reconciliation can resurrect a just-collapsed parent
- **Actual behavior**: Expansion reconciliation can resurrect a just-collapsed parent; selection reconciliation is mostly safe.
- **Expected behavior**: Reconciliation should diff against the captured snapshot from create-time, not against current live state.
- **Root cause**: Reading external store mid-promise instead of capturing a snapshot at mutation start.
- **Recommended correction**: Capture `previousSelectedNodeId`, `previousExpandedNodeIds` at `handleAddTreeNode` entry (L842). After server response, only remap if the current state still matches the captured optimistic id.
- **Dependencies**: None
- **Regression risks**: Create may fail to auto-select the new row in some legitimate flows.
- **Required tests**: Integration test: "create then change selection → server responds → selection preserved".
- **Complexity**: S

---

## F-02 · `getEstimateTreeContentSignature` includes all row-item fields → over-eager reconciliation

- **Classification**: PERFORMANCE RISK / INCONSISTENT BEHAVIOR
- **Severity**: **P1**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Sidebar prop sync (`syncLocalNodesFromProps`)
- **User impact**: ANY edit to ANY row item field (quantity, unit cost, supplier name, pricing date, etc.) anywhere in the tree changes the signature. The `useEffect` at L579-591 then runs `syncLocalNodesFromProps`, which replaces `localNodes` with the incoming `nodes` array. Mid-rename, mid-drag, or mid-create, this can clobber local optimistic state.
- **Technical impact**: Every row-level edit in the middle sheet triggers a sidebar-wide `setLocalNodes` via prop diffing. With deep trees this is an O(n) operation per row keystroke.
- **Evidence**: src/lib/estimates/estimate-tree-reorder.ts:234-273 — signature iterates `node.estimateRowItems` and serializes 19 fields per item; src/components/workshop/EstimateSheetTree.tsx:579-591 — effect that consumes the signature
- **Reproduction steps**:
  1. Open an estimate with at least one row item
  2. Begin renaming a tree node
  3. Have another tab edit a row's quantity
  4. Server pushes new `nodes` prop → signature differs → `syncLocalNodesFromProps` replaces localNodes mid-rename
- **Actual behavior**: Rename input loses focus / value depending on whether editingNodeId still maps to a node in the new tree.
- **Expected behavior**: Prop signature should track ONLY structural + identity fields (id, parent_id, kind, name, sortOrder), not full row detail.
- **Root cause**: Signature scope is wider than necessary. The `pendingReordersRef` integer gate (L585-588) only protects against in-flight tree mutations, not concurrent row edits.
- **Recommended correction**: Replace `getEstimateTreeContentSignature` with a STRUCTURE-only signature (use the existing `getEstimateTreeStructureSignature` at L221-232 plus a `name` field). Stop serializing row items.
- **Dependencies**: None
- **Regression risks**: Row-detail changes will no longer reconcile via this path; need to confirm the row-edit surface invalidates its own cache independently.
- **Required tests**: Unit test for signature stability across row-only changes.
- **Complexity**: M

---

## F-03 · `deleteEstimateNode` action issues TWO `refreshInsertedEstimateTree` calls

- **Classification**: PERFORMANCE RISK
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Server-side delete latency
- **User impact**: Every single-node delete pays for two tree fetches from Supabase. With large trees, this doubles perceived delete latency.
- **Technical impact**: Wasted DB query, wasted serialization, blocks the action's return value.
- **Evidence**: src/lib/estimates/actions.ts:2163 (pre-delete refresh) and 2177 (post-delete refresh). The pre-delete result is only used to compute a CLIENT-PROJECTED `planEstimateTreeDelete` at L2166, which is then returned as `deletePlan.deletedNodeIds` and `deletePlan.fallbackNodeId` (L2182-2184). The client overwrites these with `confirmed.tree` values from the post-delete call (entry file L1137-1143).
- **Reproduction steps**:
  1. Open estimate with 500+ nodes
  2. Delete a leaf node
  3. Observe server response time
- **Actual behavior**: ~2× the latency of a single tree fetch.
- **Expected behavior**: The pre-delete fetch is unnecessary; the client's projected plan is recomputed from the post-delete fetch's `confirmed.tree`.
- **Root cause**: Likely a vestige from when the action returned projected-vs-confirmed diffs.
- **Recommended correction**: Remove the pre-delete `refreshInsertedEstimateTree` call (L2163-2164) and the `currentTree`/`currentProject`/`currentEstimate` variables. Compute `deletePlan` from the post-delete confirmed tree (or drop the plan entirely and let the client compute it).
- **Dependencies**: None
- **Regression risks**: None — the pre-delete plan is overwritten by the post-delete confirmed values.
- **Required tests**: Existing delete tests should pass unchanged.
- **Complexity**: S

---

## F-04 · `buildSiblingUpdates` rewrites sortOrder for ALL siblings on every reorder

- **Classification**: PERFORMANCE RISK
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Reorder payload size
- **User impact**: Moving one node among 20 siblings sends 20 UPDATE rows in the RPC payload. Network + DB cost scales with sibling count, not with move scope.
- **Technical impact**: Larger payloads; more DB writes; more audit rows.
- **Evidence**: src/lib/estimates/estimate-tree-reorder.ts:199-207 — `buildSiblingUpdates` runs `(index + 1) * 10` for every child of each affected parent.
- **Reproduction steps**:
  1. Estimate with 30 root nodes
  2. Move root #5 to position #6
  3. Inspect network payload
- **Actual behavior**: 30 UPDATE rows sent.
- **Expected behavior**: 2 UPDATE rows (the moved node and the swapped neighbor) using fractional sortOrder or sparse rebalancing.
- **Root cause**: Eager full-sibling normalization instead of incremental update.
- **Recommended correction**: Use a fractional sortOrder scheme (e.g., midpoint between neighbors); periodically rebalance when values get too close. Or, send only the moved node's new sortOrder and let the DB RPC reorder on demand.
- **Dependencies**: Migration to change `sort_order` from integer to numeric/real; backfill.
- **Regression risks**: Existing tests assume integer sortOrder.
- **Required tests**: Reorder tests with 50+ siblings for payload size; reorder within sparse range.
- **Complexity**: M

---

## F-05 · `mergeEstimateTreeStructureWithCachedNodes` merge shape is fragile

- **Classification**: DATA-INTEGRITY RISK
- **Severity**: **P2**
- **Confidence**: Medium
- **Verification status**: HIGH-RISK IMPLEMENTATION (static)
- **Affected behavior**: Post-reorder tree reconciliation
- **User impact**: Currently safe (server kind wins), but future regressions are easy.
- **Technical impact**: Risk that future merge changes drop `kind` from the override list.
- **Evidence**: src/lib/estimates/estimate-tree-reorder.ts:291-300 — spread order is `{ ...mergedNode (cached), id: structureNode.id, kind: structureNode.kind, children: structureNode.children }`. If `kind` is later dropped, server-side kind changes won't propagate.
- **Actual behavior**: Currently correct.
- **Expected behavior**: Server values for identity + structural fields always win; client cache provides only the detail (name, total, row items) for unchanged nodes.
- **Root cause**: Fragile merge shape — easy to regress.
- **Recommended correction**: Invert the spread: take server node as the base, then layer cached detail fields. Add a test asserting that a kind change on the server propagates.
- **Complexity**: S

---

## F-06 · `deleteEstimateNode` returns CLIENT-PROJECTED deletedNodeIds/fallbackNodeId

- **Classification**: DATA-INTEGRITY RISK / INCONSISTENT BEHAVIOR
- **Severity**: **P1**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Delete reconciliation
- **User impact**: If the server RPC cascades differently than the client's `planEstimateTreeDelete` projection (e.g., server soft-archives children; client assumes hard-delete), the client receives an incorrect `deletedNodeIds` list.
- **Technical impact**: Selection desync; route URL can point to a deleted node.
- **Evidence**: src/lib/estimates/actions.ts:2166, 2182-2184 — returns `deletePlan.deletedNodeIds` from CLIENT projection, not server RPC output. src/components/workshop/EstimateSheetTree.tsx:1129-1143 — client uses these projected IDs to drive selection reconciliation.
- **Reproduction steps**:
  1. Server RPC archives instead of hard-deletes
  2. Client calls deleteEstimateNode
  3. Server returns confirmed.tree (still contains the "deleted" node, archived) and projected deletedNodeIds (containing the node id)
  4. Client sets localNodes = confirmed.tree (node visible) but treats node id as deleted for selection purposes
  5. Selection skips to fallback even though original is still in tree
- **Actual behavior**: Selection bounces to fallback when it doesn't need to.
- **Expected behavior**: Action should return server-authoritative deletedNodeIds (the RPC should output them).
- **Root cause**: RPC doesn't return deletedNodeIds; action projects them client-side.
- **Recommended correction**: Modify `delete_estimate_node_with_history` RPC to OUTPUT the actual deleted node IDs. Update action to use server values.
- **Dependencies**: DB migration to change RPC return shape.
- **Regression risks**: All delete callers must update to use server-provided list.
- **Required tests**: Integration test with archived-vs-deleted divergence.
- **Complexity**: M

---

## F-07 · `pendingPropNodesRef` holds at most ONE pending prop update

- **Classification**: DATA-INTEGRITY RISK / RACE CONDITION
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Concurrent server echoes during a reorder
- **User impact**: If two server echoes arrive while a third reorder is in flight, the second echo overwrites the first in `pendingPropNodesRef` (entry file L585-588) without being reconciled into localNodes.
- **Technical impact**: Lost server-side updates; tree drifts out of sync.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:407, 570-577 — single-valued ref, not a queue.
- **Reproduction steps**:
  1. Begin a slow reorder (saving state)
  2. Server echo #1 arrives (e.g., from a row edit by another user) → stored in pendingPropNodesRef
  3. Server echo #2 arrives → OVERWRITES echo #1 in pendingPropNodesRef
  4. Reorder completes → flush applies echo #2 only; echo #1 lost
- **Actual behavior**: Lost update for echo #1.
- **Expected behavior**: Queue all concurrent prop updates and apply in order.
- **Root cause**: Ref is single-valued, not FIFO.
- **Recommended correction**: Change `pendingPropNodesRef` to an array; flush in order in `finishPendingReorder`.
- **Complexity**: S

---

## F-08 · Rename failure rollback leaves user without input restoration in most cases

- **Classification**: INCONSISTENT BEHAVIOR
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Rename error recovery
- **User impact**: If a rename fails AND another user has changed the same node's name to a different value, the rename editor closes silently (entry file L1070-1073). The user's typed name is lost.
- **Technical impact**: Confused users; potential duplicate work.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:1062-1073 — rollback only reopens the editor if `currentNode?.name === nextName`.
- **Reproduction steps**:
  1. User A starts renaming node X from "Old" to "New"
  2. User B renames node X from "Old" to "UserB-New" concurrently
  3. User A's request fails with conflict
  4. currentNode.name is "UserB-New" (after cache refresh), not "New"
  5. Editor closes silently
- **Actual behavior**: Silent closure; lost rename draft.
- **Expected behavior**: Reopen editor with the user's typed name pre-filled so they can adjust and retry.
- **Root cause**: Rollback condition is too narrow.
- **Recommended correction**: Always reopen the editor on rename failure, pre-filled with the attempted name + error message.
- **Complexity**: S

---

## F-09 · Inline rename input uses hardcoded inline shadow + arbitrary rgba color

- **Classification**: INCONSISTENT BEHAVIOR (design system)
- **Severity**: **P3**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Rename input styling
- **User impact**: Visual jank — input has a custom `shadow-[inset_0_0_0_1px_rgba(255,122,26,0.14)]` (line 1431) that doesn't match the design system's `border-accent` token. Edit-mode row height (h-5 = 20px, leading-5 = 20px) MISMATCHES the display row (min-h-7 = 28px) — the input is 8px shorter than the row, causing icons next to it to shift.
- **Technical impact**: Fails `bun run lint:design-system` strict checks.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:1430-1433
- **Recommended correction**: Replace inline `shadow-[...]` with `shadow-accentSoft` token; ensure input height matches display row height (use h-7 not h-5); use design tokens for color.
- **Complexity**: S

---

## F-10 · `validateEstimateTreeHierarchy` is a no-op since P6 unification

- **Classification**: DATA-INTEGRITY RISK
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Client-side structural validation
- **User impact**: All cycle/cross-tab/missing-parent invariants are pushed to DB RPCs. If any RPC lacks a guard, the invariant is silently violated.
- **Technical impact**: Defense-in-depth removed.
- **Evidence**: src/components/workshop/estimate-tree-data.ts:404-416 — function visits every node but checks nothing (comment: "rows-on-non-area is no longer a hierarchy error. ... Cross-tab / cycle / missing-parent invariants remain enforced in the DB").
- **Actual behavior**: Client validation returns zero errors regardless of input.
- **Expected behavior**: Either restore meaningful client checks OR document that this function is intentionally a placeholder and audit each RPC.
- **Root cause**: P6 unification removed all client structural checks.
- **Recommended correction**: Audit `create_estimate_node_with_history`, `reorder_estimate_nodes_with_history`, `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history` RPC bodies (in `supabase/migrations/`) for: self-parent guard, descendant-cycle guard, cross-tab guard, max-depth guard, orphan prevention.
- **Complexity**: M

---

## F-11 · Tree primitive has NO keyboard alternative for drag-and-drop

- **Classification**: ACCESSIBILITY DEFECT
- **Severity**: **P1**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Reorder / reparent via keyboard
- **User impact**: Users who cannot use a mouse cannot move tree nodes. WCAG 2.1 SC 2.5.7 (Drag Movements) and SC 2.1.1 (Keyboard) violations.
- **Technical impact**: A11y compliance gap; legal exposure in some jurisdictions.
- **Evidence**: src/components/ui/tree.tsx:1086-1154 — `handleKeyDown` handles ArrowUp/Down/Left/Right/Home/End/Enter/Space only. No "cut/paste" style move.
- **Reproduction steps**: Try to reorder a node using only keyboard. Cannot.
- **Actual behavior**: Keyboard user cannot reorder or reparent.
- **Expected behavior**: Standard tree keyboard pattern: Ctrl+X to mark a node as "cut", navigate to target, Ctrl+V to drop inside; or similar accessible DnD alternative (WAI-ARIA Authoring Practices has examples).
- **Root cause**: Native HTML5 DnD has no keyboard semantics.
- **Recommended correction**: Add a "move" mode triggered by keyboard shortcut (e.g., Shift+Arrow moves focused node within siblings; Ctrl+X/Ctrl+V for reparenting).
- **Required tests**: Keyboard-only DnD e2e test.
- **Complexity**: L

---

## F-12 · No F2, no Shift+F10, no type-ahead in Tree keyboard

- **Classification**: ACCESSIBILITY DEFECT
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: MISSING FUNCTIONALITY (static)
- **Affected behavior**: Keyboard UX
- **User impact**: Power users can't rename via F2, can't open context menu via Shift+F10, can't jump via first-letter type-ahead.
- **Evidence**: Same as F-11. src/components/ui/tree.tsx:1086-1154
- **Recommended correction**: Add F2 dispatches a new `onRenameRequest(nodeId)` prop; Shift+F10 dispatches `onContextMenuRequest(nodeId)`; type-ahead maintains a buffer and jumps to next match.
- **Complexity**: M

---

## F-13 · No auto-scroll during drag

- **Classification**: UX DEFECT
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: MISSING FUNCTIONALITY (static)
- **Affected behavior**: Dragging beyond visible viewport
- **User impact**: Cannot drag a node beyond the visible viewport; user must manually scroll, drop, scroll more, drag again.
- **Evidence**: src/components/ui/tree.tsx — no auto-scroll logic in `handleDragOver` or anywhere else.
- **Recommended correction**: Add edge-proximity auto-scroll in `handleDragOver` when within 40px of scroll-parent top/bottom.
- **Complexity**: M

---

## F-14 · No hover-to-expand during drag

- **Classification**: UX DEFECT
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: MISSING FUNCTIONALITY (static)
- **Affected behavior**: Dropping into collapsed folders
- **User impact**: To drop into a collapsed folder, user must drop outside, expand the folder, then drag again.
- **Evidence**: src/components/ui/tree.tsx — no hover timer.
- **Recommended correction**: When `dropTarget.position === "inside"` on a collapsed folder for >500ms, call `handleToggle(flat.id)`.
- **Complexity**: S

---

## F-15 · Sidebar loading state is sidebar-wide toast, not per-row

- **Classification**: UX DEFECT
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: INCONSISTENT BEHAVIOR (static)
- **Affected behavior**: Mutation feedback
- **User impact**: Creating a node shows a toast but the new row has no pending indicator; deleting a row removes it instantly (optimistic) without showing what's happening. The whole sidebar feels "blocked" via `isTreeMutationSaving` (L660) even though only one row's mutation is in flight.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:660-661 — `isTreeMutationSaving` is true for ANY save/delete in flight, blocking ALL row interactions.
- **Recommended correction**: Per-row pending state (track `pendingNodeIds: Set<string>`); block only that row's interactions, not the whole tree.
- **Complexity**: M

---

## F-16 · Zustand store never cleaned up — memory leak across estimates

- **Classification**: PERFORMANCE RISK
- **Severity**: **P3**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Long-lived sessions
- **User impact**: Power user navigating through many estimates accumulates state for estimates they'll never revisit.
- **Evidence**: src/hooks/use-estimate-workspace-state.ts — `resetEstimateWorkspaceState` exists (L95-103) but is never called from the sidebar.
- **Recommended correction**: Add `clearEstimateState(estimateId)` and `clearTabState(tabId)`; call them on estimate unmount.
- **Complexity**: S

---

## F-17 · Stale selection from Zustand can resurrect on tab switch

- **Classification**: INCONSISTENT BEHAVIOR
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: HIGH-RISK IMPLEMENTATION (static)
- **Affected behavior**: Selection after tab switch
- **User impact**: Switch from tab A (where user selected node X) to tab B, then back to tab A — selection jumps back to X even if the URL or user intent pointed elsewhere.
- **Evidence**: src/hooks/use-estimate-workspace-state.ts:152 — `selectedNodeId: storeSelectedNodeId ?? routeSelectedNodeId`. The store value wins.
- **Recommended correction**: When switching tabs, validate that the stored selection still exists in the current tab's tree (already done via `pruneSelection` for bulk; not done for single selection). Or use URL as source of truth and treat store as a per-tab cache only.
- **Complexity**: M

---

## F-18 · Optimistic sortOrder numbering diverges between client and server

- **Classification**: DATA-INTEGRITY RISK
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Optimistic create vs server echo
- **User impact**: New node appears at the END of the sibling list optimistically (entry file `insertLocalEstimateTreeNode` L103-121 always appends). Server computes `initial_sort_order = maxSiblingSortOrder + 1` (action L2090-2097). Client uses multiples of 10 (estimate-tree-reorder.ts:204); server uses consecutive `maxSiblingSortOrder + 1` (action L2097). Next reorder will renumber ALL siblings, not just the moved node, because client computes `(index+1)*10` but server has values like 10, 20, 30, 31 → reorder plan will renumber to 10, 20, 30, 40 which is a 1-unit move but rewrites all 4 sortOrders.
- **Evidence**: src/lib/estimates/actions.ts:2090-2097 (server `+1`) vs src/lib/estimates/estimate-tree-reorder.ts:199-207 (client `(index+1)*10`). The schemes are incompatible (consecutive+1 vs multiple-of-10).
- **Recommended correction**: Standardize on multiples-of-10 on both sides. Server should use `(maxSiblingSortOrder + 10)` not `+1`.
- **Complexity**: S

---

## F-19 · Missing `assertCanEditEstimate` on 5 tree-mutation actions

- **Classification**: DATA-INTEGRITY RISK / SECURITY
- **Severity**: **P1**
- **Confidence**: Medium (depends on RLS coverage)
- **Verification status**: HIGH-RISK IMPLEMENTATION (static)
- **Affected behavior**: Permission enforcement
- **User impact**: Read-only / viewer-role users may attempt tree mutations; server returns RLS error from Supabase rather than a clean 403. Worse, if RLS has any gap, viewer can write.
- **Evidence**: src/lib/estimates/actions.ts — `createEstimateNode` (L2035-2128), `renameEstimateNode` (L2130-2153), `deleteEstimateNode` (L2155-2185), `deleteEstimateNodesBulk` (L2187-2261), `reorderEstimateTreeNodes` (L1372-1465) — none call `assertCanEditEstimate`. Contrast with `insertEstimateTemplateIntoEstimate` (L2296) which DOES.
- **Recommended correction**: Add `await assertCanEditEstimate(supabase, estimateId)` to each of the 5 actions.
- **Required tests**: Role-gated action test.
- **Complexity**: S

---

## F-20 · Mobile/tablet (≤1023px) sidebar is hidden, no alternative surface

- **Classification**: UX DEFECT / ACCESSIBILITY DEFECT
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: MISSING FUNCTIONALITY (static)
- **Affected behavior**: Responsive
- **User impact**: On tablet portrait or narrow desktop windows, the sidebar is `width: 0` (ResizableSidePanel L77, L234). Users have no way to navigate the tree, add areas, or see structure.
- **Evidence**: src/components/workshop/ResizableSidePanel.tsx:74-77
- **Recommended correction**: Add a mobile drawer / bottom-sheet variant; or a hamburger menu that toggles the sidebar into an overlay.
- **Complexity**: L

---

## F-21 · Empty state is invisible (rendered as `<span aria-hidden="true" />`)

- **Classification**: UX DEFECT
- **Severity**: **P2**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: First-time / empty-tab experience
- **User impact**: A new estimate or empty tab shows blank space with no prompt. Users must discover the "Add Branch" toolbar button elsewhere.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:1617 — `<emptyState={<span aria-hidden="true" />} />`
- **Recommended correction**: Replace with a centered call-to-action: "No areas yet. Click 'Add Branch' to create one."
- **Complexity**: S

---

## F-22 · ResizableSidePanel toggle has no `aria-controls`

- **Classification**: ACCESSIBILITY DEFECT
- **Severity**: **P3**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Screen reader usability
- **User impact**: AT users hear "Expand/Collapse Tree" button with `aria-expanded` but no `aria-controls` to associate the toggle with the panel it controls.
- **Evidence**: src/components/workshop/ResizableSidePanel.tsx:213-231
- **Recommended correction**: Generate a stable id on the `<aside>` and set `aria-controls={asideId}` on the toggle button.
- **Complexity**: S

---

## F-23 · `getEstimateRouteNodeIdFromPathname` parses URL naively

- **Classification**: DATA-INTEGRITY RISK
- **Severity**: **P3**
- **Confidence**: Medium
- **Verification status**: HIGH-RISK IMPLEMENTATION (static)
- **Affected behavior**: URL → node id parsing
- **User impact**: If a URL contains `estimates/` segment in an unexpected position (e.g., a query string, a nested route), the parser (entry file L357-369) picks the wrong segment.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:357-369 — `segments.indexOf("estimates")` returns the FIRST match.
- **Recommended correction**: Use Next.js `useParams()` hook instead of pathname parsing.
- **Complexity**: S

---

## F-24 · `commitRenameNode` sets editingNodeId=null BEFORE server response

- **Classification**: UX DEFECT
- **Severity**: **P3**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Rename flow
- **User impact**: The input closes immediately on Enter, leaving a placeholder row while the request is in flight. If the user wants to keep editing (e.g., the server is slow), they can't.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:1041
- **Recommended correction**: Keep editingNodeId intact during save; clear only after server response. Show a "saving" state on the row.
- **Complexity**: S

---

## F-25 · No scroll-into-view for newly created node

- **Classification**: UX DEFECT
- **Severity**: **P3**
- **Confidence**: High
- **Verification status**: MISSING FUNCTIONALITY (static)
- **Affected behavior**: Create flow when tree is scrolled or parent was collapsed
- **User impact**: Newly created node may be off-screen if the parent was just expanded (causing the tree to grow). User doesn't see the new row enter rename mode; rename input focuses off-screen.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:842-939 — no `scrollIntoView` or `rowVirtualizer.scrollToIndex` call after create.
- **Recommended correction**: After setting editingNodeId, call `scrollIntoView` on the rename input ref.
- **Complexity**: S

---

## F-26 · Context menu "Add area inside" creates new node as CHILD but doesn't show it as a sibling-first

- **Classification**: UX DEFECT
- **Severity**: **P3**
- **Confidence**: Medium
- **Verification status**: INFERENCE (static)
- **Affected behavior**: Context-menu create flow
- **User impact**: New child node is appended to the END of parent's children list. User might expect it at the top. Minor.
- **Evidence**: src/components/workshop/EstimateSheetTree.tsx:103-121 (`insertLocalEstimateTreeNode` always appends). Server uses `maxSiblingSortOrder + 1` (also appends).
- **Recommended correction**: Decide: top-of-list (most-recently-added-first) or bottom-of-list. Document either way.
- **Complexity**: S

---

## F-27 · `getEstimateTreeContentSignature` is O(n × m) per render where m = avg row items

- **Classification**: PERFORMANCE RISK
- **Severity**: **P3**
- **Confidence**: High
- **Verification status**: VERIFIED DEFECT (static)
- **Affected behavior**: Render performance with large trees + many row items
- **User impact**: Each prop change re-computes the signature by walking every node AND every row item. With 1000 nodes × 10 row items each, that's 10000 field serializations per render.
- **Evidence**: src/lib/estimates/estimate-tree-reorder.ts:234-273 — nested loop with JSON.stringify
- **Recommended correction**: Memoize the signature on the `nodes` reference; combine with F-02 correction (narrow scope) for compounding benefit.
- **Complexity**: S

---

## Owner, Deadline, and Acceptance Criteria Assignments

These are **planning artifacts, not commitments**. Owners are recommended roles (not named individuals); deadlines track the phase dates in `10-IMPLEMENTATION-PLAN.md` (P0=2026-06-26, P1=2026-07-01, P2=2026-07-06, P3=2026-07-08, P4=2026-07-11, P5=2026-07-18, P6=2026-07-28); acceptance criteria are binary observable pass conditions cited from `11-VALIDATION-PLAN.md` / `08-EDGE-CASE-AND-TEST-MATRIX.md`. Philip may reassign owners or shift deadlines. The five P1 rows quote `13-PLAN-AUDIT-AND-SCORECARD.md` §8 verbatim. Finding bodies above are unchanged.

| ID | Severity | Owner (recommended role) | Decision deadline | Acceptance criterion (binary observable) |
|---|---|---|---|---|
| F-01 | P1 | Frontend Lead | 2026-07-08 | "Create then change selection → server responds → selection preserved" passes (EC-006, `estimate-sheet-tree-create-race.test.tsx`) |
| F-02 | P1 | Frontend Lead, Backend Lead | 2026-07-06 | Row-only field edit does NOT trigger `syncLocalNodesFromProps` |
| F-03 | P2 | Backend Lead | 2026-07-06 | `deleteEstimateNode` issues exactly ONE `refreshInsertedEstimateTree` call; existing delete vitest suite green |
| F-04 | P2 | Backend Lead, DB/Migration Lead | 2026-07-06 | Reorder of 1 node among 50 siblings sends ≤2 UPDATE rows in RPC payload |
| F-05 | P2 | Backend Lead | 2026-07-06 | Server `kind` change propagates through `mergeEstimateTreeStructureWithCachedNodes` (merged.kind === server.kind) |
| F-06 | P1 | Backend Lead, DB/Migration Lead | 2026-07-01 | Server RPC returns authoritative `deletedNodeIds`; client uses server values (EC-022, `estimate-tree-delete-cascade.test.ts`) |
| F-07 | P2 | Frontend Lead | 2026-07-08 | Two server echoes during an in-flight reorder both apply in arrival order (`pendingPropNodesRef` is FIFO) |
| F-08 | P2 | Frontend Lead | 2026-07-08 | On rename failure `editingNodeId` is re-set to the failed node AND input pre-filled with attempted name |
| F-09 | P3 | Frontend Lead | 2026-06-26 | `bun run lint:design-system` exits 0 on rename input AND input class is `h-7` (not `h-5`) |
| F-10 | P2 | Backend Lead, DB/Migration Lead | 2026-07-01 | Audit artifact: 4 RPCs × 5 invariants (self-parent, cycle, cross-tab, max-depth, orphan) each enforced |
| F-11 | P1 | A11y Specialist, Frontend Lead | 2026-07-18 | Keyboard-only user can move a node via Ctrl+X / Ctrl+V or Shift+Arrow (EC-040, `estimate-tree-keyboard-dnd.spec.ts`) |
| F-12 | P2 | A11y Specialist, Frontend Lead | 2026-07-18 | F2→`onRenameRequest`, Shift+F10→`onContextMenuRequest`, type-ahead→next match (tests green) |
| F-13 | P2 | Frontend Lead | 2026-07-28 | `scrollParent.scrollTop` changes when dragging within 40px of scroll-parent edge |
| F-14 | P2 | Frontend Lead | 2026-07-28 | Collapsed folder with `dropTarget.position === "inside"` for >500ms calls `handleToggle` |
| F-15 | P2 | Frontend Lead | 2026-07-11 | Only the mutating row is blocked (`pendingNodeIds` holds its id); sibling rows stay interactive |
| F-16 | P3 | Frontend Lead | 2026-07-28 | Store entry count for an `estimateId` is 0 after `clearEstimateState(estimateId)` on unmount |
| F-17 | P2 | Frontend Lead | 2026-07-28 | EC-044: `selectedNodeId` after a tab round-trip exists in current tab tree or is null |
| F-18 | P2 | Backend Lead | 2026-07-01 | New node server-side `sort_order === maxSiblingSortOrder + 10` (not `+1`) |
| F-19 | P1 | Backend Lead | 2026-07-01 | All 5 actions reject viewer-role with clean 403 before RPC call (EC-052, `estimate-tree-permission-gate.test.ts`) |
| F-20 | P2 | Frontend Lead | 2026-07-28 | E2E at ≤1023px: sidebar reachable via drawer/overlay toggle; ≥1 tree row visible |
| F-21 | P2 | Frontend Lead | 2026-06-26 | Empty state renders a visible (non-`aria-hidden`) CTA element (e.g. "Add Branch") |
| F-22 | P3 | A11y Specialist, Frontend Lead | 2026-06-26 | Toggle button `aria-controls` === `<aside>` element `id` |
| F-23 | P3 | Frontend Lead | 2026-06-26 | Node-id resolution uses `useParams`; no `pathname.indexOf("estimates")` |
| F-24 | P3 | Frontend Lead | 2026-06-26 | `editingNodeId` stays non-null while rename RPC in flight; "saving" indicator renders |
| F-25 | P3 | Frontend Lead | 2026-06-26 | New node's rename input is scrolled into the visible viewport after `handleAddTreeNode` |
| F-26 | P3 | Frontend Lead | 2026-06-26 | Top-vs-bottom decision recorded in `12-OPEN-QUESTIONS-AND-DECISIONS.md`; new-child index matches decision |
| F-27 | P3 | Backend Lead | 2026-07-06 | Signature memoized on `nodes` reference; not recomputed on row-item-only change |

---

## Severity Summary

| Severity | Count | IDs |
|---|---|---|
| P0 | 0 | — |
| P1 | 5 | F-01, F-02, F-06, F-11, F-19 |
| P2 | 13 | F-03, F-04, F-05, F-07, F-08, F-10, F-12, F-13, F-14, F-15, F-17, F-18, F-20, F-21 |
| P3 | 9 | F-09, F-16, F-22, F-23, F-24, F-25, F-26, F-27 |

## Five Most Consequential Problems

1. **F-02** — Over-eager content signature causes row-edit ↔ sidebar interference. Touches every keystroke in the cost grid.
2. **F-11** — No keyboard alternative to drag-and-drop. A11y blocker; legal exposure.
3. **F-19** — Missing `assertCanEditEstimate` on tree mutations. Potential privilege escalation if RLS has gaps.
4. **F-06** — Delete returns client-projected deletedNodeIds. Selection desync after delete.
5. **F-01** — Optimistic-create + Zustand getState() race. Edge-case but data-integrity risk.
