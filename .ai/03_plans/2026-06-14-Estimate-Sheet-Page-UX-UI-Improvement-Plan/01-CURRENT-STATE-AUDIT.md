# Current-State Audit — Estimate Sheet Page

Consolidated from 8 parallel read-only audits (2026-06-14, graph fresh @ 12:28). Every claim below carries an exact `file:line`. This is the ground truth the implementation plan (`05`) builds on.

---

## Req 1 — Preview-XLSX + Activity buttons → upper header beside Share

### The core architectural finding
There are **two separate headers in two separate React trees**:

- **"Upper header"** the requirement refers to = the `WorkshopPageShell` **`actions` slot** — `src/components/workshop/WorkshopPageShell.tsx:96-97` (`<div className="flex h-10 ... gap-1">{actions}`).
  - Populated by the project layout: `src/app/workshop/projects/[projectId]/layout.tsx:41-45` (`actions={<Suspense><ProjectChromeAsync/></Suspense>}`).
  - The chrome row (`flex items-center gap-1`): `src/components/workshop/ProjectChromeAsync.tsx:51-69`.
  - **Share button** (style to match): `src/components/workshop/ProjectPublicationHeader.tsx:542-566`.
  - **Teamspace control**: `src/components/workshop/ProjectTeamspaceHeader.tsx:533-624`.
- **Page body header** where XLSX/Activity live **today** = the per-tab `TreePanelHeader` `addActions` inside `EstimateSheetContent` — `src/components/workshop/EstimateSheetContent.tsx:510-529`.

The two are siblings (layout vs route child), share no props → a literal relocation crosses the boundary.

### The Share button style (the pattern to match)
`ProjectPublicationHeader.tsx:542-558`:
```
relative grid size-10 shrink-0 place-items-center rounded-xs border border-hairline
bg-white text-tertiary transition hover:bg-surfaceMuted hover:text-ink
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus
```
Plain `<button>` (NOT the `Button` component), `size-10`, Phosphor icon `size={14} weight="regular"`, `title` + `aria-label`. The Suspense skeleton mirrors this as `Skeleton size-10` (`ProjectChromeAsync.tsx:84-85`).

> Note: today's XLSX/Activity buttons use a **different** style — tiny `size={12}` icons in the `HeaderIconToolbar` (`h-[38px]` row) with colored hover tints (`hover:bg-emerald-50` / `hover:bg-orange-50`). Relocating = re-render them as `size-10` plain buttons matching Share.

### XLSX + Activity triggers today (wiring that must survive a move)
`EstimateSheetContent.tsx:510-529`:
- **Activity** (`512-521`): label `"Activity"`, `ClockCounterClockwise` icon, `onClick → onOpenSheetActivity → openActivityHistory` (`1136`, `1988`) → `ActivityHistoryModal` (`1918`). Passes opener `HTMLElement` for focus return; depends on `EstimateActivityScope`.
- **Preview Excel Export** (`522-528`): label `"Preview Excel Export"`, `FileXls` icon, `disabled: !canPreviewProposalExport`, `onClick → onPreviewProposalExport → openProposalPreview` (`1245`, `1986`) → `ProposalExportPreviewDialog` (`1903`). `canPreviewProposalExport = canPreviewCurrentExport = Boolean(resolvedProposalExportMetadata)` (`1891`).
- Page-local state the dialogs depend on: `isProposalPreviewOpen`, `proposalPreviewScope/Model/Signature` (`836-839`), `buildProposalPreview/openProposalPreview/refreshProposalPreview` (`1220-1260`), `proposalExportSettings`, `estimateTree`, `editableRows`, `resolvedProposalExportMetadata`, and `ActivityHistoryModal` scope/pagination — **all inside the page component**.

### Hydration-parity invariant (must respect)
`ProjectChromeAsync.tsx:43-50` and `72-80` document a load-bearing rule: the Suspense fallback (`ProjectHeaderChromeSkeleton`, `81-88`) and the resolved chrome must have **identical top-level node counts**, or React throws a hydration mismatch that shifts the notification/settings siblings. Adding buttons here requires updating the skeleton in lockstep. Guarded by `tests/vitest/project-chrome-streaming.test.ts`.

