# Estimate Sheet Page — UX/UI Improvement Plan

> **Status:** Planning complete · awaiting execution
> **Date:** 2026-06-14
> **Author:** Claude (product/UX/architecture lead) · audited via 8 parallel read-only agents
> **Scope:** UX/UI of the Estimate Sheet page (`/workshop/projects/{id}/estimates/{id}`) — 9 requirements
> **Source of requirements:** `.ai/08_prompts/Estimate-Sheet-UX-UI-Improvement-Points.md`
> **This is NOT yet a coding task.** This package is an audit + readiness + sequenced plan. Implementation begins only after owner sign-off on the gates below.

---

## What this page is, structurally

The Estimate Sheet page is a **three-panel workspace** rendered inside the project layout:

```
┌─ Project layout (WorkshopPageShell) ─ actions slot: [ Share | Teamspace ] ◀ "upper header"
│  (separate React tree: layout.tsx → ProjectChromeAsync)
└─ Page body (EstimateSheetContent, ~94KB monolith, dynamic-imported)
   ┌───────────────┬─────────────────────────────┬────────────────────┐
   │ LEFT sidebar  │ MIDDLE estimate sheet        │ RIGHT sidebar      │
   │ (estimate     │ (tab strip + rows/tables)    │ (component/template│
   │  tree)        │                              │  library)          │
   │ EstimateSheet │ EstimateSheetContent +       │ component-library/ │
   │ Tree.tsx      │ EstimateTabStrip.tsx +       │ index.tsx          │
   │               │ rows/row-table.tsx           │ (EstimateRightSide │
   │               │                              │  bar)              │
   └───────────────┴─────────────────────────────┴────────────────────┘
```

All three panels share the `TreePanelHeader` primitive (`src/components/ui/tree-panel-header.tsx`) for their toolbar/search/tabs header row.

---

## The 9 requirements (verbatim intent → plan mapping)

| # | Requirement (paraphrased) | Domain | Doc | Risk |
|---|---|---|---|---|
| 1 | Preview-XLSX + Activity buttons → upper header beside Share, matching style | Header relocation (cross-tree) | `05` Phase C | **HIGH** |
| 2 | Teamspace → icon-only button (no text/avatar), team icon, neighbor style | Header (teamspace) | `05` Phase C | MED |
| 3 | All 3 panel headers get a consistent bottom border; consistent border color page-wide | Shared `TreePanelHeader` | `05` Phase A | MED |
| 4 | Left node circle icon → orange outline when node has a component (else grey) | Left tree icon | `05` Phase B | LOW* |
| 5 | Left "add node" button → light-orange bg + darker-orange icon + hover-darken + cursor | Add-button design system | `05` Phase A/B | MED |
| 6 | Middle "add tab" button → same add-button treatment | Add-button design system | `05` Phase A/B | LOW |
| 7 | Right sidebar: remove add buttons from header; new toolbar row under tabs with tab-conditional single add button (same treatment) | Right-sidebar restructure | `05` Phase B | MED-HIGH |
| 8 | Right sidebar source dropdown ("All sources / Custom Templates / Project sources") redesigned to a proper input-select, height = tabs | Shared `DropdownSelect` | `05` Phase A | MED |
| 9 | Middle sheet: add top padding so rows aren't flush against the tab strip (match side padding) | Middle padding | `05` Phase C | LOW |
| 10 | Make the Filter & Group-by buttons **functional** (all 6 are dead no-ops today) | Filter/group features | `05` Phase D | MED-HIGH |
| 11 | Add a vertical separator between the Filter&Group cluster and the Expand&Collapse cluster (match the search separator) | Shared toolbar | `05` Phase A | LOW |
| 12 | Right sidebar: **move Filter & Group icons into the new under-tabs row** (with the add button); top header keeps only search + expand/collapse | Right-sidebar restructure | `05` Phase B | MED |
| 13 | Move the **"New tab" button** out of the tab strip into the middle panel's header icon toolbar — into the slot freed by Req 1 (where Preview-Excel was) | Middle header / tab-strip refactor | `05` Phase C | MED |
| 14 | Editable estimate **title**: no fixed width (long names clip today), no border, no length limit — field grows with content | Header title input | `05` Phase C | LOW |

\* Req 4 was perf-critical under the "whole subtree" interpretation; the owner chose **direct-items-only**, which is O(1) and removes the perf risk.
\*\* Reqs 10/11/12/13 were added mid-planning (2026-06-14). Req 12 amends Req 7 (new under-tabs row hosts Filter + View-by + Add). Req 13 amends Req 6 (add-tab button relocates into the middle header). Req 10 is the only *functional* (non-presentational) requirement; Req 13 requires a small tab-strip refactor (expose `createTab` upward).

---

## Owner decisions (locked) — see `02-OWNER-DECISIONS.md`

