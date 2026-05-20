# `/workshop/components` UX/UI Research Synthesis

**Date:** 2026-05-20
**Surface:** Global Component Library manager
**Non-goal:** Estimate-page right sidebar insertion picker redesign. The sidebar and the global manager can share data/components later, but they solve different jobs.

## 1. Current-state grounding

### Existing route

`src/app/workshop/components/page.tsx` currently wraps `ComponentsPageClient` in `WorkshopPageShell` and still labels the footer as a shell/pending workflow.

`src/components/workshop/ComponentsPageClient.tsx` currently renders a simple search and grid of cards based on `estimateLibraryItems`. It searches only `material`, `category`, `supplier`, and `unit`, then displays name/category/unit/supplier/price. It is not yet a true manager.

### Existing richer component-library UI

The powerful UI currently lives in `src/components/workshop/component-library/index.tsx`, exported as `EstimateRightSidebar`. It is an estimate-side insertion surface with:

- search;
- filters by category, supplier, discipline, designation, unit, price range, favorite/recent/custom, image state, supplier state;
- grouping by category, supplier, discipline, room, recent;
- localStorage favorites/recents/preferences;
- local create/duplicate/delete;
- preview panel;
- drag payloads and click insertion.

That UI should not simply be copied full-width. It is tuned for inserting into an active estimate, not for managing the master library.

### Persistence model already exists, but is narrower than the UI

`cost_library_items` schema currently includes:

- `workspace_id`
- `kind`: material/labor/equipment/subcontract/assembly/allowance
- `name`
- `description`
- `category`
- `supplier`
- `brand`
- `sku`
- `unit`
- `unit_cost`
- `labor_cost`
- `supplementary_cost`
- `pricing_source`
- `pricing_date`
- `confidence`
- `thumbnail_path`
- `metadata`
- timestamps

Current sidebar/demo item data also uses richer client fields such as `imageUrl`, `sourceUrl`, `notes`, `discipline`, `designation`, `tags`, `isFavorite`, and `lastUsedAt`. Decide whether to persist those directly, store them in `metadata`, or keep them local/user-level.

### Repo constraints

- Use `WorkshopPageShell` and `WorkshopCollectionLayout` for collection-page consistency.
- Preserve compact app density: app text should stay at or under 12px; normal controls/tables around 9-11px.
- Use shared primitives before creating local button/search/card patterns.
- Keep page chrome pinned; prefer independently scrollable panels.
- The existing route family is still post-reset and pre-MVP; do not overbuild broad route expansion.
- Current working tree had many uncommitted changes before this planning pack. Implementation should be isolated and surgical.

## 2. What users likely want first

For architects, contractors, estimators, and small Philippine firms, the page must answer practical cost-library questions quickly:

1. “Can I find the component or cost item immediately?”
   - Search by name, shorthand, category, supplier, SKU/brand, unit, description, tags, notes/source.

2. “Is this price usable or stale?”
   - Show pricing date, source, confidence, missing-price/missing-source warnings, and stale status.

3. “Can I browse the way I think today?”
   - By supplier for quote/procurement work.
   - By category/trade for estimating coverage.
   - By assembly for reusable build-ups.
   - By spec code/MasterFormat when formal specification/reporting is needed.

4. “Can I update the library without damaging estimates?”
   - Library edits must not silently mutate existing estimate rows.
   - Future update flows must explicitly show impact and choices.

5. “Can I work spreadsheet-fast?”
   - Table/list first, keyboard-friendly, bulk actions later.
   - Cards are secondary for visually distinctive finishes/fixtures.

## 3. External UX patterns worth adopting

Across cost libraries, estimating tools, procurement catalogs, data-heavy SaaS, and component managers, the durable patterns are:

- Dense data grid/list as the default, not a marketing card grid.
- Sticky search/filter toolbar.
- Faceted filtering by category, supplier, type, price health, unit, source.
- Saved views or tabs for All, Needs review, Assemblies, Recent/Favorites.
- Right-side detail drawer instead of navigating away for edits.
- Inline or drawer-based quick edit for high-frequency fields such as unit cost, supplier, pricing date, confidence.
- Stale/missing price workflow as a first-class review queue.
- Bulk actions for price maintenance once baseline CRUD is stable.
- Clear warning that library edits do not automatically rewrite historical/issued estimates.

Anti-patterns:

