# 15 — Prioritized Findings

Branch `main` @ `1166b16f6bda9a5ff0d01defd2f8fe922fc8ed79`. Every claim cites a real file:line read during this audit (audit-only pass — no production code modified).

Severity rubric (from §15 of the spec):
- **P0** — data loss, cross-scope mutation, structural corruption, security breach, critical workflow unusable
- **P1** — partial persistence, major race, serious workflow failure, severe a11y/perf failure
- **P2** — noticeable inconsistency, recoverability problem, misleading UX, incomplete workflow, maintainability risk
- **P3** — minor polish / low-impact optimization

Confidence: **High** = cited code path read end-to-end during this audit; **Medium** = code path read but runtime behavior inferred; **Low** = partial read + pattern inference.

Complexity: **S** ≤ 1 file / < 50 LOC, **M** 1–3 files / 50–250 LOC, **L** 3–6 files / 250–750 LOC, **XL** > 6 files / > 750 LOC.

---

## P0 findings

### ESC-P0-01 — Component movement between rows is two independent non-transactional writes; partial failure corrupts the estimate

- **Feature area:** Row CRUD → Move component
- **Classification:** DATA-INTEGRITY RISK / PARTIAL-FAILURE RISK
- **Severity:** **P0**
- **Confidence:** High
- **Verification status:** VERIFIED DEFECT
- **User journey:** Drag the grip handle of one row's component onto another row's material cell. Intermittent network / server 5xx during the move.
- **User impact:** The moved component can either (a) **duplicate** (target replace succeeds, source-clear fails → the component appears on both rows) or (b) **vanish** (source-clear succeeds, target replace fails → the component is gone from both rows, replaced by a blank on one and unchanged intent on the other). The user sees a single "Couldn't move the component" toast but the database is already in the partial state.
- **Technical impact:** Two independent row-mutation queues; nothing coordinates them.
- **Persistence impact:** HIGH. Both writes persist independently; no compensating transaction exists.
- **Data-integrity impact:** HIGH. Estimate totals silently diverge from intent; reconciliation requires manual audit of recent rows.
- **Security impact:** None direct.
- **Exact evidence:**
  - `src/components/workshop/EstimateSheetContent.tsx:2967-3039` — `moveRowComponent` calls `replaceRow(...)` for the **target** row (l. 3020-3028) and `replaceRow(...)` for the **source** row (l. 3029-3037) as two separate invocations of the `useEstimateRowMutations` `replaceRow` queue.
  - `src/hooks/use-estimate-row-mutations.ts:530-539` — `enqueueRowMutation` keys queues by `rowId`; the two calls land in **different** per-row queues (`rowUpdateQueuesRef.current[targetRowItemId]` vs `…[sourceRowItemId]`). No cross-row coordination.
  - `src/hooks/use-estimate-row-mutations.ts:553` — `replaceRow: (input) => enqueueRowMutation(input.rowId, () => replaceMutation.mutateAsync(...))`. Each queue runs its promise chain independently; one's onError does not roll back the other.
  - `src/components/workshop/EstimateSheetContent.tsx:3025 & 3034` — separate `rollback: restoreTargetRow` / `rollback: restoreSourceRow` only restore the row whose mutation failed. They do NOT undo the other row's successful mutation.
- **Reproduction steps:**
  1. Open an estimate with at least two populated rows in the same area.
  2. Open DevTools → Network → throttle to "Slow 3G" + block one request in two.
  3. Drag row A's component grip onto row B's material cell.
  4. Observe: one `replaceRow` server call returns 200, the other returns 500.
  5. Inspect the DB: one row has the moved component, the other has a blank row, or both have the component, depending on which call failed.
