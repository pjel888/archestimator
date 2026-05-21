# Component Library Cross-Surface Integration Map

**Date:** 2026-05-21
**Purpose:** Document the relationship between all "component library" surfaces: the estimate sidebar, the global manager, the DB schema, the seed data, and the page layouts. Prevent confusion and duplication.

---

## 1. Surface Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHESTIMATOR APP                                  │
│                                                                              │
│  ┌──────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │  ESTIMATE WORKSPACE          │    │  GLOBAL COMPONENT LIBRARY            │ │
│  │  /workshop/projects/[pid]/   │    │  /workshop/components               │ │
│  │  estimates/[nodeId]          │    │                                      │ │
│  │                              │    │  ┌──────────────────────────────┐   │ │
│  │  ┌──────┬─────────┬───────┐ │    │  │ WorkshopPageShell             │   │ │
│  │  │ Tree │ Sheet   │ R.Side│ │    │  │  ┌─────────────────────────┐  │   │ │
│  │  │      │         │ bar   │ │    │  │  │ WorkshopCollectionLayout │  │   │ │
│  │  │      │ inserts │◄─────┼─┼────┼──┼──│ (Search + Toolbar)       │  │   │ │
│  │  │      │ from    │       │ │    │  │  └─────────────────────────┘  │   │ │
│  │  │      │ sidebar │       │ │    │  │  ┌──────┬──────────┬────────┐ │   │ │
│  │  └──────┴─────────┴───────┘ │    │  │  │Facets│ Table    │Inspctr │ │   │ │
│  │                              │    │  │  │      │          │        │ │   │ │
│  │  Sidebar data:               │    │  │  └──────┴──────────┴────────┘ │   │ │
│  │  • estimateLibraryItems[]    │    │  └──────────────────────────────┘   │ │
│  │  • localStorage (fav/recents)│    │                                      │ │
│  │  • Drag payloads             │    │  Manager data:                       │ │
│  │                              │    │  • Seed adapter (Phase 1)            │ │
│  └──────────────────────────────┘    │  • cost_library_items DB (Phase 3)  │ │
│                                      └─────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  DATA LAYER                                                           │   │
│  │                                                                       │   │
│  │  estimate-tree-data.ts          supabase/cost_library_items           │   │
│  │  • estimateLibraryItems (66)    • 4 seed rows (DB)                    │   │
│  │  • EstimateRowItem type         • 21 columns                          │   │
│  │  • Used by: sidebar + seed      • Used by: manager (Phase 3)          │   │
│  │    adapter for manager          • RLS: workspace members              │   │
│  │                                                                       │   │
│  │  component-library/helpers.ts   cost-library-repository.ts            │   │
│  │  • Search, filter, sort, group  • Browser-side only                   │   │
│  │  • localStorage I/O             • No server-side actions yet          │   │
│  │  • Used by: sidebar             • Used by: nothing currently          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

### Estimate Sidebar → Estimate Sheet (Insertion)

```
User clicks "Add" in sidebar
  → addComponent(item)
    → updates recents in state + localStorage
    → dispatches CustomEvent("archestimator:add-library-item", { detail: item })
      → EstimateSheetContent listener fires
        → checks insertTargetNodeId (derived from selectedNode.kind === "area")
        → if valid: insertLibraryItem(targetNodeId, item)
          → appends row to estimate tree
          → sets pendingFocusRowId for quantity focus
          → persists via insertRow() server action
        → if invalid: event silently dropped, no feedback to sidebar
```

**Problem:** Sidebar has no awareness of tree selection state. Silent failure when group selected.

### Global Manager (Read-Only, Phase 1)

```
Page loads /workshop/components
  → ComponentsPageClient renders
    → adapts estimateLibraryItems → ComponentLibraryManagerItem[]
    → pipeline: filter → search → sort → group
    → renders: FacetPanel + Table + Inspector
    → user interactions are read-only
    → no writes, no events, no estimate interaction
```

