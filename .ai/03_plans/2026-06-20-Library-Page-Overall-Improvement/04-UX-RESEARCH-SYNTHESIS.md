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
- Avoid adding a category facet if the left folder tree already owns that axis, matching the existing project decision.

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

- Preserve current multi-select behavior for supplier, brand, lifecycle, and confidence.
- Treat pricing freshness as a mutually exclusive status unless product requirements change.

Source:

- Baymard, "Allow Applying of Multiple Filter Values"

### 5. Dense catalog workflows need toolbars and scalable results

Professional data-heavy workflows benefit from a clear toolbar and results that can support sorting, selection, comparison, and bulk actions.

Implication:

- Move toward a unified component toolbar: search, filters, sort, display mode, add action, and selected count.
- Add table/list maintenance mode after the route and trust issues are solved.
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
- Keep preview/inspection in right docks rather than modals.

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

Implication:

- Show source, date/version, confidence, and caveats on cards, inspector, overview recents, template rows, and insert pickers.
- Treat stale or low-confidence pricing as a decision warning, not just a detail hidden in the inspector.

Sources:

- Google data card guidance
- GOV.UK AI-ready dataset guidance
- Existing Archestimator component-library decisions and spec sections on source/pricing snapshots

## Source Links

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
   selected-count, and batch actions.
2. Applied filters should remain visible and resettable. Supplier, lifecycle,
   brand, and confidence can support multi-select; pricing freshness should stay
   mutually exclusive unless requirements change.
3. Editable/interactive dense rows require an explicit semantic choice. Native
   table is preferred for read-mostly comparison; ARIA grid is only justified if
   cells become directly editable or grid navigation is essential.
4. Import/export can stay deferred, but cost-catalog products commonly support
   CSV/Excel-style catalog maintenance. The MVP should therefore protect future
   import/export with validation, formula safety, and public/private field
   classification now.

Additional technical implications:

- Large-list performance is a database/API/DOM problem, not just a visual one.
  Server-side filtering/search, indexed text fields, reduced browse payloads,
  pagination, or virtualization should be considered once scale budgets are hit.
- Supabase/Postgres search work should prefer query/index decisions grounded in
  actual workload: full-text indexes for text search and trigram indexes for
  fuzzy name/supplier matching if needed.
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
