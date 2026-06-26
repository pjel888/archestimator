---
title: Codebase and Documentation Audit
type: docs
date: 2026-06-25
---

# Codebase and Documentation Audit

## Current Code Anchors

| Surface | Paths / Symbols | Evidence |
|---|---|---|
| Workspace shell | `src/components/workshop/EstimateWorkspaceClient.tsx`, `EstimateCenterColumnBoundary.tsx`, `ProjectMiniSidebar.tsx`, `ProjectWorkspaceHeaderRow.tsx` | Owns three-zone composition, selected estimate/tree state, and route shell. |
| Center grid | `src/components/workshop/EstimateSheetContent.tsx` | Contains `insertProjectSourceIntoParentById`, `confirmPendingLibraryCommit`, `moveRowComponent`, `deleteSelectedRows`, `archestimator:add-library-item` listener. |
| Center rows | `estimate-sheet/rows/cells.tsx`, `row-table.tsx`, `drop-zones.tsx`, `branch.tsx`, `activity-history.tsx` | Drag/replace, virtualized rows, activity copy, read-only/keyboard/a11y surfaces. |
| Row mutations | `src/hooks/use-estimate-row-mutations.ts`, `src/lib/domain/estimate-mutations.ts`, `src/lib/estimates/estimate-row-tree-patch.ts` | Per-row queues and pure tree math exist; no persisted atomic row move RPC is present. |
| Tree sidebar | `src/components/workshop/EstimateSheetTree.tsx`, `src/lib/estimates/estimate-tree-reorder.ts`, `src/hooks/use-estimate-workspace-state.ts`, `src/hooks/use-estimate-query.ts` | Structure signature currently includes row fields; tree state/race fixes live here. |
| Server actions | `src/lib/estimates/actions.ts`, `src/lib/reusable-sources/actions.ts` | Estimate tree actions, row actions, reusable-source search/insert, and authz helpers share this layer. |
| Right sidebar | `src/components/workshop/component-library/index.tsx`, `NewComponentForm.tsx`, `PreviewPanel.tsx`, `tree/LibraryTree.tsx`, `tree/TemplatesTree.tsx`, `tree/TemplatesTreeModel.ts`, `templates.ts` | Local-only form path, event constants, search behavior, tabs, preview actions. |
| Component library manager | `src/components/workshop/component-library-manager/AddComponentModal.tsx`, `ComponentLibraryManager.tsx` | Persisted create/update/archive paths exist; edit identity semantics need characterization. |
| Component library data | `src/lib/component-library/actions.ts`, `library-telemetry.ts` | `createCostLibraryComponent`, `updateCostLibraryComponent`, lifecycle/archive actions, telemetry helper. |
| Shared UI | `src/components/ui/tree.tsx`, `bulk-action-toolbar.tsx`, `toolbar-icon-button.tsx`, `toast.tsx`, `ResizableSidePanel.tsx` | Shared primitives with high regression risk. |
| Share/proxy | `src/proxy.ts`, `src/app/share/[token]`, `src/app/api/share/[token]/*` | Share cache/no-store evidence exists; tree plan flags referrer policy review. |

## Confirmed Source-Level Risk Anchors

- `EstimateSheetContent.tsx` applies a project-source returned tree directly through `setEstimateTree(() => result.tree)` in the non-optimistic path.
- `moveRowComponent` creates separate source and target replacements, then calls `replaceRow` twice.
- `deleteSelectedRows` loops over `bulkSelectedRowIds` and calls single-row delete behavior.
- `getEstimateTreeContentSignature` includes node total and many row-item fields; row-only edits can change the tree signature.
- `createEstimateNode` derives `maxSiblingSortOrder + 1`; high-volume/repeated reorder strategy remains a tree migration/design issue.
- Current generated types include tab-aware `create_estimate_node_with_history` with `target_tab_id`; current action code still validates reorder sort orders as integers. Tree migration work must inspect live schema and current generated types before trusting source-plan SQL sketches.
- `searchReusableProjectSources` in the right sidebar has cancellation boolean behavior, but the source plan still requires latest-wins identity proof.
- `ResizableSidePanel` sets `responsiveWidth` to `0` below 1024px; minimum responsive behavior needs honest fallback or drawer work.
- `src/proxy.ts` sets cache control for sensitive routes; share referrer policy needs explicit review for `T-13`.
- `recordLibraryEvent` sanitizes event metadata but telemetry storage is not proven; missing storage must be resolved before rollout metrics are relied on.

