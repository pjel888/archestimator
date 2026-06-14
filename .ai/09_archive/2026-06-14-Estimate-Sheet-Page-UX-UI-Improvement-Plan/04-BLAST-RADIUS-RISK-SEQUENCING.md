# Blast Radius, Risk & Sequencing

Covers all 12 requirements. Graph fresh @ 2026-06-14 12:28 (14,456 nodes). Working tree is clean for code (only `.ai/` docs dirty); `EstimateSheetContent.tsx`/`EstimateSheetTree.tsx` last committed 09:51 (P6 unification — committed, not uncommitted).

---

## 1. Shared-symbol impact radius

| Symbol / file | Direct importers | Graph risk | Touched by | Strategy |
|---|---|---|---|---|
| `TreePanelHeader` (`ui/tree-panel-header.tsx`) | **11** | HIGH (482 nodes/2 hops; mostly transitive) | Req 3, 7, 12 | one additive className edit (border); structural props already supported |
| `HeaderIconToolbar` (`ui/header-icon-toolbar.tsx`) | **~12** | HIGH | Req 10, 11, D8 | additive handler-gating; 8 consumers use `showDefaultActions={false}` (unaffected) |
| `Button` (`ui/button.tsx`) | **89** | HIGH | (none — we use a className constant, not a variant) | avoid editing |
| `ToolbarIconButton` (`ui/toolbar-icon-button.tsx`) | shared | MED | Req 5/6/7 (host for `ADD_BUTTON_CLASSNAME`), 12 | add an export; no behavior change |
| `DropdownSelect` (`ui/dropdown-select.tsx`) | **16** | HIGH if base edited / LOW if opt-in | Req 8 | add `variant="boxed"`, default unchanged |
| `EstimateSheetContent.tsx` | leaf page | MED (concentration) | Req 1, 9 (and header plumbing) | **conflict epicenter** — serialize |
| `EstimateSheetTree.tsx` | page + tests | MED | Req 4, 5, 10-D3 | isolated file |
| `component-library/index.tsx` | sidebar + tests | MED | Req 7, 8, 12, 10-D1 | isolated file |
| `EstimateTabStrip.tsx` | middle | MED | Req 6 | isolated file |
| `ProjectTeamspaceHeader.tsx` | layout chrome | MED | Req 2 | isolated file |
| `ProjectChromeAsync.tsx` + `WorkshopPageShell.tsx` | layout | MED (hydration invariant) | Req 1 | careful — skeleton parity |
| New Zustand slice (Req 1) | new | — | Req 1 | additive |

---

## 2. Risk-ranked table (all 12)

