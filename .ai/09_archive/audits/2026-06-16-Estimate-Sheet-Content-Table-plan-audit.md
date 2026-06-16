# Audit — Estimate Sheet Content → Resizable TanStack Columns Planning Package

> **Audited package:** `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/` (11 docs, `00`–`10`, ~2,258 lines)
> **Audit date:** 2026-06-16
> **Method:** 5 parallel audit agents, each re-verifying the docs' factual claims against the **live codebase** (not prose-only review), then synthesized + cross-checked.
> **Type:** Audit only. No source code and no planning docs were modified by this pass.
>
> **Overall verdict:** 🟢 **STRONG — ship-ready as a plan after targeted fixes.** The architecture is correct and independently verified against the code. Do **not** rewrite. Before implementation, fix one logic bug (material min), one copy-paste hazard (CSS-var name drift), three column-name inaccuracies, two wrong file paths, and add two small missing analyses (express-card floor, ruler alignment). The drag-and-drop remediation prompt is in **§10**.

---

## 1. Executive summary

The package answers the user's real question — *resizable column widths synced across all node groups, given memoization + virtualization* — and it correctly reframes the problem in a way the original ask missed: **the estimate sheet is not one table; it is N independent CSS-Grid "tables," one per row-bearing node, all stamping a single shared literal `ROW_COLUMNS` (`row-table.tsx:96`).** That reframing is the most valuable insight in the package and it is **verified true**.

The core recommendation rests on three pillars, all independently judged correct:
1. **CSS custom properties on the common `[data-estimate-pointer-surface]` ancestor** for cross-group sync (near-forced by the architecture — CSS inheritance broadcasts one change to all N groups in a single layout pass with zero React fan-out).
2. **Transient (imperative DOM writes during drag) / committed (one store write on pointer-up)** split — the only thing that protects the identity-keyed memo comparators and the two nested virtualizers from a per-frame re-render storm.
3. **Route A: TanStack headless sizing only** (or even just port the ~40-line resize handle that already exists and works in `ProjectEstimatesTable.tsx`) — not a full `useReactTable` row-model rewrite.

