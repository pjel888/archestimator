# 18 — Open Questions and Decision Ledger

For each product question code cannot answer: the conflict, recommended default, alternatives, consequences, owner required, and whether implementation is blocked. Per spec §31, no audit stops for missing product decisions — recommend a default and move on.

## Q1 — Should "Delete component" be renamed "Clear component"?

- **Conflict:** Current label says "Delete component" (aria-label `Delete component ${name}`, cells.tsx:504) but the action for non-express rows is "clear the component, keep the row" (`clearRowComponent`, l. 2832-2881). For express rows it actually deletes the row.
- **Recommended default:** **YES — rename to "Clear component"** for non-express rows. Keep "Delete row" (already correct) for the row delete action. For express rows, the action IS row delete, so the existing "Delete component" is misleading; relabel to "Delete row" for express.
- **Alternatives considered:**
  - Keep "Delete component" — confusing; users may hesitate to use it for fear of losing the row.
  - "Reset component" — implies undo, not quite right.
- **Consequences:** Clearer UX; one-time relabel; minimal test churn.
- **Owner required:** Product.
- **Blocked:** No — default can ship without owner signoff; revisit if feedback conflicts.

## Q2 — Should deleting a row require confirmation or offer Undo?

- **Conflict:** Currently no confirmation; no Undo. Single click → row gone (optimistic). On failure, restored via rollback.
- **Recommended default:** **Undo toast (5-second window).** Confirmation dialogs interrupt flow; Undo matches modern app conventions (Gmail, Notion).
- **Alternatives:**
  - Confirmation modal — slower.
  - Hard delete without Undo — current behavior; users have lost rows accidentally.
- **Consequences:** Implement an `restoreRowItem` server action (or reuse insert with the canonical snapshot from `previousRowLocation`). 5s window.
- **Owner required:** Product.
- **Blocked:** No — default ships; revisit if retention metrics show different preference.

## Q3 — Should bulk delete be atomic?

- **Conflict:** Currently N independent deletes (ESC-P1-03).
- **Recommended default:** **YES — atomic via single RPC.** Atomicity matches user mental model ("I clicked delete, they should all be gone").
- **Alternatives:**
  - Partial-with-clear-UX — more complex; user has to decide what to do with failures.
- **Consequences:** One new RPC; client simplifies.
- **Owner required:** Engineering only.
- **Blocked:** No.

## Q4 — Should moving a Component between rows be atomic?

- **Recommended default:** **YES — see ESC-P0-01.** Non-negotiable for data integrity.
- **Blocked:** No.

## Q5 — Should movement carry row quantities or retain the target row's values?

- **Conflict:** `moveRowComponent` (l. 2967-3039) currently PRESERVES the target row's quantity/adjustment/misc (via `applyEditableValuesToLibraryItem(movedItem, previousTargetEditableRow)` at l. 2979). So the moved component takes on the target's quantity.
- **Recommended default:** **PRESERVE TARGET ROW VALUES (current behavior).** Rationale: the user is "replacing the target row's component", not "moving the source row to the target location". The target row's quantity was intentional; replacing it would surprise.
- **Alternatives:**
  - Carry source values — would convert this into a true "move row" operation. Different feature.
- **Consequences:** None — current behavior stays. Document in tooltip: "Replaces this row's component; keeps this row's quantity".
- **Owner required:** Product (to confirm framing).
- **Blocked:** No — 2026-06-25 decision pass accepts the recommended default for M-1.

> **Decision (2026-06-25):** Preserve target row values. M-1's RPC must accept a fully constructed `p_target_replacement_item` whose quantity/adjustment/misc values already reflect the target row. A future "move row with source values" feature would be a separate workflow and must not reuse this RPC contract silently.

## Q6 — Should blank/Express row creation remain immediately editable before persistence?

