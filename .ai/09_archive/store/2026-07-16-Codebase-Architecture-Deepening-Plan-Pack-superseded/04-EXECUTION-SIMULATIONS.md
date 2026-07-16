# 04 — Execution Simulations

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Role:** Execution simulations. Grounds 4 sequencing what-ifs, 6 failure-mode walks, and a parallelization map in the wave-1 findings (`01`-audit, `02`-blast, `03`-perf, `06`-risks) and the contract (`00`).
**Method:** every file:line below was re-verified against live source on 2026-07-16 (grep + read). Study-local IDs use the **`*-SIM-NN`** sub-series (`RISK-ARCH-SIM-*`, `DEC-ARCH-SIM-*`, `EV-ARCH-SIM-*`), matching the `*-BR-*` (doc 02) and `*-PERF-*` (doc 03) conventions; `06` may promote any into the canonical `RISK-ARCH-NN` / `DEC-ARCH-NN` series.
**Vocabulary:** module / interface / implementation / depth / seam / adapter / leverage / locality. *Estimate, Row, RowItem, Component, Variant, Folder, Sheet, Node* are domain nouns.

---

## 0. Summary table — unit → sequencing finding → execution risk

| Unit | One-line sequencing finding (verified) | Top execution risk |
|------|----------------------------------------|--------------------|
| **01** | Sole editor of `workspace-repository.ts` (4441 ln); no file contention; dead seams bundle inside the carve, not before it | RISK-ARCH-08 / RISK-ARCH-11 (delete-order + audit-time-dead) |
| **02** | Sole editor of `component-library/actions.ts` (5545 ln); on the critical path (07 waits on it); HIGH blast, `next build` is the decisive surface | RISK-ARCH-01 / RISK-ARCH-PERF-03 (SQL drift / atomicity loss) |
| **03** | 1 caller (`EstimateSheetContent.tsx:2244`); shares that file with 05/06/A1 → must lease; gates 05 (handler identity first) | RISK-ARCH-02 (optimistic/rollback) H |
| **04** | Disjoint line range in `row-table.tsx` (commits 509-625) from 05's comparator (131); parallels 03 | RISK-ARCH-02 H |
| **05** | **Gated on 03** (stabilize handlers before deleting comparators); render-probe baseline must be captured first (doc-03 §8.2 gap) | RISK-ARCH-06 / RISK-ARCH-PERF-02 (render storm) |
| **06** | Phase-0 quick win; 3 disjoint files; must spare `componentLibrarySheetReducer` (`ComponentLibraryManager.tsx:247`, DEC-ARCH-07) | RISK-ARCH-08 L |
| **07** | Waits on 02 (consumes its write-repository); 31 dup generation-ref lines move as one unit | RISK-ARCH-03 (rollback race) H |
| **08** | Sole editor of `corporate-account-repository.ts`; rare HIGH-safety unit WITH real test coverage (6 test files) | RISK-ARCH-04 (ownership bypass) H |
| **09** | Sole editor of the admin cluster; lowest-risk unit in the program; deep module already exists | RISK-ARCH-10 L |
| AUX A1-A6 | Optional P4; A1 shares `EstimateSheetContent.tsx` (leases after 05); A4 shares `cells.tsx` (never collides with 05 in time) | LOW (per doc-02 §1) |

---

## 1. Sequencing what-ifs

Critical path = the longest dependency chain a worker must walk serially. "Wave" = a set of units that can run concurrently because their files are disjoint.

### (a) Baseline — `06 → 01 → 02 → (03,04 ∥) → 05 → (07,08,09 ∥) → AUX`

This is `00` §7. Re-traced against the verified DAG:

- **Critical path:** `06 → 01 → 02 → 03 → 05` (5 serial steps) and `02 → 07` (3 from 02). 04 parallels 03 inside Phase 2; 08/09 are free-floating in Phase 3. So the program's wall-clock spine is **5 serial deepening steps**, with 02 (HIGH SQL) sitting in the middle of it.
- **Shared-file contention:** serializes naturally. 06 lands first on `EstimateSheetContent.tsx`'s reducer/setter block (Phase 0), clearing that file; 03 takes it next (Phase 2), then 05 (gated on 03). `row-table.tsx` sees 04 (commits) then 05 (comparator) — disjoint ranges, ordered. No lease collision because the phases don't overlap.
- **Risk profile:** ramps low → high → high. Phase 0/1 (06, 01) are LOW/MED and derisk the pipeline; the HIGH units (02, then 03/04, then 07) arrive once the ledger/build/verify loop is proven.
- **Wins when:** you want the read/write foundation (01/02) legible before anyone touches the sheet brain — `DEC-ARCH-05` (read-before-write). **Loses when:** 02 stalls (it is HIGH blast, `next build`-gated, and moves D1 write SQL), because 07 is blocked on it and the whole program's tail slips. Mitigated by running 08/09 (disjoint) concurrently with the 02 retry.

