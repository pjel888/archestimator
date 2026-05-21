# Component Library Right Sidebar — Cross-Pane UX Flows & Happy Paths (Second Pass)

**Date:** 2026-05-21
**Auditor:** Claude (second pass, corrected cross-surface map)
**Context:** Three-pane estimate workspace: Left Tree ↔ Center Sheet ↔ Right Library
**User:** Contractor/estimator under time pressure

---

## 1. Flow Framework

Each cross-pane flow describes:
- **Trigger:** What starts the flow (user intention)
- **Preconditions:** Required state in each pane before flow begins
- **Pane Actions:** Sequence of actions across Tree, Sheet, and Sidebar
- **State Changes:** Resulting state in each pane after flow completion
- **Success Signal:** How user knows the flow succeeded
- **Current Reality:** What actually happens — verified against live code
- **Friction Points:** Specific code-level causes of deviations from happy path
- **Target State:** What the improvement plan envisions after fixes

---

## 2. Seven Primary Cross-Pane Flows

### Path A: Insert a Known Component into an Area

**Trigger:** Estimator knows what material/item they need (e.g., "LED downlight 18W").

#### Happy Path (Target State)

1. Estimator has **Kitchen** area selected in left tree.
2. Center sheet shows Kitchen rows.
3. Sidebar header shows **"Inserting into: Kitchen"** (target indicator).
4. Estimator presses `/` (or Cmd+K) — search focused, ready to type.
5. Types `led down`.
6. Sidebar filters in real-time; "LED Downlight, Recessed, 18W" ranks first.
7. Estimator presses **Enter**.
8. Component inserts into Kitchen.
9. **Quantity cell auto-focused and selected.**
10. Estimator types `6`, presses Enter.
11. Subtotal updates. Row shows `Saved` badge.
12. Sidebar preview auto-closes (or stays open for next search).

**Time target:** < 3 seconds from search to quantity entry.

#### Current Reality (verified against code)

1. Estimator clicks sidebar search (or presses `/`).
2. Types `led down`.
3. Sidebar shows results — Add button enabled regardless of tree selection.
4. Estimator **clicks** Add on the card or preview panel.
5. `addComponent` fires: updates recents in state + localStorage, dispatches `archestimator:add-library-item` CustomEvent.
6. `EstimateSheetContent` listener fires, checks `insertTargetNodeId`.
7. **If Kitchen is selected:** `insertTargetNodeId` = Kitchen's ID → `insertLibraryItem` fires. Row appears.
8. **If a group is selected:** `insertTargetNodeId = ""` → guard `if (customEvent.detail && insertTargetNodeId)` fails → event **silently dropped**. No error. No feedback. Recents still updated (misleading).
9. After insert, `setPendingFocusRowId(newItem.id)` fires.
10. `useEffect` watches `pendingFocusRowId`, waits for `requestAnimationFrame`, then `querySelector`s for `[data-estimate-row-id="..."][data-estimate-cell-index="0"]`.
11. If DOM ready → focuses and selects quantity input. If not → silently fails.
12. User must manually scroll to find new row if it's below the viewport.

#### Friction Points (with root causes)

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| A1 | Add requires mouse click (no Enter-to-insert) | High | No keyboard handler on search results; only `/` to focus |
| A2 | Silent failure on non-area selection | **Critical** | Sidebar has no selection awareness; `insertTargetNodeId` is `""` |
| A3 | No auto-scroll to new row | High | `requestAnimationFrame` without `scrollIntoView` |
| A4 | No focus fallback if DOM not ready | High | Single rAF, no retry, no MutationObserver |
| A5 | Recents update even on failed insert | High | `addComponent` updates recents *before* dispatching event |
| A6 | Add button never disabled | Medium | Sidebar doesn't know target validity |

---

### Path B: Browse and Discover Components

**Trigger:** Estimator browses the library to understand available options.

#### Happy Path (Target State)

