# Page Architecture

Status: verified from source code and read-only schema checks. Browser behavior behind authentication is pending a signed-in visual pass.

## Route Ownership

| Layer | File | Verified behavior |
| --- | --- | --- |
| Route | `src/app/workshop/library/page.tsx` | Server component loads `getCurrentWorkspaceComponentRowsLibrary()` and renders `WorkshopPageShell` with `LibraryPageClient`. |
| Legacy redirect | `src/app/workshop/components/page.tsx` | Redirects the old Components route to `/workshop/library`. |
| Client wrapper | `src/components/workshop/LibraryPageClient.tsx` | Dynamically imports `ComponentLibraryManager` and renders fallback skeletons while loading. |
| Main manager | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Owns search state, selected folder/supplier/brand state, card rendering, tree panel, add modal trigger, archive preview flow, and local item state updates. |
| Tree surface | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | Owns folder/supplier/brand tree controls, search, selection, drag/drop, and bulk operations. |
| Add flow | `src/components/workshop/component-library-manager/AddComponentModal.tsx` | Add-only form for creating components. It is not an edit/detail surface. |
| Workshop shell | `src/components/workshop/WorkshopPageShell.tsx` | Provides global workshop chrome, title header, notifications/settings, and a collapsed sidebar rail offset. |
| Global sidebar | `src/components/sidebar/MainSidebar.tsx` | Global navigation, collapsed by default, expandable to 288px. Not a Library-specific content zone. |

## Corrected Layout Model

The Library page should be modeled as a workshop canvas, not as a five-zone page with a permanent 288px left sidebar.

| Region | Current behavior | Planning implication |
| --- | --- | --- |
| Global rail | `WorkshopPageShell` applies `lg:pl-[64px]` for the collapsed global rail. `MainSidebar` starts `expanded=false` and clips the 288px sidebar to 64px. | Audit the rail as global shell chrome. Do not size Library content around a fixed 288px left zone. |
| Title header | `WorkshopTitleHeader` sits above the route content inside the shell. | Header affordances should remain compact and consistent with other workshop routes. |
| Component sheet | Main left/content area in `ComponentLibraryManager`, with search, toolbar, tab strip, and catalogue. | This is the primary workspace. It needs dense, scannable information and keyboard-first filtering. |
| Component catalogue | Card list grouped by category/folder context. Cards have image, metadata, and archive selection. | Current card surface is display/select only. Detail/edit behavior is a planned gap, not existing capability. |
| Right tree panel | `ComponentLibraryTreePanel` renders alongside the sheet on wider layouts. | This is the structural navigation/management surface. It should be audited as a right-side contextual panel, not a sidebar replacement. |
| Modal layer | `AddComponentModal` and destructive preview modals. | Add and confirm flows need e2e testing. Detail/edit should prefer an inspector sheet/drawer over another modal unless research proves modal is better. |

## Data Flow

```text
/workshop/library
  -> getCurrentWorkspaceComponentRowsLibrary()
    -> component_category_nodes
    -> component_suppliers where workspace_id = current workspace
    -> component_brands where workspace_id = current workspace
    -> cost_library_items where workspace_id = current workspace and lifecycle_state != archived
  -> LibraryPageClient
  -> ComponentLibraryManager
    -> search/filter in client state
    -> card catalogue
    -> tree panel
    -> add modal
    -> archive preview/RPC path
```

Important detail: the repository excludes `archived` items only. The current visible set includes one `discontinued` item unless a downstream UI path filters it out.

## Current Interactive Surface

| Behavior | Implemented? | Evidence |
| --- | --- | --- |
| Page route | Yes | `src/app/workshop/library/page.tsx` |
| Source route redirect from `/workshop/components` | Yes | `src/app/workshop/components/page.tsx` |
| Component sheet search | Yes, code-level | `SearchInput` updates `searchQuery`; `itemMatchesSheetQuery()` checks name, supplier, brand, category, unit, description, pricing metadata, confidence, and category path. |
| Filter toolbar button | Renders but no-op | `HeaderIconToolbar` renders by default, but `ComponentLibraryManager` does not pass `onFilter`. |
| Group toolbar button | Renders but no-op | Same as filter. |
| Data view modes | Yes, but data grouping only | `viewMode` is `default`, `suppliers`, or `brand`; it is not list/grid view. |
| Visual list/grid toggle | No | No implemented visual layout switch. |
| Card click detail | No | Cards do not expose a detail click handler. |
| Add component | Code present, e2e pending | `AddComponentModal` is dynamically imported and opened from the add action. |
| Edit component | Not from catalogue | Add modal is not an edit surface. |
| Archive selection | Code present, e2e pending | Card checkbox and bulk destructive preview path exist. |
| Tree/folder navigation | Code present, hands-on keyboard pending | Tree panel source exists; keyboard behavior must be manually verified. |

## Schema Touchpoints

| Domain | Tables |
| --- | --- |
| Component identity | `cost_library_items` |
| Versions and state | `cost_library_item_versions`, `cost_library_item_state_history` |
| Pricing | `cost_library_item_price_options`, `cost_library_item_price_history`, `cost_library_item_variant_cost_entries` |
| Assets | `cost_library_item_variant_attachments`, `thumbnail_path` on `cost_library_items`, storage bucket paths |
| Taxonomy | `component_category_nodes`, `library_folders` |
| Suppliers and brands | `component_suppliers`, `component_brands` |

## Architectural Risks To Audit Before Coding

1. Toolbar primitives allow visible no-op controls by default.
2. `HeaderIconToolbar` default Add action uses orange classes outside the neutral app token contract.
3. Search is client-side over a moderate set today, but it must be measured under rapid typing and larger seeded counts before adding heavier UI.
4. The tree and catalogue share dense hierarchy state. Any new filter/group/list/detail surface must preserve focus, selection, and scroll position.
5. A detail/edit feature would touch UI, repository/RPC contracts, versioning, price options, and attachments. It must not be treated as a simple card click.
6. Live visual claims are blocked until the page is captured in an authenticated state.