### (b) Estimate-sheet-first — `03/04/05` before `01/02`

- **Critical path:** `03 → 05` (ordered by the handler-identity gate), 04 ∥ 03, then `01 → 02 → 07`. Same ~5-step length as (a), but the HIGH render-perf risk is taken **before** the LOW-risk deletions (06) and before the foundation (01).
- **The hidden guard gap (load-bearing):** 05's only regression guard is the render-probe (`DEC-ARCH-PERF-03`), and doc-03 §8.2 confirms **no baseline render counts are captured today**. Doing the render-path units first means flying with a "≤ baseline" guard that has no number unless the baseline is captured as a separate first act. This is the single biggest reason not to lead with the sheet.
- **Forfeits the clean 06 landing.** In (a), 06 is Phase-0 and edits `EstimateSheetContent.tsx`'s setter block alone. In (b), 06 now contends with 03/05 on that same 3680-line file instead of landing cleanly first — it either serializes behind them (losing its quick-win value) or takes a lease mid-refactor (collision risk).
- **Module-independence caveat (the tempting part):** 03/04/05 are client-side; 01/02 are server-side. The seam between them is the TanStack-Query / server-action boundary, which neither side moves. So deepening the sheet brain first is **not** a correctness dependency on 01/02 — it is purely a sequencing/parallelization choice. That makes (b) feasible, just not preferable.
- **Wins when:** the sheet brain is the product-critical path and the team's context on `use-estimate-row-handlers.ts` is freshest now. **Loses otherwise:** you pay render-perf risk upfront without the guard captured, and you surrender 06's clean Phase-0 derisk.

### (c) Deletions-only fast pass — `06 + standalone dead seams` first, ship, then the rest

Simulation (c) splits the dead-seam deletions out of 01 and ships them with 06 before any HIGH-risk unit.

- **What ships fast (near-zero risk):**
  - 06: ~36 pass-through reducer cases + ~59 setter wrappers across `EstimateSheetTree.tsx` / `ComponentLibraryManager.tsx` / `EstimateSheetContent.tsx` (doc-01 §2b). `resolveStateUpdater` re-implements `useState`'s functional update — deletion-test fails outright (`DEC-ARCH-BR-06`).
  - `estimate-repository.ts` (108 ln): `estimateRepository` has **0 importers** outside its own def (`EV-ARCH-01`). Standalone file, no shared surface — truly safe to delete independently.
