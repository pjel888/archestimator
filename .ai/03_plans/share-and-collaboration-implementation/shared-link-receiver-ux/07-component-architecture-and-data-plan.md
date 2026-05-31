# 07 - Component Architecture and Data Plan

## Current Issue

`SharePageTabs.tsx` owns too much of the receiver experience: active sheet state, sessionStorage, chart placement, sheet tabs, view tabs, grid table, tree reconstruction, tree panel, and tree view. Future layout work should split this into receiver-specific components while keeping state local and predictable.

## Proposed Component Boundaries

```text
ProjectPublicationView
  ShareReceiverShell
    ShareReceiverHeader
    ShareProjectSummaryStrip
    ShareEstimateWorkspace
      ShareEstimateNavigation
      ShareEstimateMainPane
        ShareEstimateToolbar
        ShareEstimateTreeMode
        ShareEstimateGridMode
      ShareEstimateContextRail
        ShareCostBreakdownPanel
        ShareResponsePanel
        ShareCommentsPanel
```

## First Extraction Candidates

| Proposed component | Source responsibility moved from | Reason |
| --- | --- | --- |
| `ShareEstimateWorkspace` | `SharePageTabs` | Owns active estimate and view mode composition |
| `ShareEstimateToolbar` | `SharePageTabs` | Makes sheet/view/search controls visible and testable |
| `ShareEstimateGridMode` | `SharePageTabs` table block | Enables search/sort without bloating tabs file |
| `ShareCostBreakdownPanel` | chart block in `SharePageTabs` | Lets chart move between rail/collapsible/mobile placements |
| `ShareReceiverContextRail` | `page.tsx` right rail | Coordinates decision/comments/chart states |

## Ownership Contract

| Component | Owns | Must not own |
| --- | --- | --- |
| `ShareReceiverShell` | width policy, page regions, responsive shell | data fetching, recipient/session verification |
| `ShareProjectSummaryStrip` | project identity, snapshot/generated status | estimate row rendering |
| `ShareEstimateWorkspace` | active sheet, view mode, composition | comment/decision API behavior |
| `ShareEstimateToolbar` | sheet switcher, Tree/Grid control, search/filter controls | tree expansion internals |
| `ShareEstimateTreeMode` | tree panel/view composition | chart placement |
| `ShareEstimateGridMode` | row table/list, sorting/filter application | publication snapshot loading |
| `ShareEstimateContextRail` | chart, response, comments placement | token/password/session validation |
| `ShareCostBreakdownPanel` | chart wrapper and collapsed/mobile state | D3 arc implementation unless necessary |

## State Model

Keep state local unless a concrete cross-route need appears.

| State | Owner |
| --- | --- |
| Active sheet ID | `ShareEstimateWorkspace`, persisted to `sessionStorage` |
| Per-sheet view mode | `ShareEstimateWorkspace` |
| Search/filter query | `ShareEstimateToolbar` or `ShareEstimateWorkspace` |
| Expanded tree nodes | `ShareEstimateTreeView` / `ShareEstimateTreePanel` |
| Decision state | `SharePageDecision` |
| Comments draft/offline queue | `SharePageComments` |
| Rail collapsed/open | `ShareReceiverContextRail` |

## State Truth Table

| State | Source | Persistence | Reload behavior | Session-expiry behavior | Rollback behavior |
| --- | --- | --- | --- | --- | --- |
| Active sheet ID | selected publication estimates | `sessionStorage` key `share-tab:${token}` | restore if estimate still exists; otherwise choose first selected estimate | unaffected | remove new workspace, keep existing key and fallback selection |
| Per-sheet view mode | local UI state | component state unless existing key is introduced intentionally | default to Tree unless current code already restores mode | unaffected | default back to current Tree/Grid behavior |
| Search/filter query | local UI state | no persistence in first search slice | clear on reload | unaffected | disable filter and show all rows |
| Expanded tree nodes | tree component state | current tree component behavior only | safe default expansion only | unaffected | restore current reconstructed tree behavior |
| Rail collapsed/open | context rail UI state | optional `sessionStorage` only after visual behavior is stable | derive default from session state and viewport | collapse or disable response area if session is invalid | render old right column directly |
| Decision response | `SharePageDecision` API submit plus local submitted state | current component local state after submit; no history fetch unless API changes | do not claim persisted history unless fetched; show generic submitted/locked only when known | hide/disable controls and explain recipient link/session requirement | restore current decision component placement |
| Comments draft/offline queue | `SharePageComments` local draft and sessionStorage queue | existing comment queue behavior | preserve queued draft if current component does | disable composer when session is absent/expired | restore current comments component placement |
| Cost breakdown open/closed | chart wrapper UI state | no persistence in first layout slice | default open on desktop rail, collapsed on mobile | unaffected | restore current chart block placement |

## Data Plan

### Use Existing Snapshot Data First

The current data model already includes enough for the next UI pass:

- `snapshot.generatedAt`
- `snapshot.project.*`
- `snapshot.estimates[]`
- `estimate.updatedAt`
- `estimate.rows[]`
- `estimate.treeNodes?`
- `row.nodeId?`
- `row.imageUrl?`

No migration should be required for the first layout pass.

## No-API First Slice

The first implementation slice should be layout-only and should not alter:

- `src/app/api/share/[token]/*`
- `src/lib/publication/security.ts`
- token hashing/encryption helpers,
- password/session cookie helpers,
- comment/decision server routes,
- publication event recording.

If a proposed UI improvement requires API or schema changes, split it into a later slice.

### Tree Fidelity Plan

Current `SharePageTabs` derives tree nodes with:

```text
reconstructTreeFromRows(activeEstimate.rows)
wrapTreeWithRoot(...)
```

But `src/lib/share/reconstruct-share-tree.ts:327` provides `getBestShareTree(rows, treeNodes)`, which can use snapshot `treeNodes` when available and fall back safely. A future implementation should plan whether to switch to `getBestShareTree` before adjusting the tree UI.

Recommendation: use `getBestShareTree(activeEstimate.rows, activeEstimate.treeNodes)` when extracting `ShareEstimateWorkspace`, then wrap the result with the sheet root only when the returned forest has more than one root or the UI needs a single root label. This uses real snapshot hierarchy when available without breaking older snapshots.

### Response and Comment State Plan

Current decision/comment UI is mostly client-local after submit. Future layout work should not claim persisted response history unless it is actually fetched. For the layout pass:

- keep comments general to the shared link,
- keep decision controls session-gated,
- show already-submitted/409 as a locked state,
- do not add row-scoped comments without API/schema work,
- keep any context labels as UI-only until persistence supports them.

### Chart Data Plan

Current chart grouping uses discipline via `aggregateRowsByDiscipline`. Keep discipline as the default first pass. Space/category/supplier grouping should be separate because it needs better snapshot semantics and UI controls.

## Primitive Reuse Requirements

Future UI work must reuse or extend:

- `Button` for commands.
- `SearchInput` for search/filter.
- `WorkshopTree`, `WorkshopTreeRow`, and `WorkshopTreeTabs` for tree/tab patterns unless a shared primitive is extracted.
- Existing chart types/components for cost charting.

Avoid adding feature-local generic controls that duplicate app primitives.

## Primitive Matrix

| UI need | Use existing primitive | Create/extract only if needed |
| --- | --- | --- |
| Sheet/search/view toolbar | `Button`, `SearchInput`, existing tab patterns | `ShareEstimateToolbar` as composition only |
| Tree/Grid segmented control | `Button` or existing tab primitive | shared segmented control if duplicated elsewhere |
| Sheet tabs/select | existing tabs behavior in `SharePageTabs` | receiver-specific wrapper preserving ARIA roles |
| Disclosure/collapsible panel | existing button/disclosure pattern if present | `ShareDisclosurePanel` only if reused by chart/comments |
| Context rail shell | layout classes, no generic card clone | `ShareReceiverContextRail` |
| Empty/error states | current app text/button primitives | `ShareReceiverEmptyState` if route states need reuse |
| Status badges | existing neutral/status badge style | no feature-local badge styles |
| Sticky regions | CSS sticky on toolbar/rail wrappers | no JS scroll listener unless required |
| Tree row | `WorkshopTree`, `WorkshopTreeRow`, share tree components | only extend props if share-specific density is needed |
| Grid row | existing table/list markup in `SharePageTabs` | `ShareEstimateGridMode` with stable columns |

## Component Risks

| Risk | Mitigation |
| --- | --- |
| `SharePageTabs` grows further | Extract before adding search/sort/new layout |
| Duplicate tree navigation | Choose `ShareEstimateTreePanel` or `ShareFloatingTreeNav`; do not show both for the same job |
| Chart changes regress workshop charts | Keep share-specific wrapper or prop changes narrowly scoped |
| Comments/decision movement breaks session behavior | Keep API-backed components intact, move only containers first |
| New layout violates design lint | Run design-system lint and inspect screenshots |

## Rollback Strategy

Each future implementation slice should remain reversible:

| Slice | Rollback |
| --- | --- |
| Shell width | Revert `ShareReceiverShell`/`page.tsx` layout classes only |
| Workspace extraction | Keep `SharePageTabs` public props stable; revert extracted components as one group |
| Chart contextualization | Restore chart position in workspace; keep `CostDonutChart` API compatible |
| Search/filter | Disable filter state and show unfiltered rows |
| Response rail | Restore direct `SharePageDecision` + `SharePageComments` right column |

Each slice must create a rollback checkpoint before the next slice starts:

1. record changed files,
2. run the focused tests for that slice,
3. capture before/after screenshots for visual slices,
4. confirm `SharePageTabs` public props or compatibility wrapper behavior still works,
5. note the exact files to revert if the next slice fails.

Post-rollback verification must rerun the focused share receiver Vitest set and at least one desktop plus one mobile browser smoke. Do not carry a partially extracted component forward if the compatibility wrapper has not been proven.
