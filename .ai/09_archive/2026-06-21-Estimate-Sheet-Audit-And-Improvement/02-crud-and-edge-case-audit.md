---
title: Estimate Sheet CRUD And Edge Case Audit
date: 2026-06-21
status: read-only-audit
---

# CRUD And Edge Case Audit

## Canonical Component Types

The estimate sheet should describe row components with two visible types:

- `Library Component`: a row linked to a shared cost-library component.
- `Project Component`: a project-local row component, including inline-authored
  express rows, detached/project-specific rows, projected project rows, and
  source-less row components.

CRUD and edge-case work still must preserve the internal differences. A
detached row, an express row, and a projected project-source row have different
metadata/provenance implications even though they share the visible `Project
Component` label.

## CRUD Matrix

| Object | Create | Read | Update | Delete | Audit result |
| --- | --- | --- | --- | --- | --- |
| Estimate sheet route | Created from sibling list route, not sheet page | Server route resolves project/estimate/tree/tab | Metadata update via header/adjacent actions | Sheet delete from list route | Sheet route read path is strong; list CRUD has separate coverage |
| Estimate tabs | `createEstimateTab` | `fetchEstimateTabs`, server-seeded tabs | rename/reorder/duplicate | delete/archive | Tab CRUD UI tests are broad; structural tree mutation under non-default tabs has P1 gap |
| Tree nodes | `createEstimateNode` | route/tab tree loaders | rename/reorder | single/bulk delete | Create/rename are solid; reorder/delete refresh wrong tree on non-default tabs |
| Row items | insert blank/component/template/source | active tree and editable row state | scalar edit/replace/detach/clear/move/promote | single/bulk delete | Scalar update and insert are strong; replace row leaves stale revision; bulk delete and move have confirmed whole-tree rollback cascade risks |
| Library components | persisted create in `AddComponentModal` | lazy lite library | sidebar edit is local-only | sidebar delete/bulk delete local-only | Creation is persisted and auto-appears; edit/duplicate/delete are local view operations |
| Estimate templates | create from node/tab/source | lazy template catalog | rename | delete | Persisted template CRUD appears sound and updates current sidebar list |
| Template groups | local group add | local list | none | none | Local organizational affordance only |
| Library folders | server create | picker/library page | not in this sidebar tree | not in this sidebar flow | New folder does not auto-appear in sidebar tree by design/comment |
| Project sources | reusable source discovery | lazy project-source search/outline | not edited from sheet | not deleted from sheet | Insert path has stale-response and feedback risk |
| Proposal export | N/A | preview/export model | settings in preview | N/A | Strong route/model/workbook tests; live authenticated download unproved |
| Activity/history | server events from mutations | bounded reads/cursors | filters/scope | retention outside sheet | Strong UI/action tests |

## Auto-Appearance Edge Cases

### Newly created library component

Behavior: appears immediately in the current right sidebar after create.

Evidence:
- The visible Add Component flow uses `AddComponentModal`: `src/components/workshop/component-library/index.tsx:2290`.
- The modal persists through `createCostLibraryComponent`: `src/components/workshop/component-library-manager/AddComponentModal.tsx:1489`.
- The sidebar prepends the returned item to local `libraryItems`: `component-library/index.tsx:1609`.
- The sidebar calls `onLibraryDataChanged` after creation: `component-library/index.tsx:1614`.

Conclusion: the new component auto-appears in the current sidebar and is available for insertion immediately. Cross-tab or separately open sidebars depend on cache invalidation/refetch; the local open sidebar gets the item directly.

### Newly created template

Behavior: appears immediately in the Templates tab after save.

Evidence:
- `NewTemplateModal` calls the relevant server action and invokes `onCreated`: `src/components/workshop/component-library/NewTemplateModal.tsx:112`.
- `handleTemplateCreated` merges the new template into `templateList`, switches to Templates, expands category, and invalidates library data: `component-library/index.tsx:1617`.

Conclusion: the template auto-appears in the current sidebar and can be inserted immediately.

### Newly created library folder

Behavior: does not appear in the estimate sidebar tree.

Evidence:
- Comment states new folder is usable in Add Component picker and `/workshop/library`, but the sidebar taxonomy tree does not render folders yet: `component-library/index.tsx:1421`.
- `createFolder` calls `createLibraryFolder`, refreshes parent library data, and sets a status message: `component-library/index.tsx:1426`.