1. Estimator clicks filter → Category → `Finishes`.
2. Filters Supplier → only suppliers with Finishes items.
3. Switches to **Grid view** for visual scanning.
4. Each card shows: image, name, price, **staleness indicator** (green/amber/red dot).
5. Hover: shows quick specs (size, slip rating, coverage).
6. Click → preview panel with full metadata, pricing source, date.
7. Clicks **Add to Kitchen** (target shown).
8. Row inserted with source metadata.

#### Current Reality

1. Estimator clicks filter → Category → `Finishes`.
2. Supplier filter shows **all** suppliers — not pre-filtered to Finishes.
3. **View mode is frozen at compact** (no UI toggle).
4. Hover: shows action buttons only (no quick specs).
5. Click → preview shows image, price, description. **No pricing date, no source, no confidence.**
6. Add button shows no target name.
7. Row inserts with no source/confidence metadata.

#### Friction Points

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| B1 | Grid view unreachable | High | `useState(viewMode)` has **no setter extracted** |
| B2 | No confidence/trust at card level | Medium | `pricingDate`, `pricingSource`, `isCustom` not rendered in cards |
| B3 | Supplier facet shows all values even when filtered | Low | `facets` useMemo computes from all `libraryItems`, not from filtered results |
| B4 | No quick specs on hover | Low | Card hover state only shows action buttons |
| B5 | Source metadata doesn't travel with inserted row | Medium | `cloneLibraryItemForEstimate` doesn't copy `pricingSource`/`pricingDate` |

---

### Path C: Create a Custom Component

**Trigger:** Estimator has a supplier quote for an item not in the library.

#### Happy Path (Target State)

1. Clicks **+** in sidebar toolbar.
2. Compact form opens (modal or inline).
3. Enters: name, category, supplier, unit, price.
4. Optionally: uploads image from computer.
5. Sets confidence to `Low` (single quote, unverified) — datetime field.
6. Clicks **Save & Add**.
7. Created + inserted in one action, quantity focused.
8. Component appears in library with `Custom` badge.

#### Current Reality

1. Clicks **+** → modal opens with 14 fields (overwhelming).
2. All fields are text inputs — no numeric steppers, no date picker, no file upload.
3. Fills required fields. Optional fields mostly skipped.
4. Clicks Save or Save & Add.
5. `createComponent` runs: all string→number conversions via `Number(val) || 0` — invalid input silently becomes 0.
6. Component created, modal closes.
7. If Save & Add: inserts via same CustomEvent path (subject to same silent failure).
8. No image upload — URL text field only.

#### Friction Points

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| C1 | 14 text fields — no numeric validation | High | `createComponent` uses `Number(val) \|\| 0` |
| C2 | No image upload (URL only) | Medium | Form only has `<ControlInput>` text field |
| C3 | No confidence/date fields in form | Medium | Form type has no `pricingDate`/`pricingSource` inputs |
| C4 | Save & Add subject to silent failure | Critical | Same CustomEvent path as Path A |
| C5 | Form dirty state lost on accidental close | Medium | `onOpenChange` resets form unconditionally |

---

### Path D: Reuse Recent/Favorite Components

**Trigger:** Estimator is pricing a standard room type with repeated items.

#### Happy Path (Target State)

1. Sidebar shows **Recent** quick-strip at top: last 8 used components.
2. Or: clicks **Favorites** filter → sees starred items.
3. Or: switches to **Assemblies** tab → selects "Standard Bathroom Set".
4. Assembly preview shows child rows with default quantities.
5. Clicks **Insert into Bathroom 2**.
6. All rows insert as a unit (collapsible group).
7. Quantities pre-filled from template.
8. Edit only the quantities that differ.

#### Current Reality

1. Must click **Recent** filter chip to see recent items — no proactive display.
2. Must click **Favorites** filter chip — no pinned section.
3. No assemblies or templates exist.
4. Each of 8 items must be searched/found/clicked individually (8x the friction).
5. No multi-insert — one click, one row.

#### Friction Points

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| D1 | No recent quick-strip | Medium | No UI for recent items above search results |
| D2 | No assemblies/templates | High | Feature not built |
| D3 | Favorites require filtering | Low | No "always on top" section |
| D4 | Multi-insert not supported | High | No quantity control on Add; no batch insert API |

