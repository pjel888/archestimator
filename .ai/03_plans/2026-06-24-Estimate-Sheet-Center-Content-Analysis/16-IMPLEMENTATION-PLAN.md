# 16 — Implementation Plan

Phased execution plan. Each phase groups findings to minimize cross-cutting churn. Every task has a Definition of Done.

## Phase 1 — Data-integrity & partial-failure corrections (P0 + highest-impact P1)

### M-1 — Atomic move-component RPC (ESC-P0-01)
- **Objective:** Replace two independent `replaceRow` calls with one server-side atomic RPC.
- **Findings addressed:** ESC-P0-01.
- **Files likely to change:**
  - `supabase/migrations/{YYYYMMDDHHMMSS}_move_estimate_row_component.sql` (NEW)
  - `src/lib/estimates/actions.ts` (NEW `moveEstimateRowComponent`)
  - `src/lib/domain/estimate-mutations.ts` (extend or replace `moveEstimateRowItem`)
  - `src/hooks/use-estimate-row-mutations.ts` (NEW `moveRow` mutation)
  - `src/components/workshop/EstimateSheetContent.tsx:2967-3039` (rewrite `moveRowComponent`)
  - `tests/vitest/estimate-sheet-move-component-atomicity.test.tsx` (NEW)
- **Current behavior:** two `replaceRow` calls in two per-row queues.
- **Desired behavior:** one `moveRow` call → one RPC `move_estimate_row_component(p_target_row_id, p_source_row_id, p_library_item, p_expected_target_revision, p_expected_source_revision, p_mutation_id, p_correlation_id)` that in a single transaction: updates target row, clears source row, writes one `row_moved` history event. Client patches both rows from the single response.
- **Server/RPC changes:** New Postgres function with `BEGIN ... UPDATE estimate_row_items ... UPDATE estimate_row_items ... INSERT estimate_sheet_events ... COMMIT`. Apply same authz (`assertCanEditEstimate`) + same `assertCurrentLibrarySourceForEstimateCommit` guard.
- **Cache changes:** One `setQueryData` patch covering both row ids.
- **State changes:** None new.
- **UX changes:** None.
- **Accessibility changes:** None.
- **Telemetry changes:** Optional new event `row_moved` (or reuse `row_replaced` with a shared `correlation_id`).
- **Tests:** Four scenarios in the new test file — both succeed, target fails, source fails, both fail. Plus reverse-response-order test.
- **Rollback strategy:** Single `restoreEstimateState(previousTree, previousRows, rollbackRevision)`.
- **Dependencies:** None new.
- **Definition of done:**
  - [ ] Migration written + applied to local Supabase.
  - [ ] Server action + RPC function created.
  - [ ] Client `moveRowComponent` rewritten.
  - [ ] 4+ new tests pass.
  - [ ] Existing `estimate-sheet-cost-inputs.test.tsx:722-741, 743-757, 759-776` still pass.
  - [ ] Manual QA: drag grip onto another row, throttle network, verify atomicity.

### M-2 — Revision-gate project-source insert (ESC-P0-02)
- **Objective:** Prevent project-source insert from overwriting newer optimistic changes.
- **Findings addressed:** ESC-P0-02.
- **Files likely to change:**
  - `src/components/workshop/EstimateSheetContent.tsx:2533-2561` (rewrite `insertProjectSourceIntoParentById`)
  - `tests/vitest/estimate-sheet-project-source-insert-race.test.tsx` (NEW)
- **Current behavior:** `setEstimateTree(() => result.tree)` unconditionally on success.
- **Desired behavior:** Capture `rollbackRevision = getEstimateTreeRevision()` before RPC. On success: `if (revision === rollbackRevision) setEstimateTree(...); else await activeTreeQuery.refetch();`.
- **Tests:** Insert project source, fire a `setEstimateTree` between send and resolve, assert the newer edit survives.
- **Definition of done:**
  - [ ] Code change applied.
  - [ ] New race test passes.
  - [ ] No regressions in existing tests.