### Global Manager (With Persistence, Phase 3 — Future)

```
Page loads /workshop/components
  → Server component fetches cost_library_items via server action
  → Passes initial data to client
  → Client renders manager UI
  → User edits item → calls server action → DB updated → revalidate
  → No automatic propagation to estimates
```

---

## 3. Type Relationships

```
EstimateRowItem (seed data, in-memory)
  │  fields: id, material, name?, itemCost, price?, supplier, category,
  │          unit, description?, imageUrl?, pricingSource?, pricingDate?,
  │          discipline?, designation?, tags?, isCustom?, isFavorite?,
  │          lastUsedAt?, supplementaryCosts?, laborCost?, source?
  │
  ├── Used directly by: EstimateRightSidebar (the insertion sidebar)
  │
  ├── Inserted as: estimate_row_items DB row
  │     via: cloneLibraryItemForEstimate() → insertRow() server action
  │     Sets: source_library_item_id = FK to cost_library_items
  │     Sets: source_snapshot = jsonb snapshot of library data at insert time
  │     FK: ON DELETE SET NULL — library item deletion doesn't cascade to estimates
  │
  └── Adapted to: ComponentLibraryManagerItem
       │  via: adaptToManagerItem() (to be created)
       │
       └── Used by: ComponentLibraryManager (the new global manager)

CostLibraryItem (DB row, from cost_library_items)
  │  fields: id, workspace_id, kind, name, description, category,
  │          supplier, brand?, sku?, unit, unit_cost, labor_cost,
  │          supplementary_cost, pricing_source?, pricing_date?,
  │          confidence?, thumbnail_path?, metadata (jsonb), ...
  │
  ├── Referenced by: estimate_row_items.source_library_item_id (FK, SET NULL on delete)
  │
  └── Adapted to: ComponentLibraryManagerItem
       │  via: adaptFromCostLibraryRow() (to be created in Phase 3)
       │
       └── Used by: ComponentLibraryManager (Phase 3)

ComponentLibraryManagerItem (manager-specific canonical type)
  │  fields: id, name, kind, category, supplier, rawSupplier,
  │          brand?, sku?, unit, unitCost, laborCost, supplementaryCost,
  │          pricingSource?, pricingDate?, confidence?, description,
  │          thumbnailPath?, updatedAt?, health, healthIssues[],
  │          discipline?, designation?, tags?, isCustom?
  │
  └── Used by: ComponentLibraryManager UI components only
```

### Source snapshot pattern (how edits don't propagate)

When a library item is inserted into an estimate:

1. `cloneLibraryItemForEstimate()` copies the `EstimateRowItem` fields into a new row
2. `insertRow()` server action:
   - Sets `source_library_item_id = libraryItem.id` (if `source === "library"`)
   - Sets `source_snapshot = getSourceSnapshot(libraryItem)` — captures `{ category, imageUrl, pricingDate, pricingSource, sourceUrl, tags }`
3. The FK has `ON DELETE SET NULL` — deleting a library item nullifies the reference, but the estimate row survives
4. The `source_snapshot` is a point-in-time copy — editing the library item later does NOT affect existing estimate rows

**This is the right pattern.** The "don't silently propagate edits" concern is already handled by the DB schema.

---

## 4. File Ownership

### Estimate sidebar files (do not modify for manager work)

```
src/components/workshop/component-library/
├── index.tsx              ← EstimateRightSidebar (insertion surface)
├── ComponentCard.tsx      ← LibraryItemCard
├── NewComponentForm.tsx   ← Custom component creation form
├── types.ts               ← Sidebar-specific types (ComponentFilters, etc.)
└── helpers.ts             ← Shared helpers (may import from manager)
```

### Global manager files (new, separate directory)

```
src/components/workshop/component-library-manager/
├── ComponentLibraryManager.tsx    ← Orchestrator (optional)
├── ComponentLibraryTable.tsx      ← Dense table/list
├── ComponentLibraryFacets.tsx     ← Left facet panel
├── ComponentLibraryInspector.tsx  ← Right detail inspector
├── types.ts                       ← Manager-specific types
├── adapters.ts                    ← Seed → Manager, DB → Manager
└── helpers.ts                     ← Search, filter, facet computation
```

