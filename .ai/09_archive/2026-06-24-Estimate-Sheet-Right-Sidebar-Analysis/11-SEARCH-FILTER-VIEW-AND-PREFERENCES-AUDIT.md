# 11 — Search, Filter, View, and Preferences Audit

## Search

### Library/Project search
- **Trigger**: toolbar magnifier toggle (or `/` shortcut)
- **Disclosure**: dropdown `SearchInput` panel from `TreePanelHeader`
- **Deferred filtering**: `useDeferredValue` wraps the query so typing stays responsive
- **Scope**: name, supplier, brand, category, unit, description, pricingSource, pricingDate, confidence, categoryPath (via `matchesQuery` in `helpers.ts`)
- **Normalization**: `.toLowerCase()` — case-insensitive. No diacritic normalization.
- **Unicode/IME**: standard input events; no special IME handling. Enter during IME composition submits normally.
- **Expansion during search**: active search reveals all matches (expands all folders). Clearing search restores stored expansion. ✅
- **No-result state**: empty tree (no "No matches" message — verified by test at `component-library-ui.test.tsx:748-754`)
- **Persistence**: NOT persisted (resets on tab switch / unmount)

### Project-source server search
- See [09-REUSABLE-PROJECT-SOURCES-AUDIT.md](./09-REUSABLE-PROJECT-SOURCES-AUDIT.md)
- **Race condition**: Finding F-04

### Command palette
- `CommandPalette` — `Cmd+K`-style overlay (not currently wired to a keyboard shortcut in the sidebar; exists as a separate component)
- Limits results to 10, sorted by relevance score
- Enter inserts, Shift+Enter inserts and keeps open

## Facets

### Component facet filter
- **Popover**: `ComponentFacetFilterPopover` using shared `FilterPopover`
- **Facets**: Lifecycle, Confidence, Pricing freshness, Supplier, Brand
- **Options**: built dynamically from current dataset via `buildComponentFacetOptions`
- **NO_SUPPLIER_OPTION** / **NO_BRAND_OPTION**: synthetic options for items missing supplier/brand
- **Persistence**: NOT persisted (resets on unmount)
- **Active count**: shown on trigger button + applied-chips strip
- **Clear-all**: resets to `EMPTY_COMPONENT_FACET_FILTERS`
- **Keyboard**: checkboxes and radio buttons are native — keyboard accessible

### Deep-link search params
- `parseComponentFacetSearchParams` reads URL params (`?lifecycle=`, `?brand=`, `?freshness=`, etc.)
- Used by the Library Overview health line, NOT by the sidebar directly
- The sidebar does NOT sync facets to the URL

## View modes

### Options
- **Default**: custom folder tree (`buildReusableComponentFolderTree`)
- **Suppliers**: `buildSupplierTree` — groups by supplier, derives missing suppliers from item data
- **Brand**: `buildBrandTree` — groups by brand, derives missing brands

### Switching
- **View-by popover**: `ComponentViewControls` from `LibraryFolderTree.tsx`
- **Persistence**: `componentViewMode` stored in `LIBRARY_PREFS_KEY` localStorage ✅
- **Expansion per mode**: `expandedNodeIdsByViewMode` — separate expansion state per mode (NOT persisted)
- **Search reset**: search query persists across view-mode switches (single `searchQuery` field)
- **Preview reset**: preview does NOT reset on view-mode switch (single `previewItemId`)

### Supplier/Brand derivation
When a component has a supplier/brand name but no supplier/brand id, the tree builder derives a synthetic id:
```ts
// buildLibraryTree.ts:329-331
if (!suppliersByKey.has(normalized)) {
  suppliersByKey.set(normalized, { id: `supplier-${normalized}`, name: supplierName, sort_order: Number.MAX_SAFE_INTEGER });
}
```
This means components with the same supplier NAME but different supplier IDs are grouped together. **Potential bug**: if two different suppliers have the same normalized name, they're merged. Low risk — normalized names are unlikely to collide in practice.

## Preferences

### Stored in localStorage (`LIBRARY_PREFS_KEY`)
- `activeTab`: `"components" | "project" | "templates"`
- `componentViewMode`: `"default" | "suppliers" | "brand"`

### Stored in localStorage (separate keys)
- Favorites: `LIBRARY_FAVORITES_KEY`
- Recents: `LIBRARY_RECENTS_KEY`
- Custom tree order: `LIBRARY_TREE_ORDER_KEY`

### NOT stored (ephemeral)
- Search query (per-tab, resets on switch)
- Facet filters
- Preview state
- Expansion state
- Bulk selection
- Template source filter
- Panel collapse state

### Hydration timing
- **Initial render**: uses defaults (SSR-safe)
- **Mount effect**: reads localStorage and applies stored prefs
- **Test evidence**: `component-library-ui.test.tsx:846-857` verifies stored view-mode prefs apply after mount without clobbering

### Browser storage events
- **Cross-tab sync**: ❌ NOT implemented — no `window.addEventListener("storage", …)` handler. Preferences set in one browser tab do not sync to another tab viewing the same estimate.

### Storage quota exceeded
- `safeSetJsonStorage` catches the error and logs a warning
- Does NOT crash the sidebar
- Test at `component-library-ui.test.tsx:859-883` verifies this behavior
