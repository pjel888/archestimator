---
title: Estimate Sheet User Step Matrix
date: 2026-06-21
status: read-only-audit
---

# User Step Matrix

This matrix describes expected behavior from the user's point of view, then anchors it to the current implementation.

## Route And Access

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Open estimate sheet URL signed out | Visit route directly | Redirects to login with `next` param | Runtime `curl -I -L` returned `307` to `/login?next=...`, then login `200`; route calls `requireCurrentUserContext` in `page.tsx:35` | Authenticated browser proof was not possible without session state |
| Open estimate sheet signed in | Visit route | Server resolves project, estimate, active tab/tree, current user, edit capability, proposal metadata | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:28` through `:97` | Needs live session smoke for target record |
| Missing project/estimate/node | Visit invalid scoped URL | `notFound()` when project or estimate missing | `page.tsx:41` | Route error/404 for exact target variants not live-tested |
| Loading route | Navigate while segment streams | Parent estimates loading shell renders | `src/app/workshop/projects/[projectId]/estimates/loading.tsx:1`; no dedicated `[nodeId]/loading.tsx` exists | Add a sheet-shaped `[nodeId]/loading.tsx` if target-specific transition polish matters |
| Route error | Server/client segment throws | Error boundary shows retry/reset | `src/app/workshop/projects/[projectId]/estimates/error.tsx:1`; `[nodeId]/error.tsx` | Exact wrapper labels need focused tests |

## Workspace Shell

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Initial sheet render | Open route | `EstimateWorkspaceClient` dynamically loads tree/content with fallbacks | `src/components/workshop/EstimateWorkspaceClient.tsx:26` | Good |
| Tab bootstrap | Open route with active tab | Uses server tabs as `initialTabs`; avoids blind refetch | `EstimateWorkspaceClient.tsx:89`; `src/hooks/use-estimate-query.ts:147` | Good |
| Select node in tree | Click a node | Updates local workspace state and shallow URL via `history.replaceState`; no router remount | `src/components/workshop/EstimateSheetTree.tsx:534`; `:1142` | Good |
| Switch tabs | Click tab | Updates active tab store/cache and sheet content | `EstimateWorkspaceClient.tsx:130`; `EstimateSheetContent.tsx:2808` | Tree query failures can render as empty tab |
| New tab button | Click New tab header control | `EstimateTabStrip` action creates a tab and arms inline rename | `tests/vitest/estimate-tab-strip.test.tsx:187` | Route-level edit capability propagation still needs direct test |

## Component Taxonomy

The canonical user-facing component types are `Library Component` and `Project
Component`.

| Canonical type | User meaning | Internal states to preserve |
| --- | --- | --- |
| Library Component | Shared cost-library component linked into the estimate | `sourceLibraryItemId`, `linked-clean`, `linked-overridden`, `source-changed` |
| Project Component | Component authored or kept inside this project/estimate | express/inline-authored rows, detached/project-specific rows, projected project rows, source-less row components |

Do not turn the internal states into separate visible component types. They are
needed for provenance, history, promotion, copy, and conflict handling, but they
should not make users choose among Express vs Project-specific vs Manual
component types.

## Left Tree

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Add area at root | Empty sheet or tree Add Area | Creates optimistic node, posts `createEstimateNode`, reconciles optimistic ID | `src/components/workshop/EstimateSheetTree.tsx:701`; `:741` | Good |
| Add area inside node | Context menu -> Add area inside | P6 single-node model allows any node to parent any area | `EstimateSheetTree.tsx:1178` | Good |
| Rename node | Context menu/draft input -> rename | Optimistic rename, waits for pending create if needed, rollback/error on failure | `EstimateSheetTree.tsx:880` | Good |
| Delete node | Context menu -> Delete -> confirm | Optimistic delete, selection/route fallback, server delete, rollback on failure | `EstimateSheetTree.tsx:952` | P1 on non-default tabs because server returns default tree |
| Bulk delete nodes | Check nodes -> Delete selected | Dedupe roots, optimistic delete, route fallback, server loop, rollback | `EstimateSheetTree.tsx:1042` | P1 on non-default tabs; server loops deletes one by one |
| Reorder tree | Drag node | Optimistic reorder, server reorder, rollback/stale guard | `EstimateSheetTree.tsx:570` | P1 non-default tab return tree; P1 drag-over perf |
| Search/filter tree | Use tree search/filter | Reorder disabled while search active | `EstimateSheetTree.tsx:547` | Good |
| Save node as template | Context menu -> Save as template | Dispatches event to right sidebar modal | `EstimateSheetTree.tsx:1200`; `component-library/index.tsx:1582` | Good |
| Drop template/source on tree node | Drag from sidebar to tree | Validates target, blocks optimistic nodes, dispatches insert event | `EstimateSheetTree.tsx:647` | Good, but project-source stale-response risk remains in content handler |

## Sheet Rows

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Insert blank row | Click/keyboard activate empty row drop zone | Adds express row draft and persists with `insertRow` | `EstimateSheetContent.tsx:1995`; tests `estimate-sheet-cost-inputs.test.tsx:258` | Creating state is mostly screen-reader-only |
| Insert component from library | Click Add or drag component | Optimistic row insert under selected node, server row insert, row patched from server result | `EstimateSheetContent.tsx:1995`; `src/hooks/use-estimate-row-mutations.ts:227` | Failures can be quiet for some paths |
| Edit scalar row fields | Change quantity/cost/misc/percent | Parses bounded values, queues same-row updates, stale response protection | `EstimateSheetContent.tsx:1837`; `use-estimate-row-mutations.ts:327` | Save-state scalar can be misleading under concurrent mutations |
| Replace row component | Drop/choose replacement | Optimistically replaces row, calls replacement action | `EstimateSheetContent.tsx:2347`; `src/lib/estimates/actions.ts:2675` | P2 stale row revision after replace |
| Clear row component | Row action -> clear | Converts to blank row and persists update with cleared metadata | `EstimateSheetContent.tsx:2387` | Error toast missing on failure |
| Delete single row | Row action -> delete | Optimistically removes and calls delete action | `EstimateSheetContent.tsx:2532` | Failure rollback has no explicit toast |
| Bulk delete rows | Select rows -> Delete selected | Loops `deleteRowItem` for each row and clears selection | `EstimateSheetContent.tsx:2563` | Concurrency can flip save state saved early; missing DOM test |
| Make Project Component | Row action/details -> Make Project Component | Calls detach mutation, patches canonical row on success | `EstimateSheetContent.tsx:2502`; `use-estimate-row-mutations.ts:277` | Conflict errors are generic |
| Promote to library | Row action -> promote | Blocks dirty/saving state, calls promote, updates row link state, invalidates library | `EstimateSheetContent.tsx:2444` | Good; depends on scalar save state accuracy |
| Move component between rows | Drag row component to another row | Replaces target and clears source; blocks inline-authored Project Component move | `EstimateSheetContent.tsx:2522` | P1: confirmed partial-failure risk across replace + clear |

## Templates And Project Sources

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Open right sidebar | Show sidebar or command palette | Lazy loads lite library only on demand | `EstimateSheetContent.tsx:1202`; `estimate-sheet-library-lazy-load.test.tsx:91` | Good |
| Insert one template | Drag/click template | Optimistic insert, server action, tab-scoped refresh, rollback on failure | `EstimateSheetContent.tsx:2053`; `src/lib/estimates/actions.ts:2309` | Good |
| Insert multiple templates | Bulk select/drop category | Single client optimistic update; one server action loops RPCs sequentially then refreshes once | `EstimateSheetContent.tsx:2094`; `actions.ts:2351` | Error branch needs more DOM assertions |
| Insert template node | Drag subtree within template | Optimistic insert in client; server loops subtree nodes and rows | `EstimateSheetContent.tsx:2212`; `actions.ts:2417` | P1 performance for large subtree |
| Create template from selected node | Sidebar New Template or tree Save as template | Modal saves via server action and prepends to template list | `component-library/index.tsx:1617`; `NewTemplateModal.tsx:112` | Good; auto-appears in current sidebar |
| Rename template | Template menu -> rename | Server action, local list update, error inline | `component-library/index.tsx:1635` | Good |
| Delete template | Template menu -> delete | Server action, local list remove, error inline | `component-library/index.tsx:1669` | Good |
| Add template group | New template group | Adds local group only | `component-library/index.tsx:1546` | Group is local/sidebar-only until a template is saved into it |
| Insert project source | Add reusable project source | Calls non-optimistic insert action, applies returned tree | `EstimateSheetContent.tsx:2157`; `component-library/index.tsx:1482` | P2 stale-response risk; feedback says added before server confirms |
| Bulk add project sources | Bulk select sources -> add | Loops project-source insert calls | `component-library/index.tsx:1804` | P2 out-of-order clobber risk |

## Library Components

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Create component | Sidebar Add Component | Uses persisted `AddComponentModal` and `createCostLibraryComponent`; prepends created item locally | `component-library/index.tsx:2290`; `AddComponentModal.tsx:1489`; `component-library/index.tsx:1609` | Newly created item appears immediately in current sidebar |
| Insert newly created component | After create, click Add | Local created item is available immediately and can insert | `component-library/index.tsx:1609`; `component-library/index.tsx:1414` | Good |
| Edit existing component from sidebar | Preview/tree edit | Opens legacy local edit modal and updates local library array only | `component-library/index.tsx:1686`; `:1693` | P2/P3: user may think persisted component changed; copy says local library |
| Duplicate component | Preview/tree duplicate | Creates `custom-copy-*` local row only | `component-library/index.tsx:1502` | Local-only; should be relabeled or persisted |
| Delete component from sidebar | Preview/tree delete | Removes from local sidebar view with undo only | `component-library/index.tsx:1721`; `:2515` | Local-only; existing rows unchanged; copy says local view |
| Bulk delete components | Select components -> delete selected | Removes local sidebar view with undo | `component-library/index.tsx:1825`; `:2406` | Local-only; not persisted |
| Favorite component | Toggle favorite | Persists favorites locally | `component-library/index.tsx:1511` | Local preference, acceptable if intentional |
| Create folder | Create folder prompt | Server creates folder, usable in Add Component picker and library page, but not rendered in sidebar tree | `component-library/index.tsx:1421` | Edge case: folder does not auto-appear in sidebar tree |

## Header And Overlays

| Path | User steps | Current behavior | Evidence | Risk or gap |
| --- | --- | --- | --- | --- |
| Activity history | Header/local action -> Activity | Lazy modal, bounded cursor reads, stale load guards | `EstimateSheetContent.tsx:1503`; `estimate-sheet-version-control-ui.test.tsx:76` | Good |
| Proposal preview | Header/local action -> Preview | Builds model client-side and opens preview dialog | `EstimateSheetContent.tsx:1609` | Good |
| Proposal download | Click download | Fetches XLSX, checks response/content type, parses JSON error bodies | `EstimateSheetContent.tsx:1644`; `proposal-export-route.test.ts:156` | Live auth download not proved |
| Command palette | Cmd/Ctrl-K or `/` | `/` is guarded against typing targets and dialogs; OpenCode found Cmd/Ctrl-K is dialog-guarded but not typing-target guarded | `EstimateSheetContent.tsx:2279` | P3: avoid opening palette while typing |
| Row details modal | Row action -> Details | Lazy modal, row context, CRUD actions | `EstimateSheetContent.tsx:2607`; `estimate-sheet-row-details-crud.test.tsx:146` | Good |