### Route files

```
src/app/workshop/components/
└── page.tsx               ← Server component, shell wrapper

src/components/workshop/
└── ComponentsPageClient.tsx ← Client component, manager UI (rewrite)
```

### Database

```
supabase/migrations/
└── 20260518090000_archestimator_core_schema.sql  ← cost_library_items table

src/lib/repositories/
└── cost-library-repository.ts  ← Browser-side (will need server variant)

src/lib/cost-library/           ← Does NOT exist yet (create in Phase 3)
└── actions.ts                  ← Server actions for CRUD
```

---

## 5. Communication Between Surfaces

### Sidebar ↔ Sheet (estimate workspace)

| Direction | Mechanism | Data | Status |
|-----------|-----------|------|--------|
| Sidebar → Sheet | `CustomEvent("archestimator:add-library-item")` | `EstimateRowItem` | Active, has silent-failure bug |
| Sidebar → Sheet | Drag-and-drop `DataTransfer` | `application/x-archestimator-library-item` | Active |
| Sidebar → Sheet | `onInsertComponent` prop | `EstimateRowItem` | Typed but **never wired in production** |
| Sheet → Sidebar | None | — | ❌ No feedback channel |

### Manager ↔ Estimate Workspace

| Direction | Mechanism | Data | Status |
|-----------|-----------|------|--------|
| Manager → Estimate | None planned | — | Manager is independent; no insert-from-manager path |
| Estimate → Manager | None | — | Manager is independent |
| Shared data | Both adapt from same source types | `EstimateRowItem` or `CostLibraryItem` | Adapter layer handles conversion |

### Cross-cutting (workshop-wide)

| Mechanism | Used By | Data |
|-----------|---------|------|
| `WorkshopPageShell` | All workshop routes | Layout wrapper |
| `WorkshopCollectionLayout` | Projects, Components | Search + Toolbar rhythm |
| `MainSidebar` | All workshop routes | Navigation (Components = ⌘3) |
| `WorkshopTitleHeader` | All workshop routes | Title, breadcrumb |

---

## 6. States to Synchronize

| State | Sidebar | Manager | Sync needed? |
|-------|---------|---------|-------------|
| Favorites | localStorage | User-scoped (future) | Could sync via DB or localStorage |
| Recents | localStorage | User-scoped (future) | Could sync |
| Created custom items | In sidebar state only | In DB (future) | Manager is source of truth (future) |
| Deleted items | Removed from sidebar state | Archived in DB (future) | Manager is source of truth (future) |
| Price edits | Not applicable | In DB (future) | Does not propagate to estimates |
| Search/filter/sort | Local to sidebar | Local to manager | Not shared |
| View preferences | localStorage (frozen bug) | Local state (future) | Not shared |

---

## 7. Anti-Patterns to Avoid

| Anti-pattern | Why it's bad |
|-------------|-------------|
| Manager dispatches add-to-estimate events | Manager is a browsing surface, not insertion. Use sidebar for insertion. |
| Sidebar becomes a mini-manager | Sidebar is 380px wide, tuned for quick find-and-insert. Don't add edit/bulk/health workflows there. |
| Sharing UI components between sidebar and manager | Different layouts, different jobs. Share helpers and types, not UI components. |
| Manager writes to `EstimateRowItem` shape | Manager should write to `cost_library_items` DB rows. `EstimateRowItem` is for estimates. |
| Manager edits silently propagate to estimates | Library edits are library edits. Estimate rows are snapshots. Never auto-propagate. |
| Import/export uses sidebar format | Use `CostLibraryItem` or a canonical format, not the estimate insertion format. |
| Both surfaces use the same localStorage keys | Namespace keys: `archestimator_manager_*` vs `archestimator_component_library_*` |
