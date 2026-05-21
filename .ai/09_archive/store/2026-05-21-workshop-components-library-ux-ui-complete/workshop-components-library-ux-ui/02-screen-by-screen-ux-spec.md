# `/workshop/components` Screen-by-Screen UX Spec (Second Pass)

**Date:** 2026-05-21
**Route family:** `/workshop/components`
**Surface type:** Global Component Library manager
**Primary user job:** Find, evaluate, organize, and maintain reusable cost components without losing pricing trust or estimate-snapshot safety
**Auditor:** Claude (second pass — corrected for actual primitives, real schema, and live codebase)

---

## Global product rules

- The global route is a **manager/browsing** surface. The estimate-page right sidebar (`EstimateRightSidebar`) is an **insertion** surface. They may share models/helpers but have different jobs.
- Do not promote estimate insertion as the primary action on `/workshop/components`.
- The footer must NOT say "Content pending approved workflow" — this is visible to users on the live route.

## Shared density/rhythm rules

- App typography ≤12px. Table/list row text 9-11px.
- 38px search/header toolbar rhythm (enforced by `WorkshopCollectionLayout`).
- Prefer left-aligned scan axes.
- Dense table/list as default; card/grid is secondary (opt-in).
- Page shell fixed; inner panes scroll independently.
- Use shared UI primitives first. If none exists for a pattern (drawer, inspector, skeleton), create one in `src/components/ui/`.
- `WorkshopCollectionLayout` supports: search, toolbar (filter/group/add), scrollable children. For facets + table + inspector, the children slot will contain a custom three-pane layout.

## States that must exist

### Loading
- Skeleton table rows under fixed search/toolbar (no `Skeleton` primitive exists — create one).
- Do not collapse the shell.

### Empty (no items at all)
- Title: "No components yet"
- Description: "Create reusable materials, labor, equipment, assemblies, and allowances for estimates."
- Action: "New component" only when persistence is enabled. In read-only: explain that the table is for browsing demo data.

### No matches (filters/search active)
- Title: "No components matched"
- Action: "Clear filters"

### Error
- "Could not load library items." + Retry button.
- Do not expose raw backend/vendor jargon.

### No workspace / no permission
- "A workspace is required to manage library items."
- No raw auth/RLS/backend details.

### Demo seed vs. workspace library
- Label clearly: "Demo seed" or "Workspace library" in the footer.
- Never imply demo prices are verified workspace costs.

### Read-only first slice
- Hide or disable New/Edit/Duplicate/Archive controls.
- Disabled copy: "Editing library items is not enabled yet."
- Do not create local-only saves that appear persistent.

---

## Screen 1 — Default Browse / All Components

### Route
`/workshop/components`

### User goal
"Show me all reusable cost components, let me find one fast, and tell me whether the price data is trustworthy."

### Layout zones (using existing `WorkshopCollectionLayout`)

```
┌─ WorkshopPageShell ──────────────────────────────────────────┐
│  Title: "Components"                    [no header actions]   │ h-14
├───────────────────────────────────────────────────────────────┤
│  [SearchInput — "Search components, suppliers, category..."]  │ 38px
│  [Filter] [Group] [Sort ▽] [View ▤]              [+ New]     │ 38px
├────────────┬──────────────────────────────────┬───────────────┤
│ Left       │ Center                           │ Right         │
│ Facets     │ Table/List                       │ Inspector     │
│ 220-260px  │ flex-1                           │ 360-420px    │
│            │                                  │ (conditionally│
│ Scroll     │ Scroll                           │  rendered)    │
│            │                                  │               │
│ [All]      │ ┌──────────────────────────┐    │ ┌───────────┐ │
│ [Needs     │ │ ● Name  Kind  Cat  Price  │    │ │ Detail    │ │
│  Review]   │ │ ● ...                     │    │ │ drawer    │ │
│            │ │ ● ...                     │    │ │ opens on  │ │
│ Categories │ │                           │    │ │ row click │ │
│  Finishes  │ └──────────────────────────┘    │ └───────────┘ │
│  Plumbing  │                                  │               │
│  ...       │                                  │               │
│ Suppliers  │                                  │               │
│  Wilcon    │                                  │               │
│  Boysen    │                                  │               │
│  ...       │                                  │               │
│ Kind       │                                  │               │
│  Material  │                                  │               │
│  Labor     │                                  │               │
│  ...       │                                  │               │
│ Health     │                                  │               │
│  Current   │                                  │               │
│  Needs Rev │                                  │               │
│  ...       │                                  │               │
├────────────┴──────────────────────────────────┴───────────────┤
│   Components › All              │  Workspace library · 66 items│ min-h-12
└───────────────────────────────────────────────────────────────┘
```

### Left facet panel

