# Component Library Right Sidebar — Feature Gap Analysis (Second Pass)

**Date:** 2026-05-21
**Auditor:** Claude (second pass, with full codebase audit)
**Method:** Deep code audit of all 5 component-library files + EstimateSheetContent.tsx + EstimateSheetTree.tsx + use-estimate-workspace-state.ts + shared UI primitives

---

## 1. Gap Summary by Outcome

Gaps are organized by the user outcome they affect, not by raw issue count. Each gap includes severity, effort estimate, and whether it was newly discovered in the second pass.

### Blocking Workflow Failures (Prevent Core Tasks)
These gaps prevent users from completing fundamental estimate workflows.

| # | Gap | Severity | Effort | New Finding? | Files |
|---|-----|----------|--------|-------------|-------|
| 1 | Silent insertion failure — no target validation in sidebar | 🔴 Critical | Small | — | `index.tsx`, `EstimateSheetContent.tsx` |
| 2 | `viewMode` and `sortMode` frozen — no setter extracted from useState | 🔴 Critical | Very Small | ✅ NEW | `index.tsx` |
| 3 | No auto-focus on quantity after insert — fragile rAF querySelector | 🔴 Critical | Small | — | `EstimateSheetContent.tsx` |
| 9 | `onInsertComponent` prop exists but never used in production | 🟠 High | Small | ✅ NEW | `page.tsx`, `index.tsx` |
| 10 | Sidebar has zero selection awareness — no Zustand store access | 🟠 High | Small | ✅ NEW | `index.tsx` |
| 19 | Delete confirmation not dismissible via Escape | 🟡 Medium | Very Small | ✅ NEW | `index.tsx` |
| 20 | `/` shortcut fires behind open modal | 🟡 Medium | Very Small | ✅ NEW | `index.tsx` |
| 21 | `localStorage.setItem` writes have no try/catch (3 locations) | 🟡 Medium | Very Small | ✅ NEW | `index.tsx`, `helpers.ts` |
| 22 | `createComponent` form fields are all strings — no numeric validation | 🟡 Medium | Small | ✅ NEW | `helpers.ts` |
| 26 | No `storage` event listener — no cross-tab sync | 🟡 Medium | Small | ✅ NEW | `index.tsx` |
| 28 | `role="button"` on `<div>` instead of `<button>` element | 🟢 Low | Small | ✅ NEW | `ComponentCard.tsx` |

### Discoverability Gaps (Hide Available Features)
These gaps make it difficult for users to find or understand what the sidebar can do.

| # | Gap | Severity | Effort | New Finding? | Files |
|---|-----|----------|--------|-------------|-------|
| 4 | Group-by toggle only binary (category↔supplier); 4 modes unreachable | 🟠 High | Very Small | — | `index.tsx` |
| 5 | View mode toggle has no UI control | 🟠 High | Small | — | `index.tsx`, `header-icon-toolbar.tsx` |
| 6 | Sort mode has no UI control | 🟠 High | Small | — | `index.tsx` |
| 11 | No source/confidence markers on cards | 🟡 Medium | Small | — | `ComponentCard.tsx` |
| 12 | No multi-insert (quantity spinner) | 🟡 Medium | Medium | — | `ComponentCard.tsx` |
| 13 | No image upload (URL text field only) | 🟡 Medium | Medium | — | `NewComponentForm.tsx` |
| 14 | No true component edit — preview is read-only | 🟡 Medium | Medium | — | `index.tsx`, `NewComponentForm.tsx` |
| 15 | No bulk library actions (multi-select) | 🟡 Medium | Medium | — | `index.tsx` |
| 16 | No import/export (CSV/JSON) | 🟡 Medium | Medium | — | New helpers + UI |
| 17 | No price history/staleness indicator | 🟡 Medium | Low | — | `ComponentCard.tsx` |
| 18 | No recently-used quick-access strip | 🟡 Medium | Small | — | `index.tsx` |
| 23 | `getComponentDiscipline` has case-sensitive bug + "Outdoor"/"Cabinetry" → "Architectural" | 🟡 Medium | Small | ✅ NEW | `helpers.ts` |
| 24 | `getComponentDesignation` maps most items to "Floor" | 🟡 Medium | Small | ✅ NEW | `helpers.ts` |
| 25 | `itemCreatedAt` falls back to hardcoded "2026-05-17" | 🟡 Medium | Very Small | ✅ NEW | `helpers.ts` |
| 27 | No keyboard navigation inside card list (arrow keys) | 🟡 Medium | Medium | — | `index.tsx`, `ComponentCard.tsx` |
| 29 | No custom drag ghost image | 🟢 Low | Small | — | `ComponentCard.tsx` |
| 30 | No undo toast for delete | 🟢 Low | Small | — | `index.tsx` |

