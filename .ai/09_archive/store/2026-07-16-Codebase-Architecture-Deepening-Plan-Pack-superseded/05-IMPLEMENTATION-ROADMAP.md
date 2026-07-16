# 05 — Implementation Roadmap

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Role:** the unit DAG and phased plan. **This is the only execution authority** (`canonical_execution_artifact`).
**Reconciles:** `00` §7 (phases), `02` (blast radius + safe envelopes), `04` (simulations → recommended waves), `06` (risks/decisions).
**Vocabulary:** module / interface / implementation / depth / seam / adapter / leverage / locality.

> Machine IDs (`plan-pack.json`) are numeric: `UNIT-001..015`, `REQ-001..015`. The descriptive
> `UNIT-ARCH-XX` labels used across the analysis docs map 1:1 (see `07-TRACEABILITY-MATRIX.md`).
> This doc uses the numeric IDs as canonical and the label in parentheses on first mention.

---

## 0. Recommended sequence (from `04-EXECUTION-SIMULATIONS.md` §4)

Adopt baseline sequencing, augmented by a Wave-0 pipeline-derisk and Wave-1 max-parallelism.
**Reject sheet-first:** it takes render-perf risk before the render-probe baseline exists (`04` §1b, `DEC-ARCH-SIM-01`).

```
Wave 0 (pipeline derisk):   UNIT-006   (pass-through reducers; spare componentLibrarySheetReducer @ComponentLibraryManager.tsx:247)
                          + delete estimate-repository.ts   (standalone dead file, 0 importers)
Wave 1 (foundation, ∥):     UNIT-001  ∥  UNIT-008  ∥  UNIT-009     (disjoint sole-editor files)
Wave 2 (write + row lift):  UNIT-002 (after UNIT-001)  ∥  UNIT-004  (disjoint from landed UNIT-006 on row-table.tsx)
Wave 3 (sheet brain):       CAPTURE render-probe baseline FIRST  (closes 03-PERF §8.2)
                          → UNIT-003 (lease EstimateSheetContent.tsx)
                          → UNIT-005 (gated on UNIT-003; delete comparators + update contract-test anchors in-lockstep)
Wave 4 (consolidation):     UNIT-007 (after UNIT-002)  ∥  AUX UNIT-010..015 (optional; UNIT-010 leases EstimateSheetContent.tsx after UNIT-005)
```

**Why this order (one paragraph, from `04` §4):** Wave 0 derisks the execution pipeline (`LOOP_LEDGER`, `next build`, verify loop) on the two trivial wins — UNIT-006's pass-through reducers (deletion-test failures) and the standalone dead `estimate-repository.ts` — without fragmenting UNIT-001 (the `workspace-repository.ts` seams stay bundled in the carve, `RISK-ARCH-SIM-01`). Wave 1 exploits free parallelism: UNIT-001/008/009 are sole-editors of disjoint files with no inter-dependency. Wave 2 runs UNIT-002 (the HIGH SQL unit) right after UNIT-001 settles the repository layer (`DEC-ARCH-05`), with UNIT-004 in parallel (its commit block `row-table.tsx:509-625` is disjoint from UNIT-005's comparator `:131`, and UNIT-006 has cleared the setter surface). Wave 3 is load-bearing: **capture the render-probe baseline before any of UNIT-003/004/005** (`DEC-ARCH-SIM-03`), then UNIT-003 → UNIT-005 — because UNIT-005's comparator deletion is gated on UNIT-003's stabilized handler identity (delete the guard before the cause = re-render storm, `RISK-ARCH-06`). Wave 4 lands UNIT-007 after its dependency UNIT-002, auxiliaries optional.

---

## 1. DAG (acyclic; `plan-pack.json` `units[].depends_on`)

```
UNIT-006 ──┐
           ├─► (Phase 0; no downstream dependency, but lands first to derisk + clear EstimateSheetContent.tsx)
UNIT-001 ─────► UNIT-002 ──────────► UNIT-007
UNIT-008                                   (independent)
UNIT-009                                   (independent)
UNIT-004                                   (independent of UNIT-003; disjoint line range)
UNIT-003 ─────────────────► UNIT-005       (005 GATED on 003: stabilize handler identity first)
UNIT-010 (AUX A1) ─────────► (after UNIT-005; same file lease)
UNIT-011..015 (AUX)                        (independent, optional)
```