Conclusion: folder creation is persisted, but "auto-appears in this sidebar" is false by current design. This should either be made visible or labeled as "available in component form/library manager".

### Edited, duplicated, or deleted sidebar component

Behavior: these are local sidebar view operations, not persisted component-library mutations.

Evidence:
- `startEditComponent` opens legacy edit modal: `component-library/index.tsx:1686`.
- `saveNewComponent` calls local `createComponent(form)` and mutates `libraryItems` only: `component-library/index.tsx:1693`.
- `duplicateItem` creates `custom-copy-*` locally: `component-library/index.tsx:1502`.
- `deleteLibraryItem` removes from local view with undo: `component-library/index.tsx:1721`.
- Delete modal copy says "Remove ... from this local library view": `component-library/index.tsx:2515`.

Conclusion: this is internally consistent if these controls are meant as local
workspace convenience. It is risky if users expect component-library CRUD
persistence because "Edit component" and "duplicated" can read as durable.
Future work should either relabel these actions as local-view actions or wire
them to persisted library CRUD.

## Auth And Permission Edge Cases

| Edge case | Current behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Signed out route access | Redirects to login | Runtime `curl` proof, `requireCurrentUserContext` in route | Good |
| Read-only estimate edit gate | `canEditEstimate` gates UI; server actions still enforce edit for critical paths | `page.tsx:57`; `actions.ts:2324`; `actions.ts:2585` | Continue to treat client gate as UX-only |
| Viewer inserting template node | Server action calls `assertCanEditEstimate` | `actions.ts:2433` | Good |
| Viewer inserting component row | Server action calls `assertCanEditEstimate` | `actions.ts:2585` | Good |
| Node rename/delete/reorder edit enforcement | Depends on `getValidatedEstimateNode`/RPC gates and current user | `actions.ts:2162`; `:2187`; `:1419` | Should be included in authz regression tests, especially non-default tabs |

## Empty And Loading Edge Cases

| Edge case | Current behavior | Risk |
| --- | --- | --- |
| Lazy library load error | Right sidebar fallback includes non-blocking error and retry | Good |
| Tab tree fetch error | Can fall through to empty tab copy | P2 reliability |
| Empty tab | Shows "This tab is empty" and Add Area/Browse templates if editable | Good when truly empty |
| Search hides all rows | Shows no matching rows for query | Good |
| Initial library not server-provided | Sidebar skeleton then lazy load | Good |
| Component creation upload busy | Add modal blocks submit until uploads finish | Good |

## Concurrency Edge Cases

| Edge case | Current behavior | Risk |
| --- | --- | --- |
| Rapid same-row edits | Per-row queue and operation ID protection | Good |
| Older row save resolves after newer save | Ignored when operation ID is stale | Good |
| Multiple row mutations in flight | Global `saveState` is scalar | P2: one success can mark saved while another mutation is pending |
| Bulk row delete | Loops row deletion with per-row whole-tree rollback | P1: partial failure can restore or hide unrelated selected rows |
| Component move between rows | Replace target, then clear source | P1: partial failure can duplicate, lose, or visually restore the wrong row state |
| Bulk tree-node delete | Loops selected root deletes server-side | P1: partial server commit if a later root delete fails |
| Project-source bulk add | Loops source insert calls and applies returned trees | P2 stale-response clobber risk |
| Non-default tab reorder/delete | Server refreshes default tree | P1 correctness defect |
| Insert template category | Server action serializes template insert and refreshes once | Good |
| Insert template node subtree | Server loops node/row RPCs | P1 performance ceiling |

## Data Integrity Edge Cases

| Edge case | Current behavior | Risk |
| --- | --- | --- |
| Row revision conflict | Database detects conflict, server throws raw error | P3: generic client recovery |
| Replace row then immediately edit | Replace path does not patch the returned canonical row revision into client cache | P2 stale revision conflict |
| Clear row component | Sends update with source snapshot null and cleared metadata | Good alone; risky when paired with target replacement in move |
| Promote Project Component row | Sets row link state and invalidates library projections | Good |
| Detach linked row | Server returns canonical detached row and hook patches cache | Good |
| Delete tree node containing selected route node | Client computes fallback and replaces URL | Good on default tab; broken refresh on non-default tab |
| Normal row delete server primitive | Validates row id and estimate id, then SQL deletes exact row id | Good: no source evidence of unrelated DB row deletion by sibling/index |