Where it falls short is **coherence, not correctness**. Expanding from 7 to 11 docs duplicated the same facts across multiple tables, and the duplication bred drift — most of the issues below are "the same value disagrees between two copies." There is also a small set of **factual inaccuracies** in the column model (field-name casing/pluralization, and a column that maps to a field that doesn't exist) and **two wrong file paths** that would send an implementer to the wrong location.

Bottom line: trust the architecture; clean the contract.

---

## 2. Overall package scorecard (0–100)

| Dimension | Score | Band | Justification |
|---|---:|---|---|
| **Effectivity** (answers the real goal) | **88** | Strong | Nails the real crux (N-tables sync) and the right mechanism; verified against live code. Docked because the material-min bug currently makes the "byte-identical rollout" promise false, and the express-card minimum is an unmeasured guess. |
| **Strategy** (right architectural call) | **90** | Excellent | CSS-var sync + transient/committed + Route A is correct and well-argued. Docked only for asserting the sync-vector choice over the `<colgroup>` alternative it was literally porting from, instead of tabling them side by side. |
| **Quality / Clarity** | **86** | Strong | Citation fidelity is unusually high; tables and diagrams are crisp. Pulled down by column-name inaccuracies in the docs meant to be authoritative, and a stale design-token color. |
| **Implementation Readiness** | **82** | Good | Closest-to-turn-key of any plan package reviewed here; needs the path fixes, flag-wiring location, and storage-helper import path before an AI can run solo. |
| **Coherence** (internal consistency) | **68** | Needs work | A governing doc (06) and decision log (10 §5) are real strengths, but variable-name drift, the 160-vs-200 material bug, "9 vs 6 vars," and decided-vs-open framing are exactly the drift that duplication causes. |
| **Scope discipline** | **74** | Acceptable | Core (01–06) is lean for a hard problem; `07` and `09` earn their place; `08`+`10` are ~30% ceremony (phases stated in three places, assertion-only traceability) for a 6-column feature. |
| **Decision completeness** | **80** | Good | Most decisions made and logged; two values are false-settled (material min, express floor) and two questions are false-open (truncate, persistence scope). |

**Composite: ~83/100 — "Strong plan with sharp edges." Fix §5 P0/P1 and it climbs to ~93.**

---

## 3. Per-document scorecard (0–100)

Scores are from the verifying agents; dimensions vary by doc role (foundation docs scored on Accuracy; design/plan docs on Effectivity/Strategy).

| Doc | Role | Accuracy | Effectivity / Strategy | Quality | Impl. Readiness | Notes |
|---|---|---:|---:|---:|---:|---|
| **01** current-architecture-audit | Foundation | **97** | — | 95 | 93 | Near-flawless; every load-bearing claim TRUE with exact lines. Trivial: cell-index `:383→:384`; `w-[74px]` is in `row-table.tsx` not `cells.tsx`. |
| **02** memoization-virtualization-audit | Foundation | **95** | — | 96 | 94 | Excellent. "14 mutation callbacks" should be **16**; `displayedSheetNode` span `:1272-1280→:1281`; inner `overscan` is **6** (not stated). |
| **03** tanstack-resizing-research | Research | **94** | 90 | 92 | 88 | v8 API claims correct & cross-validated vs the repo's own impl. Correctly subordinated to 06. Only an illustrative-numbers nit. |
| **04** shared-width-state-design | Design | **72** | 90 | 84 | 76 | Strategy is repo-idiomatic and strong, but **column-name inaccuracies** + **"header is future" mischaracterization** (header already exists at `row-table.tsx:625-650`) pull accuracy down. **Highest-priority doc to fix.** |
| **05** risk-edgecase-readiness | Risk | 90 (claims) | 92 / 90 | 82 | 90 | Resize-safety thesis (cursor cell-anchoring + per-frame rAF) **verified true**. Stale accent hex `#2563EB→#3D3D3D`; misses sticky-top-on-h-scroll risk; silent on `#7F7F7F` sub-AA meta. |
| **06** recommendation-and-migration-plan | Governing | high | 92 / 94 | 88 | 82 | Correct GO; real keystone insight. "9 vars" imprecision; two paths missing `rows/`; should index downstream UX/perf contracts. |
| **07** ux-ui-interaction-spec | UX/a11y | high | 90 / 88 | 84 | 89 | On-token type/radius/no-orange; resolves the shared-ruler ambiguity. Hover-color disagrees with reference; Materials min tight; doesn't flag express-card sub-AA meta. |
| **08** implementation-units-and-test-plan | Execution | high | 90 / 88 | 85 | 84 | Strongest handoff doc; U0–U7 truly one-PR-sized & dependency-ordered. Needs flag-read location, storage-helper path, `rows/` prefix. |
| **09** performance-measurement-plan | Perf | **96** | 95 / 92 | 96 | 93 | Budgets arithmetically verified against real virtualization config; all 8 assumed probe exports exist. Directly executable. **Best doc in the pack.** |
| **10** blast-radius-traceability-matrix | Traceability | high | 90 / 90 | 91 | 88 | Real req→risk→test→status tracing; rollback fully specified. Partly restates 05/06; merge candidate with 08. |

---

## 4. What is verified and strong (the trust foundation)

These load-bearing claims were independently re-confirmed against the live code and can be relied on:

- **`ROW_COLUMNS = grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]`** at `row-table.tsx:96`, stamped on both the header `<tr>` (`:626`) and every body `<tr>` (`:243`) — one shared literal, 9 tracks, only track 3 (`Materials`) flexes. ✔
- **N independent `<table>` grids, one per visible row-bearing node** (`branch.tsx:370`; returns `null` when empty at `row-table.tsx:599`); no sheet-spanning grid. ✔
- **Two nested virtualizers** sharing one scroll container: outer branch list with dynamic `measureElement` (`virtual-branch-list.tsx:95,143`) and inner per-table row virtualizer with a **fixed 96px** `estimateSize` and **no `measureElement`** (`row-table.tsx:494,497`), reinforced by `[contain-intrinsic-size:96px] [content-visibility:auto]` (`:241`) and absolute `translateY` positioning (`:696`). ✔ → **This is why "single-line/truncate cells" is load-bearing: wrapping changes row height and breaks the fast path.**
- **Identity-keyed memo guards**: `areEstimateSheetBranchPropsEqual` (`branch.tsx:107-149`) and `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:66-94`), kept stable by `useStableCallback` (9 verified call sites). ✔ → **This is why a per-frame width prop would re-render every group.**
- **Collaboration cursors are resize-safe** (the opposite of the original worry): they anchor by `data-estimate-cell-index` and re-resolve against live `getBoundingClientRect` every rAF frame (`EstimateSheetContent.tsx:843,849,954-963`). A local resize self-heals within one frame **as long as the `data-estimate-*` attributes survive the refactor.** ✔
- **Drag vs resize are separate event systems**: component drag is native HTML5 DnD (`cells.tsx:514,438-441`); resize is pointer-based; edge-autoscroll is **vertical-only** (`use-drag-edge-autoscroll.ts:16-33,58`). ✔
- **`ProjectEstimatesTable.tsx` is a real, accessible v8 port target**: `columnResizeMode:"onChange"` (`:1041`), `getResizeHandler` (`:737-738`), `role="separator"` + keyboard + min/max clamp (`:700-726`), `<colgroup>`+`getSize` (`:100-104`), localStorage with `removeItem` hygiene (`:89,799-801`). ✔
- **09's performance budgets are arithmetically correct** against the real virtualization defaults (row window `ceil(720/96)+6*2+2 = 22`; branch window `ceil(900/192)+10+2 = 17`) and **all 8 render-probe exports it assumes exist** in `estimate-sheet-render-probe.ts`. ✔
- **Repo conventions match 04's design**: `estimate-ui-store` is flat/unkeyed/no-persist with default-`{}` selector stability; `use-estimate-workspace-state` keys by estimateId+tabId with no-op-guard setters; `safeSetJsonStorage`/`readJsonStorage` exist (`component-library/helpers.ts:92-110`); **no zustand persist middleware** and **no server user-preferences table** exist (both confirmed by grep). ✔

