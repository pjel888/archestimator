# `/workshop/components` UX/UI Research Synthesis (Second Pass)

**Date:** 2026-05-21
**Surface:** Global Component Library manager
**Non-goal:** Estimate-page right sidebar insertion picker — that is `EstimateRightSidebar` in `component-library/index.tsx`
**Auditor:** Claude (second pass, building on first-pass research + Gemini memo)

---

## 1. Current-state grounding — Corrected

### 1.1 What the route actually shows (verified against live code)

`src/app/workshop/components/page.tsx` renders:

```tsx
<WorkshopPageShell title="Components" eyebrow="Library" showEyebrow={false}
  footer={<>Component library shell | Content pending approved workflow</>}>
  <ComponentsPageClient />
</WorkshopPageShell>
```

`ComponentsPageClient.tsx` is a **59-line placeholder** — not a manager:

- Imports `estimateLibraryItems` (66 seed items) directly — no server fetch, no persistence
- Searches only 4 fields: `material`, `category`, `supplier`, `unit` (case-insensitive substring)
- Renders a CSS grid of plain `<article>` cards (`grid-cols-2/3/4` responsive)
- Each card shows: material name, category, unit badge, supplier, ₱ price
- No filters, no grouping, no sorting, no detail view, no health indicators
- Empty state: "No components matched"
- The footer literally says "Content pending approved workflow" — visible to users

**This is not a manager.** It's a static card browser that exposes placeholder language to users.

### 1.2 The actual powerful UI exists elsewhere

`src/components/workshop/component-library/index.tsx` (`EstimateRightSidebar`) has the real features:
- Full-text search with ranking (exact/prefix/contains/supplier/description/tags)
- 10 filter dimensions (category, supplier, discipline, designation, unit, price range, favorites, recents, custom, image/supplier state)
- Group by 6 modes (category, supplier, discipline, room, recent, none — though only 2 reachable via UI)
- Sort by 7 modes (relevance, name, price asc/desc, supplier, recentUsed, recentAdded)
- View modes (compact/detailed/grid — frozen in code)
- Preview panel, create/duplicate/delete, favorites/recents localStorage
- Drag-to-insert

**But this UI is tuned for insertion into an active estimate**, not for managing a master library.

### 1.3 Schema vs. seed data vs. UI — the mismatch

The DB table `cost_library_items` has these fields (21 columns):
`id`, `workspace_id`, `kind` (enum: material/labor/equipment/subcontract/assembly/allowance), `name`, `description`, `category`, `supplier`, `brand`, `sku`, `unit`, `unit_cost`, `labor_cost`, `supplementary_cost`, `pricing_source`, `pricing_date`, `confidence`, `thumbnail_path`, `metadata` (jsonb), `created_by`, `created_at`, `updated_at`

The seed data (`EstimateRowItem`) has different fields:
`material` (used as name), `itemCost` (used as price), `imageUrl` (not thumbnail_path), `isFavorite`, `isCustom`, `lastUsedAt`, `discipline`, `designation`, `tags`, `notes`, `sourceUrl`, `currency`

**Critical gaps:**
- `discipline`, `designation`, `tags` exist on `EstimateRowItem` but NOT on `cost_library_items` — they'd need to go in `metadata` jsonb or be added as columns
- `imageUrl`, `sourceUrl`, `notes` have no dedicated DB columns — could go in `metadata`
- The in-memory repository type-casts `EstimateRowItem` fields into `CostLibraryItem` with phantom fields — this would fail at the DB boundary
- Only 4 seed rows exist in the DB (all in workspace `11111111-...`)
- 66 library items exist in the seed JS array (`estimateLibraryItems`), not 88 as previously stated

### 1.4 No server-side cost library actions

`src/lib/cost-library/` does not exist. There are no server actions for CRUD on cost library items. The `cost-library-repository.ts` has only browser-side functions (uses `createSupabaseBrowserClient()`). A server-side repository needs to be created before persistent CRUD can work.

### 1.5 Repo constraints (verified)

- `WorkshopPageShell` provides: sidebar, header (h-14), content area, footer (min-h-12)
- `WorkshopCollectionLayout` provides: 38px search row + 38px toolbar + scrollable children
- Shared primitives exist: `SearchInput`, `HeaderIconToolbar`, `Badge`, `Chip`, `Button`, `Modal`, `EmptyState`, `ControlInput`, `ControlSelect`
- Missing primitives: drawer/slideover, inspector panel, skeleton, segmented control, dropdown menu, command palette, toast
- App density rule: ≤12px fonts; default controls 9-11px
- Independent scrolling: `WorkshopCollectionLayout` already supports this

