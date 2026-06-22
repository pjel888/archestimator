# 20 — UX / UI / Interaction Plan (cross-phase UX contract)

> **Authoring agent:** W-UX. **Status:** New doc (round 2). Authoritative inputs: `_research/_SYNTHESIS.md` "V2 IMPROVEMENT CONTRACT" + §V2-FACTS + POST-REVIEW CORRECTIONS; repo `DESIGN.md`; phase plans `08` (Tree kernel), `09` (Estimate sheet), `11` (Optimistic), `12` (UI primitives).
>
> **Why this doc exists.** The pack scored **38/100 on UX/UI** (contract scorecard). It reasons in compute / render-count terms but barely specifies *UX preservation*. This is the cross-phase UX contract: what the **user** must still experience identically after every refactor. It feeds per-phase manual QA and the validation matrix (`15`) — FIX-9 lifts the new gates below into `15`.
>
> **Scope discipline (contract §4):** planning only — no `src/**`/`tests/**`/`scripts/**`/config edits. Files named are *targets*; new gates are flagged **(new, Phase N)**. Validation uses only the existing command vocabulary (contract §4) plus the named new gates the pack already pins.
>
> **Conventions:** Priority `P0–P3`, Risk `Low/Med/High/Critical`, evidence `path:line — observation`. Cross-refs: `D-NN` (`17`), `RISK-NN` (`16`), `Q-NN` (`19`), `A-NN` (`01`), `PAT-NN` (`02`). The pack is a **performance** refactor; the governing UX principle is therefore: **every change is, to the user, a no-op except that it is faster.** Any *visible* behavior change is a defect unless explicitly approved here.

---

## 0. The one UX axiom (governs all phases)

> **PERFORMANCE-ONLY INVARIANCE.** No phase in this pack may change what the user sees, where focus goes, what is selected/expanded/scrolled, or what is mid-edit. The *only* permitted user-observable delta is reduced latency / jank. This is stricter than "don't break tests": a refactor can keep all 361 DOM tests green and still drop scroll offset, blur the active cell, or flash `₱0.00` — because those transient states are under-tested (A-38). This doc enumerates the transient states and makes each a named gate.

The repo already has the right *render-isolation* guards (`branch.tsx:111-156`, `row-table.tsx:86-116`) and the right *primitives* for a11y (`ui/tree.tsx` keyboard nav; `ui/overlays/dialog.tsx` focus-trap + return-focus). The risk is not that they're missing — it's that decomposition (Phase 3), convergence (Phase 2), and migration (Phase 6) **silently drop** them while the perf gates still pass. Every section below ends with the concrete gate that proves it didn't.

---

## 1. Transient-state preservation contract

A user mid-session holds a large amount of *ephemeral* UI state that lives nowhere on the server and is not exercised by most DOM tests. Each phase that touches an interactive surface MUST treat these as **invariant across the change**.

### 1.1 The transient-state inventory (with current owners)

| Transient state | Current owner (evidence) | Lost if… |
|---|---|---|
| **Virtual-list scroll offset** (center sheet + left tree) | TanStack Virtual scroller; scroll element resolved by `findScrollParent` (`virtual-branch-list.tsx:34-42`, `row-table.tsx:130-138`) | a remount or a new scroll container is introduced during extraction |
| **Expansion** `collapsedNodeIdsByScope` | `EstimateSheetContent.tsx:1098`, `:1319-1344` (scoped, per selected node) | `useSheetExpansion` extraction re-keys scope or resets the Map |
| **Bulk selection** `bulkSelectedRowIds` (local `Set`) | `EstimateSheetContent.tsx:1099`; prune effect `:1358-1371` | `useBulkRowSelection` extraction drops the Set on remount; or a premature Zustand merge (Q-08e / Q-bulk-merge) |
| **Focused DOM element / active cell** | roving `tabIndex` in `Tree` (`tree.tsx:1136`, focus effect `:1087-1094`); cell focus in `row-table` editing | center-column extraction remounts the cell; a dialog steals focus and does not return it |
| **In-progress edit** `editableRows[id]` (unsaved keystrokes) | `useState` map `EstimateSheetContent.tsx:1093`; resync effect `:1766-1783` guarded by `skipEditableRowsSyncRef` (`:1092`) | the per-row store init seeds from server, or a reconcile overwrites the unsaved value (see §1.3 — the critical assertion) |
| **Active tab** | `use-estimate-workspace-state.ts` (selection/active-tab); tree-source switch `EstimateSheetContent.tsx:1066-1090` | tree-source hook extraction (Step 11) resets the active tab on re-source |
| **Search query / facets / group mode** | `EstimateSheetContent.tsx:1291-1318` | `useSheetDisplayTransforms` extraction resets them; debounce (§2) introduced without preserving committed value |
| **Selected node** + `displayedSheetNode===selectedNode` identity | `EstimateSheetContent.tsx:1274-1290`, `:1307-1315` | extraction breaks the identity short-circuit (also a perf regression) |
| **Inspector / right-dock mode + width** | column-width store (`estimate-column-widths-store`), inspector state R-K | center-column / sidebar boundary work remounts the dock |

