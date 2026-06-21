---
title: Estimate Sheet Test Coverage And Verification
date: 2026-06-21
status: read-only-audit
---

# Test Coverage And Verification

## Runtime Verification

Command:

```bash
curl -I -sS -L --max-time 10 http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db
```

Observed:

- `HTTP/1.1 307 Temporary Redirect`
- `location: /login?next=%2Fworkshop%2Fprojects%2F22222222-2222-4222-8222-222222222222%2Festimates%2Fbf254cbd-13d4-4dbf-b21a-84b171cdd6db`
- login response `HTTP/1.1 200 OK`
- security headers include CSP report-only, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow`

Conclusion: the target route is protected and reachable through the running dev server. Authenticated sheet interactions were not browser-tested because this session had no authenticated browser/session.

## Existing Coverage Health

Coverage is healthy at component/action/helper level. Main gaps are route-server composition, live authenticated flows, large-data performance ceilings, and a few concurrency/error states.

## Taxonomy Verification

This revision changed estimate-sheet visible copy so row components present as
`Library Component` or `Project Component`. It intentionally did not rename
internal provenance helpers such as `isExpressComponentRow`,
`expressComponent`, or `projectComponentProjection`.

Targeted command for the copy/source revision:

```bash
bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

Static copy guard:

```bash
rg -n "Express component replaceable estimate component|Project-specific component|Make component project-specific|Make project-specific|Customized library component" src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet tests/vitest
```

## Existing Test Inventory

| Area | Existing tests | Coverage notes |
| --- | --- | --- |
| Estimate list CRUD | `tests/vitest/project-estimates-client-create.test.tsx`; `project-estimates-create-optimistic.test.tsx`; `project-estimates-delete-duplicate.test.tsx`; `project-estimates-store.test.ts` | Create, duplicate, delete, optimistic store |
| Inline list editing | `project-estimates-table-inline-edit.test.tsx`; `project-estimates-inline-edit.test.tsx` | Name/code/budget/notes/favorites |
| Sheet route/lazy load | `estimate-sheet-library-lazy-load.test.tsx`; `estimate-workspace-client-cache.test.tsx`; `e2e/estimates-shell-streaming.spec.ts` | Confirms component library is not in initial server render |
| Row editing/calculation | `estimate-sheet-cost-inputs.test.tsx`; `estimate-row-tree-patch.test.ts`; `estimate-sheet-version-control-actions.test.ts` | Strong scalar edit and calculation coverage |
| Row details/Project Component/promote | `estimate-sheet-row-details-crud.test.tsx`; `estimate-sheet-library-insert.test.tsx`; `estimate-component-drag.test.tsx` | Strong row details and component interactions |
| Tree reorder/node CRUD | `estimate-tree-reorder.test.ts`; `estimate-sheet-tree-dnd.test.tsx`; `estimate-node-reorder-action.test.ts`; `e2e/estimate-tree-dnd.spec.ts` | Strong default-path coverage; misses non-default tab refresh defect |
| Templates/library insert | `estimate-sheet-library-lazy-load.test.tsx`; `estimate-sheet-library-insert.test.tsx`; `estimate-template-drop-zones.test.tsx`; `estimate-node-reorder-action.test.ts`; `e2e/workshop-template-insert-smoke.spec.ts` | Good insert coverage; multi-template error DOM coverage gap |
| Reusable project sources | `reusable-source-drag.test.ts`; `project-source-insert-action.test.ts`; `template-browse-project-sources.test.tsx` | Action/parser coverage; missing sheet DOM/stale-response test |
| Tabs | `estimate-tab-strip.test.tsx`; `e2e/estimate-tabs.spec.ts` | Strong UI behavior coverage |
| Activity/history | `estimate-sheet-version-control-ui.test.tsx`; `estimate-sheet-version-control-actions.test.ts`; `estimate-sheet-activity-history-ui.test.tsx` | Strong bounded cursor/filter/stale-response coverage |
| Proposal export | `proposal-export-preview.test.tsx`; `proposal-export-model.test.ts`; `proposal-workbook.test.ts`; `proposal-export-route.test.ts`; `proposal-export-route-workbook.test.ts` | Very strong route/model/workbook coverage |
| Publication/shared link | `project-publication-header.test.tsx`; `project-publication-snapshot.test.ts`; `project-publication-page.test.tsx`; `e2e/shared-link-receiver.spec.ts` | Strong project/header/shared-link coverage |
| Error/loading states | `project-estimates-list-skeleton.test.tsx`; `workshop-route-error-boundaries.test.tsx`; `route-error-smoke-gate.test.ts`; `e2e/workshop-route-error-boundaries.spec.ts` | Generic coverage; exact estimate wrappers need direct tests |