---

## 2. What users likely want first (refined)

From the Gemini research memo and construction estimating UX patterns:

1. **Immediate confidence in data freshness** — "Show me stale/missing prices now"
2. **Frictionless lookup** — keyboard-first search across name, supplier, SKU, category, description
3. **Browse by supplier or category** — the two primary pivots for procurement and estimating coverage
4. **Inspect without navigating away** — right-side drawer/panel, not page navigation
5. **Update prices without ceremony** — inline or drawer-based quick edit for high-frequency fields
6. **Work spreadsheet-fast** — dense table/list default, keyboard-friendly
7. **Clear library vs. estimate boundary** — library edits must not silently mutate existing estimate rows (already handled by `source_snapshot` + `ON DELETE SET NULL` FK pattern in the DB schema)
8. **Bulk price updates** (Gemini memo emphasis) — "update the unit price of 5 different materials from a recently received supplier quote without opening 5 separate edit screens." This is a critical estimator workflow. It is deferred to Phase 4 in the implementation plan, but must not be deferred indefinitely — it should be the first power-user feature after CRUD is stable.

---

## 3. External UX patterns (validated)

Across cost libraries, estimating tools, procurement catalogs, and data-heavy SaaS:

| Pattern | Source examples | Applicable? |
|---------|----------------|-------------|
| Dense data grid as default view | RSMeans, CostX, Digi-Key, Airtable | ✅ Primary |
| Sticky search/filter toolbar | Procore, Buildertrend | ✅ Already exists via `WorkshopCollectionLayout` |
| Faceted filtering by category, supplier, type, health | Digi-Key, Airtable views | ✅ Left facet panel |
| Right-side detail drawer | Figma, Linear, Notion | ✅ Prevents context loss |
| Inline quick-edit for price fields | Airtable, Google Sheets | ✅ For P2+ |
| Stale/missing price review queue | Procurement SaaS | ✅ First-class workflow |
| Bulk actions after CRUD stable | Airtable, spreadsheet tools | Defer |
| Split-pane: taxonomy left, data right | RSMeans, Digi-Key | Optional — facet panel serves same role |
| Saved views / tabs | Airtable, Notion databases | Defer |

**Anti-patterns (confirmed):**
- Card grid as default for a cost library — slows scanning
- Page navigations for edits — loses list context
- Overly rigid taxonomy as only path — frustrates users with simple needs
- Icon-only controls for critical operations — ambiguous
- "Ghost" price updates — editing library silently changes estimates

---

## 4. Taxonomy decision (refined)

### Primary pivots (user-facing)

1. **Category / Trade / Element** — Archestimator-friendly hierarchy inspired by UniFormat:
   - Preliminaries, Site/External Works, Substructure, Superstructure, External Envelope, Interior Construction, Finishes, Building Services (Plumbing/Electrical/HVAC/Lighting), Fixtures/Furnishings/Equipment, Fees/Contingency/Allowances

2. **Supplier** — For procurement and quote verification workflows

3. **Item Kind** — material, labor, equipment, subcontract, assembly, allowance (from DB enum)

4. **Price Health** — current, needs review, stale, missing price, missing source

### Secondary professional pivots

5. **MasterFormat / CSI spec code** — As metadata/tags, not as the only navigation spine
6. **Assemblies** — As a separate tab/view for reusable build-ups

### Why not MasterFormat-first

- Cost assemblies cross multiple MasterFormat divisions (a wall assembly spans framing, insulation, cladding, gypsum, sealants)
- Small Philippine firms think in suppliers and categories first
- MasterFormat is excellent for specification sections but poor for preliminary estimating
- Support it as a secondary filter/view with many-to-many tags per item

---

## 5. Verified taxonomy source anchors

Confirmed on 2026-05-20:
- CSI MasterFormat: `https://www.csiresources.org/standards/masterformat` (HTTP 200)
- CSI UniFormat: `https://www.csiresources.org/standards/uniformat` (HTTP 200)
- CSI OmniClass: `https://www.csiresources.org/standards/omniclass` (HTTP 200)
- NIST UNIFORMAT II: `https://www.nist.gov/publications/uniformat-ii-elemental-classification-building-specifications-cost-estimating-and-cost` (HTTP 200)

