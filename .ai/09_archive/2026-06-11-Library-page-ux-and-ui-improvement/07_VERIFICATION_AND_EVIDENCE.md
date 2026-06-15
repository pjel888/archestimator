# Verification and Evidence

Status: evidence ledger for the hardened plan set.

## Repository Evidence

| Check | Evidence |
| --- | --- |
| Knowledge graph context | `code-review-graph` reported 13,263 nodes, 146,635 edges, 1,071 files, medium risk 0.60. |
| Route source | `src/app/workshop/library/page.tsx` loads `getCurrentWorkspaceComponentRowsLibrary()` and renders `LibraryPageClient`. |
| Repository query | `src/lib/repositories/component-library-repository.ts:530` selects `cost_library_items`; `:533` excludes only `archived`. |
| Shell geometry | `src/components/workshop/WorkshopPageShell.tsx:100` root shell; `:104` desktop `lg:pl-[64px]`. |
| Sidebar default | `src/components/sidebar/MainSidebar.tsx:65` starts collapsed; `:107` width 288; `:108` clips to collapsed rail. |
| Sidebar constants | `src/components/sidebar/sidebar-types.ts:1` expanded 288; `:4` collapsed 64. |
| Toolbar no-op | `src/components/ui/header-icon-toolbar.tsx:45` default actions true; `:60` filter/group render; `ComponentLibraryManager.tsx:775` passes no handlers. |
| Add orange default | `src/components/ui/header-icon-toolbar.tsx:113` default classes include orange background/text. |
| Search fields | `ComponentLibraryManager.tsx` `itemMatchesSheetQuery()` checks name, supplier, brand, category, unit, description, pricing source/date, confidence, and category path. |
| Card non-detail | `ComponentCatalogueCard` renders card contents and archive checkbox, with no detail click handler found. |
| Design contract | `DESIGN.md` defines workshop/app scale as SF Pro, max 12px app title, 3px radius, zero tracking, neutral colors. |
| UI primitives | `src/components/ui/index.tsx` exports `SearchInput`, `FilterPopover`, `InspectorDrawer`, `Sheet`, `DataTable`, `Tree`, `BulkActionToolbar`, `Dialog`, and related primitives. |

## Supabase Evidence

Project: `ebxxqidacheyapmmzavr`

All database checks were read-only.

| Check | Result |
| --- | --- |
| `cost_library_items` rows | 154 |
| Visible route-query rows | 154 non-archived |
| Lifecycle distribution | 153 `available`, 1 `discontinued` |
| Thumbnail path coverage | 154/154 visible items |
| Supplier coverage | 153/154 visible items with supplier text and supplier id |
| Brand coverage | 118/154 visible items with brand text and brand id |
| Active price option id coverage | 154/154 visible items |
| Category nodes | 685 |
| Root category nodes | 9 |
| Library folders | 685 |
| Suppliers | 22 |
| Brands | 29 |
| Variant attachments | 0 |
| Library domain RLS | Enabled on checked Library domain tables with policies present |
| RLS exception | `profile_role_hardening_audit` has RLS disabled and 0 policies |
| Supabase performance advisory | `cost_library_items` has multiple permissive policies for some actions/roles |

## Current Root Categories

| Root | Visible components |
| --- | ---: |
| Administration | 1 |
| Site | 1 |
| Structure | 1 |
| Envelope | 0 |
| Architecture | 12 |
| Materials | 0 |
| Finishes | 30 |
| Objects | 107 |
| Systems | 2 |

## Runtime Evidence

| Check | Result |
| --- | --- |
| `curl -I http://localhost:3000/workshop/library` | `307 Temporary Redirect` to `/login?next=%2Fworkshop%2Flibrary` |
| Authenticated browser audit | Pending |
| Console/network logs for authenticated page | Pending |
| Full keyboard traversal | Pending |
| Tree keyboard interaction | Pending |
| Add modal e2e | Pending |
| Archive preview e2e | Pending |
| Production performance trace | Pending |

## Research Evidence

| Source | Use in plan |
| --- | --- |
| W3C WCAG 2.2 | Keyboard, focus, label, contrast, target size, reflow, status messages. |
| WAI-ARIA Authoring Practices Guide | Combobox, listbox, tree/grid/table interaction expectations. |
| web.dev Web Vitals and INP | LCP/INP/CLS thresholds and responsiveness planning. |
| web.dev DOM size and virtualization guidance | Measurement-gated DOM and virtualization decisions. |
| React `useDeferredValue` and `startTransition` docs | Search/render responsiveness options if measured lag occurs. |
| Next.js local docs in `node_modules/next/dist/docs/` | Image `preload`, App Router server/client/lazy-loading, production checklist. |
| Nielsen Norman Group articles on filters/facets, no-results, empty states | Non-normative UX heuristics for dense searchable catalogues. |
| Impeccable product register | Product UI should be quiet, dense, reusable, accessible, and state-complete. |

## Corrections Applied

| Previous claim | Corrected claim |
| --- | --- |
| 288px left sidebar is Zone 1 | 64px collapsed global rail is reserved; 288px sidebar is expandable global overlay. |
| 12 major DB divisions | 9 current DB roots. 12 visible groups, if seen, require UI mapping proof. |
| Around 50 thumbnails | 154/154 visible items have thumbnail paths. |
| Around 20 suppliers | 153/154 visible items have supplier text and id. |
| Around 15 brands | 118/154 visible items have brand text and id. |
| Filter/group are planned features or working controls | They currently render as no-op controls because handlers are absent. |
| Card click detail exists or should open modal by default | No card detail exists; future detail should prefer inspector/sheet unless research says otherwise. |
| Stale chunk 404 is proven P0 | It is a required cache/deploy scenario, not a current P0 without fresh reproduction. |
| Use Next.js `priority` for LCP image | Use Next.js 16 `preload` only when an image is proven as LCP. |
| Virtualization should be implemented now | Virtualization is measurement-gated due accessibility and current moderate item count. |

## Verification Commands And Tools Used

| Tool/command | Purpose |
| --- | --- |
| `code-review-graph` minimal context and semantic search | Repository structure and `ComponentLibraryManager` mapping. |
| `rg`, `nl`, `sed`, `find`, `wc` | Source and document inspection. |
| Supabase MCP `_execute_sql` | Read-only schema, count, category, lifecycle, and RLS/policy checks. |
| Supabase MCP `_get_advisors` | Security and performance advisory scan. |
| `curl -I http://localhost:3000/workshop/library` | Signed-out route behavior. |
| `node .agents/skills/impeccable/scripts/context.mjs` | Product/design register context. |
| Local Next.js docs under `node_modules/next/dist/docs/` | Version-aware Next.js 16 guidance. |
| Research subagent | Standards and UX/performance source synthesis. |

## Limitations

1. Authenticated browser verification is still pending.
2. Previous Playwright observations are retained only as draft leads unless reproduced.
3. No production build/performance trace has been run in this pass.
4. No source-code changes were made.
5. No Supabase schema or data was mutated.
6. Visual Ralph implementation is intentionally not active because there is no approved reference and the user requested no coding.