Citation fidelity across the package is unusually high — this materially de-risks the handoff.

---

## 5. Issue register (prioritized, actionable)

### 🔴 P0 — fix before implementation (would misdirect or silently break)

| ID | Issue | Where | Fix |
|---|---|---|---|
| **P0-1** | **Material default vs min is internally impossible.** `04 §6` lists `material` Default **160**, Min **200** — default below min. A clamp-on-read forces 200, which **silently violates `04 §8`'s promise that the absent/default state reproduces today's layout byte-for-byte** (today's flex track floor is 160). | `04 §6`, `05 §2.1`, `07 §4` | Decide: keep min **160** (rollout stays byte-identical — recommended) OR set min **200** AND delete the "byte-identical default state" guarantee. One value, propagated everywhere. Depends on P0-2 measurement. |
| **P0-2** | **Wrong file paths.** `branch.tsx` and `virtual-branch-list.tsx` are referenced as if at `estimate-sheet/`; they live at `estimate-sheet/rows/`. An AI told to "modify branch.tsx" won't find it. | `06 §4` diagram, `06 §5` ownership map, `08` prose | Prefix both with `rows/`: `src/components/workshop/estimate-sheet/rows/branch.tsx` and `…/rows/virtual-branch-list.tsx`. |
| **P0-3** | **04 describes the column header as future/not-built.** A populated `<thead>` already exists at `row-table.tsx:625-650` reusing `ROW_COLUMNS`. The var-driven template must be applied to that header `<tr>` (`:626`) and its cells too. | `04 §0 (:17)`, `04 §3 (:229-231)`, `04 §7` | Reword to acknowledge the existing header; ensure the migration step lists updating the header `<tr>` application, not only the body. |

### 🟠 P1 — fix before/at handoff (forces rediscovery or wrong wiring)

| ID | Issue | Where | Fix |
|---|---|---|---|
| **P1-1** | **CSS variable name drift — not copy-pasteable.** The same variable appears as `--col-material` (`04 §3`), `--est-col-material` (`07`), and `--est-col-name`/`--est-col-gutter` (`06 §4` diagram). | `04, 05, 06, 07, 08` | Standardize on **one** prefix (`--est-col-`) + **one** ID set (the `04 §1` IDs). Delete the `--est-col-name`/`--est-col-gutter` variants in `06`. Make `04 §1` the canonical source the others link to. |
| **P1-2** | **Column IDs don't match real field names.** `subtotal`→ field is `subTotal` (capital T, `types.ts:95`); `totalItemCost`→ field is `totalItemCosts` (**plural**, `types.ts:100`); `adjustment` → **no such field** — that column renders `contingencyPercentage`/`contingencyValue` (`row-table.tsx:343-394`). | `04 §1/§6`, `00-README` revision note, `07 §2` | Either align IDs to fields or (preferred) keep stable IDs **and add an explicit ID↔header-label↔field mapping table** stating `adjustment` = contingency column, and fix `subtotal→subTotal`, `totalItemCost→totalItemCosts`. The README's "live column names" claim currently overclaims — annotate that these are storage IDs, not field names. |
| **P1-3** | **Stale design-token color.** `05 §3` says the focus line is "`#2563EB`-class accent." Current token is `accent: #3D3D3D` (DESIGN.md); the reference handle uses `bg-accent`. Conclusion (passes AA, ~10.4:1) survives, but the hex is wrong and could be hardcoded. | `05 §3 (~:95)` | Replace with the `#3D3D3D` accent token; instruct "use the accent token, don't hardcode blue." |
| **P1-4** | **Flag-read location unspecified.** `08 U7` adds `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED` but never says where it's consumed. | `08 U7` | Mandate the existing pattern: add an `estimateColumnResize` key via `readPublicFlag()` in `src/lib/workshop/virtualization-flags.ts`, consumed in `EstimateSheetContent.tsx`; name the flag-off value used in tests. |
| **P1-5** | **Storage-helper import path not stated.** `readJsonStorage`/`safeSetJsonStorage` cited without their home. | `08 U4`, `09 §6` | State: `import { readJsonStorage, safeSetJsonStorage } from "@/components/workshop/component-library/helpers"`. |
| **P1-6** | **"9 vars" vs "6 resizable columns."** `06 §4`/`00-README` say "change 9 vars"; only 6 data columns resize (3 chrome tracks are fixed). Wiring handles onto fixed tracks is a bug risk. | `00, 04, 06` | Standardize on "6 resizable data columns + 3 fixed tracks"; fixed tracks stay literal in the template. |

### 🟡 P2 — polish / accuracy hygiene

| ID | Issue | Where | Fix |
|---|---|---|---|
| **P2-1** | Missing sub-AA flag: express-card supplier/source line uses `tertiary #7F7F7F` (`cells.tsx:134`), ~3.5:1 on white — already fails WCAG AA, and resize narrows the column further. | `05`, `07 §4` | Add a note: as resize narrows Materials, load-bearing meta should move to `secondary #5D5D5D`; don't let resize make already-failing meta the only label. |
| **P2-2** | Hover color disagrees with reference: spec says hover→`secondary`; reference handle uses `hover:after:bg-accent`. | `07 §6` | Converge: hover→`secondary #5D5D5D`, focus/active→`accent #3D3D3D` (both on-token, both AA). |
| **P2-3** | False-open / false-settled framing. `00-README` lists **truncate-cells** and **persistence-scope** as open questions, but `06 §3` / `04 §1` / `10 §5` treat them as **decided (with override)**. | `00, 04, 06, 10` | Reword those two from "decide" to "confirm defaults." Keep genuinely-open ones (reset affordance; handle-port vs `useReactTable`). |
| **P2-4** | Keyboard contract scattered (±16 in `05`; Shift+48 & Escape in `07`; "may commit per keypress" in `09`); `06` (governing) doesn't mention it. | `03,05,06,07,09` | Let `07` own the keyboard contract; `06 §11` indexes it; align step = 16px (Shift 48) for deterministic tests. |
| **P2-5** | Line-number drift (non-load-bearing): `02` callbacks 14→**16** & `displayedSheetNode :1280→:1281` & inner `overscan` 6 unstated; `01` cell-index `:383→:384` & `w-[74px]` file; `05` express aria-live `:205→:667`, `<thead> :626→:625`. | `01, 02, 05` | Apply the surgical corrections in §6. |
| **P2-6** | Phase/unit double-statement: phases described in `05 §5`, `06 §8`, and `08` (U-sequence) at different granularities. | `06, 08` | Add a one-line unit→phase map (U1/U2→P0, U3→P1, U4/U5→P2, U7→flag). |

---

## 6. Consolidated surgical corrections (verified old → new, ready to apply)

> These are the high-confidence, self-contained text fixes. The cross-doc normalizations (P1-1, P1-2, P1-6) should be applied **atomically across all docs** by the handoff AI — do not half-apply.

**04-shared-width-state-design.md**
1. `:17` — OLD `shared by *every* row and the (future) header` → NEW `shared by *every* row **and the existing header row** (rendered at row-table.tsx:625-650)`
2. `:82` — OLD `| "subtotal"  // track 5 …` → NEW `| "subTotal"  // track 5 … (field: subTotal, capital T)`
3. `:84` — OLD `| "totalItemCost"  // track 8 …` → NEW `| "totalItemCosts"  // track 8 … (field: totalItemCosts, plural)`
4. `:83` — OLD `| "adjustment"  // track 6 …` → NEW `| "adjustment"  // track 6 … (header "Adjustment"; backed by contingencyPercentage/contingencyValue — no "adjustment" field exists)`
5. `:89` ResizableColumnId — OLD `… | "subtotal" | "adjustment" | "miscCost" | "totalItemCost";` → NEW `… | "subTotal" | "adjustment" | "miscCost" | "totalItemCosts";` (propagate through `DEFAULT_COLUMN_WIDTHS`, `COLUMN_WIDTH_BOUNDS`, the §3 template, and §6 table)
6. `:229-231` — OLD `when the sticky column header is built (deferred sibling doc) …` → NEW `the **existing** column header (row-table.tsx:625-650) already reuses ROW_COLUMNS; the var-driven template must be applied to that header <tr> (:626) and its cells, and any future sticky header must live inside the same surface`

**05-risk-edgecase-readiness.md**
7. `~:95` — OLD `… passes AA contrast against bg-white (#2563EB-class accent is fine).` → NEW `… passes AA against bg-white. The handle uses bg-accent = #3D3D3D (DESIGN.md), ~10.4:1 on #FFFFFF — passes AA. Use the accent token; do not hardcode a blue.`
8. `~:186` — OLD `:205 express status` → NEW `:667 express/SR polite region (cursor SR region :999)`
9. `§2.3 (c)` — promote sticky-header-on-horizontal-scroll from "out of scope unless it regresses" to an **S2 risk**: once columns are px-fixed wider than the viewport, the labels AND the resize handles (which live in the header ruler, `07 §2`) scroll out of view — the shared ruler must be `position: sticky` on the inline-start/top so handles stay reachable.

**02-memoization-virtualization-audit.md**
10. `§2.1` — OLD `All 14 mutation callbacks are compared by reference` → NEW `All 16 callback props (the 14 mutation handlers plus setEditableRows, onToggleRowSelection, onToggleRowsSelection) are compared by reference (branch.tsx:108-135)`
11. `§1.2` — append: `inner default overscan is 6 (row-table.tsx:498), vs the outer virtualizer's 5`
12. `§2.4` — fix span `:1272-1280` → `:1272-1281`; soften the unverified transform-module cites (`filterEstimateSheetNodeByFacets :772`, `reorderEstimateSheetNodeRows :799/:810-817`) to reference the `displayedSheetNode` design note at `EstimateSheetContent.tsx:1268-1271` instead.

**01-current-architecture-audit.md**
13. `§1` — cell indexes `row-table.tsx:328, 383, 419` → `328, 384, 419`
14. `§6` — `:343 w-[74px] dropdown` → `row-table.tsx:343 w-[74px] dropdown` (the `w-[84px]` cite stays `cells.tsx:306`)

**07-ux-ui-interaction-spec.md**
15. `§6` Hover — OLD `Divider darkens from hairline to secondary.` → NEW `Divider darkens from hairline (#F2F2F2) to secondary (#5D5D5D) on hover; focus/active use accent (#3D3D3D). Both pass AA on #FFFFFF.`
16. `§4` width-bounds — annotate `material` min (pending P0-2 measurement): express card reserves `84px` cost + `92px` (`pr-[92px]`) + `56px` image + gaps; validate no overlap at the chosen min.

---

## 7. Gaps requiring new analysis (not just text fixes)

1. **Measure the express card's true minimum width.** The entire min-width contract (R-5, the `200px` guess) rests on the express card's real floor with hard-coded `pr-[92px]` + `w-[84px]` + `size-14` image (`cells.tsx:106,306,128`). This is currently a guess. **A ~30-minute spike measuring the actual floor is the single highest-value missing analysis** and it gates P0-1.
2. **Design (don't just decide) the shared-ruler alignment.** "One sticky ruler aligned with N non-sticky-header scrolling tables under horizontal scroll" is the riskiest unproven UX claim and is treated as settled (`07 §2`). Either prove the inherit-vars-keeps-it-aligned mechanism with a sketch, or downgrade it to a Phase-0 spike.
3. **Table the `<colgroup>` alternative against CSS-vars.** The package asserts CSS-vars-on-grid as the sync vector but never lays it next to the `<colgroup>` + `col.getSize()` approach it is literally porting from in `ProjectEstimatesTable.tsx:100-104`. CSS-vars is very likely still right, but the choice should be demonstrated, not asserted. One short comparison closes the biggest analytical gap.

---

## 8. Scope & redundancy recommendations

- **Keep lean & excellent:** `01`–`06`, plus `09` (its budgets are the only thing that makes "don't regress memoization" testable) and `07` (it owns the one real product decision: ruler placement + a11y).
- **Merge `08` + `10`** into one "Execution & Traceability" doc. Phases are currently stated in three places (`05 §5`, `06 §8`, `08`); the risk register in 2.5 places; the column track/default table **four** times — and the 4th copy is exactly where the P0-1 bug hides. Duplication caused the bug.
- **Declare `04 §1/§6` the canonical column contract.** Have `01/05/06/07/08` *link* to it instead of re-tabling. This single move prevents recurrence of P0-1, P1-1, P1-2, P1-6.
- **Make `06 §11` index every downstream contract** (point to `07` for keyboard/UX, `09` for perf budgets) so "06 governs" is true for a reader who opens only `06`.

---

## 9. Decision status correction

| Decision | Current framing | Reality | Action |
|---|---|---|---|
| Single-line/truncate cells | Open question (`00`) | **Decided** — load-bearing for the whole perf story (`06 §3`, `10 §3`) | Demote to "confirm" |
| Persistence scope (per-estimate across tabs) | Open question (`00`) | **Decided with override** (`04 §1`, `10 §5`) | Reword to "confirm default" |
| Material min/default (160 vs 200) | Stated as a value (settled) | **Actually unresolved** (P0-1) — and unmeasured | Make it an explicit decision gated on §7.1 |
| Express-card minimum | Stated as `≥200` (settled) | **Unmeasured guess** | Gate on §7.1 spike |
| Reset affordance shape | Open | Genuinely open | Keep open |
| Port handle vs `useReactTable` | Open | Genuinely open | Keep open |

---

## 10. ⬇️ DRAG-AND-DROP HANDOFF PROMPT (paste into the codebase AI that will improve the docs)

```
/goal Improve the Estimate-Sheet resizable-columns PLANNING PACKAGE in
.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/ (docs 00–10) by applying the
fixes from the audit at .ai/02_audits/2026-06-16-Estimate-Sheet-Content-Table-plan-audit.md.

This is a DOCS-ONLY task. Do NOT modify application source code, tests, or config.
The architecture in the package is correct and code-verified — do NOT redesign it.
Your job is to fix accuracy, coherence, and one logic bug, then re-verify.

WORK IN THIS ORDER:

A. FIX THE P0s (audit §5):
   1. Resolve the material-min logic bug (P0-1). FIRST run the spike in §7.1: open
      src/components/workshop/estimate-sheet/rows/cells.tsx and measure the express
      component card's true minimum usable width (it hard-codes pr-[92px] + w-[84px]
      cost + size-14 image + gaps). Use the measured floor to choose ONE material min.
      If min > 160, you MUST delete the "absent/default state reproduces today's layout
      byte-for-byte" guarantee in 04 §8 (it would no longer be true). Propagate the one
      value to 04 §6, 05 §2.1, 07 §4.
   2. Fix the wrong file paths (P0-2): branch.tsx and virtual-branch-list.tsx live at
      src/components/workshop/estimate-sheet/rows/ — add the rows/ prefix everywhere
      (06 §4 diagram, 06 §5 ownership map, 08 prose).
   3. Fix 04's "header is future" mischaracterization (P0-3): the <thead> already exists
      at row-table.tsx:625-650 and reuses ROW_COLUMNS. Verify this yourself, then reword
      04 §0/§3/§7 and ensure the migration step updates the header <tr> application (:626),
      not only the body.

B. FIX THE P1s (audit §5) — apply ATOMICALLY across all docs (do not half-apply):
   4. Normalize CSS variable names to ONE convention: --est-col-<id> with the 04 §1 ID set.
      Delete --col-material / --est-col-name / --est-col-gutter variants (P1-1).
   5. Fix column IDs / field names (P1-2): subtotal→subTotal, totalItemCost→totalItemCosts;
      state explicitly that the "adjustment" column has NO backing field — it renders
      contingencyPercentage/contingencyValue. Verify field names in src/lib/estimates/types.ts.
      Add ONE canonical ID↔header-label↔field mapping table in 04 §1 and have other docs
      link to it. Correct the 00-README "live column names" note (these are storage IDs).
   6. Replace stale #2563EB with the #3D3D3D accent token in 05 §3 (P1-3).
   7. Specify flag wiring (P1-4): estimateColumnResize via readPublicFlag() in
      src/lib/workshop/virtualization-flags.ts, consumed in EstimateSheetContent.tsx.
   8. State the storage-helper import path (P1-5):
      @/components/workshop/component-library/helpers.
   9. Reconcile "9 vars" → "6 resizable data columns + 3 fixed tracks" (P1-6).

C. APPLY THE SURGICAL CORRECTIONS verbatim from audit §6 (items 1–16).

D. CLOSE THE ANALYSIS GAPS (audit §7): add the express-card-minimum measurement result,
   a short shared-ruler alignment sketch (how one sticky ruler stays aligned with N
   scrolling non-sticky-header tables during horizontal scroll), and a brief CSS-vars
   vs <colgroup> comparison.

E. SCOPE/COHERENCE (audit §8/§9): merge 08+10 into one "Execution & Traceability" doc;
   declare 04 §1/§6 the canonical column contract that other docs link to instead of
   re-tabling; make 06 §11 index the 07 (UX/keyboard) and 09 (perf) contracts; reword
   the two false-open questions in 00-README to "confirm".

CONSTRAINTS:
- Verify every code claim you touch against the live files (cite file:line). Use the
  code-review-graph / gitnexus MCP tools or Grep before asserting.
- Keep 06 as the governing doc; where research (03) conflicts, 06 wins.
- After editing, re-read 00-README and confirm it still accurately indexes the package.
- Produce a short changelog at the end of 00-README (or a new 11-changelog.md) listing
  what changed and the resolved material-min value.
- Do NOT touch app source, tests, migrations, or settings. Docs only.
```

---

### Appendix — audit provenance
Produced by 5 parallel audit agents, each re-verifying claims against the live codebase: (A) foundation docs 01/02, (B) TanStack + state docs 03/04 incl. column-name verification, (C) executability of 06/08/09/10 incl. file-path and render-probe verification, (D) UX/a11y/design-system fit of 05/07, (E) whole-package strategy + coherence. Findings were cross-checked and reconciled. No source code or planning docs were modified by this audit.