## Right Sidebar Thumbnail Verification

Detailed handoff: `10-right-sidebar-component-thumbnails-plan.md`.

Add focused coverage before implementation:

1. `tests/vitest/component-library-ui.test.tsx`:
   - component row renders in icon, square thumbnail, title order,
   - thumbnails are opt-in and absent when `LibraryTree` renders without the
     sidebar thumbnail option,
   - folder rows do not render component thumbnails,
   - missing `imageUrl` renders a fixed-size placeholder,
   - malformed, `javascript:`, `data:`, protocol-relative, arbitrary external,
     unrelated Supabase, and wrong-path Supabase URLs render placeholders,
   - broken image `error` swaps to placeholder without removing row controls,
   - row accessible name remains the component title,
   - rendered image thumbnails use `loading="lazy"`, `decoding="async"`,
     `fetchpriority="low"`, fixed dimensions, `alt=""`, and
     `aria-hidden="true"`,
   - thumbnail-backed row drag payload is unchanged,
   - keyboard preview, add action, and context menu remain reachable.

2. `tests/vitest/ui-tree.test.tsx` or
   `tests/vitest/component-library-sidebar-thumbnails.test.tsx`:
   - render 200+ image-backed components with virtualization active,
   - assert `[data-tree-virtualizer]` exists,
   - assert mounted thumbnail count is below total component count,
   - assert mounted thumbnail count is less than or equal to
     `data-tree-virtual-mounted-count`,
   - render a non-virtualized list below 150 rows and assert thumbnails still
     use lazy/async/low-priority attributes with no preload loop.

3. `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`:
   - keep proving the estimate route does not server-render or eagerly fetch the
     component library catalog,
   - add a source/static guard only if thumbnail work changes repository loader
     shape.

4. Static guard:

```bash
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx
```

Expected after thumbnail implementation: no matches. Card/preview surfaces can
continue using broad fallback imagery; the virtualized row list should not.

## Targeted Verification Commands

Use these focused commands instead of broad `bun run validate` while the known full validation suite is red/hanging-prone.

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
```

Covers tree reorder, create, rename, delete, bulk delete, optimistic DnD.

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

Covers row insert/edit/delete, inline-authored Project Component rows, template insertion event path, detach-to-Project-Component, promote, stale response behavior.

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/ui-tree.test.tsx --maxWorkers=1
```

Post-thumbnail implementation, covers right-sidebar component tree rendering,
row thumbnails, drag/add/context menu regressions, and virtual mounted-row
bounds. Before that implementation exists, this command covers current
component-library and tree behavior but not thumbnail-specific assertions.

```bash
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/thumbnail.ts
```

Post-thumbnail implementation expected result: no matches in whichever
thumbnail row files exist.

```bash
bunx vitest run tests/vitest/project-source-insert-action.test.ts tests/vitest/reusable-source-drag.test.ts tests/vitest/template-browse-project-sources.test.tsx --maxWorkers=1
```

Covers reusable project-source payload parsing and server action contracts.

```bash
bunx vitest run tests/vitest/estimate-tab-strip.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1
```

Covers tab lifecycle and workspace cache reconciliation.

