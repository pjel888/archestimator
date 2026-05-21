# `/workshop/components` UX/UI Implementation Plan (Second Pass)

**Date:** 2026-05-21
**Auditor:** Claude (second pass — corrected for live files, real schema, actual primitives)
**Goal:** Turn `/workshop/components` from a placeholder card grid into a compact, searchable, table-first global Component Library manager with supplier/category pivots, price-health visibility, and a right-side detail inspector.

**Architecture:** Keep the route inside the existing `WorkshopPageShell` + `WorkshopCollectionLayout`. Build a new manager component tree separate from the estimate insertion sidebar. Start read-only with seed data adapter, then add persistent CRUD after schema/action boundary is ready.

**Tech Stack:** Next.js 16, React/TypeScript, Tailwind v4, existing UI primitives, Supabase `cost_library_items`, Bun/Vitest.

---

## Preconditions

1. The current route is a **card-grid placeholder** (`ComponentsPageClient.tsx` is 59 lines). The footer says "Content pending approved workflow" to users. This must be replaced.

2. Before editing any symbol, run impact analysis (GitNexus or code-review-graph tools if available).

3. Contracts to preserve:
   - `WorkshopPageShell` API: `title`, `eyebrow`, `showEyebrow`, `breadcrumbs`, `footer`, `contentClassName`, `children`
   - `WorkshopCollectionLayout` API: `searchLabel`, `searchPlaceholder`, `searchValue`, `onSearchChange`, `toolbarLabel`, `toolbarPrefix`, `onFilter`, `onGroup`, `onAdd`, `addVisibleLabel`, `searchActions`, `children`
   - Estimate sidebar: `application/x-archestimator-library-item` drag MIME type, `archestimator:add-library-item` event, `onInsertComponent` prop signature
   - App density: ≤12px fonts, 9-11px controls
   - 38px search/toolbar rhythm

4. **Read-only first slice only.** No DB writes. Mutation controls disabled with clear copy. Server-side repository and actions are not yet built.

---

## Phase 0 — Fix the Placeholder (Do This First)

### Task 0.1: Replace footer text

**Problem:** Footer says "Component library shell | Content pending approved workflow" — visible to users.

**Files:**
- `src/app/workshop/components/page.tsx` (line ~15)

**Change:**
```tsx
// BEFORE
footer={<>Component library shell | Content pending approved workflow</>}

// AFTER
footer={<>Workspace library</>}
```

**Acceptance:** Footer shows clean text. No "pending workflow" language visible to users.

### Task 0.2: Add search placeholder that reflects manager purpose

**Files:**
- `src/components/workshop/ComponentsPageClient.tsx` (line ~30)

**Change:**
```tsx
// BEFORE
searchPlaceholder="Search components"

// AFTER
searchPlaceholder="Search components, suppliers, category, unit..."
```

---

## Phase 1 — Read-Only Manager UI (With Seed Data Adapter)

### Task 1.1: Create manager-specific types and adapters

**Objective:** Normalize `EstimateRowItem` seed data into a `ComponentLibraryManagerItem` shape that the manager table/list can consume. This adapter will later be swapped for a DB adapter without changing the UI.

**Files:**
- **Create:** `src/components/workshop/component-library-manager/types.ts`
- **Create:** `src/components/workshop/component-library-manager/adapters.ts`
- **Test:** `tests/vitest/component-library-manager-adapters.test.ts`

**Model shape:**

```ts
export type LibraryHealthIssue =
  | "missing-price"
  | "missing-source"
  | "missing-date"
  | "low-confidence"
  | "stale-price";

export type LibraryPriceHealth = "current" | "needs-review" | "stale" | "missing";

export type ComponentLibraryManagerItem = {
  id: string;
  name: string;
  kind: "material" | "labor" | "equipment" | "subcontract" | "assembly" | "allowance";
  category: string;
  supplier: string;
  rawSupplier: string | null;
  brand?: string;
  sku?: string;
  unit: string;
  unitCost: number | null;
  laborCost: number | null;
  supplementaryCost: number | null;
  pricingSource?: string;
  pricingDate?: string;
  confidence?: string;
  description: string;
  thumbnailPath?: string;
  updatedAt?: string;
  health: LibraryPriceHealth;
  healthIssues: LibraryHealthIssue[];
  // Fields for filtering/grouping
  discipline?: string;
  designation?: string;
  tags?: string[];
  isCustom?: boolean;
};
```