Quick status views (top section):
- All (default)
- Needs Review (count badge in warning tone)
- Missing Price (count badge in danger tone)
- Missing Source (count badge in danger tone)

Facets with counts (below status views):
- Category / Trade / Element
- Supplier
- Kind: material, labor, equipment, subcontract, assembly, allowance
- Unit
- Price Health: current, needs review, stale, missing

Each facet shows counts. Clicking a facet value filters the table. Multi-select supported. "No supplier" and "Uncategorized" must appear as filter options.

### Center table/list

Columns (MVP, always visible):
- **Health dot** (● green/amber/red, tooltip with issue details)
- **Name** (primary column, bold)
- **Kind** (material/labor/equipment/etc badge)
- **Category**
- **Supplier**
- **Unit**
- **Unit Cost** (₱, right-aligned, tabular-nums)
- **Pricing Source/Date** (compact: "Supplier quote · 2d ago" or "—")
- **Actions** (hover: Edit, Duplicate; always: "…" more menu)

Column priority for constrained widths:
- Always: health, name, kind, category, supplier, unit, unit cost
- Collapsible: labor default, other default, brand/SKU, updated, confidence
- Inspector-only: full description, source URL, notes, spec tags, thumbnail

Row height: 32-40px (compact for density).

Row click → opens right inspector with that item selected.

### Right inspector (conditionally rendered)

Default closed until item selected. When open in read mode:

Sections (top to bottom):
1. **Identity:** Name (bold, 12px), Kind badge, Category, Brand/SKU
2. **Pricing:** Unit · Unit Cost (₱, large tabular-nums) · Labor Default · Other Default · Pricing Source · Pricing Date · Confidence badge
3. **Supplier/Source:** Supplier name · Source URL (link) · Notes
4. **Description/Spec:** Description text · Spec/category tags as Badge chips
5. **Health:** Full health status with all issues listed

Actions (sticky footer):
- Close (X)
- Edit (disabled in read-only: "Editing not enabled")
- Duplicate (disabled in read-only)
- Archive (deferred)

### Primary actions
- Search (keyboard: `/` or Cmd/Ctrl+K)
- Filter by clicking facet values
- Select row → inspector opens
- New component (disabled in read-only)

### Acceptance criteria
- User understands within 3 seconds this is a cost/component library manager
- Search and main table visible without scrolling
- Supplier, category, kind, and price health are directly filterable
- **No placeholder footer** — says "Workspace library · N items" or "Demo seed · N items"
- Default view is a dense table, not a card grid
- Clicking a row opens the inspector without scrolling away from the table
- Filtering by category updates facet counts correctly

---

## Screen 2 — Supplier Pivot

### Trigger
Click "Supplier" in the left facet panel, or select it from the Group dropdown in the toolbar.

### User goal
"Show me everything we buy from this supplier so I can update or verify quote pricing."

### Layout
Same as Screen 1, but table is filtered/grouped by supplier.

### Required content
Supplier groups should show:
- Supplier name (header row)
- Count of items, count stale/missing source (compact badge)
- Table rows within each supplier group

### Acceptance criteria
- User can filter to a specific supplier without changing groups
- Supplier-less items appear under "No supplier" — not hidden
- Switching between category and supplier pivots preserves search state

---

## Screen 3 — Category / Element / Spec View

### Trigger
Click "Category" in the left facet panel, or select a category grouping.

### User goal
"Show me library coverage by construction category or specification layer."

### Recommended hierarchy
Archestimator-friendly category tree:
- Preliminaries
- Site / External Works
- Substructure
- Superstructure → External Envelope → Interior Construction
- Finishes
- Building Services → Plumbing, Electrical, HVAC, Lighting
- Fixtures / Furnishings / Equipment
- Fees / Contingency / Allowances

### Acceptance criteria
- MasterFormat/spec code can be added as secondary tags without forcing every item into a rigid code
- Category names remain human-readable to non-spec experts
- "Uncategorized" group exists for incomplete items

---

## Screen 4 — Needs Review / Stale Price Queue

### Trigger
Click "Needs Review" in the left facet panel status section.

### User goal
"Show me what prices are stale, missing, or unsafe to reuse."

### Review triggers
For MVP, derive locally:
1. Missing `unit_cost` or zero cost (unless intentional allowance with documented reason)
2. Missing `pricing_source`
3. Missing `pricing_date`
4. Pricing date older than 90 days (configurable threshold later)
5. Confidence is "low" or empty

### Display precedence for compact row badge
1. Missing price (red)
2. Missing source/date (amber)
3. Low confidence (amber)
4. Stale price (amber)
5. Current (green)

The compact badge shows the highest-priority status. The inspector and filters preserve all issue reasons.

