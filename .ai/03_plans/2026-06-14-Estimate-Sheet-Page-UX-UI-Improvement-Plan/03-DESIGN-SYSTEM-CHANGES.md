# Design-System Changes

Grounded entirely in the project's **real** tokens (Tailwind v4, CSS-first `@theme inline` in `src/app/globals.css`; no `tailwind.config.*`). No invented values.

---

## Token reality (the facts the styling reqs must use)

| Need | Canonical token / class | Exact value | Notes |
|---|---|---|---|
| Neutral border (Req 3) | `border-hairline` (or identical alias `border-divider`) | `#F2F2F2` | 628 uses; **no `border-border`/`border-gray-*` exists** — already canonical |
| Brand orange (exists) | `bg-/text-/border-brand-orange` | `#AA412A` (`rgb(170,65,42)`) | landing/marketing; one in-app use: `tabs.tsx:155` active underline |
| Brand orange dark | `…brand-orange-dark` | `#8C3623` | hover step |
| **Light-orange (does NOT exist as a token)** | — | — | use Tailwind default `orange-*` (D1) |
| Strong neutral (DESIGN.md default for Add) | `bg-primary` / `text-ink` | `#3D3D3D` (live; DESIGN.md front-matter says `#292929`) | overridden by D1 for estimate add buttons |
| Muted surface (hover) | `bg-surfaceMuted` / `bg-accent-soft` | `#f5f5f5` | grey — note `accent-soft` is **not** orange |
| App radius (only one) | `rounded-xs` | `3px` | every control |
| Spacing | Tailwind default scale active | `pt-2` = `0.5rem` = 8px | Req 9 |
| Cursor | none by default | — | **Tailwind v4 → must add `cursor-pointer` explicitly** |

`components.json`: shadcn "new-york", `iconLibrary: lucide` — but the estimate sheet uses **Phosphor** (`@phosphor-icons/react/dist/ssr`) for these icons; match the surrounding file's import style.

---

## Change 1 — Shared "Add" button style (Reqs 5, 6, 7-styling) · Phase A1

**Approved (D1):** Tailwind `orange-*` scale, matching `projects-page-client.tsx:371`.

### The constant
Create a single exported constant so all three render paths share one definition:

```ts
// src/components/ui/toolbar-icon-button.tsx  (add export; co-located with the toolbar primitive)
export const ADD_BUTTON_CLASSNAME =
  "bg-orange-100 text-orange-700 " +
  "hover:bg-orange-200 hover:text-orange-800 " +
  "focus-visible:bg-orange-200 focus-visible:text-orange-800 " +
  "cursor-pointer";
```

### Why a className constant (not a Button variant or a wrapper component)
The five add buttons reach the DOM through **three different paths** (header `addActions[]` data, raw `ToolbarIconButton` in the tab strip, raw `<button>` in drop-zones):
- A new **Button variant** only helps the raw-button path and would need `ToolbarIconButton` to stop hardcoding `variant="ghost"` — wider blast radius.
- An **`<AddButton>` wrapper** can't be dropped into the `addActions[]` data shape (those pass a `className` string, not a component).
- A **className constant** plugs into all three (header `addActions[].className`, `ToolbarIconButton className`, and `cn()` into a raw button). Minimal, DRY, and **survives the Req 7 relocation** (it's independent of `HeaderIconToolbar`).

### Application sites
| Site | How |
|---|---|
| #1 Add Area (`EstimateSheetTree.tsx:1341-1347`) | set `className: ADD_BUTTON_CLASSNAME` on the `addActions` entry |
| #2 Add tab (`EstimateTabStrip.tsx:596-606`) | `className={cn("mb-0.5", ADD_BUTTON_CLASSNAME)}` |
| #3/#4 Add Component/Template (right) | applied in the **new toolbar row** (Change 4), `className={ADD_BUTTON_CLASSNAME}` on the single `ToolbarIconButton` |
| #5 Add row (`drop-zones.tsx`) | **not applied** — stays quiet (D2 deferred default) |

### Optional icon harmonization (flagged, not forced)
Add affordances use 4 different icons. "Add Area" uses `Circle` (reads poorly as "add"). Optionally switch Add Area to a `Plus`/`PlusCircle`-family icon for a coherent add family. Owner may decline.

**Tests:** none select these by name → safe; preserve `aria-label`/`title` (accessible names unchanged).

---

## Change 2 — Panel header bottom border (Req 3) · Phase A2

**Single edit**, `src/components/ui/tree-panel-header.tsx:179`:

```diff
- cn("sticky top-0 z-20 shrink-0 bg-white", className)
+ cn("sticky top-0 z-20 shrink-0 border-b border-hairline bg-white", className)
```

All 3 estimate panels (and 8 other consumers) inherit a consistent `#F2F2F2` bottom border. The middle panel overrides `bg-transparent`/`static` but not `border`, so it inherits cleanly.

**Follow-through:** visual pass of out-of-scope consumers; specifically check double-border on `TemplateGallery.tsx:241` and `ComponentLibraryManager.tsx:875`. If a double-border appears there, remove the consumer's own `border-b` (don't special-case the shared header).