**Edges (verified load-bearing dependencies only):** `UNIT-002 depends_on UNIT-001`; `UNIT-007 depends_on UNIT-002`; `UNIT-005 depends_on UNIT-003`. All others are independent (sequenced by phase/risk/lease, not by correctness dependency — `04` §1b confirms the client/server seam means sheet-brain units have no correctness dependency on the repository units).

---

## 2. Per-unit execution sketches

Each unit: **goal · owned paths · implementation · acceptance evidence · recovery · test decision · risk.**
Line anchors are verified as of 2026-07-16 but drift under active commits — **re-`grep` at execution time** (`06` §8.3).

### UNIT-006 — Delete the pass-through field-setter reducer pattern · `Phase 0` · LOW
- **Goal:** remove reducers/setter-wrappers whose entire behaviour is a one-line field assignment; replace with `useState` (or a small zustand slice). `resolveStateUpdater` re-implements `useState`'s functional update — deletion-test **pass-through**.
- **Owned paths:** `EstimateSheetTree.tsx` (`estimateSheetTreeReducer:244`, 16 cases; setters `:406-446`; `resolveStateUpdater:219`); `ComponentLibraryManager.tsx` (`componentLibraryManagerReducer:425`, 19 cases — **DELETE**); `EstimateSheetContent.tsx` (`estimateSheetContentReducer:864`, single `fieldChanged` case + ~24 `useStableCallback` setters).
- **Implementation:** per file, swap each pass-through setter for `useState`; preserve every functional-updater call site (`setX(prev => …)`). **SPARE** `componentLibrarySheetReducer` at `ComponentLibraryManager.tsx:247` — it encodes real logic (`catalogueBranchToggled` builds a `Set`; sort handlers call `getNextDenseSortState`) — `DEC-ARCH-07`.
- **Acceptance evidence:** `tsc` clean; existing UI tests that render these modules green (where authorized); no `next build` needed (client-only).
- **Recovery:** revert per-file; the prior reducer is the known-good baseline.
- **Test decision:** `NOT_REQUIRED` (no invariant; deletion-test failure). **Scope note (`RISK-ARCH-SIM-03`):** `resolveStateUpdater` also appears in `projects-page-client.tsx` + `ProjectEstimatesTable.tsx` — either widen this unit to cover them or name them as a documented residual; do **not** claim "all pass-through reducers deleted" while two remain.

### UNIT-001 — Carve the Estimate-tree read module · `Phase 1` · MED
- **Goal:** move the ~1500-line Estimate-tree read slice (6 entry points, private chain) out of the 4441-line `workspace-repository.ts` into one deep module; delete 2 false seams as a bonus. Deletion-test **earns-keep** (real read+cache behaviour) + 2 dead seams.
- **Owned paths:** `src/lib/repositories/workspace-repository.ts` (carve out); new `estimate-tree-repository.ts`; delete `src/lib/repositories/estimate-repository.ts`; remove `clearEstimateRouteContextProcessCache` + its 4 callers.
- **Implementation:** behavior-preserving module move — keep the 6 public signatures byte-identical, keep the private chain's cache-key construction untouched. Bundle the dead-seam deletions: `estimateRepository` (0 importers), `clearEstimateRouteContextProcessCache` (`:4090`, no-op, 4 callers `estimates/actions.ts:2291,3807,4070` + `express-promotion-actions.ts:927`), `getProjectEstimateTreeByNode` (0 external callers; repoint its 1 internal caller `:4316` before removing the export).
- **Acceptance evidence:** `tsc` (5 external call sites type-check the new location); contract test `estimate-sheet-unit-003-contracts.test.ts`; `next build` once (server-component import in `[nodeId]/page.tsx:83` resolves).
- **Recovery:** revert the move; old god-file restored from git.
- **Test decision:** `NOT_REQUIRED`. **Risk:** `RISK-ARCH-08` (delete order), `RISK-ARCH-11` (re-grep dead symbols before delete).