## Existing Test Surfaces to Extend

Representative existing files:

- Center/grid: `estimate-sheet-row-details-crud.test.tsx`, `estimate-sheet-library-insert.test.tsx`, `estimate-sheet-bulk-row-delete-partial-failure.test.tsx`, `estimate-sheet-version-control-db.test.ts`, `estimate-sheet-actions-authz.test.ts`, `estimate-row-tree-patch.test.ts`.
- Tree: `estimate-tree-reorder.test.ts`, `estimate-sheet-tree-dnd.test.tsx`, `estimate-tree-edit.test.ts`, `estimate-tree-bulk-selection.test.tsx`, `tree-external-drop.test.tsx`, `ui-tree.test.tsx`.
- Right/sidebar/library: `component-library-ui.test.tsx`, `component-library-actions-revalidation.test.ts`, `library-source-trust.test.ts`, `library-telemetry-emit.test.ts`, `library-tab-a11y.test.tsx`, `library-template-insert-picker.test.tsx`.
- Share/security: `share-no-store-invariants.test.ts`, `next-config-workshop-headers.test.ts`, `shared-link-header-smoke-script.test.ts`.
- Performance: `perf/estimate-sheet-render-baseline.test.tsx`, `perf/estimate-sheet-render-relief.test.tsx`, `estimate-sheet-large-data-budgets.test.ts`, `estimate-tree-drag-over-perf.test.ts`, `templates-tree-performance.test.ts`.
- E2E: `estimate-tree-dnd.spec.ts`, `workshop-template-insert-smoke.spec.ts`, `workshop-library-routes.spec.ts`, `estimate-sheet-loading-performance.spec.ts`.

The later implementation should extend and invert existing tests where they currently encode broken behavior, especially partial bulk-row delete behavior.

## Documentation Constraints

| Source | Constraint |
|---|---|
| `AGENTS.md` | Use `.ai/` as shared project brain; keep validation proportional; Supabase/Postgres changes are authorized only for Archestimator project `ebxxqidacheyapmmzavr`; PITR remains disabled unless reapproved. |
| `.ai/10_state/current-state.md` fast path | Fast iteration; targeted proof over heavyweight ceremony; current source folders/worktree may be dirty. |
| `.ai/10_state/decisions.md` | User-facing terminology can move from "sheet" toward "estimate", but DB/RPC/file names and stored `sheet_*` values remain until explicit cleanup. |
| `DESIGN.md` | Estimate workspace is full-browser, compact, grid-primary; right dock target is around 360-420px; tablet sidebars should become drawers/sheets if claimed; orange add affordances are a narrow estimate-sheet exception. |
| `.ai/06_specs/current-project-estimates-component-library-spec.md` | Three-zone estimate workspace is current product reality; right sidebar min/max and local behavior are documented but some docs describe known persistence gaps. |

## Active Worktree Compatibility

Earlier package-creation evidence recorded the following external dirty state:

- Modified files in the right-sidebar source plan folder.
- Untracked implementation plans/coordination ledgers in center and tree source plan folders.
- Modified unrelated landing files under `src/components/landing-v3`.

Current continuation recheck before this reconciliation pass ran `git status --porcelain=v1` and returned no output. Treat the dirty-state bullets above as historical context for why the original package avoided normalizing source folders, not as a current worktree claim. Future implementation should still start from a clean branch/worktree or explicitly isolate any active source-plan edits present at that time.
