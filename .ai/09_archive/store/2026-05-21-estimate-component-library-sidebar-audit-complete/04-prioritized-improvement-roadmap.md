# Component Library Right Sidebar — Prioritized Improvement Roadmap (Second Pass)

**Date:** 2026-05-21
**Auditor:** Claude (second pass, with concrete implementation guidance)
**Derived from:** Code-level inventory, gap analysis, UX paths, shared primitive audit
**Scope:** Changes in `src/components/workshop/component-library/*`, `EstimateSheetContent.tsx`, `page.tsx`, new shared primitives

---

## Priority Framework

| Rank | Label | Criteria |
|------|-------|----------|
| P0 | Critical | Fixes silent failures, frozen state, or broken primary workflows |
| P1 | High | Major speed/UX improvement; many are very small changes |
| P2 | Medium | Important but workaround exists; requires new primitives |
| P3 | Low | Polish, power-user features, cross-tab sync |
| P4 | Deferred | Assemblies/templates, bulk actions, import/export |

---

## Phase 0: Critical Fixes

### P0.1 Target-Aware Insertion — Prevent Silent Failure

**Problem:** Add button dispatches event that's silently dropped when non-area node selected. Sidebar has zero selection awareness.

**Files:**
- `src/components/workshop/component-library/index.tsx`
- `src/hooks/use-estimate-workspace-state.ts`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

**Implementation:**

1. **Import Zustand in sidebar** (`index.tsx` line ~7 imports):
```tsx
import { useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
```

2. **Read selection in `EstimateRightSidebar`** (after existing useState declarations):
```tsx
// The sidebar needs estimateId to scope Zustand correctly.
// Get it from the URL or pass it as a prop.
const pathname = typeof window !== "undefined" ? window.location.pathname : "";
const estimateId = pathname.split("/estimates/")[1]?.split("/")[0];
const nodeId = pathname.split("/estimates/")[1]?.split("/")[1];

// Find selected node from tree data (need to import findEstimateNode or pass tree)
const { selectedNodeId } = useEstimateWorkspaceSelection(estimateId, nodeId);
```

Better approach — pass as prop from page.tsx:
```tsx
// page.tsx
<EstimateRightSidebar
  selectedNodeKind={selectedNode?.kind ?? null}
  selectedNodeName={selectedNode?.name ?? null}
/>
```

3. **Add props to `EstimateRightSidebar`:**
```tsx
export function EstimateRightSidebar({
  onInsertComponent,
  selectedNodeKind,
  selectedNodeName,
}: {
  onInsertComponent?: (item: EstimateRowItem) => void;
  selectedNodeKind?: string | null;
  selectedNodeName?: string | null;
} = {})
```

4. **Derive canInsert and targetLabel:**
```tsx
const canInsert = selectedNodeKind === "area";
const targetLabel = canInsert && selectedNodeName ? `Add to ${selectedNodeName}` : "Select an area";
```

5. **Pass to LibraryItemCard and PreviewPanel as new props:**
```tsx
// LibraryItemCard gets: disabled?: boolean, addLabel?: string
// PreviewPanel gets: disabled?: boolean, addLabel?: string
```

6. **Update Add button rendering:**
```tsx
<Button onClick={onAdd} disabled={!canInsert} className="..." aria-label={targetLabel}>
  {canInsert ? targetLabel : "Select an area"}
</Button>
```

**Acceptance:**
- Add button shows "Add to Kitchen" when Kitchen area selected
- Add button disabled with "Select an area" text when group selected
- Zero silent insert failures

---

### P0.2 Unfreeze `viewMode` and `sortMode` State

**Problem:** `useState` setters are never extracted — values frozen at mount. This blocks P1.1 and P1.2.

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation (trivial — 2 lines):**
```tsx
// BEFORE (line ~297)
const [viewMode] = useState<LibraryViewMode>(prefs.viewMode ?? "compact");
const [sortMode] = useState<LibrarySortMode>(prefs.sortMode ?? "relevance");

// AFTER
const [viewMode, setViewMode] = useState<LibraryViewMode>(prefs.viewMode ?? "compact");
const [sortMode, setSortMode] = useState<LibrarySortMode>(prefs.sortMode ?? "relevance");
```