### UNIT-002 — Extract the Component write-repository · `Phase 1→2` · HIGH
- **Goal:** move ~2000 lines of inline write SQL out of `component-library/actions.ts` (5545) into a write-repository mirroring the existing read-repository (`component-library-repository.ts`, 2361 ln). Deletion-test **earns-keep-misplaced** (SQL earns keep; placement does not).
- **Owned paths:** `src/lib/component-library/actions.ts`; new `component-library-write-repository.ts`.
- **Implementation:** **statement-byte-identical relocation** first pass — same SQL text, parameter order, transaction grouping; the action keeps orchestration and calls the module. Preserve `runAtomicBatch` (`:247`, hard-requires `database.batch`) and the `statements[]` fan-out atomicity. Close the table-leakage checklist: after the move every write table (`upload_assets`, `component_variant_attachments`, `cost_library_item_variant_cost_entries`, `estimate_sheet_events`, `activity_event_outbox`) is still reached from the same call paths.
- **Acceptance evidence:** the 4 action tests (`component-library-actions-revalidation.test.ts`, `library-viewer-authz.test.tsx`); **`next build` mandatory** — `actions.ts:1` is `"use server";` and a non-async export is caught only by build (`RISK-ARCH-05`); `TEST_PROPOSAL` golden diff of generated SQL strings before/after.
- **Recovery:** revert to inline SQL — the module was a pure move.
- **Test decision:** `TEST_PROPOSAL` (write-parity). **Risk:** `RISK-ARCH-01` (SQL drift/atomicity), `RISK-ARCH-05` (build). **Depends on:** `UNIT-001` (`DEC-ARCH-05`).

### UNIT-008 — Give the last-owner invariant one home · `Phase 1 (∥)` · HIGH safety / LOW breadth
- **Goal:** collapse the 4 encodings of "a corporate account always retains ≥1 owner" (3 SQL `EXISTS` + 1 TS `isLastOwner`) into one predicate behind one function. Deletion-test **earns-keep** (invariant is real).
- **Owned paths:** `src/lib/admin/corporate-account-repository.ts` (`addCorporateAccountMember:450` OR EXISTS `:475`; `isLastOwner:511`; `removeCorporateAccountMember:542` guard `:552` OR EXISTS `:566`; `updateCorporateAccountMemberRole:592` guard `:608` OR EXISTS `:625`).
- **Implementation:** behavior-preserving predicate consolidation — target is **one SQL predicate + one TS guard behind one function** (`DEC-ARCH-09`); both remove (`:552`) and update (`:608`) paths route through it; diff the 3 EXISTS clauses and assert equivalence.
- **Acceptance evidence:** **the 6 corporate-account tests** (`corporate-account-repository.test.ts`, `-actions.test.ts`, `-admin-recovery.test.ts`, `-local-d1-integration.test.ts`, `-workspace-link-state.test.ts`, `cloudflare-d1-recovery-integrity.test.ts`) — rare HIGH-safety unit with real coverage; run green.
- **Recovery:** revert to the 4-encoding baseline (known-correct).
- **Test decision:** `TEST_PROPOSAL`. **Risk:** `RISK-ARCH-04` (ownership bypass).

### UNIT-009 — Collapse six `BetaOperatingSourceSnapshot` adapters · `Phase 1 (∥)` · LOW
- **Goal:** replace six shallow adapters with one `toSourceSnapshot(aggregate)` + `unavailableSnapshot(errorCategory)`. Deletion-test **pass-through / earns-keep-misplaced** (~50 dup lines).
- **Owned paths:** `app/admin/page.tsx` (4 inline `:60-92`); `lib/admin/recovery-overview.ts:10` + `release-overview.ts:12`; `feedback-aggregate.ts:17` + `support-aggregate.ts:17` (byte-identical `unavailableFields`); `activation-cohort-repository.ts:100`; `beta-operating-overview.ts` (the deep consumer — unchanged).
- **Implementation:** behavior-preserving adapter dedup — the surviving `toSourceSnapshot` produces a byte-identical snapshot for each input status.
- **Acceptance evidence:** snapshot-diff the overview output before/after; `tsc` on the 5 touched modules.
- **Recovery:** revert per-module.
- **Test decision:** `NOT_REQUIRED`. **Risk:** `RISK-ARCH-10`.