**Border-color convergence:** optional, cosmetic only — `border-divider` and `border-hairline` are the same hex. No migration required for Req 3.

---

## Change 3 — `DropdownSelect` "boxed" variant (Req 8) · Phase A3

The source filter already uses the shared `DropdownSelect` (16 consumers). **Do not rebase the default underline trigger.** Add an **opt-in variant** so the redesign is reusable and zero-regression.

### Add a variant prop to `dropdown-select.tsx`
Today the trigger (`dropdown-select.tsx:350-356`) hardcodes the underline look (`h-5 border-0 border-b border-hairline bg-transparent !text-[9px]`). Introduce `variant?: "underline" | "boxed"` (default `"underline"`), and select the trigger classes:

```ts
const TRIGGER_BASE = "inline-flex items-center justify-between rounded-xs transition";
const TRIGGER_VARIANT = {
  underline: "h-5 border-0 border-b border-hairline bg-transparent pl-0 pr-0.5 !text-[9px] leading-3",
  boxed:     "h-10 w-full border border-hairline bg-white px-2 text-[10px] " +
             "hover:border-tertiary focus-visible:border-accent focus-visible:outline-none",
};
// CaretDown size: underline → 8, boxed → 12
```
- `boxed` height = **`h-10` (40px)** to match the Components/Templates tabs above it (`tabs.tsx:150` `min-h-10`).
- Preserve everything else: `role="combobox"`, `role="option"`, `aria-label`, typeahead, keyboard nav, the three option values.

### Apply at the source filter
`component-library/index.tsx:1259-1276`:
```diff
  <DropdownSelect
    options={TEMPLATE_SOURCE_FILTER_OPTIONS}
    value={templateSourceFilter}
    onValueChange={…}
    aria-label="Reusable source filter"
+   variant="boxed"
    className="w-full"
  />
```

**Tests:** `ui-dropdown-select.test.tsx` (default unchanged → green); `component-library-ui.test.tsx:1086-1108` (combobox role + option clicks → preserved). Consider adding a `boxed`-variant render test.

---

## Change 4 — Right-sidebar new toolbar row (Req 7, 12) · Phase B3

Structural (button color from Change 1; Filter/View-by behavior from Change 8/Phase D1). **Final row contents: Filter · View-by · (ml-auto) Add.** The dead "Group" button is dropped (D7/D8).

1. **Top header:** on the right-sidebar `TreePanelHeader` call (`index.tsx:1972-2021`), pass `showDefaultActions={false}` (removes top Filter/Group), `addActions={[]}` (removes top Add), and **drop the `leadingActions` "View by:" control** (`:1985-1993`) — it moves into the new row. Top header now shows only search + Expand/Collapse.
2. **Insert a new toolbar row** as an **external sibling** immediately after `</TreePanelHeader>` (`:2021`) and before the scroll container (`:2024`). External sibling (not `children`) keeps the sticky-header child count = 2 → `component-library-ui.test.tsx:218-219` stays green.
3. **Match the header-icon div** exactly, plus a bottom border to seat it under the tabs:
   ```
   flex h-[38px] min-h-[38px] items-center gap-1 bg-white px-2 py-0 border-b border-hairline
   ```
