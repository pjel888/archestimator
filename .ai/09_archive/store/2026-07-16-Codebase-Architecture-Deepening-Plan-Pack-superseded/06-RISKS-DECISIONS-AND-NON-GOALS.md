# 06 — Risks, Decisions, Authorization Boundaries, Non-Goals

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Role doc:** Risks, decisions, AUTH boundaries, non-goals, ADR/context notes.
**Reconciles:** `DEC-ARCH-01..05` and AUTH from `00-EXECUTIVE-DIRECTION.md` (cited, not duplicated). Allocates `RISK-ARCH-01..11` and adds `DEC-ARCH-06..09`.
**Vocabulary:** module / interface / implementation / depth / seam / adapter / leverage / locality. *Estimate, Row, RowItem, Component, Variant, Folder, Sheet, Node* are domain nouns.

---

## 0. Unit → finding → top risk (overview)

| Unit | One-line finding (verified) | Top risk |
|------|-----------------------------|----------|
| UNIT-ARCH-01 | Carve ~1500-line Estimate-tree read slice out of the 4441-line god-file (`workspace-repository.ts`); 6 entry points (12/8/3/2/2/0 callers); delete 2 dead seams. | RISK-ARCH-08 (delete-order) / RISK-ARCH-11 |
| UNIT-ARCH-02 | Move ~2000 lines of inline write SQL out of `component-library/actions.ts` (5545) into the existing read-repo module; writes currently bypass it. | RISK-ARCH-01 (SQL drift) H |
| UNIT-ARCH-03 | Collapse the ~40-field `UseEstimateRowHandlersInput` (`use-estimate-row-handlers.ts:97-138`) into a deep `RowMutationCoordinator`; orchestrator is untested. | RISK-ARCH-02 (optimistic/rollback) H |
| UNIT-ARCH-04 | Lift commit/dirty/routing out of `EstimateRowItemTableRow` (`row-table.tsx:332-1056`); pure helpers in `editable-row-model.ts` ARE tested, the hand-diff commit is not. | RISK-ARCH-02 H |
| UNIT-ARCH-05 | Collapse 4-layer prop-drilling; delete two hand-written memo comparators (`branch.tsx:157`, `row-table.tsx:131`); contract test only asserts anchor strings. | RISK-ARCH-06 (render perf) / RISK-ARCH-09 |
| UNIT-ARCH-06 | Delete the pass-through reducer pattern: `EstimateSheetTree.tsx` (16 cases :244), `componentLibraryManagerReducer` (`ComponentLibraryManager.tsx:425`, 19 cases), `EstimateSheetContent.tsx` (1 + ~24 setters). | RISK-ARCH-08 / DEC-ARCH-07 |
| UNIT-ARCH-07 | Hoist duplicated Component/Folder mutation layer behind one module; `index.tsx` + `ComponentLibraryManager.tsx` each re-implement folder CRUD + 31 generation-rollback ref lines. | RISK-ARCH-03 (rollback) H |
| UNIT-ARCH-08 | Give the last-owner invariant one home: 3 SQL `EXISTS` predicates + 1 TS helper across `add/remove/updateMemberRole` + `isLastOwner`. | RISK-ARCH-04 (invariant) H |
| UNIT-ARCH-09 | Collapse 6 `BetaOperatingSourceSnapshot` adapters into one `toSourceSnapshot`; ~50 duplicated lines across admin overview/aggregate modules. | RISK-ARCH-10 L |

---

## 1. Risk register (RISK-ARCH-*)

