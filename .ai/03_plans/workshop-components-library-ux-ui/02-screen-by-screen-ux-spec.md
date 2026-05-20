# `/workshop/components` Screen-by-Screen UX Spec

**Date:** 2026-05-20
**Route family:** `/workshop/components`
**Surface type:** Global Component Library manager
**Primary user job:** Find, evaluate, organize, and maintain reusable cost components without losing pricing trust or estimate-snapshot safety.

## Global product rule

The global route is a manager/browsing surface. The estimate-page right sidebar is an insertion surface. They may share models/helpers later, but their first-view jobs differ.

- Global manager: maintain the library, review price health, edit/duplicate/archive, inspect metadata.
- Estimate sidebar: quickly add/drag components into a selected estimate area.

Do not promote estimate insertion as the primary action on `/workshop/components`.

## Shared density/rhythm rules

- Keep app typography at or below 12px.
- Default table/list row text: 9-11px.
- Use 38px search/header toolbar rhythm already used by workshop collection pages.
- Prefer left-aligned scan axes.
- Prefer rows/table/list for default view; card/grid is secondary.
- Keep page shell fixed and let inner panes scroll.
- Use shared UI primitives: `WorkshopPageShell`, `WorkshopCollectionLayout`, `SearchInput`, `HeaderIconToolbar`, `Button`, `Badge`, `Chip`, existing control inputs.

## Screen 1 — Default Browse / All Components

### Route

`/workshop/components`

### User goal

“Show me all reusable cost components, let me find one fast, and tell me whether the price data is trustworthy.”

### Layout zones

1. `WorkshopPageShell` header
   - Title: `Components`
   - Breadcrumb: `Components`
   - Footer should stop saying “shell placeholder” after implementation.

2. Search row
   - Full-width `SearchInput`.
   - Placeholder: `Search components, suppliers, SKU, unit, source...`
   - Shortcut: `/` or Cmd/Ctrl+K if consistent with app behavior.

3. Compact toolbar row
   - Filter
   - Group
   - Sort (enabled only if shared toolbar support exists; otherwise defer)
   - View (enabled only if shared toolbar support exists; otherwise defer)
   - New component only when persistence is enabled
   - Later: Import / Export

4. Main workspace below toolbar
   - Left facet panel, about 220-280px, collapsible on narrower view.
   - Center dense list/table, fills remaining width.
   - Right inspector drawer, about 360-420px, appears when row selected or creating/editing.

### Required content

#### Left facet panel

- Quick status views:
  - All
  - Needs review
  - Missing price
  - Missing supplier/source
  - Recently used (later, only if backed by user-level metadata)
  - Favorites (later, only if backed by user-level metadata)
- Facets with counts:
  - Category/element/trade
  - Supplier
  - Kind: material/labor/equipment/subcontract/assembly/allowance
  - Unit
  - Confidence/source
- Optional footer:
  - `66 demo items` or `Workspace library` depending on data source.
  - Avoid user-facing “Supabase” language.

#### Main dense table/list

Columns for MVP:

- Status/price health dot
- Name
- Kind
- Category
- Supplier / brand / SKU
- Unit
- Unit cost
- Labor default
- Other default
- Price source/date
- Confidence
- Updated
- Row actions

Rows should remain compact. Suggested height: about 32-42px depending on whether a secondary metadata line is shown.

Column priority rules for laptop widths:
- Always visible: health, name, kind, category, supplier, unit, unit cost.
- Secondary/collapsible: labor default, other default, brand/SKU, updated timestamp, confidence.
- Detail-only when constrained: long description, source URL, notes, spec tags.
- The inspector carries detail fields when the table cannot show them without horizontal clutter.

#### Right inspector

Default closed until item selection. When open in read mode:

- Name
- Status badge
- Kind/category
- Supplier/brand/SKU
- Unit and costs
- Source/date/confidence
- Description/spec notes
- Actions: Close; Edit/Duplicate/Archive only when persistence is enabled

### Primary actions

- Search
- Filter/pivot
- Select row
- New component only when persistence is enabled
- Edit selected item only when persistence is enabled
- Duplicate selected item only when persistence is enabled
- Mark stale/verified later

### Empty state

If no items exist:

- Title: `No components yet`
- Description: `Create reusable materials, labor, equipment, assemblies, and allowances for estimates.`
- Actions: `New component` only when persistence is enabled, later `Import CSV`

If filters/search match nothing:

- Title: `No components matched`
- Description: `Clear search or remove filters.`
- Action: `Clear filters`

### Acceptance criteria

- User can understand within 3 seconds that this is a cost/component library manager.
- Search and main list are visible without scrolling.
- Supplier, category, kind, and price health are visible or directly filterable.
- No placeholder footer/copy remains.
- Default view is not a marketing card grid.

## Screen 2 — Supplier Pivot

### Trigger

Toolbar Group button chooses `Group by supplier`. Selecting a supplier in the left facet filters to that supplier only; it must not silently switch the grouping mode. Saved views/tabs are later.

### User goal

“Show me everything we buy from this supplier so I can update or verify quote pricing.”

### Layout

Same as Screen 1, but table grouped by supplier or left supplier facet becomes primary.

### Required content

Supplier group rows should show:

- Supplier name
- Count of items
- Count stale/missing source
- Optional total usage/high-risk count later

Row contents remain the same table/list rows.

### Actions

- Select supplier
- Filter supplier
- Bulk mark reviewed later
- Bulk update source/date later
- Export supplier quote request later

### Acceptance criteria

- User can switch between Category and Supplier without losing search/filter context.
- Supplier-less items are visible under `No supplier`, not hidden.
- Supplier view does not imply procurement has been automated.

## Screen 3 — Category / Element / Spec View

### Trigger

Toolbar Group button chooses category/element/spec grouping. Selecting a category/spec in the left facet filters to that facet only. Saved views/tabs are later.

### User goal

“Show me library coverage by construction category or specification layer.”

### Recommended hierarchy

Primary category tree should be Archestimator-friendly and element/assembly oriented:

- Preliminaries
- Site/external works
- Substructure
- Superstructure
- External envelope
- Interior construction
- Finishes
- Building services
- Fixtures/furnishings/equipment
- Fees/contingency/allowances

Secondary spec-code view can support MasterFormat-like sections as metadata, not the only spine.

### Required content

- Category headers with counts.
- Optional nested subcategory headers later.
- Spec code chips only when data exists.
- `Uncategorized` group must exist for incomplete imports.

### Actions

- Filter category
- Reassign category later
- Add missing category/spec metadata from inspector

### Acceptance criteria

- MasterFormat/spec view can be added without forcing every item into a rigid code.
- Assemblies can map to multiple spec codes later.
- Category names remain human-readable to non-spec experts.

## Screen 4 — Needs Review / Stale Price Queue

### Route

Same route, tab/state: `/workshop/components?view=needs-review` later if URL state is added.

### User goal

“Show me what prices are stale, missing, or unsafe to reuse.”

### Required triggers for review status

For MVP, derive locally and preserve multiple issue reasons per item:

- Missing `unit_cost` or zero cost when not intentionally allowance/unknown.
- Missing `pricing_source`.
- Missing `pricing_date`.
- Pricing date older than chosen threshold later.
- Confidence is low or empty.

Display precedence for the compact row badge:
1. Missing price
2. Missing source/date
3. Low confidence
4. Stale price
5. Current

The compact badge may show one dominant status, but the inspector and filters must preserve all issue reasons.

### Layout

Same table/list but focused columns:

- Item
- Supplier
- Current unit cost
- Last price date
- Source/confidence
- Issue type
- Usage count later
- Action

### Actions

MVP read-only slice:

- Open inspector
- Clear filters

Only when persistence is enabled:

- Edit price/source/date/confidence

Later:

- Mark verified
- Snooze review
- Bulk update from supplier quote
- Export quote request CSV

### Acceptance criteria

- Price health is visible as a workflow, not hidden only inside the detail drawer.
- “Needs review” does not block using an item; it informs risk.
- No automatic propagation to existing estimates is implied.

## Screen 5 — Item Detail Drawer

### Trigger

Click/select row or open from action menu.

### User goal

“Inspect this component without losing my place in the library.”

### Layout

Right-side drawer/panel, 360-420px, with sticky header/footer.

### Read mode sections

1. Identity
   - Name
   - Kind
   - Category
   - Brand/SKU

2. Pricing
   - Unit
   - Unit cost
   - Labor default
   - Other default
   - Pricing source
   - Pricing date
   - Confidence/status

3. Supplier/source
   - Supplier
   - Source URL/notes if schema-backed

4. Description/spec
   - Description
   - Spec/category tags if schema-backed

5. Estimate impact later
   - Usage count
   - Linked estimate rows
   - Source-changed status