### UNIT-004 — Give the Row commit/dirty/routing rules a tested home · `Phase 2` · MED
- **Goal:** lift `commitExpressFields:509`, `commitQuantityFields:548`, `commitRowAdjustmentPercentage:596`, `commitContingencyPercentage:611` out of the `EstimateRowItemTableRow` render closure (`row-table.tsx:332-1056`) into a pure module beside the already-tested `editable-row-model.ts`. Deletion-test **earns-keep**.
- **Owned paths:** `src/components/workshop/estimate-sheet/rows/row-table.tsx` (commit block `:509-625`); new `row-commit-intention.ts`.
- **Implementation:** expose `buildRowCommitIntention(item, editableRow) → { patch, didChange, route }`; keep the routing predicate byte-identical (re-grep its exact boolean composition first — `04` §6.2: `:528` vs `:384` drift); the Row becomes a thin caller.
- **Acceptance evidence:** `estimate-sheet-quantity-contingency-model.test.ts` + `estimate-sheet-extracted-models.test.ts`; `estimate-sheet-unit-003-contracts.test.ts` (pins `onReconcileRowDirty` count).
- **Recovery:** revert; commits return inline.
- **Test decision:** `TEST_PROPOSAL`. **Risk:** `RISK-ARCH-02`, `RISK-ARCH-07`.

### UNIT-003 — Collapse the ~40-field row-handler hook into `RowMutationCoordinator` · `Phase 3` · HIGH
- **Goal:** replace the ~40-field `UseEstimateRowHandlersInput` (`use-estimate-row-handlers.ts:97-138`) with a coordinator of ~5 inputs that owns tree-state + rollback accounting; the other ~33 fields are derived from a store. Deletion-test **earns-keep-misplaced** (orchestration earns keep; 40-field signature does not).
- **Owned paths:** `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` (1503 ln); `EstimateSheetContent.tsx:2244` (sole call site — graph-confirmed 1 caller).
- **Implementation:** behavior-preserving signature-narrowing — the coordinator's external handler surface is unchanged (the 22-handler `Pick` at `branch.tsx:88-112` still resolves). Keep `markRowDirtyNow`/`markRowCleanNow` + `skipEditableRowsSyncRef` + rollbackRevision capture inside.
- **Acceptance evidence:** the 4 source-string contract tests stay green **and** a proposed `RowMutationCoordinator` unit test crosses the new seam (the first real execution coverage — today the orchestrator is referenced only by source string in tests). **Lease `EstimateSheetContent.tsx`.**
- **Recovery:** revert; the 40-field hook is the known-good baseline (1 caller → contained revert).
- **Test decision:** `TEST_PROPOSAL`. **Risk:** `RISK-ARCH-02`, `RISK-ARCH-05`, `RISK-ARCH-07`.

### UNIT-005 — Collapse the four-layer handler prop-drilling + delete comparators · `Phase 3` · MED
- **Goal:** provide `SheetMutationHandlers` + flags once via a **selector/context seam** (not a smaller prop list — `DEC-ARCH-06`); delete `areEstimateSheetBranchPropsEqual` (`branch.tsx:157`, ~68 ln) + `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:131`, ~44 ln). Deletion-test **earns-keep-misplaced** (comparators earn keep only because the drill forces them).
- **Owned paths:** `branch.tsx` (46 props, 22-handler Pick); `row-table.tsx`; `cells.tsx` (`EstimateMaterialCell`); `EstimateSheetContent.tsx`.
- **Implementation:** **order is load-bearing** — (1) stabilize handler identity (output of UNIT-003), (2) route drilled handlers/state through the zustand selector seam (per-row render already selector-driven `row-table.tsx:378`), (3) delete the comparators, (4) update the contract test's anchor expectations in-lockstep (`RISK-ARCH-09`: it asserts strings, not behavior). **Lease `EstimateSheetContent.tsx`, after UNIT-003.**
- **Acceptance evidence:** render-probe harness (`estimate-sheet-render-probe.ts`) — one keystroke in one table, assert other tables' row-render counts zero (`DEC-ARCH-PERF-03`); **baseline must be captured first** (`DEC-ARCH-SIM-03`); virtualization test `estimate-branch-virtualization.test.tsx`.
- **Recovery:** revert to comparators if the probe regresses.
- **Test decision:** `TEST_PROPOSAL`. **Risk:** `RISK-ARCH-06` (render storm), `RISK-ARCH-09`. **Depends on:** `UNIT-003`.