### Trust/Data-Quality Gaps (Compromise Confidence in Data)
These gaps lead users to distrust the data or introduce errors without realizing it.

| # | Gap | Severity | Effort | New Finding? | Files |
|---|-----|----------|--------|-------------|-------|
| 21 | `localStorage.setItem` writes have no try/catch (3 locations) | 🟡 Medium | Very Small | ✅ NEW | `index.tsx`, `helpers.ts` |
| 22 | `createComponent` form fields are all strings — no numeric validation | 🟡 Medium | Small | ✅ NEW | `helpers.ts` |
| 23 | `getComponentDiscipline` has case-sensitive bug + "Outdoor"/"Cabinetry" → "Architectural" | 🟡 Medium | Small | ✅ NEW | `helpers.ts` |
| 24 | `getComponentDesignation` maps most items to "Floor" | 🟡 Medium | Small | ✅ NEW | `helpers.ts` |
| 25 | `itemCreatedAt` falls back to hardcoded "2026-05-17" | 🟡 Medium | Very Small | ✅ NEW | `helpers.ts` |
| 26 | No `storage` event listener — no cross-tab sync | 🟡 Medium | Small | ✅ NEW | `index.tsx` |
| 11 | No source/confidence markers on cards | 🟡 Medium | Small | — | `ComponentCard.tsx` |
| 17 | No price history/staleness indicator | 🟡 Medium | Low | — | `ComponentCard.tsx` |

### Power-User/Deferred Gaps (Advanced Features for Efficiency)
These gaps represent opportunities for power users but don't block core workflows.

| # | Gap | Severity | Effort | New Finding? | Files |
|---|-----|----------|--------|-------------|-------|
| 7 | No command palette / fast insert (`Cmd+K` or `/` from sheet) | 🟠 High | Medium | — | New component |
| 8 | No assemblies/templates tab | 🟠 High | High | — | New files |
| 15 | No bulk library actions (multi-select) | 🟡 Medium | Medium | — | `index.tsx` |
| 16 | No import/export (CSV/JSON) | 🟡 Medium | Medium | — | New helpers + UI |
| 18 | No recently-used quick-access strip | 🟡 Medium | Small | — | `index.tsx` |

---

## 2. New Gaps Discovered (Not in First Pass)

### 2.1 `viewMode` and `sortMode` Are Frozen (CRITICAL — NEW)

**Current behavior:**
```tsx
const [viewMode] = useState<LibraryViewMode>(prefs.viewMode ?? "compact");
const [sortMode] = useState<LibrarySortMode>(prefs.sortMode ?? "relevance");
```

The setter is **never extracted**. Both values are frozen at mount. The `localStorage` write effect still fires when `groupBy` changes, but `viewMode` and `sortMode` never change so their writes are no-ops.

**This is worse than the first pass described.** The first pass said "the UI has no controls" — but the actual code can never change these values even if controls existed. The fix is two-part:
1. Extract the setter: `const [viewMode, setViewMode] = useState(...)`
2. Add UI controls that call the setter

