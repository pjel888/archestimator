# Implementation Handoff — Estimate Sheet UX/UI (14 reqs)

> **Paste this whole file (or the "Kickoff prompt" below) to the implementer** — Codex (`/codex:*`, review gate ON) or a fresh Claude session running `superpowers:subagent-driven-development`. It is self-contained but links to the full plan in this folder.

---

## Kickoff prompt (copy-paste)

```
Implement the Estimate Sheet page UX/UI improvement plan at
.ai/03_plans/2026-06-14-Estimate-Sheet-Page-UX-UI-Improvement-Plan/.

Read 05-IMPLEMENTATION-PLAN.md (the task list) and 03-DESIGN-SYSTEM-CHANGES.md
(exact classes) first; consult 01 (audit, file:line), 02 (locked decisions),
04 (sequencing/blast-radius), 06 (tests) as needed.

Rules:
- This is presentational + client-state only. NO DB/RPC/schema changes.
- Land in dependency order: Phase A (shared primitives) → B → C → D. Do not
  start a per-panel task until the shared primitive it depends on is merged.
- TDD per task: write/adjust the failing test, implement, make it pass.
- Run impact analysis (code-review-graph get_impact_radius) before editing any
  shared symbol; report HIGH/CRITICAL before proceeding.
- Use nvm node v25.8.0 for vitest/tsc/lint. Run the FULL vitest suite + tsc +
  lint after each task. Land via `git push origin HEAD:main` — never
  `git checkout main` locally (concurrent agents keep main dirty).
- Preserve accessible names: "Activity", "Preview Excel Export", "New tab",
  "Estimate name", "Reusable source filter", and the Components/Templates tab roles.
- Clear the Codex review gate before declaring any phase complete.

Start with Phase A, Task A1. Pause for my review after each phase.
```

---

## Locked decisions (do not re-litigate)

| # | Decision |
|---|---|
| D1 | Add buttons use **Tailwind `orange-100/700`** (`ADD_BUTTON_CLASSNAME`). **DESIGN.md orange exception is APPROVED** — land the §D1 block in Task A1. |
| D2 | Req 1 is a **literal cross-tree move** (Zustand slice + hydration parity). |
| D3 | Req 4 occupancy = **direct items only** (`node.estimateRowItems?.length > 0`). |
| D4 | Req 3 border = **global** edit to `TreePanelHeader`. |
| D5 | Req 10 = **wire existing machinery** (facet popover + `groupComponents`/`sortComponents` + View-by). |
| D6 | **Left tree has no group-by**; middle gets the new group-by; right uses View-by. |
| D7 | Right new under-tabs row = **Filter · View-by · Add**; dead Group dropped. |
| D8 | **Drop functionless buttons** — handler-gate `HeaderIconToolbar` Filter/Group. |
| — | Req 14 **keeps the red error border**; "no border" = resting/hover/focus only. |
| — | In-row "Add row" (`QuietAddRowButton`) **stays quiet** (not orange). |

---

## Execution order & gates (one line each)

**Phase A — shared primitives FIRST (parallel-safe; 4 different files; each merges before dependents):**
- A1 `ADD_BUTTON_CLASSNAME` in `toolbar-icon-button.tsx` + DESIGN.md exception → unblocks 5/6/7/12/13.
- A2 `TreePanelHeader` root `+ border-b border-hairline` (Req 3) → then eyeball 9 consumers (no double-border at `TemplateGallery.tsx:241`, `ComponentLibraryManager.tsx:875`).
- A3 `DropdownSelect` `+ variant="boxed"` (Req 8) → default underline unchanged.
- A4 `HeaderIconToolbar` handler-gate Filter/Group + Filter↔Expand separator (Req 10-primitive, 11, D8) → update `header-icon-toolbar-ui.test.tsx`.

