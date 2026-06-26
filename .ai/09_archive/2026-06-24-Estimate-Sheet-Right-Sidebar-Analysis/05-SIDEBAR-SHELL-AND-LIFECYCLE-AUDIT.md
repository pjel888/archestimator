# 05 — Sidebar Shell and Lifecycle Audit

## Dynamic import + chunk loading

**Evidence**: `EstimateSheetContent.tsx:59-65`:
```ts
const EstimateRightSidebar = dynamic(
  () => import("./component-library").then((mod) => mod.EstimateRightSidebar),
  { ssr: false, loading: () => <ComponentLibrarySidebarFallback isError={false} /> },
);
```

- **SSR**: disabled (`ssr: false`) — the sidebar chunk loads only on the client.
- **Fallback**: `ComponentLibrarySidebarFallback` renders a skeleton with retry capability.
- **Center sheet usability during load**: ✅ — the fallback reserves the panel width, and the center sheet renders independently. No layout shift.
- **Chunk splitting**: The sidebar code is in a separate chunk from the sheet content. The `AddComponentModal` is a **nested** dynamic import (`index.tsx:129-131`), so its chunk loads only when the user clicks "Add Component".

## Lazy library-data query (U4/U18)

**Evidence**: `EstimateSheetContent.tsx` uses React Query to load `loadProjectComponentLibraryLite(projectId)` when no server-provided `libraryItems` prop exists.

- **Query key**: `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)` — workspace + project scoped, preventing cross-project cache contamination.
- **Cache reuse on remount**: ✅ — test at `estimate-sheet-library-lazy-load.test.tsx:129-135` verifies the query is NOT re-fetched on remount when the cache is warm.
- **refetchOnMount**: false. **staleTime**: 5 minutes.
- **Retry**: standard React Query retry (disabled in tests via `retry: false`).
- **Error surface**: visible error banner with "Retry" button. Test at line 138-158 verifies the sheet stays editable while the sidebar errors.

## Stored-preference hydration

**Evidence**: `index.tsx:966-968` (comment):
```ts
// Initial state must not read localStorage: SSR renders the fallbacks, so a
// storage-aware initializer makes the client's first render diverge and
// throws a hydration mismatch. Stored prefs apply in the mount effect below.
```

- **Hydration-safe**: ✅ — initial state uses defaults; stored prefs apply in `useEffect` after mount.
- **Write timing**: prefs are written to localStorage on every change (debounced via React's batching).
- **Storage unavailable**: `safeSetJsonStorage` (`helpers.ts:102-111`) catches `QuotaExceededError` and logs a warning; does not crash.
- **Cross-tab sync**: **NOT implemented** — `storage` event listener not present. Preferences set in one tab do not sync to another open tab of the same estimate.

## Panel resize

**Evidence**: `ResizableSidePanel.tsx`

- **Mouse resize**: `startResize` (line 110) attaches `mousemove`/`mouseup` listeners to `window`. On mouseup: `persistPanelWidth` writes to both `localStorage` and a cookie.
- **Keyboard resize**: `handleResizeKeyDown` (line 151) — Arrow keys (12px step, Shift=32px), Home/End (min/max). `role="separator"`, `aria-orientation`, `aria-valuemin/max/now`.
- **Listener cleanup**: `window.removeEventListener` is called in the `onUp` handler. ✅
- **Body cursor/selection**: `document.body.style.cursor = "col-resize"` and `userSelect = "none"` set on drag start, restored on mouseup. ✅
- **Window blur during resize**: **NOT handled** — if the window loses focus during a drag, `mouseup` may never fire, leaving the body cursor stuck. The `dragging.current` ref stays true. **Low severity** — any subsequent click resets it.
- **CSS variable sync**: `--estimate-library-panel-width` is set on `document.documentElement` and the `[data-workshop-page-shell-canvas]` element (line 93-108), enabling CSS-only layout without JS measurement.

## Panel collapse

**Evidence**: `ResizableSidePanel.tsx:70` — `const [collapsed, setCollapsed] = useState(false)`

- **Collapsed state**: **NOT persisted** — `collapsed` is plain React state, not written to localStorage or cookie. Refresh always starts expanded.
- **Focus management on collapse**: `aria-hidden={collapsed}` on the `<aside>`. No explicit focus restoration — focus may strand in hidden content if the user collapsed via keyboard while a child had focus. **Minor accessibility defect.**
- **Collapsed width**: `collapsedWidth = 32` (default) — shows only the toggle button.

## Below-desktop breakpoint

**Evidence**: `ResizableSidePanel.tsx:74,77,234`:
```ts
const compactViewport = useMediaQuery("(max-width: 1023px)");
const responsiveWidth = compactViewport ? 0 : actualWidth;
// ...
<div className="group hidden h-full shrink-0 overflow-hidden lg:flex" style={panelStyle}>
```

- **Below 1024px**: the entire panel is `display: none` (Tailwind `hidden lg:flex`). Width is 0.
- **Alternative mobile entry point**: **NONE** — there is no drawer, sheet, or dialog that surfaces the sidebar feature on mobile/tablet.
- **Intentional?**: Likely yes for a desktop-first estimating tool. But it means the feature is completely inaccessible on tablet. See **Finding F-12**.

## Cookie ↔ localStorage width sync

**Evidence**: `persistPanelWidth` (line 50-55) writes to BOTH `localStorage[storageKey]` and `document.cookie`. `getInitialWidth` (line 30-44) reads from the **cookie** (not localStorage).

- **Can they disagree?**: Yes — if localStorage is cleared but the cookie persists (or vice versa), the initial width reads from the cookie. On the next resize, both are overwritten to the same value. Low severity — self-healing on next interaction.
- **Why both?**: The cookie is readable server-side (for SSR layout); localStorage is the primary client-side store. Since `ssr: false`, the cookie is technically unused for this panel, but kept for consistency with other panels.

## Remount behavior

- **Tab switch (within sidebar)**: state survives (single component instance, tab is client state).
- **Estimate switch**: sidebar unmounts and remounts (different route). All local state is lost; React Query cache may persist if the workspace/project scope hasn't changed.
- **Project switch**: full remount. Cache scoped by workspace+project, so switching projects triggers a fresh lazy load.
- **Strict Mode**: the lazy-load query may fire twice in development (React Strict Mode double-invokes effects). Production: single fetch. Query deduplication handles this correctly.

## Project/estimate switching

- **Props reconciliation**: `syncedTemplatesPropRef` (line 969, 1200-1207) reconciles the templates prop when it changes (e.g., from a cache invalidation on another surface), preserving local optimistic appends.
- **libraryItems**: seeded once from `initialLibraryItems` and then evolves locally. **Does NOT reconcile** when the prop changes after mount — this is why local-only deletes persist visually until remount.