---

### Path E: Review and Clean Up Library

**Trigger:** Estimator notices duplicate or outdated components while estimating.

#### Happy Path (Target State)

1. Searches for `paint`.
2. Sees 3 similar items — staleness badge visible: one is **red** (180+ days).
3. Clicks sort → **By pricing date** → identifies oldest.
4. Clicks stale item → preview shows full source, date, confidence.
5. Clicks **Edit** → inline form, updates price.
6. Or: selects multiple stale items → **Bulk delete** or **Mark for review**.

#### Current Reality

1. Search for `paint` — no staleness visible on cards.
2. Sort mode **frozen at relevance** — no UI to change to price date.
3. Click each preview → pricing date buried in small text.
4. No sort by pricing date in UI (though `recentAdded` sort mode exists in code).
5. Must manually compare dates across previews.
6. No bulk actions — delete one by one.
7. No "Edit" — must duplicate, modify, delete original.

#### Friction Points

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| E1 | No staleness on cards | Medium | `pricingDate` not rendered in card component |
| E2 | Sort by pricing date unreachable | Medium | `sortMode` frozen at mount; no sort UI |
| E3 | No true edit | Medium | Preview is read-only; no edit mode |
| E4 | No bulk select/delete | Medium | No selection state; per-item actions only |

---

### Path F: Navigate Tree → Insert → Edit Quantity Loop

**Trigger:** Estimator methodically works through a building, room by room.

#### Happy Path (Target State)

1. Selects **Foyer** in left tree (click or keyboard).
2. Center sheet updates to Foyer rows.
3. Sidebar shows **"Inserting into: Foyer"** in header.
4. Searches `tile`, inserts porcelain tile.
5. Quantity auto-focused → types `18` → Enter.
6. Row auto-saves.
7. Presses **Down arrow** → next editable cell in sheet.
8. After Foyer complete, clicks **Living Area** in tree.
9. Sidebar target updates: **"Inserting into: Living Area"**.
10. Repeat keyboard-only.

#### Current Reality

1. Click Foyer in tree → `setSelectedNodeId` in Zustand store → router.push.
2. Sheet updates from new route.
3. **Sidebar has no target indicator** — no selection awareness.
4. Search `tile`, click Add.
5. If Foyer selected: inserts. If parent group: **silent failure**.
6. `pendingFocusRowId` set → rAF → querySelector → maybe focuses quantity.
7. No auto-scroll to new row.
8. Click Living Area in tree → sidebar unchanged.
9. **Sidebar has no visibility into tree at all.**

#### Friction Points

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| F1 | No visible insertion target in sidebar | High | Sidebar doesn't import Zustand store |
| F2 | Silent failure breaks keyboard loop | Critical | Event dispatch with no error path |
| F3 | No auto-focus/scroll on quantity | High | Fragile rAF+querySelector, no scrollIntoView |
| F4 | Tree nav requires mouse | Medium | No keyboard tree navigation (separate issue) |
| F5 | Sheet cell nav incomplete | Medium | Arrow keys wired but not all cells editable |

---

### Path G: Drag-and-Drop Insert (NEW)

**Trigger:** Estimator drags a library card directly onto the center sheet.

#### Happy Path (Target State)

1. Estimator drags "Porcelain Tile 60×60" from library card.
2. Custom drag ghost shows: thumbnail + name + price.
3. Drags over center sheet → **drop zones highlight** on valid areas.
4. Drops onto "Kitchen" area drop zone.
5. Row inserts with visual feedback (brief highlight flash).
6. Quantity auto-focused.

#### Current Reality

1. `LibraryItemCard` sets `draggable`, `onDragStart` sets `dataTransfer` with JSON.
2. `effectAllowed: "copy"` — correct for library→estimate.
3. **No custom drag ghost** — browser default ghost (text only).
4. Center sheet has `EstimateDropZone` components (inline in `EstimateSheetContent.tsx`).
5. Drop zones show highlight on `dragOver`.
6. On drop, `insertLibraryItem` fires with the JSON-deserialized item.
7. **Drop target validation works** — `insertLibraryItem` checks `targetNode.kind === "area"`.
8. But **no touch support** — only mouse drag on desktop.

