# 16 — Implementation Plan

Phased execution plan. Each phase groups findings to minimize cross-cutting churn. Every task has a Definition of Done.

## Phase 0 — Decision contracts and telemetry

### M-0 — Lock accepted decisions before Phase 1 code
- **Objective:** Encode the 2026-06-25 decision pass into implementation contracts.
- **Decisions locked:** bulk delete is all-or-nothing; move preserves target row values; `row_moved` is a new text `event_type`; ESC-P0-02 is severity P1; Phase 8 is post-launch; Q14/Q23/Q32/Q33/Q34/Q35/Q36/Q37 defaults are accepted.
- **Files likely to change:** docs only before code begins; then task-specific files below.
- **Definition of done:**
  - [x] `18` confirms 0 blocked items.
  - [x] `20` RD-1..RD-11 are all marked resolved.
  - [x] `22-THREAT-MODEL.md` exists.

### M-0T — Instrument success telemetry before Phase 1 ships
- **Objective:** Make P0/P1 fixes observable in beta.
- **Events:** `row_moved_outcome`, `bulk_delete_outcome`, `bulk_delete_atomic_failure`, `project_source_insert_revision_mismatch`, `trust_gate_stale_target`, `malformed_library_drag_payload`, `custom_library_item_event_rejected`.
- **Files likely to change:** telemetry utility, M-1/M-2/M-3/M-4/M-6 call sites.
- **Definition of done:**
  - [ ] Events are emitted to the chosen production sink, not only `console.warn`.
  - [ ] Local/test mode keeps deterministic assertions.
  - [ ] No event includes raw cost-library payloads or secrets.

### M-0R — Rollout guard and rollback checklist before external launch
- **Objective:** Make the beta express-components and new Phase 1 RPC paths reversible if runtime evidence shows regressions.
- **Decision source:** Q37/RD-11.
- **Default:** Add a lightweight environment/config kill switch for beta express editing if the implementation can isolate it cleanly; otherwise document why it cannot be disabled independently and provide a rollback checklist for M-1/M-3 migrations/server actions.
- **Definition of done:**
  - [ ] External-launch checklist names the owner, switch/config value or rollback steps, and verification query/check.
  - [ ] The guard does not disable read-only estimate/proposal viewing.
  - [ ] Telemetry in M-0T is sufficient to decide whether to roll back.

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
- **Desired behavior:** one `moveRow` call → one RPC `move_estimate_row_component(p_target_row_id, p_source_row_id, p_target_replacement_item, p_expected_target_revision, p_expected_source_revision, p_mutation_id, p_correlation_id)` that in a single transaction: updates target row, clears source row, writes one `row_moved` history event, and returns `{ targetRow, sourceRow, eventId }`. Client patches both rows from the single response.
- **Server/RPC changes:** New Postgres function with `BEGIN ... UPDATE estimate_row_items ... UPDATE estimate_row_items ... INSERT estimate_sheet_events ... COMMIT`. `p_target_replacement_item` is the fully constructed item after `applyEditableValuesToLibraryItem`, preserving the target row's quantity/adjustment/misc values per Q5. Both expected revisions must match or the whole RPC returns 409 with no row/history write. Apply the same authz (`assertCanEditEstimate`) and move source-trust checks into the transaction where feasible; otherwise document the residual TOCTOU risk in `13`.
- **Cache changes:** One `setQueryData` patch covering both row ids.
- **State changes:** None new.
- **UX changes:** None.
- **Accessibility changes:** None.
- **Telemetry changes:** `row_moved` is the chosen event type. `estimate_sheet_events.event_type` is `text`, so no enum migration is required; update `activity-history.tsx` filters/labels/component-detail rendering to consume it.
- **Tests:** Four scenarios in the new test file — both succeed, target fails, source fails, both fail. Plus reverse-response-order test.
- **Rollback strategy:** Single `restoreEstimateState(previousTree, previousRows, rollbackRevision)`.
- **Dependencies:** None new.
- **Definition of done:**
  - [ ] Migration written + applied to local Supabase.
  - [ ] Server action + RPC function created.
  - [ ] Client `moveRowComponent` rewritten.
  - [ ] Activity history recognizes and renders `row_moved`.
  - [ ] RPC enforces both revision checks atomically and caps payload size.
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

### M-3 — Transactional bulk-delete RPC + atomic-failure UX (ESC-P1-03)
- **Objective:** Single server RPC for bulk delete; any row failure aborts the whole set and surfaces clearly to the user.
- **Findings addressed:** ESC-P1-03.
- **Files likely to change:**
  - `supabase/migrations/{TS}_delete_estimate_row_items_bulk.sql` (NEW)
  - `src/lib/estimates/actions.ts` (NEW `deleteEstimateRowItemsBulk`)
  - `src/hooks/use-estimate-row-mutations.ts` (NEW `deleteRowsBulk` mutation)
  - `src/components/workshop/EstimateSheetContent.tsx:3067-3070` (rewrite `deleteSelectedRows`)
  - `tests/vitest/estimate-sheet-bulk-delete-atomicity.test.tsx` (NEW)
