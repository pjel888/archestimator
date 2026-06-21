# 04 - UX Research Synthesis

## Research Question

What should a professional construction estimating Library page do well when it combines reusable components, templates, source trust, modals, popovers, and insertion workflows?

## Applied Principles

### 1. Separate exact search from filtering

Search should find a specific record. Filters/facets should narrow a content set by shared attributes.

Implication:

- Keep one primary Library search for exact components/templates.
- Keep filters separate for supplier, brand, lifecycle, confidence, pricing freshness, folder, and later trade/source/region if those exist in data.
- Do not hide all applied filter state inside a popover.

Sources:

- NN/g, "Filters vs. Facets"
- GitLab filtering pattern
- Carbon search and filtering guidance

### 2. Facets should reveal the content space

Facets are useful because they describe the objects and help users understand the available data. The cost is added interaction complexity.

Implication:

- Keep facet categories predictable and domain-specific.
- Prioritize facets that matter to cost trust: freshness, confidence, lifecycle, source/supplier, brand.
- `folder` (`library_folder_id`, optional organization) and `category` (`cost_library_items.category` text, required taxonomy) are **two distinct axes** (per the 19 glossary) — do not conflate them. The left folder tree owns the `library_folder_id` axis, not the `category` axis, so do not duplicate the folder axis as a facet; a `category` facet is a separate decision.

Sources:

- NN/g, "Filters vs. Facets"
- NN/g, "Helpful Filter Categories and Values"

### 3. Applied filter state must stay visible

Hidden applied filters slow users down and make result sets feel unpredictable.

Implication:

- Add an applied-filter strip or compact chips near the component toolbar.
- Include clear-all and per-chip removal.
- Keep the current filter popover for compact editing, but do not make it the only state display.

Sources:

- Baymard, "How to Design Applied Filters"
- Carbon filtering guidance

### 4. Allow multi-select within useful filter categories

Users often need multiple values in the same category, such as multiple suppliers or confidence levels.

Implication:

- Preserve current multi-select behavior for supplier, brand, lifecycle (`component_lifecycle_state`), and confidence.
- `confidence` is FREE TEXT (`confidence` text column, not an enum per 19) — a confidence facet filters over derived labels, not a fixed enum; do not assume a controlled vocabulary until the migration-gated CHECK is added. **Pass:** a confidence multi-select operates over the DERIVED label set produced by the chip deriver (e.g. Low / Medium / High / None buckets over the free-text value), with an "uncategorized" bucket for values the deriver cannot classify — do NOT present raw free-text strings as filter options.
- Treat pricing freshness as a mutually exclusive status (the `ComponentPricingFreshness = any | fresh | stale | missing` union in `component-facet-filter.tsx`) unless product requirements change. Note (C-021, per `19` §Confidence and Freshness Models): the **beta scope is 4-tier** — `fresh` / `stale` / `very stale` / `missing` — implemented in **Phase 2** by extending `getComponentPricingFreshness` (`component-facet-filter.tsx:61`) + `getStalenessTone`/`getStalenessLabel` (`component-library/helpers.ts:667`/`:675`) + the THREE 90-day constants (`COMPONENT_FACET_STALE_DAYS=90`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS=90`, the `LibraryOverview.tsx:114` string) to a 180-day `very stale` tier. No schema change. The 3-tier `fresh/stale/missing` above describes the **current** helper return; the binding canonical scope is 4-tier.

Source:

- Baymard, "Allow Applying of Multiple Filter Values"

### 5. Dense catalog workflows need toolbars and scalable results

Professional data-heavy workflows benefit from a clear toolbar and results that can support sorting, selection, comparison, and bulk actions.

Implication:

- Move toward a unified component toolbar: search, filters, sort, display mode, add action, and selected count. The selected-count + batch surface already exists as `BulkActionToolbar.tsx` (shared primitive `ui/bulk-action-toolbar.tsx`); reuse it rather than building a parallel toolbar.
- Add a table/list maintenance mode after the route and trust issues are solved. This is canonical **Phase 5 (Dense Maintenance Mode & Browser-Proven Polish)** in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`, and it lands **last** in the order `0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5`.
- The card/dense **display-mode toggle does NOT exist yet** — it is net-new work (per the Phase 5 row in 19). Build the table-vs-grid contract per `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` and reuse the existing virtualization infra (`src/lib/workshop/virtualization-flags.ts`, `WORKSHOP_VIRTUALIZATION_FLAGS` + `@tanstack/react-virtual`) instead of adding a second virtualizer.
- The dense-mode surface spec lives in `10-LIBRARY-SURFACE-SPECS.md`; its row/column copy lives in `22-COPY-DECK-AND-MICROCOPY.md`.
- Keep cards for visual or early-beta browsing.

Sources:

- Carbon data table guidance
- Carbon common actions guidance

### 6. Pick the least intrusive overlay

Dialogs interrupt and should be used for short, important tasks. Long forms or repeated work often fit side panels or dedicated pages better.

Implication:

- Keep New Template as a short modal.
- Keep Edit Component as a drawer.
- Split Add Component so the default path is short and advanced work is progressive.
- Keep preview/inspection in the inspector dock (`ComponentInspectorDock.tsx`) rather than modals.

Sources:

- NN/g, "Modal & Nonmodal Dialogs"
- NN/g, "Overlay Overload"
- Carbon dialogs and forms guidance

### 7. Accessibility semantics must match behavior

Comboboxes, dialogs, tabs, menus, and tree views need explicit keyboard behavior and ARIA relationships.

Implication:

- Continue using shared tab, modal, dropdown, and tree primitives.
- Add Library-specific tests for keyboard journeys, not just primitive tests.
- Verify `Escape` and focus return in modal-plus-popup combinations.

Sources:

- W3C APG combobox pattern
- W3C APG dialog modal pattern
- W3C APG menu button pattern
- W3C APG tabs pattern
- W3C APG tree view pattern
- MDN ARIA references for `aria-haspopup`, `aria-modal`, and menu roles

### 8. Source trust belongs at the point of decision

For reusable costs, provenance is not a separate documentation page. It must show where users decide to reuse the item.

This is canonical **Phase 2 (Source Trust at Decision Points)** in
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`. The full state machine is
`11-SOURCE-TRUST-STATE-MATRIX.md` and the chip strings are
`22-COPY-DECK-AND-MICROCOPY.md`; bind to the real columns/helpers/enums in 19,
not to invented labels.

Trust-chip set this principle implies (each bound to a real column/helper/enum
from 19, not new schema). Per C-002 the term is **chip**, not "badge":

| Chip | Source of truth | Render points |
| --- | --- | --- |
| Pricing freshness (fresh / stale / very stale / missing) | `pricing_date` via `getComponentPricingFreshness(item, now)` (`component-facet-filter.tsx:61`) + `getStalenessTone`/`getStalenessLabel` (`component-library/helpers.ts:667/675`); 90-day window across `COMPONENT_FACET_STALE_DAYS=90`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS=90`, the `LibraryOverview.tsx:114` string. The 180-day `very stale` tier is a Phase-2 helper-layer extension (4-tier beta scope, C-021) — no schema change. | overview recents, browse cards, `ComponentInspectorDock.tsx`, insert pickers, template rows |
| Confidence | `confidence` text column (FREE TEXT, not an enum — derive a **chip** over the string; a controlled vocabulary is migration-gated per 19) | same as above |
| Lifecycle | `lifecycle_state` enum `component_lifecycle_state` = `draft \| in_production \| available \| discontinued \| archived` (NOT "Active/Deleted") | browse cards, inspector, insert pickers |
| Source / source URL | `pricing_source` text (this IS the source URL; URL validity is app-side over free text) | inspector, insert pickers, template rows |
| Supplier / brand | `supplier`/`supplier_id` (FK `component_suppliers`), `brand`/`brand_id` (FK `component_brands`) | browse cards, inspector |
| Link/snapshot (template + estimate rows) | `link_state` enum `estimate_row_link_state` = `unlinked \| linked-clean \| linked-overridden \| detached \| source-changed` ("Missing source" is a DERIVED UI state, not an enum value) | template rows, insert pickers |

Implication:

- Show these chips on browse cards, the inspector dock (`ComponentInspectorDock.tsx`), overview recents (`overview/LibraryOverview.tsx`), template rows, and insert pickers (`InsertIntoEstimatePicker.tsx`).
- Treat stale or low-confidence pricing as a decision warning, not just a detail hidden in the inspector dock.
- "Last reviewed" / template review metadata do **not** exist as columns — use `updated_at` as the "last touched" cue, or gate a real `last_reviewed` timestamp behind the Data Migration Gate (per 19). Template trust counts are a computed JOIN over `link_state`/`source_library_item_id`, not a stored field.
- Use plain chip labels ("Price stale", "Low confidence", "Source changed", "Discontinued") per `11-SOURCE-TRUST-STATE-MATRIX.md` and `22-COPY-DECK-AND-MICROCOPY.md`; resolve conflicting states by the precedence list in 11.

Sources:

- Google data card guidance
- GOV.UK AI-ready dataset guidance
- Existing Archestimator component-library decisions and spec sections on source/pricing snapshots (see `11-SOURCE-TRUST-STATE-MATRIX.md` and the keystone `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`)

### 9. Visual direction: the Library speaks the workshop's liquid-glass language

The workshop already speaks a coherent liquid-glass language — the sidebar is a
frosted rail, the dashboard is a single frosted workspace shell with content-grade
glass project cards, and the estimate sheet is a "well + floating rails +
near-opaque paper + frosted chrome" workspace driven by a per-region
surface-variant slot system (`src/components/workshop/estimate-surface-variant.tsx:21`).
The Library today is the one major workshop surface that does **not** speak this
language (100 % paper/flat). Adopting the same material as a first-class skin is a
UX-direction principle, not a token map: it is how the Library joins the
workshop's visual family.

Implication:

- The Library speaks the **same liquid-glass language** as the sidebar, dashboard,
  and estimate sheet. The material and grid system are fully specified in
  `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` — cross-reference it wherever this doc or
  its siblings discuss the Library visual language. The slot system mirrors
  `estimate-surface-variant.tsx` (slots: `workspaceWell` / `treeRail` /
  `inspectorDock` / `centerColumn` / `chromeToolbar` / `sheetHeader` /
  `catalogueCard` / `galleryRow` / `ctaTile` / `countStrip`).
- **Source trust + the visual surface are one.** Trust chips (Principle 8) render
  **on** glass/paper cards without their own blur — they are flat soft-fill spans
  (`bg-*Soft` + `text-*`); nested glass is forbidden (per 35 §0, §11). The chip
  reads through the single frosted region, exactly as on paper. One blur per
  region, never stacked (35 §2).
- **Two postures, one variant system.** Phase 1 ships the glass skeleton
  (workspace well + floating rails + paper centre + chrome + liquid buttons +
  warm-glass CTA + the `LibrarySurfaceVariantProvider` + grids); Phase 2
  (component cards) / Phase 5 (template rows) promote cards/rows to
  content-grade glass. Phase sequencing is the canonical phase map in
  `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5).
- DESIGN.md is an alpha guide, not law — aesthetic detail is deferred to the
  owner; this principle is binding on **names** (tokens, classes, slots, the
  one-blur-per-region / AA / reduced-motion contracts), not on aesthetic taste.

Sources:

- `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` — the full glass spec (material, slot
  system, grids, overlays, motion); this principle endorses it as the material
  + grid layer for every Library surface.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` — token/primitive mapping for chips,
  buttons, focus, and (after 35) the glass slot/tokens; this principle endorses
  the shared token layer.
- Reference shipped surfaces already using the language (sidebar
  `.sidebar-glass`, dashboard `.dashboard-glass` + `.workshop-project-card-glass`,
  estimate `.estimate-glass-well/-rail/-paper/-chrome`) — listed with file:line in
  35 §1.

## Applies-To Matrix — principle → file:line → phase → owner → test → evidence

This synthesis is a **strategy-input / research doc**, not an execution plan. To
keep the handoff concrete rather than narrative, each principle below is bound to
its owning spec doc, the canonical file:line binding (from the keystone 19), the
canonical phase, the owner role, the test class, and the pre-registered evidence
ID (from `24-EXECUTION-EVIDENCE-LEDGER.md`). Per the relaxed scope of
`34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3, these are informational delegation rows
— the 12-dimension acceptance rows live in the owning spec doc + doc 35 §12.
"Visual" rows (9 + the chip render points in 8) also cross-reference
`35-LIQUID-GLASS-LIBRARY-UX-SPEC.md`.

| Principle | Owning spec | file:line binding (keystone 19) | Phase | Owner | Test | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Separate exact search from filtering | 10 §Overview, 13 | `ComponentLibraryManager.tsx` search `:383`, `:844-846` | 1 | Frontend lead | `bun run test:dom` (chip/param isolation) | doc 24 |
| 2. Facets reveal the content space | 10, 13 | `component-facet-filter.tsx`; `library_folder_id` axis (19 glossary) | 1 | Frontend lead | `bun run test:dom` facet set | doc 24 |
| 3. Applied filter state stays visible | 12, 10 §Dense Row | applied-filter chip strip (net-new; 23 §Applied-Filter Chip) | 1 | Frontend lead | Playwright chip count === filter count, clear-all resets to 0 | doc 24 |
| 4. Multi-select within categories | 10, 13 | `confidence` free text (19); `ComponentPricingFreshness` (`component-facet-filter.tsx:17`) | 1 | Frontend lead | `bun run test:dom` multi-select | doc 24 |
| 5. Dense catalog workflows | 12, 10 §Dense Row, 35 §12.7 | net-new dense view; reuse `virtualization-flags.ts` | 5 | Frontend lead | Playwright table vs grid; `bun run test:dom` | doc 24 |
| 6. Least intrusive overlay | 03, 10 | overlays `ui/overlays/*` (19 §Overlay primitives); z-tiers | 0B / 3 / 4 | Frontend lead | `bun run test:dom` focus/escape | doc 24 |
| 7. Accessibility semantics match behavior | 12, 31 | shared tab/modal/dropdown/tree primitives | 0A-5 | A11y lead | manual ARIA/focus (no axe harness today — C-014; `jest-axe` is a Phase-0A deliverable) | doc 24 |
| 8. Source trust at decision points | 11, 22, 23 | `pricing_date`/`confidence`/`lifecycle_state`/`link_state` (19 Enums + Data Layer); helpers `:61`/`:667`/`:675` | 2 | Frontend lead | `bun run test:dom` chip render + tone; AA spot check | doc 24 |
| 9. Visual direction: liquid glass | 35 (owns), 23 | `estimate-surface-variant.tsx:21`; slot system 35 §2 | 1 (shell) / 2 / 5 | Design lead + Frontend lead | Playwright paper+glass `xl`+`md` (35 §14) | doc 24 (EV-G-* in 35 §12) |

**Note on trust chips + glass (Principle 8 + 9 together):** trust chips render on
glass/paper cards without their own blur. See 35 §4.3 for the binding (soft fills
+ semantic foreground; no `backdrop-filter` on any chip) and 23 §AA-Safe Foreground
Mapping for the tone→token contrast (verified on both `#ffffff` paper and the
frosted-white glass backdrop; AA fallback is `text-secondary`, never
`text-tertiary`).

## Source Links

> Citation provenance: external links below were captured during the two
> research passes that produced this synthesis (drafted 2026-06-20; verified
> against `main` per `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` on
> 2026-06-21). Per-URL access dates and deep section anchors are **not** tracked
> here — this is an accepted limitation. These citations inform priority and
> direction only; no behavior in this pack depends on a specific external URL
> resolving. Every implementable claim binds to the in-repo facts in doc 19, not
> to these links. If an external page moves, treat the principle as the durable
> artifact, not the URL.


- NN/g Filters vs. Facets: https://www.nngroup.com/articles/filters-vs-facets/
- NN/g Helpful Filter Categories and Values: https://www.nngroup.com/articles/filter-categories-values/
- NN/g Modal and Nonmodal Dialogs: https://www.nngroup.com/articles/modal-nonmodal-dialog/
- NN/g Overlay Overload: https://www.nngroup.com/articles/overlay-overload/
- Baymard Applied Filters: https://baymard.com/blog/how-to-design-applied-filters
- Baymard Multiple Filter Values: https://baymard.com/blog/allow-applying-of-multiple-filter-values
- W3C APG Patterns: https://www.w3.org/WAI/ARIA/apg/patterns/
- W3C APG Combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- W3C APG Dialog Modal: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- W3C APG Menu Button: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- W3C APG Tabs: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- W3C APG Tree View: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- Carbon Search Pattern: https://carbondesignsystem.com/patterns/search-pattern/
- Carbon Filtering Pattern: https://carbondesignsystem.com/patterns/filtering/
- Carbon Data Table Usage: https://carbondesignsystem.com/components/data-table/usage/
- Carbon Dialog Pattern: https://carbondesignsystem.com/patterns/dialog-pattern/
- Carbon Forms Pattern: https://carbondesignsystem.com/patterns/forms-pattern/
- MDN Popover: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover
- MDN `aria-haspopup`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-haspopup
- MDN `aria-modal`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-modal
- Google Data Cards: https://developers.google.com/codelabs/data-cards-inspect
- GOV.UK AI-ready dataset guidelines: https://assets.publishing.service.gov.uk/media/696e43965a37ab534a9e23ac/Building_AI-Ready_Datasets_for_the_UK.pdf

## Hardening Research Addendum

The second research pass sharpened four implementation implications:

1. Dense mode is a first-class professional table workflow, not a cosmetic
   alternate card layout. It must support find/filter, compare, inspect/edit,
   selected-count, and batch actions. This is canonical **Phase 5** (per 19); the
   density toggle is net-new, and selected-count/batch reuse
   `BulkActionToolbar.tsx`.
2. Applied filters should remain visible and resettable. Supplier, lifecycle,
   brand, and confidence can support multi-select; pricing freshness should stay
   mutually exclusive unless requirements change.
3. Editable/interactive dense rows require an explicit semantic choice. Native
   table is preferred for read-mostly comparison; ARIA grid is only justified if
   cells become directly editable or grid navigation is essential.
4. Import/export can stay deferred, but cost-catalog products commonly support
   CSV/Excel-style catalog maintenance. The MVP should therefore protect future
   import/export with validation, formula safety, and public/private field
   classification now. **Forward pointer:** bind this to
   `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` as a Phase-0A/0B data-contract note —
   the `cost_library_items` column set (19 §Data Layer) MUST remain
   import/export-safe (CSV-header-stable, no PII in cost fields) so the deferred
   import/export does not require a schema reshuffle later.

Additional technical implications:

- Large-list performance is a database/API/DOM problem, not just a visual one.
  Reduced browse payloads, pagination, or virtualization should be considered
  once scale budgets are hit. Per 19, the Components-tab search/filter today is
  100% **client-side synchronous** filtering over an in-memory dataset
  (`ComponentLibraryManager.tsx:876-882`; facet filter at `:877`, search filter
  at `:881`), so there is **no out-of-order / stale-
  response race** to solve now — scope any server-side search as FUTURE if budget
  is exceeded. The **real** perf risk is that the browse fetch
  (`loadCurrentWorkspaceComponentRowsLibrary`) eagerly loads the full nested
  detail graph (versions, price history, state history, attachments) per item;
  target shrinking the browse payload / making detail lazy and inspector-scoped.
  Reuse the existing virtualization infra
  (`src/lib/workshop/virtualization-flags.ts`), and note Phase 0A must extend
  `scripts/seed-performance-test-data.ts` to seed `cost_library_items` and
  measure a baseline before any budget number is claimed.
- Supabase/Postgres search work (full-text indexes for text search, trigram
  indexes for fuzzy name/supplier matching) is **FUTURE-if-budget-exceeded**: no
  Postgres FTS/trigram index exists yet, and it is only relevant once the
  client-side path is proven insufficient against the seeded baseline.
- Source trust is a cost-library norm: centralized cost libraries usually expose
  item cost, unit, supplier/manufacturer, catalog/source, and assembly context.

Additional source links:

- W3C APG Grid: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- web.dev Virtualize Large Lists: https://web.dev/articles/virtualize-long-lists-react-window
- Supabase Query Optimization: https://supabase.com/docs/guides/database/query-optimization
- PostgreSQL Text Search Indexes: https://www.postgresql.org/docs/current/textsearch-indexes.html
- PostgreSQL pg_trgm: https://www.postgresql.org/docs/current/pgtrgm.html
- GOV.UK File Upload: https://design-system.service.gov.uk/components/file-upload/
- Procore Cost Catalog Import: https://v2.support.procore.com/product-manuals/cost-catalog-company/tutorials/import-cost-catalog-items
- Autodesk Cost Library: https://www.autodesk.com/blogs/construction/autodesk-estimates-centralized-cost-library/
- Houzz Product Library: https://pro.houzz.com/pro-help/r/how-to-use-the-product-library-in-houzz-pro
- Houzz Assemblies: https://pro.houzz.com/pro-help/r/how-to-create-assemblies
- Gordian RSMeans Data: https://www.gordian.com/products/rsmeans-data-services/