### M-3 — Transactional bulk-delete RPC + partial-failure UX (ESC-P1-03)
- **Objective:** Single server RPC for bulk delete; partial-failure surfaces clearly to the user.
- **Findings addressed:** ESC-P1-03.
- **Files likely to change:**
  - `supabase/migrations/{TS}_delete_estimate_row_items_bulk.sql` (NEW)
  - `src/lib/estimates/actions.ts` (NEW `deleteEstimateRowItemsBulk`)
  - `src/hooks/use-estimate-row-mutations.ts` (NEW `deleteRowsBulk` mutation)
  - `src/components/workshop/EstimateSheetContent.tsx:3067-3070` (rewrite `deleteSelectedRows`)
  - `tests/vitest/estimate-sheet-bulk-delete-atomicity.test.tsx` (NEW)
- **Current behavior:** N independent `deleteRow` calls.
- **Desired behavior:** One RPC `delete_estimate_row_items_bulk(p_row_ids[], p_expected_revisions[], p_correlation_id)` that in one transaction attempts each delete, returns `{ deletedIds, failedIds, failures: [{rowId, code, message}] }`. Client: on success, reconcile from returned tree; on partial, render post-toast "Deleted N of M; K failed: [row names]".
- **Tests:** 3 rows, one fails with 409; assert tree state and toast content.
- **Definition of done:**
  - [ ] Migration + RPC.
  - [ ] Server action with structured partial-failure response.
  - [ ] Client rewrite + post-toast UI.
  - [ ] New atomicity test passes.
  - [ ] No regressions.

### M-4 — Trust-gate stale-target guard (ESC-P1-05)
- **Objective:** Disable Confirm when captured target no longer exists; show banner.
- **Findings addressed:** ESC-P1-05.
- **Files likely to change:**
  - `src/components/workshop/EstimateSheetContent.tsx:3126-3190` (Modal JSX)
  - `tests/vitest/estimate-sheet-trust-gate-stale-target.test.tsx` (NEW)
- **Current behavior:** Modal commits to captured target regardless of current tree state.
- **Desired behavior:** Modal tracks `targetStillExists = findEstimateNode(estimateTree, pendingLibraryCommitGate.targetNodeId) !== undefined`. When false, Confirm disabled + banner "This area was deleted. Close and try again."
- **Definition of done:** Code + test.

### M-5 — Read-only UX gating (ESC-P1-07)
- **Objective:** Disable every row mutation control when `canEditEstimate=false`.
- **Findings addressed:** ESC-P1-07.
- **Files likely to change:**
  - `src/components/workshop/estimate-sheet/rows/cells.tsx` (pass `canEdit` to action buttons, drop handlers)
  - `src/components/workshop/estimate-sheet/rows/row-table.tsx` (same)
  - `src/components/workshop/estimate-sheet/rows/drop-zones.tsx` (QuietAddRowButton disabled)
  - `src/components/workshop/EstimateSheetContent.tsx` (propagate `canEditEstimate`)
  - `tests/vitest/estimate-sheet-readonly-mode.test.tsx` (NEW)
- **Current behavior:** Controls render enabled; server rejects.
- **Desired behavior:** Controls render disabled (or hidden) with `aria-disabled`; tooltip "You don't have edit access."
- **Definition of done:** All controls disabled; test asserts no row-mutation is clickable.

## Phase 2 — Drag/drop validation and action equivalence

### M-6 — Shared `readLibraryItemDragPayload` reader (ESC-P2-09, ESC-P2-26)
- Replace three raw `JSON.parse` sites with one guarded reader + shape validation.
- Tests: malformed payload test, oversized payload test, cross-scope payload test.

### M-7 — Always stopPropagation at top of material-cell drop handler (ESC-P2-09)
- Move `event.stopPropagation()` from per-branch to top of `handleReplacementDrop` (cells.tsx:413).

### M-8 — dragCount via relatedTarget containment (ESC-P2-10)
- Replace `dragenter/leave` counter with `relatedTarget.contains` check, mirroring `useDragEdgeAutoScroll.handleDragLeave`.

### M-9 — Keyboard alternatives for replace + move (accessibility)
- Add context menu items "Replace with library component..." and "Move component to..." that open a small picker.
- Addresses Open Question #14.

## Phase 3 — Row-save and cache reconciliation

### M-10 — Per-row save-state chips (ESC-P1-04)
- Add `rowStatusById: Record<string, EstimateSaveState>` to `useSaveState`.
- Render a per-row chip in the actions cell.
- Global toast summary reads "Saved N rows" / "M of N failed".
- Tests: two rows edited rapidly; assert both chips correct.