#### Friction Points

| # | Friction | Severity | Root Cause |
|---|----------|----------|------------|
| G1 | No custom drag ghost | Low | `setDragImage` not called |
| G2 | No touch drag support | Medium | No `onTouchStart`/`onTouchMove` handlers |
| G3 | Drop zones only visible during drag | Low | Design choice (acceptable) |
| G4 | JSON serialization for drag data | Low | Large objects in dataTransfer (but items are small) |

---

## 3. Error Paths (Anti-Happy)

### Error Path 1: Non-Area Selected → Insert

- **User action:** Clicks Add while "Main House" group is selected in tree.
- **Code path:** `addComponent` → dispatch CustomEvent → listener checks `insertTargetNodeId` → `""` → guard fails → nothing happens.
- **User perception:** "Is it broken? Did it insert somewhere?" Clues: recents updated (misleading), preview may close.
- **Recovery:** User must discover they need to select an area. No guidance provided.
- **Fix priority:** P0 — Add must be disabled with explanation when target is invalid.

### Error Path 2: Duplicate Insert

- **User action:** Forgets they already inserted LED downlight, inserts again.
- **Code path:** Same as Path A. No duplicate detection in `insertLibraryItem`.
- **User perception:** "Did I double-count this?"
- **Recovery:** Manual scanning and deletion. No undo.
- **Fix priority:** P2 — dedup check in `insertLibraryItem` with confirmation.

### Error Path 3: Stale Price Used

- **User action:** Inserts item with `pricingDate: 2025-01-15` (16 months old).
- **Code path:** `insertLibraryItem` copies all fields including `pricingDate` to new row.
- **User perception:** "This estimate is wrong and I didn't know."
- **Recovery:** Manual review of every row's source (impossible at scale).
- **Fix priority:** P1 — staleness indicator before insert + warning on stale insert.

### Error Path 4: Library Item Deleted But Rows Remain

- **User action:** Deletes custom component from library.
- **Code path:** Item removed from `libraryItems` state.
- **Result:** Existing estimate rows unchanged — correctly, since they're independent copies with `source_snapshot`. The DB schema handles this: `estimate_row_items.source_library_item_id` has `ON DELETE SET NULL`, so the FK nullifies but the row survives with its `source_snapshot` intact.
- **User perception:** "Can I still trust this row? Will it break?"
- **Recovery:** The `source_snapshot` jsonb preserves the original library data (category, imageUrl, pricingDate, pricingSource, sourceUrl, tags) at insert time. The row is not orphaned — it has its own snapshot. However, the user can no longer click through to the source library item.
- **Fix priority:** P2 — show a "library item deleted" indicator in the estimate row if `source_library_item_id` is null but `source_snapshot` exists.

### Error Path 5: localStorage Write Failure (NEW)

- **User action:** Favorites a component, creates a custom component, or changes preferences.
- **Code path:** `persistFavorites`, `addComponent`, or prefs useEffect calls `localStorage.setItem` with no try/catch.
- **Result:** If storage is full or disabled, the write throws. State is updated in React (UI reflects change) but not persisted. On refresh, change is lost.
- **User perception:** "My favorites disappeared after refresh."
- **Recovery:** None — state/persistence mismatch.
- **Fix priority:** P1 — wrap all `localStorage.setItem` calls in try/catch.

### Error Path 6: Form Dirty State Lost on Modal Close (NEW)

- **User action:** Types extensively in New Component form. Accidentally clicks scrim or presses Escape.
- **Code path:** `onOpenChange(false)` → `setForm(defaultForm)` → all data lost.
- **Result:** No confirmation prompt, no draft save. Work lost silently.
- **Fix priority:** P2 — warn before closing with dirty form.

---