### UNIT-007 — Hoist the duplicated Component/Folder mutation layer · `Phase 4` · HIGH
- **Goal:** one `ComponentLibraryMutations` module owns folder CRUD/move/archive + the 31 generation-tracking rollback ref lines; `component-library/index.tsx` + `ComponentLibraryManager.tsx` become thin adapters. Deletion-test **earns-keep-misplaced** (one rule, two implementations; raw Row shape leaks into both UIs).
- **Owned paths:** `component-library/index.tsx` (3634 ln; `commitInlineFolderEdit:1798`, `createFolder:1893`, `confirmDeleteFolder:1973`, `handleLibraryItemMove:2671`, `archiveLibraryItems:2131`); `ComponentLibraryManager.tsx` (3160 ln; `commitCreateFolder:2788`, `commitRenameFolder:2822`, `confirmDeleteFolder:2862`, `moveComponentToFolder:2905`); `per-item-mutation-queue.ts`.
- **Implementation:** behavior-preserving consolidation — the 31 dup ref lines (`index.tsx:1043-1045`/`2678-2679`/`2689`; `Manager.tsx:2151-2152`/`2915-2916`) move as one indivisible unit; diff and assert the hoisted rollback predicate matches both originals; the Row→domain mapper moves to the repository (closes the UI-seam leak).
- **Acceptance evidence:** library action tests + `next build` (client modules calling server actions; `"use server"` boundary clean); `TEST_PROPOSAL` golden log of mutation/rollback sequences.
- **Recovery:** revert; two-implementation baseline restored.
- **Test decision:** `TEST_PROPOSAL`. **Risk:** `RISK-ARCH-03`, `RISK-ARCH-05`. **Depends on:** `UNIT-002`.

### UNIT-010..015 — Auxiliary (Phase 4, optional; do not block completion)
- **UNIT-010 (A1)** display-transform pipeline + identity invariant (`EstimateSheetContent.tsx:1777`); leases the file after UNIT-005. **UNIT-011 (A2)** merge the two project-activity repositories (`project-activity-repository.ts:156` hardcoded email + twin at `estimates/actions.ts:1066`). **UNIT-012 (A3)** free the source-snapshot sanitizer (`estimates/actions.ts:1543-1721`). **UNIT-013 (A4)** excise image-upload from `cells.tsx` (`:87/162/506`). **UNIT-014 (A5)** delete the dead `helpers.ts` half (6 exports, 0 importers). **UNIT-015 (A6)** deepen `corporate-account-actions.ts` + stop leaking `*Row` into the UI. Each is `NOT_REQUIRED` unless it shares a high-blast surface (A5 shares `RISK-ARCH-11`; A1 shares `RISK-ARCH-06`).

---

## 3. Shared-file lease map (`02` §3, `04` §3.2)

| Shared file | Touching units | Lease order |
|-------------|----------------|-------------|
| `EstimateSheetContent.tsx` (3680) | 006, 003, 005, 010 | **006 → 003 → 005 → 010** (one writer at a time; `LOOP_LEDGER` first-writer-wins) |
| `row-table.tsx` (1396) | 004 (commits `:509-625`), 005 (comparator `:131`) | 004 ∥ 003, then 005 after 003 (disjoint ranges; 005 gated on 003) |
| `ComponentLibraryManager.tsx` (3160) | 006 (`:425` reducer; **spare `:247`**), 007 (`:2788-2954`) | 006 (P0) → 007 (P4); never collide in time |
| `component-library/actions.ts` (5545) | 002 (direct), 007 (indirect) | 002 → 007 (in DAG) |
| `cells.tsx` (1486) | 005 (`:1142`), 013 (image-upload) | 005 (P3) → 013 (P4); never collide in time |

---

## 4. Verification posture (per `06` §4, `DEC-ARCH-08`)

- **Behavior-preserving bar:** observable outputs unchanged; `tsc` clean; `next build` clean.
- **`next build` is a verification surface**, not an automated gate — mandatory before claiming UNIT-002/003/007 done (the `"use server"` async-export check, `RISK-ARCH-05`); build-as-gate needs user authorization.
- **Tests:** `NOT_REQUIRED` default; `TEST_PROPOSAL` (risk + command, no execution) for UNIT-002/003/004/007/008; `TEST_TASK` needs a future explicit user request. No test execution or edits in this pack.
- **First milestone:** UNIT-006 + standalone `estimate-repository.ts` deletion (Wave 0).