## Phase 4 — Read-only and authorization UX

(covered in Phase 1 M-5)

## Phase 5 — Destructive-action clarity

### M-11 — Clear-component icon swap (ESC-P2-08)
- `<Trash/>` → `<Eraser/>` for clear component. aria-label "Clear component".

### M-12 — Undo toast for delete row (ESC-P2-08)
- 5-second "Undo" action on delete toast; fires `restoreRowItem` if clicked.

### M-13 — Rename "Group" to "Sort" (ESC-P2-13)
- One-string change + tooltip update.

### M-14 — Announce selection pruning (ESC-P2-12)
- Add `aria-live="polite"` status region in the bulk toolbar.

## Phase 6 — Accessibility

### M-15 — Table semantics fixes
- Add `<th scope="col">` to all headers.
- Add `aria-rowindex` to `<tr>` and `aria-colindex` to `<td>`.
- Add `aria-busy` to row during save.

### M-16 — Focus management for inserted row under virtualization (ESC-P2-15)
- Use virtualizer's `scrollToIndex` callback; extend budget to 60 frames.

### M-17 — Reduced motion for scroll-into-view
- Apply `prefers-reduced-motion` to `requestPendingRowFocus` (l. 2164).

## Phase 7 — Performance

### M-18 — Virtualization pinning for active express editor (ESC-P1-06)
- Use TanStack Virtual's `rangeExtractor` to always include `activeExpressRowId`.
- Remove the `hasActiveExpressEditor` killswitch.
- Test: 1000-row area, focus editor on row 800, scroll, assert row stays mounted.

### M-19 — Memoize per-node totals
- Split `estimateNodeTotals` into per-node memoization.

### M-20 — Cursor anchor resolution cache (ESC-P3-25)
- Cache by anchor id; re-resolve only when anchor changes.

## Phase 8 — Component decomposition (ESC-P2-14)

### M-21 — Extract `useEstimateRowHandlers` hook
- All row CRUD handlers move out of `EstimateSheetContent.tsx` into a dedicated hook.

### M-22 — Extract `useEstimateTemplateInsertion` hook
- Template insert flows.

### M-23 — Extract `useEstimateHistoryPanel` hook
- Activity modal + fetch logic.

### M-24 — Extract `useEstimateProposalPreview` hook
- Preview/export logic.

Goal: `EstimateSheetContent.tsx` shrinks from 3,550 to ~800 lines (pure wiring + JSX).

## Phase 9 — Product enhancements

### M-25 — Column-width persistence per user account (ESC-P2-11)
- Sync to DB via a new `user_preferences` table or extend profile.
- Major effort; defer.

### M-26 — Confirmation/Undo policy for delete (Open Question #2)
- Implement Undo toast pattern from M-12 across all destructive actions.

### M-27 — Proposal preview dirty-state banner (ESC-P3-18)
- "Preview reflects N unsaved edits" warning when `editableRows` has dirty fields.

### M-28 — Cost-sort uses editable totals (ESC-P3-16)
- `estimateRowItemValue` reads `editableRows[id]` for total.

## Sequencing summary

| Phase | Duration (engineer-days) | Findings closed |
|-------|--------------------------|-----------------|
| 1 | 4-6 | ESC-P0-01, ESC-P0-02, ESC-P1-03, ESC-P1-05, ESC-P1-07 |
| 2 | 2-3 | ESC-P2-09, ESC-P2-10, ESC-P2-26, accessibility gap |
| 3 | 2 | ESC-P1-04 |
| 4 | (covered in Phase 1) | — |
| 5 | 1-2 | ESC-P2-08, ESC-P2-12, ESC-P2-13 |
| 6 | 2-3 | a11y gaps |
| 7 | 3-4 | ESC-P1-06, ESC-P3-21, ESC-P3-25 |
| 8 | 5-8 | ESC-P2-14 |
| 9 | variable | ESC-P2-11, ESC-P3-16, ESC-P3-18, Open Qs |

**Total to close all P0/P1:** ~10-15 engineer-days (Phases 1-3 + 5-7).
**Total to close all P2/P3:** additional ~10 engineer-days (Phases 8-9).
