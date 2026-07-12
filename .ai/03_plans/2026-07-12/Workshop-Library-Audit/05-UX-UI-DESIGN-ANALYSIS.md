# 05 — UX/UI + Visual-Design Analysis

> Read-only source inspection of `/workshop/library` UI. No browser/screenshot
> tooling (User Test Authorization Gate). Every concrete claim cited `file:line`.
> Source can prove structure/handlers/state machines; it **cannot** prove rendered
> contrast ratios, real perceived timing, or whether a global
> `prefers-reduced-motion` CSS override exists outside these files.

**DESIGN.md status:** alpha — "a guide, not law" (`DESIGN.md:322-342`). Flags
below are "departs from current default," not contract violations. Tokens: SF Pro,
10px body / 12px max titles, 3px inner radius, neutral greys, two surface
materials (**paper** + **liquid glass**); library forces `variant="glass"`
everywhere. Canvas wash is northeast desaturated yellow/white
(`.library-canvas-wash`).

## 1. Layout & information architecture

Three-tab structure (`LibraryTabsLayoutClient.tsx:14-33`): Overview (`SquaresFour`),
Components (`Package`), Templates (`Blueprint`). Shared chrome: `WorkshopRouteHeader`
owns the page; `LibraryTitleBarClient` is `titleSlot`; `LibraryTabsLayoutClient`
is `subHeader`; `LibraryTabPanel` wraps `children`.

Per-tab layout:
- **Overview** — intentionally empty (`LibraryOverview.tsx:6-8`); only the header
  combobox search is live. Sparse to confusion (§8).
- **Components** — three-column: left folder tree (`ResizableSidePanel` 272px),
  center sheet (toolbar + context strip + facet chips + card grid OR dense
  virtualized table), right inspector dock (conditional, `ResizableSidePanel`
  380px). Hierarchy clear; matches DESIGN.md "estimate grid owns majority."
- **Templates browse** — three-column: left templates tree, center gallery
  (toolbar + rows + inline preview), right `EstimateRightSidebar` source dock
  (**hidden below `lg`** with no drawer fallback — §5).
- **Template editor** — tab strip replaced by breadcrumb + `TEMPLATE` chip +
  save indicator. Three-column: structure tree, center sheet (group/area headers
  + editable rows + column header), right components dock (lazy on hover/focus).

Clutter points: Components center stacks 5 horizontal bands when filtering
(toolbar → context strip → facet chips → status output → bulk toolbar) — pushes
cards below the fold on short viewports.

## 2. Component state coverage (MISSING states flagged)