## 4. Cross-Surface Interaction Map (Corrected)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PROJECT WORKSPACE HEADER                                                     │
│  Shows: project total, row count, version                                     │
│  Events received: archestimator:project-total-change                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  ┌──────────────────────────────┐  ┌───────────────────┐
│  LEFT TREE          │  │  CENTER SHEET                │  │  RIGHT LIBRARY    │
│                     │  │                              │  │                   │
│  Zustand store:     │  │  Zustand store (same):       │  │  ❌ No Zustand    │
│  • selectedNodeId ──┼──│  • selectedNodeId            │  │     access        │
│  • expandedNodeIds  │  │  • derive insertTargetNodeId │  │                   │
│                     │  │                              │  │  Library state:   │
│  Actions:           │  │  State:                      │  │  • libraryItems   │
│  • Click node →     │  │  • estimateTree (local)      │  │  • filters        │
│    setSelectedNodeId│  │  • editableRows (local)      │  │  • searchQuery    │
│    → router.push    │  │  • pendingFocusRowId         │  │  • viewMode ❄     │
│                     │  │                              │  │  • sortMode ❄     │
│  ❌ No awareness    │  │  Functions:                  │  │  • groupBy        │
│     of library      │  │  • insertLibraryItem()       │  │                   │
│                     │  │  • updateRowItem()           │  │  Communication:   │
│                     │  │  • replaceRowItem()          │  │  • dispatch       │
│                     │  │  • deleteRowItem()           │  │    CustomEvent ───┼──→
│                     │  │                              │  │                   │
│                     │  │  Event listener:             │  │  ❌ No feedback   │
│                     │  │  archestimator:add- ←────────┼──     from sheet     │
│                     │  │  library-item                │  │                   │
│                     │  │                              │  │                   │
│                     │  │  Drop zones:                 │  │  Drag source:     │
│                     │  │  EstimateDropZone ←──────────┼── application/x-    │
│                     │  │  (onDrop → insertLibraryItem)│  │  archestimator-   │
│                     │  │                              │  │  library-item     │
└─────────────────────┘  └──────────────────────────────┘  └───────────────────┘
         │                          ▲                              │
         │                          │                              │
         └── Router.push ──────────┘                              │
            (on tree node click)                                  │
                                                                  │
         ❄ = frozen at mount, cannot change                       │
```

### Missing Wires (Specific File Changes)

| # | Wire | From File | To File | Change |
|---|------|-----------|---------|--------|
| 1 | Selection state | `use-estimate-workspace-state.ts` | `component-library/index.tsx` | Import `useEstimateWorkspaceSelection` |
| 2 | `onInsertComponent` callback | `EstimateSheetContent.tsx` → `page.tsx` | `component-library/index.tsx` | Pass `insertLibraryItem` wrapped with target |
| 3 | Insert result | `EstimateSheetContent.tsx` | `component-library/index.tsx` | Return success/failure from callback |
| 4 | Focus + scroll | `EstimateSheetContent.tsx` | (internal) | Add `scrollIntoView` + retry to focus effect |
| 5 | View/sort setters | `component-library/index.tsx` | (internal) | Extract setters, add UI controls |
| 6 | Staleness data | `component-library/helpers.ts` | `component-library/ComponentCard.tsx` | Pass `pricingDate`/`pricingSource` for badge |

---

## 5. Success Metrics (Refined)

| Metric | Current | Target | Blocked By |
|--------|---------|--------|------------|
| Insert known + edit qty | 15–30s (mouse) or ∞ (silent failure) | < 3s (keyboard) | P0.1, P0.2, P2.1 |
| Insert 5 common rows | 60–120s (5× click) | < 15s (keyboard loop) | P0.1, P0.2 |
| Time to recover from wrong target | Unbounded (no feedback) | 0s (prevention) | P0.1 |
| Discover/browse confidence | Must click each preview | At-a-glance card indicator | P1.5 |
| Create custom + insert | 30–45s + silent failure risk | < 15s | P0.1, P2.3 |
| Cross-tab consistency | Not supported | Within 1s via storage event | P3 |
| localStorage write reliability | Silent failures possible | Graceful degradation | P1 |