### 2.2 `onInsertComponent` Prop Exists But Never Used in Production (HIGH — NEW)

The page renders `<EstimateRightSidebar />` with no props. The `onInsertComponent` prop is always `undefined` in production, so the CustomEvent path is *always* taken:

```tsx
if (onInsertComponent) onInsertComponent(item);
else window.dispatchEvent(new CustomEvent("archestimator:add-library-item", ...));
```

The direct callback would be **more reliable** than the window event (type-safe, no stale closure risk, can return success/failure). The fix is to pass it from `EstimateSheetContent` or wire it directly in the page.

### 2.3 Sidebar Has Zero Selection Awareness (HIGH — NEW)

`EstimateRightSidebar` does not import or use `useEstimateWorkspaceState`. It has no knowledge of:
- Which node is selected in the tree
- Whether the selected node is an area or group
- The name of the selected area

This is the root cause of the silent insertion failure — the sidebar can't validate the target before dispatching. The fix: import the Zustand hook and derive `canInsert` / `targetName` from the selected node.

### 2.4 Delete Confirmation Not Dismissible by Escape (MEDIUM — NEW)

The Escape key handler cascade is: `showFilters → searchQuery → previewItemId`. `deleteCandidate` is not in the cascade. When the delete confirmation dialog is open, Escape does nothing — user must click Cancel.

### 2.5 `/` Shortcut Fires Behind Open Modal (MEDIUM — NEW)

```tsx
if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && ...) {
```

When the New Component modal is open and the user clicks the backdrop (focus leaves modal inputs), pressing `/` focuses the search input *behind* the modal. The modal has `z-index: 1000` but focus still moves to the hidden search bar. The guard should also check `showNewComponent`.

### 2.6 Three `localStorage.setItem` Writes Have No try/catch (MEDIUM — NEW)

Locations:
1. `useEffect` prefs sync: `localStorage.setItem(LIBRARY_PREFS_KEY, ...)`
2. `persistFavorites`: `localStorage.setItem(LIBRARY_FAVORITES_KEY, ...)`
3. `addComponent`: `localStorage.setItem(LIBRARY_RECENTS_KEY, ...)`

If localStorage is full, disabled, or throws (incognito with strict privacy), these crash silently or cause unhandled rejections. Wrapping in try/catch with a console.warn fallback is trivial.

### 2.7 `createComponent` Has No Numeric Validation (MEDIUM — NEW)

All form fields are typed as `string`. `createComponent` does:
```tsx
itemCost: Number(form.itemCost) || 0,
laborCost: Number(form.laborCost) || 0,
supplementaryCosts: Number(form.supplementaryCosts) || 0,
```

This means `Number("abc")` → `NaN` → `0` (via `|| 0`), silently discarding invalid input. Similarly `Number("")` → `0`. Negative values pass through. There's no validation that prices are non-negative numbers.

### 2.8 Inference Functions Have Systematic Bugs (MEDIUM — NEW)

**`getComponentDiscipline`:**
- Case-sensitive `.includes()` checks — `"electrical"` vs `"Electrical"` mismatch
- "Cabinetry" maps to "Architectural" (should be "Millwork" or similar)
- "Outdoor" maps to "Architectural" (should be "Sitework")

**`getComponentDesignation`:**
- Everything without "light" or "wall" in category maps to "Floor"
- `"light"` substring matches false positives: "sunlight", "lighting track"

**`itemCreatedAt`:**
- Falls back to hardcoded `"2026-05-17"` — silently fabricates date for items without `createdAt`

**`getComponentImageUrl`:**
- `item.material.toLowerCase()` would crash if material is undefined
- `material.includes("paint")` matches "wall paints" (category name used as material)

### 2.9 No Cross-Tab Sync (MEDIUM — NEW)

There's no `window.addEventListener("storage", ...)` listener. If the user opens the estimate in two tabs:
- Favoriting in tab A won't show in tab B until refresh
- Creating a custom component in tab A won't appear in tab B
- Preferences changes in tab A won't sync to tab B

