# Owner Decisions

Four findings forked the plan and required the owner's call. All four are **locked** (decided 2026-06-14). Each records the decision, the rationale, the consequence for the plan, and — for decision 1 — the exact DESIGN.md amendment required.

---

## D1 — Add-button color: **Approve a named orange app exception (Tailwind orange scale)**

**Context / conflict.** Reqs 5/6/7 ask for "light-orange background, darker-orange icon, hover-darken" add buttons. This **directly conflicts** with `DESIGN.md`, which states:
> "Color discipline is mandatory outside the landing page… **Orange is landing/brand expression only unless Philip explicitly approves a named app exception.**"
> "App primary actions use strong neutral (`#292929` / live `#3D3D3D`) for Create, **Add selected item**, Duplicate, Issue proposal, Export."

There is also **no light-orange token** in the theme — only `brand-orange` (`#AA412A`) and `brand-orange-dark` (`#8C3623`).

**Decision.** ✅ **Approve the exception.** Use the **Tailwind default `orange-*` scale** already precedented in-app at `src/components/workshop/projects-page-client.tsx:371`:
```
bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800
focus-visible:bg-orange-200 focus-visible:text-orange-800 cursor-pointer
```

**Rationale.** This matches an existing in-app precedent (so the page stays internally consistent), reads as a clear "add" affordance, and avoids the darker terracotta `brand-orange` that is tuned for marketing surfaces. The requirement explicitly asks for a *resting* light-orange background, which the current hover-only orange does not satisfy.

**Consequence for the plan.**
- A **named exception MUST be added to `DESIGN.md`** before/with the first add-button change (see exact text below). Without it, the `ce-project-standards`/design-review lane will (correctly) flag the change.
- The treatment is centralized as a single shared className constant — see `03-DESIGN-SYSTEM-CHANGES.md` §Add-button style.
- Applies to add buttons #1 (Add Area), #2 (Add tab), #3 (Add Component), #4 (Add Template). **Not** #5 `QuietAddRowButton` (stays quiet) unless overridden later.

### DESIGN.md amendment to land with Phase A

Add under the color-discipline / buttons section:

```markdown
### Named app exception: estimate-sheet "Add" affordances (approved 2026-06-14)

The "add" icon buttons on the Estimate Sheet page — Add Area (left tree),
Add tab (middle), Add Component / Add Template (right sidebar) — use a
light-orange affordance instead of strong neutral:

- resting:  bg-orange-100  text-orange-700
- hover:    bg-orange-200  text-orange-800  (+ focus-visible mirror)
- cursor:   pointer (explicit — Tailwind v4 has no default)

Rationale: the estimate sheet has many co-located neutral toolbar icons;
the orange tint disambiguates the primary "add" action. This is the only
app-chrome orange-button exception. Reuses the Tailwind `orange-*` scale
already used at projects-page-client.tsx:371. Centralized as
ADD_BUTTON_CLASSNAME (src/components/ui/toolbar-icon-button.tsx).
Does NOT apply to in-row "Add row" (QuietAddRowButton stays low-emphasis).
```

---

## D2 — Req 1 placement: **Literal move to the layout header beside Share**

**Context.** XLSX/Activity triggers live in the page body (`EstimateSheetContent`); Share/Teamspace live in the project layout's `WorkshopPageShell` `actions` slot — a **separate React tree**. A literal "beside Share" relocation crosses the layout↔page boundary.

**Decision.** ✅ **Literal move.** Render the XLSX + Activity buttons in the layout `actions` slot beside Share. Keep the dialogs (`ProposalExportPreviewDialog`, `ActivityHistoryModal`) and their state inside the page; lift only the **triggers + capability flag** up via shared Zustand state.

**Rationale.** The owner wants the requirement honored as written; the four header actions read as one cluster. The cost (shared store slice, capability signalling, hydration-parity bookkeeping) is accepted.

**Consequence for the plan.** This is the **heaviest single item** and gets its own phase (C1) with explicit sub-tasks:
- New Zustand slice (e.g. `useEstimateHeaderActionsStore`) exposing `{ openActivity, openProposalPreview, canPreviewExport, isEstimateRoute }`.
- Page registers handlers + `canPreviewExport` into the store; clears on unmount.
- A route-aware `EstimateHeaderActions` component rendered in the layout chrome (next to Share) subscribes and renders the two `size-10` buttons, **disabled when `!canPreviewExport`** / hidden off-estimate-route (chrome already uses `usePathname`/`routeToActiveSurface`).
- **Update `ProjectHeaderChromeSkeleton`** to preserve the hydration node-count invariant; update `project-chrome-streaming.test.ts` in lockstep.
- **Preserve accessible names** `"Activity"` and `"Preview Excel Export"` (tests + a11y depend on them).

> Fallback noted but rejected: an "in-page restyle" (keep XLSX/Activity in the page's own sticky header, just match Share's style) was the cheaper option; the owner chose the literal move.

---

## D3 — Req 4 semantics: **Direct items only**

**Context.** Under the P6 single-node model a node can hold both child sub-areas and its own components. "Has a component inside" could mean the node's **own** items or the **whole subtree**.

**Decision.** ✅ **Direct items only** — orange ⇔ `(node.estimateRowItems?.length ?? 0) > 0`.

**Rationale.** O(1) per node → **eliminates the performance risk** that made this the highest-risk requirement. Semantics are predictable ("this node itself contains work"). A parent area whose components live only in children stays grey.

**Consequence for the plan.** Req 4 drops from HIGH to LOW risk. Still compute inside the memoized `toUiNode` and fold into the per-node `icon` (preserves row memo); no map threading. Add a small sidebar-mounted correctness test (existing perf suite excludes the sidebar).

---

## D4 — Req 3 border scope: **Global (shared `TreePanelHeader` edit)**