### Actions

- Close
- Edit only when persistence is enabled
- Duplicate only when persistence is enabled
- Archive with confirmation only when archive/status policy is implemented
- Hard delete is deferred unless explicitly approved

### Acceptance criteria

- Drawer does not navigate away from list context.
- High-frequency pricing fields are visually above long notes.
- Source/provenance is visible enough for trust but not bigger than core price/name.

## Screen 6 — Create/Edit Component Drawer

### Status

Deferred until persistence is approved. In the read-only first slice, mutation controls are hidden or disabled with compact copy such as `Editing library items is not enabled yet.`

### Trigger

`New component`, row Edit, duplicate.

### User goal

“Create or update reusable component data with minimal friction and enough pricing context.”

### Required MVP fields

- Name
- Kind
- Category
- Unit
- Unit cost
- Supplier
- Pricing source
- Pricing date
- Confidence
- Description

Optional if already schema-backed or stored in metadata:

- Brand
- SKU
- Labor default
- Other default
- Source URL
- Thumbnail/image path
- Notes
- Discipline/designation/tags

### Form layout

Use compact section groups:

1. Identity
2. Pricing defaults
3. Supplier/source
4. Description/spec notes

### Actions

- Save
- Save and create another
- Duplicate existing item
- Cancel

### Validation

- Name required.
- Kind required.
- Category required.
- Unit required.
- Costs must be non-negative numbers.
- Missing price/source/date allowed only if status clearly indicates unknown/review needed.

### Acceptance criteria

- User can create a minimal component without filling an enormous form.
- User is not forced to enter fake supplier/source info.
- Validation errors appear inline and compact.
- Save does not imply historical estimates changed.

## Screen 7 — Import/Export Future Flow

### Status

Defer until CRUD and base manager are accepted.

### User goal

“Bring in supplier quote/cost library data from spreadsheet and clean it up.”

### Future layout

- Import drawer or subpage.
- File upload/CSV paste.
- Field mapping preview.
- Validation issues.
- Duplicate detection.
- Apply import.

### Acceptance criteria before adding

- Base table/editing works.
- Repository/server actions are stable.
- Duplicate detection rules exist.
- Undo/rollback or import batch log exists.

## State inventory

### Loading

- Skeleton rows under fixed search/toolbar.
- Do not collapse shell.

### Empty

- Clear first action: New component only when persistence is enabled.
- In read-only/demo mode, explain that the table is for browsing/reviewing current library data.
- Import is secondary/later.

### No matches

- Clear filters/search action.

### Error

- State the user action: “Could not load library items.”
- Offer retry.
- Do not expose raw backend/vendor jargon.

### No workspace / no permission

- State that a workspace is required to manage library items.
- Do not expose raw auth/RLS/backend details.
- Provide only safe navigation or retry actions.

### Demo seed vs workspace library

- Label demo data as `Demo seed`.
- Label live data as `Workspace library`.
- Do not imply demo prices are verified workspace costs.

### Read-only first slice

- Hide or disable New/Edit/Duplicate/Archive controls.
- Disabled copy: `Editing library items is not enabled yet.`
- Do not create local-only saves that look persistent.

### Unsaved changes later

- Closing an edit drawer with dirty fields asks for confirmation.
- Failed save keeps user input and shows compact inline error copy.

### Archive confirmation later

- Prefer Archive over hard delete.
- Show usage/source-link warning before any destructive action.
- Hard delete remains unavailable unless explicitly approved.

### Keyboard/focus

- `/` or Cmd/Ctrl+K focuses search if used elsewhere in the app.
- Row keyboard selection opens inspector.
- Esc closes inspector/drawer.
- Closing drawer returns focus to the previously selected row.
- Status dots need text or tooltip equivalents.

### Narrow viewport

- Left facet panel collapses.
- Inspector becomes overlay/drawer.
- Table can horizontally scroll if necessary.

## Delete / avoid list

- Delete placeholder footer copy.
- Avoid large card-grid default.
- Avoid making MasterFormat the only path.
- Avoid broad route expansion before this route is approved.
- Avoid silent propagation of library price edits into existing estimates.
- Avoid icon-only controls for critical library operations.
- Avoid showing source/debug implementation words to normal users.
- Avoid fake editability: no live-looking New/Edit/Duplicate/Archive controls in the read-only first slice.
- Avoid hard delete until source-link/history consequences and usage checks are approved.
