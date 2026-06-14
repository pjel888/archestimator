# Estimate Sheet Page — UX/UI Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement task-by-task. Per `CLAUDE.md`, **delegate execution to Codex** (`/codex:*`) and clear the Codex review gate before declaring a phase complete. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Land the 12 Estimate-Sheet UX/UI requirements safely — presentational consistency (borders, padding, orange add buttons, icon-only teamspace), an honest functional toolbar (wired filter/group, dropped no-ops), a restructured right sidebar, a relocated header action cluster, and an occupied-node icon — without regressing the P0–P6 unification invariants or the render-count perf guards.

**Architecture:** Shared primitives change first (additive), then per-panel work fans out, then the `EstimateSheetContent.tsx` conflict-epicenter reqs serialize in one branch, then filter/group behavior wires onto the refined toolbar. No DB/RPC/schema changes.

**Tech stack:** Next.js App Router + Bun, React, Tailwind v4 (CSS-first `@theme`), Zustand, TanStack Query, Phosphor icons, Vitest + Playwright.

**Read first:** `01-CURRENT-STATE-AUDIT.md` (exact file:line), `02-OWNER-DECISIONS.md` (D1–D8), `03-DESIGN-SYSTEM-CHANGES.md` (exact classes), `04-BLAST-RADIUS-RISK-SEQUENCING.md` (sequencing). `06-TEST-PLAN-AND-VERIFICATION.md` is the verification companion.

**Global conventions for every task:**
- Run impact analysis before editing a shared symbol (`get_impact_radius_tool` / gitnexus), per `CLAUDE.md`.
- Use nvm node v25.8.0 for `vitest`/`tsc`/`lint`. Land via `git push origin HEAD:main`; never `checkout main` locally.
- Preserve accessible names unless a task says otherwise.
- After each task: targeted test → full `vitest` + `tsc` + `lint` → Codex review gate → push.

---

# PHASE A — Shared primitives (additive, land first)

## Task A1 — `ADD_BUTTON_CLASSNAME` constant + DESIGN.md exception (Reqs 5/6/7/12 foundation)

**Files:**
- Modify: `src/components/ui/toolbar-icon-button.tsx` (add export)
- Modify: `DESIGN.md` (named exception)
- Test: `tests/vitest/add-button-style.test.ts` (new, tiny)

- [ ] **Step 1 — Failing test for the constant**
```ts
// tests/vitest/add-button-style.test.ts
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
test("add-button style is the approved orange affordance with explicit cursor", () => {
  expect(ADD_BUTTON_CLASSNAME).toContain("bg-orange-100");
  expect(ADD_BUTTON_CLASSNAME).toContain("text-orange-700");
  expect(ADD_BUTTON_CLASSNAME).toContain("hover:bg-orange-200");
  expect(ADD_BUTTON_CLASSNAME).toContain("hover:text-orange-800");
  expect(ADD_BUTTON_CLASSNAME).toContain("cursor-pointer");
});
```
- [ ] **Step 2 — Run, expect FAIL** (`vitest run tests/vitest/add-button-style.test.ts`) — "ADD_BUTTON_CLASSNAME is not exported".
- [ ] **Step 3 — Add the constant** to `toolbar-icon-button.tsx`:
```ts
export const ADD_BUTTON_CLASSNAME =
  "bg-orange-100 text-orange-700 " +
  "hover:bg-orange-200 hover:text-orange-800 " +
  "focus-visible:bg-orange-200 focus-visible:text-orange-800 " +
  "cursor-pointer";
```
- [ ] **Step 4 — Run, expect PASS.**
- [ ] **Step 5 — Add the DESIGN.md named exception** (paste the block from `02-OWNER-DECISIONS.md` §D1 under the buttons/color-discipline section).
- [ ] **Step 6 — `tsc` + `lint`; commit** `feat(estimate-ui): add ADD_BUTTON_CLASSNAME + DESIGN.md orange exception (Req 5/6/7)`.

## Task A2 — `TreePanelHeader` bottom border (Req 3)

**Files:** Modify `src/components/ui/tree-panel-header.tsx:179`. Test: `tests/vitest/tree-panel-header-border.test.tsx` (new).