### 1.2 Per-phase preservation table

For each phase, the listed transient states MUST be byte-for-byte invariant before/after. "Gate" is the proof.

| Phase | Surface touched | MUST stay invariant | Highest-risk mechanism | Gate |
|---|---|---|---|---|
| **2** (tree convergence, esp. step 2.7 family-1, step 2.1 share) | left `EstimateSheetTree`, share tree, all 7 families | scroll offset; expansion (`expandedSet`); focused treeitem (roving tabindex); selection/cascade; active tab unaffected | `WorkshopTree`→`Tree` render-converge (share) and `toUiNode`/`flattenVisible` swap (family 1) remount rows / reset focus | render-count probe (`findIndexBuilds===0` per keystroke, `08 §10`) **+** new **expansion+scroll+focus survival** gate (§1.4); manual QA expand/collapse + scroll + arrow-key focus survive a filter keystroke |
| **3** (sheet decomposition + per-row store) | center sheet, all in-fn responsibilities | **all** of §1.1 — this phase remounts the most | per-row store init (Step 4) seeding from server; `<EstimateSheetCenterColumn>` extraction (Step 9) remounting cells; expansion/bulk/search hook extraction (Step 8/10) resetting state | the §1.3 critical assertion + `estimate-sheet-render-relief.test.tsx:162` (`rendersOutside===0`) + new transient-survival gate per extraction step (§1.4) |
| **5** (optimistic mutations) | row insert/delete/move/reorder | scroll offset; focus-after-action (§3.5); selection; bulk Set; expansion | rollback restores cache but not scroll/focus; row-delete loses focus into nothing | `optimistic-mutation-contract.test.tsx` (`11 §11`) extended with **focus-after-action** + render-isolation reuse (`A-08`) |
| **6** (UI primitives) | dialogs, cards, tab strip, inputs, skeletons | dialog focus-trap + return-focus (§3.2); search input value; active tab; CLS-free skeleton→content swap | 8 hand-rolled `role="dialog"`→`overlays/dialog.tsx` migration drops a bespoke focus target; `EstimateTabStrip` recompose loses scroll/active-tab | `bun run storybook:validate` (a11y + boundary) + DOM focus-trap assertions retained (`12 §6`) |
| **7** (provider move / streaming) | whole-app providers; Suspense boundaries; share charts | no auth/redirect change on workshop routes; no CLS on streamed boundary; scroll restored on `router.refresh` paths | RSC→client conversion of workshop layout (RISK-19); Suspense fallback ≠ real layout → CLS | manual CLS check (DevTools Layout Shift, §4) + `prove:workshop-auth-boundary` **(new, Phase 7)** |

### 1.3 ★ Critical assertion — Phase 3 Step 4 (`editable-rows-store.ts`)

This is the single most likely *silent* UX regression in the pack. `09 §4` severs the `editableRows` fan-out into a per-row external store. Two failure modes MUST be forbidden by named tests, because the current `skipEditableRowsSyncRef` *prose* contract (`09 §4.3`) is the only thing protecting them today.

**Current protection (verified):** `EstimateSheetContent.tsx:1766-1783` is the resync effect. It (a) **bails entirely while `saveState` is `"dirty"` or `"saving"`** (`:1767`), (b) **decrements a `skipEditableRowsSyncRef` counter** to skip self-triggered reconciles (`:1768-1771`), and (c) when it does rebuild, it **preserves the active express-editor row's in-progress value** (`:1774-1780`). That triad is the in-progress-edit guard.

**Forbidden behaviors (promote the prose contract to named gates):**