### Icons available (Phosphor `@phosphor-icons/react/dist/ssr`)
Teamspace = `UsersThree` (already imported, `ProjectTeamspaceHeader.tsx:21`); XLSX = `FileXls` (already used); Activity = `ClockCounterClockwise` (already used).

---

## Req 2 — Teamspace → icon-only button

`ProjectTeamspaceHeader.tsx:533-624` renders **three things**, not one button:
1. Presence **face cluster** — `shownFaces.map(...)` of `<button><CollaboratorAvatar></button>` (`542-566`).
2. Optional **`+N` overflow** roster popover (`568-600`).
3. **"Manage access"** button (`Gear` icon + `hidden lg:inline` text, `603-619`, `data-teamspace-manage-access`, opens `ShareModal`).

`openManageAccess` is at `511-518`; `ShareModal` (titled "Share") at `626-685` / `880`.

**Dependencies that must stay even when faces are removed:** `useProjectCollaborationQuery` + `useProjectPresence` (`191-233`) feed `shownFaces`, `onlineUserIds`, roster, responsive `maxFaces` (`236-250`), aria-live join/leave announcements (`253-272`). These still power the `ShareModal` roster, online dots, and `ProjectCursorLayer` identity → **keep the hooks, only stop rendering the faces/text in the header**.

---

## Req 3 — Panel header bottom borders + border-color consistency

### Root cause
`TreePanelHeader` root (`src/components/ui/tree-panel-header.tsx:179`) is:
```
cn("sticky top-0 z-20 shrink-0 bg-white", className)
```
**No `border-b`.** None of the three estimate panels adds one either:

| Panel | Header render site | Wrapper border |
|---|---|---|
| Left (tree) | `EstimateSheetTree.tsx:1331` | wrapper `border-r border-hairline` (right only) |
| Middle | `EstimateSheetContent.tsx:499` (`className="static z-auto bg-transparent"`) inside `<header>` @ `498` | outer header `sticky ... backdrop-blur`, no border |
| Right (library) | `component-library/index.tsx:1972` | `<aside>` @ `1970` `border-l border-hairline` (left only) |

So this is a **missing-element** problem, not divergent classes. The `<aside border-l>` at `EstimateSheetContent.tsx:2141` is the loading/error fallback, not the live panel.

### Border-color reality (already consistent)
- Canonical neutral border = **`#F2F2F2` = `border-hairline`** (`src/app/globals.css:18-19,43,58-59`; `DESIGN.md:11-12,342`). 628 uses.
- `border-divider` is an **identical-hex alias** (`#F2F2F2`, 21 uses) — cosmetic duplication only.
- **No `border-border` / `border-gray-*` exists** (0 occurrences) — there is no real color drift to reconcile.
- Semantic borders that must NOT be converged: `border-accent` (editing/focus), `border-danger`/`border-dangerSoft` (validation), `border-transparent` (inactive tab).

### Blast radius
`TreePanelHeader` has **11 render-site consumers** (graph: HIGH risk, ~482 nodes within 2 hops, but mostly transitive type reach). Out-of-scope surfaces that will also gain the border: `ProjectEstimatesClient.tsx:118`, `WorkshopCollectionLayout.tsx:53`, `ComponentLibraryManager.tsx:876`, `LibraryFolderTree.tsx:1099`, `TemplateEditorClient.tsx:241`, `TemplateEditorSheet.tsx:562`, `TemplateGallery.tsx:218`, `TemplatesBrowseManager.tsx:431`, plus Storybook `tree-panel-header.stories.tsx`. **Verify double-border** on consumers whose header already abuts a bordered region: `TemplateGallery.tsx:241`, `ComponentLibraryManager.tsx:875`.

---

## Req 4 — Left node circle icon: orange when occupied

### Current rendering
`src/components/workshop/EstimateSheetTree.tsx:80-82`:
```tsx
function NodeIcon() {
  return <Circle size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}
```
Phosphor `Circle weight="regular"` is **already an outline** (not filled). The requirement is a **pure color swap** — no SVG change. Consumed at `EstimateSheetTree.tsx:179` (`icon: <NodeIcon />` baked into every `UiTreeNode` in `toUiNode`). The shared `Tree` primitive renders whatever `icon` each node carries (`src/components/ui/tree.tsx:483-485`).