- [ ] **Step 1 — Failing test**
```tsx
// renders a minimal TreePanelHeader, asserts the root carries border-b border-hairline
import { render } from "@testing-library/react";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
test("panel header has a consistent bottom border", () => {
  const { container } = render(<TreePanelHeader ariaLabel="x" labelPrefix="x" />);
  const root = container.querySelector('[aria-label="x"]')?.parentElement ?? container.firstElementChild!;
  expect(root.className).toMatch(/border-b/);
  expect(root.className).toMatch(/border-hairline/);
});
```
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Edit line 179:** `cn("sticky top-0 z-20 shrink-0 bg-white", className)` → `cn("sticky top-0 z-20 shrink-0 border-b border-hairline bg-white", className)`.
- [ ] **Step 4 — Run, expect PASS.**
- [ ] **Step 5 — Visual pass** (dev server): check the 3 estimate panels + the 9 other consumers; specifically confirm NO double-border at `TemplateGallery.tsx:241` and `ComponentLibraryManager.tsx:875`. If doubled, remove that consumer's own `border-b`.
- [ ] **Step 6 — Confirm `live-estimate-node-route.test.ts:77,81` still pass** (negative substring assertions near `bg-white`).
- [ ] **Step 7 — Full `vitest` + `tsc` + `lint`; commit** `feat(estimate-ui): consistent panel-header bottom border (Req 3)`.

## Task A3 — `DropdownSelect` boxed variant (Req 8)

**Files:** Modify `src/components/ui/dropdown-select.tsx` (trigger ~`:350-356`). Test: `tests/vitest/ui-dropdown-select.test.tsx` (extend).

- [ ] **Step 1 — Failing test:** add a case rendering `<DropdownSelect variant="boxed" …/>` and assert the trigger has `h-10` + `border border-hairline` and **not** `h-5`; assert default (no variant) still has `h-5`/underline.
- [ ] **Step 2 — Run, expect FAIL** (variant not supported).
- [ ] **Step 3 — Implement** `variant?: "underline" | "boxed"` (default `"underline"`); select trigger classes per `03` Change 3; bump `CaretDown` to `size={12}` for boxed; preserve `role="combobox"`, `role="option"`, keyboard/typeahead, `aria-label`.
- [ ] **Step 4 — Run, expect PASS** (both new + existing default cases).
- [ ] **Step 5 — 16-importer spot check** (charts/settings/teamspace/rows still render underline).
- [ ] **Step 6 — Full `vitest` + `tsc` + `lint`; commit** `feat(ui): DropdownSelect boxed variant (Req 8 foundation)`.

## Task A4 — `HeaderIconToolbar` handler-gating + Filter↔Expand separator (Reqs 10-primitive, 11, D8)

**Files:** Modify `src/components/ui/header-icon-toolbar.tsx:98-109`. Test: `tests/vitest/header-icon-toolbar-ui.test.tsx` (update).

- [ ] **Step 1 — Update the contract tests** to the new behavior (write them failing-first):
  - Filter renders when `onFilter` OR `filterSlot` is provided; absent otherwise.
  - Group renders only when `onGroup` is provided; absent otherwise.
  - When neither is provided, **no Filter/Group cluster and no separator** render.
  - When a cluster renders, a `border-r border-hairline` separator wrapper precedes Expand/Collapse.
  - `showDefaultActions={false}` still hides both (unchanged).
  - `onFilter`/`onGroup` still fire on click when present.
- [ ] **Step 2 — Run, expect FAIL** against current always-render behavior.
- [ ] **Step 3 — Implement** the handler-gated, separator-wrapped block from `03` Change 7 (7a + 7b).
- [ ] **Step 4 — Run, expect PASS.**
- [ ] **Step 5 — Guard the 8 `showDefaultActions={false}` consumers** + `WorkshopCollectionLayout` (supplies handlers → keeps buttons): run their tests.
- [ ] **Step 6 — Full `vitest` + `tsc` + `lint`; commit** `refactor(ui): handler-gate toolbar Filter/Group + add cluster separator (Req 10/11, drop no-ops)`.

> Note: A4 changes what the estimate panels render (they currently pass no handlers → Filter/Group now disappear until Phase D wires them). That is intended (D8). `estimate-sheet-cost-inputs.test.tsx:687-688` and `estimate-tree-modal.test.tsx:106` are updated in Phase D when each panel is wired/finalized; if A4 lands before D, temporarily update those two assertions to expect Filter/Group **absent** (honest interim state), then re-add expectations as panels wire.