- **Conflict:** Express insert returns immediately with a draft state; user can type before the server confirms the row exists.
- **Recommended default:** **YES — keep current behavior.** The buffered-patch flow (`expressInsertDraftsRef`, l. 1365) handles this correctly; user experience is fast.
- **Consequences:** Edge case — server timeout after local typing → row is "failed" with retry/delete UI; buffered patches replay on retry. Tested pattern.
- **Owner required:** No.
- **Blocked:** No.

## Q7 — How should uncertain insert failures be recovered?

- **Recommended default:** Current pattern (status "failed" + Retry/Delete buttons) is correct. No change.
- **Blocked:** No.

## Q8 — Should invalid numeric input be rejected or silently normalized?

- **Recommended default:** **SILENTLY NORMALIZE (current behavior).** Spreadsheet users expect this; rejection interrupts flow.
- **Blocked:** No.

## Q9 — Should Enter move focus or only commit?

- **Current behavior:** Enter commits + blurs; focus moves to body (cells-model.ts:34-38).
- **Recommended default:** **ADD optional ArrowDown/Tab to move focus.** Enter commits only; user manually moves. Spreadsheet power users want Tab navigation (see Q10).
- **Owner required:** Product.
- **Blocked:** No.

## Q10 — Should Tab be the primary spreadsheet navigation method?

- **Recommended default:** **YES — Tab moves to next cell, Shift+Tab to previous.** This is the spreadsheet convention; current Tab is native form-tab which kind of works.
- **Consequences:** Custom Tab handler in `handleEstimateCellKeyDown`. Test for screen-reader compat.
- **Owner required:** Product.
- **Blocked:** No.

## Q11 — Should row reordering exist?

- **Current behavior:** No row reorder. Material cell is draggable but only onto other cells (move/replace), not between row positions.
- **Recommended default:** **NOT NOW.** The estimate row order is typically derived from the area's logical sequence (per CSI division). Manual reorder would conflict with the auto-canonical ordering (proposal export's `applyCanonicalDivisionOrder`).
- **Owner required:** Product.
- **Blocked:** No.

## Q12 — Should table-wide drops append a row, or only explicit drop strips?

- **Current behavior:** BOTH — dropping anywhere on the row-table root appends (row-table.tsx:650-656); dropping on the area strip appends (drop-zones.tsx); dropping on a material cell replaces (cells.tsx).
- **Recommended default:** **EXPLICIT DROP STRIPS ONLY.** Table-wide drop is too broad; users hit it accidentally. Replace with: drop strip (append) + material cell (replace).
- **Consequences:** Remove `handleDrop` from row-table root. Simpler mental model.
- **Owner required:** Product.
- **Blocked:** No.

## Q13 — Should material-cell replacement require a confirmation?

- **Recommended default:** **NO — but show a brief "Replaced" undo toast (3s).** Confirmation modals interrupt the drag flow.
- **Owner required:** Product.
- **Blocked:** No.

## Q14 — Should drag replacement have a keyboard equivalent?

- **Recommended default:** **YES — add context menu items "Replace with library component..." and "Move component to...".** See Phase 2 M-9.
- **Consequences:** Small picker modal; accessibility win.
- **Owner required:** Product (to design picker UX).
- **Blocked:** No — default picker UX accepted for M-9.

> **Decision (2026-06-25):** Use an engineering-owned v1 picker instead of waiting on bespoke Product design: a command-palette-style modal with search, recent/library/project-source tabs when available, roving-list keyboard navigation, Enter to confirm, Esc to cancel, and context-copy that names the target row. This is enough for M-9; Product can polish copy and grouping later without blocking the accessibility equivalent.

## Q15 — Should Project Components be inline editable while Library Components remain read-only?

- **Current behavior:** YES — express/blank rows get inline editor; library rows get read-only card. Correct.
- **Recommended default:** **KEEP CURRENT.**
- **Blocked:** No.

## Q16 — Should linked Library-row edits create overrides?

- **Current behavior:** No — editing a library row's quantity/adjustment/misc does NOT change linkState to `linked-overridden`. Only editing a typically-read-only field (which the UI prevents) would.
- **Recommended default:** **Future feature.** Track override state in metadata when the user edits a library-locked field via the row details modal (future).
- **Blocked:** No.