### Data model
`src/lib/estimates/types.ts:138-145`:
```ts
export type EstimateTreeNode = {
  id: string; name: string; kind: "group" | "area";
  total: string; children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];   // ← "components" live here
};
```
**Owner decision = direct items only:** occupied ⇔ `(node.estimateRowItems?.length ?? 0) > 0`. **O(1) per node, no perf risk.** Data is already present client-side (`localNodes`); no extra fetch.

### Where the boolean is computed
Inside the existing memoized transform `buildUiTreeModel` → `toUiNode` (`EstimateSheetTree.tsx:165-186`), already wrapped in `useMemo(..., [displayedNodes])` (`294`). Fold the boolean into the per-node `icon` node so `DefaultTreeRow = memo(...)` (`tree.tsx:354`) re-render triggers are unchanged. **Do NOT thread a separate map through `Tree`** (would defeat row memo).

### Update triggers (orange flips automatically)
All mutations funnel through `setLocalNodes` → `displayedNodes` memo → `buildUiTreeModel`: insert (`663`), delete (`728,928,949`), move/reorder (`562,862,1028,1050`), external drop (`615`), and row item add/remove via `estimate-row-tree-patch.ts:56-69`. **One correctness check to validate:** confirm right-table component adds/removes propagate into the left tree's `localNodes` (not just table state), else the orange flip lags until refetch.

### Perf guards & gap
`tests/vitest/perf/estimate-sheet-render-{baseline,relief}.test.tsx` and `estimate-sheet-cursor-isolation.test.tsx` all run with **`renderSidebar={false}`** — the left tree is **not mounted**, so they neither protect nor regress this. **A new sidebar-mounted test is needed** (grey↔orange correctness + no extra row re-renders). Render-probe pattern: `setEstimateSheetRenderProbe`.

### Accessibility note
Icon is `aria-hidden`. Orange-vs-grey is color-only → invisible to screen readers / colorblind users. `estimate-mixed-content.test.tsx:132` reads the **sr-only label** (`/Building A, area/`), not the glyph, so a color change is safe — but **do not change the sr-only label**. Optional follow-up: convey occupancy non-visually.

---

## Req 5/6/7 — "Add" button design treatment (all panels)

Five add affordances across **three render paths**:

| # | Button | file:line | Path | Icon | Today |
|---|---|---|---|---|---|
| 1 | Add Area (left) | `EstimateSheetTree.tsx:1341-1347` (icon `84-86`) | `TreePanelHeader addActions` | `Circle size13` | grey default |
| 2 | Add tab (middle) | `EstimateTabStrip.tsx:596-606` | raw `ToolbarIconButton` (`endAction`) | `Plus size12` | grey, `mb-0.5` |
| 3 | Add Component (right) | `component-library/index.tsx:1995-2000` | `TreePanelHeader addActions` | `PlusSquare size13` | grey default |
| 4 | Add Template (right) | `component-library/index.tsx:2001-2005` | `TreePanelHeader addActions` | `StackPlus size13` | grey default |
| 5 | Add row (in-sheet) | `drop-zones.tsx:36-51` (`QuietAddRowButton`) | raw `<button>` + visible label | `Plus size11` | deliberately "quiet" |