| ID | Unit | L | I | Mitigation | Owner-decision? |
|----|------|---|---|-----------|-----------------|
| RISK-ARCH-01 | 02 | M | **H** | SQL-relocation parity proof + `TEST_PROPOSAL`; keep statement text byte-identical in first pass | **Y** |
| RISK-ARCH-02 | 03, 04 | M | **H** | Isolate optimistic-update + dirty/rollback into the new module; cross-seam behavior test proposed; golden state snapshots | **Y** |
| RISK-ARCH-03 | 07 | M | **H** | Move generation-tracking rollback as one unit; preserve the 31 ref-line contract; `TEST_PROPOSAL` | **Y** |
| RISK-ARCH-04 | 08 | L | **H** | Consolidate to one SQL predicate + one TS guard behind one function; verify both remove and update still reject last-owner loss | **Y** |
| RISK-ARCH-05 | 02, 03, 07 | M | M | Run `next build` (not just `tsc`/`vitest`) before claiming done — only the build catches non-async `"use server"` exports | N (build is the surface) |
| RISK-ARCH-06 | 05 | **H** | M | Perf signal + regression guard in `03-PERFORMANCE-AND-SPEED-STUDY.md`; keep per-row zustand selector (`row-table.tsx:378`); replace comparators with selector seams, not smaller prop lists | **Y** |
| RISK-ARCH-07 | 03, 04, 05 | L | M | Phase-2 units are on disjoint files; `LOOP_LEDGER.md` first-writer-wins on any collision | N (DEC-ARCH-04) |
| RISK-ARCH-08 | 01, 06 | M | M | Deletion order + recovery mapped per unit; delete setters only after their consumers move | N |
| RISK-ARCH-09 | 05 | M | M | Existing contract test asserts comparator anchor *strings*, not behavior — replace with a behavior assertion at the seam | N |
| RISK-ARCH-10 | 09 (+all) | L | M | Admin-only surface, `buildBetaOperatingOverview` already deep; behavior-preserving bar = identical snapshot output | **Y** (auth bar) |
| RISK-ARCH-11 | 01 | L | M | Re-`grep` zero-caller/zero-importer symbols immediately before delete; proven dead at audit time only | N |

L = likelihood, I = impact. **Bold** = the four high-blast units the program is sized around (02 SQL, 03/04 optimistic-update, 07 generation rollback, 08 ownership invariant).

---

## 2. Per-unit risk entries (failure scenario → mitigation)

### UNIT-ARCH-02 — Component write-repository (RISK-ARCH-01, high blast)
**Failure scenario:** Inline write SQL in `component-library/actions.ts` (e.g. `buildComponentPriceOptionWritePlan`, `buildLinkedEstimateRowsSyncStatement`, `buildUpdateCostLibraryComponentFanOutStatements`, the inline `INSERT` in `createCostLibraryComponent`, the `UPDATE`s in `updateCostLibraryComponentWithPriceOptions`) is moved into the repository module and a statement is subtly reordered, a CTE dropped, or a fan-out clause changed. Result: a Component write silently mutates a different row set, or `estimate_sheet_events` / `activity_event_outbox` rows are no longer emitted (table leakage shows these are touched 2x/1x in `actions.ts` and 0x in the read-repo). Writes are the destructive surface.
**Mitigation:** First pass is **statement-byte-identical relocation** — same SQL text, same parameter order, same transaction grouping — behind the new module's interface. The action keeps its orchestration role but calls the module. A `TEST_PROPOSAL` records the command that asserts write parity. Table-leakage counts (upload_assets 10x/0x, component_variant_attachments 7x/2x, cost_library_item_variant_cost_entries 6x/2x, estimate_sheet_events 2x/0x, activity_event_outbox 1x/0) are the closing checklist: after the move, every write table must still be reached from the same call paths.

