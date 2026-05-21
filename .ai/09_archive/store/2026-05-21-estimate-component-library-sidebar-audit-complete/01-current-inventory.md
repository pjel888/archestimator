# Component Library Right Sidebar — Capability Matrix (Second Pass)

**Date:** 2026-05-21
**Auditor:** Claude (second pass, building on Kimi's initial audit)
**Scope:** `src/components/workshop/component-library/*` + `EstimateSheetContent.tsx` + `EstimateSheetTree.tsx` + `use-estimate-workspace-state.ts`
**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`

---

## 1. Architecture Overview (Corrected)

The Component Library sidebar is a **sibling component** at the page level — not a child of `EstimateSheetContent`. The page (`page.tsx` line 41-43) renders three flat siblings:

```tsx
<section className="flex h-full min-h-0 overflow-hidden bg-white">
  <EstimateSheetTree ... />
  <EstimateSheetContent ... />
  <EstimateRightSidebar />
</section>
```

`EstimateSheetContent` **re-exports** `EstimateRightSidebar` (from `./component-library`) for import convenience only — there is NO parent-child relationship, NO prop threading, and NO React context shared between them. Communication is entirely via:

1. **Window CustomEvent** `archestimator:add-library-item` — sidebar dispatches, `EstimateSheetContent` listens
2. **Zustand store** `useEstimateWorkspaceState` — tree and content share selection state; sidebar does NOT access it
3. **Drag-and-drop** via HTML5 `DataTransfer` — `application/x-archestimator-library-item`

`EstimateRightSidebar` has zero awareness of which tree node is selected. The `onInsertComponent` prop on its signature exists only for tests — the production page never passes it.

### File map (corrected)

| File | Responsibility |
|------|---------------|
| `page.tsx` | Renders all three panes as flat siblings |
| `component-library/index.tsx` | Main sidebar (`EstimateRightSidebar`). All local state, search/filter/group/sort/preview/create/delete. |
| `component-library/ComponentCard.tsx` | `LibraryItemCard` — stateless presentational card in 3 view modes. Drag start, action buttons. |
| `component-library/NewComponentForm.tsx` | Fully controlled modal form for creating custom components. 14 fields. |
| `component-library/types.ts` | Type definitions: filters, groupBy, viewMode, sortMode, form, facets. |
| `component-library/helpers.ts` | 19 pure functions + localStorage I/O. Search scoring, filtering, sorting, grouping, image inference, discipline inference. |
| `ResizableSidePanel.tsx` | Generic resize/collapse shell. Sets CSS vars `--estimate-library-panel-width` / `--estimate-tree-panel-width`. |
| `EstimateSheetContent.tsx` | Center sheet. Hosts `insertLibraryItem`, event listener, `pendingFocusRowId` focus logic, row CRUD. |
| `EstimateSheetTree.tsx` | Left tree. Uses `useEstimateWorkspaceSelection` to share selection via Zustand. |
| `use-estimate-workspace-state.ts` | Zustand store: `selectedNodeIdByEstimateId`, `expandedNodeIdsByEstimateId`. |
| `estimate-tree-data.ts` | Seed data: 66 library items, tree structure, types. |

---

## 2. Complete State Inventory

### 2.1 `EstimateRightSidebar` state (index.tsx)

| Variable | Type | Init | Has Setter? | Persisted? |
|----------|------|------|-------------|------------|
| `prefs` | `{viewMode?, groupBy?, sortMode?}` | `useMemo(readLibraryPreferences)` — once | No (computed) | Read from localStorage |
| `recentIds` | `string[]` | Lazy init from localStorage | ✅ `setRecentIds` | Written in `addComponent` |
| `libraryItems` | `EstimateRowItem[]` | Lazy init: seed data enriched with favorites/recents/discipline/designation/tags | ✅ `setLibraryItems` | Indirectly via favorites/recents keys |
| `searchQuery` | `string` | `""` | ✅ `setSearchQuery` | No |
| `filters` | `ComponentFilters` | `defaultFilters` | ✅ `setFilters` | No |
| `groupBy` | `LibraryGroupBy` | `prefs.groupBy ?? "category"` | ✅ `setGroupBy` | ✅ (via prefs effect) |
| `viewMode` | `LibraryViewMode` | `prefs.viewMode ?? "compact"` | ❌ **NO SETTER** | Written to localStorage but NEVER changes after mount |
| `sortMode` | `LibrarySortMode` | `prefs.sortMode ?? "relevance"` | ❌ **NO SETTER** | Written to localStorage but NEVER changes after mount |
| `showFilters` | `boolean` | `false` | ✅ `setShowFilters` | No |
| `previewItemId` | `string \| null` | `null` | ✅ `setPreviewItemId` | No |
| `showNewComponent` | `boolean` | `false` | ✅ `setShowNewComponent` | No |
| `form` | `NewComponentFormType` | `defaultForm` | ✅ `setForm` | No |
| `formError` | `string` | `""` | ✅ `setFormError` | No |
| `deleteCandidate` | `EstimateRowItem \| null` | `null` | ✅ `setDeleteCandidate` | No |
| `collapsedGroups` | `Set<string>` | `new Set()` | ✅ via `toggleGroup` | No |
| `searchRef` | `HTMLInputElement \| null` | `useRef(null)` | Mutable ref | No |

**CRITICAL BUG:** `viewMode` and `sortMode` are `useState` with no setter extracted. They are frozen at mount time. The `HeaderIconToolbar` `onGroup` handler only toggles between `"category"` and `"supplier"` — it never uses `"none"`, `"discipline"`, `"room"`, or `"recent"`. The localStorage sync `useEffect` writes them but they can never change, making the effect largely useless for viewMode/sortMode.

### 2.2 `EstimateSheetContent` state (coordination)

| Variable | Type | Source |
|----------|------|--------|
| `estimateTree` | `EstimateTreeNode[]` | `useState(queriedEstimateTree)` — local copy, sync'd via `queryClient.setQueryData` |
| `editableRows` | `Record<string, EditableRowValue>` | `useState` — initialized from tree, mutated optimistically |
| `pendingFocusRowId` | `string` | `useState("")` — set after insert, consumed by focus effect |
| `insertTargetNodeId` | `string` | Derived: `selectedNode?.kind === "area" ? selectedNode.id : ""` |
| `selectedNode` | `EstimateTreeNode \| null` | Via `resolveEstimateWorkspaceSelection` using Zustand store |
| `projectTotal` | `number` | Derived from `estimateTree.reduce(...)` |

### 2.3 Zustand store (`use-estimate-workspace-state.ts`)

| Field | Type |
|-------|------|
| `selectedNodeIdByEstimateId` | `Record<string, string \| null>` |
| `expandedNodeIdsByEstimateId` | `Record<string, string[] \| undefined>` |
| `setSelectedNodeId(estimateId, nodeId)` | Setter with equality check |
| `setExpandedNodeIds(estimateId, nodeIds)` | Setter with equality check |

The store is keyed by estimate ID, so multiple estimate tabs could theoretically share it. `resetEstimateWorkspaceState()` clears all state.

---

## 3. All useEffect Hooks (with bugs)

### Effect 1: Persist Preferences (index.tsx ~line 337)

```tsx
useEffect(() => {
  localStorage.setItem(LIBRARY_PREFS_KEY, JSON.stringify({ viewMode, groupBy, sortMode }));
}, [viewMode, groupBy, sortMode]);
```

**Bugs:**
- No try/catch — `localStorage.setItem` can throw (incognito, full storage, disabled)
- Fires on mount unnecessarily — `viewMode` and `sortMode` never change, so this effect only fires when `groupBy` toggles

### Effect 2: Global Keyboard Shortcuts (index.tsx ~line 341)

```tsx
useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && ...) {
      event.preventDefault();
      searchRef.current?.focus();
    }
    if (event.key === "Escape") {
      if (showFilters) setShowFilters(false);
      else if (searchQuery) setSearchQuery("");
      else if (previewItemId) setPreviewItemId(null);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [searchQuery, showFilters, previewItemId]);