**Acceptance:** `setViewMode` and `setSortMode` available for UI controls in P1.

---

### P0.3 Fix Insert-and-Edit Flow — Auto-Focus + Scroll + Retry

**Problem:** `pendingFocusRowId` uses single rAF + querySelector with no fallback. Row may be off-screen.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Implementation (lines ~881-889):**

Replace the existing effect:
```tsx
useEffect(() => {
  if (!pendingFocusRowId) return;

  let attempts = 0;
  const maxAttempts = 5;

  function tryFocus() {
    const selector = `[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`;
    const quantityInput = document.querySelector<HTMLInputElement>(selector);

    if (quantityInput) {
      quantityInput.scrollIntoView({ block: "nearest", behavior: "smooth" });
      quantityInput.focus();
      quantityInput.select();
      setPendingFocusRowId("");
      return;
    }

    attempts++;
    if (attempts < maxAttempts) {
      window.requestAnimationFrame(tryFocus);
    } else {
      setPendingFocusRowId("");
    }
  }

  window.requestAnimationFrame(tryFocus);
}, [pendingFocusRowId]);
```

**Acceptance:**
- Insert → quantity field focused and selected
- Row scrolled into view
- Retries up to 5 frames if DOM not ready
- Rapid double-insert handles last-insert focus (acceptable trade-off)

---

### P0.4 Wrap `localStorage.setItem` Calls in try/catch

**Problem:** 3 locations call `localStorage.setItem` without error handling. Failures silently lose data.

**Files:**
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/helpers.ts`

**Implementation:**

Add helper in `helpers.ts`:
```tsx
export function safeSetJsonStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[EstimateRightSidebar] Failed to persist ${key}:`, e);
  }
}
```

Replace 3 direct calls:
1. `useEffect` prefs sync: `safeSetJsonStorage(LIBRARY_PREFS_KEY, { viewMode, groupBy, sortMode })`
2. `persistFavorites`: `safeSetJsonStorage(LIBRARY_FAVORITES_KEY, items.filter(...).map(...))`
3. `addComponent`: `safeSetJsonStorage(LIBRARY_RECENTS_KEY, recents)`

**Acceptance:** localStorage write failures don't crash the UI. Data loss still occurs but is gracefully degraded.

---

## Phase 1: Make Existing Features Discoverable

### P1.1 Expose View Mode Toggle

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation (after P0.2 unfreezes setter):**

Add a segmented control in the toolbar area (next to the Filter/Group buttons). Use inline buttons since no `SegmentedControl` primitive exists yet:

```tsx
<div className="flex items-center gap-0.5 px-2 py-1 border-t border-hairline">
  <Button variant={viewMode === "compact" ? "secondary" : "ghost"} size="sm"
    onClick={() => setViewMode("compact")} className="h-5 text-[9px]">
    <ListBullets size={10} /> Compact
  </Button>
  <Button variant={viewMode === "detailed" ? "secondary" : "ghost"} size="sm"
    onClick={() => setViewMode("detailed")} className="h-5 text-[9px]">
    <TextAlignLeft size={10} /> Detail
  </Button>
  <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm"
    onClick={() => setViewMode("grid")} className="h-5 text-[9px]">
    <SquaresFour size={10} /> Grid
  </Button>
</div>
```

**Acceptance:** All 3 view modes selectable. Preference persists to localStorage.

---

### P1.2 Expose Sort Mode Dropdown

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

Add a `<select>` next to the group toggle (native `<select>` since no custom dropdown exists):

```tsx
<select
  value={sortMode}
  onChange={(e) => setSortMode(e.target.value as LibrarySortMode)}
  className="h-6 border border-hairline bg-white px-1.5 text-[9px] font-medium text-ink"
>
  <option value="relevance">Relevance</option>
  <option value="name">Name</option>
  <option value="priceAsc">Price ↑</option>
  <option value="priceDesc">Price ↓</option>
  <option value="recentUsed">Recently Used</option>
  <option value="recentAdded">Recently Added</option>
  <option value="supplier">Supplier</option>
</select>
```

**Acceptance:** All 7 sort modes selectable. Preference persists.

---

### P1.3 Expose All Group-By Options

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

Replace the binary `onGroup` toggle with a dropdown:

```tsx
<select
  value={groupBy}
  onChange={(e) => setGroupBy(e.target.value as LibraryGroupBy)}
  className="h-6 border border-hairline bg-white px-1.5 text-[9px] font-medium text-ink"
>
  <option value="category">Category</option>
  <option value="supplier">Supplier</option>
  <option value="discipline">Discipline</option>
  <option value="room">Room</option>
  <option value="recent">Recent</option>
  <option value="none">None</option>
</select>
```

**Acceptance:** All 6 group modes selectable.

---

### P1.4 Recently-Used Quick Strip

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

When search is empty and no filters active, show a quick-strip above the grouped list:

```tsx
const recentItems = useMemo(() => {
  if (searchQuery || activeFilterCount > 0) return [];
  return recentIds
    .map(id => libraryItems.find(item => item.id === id))
    .filter(Boolean) as EstimateRowItem[];
}, [searchQuery, activeFilterCount, recentIds, libraryItems]);

{recentItems.length > 0 && (
  <div className="border-b border-hairline px-2 py-2">
    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-tertiary mb-1.5">Recently Used</p>
    <div className="flex gap-1.5 overflow-x-auto">
      {recentItems.slice(0, 8).map(item => (
        <button
          key={item.id}
          onClick={() => addComponent(item)}
          disabled={!canInsert}
          className="flex shrink-0 items-center gap-1.5 rounded border border-hairline bg-white px-2 py-1 hover:border-accent/30 disabled:opacity-40"
        >
          <span className="block size-5 shrink-0 bg-surfaceMuted bg-cover bg-center border border-hairline/50"
            style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }} />
          <span className="text-[9px] font-medium truncate max-w-[120px]">{getComponentName(item)}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

**Acceptance:** Recent items shown proactively. Click inserts with target validation. Auto-hides when searching.

---

### P1.5 Source/Confidence Compact Indicator on Cards

**Files:**
- `src/components/workshop/component-library/ComponentCard.tsx`
- `src/components/workshop/component-library/helpers.ts`

**Implementation:**

Add staleness helper in `helpers.ts`:
```tsx
export function getStalenessTone(pricingDate?: string): "success" | "warning" | "danger" | undefined {
  if (!pricingDate) return undefined;
  const days = daysAgo(pricingDate);
  if (days > 180) return "danger";
  if (days > 90) return "warning";
  return "success";
}

export function getStalenessLabel(pricingDate?: string): string | null {
  if (!pricingDate) return null;
  const days = daysAgo(pricingDate);
  if (days > 180) return `${days}d ago`;
  if (days > 90) return `${days}d ago`;
  return "Recent";
}
```

In `ComponentCard.tsx`, add below the price line in compact/detailed modes:
```tsx
{item.pricingDate && viewMode !== "grid" && (
  <span className={`text-[8px] font-medium ${
    getStalenessTone(item.pricingDate) === "danger" ? "text-danger" :
    getStalenessTone(item.pricingDate) === "warning" ? "text-warning" : "text-success/80"
  }`}>
    {item.pricingSource || "Library"} · {getStalenessLabel(item.pricingDate)}
  </span>
)}
```

**Acceptance:** Stale items visually distinct on cards. Recent prices show green. 90+ days show amber. 180+ days show red.

---

## Phase 2: Speed & Power Features

### P2.1 Command Palette Fast Insert (`Cmd/Ctrl+K`)

**Problem:** User must move focus to sidebar to search/insert.

**Files:**
- New: `src/components/workshop/component-library/CommandPalette.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

**Implementation:**

Create a lightweight command palette (no external dependency — keep it simple):

```tsx
// CommandPalette.tsx
// - Rendered as a portal overlay
// - Triggered by Cmd/Ctrl+K globally, or / when sheet focused
// - Uses searchComponents from helpers to filter
// - Shows: name, supplier, price, favorite indicator
// - Enter → insert + close
// - Shift+Enter → insert + keep open
// - Escape → close
// - ArrowUp/Down → navigate results
```

Wire trigger in `EstimateSheetContent.tsx`:
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

Render in page.tsx:
```tsx
<CommandPalette
  open={showCommandPalette}
  onClose={() => setShowCommandPalette(false)}
  onInsert={insertLibraryItem}
  insertTargetNodeId={insertTargetNodeId}
  canInsert={canInsert}
/>
```

**Acceptance:** Insert without touching sidebar. Keyboard-only path end-to-end.

---

### P2.2 Inline Component Edit

**Problem:** "Edit" in dropdown opens read-only preview. Must duplicate → modify → delete original.

**Files:**
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/NewComponentForm.tsx`

**Implementation:**

1. Add `editItemId` state to sidebar.
2. When "Edit" is clicked (from card dropdown or preview), set `editItemId` and open modal with pre-filled form.
3. Reuse `NewComponentForm` with initial values from the item.
4. On save, update the item in `libraryItems` (not create new).
5. Add `initialValues` prop to `NewComponentForm`.

```tsx
// New props for NewComponentForm
{ initialValues?: Partial<NewComponentFormType> }

// In sidebar
const handleEditSave = useCallback(() => {
  if (!editItemId) return;
  const result = createComponent(form); // reuse validation
  if (result.error) { setFormError(result.error); return; }
  setLibraryItems(items => items.map(item =>
    item.id === editItemId ? { ...item, ...result.component, id: editItemId, updatedAt: new Date().toISOString() } : item
  ));
  setShowNewComponent(false);
  setEditItemId(null);
}, [form, editItemId]);
```

**Acceptance:** Custom components editable after creation. Changes reflect immediately.

---

### P2.3 Multi-Insert with Quantity Input

**Problem:** One click = one insertion. For items like outlets (qty 12 per room), this is tedious.

**Files:**
- `src/components/workshop/component-library/ComponentCard.tsx`
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

Add a small quantity input to the preview panel's Add button area:
```tsx
<div className="flex items-center gap-1">
  <input
    type="number"
    min="1"
    value={insertQuantity}
    onChange={(e) => setInsertQuantity(Math.max(1, parseInt(e.target.value) || 1))}
    className="h-6 w-10 border border-hairline bg-white px-1 text-center text-[9px] font-bold tabular-nums text-ink"
  />
  <Button onClick={() => onAdd(insertQuantity)} className="h-6 min-h-6 text-[9px]">
    {canInsert ? `Add ×${insertQuantity} to ${targetName}` : "Select an area"}
  </Button>
</div>
```

Update `addComponent` to accept optional quantity, and `insertLibraryItem` to preset the quantity on the inserted row.

**Acceptance:** User can insert with non-default quantity. Default is 1.

---

### P2.4 Image Upload (File Picker)

**Problem:** New component form only accepts image URLs.

**Files:**
- `src/components/workshop/component-library/NewComponentForm.tsx`
- `src/components/workshop/component-library/helpers.ts`

**Implementation:**

Add file input + base64 encoding:
```tsx
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    onChange({ ...form, imageUrl: reader.result as string }); // base64 data URL
  };
  reader.readAsDataURL(file);
};
```

Until Supabase Storage is approved, base64 thumbnails are acceptable (capped at ~50KB via canvas resize if needed). The `getComponentImageUrl` function already handles data URLs (they pass through since they start with `data:` and don't need the fallback chain).

**Acceptance:** User can upload image from computer. Thumbnail displays in cards and preview.

---

### P2.5 Fix Inference Function Bugs

**Files:**
- `src/components/workshop/component-library/helpers.ts`

**Implementation:**

1. **`getComponentDiscipline`** — case-insensitive, fix mappings:
```tsx
export function getComponentDiscipline(item: EstimateRowItem): string {
  const cat = (item.category ?? "").toLowerCase();
  if (cat.includes("electrical")) return "Electrical";
  if (cat.includes("lighting")) return "Electrical";
  if (cat.includes("plumbing")) return "Plumbing";
  if (cat.includes("kitchen")) return "Plumbing";
  if (cat.includes("cabinetry")) return "Millwork";
  if (cat.includes("finishes") || cat.includes("paint") || cat.includes("floor")) return "Architectural";
  if (cat.includes("furniture")) return "Architectural";
  if (cat.includes("outdoor")) return "Sitework";
  return "Architectural";
}
```

2. **`getComponentDesignation`** — fix "floor" default:
```tsx
export function getComponentDesignation(item: EstimateRowItem): string {
  const text = `${item.material ?? ""} ${item.category ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (text.includes("light")) return "Ceiling";
  if (text.includes("wall") || text.includes("paint")) return "Wall";
  if (text.includes("floor") || text.includes("tile")) return "Floor";
  if (text.includes("counter") || text.includes("cabinet")) return "Millwork";
  if (text.includes("plumbing") || text.includes("fixture")) return "Plumbing";
  if (text.includes("door") || text.includes("window")) return "Opening";
  return "General";
}
```

3. **`itemCreatedAt`** — remove hardcoded fallback:
```tsx
export function itemCreatedAt(item: EstimateRowItem, index?: number): string {
  return item.createdAt ?? new Date(0).toISOString(); // Unix epoch = clearly fabricated
}
```

4. **`getComponentImageUrl`** — null-safe material:
```tsx
const material = (item.material ?? "").toLowerCase();
```

**Acceptance:** Disciplines and designations inferred correctly. No hardcoded dates. No crashes on undefined material.

---

### P2.6 Wire `onInsertComponent` Direct Callback

**Problem:** CustomEvent path is always taken because prop is never passed in production.

**Files:**
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

This requires lifting `insertLibraryItem` to be accessible from the page level, or making `EstimateSheetContent` the parent of `EstimateRightSidebar`. The simplest approach: keep the event but add a success/error event back.

Alternative (recommended for P2): restructure so `EstimateSheetContent` wraps the sidebar:
```tsx
// In EstimateSheetContent
export function EstimateSheetContent(props) {
  // ... existing state ...

  const handleInsertFromLibrary = useCallback((item: EstimateRowItem) => {
    if (!insertTargetNodeId) return false; // signal failure
    insertLibraryItem(insertTargetNodeId, item);
    return true; // signal success
  }, [insertTargetNodeId, insertLibraryItem]);

  return (
    <>
      {/* existing sheet UI */}
      <EstimateRightSidebar
        onInsertComponent={handleInsertFromLibrary}
        selectedNodeKind={selectedNode?.kind ?? null}
        selectedNodeName={selectedNode?.name ?? null}
      />
    </>
  );
}
```

Then in page.tsx, don't render sidebar separately:
```tsx
// Remove <EstimateRightSidebar /> from page.tsx — it's now inside EstimateSheetContent
```

**Acceptance:** Direct typed callback instead of window event. Success/failure returned. Deprecate CustomEvent.

---

## Phase 3: Quality & Robustness

### P3.1 Fix Escape Key Cascade

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

Add `deleteCandidate` to the Escape dependency and cascade:
```tsx
useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    // ... existing `/` handler ...
    if (event.key === "Escape") {
      if (deleteCandidate) setDeleteCandidate(null);           // NEW
      else if (showFilters) setShowFilters(false);
      else if (searchQuery) setSearchQuery("");
      else if (previewItemId) setPreviewItemId(null);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [searchQuery, showFilters, previewItemId, deleteCandidate]); // NEW dep
```

### P3.2 Fix `/` Shortcut Behind Modal

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

Add `showNewComponent` to the guard:
```tsx
if (event.key === "/" &&
    !showNewComponent &&                                    // NEW
    document.activeElement?.tagName !== "INPUT" &&
    document.activeElement?.tagName !== "TEXTAREA") {
```

### P3.3 Add Cross-Tab Sync via `storage` Event

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

```tsx
useEffect(() => {
  const handler = (event: StorageEvent) => {
    if (event.key === LIBRARY_FAVORITES_KEY) {
      // Re-sync favorites
      const favIds = readJsonStorage<string[]>(LIBRARY_FAVORITES_KEY, []);
      setLibraryItems(items => items.map(item => ({
        ...item,
        isFavorite: favIds.includes(item.id),
      })));
    }
    if (event.key === LIBRARY_RECENTS_KEY) {
      const recents = readJsonStorage<string[]>(LIBRARY_RECENTS_KEY, []);
      setRecentIds(recents);
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}, []);
```

### P3.4 Add Undo Toast for Delete

**Files:**
- `src/components/workshop/component-library/index.tsx`
- New: `src/components/ui/toast.tsx` (create shared primitive or use inline)

**Implementation:**

On delete, store deleted item in ref for 5 seconds, show toast with Undo button.

### P3.5 Prevent Form Dirty State Loss

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

Before closing modal, check if form is dirty:
```tsx
onOpenChange={(open) => {
  if (!open && isFormDirty(form)) {
    if (!window.confirm("Discard changes?")) return;
  }
  setShowNewComponent(open);
  if (!open) { setForm(defaultForm); setFormError(""); }
}}
```

### P3.6 Fix Numeric Validation in `createComponent`

**Files:**
- `src/components/workshop/component-library/helpers.ts`

**Implementation:**

```tsx
function parseNonNegative(value: string): number {
  const n = Number(value);
  if (isNaN(n) || n < 0) return 0;
  return n;
}

// In createComponent:
itemCost: parseNonNegative(form.itemCost),
laborCost: parseNonNegative(form.laborCost),
supplementaryCosts: parseNonNegative(form.supplementaryCosts),
```

### P3.7 Add `aria-live` Region for Insert/Delete

**Files:**
- `src/components/workshop/component-library/index.tsx`

**Implementation:**

```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {lastActionMessage}
</div>
```

Update `lastActionMessage` on insert success, insert failure, delete, create, etc.

---

## Phase 4: Implemented (2026-05-21)

### P4.1 Assemblies / Templates Tab

**Status:** Complete. The sidebar has Components, Assemblies, and Templates tabs. Bundles use explicit `LibraryBundle` types, expand to estimate rows, and insert only through the same Area-node callback gate as single components.

### P4.2 Bulk Library Actions

**Status:** Complete. Component cards support checkbox selection and the bulk bar supports select all, clear, add, favorite, save assembly, save template, duplicate, export, and delete with undo.

### P4.3 CSV Import / JSON Export

**Status:** Complete. CSV import normalizes required component fields. JSON export/import uses schema `archestimator.component-library.v1` and round-trips components plus assemblies/templates.

### P4.4 Keyboard Navigation in Card List

**Status:** Complete. Component preview buttons use roving tabindex and Arrow/Home/End navigation across the rendered card list.

### P4.5 Replace `role="button"` with `<button>` Element

**Status:** Complete. `LibraryItemCard` now uses a non-interactive wrapper with a native preview `<button>` sibling to action controls, avoiding invalid nested interactive markup while preserving drag/drop.

### P4.6 Custom Drag Ghost

**Status:** Complete. Drag start uses a custom ghost with component name and formatted price.

---

## Near-Term Approved Work (Immediate Sprint)

Based on audit findings and impact analysis, the following items are approved for immediate implementation (next 2 weeks):

### Approved P0 Items (Critical - Do First)
- **P0.2 Unfreeze `viewMode` and `sortMode` State** (2-line fix, enables P1.1/P1.2)
- **P0.4 Wrap `localStorage.setItem` Calls in try/catch** (prevents silent data loss)
- **P0.1 Target-Aware Insertion** (prevents silent insertion failures)
- **P0.3 Fix Insert-and-Edit Flow** (auto-focus + scroll + retry)

### Approved P1 Items (High Impact - Next)
- **P1.3 Expose All Group-By Options** (dropdown instead of binary toggle)
- **P1.1 Expose View Mode Toggle** (now that setters are unfrozen)
- **P1.2 Expose Sort Mode Dropdown** (now that setters are unfrozen)
- **P1.5 Source/Confidence Compact Indicator on Cards** (staleness visualization)
- **P1.4 Recently-Used Quick Strip** (proactive display of recent items)

### Implementation Sequence for Approved Work
```
Immediate (Week 1):
  P0.2 → P0.4 → P0.1 → P0.3

Early Next Week:
  P1.3 → P1.1 → P1.2 → P1.5 → P1.4

All approved items can be implemented independently and provide immediate user value.
```

## Full Implementation Order (Reference)

For completeness, the full recommended implementation order remains:

```
Phase 0: P0.2 (unfreeze state) → P0.4 (try/catch localStorage) → P0.1 (target-aware insert) → P0.3 (auto-focus + scroll)
Phase 1: P1.3 (group dropdown) → P1.1 (view toggle) → P1.2 (sort dropdown) → P1.5 (staleness) → P1.4 (recent strip)
Phase 2: P2.5 (fix inference bugs) → P2.3 (multi-insert) → P2.4 (image upload) → P2.2 (inline edit) → P2.1 (command palette) → P2.6 (direct callback)
Phase 3: P3.1→P3.7 in any order (all independent small fixes)
Phase 4: P4.1–P4.6 implemented and verified
```

---

## Prerequisites: Shared Primitives to Create

| Primitive | Needed By | Priority | Notes |
|-----------|-----------|----------|-------|
| `safeSetJsonStorage` | P0.4 | **Now** | 4-line helper in helpers.ts |
| `getStalenessTone` / `getStalenessLabel` | P1.5 | P1 | 2 helpers in helpers.ts |
| `isFormDirty` | P3.5 | P3 | Compare form to defaultForm |
| `Toast` | P3.4 | P3 | Simple inline or shared primitive |
| `SegmentedControl` | P1.1 (better UX) | P2 | Can use inline buttons for now |
| `Dropdown` | P1.2, P1.3 (better UX) | P2 | Can use native `<select>` for now |
| `CommandPalette` | P2.1 | P2 | New component |

---

## Testing Checklist

- [ ] P0.1: Add disabled for group, enabled with label for area
- [ ] P0.2: `setViewMode("grid")` changes card rendering
- [ ] P0.3: Insert → quantity focused + scrolled into view
- [ ] P0.4: localStorage errors don't crash UI
- [ ] P1.1: View toggle cycles compact→detailed→grid
- [ ] P1.2: Sort dropdown changes order
- [ ] P1.3: Group dropdown shows all 6 options
- [ ] P1.4: Recent strip appears when no search/filters, inserts correctly
- [ ] P1.5: 180+ day items show red, 90+ show amber, recent show green
- [ ] P2.1: Cmd+K opens palette, Enter inserts, Escape closes
- [ ] P2.2: Edit pre-fills form, save updates existing item
- [ ] P2.3: Multi-insert qty pre-fills inserted row
- [ ] P2.4: File picker uploads image, thumbnail shows
- [ ] P2.5: "electrical" matches "Electrical", "Cabinetry"→"Millwork"
- [ ] P2.6: Direct callback used, CustomEvent deprecated
- [ ] P3.1: Escape dismisses delete confirmation
- [ ] P3.2: `/` doesn't fire when modal open
- [ ] P3.3: Cross-tab favorites sync within 1s
- [ ] P3.4: Delete shows undo toast
- [ ] P3.5: Dirty form shows confirmation before close
- [ ] P3.6: Invalid numeric input → 0, not NaN
- [ ] P3.7: Screen reader announces insert/delete

---

## Verification Appendix

### Verification Methodology
All implemented changes must be verified using the following methods:
1. **Visual inspection** for UI changes
2. **Manual testing** of user workflows
3. **Automated tests** where applicable (Playwright for E2E)
4. **Code review** for adherence to implementation guidance
5. **Impact validation** using GitNexus tools to ensure no unintended consequences

### Pre-Implementation Verification
Before implementing any P0/P1 item:
1. Run `gitnexus_impact({target: "targetFunctionOrComponent", direction: "both"})` to understand blast radius
2. Review current implementation against `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/01-current-inventory.md`
3. Confirm no existing tests will be broken by running `bun run test`

### Post-Implementation Verification
After implementing any item:
1. Run `lsp_diagnostics` on all modified files - must show no new errors
2. Run `bun run type-check` - must pass with no new TypeScript errors
3. Run relevant unit tests - must pass (or document pre-existing failures)
4. For UI changes: manually verify the specified acceptance criteria from the roadmap
5. Run `gitnexus_detect_changes()` to confirm only expected symbols are affected
6. Run `bun run validate` to ensure overall project health

### Specific Verification by Priority Item

#### P0 Items
- **P0.1**: Verify Add button state changes correctly when selecting area vs group nodes
- **P0.2**: Confirm `setViewMode` and `setSortMode` functions exist and work
- **P0.3**: Test insert → focus/scroll behavior with delayed DOM readiness
- **P0.4**: Verify try/catch wrapping by simulating localStorage quota exceeded

#### P1 Items
- **P1.1**: Test all three view modes (compact/detailed/grid) persist to localStorage
- **P1.2**: Confirm all seven sort modes work and persist preference
- **P1.3**: Verify all six group-by options functional in dropdown
- **P1.4**: Check recent strip appears/hides correctly and inserts work
- **P1.5**: Validate staleness indicator colors (green/<90d, amber 90-180d, red >180d)

#### P2 Items (Reference for Future)
- **P2.1**: Test Cmd/K opens palette, navigation, insert, close behaviors
- **P2.2**: Verify edit pre-fills form and updates existing item (not creates duplicate)
- **P2.3**: Confirm quantity input affects inserted row quantity
- **P2.4**: Test file picker uploads and displays thumbnails
- **P2.5**: Validate inference fixes: case-insensitive, correct mappings, no hardcoded dates
- **P2.6**: Verify direct callback used and CustomEvent path deprecated

#### P3 Items (Reference for Future)
- **P3.1**: Confirm Escape dismisses delete confirmation dialog
- **P3.2**: Verify `/` shortcut doesn't fire when modal open
- **P3.3**: Test cross-tab sync of favorites/recents within 1 second
- **P3.4**: Check delete action shows undo toast with functional Undo button
- **P3.5**: Confirm dirty form triggers discard changes warning
- **P3.6**: Validate invalid numeric input converts to 0 (not NaN)
- **P3.7**: Screen reader testing for insert/delete announcements

### Regression Prevention
To prevent reintroduction of fixed gaps:
1. Add comments to fixed code referencing the audit document and fix rationale
2. Consider adding ESLint rules or TypeScript guards where applicable
3. Document any workaround limitations in the code
4. Add audit-compliance checks to pre-commit hooks if deemed necessary

### Sign-off Criteria
A roadmap item is considered complete when:
- [ ] Implementation matches roadmap specification exactly
- [ ] All verification steps above pass
- [ ] GitNexus impact analysis shows only expected changes
- [ ] No new lint or type errors introduced
- [ ] User workflow testing confirms the intended behavior