### Table columns in this view
- Health dot + issue type label
- Name, Supplier, Current Unit Cost, Last Price Date, Source/Confidence
- Actions: Edit (disabled in read-only), Open inspector

### Acceptance criteria
- Price health is visible as a workflow, not hidden inside the inspector
- "Needs review" does not block using an item — it informs risk
- No automatic propagation to existing estimates

---

## Screen 5 — Item Detail Inspector (Read-Only)

### Trigger
Click a row in the table, or "View details" from the action menu.

### User goal
"Inspect this component without losing my place in the library."

### Layout
Right-side drawer/panel, 360-420px, with sticky header and footer. Scrolls independently from the table.

### Sections (read mode)

**Identity:**
- Name (12px, bold)
- Kind badge
- Category
- Brand / SKU (if present)

**Pricing:**
- Unit
- Unit Cost (₱, large tabular-nums, 12px)
- Labor Default
- Other Default
- Pricing Source label
- Pricing Date (with staleness indicator)
- Confidence badge

**Supplier / Source:**
- Supplier name
- Source URL (clickable link)
- Notes

**Description / Spec:**
- Description text (line-clamp-5, expandable)
- Tags as Badge chips (discipline, designation, spec codes)

**Health:**
- Full list of health issues with descriptions
- e.g., "⚠️ Missing pricing source — this item has no supplier quote or catalog reference"

### Actions (sticky footer)
- Close (X)
- Edit (disabled with "Editing not enabled yet" tooltip in read-only)
- Duplicate (disabled in read-only)
- Archive (deferred)

### Acceptance criteria
- Inspector does not navigate away from list context
- High-frequency pricing fields visually above long notes
- Source/provenance visible but not bigger than core price/name
- Closing inspector returns focus to previously selected row

---

## Screen 6 — Create/Edit Component (Deferred)

### Status
Deferred until persistence is approved. In read-only first slice:
- "New component" button is hidden or disabled
- "Edit" and "Duplicate" in inspector are disabled with tooltip
- No local-only save behavior that appears persistent

### Trigger (when enabled)
"New component" button, row Edit, or row Duplicate.

### User goal
"Create or update reusable component data with minimal friction."

### Required MVP fields
- Name (required)
- Kind (required: material/labor/equipment/subcontract/assembly/allowance)
- Category (required)
- Unit (required)
- Unit Cost (non-negative number)
- Supplier
- Pricing Source
- Pricing Date
- Confidence
- Description

### Form layout
Compact section groups: Identity · Pricing Defaults · Supplier/Source · Description

### Actions
- Save
- Save and create another
- Cancel
- Duplicate existing (when triggered from duplicate)

### Validation
- Name, kind, category, unit are required
- Costs must be non-negative numbers
- Missing price/source/date allowed but flagged as "needs review"
- Validation errors appear inline and compact

---

## Screen 7 — Import/Export (Future — Deferred)

Defer until base CRUD and manager are accepted. Requires: file upload/CSV paste, field mapping preview, validation issues display, duplicate detection, import batch log or rollback.

---

## Delete / avoid list (verified against live code)

- ❌ Replace placeholder footer "Content pending approved workflow" — visible to users now
- ❌ Avoid large card-grid default (current `ComponentsPageClient` is a card grid — must change)
- ❌ Avoid making MasterFormat the only navigation path
- ❌ Avoid broad route expansion before this route is approved
- ❌ Avoid silent propagation of library price edits into estimates
- ❌ Avoid icon-only controls for critical operations
- ❌ Avoid showing "Supabase" or backend debug language to users
- ❌ Avoid fake editability: no live-looking New/Edit/Duplicate/Archive controls in read-only first slice
- ❌ Avoid hard delete until source-link/history consequences are documented
- ❌ Avoid showing the current `searchLabel="Search components"` without a more descriptive placeholder
- ❌ Current `footer` in page.tsx says "Component library shell" + "Content pending approved workflow" — must be replaced

---

## Accessibility & keyboard

| Interaction | Key | Expected behavior |
|-------------|-----|-------------------|
| Focus search | `/` or Cmd/Ctrl+K | Focus search input |
| Navigate rows | ↑/↓ arrows | Move between table rows |
| Select/open row | Enter | Open inspector for selected row |
| Close inspector | Escape | Close inspector, return focus to row |
| Tab through cells | Tab/Shift+Tab | Move between editable cells (future) |
| Dismiss dialogs | Escape | Close modal/drawer/confirmation |
| Status dots | Tooltip on hover/focus | Text explanation of health status |

---

## Narrow viewport behavior

- Left facet panel: collapses into a slide-over or overlay
- Inspector: becomes full-width overlay
- Table: horizontal scroll if columns exceed viewport
- Row actions: always visible (not hover-only on touch devices)