---

# PHASE B — Per-panel presentational (parallel by file)

## Task B1 — Left tree: occupied node icon (Req 4) + add-area orange (Req 5)

**Files:** Modify `src/components/workshop/EstimateSheetTree.tsx` (`NodeIcon` `80-82`, `toUiNode` `179`, add-action `1341-1347`). Test: `tests/vitest/estimate-tree-node-icon.test.tsx` (new).

- [ ] **Step 1 — Failing test (occupancy color):** render `EstimateSheetTree` with the sidebar mounted, a tree where Area "Empty" has no `estimateRowItems` and Area "Filled" has one. Assert the "Filled" row's circle icon has `text-orange-600` and "Empty" has `text-tertiary`. Use the render-probe / existing tree test harness.
```tsx
// pseudo: query the row by its sr-only label, find the svg, assert className
expect(filledIcon.className).toMatch(/text-orange-600/);
expect(emptyIcon.className).toMatch(/text-tertiary/);
```
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Implement.** `NodeIcon({ occupied }: { occupied: boolean })` (per `03` Change 5). In `toUiNode` (`:179`): `const occupied = (node.estimateRowItems?.length ?? 0) > 0;` → `icon: <NodeIcon occupied={occupied} />`. (O(1), inside the memoized `buildUiTreeModel`; fold into the icon node — do NOT thread a map.)
- [ ] **Step 4 — Run, expect PASS.** Also run `estimate-mixed-content.test.tsx` (sr-only label unchanged → green).
- [ ] **Step 5 — Render-isolation guard (new):** assert that a search keystroke / selection does NOT re-run occupancy for unrelated rows (model on `setEstimateSheetRenderProbe`). Confirm no extra row renders.
- [ ] **Step 6 — Add-area orange (Req 5):** on the `addActions` entry (`:1341-1347`), set `className: ADD_BUTTON_CLASSNAME`. (Optional: switch the `Circle` add icon to a `Plus`-family icon — flagged, owner-optional.)
- [ ] **Step 7 — Verify live flip:** in the dev app, add a component to an empty area via the right table → confirm the left circle flips grey→orange without refetch (validates `localNodes` sync; if it lags, file a follow-up — see `01 Req4`).
- [ ] **Step 8 — Full `vitest` + `tsc` + `lint`; commit** `feat(estimate-sheet): orange node icon when occupied + orange add-area (Req 4,5)`.

## Task B2 — (moved) Middle add-tab styling + relocation

Req 6 (orange add-tab) is now applied **in the add-tab's new location** as part of Task **C3** (Req 13), because Req 13 relocates the button into the middle header `addActions` slot freed by Req 1. There is no standalone in-place styling step — see **Task C3**. (If C3 slips, a fallback is to apply `ADD_BUTTON_CLASSNAME` to the existing `EstimateTabStrip.tsx:596-606` button in place; but the relocation is the requirement.)

## Task B3 — Right sidebar: restructure + new under-tabs row + boxed dropdown (Reqs 7, 8-apply, 12)

**Files:** Modify `src/components/workshop/component-library/index.tsx` (header `1972-2021`, add-actions `1995-2006`, leadingActions `1985-1993`, source dropdown `1259-1276`, scroll container `2024`). Test: `tests/vitest/component-library-ui.test.tsx` (update).