```

**Bugs:**
- **Incomplete Escape cascade:** `deleteCandidate` is not in the cascade. If the delete confirmation dialog is open, Escape does nothing — user is trapped.
- **`/` fires behind modal:** When the New Component modal is open and inputs are focused, the `/` guard correctly prevents focus-stealing. But if the modal is open and focus is on the backdrop (e.g., user clicked scrim), `/` would focus the search bar *behind* the modal. Should check `showNewComponent`.
- **Re-registers on every keystroke:** `searchQuery` is in the dependency array. Every typed character re-attaches the listener. This is functionally correct (closures capture the latest values) but wasteful.

### Effect 3: Sync queried tree to local state (EstimateSheetContent ~line 867)

```tsx
useEffect(() => {
  if (saveState === "dirty" || saveState === "saving") return;
  queueMicrotask(() => {
    setEstimateTreeState(queriedEstimateTree);
    setEditableRows(collectEditableRows(queriedEstimateTree));
  });
}, [queriedEstimateTree, saveState]);
```

Guards against overwriting local edits while a save is in progress. Uses `queueMicrotask` for timing. Fine.

### Effect 4: Focus pending row (EstimateSheetContent ~line 881)

```tsx
useEffect(() => {
  if (!pendingFocusRowId) return;
  window.requestAnimationFrame(() => {
    const quantityInput = document.querySelector<HTMLInputElement>(
      `[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`
    );
    quantityInput?.focus();
    quantityInput?.select();
    setPendingFocusRowId("");
  });
}, [pendingFocusRowId]);
```

**Bugs:**
- **No retry/fallback:** If the DOM isn't ready when rAF fires (tree collapsed, slow render), focus is silently lost
- **Rapid-insert race:** Two rapid inserts before rAF → only the last `pendingFocusRowId` survives (React batches state updates)
- **Query selector fragility:** Depends on specific `data-` attributes being present on the quantity input

### Effect 5: Event listener for sidebar inserts (EstimateSheetContent ~line 929)

```tsx
useEffect(() => {
  function handleSidebarAdd(event: Event) {
    const customEvent = event as CustomEvent<EstimateRowItem>;
    if (customEvent.detail && insertTargetNodeId) insertLibraryItem(insertTargetNodeId, customEvent.detail);
  }
  window.addEventListener("archestimator:add-library-item", handleSidebarAdd);
  return () => window.removeEventListener("archestimator:add-library-item", handleSidebarAdd);
}, [insertLibraryItem, insertTargetNodeId]);
```

Re-registers when `insertLibraryItem` or `insertTargetNodeId` change. This is correct — stale closures would be dangerous here.

### Effect 6: CSS custom property sync (ResizableSidePanel ~line 56)

Syncs `--estimate-tree-panel-width` or `--estimate-library-panel-width` to `document.documentElement`. Consumed by other components for boundary math. Fine.

---

## 4. All useMemo / useCallback (with concerns)

### useMemo (3 in sidebar)

| Memo | Dependencies | Concern |
|------|-------------|---------|
| `prefs` | `[]` | Stable — reads once |
| `favoriteIds` | `[libraryItems]` | Recomputes on every add/toggle/delete. For 66 items this is negligible. |
| `facets` | `[libraryItems]` | Recomputes 5 `unique()` calls on every library mutation. Negligible at current scale. |
| `filteredSortedItems` | `[libraryItems, filters, favoriteIds, recentIds, searchQuery, sortMode]` | **No debounce on searchQuery** — entire pipeline runs on every keystroke. For 66 items this is fast enough, but worth noting for scale. |
| `groupEntries` | `[filteredSortedItems, groupBy, recentIds]` | Fine. |

### useCallback (8 in sidebar)

| Callback | Dependencies | Concern |
|----------|-------------|---------|
| `persistFavorites` | `[]` | Stable ref — correct |
| `addComponent` | `[recentIds, onInsertComponent]` | Recreates when recents change (every insert). Causing unnecessary re-renders if passed as prop (but it's not — only called inline) |
| `duplicateItem` | `[]` | Stable ref — correct |
| `toggleFavorite` | `[persistFavorites]` | Stable ref (persistFavorites is stable) — correct |
| `removeFacet` | `[]` | Stable ref — correct |
| `saveNewComponent` | `[form, addComponent]` | Recreates when form changes (every keystroke in the modal form). This is fine since the form modal is isolated. |
| `toggleGroup` | `[]` | Stable ref — correct |
| `toggleArray` (in FilterPanel) | `[onChange]` | Since `onChange` is `setFilters`, this is stable |

---

## 5. Feature Inventory (complete)

### 5.1 Panel Chrome

| Feature | Status | Detail |
|---------|--------|--------|
| Resizable width | ✅ | Mouse drag, persisted to localStorage as `estimate_component_library_width_v2` |
| Collapse/expand toggle | ✅ | Via `ResizableSidePanel` |
| Min 360px / Max 560px / Default 380px | ✅ | Enforced by resizer |
| CSS variable export | ✅ | `--estimate-library-panel-width` on `document.documentElement` |
| Internal min-width guard | ✅ | `min-w-[320px]` on the inner `<aside>` |

### 5.2 Search

| Feature | Status |
|---------|--------|
| Text search input (shared `SearchInput` primitive) | ✅ |
| Clear button | ✅ |
| Keyboard shortcut `/` to focus search (guards against INPUT/TEXTAREA focus) | ✅ |
| Search highlight in card titles (via `HighlightMatch`) | ✅ |
| Search ranking: exact=1000, prefix=800, contains=650, supplier/category=520, discipline/designation/unit=430, description/tags/notes=300 | ✅ |
| Empty search state ("No components matched" + clear action) | ✅ |
| No debounce on search input | ⚠️ Acceptable at 66 items |
| No search-as-you-type server fetch | N/A (all local) |

### 5.3 Filtering

| Feature | Status |
|---------|--------|
| Category multi-select chips | ✅ |
| Supplier multi-select chips | ✅ |
| Discipline multi-select chips | ✅ |
| Designation multi-select chips | ✅ |
| Unit multi-select chips | ✅ |
| Min/Max price range (two decimal inputs, raw `<input>` not `ControlInput`) | ✅ |
| Favorites only toggle chip | ✅ |
| Recent only toggle chip | ✅ |
| Custom only toggle chip | ✅ |
| Image state: all / has / none | ✅ |
| Supplier state: all / has / none | ✅ |
| Active filter chips (removable) in sticky header | ✅ |
| Clear all filters + search button | ✅ |
| Filter panel toggle (via Filter toolbar button) | ✅ |
| Filter panel keyboard dismiss (Escape) | ✅ |
| Dynamic facets from library items | ✅ |

### 5.4 Grouping

| Feature | Status | Detail |
|---------|--------|--------|
| Group by category (default) | ✅ | |
| Group by supplier | ✅ | |
| Group by discipline | ❌ | Type supports it, UI never calls it |
| Group by room | ❌ | Type supports it, UI never calls it |
| Group by recent | ❌ | Type supports it, UI never calls it |
| Group none | ❌ | Type supports it, UI never calls it |
| Toggle: only category ↔ supplier | ⚠️ | `onGroup` toggles binary; other 4 modes unreachable |
| Group collapse/expand (per-group) | ✅ | `collapsedGroups` Set state |
| Group item count badge | ✅ | |

### 5.5 Sorting

| Feature | Status | Detail |
|---------|--------|--------|
| Relevance (default, uses search score) | ✅ | |
| Name (alphabetic) | ✅ | |
| Price ascending | ✅ | |
| Price descending | ✅ | |
| Supplier | ✅ | |
| Recently used | ✅ | |
| Recently added | ✅ | |
| Sort UI control | ❌ | No dropdown, no toggle. `sortMode` frozen at mount. |

### 5.6 View Modes

| Feature | Status | Detail |
|---------|--------|--------|
| Compact list view (default) | ✅ | Small thumb, name, supplier, price |
| Detailed list view | ✅ | Larger thumb, description, badges |
| Grid view (2-column, image-forward) | ✅ | |
| View mode persistence | ✅ | Saved to localStorage |
| View mode UI toggle | ❌ | No control. `viewMode` frozen at mount. |

### 5.7 Component Cards (LibraryItemCard)

| Feature | Status |
|---------|--------|
| Drag to estimate sheet (`application/x-archestimator-library-item` + `text/plain`) | ✅ |
| `effectAllowed: "copy"` (library → estimate is a copy, not move) | ✅ |
| Click to preview | ✅ |
| Keyboard preview (Enter/Space via `handlePreviewKeyDown`) | ✅ |
| Add button (+) with `stopPropagation` | ✅ |
| Favorite toggle (heart icon, filled/outlined, accent color) | ✅ |
| More actions dropdown (native `<details>/<summary>`: Edit/Duplicate/Delete) | ✅ |
| Selection highlight ring (`border-accent ring-1 ring-accent`) | ✅ |
| Hover shadow + action button reveal | ✅ |
| Focus-visible ring (`ring-2 ring-focus ring-offset-2`) | ✅ |
| Three view mode layouts | ✅ |
| No drag ghost image customization | ❌ |
| No touch drag support (`onTouchStart`/`onTouchMove`) | ❌ |
| Native `<details>` may not close reliably outside click | ⚠️ |
| Cards use `role="button"` on `<div>` instead of `<button>` element | ⚠️ |
| No `role="list"` / `role="listitem"` on card container | ⚠️ |

### 5.8 Preview Panel

| Feature | Status |
|---------|--------|
| Image thumbnail (56×56, bg-image CSS) | ✅ |
| Name, supplier, category | ✅ |
| Price/unit (mono, tabular-nums) | ✅ |
| Description (line-clamp-3) | ✅ |
| Discipline + designation badges | ✅ |
| Custom badge (accent tone) | ✅ |
| Tags badges | ✅ |
| Add / Duplicate / Favorite / Delete buttons | ✅ |
| Source URL link | ✅ |
| Notes display | ✅ |
| Close button (X) | ✅ |
| No pricing date or source shown | ❌ |
| No confidence/staleness indicator | ❌ |

### 5.9 Component CRUD

| Feature | Status | Detail |
|---------|--------|--------|
| Create custom (modal form, 14 fields) | ✅ | |
| Save & Add (create + immediate insert) | ✅ | |
| Duplicate (new ID, "copy" suffix, isCustom:true) | ✅ | |
| Delete custom (with confirmation dialog, `role="alertdialog"`) | ✅ | |
| Delete only from local view; estimate rows unchanged | ✅ | Correct for current architecture |
| Local favorites persistence | ✅ | `archestimator_component_library_favorites_v1` |
| Local recents persistence (max 12) | ✅ | `archestimator_component_library_recents_v1` |
| Local preferences persistence | ✅ | `archestimator_component_library_preferences_v1` |
| Form validation: required material/category/unit; non-negative itemCost | ✅ | |
| No true "edit" (preview is read-only; must duplicate+delete to change) | ❌ | |
| No undo on delete | ❌ | |
| No cross-tab sync (no `storage` event listener) | ❌ | |
| No image upload (URL text field only) | ❌ | |

### 5.10 Integration with Estimate Sheet

| Feature | Status | Detail |
|---------|--------|--------|
| `onInsertComponent` prop (typed, optional) | ✅ | Only used in tests; never passed in production |
| Window event fallback | ✅ | `archestimator:add-library-item` CustomEvent |
| Event listener in `EstimateSheetContent` | ✅ | Guards: `detail && insertTargetNodeId` |
| Insert target derived from tree selection | ✅ | `selectedNode.kind === "area"` guard |
| Recents updated on insert | ✅ | |
| `lastUsedAt` updated on insert | ✅ | Set to `new Date().toISOString()` |
| Silent failure: event dispatched but `insertTargetNodeId` is `""` | ❌ | No feedback to user |
| Sidebar has zero selection awareness | ❌ | No access to Zustand store |
| `pendingFocusRowId` set after insert | ✅ | But fragile (see Effect 4 bugs) |
| No insert success/failure callback to sidebar | ❌ | Sidebar can't auto-close preview on success |

---

## 6. Data Model

### Library item shape (`EstimateRowItem`) — seeded from `estimateLibraryItems`

Key fields: `id`, `material`, `name?`, `description?`, `supplier?`, `source?`, `unit`, `itemCost`, `price?`, `currency?`, `quantity`, `subTotal`, `supplementaryCosts?`, `laborCost?`, `laborCostDefault?`, `otherCostDefault?`, `totalItemCosts`, `imageUrl?`, `category?`, `discipline?`, `designation?`, `tags?`, `sku?`, `sourceUrl?`, `notes?`, `isFavorite?`, `isCustom?`, `createdAt?`, `updatedAt?`, `lastUsedAt?`, `pricingSource?`, `pricingDate?`

### Seed data: 66 items

**Category distribution:** Furniture (9), Plumbing Fixtures (12), Kitchen Fixtures (3), Lighting Fixtures (8), Electrical Fixtures (4), Wall Paints/Interior Finishes (9), Finishes (~22), Outdoor (2), Cabinetry (1)

**Data quality issues:**
- Only 9 items explicitly set `discipline`, `designation`, `tags` — the rest rely on inference functions with known bugs
- All `pricingDate` values are `"2026-05-17"` or `"2026-05-18"` — fixed demo dates, not relative
- The `row()` factory applies `componentThumbnailUrls[id]` as priority — explicit `imageUrl` fields in seed data are silently overridden
- Missing categories: Hardware, Appliances, Doors/Windows, Glass/Mirrors, Waterproofing, Insulation

### Persistence keys

| Key | Data | Migration |
|-----|------|-----------|
| `archestimator_component_library_preferences_v1` | `{viewMode, groupBy, sortMode}` | No version check |
| `archestimator_component_library_favorites_v1` | `string[]` of IDs | No version check |
| `archestimator_component_library_recents_v1` | `string[]` of IDs (max 12) | No version check |
| `estimate_component_library_width_v2` | Panel width px | v2 suffix but no migration path for v1 |

---

## 7. Helper Functions — Quality Audit

### Search (`searchComponents`)
- Scoring weights: exact=1000, prefix=800, contains=650, supplier/category=520, discipline/designation/unit=430, description/tags/notes=300
- `normalizeForSearch` lowercases+trims only — no diacritic handling
- Full `.map().filter().sort()` on every search query change (no debounce)
- Good: stable tiebreaking via original `index`

### Filter (`filterComponents`)
- AND logic across all filter dimensions
- Boolean toggles (favoritesOnly, recentOnly, etc.) are additional AND clauses
- Price range filter uses `parseFloat` which silently returns NaN for invalid input → treated as no filter
- Image/supplier state filters correctly handle "all"/"has"/"none"

### Sort (`sortComponents`)
- All 7 modes implemented
- `relevance` uses search score (from searchComponents), falling back to name
- Stable sort using `index` as tiebreaker

### Group (`groupComponents`)
- Filters out empty groups
- `"room"` groupBy groups by item's `material` (not actually room — misleading name)
- `"recent"` groupBy puts recent items in "Recently Used" group, others in "All"

### Image inference (`getComponentImageUrl`)
- Falls back through: local thumbnail → explicit imageUrl → material-based pattern matching → category-based fallback → generic grid image
- **Bug:** `item.material.toLowerCase()` crashes if material is undefined (though typed as required)
- **Bug:** `material.includes("paint")` matches "wall paints" false positively

### Discipline inference (`getComponentDiscipline`)
- 4-level nested ternary chain — unreadable
- Case-sensitive includes — `"electrical"` won't match `"Electrical"`
- "Cabinetry" and "Outdoor" both default to "Architectural" (likely wrong)

### Designation inference (`getComponentDesignation`)
- Everything not containing "light" or "wall" defaults to "Floor"
- A dining table, sofa, faucet, sink all become "Floor"
- `"light"` substring matches "lighting", "light switch", "sunlight"

### Date helpers
- `itemCreatedAt`: Falls back to hardcoded `"2026-05-17"` — silently fabricates dates
- `itemLastUsedAt`: Returns `new Date().toISOString()` if item is in recents — changes every render

### localStorage helpers
- `readJsonStorage<T>`: SSR-safe, try/catch for JSON parse errors
- Writes (`setItem`): NO try/catch in any write operation
- `LIBRARY_RECENTS_KEY` write in `addComponent` — unguarded
- `LIBRARY_FAVORITES_KEY` write in `persistFavorites` — unguarded
- `LIBRARY_PREFS_KEY` write in useEffect — unguarded

---

## 8. Cross-Surface Communication Audit

### Communication diagram (corrected)

```
┌──────────────────┐       ┌─────────────────────────┐       ┌────────────────┐
│  LEFT TREE       │       │  CENTER SHEET           │       │  RIGHT LIBRARY │
│                  │       │                         │       │                │
│  Zustand store:  │──R/W─→│  Zustand store:         │       │  No store      │
│  selectedNodeId  │       │  selectedNodeId         │       │  access        │
│  expandedNodeIds │       │  derive insertTarget    │       │                │
│                  │       │                         │       │                │
│                  │       │  Event listener:        │←──────│  Dispatches:   │
│                  │       │  archestimator:add-     │ event │  archestimator:│
│                  │       │  library-item           │       │  add-library-  │
│                  │       │                         │       │  item          │
└──────────────────┘       └─────────────────────────┘       └────────────────┘
         │                            │                              │
         └── Router.push ────────────→│                              │
            (on node click)           │                              │
