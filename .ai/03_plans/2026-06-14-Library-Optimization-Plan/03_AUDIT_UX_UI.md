# 03 — UX / UI & Perceived-Performance Audit

**Scope:** what a user actually *feels* navigating the Library and doing one CRUD op. This is where the "loading pages all over / doesn't feel like a react app" complaint lives.

---

## A. Perceived-performance summary (step by step)

**Cold load of `/workshop/library`:** `WorkshopPageShell` is an async server component that `await`s `getCurrentUserContext()` + cookie reads before any pixel paints (`WorkshopPageShell.tsx:83-86`). Then `library/loading.tsx` paints a grid + right-rail skeleton — but that's the **wrong shape** for the single-column Overview it stands in for (F4). When data arrives the layout snaps.

**Switching tabs (Overview → Components → Templates):** the heart of the complaint. Each tab is a separate server route, so one click triggers a **three-layer** loading sequence:
1. The click hits the global overlay (`navigation-listener.tsx:38` / `use-navigation-router.ts`) → **full-screen white blur + spinner** (`route-loading-overlay.tsx:33-54`), held ≥250 ms (`navigation-ui-store.ts:12`).
2. Next.js renders the route's `loading.tsx` skeleton.
3. For Components/Templates, the real content is a `dynamic()` import with **its own** fallback skeleton before mount.

So one tab click = blur overlay → route skeleton → (often) dynamic-import skeleton → content.

**Doing one CRUD op (e.g. edit a component):** the drawer save is genuinely optimistic — local patch applied immediately (`ComponentLibraryManager.tsx:1197-1204`) — **but then calls `router.refresh()`**, which fires the global blur overlay again (`use-navigation-router.ts:26-29`) and re-runs the server component to re-fetch the entire library. A successful, instant-feeling edit flashes a whole-page reload a beat later (F7).

---

## B. Findings