- **Current behavior:** N independent `deleteRow` calls.
- **Desired behavior:** One RPC `delete_estimate_row_items_bulk(p_row_ids[], p_expected_revisions[], p_correlation_id)` that validates a hard maximum row count, checks edit access and expected revision for every row, then deletes all rows and writes history inside one transaction. If any row fails validation, no rows are deleted and the RPC returns/throws a structured atomic failure (`{ failedRowId, code, message }` where available). Client: restore the previous tree and show "Couldn't delete selected rows. Nothing was deleted. Fix [row name/revision] and try again."
- **Tests:** 3 rows, one fails with 409; assert no row is deleted and toast content states all-or-nothing behavior.
- **Definition of done:**
  - [ ] Migration + RPC.
  - [ ] Server action with structured atomic-failure response.
  - [ ] Client rewrite + all-or-nothing failure toast UI.
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
- Add telemetry/audit event `malformed_library_drag_payload` without logging raw payload contents.
- Tests: malformed payload test, oversized payload test, cross-scope payload test.

### M-6b — Validate direct `archestimator:add-library-item` custom events (ESC-P1-09)
- Route the custom-event `detail` through the same reader/shape validation before insertion.
- Reject invalid or cross-scope detail with a non-persistent user message and `custom_library_item_event_rejected` telemetry.
- Tests: malformed custom event, missing source id, oversized payload, valid library item.

### M-7 — Always stopPropagation at top of material-cell drop handler (ESC-P2-09)
- Move `event.stopPropagation()` from per-branch to top of `handleReplacementDrop` (cells.tsx:413).

### M-8 — dragCount via relatedTarget containment (ESC-P2-10)
- Replace `dragenter/leave` counter with `relatedTarget.contains` check, mirroring `useDragEdgeAutoScroll.handleDragLeave`.

### M-9 — Keyboard alternatives for replace + move (accessibility)
- Add context menu items "Replace with library component..." and "Move component to..." that open a small picker.
- Picker default: command-palette-style modal with search, recent/library/project-source tabs where available, roving list navigation, Enter confirm, Esc cancel, and target-row copy.
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

Target: WCAG 2.2 AA for the center-sheet first-user path. This is an implementation target, not a claim that the audited surface already conforms.

### M-15 — Table semantics fixes
- Add `<th scope="col">` to all headers.
- Add `aria-rowindex` to `<tr>` and `aria-colindex` to `<td>`.
- Add `aria-busy` to row during save.

### M-16 — Focus management for inserted row under virtualization (ESC-P2-15)
- Use virtualizer's `scrollToIndex` callback; extend budget to 60 frames.

### M-17 — Reduced motion for scroll-into-view
- Apply `prefers-reduced-motion` to `requestPendingRowFocus` (l. 2164).

## Phase 7 — Performance and observability

### M-18 — Virtualization pinning for active express editor (ESC-P1-06)
- Use TanStack Virtual's `rangeExtractor` to always include `activeExpressRowId`.
- Remove the `hasActiveExpressEditor` killswitch.
- Test: 1000-row area, focus editor on row 800, scroll, assert row stays mounted.

### M-19 — Memoize per-node totals
- Split `estimateNodeTotals` into per-node memoization.

### M-20 — Cursor anchor resolution cache (ESC-P3-25)
- Cache by anchor id; re-resolve only when anchor changes.

## Phase 8 — Post-launch component decomposition (ESC-P2-14)

Phase 8 is behavior-locking and maintainability work. It is **not launch-blocking** for first users. Before extraction, add characterization tests for promote, detach, move, bulk delete, project-source insert, and proposal preview wiring.

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
- Post-1k-users only: sync to DB via a future `user_preferences` table or profile extension after separate schema/RLS design.
- Beta path keeps local per-estimate + last-used fallback, adds reset/discoverability, and hardens localStorage parse failures.
- Major effort; explicitly deferred.

### M-26 — Confirmation/Undo policy for delete (Open Question #2)
- Implement Undo toast pattern from M-12 across all destructive actions.

### M-27 — Proposal preview dirty-state banner (ESC-P3-18)
- "Preview reflects N unsaved edits" warning when `editableRows` has dirty fields.

### M-28 — Cost-sort uses editable totals (ESC-P3-16)
- `estimateRowItemValue` reads `editableRows[id]` for total.

## Sequencing summary

| Phase | Duration (engineer-days) | Findings closed |
|-------|--------------------------|-----------------|
| 0 | 0.5-1 | Decision contracts, telemetry hooks, threat-model closure |
| 1 | 4-6 | ESC-P0-01, ESC-P0-02 (P1), ESC-P1-03, ESC-P1-05, ESC-P1-07 |
| 2 | 2-3 | ESC-P2-09, ESC-P2-10, ESC-P2-26 (P1), ESC-P1-09, accessibility gap |
| 3 | 2 | ESC-P1-04 |
| 4 | (covered in Phase 1) | — |
| 5 | 1-2 | ESC-P2-08, ESC-P2-12, ESC-P2-13 |
| 6 | 2-3 | a11y gaps |
| 7 | 3-4 | ESC-P1-06, ESC-P3-21, ESC-P3-22 (P2), ESC-P3-25 |
| 8 | 5-8 post-launch | ESC-P2-14 |
| 9 | variable | ESC-P2-11, ESC-P3-16, ESC-P3-18, Open Qs |

**Total to close the true P0 + highest-impact P1s:** ~10-15 engineer-days (Phases 0-3 + 5-7).
**Total to close all P2/P3:** additional ~10 engineer-days (Phases 8-9).