### UNIT-ARCH-03 / UNIT-ARCH-04 — Row optimistic-update + rollback (RISK-ARCH-02, high blast)
**Failure scenario:** The ~40-field `UseEstimateRowHandlersInput` (`use-estimate-row-handlers.ts:97-138`) and the four hand-diff commit functions in `row-table.tsx` (`commitExpressFields:509`, `commitQuantityFields:548`, `commitRowAdjustmentPercentage:596`, `commitContingencyPercentage:611`) encode optimistic update + dirty marking + the `onUpdateLinkedLibraryComponent` vs `onUpdateRowItem` route (verified at `row-table.tsx:528-532`). Deepening collapses the input surface and moves the commit/routing rules into a module. If rollback / dirty-clear / linked-vs-local routing is transcribed wrong, an edit lands on the library Component when it should stay local (or vice-versa), or a failed mutation leaves a Row stuck dirty. The orchestrator beside the tested `editable-row-model.ts` helpers is currently **untested** — that is the locality gap this unit closes.
**Mitigation:** The routing rule (`isLinkedSharedComponent && onUpdateLinkedLibraryComponent` → library path, else `onUpdateRowItem`) becomes the module's named behavior and the proposed test crosses exactly that seam. Optimistic + dirty + rollback move together as one slice; no half-move. The pure helpers in `editable-row-model.ts` stay where they are (they are the part that already passes the deletion test).

### UNIT-ARCH-07 — generation-tracking rollback (RISK-ARCH-03, high blast)
**Failure scenario:** `index.tsx` (3634 lines) and `ComponentLibraryManager.tsx` (3160) each re-implement folder CRUD/move/archive (`commitInlineFolderEdit:1798`, `createFolder:1893`, `confirmDeleteFolder:1973`, `handleLibraryItemMove`, `archiveLibraryItems` in index; `commitCreateFolder:2788`, `commitRenameFolder:2822`, `confirmDeleteFolder:2862`, `moveComponentToFolder:2905` in Manager) and **31 duplicated generation-tracking rollback ref lines**. Hoisting these behind one module means moving the rollback bookkeeping. If a generation ref is dropped or wired to the wrong callback, a stale write overwrites a fresh Component/Folder and the rollback fires against the wrong generation.
**Mitigation:** Generation rollback moves as one indivisible unit with the mutation it guards; the 31-ref contract is preserved verbatim in the first pass. Depends on UNIT-ARCH-02 (the write-repository it consumes) being settled first.