## Q17 — Should source trust warnings interrupt drag-and-drop?

- **Current behavior:** YES — drop on material cell or area strip triggers trust gate modal (warn or block).
- **Recommended default:** **KEEP CURRENT.** Better to interrupt than commit a stale source silently.
- **Blocked:** No.

## Q18 — When should right-sidebar insertion report success?

- **Current behavior:** Returns `true` immediately after queuing the optimistic insert, BEFORE the trust gate confirms or the server persists. Misleading (ESC-P1-05).
- **Recommended default:** **Return `true` only after the trust gate passes (or no gate needed) AND the optimistic insert is queued.** For blocked/warn cases, return `false` or undefined.
- **Consequences:** Sidebar recents should not update on `false`. Update LibraryTree to check return value.
- **Owner required:** Engineering.
- **Blocked:** No.

## Q19 — Should search/filter silently clear hidden selections?

- **Current behavior:** YES (ESC-P2-12).
- **Recommended default:** **KEEP PRUNING BUT ANNOUNCE IT.** Add aria-live "N rows hidden by search removed from selection."
- **Blocked:** No.

## Q20 — Is "Group" accurate when the UI only reorders rows?

- **Recommended default:** **RENAME TO "SORT"** (ESC-P2-13). Add true grouping (with headers) as a future feature.
- **Blocked:** No.

## Q21 — Should search, facets, and grouping persist per tab?

- **Current behavior:** No — resets on remount.
- **Recommended default:** **PERSIST IN ZUSTAND per tab.** Cheap to add; matches user expectation that "my search is still here when I come back".
- **Blocked:** No.

## Q22 — Should collapse state persist after refresh?

- **Current behavior:** No.
- **Recommended default:** **PERSIST IN ZUSTAND with localStorage fallback.** Per-tab scoping already exists.
- **Blocked:** No.

## Q23 — Should column widths persist per estimate, workspace, or user account?

- **Current behavior:** Per-estimate + last-used fallback (ESC-P2-11).
- **Recommended default:** **KEEP CURRENT FOR BETA; DEFER ACCOUNT SYNC UNTIL AFTER 1K USERS.** Current per-estimate + last-used fallback is acceptable before multi-device usage is proven.
- **Alternatives:** Per estimate only (current); per workspace.
- **Consequences:** No `user_preferences` table in Phase 1-9. M-25 becomes a post-1k-users enhancement with a separate schema/RLS design. Interim fix: document/reset local widths and harden localStorage parsing.
- **Owner required:** Engineering + Product.
- **Blocked:** No.

> **Decision (2026-06-25):** Do not add a `user_preferences` table for the first-user/beta path. Keep browser-local persistence, add a reset affordance/discoverability, and revisit account sync after real usage shows cross-device pain.

## Q24 — Should proposal preview include unsaved edits?

- **Current behavior:** YES (ESC-P3-18).
- **Recommended default:** **YES — but with a visible warning.** "Preview reflects N unsaved edits" banner.
- **Blocked:** No.

## Q25 — Should export be blocked while row saves are pending?

- **Recommended default:** **NO — but warn.** Show "N rows still saving; export may be incomplete" if `activeMutationCount > 0`.
- **Blocked:** No.

## Q26 — Should read-only users see disabled controls or no controls?

- **Recommended default:** **DISABLED CONTROLS with tooltip** (ESC-P1-07). Hiding controls leaves users confused about the surface's capability.
- **Blocked:** No.

## Q27 — Should large-tree truncation disable totals/export claims?

- **Current behavior:** Truncation warning shown (l. 3394-3398); export uses separate full-data limits per banner copy.
- **Recommended default:** **KEEP CURRENT.**
- **Blocked:** No.

## Q28 — Should Project Source insertion be optimistic?

- **Current behavior:** No — non-optimistic; full-tree replace on success.
- **Recommended default:** **NO — keep non-optimistic.** Project source can be large (whole tab); optimistic clone is expensive. Apply ESC-P0-02 revision-gate instead.
- **Blocked:** No.