### F4 🔴 — Overview skeleton is the wrong shape → guaranteed CLS on every cold load
`library/loading.tsx:6-21` renders a left grid of 8 card skeletons (`minmax(164px,1fr)`, `h-[236px]`) + a 312px right rail. The actual `LibraryOverview` (`LibraryOverview.tsx:230-298`) is a **single scrolling column**: a search row, a "Components" section, a "Templates" section, a health line — **no right rail.** The skeleton promises a two-pane app; the content is one centered column. (It's a copy of the Components skeleton, never re-shaped for Overview.)

### F1 🔴 — Tabs are server routes → every tab click is a full navigation
`LibraryTabsLayoutClient.tsx:10-29` defines tabs as `href`-backed `<Link>`s (`tab-strip.tsx:137-154`). Clicking unmounts the current panel, shows the overlay, mounts a new server-rendered route. A real "react app" would client-swap panels under a persistent shell with prefetched data. (Structural root cause; cross-ref `01 §A`, `04`.)

### F1/F2/F7 🔴 — Global blur overlay fires on tab clicks AND mutations, with a 250 ms floor
`route-loading-overlay.tsx:38-44` renders `fixed inset-0 z-[150] bg-white/25 backdrop-blur-md` over the whole app whenever `isNavigating`. Triggered by every internal `<a>` click (`navigation-listener.tsx:27-39`), every `push`/`replace` (`use-navigation-router.ts:14-25`), and every `refresh()` (`:26-29`). `MIN_DISPLAY_MS = 250` (`navigation-ui-store.ts:12,42-56`) holds the blur ≥¼s even for instant nav. The single most "not a react app" sensation.

### F5 🔴 — Templates tab shows THREE skeleton shapes in sequence
Navigating to Templates: `templates/loading.tsx:4-26` paints a **6-row list**; then `TemplatesBrowsePageClient`'s `dynamic()` fallback `TemplatesBrowseFallback` (`:15-45`) paints a **312px tree + 5 cards**; then `TemplatesBrowseManager` (`:765-813`) renders **tree + gallery + optional preview dock**. Three shapes, two snaps, for one tab. The route `loading.tsx` doesn't even resemble the eventual layout.

### F5 🟠 — Components tab: route skeleton → dynamic-import skeleton → content
`components/loading.tsx` (grid + rail) → `LibraryComponentsRoute` awaits the full library server-side → `LibraryPageClient` `dynamic()`-imports `ComponentLibraryManager` with `LibraryManagerFallback` (`LibraryPageClient.tsx:19-45`), another grid + rail skeleton. Two back-to-back skeletons (these two share a shape, so CLS is lower here).

### F7 🟠 — `router.refresh()` after optimistic mutation re-fires overlay + re-fetches everything
Every template mutation (`TemplatesBrowseManager.tsx:603,617,651,673,710,747`), component create/edit (`ComponentLibraryManager.tsx:1175,1203,1334,1409`), and editor edit (`use-template-editor.ts:76`) applies an optimistic local patch *then* calls `router.refresh()`. The user sees the blur overlay flash *after* a change they already saw, and the refresh re-runs the server component for a one-field change.

### F17 🟠 — Template editor: third nested loading state for the right Components dock
`TemplateEditorClient.tsx:241-262` gates the right `EstimateRightSidebar` on a client `useQuery` (`:121-125`); until it resolves it shows `TemplateEditorDockFallback` (`:26-42`). Entering the editor: overlay → `[templateId]/loading.tsx` → editor mounts with the dock still skeleton-ing while the library query runs → dock pops in late, shifting the center column width.

### F21 🟠 — No optimism on insert-into-estimate; modal blocks on three sequential round-trips
`InsertIntoEstimatePicker.tsx`: opening fires `listEstimateInsertTargets()` ("Loading projects…", `:159-162`); selecting fires `resolveEstimateTemplateInsertTarget` as a pre-check ("Checking group availability…", `:72-86`); submitting re-resolves a **third** time then inserts (`:122-135`). The button reads "Inserting template…" with no optimistic feedback (`:117-143`). Heavy for a "quick insert" verb.

### F22 🟡 — Template editor uses native `window.prompt`/`window.confirm`
`TemplateEditorClient.tsx:90,101,112` use OS dialogs for add/rename/delete node — blocking, un-themed, inconsistent with the in-DS `ConfirmDialog`/`ControlInput` text-prompt the *browse* manager already uses (`TemplatesBrowseManager.tsx:856-883`). A parity gap and a "not a react app" tell.

### F23 🟡 — Overview "Add component" CTA + health links are cross-route navigations
`LibraryOverview.tsx:210,243` — "Add component" just `router.push("/workshop/library/components")` (it does not open the add modal; the code even apologizes, `:240-242`), and every health stat is a `<Link>` to `…/components?freshness=stale` etc. (`:154-163`). So the home page's primary CTA and all drill-downs incur the full overlay → Components route skeleton → dynamic skeleton chain.

### F26 🟡 (a11y) — Overlay `aria-hidden`s the whole shell for ≥250 ms on every nav
`route-loading-overlay.tsx:17-29` sets `aria-hidden="true"` on `[data-workshop-page-shell-root]` while navigating. With the 250 ms floor, screen-reader users have the entire app hidden for ≥¼s on every tab click and every mutation refresh.

### F27 🟡 (a11y) — Tab strip not wired to its panels
`tab-strip.tsx` supports `idBase` for `aria-controls`/tabpanel wiring (`:32-43,135-136`), but `LibraryTabsLayoutClient.tsx:50` doesn't pass it. The `role="tab"` links have no `aria-controls`, and route content isn't a labeled `role="tabpanel"`. (Roving tabindex + arrow-key nav are correct — `tab-strip.tsx:96-125`.)

---

## C. Skeleton-flash count (one normal session)

Land on Library, visit each tab once, open one template, edit one component:

| Action | Distinct loading states |
|---|---|
| Cold land on `/library` (Overview) | shell auth await (blank) → `loading.tsx` (wrong shape) → content snap = **1 skeleton + 1 CLS snap** |
| Click Components | blur overlay → `components/loading.tsx` → `LibraryManagerFallback` → content = **1 overlay + 2 skeletons** |
| Click Templates | blur overlay → `templates/loading.tsx` (list) → `TemplatesBrowseFallback` (tree+cards) → content = **1 overlay + 2 skeletons + 1 shape snap** |
| Open a template | blur overlay → `[templateId]/loading.tsx` → editor mounts → dock `useQuery` fallback = **1 overlay + 2 skeletons** |
| Edit one component (Save) | optimistic apply (instant) → `router.refresh()` → **blur overlay flash** = **1 overlay** |

**Total: ~5 full-screen blur overlays + ~8 skeleton paints + ≥2 wrong-shape CLS snaps.** That is precisely "so slow, loading pages all over." **P0 target: ≤1 skeleton (first cold load) + 0 overlays for intra-Library nav/mutations** (`00 §acceptance`).

---

## D. What's already good

- **Genuine optimistic UI with rollback exists** for editor edits (`use-template-editor.ts:64-88`), browse mutations (`TemplatesBrowseManager.tsx:608-759`), component create/edit (`ComponentLibraryManager.tsx:1166-1204`). Only the trailing `router.refresh()` (F7) spoils it — the local update itself is instant.
- **Skeletons have correct `role="status"` + `aria-label` + `sr-only` + `aria-hidden` on decorative bodies** across all four `loading.tsx`.
- **Empty states are thoughtful** — dedicated empty-workspace two-up (`LibraryOverview.tsx:250-254`), per-section empties, gallery distinguishes "no templates" vs "none in group" vs "no match" (`TemplateGallery.tsx:283-328`).
- **Error boundaries exist on all four segments** with a shared on-brand retry card (`WorkshopRouteErrorState.tsx`).
- **Heavy components are code-split** via `dynamic()`.
- **Focus management on drawer/modal close** (`ComponentLibraryManager.tsx:1159-1164,1189-1194`; `TemplatesBrowseManager.tsx:575-585`) and full roving-tabindex tab nav.
- **Save state announced** via `aria-live="polite"` (`LibraryTitleBarClient.tsx:49-62`; `TemplateGallery.tsx:246-263`).

---

## E. The "doesn't feel like a react app" root cause, precisely

It is **not** missing optimism (that mostly exists). It is three structural choices that make routine interactions look like full page loads:
1. **Tabs are server routes** instead of client-swapped panels under a persistent shell (F1) — cross-ref `04 §unlock`.
2. **A global full-screen blur overlay** fires on every link click, push, and refresh, with a 250 ms floor (F1/F2), and re-fires after optimistic mutations (F7).
3. **Stacked, mismatched skeletons** (route `loading.tsx` → dynamic fallback → content), several the wrong shape (F4, F5).

The `07` plan fixes all three at P0.