1. **GATE-EDIT-INIT (new, Phase 3, Step 4):** a cell with an unsaved value MUST NOT reset to the server value when the store initializes. Test: seed a server value, type an unsaved value, then *mount/initialize the per-row store* (simulate the extraction's init path) → assert the cell still shows the typed value, not the server value.
2. **GATE-EDIT-RECONCILE (new, Phase 3, Step 4):** a server reconcile arriving **mid-edit** MUST NOT overwrite the user's in-progress value. Test: with `saveState` dirty/saving (or the active-express-row condition), fire a resync (`estimateTree`/`saveState` change) → assert the edited row's value object is unchanged and the `skipEditableRowsSyncRef` decrement semantics hold (no extra recompute).
3. **GATE-EDIT-IDENTITY (new, Phase 3, Step 4):** after a keystroke in row A, `Object.is(prev.editableRows[B], next.editableRows[B])` holds for every untouched row B — the comparator the memo guards read (`branch.tsx:101`, §V2-FACTS) must keep seeing per-row reference equality. (This is the UX-facing twin of the perf gate `09 §13` #6; here it is asserted as "rows B…N do not blur/rerender while typing in A".)

These three are **release-blocking** for Step 4. RISK-01 / D-009. Cross-ref `09 §4.4`.

### 1.4 Validation / gate

- **GATE-TRANSIENT-SURVIVAL (new, Phase 2 & Phase 3):** for each extraction/conversion PR, a DOM test mounts the surface, sets {scroll offset, expansion set, bulk selection, active cell focus, search query}, performs the refactor's triggering action (keystroke / extraction remount / filter), and asserts each transient state is unchanged. Models on `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`.
- Plus the §1.3 trio for Step 4. Plus `bun run test:dom` (361) green per step (`09 §12`).

---

## 2. Perceived-latency contracts

Perf wins must not trade compute-time for *perceived* latency or visual jank. These define what the user must see.

### 2.1 Totals update synchronously with the keystroke

**Contract:** when the user types in a cost cell, the affected node/branch/project totals update **in the same task as the keystroke** — no deferred frame, no spinner, no intermediate stale value. Today `estimateNodeTotals`/`projectTotal` are synchronous memos (`EstimateSheetContent.tsx:1401-1410`) recomputed in render. Phase 3 Step 5 (`useEstimateTotals`) replaces the full DFS with an incremental ancestor-chain rollup — it MUST stay **synchronous**.

**Forbidden:**
- A **stale-total flash** — totals showing the pre-keystroke value for one frame because the rollup was moved to an effect / `useDeferredValue` / transition.
- A **flash of `₱0.00`** from optimistic nodes. `EstimateSheetTree.tsx:154` mints `total: "₱0.00"` for an optimistic new node (`createOptimisticEstimateTreeNode`); the incremental totals path must not let that placeholder render *into an existing node's total* during reconcile.

**If deferral is genuinely required** (only if Step 5 measurement shows the synchronous incremental rollup is itself too slow on the large fixture — unlikely, since it's now ancestor-chain only): then specify exactly what the user sees — the *old* total stays rendered (never `₱0.00`, never blank) until the new total is ready in the **next** paint, and the transition is ≤1 frame so it reads as instant. This is a last resort and must be logged as a deviation in `17`.

**Validation:** `estimate-sheet-memoization.test.tsx` (`nodeTotalsComputes===1` on keystroke) + **GATE-NO-TOTAL-FLASH (new, Phase 3, Step 5):** render the sheet, type a cost edit, assert the displayed branch/project total transitions directly old→new with no `₱0.00` and no stale intermediate (assert on rendered text across the commit). Cross-ref `09 §5`, RISK-01.

### 2.2 Optimistic insert shows entered values immediately

**Contract:** an optimistic row insert (library item, template, express draft, list create) renders the **entered/known values immediately** — never a skeleton or spinner in place of a row the user just created. The row keys on `tempId` (`11 §3`) and shows real content from `onMutate`; reconcile only swaps the id + server-computed fields (codes, derived totals) without a visual "replace" flash. Pending state is conveyed by **dimming** the row (existing `pendingInsertIds` pattern, `11 §7`), not by hiding its content.

**Validation:** `optimistic-mutation-contract.test.tsx` flow #2 / #11 (`11 §11`) extended: assert the inserted row's user-entered fields are present in the same commit as the insert, and that no `Skeleton`/spinner renders for that row. RISK-07.

### 2.3 Skeleton-vs-optimistic-vs-spinner threshold rule

A single rule so loading affordances are consistent (resolves the skeleton drift of `12 §4` / A-33 at the UX level):

| Situation | Affordance | Why |
|---|---|---|
| **First load** of a route/panel with **no data yet** (cold) | **Skeleton** (`ui/skeleton.tsx`, route shell via `StaticWorkshopLoadingShell`) | structure is known, data isn't; skeleton must be **pixel-isomorphic** to the loaded layout (no CLS, §4) |
| **Optimistic write** (user just acted; values are known client-side) | **Optimistic content, dimmed** (never skeleton, never spinner) | the user supplied the data; showing a skeleton *after* they typed reads as data loss (§2.2) |
| **Background refetch / reconcile** with stale data on screen | **Keep stale content visible**; optional subtle inline pending indicator | stale-while-revalidate; no layout change |
| **Discrete async action with no inline surface** (e.g. export build, proposal generate) | **Spinner / progress in the action control or modal** | no row/list to optimistically populate; the action itself is the locus |

Rule of thumb: **skeleton = "we don't have it yet"; optimistic-dimmed = "you just made it"; spinner = "a discrete job is running."** Never substitute one for another. Enforced via the lint rule `12 §3` #3 (bare `animate-pulse` ban) + this matrix documented in `DESIGN.md` (Phase 10).

**Validation:** `bun run storybook:validate` (skeleton stories carry `motion-reduce`, `12 §4`) + manual QA against the matrix at Phases 3, 5, 6.

### 2.4 Per-route skeleton-shape contract (Bible §11.1)

Skeletons must be **content-shaped per destination**, not a generic spinner. Bible §11.1 mandates a skeleton whose silhouette matches the route it precedes; Bible §19.7 names the concrete shaped components (`TreeSkeleton`, `SheetRowsSkeleton`, `RightDockSkeleton`). This refines the §2.3 "First load → Skeleton" row by pinning a shape per surface.

| Route / surface | Required skeleton shape | Composition (Bible §19.7) |
|---|---|---|
| **Tree route** (left `EstimateSheetTree`, share tree) | **tree skeleton** — indented rows w/ glyph columns | `TreeSkeleton` |
| **Table route** (project list, estimate list) | **table skeleton** — header + repeating rows | table-row skeleton (`SheetRowsSkeleton` variant) |
| **Estimate sheet** (editor) | **row/card skeleton** in the destination grid | grid of `TreeSkeleton` (left) + `SheetRowsSkeleton` (center) + `RightDockSkeleton` (right) |
| **Each large right-dock panel** (inspector, proposal preview, charts) | **its own shaped skeleton** per panel | dedicated `RightDockSkeleton` variant per panel |

**The law (Bible §11.1):**
- The full-screen **overlay is a DELAYED fallback**, not the primary loading UX. It appears only after a delay window, to cover genuinely slow transitions.
- **Do not show a spinner for navigation that completes within the delay window** — instant/near-instant transitions show nothing transient (no flash).
- **Skeletons must match destination dimensions** (pixel-isomorphic to the resolved layout) to prevent CLS — reinforces §2.3 row 1 and the Phase-7 CLS check (§4, §8).

**Validation:** `bun run storybook:validate` (shaped-skeleton stories, `12 §4`) + the Phase-7 **manual CLS check** (§4) asserting each shaped skeleton → content swap is CLS ≈ 0. Cross-ref §2.3, RISK-10.

---

## 3. Accessibility gates (per phase)

A11y is mentioned ~twice across 10 phases. It is concentrated here. The good news: the primitives already implement most of it — the gates exist to prevent decomposition/migration from **dropping** it.

### 3.1 The `Tree` a11y contract — all 7 families inherit it after Phase 2

`ui/tree.tsx` already implements (verified) the contract the converged kernel must preserve for **every** family (Phase 2 retires `WorkshopTree` and converges family 1–7 onto `Tree`):

- **`role="tree"` / `role="treeitem"`** (`tree.tsx:1275`, treeitem role on rows) with **`aria-level`** (`:1129`), **`aria-expanded`** on folders (`:1132`), **`aria-selected`** (`:1133`).
- **Roving tabindex** — focused row `tabIndex={0}`, others `-1` (`:1136`); focus follows `focusId` via effect (`:1087-1094`).
- **Arrow-key nav** — Up/Down move focus, Left/Right collapse/expand a folder, Home/End jump (`:1027-1064`); **Enter/Space activate** (select / `onRowClick`, `:1065-1080`).
- **GAP (flag, Phase 2):** there is **no explicit `Escape` handler** in the tree keydown switch (`:1026-1081`). The contract asks for Escape (cancel DnD / clear focus). Phase 2's converged `Tree` MUST add Escape handling (at minimum: cancel an in-progress drag — see §5; optionally clear roving focus) and a test for it. Until then, share family migration (step 2.1, read-only) inherits the existing behavior unchanged; the gap is closed when family 1 converges (step 2.7) where DnD makes Escape load-bearing. Log as Q (a11y-escape) in `19`.

**Contract for convergence:** after each family migrates onto `Tree`, the family's tree exposes `role=tree/treeitem`, `aria-expanded`, roving tabindex, full arrow-key nav, Enter/Space activation. No family may render a tree without these (the old `WorkshopTree` share view, `ShareEstimateTreeView.tsx:298`, gains them for free — a public-route a11y *improvement*, RISK-04).

**Gate:** `bun run storybook:validate` (a11y addon) **REQUIRED at Phase 2** + per-family keyboard-nav DOM assertions in the reused family suites (`08 §10`).

### 3.2 Dialog focus management — Phase 6 migrations

`ui/overlays/dialog.tsx` already implements the target (verified): **focus-trap** (`getFocusableElements`, Tab/Shift-Tab wrap, `:209-228`), **focus-first-focusable-on-open** (`:198`), and **`returnFocusOnClose` to the opener element** (`:84-90`). The 8 hand-rolled `role="dialog"` surfaces (`12 §1`, table row "Dialog") migrate onto this. For **each** migration, specify the two focus targets:

| Hand-rolled dialog | focus-on-open target | return-focus-on-close target |
|---|---|---|
| `EstimateSheetContent.tsx` inline dialog(s) | first interactive control in the dialog | the toolbar/icon button that opened it |
| `ProposalExportPreviewDialog.tsx` | the preview/primary action (or first focusable) | the "Preview/Export" action in `EstimateHeaderActions` |
| `NewProjectModal.tsx` | the project-name input | the "New project" trigger |
| `ProjectDetailsModal.tsx` | first editable field | the row/card that opened details |
| `CommandPalette.tsx` | the search input (blessed bespoke — keep, but still trap + return) | the element focused before Cmd-K |
| `component-library/index.tsx` dialog | first control | the library trigger |
| `activity-history.tsx` modal | the filter/first control | the "Activity" trigger (registered via `use-estimate-header-actions-store`) |
| `ManageGroupsPopover.tsx` | first group control | the "Manage groups" trigger |

**Default:** if a dialog has no obviously-primary control, focus the first focusable element (matches `dialog.tsx:198`). `returnFocusOnClose` defaults `true` (`:72`) — do not disable it.

**Gate:** the migrated files **retain their focus-trap/accessibility DOM assertions** (`12 §6`) + `bun run storybook:validate` **REQUIRED at Phase 6**. Blessed bespoke dialogs (command palette, resizable inspector) still trap + return — being bespoke is not an exemption from focus management.

### 3.3 Keyboard cell editing survives `EstimateSheetCenterColumn` extraction

The spreadsheet cell editing (Tab to next cell, Enter to commit/advance, Escape to cancel) lives in the center column JSX / `row-table` editing path that `09 §9` extracts into `<EstimateSheetCenterColumn>` (`EstimateSheetContent.tsx:2662-2892`). The extraction MUST preserve:
- **Tab / Shift-Tab** moves between editable cells in DOM order.
- **Enter** commits the cell and advances (existing behavior).
- **Escape** cancels the in-progress edit and restores the prior value (ties to §1.3 GATE-EDIT-RECONCILE — Escape must restore, not commit).
- Focus stays on the active cell across the keystroke (no remount-induced blur — ties to §1.1 focused-element invariance).

**Gate:** **GATE-CELL-KEYBOARD (new, Phase 3, Step 9):** DOM test types into a cell, presses Tab/Enter/Escape, asserts focus moves/commits/cancels correctly **after** the center-column extraction, identical to before. Run alongside `estimate-sheet-cursor-isolation.test.tsx` (`contentRenders()===0` while typing).

### 3.4 ARIA relationships preserved across decomposition

Decomposition (Phase 3) and convergence (Phase 2) must not break ARIA *relationships* that span the now-split components:
- `aria-describedby` chart→data-table linkage (`DESIGN.md:393`, "data table is the zoom-safe alternative") must survive any chart/Suspense move (Phase 7).
- `aria-expanded`/`aria-level`/`aria-selected` on tree rows stay correct after the `flattenVisible` swap (§3.1).
- Dialog `aria-labelledby`/`aria-describedby` survive the `overlays/*` migration (Phase 6).
- The proposal stale-badge (§6) keeps its accessible name when its compute is debounced.

**Gate:** `bun run storybook:validate` (a11y) at Phases 2, 3, 6 + targeted DOM assertions on the relationships above.

### 3.5 Focus-after-action for row insert / delete / move (Phase 5)

Optimistic mutations move focus implicitly; the contract makes it explicit:
- **Insert:** focus moves to the **first editable cell of the new row** (so the user can keep typing) — matches the express-insert-draft intent (`EstimateSheetContent.tsx:1893-1967`).
- **Delete:** focus moves to the **next sibling row**, or the previous if deleting the last, or the parent node if the branch is now empty — reusing the existing fallback-selection logic (`estimate-tree-edit.ts:54-123`, referenced by `11 §8`). Focus MUST NOT be lost to `<body>`.
- **Move/reorder:** focus stays on the **moved row** at its new position.

**Gate:** extend `optimistic-mutation-contract.test.tsx` (`11 §11`) with a **focus-after-action** assertion per insert/delete/move flow. **GATE-FOCUS-AFTER-MUTATION (new, Phase 5).**

### 3.6 Required a11y gate

`bun run storybook:validate` (runs the Storybook a11y addon, `12 §6`) is a **REQUIRED gate at Phases 2, 3, and 6**. It is **not** in `bun run validate` (contract §0), so it must be invoked explicitly and recorded in the per-phase DoD. FIX-9: add to `15`.

---

## 4. Visual-regression safety (per phase)

Perf refactors move/rename markup; pixel and layout regressions are easy to ship invisibly. Require a visual check at the phases that touch rendered structure.

| Phase | Trigger | Required visual gate |
|---|---|---|
| **2** | after the **first family migration** (step 2.1 share `WorkshopTree`→`Tree`) **and** after family-1 (step 2.7) | `bun run storybook:validate` + snapshot-compare the rendered tree (the pack already requires snapshot-compare for share, `08 §11` step 2.1); confirm indent/glyph/occupied-node orange (`DESIGN.md:521`) survive |
| **3** | after `<EstimateSheetCenterColumn>` extraction (step 9) | `bun run storybook:validate` + pixel-diff the center column (header, tab strip, grid) before/after; confirm `estimate-cell` / `estimate-cell-selected` tokens (`DESIGN.md:272-283`) unchanged |
| **6** | after **each** primitive family migration | `bun run storybook:validate` (coverage + boundary + static build, `12 §6`); confirm consolidated primitives encode the DS scale internally (`DESIGN.md:424`) |
| **7** | before/after streaming Suspense boundaries | **manual CLS check** — Chrome DevTools Performance → Layout Shift, on each streamed route; Suspense fallback MUST be pixel-isomorphic to the resolved layout (reuse the same route shell, `12 §4`) so CLS ≈ 0 |

**DESIGN.md token survival (all consolidation phases):** confirm after Phase 2/6 consolidation that the token contract is intact — radius is **`xs:3px` only** (`DESIGN.md:191-198, 489`); color *meanings* preserved (success=approved, warning=provisional/cost-risk, danger=destructive, `DESIGN.md:346`); the named app exceptions survive intact: estimate-sheet **orange add-affordance** `ADD_BUTTON_CLASSNAME` (`DESIGN.md:504-519`), **occupied-node orange glyph** (`:521`), **sidebar active-tile orange** (`:539-542`), **source-boundary `#E8D8CF`** divider (`:525-529`), and the **Okabe–Ito chart palette** (`:396-411`). A primitive consolidation that flattens an exception into the neutral default is a visual regression.

**Note on tooling:** `storybook:validate` today is coverage+boundary+static-build, not a chromatic/pixel-diff (`15`, `12 §6`). True pixel-diff is a Phase-7/9 proposal (`perf:bundle-budget` is separate). Where this doc says "pixel-diff," it is a **manual or to-be-added** check until a chromatic gate lands — flag in `15` (FIX-9).

---

## 5. DnD visual affordances (Phase 2 convergence)

On convergence the 7 families inherit `Tree`'s drag affordances. The QA must **visually** verify them, not just that the drop *logic* works.

- **Ghost element** — the dragged node's **name** must be visible in the drag ghost (not a generic box).
- **Drop-zone indicator** — the insertion line / target highlight must render at the **correct insertion point** (before/after/inside), using DESIGN.md tokens: `accentSoft` (`#F5F5F5`) for target-row highlight and `hairline`/`dividerSibling` for the insertion rule (`DESIGN.md:21, 11, 13`). No new colors; no construction-orange except the sanctioned add-affordance (which is not a DnD cue).
- **Escape cancels cleanly** — pressing Escape mid-drag aborts with no partial move and no orphaned ghost/indicator. **This depends on the §3.1 Escape gap being closed** in the converged `Tree`.

**Extend the Phase-2 manual QA** (in addition to the automated DnD suites `08 §11`) to visually verify, per interactive family: (a) drag indicator at correct insertion point, (b) ghost shows the node name, (c) Escape cancels cleanly with state fully restored (ties to §1 transient-state preservation — selection/expansion intact after a cancelled drag).

**Highest-regression path — external drop (call out explicitly):** `EstimateSheetTree.tsx:649-680` (`treeExternalDrop`) is the cross-family path where a template/project-source is dropped *into* the estimate tree. It is `inside`-only (`:652`), rejects optimistic nodes (`:653`), and hands insertion to the sheet via a window `CustomEvent` (`:672, 679`). Phase 2 generalizes this as the `external-drop-as-copy` rule (`08 §7`). It is the **most likely DnD regression** (cross-family, event-bridged, copy semantics). Gate: the existing `tree-external-drop.test.tsx` (`08 §11` step 2.7) **plus** manual QA confirming the drop indicator only shows on valid `inside` targets and the inserted node appears at the correct parent with its name in the ghost during drag. RISK-02. **GATE-DND-AFFORDANCE (new, Phase 2)** = the manual QA checklist above, per family, recorded in the phase DoD.

---

## 6. Proposal stale-badge contract (Phase 3 Step 7)

The proposal preview shows a **stale badge** when the underlying estimate has changed since the preview was built. Today: `isProposalPreviewStale = Boolean(proposalPreviewModel && proposalPreviewSignature !== currentProposalPreviewSignature)` (`EstimateSheetContent.tsx:1663`), passed to the dialog (`:2591` `isStale=`). The signature is a full-tree 15-field DFS recomputed per keystroke once the dialog has opened (`09 §7`). Phase 3 Step 7 moves it off the hot path via debounce + `structuralHash`.

**UX contract (no visible change to staleness behavior):**
- **Debounce window: 250 ms** (safe default; trailing-edge) on the signature recompute after the dialog is open. Rationale: short enough that the badge feels responsive to a pause in typing, long enough to keep it off the per-keystroke path. If measurement (Step 7) shows the badge feels laggy at 250 ms, tighten to 150 ms; record the chosen value in `17` (D ref) — owner: eng, default 250 ms.
- **Eager-on-open:** the badge is computed **eagerly on dialog open** so the user never sees a wrong (stale-or-fresh) badge in the first frame of the dialog. The eager compute is synchronous on open (one DFS / `structuralHash`); only *subsequent* recomputes while open are debounced.
- **Correctness over latency:** a debounce may *delay* the badge flipping to "stale" by up to the window, but MUST NEVER show "fresh" when the export would actually differ. This is the RISK-03 field-differential concern: the new `structuralHash` must cover **exactly** the 15 export fields, verified bidirectionally (`09 §7`, "FIELD-DIFFERENTIAL"). A false "fresh" ships wrong numbers — the worst UX outcome in the pack.

**Gate:** `proposal-export-preview.test.tsx` (badge behavior) + the **field-differential** test (`09 §7`: per export field, old signature changes ⟺ new `structuralHash` changes; negative control on a non-export field) + **GATE-STALE-BADGE-EAGER (new, Phase 3, Step 7):** open the dialog after an edit → badge is correct in the first commit (no debounce delay on open). RISK-03.

---

## 6a. URL-sync decision contract (Bible §11.2) — closes a GAP

Bible §11.2 specifies *how* a UI change should (or should not) touch the URL. The pack currently has a **GAP** here: doc `11 §8` only records that *mutations* do not own the URL; it never maps the four change-types to their URL-update method. This table closes that gap so a perf refactor does not accidentally upgrade a cheap selection change into a full route navigation (or downgrade a server-data switch into a silent `replaceState` that desyncs).

| Change type | URL-update method | Server data? |
|---|---|---|
| **(a) Select a visible node already in cache** | `history.replaceState` / local router state — **NO server refresh** | none — render from cache |
| **(b) Switch estimate / project / tab needing server data** | **Next router navigation/prefetch** (`router.push`/`<Link>` + prefetch) | yes — server fetch / RSC |
| **(c) Mutate server data** | **server action + scoped query/tag invalidation** (URL unchanged; `11 §8`) | yes — write + revalidate |
| **(d) Share / public token change** | **full route semantics** (token in path/segment), **preserve security** | yes — public route + authz |

**The rule (Bible §11.2):** **selection-only changes in the estimate editor MUST NOT trigger a full route refresh.** The current manual `window.history.replaceState` pattern for selecting an already-cached node is a **valid performance tactic — keep it** (it is case (a), not a regression to "fix"). Only cases (b)/(d) earn a Next-router navigation; case (c) never owns the URL.

**Cross-ref:** doc `11 §8` (records only that *mutations* are non-owners of the URL — this table supplies the missing (a)/(b)/(d) rows). RISK-19 (workshop auth boundary — case (d) must not drop authz, §1.2 Phase 7).

**Gate:** **GATE-URL-SYNC (new, Phases 3 & 7):** a DOM/integration test asserts (a) selecting a cached node fires `replaceState` with **no** server fetch, and (b) switching estimate/tab issues a router navigation; the §1.2 Phase-7 `prove:workshop-auth-boundary` gate covers case (d).

---

## 7. UX-relevant open questions

These are **UX choices**, not purely technical — flag them so the owner decides on *feel*, not just compute. Cross-ref `19`.

| ID (in `19`) | The technical question | The UX consequence (why it's a UX decision) | Safe default |
|---|---|---|---|
| **Q-08b** (alias Q-A) | `editableRows` per-row external store vs TanStack cache | Directly determines **keystroke feel** — wrong reconcile path reintroduces blur/lag or stale-overwrite mid-edit (§1.3). The "fastest" option that drops an in-progress edit is unacceptable. | per-row external store *only if* §1.3 trio passes; else keep `useState` map behind same prop shape (`09 §4.1`) |
| **Q-02** | Share-tree 500-row cap (`reconstruct-share-tree.ts:29`) hard product limit? | If a public estimate exceeds 500 rows, the **truncation UX** must be explicit (a visible "showing first 500" notice), not a silent cut — silent truncation on a client-facing share is a trust defect (`DESIGN.md` proposal/trust framing) | keep cap; **add a visible truncation notice** if not present; owner: product |
| **Q-26** (alias Q-C) | Prod virtualization flags / thresholds (`virtualization-flags.ts`; defaults ON per POST-REVIEW CORRECTION #2) | Thresholds (rows `minRows 75`, branch `minSections 80`) decide whether a many-small-tables sheet virtualizes — affects **scroll smoothness** the user feels. Lowering thresholds is deferred until the large fixture exists (`09 §11`). | leave thresholds; confirm prod doesn't set `NEXT_PUBLIC_*_VIRTUALIZATION=0`; tune post-fixture |

Each carries an owner + deadline + safe default in `19` (the round-2 contract requires owner/deadline/safe-default columns on every "Owner decision needed: yes" question).

---

## 8. Phase → UX-gate mapping

The consolidated map. New gates introduced by this doc are **bold**; existing gates are referenced by name. `bun run storybook:validate` is REQUIRED (not in `validate`) at the phases marked ✅-a11y.

| Phase | UX risk | Required UX gates |
|---|---|---|
| **2 — Tree kernel** | focus/scroll/expansion loss on converge; DnD affordance regression; Escape gap | ✅-a11y `storybook:validate`; tree keyboard-nav DOM assertions (`08 §10`); **GATE-TRANSIENT-SURVIVAL**; **GATE-DND-AFFORDANCE** (manual, per family); snapshot-compare share tree (`08 §11`); close §3.1 Escape gap (test) |
| **3 — Sheet decomposition + per-row store** | in-progress edit reset/overwrite; remount loses scroll/focus/selection; total flash; cell-keyboard loss; stale badge | ✅-a11y `storybook:validate`; `estimate-sheet-render-relief` / `-memoization` / `-cursor-isolation`; **GATE-EDIT-INIT / GATE-EDIT-RECONCILE / GATE-EDIT-IDENTITY** (Step 4); **GATE-NO-TOTAL-FLASH** (Step 5); **GATE-CELL-KEYBOARD** (Step 9); **GATE-STALE-BADGE-EAGER** + field-differential (Step 7); **GATE-TRANSIENT-SURVIVAL** per step |
| **5 — Optimistic mutations** | rollback loses scroll/focus; insert shows skeleton; focus lost after delete | `optimistic-mutation-contract.test.tsx` (`11 §11`); **GATE-FOCUS-AFTER-MUTATION**; optimistic-insert-shows-values assertion (§2.2); render-isolation reuse (`A-08`) |
| **6 — UI primitives** | dialog focus-trap/return-focus dropped; CLS on skeleton swap; token/exception flattened | ✅-a11y `storybook:validate` (coverage+boundary); retained focus-trap DOM assertions (`12 §6`); DESIGN.md token + named-exception survival (§4) |
| **7 — Bundle / streaming / providers** | CLS on Suspense; auth/redirect drop on workshop; scroll loss on `router.refresh` | **manual CLS check** (DevTools Layout Shift, §4); `prove:workshop-auth-boundary` (new, Phase 7); skeleton/fallback pixel-isomorphism (§2.3) |

---

## 9. Cross-references

- **Risks:** RISK-01 (sheet regression — §1.3, §2.1), RISK-02 (DnD/reorder — §5), RISK-03 (proposal signature — §6), RISK-04 (share public route — §3.1), RISK-07 (rollback/optimistic — §2.2, §3.5), RISK-10 (DS drift — §4), RISK-19 (workshop auth boundary — §1.2 Phase 7).
- **Decisions:** D-009 (editableRows store — §1.3, §7); plus a new D ref for the **debounce window** (§6) and any §2.1 deferral deviation (`17`).
- **Open questions:** Q-08b/Q-A, Q-02, Q-26/Q-C (§7); new Q (a11y-escape, §3.1).
- **Audit/patterns:** A-07/A-08/A-09/A-21 (sheet), A-38 (under-tested transient state), A-33 (skeleton drift), PAT-13/PAT-15/PAT-16/PAT-18.
- **Feeds:** per-phase manual QA + `15_VALIDATION_MATRIX.md` (FIX-9 lifts the new GATE-* and the ✅-a11y `storybook:validate` requirement at Phases 2/3/6 into the matrix).
