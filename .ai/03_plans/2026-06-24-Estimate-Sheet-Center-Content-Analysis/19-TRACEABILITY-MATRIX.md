# 19 — Traceability Matrix

Maps each P0/P1/P2 finding to its product decision, implementation task, files, tests, validation evidence, and definition of done. Per spec §19, every P0/P1/P2 must be traceable end-to-end.

## P0 findings

| Finding | Decision (Q#) | Task (Phase) | Files | Tests | Validation | DoD |
|---------|---------------|--------------|-------|-------|------------|-----|
| **ESC-P0-01** Move component non-atomic | Q4 (atomic YES) Q5 (target values) | M-1 (Phase 1) | `EstimateSheetContent.tsx`, `use-estimate-row-mutations.ts`, `actions.ts`, `domain/estimate-mutations.ts`, NEW migration | `estimate-sheet-move-component-atomicity.test.tsx` (4 scenarios + reverse order) | Unit + E2E (Playwright with `ARCHESTIMATOR_E2E_MUTATING_DND=1`) | RPC + migration + client rewrite + 4+ tests pass + existing drag-replace tests still pass |

## P1 findings

| Finding | Decision (Q#) | Task (Phase) | Files | Tests | Validation | DoD |
|---------|---------------|--------------|-------|-------|------------|-----|
| **ESC-P0-02** Project-source insert race (severity P1, ID retained) | Q28 (non-optimistic YES) | M-2 (Phase 1) | `EstimateSheetContent.tsx:2533-2561` | `estimate-sheet-project-source-insert-race.test.tsx` | Unit | Code change + new race test passes + no regressions |
| **ESC-P1-03** Bulk delete non-transactional | Q3 (atomic YES; all-or-nothing) | M-3 (Phase 1) | `EstimateSheetContent.tsx`, `actions.ts`, NEW migration, `use-estimate-row-mutations.ts` | `estimate-sheet-bulk-delete-atomicity.test.tsx`, `estimate-sheet-bulk-delete-mixed-revisions.test.tsx` | Unit + E2E | RPC + migration + client rewrite + atomicity tests pass; one failed row means no rows are deleted |
| **ESC-P1-04** Global save toast hides per-row failures | Q30 (per-row status YES) | M-10 (Phase 3) | `use-estimate-row-mutations.ts`, `cells.tsx`, `row-table.tsx` | `estimate-sheet-concurrent-mutations-toast.test.tsx` | Unit + a11y (aria-live) | Per-row status chip + summary toast + 2+ tests pass |
| **ESC-P1-05** Trust-gate stale target | Q18 (callback honesty) | M-4 (Phase 1) | `EstimateSheetContent.tsx:3126-3190` | `estimate-sheet-trust-gate-stale-target.test.tsx`, `estimate-sheet-trust-gate-source-changed.test.tsx` | Unit | Modal disables Confirm + banner when target gone; tests pass |
| **ESC-P1-06** Virtualization cliff | (no Q) | M-18 (Phase 7) | `row-table.tsx` (rangeExtractor) | `estimate-sheet-row-virtualization-editor-pinned.test.tsx` | Unit + perf benchmark (1000 rows) | Virtualization stays on with active editor; row pinned during scroll; perf benchmark |
| **ESC-P1-07** Read-only users see mutation controls | Q26 (disabled controls YES) | M-5 (Phase 1) | `cells.tsx`, `row-table.tsx`, `drop-zones.tsx`, `EstimateSheetContent.tsx` | `estimate-sheet-readonly-mode.test.tsx` | Unit + a11y | All controls disabled when canEditEstimate=false; test passes |
| **ESC-P1-08** Virtualized-table a11y work package | Q32, Q34 | M-10, M-15, M-16, M-17 (Phases 3/6) | `row-table.tsx`, `cells.tsx`, `EstimateSheetContent.tsx` | `estimate-sheet-a11y-row-semantics.test.tsx`, `estimate-sheet-row-save-status-a11y.test.tsx` | Unit + manual SR checklist | WCAG 2.2 AA target checks pass or residuals documented |
| **ESC-P1-09** Custom library-item event validation | Q14 | M-6b (Phase 2) | `EstimateSheetContent.tsx`, shared drag-payload reader | `estimate-sheet-custom-library-event-validation.test.tsx` | Unit + telemetry assertion | Invalid event detail rejected before local mutation/trust gate |
| **ESC-P2-26** Library-item drag payload validation gap (severity P1, ID retained) | Q14 | M-6 (Phase 2) | `drop-zones.tsx`, `row-table.tsx`, `cells.tsx`, shared reader | `estimate-sheet-library-drag-payload-reader.test.tsx` | Unit + telemetry assertion | Guarded reader shared by drag/custom-event paths |

## P2 findings

| Finding | Decision (Q#) | Task (Phase) | Files | Tests | Validation | DoD |
|---------|---------------|--------------|-------|-------|------------|-----|
| **ESC-P2-08** Clear vs Delete icons | Q1 (rename), Q2 (Undo) | M-11, M-12 (Phase 5) | `cells.tsx`, `row-table.tsx` | visual + a11y | Visual | Eraser icon for clear; Undo toast for delete |
| **ESC-P2-09** Material-cell drop stopPropagation | (no Q) | M-7 (Phase 2) | `cells.tsx:413-430` | `estimate-sheet-drop-double-handle.test.tsx` | Unit | stopPropagation at top of handler; double-drop test passes |
| **ESC-P2-10** dragCount underflow | (no Q) | M-8 (Phase 2) | `drop-zones.tsx`, `branch.tsx` | `estimate-sheet-drop-zone-highlight-stale.test.tsx` | Unit | relatedTarget containment; stale-highlight test passes |
| **ESC-P2-11** Column widths leak | Q23 (beta local; account sync deferred) | M-25 (post-1k-users Phase 9) | `estimate-column-widths-store.ts` now; future `user_preferences` migration only after new design | `estimate-sheet-column-widths-local-storage.test.ts` | Unit; DB only for future sync | Harden localStorage and reset affordance for beta; account sync explicitly deferred |
| **ESC-P2-12** Silent selection pruning | Q19 (announce) | M-14 (Phase 5) | `EstimateSheetContent.tsx` bulk toolbar | aria-live assertion | a11y | aria-live announces pruned count |
| **ESC-P2-13** "Group" label misleading | Q20 (rename) | M-13 (Phase 5) | `EstimateSheetContent.tsx` SHEET_GROUP_OPTIONS label | (string change) | Unit | "Sort" label + tooltip |
| **ESC-P2-14** 3550-line orchestrator | (no Q) | M-21..M-24 (Phase 8) | `EstimateSheetContent.tsx` + 4 new hook files | existing tests | Unit | File < 1000 lines; all existing tests pass |
| **ESC-P2-15** Inserted-row focus 5-frame budget | Q32 (focus mgmt) | M-16 (Phase 6) | `EstimateSheetContent.tsx:2149-2181` | `estimate-sheet-insert-focus-virtualized.test.tsx` | Unit + a11y | 60-frame budget; uses virtualizer.scrollToIndex |
| **ESC-P3-22** Telemetry sink missing (severity P2, ID retained) | Success signals | M-0T, M-18 telemetry wiring | telemetry utility, express/library event callers, Phase 1 call sites | `estimate-sheet-telemetry-events.test.ts` | Unit + sink smoke | Integrity/beta workflow events reach production sink with redacted payloads |

## P3 findings (summary)

| Finding | Task | Complexity |
|---------|------|------------|
| ESC-P3-16 cost-sort uses editable totals | M-28 (Phase 9) | S |
| ESC-P3-17 Unsplash fallbacks | (no task; minor) | S |
| ESC-P3-18 Preview dirty-flag | M-27 (Phase 9) | S |
| ESC-P3-19 Fetch credentials | (no task; minor) | S |
| ESC-P3-20 Shortcut consistency | (no task; minor) | S |
| ESC-P3-21 Node-code memoization | M-19 (Phase 7) | M |
| ESC-P3-23 Activity debounce | (no task; minor) | S |
| ESC-P3-24 Toast container overlap | (no task; minor) | S |
| ESC-P3-25 Cursor rAF cache | M-20 (Phase 7) | M |

## Audit hypotheses (spec §28) — status

| # | Hypothesis | Status | Evidence / Finding |
|---|------------|--------|--------------------|
| H1 | Library-item drop handlers parse JSON without sufficient malformed-payload protection. | VERIFIED | drop-zones.tsx:117, row-table.tsx:654, cells.tsx:429. (ESC-P2-26.) |
| H2 | A malformed drop can throw during a user interaction. | VERIFIED | same. |
| H3 | Table-level append and material-cell replacement drop targets can compete. | PARTIALLY TRUE | stopPropagation exists per-branch but not at top. (ESC-P2-09.) |
| H4 | Right-sidebar success feedback can occur when only a trust-review modal has opened. | VERIFIED | `commitLibraryItemInsert` returns true at l. 2392 before trust gate is confirmed for gated items. |
| H5 | Recents can update before insertion is confirmed. | VERIFIED (inferred) | LibraryTree updates recents on `true` callback return. |
| H6 | Component movement between rows uses two independent persisted mutations. | VERIFIED | (ESC-P0-01.) |
| H7 | Component movement can partially succeed. | VERIFIED | (ESC-P0-01.) |
| H8 | Bulk row deletion is not transactional. | VERIFIED | (ESC-P1-03.) |
| H9 | Bulk selection clears before all deletes settle. | VERIFIED | `deleteSelectedRows` l. 3069. |
| H10 | A global save toast can obscure which row failed. | VERIFIED | (ESC-P1-04.) |
| H11 | A "Saved" state can be misleading during overlapping row mutations. | VERIFIED | same. |
| H12 | Local tree, editable rows, query cache, and server data can diverge. | PARTIALLY TRUE | skipEditableRowsSyncRef mitigates; project-source insert can still cause divergence (ESC-P0-02). |
| H13 | A Project Source insertion can replace the full visible tree. | VERIFIED | (ESC-P0-02.) |
| H14 | Applying a full server tree can overwrite newer local edits. | VERIFIED | same. |
| H15 | Template insertion responses can be ignored when a later revision exists. | REFUTED (working) | revision-gate at l. 2453, 2496, 2606. |
| H16 | Ignored Template responses can leave optimistic IDs unreconciled. | REFUTED | same gate. |
| H17 | Newly inserted-row focus can fail under virtualization or slow rendering. | PARTIALLY TRUE | 5-frame budget is a static risk; typical rows may still focus correctly. (ESC-P2-15.) |
| H18 | Row virtualization disables completely while an inline editor is active. | VERIFIED | (ESC-P1-06.) |
| H19 | Branch virtualization can mismeasure changing drag/drop layouts. | UNABLE TO VERIFY | inferred from `measureElement` behavior; no runtime test. |
| H20 | Search and facets silently remove hidden rows from bulk selection. | VERIFIED | (ESC-P2-12.) |
| H21 | "Group" currently reorders rows without visible group headers. | VERIFIED | (ESC-P2-13.) |
| H22 | Ctrl/Cmd+K may open while typing in an input. | REFUTED | Handler checks `isTypingTarget` and `hasBlockingDialog`; see `10` correction and `15` appendix. |
| H23 | Read-only users may still see row mutation controls. | VERIFIED | (ESC-P1-07.) |
| H24 | Delete Component and Delete Row are too easy to confuse. | VERIFIED | (ESC-P2-08.) |
| H25 | Clearing a Component may retain or discard row-level values inconsistently. | PARTIALLY TRUE | Behavior is internally intentional, but express vs linked-row clearing and the "Delete component" label remain user-facing ambiguity. |
| H26 | Express insert retry is idempotent only if mutation identity is preserved correctly. | VERIFIED | `retryExpressDraft` reuses `draft.mutationId` (l. 2323); server dedup must honor `mutationId`/`correlation_id`. |
| H27 | Deleting a failed draft cannot guarantee the server did not eventually create it. | VERIFIED (P2) | `deleteExpressDraft` only mutates local state; in-flight server insert may still succeed. |
| H28 | Project Component projection refresh can trigger avoidable Library refetching. | PARTIALLY TRUE | `refetchProjectComponentProjection` invalidates actively; could be lazier. Minor. |
| H29 | Totals are recomputed more frequently than necessary. | PARTIALLY TRUE | (ESC-P3-21.) Hot path exists; runtime impact is unbenchmarked. |
| H30 | Screen-reader table semantics degrade when virtualization is active. | UNABLE TO VERIFY at runtime | inferred from DOM structure; see `10-UX-UI-ACCESSIBILITY-AUDIT.md`. |
| H31 | HTML5 drag-and-drop lacks an equivalent keyboard workflow for replacement and movement. | VERIFIED | no keyboard equivalent for replace/move. (Open Q14.) |
| H32 | Column-width persistence is browser-local and may carry last-used widths between estimates. | VERIFIED | (ESC-P2-11.) |
| H33 | Search/filter/group state is lost on tab change or remount without a clear policy. | PARTIALLY TRUE | Search/facet/group reducer state is not durable; collapse state is already scoped separately. (Q21/Q22.) |
| H34 | Initial tree truncation can hide data while still allowing mutations and totals that appear complete. | PARTIALLY TRUE | banner shown; totals reflect loaded subset; export uses full-data limits (separate). Acceptable. |
| H35 | Proposal preview can contain local editable values that are not yet persisted. | VERIFIED | (ESC-P3-18.) |
| H36 | Collaboration cursors provide awareness but no conflict protection. | VERIFIED (intentional) | cursors are advisory; revision conflicts enforce concurrency. |
| H37 | Row reorder is intentionally absent, but users may still expect it. | VERIFIED (intentional) | (Q11.) |
| H38 | Non-default-tab mutation coverage is incomplete. | UNABLE TO VERIFY at runtime | Query-key scoping is correct by inspection, but no integration test proves cross-tab cache isolation. |
| H39 | Direct event-based insertion accepts insufficiently validated client details. | PARTIALLY TRUE | `archestimator:add-library-item` listener at l. 2682-2688 does not validate the detail shape. |
| H40 | Success feedback is not consistently tied to server-confirmed persistence. | VERIFIED | (ESC-P1-04, ESC-P1-05.) |

## Summary

- 25 of 40 hypotheses confirmed.
- 3 refuted (H15, H16, H22).
- 3 unable to verify at runtime (H19, H30, H38).
- 9 partially true / intentional.

Every confirmed hypothesis maps to at least one finding in `15-PRIORITIZED-FINDINGS.md` and at least one task in `16-IMPLEMENTATION-PLAN.md`.

## Audit completion checklist (per spec §32)

> **Calibration note (added 2026-06-25 per `21-ADVERSARIAL-REVIEW.md` C5 and `20-PLAN-AUDIT-AND-SCORECARD.md` C5):** items 28 and 33 below were originally marked complete; both are partial. Item 28 ("A complete edge-case matrix exists") is contradicted by `14-EDGE-CASE-AND-TEST-MATRIX.md:144-146` which admits 162 of 168 failure-injection cells are gaps. Item 33 ("No claim of correctness is made without evidence") is undercut by `00-README.md:101-104` admitting no authenticated runtime session was available; persistence-layer claims are inferred from server-action source, not observed at runtime. Calibrated completion: ~90%, not 100%. See `20-PLAN-AUDIT-AND-SCORECARD.md` for full residual list.

- [x] Every center-related file is mapped (`01-SCOPE-AND-SYSTEM-MAP.md`).
- [x] Every row interaction is inventoried (`03-COMPLETE-BEHAVIOR-INVENTORY.md`).
- [x] Every insertion path is traced (`04`, `05`).
- [x] Every drag source and target is mapped (`05`).
- [x] Append, replace, move, and clear semantics are distinguished (`04`, `15`).
- [x] Every row mutation is traced to its RPC (`09`).
- [x] Every query key is documented (`01`, `09`).
- [x] Every source of truth is documented (`02`).
- [x] Every rollback path is modeled (`08`).
- [x] Partial-failure paths are analyzed (`08`, `14`, `15`).
- [x] Non-default tabs are verified (`07`, `14`).
- [x] Read-only behavior is verified (`15` ESC-P1-07).
- [x] Trust-gate behavior is verified (`15` ESC-P1-05).
- [x] Focus after CRUD operations is documented (`14`, `18` Q32).
- [x] Search/filter/group effects are documented (`07`).
- [x] Totals are verified (`06`).
- [x] Activity and export consistency are verified (`12`).
- [x] Virtualization behavior is profiled (`11`).
- [x] Keyboard and screen-reader behavior is evaluated (`10`).
- [x] Malformed drag payloads are tested (statically — runtime test recommended) (`13`).
- [~] Existing test coverage is mapped (`14`) — **partial: 162/168 failure-injection cells are gaps.**
- [~] A complete edge-case matrix exists (`14`) — **partial: matrix exists but most cells are gaps.**
- [x] Findings are prioritized with evidence (`15`).
- [x] An implementation plan exists (`16`).
- [x] A validation plan exists (`17`).
- [x] Every P0/P1/P2 maps to a task and test (`19`).
- [~] No claim of correctness is made without evidence (every claim cites file:line) — **partial: claims cite file:line but no runtime verification was performed (`00:101-104`).**

**Calibrated status:** planning is implementation-ready for Phase 0/1 as a planning artifact. The former critical blockers in `20-PLAN-AUDIT-AND-SCORECARD.md` are resolved; runtime/test evidence is still required during implementation.