4. **Row contents** (reuse `ToolbarIconButton` for parity, `size-6 rounded-xs`):
   - **Filter** — `FunnelSimple size={13}`, opens `ComponentFacetFilterPopover` (Change 8 / Phase D1). `aria-pressed` reflects active facets; active-count badge per the popover's existing pattern.
   - **View-by** — the relocated grouping control: reuse the existing `leadingActions` button (toggles `viewModeMenuOpen` → `ComponentViewControls`, default/suppliers/brand). Disabled unless `activeTab === "components"` (unchanged behavior).
   - **`ml-auto` Add** (tab-conditional, `className={ADD_BUTTON_CLASSNAME}`):
     - `activeTab === "components"` → "Add Component", `PlusSquare size={13}`, `onClick={startNewComponent}`.
     - `activeTab === "templates"` → "Add Template", `StackPlus size={13}`, `onClick={startNewTemplate}`.
5. **No "Group" button** anywhere in the right panel (dropped).

**Tests to update in the same change:** `component-library-ui.test.tsx:199-212` (top header button order — now only search/Expand/Collapse; assert the new row hosts Filter/View-by/Add separately), `:242-255` (click "Add Component" resolves to the new row's button), `:1086-1108` (source dropdown unaffected). e2e `workshop-template-insert-smoke` — verify `tablist{name:"Library tree views"}` survives the new row.

---

## Change 5 — Node icon occupied color (Req 4) · Phase B1

`EstimateSheetTree.tsx:80-82` — add an `occupied` prop; swap the color only (the `Circle weight="regular"` outline is already correct):

```tsx
function NodeIcon({ occupied }: { occupied: boolean }) {
  return (
    <Circle
      size={TREE_ROW_ICON_SIZE}
      weight="regular"
      className={cn("shrink-0", occupied ? "text-orange-600" : "text-tertiary")}
      aria-hidden="true"
    />
  );
}
```
- Color: `text-orange-600` (within the approved orange exception family; distinct from the add-button `orange-700` text — both read clearly orange against white). Owner may prefer `text-brand-orange`; pick one and keep it.
- Compute `occupied` in `toUiNode` (`:179`): `const occupied = (node.estimateRowItems?.length ?? 0) > 0;` then `icon: <NodeIcon occupied={occupied} />`. O(1), inside the memoized transform, folded into the icon → row memo preserved.

**A11y follow-up (not blocking):** color-only signal; consider a non-color affordance later (see `06`).

---

## Change 6 — Middle panel top padding (Req 9) · Phase C2

`EstimateSheetContent.tsx:2020`:
```diff
- cn("relative min-h-0 flex-1 overflow-auto px-2", bulkSelectedRowCount > 0 ? "pb-16" : "pb-2")
+ cn("relative min-h-0 flex-1 overflow-auto px-2 pt-2", bulkSelectedRowCount > 0 ? "pb-16" : "pb-2")
```
Keep `px-2` and the conditional `pb-*` (the `pb-16` clears the bulk-action dock). Also add `pt-2` to the empty-tab scroll container (`:2074`). Skeleton (`:2011`, `p-2`) already symmetric.

---

## Change 7 — `HeaderIconToolbar`: handler-gating + Filter↔Expand separator (Reqs 10-primitive, 11, D8) · Phase A4

Two additive refinements to `src/components/ui/header-icon-toolbar.tsx`:

### 7a — Handler-gate Filter/Group (D8 — drop functionless buttons)
Today (`:98-109`) Group always renders under `showDefaultActions`, and Filter renders unless `filterSlot`. Change so a button renders only when it can do something (mirrors Expand/Collapse at `:110-119`):
```diff
- {showDefaultActions ? (
-   <>
-     {filterSlot ? null : (
-       <ToolbarIconButton label={`Filter ${labelPrefix}`} onClick={onFilter}>…</ToolbarIconButton>
-     )}
-     <ToolbarIconButton label={`Group ${labelPrefix}`} onClick={onGroup}>…</ToolbarIconButton>
-   </>
- ) : null}
+ {showDefaultActions && (filterSlot || onFilter || onGroup) ? (
+   <div className="mr-1 flex items-center gap-1 border-r border-hairline pr-1" role="group" aria-label={`${labelPrefix} view filters`}>
+     {filterSlot ? filterSlot : onFilter ? (
+       <ToolbarIconButton label={`Filter ${labelPrefix}`} onClick={onFilter}>
+         <FunnelSimple size={12} weight="regular" aria-hidden="true" />
+       </ToolbarIconButton>
+     ) : null}
+     {onGroup ? (
+       <ToolbarIconButton label={`Group ${labelPrefix}`} onClick={onGroup}>
+         <ListBullets size={12} weight="regular" aria-hidden="true" />
+       </ToolbarIconButton>
+     ) : null}
+   </div>
+ ) : null}
```
- Filter renders when `filterSlot` **or** `onFilter` present; Group only when `onGroup` present. No handler → no button (honest by construction).
- `showDefaultActions` stays a hard off-switch (the 8 consumers that pass `false` are unaffected).

### 7b — Vertical separator (Req 11)
The `border-r border-hairline pr-1 mr-1` on the wrapper above puts a hairline divider **between the Filter/Group cluster and Expand/Collapse**, matching the `startActions` (search) separator at `:75-79`. Because the wrapper only renders when the cluster has content (7a), there is **no orphan divider** when a panel wires neither Filter nor Group.

**Tests:** `header-icon-toolbar-ui.test.tsx:11-12,25-26,33+` must be updated — Filter/Group no longer render "by default"; they render when handlers/`filterSlot` are supplied. Add a separator-presence assertion. `estimate-sheet-cost-inputs.test.tsx:687-688` and `estimate-tree-modal.test.tsx:106` change once the estimate panels wire/drop these (Phase D).

---

## Change 8 — Filter & Group functionality (Req 10) · Phase D

Behavioral, per-panel; depends on Change 7. No new shared primitive — reuses existing machinery (D5).

- **D1 (right):** Filter = `ComponentFacetFilterPopover` (`component-facet-filter.tsx:208+`) rendered in the new under-tabs row's Filter trigger; View-by = existing `ComponentViewControls`. (Per Change 4.)
- **D2 (middle):** add `groupBy` + `sortMode` state; call the **already-imported** `groupComponents()`/`sortComponents()` (`EstimateSheetContent.tsx:110,117`) to bucket the active tab's rows. Filter = a faceted popover over `EstimateRowItem` fields (category/supplier/has-value/cost-band) supplied via `filterSlot`. Group = `onGroup` opening a small group-by menu (category/supplier/area).
- **D3 (left):** Filter = a structured-filter popover over `localNodes` (hide-empty-areas / has-value / by kind) supplied via `filterSlot`; **no `onGroup`** → no Group button (D6).

Each panel gets an active-state affordance via the popover trigger's `pressed`/badge (the `ComponentFacetFilterPopover` pattern), not the bare default buttons.

---

## Summary of new/edited shared surfaces

| File | Change | Reusable? |
|---|---|---|
| `src/components/ui/toolbar-icon-button.tsx` | `+ ADD_BUTTON_CLASSNAME` export | yes (new) |
| `src/components/ui/tree-panel-header.tsx` | `+ border-b border-hairline` on root | yes (11 consumers) |
| `src/components/ui/dropdown-select.tsx` | `+ variant="boxed"` opt-in | yes (16 consumers; default unchanged) |
| `src/components/ui/header-icon-toolbar.tsx` | handler-gate Filter/Group + Filter↔Expand separator | yes (12 consumers; additive) |
| `DESIGN.md` | `+` named orange exception | governance |