### UNIT-ARCH-08 — last-owner invariant (RISK-ARCH-04, high blast, correctness/security)
**Failure scenario:** The last-owner rule is encoded four times: `addCorporateAccountMember:450` (inline `OR EXISTS` at :475), `removeCorporateAccountMember:542` (calls `isLastOwner:511` guard at :552, plus its own `OR EXISTS` at :566), `updateCorporateAccountMemberRole:592` (calls `isLastOwner` at :608, plus `OR EXISTS` at :625), and the `isLastOwner` TS helper at :511. Consolidating these risks a path that no longer rejects the operation that would leave an account with zero owners — a privilege/integrity break. (Note: line anchors drifted ~16 from the source review's 466/559/616; the structural finding — 3 SQL + 1 TS — holds.)
**Mitigation:** Target is **one SQL predicate + one TS guard behind one function**; both the remove path (:552) and the update path (:608) must still reject last-owner loss after the move. Because this touches SQL, it carries `TEST_PROPOSAL` and a behavior-preserving plan (AUTH §4).

### UNIT-ARCH-05 — render performance + false-confidence tests (RISK-ARCH-06, RISK-ARCH-09)
**Failure scenario:** Removing the two hand-written memo comparators (`areEstimateSheetBranchPropsEqual` `branch.tsx:157`, ~68 lines; `areEstimateRowItemsTablePropsEqual` `row-table.tsx:131`, ~44 lines) and collapsing the 4-layer prop-drilling (branch ~46 props / 22-handler `Pick` at `branch.tsx:88-112`; row-table ~32 props; cells ~25-prop `EstimateMaterialCell`) regresses render perf: more rows re-render per keystroke. The existing contract test (`estimate-sheet-unit-003-contracts.test.ts`) only asserts the comparators' anchor *strings*, so it stays green even if the comparator's behavior is gone — false confidence.
**Mitigation:** Per-row render is already driven by a zustand selector (`row-table.tsx:378`); the deepening seam is a **selector/context, not a smaller prop list** (DEC-ARCH-06). The comparator-anchor contract test is replaced with a behavior assertion at the seam. Perf signal + regression guard live in `03-PERFORMANCE-AND-SPEED-STUDY.md`.

### UNIT-ARCH-01 / UNIT-ARCH-06 — deletion order (RISK-ARCH-08, RISK-ARCH-11)
**Failure scenario (01):** Deleting the two dead seams — `estimateRepository` (`estimate-repository.ts:108`, verified **zero** importers outside its own file) and `clearEstimateRouteContextProcessCache` (`workspace-repository.ts:4090`, body `void projectId;`, a no-op with exactly 4 callers: `estimates/actions.ts:2291,3807,4070` + `express-promotion-actions.ts:927`) — in the wrong order strands a dangling import. `getProjectEstimateTreeByNode` shows 0 callers and is deleted with the slice.
**Mitigation:** Each deletion carries order + recovery; zero-caller/zero-importer symbols are re-`grep`'d immediately before the delete (audit-time dead ≠ merge-time dead — RISK-ARCH-11).
**Failure scenario (06):** The pass-through setters (`EstimateSheetTree.tsx:406-446`, ~16 wrappers) are deleted before their call sites move, breaking the build mid-refactor.
**Mitigation:** Setter wrappers are deleted only after consumers move to direct dispatch / `useReducer`; `EstimateSheetTree.tsx`, `ComponentLibraryManager.tsx`, `EstimateSheetContent.tsx` are disjoint so Phase 0 is safe to land first.

### UNIT-ARCH-09 — adapter collapse (RISK-ARCH-10, low)
**Failure scenario:** Six `BetaOperatingSourceSnapshot` adapters (`admin/page.tsx` inline at ~60-92; `recovery-overview.ts:10` + `release-overview.ts:12` identical-shape `unavailable*` helpers; byte-identical `unavailableFields` in `feedback-aggregate.ts` + `support-aggregate.ts`; `activation-cohort-repository.ts` its own) collapse to one `toSourceSnapshot` and a snapshot field is dropped or its availability mis-mapped. Admin-only surface; `buildBetaOperatingOverview` is already deep.
**Mitigation:** Behavior-preserving bar = identical overview snapshot output; lowest-risk unit in the program.

---

## 3. Decisions

### Reconciled (from `00-EXECUTIVE-DIRECTION.md`, not duplicated)
- **DEC-ARCH-01 — Plan pack warranted.** Nine deepening candidates across the 60-day hot belt, three repeating systemic habits (god-modules, pass-through reducers, tested-helpers-beside-untested-orchestrators), and shared-file coordination needs → a dated pack with a DAG and ledger, not in-session loops. (00 §1, §7.)
- **DEC-ARCH-02 — Default `NOT_REQUIRED`; `TEST_PROPOSAL` set for high-blast units.** `test_requirement = NOT_REQUIRED` pack-wide; `TEST_PROPOSAL` (risk + command, **no execution**) for 02, 03, 04, 07, 08. `TEST_TASK` needs a future explicit user authorization — no test execution or edits in this pack. (00 §9.)
- **DEC-ARCH-03 — Deletion over compatibility.** Alpha/pre-beta: plan the direct target design and fix-forward. No speculative shims, feature flags, rollout, or rollback beyond a proven current obligation. (00 §4.)
- **DEC-ARCH-04 — One writer per shared file; `LOOP_LEDGER.md` first-writer-wins.** The integrating-spine files have one writer (lead); analysis docs are disjoint write targets (safe parallel). Phase-2 units (03/04/05) are on disjoint files but any collision resolves first-writer-wins via the ledger. (00 §7, §8.)
- **DEC-ARCH-05 — Read-before-write sequencing.** UNIT-ARCH-01 (read module) lands before UNIT-ARCH-02 (write-repository) so the action↔repository layering is legible first. (00 §7.)

### New (surfaced by this analysis)
- **DEC-ARCH-06 — Seam placement for UNIT-ARCH-05 is selector/context, not a smaller prop list.** Per-row render is already selector-driven (`row-table.tsx:378`), so the deepening move is to route the drilled handlers/state through that seam and delete the hand-diff comparators, rather than re-shaping the prop list (which would just re-create a wide interface one layer down). This is what closes the leakage finding without a render-perf regression.
- **DEC-ARCH-07 — Keep the logic-encoding reducer; delete only pass-through ones.** The source review's intent is correct but its file attribution is off by one file: the sibling reducer that **encodes logic** is `componentLibrarySheetReducer` at **`ComponentLibraryManager.tsx:247`** (its `catalogueBranchToggled` builds a `Set`; `denseSortChanged`/`sortFieldChanged`/`sortDirectionChanged` call `getNextDenseSortState`) — **keep it**. The pass-through reducer in the *same* file is `componentLibraryManagerReducer` at **`:425`** (19 one-line `resolveStateUpdater` cases) — that is the UNIT-ARCH-06 deletion target, alongside `estimateSheetTreeReducer` (`EstimateSheetTree.tsx:244`) and `estimateSheetContentReducer` (`EstimateSheetContent.tsx:864`, single `fieldChanged` case + ~24 `useStableCallback` setters at `:1340+`). Deletion scope is "pass-through only"; a case that computes does not get deleted.
- **DEC-ARCH-08 — Behavior-preserving bar.** For every unit: the module's observable outputs are unchanged (golden snapshots / existing tests green *where authorized*), `tsc` and `next build` clean. `next build` is a **verification surface, not a gate**, unless the user authorizes it as a gate. This is recorded so executors know the bar without re-deriving it.
- **DEC-ARCH-09 — Last-owner consolidation target (UNIT-ARCH-08).** One SQL predicate + one TS guard behind one function — not the current 3 SQL + 1 TS. The function is the test surface; both the remove (:552) and update (:608) paths must route through it.

---

## 4. Authorization boundaries (AUTH)

This is a **planning** task. No external, paid, production, credential-gated, or cross-provider action occurs in-pack. (Reconciled with 00 §10.)

**Execution-time AUTH surfaces (flagged for the future execution task, not authorized here):**
- **D1/SQL relocation — UNIT-ARCH-02 and UNIT-ARCH-08.** Both move SQL within the existing schema (no migration, no schema change). They touch the data layer, so each carries a `TEST_PROPOSAL` and a behavior-preserving verification plan (02: write-parity across the 5 leaked tables; 08: both remove and update still reject last-owner loss). These are local-schema-preserving moves, not destructive/production actions.
- **`"use server"` exports must stay async-only — UNIT-ARCH-02, 03, 07.** `component-library/actions.ts:1` and `estimates/actions.ts:1` both open with `"use server";`. A `"use server"` module that exports a non-async function is **not** caught by `tsc` or `vitest` — only `next build` catches it (known repo gotcha). When execution moves functions across the server/client seam, `next build` is the decisive check and must pass before the unit claims done. Build-as-gate still needs user authorization.

**Gates triggered (00 §11):** GATE-CONTRACT-01 (01/02/03/04/05/07 — interfaces change); GATE-NEXT-01 (02 server/client + 03/04/05/07 client — verify the seam + async-only exports); GATE-PERF-01 (render/query units — study in doc 03); GATE-CLEAN-01 (01/06 deletion order + recovery); GATE-VERIFY-01 (every unit → cheapest decisive authorized evidence).

---

## 5. Non-goals (expanded from 00 §4)

- **No behavior change** to product features. Every unit is behavior-preserving by intent; observable output must match current output. Deepening changes *module shape*, not behavior.
- **No new product features, no UI redesign, no schema change, no new dependencies.** The display-transform (A1), glass/sheet redesign, and any schema work are explicitly out of scope.
- **No speculative compatibility shims, feature flags, rollout, or rollback** beyond what a proven current obligation requires (alpha/pre-bias; DEC-ARCH-03).
- **No automated test execution or test edits in this pack.** Tests are `TEST_PROPOSAL` at most (DEC-ARCH-02); `TEST_TASK` needs a future explicit user request.
- **The Auxiliary units (A1–A6) are optional** Phase-4 follow-ons; they do not block core completion (00 §4). They are noted for risk only where they share a surface with a core unit (A3 shares `estimates/actions.ts` context; A4 shares `cells.tsx`; A5's dead-half deletion shares RISK-ARCH-11).
- **No enforcement of DESIGN.md as law.** Per the project's alpha guidance, DESIGN.md is a guide; this pack does not gate, block, or revert on design grounds.

---

## 6. ADR / context notes

- **No `docs/adr/` exists** and **no `CONTEXT.md` exists** in the repo (verified). Nothing for this program's decisions to conflict with. DEC-ARCH-01..09 are the live record; if a future ADR convention is adopted, these map 1:1 to ADR entries.
- **Domain-adjacent terms introduced by deepening** (not yet in a CONTEXT.md, recorded here so they are not invented twice): `RowMutationCoordinator` (the deep target of UNIT-ARCH-03), `write-repository` (the UNIT-ARCH-02 module — the read-repository already exists as `component-library-repository.ts`), `toSourceSnapshot` (the UNIT-ARCH-09 unifying adapter), `last-owner invariant` (the UNIT-ARCH-08 rule). These are architecture/module names over the existing domain nouns, not new domain vocabulary.
- **Known duplications discovered beyond the review** (context, not new scope): the `philipjonlewis@gmail.com → "Philip Lewis"` display-name mapping is encoded in **two** places — `project-activity-repository.ts:156` (the A2 target) **and** `estimates/actions.ts:1066`. A2 merges the two project-activity repositories; the `actions.ts:1066` twin is noted so a future A2 execution does not leave a stranded copy.

---

## 7. Evidence fingerprints

All anchors re-verified against live source on 2026-07-16 (file:line). Line drift from the source-review HTML is noted where present.

- `workspace-repository.ts` = 4441 lines; `clearEstimateRouteContextProcessCache` no-op at **:4090** (`void projectId;`); 4 callers: `estimates/actions.ts:2291,3807,4070` + `express-promotion-actions.ts:927`.
- `estimate-repository.ts:108` — `estimateRepository` def; **zero** importers outside its own file (dead, deletion-test PASS).
- Estimate-tree entry-point callers (non-def, non-test): `getEstimateTabTree`=12, `getProjectEstimateTreeByEstimate`=8, `resolveEstimateTabRouteContext`=3, `getEstimateNodeSubtree`=2, `getEstimateTreesForTabs`=2, `getProjectEstimateTreeByNode`=0.
- `component-library/actions.ts` = 5545 lines, opens `"use server";` (:1); `component-library-repository.ts` = 2361 lines (read-repo).
- `estimates/actions.ts` = 4197 lines, `"use server";` (:1); `SOURCE_SNAPSHOT_ALLOWED_KEYS` at :1543; `sanitizeSourceSnapshot*` at :1606/:1615/:1619 (A3).
- `use-estimate-row-handlers.ts` = 1503 lines; `UseEstimateRowHandlersInput` at **:97-138** = **~40 fields** (review said ~38; structural claim holds).
- `row-table.tsx` = 1396 lines; `EstimateRowItemTableRow` at **:332** → next fn `handleTableDragOver` at :1057 (component span :332-1056); commit fns `commitExpressFields:509`, `commitQuantityFields:548`, `commitRowAdjustmentPercentage:596`, `commitContingencyPercentage:611`; route `onUpdateLinkedLibraryComponent` vs `onUpdateRowItem` at :528-532; comparator `areEstimateRowItemsTablePropsEqual:131`; per-row zustand selector at :378.
- `branch.tsx` = 622 lines; `areEstimateSheetBranchPropsEqual:157`; `SheetMutationHandlers` 22-handler `Pick` at :88-110; `memo(...)` at :621.
- `cells.tsx` = 1486 lines.
- `EstimateSheetTree.tsx`: `resolveStateUpdater:219`, `estimateSheetTreeReducer:244` (16 cases :249-283), setter wrappers :406-446.
- `EstimateSheetContent.tsx`: `estimateSheetContentReducer:864` (single `fieldChanged` case :869), `useStableCallback` setters at :1340+.
- `component-library/index.tsx` = **3634** lines (review said 3635 — off by 1); folder CRUD `commitInlineFolderEdit:1798`, `createFolder:1893`, `confirmDeleteFolder:1973`.
- `ComponentLibraryManager.tsx` = 3160 lines; **`componentLibrarySheetReducer:247` (logic-encoding — KEEP)**; `componentLibraryManagerReducer:425` (19 pass-through cases — DELETE); `ComponentLibraryManagerState:343`; `resolveStateUpdater:391`; folder CRUD `commitCreateFolder:2788`, `commitRenameFolder:2822`, `confirmDeleteFolder:2862`, `moveComponentToFolder:2905`.
- `corporate-account-repository.ts` = 1100 lines; `addCorporateAccountMember:450` (OR EXISTS :475), `isLastOwner:511`, `removeCorporateAccountMember:542` (guard :552, OR EXISTS :566), `updateCorporateAccountMemberRole:592` (guard :608, OR EXISTS :625). (Review's 466/559/616 drifted ~+16.)
- BetaOperating adapters: `admin/page.tsx` inline ~:60-92; `recovery-overview.ts:10` (`unavailableRecoverySource`); `release-overview.ts:12` (`unavailableReleaseSource`); `feedback-aggregate.ts` + `support-aggregate.ts` (byte-identical `unavailableFields`).
- `project-activity-repository.ts` = 309 lines (email mapping :156); `project-activity-feed-repository.ts` = 1515 lines; twin mapping at `estimates/actions.ts:1066`.
- `component-library/helpers.ts` = 683 lines; `filterComponents`/`sortComponents`/`groupComponents`/`parseLibraryCsv`/`exportLibraryItemsToCsv`/`createDefaultLibraryBundles` = **0 production refs** each (A5 dead half).
- `docs/adr/` absent; `CONTEXT.md` absent; `plan-pack.json` not yet written (lead-owned, doc 06 does not create it).

---

## 8. Gaps / open questions

1. **Review file attribution error (carry into execution).** The "keep" logic-encoding reducer is `componentLibrarySheetReducer` at **`ComponentLibraryManager.tsx:247`**, not `index.tsx:247` as the source review states (DEC-ARCH-07 corrects this). The UNIT-ARCH-06 execution sketch must delete the pass-through `componentLibraryManagerReducer` at `:425` in the *same* file, not a reducer in `index.tsx`. Doc `01-CURRENT-ARCHITECTURE-AUDIT.md` should re-anchor this.
2. **`next build` as gate vs surface — user decision deferred.** DEC-ARCH-08 holds build as a verification surface; whether it becomes a blocking gate for the `"use server"` risk (RISK-ARCH-05) is a user authorization call at execution time, not a planning call.
3. **Line drift is ongoing.** Several anchors drifted from the review HTML by 1–16 lines under active commits (index.tsx 3635→3634; corporate-account +~16). Doc `01` and the unit execution sketches should re-`grep` at execution time, not trust this doc's (or the review's) line numbers. Symbol names and structural findings are stable; line numbers are not.
4. **A2 scope twin.** The `email → "Philip Lewis"` mapping at `estimates/actions.ts:1066` is outside the A2 file set as written (A2 targets the two project-activity repositories). If A2 executes, decide whether to also collapse the `actions.ts:1066` twin or leave it — currently noted, not resolved.
5. **No executable behavior-preserving evidence in-pack.** Because tests are `TEST_PROPOSAL` only, the behavior-preserving bar (DEC-ARCH-08) is asserted by reasoning + parity proof in this planning phase, not by a green run. That is the intended alpha posture, but it means planning-time "behavior-preserving" is a claim, not a demonstrated fact, for the four high-blast units.