**Phase B — per-panel presentational (parallel by file):**
- B1 `EstimateSheetTree.tsx` — Req 4 (occupied icon, direct-items, fold into memoized `toUiNode`) + Req 5 (add-area orange). Add a sidebar-mounted guard.
- B3 `component-library/index.tsx` — Req 7+12 (top header `showDefaultActions={false}`/`addActions={[]}`/drop `leadingActions`; new under-tabs row = Filter·View-by·Add) + Req 8 apply `variant="boxed"`. Update `component-library-ui.test.tsx`.

**Phase C — serialize on `EstimateSheetContent.tsx` (one branch; conflict epicenter):**
- C1 Req 1 — Zustand slice → `EstimateHeaderActions` beside Share → `ProjectHeaderChromeSkeleton` parity → update `project-chrome-streaming`/`cost-inputs`/`proposal-export-preview`. **(Empties the middle header slot.)**
- C3 Req 13+6 — relocate New-tab into the freed middle-header slot (expose `createTab` via ref + state callback; `ADD_BUTTON_CLASSNAME`).
- C2 Req 9 — `pt-2` on rows scroll container (+ empty-tab state).
- C4 Req 14 — title input: drop `max-w-[320px]` + resting/hover/focus border, add `field-sizing-content max-w-full`, keep error border. *(Different file — parallel-safe.)*
- Req 2 (Teamspace icon-only) — `ProjectTeamspaceHeader.tsx`, parallel to C; coordinate header churn.

**Phase D — Filter/Group behavior (Req 10; depends on A4):**
- D1 right facet filter + View-by (extends B3) · D2 middle group-by + filter (serialize with C; keep grouping a **memoized transform** to protect `render-relief`) · D3 left structured filter, no group.

**Gate after every task:** full `vitest` + `tsc` + `lint` → Codex review → `git push origin HEAD:main`. After Req 4 / Req 10-D2 also run the 4 `perf/` tests and confirm `rendersOutside === 0`.

---

## The 8 tests guaranteed to need edits
`project-chrome-streaming` · `teamspace-collaboration-header` · `estimate-sheet-cost-inputs` · `proposal-export-preview` · `component-library-ui` · `header-icon-toolbar-ui` · `estimate-tree-modal` · `estimate-tabs-domain`/`estimate-empty-tab-state`.
New tests to author: `add-button-style`, `tree-panel-header-border`, `estimate-tree-node-icon`, `estimate-header-actions`, a wired filter/group e2e. (Full matrix in `06`.)

---

## Watch-outs (the things that bite)
1. **`EstimateSheetContent.tsx` ~94KB** — Reqs 1, 9, 13, 10-mid all touch it; do them in ONE serial branch (Phase C/D-mid), not parallel.
2. **Hydration parity** (`ProjectChromeAsync` `43-50`/`72-80`): adding header buttons requires updating `ProjectHeaderChromeSkeleton` node count in lockstep, or React throws a mismatch.
3. **Req 13 is a refactor** — `createTab` is encapsulated in `EstimateTabStrip`; expose it via ref + `onCreateTabStateChange` (refs don't re-render the disabled state).
4. **Tailwind v4** — `cursor-pointer` is NOT default on buttons; it's in `ADD_BUTTON_CLASSNAME` already.
5. **Perf tests run `renderSidebar={false}`** — they won't catch a Req 4 regression; the new `estimate-tree-node-icon` test is the guard. Keep occupancy O(1) inside the memoized `toUiNode`; don't thread a map to rows.
6. **Don't rebase the shared `DropdownSelect` base** (16 consumers) — add the opt-in `boxed` variant only.
7. **Field-sizing browser support** (Req 14): Chromium 123+; Safari/Firefox fall back via input horizontal-scroll (full name still editable). Acceptable.

---

## Definition of done
- All 14 reqs implemented per `05`; the full manual smoke script in `06` passes.
- Full `vitest` + `tsc` + `lint` green; the 4 perf tests green; no console hydration warnings.
- DESIGN.md carries the orange exception.
- Codex review gate cleared on every phase; everything pushed to `origin/main`.