### 2.10 Accessibility: `role="button"` on `<div>` (LOW — NEW)

`LibraryItemCard` renders a `<div>` with `role="button"` and `tabIndex={0}` instead of using a native `<button>` element. Native `<button>` would provide: automatic Enter/Space handling, focus management, form submission prevention, and better AT support. All custom `handlePreviewKeyDown` logic would be unnecessary.

### 2.11 In-Memory Repository Has Phantom Fields (MEDIUM — NEW)

`cost-library-repository.ts` lines 30-38: the in-memory repository spreads fields that don't exist on the `cost_library_items` DB table:
```ts
const item = {
  discipline: null,        // ❌ Not in cost_library_items schema
  productivity_unit: null, // ❌ Not in cost_library_items schema
  specification: null,     // ❌ Not in cost_library_items schema
  tags: [],                // ❌ Not in cost_library_items schema
  ...
} as CostLibraryItem;      // Type-cast hides the mismatch
```

This means the in-memory fallback (used when `hasSupabaseBrowserEnv()` is false) creates objects that would fail if written to the DB. This doesn't crash because it's only used in-memory, but the type-cast hides a schema mismatch that will cause bugs if anyone tries to serialize these objects for DB use.

### 2.12 `estimate_row_items` Has `source_library_item_id` FK (CLARIFICATION)

The first pass's Error Path 4 claimed estimate rows have "no link back" to library items. This is incorrect. The DB schema has:
- `source_library_item_id` — FK to `cost_library_items(id)` with `ON DELETE SET NULL`
- `source_snapshot` — jsonb capturing library data at insert time

This means the "library edit doesn't silently propagate" pattern is already handled correctly by the schema. Deleting a library item nullifies the FK but preserves the snapshot in the estimate row.

---

## 3. Detailed Analysis of Existing Gaps (Refined)

### 3.1 Silent Insertion Failure

**Root cause (precise):**
1. Page renders `<EstimateRightSidebar />` with no props — `onInsertComponent` is undefined
2. Sidebar dispatches `archestimator:add-library-item` CustomEvent
3. `EstimateSheetContent` listener extracts `event.detail` and checks `insertTargetNodeId`
4. `insertTargetNodeId = selectedNode?.kind === "area" ? selectedNode.id : ""`
5. If a group is selected, `insertTargetNodeId` is `""` (falsy) → guard fails → event silently dropped
6. Sidebar has no feedback path — no way to know the insert failed

**The fix is not just passing `selectedNode` to the sidebar.** The entire communication path should change: either pass `onInsertComponent` directly from `EstimateSheetContent` (so the callback can return success/failure), or keep the event but add an error event back to the sidebar. The cheapest fix: import `useEstimateWorkspaceSelection` in the sidebar and disable the Add button when target is invalid.

### 3.2 Frozen View/Sort Modes

**This is actually two bugs in one:**
1. The setter isn't extracted from `useState` — code-level bug
2. No UI controls exist — UX gap

Both must be fixed for the feature to work.

### 3.3 Fragile Focus After Insert

The `requestAnimationFrame` + `querySelector` pattern is fragile but workable. Add a retry mechanism (up to 3 rAFs) and a MutationObserver fallback. Also, the rapid-insert race condition (two clicks before rAF fires) means only the last row gets focus — the first row's focus is lost. In practice this is unlikely (user can't click fast enough), but programmatic multi-insert would trigger it.

### 3.4 No Assemblies/Templates

This is a Phase 3 item per the improvement plan. The first pass correctly identified the data model needed: `{ id, name, discipline, items: { componentId, defaultQuantity, notes }[] }`. The sidebar would need tabbed navigation (Components | Assemblies | Templates) and a separate list view for assembly previews.

### 3.5 Window Event Communication is Brittle