**Adapter rules (EstimateRowItem → ComponentLibraryManagerItem):**
- `name` ← `item.material` or `item.name ?? item.material`
- `kind` ← default to `"material"` for seed items (seed data has no kind field)
- `unitCost` ← `item.price ?? item.itemCost` (preserve null for unknown, don't collapse to 0)
- `supplementaryCost` ← `item.supplementaryCosts ?? 0`
- `laborCost` ← `item.laborCost ?? 0`
- `pricingSource` ← `item.pricingSource`
- `pricingDate` ← `item.pricingDate`
- `thumbnailPath` ← `item.imageUrl`
- `supplier` ← `item.supplier || "No supplier"`; `rawSupplier` ← `item.supplier ?? null`
- `category` ← `item.category || "Uncategorized"`
- `description` ← `item.description ?? ""`
- `discipline` ← `item.discipline`
- `designation` ← `item.designation`
- `tags` ← `item.tags`
- `isCustom` ← `item.isCustom ?? false`

**Price-health derivation:**
```ts
export function deriveHealth(item: ComponentLibraryManagerItem): {
  health: LibraryPriceHealth;
  healthIssues: LibraryHealthIssue[];
} {
  const issues: LibraryHealthIssue[] = [];

  // Missing price (null or zero, unless intentional allowance)
  if (item.unitCost === null || item.unitCost === 0) {
    issues.push("missing-price");
  }
  // Missing source
  if (!item.pricingSource) {
    issues.push("missing-source");
  }
  // Missing date
  if (!item.pricingDate) {
    issues.push("missing-date");
  }
  // Low confidence
  if (item.confidence === "low" || !item.confidence) {
    issues.push("low-confidence");
  }
  // Stale price (> 90 days)
  if (item.pricingDate) {
    const days = daysBetween(item.pricingDate, new Date().toISOString());
    if (days > 90) {
      issues.push("stale-price");
    }
  }

  // Determine overall health (highest priority first)
  if (issues.includes("missing-price")) return { health: "missing", healthIssues: issues };
  if (issues.includes("missing-source") || issues.includes("missing-date")) return { health: "needs-review", healthIssues: issues };
  if (issues.includes("stale-price") || issues.includes("low-confidence")) return { health: "stale", healthIssues: issues };
  return { health: "current", healthIssues: issues };
}
```

**Test cases:**
- Converts seed `EstimateRowItem` to manager item shape
- Derives `missing-price` for null/zero cost
- Derives `missing-source` and `missing-date` independently
- Preserves multiple health issues
- Maps missing supplier to display "No supplier", preserves raw null
- Maps missing category to "Uncategorized"
- Defaults kind to "material" for seed items

---

### Task 1.2: Build facet and search helpers

**Objective:** Support filter-by-facet and search across all relevant fields.

**Files:**
- **Create:** `src/components/workshop/component-library-manager/helpers.ts`
- **Test:** `tests/vitest/component-library-manager-helpers.test.ts`

**Functions:**
```ts
// Search across: name, category, supplier, brand, sku, unit, description, tags
searchManagerItems(items: ComponentLibraryManagerItem[], query: string): ComponentLibraryManagerItem[]

// Filter by multiple facet values (AND within a facet group, OR across groups if multi-select)
filterManagerItems(items: ComponentLibraryManagerItem[], filters: ManagerFilters): ComponentLibraryManagerItem[]

// Group by: category, supplier, kind, health, none
groupManagerItems(items: ComponentLibraryManagerItem[], groupBy: ManagerGroupBy): [string, ComponentLibraryManagerItem[]][]

// Sort by: name, category, supplier, unitCost asc/desc, updated
sortManagerItems(items: ComponentLibraryManagerItem[], sortBy: ManagerSortBy): ComponentLibraryManagerItem[]

// Compute facets from items: { categories: {value: string, count: number}[], suppliers: [...], kinds: [...], ... }
getManagerFacets(items: ComponentLibraryManagerItem[]): ManagerFacets
```

---

### Task 1.3: Build the dense table/list component

**Objective:** Replace the card grid with a data-dense table that is the default view.

**Files:**
- **Create:** `src/components/workshop/component-library-manager/ComponentLibraryTable.tsx`
- **Test:** `tests/vitest/component-library-manager-ui.test.tsx`

**Required behavior:**
- Renders compact rows (32-40px height)
- Shows: health dot, name, kind badge, category, supplier, unit, unit cost
- Health dot: colored circle with tooltip on hover listing all health issues
- Row click → `onSelect(item.id)`
- Row hover → subtle background change
- Selected row → accent border/highlight (when inspector is open)
- Empty state: passed from parent via `EmptyState`
- No card grid fallback — this IS the default view

**Columns (always visible):**
```
● | Name          | Kind      | Category   | Supplier    | Unit | Unit Cost   | Source
```

**Technical note:** This does NOT need TanStack Table (used in `ProjectEstimatesTable`). A simple flexbox/grid layout with column widths is sufficient for MVP. Sort headers can be native `<button>` elements with arrow indicators.

---

### Task 1.4: Build the left facet panel

**Objective:** Replace the filter chip UI from the estimate sidebar with a persistent left panel suitable for a manager.

**Files:**
- **Create:** `src/components/workshop/component-library-manager/ComponentLibraryFacets.tsx`
- **Test:** included in manager UI tests

**Sections (top to bottom):**

1. **Quick status views:**
   - All (count)
   - Needs Review (count, warning tone)
   - Missing Price (count, danger tone)
   - Missing Source (count, danger tone)

2. **Category** — collapsible, each value with count, click to filter
3. **Supplier** — collapsible, each value with count
4. **Kind** — material/labor/equipment/subcontract/assembly/allowance with counts
5. **Price Health** — current/needs review/stale/missing with counts

**Behavior:**
- Clicking a facet value filters the table (single-select for status views, multi-select for category/supplier/kind)
- Active filters visually indicated
- "Clear all filters" button when any filter active
- Counts update based on current filter state (e.g., selecting "Finishes" category updates supplier counts to only show suppliers with Finishes items)
- Collapsible on narrow viewports

---

### Task 1.5: Build the read-only detail inspector

**Objective:** Let users inspect an item's full details without leaving the list.

**Files:**
- **Create:** `src/components/workshop/component-library-manager/ComponentLibraryInspector.tsx`
- **Test:** included in manager UI tests

**Layout:**
- Right-side panel, 360-420px wide
- Sticky header: name + health badge + close button
- Scrollable body with sections: Identity, Pricing, Supplier/Source, Description/Spec, Health
- Sticky footer: Edit (disabled), Duplicate (disabled), Close

**Since no drawer/slideover primitive exists:** For the read-only first slice, the inspector can be a conditional `aside` element rendered alongside the table inside the content area (using CSS `flex`). This avoids needing a new primitive before the UX is validated. A proper drawer/slideover primitive can be extracted later.

```tsx
<div className="flex h-full min-h-0">
  {showFacets && <ComponentLibraryFacets ... />}
  <ComponentLibraryTable ... className="flex-1" />
  {selectedItem && <ComponentLibraryInspector ... className="w-[380px] shrink-0" />}
</div>
```

**Sections (read mode):**
- **Identity:** Name, Kind badge, Category, Brand/SKU
- **Pricing:** Unit, Unit Cost, Labor Default, Other Default, Pricing Source, Pricing Date, Confidence
- **Supplier/Source:** Supplier, Source URL, Notes
- **Description/Spec:** Description, Tags as Badge chips
- **Health:** Full list of health issues with descriptions

**Actions:**
- Close (X) — always enabled
- Edit (disabled with tooltip: "Editing library items is not enabled yet")
- Duplicate (disabled)

---

### Task 1.6: Replace placeholder route content with the manager

**Objective:** Wire everything together in `ComponentsPageClient.tsx` so `/workshop/components` shows the manager.

**Files:**
- **Modify:** `src/components/workshop/ComponentsPageClient.tsx` — complete rewrite
- **Possibly create:** `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` — orchestrator component

**ComponentsPageClient new structure:**

```tsx
"use client";

export function ComponentsPageClient() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ManagerFilters>(defaultFilters);
  const [groupBy, setGroupBy] = useState<ManagerGroupBy>("none");
  const [sortBy, setSortBy] = useState<ManagerSortBy>("name");
  const [showFacets, setShowFacets] = useState(true);

  // Convert seed data via adapter
  const items = useMemo(() => estimateLibraryItems.map(adaptToManagerItem), []);

  // Pipeline: filter → search → sort → group
  const filtered = useMemo(() =>
    searchManagerItems(filterManagerItems(items, filters), searchQuery),
    [items, filters, searchQuery]
  );
  const sorted = useMemo(() => sortManagerItems(filtered, sortBy), [filtered, sortBy]);
  const grouped = useMemo(() => groupManagerItems(sorted, groupBy), [sorted, groupBy]);

  const selectedItem = useMemo(() =>
    items.find(i => i.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const facets = useMemo(() => getManagerFacets(filtered), [filtered]);

  return (
    <WorkshopCollectionLayout
      searchLabel="Search library"
      searchPlaceholder="Search components, suppliers, category, unit..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      toolbarLabel="Library tools"
      toolbarPrefix="library"
      onFilter={() => setShowFacets(v => !v)}
      onGroup={() => setGroupBy(toggleGroup)} // or dropdown
      addVisibleLabel="New component"
      // addDisabled in read-only mode
    >
      <div className="flex h-full min-h-0 gap-0">
        {showFacets && (
          <ComponentLibraryFacets
            facets={facets}
            filters={filters}
            onChange={setFilters}
            className="w-[240px] shrink-0 overflow-auto border-r border-hairline"
          />
        )}
        <ComponentLibraryTable
          items={grouped}
          groupBy={groupBy}
          sortBy={sortBy}
          onSort={setSortBy}
          selectedId={selectedItemId}
          onSelect={setSelectedItemId}
          searchQuery={searchQuery}
          className="min-w-0 flex-1 overflow-auto"
        />
        {selectedItem && (
          <ComponentLibraryInspector
            item={selectedItem}
            onClose={() => setSelectedItemId(null)}
            className="w-[380px] shrink-0 overflow-auto border-l border-hairline"
          />
        )}
      </div>
    </WorkshopCollectionLayout>
  );
}
```

**Acceptance criteria:**
- Placeholder "Content pending approved workflow" is gone from all visible text
- Default view is a dense table, not a card grid
- Search filters across name, category, supplier, unit
- Facet panel shows category/supplier/kind/health with counts
- Clicking a facet filters the table
- Selecting a row opens the inspector
- Inspector shows all item details with health information
- Read-only mode: no New/Edit/Duplicate controls are active
- Route-level test asserts no placeholder copy exists

---

## Phase 2 — Shared Primitives (Pre-requisites for P2 Features)

Before proceeding to Phase 3 (persistence), these shared primitives should exist:

### Task 2.1: Create Skeleton component

**Files:**
- **Create:** `src/components/ui/skeleton.tsx`

**Variants:**
- Text line (width + height)
- Table row (repeating text lines in a row layout)
- Card/thumbnail

### Task 2.2: Create Drawer/Slideover component

**Files:**
- **Create:** `src/components/ui/drawer.tsx`

**API:**
```ts
type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  width?: number; // px
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};
```

Uses portal + fixed positioning + backdrop. This replaces the inline `<aside>` inspector approach when the UX needs an overlay (narrow viewports, mobile).

### Task 2.3: Create a compact dropdown/select component

**Files:**
- **Create:** `src/components/ui/dropdown-select.tsx`

Used for sort and group-select dropdowns in the toolbar area. `ControlSelect` exists but is a native `<select>` — a custom dropdown provides better styling control.

---

## Phase 3 — Persistence Boundary (Deferred)

### Task 3.1: Create server-side cost library actions

**Objective:** Add server actions for CRUD on `cost_library_items` with workspace scoping.

**Files:**
- **Create:** `src/lib/cost-library/actions.ts`

**Functions:**
- `listCostLibraryItems(workspaceId)` — via server-side Supabase client
- `createCostLibraryItem(input)` — server action
- `updateCostLibraryItem(id, input)` — server action
- `archiveCostLibraryItem(id)` — server action (soft delete, sets status in metadata)
- `deleteCostLibraryItem(id)` — only if explicitly approved

**Requirements:**
- Workspace ID derived server-side from authenticated user context (never from client)
- Revalidate `/workshop/components` path after mutations
- Rollback on failure
- Hard delete blocked until usage/impact checks are in place

### Task 3.2: Create DB → manager adapter

**Objective:** Add `adaptFromCostLibraryRow()` that converts `cost_library_items` rows to `ComponentLibraryManagerItem`.

**Files:**
- **Modify:** `src/components/workshop/component-library-manager/adapters.ts`

**Rules:**
- `kind` ← `row.kind` (direct enum match)
- `name` ← `row.name`
- `unitCost` ← `row.unit_cost` (preserve null)
- `brand`, `sku` ← `row.brand`, `row.sku`
- `confidence` ← `row.confidence`
- Tags/discipline/designation ← extract from `row.metadata` jsonb if stored there

### Task 3.3: Wire server data into the page

**Files:**
- **Modify:** `src/app/workshop/components/page.tsx` — fetch data server-side
- **Modify:** `src/components/workshop/ComponentsPageClient.tsx` — accept initial items as prop

### Task 3.4: Enable mutation controls

Once persistence is stable:
- Enable "New component" button
- Enable Edit/Duplicate in inspector
- Wire form submission to server actions
- Add optimistic updates with rollback

---

## Phase 4 — Advanced Features (Deferred)

- Bulk actions (select rows, batch update, export)
- Saved views / tabs
- Assemblies as a distinct tab
- MasterFormat/spec code metadata
- Cross-reference: which estimates use this item
- Price history tracking
- Supplier quote import/export

---

## Test Strategy

### Focused tests to add

```bash
bun run test:dom -- \
  tests/vitest/component-library-manager-adapters.test.ts \
  tests/vitest/component-library-manager-helpers.test.ts \
  tests/vitest/component-library-manager-ui.test.tsx
```

### Route-level smoke test
Assert `/workshop/components` no longer shows:
- "Content pending approved workflow"
- "Component library shell"
- Card grid as the only view

### Regression tests

```bash
bun run test:dom -- \
  tests/vitest/component-library-ui.test.tsx \
  tests/vitest/component-library-helpers.test.ts \
  tests/vitest/estimate-sheet-cost-inputs.test.tsx
```

### Final validation

```bash
bun run type-check
bun run lint
bun run validate
bun run build
git diff --check
```

---

## Risks

1. **Schema mismatch** — `EstimateRowItem` has fields `cost_library_items` doesn't. Adapter layer handles this for read-only. For CRUD: decide add columns, use `metadata` jsonb, or normalize.
2. **No server-side repository** — Blocking Phase 3. Must create `src/lib/cost-library/actions.ts`.
3. **Only 4 DB seed rows** — Read-only slice uses 66 seed `EstimateRowItem` items via adapter for UX validation. Switch to DB rows when populated.
4. **Missing shared primitives** — Inspector built as inline `<aside>` for now. Skeleton, Drawer, Dropdown deferred to Phase 2.
5. **Dirty working tree** — Current branch has uncommitted changes. Implement in an isolated branch.
6. **Two "component library" UIs** — The manager and estimate sidebar share concepts. Keep helpers shared; keep UI components separate.
7. **Three-pane density** — Facets + Table + Inspector may crowd laptop widths. Collapse facets on narrow viewports. Inspector is conditionally rendered.