- Large card grid as default for a cost library.
- Overly rigid six-level spec taxonomy as first experience.
- Unlabeled icon-only actions.
- Editing through separate full pages for simple price changes.
- Showing backend/debug language such as “Supabase” to users.
- Overloading the global manager with estimate insertion actions.

## 4. Taxonomy decision: category, supplier, or master spec?

### Short answer

Use multiple pivots. Do not choose only one.

Recommended hierarchy for pre-MVP:

1. Primary practical pivots:
   - Category/trade/element
   - Supplier
   - Item kind: material, labor, equipment, subcontract, assembly, allowance
   - Price health

2. Secondary professional/spec pivots:
   - MasterFormat/spec code view
   - Assembly/element view inspired by UniFormat/UNIFORMAT II

3. Optional future interoperability:
   - OmniClass/product classification
   - BIM/product-object mapping

### MasterFormat / master specification format

A master specification format can be applied as one view or metadata layer. It should not be the only pre-MVP spine.

Why:

- MasterFormat is excellent for specification sections and work results.
- Cost assemblies often cross multiple MasterFormat divisions.
- Users doing preliminary estimates often think in elements, assemblies, suppliers, and categories first.
- Small firms need flexible supplier/category workflows before formal classification rigor.

Example:

A wall assembly might map to wood framing, insulation, air barriers, cladding, gypsum board, sealants, and labor. The user thinks “External wall assembly,” while MasterFormat scatters the pieces across several divisions. Therefore, support MasterFormat as a secondary view/tags, ideally many-to-many.

### Better primary taxonomy for Archestimator

Use an Archestimator taxonomy inspired by UniFormat/UNIFORMAT II and everyday estimating mental models:

- Project preliminaries
- Site/external works
- Substructure
- Superstructure
- External envelope
  - External walls
  - Roofs
  - Slabs/ground floors
  - Openings/windows/doors
  - Waterproofing/weather layers
  - Airtightness/vapor layers
  - Insulation
- Interior construction
- Finishes
- Building services
  - Plumbing
  - Electrical
  - HVAC/ventilation
  - Lighting
- Fixtures/furnishings/equipment
- Fees/contingency/allowances

MasterFormat/spec codes can sit beside this as optional metadata and a filter/view.

## 5. Verified taxonomy source anchors

Targeted verification was run against the following public pages:

- CSI MasterFormat page: `https://www.csiresources.org/standards/masterformat`
- CSI UniFormat page: `https://www.csiresources.org/standards/uniformat`
- CSI OmniClass page: `https://www.csiresources.org/standards/omniclass`
- NIST UNIFORMAT II publication page: `https://www.nist.gov/publications/uniformat-ii-elemental-classification-building-specifications-cost-estimating-and-cost`

Observed fetch status on 2026-05-20: all four returned HTTP 200. ASTM E1557 lookup attempt returned 404 for the guessed URL, so this plan cites CSI/NIST anchors rather than relying on an unverified ASTM URL.

## 6. Recommended information architecture

### Default tab/view set

- All components
- Needs review
- Assemblies
- Materials
- Labor
- Equipment
- Subcontracts
- Allowances
- Recent
- Favorites

For MVP, start with fewer visible tabs:

- All
- Needs review
- Assemblies
- Materials
- Labor

Place the rest in filters or saved views until there is enough data.

### Primary filters

- Category/trade/element
- Supplier
- Item kind
- Unit
- Price status: current, stale, missing price, missing source/date
- Source/confidence
- Custom/demo/project override status later

### Primary columns for dense view

- Name
- Kind
- Category
- Supplier/brand/SKU
- Unit
- Unit cost
- Labor default
- Other default
- Pricing source/date
- Confidence/status
- Last updated
- Actions

### Detail drawer sections

- Identity
- Pricing
- Supplier/source
- Specification/category
- Usage/impact later
- Governance/status later

## 7. North-star UX

The user should land on `/workshop/components` and see:

- one search box already in the expected collection header position;
- quick status tabs or chips showing whether anything needs price review;
- a dense, sortable component list/table;
- an obvious pivot between Category and Supplier;
- no huge cards unless the user switches to visual/grid view;
- a right-side inspector that opens without losing list context;
- clear pricing trust metadata without cluttering every row.

The page should feel like a cost-library workbench: fast, calm, operational, and data-dense.