The `archestimator:add-library-item` event:
- No type safety (cast from `Event` to `CustomEvent<EstimateRowItem>`)
- No way to signal success/failure back to dispatcher
- Magic string not exported or typed
- Listener lifecycle tied to `useEffect` dependencies — if cleanup fails, duplicate listeners possible

**Recommendation:** Replace with direct `onInsertComponent` callback passed from `EstimateSheetContent`. The prop already exists on the sidebar signature — it just needs to be wired from the page.

---

## 4. Missing UI Primitives Blocking Improvements

| Primitive | Blocks | Status | Fix |
|-----------|--------|--------|-----|
| `SegmentedControl` | View mode toggle | None exists | Create shared primitive |
| `Dropdown` / `Popover` | Sort dropdown, group-by dropdown, more actions menu | None exists | Create shared primitive |
| `Toast` | Insert confirmations, undo delete | None exists | Create shared primitive or add `sonner` |
| `CompactNumberField` | Multi-insert qty, price range filters | `ControlInput` generic text exists | Create number variant |
| `CommandPalette` | Fast insert overlay | None exists | Create or use `cmdk` |

These primitives should be created in `src/components/ui/` following existing patterns (see `badge.tsx`, `chip.tsx` for the project style).

---

## 5. Cross-Surface Coordination Gaps (Corrected Map)

```
┌──────────────────┐       ┌─────────────────────────┐       ┌────────────────┐
│  LEFT TREE       │       │  CENTER SHEET           │       │  RIGHT LIBRARY │
│                  │       │                         │       │                │
│  Zustand:        │──R/W─→│  Zustand:               │       │  ❌ No store   │
│  selectedNodeId  │       │  selectedNodeId         │       │     access     │
│  expandedNodeIds │       │                         │       │                │
│                  │       │  insertTargetNodeId     │       │                │
│                  │       │  (derived from selected │       │                │
│                  │       │   node kind)            │       │                │
│                  │       │                         │       │                │
│                  │       │  Event listener:        │←──────│  Dispatches:   │
│                  │       │  archestimator:add-     │ event │  archestimator:│
│                  │       │  library-item           │       │  add-library-  │
│                  │       │                         │       │  item          │
│                  │       │                         │       │                │
│                  │       │  insertLibraryItem()    │       │                │
│                  │       │  setPendingFocusRowId() │       │                │
└──────────────────┘       └─────────────────────────┘       └────────────────┘
```

### Missing wires (specific)

| # | From | To | What | Implementation |
|---|------|-----|------|---------------|
| 1 | Zustand store | `EstimateRightSidebar` | `selectedNodeId`, `selectedNodeKind`, `selectedNodeName` | Import `useEstimateWorkspaceSelection` in sidebar |
| 2 | `EstimateSheetContent` | `EstimateRightSidebar` | `onInsertComponent` callback (not event) | Pass prop from page or sheet |
| 3 | `EstimateRightSidebar` | `EstimateSheetContent` | Insert success/failure signal | Callback return value or separate event |
| 4 | Center Sheet | Right Sidebar | `lastInsertedRowId` for auto-close preview | Prop or context |

---

## 6. Accessibility Gaps (Complete)

| Gap | Severity | Fix |
|-----|----------|-----|
| Cards use `role="button"` on `<div>` | Medium | Change to `<button>` element |
| No `role="list"` / `role="listitem"` on card container | Medium | Add list semantics |
| No arrow-key navigation between cards | Medium | Implement roving tabindex |
| Escape doesn't dismiss delete confirmation | Medium | Add to Escape cascade |
| No focus management on modal/dialog open | Medium | `useEffect` to move focus |
| Native `<details>/<summary>` inconsistent AT behavior | Medium | Replace with custom dropdown |
| No `aria-live` region for insert/delete | Medium | Add polite live region |
| No skip link to sidebar | Low | Add skip navigation |
| `/` shortcut fires behind open modal | Low | Check `showNewComponent` |