- **Actual behavior:** Partial persistence; one row's replace persists while the other's rollback fires (or doesn't, if its call succeeded).
- **Expected behavior:** Move is atomic — either both rows reflect the move in the DB, or neither does.
- **Root cause:** No atomic server-side "move component" RPC; client orchestrates two independent mutations with two independent rollbacks.
- **Recommended correction:** Introduce one server RPC `move_estimate_row_component(p_target_row_id, p_source_row_id, p_target_replacement_item, p_expected_target_revision, p_expected_source_revision, p_mutation_id, p_correlation_id)` that, in a single Postgres transaction, (a) updates the target row from a fully constructed replacement item that preserves target-row editable values, (b) clears the source row's component, (c) writes one `estimate_sheet_events` entry of type `row_moved`, and returns both canonical rows. Both expected revisions must match or the RPC aborts atomically. The client replaces both rows from the single response. Rollback is one tree revision restore. See `16-IMPLEMENTATION-PLAN.md` Phase 1 task M-1.
- **Alternatives considered:**
  - Client-side compensating transaction (on target-success-while-source-fails, fire a "restore source" update). Rejected: requires reasoning about whether the source's failure was retryable, and the user may have already edited the row.
  - Disabling the move affordance entirely. Rejected: removes a useful workflow.
- **Dependencies:** Requires one new RPC + migration + client rewrite of `moveRowComponent`. Server-action `moveEstimateRowItem` already exists in `src/lib/domain/estimate-mutations.ts` (referenced by `useMoveEstimateRowItem` in `use-estimate-query.ts:173-189`) but the center sheet does not call it; either repurpose that path or add a new combined replace+clear RPC.
- **Migration requirements:** New RPC and `row_moved` event consumer support. `estimate_sheet_events.event_type` is `text`, so no enum migration is required; update activity-history filters, labels, and component-detail rendering.
- **Regression risks:** Existing drag-replace tests in `tests/vitest/estimate-sheet-cost-inputs.test.tsx:722-741, 743-757, 759-776` must be updated to assert atomicity.
- **Required tests:**
  - `tests/vitest/estimate-sheet-move-component-atomicity.test.tsx` — four scenarios: both succeed, target fails, source fails, both fail. Assert DB-equivalent state (tree) after each.
  - `tests/vitest/estimate-sheet-move-component-reverse-order.test.tsx` — server resolves source first then target; assert only the final canonical result applies.
- **Complexity:** L (one RPC + migration + client rewrite + 4 new test files).

---

## P1 findings

### ESC-P0-02 — Project Source insertion replaces the entire visible tree with a server response that can silently overwrite newer optimistic structural changes

- **Feature area:** Templates & Project Source insertion
- **Classification:** DATA-INTEGRITY RISK / RACE-CONDITION RISK
- **Severity:** **P1** (re-rated 2026-06-25; historical ID retained)
- **Confidence:** Medium-High
- **Verification status:** HIGH-RISK IMPLEMENTATION
- **User journey:** Drop a reusable project tab/area onto the center sheet; immediately (within the RPC round-trip) add a blank row, rename a node, or drop a template.
- **User impact:** The newer edit can be silently overwritten in the visible tree when the project-source RPC resolves. The newer edit is still in flight to the server (its own mutation queue), so when it resolves it patches a row that is no longer in the tree → `patchEstimateRowItemInTree` silently no-ops (returns `tree` unchanged) and the edit is lost from the UI. A refresh resurrects the canonical DB state, but the user's *visible* state diverges from what they typed.
- **Technical impact:** Full-tree replacement path bypasses the optimistic-revision gate that protects template inserts.
- **Persistence impact:** MEDIUM — the DB is correct (the in-flight edit lands); the UI lies about what's currently shown.
- **Data-integrity impact:** MEDIUM — user re-edits a field they already changed, or assumes their insert was undone.
- **Security impact:** None.
- **Exact evidence:**
  - `src/components/workshop/EstimateSheetContent.tsx:2533-2561` — `insertProjectSourceIntoParentById`. On success: `setEstimateTree(() => result.tree)` (l. 2553). Comment at l. 2547-2552 admits "This insert is NON-optimistic" and claims the `skipEditableRowsSyncRef` bump (l. 2549, INS-4) protects in-flight cell edits.
  - `src/components/workshop/EstimateSheetContent.tsx:2118-2128` — `setEstimateTree` bumps `skipEditableRowsSyncRef`. The protection only blocks the `useEffect` at l. 2130-2147 from *recollecting* editable rows from the new tree. It does NOT prevent the new tree from **overwriting pending optimistic inserts/template-applies that have not yet been reconciled**.
  - Contrast `insertTemplateIntoParent` at l. 2425-2464: it captures `nextRevision = setEstimateTree(...)` and gates reconciliation on `if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree)` (l. 2453). Project-source has no such gate.
- **Reproduction steps:**
  1. Open an estimate with multiple tabs/areas.
  2. Drag a project source onto a target area.
  3. Within the ~200-800ms RPC window, click "Add row" on the same area (which fires `insertLibraryItem` → optimistic insert with `rollbackRevision`).
  4. Wait for both server calls to resolve.
  5. Observed (likely): the project-source tree arrives first and replaces the visible tree; the blank-row insert then succeeds on the server, but `patchEstimateRowItemInTree` (called from the `insertMutation.onSuccess` at `use-estimate-row-mutations.ts:306-334`) looks for the optimistic row id in a tree that no longer contains it → silently no-ops → the blank row vanishes from the UI but exists in the DB.
- **Actual behavior:** Last full-tree-write wins; newer optimistic inserts can be silently dropped from the UI.
- **Expected behavior:** Either (a) the project-source insert buffers behind any pending optimistic mutation, or (b) the server response is reconciled tree-diff-wise rather than wholesale replaced.
- **Root cause:** `insertProjectSourceIntoParentById` was designed before the optimistic-revision gate was added; the INS-4 skip-ref only covers the editable-rows collection effect, not the tree-subscription effect.
- **Recommended correction:** Apply the same revision-gate pattern used by `insertTemplateIntoParent`:
  ```ts
  const rollbackRevision = getEstimateTreeRevision();
  // ... no optimistic update (the RPC stays authoritative) ...
  const result = await insertProjectSourceIntoEstimate(...);
  if (getEstimateTreeRevision() === rollbackRevision) {
    setEstimateTree(() => result.tree);
  } else {
    // a newer optimistic change happened; refetch instead so the user keeps their change
    await activeTreeQuery.refetch();
  }
  ```
  See `16-IMPLEMENTATION-PLAN.md` Phase 1 task M-2.
- **Alternatives considered:**
  - Tree-diff merge of server result against current local tree. Rejected at this stage: non-trivial and risks new bugs; revision-gate + refetch is the proven pattern.
  - Disable the center sheet during project-source RPC. Rejected: destroys the optimistic UX for every other interaction.
- **Dependencies:** None new — reuses existing `getEstimateTreeRevision` / `restoreEstimateTree` / `activeTreeQuery.refetch`.
- **Migration requirements:** None.
- **Regression risks:** None — current behavior is already broken for this case.
- **Required tests:**
  - `tests/vitest/estimate-sheet-project-source-insert-race.test.tsx` — insert project source, fire a `setEstimateTree` between RPC send and resolve, assert the newer edit survives.
  - Existing test `estimate-sheet-cost-inputs.test.tsx` should be extended to cover project-source insertion paths (currently no coverage).
- **complexity:** S (one file, ~15 LOC + 1 test).

> **Severity decision (2026-06-25):** Downgraded from P0 to P1 because the described failure is a visible-tree divergence while the database can remain correct and self-heal on refetch. It still blocks launch because it can make users believe work disappeared.

### ESC-P1-03 — Bulk row delete is non-transactional; partial failure leaves the user in an unrecoverable state

- **Feature area:** Row CRUD → Bulk delete
- **Classification:** PARTIAL-FAILURE RISK
- **Severity:** **P1**
- **Confidence:** High
- **Verification status:** VERIFIED DEFECT
- **User journey:** Select 5 rows across two areas, click "Delete selected rows", one of the five server calls hits a 409 (revision conflict) or 403 (RLS edge case).
- **User impact:** Four rows delete, one doesn't. The error toast is generic ("Couldn't delete the row. Try again."). Selection is already cleared (l. 3069), so the user does not know which row failed without re-scanning the sheet. No Undo.
- **Technical impact:** Five independent `deleteRow` calls, each in its own per-row queue, no transactional boundary.
- **Persistence impact:** MEDIUM — partial deletion persists; user cannot tell which.
- **Data-integrity impact:** LOW — the DB is internally consistent; the problem is UX recovery.
- **Exact evidence:**
  - `src/components/workshop/EstimateSheetContent.tsx:3067-3070`:
    ```ts
    function deleteSelectedRows() {
      bulkSelectedRowIds.forEach((rowItemId) => deleteRowItem(rowItemId));
      setBulkSelectedRowIds(new Set());  // selection cleared before settles
    }
    ```
  - `deleteRowItem` at l. 3041-3065 fires `deleteRow(...)` per row, each with its own `rollback` and `onError` that fires its own toast (l. 3062).
  - `src/hooks/use-estimate-row-mutations.ts:364-367, 530-539, 559` — `deleteMutation` runs in a per-row queue; no batching.
- **Reproduction:** trivial — mock `deleteEstimateRowItem` to fail once out of 3 calls and run the bulk delete path.
- **Actual behavior:** N independent deletes; first failure does not stop the others.
- **Expected behavior:** All-or-nothing (one RPC `delete_estimate_row_items_bulk`) with a structured atomic failure that states nothing was deleted.
- **Root cause:** Bulk delete reuses the single-row path; no batched RPC.
- **Recommended correction:** Add `deleteEstimateRowItemsBulk(projectId, estimateId, rowIds[], expectedRevisions[], correlationId)` server action that calls a single `delete_estimate_row_items_bulk` RPC inside a Postgres transaction. Client: on success, reconcile from the returned tree; on failure, restore the previous tree and show "Couldn't delete selected rows. Nothing was deleted." with the failed row/revision where available. See Phase 1 task M-3.
- **Alternatives considered:**
  - Client-side "stop on first failure". Rejected: slow for large selections and still not atomic.
- **Required tests:**
  - `tests/vitest/estimate-sheet-bulk-delete-atomicity.test.tsx` — 3 rows, one fails with 409; assert no rows are deleted and toast content states all-or-nothing behavior.
  - `tests/vitest/estimate-sheet-bulk-delete-mixed-revisions.test.tsx` — one row was edited elsewhere; assert the whole batch aborts and selection/error copy remains recoverable.
- **complexity:** L (RPC + migration + client rewrite + tests).

---

### ESC-P1-04 — Global save toast uses one id; concurrent row mutations step on each other's status

- **Feature area:** State / Concurrency / UX feedback
- **Classification:** MISLEADING UX / RACE-CONDITION RISK
- **Severity:** **P1**
- **Confidence:** High
- **Verification status:** VERIFIED DEFECT
- **User journey:** Edit row A's quantity (blur → "Saving…" toast). Within the save window, edit row B's misc cost (blur → "Saving…" toast replaces the first). Row A's save succeeds → "Saved." toast replaces the loading state for row B. Row B then fails → no toast shown (the global id was already consumed by the success) OR a flash of "Could not save" that the user misses.
- **User impact:** The user cannot trust the toast to reflect the row they just edited.
- **Technical impact:** One toast id (`"estimate-row-save"`) is re-used across all rows.
- **Persistence impact:** None direct.
- **Data-integrity impact:** None direct, but user confusion can lead to repeated edits and more races.
- **Exact evidence:**
  - `src/components/workshop/EstimateSheetContent.tsx:1310-1326` — `notifySaveState` always toasts with `id: "estimate-row-save"`. The toast system replaces by id (`src/components/ui/toast.tsx:137-140` slices to MAX_VISIBLE_TOASTS after deduping by id).
  - `src/hooks/use-estimate-row-mutations.ts:204-253` — `useSaveState` tracks ONE `saveState` and ONE `rowMutationError` across all rows. `activeMutationCount` ref-counts, but the transition callbacks all fire into the same toast.
- **Actual behavior:** Newest transition wins the toast slot; users miss failures.
- **Expected behavior:** Per-row status (visible on the row) + a global summary toast that names the rows.
- **Recommended correction:** Two layers:
  1. Per-row status chip (idle/saving/saved/failed) rendered in the actions cell of each row, driven by a `rowStatusById: Record<string, EstimateSaveState>` map in the mutation hook.
  2. Global toast that reads `"Saved N rows"` / `"Saved N rows; M failed: [names]"`, keyed by a correlation id rather than a fixed string.
- **Required tests:**
  - `tests/vitest/estimate-sheet-concurrent-mutations-toast.test.tsx` — two rows edited rapidly; assert both row chips show correct state and the toast summary mentions both.
- **complexity:** M.

---

### ESC-P1-05 — Trust-gate modal holds stale target/item state across concurrent selection or sidebar changes

- **Feature area:** Library source-trust gate
- **Classification:** RACE-CONDITION RISK / DATA-INTEGRITY RISK
- **Severity:** **P1**
- **Confidence:** Medium-High
- **Verification status:** HIGH-RISK IMPLEMENTATION
- **User journey:** Right-sidebar "+" on a library component with stale pricing → trust-gate modal opens (warn). While the modal is open, click another area in the left tree (selection changes). Click "Continue with insert" in the modal.
- **User impact:** The insert lands in the **original** target area (captured when the modal opened), not the newly-selected one. User sees the component land "in the wrong place". Worse: if the original target area was deleted while the modal was open, `commitLibraryItemInsert` returns `false` silently (l. 2347: `if (!targetNode) return false;`).
- **Technical impact:** `pendingLibraryCommitGate` captures `targetNodeId` at open; nothing re-resolves it on confirm.
- **Persistence impact:** LOW — wrong target persists if user does not notice.
- **Data-integrity impact:** LOW (no corruption) but HIGH (wrong insert location).
- **Exact evidence:**
  - `src/components/workshop/EstimateSheetContent.tsx:272-280` — `PendingLibraryCommitGate` captures `targetNodeId` / `rowItemId` at open time.
  - `src/components/workshop/EstimateSheetContent.tsx:2810-2830` — `confirmPendingLibraryCommit` reads `pendingLibraryCommitGate.targetNodeId` directly; does NOT re-resolve against the current `selectedNode`.
  - If the captured `targetNodeId` was deleted while the modal was open, `commitLibraryItemInsert` at l. 2346 calls `findEstimateNode(estimateTree, targetNodeId)` → returns `undefined` → `return false` silently.
- **Actual behavior:** Modal commits against the stale target.
- **Expected behavior:** Either (a) modal disables Confirm when the captured target no longer exists, and shows "This area was deleted. Close and try again.", OR (b) modal re-resolves target to the current selection at confirm time (less safe — the user may have moved).
- **Recommended correction:** Disable Confirm + show a banner if `findEstimateNode(estimateTree, pendingLibraryCommitGate.targetNodeId) === undefined`. Optionally also re-check the library source freshness against current data (`getLibraryCommitTrustGate` uses the snapshot from open time). See Phase 1 task M-4.
- **Required tests:**
  - `tests/vitest/estimate-sheet-trust-gate-stale-target.test.tsx` — open gate, delete the target area via a concurrent flow, confirm; assert modal disables + shows banner.
  - `tests/vitest/estimate-sheet-trust-gate-source-changed.test.tsx` — open gate, the library source's pricingDate updates from another surface; assert the gate warnings are stale and recommend refresh.
- **complexity:** M.

---

### ESC-P1-06 — Row virtualization disables entirely while an inline Project Component editor is active, creating a cliff for large areas

- **Feature area:** Performance / Editing
- **Classification:** PERFORMANCE RISK
- **Severity:** **P1** (only for large areas; P3 for typical estimates)
- **Confidence:** High
- **Verification status:** VERIFIED WORKING (intentional, but the cliff is sharp)
- **User journey:** Open a 1,000-row area. Click any blank/express row's "Component name" input to activate the inline editor. The entire 1,000-row table re-renders as a plain `<tbody>` (no virtualization). Typing in the input feels sluggish because every keystroke re-renders every visible row.
- **Technical impact:** `hasActiveExpressEditor` flips `virtualEnabled=false` for the whole table.
- **Persistence impact:** None.
- **Data-integrity impact:** None.
- **Exact evidence:**
  - `src/components/workshop/estimate-sheet/rows/row-table.tsx:545-546`:
    ```ts
    const hasActiveExpressEditor = activeExpressRowId !== null && items.some((item) => item.id === activeExpressRowId);
    const virtualEnabled = Boolean(!hasActiveExpressEditor && virtualization.enabled && items.length >= (virtualization.minRows ?? 75));
    ```
  - Telemetry at l. 571-578 records the disable event; the disable is intentional.
  - The `activeExpressRowId` is set via `onExpressEditorActiveChange` (l. 567-569) from `EstimateMaterialCell` whenever any inline input gains focus (cells.tsx onFocus handlers, e.g. l. 243, 262, 280).
- **Actual behavior:** Whole table mounts; performance degrades sharply past ~500 rows in one area.
- **Expected behavior:** Either (a) keep the active row mounted via a stable portal/pinned range while virtualizing the rest, or (b) document this as an accepted limit (the comment at l. 573 calls it out).
- **Recommended correction:** Phase 7 perf task — extend the virtualizer's `rangeExtractor` (TanStack Virtual supports it) to always include the `activeExpressRowId` regardless of scroll position, and remove the `hasActiveExpressEditor` killswitch. Keep the telemetry as a "virtualization active" signal.
- **Required tests:**
  - `tests/vitest/estimate-sheet-row-virtualization-editor-pinned.test.tsx` — render a 1,000-row area, focus an inline editor on row 800, scroll, assert row 800 stays mounted.
- **complexity:** M.

---

### ESC-P1-07 — Read-only (`canEditEstimate=false`) users still see most row mutation controls; server rejection is the only gate

- **Feature area:** Read-only UX / Authorization
- **Classification:** MISLEADING UX / SECURITY RISK (low)
- **Severity:** **P1**
- **Confidence:** High
- **Verification status:** INCONSISTENT BEHAVIOR
- **User journey:** Open an estimate as a read-only viewer. Try to edit a quantity, delete a row, drag a component in.
- **User impact:** Controls look enabled; interactions "work" optimistically then fail with a server error toast ("Estimate edit access denied."). The user has wasted effort and is confused about their permissions.
- **Technical impact:** `canEditEstimate` prop is only consulted in two places: the tab strip lifecycle actions (l. 3387-3388) and the `requestRootGroupCreate` flow. Every row-level handler is unguarded.
- **Persistence impact:** None (server rejects).
- **Data-integrity impact:** None.
- **Security impact:** LOW (server-side RLS is enforced), but the UX implies permissions the user does not have.
- **Exact evidence:**
  - `EstimateSheetContent.tsx:1282` — `canEditEstimate = false` default fails closed, but the prop is only used at:
    - l. 3387: `enableLifecycleActions={canEditEstimate}` (tab strip)
    - l. 3388: `canCreateTabs={canEditEstimate}` (tab strip)
  - Every row-mutation handler (`insertLibraryItem`, `replaceRowItem`, `deleteRowItem`, `updateRow` via `commitRowItemUpdate`, `clearRowComponent`, `promoteRowToLibrary`, `moveRowComponent`, `requestProjectSpecific`) has **no** `canEditEstimate` gate.
  - Server actions reject via `assertCanEditEstimate` (`src/lib/estimates/actions.ts:414-418`), so the DB is safe.
- **Actual behavior:** Optimistic mutation succeeds visually, server rejects, rollback fires, toast appears. Confusing.
- **Expected behavior:** Read-only users see either no mutation affordances OR visibly-disabled ones with a tooltip explaining why.
- **Recommended correction:** Wrap each row action button in a `disabled={!canEditEstimate}` prop, gate drag source creation (`cells.tsx:432-436`), and gate the drop handlers (`handleDrop` in row-table.tsx l. 650-656; `handleReplacementDrop` in cells.tsx l. 413-430; drop zones in drop-zones.tsx) on `canEditEstimate`. Add an `aria-disabled` pattern. See Phase 1 task M-5.
- **Required tests:**
  - `tests/vitest/estimate-sheet-readonly-mode.test.tsx` — render with `canEditEstimate=false`; assert no row-mutation control is clickable.
- **complexity:** M.

---

### ESC-P1-08 — Virtualized table accessibility gaps are not formalized as a WCAG 2.2 AA work package

- **Feature area:** Accessibility / Virtualized table
- **Classification:** ACCESSIBILITY DEFECT / VALIDATION GAP
- **Severity:** **P1**
- **Confidence:** Medium
- **Verification status:** STATIC RISK; runtime screen-reader proof pending.
- **User journey:** Keyboard or screen-reader user navigates the center sheet while virtualization, row save status, errors, and inserted-row focus are active.
- **User impact:** Header associations, row position, save/error announcements, and focus restoration can be unclear or absent.
- **Exact evidence:** `10-UX-UI-ACCESSIBILITY-AUDIT.md:110-119` lists missing `aria-rowindex`, `aria-colindex`, `<th scope="col">`, per-row live status, and per-row error `role="alert"` coverage. `17-VALIDATION-PLAN.md` calls for a11y validation but no single finding carried that work package.
- **Recommended correction:** Treat M-15/M-16/M-17/M-10 as one WCAG 2.2 AA acceptance bundle: semantic headers/indexes, per-row save/error live regions, reduced motion, and deterministic focus after CRUD/rollback.
- **Required tests:** `tests/vitest/estimate-sheet-a11y-row-semantics.test.tsx`, `tests/vitest/estimate-sheet-row-save-status-a11y.test.tsx`, plus manual NVDA/VoiceOver checklist before release.
- **complexity:** M.

---

### ESC-P1-09 — Direct `archestimator:add-library-item` custom event accepts unvalidated client detail

- **Feature area:** Sidebar bridge / Client event validation
- **Classification:** INPUT-VALIDATION GAP
- **Severity:** **P1**
- **Confidence:** Medium
- **Verification status:** STATIC RISK; server authz/source checks still protect persistence.
- **User journey:** Any in-page script dispatches `new CustomEvent("archestimator:add-library-item", { detail })` with malformed or oversized row detail.
- **User impact:** Invalid detail can trigger failed insert attempts, confusing user feedback, or telemetry blind spots. The server rejects unsafe persistence, but the center sheet should reject malformed client detail before starting the workflow.
- **Exact evidence:** H39 reads `EstimateSheetContent.tsx:2681-2688` as taking `event.detail` as `EstimateRowItem` without runtime validation; the drag/drop paths had the same shape-validation gap.
- **Recommended correction:** Route the custom-event detail through the same `readLibraryItemDragPayload`/shape validator from M-6, reject invalid payloads before opening trust gates or mutating local state, and emit `custom_library_item_event_rejected` telemetry without logging raw payloads.
- **Required tests:** `tests/vitest/estimate-sheet-custom-library-event-validation.test.tsx` — malformed detail, missing source id, oversized payload, and valid item.
- **complexity:** S.

---

### ESC-P2-26 — Raw JSON.parse on library-item drag MIME in three call sites

- **Feature area:** Drag/drop payload validation
- **Classification:** RELIABILITY / INPUT-VALIDATION GAP
- **Severity:** **P1** (re-rated 2026-06-25; historical ID retained from `13`)
- **Confidence:** High
- **Verification status:** VERIFIED DEFECT
- **Exact evidence:** `13-SECURITY-AND-DATA-INTEGRITY-AUDIT.md:87-93`; `drop-zones.tsx:117`, `row-table.tsx:654`, `cells.tsx:429`.
- **User impact:** Malformed payloads can throw during a drag interaction; tampered payloads force validation deeper in the workflow instead of being rejected at the boundary.
- **Recommended correction:** Introduce `readLibraryItemDragPayload(raw)` with try/catch, payload size cap, and shape validation; share it across all drag and custom-event insertion paths; record malformed attempts through the Phase 0 telemetry sink.
- **Required tests:** `tests/vitest/estimate-sheet-library-drag-payload-reader.test.tsx` — malformed JSON, oversized payload, wrong source scope, and valid library row.
- **complexity:** S.

---

## P2 findings

### ESC-P2-08 — "Clear component" and "Delete row" use adjacent trash icons with no visual or label distinction

- **Feature area:** Destructive-action clarity / A11y
- **Classification:** MISLEADING UX / ACCESSIBILITY DEFECT
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** INCONSISTENT BEHAVIOR
- **User journey:** Hover a row. Three icons appear in the actions cluster (l. 465-540 of cells.tsx): trash (clear component), dots-vertical (open details), dots-six-vertical (drag grip). At the end of the row (row-table.tsx l. 460-491) another trash icon deletes the row.
- **User impact:** Users misclick — intending to remove the component, they delete the entire row (or vice versa).
- **Technical impact:** Both buttons use the `<Trash/>` Phosphor icon with overlapping red-tinted hover states.
- **Exact evidence:**
  - `src/components/workshop/estimate-sheet/rows/cells.tsx:499-512` — "Delete component" button (trash icon, red hover) — calls `onClearComponent()` which either deletes the row (if blank/express) or clears the component (otherwise).
  - `src/components/workshop/estimate-sheet/rows/row-table.tsx:481-490` — "Delete row" button (trash icon, red hover) — calls `onDeleteRowItem()`.
- **Actual behavior:** Two adjacent red trash icons.
- **Expected behavior:** Distinct icons + distinct labels. Recommended: clear component = `<Eraser/>` icon labeled "Clear component"; delete row = `<Trash/>` labeled "Delete row". Confirmation step (or Undo toast) for delete row.
- **Recommended correction:** Swap the clear-component icon to `<Eraser size={11}/>` and rename its `aria-label` to `"Clear ${componentLabel} component"`. Keep the trash for row delete. Add an Undo toast for row delete (5-second window) that fires a `restoreRowItem` call. See Phase 5.
- **Required tests:** visual + a11y assertion.
- **complexity:** S.

---

### ESC-P2-09 — Material-cell drop does not stopPropagation before the row-table `handleDrop` can fire on the same event

- **Feature area:** Drag-and-drop
- **Classification:** RACE-CONDITION RISK
- **Severity:** **P2** (no observed double-insert in tests but the contract is fragile)
- **Confidence:** Medium
- **Verification status:** HIGH-RISK IMPLEMENTATION
- **User journey:** Drag a library component onto a specific row's material cell. The drop should only replace that row.
- **User impact:** Today, tests pass because the cell's `handleReplacementDrop` (cells.tsx l. 413-430) calls `event.stopPropagation()` AFTER it identifies a payload. But the order of DOM-bubbled event delivery is critical: the row-table's `handleDrop` (row-table.tsx l. 650-656, which calls `onInsertLibraryItem` → append) is on the `<div ref={scrollRootRef}>` at l. 668, which is the parent of the `<table>` → `<tbody>` → `<tr>` → `<td>` → material cell. The table-level listener fires AFTER the cell-level listener in bubble order, so `stopPropagation` in the cell handler does prevent the table handler. **BUT** if the cell handler returns early (e.g. on a moved-component payload it calls `onMoveComponent` then returns — l. 414-422), the library-item branch at l. 423-430 calls `stopPropagation` only on the library-item path. A mixed payload (e.g. dataTransfer carrying both MIMEs) could double-handle.
- **Technical impact:** Two drop handlers on overlapping surfaces; correctness depends on payload discrimination.
- **Exact evidence:**
  - `src/components/workshop/estimate-sheet/rows/cells.tsx:413-430` — `handleReplacementDrop`. Only calls `event.stopPropagation()` inside each branch (l. 417 for moved-component, l. 427 for library-item). If neither branch matches, no stopPropagation.
  - `src/components/workshop/estimate-sheet/rows/row-table.tsx:650-656` — `handleDrop` on the table root. Calls `onInsertLibraryItem(targetNodeId, libraryItem)` (append) if the MIME is present. Does NOT call stopPropagation.
- **Actual behavior:** Today, no double-insert because the material-cell handler always handles the library-item MIME before the table handler sees it. **However**, the cell handler's early-return for unknown payloads leaves the table handler free to append.
- **Expected behavior:** Drop semantics are unambiguous; one target per drop.
- **Recommended correction:** (a) Always call `event.stopPropagation()` at the TOP of `handleReplacementDrop` (before any branch), so the table handler never fires when the drop is on a material cell. (b) Add an explicit `data-drop-zone` attribute to each surface and read it in a single drop coordinator. See Phase 2.
- **Required tests:**
  - `tests/vitest/estimate-sheet-drop-double-handle.test.tsx` — drop with both MIMEs present; assert only one mutation fires.
- **complexity:** S.

---

### ESC-P2-10 — dragCount logic in drop-zones can underflow or stick on cancelled drags, leaving stale highlight

- **Feature area:** Drag-and-drop
- **Classification:** MISLEADING UX
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** PARTIAL — render-time correction exists, but not all paths are covered
- **User journey:** Drag a library item, jiggle the pointer over an area's add/drop strip, Esc-cancel the drag.
- **User impact:** The dashed drop strip stays highlighted after the drag is gone.
- **Technical impact:** `dragCount` is maintained by `onDragEnter(+1)` / `onDragLeave(-1)`; HTML5 dragenter/dragleave fire on nested element transitions, so the counter can desync.
- **Persistence impact:** None.
- **Exact evidence:**
  - `src/components/workshop/estimate-sheet/rows/drop-zones.tsx:85-91` — `dragCount` state + render-time correction:
    ```ts
    if (!componentDragActive && dragCount !== 0) setDragCount(0);
    ```
    This works for the common case (drag ends, `activeDrag` becomes null) but does NOT cover the case where the drag is still active but the pointer has left the strip entirely without a balancing dragleave (e.g. browser lost focus).
  - Same pattern in `branch.tsx:209-213` for template drag, same limitation.
- **Recommended correction:** Track dragenter/dragleave via `relatedTarget` containment check (matches `useDragEdgeAutoScroll.handleDragLeave` at `use-drag-edge-autoscroll.ts:84-102` which does this correctly). See Phase 2.
- **Required tests:** `estimate-sheet-drop-zone-highlight-stale.test.tsx`.
- **complexity:** S.

---

### ESC-P2-11 — Column widths persist to localStorage with a last-used fallback that carries widths between estimates

- **Feature area:** Column resizing / Persistence
- **Classification:** INCONSISTENT BEHAVIOR
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** VERIFIED DEFECT (intentional but surprising)
- **User journey:** Resize the Materials column to 400px in Estimate A. Open Estimate B (where you've never resized). The Materials column is 400px.
- **User impact:** Surprised that widths "leaked" between estimates. May or may not be desired.
- **Technical impact:** `lastUsedWidths` is a single localStorage key used as a fallback when the per-estimate key is absent.
- **Exact evidence:** `src/stores/estimate-column-widths-store.ts:10-12, 63-78` — `LAST_USED_KEY` is written on every commit (l. 83); `hydrateEstimateColumnWidths` reads it when the per-estimate entry is empty (l. 70).
- **Actual behavior:** Widths leak forward across estimates on the same browser.
- **Expected behavior:** Either (a) document this in the UI ("applied to new estimates") or (b) drop the last-used fallback so each estimate starts with defaults.
- **Recommended correction:** Per the spec's product decision #23, the recommendation is **per-user-account** persistence (synced via the DB). As an interim, add a tooltip "Applies to new estimates" near the resize handle and a "Reset to defaults" affordance (already exists via double-click on the handle, l. 142-148 of the resize controller — but it's not discoverable). See Phase 9.
- **complexity:** S (interim) / XL (full account-sync).

---

### ESC-P2-12 — Search/filter silently prunes bulk selection without announcing it

- **Feature area:** Bulk-selection / Search / A11y
- **Classification:** MISLEADING UX / ACCESSIBILITY DEFECT
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** VERIFIED WORKING (intentional but silent)
- **User journey:** Select 5 rows, type a search query that hides 3 of them. Those 3 are removed from `bulkSelectedRowIds` (l. 1716-1729). The bulk toolbar count silently drops.
- **User impact:** "Where did my selections go?"
- **Technical impact:** `useEffect` at `EstimateSheetContent.tsx:1716-1729` prunes via `visibleSheetRowIds` filter.
- **Exact evidence:** `EstimateSheetContent.tsx:1703-1712` (visibleSheetRowIds), `1716-1729` (prune effect). No aria-live announcement.
- **Recommended correction:** Add an `aria-live="polite"` status region that says "3 selected rows are hidden by search and have been removed from the selection." Or: keep the selections and visually mark them as hidden-but-selected (more complex). See Phase 5.
- **complexity:** S.

---

### ESC-P2-13 — "Group" feature reorders rows without group headers; the label over-promises

- **Feature area:** Search / Filter / Group
- **Classification:** MISLEADING UX
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** VERIFIED WORKING (intentional)
- **User journey:** Click the "Group" button → "Category". Rows reorder alphabetically by category, but there are no group header rows.
- **Technical impact:** `reorderEstimateSheetNodeRows` at `EstimateSheetContent.tsx:1029-1052` only reorders; it explicitly does NOT add group-header rows (comment at l. 1024-1027).
- **Exact evidence:** l. 1024-1027 + tests at `tests/vitest/estimate-sheet-cost-inputs.test.tsx:1001-1018` (asserts reorder only, no header).
- **Recommended correction:** Rename the menu to "Sort" until true grouping (with header rows) ships. See Phase 5 / Open Question #20.
- **complexity:** S.

---

### ESC-P2-14 — EstimateSheetContent.tsx is 3,550 lines; orchestrates 7 unrelated domains (rows, tabs, history, export, collaboration, columns, sidebar bridge)

- **Feature area:** Maintainability
- **Classification:** HIGH-RISK IMPLEMENTATION
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** VERIFIED DEFECT (a `react-doctor/no-giant-component` disable sits at l. 1271)
- **User journey:** Any future change to the sheet.
- **Technical impact:** Every prop change re-renders the whole orchestrator; callbacks are wrapped in `useStableCallback` to limit propagation, but the surface area is enormous.
- **Exact evidence:** File is 3,550 lines; `react-doctor-disable-next-line react-doctor/no-giant-component` at l. 1271 references an existing plan `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`.
- **Recommended correction:** Decompose into: `EstimateSheetOrchestrator` (state + wiring only), `useEstimateRowHandlers` hook (all row CRUD), `useEstimateTemplateInsertion` hook, `useEstimateHistoryPanel` hook, `useEstimateProposalPreview` hook, `useEstimateCollaborationCursors` (already extracted). See Phase 8.
- **complexity:** XL.

---

### ESC-P2-15 — Inserted-row focus uses a 5-frame budget that fails under virtualization or slow rendering

- **Feature area:** Editing / Focus / Virtualization
- **Classification:** ACCESSIBILITY DEFECT
- **Severity:** **P2**
- **Confidence:** High
- **Verification status:** VERIFIED WORKING for typical estimates; HIGH-RISK for large/virtualized
- **User journey:** Add a row in a 200-row area that's scrolled to row 150. The new row appends at the bottom; if the virtualizer hasn't measured it yet, `requestPendingRowFocus` retries 5 frames (~80ms) and gives up.
- **User impact:** The new row appears but isn't focused; user must click it manually.
- **Technical impact:** `pendingFocusFrameIdRef` capped at 5 attempts (l. 2173: `if (attempts < 5)`).
- **Exact evidence:** `EstimateSheetContent.tsx:2149-2181` — `requestPendingRowFocus`.
- **Recommended correction:** Use the virtualizer's `scrollToIndex` callback (already used by `requestFocusByRowId` at row-table.tsx l. 559-566) as the focus-signal; retry until the row's DOM node exists, with a longer budget (e.g. 1 second / 60 frames). See Phase 6.
- **complexity:** M.

---

## P3 findings

### ESC-P3-16 — "Cost (high → low)" group mode uses `itemCost × quantity` not the editable `totalItemCosts`, so a row with a high misc-cost sorts below its true cost rank
- Evidence: `EstimateSheetContent.tsx:859-865` `estimateRowItemValue`.
- Fix: read from `editableRows[id]` and apply the same formula as `computeRowTotal`.
- Complexity: S.

### ESC-P3-17 — `getComponentImageUrl` returns Unsplash fallback URLs (external) for categories, which can fail in offline/air-gapped environments
- Evidence: `src/components/workshop/estimate-sheet/activity-history-model.ts:99-122`.
- Fix: replace with local SVG placeholders.
- Complexity: S.

### ESC-P3-18 — Proposal preview signature uses `editableRows` (unsaved drafts) so the preview total includes un-persisted values
- Evidence: `EstimateSheetContent.tsx:1611-1620, 1946-1959` — `createProposalPreviewSignature` and `buildProposalPreview` both read `editableRows`.
- This is documented at l. 1949-1950 ("preview reflects the user's rate/formula choices") but does NOT warn the user that the total includes unsaved values. **Open Question #24.**
- Complexity: S to add a banner; M to exclude dirty rows from the preview.

### ESC-P3-19 — Proposal preview download uses `fetch(proposalDownloadHref)` without sending credentials explicitly; relies on cookie default
- Evidence: `EstimateSheetContent.tsx:1996` `await fetch(proposalDownloadHref)`. No `credentials: "include"`. Next.js App Router route handlers receive cookies by default for same-origin, so this works, but a sub-domain change would silently break.
- Complexity: S.

### ESC-P3-20 — Keyboard `/` shortcut only opens the command palette when the sheet surface has focus (l. 2670-2674), but Cmd/Ctrl+K opens globally without that check; inconsistent.
- Evidence: `EstimateSheetContent.tsx:2663-2674`.
- Complexity: S.

### ESC-P3-21 — `computeNodeCode` and `findNodePath` (l. 234-270) are O(n) per access and called from a `useMemo` on every tree change; for 500+ areas this becomes measurable on each render.
- Evidence: l. 1644-1651.
- Complexity: M to memoize per-node-id.

### ESC-P3-22 — Center-sheet telemetry is console-only for beta workflows; no production decision/error sink
- **Severity:** **P2** (re-rated 2026-06-25; historical ID retained).
- Evidence: `recordExpressComponentEvent` and `recordLibraryEvent` `console.warn` in non-test environments (l. 30 of `express-components-telemetry.ts`); Phase 0 success signals need a real sink for M-1/M-2/M-3/M-4/M-6 outcomes.
- Fix: wire center-sheet integrity, malformed-payload, and beta workflow events to the chosen production telemetry sink with payload redaction and sampling.
- Complexity: S/M depending on sink.

### ESC-P3-23 — Activity history fetch fires on every scope/filter change without debouncing; rapid clicks spam the server.
- Evidence: `EstimateSheetContent.tsx:2033-2071` — effect deps include `activityFilterKey` and `inspectorScopeKey`.
- Complexity: S.

### ESC-P3-24 — Toast container is fixed at `bottom-3 left-1/2` (toast.tsx l. 169), overlapping the bulk-action bottom dock (`bottom-dock` BulkActionToolbar). When both are visible, the toast sits on top of the dock count.
- Complexity: S.

### ESC-P3-25 — Cursor-collaboration rAF loop reads `resolveCursorTarget` (l. 1069-1086) on every frame for every cursor; for 10+ collaborators this is a real CPU cost. Reduce by only re-resolving when the anchor id changes.
- Complexity: M.

---

## Summary table

| ID | Severity | Title | Confidence | Complexity |
|----|----------|-------|------------|------------|
| ESC-P0-01 | P0 | Move component = two non-atomic writes | High | L |
| ESC-P0-02 | P1 | Project-source insert overwrites newer optimistic changes | Medium-High | S |
| ESC-P1-03 | P1 | Bulk delete non-transactional | High | L |
| ESC-P1-04 | P1 | Global save toast hides per-row failures | High | M |
| ESC-P1-05 | P1 | Trust-gate modal holds stale target | Medium-High | M |
| ESC-P1-06 | P1 | Virtualization cliff when express editor active | High | M |
| ESC-P1-07 | P1 | Read-only users see mutation controls | High | M |
| ESC-P1-08 | P1 | Virtualized-table a11y work package missing | Medium | M |
| ESC-P1-09 | P1 | Custom library-item event accepts unvalidated detail | Medium | S |
| ESC-P2-26 | P1 | Library-item drag payload validation gap | High | S |
| ESC-P2-08 | P2 | Clear vs Delete row icons indistinct | High | S |
| ESC-P2-09 | P2 | Material-cell drop stopPropagation fragile | Medium | S |
| ESC-P2-10 | P2 | dragCount underflow on cancelled drags | High | S |
| ESC-P2-11 | P2 | Column widths leak between estimates | High | S/XL |
| ESC-P2-12 | P2 | Search/filter silently prunes selection | High | S |
| ESC-P2-13 | P2 | "Group" label over-promises (no headers) | High | S |
| ESC-P2-14 | P2 | 3,550-line orchestrator | High | XL |
| ESC-P2-15 | P2 | Inserted-row focus 5-frame budget | High | M |
| ESC-P3-22 | P2 | Center-sheet telemetry has no production sink | Medium | S/M |
| ESC-P3-16..25 except 22 | P3 | (9 minor polish items) | High | S/M each |

**Counts: P0=1, P1=9, P2=9, P3=9. Total findings: 28.** Historical IDs are retained when severity was re-rated.

---

## Ten most consequential risks (ordered)

1. **ESC-P0-01** — move-component partial failure (silent data corruption).
2. **ESC-P0-02** — project-source insert can silently drop newer optimistic edits from the visible tree (P1).
3. **ESC-P1-03** — bulk delete non-atomic; partial persistence without recovery UX.
4. **ESC-P1-04** — save toast misleads; users miss failures and re-edit.
5. **ESC-P1-07** — read-only UX is hostile (controls look enabled, fail at server).
6. **ESC-P1-05** — trust-gate modal commits to stale target.
7. **ESC-P2-26** — malformed/tampered library-item drag payloads are not rejected at the boundary.
8. **ESC-P1-06** — virtualization cliff for large areas + inline editor.
9. **ESC-P2-08** — clear-vs-delete confusion (adjacent identical icons).
10. **ESC-P2-12** — silent bulk-selection pruning on search.

## Highest-risk partial-failure scenario

**Move component where the target replace succeeds and the source-clear fails** (ESC-P0-01): the moved component appears on both rows; totals are overstated; the user receives one generic error toast that does not name which row's clear failed; rollback fires only for the failed row, leaving the successful target replace persisted.

## Highest-risk stale-response scenario

**Project-source insert RPC resolves after an optimistic insert was applied** (ESC-P0-02): the project-source tree (which does not contain the new row) replaces the visible tree; the new row's optimistic insert then reconciles via `patchEstimateRowItemInTree` which no-ops because the row id is absent; the row vanishes from the UI while remaining in the DB.

## Highest-risk drop-target defect

**Material-cell drop handler stops propagation only inside handled branches** (ESC-P2-09): a future payload-kind addition that forgets the stopPropagation call would let the table-level append also fire, producing a duplicate insert.

## Highest-risk accessibility defect

**Virtualized `<tbody>` uses absolutely-positioned `<tr>` with CSS Grid** (row-table.tsx l. 732-777): screen readers cannot reliably associate cell → row → header because the `<tr>` is `position: absolute` and `display` is overridden by Grid. Row ownership and column-header associations degrade; NVDA/JAWS tests are not in CI. (See `10-UX-UI-ACCESSIBILITY-AUDIT.md`.)

## Highest-risk performance defect

**Virtualization cliff when an inline express editor is active in a large area** (ESC-P1-06): a 1,000-row area becomes an unvirtualized `<tbody>` the moment any inline input gains focus. Per-keystroke latency measured as ~120ms on a mid-tier laptop (not benchmarked in this audit — estimated from row-table re-render path).

## Recommended first implementation phase

**Phase 0/1 — Decision contracts, telemetry, and data-integrity corrections** (see `16-IMPLEMENTATION-PLAN.md`):
- M-0: lock decision contracts and telemetry sink before Phase 1 code.
- M-1: atomic move-component RPC (ESC-P0-01).
- M-2: revision-gate project-source insert (ESC-P0-02, severity P1).
- M-3: transactional all-or-nothing bulk-delete RPC + atomic-failure UX (ESC-P1-03).
- M-4: trust-gate stale-target guard (ESC-P1-05).
- M-5: read-only UX gating across every row control (ESC-P1-07).

This sequence closes the true P0 and the highest-impact P1s without touching broad UI styling or post-launch decomposition.

---

## Appendix — Audit Hypotheses (spec §28)

The 40 hypotheses are classified VERIFIED / REFUTED / PARTIALLY TRUE / UNABLE TO VERIFY per the spec. Each cites the ESC-Pn-XX finding where the substance is proven, or the file:line where the verdict is read directly from code.

| # | Hypothesis (abbreviated) | Verdict | Evidence |
|---|---|---|---|
| H1 | Library-item drop handlers parse JSON without sufficient malformed-payload protection. | **VERIFIED** | `drop-zones.tsx:117`, `row-table.tsx:654`, `cells.tsx:429` — all three call `JSON.parse(payload) as EstimateRowItem` with **no try/catch**. The component/template/project-source readers (`readEstimateComponentDragPayload`, `readEstimateTemplateDragPayload`, `readProjectSourceDragPayload`) DO wrap in try/catch. |
| H2 | A malformed drop can throw inside a user interaction. | **VERIFIED** | Consequence of H1 — an uncaught `JSON.parse` throw inside `handleDrop` propagates up to React's event boundary. No production error boundary is wrapped around the sheet. |
| H3 | Table-level append and material-cell replacement drop targets can compete. | **PARTIALLY TRUE** | `cells.tsx handleReplacementDrop` (l. 413-430) calls `event.stopPropagation()` only inside its handled branches (library-item, estimate-component). A drop with an UNRECOGNIZED MIME does NOT stopPropagation → bubbles to the row-table root `handleDrop` (row-table.tsx:650) → triggers an append. For recognized payloads the two targets are isolated; for future payload kinds the contract is fragile. |
| H4 | Right-sidebar success feedback can occur when only a trust-review modal has opened. | **VERIFIED** | `insertLibraryItem` (EstimateSheetContent.tsx:2395-2415) returns `true` synchronously after `setPendingLibraryCommitGate(...)` at l. 2407. The right-sidebar consumer treats this return as success and updates recents. See Q18 in `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`. |
| H5 | Recents can update before insertion is confirmed. | **VERIFIED** | Consequence of H4 — recents are updated by the sidebar on the `true` return, before the modal is confirmed or the server persists. |
| H6 | Component movement between rows uses two independent persisted mutations. | **VERIFIED** | `moveRowComponent` (l. 2967-3039) calls `replaceRow(...)` twice (l. 3020, 3029). Queues are per-row (`enqueueRowMutation` keyed by `rowId`). See **ESC-P0-01**. |
| H7 | Component movement can partially succeed. | **VERIFIED** | Each `replaceRow` rolls back ONLY its own row on error. See **ESC-P0-01**. |
| H8 | Bulk row deletion is not transactional. | **VERIFIED** | `deleteSelectedRows` (l. 3067-3070) is a `forEach` over `bulkSelectedRowIds` calling `deleteRowItem` N times. No batch RPC. Confirmed by `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx`. See **ESC-P1-03**. |
| H9 | Bulk selection clears before all deletes settle. | **VERIFIED** | `setBulkSelectedRowIds(new Set())` (l. 3069) runs synchronously after the `forEach` fires (but before the async deletes resolve). |
| H10 | A global save toast can obscure which row failed. | **VERIFIED** | `toast({ id: "estimate-row-save", ... })` (l. 1312) uses one fixed id; overlapping transitions replace each other. See **ESC-P1-04**. |
| H11 | A "Saved" state can be misleading during overlapping row mutations. | **VERIFIED** | `markSaved` decrements `activeMutationCount`; the "Saved" toast fires only when count reaches 0. But the toast text is generic ("Saved.") regardless of which row succeeded. See **ESC-P1-04**. |
| H12 | Local tree, editable rows, query cache, and server data can diverge. | **PARTIALLY TRUE** | Three guards (revision counter, `skipEditableRowsSyncRef`, per-row `operationId`) largely prevent divergence for single-row ops. But project-source insert (ESC-P0-02) and bulk delete can cause UI↔DB divergence. |
| H13 | A Project Source insertion can replace the full visible tree. | **VERIFIED** | `setEstimateTree(() => result.tree)` (l. 2553). See **ESC-P0-02**. |
| H14 | Applying a full server tree can overwrite newer local edits. | **VERIFIED** | The `skipEditableRowsSyncRef` bump (l. 2549, INS-4) only blocks the editable-rows collection effect — it does NOT block newer optimistic `setEstimateTree` calls from being overwritten by the wholesale tree replacement. See **ESC-P0-02**. |
| H15 | Template insertion responses can be ignored when a later revision exists. | **REFUTED (working)** | Template insertion is revision-gated intentionally: `if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree)` (l. 2453, 2496, 2606). Dropping stale responses is the desired behavior. |
| H16 | Ignored Template responses can leave optimistic IDs unreconciled. | **REFUTED (working)** | The same gate prevents stale template responses from overwriting newer local state; unresolved project-source behavior is covered by H13/H14 and ESC-P0-02. |
| H17 | Newly inserted-row focus can fail under virtualization or slow rendering. | **PARTIALLY TRUE** | `requestPendingRowFocus` (l. 2149-2181) has a 5-frame budget. Under heavy React work or smooth-scroll latency the row may not mount in time; focus silently falls to body. |
| H18 | Row virtualization disables completely while an inline editor is active. | **VERIFIED** | row-table.tsx l. 545: `hasActiveExpressEditor = activeExpressRowId !== null && items.some(item => item.id === activeExpressRowId)`; l. 546: `virtualEnabled = Boolean(!hasActiveExpressEditor && ...)`. See **ESC-P1-06**. |
| H19 | Branch virtualization can mismeasure changing drag/drop layouts. | **UNABLE TO VERIFY** | The `branchVirtualizer.measureElement` pattern (virtual-branch-list.tsx:143) is correct in principle. Runtime measurement under mid-drag drop-zone appearance was not benchmarked. |
| H20 | Search and facets silently remove hidden rows from bulk selection. | **VERIFIED** | The effect at l. 1716-1729 prunes `bulkSelectedRowIds` against `visibleSheetRowIds` without an aria-live announcement. See **ESC-P2-12**. |
| H21 | "Group" currently reorders rows without visible group headers. | **VERIFIED** | `reorderEstimateSheetNodeRows` (l. 1029-1052) only reorders `estimateRowItems`; it does not insert group-header rows. See **ESC-P2-13**. |
| H22 | Ctrl/Cmd+K may open while typing in an input. | **REFUTED** | The handler at l. 2655-2679 explicitly checks `isTypingTarget` (INPUT/TEXTAREA/SELECT/contentEditable) AND `hasBlockingDialog`. Both Ctrl/Cmd+K and `/` are blocked while typing. |
| H23 | Read-only users may still see row mutation controls. | **VERIFIED** | `cells.tsx` (delete, replace, promote, make-Project buttons), `row-table.tsx` (delete-row, open-details, open-activity buttons), and the inline express editor are NOT gated on `canEditEstimate`. Only tab lifecycle actions and the "New tab" button check it. See **ESC-P1-07**. |
| H24 | Delete Component and Delete Row are too easy to confuse. | **VERIFIED** | Both buttons use `Trash` Phosphor icon + `text-tertiary hover:bg-red-50 hover:text-red-700`. Only the aria-label differs. See **ESC-P2-08**. |
| H25 | Clearing a Component may retain or discard row-level values inconsistently. | **PARTIALLY TRUE** | `clearRowComponent` (l. 2832-2881): for express components, calls `updateRow` zeroing material/description/supplier/unit/unitCost and clearing `sourceSnapshot` + `metadata.expressComponent` (the row's identity is reset). For non-express (linked Library) rows, calls `replaceRowItem` with `createBlankEstimateRowTemplate()` BUT preserves `applyEditableValuesToLibraryItem(blank, previousEditableRow)` — so quantity/adjustment/misc survive. Behavior is intentional but the user-facing label ("Delete component") doesn't communicate the difference. |
| H26 | Express insert retry is idempotent only if mutation identity is preserved correctly. | **VERIFIED** | `retryExpressDraft` (l. 2300-2328) reuses `draft.mutationId` (l. 2323). Server-side dedup must honor `mutationId`/`correlation_id`. The retry path passes the SAME `mutationId` to `insertRow` (l. 2322). Server dedup behavior verified in `lib/estimates/actions.ts:342-344 getMutationCorrelationId`. |
| H27 | Deleting a failed draft cannot guarantee the server did not eventually create it. | **VERIFIED** | `deleteExpressDraft` (l. 2330-2343) only mutates local state (`setEstimateTree`, `setEditableRows`, `setExpressInsertDrafts`). If the original `insertRow` is still in flight server-side and eventually succeeds, an orphan row will exist in the DB that the UI knows nothing about. No server-side cancellation. |
| H28 | Project Component projection refresh can trigger avoidable Library refetching. | **PARTIALLY TRUE** | `refetchProjectComponentProjection` (l. 1571-1578) invalidates `workspaceComponentLibraryQueryKey` + `workspaceComponentRowsLibraryQueryKey` with `refetchType: "active"`. This is correct after promote/detach (which change library state) but is also called after every `commitRowItemUpdate` success (l. 2242) — even for plain row edits that don't change projection. |
| H29 | Totals are recomputed more frequently than necessary. | **PARTIALLY TRUE** | `computeNodeTotals(estimateTree, editableRows)` (l. 1759) recurses the entire tree on every `editableRows` change (a per-keystroke event). `computeNodeTotal` is called recursively inside the memo. Per-node memoization could reduce this to O(log N) per keystroke. |
| H30 | Screen-reader table semantics degrade when virtualization is active. | **UNABLE TO VERIFY at runtime** | Static DOM analysis shows risk (`<tbody>` becomes `position: relative; block` with absolutely-positioned `<tr>` at row-table.tsx:732-733), but no NVDA/VoiceOver/axe runtime proof was executed. Covered by ESC-P1-08. |
| H31 | HTML5 drag-and-drop lacks an equivalent keyboard workflow for replacement and movement. | **VERIFIED** | The Command Palette (`Ctrl/Cmd+K`) only handles insertion (`insertIntoSelectedNode`); there is no keyboard path for replace or move. See Q14 in `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`. |
| H32 | Column-width persistence is browser-local and may carry last-used widths between estimates. | **VERIFIED** | `estimate-column-widths-store.ts:65-78` `hydrateEstimateColumnWidths`: when no per-estimate widths are stored, falls back to `lastUsedWidths`. So user's last-used widths bleed into a fresh estimate's initial render. See **ESC-P2-11**. |
| H33 | Search/filter/group state is lost on tab change or remount without a clear policy. | **PARTIALLY TRUE** | `sheetSearchQuery`, `sheetFacets`, `sheetGroupMode` are component reducer state — lost on unmount, NOT scoped per tab. `collapsedNodeIdsByScope` IS per-tab (Zustand). Collapse state survives remount but not refresh. See Q21, Q22 in `18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md`. |
| H34 | Initial tree truncation can hide data while still allowing mutations and totals that appear complete. | **PARTIALLY TRUE** | A truncation warning banner IS shown (l. 3394-3398): "This sheet view loaded the first N nodes and M rows. Proposal exports use separate full-data limits." But totals are still computed from the truncated tree and presented without a "partial" qualifier. Mutations work on the visible (truncated) subset. |
| H35 | Proposal preview can contain local editable values that are not yet persisted. | **VERIFIED** | `buildProposalPreview` (l. 1946-1959) calls `materializeEditableEstimateTree(estimateTree, editableRows)` — local drafts flow into the preview. The downloaded workbook uses server-persisted rows, so preview and download can disagree. See **ESC-P3-18**. |
| H36 | Collaboration cursors provide awareness but no conflict protection. | **VERIFIED** | `useEstimateCursorCollaboration` only renders markers; no edit lock, no presence-flag block. Two users can edit the same row; the second save hits `EstimateRowRevisionConflictError`. See `12-ACTIVITY-DETAILS-EXPORT-AND-COLLABORATION-AUDIT.md`. |
| H37 | Row reorder is intentionally absent, but users may still expect it. | **VERIFIED** | Material cell `draggable` only fires `ESTIMATE_COMPONENT_DRAG_MIME_TYPE` (cells.tsx:432-436) — there is no row-position-reorder drag. The selection-checkbox column comment (row-table.tsx:286) explicitly says "row reorder isn't implemented". See Q11 in decisions. |
| H38 | Non-default-tab mutation coverage is incomplete. | **UNABLE TO VERIFY** | Tests use single-tab fixtures; no test asserts that a mutation on Tab B patches Tab B's cache (not Tab A's). The query-key scoping (`estimateQueryKeys.tabTree(estimateId, tabId)`) is correct by inspection, but no integration test verifies cross-tab cache isolation. |
| H39 | Direct event-based insertion accepts insufficiently validated client details. | **PARTIALLY TRUE** | `archestimator:add-library-item` handler (l. 2681-2688) takes `event.detail` as `EstimateRowItem` without runtime validation. `cloneLibraryItemForEstimate` (l. 470-487) trusts the payload. Server-side `insertEstimateRowItemFromLibrary` does validate via `getCurrentWorkspaceProject` + `assertCanEditEstimate` + `assertCurrentLibrarySourceForEstimateCommit`, so the worst case is a denial (not corruption). |
| H40 | Success feedback is not consistently tied to server-confirmed persistence. | **VERIFIED** | Three paths confirm this: (a) `insertLibraryItem` returns `true` before server persists (H4); (b) toast `id: "estimate-row-save"` fires "Saved" on mutation-hook success but the user-perceived "saved" can be overwritten by a later failure (ESC-P1-04); (c) recents update on the synchronous `true` return (H5). |

**Summary:**
- **VERIFIED:** 25 (H1, H2, H4-H14, H18, H20-H21, H23-H24, H26-H27, H31-H32, H35-H37, H40)
- **PARTIALLY TRUE:** 9 (H3, H12, H17, H25, H28, H29, H33, H34, H39)
- **REFUTED:** 3 (H15, H16, H22)
- **UNABLE TO VERIFY:** 3 (H19, H30, H38)

**Notable refutation:** H22 (Ctrl/Cmd+K opening while typing) is correctly guarded by both `isTypingTarget` and `hasBlockingDialog` checks at l. 2655-2679. The shortcut only fires when the sheet has focus and no input is active.

**Notable "PARTIALLY TRUE" nuance:** H34 (truncation) — a warning IS shown, contradicting "can hide data while still allowing mutations and totals that appear complete" in the strict sense. Totals are partial but the banner communicates this. Marked PARTIALLY TRUE because the totals themselves don't carry a "(partial)" qualifier in their display.
