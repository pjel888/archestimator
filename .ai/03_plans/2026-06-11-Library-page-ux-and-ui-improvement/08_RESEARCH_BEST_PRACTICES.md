# Research Best Practices

Status: planning synthesis from standards, official docs, and UX heuristics.

## Evidence Tiering

| Tier | Sources | How to use |
| --- | --- | --- |
| Normative accessibility | WCAG 2.2, WAI-ARIA APG where applicable | Must shape acceptance criteria. |
| Official framework docs | Next.js, React | Must shape implementation constraints and performance recommendations. |
| Web performance standards | web.dev Web Vitals, INP, LCP, CLS, DOM-size guidance | Must shape measurable thresholds. |
| UX heuristics | Nielsen Norman Group filter/facet/search/empty-state guidance | Useful for product decisions, not compliance claims. |
| Project design system | `DESIGN.md`, `PRODUCT.md`, `src/components/ui` | Binding for Archestimator UI decisions. |

## Dense Library UX Principles

1. Search and filters must make the result set more trustworthy, not just smaller.
2. Facets should reflect user jobs: category, supplier, brand, lifecycle, confidence, pricing freshness, and source availability.
3. Search must preserve place and focus. Do not jump, reset scroll, or move focus on every filter update unless intentional.
4. No-results states must give a next action: clear query, remove filters, add component, or inspect available fields.
5. Detail/inspection should preserve catalogue context. Use a right-side inspector/drawer/sheet before considering a modal.
6. Dense UI should be compact but not cryptic. Icons need accessible names and visible focus.
7. Missing metadata should be treated as a maintenance workflow only when the DB proves the gap matters.
8. Empty categories should not dominate scanning.

## Accessibility Research Applied

| Requirement | Library implication |
| --- | --- |
| Keyboard operable | Search, toolbar, card selection, tree, modal, and archive preview must be fully reachable without pointer input. |
| No keyboard trap | Modals and drawers must trap focus only while open and release focus predictably. |
| Focus visible and not obscured | Sticky sheet header and overlays must not hide focus rings. |
| Focus order | Order should match visual model: rail/header, search/tools, catalogue, tree, overlays. |
| Label in name | Visible labels and accessible names should match, especially search/filter controls. |
| Labels or instructions | Placeholder-only labeling is weak for search and form fields. |
| Name, role, value | Custom tree, tab, combobox, and toolbar controls must expose correct states. |
| Target size minimum | Icon controls, checkboxes, tree toggles, and chips need at least 24 x 24 CSS px or equivalent spacing. |
| Contrast and non-text contrast | Text, icons, borders, focus rings, and selected states must pass. |
| Status messages | Search result counts, no-results, add save, upload progress, archive preview/success/error must be announced without focus theft. |
| Reflow | Mobile and zoom states must avoid two-dimensional page-level scrolling. |

## ARIA Pattern Guidance

| Pattern | Use when | Caution |
| --- | --- | --- |
| Combobox | Supplier/brand/category creation or selection | Must manage active option, expanded state, input value, keyboard selection, and visible option scrolling. |
| Listbox | Simple controlled option lists | Avoid for long options if selection meaning is unclear. |
| Tree | Hierarchical category/folder navigation | Must provide arrow-key behavior or intentionally use simpler nested buttons instead of pretending to be a tree. |
| Grid/Data grid | Editable or keyboard-navigable dense tabular list | Higher accessibility burden; use only if row/column navigation is needed. |
| Native table | Static comparative data | Prefer for read-only list view if rows/columns are the core mental model. |

## Performance Research Applied

| Topic | Library implication |
| --- | --- |
| LCP | Confirm actual LCP element before changing image loading. If first thumbnail is LCP, Next.js 16 `preload` is the right planning path. |
| INP | Search typing, tree expand/collapse, and archive preview are likely interaction candidates. |
| CLS | Image dimensions, dynamic import fallback, and sticky header transitions must not shift layout. |
| DOM size | Current 154 cards plus 685 category nodes should be measured. Virtualization is justified only if measurement or scale probes fail. |
| React concurrency | `useDeferredValue` or `startTransition` can help search if rapid typing causes lag. Do not add complexity before measurement. |
| Lazy loading | Dynamic imports are appropriate for modal/tree-heavy code, but chunk 404 and fallback behavior must be verified. |

## UX Heuristics Applied

Nielsen Norman Group filter/facet guidance supports these planning decisions:

1. Use helpful facet categories and values that match user vocabulary.
2. Distinguish filters from facets. Filters constrain results; facets expose result-set structure and counts.
3. Avoid disruptive refresh behavior after filter changes.
4. No-results pages should explain the problem and provide recovery.
5. Empty states in complex applications should orient the user and offer the next useful action.

## Source Links

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WCAG quick reference: https://www.w3.org/WAI/WCAG22/quickref/
- WAI-ARIA APG combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- WAI-ARIA APG listbox: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- WAI-ARIA APG treeview: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- WAI-ARIA APG table: https://www.w3.org/WAI/ARIA/apg/patterns/table/
- WAI-ARIA APG grid examples: https://www.w3.org/WAI/ARIA/apg/patterns/grid/examples/data-grids/
- web.dev Web Vitals: https://web.dev/articles/vitals
- web.dev INP: https://web.dev/articles/inp
- web.dev DOM size and interactivity: https://web.dev/articles/dom-size-and-interactivity
- web.dev virtualize long lists: https://web.dev/articles/virtualize-long-lists-react-window
- React `useDeferredValue`: https://react.dev/reference/react/useDeferredValue
- React `startTransition`: https://react.dev/reference/react/startTransition
- Next.js Image docs: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
- Next.js production checklist: `node_modules/next/dist/docs/01-app/02-guides/production-checklist.md`
- NN/g filter categories and values: https://www.nngroup.com/articles/filter-categories-values/
- NN/g filters vs facets: https://www.nngroup.com/articles/filters-vs-facets/
- NN/g applying filters: https://www.nngroup.com/articles/applying-filters/
- NN/g empty states: https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g no-results pages: https://www.nngroup.com/articles/search-no-results-serp/

## Research-to-Audit Mapping

| Audit area | Research-backed acceptance |
| --- | --- |
| Search | Visible label or equivalent persistent affordance, keyboard operable, status announcements, no-results recovery, INP target. |
| Filters | Meaningful categories, selected state, reset, counts, no surprise refresh, keyboard/pointer parity. |
| Tree | APG-compatible keyboard or simpler accessible nested controls. |
| Cards | Do not imply clickability unless detail exists; metadata must be readable and trustworthy. |
| Detail view | Preserve context, expose cost evidence, avoid modal-first unless task evidence supports it. |
| Performance | Measure before optimization; use current Web Vitals thresholds. |
| Mobile/zoom | Reflow without page-level two-dimensional scrolling. |