## Q29 — Should every insertion pathway support Undo?

- **Recommended default:** **YES for destructive (delete, clear, replace); NO for additive (insert).** Additive is recoverable by delete.
- **Blocked:** No.

## Q30 — Should row-level save status be visible?

- **Recommended default:** **YES — per-row chip (ESC-P1-04 Phase 3 M-10).**
- **Blocked:** No.

## Q31 — Should collaboration provide edit-presence or locking beyond cursors?

- **Recommended default:** **NO for v1.** Locking adds contention; cursors + revision conflicts are sufficient. Future: optional "editing" presence flag per row.
- **Blocked:** No.

## Q32 — What should receive focus after insert, replace, clear, delete, and rollback?

- **Current behavior:**
  - Insert: new row's first cell (5-frame budget, ESC-P2-15).
  - Replace: nothing (focus moves to body).
  - Clear: nothing.
  - Delete: nothing.
  - Rollback: nothing.
- **Recommended default:**
  - Insert: new row's first cell (extend budget).
  - Replace: target row's first cell.
  - Clear: same row's material cell (now blank express editor).
  - Delete: **next row's selection checkbox** (matches spreadsheet convention).
  - Rollback: same row's previously-focused cell.
- **Owner required:** Engineering + a11y.
- **Blocked:** No — defaults accepted under the WCAG 2.2 AA target in Q34.

> **Decision (2026-06-25):** Use the defaults above for v1. Engineering owns implementation; verification must include keyboard and screen-reader checks called out in `17-VALIDATION-PLAN.md`. No separate a11y-owner signoff blocks implementation.

## Q33 — What is the mobile/touch scope for the center sheet?

- **Conflict:** `03`, `10`, and `17` call the center sheet desktop-first and exclude mobile/touch testing, but PH/SEA field use can include phones and tablets.
- **Recommended default:** **READ-ONLY MOBILE FALLBACK FOR <768px IN V1.** Users can inspect rows, totals, activity, and export/proposal state where layout permits, but row editing, drag/drop, bulk selection, keyboard replacement/move, and column resizing are disabled with clear disabled states.
- **Alternatives:** Full responsive editing now; redirect mobile users to project list; explicit no-support banner.
- **Consequences:** Launch scope is honest without over-investing. Mobile editing/touch drag becomes a separate roadmap item with its own interaction model.
- **Owner required:** Product + Engineering.
- **Blocked:** No.

## Q34 — What accessibility conformance target applies?

- **Conflict:** The pack lists a11y defects and tests but never pins the standard/version.
- **Recommended default:** **WCAG 2.2 AA for the center-sheet first-user path.** This includes keyboard access, focus order, visible focus, non-color-only state, reduced motion, semantic table/header associations where possible, and live-region behavior for save/error state.
- **Alternatives:** WCAG 2.1 AA; informal best effort.
- **Consequences:** M-9, M-10, M-15, M-16, M-17, and read-only gating must carry explicit keyboard/screen-reader acceptance checks. This is a target for the shipped implementation, not a claim that the current audited surface already conforms.
- **Owner required:** Engineering.
- **Blocked:** No.

## Q35 — What peso/i18n default applies for the PH market?

- **Conflict:** The pack audits formulas but does not state formatting expectations for Philippine peso amounts or decimal precision.
- **Recommended default:** **Keep PHP peso formatting via existing money-format utilities; validate centavo/decimal handling in tests.** Accept `₱` display, comma thousands separators, two decimal places where money is shown, and numeric inputs that normalize pasted symbols/commas where existing inputs support it.
- **Alternatives:** Plain decimal-only inputs; locale selector now.
- **Consequences:** Add validation coverage before changing money inputs. Do not build general i18n in this phase.
- **Owner required:** Product + Engineering.
- **Blocked:** No.

## Q36 — What are the per-row save-chip states?