- The header path resolves to `HeaderIconToolbar` (`header-icon-toolbar.tsx:143-167`) → `ToolbarIconButton` → base `Button variant="ghost" size="icon-sm"`; labels starting with "add" render **icon-only** (`145-146`). Passing a `className` overrides the default grey class (`?? `) — intended.
- **No tests select these by accessible name** (rg for "Add Area"/"Add Component"/"Add Template"/"Add row"/"New tab" → 0 matches). Restyle is safe as long as accessible names are preserved.
- **cursor-pointer must be explicit** — Tailwind v4 (`tailwindcss ^4.3.0`) drops the v3 preflight pointer-on-button; base `Button` sets no cursor.
- Icons are inconsistent (Circle/Plus/PlusSquare/StackPlus); "Add Area" using `Circle` reads poorly as an add affordance.
- `QuietAddRowButton` (#5) is intentionally low-emphasis inside data rows → **out of scope** for orange (owner can override).

Color: see `02`/`03` — **approved Tailwind orange scale** `bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800 cursor-pointer` (precedent `projects-page-client.tsx:371`).

---

## Req 7 (structure) + Req 8 — Right sidebar restructure + source dropdown

### Right sidebar layout today (`component-library/index.tsx`, base fn `L756`, memo `L2376`, rendered by `EstimateSheetContent.tsx:2109-2129`)
```
ResizableSidePanel side=right                         :1966
└ <aside> flex-col border-l                            :1970
  ├ TreePanelHeader (sticky)                           :1972-2021
  │  ├ HeaderIconToolbar  h-[38px]                      header-icon-toolbar.tsx:73
  │  │  ├ search · Filter · Group · Expand · Collapse
  │  │  ├ leadingActions "View by:…"                    :1985-1994
  │  │  └ addActions (ml-auto): Add Component/Template  :1996-2005  ◀ REMOVE
  │  ├ Tabs variant=underline  min-h-10 (40px)          tabs.tsx:150 / tree-panel-header.tsx:224-238
  │  │  └ "Components" | "Templates"                    :127-130 (LIBRARY_TREE_TABS)
  │  └ children: ComponentViewControls popover          :2013-2020
  │  ◀── NEW toolbar row (Req 7) goes here, under tabs
  └ scroll container  flex-1                            :2024-2098
     └ div p-2                                          :2026
        ├ templates tab: {templatesSourceFilterControls}  :2030  ◀ SOURCE DROPDOWN (def :1259-1276)
        │  └ <TemplatesTree>                            :2033-2068
        └ components tab: <LibraryTree>                 :2071-2095
```

### Add buttons to relocate
`index.tsx:1995-2006` — "Add Component" (`PlusSquare`, `onClick startNewComponent` @ `1464`), "Add Template" (`StackPlus`, `onClick startNewTemplate` @ `1468`). Both handlers are stable `useCallback`s in the same component → **no prop rewiring** to relocate, just move the JSX and key off `activeTab`.

### Tabs (the height target)
`Tabs` from `src/components/ui/tabs.tsx` `variant="underline"`, each tab `min-h-10` (**40px**, `tabs.tsx:150`), active underline `border-b-2 border-brand-orange` (`153-155`), wrapper `px-2`.

### Header-icon-div pattern (the new row must match)
`HeaderIconToolbar` row container (`header-icon-toolbar.tsx:73`): `flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0`. Icon buttons = `ToolbarIconButton` `size-6 rounded-xs p-0 text-tertiary`.

> **Height tension to confirm:** Req 7 says the new row matches the **38px** header-icon divs; Req 8 says the dropdown matches the **40px** tabs. Two different targets — plan treats them as such (new row 38px, dropdown 40px).

### Source dropdown today
Already uses the **shared `DropdownSelect`** (`src/components/ui/dropdown-select.tsx`), rendered in memoized `templatesSourceFilterControls` (`index.tsx:1259-1276`):
- Options `TEMPLATE_SOURCE_FILTER_OPTIONS` (`195-199`): `all`→"All sources", `custom`→"Custom templates", `projects`→"Project sources".
- State `templateSourceFilter` (`useState` @ `820`), handler `handleTemplateSourceFilterChange` (`1255-1258`) — also clears bulk selection + project-source preview. Drives `visibleTemplateList` (`1159-1160`), `visibleTemplateProjectSources` (`1163-1164`), query gate (`940`).
- **Why it looks bad:** trigger style (`dropdown-select.tsx:350-356`) is underline/borderless — `h-5` (20px), `border-0 border-b border-hairline`, `bg-transparent`, `!text-[9px] leading-3`, `CaretDown size={8}`. Reads as tiny inline text, not a select box; 20px vs the 40px tabs above it.
- **`DropdownSelect` is shared by ~16 consumers** (estimate rows, charts, settings, teamspace, beta feedback, etc.) → **do not rebase the base trigger.** Add an opt-in `variant`/`size`.

### Tests that break / must update
- `tests/vitest/component-library-ui.test.tsx`: `L198` (`Add Component` title), **`L199-212` hard-codes the exact header button order** ending `…, "Add Component", "Add Template"` → must rewrite; `L218-219` asserts the sticky header has **exactly 2 children** → keep the new row an **external sibling** to preserve count=2; `L242-255` clicks "Add Component" (still valid if the name survives in the new row); `L1086-1108` source filter via `role="combobox"` + option clicks → preserved by `DropdownSelect`.
- `tests/vitest/ui-dropdown-select.test.tsx` — new variant must not regress.
- e2e `workshop-template-insert-smoke.spec.ts` (`tablist{name:"Library tree views"}`) — verify tabs survive the new row.

### Conflict check
Templates-Panel-Followups plan (`.ai/03_plans/000-Follow Ups/2026-06-14-Templates-Panel-Followups/`) is deferred **perf/correctness** work (PERF-1, INS-3, RS-*) — **no overlap** with toolbar/tabs/dropdown UI. Same file (`index.tsx`) → line-churn merge risk only, no semantic collision.

---

## Req 9 — Middle panel top padding

- Center column `<section id="estimate-sheet-center-column">` (`EstimateSheetContent.tsx:1977-1982`) — `flex min-h-0 flex-1 flex-col overflow-hidden bg-white`, **no padding of its own** (vertical flex stacking header + tab strip + rows).
- **The bug:** rows scroll container (`EstimateSheetContent.tsx:2019-2022`):
  ```jsx
  <div className={cn("relative min-h-0 flex-1 overflow-auto px-2", bulkSelectedRowCount > 0 ? "pb-16" : "pb-2")} data-estimate-pointer-surface>
  ```
  `px-2` = left+right only; `pb-2`/`pb-16` = bottom; **no `pt-*`** → first row flush against the tab strip's bottom border.
- Tab strip root (`EstimateTabStrip.tsx:645`) owns `border-b border-hairline`, no bottom margin → adding `pt-2` to the sibling rows div inserts the gap **below** that border (no double-gap, no border collapse).
- Sticky headers are **safe**: node header `branch.tsx:172` (`sticky`, `top: stickyTop`, root `stickyTop=0`) and column `<thead>` `row-table.tsx:160` (`top: stickyTop`) measure from the **padding box**, so they pin 8px lower — correct. Cursor overlay math reads `getBoundingClientRect()` → auto-accounts.
- **Fix:** add `pt-2` (keep `px-2` + conditional `pb-*`). Empty-tab state (`:2074`, `px-2 pb-2`) has the same gap → add `pt-2` for consistency; skeleton (`:2011`, `p-2`) already symmetric.
- **Blast radius: isolated.** Center column / pointer surface / `EstimateSheetBranch` / `EstimateRowItemsTable` used only in `EstimateSheetContent.tsx`. Template editor has its own `p-2` scroll wrappers — unaffected. **No test asserts this spacing.**

---

## Req 10 — Make Filter & Group-by buttons functional (the 6 dead buttons)

### How the toolbar renders Filter/Group (`header-icon-toolbar.tsx`)
- Props `onFilter?` (`:26`), `onGroup?` (`:27`), `showDefaultActions?` (`:38`, **defaults `true` @ `:58`**), `filterSlot?` (`:40,:59`).
- Render block `:97-109`: `{filterSlot}` (`:97`) → if `showDefaultActions`: Filter button renders **only when `filterSlot` is falsy** (`:100-104`, `FunnelSimple`, label `Filter ${labelPrefix}`); Group button **always renders** when `showDefaultActions` (`:105-107`, `ListBullets`, label `Group ${labelPrefix}`).
- **Both render even when `onFilter`/`onGroup` are `undefined`** → `onClick={undefined}` = clickable no-ops. They are NOT hidden by a missing handler. Only `showDefaultActions={false}` hides them. There is **no `filterActive`/`pressed`** affordance on these two.

### Per-panel wiring today — all three are dead
All three estimate panels **omit `onFilter`, `onGroup`, `filterSlot`, and `showDefaultActions`** → default Filter + Group render as pure no-ops:
- **LEFT** `EstimateSheetTree.tsx:1331-1352` — "Filter tree" + "Group tree", no-op. (Real text filtering already exists via the search disclosure `treeSearchQuery`.)
- **MIDDLE** `EstimateSheetContent.tsx:499-530` — "Filter tab" + "Group tab", no-op (`labelPrefix="tab"`). (Real text filter via search `filterEstimateSheetNode` `:546`.)
- **RIGHT** `component-library/index.tsx:1972-2021` — "Filter library tree" + "Group library tree", no-op — sitting next to the **working** "View by:" control.

**Confirms the user's "3 + 3" = 6 dead buttons.** Every *other* `TreePanelHeader` consumer deliberately sets `showDefaultActions={false}` (`ComponentLibraryManager.tsx:887`, `LibraryFolderTree.tsx:1107`, `TemplatesBrowseManager.tsx:438`, `TemplateGallery.tsx:229`, `TemplateEditorClient.tsx:249`, `TemplateEditorSheet.tsx:571`, `activity-history.tsx:1622`, `ShareEstimateTreePanel.tsx:398`). The three estimate panels are the **only** consumers leaving the defaults on — an oversight, not intent.

### Reusable machinery already built (the foundation for D5 "wire existing")
1. **`ComponentFacetFilterPopover` / `FilterPopover`** (`src/components/workshop/library/component-facet-filter.tsx:208+`) — fully wired filter popover (supplier/brand/lifecycle/confidence/freshness facets, active-count badge, reset, `triggerPressed`). Already mounted via `filterSlot` at `ComponentLibraryManager.tsx:888-894`. **Canonical "make filter functional" pattern.**
2. **`ComponentViewControls` / `COMPONENT_VIEW_MODES`** (`library-folder-tree-shared.ts:3-7`) — the right panel's **working group-by** ("View by:" → default/suppliers/brand). Rendered as `leadingActions` (`index.tsx:1985-1993`) + child popover (`:2013-2020`); re-buckets the tree (`:1132-1138`); disabled unless `activeTab==="components"`.
3. **`groupComponents()` / `sortComponents()` + `LibraryGroupBy`/`LibrarySortMode`** (`component-library/helpers.ts:174,189`; `types.ts:4-6`): `LibraryGroupBy = none|category|supplier|discipline|room|recent`, 7 sort modes, prefs persisted via `getLibraryPrefs()` (`helpers.ts:664`). **Imported into `EstimateSheetContent.tsx` (`:110,:117`) but never called** — pre-built grouping/sorting logic, currently dead. Strong base for the MIDDLE group-by.
4. **Search already works** in all three panels → "Filter" must mean **structured/faceted** filtering to avoid duplicating search.

### Proposed semantics (per D5/D6)
- **LEFT:** structured filter only (e.g. hide-empty-areas / has-value / by kind) via a `filterSlot` popover over `localNodes`; **no Group** (areas already are the grouping).
- **MIDDLE:** real group-by wiring the already-imported `groupComponents`/`sortComponents` to a `groupBy` state (category/supplier/area); faceted filter popover over `EstimateRowItem` fields.
- **RIGHT:** filter = `ComponentFacetFilterPopover`; group = the existing View-by mechanism (D6). See Req 12 for placement.

### Blast radius & tests
`HeaderIconToolbar`/`TreePanelHeader` shared by ~12 consumers (8 already `showDefaultActions={false}`; `WorkshopCollectionLayout.tsx:15-61` forwards `onFilter`/`onGroup`). Tests asserting the current no-op buttons (**will need updating**):
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx:687-688` — asserts "Filter tab" + "Group tab" present (MIDDLE).
- `tests/vitest/estimate-tree-modal.test.tsx:106` — asserts LEFT toolbar's exact button order **includes** "Filter tree", "Group tree".
- `tests/vitest/header-icon-toolbar-ui.test.tsx:11-12,25-26,33+` — the toolbar contract: Filter/Group render by default, hidden when `showDefaultActions={false}`, `onFilter`/`onGroup` fire. **The canonical test to update for any primitive change.**
- `tests/vitest/workshop-reset.test.tsx:179-180`, `tests/unit/reset-baseline.test.ts:34-35` — assert Filter/Group **absent** on reset surfaces (negative; confirm unaffected).
- **No e2e** references Filter/Group/"View by:".

### Risks / open product points
- "Group by" is **ill-defined for the LEFT tree** → D6 hides it. ✅ decided.
- Filter must be **faceted, not text** (search already covers text). ✅ noted.
- A real implementation wants an **active-count / pressed** affordance — the default Filter/Group buttons lack it; use the `filterSlot` + `ComponentFacetFilterPopover` `triggerPressed` pattern (toolbar API may gain handler-gating; see `03` Change 7).
- **Group vs View-by redundancy** on the right panel (D7) — flagged for owner.

---

## Req 11 — Vertical separator between Filter&Group and Expand&Collapse

`header-icon-toolbar.tsx` today: the `startActions` group (the search toggle injected by `TreePanelHeader`) is wrapped in a div with **`mr-1 ... border-r border-hairline pr-1`** (`:75-79`) — that's the separator the user means (search ↔ Filter&Group). But the Filter/Group buttons (`:100-108`) and Expand/Collapse (`:110-119`) are **bare `ToolbarIconButton`s** with only `gap-1` between them — **no separator** between the {Filter,Group} subcluster and the {Expand,Collapse} subcluster. The `leadingActions` group has its own `ml-1 ... border-l border-hairline pl-1` (`:120-125`).

**Fix (Req 11):** wrap the Filter+Group cluster in a bordered group mirroring `startActions` (`border-r border-hairline pr-1 mr-1`) so a hairline divider falls between Group and Expand. Must render **only when Filter or Group actually render** (avoid an orphan divider) — ties into the handler-gating in Req 10. Shared component → affects all consumers; additive/visual.

---

## Req 12 — Right sidebar: move Filter · Group · View-by into the new under-tabs row

Amends Req 7. The new 38px header-icon row under the tabs (from Req 7) becomes the home for the right panel's controls. **Final layout (D7 + D8):** the new row hosts, left→right: **Filter**, **View-by** (the grouping control), then `ml-auto` **Add Component/Template** (tab-conditional, orange). The dead "Group" button is **dropped** — it was a no-op and is redundant with View-by.

Consequences:
- The right panel's **top** `TreePanelHeader`/`HeaderIconToolbar` keeps only: search toggle, Expand all, Collapse all. So it passes `showDefaultActions={false}` (removes top Filter/Group), drops `leadingActions` (the "View by:" control moves down), and `addActions={[]}` (Req 7).
- The new row renders bespoke controls (not via `HeaderIconToolbar`): a **Filter** trigger (→ `ComponentFacetFilterPopover`), a **View-by** trigger (→ `ComponentViewControls`, default/suppliers/brand), and the tab-conditional **Add** button. Reuse `ToolbarIconButton` for visual parity (`size-6 rounded-xs`); Add button uses `ADD_BUTTON_CLASSNAME`.
- Test impact: `component-library-ui.test.tsx:199-212` (header button order — top row loses Filter/Group/View-by/Add) and `:218-219` (sticky-header child count = keep new row an external sibling) — superset of the Req 7 updates; now also assert Filter/View-by/Add live in the new row and that no "Group library tree" button exists anywhere.

---

## Req 13 — Move the "New tab" button into the middle panel header icon toolbar

**Where it is today.** The add-tab button is `createButton` (`EstimateTabStrip.tsx:596-606`) — a `ToolbarIconButton label="New tab"` with `Plus size={12}`, rendered as the `Tabs` end-action **inside** `EstimateTabStrip`. It calls `createTab()` (`:370-387`), which is **encapsulated in the strip**: it depends on local state/refs (`pendingAction`/`setPendingAction` `:110`, `orderedTabs`, `beginRename`, `lifecycleActionsReady` `:121`, `canCreateTabs` `:90`) and the repo call `createEstimateTab` (`:11,:375`).

**Where it must go.** The middle panel's header icon toolbar = `EstimateSheetHeader` → `TreePanelHeader addActions` at `EstimateSheetContent.tsx:499-530` — **the same `addActions` slot that Req 1 frees** by relocating Activity + Preview-Excel to the layout. So after Req 1 the middle header `addActions` is empty and becomes the new home for the add-tab button (in the position Preview-Excel occupied).

**Why it's a refactor, not a move.** `createTab` and its readiness flags live in `EstimateTabStrip`; the header lives in `EstimateSheetContent`. The button needs the action + `disabled`/availability state available at the header. Two viable approaches:
- **(Recommended) Imperative handle + state callback:** `forwardRef` + `useImperativeHandle` on `EstimateTabStrip` exposing `createTab()`; plus a lightweight `onCreateTabStateChange(canCreate, pending)` callback prop so `EstimateSheetContent` can render the header button with the correct `disabled`/visibility (refs alone don't re-render). The header `addActions` entry calls `tabStripRef.current?.createTab()`.
- **(Cleaner, larger) Lift the tab lifecycle** (`createTab`/`canCreateTabs`/`pendingAction`) into `EstimateSheetContent` or a shared hook, passing actions down to the strip and rendering the button up in the header.

**Interactions.**
- **Req 6** (orange add-button treatment) now applies to the button **in its new location** (`ADD_BUTTON_CLASSNAME`), not in the tab strip.
- **Req 1** must land first (or together) — it frees the slot. Both edit `EstimateSheetContent.tsx:499-530` → coordinate in the Phase C branch.
- Remove `createButton` from `EstimateTabStrip` once relocated; keep `createTab` (now ref-exposed). The strip's `endAction` for the Tabs may become empty — verify the `Tabs` component tolerates no end-action.

**Blast radius / tests.** `EstimateTabStrip` is consumed only by `EstimateSheetContent` (and tests). Preserve the **"New tab"** accessible name. Check tests that find the add-tab control: e2e `estimate-tabs.spec.ts` (tablist + create flow), and any vitest asserting "New tab" presence/position. `canCreateTabs`/viewer-gating must still hide the button for non-editors.

---

## Req 14 — Editable estimate title: no width clip, no border, no limit

**Location.** `src/components/workshop/ProjectEstimateMetadataStrip.tsx:191-211` — an `<input aria-label="Estimate name">` (inline-rename of the estimate). Wrapper `<div className="flex min-w-0 max-w-full items-center gap-1">` (`:191`).

**Current classes (`:197`):**
```
h-7 min-w-0 max-w-[320px] rounded-xs border border-transparent bg-transparent px-2 text-center
!text-[10px] font-medium leading-none text-ink outline-none transition placeholder:text-tertiary
hover:border-hairline focus:border-accent focus:bg-accentSoft disabled:opacity-60
```
plus error state (`:198`): `border-danger bg-dangerSoft/40`.

**Diagnosis vs the three asks:**
1. **"Clipped / fixed width"** → caused by **`max-w-[320px]`**. A plain `<input>` does not auto-size to content, and the 320px cap hard-truncates the visible name. **Root cause.**
2. **"No border"** → today the border is transparent at rest, `hairline` on hover, `accent` on focus (`border border-transparent hover:border-hairline focus:border-accent`). The user wants none.
3. **"No limit to the name"** → **there is no `maxLength` attribute** on the input (`:192-211`); length is already unlimited. The only validation is empty-required (`:137`). So the *character limit* ask is already satisfied — the real complaint is the *visual width* clip (#1).

**Recommended fix.**
- Remove `max-w-[320px]`; let the field **size to content** via `field-sizing-content` (Tailwind v4 utility → CSS `field-sizing: content`), capped by `max-w-full` so it never overflows the centered metadata strip. Keep `min-w-0`. (Browser caveat: `field-sizing` is Chromium 123+; Safari/Firefox fall back gracefully because an `<input>` scrolls horizontally on overflow, so the **full name stays editable** even if the visible field is bounded by the header width. A fully cross-browser alternative is a measuring-span auto-size; flagged as optional.)
- Remove the border affordance: drop `border border-transparent hover:border-hairline focus:border-accent`. Keep `focus:bg-accentSoft` as the edit affordance (a background, not a border) so the field still signals "editable/active."
- Error state: **keep `border-danger bg-dangerSoft/40`** (owner confirmed 2026-06-14). "No border" applies to the resting/hover/focus affordance only — the error border stays as failure feedback.

**Blast radius.** `ProjectEstimateMetadataStrip` is the estimate header strip (rendered in `role="banner"` — see `estimate-sheet-cost-inputs.test.tsx` breadcrumb-in-banner assertions). Changing width/border classes does not affect the breadcrumb structure or the `aria-label="Estimate name"` selector → **isolated, LOW risk**. Confirm no test asserts `max-w-[320px]` (none found). Verify the rename save/validation flow (`handleBlur`/`handleKeyDown`/empty-required) is untouched.

---

## Cross-cutting: concurrency reality
Per project memory: many agents push to `main` concurrently; the main worktree is usually dirty. **Land via `git push origin HEAD:main`; do not `checkout main` locally.** `EstimateSheetContent.tsx` and `EstimateSheetTree.tsx` last committed 09:51 today (P6 unification, committed — not uncommitted). The `estimate-mixed-content` and `estimate-sheet-version-control-ui` tests encode P3–P6 invariants that must stay green. Use nvm node v25.8.0 for tooling; don't co-run heavy workflows with the full DOM suite (flaky 15s timeouts).
