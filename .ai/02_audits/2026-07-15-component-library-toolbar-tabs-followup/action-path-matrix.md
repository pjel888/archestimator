# Component Library action and path matrix

Date: 2026-07-15  
Surface: `/workshop/library/components`

## Product purpose

The Components page is the workspace catalogue for finding, comparing, maintaining, and reusing cost components. Its primary users are estimators and cost-library managers; project leads use the Project source to review estimate-specific components and promote reusable items. Supplier-owned catalogues are a planned third source and must remain discoverable without presenting a dead route.

## Information architecture

| Tier | Choices | Contract |
| --- | --- | --- |
| Library section | Overview / Components / Templates | Existing persistent page navigation |
| Component source | Library Components / Project Components / Supplier Components | Source of truth for the catalogue dataset |
| Tree organization | Folders / Suppliers / Brands | Changes the left-rail browse hierarchy only |
| Catalogue view | Cards / Dense table | Changes presentation without changing the result set |
| Sort | Folder order / name / supplier / brand / cost / pricing / lifecycle / usage, plus direction | Applies to the same loaded result set in both Cards and Dense views |
| Filter | Faceted component attributes | Narrows the loaded result set; applied chips remain contextual |

## User action paths

| User intent | Entry and controls | System path | Result and recovery |
| --- | --- | --- | --- |
| Browse the shared library | Components → Library Components | Server-seeded workspace page → component manager | Paginated catalogue; Load 50 more appears at the result boundary |
| Find a known component | Catalogue toolbar → Search | Client search over the explicitly labelled loaded set | Live count updates; clear search restores the current scope |
| Narrow by attributes | Catalogue toolbar → Filter | Facet popover → contextual chips | Loaded matches update; each chip or Clear filters reverses the constraint |
| Reorganize browsing | Tree toolbar → Organize by | Folders / Suppliers / Brands | Left tree and selected scope change; catalogue controls stay in place |
| Compare visually | Catalogue toolbar → View → Cards | Shared sorted card dataset | Image-led grid with inspect/select actions |
| Scan many records | Catalogue toolbar → View → Dense table | Shared sorted table dataset | Compact comparison with sortable column headers |
| Reorder results | Catalogue toolbar → Sort by + Sort order | One sort state shared by cards and table | View switches preserve the same ordering contract |
| Inspect a component | Card/table row | Route-backed inspector state | Detail opens without losing source, tree scope, or result controls |
| Add a reusable component | Orange Add component | Existing add-component flow | Shared library item is created and cache-converged |
| Add a folder | Tree toolbar → orange Add folder | Existing folder create flow | Folder appears in the active hierarchy and is selected |
| Bulk archive | Select visible items | Contextual bulk toolbar → preview → confirm | Exact-ID operation; selection is capped and reversible before execution |
| Continue a large catalogue | Result boundary → Load 50 more | Existing keyset continuation | Appends the next page without reloading the workspace shell |
| Review project-specific components | Components → Project Components → project selector | Accessible project list → project projection → project-only filter | Shows only express/detached components for the chosen project |
| Promote project knowledge | Project card/table → Promote | Existing project-component promotion action | Eligible component moves into the shared library and project cache refreshes |
| Visit future supplier catalogues | Component sources → Supplier Components · Soon | Focusable `aria-disabled` tab; no route or fetch | Communicates roadmap state without a dead end |

## Header placement contract

| Surface | Persistent row | Allowed rows beneath it |
| --- | --- | --- |
| Component tree | Search, expand, collapse, Organize by, orange Add folder | Search disclosure or organization menu; mutation status only when active |
| Component catalogue | Search, Filter, View, Sort by, Sort order, compact live result summary, orange Add component | Applied-filter chips, errors/status, and bulk-selection actions only when active |
| Results | Catalogue cards/table | Pagination at the result boundary; never a persistent second header strip |

## Scale and provider considerations

- The default Library source retains the existing 50-row Cloudflare D1 keyset page and appends continuations at the result boundary.
- Current search, facets, and sort are deliberately labelled as operating on loaded rows. Workspace-complete search/facets/sort require a shared server query, count, facet, sort, and cursor contract; presenting them as global before that contract exists would be misleading.
- Cards and Dense now consume one sorted array, eliminating the former presentation-dependent ordering mismatch.
- Existing large-card safeguards can move high-volume results to the virtualized dense path. Server paging and viewport virtualization remain complementary rather than interchangeable.
- Project Components reuses the existing D1 projection and requests only one workspace-library row for metadata while filtering the response to the selected project, avoiding a second unbounded workspace catalogue on the project path.
- Supplier Components performs no fetch until a supplier-owned catalogue and authorization contract exist.

## Considered next capabilities

| Capability | Recommended shape | Prerequisite |
| --- | --- | --- |
| Spreadsheet/CSV mass addition | Downloadable template → preflight mapping/validation → dry-run summary → idempotent import job → error workbook | Stable import schema, exact duplicate policy, D1 batch/job limits, audit receipts |
| Bulk edit | Explicit selection → field-level patch preview → exact-ID mutation receipt | Shared-field conflict and permission policy |
| Saved views | Named source + tree organization + facets + view + sort state | Workspace/user preference storage and query-versioning |
| Workspace-complete search and facets | Debounced server query with matched total and complete facet options | Query fingerprinted cursor and cache invalidation contract |
| Supplier source | Supplier tenancy, ownership, publishing, versioning, and promotion workflow | Product and authorization model; not only a new tab |

## Evidence

- Current-run reference screenshot: `01-before.png`
- Primary-source interaction research: `.ai/13_research/2026-07-15-component-library-toolbar-and-type-tabs.md`
- Implementation surfaces: `LibraryComponentSourceShell.tsx`, `LibraryComponentsRoute.tsx`, `ComponentLibraryManager.tsx`, and `LibraryFolderTree.tsx`