- [ ] **Step 1 — Update tests first (failing):** rewrite `:199-212` to expect the **top** header to contain only search/Expand/Collapse (no Filter/Group/View-by/Add); keep `:218-219` child-count = 2; add assertions that a new row (e.g. `aria-label="Library tools"`) contains a Filter button, a View-by button, and a tab-conditional Add button; assert **no** "Group library tree" button exists. Update `:1086-1108` to expect the source dropdown `variant="boxed"` (combobox role preserved).
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Top header:** on the `TreePanelHeader` call, pass `showDefaultActions={false}`, `addActions={[]}`, and remove the `leadingActions` "View by:" prop.
- [ ] **Step 4 — New row (external sibling after `</TreePanelHeader>` @ `:2021`, before scroll container @ `:2024`):**
```tsx
<div className="flex h-[38px] min-h-[38px] items-center gap-1 border-b border-hairline bg-white px-2 py-0" aria-label="Library tools">
  {/* Filter — wired in Phase D1; placeholder trigger now */}
  <ToolbarIconButton label="Filter library" onClick={/* D1: open ComponentFacetFilterPopover */ undefined} aria-pressed={false}>
    <FunnelSimple size={13} weight="regular" aria-hidden="true" />
  </ToolbarIconButton>
  {/* View-by — relocated existing control */}
  <ToolbarIconButton label="View by" onClick={() => setViewModeMenuOpen(true)} aria-expanded={viewModeMenuOpen} disabled={activeTab !== "components"} aria-controls="component-view-controls">
    <Rows size={13} weight="regular" aria-hidden="true" />
  </ToolbarIconButton>
  <div className="ml-auto flex items-center gap-1">
    {activeTab === "components" ? (
      <ToolbarIconButton label="Add Component" onClick={startNewComponent} className={ADD_BUTTON_CLASSNAME}>
        <PlusSquare size={13} weight="regular" aria-hidden="true" />
      </ToolbarIconButton>
    ) : (
      <ToolbarIconButton label="Add Template" onClick={startNewTemplate} className={ADD_BUTTON_CLASSNAME}>
        <StackPlus size={13} weight="regular" aria-hidden="true" />
      </ToolbarIconButton>
    )}
  </div>
</div>
```
  (Keep the existing `ComponentViewControls` popover wiring — only its trigger moved. Re-anchor `aria-controls`/`viewModeMenuOpen` to the new trigger.)
- [ ] **Step 5 — Source dropdown boxed (Req 8 apply):** add `variant="boxed"` to the `DropdownSelect` at `:1265-1273`; keep `className="w-full"` + `aria-label="Reusable source filter"`.
- [ ] **Step 6 — Run, expect PASS** (updated tests). Re-run `estimate-sheet-library-lazy-load`/`-insert` (tab roles intact).
- [ ] **Step 7 — e2e smoke:** `workshop-template-insert-smoke.spec.ts` — confirm `tablist{Library tree views}` + right-click insert still work.
- [ ] **Step 8 — Full `vitest` + `tsc` + `lint`; commit** `feat(library-sidebar): under-tabs toolbar row (Filter/View-by/Add) + boxed source select (Req 7,8,12)`.

---

# PHASE C — Serialize on `EstimateSheetContent.tsx` (one branch)

## Task C1 — Relocate XLSX + Activity to the layout header beside Share (Req 1)

**Files:**
- Create: `src/components/workshop/use-estimate-header-actions-store.ts` (Zustand slice)
- Create: `src/components/workshop/EstimateHeaderActions.tsx` (the two buttons, route-aware)
- Modify: `src/components/workshop/EstimateSheetContent.tsx` (register handlers/capability; remove the two `addActions` at `510-529`)
- Modify: `src/components/workshop/ProjectChromeAsync.tsx` (render `EstimateHeaderActions` beside Share) + `ProjectHeaderChromeSkeleton` (`81-88`, node parity)
- Tests: `project-chrome-streaming.test.ts`, `estimate-sheet-cost-inputs.test.tsx`, `proposal-export-preview.test.tsx`, new `estimate-header-actions.test.tsx`