```

### Missing wires

| From | To | What should flow |
|------|-----|-----------------|
| Zustand store | Right Library | `selectedNodeId`, `selectedNodeKind`, `selectedNodeName` |
| Center Sheet | Right Library | `insertSuccess` / `lastInsertedRowId` |
| Right Library | Center Sheet | Direct `onInsertComponent` callback (exists but unused in prod) |
| Right Library | Left Tree | Insert success → auto-expand target area |

### Window events used across the workspace

| Event | Dispatcher | Listener | Purpose |
|-------|-----------|----------|---------|
| `archestimator:add-library-item` | `EstimateRightSidebar.addComponent` | `EstimateSheetContent` | Insert library item |
| `archestimator:project-total-change` | `EstimateSheetContent` | `ProjectTotalHeader` | Sync running total |
| `archestimator:project-budget-change` | `ProjectTotalHeader` | `ProjectTotalHeader` | Sync budget |
| `archestimator:project-estimate-metadata-change` | `ProjectEstimateMetadataPublisher` | `ProjectEstimateMetadataStrip` | Sync metadata |

---

## 9. Accessibility Audit

### Compliant
- `aria-label` on search, toolbar, panel, all card action buttons
- `aria-expanded` on group headers and panel toggle
- `aria-hidden` on decorative icons
- `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby` on Modal
- `role="alertdialog"`, `aria-modal` on delete confirmation
- Focus-visible rings on cards and buttons
- Keyboard shortcut `/` for search, Escape for layer dismissal

### Non-compliant / Improvements needed
- Cards use `role="button"` on `<div>` — should be `<button>` element
- No list semantics: no `role="list"` on group container, no `role="listitem"` on cards
- No arrow-key navigation between cards (roving tabindex)
- Escape doesn't dismiss delete confirmation dialog
- No `aria-live` region for insert confirmations or errors
- No focus management: modal opens don't move focus, dialog opens don't move focus
- Native `<details>/<summary>` behavior is inconsistent across assistive technologies
- No skip link to sidebar

---

## 10. Performance Profile

- Local data (66 items, in-memory search/filter/sort) — no server round-trips for search
- No debounce on search input — but at 66 items, the full pipeline is sub-millisecond
- `facets` recomputes on every `libraryItems` change — negligible at 66 items
- No virtualization — all 66 cards rendered into DOM even when collapsed
- CSS background-images for thumbnails — no lazy loading needed (local images)
- `useMemo` covers the expensive pipeline; `useCallback` covers handlers

**Scaling concerns:** If the library grows to 1000+ items, search debounce + virtualization would be needed. At current scale, performance is not an issue.
