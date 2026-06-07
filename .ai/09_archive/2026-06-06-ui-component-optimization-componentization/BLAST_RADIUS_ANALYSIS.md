# Blast Radius Analysis

**Date:** 2026-06-06
**GitNexus index:** up to date after `npx gitnexus analyze`; indexed commit `7c20850`.
**Code-review graph check:** file-level impact radius for the six target files reported `high` risk, `238` directly changed nodes, `500` impacted nodes shown within two hops, and `124` additional files affected.

## Tool Availability

| Tool | Result |
| --- | --- |
| GitNexus `status` | Available and refreshed. |
| GitNexus `impact` | Available; used with `--repo archestimator --include-tests --depth 3`. |
| code-review-graph `get_impact_radius` | Available; used for file-level cross-check. |
| code-review-graph `get_affected_flows` | Available; returned 0 named flows for the six-file set. |
| LSP fallback | Not needed. |

## Required Symbol Impact

| Symbol | File | GitNexus risk | Impact summary | Required posture |
| --- | --- | --- | --- | --- |
| `EstimateSheetContent` | `src/components/workshop/EstimateSheetContent.tsx` | `MEDIUM` (partial traversal warning) | 8 impacted direct nodes, modules `Workshop` and `Vitest`; direct tests include cost inputs, library insert, version-control UI, context-menu-with-sheet, proposal export preview, and route-transition peak-load profile. | Do not change props or mutation contracts without regression tests. Extract private helpers first. |
| `EstimateSheetTree` | `src/components/workshop/EstimateSheetTree.tsx` | `MEDIUM` | 13 impacted nodes, 6 direct tests including DnD, RCT DOM, bulk selection, context menu, modal. | Keep React Complex Tree wiring behavior locked before hook extraction. |
| `LibraryFolderTree` | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `LOW` | 5 impacted nodes; direct path through `LibraryFolderTreeSurface`, selection test, and `AddComponentModal`. | Good candidate after share tree, but modal coupling means not first MVP target. |
| `WorkshopTree` | `src/components/workshop/workshop-tree.tsx` | `HIGH` | 12 impacted nodes, 4 direct dependants, 4 modules; direct callers include share panel/view, template library tree panel, and component-library `LibraryTree`; indirect caller includes `EstimateSheetContent`. | Treat as shared primitive with cross-surface visual tests; not a low-risk utility despite only 301 lines. |
| `ShareEstimateTreePanel` | `src/components/share/ShareEstimateTreePanel.tsx` | `LOW` | 1 direct impacted caller: `SharePageTabs`. | Best live adoption target for MVP because it is read-only. |
| `ShareEstimateTreeView` | `src/components/share/ShareEstimateTreeView.tsx` | `LOW` | 1 direct impacted caller: `SharePageTabs`. | Best live adoption target with panel unification. |

## Ambiguity Notes

Initial GitNexus symbol queries for `EstimateSheetContent` and `EstimateSheetTree` were ambiguous because dynamic import wrappers in `EstimateWorkspaceClient.tsx` share the same names. This analysis uses exact source UIDs:

- `Function:src/components/workshop/EstimateSheetContent.tsx:EstimateSheetContent`
- `Function:src/components/workshop/EstimateSheetTree.tsx:EstimateSheetTree`

`EstimateSheetContent` returned a GitNexus depth traversal warning: `Write operations are not allowed. The pool adapter is read-only.` The command still returned a partial `MEDIUM` risk result. Future implementation should rerun impact at phase start and treat the result as incomplete until the warning is absent or explained.

## Existing Test Coverage In The Impact Path

| Existing test | Related surface |
| --- | --- |
| `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Estimate sheet cell editing |
| `tests/vitest/estimate-sheet-library-insert.test.tsx` | Component insertion |
| `tests/vitest/estimate-sheet-version-control-ui.test.tsx` | Activity/version UI |
| `tests/vitest/estimate-tree-context-menu.test.tsx` | Tree context menu and sheet integration |
| `tests/vitest/proposal-export-preview.test.tsx` | Proposal preview integration |
| `tests/vitest/route-transition-peak-load-profile.test.tsx` | Route peak-load profile |
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Estimate tree drag/drop |
| `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx` | React Complex Tree DOM |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | Bulk selection |
| `tests/vitest/estimate-tree-modal.test.tsx` | Tree modal behavior |
| `tests/vitest/library-folder-tree-selection.test.tsx` | Library folder selection |

## Decision

The blast-radius data supports this sequence:

1. Pure utilities and tests first.
2. Read-only share tree adoption second.
3. `WorkshopTree` changes only with cross-surface visual and behavioral tests.
4. Editable estimate surfaces only after owner sign-off and measurement baseline.