**Context.** The cleanest fix is one line on the shared `TreePanelHeader` root, but it's used by 11 surfaces, so the border also appears on projects/estimates list, library manager, template editor, templates browse, etc.

**Decision.** ✅ **Global.** Add `border-b border-hairline` to the `TreePanelHeader` root.

**Rationale.** Matches the "keep it consistent" spirit across the whole app, single edit, and the canonical border (`#F2F2F2`) is already the page-wide neutral, so it harmonizes rather than clashes.

**Consequence for the plan.** One edit at `tree-panel-header.tsx:179`. Required follow-through: a quick visual pass of the ~9 out-of-scope consumers, specifically checking **double-border** on `TemplateGallery.tsx:241` and `ComponentLibraryManager.tsx:875` (headers that already abut a bordered region). No test asserts header borders, but mind the `live-estimate-node-route.test.ts:77` substring match near `bg-white`.

---

## D5 — Req 10 scope: **Wire existing machinery** (not greenfield, not honesty-floor)

**Context.** All 6 Filter/Group buttons are dead no-ops. "Filter" is greenfield for left/middle (search already covers text), but substantial reusable machinery exists: `ComponentFacetFilterPopover` (wired), and `groupComponents()`/`sortComponents()`/`LibraryGroupBy` (imported into `EstimateSheetContent` but never called).

**Decision.** ✅ **Wire existing machinery.**
- **RIGHT:** mount `ComponentFacetFilterPopover` as the Filter; use the existing View-by mechanism as the group.
- **MIDDLE:** wire the already-imported `groupComponents`/`sortComponents` to a real group-by (category/supplier/area) + a faceted filter popover over `EstimateRowItem` fields.
- **LEFT:** structured filter predicate over `localNodes` (e.g. hide-empty-areas / has-value); **no group** (see D6).

**Rationale.** Real functionality at moderate effort by reusing built-and-tested code; avoids a multi-PR greenfield feature and avoids merely hiding the buttons (the user explicitly wants them *functional*).

**Consequence.** Req 10 becomes Phase D (depends on the A4 toolbar refinement). Filter is **faceted/structured**, never a duplicate of the existing text search. A `pressed`/active-count affordance comes from the `filterSlot` + `ComponentFacetFilterPopover` pattern.

---

## D6 — Left-tree "Group by": **Hide it** (areas already are the grouping)

**Decision.** ✅ The LEFT tree gets **no Group button** — the Area hierarchy *is* the grouping, so a group-by would have to re-root/flatten and fight the hierarchy. Only the **MIDDLE** sheet gains a net-new group-by; the **RIGHT** panel uses its existing View-by.

**Rationale.** Avoids shipping an incoherent feature. Confirmed by the audit (group-by is ill-defined over a hierarchy that already encodes the grouping).

**Consequence.** Implemented via toolbar **handler-gating** (D8): the left panel supplies a `filterSlot` (→ Filter) but no `onGroup` → the Group button simply does not render.

---

## D7 — Req 12 right-panel layout: **Filter · View-by · Add in the new row; drop dead Group**

**Decision.** ✅ The new under-tabs row hosts, left→right: **Filter** (facet popover), **View-by** (the working grouping: default/suppliers/brand), then `ml-auto` **Add Component/Template** (tab-conditional, orange). The right panel's **top** header keeps only search + expand/collapse. The previously-dead **"Group library tree" button is dropped** (redundant with View-by).

**Rationale.** Owner's explicit layout instruction, plus the "drop functionless buttons" call (D8) resolves the Group/View-by redundancy in favor of the one that actually works.

**Consequence.** Right panel top header: `showDefaultActions={false}` + `addActions={[]}` + no `leadingActions`. New row renders three bespoke `ToolbarIconButton`s. Updates `component-library-ui.test.tsx` (button order + child count + no "Group library tree" anywhere).

---

## D8 — Drop functionless buttons (honest-by-construction toolbar)

**Decision.** ✅ Buttons with no function are **removed**, not kept as clickable no-ops. Implemented at the primitive level: refine `HeaderIconToolbar` so the default **Filter renders only when `onFilter` or `filterSlot` is supplied**, and **Group renders only when `onGroup` is supplied** (mirroring how Expand/Collapse already gate on their handlers).

**Rationale.** Owner: "if there are buttons that have no function, we can drop them if we don't need them." Gating at the primitive makes the whole app honest by construction and lets each panel opt into exactly the controls it wires (left = filter only; middle = filter + group; right = neither in top row).

**Consequence.** Update `header-icon-toolbar-ui.test.tsx` (the contract test currently expects Filter/Group by default) in lockstep. The 8 consumers already using `showDefaultActions={false}` are unaffected; `WorkshopCollectionLayout` (forwards `onFilter`/`onGroup`) keeps its buttons because it supplies handlers. The Req 11 separator becomes conditional on the cluster actually rendering.

---

## Deferred / unasked micro-decisions (plan picks a sensible default, owner may override)

| Item | Plan's default | Where |
|---|---|---|
| In-row "Add row" (`QuietAddRowButton`) gets orange? | **No** — stays quiet (low-emphasis inside rows) | `03`, `05 B-notes` |
| Standardize add-button icons (Circle/Plus/PlusSquare/StackPlus)? | **Yes, optional** — make Add Area use a Plus-family icon; flagged, not forced | `05 Task A1/B1` |
| New right-sidebar toolbar row height (38px) vs dropdown (40px) | Keep as written: **row 38px, dropdown 40px** | `01`, `05 B3` |
| Add-button orange = Tailwind `orange-*` vs `brand-orange` | **Tailwind orange** (D1) | `03` |
| Non-color affordance for occupied node (a11y) | **Follow-up**, not in initial scope | `01 Req4`, `06` |