1. **Add-button color:** ✅ Approve a **named orange app exception**. Use the Tailwind `orange-100/700` scale (matches `projects-page-client.tsx:371`). DESIGN.md must be amended.
2. **Req 1 placement:** ✅ **Literal move** to the layout `actions` slot beside Share (cross-tree via shared Zustand state).
3. **Req 4 semantics:** ✅ **Direct items only** — orange iff the node's own `estimateRowItems` is non-empty.
4. **Req 3 border scope:** ✅ **Global** — one edit to `TreePanelHeader` root; all 11 consumers gain the border (intended consistency).
5. **Req 10 scope (D5):** ✅ **Wire existing machinery** — right = facet popover + View-by grouping; middle = real group-by via the already-imported `groupComponents`/`sortComponents` + faceted filter; left = structured filter only.
6. **Req 10 group-by (D6):** ✅ **Hide left Group** (areas already are the grouping); only **middle** gets a net-new group-by; right uses the existing View-by.
7. **Req 12 right-panel layout (D7):** ✅ New under-tabs row hosts **Filter · View-by · Add** (tab-conditional); top header keeps only search + expand/collapse. The dead "Group" button is **dropped** (redundant with View-by) per the owner's "drop functionless buttons" call.
8. **Drop-dead-buttons principle (D8):** ✅ Buttons with no function are removed, not kept as no-ops. Implemented at the primitive level by **handler-gating** the toolbar's Filter/Group (render only when a handler/slot is supplied).

---

## Documents in this package

| Doc | Purpose |
|---|---|
| `00-INDEX.md` | This file — overview, requirement map, decisions, sequencing |
| `01-CURRENT-STATE-AUDIT.md` | Consolidated audit findings per requirement, with exact `file:line` |
| `02-OWNER-DECISIONS.md` | The 4 decisions + rationale + the DESIGN.md exception text to add |
| `03-DESIGN-SYSTEM-CHANGES.md` | Token table, the new shared add-button style, border token, dropdown variant |
| `04-BLAST-RADIUS-RISK-SEQUENCING.md` | Shared-symbol impact, risk-ranked table, test coverage, concurrency, phasing |
| `05-IMPLEMENTATION-PLAN.md` | The phased, task-by-task TDD plan (the executable deliverable) |
| `06-TEST-PLAN-AND-VERIFICATION.md` | Tests to update, new guards to add, manual smoke script, validation gate |

---

## Execution sequencing (summary — full detail in `04` and `05`)

The hard constraint is that **`EstimateSheetContent.tsx` is a single ~94KB file touched by Reqs 1 & 9**, and several reqs touch **shared primitives** (`TreePanelHeader`, `DropdownSelect`, the add-button style). To avoid merge conflicts and cross-page breakage:

- **Phase A — Shared primitives first (additive, parallelizable, different files):**
  A1 add-button style constant (Req 5/6/7) · A2 `TreePanelHeader` bottom border (Req 3) · A3 `DropdownSelect` boxed variant (Req 8) · A4 `HeaderIconToolbar` refinements: handler-gated Filter/Group + Filter↔Group/Expand separator (Req 10-primitive, Req 11).
- **Phase B — Per-panel presentational work (parallelizable by file):**
  B1 left tree node icon + add-area button (Req 4, 5) · B2 tab-strip add button (Req 6) · B3 right-sidebar restructure — new under-tabs row hosting Filter · Group · View-by · Add (Req 7, 12) using A1+A3+A4.
- **Phase C — Serialize on `EstimateSheetContent.tsx` (conflict epicenter):**
  C1 Req 1 header relocation (heaviest — cross-tree store) · C2 Req 9 padding. Req 2 (teamspace) lives in a different file and can run alongside C.
- **Phase D — Filter/Group functionality (Req 10), depends on A4; per-panel:**
  D1 right facet filter popover + View-by grouping wired in the new row (extends B3) · D2 middle real group-by (wire `groupComponents`/`sortComponents`) + faceted filter · D3 left structured filter (no group).

**Validation gate after every land:** full `vitest` (esp. `estimate-sheet-version-control-ui`, `estimate-mixed-content`, all three `perf/`), `tsc`, `lint`; then `git push origin HEAD:main` (do **not** `checkout main` locally — concurrent agents keep main dirty).

---

## Implementation lane

Per `CLAUDE.md`, **Codex is the implementation lane** (diffs, refactors, tests) and a **review gate** is enabled. When this plan is approved, delegate execution phase-by-phase to Codex (`/codex:*`), keep Claude as reviewer/lead, and clear the Codex review gate before declaring any phase complete. Use `superpowers:subagent-driven-development` if executing in-session instead.

## Non-goals (explicitly out of scope)

- No DB/RPC/schema changes. Every requirement is presentational or client-state only.
- No change to estimate domain logic, insert/drag mechanics, or the P0–P6 unification invariants.
- The in-row "Add row" `QuietAddRowButton` stays **quiet** (not orange) unless the owner says otherwise — see `02`/`03`.