- [ ] **Step 1 — Store (failing test first):** test that `useEstimateHeaderActionsStore` exposes `{ openActivity, openProposalPreview, canPreviewExport, isEstimateRoute, register(), clear() }` and that `register` sets handlers + capability and `clear` resets to safe defaults (closed/disabled).
- [ ] **Step 2 — Implement the slice.** Shape:
```ts
type EstimateHeaderActions = {
  openActivity: (() => void) | null;
  openProposalPreview: (() => void) | null;
  canPreviewExport: boolean;
  register: (a: { openActivity: () => void; openProposalPreview: () => void; canPreviewExport: boolean }) => void;
  clear: () => void;
};
```
- [ ] **Step 3 — Page registers** in `EstimateSheetContent`: a `useEffect` calls `register({ openActivity: openActivityHistory, openProposalPreview, canPreviewExport: canPreviewCurrentExport })` (keep the existing handlers at `1136/1245/1891/1986/1988`); `clear()` on unmount. **Remove** the two `addActions` entries at `510-529` (dialogs `ActivityHistoryModal` `1918` / `ProposalExportPreviewDialog` `1903` stay in the page).
- [ ] **Step 4 — `EstimateHeaderActions` component (failing test first):** renders two `size-10` plain buttons styled exactly like Share (`03`/`01 Req1` style string), `FileXls`/`ClockCounterClockwise`, `aria-label`/`title` = **"Preview Excel Export"** / **"Activity"** (preserve names); Excel button `disabled={!canPreviewExport}`; both call the store handlers; renders nothing when handlers are null (off-route). Subscribe to the store; gate on `usePathname`/`routeToActiveSurface` for estimate routes (precedent in `ProjectChromeAsync`).
- [ ] **Step 5 — Mount beside Share** in `ProjectChromeAsync` (the `flex items-center gap-1` row `51-69`), after the Share/Teamspace controls.
- [ ] **Step 6 — Hydration parity:** update `ProjectHeaderChromeSkeleton` (`81-88`) so the fallback's top-level node count matches the resolved chrome **including** the two new buttons (two more `Skeleton size-10`, shown only on estimate routes to match). Update `project-chrome-streaming.test.ts` in lockstep.
- [ ] **Step 7 — Update tests:** `estimate-sheet-cost-inputs.test.tsx:681-689,279-281` (buttons no longer in "Tab tools"; now in the chrome `banner`) and `proposal-export-preview.test.tsx:100-150` (opener locator → chrome). Keep accessible names.
- [ ] **Step 8 — Full `vitest` + `tsc` + `lint`; manual smoke** (open Activity + Preview Excel from the new header location; verify disabled state when no export metadata; verify off-estimate routes don't show them; verify no hydration warning in console). **Codex review gate** (HIGH-risk task). Commit `feat(estimate-sheet): relocate XLSX + Activity to project header beside Share (Req 1)`.

## Task C2 — Middle panel top padding (Req 9)

**Files:** Modify `src/components/workshop/EstimateSheetContent.tsx:2020` (and empty-tab `:2074`).

- [ ] **Step 1 — Implement:** `:2020` → add `pt-2` (keep `px-2` + conditional `pb-*`): `cn("relative min-h-0 flex-1 overflow-auto px-2 pt-2", bulkSelectedRowCount > 0 ? "pb-16" : "pb-2")`. Add `pt-2` to the empty-tab scroll container `:2074`.
- [ ] **Step 2 — Verify (dev app):** rows now have an 8px top gap below the tab strip border; sticky node/column headers pin 8px lower (correct); no double-gap.
- [ ] **Step 3 — Full `vitest` + `tsc` + `lint`; commit** `fix(estimate-sheet): add top padding so rows aren't flush with tabs (Req 9)`.

## Task C3 — Relocate the "New tab" button into the middle header (Req 13 + Req 6 styling)  *(depends on C1)*

**Files:**
- Modify: `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx` (expose `createTab` via ref; remove `createButton` `596-606`)
- Modify: `src/components/workshop/EstimateSheetContent.tsx` (render add-tab in the middle header `addActions` `499-530`; hold the ref)
- Test: `tests/vitest/estimate-tabs-domain.test.ts` / `estimate-empty-tab-state.test.tsx` (update locations), e2e `estimate-tabs.spec.ts`

- [ ] **Step 1 — Failing test:** assert the "New tab" button renders in the middle panel header (within the `addActions`/"Tab tools" region), not inside the tab strip; assert clicking it creates a tab; assert it's hidden/disabled for non-editors (`canCreateTabs` false).
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Expose the action.** Wrap `EstimateTabStrip` in `forwardRef`; `useImperativeHandle(ref, () => ({ createTab }))`. Add a callback prop `onCreateTabStateChange?(state: { canCreate: boolean; pending: boolean })` fired whenever `lifecycleActionsReady && canCreateTabs` or `pendingAction` changes (so the header button reflects `disabled`/visibility — refs don't re-render). **Remove** the in-strip `createButton` (`596-606`) and its `endAction` usage (verify `Tabs` tolerates an empty end-action).
- [ ] **Step 4 — Render in the header.** In `EstimateSheetContent`, hold `const tabStripRef = useRef<…>(null)` and local `{ canCreate, pending }` state set by `onCreateTabStateChange`. In the middle header `addActions` (the slot freed by C1, where Preview-Excel was), add:
```tsx
{
  label: "New tab",
  icon: <Plus size={13} weight="regular" aria-hidden="true" />,
  onClick: () => void tabStripRef.current?.createTab(),
  disabled: !canCreate || pending,
  className: ADD_BUTTON_CLASSNAME,   // Req 6 orange treatment, applied here
}
```
- [ ] **Step 5 — Run, expect PASS.** Preserve the **"New tab"** accessible name. Confirm viewer-gating still hides it.
- [ ] **Step 6 — e2e:** `estimate-tabs.spec.ts` — create-tab flow still works from the new location.
- [ ] **Step 7 — Full `vitest` + `tsc` + `lint`; commit** `feat(estimate-sheet): relocate New-tab button to middle header + orange (Req 6,13)`.

> **Coordination:** C3 edits the same `addActions` block as C1 (Req 1). Do C1 first (it empties the block), then C3 (it refills it with the add-tab button). Land in the same Phase-C branch.

## Task C4 — Editable title: no width clip / no border / no limit (Req 14)  *(parallel; isolated file)*

**Files:** Modify `src/components/workshop/ProjectEstimateMetadataStrip.tsx:197-198`.

- [ ] **Step 1 — Failing test (optional):** render the strip with a very long name; assert the input className does **not** contain `max-w-[320px]` and does **not** contain `hover:border-hairline`/`focus:border-accent`; assert `field-sizing-content` (or the chosen auto-size) is present; assert no `maxLength` attribute.
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Edit the className (`:197`):**
  - remove `max-w-[320px]`; add `field-sizing-content max-w-full`.
  - remove `border border-transparent hover:border-hairline focus:border-accent` (keep `focus:bg-accentSoft` as the edit affordance).
  - net: `h-7 min-w-0 max-w-full field-sizing-content rounded-xs bg-transparent px-2 text-center !text-[10px] font-medium leading-none text-ink outline-none transition placeholder:text-tertiary focus:bg-accentSoft disabled:opacity-60`.
  - error state (`:198`): change to `bg-dangerSoft/40` only (drop `border-danger`) — *owner-optional; flag in PR*.
- [ ] **Step 4 — Run, expect PASS.** Verify rename save/validation (`handleBlur`/`handleKeyDown`/empty-required) untouched.
- [ ] **Step 5 — Verify (dev app):** type a long estimate name → field grows to content, no clip, no border; in Safari/Firefox confirm the full name remains editable (horizontal scroll within the input).
- [ ] **Step 6 — `vitest` + `tsc` + `lint`; commit** `fix(estimate-sheet): editable title grows with content, no border/clip (Req 14)`.

## Task C-Teamspace — Teamspace icon-only (Req 2)  *(parallel to C; different file)*

**Files:** Modify `src/components/workshop/ProjectTeamspaceHeader.tsx:533-624`. Test: `tests/vitest/teamspace-collaboration-header.test.tsx` (update).

- [ ] **Step 1 — Update tests first (failing):** expect a single icon-only "Teamspace" button (no presence faces, no "Manage access" text); assert clicking it opens the Share modal; keep the no-settings-gear assertion.
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Implement:** replace the face cluster + overflow + "Manage access" gear (`536-619`) with one `size-10` plain button (Share-button style), `UsersThree` icon (already imported `:21`), `onClick={openManageAccess}`, `aria-label="Teamspace" title="Teamspace"`. **Keep** `useProjectCollaborationQuery`/`useProjectPresence` (still feed `ShareModal` roster + cursors); optionally drop the now-unused `maxFaces` responsive effect.
- [ ] **Step 4 — Run, expect PASS;** verify the ShareModal still lists the roster + online dots, and `ProjectCursorLayer` identity still resolves.
- [ ] **Step 5 — `vitest` + `tsc` + `lint`; commit** `feat(teamspace): icon-only header button (Req 2)`.

---

# PHASE D — Filter / Group functionality (Req 10; depends on A4)

## Task D1 — Right: facet filter popover + View-by grouping (in the new row)

**Files:** Modify `src/components/workshop/component-library/index.tsx` (the new row from B3). Reuse `src/components/workshop/library/component-facet-filter.tsx`.

- [ ] **Step 1 — Failing test:** clicking the new-row Filter opens `ComponentFacetFilterPopover`; selecting a facet narrows the visible component list; the trigger shows `aria-pressed`/active-count; "Reset" clears.
- [ ] **Step 2 — Run, expect FAIL** (placeholder onClick from B3).
- [ ] **Step 3 — Implement:** wire the Filter trigger to mount/open `ComponentFacetFilterPopover` (mirror `ComponentLibraryManager.tsx:888-894`), feeding the existing component facet state; ensure View-by remains the grouping (already functional). Filter applies to the components tab; decide templates-tab filter scope (templates may have a narrower facet set — scope to what exists, log what's omitted).
- [ ] **Step 4 — Run, expect PASS.**
- [ ] **Step 5 — `vitest` + `tsc` + `lint`; commit** `feat(library-sidebar): wire facet filter + View-by grouping (Req 10 right)`.

## Task D2 — Middle: real group-by + faceted filter  *(serialize with Phase C)*

**Files:** Modify `src/components/workshop/EstimateSheetContent.tsx` (header `499`, rows render). Reuse the **already-imported** `groupComponents`/`sortComponents` (`:110,:117`).

- [ ] **Step 1 — Failing test:** with `onGroup` selecting "by category", assert rows render bucketed by category; with a filter facet, assert non-matching rows hidden; assert the Group/Filter buttons now render (handler-gated A4) on the middle header.
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Implement:** add `groupBy`/`sortMode`/`filter` state; pass `onGroup` (opens a group-by menu: category/supplier/area) and a `filterSlot` (faceted popover over `EstimateRowItem` fields) to the middle `TreePanelHeader`. Apply `groupComponents`/`sortComponents` as a **memoized transform** over the active tab's rows (do NOT subscribe per-row — protect `estimate-sheet-render-relief`).
- [ ] **Step 4 — Run, expect PASS;** then run all `perf/` tests — confirm `rendersOutside === 0` and command-palette `totalTableRenders === 0` hold.
- [ ] **Step 5 — Update `estimate-sheet-cost-inputs.test.tsx`** (Filter/Group now functional on the middle header) and **`estimate-tree-modal.test.tsx:106`** if it covers the middle order.
- [ ] **Step 6 — Full `vitest` + `tsc` + `lint`; Codex review gate; commit** `feat(estimate-sheet): real group-by + faceted filter on the sheet (Req 10 middle)`.

## Task D3 — Left: structured filter (no group)  *(coordinate with B1)*

**Files:** Modify `src/components/workshop/EstimateSheetTree.tsx` (header `1331`).

- [ ] **Step 1 — Failing test:** with the left Filter set to "hide empty areas", assert areas with no `estimateRowItems` (and no occupied descendants) are hidden; assert **no** "Group tree" button renders (handler-gated, no `onGroup`).
- [ ] **Step 2 — Run, expect FAIL.**
- [ ] **Step 3 — Implement:** add `treeFilter` state + predicate over `localNodes` (hide-empty / has-value / by kind), applied in parallel to the existing `treeSearchQuery` pruning. Pass it via `filterSlot` (a small popover); pass **no `onGroup`**. Update `estimate-tree-modal.test.tsx:106` (left toolbar now: Filter present, Group absent).
- [ ] **Step 4 — Run, expect PASS.**
- [ ] **Step 5 — `vitest` + `tsc` + `lint`; commit** `feat(estimate-sheet): structured left-tree filter, drop tree group-by (Req 10 left)`.

---

## Self-review (run against the spec before executing)

- **Spec coverage:** Req 1→C1 · 2→C-Teamspace · 3→A2 · 4→B1 · 5→B1 · 6→C3 · 7→B3 · 8→A3+B3 · 9→C2 · 10→A4+D1/D2/D3 · 11→A4 · 12→B3 · 13→C3 · 14→C4. ✅ all 14 mapped.
- **Type consistency:** `ADD_BUTTON_CLASSNAME` (A1) reused verbatim in B1/B2/B3. `variant="boxed"` (A3) consumed in B3. Store shape (C1) consumed by `EstimateHeaderActions`. ✅
- **No placeholders:** every styling step carries exact classes; every behavioral step names the existing function to reuse. The one deliberate placeholder is B3-Step-4's Filter `onClick` (wired in D1) — explicitly noted.
- **Accessible names preserved:** "Activity", "Preview Excel Export" (C1); "New tab" (B2); tab roles (B3); combobox (A3/B3). ✅
- **Perf guards:** B1 (direct-items O(1) + new sidebar guard), D2 (memoized transform, re-run `perf/`). ✅