| Req | Summary | Files | Shared? | Perf-guarded? | Test-break risk | Overall |
|---|---|---|---|---|---|---|
| **1** | XLSX+Activity → layout header beside Share (cross-tree) | `EstimateSheetContent`, `ProjectChromeAsync`, `WorkshopPageShell`, new store | YES | No | HIGH (hydration parity; `version-control-ui`, `cost-inputs`, `proposal-export-preview`, `project-chrome-streaming`) | **HIGH** |
| **2** | Teamspace → icon-only | `ProjectTeamspaceHeader` | YES (chrome) | No | MED (`teamspace-collaboration-header`) | **MED** |
| **3** | Panel header bottom borders (global) | `tree-panel-header` | YES (11) | No | LOW (no test asserts border) | **MED** (visual ripple to 9 surfaces) |
| **4** | Node icon orange when occupied (direct items) | `EstimateSheetTree` | indirect | YES (excludes sidebar → won't catch) | LOW (`mixed-content` reads sr-only label) | **LOW** |
| **5** | Left add-node orange | `EstimateSheetTree`/constant | YES (constant) | No | LOW (no name selectors) | **LOW-MED** |
| **6** | Middle add-tab orange | `EstimateTabStrip` | YES (constant) | No | LOW | **LOW** |
| **7** | Right: remove header add → new under-tabs row | `component-library/index` | YES (sidebar) | No | MED (`component-library-ui` order + child-count) | **MED** |
| **8** | Source dropdown → boxed variant | `dropdown-select` (16) | YES | No | LOW (combobox role preserved) | **MED if base edited / LOW opt-in** |
| **9** | Middle top padding | `EstimateSheetContent` | No | No | LOW (no spacing test) | **LOW** |
| **10** | Filter & Group functional (wire existing) | `header-icon-toolbar` + 3 panels + reuse popovers/grouping | YES (toolbar) | MED (middle group-by could touch render counts) | MED-HIGH (`header-icon-toolbar-ui`, `cost-inputs`, `estimate-tree-modal`) | **MED-HIGH** |
| **11** | Filter↔Expand separator | `header-icon-toolbar` | YES (12) | No | LOW (add assertion) | **LOW** |
| **12** | Right: Filter/View-by into new row; drop dead Group | `component-library/index` | YES (sidebar) | No | MED (`component-library-ui`) | **MED** |
| **13** | Move New-tab button into middle header (expose `createTab`) | `EstimateTabStrip`, `EstimateSheetContent` | YES (epicenter) | No | MED (`estimate-tabs` e2e, tab-state vitest) | **MED** (tab-strip refactor + epicenter file) |
| **14** | Editable title: no width clip / border / limit | `ProjectEstimateMetadataStrip` | No | No | LOW (no test asserts width) | **LOW** |

**Only Req 4 and the Req 10 middle group-by carry perf considerations.** Req 4 is neutralized by the direct-items decision (O(1)). The middle group-by must not regress the render-count isolation tests (`estimate-sheet-render-relief`) — keep grouping a memoized transform over the active tab's rows, not a per-row subscription.

---

## 3. Test coverage by domain (file → asserts → break risk)

**Perf-guarded (render-count isolation — do not add per-row subscriptions):**
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx` — `rendersOutside(...).toBe(0)`, command-palette `totalTableRenders === 0`. **Watch Req 10-D2** (middle group-by) and Req 4.
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx` — 50/200/500-row profiles; loose. LOW.
- `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` — remote cursors isolated. LOW.
- `tests/vitest/route-transition-peak-load-profile.test.tsx` — "without broad memoization/virtualization"; constrains Req 4 + Req 10-D2 implementation style. LOW for the rest.
> All four run `renderSidebar={false}` → the **left tree is unmounted**; they neither protect nor catch Req 4 / Req 10-D3. New sidebar-mounted guards needed (see `06`).

**Tree / tabs / layout:**
- `estimate-mixed-content.test.tsx:132` — node icon via **sr-only label** (not glyph). Req 4 color change safe **iff label unchanged**. MED.
- `estimate-tree-context-menu.test.tsx`, `estimate-empty-tab-state.test.tsx`, `estimate-tabs-domain.test.ts`, `estimate-bootstrap-ui.test.ts` — LOW; `estimate-bootstrap-ui` requires "shared primitives for creation controls" → keep add buttons on `ToolbarIconButton`.
- `estimate-tree-modal.test.tsx:106` — LEFT toolbar **exact button order includes "Filter tree"/"Group tree"**. Req 10/D8 changes this (left keeps Filter, drops Group) → **update**.

**Library / right sidebar:**
- `component-library-ui.test.tsx` — `:198-212` header button order, `:218-219` sticky-header child count (=2 → keep new row external sibling), `:242-255` click "Add Component", `:1086-1108` source filter combobox + option clicks. Reqs **7, 8, 12** → **update order/child-count; combobox preserved by `DropdownSelect`**.
- `estimate-sheet-library-lazy-load.test.tsx`, `estimate-sheet-library-insert.test.tsx`, `estimate-template-drop-zones.test.tsx` — tab roles + drop flows; keep `tab{Components|Templates}` roles. LOW-MED.
- `ui-dropdown-select.test.tsx` — Req 8 variant must not regress default. LOW.

**Header / toolbar / chrome:**
- `header-icon-toolbar-ui.test.tsx:11-12,25-26,33+` — Filter/Group render by default + fire. Reqs **10/11/D8** → **update** (now handler-gated; add separator assertion).
- `teamspace-collaboration-header.test.tsx:149-156` — presence faces by name + "Manage access" + no settings-gear. Req **2** → **update**.
- `estimate-sheet-cost-inputs.test.tsx` — `:681-689` "Tab tools" scope + "Preview Excel Export" title; `:279-281` click "Activity"; `:687-688` "Filter tab"/"Group tab" present; banner breadcrumbs. Reqs **1, 10** → **update** (button relocation + filter/group rewire; keep `aria-label`s).
- `proposal-export-preview.test.tsx:100-150` — clicks "Preview Excel Export" opener. Req **1** → keep accessible name; update locator scope.
- `project-chrome-streaming.test.ts` — skeleton/chrome `flex items-center gap-1` + node-count parity. Req **1** → **update skeleton in lockstep**.
- `project-publication-header.test.tsx` — shared-link activity dot (reference only; Share untouched). LOW.
- `workshop-reset.test.tsx:179-180`, `tests/unit/reset-baseline.test.ts:34-35` — Filter/Group **absent** on reset surfaces (negative). Confirm unaffected (those surfaces pass no handlers → still absent). LOW.

**e2e (`e2e/`):** `estimate-tabs.spec.ts` (tablist roles), `estimate-tree-dnd.spec.ts` (node locators/toast), `workshop-template-insert-smoke.spec.ts` (`tablist{Library tree views}` + right-click insert), `estimates-crud-latency.spec.ts`, `estimates-shell-streaming.spec.ts`, `route-transition-performance{,-budgets}.spec.ts`, `workshop-library-routes.spec.ts`, `workshop-route-error-boundaries.spec.ts`. All key off roles/test-ids/toasts → resilient to styling, fragile to **role/label** changes. Re-run the template-insert smoke after Req 7/12; watch latency budgets after Req 4/10-D2. **No e2e references Filter/Group/View-by** — add one for the newly-wired controls.

---

## 4. Concurrency / merge-conflict hazards

- **Landing model:** many agents push to `main` concurrently; main worktree usually dirty. **Merge+validate, then `git push origin HEAD:main`. Never `git checkout main` locally.** Copy `.env.local` into any fresh worktree.
- **`EstimateSheetContent.tsx` is the conflict epicenter:** Reqs **1, 9** (+ the header-side plumbing of 10-D2) edit this one ~94KB file → serialize them in one branch.
- **Shared primitives are cross-req conflict points:** Req **3** (`tree-panel-header`), Reqs **10/11** (`header-icon-toolbar`), Req **8** (`dropdown-select`), Reqs **5/6/7** (`toolbar-icon-button` constant). Two agents touching the same primitive will conflict — land each primitive change alone, then fan out.
- **P0–P6 invariants:** `estimate-mixed-content` + `estimate-sheet-version-control-ui` encode unification rules (Area vocab, NodeIcon, mixed content). Rebase before starting; keep them green.
- **Tooling:** use nvm node v25.8.0 for vitest/tsc/next; don't co-run heavy workflows with the full DOM suite (flaky 15s timeouts).

---

## 5. Recommended safe sequencing

### Phase A — shared primitives FIRST (additive; 4 different files → parallelizable; each lands + validates before dependents)
- **A1** `toolbar-icon-button.tsx` `+ ADD_BUTTON_CLASSNAME` (+ DESIGN.md exception). Unblocks Reqs 5/6/7/12 add buttons.
- **A2** `tree-panel-header.tsx` `+ border-b border-hairline` (Req 3). Then eyeball 9 consumers for double-borders.
- **A3** `dropdown-select.tsx` `+ variant="boxed"` (Req 8). Re-run `ui-dropdown-select` + 16-importer spot check.
- **A4** `header-icon-toolbar.tsx` handler-gating + separator (Reqs 10-primitive, 11, D8). Update `header-icon-toolbar-ui.test.tsx`. Unblocks Phase D + Req 12.

### Phase B — per-panel presentational (parallel by file; consume A1/A3/A4)
- **B1** `EstimateSheetTree.tsx`: Req 4 (node icon, direct-items) + Req 5 (add-area orange). Add sidebar perf/correctness guard.
- **B3** `component-library/index.tsx`: Reqs 7 + 12 — top header `showDefaultActions={false}`/`addActions={[]}`/drop `leadingActions`; new under-tabs row (Filter · View-by · Add); Req 8 apply `variant="boxed"` to source dropdown. Update `component-library-ui` tests.
- *(Req 6 / add-tab is no longer a Phase-B task — it relocates into the middle header as part of C3, Req 13.)*

### Phase C — serialize on `EstimateSheetContent.tsx` (conflict epicenter; one branch)
- **C1** Req 1 — cross-tree header relocation (heaviest): new Zustand slice → register page handlers + `canPreviewExport` → render `EstimateHeaderActions` in layout chrome beside Share (route-aware, disabled-state) → update `ProjectHeaderChromeSkeleton` for hydration parity → update `project-chrome-streaming`, `cost-inputs`, `proposal-export-preview` tests. **Preserve `aria-label="Activity"` and "Preview Excel Export".** *(Empties the middle header `addActions` slot for C3.)*
- **C3** Req 13 + Req 6 — relocate the New-tab button into the middle header `addActions` slot freed by C1 (expose `createTab` from `EstimateTabStrip` via ref + state callback; apply `ADD_BUTTON_CLASSNAME`). **Depends on C1; same branch.**
- **C2** Req 9 — `pt-2` on rows scroll container (+ empty-tab state).
- **C4** Req 14 — editable-title input: drop `max-w-[320px]` + border classes, add `field-sizing-content max-w-full`. **Different file (`ProjectEstimateMetadataStrip.tsx`) → parallelizable**, grouped in Phase C as header work.
- **Req 2** (Teamspace icon-only) lives in `ProjectTeamspaceHeader.tsx` → can run **alongside** C (different file), but it's chrome-adjacent to C1, so coordinate to avoid header churn.

### Phase D — Filter/Group functionality (Req 10; depends on A4; per-panel)
- **D1 (right):** mount `ComponentFacetFilterPopover` as the new row's Filter; wire View-by (already working). Extends B3.
- **D2 (middle):** wire imported `groupComponents`/`sortComponents` → `groupBy` state; faceted filter via `filterSlot`. Keep grouping a memoized transform (protect `render-relief`). Touches `EstimateSheetContent.tsx` → **serialize with Phase C**.
- **D3 (left):** structured-filter popover via `filterSlot`; no group. Touches `EstimateSheetTree.tsx` → coordinate with B1.

**Validation gate after every land:** full `vitest` (esp. `header-icon-toolbar-ui`, `component-library-ui`, `estimate-sheet-version-control-ui`, `estimate-mixed-content`, all `perf/`), `tsc`, `lint`; clear the **Codex review gate**; then `git push origin HEAD:main`.

### Dependency graph (compact)
```
A1 ─┬─> B1 ──────> D3
    │
A4 ─┼─> B3 ──────> D1
A3 ─┘
A2 (independent)
C1 ─> C3 ─> C2     (serialize on EstimateSheetContent; C3 needs A1)
C4 ‖ C             (different file; ProjectEstimateMetadataStrip)
D2 ──────────────  (serialize with C; depends on A4)
Req2 ‖ C (parallel, coordinate header churn)
```