```bash
bunx vitest run tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1
```

Covers export route, workbook response, and preview behavior.

## Missing Tests To Add

### Correctness

1. Non-default tab structural CRUD regression:
   - create second tab,
   - reorder a node,
   - delete a node,
   - bulk-delete nodes,
   - assert active tab cache still contains only that tab's nodes after success.

2. Bulk row delete partial-failure regression:
   - render two selectable rows,
   - select both,
   - mock one `deleteEstimateRowItem` success and one failure,
   - assert the successful row remains deleted and the failed row is restored,
   - repeat with the first request rejecting after the second optimistic delete.

3. Component move partial-failure regression:
   - move component from source row to target row,
   - mock target replacement success/source clear failure,
   - assert target remains replaced and source rolls back,
   - repeat with target failure/source clear success.

4. Bulk tree-node delete partial-success regression:
   - select two root nodes,
   - make the first delete RPC succeed and the second fail,
   - define and assert the intended behavior,
   - after a transactional RPC fix, assert no partial delete/event survives.

5. Template insert tab mismatch regression:
   - pass a `targetTabId` that differs from the target parent node's tab,
   - assert the action rejects or refreshes the committed parent-node tab,
   - assert no wrong-tab tree is written to active cache.

6. Replace-row revision regression:
   - replace a row from the library,
   - immediately edit quantity/material or delete the row,
   - assert no row revision conflict and cache receives new `rowRevision`,
   - repeat for replace-style clear paths.

7. Project-source stale response:
   - fire two project-source inserts,
   - resolve second before first,
   - assert both inserted subtrees remain or client refetches/merges.

8. RPC edit-gate regression:
   - attempt replace row, delete row, delete node, and update row as a member
     without estimate edit permission,
   - assert the RPC denies the write,
   - repeat as an editor and assert the write succeeds.

9. Same-row mutation queue regression:
   - start a scalar update and a replace/delete/detach on the same row,
   - resolve them in both orders,
   - assert the final visible/cache state is deterministic and no stale
     response wins.

### Reliability

1. Mock `fetchEstimateTabTree` rejection and assert active sheet shows retryable load error, not empty tab.
2. Mock update/delete/detach failures and assert rollback plus visible user-facing error.
3. Run concurrent row mutations and assert save state remains saving until all settle.
4. Force row revision conflict and assert stale-row copy plus refetch/retry path.

### Performance

1. Drag-over benchmark at 1k, 5k, and 10k nodes.
2. Template-node insert benchmark with 100+ rows.
3. Estimate route load budget with many tabs/nodes/rows.
4. Library sidebar cold-open budget with large component/template catalog.
5. Reusable source search budget: projects, estimates, tabs, nodes, rows scanned.
6. Template-node subtree insert query-count budget proving the existing bulk
   subtree RPC is called once.

### UX

1. Visible insert status in sidebar for library/template/project-source actions.
2. Empty-area drop-zone copy using the existing `empty` prop.
3. Visible Project Component creating state.
4. Metadata-strip error visibility on keyboard/touch paths.
5. Canonical terminology matrix:
   - linked clean/overridden/source-changed rows show `Library Component`,
   - express/detached/project-projected/source-less rows show `Project Component`,
   - no UI path reintroduces Express vs Project-specific as separate component
     types unless it is explicitly explaining internal provenance.
6. Sidebar duplicate-id guard:
   - duplicate the same item twice in rapid succession,
   - assert generated ids are unique and React keys remain stable.

## Verification Not Run During Audit

No Vitest/Playwright commands were run during the read-only subagent lanes. In the main lane, runtime verification was limited to HTTP route access because authenticated browser proof requires a valid user session.

Before implementing fixes, run the narrow target command for the touched behavior first. After fixes, run `git diff --check` and the matching targeted Vitest command. Reserve broad `bun run validate` for shared logic or release gating because current project state documents known validation reds and DOM-suite hang risk.