- **What must NOT split out (stays inside 01's carve):**
  - `clearEstimateRouteContextProcessCache` (`workspace-repository.ts:4090`, body `void projectId;`, 4 callers `estimates/actions.ts:2291,3807,4070` + `express-promotion-actions.ts:927`) — lives in `workspace-repository.ts`, the same file 01 carves. Deleting it separately = a second pass over the 4441-line god-file. `RISK-ARCH-SIM-01`: fragmenting 01 into two touches of the same huge file costs more in re-merge/re-grep than it saves in early shipping.
  - `getProjectEstimateTreeByNode` (0 external callers, **1 internal at `workspace-repository.ts:4316`**) — deleting its public export requires repointing that internal caller; doing it outside the carve strands a half-move. Bundles with 01.
- **Value:** proves the `LOOP_LEDGER`/build/verify pipeline on trivial wins before committing to 02/03/07. If the ledger-lease protocol or `next build` surface has a glitch, you find out at LOW risk, not HIGH.
- **Wins when:** the execution pipeline itself is unproven (first time the team runs this pack's ledger). **Loses when:** it fragments 01 — the dead seams are part of 01's "honesty" story (the fossilized invalidation cache, doc-03 §3.1), and splitting them is a coherence loss for marginal time savings.

### (d) Max parallelism — exploit disjoint files aggressively

Four units are sole-editors of files no other unit touches → they can run fully concurrently: **01** (`workspace-repository.ts`), **08** (`corporate-account-repository.ts`), **09** (admin cluster), and **02** (`component-library/actions.ts`, after 01). The constraint is never breadth; it is the three shared files below in §3.

- **Wave 1 (4 concurrent):** 06 (3 files, pass-through block only), 01, 08, 09 — all disjoint.
- **Wave 2 (2 concurrent):** 02 (after 01, `DEC-ARCH-05`), 04 (disjoint from 06-now-landed on `row-table.tsx`).
- **Wave 3 (leased, serial on `EstimateSheetContent.tsx`):** 03, then 05 (gated on 03).
- **Wave 4:** 07 (after 02).
- **The single binding constraint** is `EstimateSheetContent.tsx` (3680 ln): at most one of {03, 05, 06, A1} edits it at a time. 06 should be the first to touch it (LOW risk, scoped to the reducer/setter block), clearing the file so 03/05 can lease it cleanly later.
- **Wins when:** ≥3 workers are available and wall-clock matters. **Loses when:** the ledger-leasing coordination overhead (STARTED/COMPLETE markers, conflict resolution) exceeds the parallelism gain — plausible for a pack this size, where the DAG already encodes the safe ordering and most units are serial anyway.

**Net of the four:** (a) is the safe default; (c)'s "derisk the pipeline on trivial wins" insight is worth folding into (a) as a Wave-0 (06 + the standalone `estimate-repository.ts` deletion only — not the workspace-repository.ts seams); (d)'s "01/08/09 concurrent in Wave 1" is a free parallelism win inside (a); (b) is dominated because it takes render-perf risk before capturing its own guard. The recommended sequence (§4) adopts (a) + the safe parts of (c) and (d).

`DEC-ARCH-SIM-01:` adopt baseline (a), augmented by (i) a Wave-0 pipeline-derisk scoped to 06 + the standalone `estimate-repository.ts` deletion only (not the `workspace-repository.ts` seams, which stay bundled in 01 per `RISK-ARCH-SIM-01`), and (ii) max-parallelism Wave-1 (01 ∥ 08 ∥ 09). Reject (b): it takes render-perf risk before the guard exists.

---

## 2. Failure-mode simulations

Each walk: **trigger → symptom → detection → recovery.** Guards cited from doc-03 (`EV-ARCH-PERF-*`) and doc-06 (`RISK-ARCH-*`).

### 2.1 Optimistic-update / rollback corruption — UNIT-ARCH-03 (and 04) · `RISK-ARCH-02` (HIGH)

- **Trigger:** collapsing the ~40-field `UseEstimateRowHandlersInput` (`use-estimate-row-handlers.ts:97-138`) into a `RowMutationCoordinator` with ~5 inputs, the dirty-reconciliation pair `markRowDirtyNow`/`markRowCleanNow` is mis-wired, or the coordinator re-derives the other 33 fields from the wrong store slice.
- **Symptom:** user edits a quantity → coordinator fails to mark the Row dirty → `commitQuantityFields` (`row-table.tsx:548`) never fires → the `skipEditableRowsSyncRef` guard drops the edit → **silent loss on tab switch**. Symmetric: rollback restores the wrong baseline after a failed mutation.
- **Detection:** the contract test `estimate-sheet-unit-003-contracts.test.ts` pins `reconcileRowDirty` + `editableRowsEqual(...)` anchors — but as **source-string** assertions (`RISK-ARCH-09`: false confidence; it stays green even if behaviour is gone). The decisive detection is the proposed `RowMutationCoordinator` unit test crossing the new seam (`TEST_PROPOSAL`, doc-02 §UNIT-03). Without it, detection = manual edit + tab-switch + observe loss. 04 adds the routing predicate (`row-table.tsx:528`: `if (isLinkedSharedComponent && onUpdateLinkedLibraryComponent)`) — a dropped `canManageLibrary`-equivalent term lets a viewer silently edit the shared library Component (privilege break, doc-02 §UNIT-04).
- **Recovery:** revert the coordinator collapse. 03 has exactly **1 caller** (`EstimateSheetContent.tsx:2244`, graph-confirmed `EV-ARCH-03`), so revert is contained to one call site. The 40-field hook is the known-good baseline. Move optimistic + dirty + rollback **together as one slice** — no half-move (doc-06 §UNIT-03/04 mitigation).

### 2.2 Context-provider re-render storm — UNIT-ARCH-05 · `RISK-ARCH-PERF-02` / `RISK-ARCH-06` (HIGH)

- **Trigger:** replacing the 4-layer prop-drill with a single React Context placed above the branch layer, putting all sheet-wide state on one provider. (The tempting naive replacement.)
- **Symptom:** every context consumer re-renders when any slice changes → a keystroke in one table re-renders **every visible Row/Branch** → sheet unusable on large Estimates. This regresses the exact perf the two comparators (`areEstimateSheetBranchPropsEqual` `branch.tsx:157`, ~68 ln; `areEstimateRowItemsTablePropsEqual` `row-table.tsx:131`, ~44 ln) were built to protect.
- **Detection:** the render-probe harness (`estimate-sheet-render-probe.ts`) — install `setEstimateRowItemRenderProbe` / `setEstimateSheetBranchRenderProbe` / `setEstimateRowItemsTableRenderProbe`, fire one keystroke in one table, assert the **other tables' row-render counts are zero** (`DEC-ARCH-PERF-03`: the probe is decisive, not wall-clock). Probe call-sites verified: `row-table.tsx:376/1108`, `branch.tsx:228`, `EstimateSheetContent.tsx:1184` (`EV-ARCH-PERF-01`). **Gap:** doc-03 §8.2 confirms no baseline is captured today → capture one before refactoring or the "≤ baseline" guard has no number.
- **Recovery:** `DEC-ARCH-PERF-01` — use a **zustand store + narrow selectors** (proven at `editableRowStore`, consumed at `row-table.tsx:378`) for any per-keystroke slice; Context only for read-only/near-static values. If the probe regresses, revert to the comparators. Sequencing is load-bearing: **stabilize handler identity (03) before deleting the comparators (05)**, or you delete the guard while the cause (fresh closures per render) still exists.

### 2.3 Write-repository SQL drift / atomicity loss — UNIT-ARCH-02 · `RISK-ARCH-01` / `RISK-ARCH-PERF-03` (HIGH)

- **Trigger:** moving inline write SQL out of `component-library/actions.ts` into the write-repository, a statement is reordered, the `statements` array split across two repository calls without a shared transaction, or `buildLinkedEstimateRowsSyncStatement` (`actions.ts:615`) is separated from the Component update it must co-commit with.
- **Symptom:** partial commit — Component's new price persists while its linked Estimate Rows still show the old price (**silent money mismatch on a printed proposal**, doc-02 §UNIT-02). Or atomicity lost: the single D1 round-trip (`runAtomicBatch`, `actions.ts:247`, hard-requires `database.batch` — verified at :251) becomes N serialized awaits.
- **Detection:** **statement-count parity** — `statements.length` before/after per mutation is the contract surface (`RISK-ARCH-PERF-03`, `DEC-ARCH-PERF-03`). 8 `runAtomicBatch` call-sites verified (`1717,2717,3667,3785,3806,3877,3985` + def `247`); none may appear/disappear. Plus `next build` (`RISK-ARCH-05`): `actions.ts:1` opens `"use server";` — a non-async `"use server"` export is caught **only** by build, not `tsc`/vitest (known repo gotcha). Table-leakage checklist closes the move: after relocation, every write table (`upload_assets` 10/0, `component_variant_attachments` 7/2, `cost_library_item_variant_cost_entries` 6/2, `estimate_sheet_events` 2/0, `activity_event_outbox` 1/0 — `EV-ARCH-02`) must still be reached from the same call paths.
- **Recovery:** first pass is **statement-byte-identical relocation** — same SQL text, same parameter order, same transaction grouping; the action keeps its orchestration role and calls the module (`EV-ARCH-02`). If parity fails, revert to inline SQL — the module was a pure move, not a re-plan.

### 2.4 Dead-seam deletion order — UNIT-ARCH-01 · `RISK-ARCH-08` / `RISK-ARCH-11` (MED)

- **Trigger:** deleting `estimateRepository` (`estimate-repository.ts:108`, 0 importers), `clearEstimateRouteContextProcessCache` (`workspace-repository.ts:4090`, no-op, 4 callers), `getProjectEstimateTreeByNode` (0 external / 1 internal at `:4316`) in the wrong order — or a caller/importer was added between audit (2026-07-16) and execution.
- **Symptom:** dangling import / dangling call → build break. Worse case: the no-op cache was revived (someone re-added caching behind it) and deleting it serves **stale trees after a Row mutation** — user deletes a Row, `estimates/actions.ts:2291/3807/4070` call the (now-gone) invalidation, `getEstimateTabTree` returns the cached pre-delete tree.
- **Detection:** re-`grep` zero-caller/zero-importer symbols **immediately before delete** (`RISK-ARCH-11`: audit-time dead ≠ merge-time dead). `tsc` catches dangling imports/calls. For the no-op: re-verify the body is still `void projectId;` and the 4 callers still pass a `projectId` they don't use. For `getProjectEstimateTreeByNode`: the internal caller at `:4316` must be repointed **before** the public export is removed.
- **Recovery:** deletion is atomic per symbol — revert the single symbol's deletion. Order rule: delete callers of a symbol first, then the symbol; for `getProjectEstimateTreeByNode`, repoint `:4316` → delete export → delete the dead entry.

### 2.5 Generation-rollback race — UNIT-ARCH-07 · `RISK-ARCH-03` (HIGH)

- **Trigger:** hoisting the duplicated folder CRUD/move + the 31 generation-tracking ref lines behind one module. Verified refs: `index.tsx:1043-1045` (`componentFolderMoveQueueRef` / `…MoveGenerationRef` / `confirmedComponentFolderRef`) and `ComponentLibraryManager.tsx:2151-2152` (same two), with the generation-increment + rollback-match at `Manager.tsx:2915-2916` and `index.tsx:2678-2679/2689`. A generation ref is dropped, wired to the wrong callback, or the two originals' rollback predicates diverge in the merge.
- **Symptom:** a Folder rename and a Component move race; rollback matches generation/revision to restore the pre-mutation tree, but the hoisted predicate doesn't preserve one branch's `createFolderPending` guard (`index.tsx:1894`) → **Folder half-created on rollback**, or a stale write overwrites a fresh Component.
- **Detection:** diff the 31 dup ref lines and assert the hoisted rollback predicate matches **both** originals byte-for-byte. `TEST_PROPOSAL`: golden log of mutation/rollback sequences (doc-02 §UNIT-07). The library action tests + `next build` (client modules calling server actions; `"use server"` boundary stays clean).
- **Recovery:** generation rollback moves as **one indivisible unit** with the mutation it guards; preserve the 31-ref contract verbatim in the first pass. Depends on 02 settled first (07 consumes 02's write-repository — `EV-ARCH-07`).

### 2.6 Ownership bypass — UNIT-ARCH-08 · `RISK-ARCH-04` (HIGH safety, LOW breadth)

- **Trigger:** consolidating the 4 encodings — 3 SQL `EXISTS` predicates (`:475/566/625`) + the `isLastOwner` TS helper (`:511`, called at `:552` and `:608`) — into one predicate; the surviving predicate's "owner" scoping diverges from one original, or a race opens between the TS check and the SQL mutation.
- **Symptom:** the last owner of a corporate account is removed or demoted → **account orphaned** (no one can administer it). Narrow blast (3 callers, `corporate-account-actions.ts:67/93/124`) but HIGH consequence.
- **Detection:** this is the **rare HIGH-safety unit with real test coverage** — 6 test files (`corporate-account-repository.test.ts`, `-actions.test.ts`, `-admin-recovery.test.ts`, `-local-d1-integration.test.ts`, `-workspace-link-state.test.ts`, `cloudflare-d1-recovery-integrity.test.ts`, doc-02 §UNIT-08). Run them green; both the remove (`:552`) and update (`:608`) paths must still reject last-owner loss (`DEC-ARCH-09`).
- **Recovery:** target is **one SQL predicate + one TS guard behind one function** (`DEC-ARCH-09`). If a test fails, revert to the 4-encoding baseline, which is known-correct. The invariant is real and must stay — this is a "one home" deepening, not a deletion (`DEC-ARCH-BR-08`).

`RISK-ARCH-SIM-02:` the six walks share one structural lesson — the four HIGH units (02, 03/04, 07, 08) are each guarded by a **parity contract** (statement-count, dirty/rollback slice, generation-ref block, ownership predicate), and the decisive detection for each is **not** a generic test run but a **targeted parity/baseline assertion** that must be captured or proposed before the move. Capture-or-propose-first is the execution discipline.

---

## 3. Parallelization analysis

### 3.1 Concurrent-safe (disjoint files — no lease needed)

| Unit | Sole-edited file(s) | Concurrent with |
|------|---------------------|-----------------|
| **01** | `workspace-repository.ts` | 06, 08, 09 (Wave 1) |
| **08** | `corporate-account-repository.ts` | 01, 06, 09 (Wave 1) |
| **09** | `app/admin/page.tsx` + `lib/admin/*-overview.ts` / `*-aggregate.ts` | 01, 06, 08 (Wave 1) |
| **02** | `component-library/actions.ts` (after 01) | 04 (Wave 2) |
| **06** (on `EstimateSheetTree.tsx`) | `EstimateSheetTree.tsx` reducer block | 01, 08, 09 (Wave 1) |

### 3.2 Lease / serialize (shared file — one writer at a time)

| Shared file | Touching units | Lease order (verified line ranges) |
|-------------|----------------|------------------------------------|
| **`EstimateSheetContent.tsx`** (3680 ln) — highest contention | 03 (`:2244` call site), 05 (prop-drill source), 06 (`estimateSheetContentReducer:864` + `useStableCallback` setters), A1 (display-transform `~:1777`) | **06 → 03 → 05 → A1**. 06 first (LOW, scoped to reducer/setter block); 03 stabilizes handler identity; 05 deletes comparators (gated on 03); A1 is Phase 4. |
| **`row-table.tsx`** (1396 ln) | 04 (commits `509-625`), 05 (comparator `:131`, props) | **04 ∥ 03**, then **05** after 03. Disjoint line ranges (commits vs memo guard) but 05 is gated on 03, not on 04. |
| **`ComponentLibraryManager.tsx`** (3160 ln) | 06 (`componentLibraryManagerReducer:425` + setters; **MUST SPARE `componentLibrarySheetReducer:247`** — `DEC-ARCH-07`), 07 (folder CRUD `2788-2954`) | **06 (P0) → 07 (P3)** — never collide in time, but 06's scope must be line-bounded to spare `:247-303`. |
| **`component-library/actions.ts`** (5545 ln) | 02 (direct), 07 (indirect, consumes result) | **02 → 07** (already in DAG). 07 is the only indirect editor; it lands in Phase 3. |
| **`cells.tsx`** (1486 ln) | 05 (`EstimateMaterialCell:1142`), A4 (image-upload `:87/162/506`) | **05 (P2) → A4 (P4)** — never collide in time. |

### 3.3 LOOP_LEDGER coordination protocol (verified against the live ledger)

The pack's `LOOP_LEDGER.md` already encodes the protocol (read 2026-07-16):

- **Append-only, one lane per block, never edit another lane's entry.**
- **First-writer-wins** on a name collision.
- Each lane logs `STARTED <unit>` → conflicts → `COMPLETE <unit> + one-line result`.
- **Disjoint-file units may run concurrently; shared-file contention takes a lease.**
- The ledger names the exact contention this doc re-verifies: "`EstimateSheetContent.tsx` touched by 003/005/006/010; repositories by 001/002".

`DEC-ARCH-SIM-02:` a worker claims a shared-file unit by appending `STARTED <unit> (lease: <file>)` to its lane; the first such append for a given file wins. A second worker wanting a unit on the same file either waits for `COMPLETE` or picks a disjoint-file unit. Conflict resolution is append-order, not merge — the loser re-picks. This is `DEC-ARCH-04` (one writer per shared file) made operational.

### 3.4 A scope drift to carry into UNIT-ARCH-06 (found during verification)

`resolveStateUpdater` (the pass-through marker) was verified present in **4** client files, but doc-01/doc-06 name only 3 targets:

```
src/components/workshop/projects-page-client.tsx
src/components/workshop/ProjectEstimatesTable.tsx
src/components/workshop/EstimateSheetTree.tsx
src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
```

Two findings:
1. **`EstimateSheetContent.tsx` does NOT use `resolveStateUpdater`** — it is in 06's scope via the single `fieldChanged` case (`:864/869`) + ~24 `useStableCallback` setters, not via `resolveStateUpdater`. The doc-01/doc-06 phrasing conflates the two mechanisms. The deletion target in that file is the setter wrappers, not a `resolveStateUpdater` reducer.
2. **`projects-page-client.tsx` and `ProjectEstimatesTable.tsx` carry the same pass-through pattern** but are **outside 06's scope as written**. This is a scope decision for the lead: either widen 06 to cover them (more deletion, still LOW risk — same deletion-test failure) or leave them as a named residual. `RISK-ARCH-SIM-03` flags this so the execution sketch does not claim "all pass-through reducers deleted" while two remain.

---

## 4. Recommended sequence (reconciled to `00` §7, adjusted by simulations)

**Adopt baseline (a), augmented by the safe parts of (c) and (d).** Reject (b) (sheet-first): it takes render-perf risk before the guard exists.

```
Wave 0 (pipeline derisk):   06  (pass-through reducers, 3 files, spare componentLibrarySheetReducer:247)
                          + delete estimate-repository.ts  (standalone dead file, 0 importers, no shared surface)
Wave 1 (foundation, ∥):     01  ∥  08  ∥  09              (disjoint sole-editor files; max parallelism)
Wave 2 (write + row lift):  02  (after 01, DEC-ARCH-05)   ∥   04  (disjoint from 06-now-landed on row-table.tsx)
Wave 3 (sheet brain):       CAPTURE render-probe baseline FIRST (closes doc-03 §8.2)
                          → 03  (lease EstimateSheetContent.tsx)
                          → 05  (gated on 03; delete comparators + update contract-test anchors in-lockstep)
Wave 4 (consolidation):     07  (after 02)   ∥   AUX A1-A6 (optional; A1 leases EstimateSheetContent.tsx after 05)
```

**Rationale (one paragraph):** Wave 0 derisks the execution pipeline (`LOOP_LEDGER`, `next build`, verify loop) on the two genuinely trivial wins — 06's pass-through reducers (deletion-test failures, `DEC-ARCH-BR-06`) and the standalone dead `estimate-repository.ts` — without fragmenting 01 (the `workspace-repository.ts` seams stay bundled in the carve, per `RISK-ARCH-SIM-01`). Wave 1 exploits the free parallelism doc (d) found: 01/08/09 are sole-editors of disjoint files and have no inter-dependency, so they run concurrently; this is pure wall-clock gain inside (a)'s phase logic. Wave 2 runs 02 (the HIGH SQL unit) immediately after 01 settles the repository layer (`DEC-ARCH-05`), and 04 in parallel since 06 has already cleared `row-table.tsx`'s setter surface and 04's commit block (`509-625`) is disjoint from 05's comparator (`:131`). Wave 3 is the load-bearing sequence: **capture the render-probe baseline before any of 03/04/05** (doc-03 §8.2 has no baseline today; without it the "≤ baseline" guard is empty), then 03 → 05 — because 05's comparator deletion is gated on 03's stabilized handler identity, and deleting the guard before the cause (fresh closures per render) is the re-render storm (`RISK-ARCH-PERF-02`). Wave 4 lands 07 after its dependency 02, with the auxiliaries optional. This preserves `00`'s phase boundaries and `DEC-ARCH-05`, adds the pipeline-derisk (c) and the parallel Wave-1 (d), and closes the render-guard gap (b) — without taking any HIGH risk before its guard is in hand.

`DEC-ARCH-SIM-03:` **the render-probe baseline capture is a first-class Wave-3 step, not an afterthought** — it is the precondition for the decisive guard (`DEC-ARCH-PERF-03`) of every render-path unit (03/04/05/06/07/A1). Scheduling any of those before the baseline exists is a sequencing defect.

---

## 5. Evidence fingerprints

All anchors re-verified against live source on 2026-07-16 (grep + read). `wc -l` and key symbols confirmed; wave-1 doc citations are section-level.

### This doc's study-local fingerprints

- **EV-ARCH-SIM-01** — file sizes (re-verified `wc -l`): `EstimateSheetContent.tsx` 3680, `row-table.tsx` 1396, `branch.tsx` 622, `cells.tsx` 1486, `use-estimate-row-handlers.ts` 1503, `component-library/index.tsx` 3634, `ComponentLibraryManager.tsx` 3160, `workspace-repository.ts` 4441, `component-library/actions.ts` 5545. (Matches doc-01 §0, doc-03 `EV-ARCH-PERF-11`.)
- **EV-ARCH-SIM-02** — render-probe harness: `src/components/workshop/estimate-sheet-render-probe.ts` exports `setEstimateSheetRenderProbe`/`reportEstimateRowItemsTableRender`/`setEstimateRowItemRenderProbe`/`reportEstimateRowItemRender`/`setEstimateSheetBranchRenderProbe`/`reportEstimateSheetBranchRender`/`setEstimateSheetContentRenderProbe`/`reportEstimateSheetContentRender` (+ node-total/proposal-signature/selected-node probes). Call-sites verified: `row-table.tsx:376` (`reportEstimateRowItemRender`), `row-table.tsx:1108` (`reportEstimateRowItemsTableRender`), `branch.tsx:228` (`reportEstimateSheetBranchRender`), `EstimateSheetContent.tsx:1184` (`reportEstimateSheetContentRender`). (Matches doc-03 `EV-ARCH-PERF-01`.)
- **EV-ARCH-SIM-03** — `runAtomicBatch` def `actions.ts:247-251` (hard-requires `database.batch`, throws otherwise; re-checked for `result.success===false`); 7 caller call-sites `1717,2717,3667,3785,3806,3877,3985` + def. (Matches doc-03 `EV-ARCH-PERF-09`.)
- **EV-ARCH-SIM-04** — routing predicate at `row-table.tsx:528`: `if (isLinkedSharedComponent && onUpdateLinkedLibraryComponent) { void onUpdateLinkedLibraryComponent(...); return; } onUpdateRowItem(...)`. (Doc-02 cited a `canManageLibrary` term at `:384`; the live commit site at `:528` shows `isLinkedSharedComponent && onUpdateLinkedLibraryComponent` — the permission term is folded into `isLinkedSharedComponent` or lives at a different line; see Gaps §6.2.)
- **EV-ARCH-SIM-05** — generation-tracking refs duplicated: `index.tsx:1043-1045` (`componentFolderMoveQueueRef`/`componentFolderMoveGenerationRef`/`confirmedComponentFolderRef`) + increment/rollback `index.tsx:2678-2679,2689`; `Manager.tsx:2151-2152` (same two refs) + increment/rollback `Manager.tsx:2915-2916,2932,2947-2950`. (Matches doc-01 `EV-ARCH-07`, doc-06 §UNIT-07.)
- **EV-ARCH-SIM-06** — corporate-account invariant: SQL `OR EXISTS` at `corporate-account-repository.ts:475,566,625`; `isLastOwner` TS helper `:511` called at `:552` (remove path) and `:608` (update path). (Matches doc-06 evidence; doc-01's `:466/559/616` anchors are the drifted review figures — `:475/566/625` are verified.)
- **EV-ARCH-SIM-07** — `resolveStateUpdater` in 4 files: `projects-page-client.tsx`, `ProjectEstimatesTable.tsx`, `EstimateSheetTree.tsx`, `ComponentLibraryManager.tsx`. `componentLibrarySheetReducer` (KEEP) only in `ComponentLibraryManager.tsx`; `componentLibraryManagerReducer` (DELETE) only in same file; `estimateSheetContentReducer` only in `EstimateSheetContent.tsx`. (Confirms doc-06 `DEC-ARCH-07` location correction; adds the 2 extra pass-through files → `RISK-ARCH-SIM-03`.)
- **EV-ARCH-SIM-08** — `LOOP_LEDGER.md` protocol verified (read 2026-07-16): append-only, one lane per block, first-writer-wins, shared-file contention takes a lease; explicitly names `EstimateSheetContent.tsx` (003/005/006/010) and repositories (001/002) as the contention surfaces.
- **EV-ARCH-SIM-09** — dead seams re-verified: `estimateRepository` only at `estimate-repository.ts:108`; `clearEstimateRouteContextProcessCache` body `void projectId;` at `workspace-repository.ts:4090` with 4 callers (`estimates/actions.ts:2291,3807,4070`, `express-promotion-actions.ts:927`); `getProjectEstimateTreeByNode` 0 external callers, 1 internal at `workspace-repository.ts:4316`. (Matches doc-01 §3, doc-06 §UNIT-01.)

### Wave-1 citations (section-level, not re-quoted)

- Doc-01 §1 (per-module profiles), §2 (three habits quantified), §3 (dead-seam inventory), §4 (`EV-ARCH-01..09`).
- Doc-02 §1 (summary + risk/deletion-test verdicts), §2 (per-unit blast + failure scenarios), §3 (shared-file contention table), §4 (`EV-ARCH-01..09` + AUX).
- Doc-03 §2 (render-path units + `RISK-ARCH-PERF-02` storm guard), §3 (query-path atomicity + `RISK-ARCH-PERF-03`), §6 (regression signals table + `DEC-ARCH-PERF-03`), §8 §8.2 (no baseline captured).
- Doc-06 §1 (risk register `RISK-ARCH-01..11`), §2 (per-unit failure→mitigation), §3 (`DEC-ARCH-01..09`, incl. `DEC-ARCH-07` location correction, `DEC-ARCH-09` ownership target).
- `00` §7 (phase sequencing), §11 (gates), §12 (ID map).

---

## 6. Gaps / open questions

1. **`resolveStateUpdater` is in 2 files UNIT-ARCH-06 doesn't name** (`projects-page-client.tsx`, `ProjectEstimatesTable.tsx`) — see §3.4 / `EV-ARCH-SIM-07` / `RISK-ARCH-SIM-03`. The lead decides: widen 06, or name these as a documented residual. Either way, the execution sketch must not claim "all pass-through reducers deleted" while two remain.

2. **Row routing-predicate exact shape needs re-pinning at execution.** Doc-02 §UNIT-04 describes the predicate as `isLinkedSharedComponent && canManageLibrary && Boolean(onUpdateLinkedLibraryComponent)` at `row-table.tsx:384`; the live commit site at `:528` shows `isLinkedSharedComponent && onUpdateLinkedLibraryComponent`. The `canManageLibrary` term is either folded into `isLinkedSharedComponent` or lives at a different line (`:384` vs `:528`). The routing rule is real and load-bearing (privilege boundary, §2.1); its exact boolean composition must be re-grepped before UNIT-ARCH-04 transcribes it into the lifted module, or the privilege-break failure mode (§2.1) is mis-modelled.

3. **`EstimateSheetContent.tsx` is in 06's scope but does not use `resolveStateUpdater`.** Doc-01/doc-06 phrase its 06 target as the reducer pattern; the verified reality is the single `fieldChanged` case (`:864/869`) + ~24 `useStableCallback` setters. The execution sketch should describe this file's 06 work as "setter-wrapper deletion + generic-case collapse", not "resolveStateUpdater deletion", to match source.

4. **Baseline render counts are not captured (doc-03 §8.2).** `DEC-ARCH-SIM-03` makes the baseline capture a first-class Wave-3 step, but the capture itself is a `TEST_PROPOSAL` (no execution in this planning pack). If the future execution task declines to capture it, the render-path units (03/04/05) lose their decisive guard and must fall back to the source-string contract test (`RISK-ARCH-09` false confidence) — which would weaken the case for doing 05 at all.

5. **No graph-traced flow IDs for the client sheet render path.** Doc-02 §5 §7 notes the code-review-graph's top flows are server entry points (auth/onboarding/admin), not the client render path. The failure-mode walks in §2 rely on verified call-sites + the probe harness, not a graph-traced flow ID. No flow-ID citation is claimed for 03/04/05; this is a known limitation, not a defect.

6. **Simulation (c) boundary is a judgment call.** `RISK-ARCH-SIM-01` asserts the `workspace-repository.ts` seams should stay bundled in 01. A more aggressive executor might disagree and ship the no-op cache deletion early. The cost of being wrong (a second pass over the 4441-line file + a re-grep of the 4 callers) is low, so this is reversible — but the recommended sequence (§4) bundles them for coherence with 01's "honesty" story.