---

## 6. Recommended information architecture (corrected for real primitives)

### Layout zones (using existing primitives)

```
┌─ WorkshopPageShell ───────────────────────────────────────┐
│  [Sidebar] │ Title: "Components"                           │ h-14
├────────────┼───────────────────────────────────────────────┤
│            │ [SearchInput — 38px]                           │
│            │ [HeaderIconToolbar — 38px] Filter/Group/Add   │
│            │ ┌──────────┬────────────────────┬───────────┐ │
│            │ │ Left     │ Center             │ Right     │ │
│            │ │ Facets   │ Table/List         │ Inspector │ │
│            │ │ 220px    │ flex-1             │ 380px     │ │
│            │ │ Scroll   │ Scroll             │ Scroll    │ │
│            │ └──────────┴────────────────────┴───────────┘ │
│            │ Footer: breadcrumbs | "Workspace library"      │ min-h-12
└────────────┴───────────────────────────────────────────────┘
```

### Default tab/view set (for MVP)

- All
- Needs Review
- By Category
- By Supplier
- Assemblies (deferred)

### Primary filters (left facet panel)

- Category/trade/element (with counts)
- Supplier (with counts)
- Item kind: material, labor, equipment, subcontract, assembly, allowance
- Price health: current, needs review, missing price, missing source, stale
- Unit

### Primary columns (dense table)

Always visible: health dot, name, kind, category, supplier, unit, unit cost
Collapsible: labor default, other default, brand/SKU, pricing source/date, updated
Inspector-only: description, source URL, notes, spec tags, thumbnail

### Right inspector (detail drawer)

Sections: Identity → Pricing → Supplier/Source → Description/Spec
Sticky header with name + health badge, sticky footer with Edit/Duplicate (disabled in read-only)

---

## 7. North-star UX (concrete)

The user lands on `/workshop/components` and sees:

1. A dense, sortable component table/list (not card grid)
2. A search box at the top (already in the 38px rhythm)
3. A left facet panel showing: All, Needs Review, categories, suppliers, kinds
4. Price health visible on every row: green (current), amber (needs review), red (stale/missing)
5. Clicking a row opens a right-side inspector without losing list context
6. The footer says "Workspace library" or "Demo seed" — not "Content pending approved workflow"
7. No "Add to estimate" as primary action — this is a manager, not an insertion surface
8. Supplier and Category are both one-click pivots (filters, not page navigations)

The page feels like a cost-library workbench: fast, calm, operational, data-dense.

---

## 8. Key differences from the estimate sidebar

| Dimension | Global Manager (`/workshop/components`) | Estimate Sidebar (`EstimateRightSidebar`) |
|-----------|----------------------------------------|------------------------------------------|
| Primary job | Maintain library, review health, edit metadata | Find + insert into selected estimate area |
| Default view | Dense table/list | Compact cards grouped by category |
| Width | Full content area minus facets + inspector | 360-560px resizable side panel |
| Filter surface | Left facet panel (persistent) | Inline filter chips (collapsible) |
| Actions | Edit, duplicate, archive (future) | Add to estimate, drag-to-insert |
| Data source | DB `cost_library_items` (future) or seed adapter | Local `estimateLibraryItems` seed array |
| Target context | None | Needs to know selected tree node |
| Favorites/recents | Future (user-scoped) | localStorage (local) |

---

## 9. Risks specific to implementation

1. **Schema mismatch** — `EstimateRowItem` has `discipline`, `designation`, `tags`, `imageUrl`; `cost_library_items` does not. Must decide: add columns, use `metadata` jsonb, or normalize at adapter layer.
2. **No server-side repository** — CRUD on cost library items has no server actions yet. Need `src/lib/cost-library/actions.ts`.
3. **Only 4 DB seed rows** — The manager would show near-empty until populated. Need honest demo seeding or adapter that uses the 66 seed `EstimateRowItem` items for UX validation.
4. **Shared primitives missing** — No drawer/slideover, inspector, or skeleton components exist. Must build them as shared primitives.
5. **Footer shows placeholder text to users** — "Content pending approved workflow" is visible. Must be replaced immediately.
6. **Two different "component library" UIs** — The estimate sidebar and global manager share concepts but have different jobs. Shared helpers are fine; shared UI components may not be.