**Well-covered:** route loading skeletons (`loading.tsx` everywhere); partial
dataset ("Load all", "Showing N of M"); inspector detail hydration; saving/saved/
error status (`<output aria-live="polite">`); permission-denied ("Only workspace
editors/admins can manage the library" `:2206-2208`); template delete confirmation;
inspector usage loading/error/empty; template editor empty/no-results + read-only
dock; route-level `error.tsx`/`loading.tsx`.

**MISSING (first-user clarity gaps):**
1. **No explicit empty state when a workspace has zero components.**
   `ComponentLibraryManager.tsx:1916-1963` renders blank when `visibleItems` is
   empty. A new user sees toolbar + "0 components" + empty canvas. No "Add your
   first component" CTA in the body.
2. **No empty state for an empty folder** — selecting one shows nothing.
3. **No "no results after filtering" centered empty state** in Components body or
   Templates gallery body — only the context-strip count signals it.
4. **No empty state when a workspace has zero templates** —
   `TemplateGallery.tsx:421-437` renders an empty `<ul>`.
5. **Overview search swallows errors** into the same "no results" branch
   (`LibraryOverviewSearch.tsx:74-75, 140-143`) — no "search failed — retry."

## 3. Interaction patterns

- **⌘K search:** wired in 3 places (header, in-sheet components, template
  gallery); each guards against open dialogs. **Gap:** three separate handlers on
  one surface don't coordinate; brittle.
- **Drag/drop:** folder reorder (`LibraryFolderTree.tsx:602-624`); component→
  folder (`:579-600`); template→category (`TemplatesBrowseManager.tsx:307-342`);
  template structure tree reorder; template sheet drops.
  - **Gap (a11y):** folder reorder + component-move-between-folders have **no
    keyboard alternative** — violates the project's own rule codified at
    `TemplatesBrowseManager.tsx:407-412` ("every drag has a non-drag path"),
    which templates *does* honor via a "Move to group…" context menu
    (`:1172-1198`). Components/folders should follow the same model.
- **Bulk selection:** component archive via per-card checkbox →
  `BulkDestructivePreviewModal` with typed-phrase confirmation
  (`ARCHIVE N COMPONENTS`, `:2942-2956`). High friction; **no undo toast**.
- **Inline edit:** template rows edit on blur; node rename via **double-click**
  (`TemplateEditorSheet.tsx:378-384`) — undiscoverable; only a `title` tooltip.
- **Optimistic feedback:** consistently good — folder/template/component ops all
  apply locally first, show "Saving…" then "Saved" or roll back.
- **Toasts:** none. All feedback is inline `<output aria-live="polite">`. Calm
  and on-brand, but a successful inspector action is only visible if the status
  strip is on-screen.

## 4. Accessibility

**Solid:** ARIA tablist/tabpanel is textbook
(`LibraryTabsLayoutClient.tsx:212-231`: `role="tablist"`, roving `tabIndex`,
Arrow/Home/End; `LibraryTabPanel.tsx:27-35`: `role="tabpanel"` with matching
ids, `display:contents` so layout stays transparent). Tree primitive has full
keyboard nav + `treeitem` roles with `aria-level/setsize/posinset/expanded`
(`tree.tsx:1321-1352, 1439-1441`). Facet filter uses `<fieldset>/<legend>` +
native checkbox/radio. `Dialog`/`Sheet` implement Tab-trap + initial-focus +
Escape (`dialog.tsx:222-307`). Focus restore on close is wired for add-modal
(`:2283-2303`), inspector (`:2415-2426`), template preview (`:813-823`). `aria-live`
widely + correctly used. Color-contrast reliance is fine (dark ink on white,
semantic states always pair color + text + icon; selection = `bg-surfaceMuted` +
orange rail, not color alone).

**Gaps:**
1. **No keyboard reorder/move** for folder tree + component-to-folder (§3).
2. **Reduced-motion unhandled in this surface.** Grep for
   `prefers-reduced-motion`/`prefers-reduced-transparency` across `library/**`
   and `component-library-manager/**` = zero hits, yet the surface uses card
   hover scale (`ComponentLibraryManager.tsx:795, 805`), caret rotation
   (`TemplateEditorSheet.tsx:372`), row transitions. DESIGN.md (`:586`) mandates
   it. (A global stylesheet override may exist outside these files —
   unverifiable from source.)
3. **Double-click-to-rename** is undiscoverable (§3).
4. **Route-change focus into the template editor** is not explicitly managed.

## 5. Responsive / mobile

Desktop-first. Below 1024px, `ResizableSidePanel` (`compactViewport =
useMediaQuery("(max-width: 1023px)")`, `:126`) collapses panels to a drawer.
Covers folder tree, inspector, template tree, structure tree.

**Breaks on narrow viewports:**
1. **Dense virtualized table** — `min-w-[1120px]` (`:1078`) forces horizontal
   scroll under ~1120px; action column falls off-screen.
2. **Templates browse source dock** — `hidden min-h-0 lg:flex`
   (`TemplatesBrowseManager.tsx:1088`): below `lg` the entire `EstimateRightSidebar`
   disappears with **no drawer fallback** (unlike the inspector). **Gap.**
3. **Card grid** reflows gracefully down to ~164px columns — most mobile-tolerant.
4. No mobile (≤640px) task-flow simplifications in the library itself. Consistent
   with DESIGN.md's mobile prioritization (`:525`) but worth naming.

## 6. Design-system consistency

**Strong primitive reuse:** `Button`, `SearchInput`, `ControlInput/Field/Textarea`,
`DropdownSelect/Menu`, `Checkbox`, `FilterPopover`, `Tree`, `TreePanelHeader`,
`Skeleton`, `ConfirmDialog`, `Sheet`, `Modal`, `ContextMenu`, `CreatableCombobox`,
`ResizableSidePanel`, `BulkActionToolbar`, `BulkDestructivePreviewModal` — all
from `src/components/ui`. Typography compliant (10/9/8/12/11px scale, tabular
nums on money/qty). Theming via `library-surface-class.ts` /
`library-surface-variant.tsx` is consistent + well-factored; slot vocabulary
applied uniformly. (Paper branches are dead in production since library always
sets `glass`, but kept for testability.)

**Hand-rolls that arguably should use the system:**
1. `LIBRARY_GLASS_DIVIDER/CONTROL/SELECTED/TILE/TABLE_CLASS` constants
   (`ComponentLibraryManager.tsx:132-138`) — could centralize into
   `librarySurfaceClass` slots (`selectedTile`, `glassControl`).
2. Native `<select disabled>` placeholders (`TemplatesBrowseManager.tsx:78-85`,
   `TemplateEditorClient.tsx:91-98`) — DESIGN.md (`:478`) discourages native
   `<select>` in workshop surfaces.
3. Literal `⋯`/`×` glyphs as button children (`ComponentInspectorDock.tsx:141,160`)
   vs. Phosphor icons elsewhere.
4. `<output>` used as skeleton-wrapper (`LibraryPageClient.tsx:29`,
   `TemplatesBrowsePageClient.tsx:31`, `loading.tsx`) — `<output>` is form-results
   semantics; `role="status"` cleaner.

## 7. Loading / perceived-performance UX

All-skeleton, no spinners (calm, editorial). Route shells seed client TanStack
caches via `initialData` (`LibraryPageClient.tsx:107-113`,
`TemplatesBrowsePageClient.tsx:79-84`) with 5-min `staleTime`; mutations patch
the cache (`:117-135`, `:86-97`) rather than `router.refresh()` (comments at
`:60-63, 116`). Prefetch on pointer-enter/focus/click, deduped via `Set`
(`LibraryTabsLayoutClient.tsx:81-94`). Deferred detail hydration on inspect +
dock-on-hover. Well-engineered.

**Where a user perceives slowness/jank:**
1. **Overview route loading→empty whiplash** (§8) — rich skeleton paints, then
   empty `<div>`. High-impact perceived-perf + clarity bug.
2. **Components `loading.tsx` mirrors the tree on the wrong side** —
   `components/loading.tsx:24` renders the rail as `rightDock`, but the real
   manager puts the folder tree on the **left** (`:2800`). Visible layout shift
   on hydration.
3. **Card-scale fallback** (`:1886-1914`) — opening a large folder suddenly
   replaces the card grid with a "N components match. [Dense]" panel. Jarring
   mode switch between small and large folders.

## 8. Empty / degraded states — the Overview problem

Landing on `/workshop/library`:
1. Dashboard "Library" hub card → navigate.
2. `library/loading.tsx:7-61` paints an **elaborate skeleton**: search row, 6
   component cards (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`), 4 template
   rows, a health-line skeleton.
3. Route resolves; `LibraryOverview.tsx:7` paints a **completely empty `<div>`**.
4. User sees header (12px "Library", toolbar, 3-tab strip) + blank canvas + wash.

**Two compounding problems:**
- **The skeleton lies** — it depicts content that does not exist. Worse than no
  skeleton: sets an expectation and breaks it. The skeleton's own comment
  (`loading.tsx:7-11`) says it "mirrors LibraryOverview … Components section,
  Templates section, health line" — but the real component has none of those.
  This is a **stale skeleton describing a previous design**.
- **The empty body has no orientation** — no "Welcome," no "Search (⌘K) or browse
  Components/Templates," no CTA. The body is a dead end. A first-user must infer
  "click another tab."

`RecentComponentCard` (`overview/RecentComponentCard.tsx`) is fully built
(thumb, name, brand, subline, trust chips, price) but has **zero call sites** —
built for an Overview home that was later cleared.

**Recommendation (owner decision):** **either** restore a real Overview
(greeting + "Recent components" grid wiring `RecentComponentCard` + "Recent
templates" + a health line summarizing stale/discontinued counts — the skeleton
already depicts exactly this), **or** commit to the empty Overview and (a)
replace `library/loading.tsx` with a skeleton matching reality, and (b) add an
in-body orientation panel ("Search (⌘K) · Browse Components · Browse Templates"
+ 2 CTAs). The owner's "intentionally cleared" decision is respected either way;
the **skeleton divergence and dead-end body are almost certainly not intended**.

## 9. Top UX/design recommendations (prioritized)

### P1 — first-user clarity
1. **Fix the Overview skeleton/reality divergence** (`library/loading.tsx:7-61`
   vs `LibraryOverview.tsx:7`). Either restore content (wire `RecentComponentCard`)
   or match the skeleton to an empty Overview.
2. **Add in-body orientation to the empty Overview** — a centered panel with 2
   CTAs, not a dead end.
3. **Add explicit empty states** for zero-component (`:1916-1963`) and
   zero-template (`TemplateGallery.tsx:421-437`) workspaces, and for
   no-results-after-filtering in both bodies.

### P2 — meaningful improvement
4. **Add keyboard alternatives for drag-only ops** (folder reorder, component→
   folder move) mirroring the templates "Move to group…" combobox.
5. **Add reduced-motion guards** (`prefers-reduced-motion`) for card hover scale,
   caret rotation, row transitions — verify whether a global override exists.
6. **Restore templates-browse source dock below `lg`** — wrap in
   `ResizableSidePanel` or render a drawer trigger (currently hard-hidden,
   `TemplatesBrowseManager.tsx:1088`).
7. **Make node rename discoverable** — add "Rename" to the structure-tree context
   menu or a visible pencil-on-hover (currently double-click + `title` only).
8. **Surface search errors distinctly** from no-results in Overview search.
9. **Replace native `<select>` placeholders** with `DropdownSelect` (disabled).
10. **Replace `⋯`/`×` glyphs** with Phosphor icons in the inspector.

### P3 — polish
11. Centralize `LIBRARY_GLASS_*` constants into `librarySurfaceClass` slots.
12. Coordinate the three `⌘K` handlers via a single registry.
13. Add an Undo toast after bulk archive (helper text says "reversible" but
    there's no in-flow undo).
14. Use `role="status"` instead of `<output>` for skeleton wrappers.
15. Distinguish "not set" detail values in the inspector (italics / muted chip vs.
    faded populated-looking text).
16. Clean up dead `RecentComponentCard` (wire it in per P1#1, or remove).