- **Conflict:** ESC-P1-04 recommends per-row status but did not enumerate state names/copy.
- **Recommended default:** **Five states: idle, saving, saved, failed, conflict.** Display copy should stay under 12 characters: empty/none, "Saving", "Saved", "Failed", "Conflict". `saving` and error transitions are announced politely per row; conflict/error copy links to retry/refetch affordances where available.
- **Alternatives:** Only saving/failed; global toast only.
- **Consequences:** M-10 has a concrete UI/test contract.
- **Owner required:** Engineering.
- **Blocked:** No.

## Q37 — Does the beta express-components path need a feature flag or rollback guard?

- **Conflict:** The express-components path is labeled beta, and ESC-P1-06/M-15 can affect many users if a performance or virtualization issue ships broadly. The pack previously named telemetry but not an operational off-ramp.
- **Recommended default:** **YES — require a lightweight rollout guard before external launch.** Prefer an existing environment/config flag if one exists. If the implementation cannot cleanly disable express editing without breaking core estimating, document that constraint and provide an M-1/M-3 rollback checklist instead of inventing a broad new feature system.
- **Alternatives:** No guard, rely on deploy rollback only; build a full feature-flag framework now.
- **Consequences:** Phase 0 adds a small rollout/rollback task (M-0R). This is not a new dependency framework and must not delay Phase 1 code except to document the operational escape hatch.
- **Owner required:** Engineering.
- **Blocked:** No.

## Summary

- **37 questions.**
- **0 blocked.** Q14, Q23, Q32, and Q5 are no longer conditional blockers: the 2026-06-25 decision pass accepts defaults for the picker UX, column-width persistence scope, focus behavior, and move semantics.
- **Explicit deferred defaults:** Q9, Q10, Q12, Q21, and Q22 remain accepted recommendations, but they are backlog/post-Phase-1 unless a related implementation task already touches the same surface. They are not hidden Phase 1 blockers.
- All questions have recommended defaults that can ship or be explicitly deferred without new schema/design approval.
- The most consequential are Q3 (bulk delete all-or-nothing), Q4 (atomic move), Q5 (move preserves target values), Q12 (drop-strip-only), Q14 (keyboard replace/move), Q18 (insert callback honesty), Q23 (no account-sync table before 1k users), Q32 (focus management), Q33 (mobile read-only fallback), Q34 (WCAG 2.2 AA target), and Q37 (rollout guard).

## Success signals (added 2026-06-25 per `20-PLAN-AUDIT-AND-SCORECARD.md` MG-S4)

The plan's DoDs prove the fixes *work* but not that they *help users*. The following product-level KPIs close that gap. Each requires a Phase 0 telemetry task to instrument before Phase 1 ships.

| KPI | Target | Source | Instrumentation |
|---|---|---|---|
| User-reported "missing component" / "component appears on two rows" incidents | 0 in first 30 days of beta | Support channel + owner review | Telemetry event `row_moved_outcome` (success/failed/rolled-back) emitted from M-1 RPC |
| P0 RPC error rate | < 0.01% measured over 7-day window | Server logs | Telemetry on `move_estimate_row_component` and `delete_estimate_row_items_bulk` outcomes |
| Atomic-failure recovery rate (bulk delete) | ≥ 90% of users who see an all-or-nothing failure toast successfully retry within 5 minutes | Client telemetry | `bulk_delete_atomic_failure` event + `bulk_delete_retry` event |
| Project-source race occurrence | < 0.1% of project-source inserts trigger the revision-mismatch else-branch | Client telemetry | `project_source_insert_revision_mismatch` event from M-2 else-branch |
| Read-only user session feedback | ≥ neutral on first approver pilot | User research session | Qualitative; no telemetry |
| Trust-gate stale-target occurrence | < 1% of trust-gate opens hit the disabled-Confirm banner | Client telemetry | `trust_gate_stale_target` event from M-4 |

Phase 0 telemetry task (added per `20-PLAN-AUDIT-AND-SCORECARD.md` revision #13): before Phase 1 ships, instrument the 6 events above. Effort: 0.5 engineer-day.
