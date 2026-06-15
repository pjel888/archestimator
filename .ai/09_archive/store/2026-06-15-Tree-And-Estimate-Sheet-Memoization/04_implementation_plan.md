---
title: "perf: Memoization Implementation Plan"
type: perf
date: 2026-06-15
execution: code
---

# perf: Memoization Implementation Plan

## Summary

Implement memoization in measured slices: probes first, lazy signature second, stable selected-node presentation third, branch memoization fourth, totals strategy fifth, and shared-tree cleanup last if evidence still warrants it.

---

## Implementation Units

### U1. Characterize Render and Compute Hot Paths

- **Goal:** Add test-only probes that count branch renders, proposal-signature calls, and node-total computations without changing production behavior.
- **Requirements:** R1, R3, R5, R7.
- **Dependencies:** None.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/rows/branch.tsx`, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`, `tests/vitest/perf/estimate-sheet-memoization.test.tsx`.
- **Approach:** Follow the existing render-probe pattern used by row-table and content tests. Keep probes inert unless tests install callbacks.
- **Execution note:** Characterization-first. Establish the current failing counts before applying memoization fixes.
- **Patterns to follow:** Existing `setEstimateSheetRenderProbe`, `setEstimateRowItemRenderProbe`, and `setEstimateSheetContentRenderProbe` utilities.
- **Test scenarios:** Typing in one row counts row-table renders, branch renders, proposal-signature calls, and node-total calls. Opening command palette and receiving remote cursors do not increment row-table or branch counts. Preview-closed edits show the current signature cost before U2.
- **Verification:** Probe tests fail on at least one known hot path before U2-U4 and become the regression harness after fixes.

### U2. Gate Proposal Preview Signature Work

- **Goal:** Stop full-tree proposal-preview signature generation before the preview has a model that needs stale-state comparison.
- **Requirements:** R5, R8, R11.
- **Dependencies:** U1.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `tests/vitest/proposal-export-preview.test.tsx`, `tests/vitest/perf/estimate-sheet-memoization.test.tsx`.
- **Approach:** Replace the always-on `currentProposalPreviewSignature` path with a lazy current-signature value that computes only when a proposal model exists or when the preview dialog is actively rendering stale state. Keep `buildProposalPreview` responsible for storing the signature used by the current model.
- **Patterns to follow:** Existing stale-then-refresh preview model pattern in `EstimateSheetContent`.
- **Test scenarios:** Editing rows before opening proposal preview does not call the signature builder. Opening preview builds the model and stores a signature. Editing after a preview exists marks the model stale or defers stale detection according to the selected policy. Changing preview scope or export settings preserves current behavior.
- **Verification:** Signature probe counts prove ordinary edits avoid full-tree signature work before preview use.

### U3. Memoize Selected Node Presentation

- **Goal:** Avoid recomputing `computeNodeCode` and `findNodePath` during row edits when tree selection is unchanged.
- **Requirements:** R2, R6.
- **Dependencies:** U1.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `tests/vitest/perf/estimate-sheet-memoization.test.tsx`, `tests/vitest/estimate-mixed-content.test.tsx`.
- **Approach:** Introduce a memoized selected-node presentation object keyed by `estimateTree` and `resolvedSelectedNodeId`. Use stable empty sentinels for no-selection ancestor paths.
- **Patterns to follow:** Existing `displayedSheetNode` memo that preserves selected-node reference when filters are inactive.
- **Test scenarios:** Typing in a row does not call selected-node path/code helpers. Switching selected nodes updates node code and breadcrumbs. Empty-tab state still passes stable empty values.
- **Verification:** Helper-call probes stay flat during row edits and update on selection change.

### U4. Memoize EstimateSheetBranch

- **Goal:** Add a branch-level memo boundary that rerenders only affected branch headers, row tables, and child paths.
- **Requirements:** R1, R2, R7, R9, R10.
- **Dependencies:** U1, U3.
- **Files:** `src/components/workshop/estimate-sheet/rows/branch.tsx`, `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`, `tests/vitest/perf/estimate-sheet-memoization.test.tsx`, `tests/vitest/estimate-sheet-branch-header-ui.test.tsx`, `tests/vitest/estimate-template-drop-zones.test.tsx`.
- **Approach:** Convert the component to a memoized base with a custom comparator. Compare own row editable values, own selection membership, node total for the branch id, node identity, ancestor path, handler identities, and structural props.
- **Technical design:** The comparator should be directional guidance from the row-table comparator, not a broad deep-equal. Use owned row ids as the slice boundary and rerender on any prop that could affect header, rows, drop state, selection, or child visibility.
- **Patterns to follow:** `areEstimateRowItemsTablePropsEqual` in `row-table.tsx`.
- **Test scenarios:** Editing a row rerenders its branch and ancestor-total headers but not sibling branches. Selecting a row rerenders only the branch containing that row. Collapse state changes rerender visible branches as needed. Template drag/drop still invokes fresh handlers after parent state changes.
- **Verification:** Branch render probes prove unaffected branches skip; existing UI and drop-zone suites remain green.

### U5. Decide and Implement Node Totals Strategy

- **Goal:** Remove or justify the full `computeNodeTotals` traversal on every row edit.
- **Requirements:** R7, R8, R9.
- **Dependencies:** U1, U2, U4.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, `tests/vitest/estimate-sheet-node-totals.test.ts`, `tests/vitest/perf/estimate-sheet-memoization.test.tsx`.
- **Approach:** Use U1 probe data to choose the smallest correct strategy. If full recompute remains hot, introduce a derived totals cache or incremental totals helper with parity checks against `computeNodeTotals`.
- **Execution note:** Do not remove the current helper. Keep it as an oracle for tests even if the render path adopts an incremental helper.
- **Test scenarios:** Totals match for nested nodes, mixed rows plus child areas, inserted blank rows, deleted rows, moved rows, filtered displayed nodes, and project total events. Incremental path handles editable row values that differ from persisted row values.
- **Verification:** Totals parity tests pass, and compute-count tests prove a row edit no longer performs unnecessary full-tree total work when the selected strategy claims that win.

### U6. Optimize Component and Template Tree Data Shaping

- **Goal:** Treat component/template trees as the most likely first tens-of-thousands surface and reduce full-model rebuilds before changing generic tree internals.
- **Requirements:** R4, R9, R13.
- **Dependencies:** U1.
- **Files:** `src/components/ui/tree.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/component-library/tree/LibraryTree.tsx`, `src/components/workshop/component-library/tree/TemplatesTree.tsx`, `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`, `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`, `src/components/workshop/library/template-editor/TemplateStructureTree.tsx`, `tests/vitest/ui-tree.test.tsx`, `tests/vitest/perf/tree-memoization.test.tsx`.
- **Approach:** Add data-shaping probes for `LibraryTree`, `TemplatesTree`, `TemplatesBrowseManager`, and `LibraryFolderTree`. Memoize or index expensive full-array operations such as category grouping, project-source grouping, folder-to-component maps, search normalization, totals maps, id maps, and selection-node generation. Keep `Tree` as the generic renderer.
- **Patterns to follow:** Templates panel performance work that replaced repeated list scans with maps and indexes, plus existing `WORKSHOP_TREE_VIRTUALIZATION` usage in every tree consumer.
- **Test scenarios:** A tens-of-thousands fixture can search, select, expand, collapse, and mutate one component/template without rebuilding unrelated category/source/folder indexes. Mounted row counts remain virtualized. Search results stay correct after rename, duplicate, delete, and category change.
- **Verification:** Probe counts show expensive builders run only when their real inputs change; existing library/templates suites and `ui-tree` tests pass.

### U9. Audit Generic Shared Tree Row Memoization

- **Goal:** Measure whether shared `Tree` internals need additional row-label memoization after consumer-side data shaping and virtualization.
- **Requirements:** R4, R9, R13.
- **Dependencies:** U6.
- **Files:** `src/components/ui/tree.tsx`, representative tree consumers, `tests/vitest/ui-tree.test.tsx`, `tests/vitest/perf/tree-memoization.test.tsx`.
- **Approach:** Count visible row renders for default rows and representative custom row labels. Only change shared tree internals if counts remain meaningful with virtualization enabled and consumer data shaping fixed.
- **Patterns to follow:** Existing `DefaultTreeRow` memoization and tree virtualization tests.
- **Test scenarios:** Updating selection rerenders only visible affected rows when feasible. Custom row labels do not receive avoidably unstable props from their parent consumers. Drag/drop and a11y state remain fresh.
- **Verification:** Either no generic tree change is made with evidence that virtualization plus consumer indexing is sufficient, or targeted row-state/row-label memo changes pass tree and consumer tests.

### U7. Sidebar and Modal Prop Stability Pass

- **Goal:** Confirm sidebars and modal surfaces do not receive broad changing props that rerender expensive subtrees during ordinary row edits.
- **Requirements:** R1, R3, R11.
- **Dependencies:** U2, U4.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/component-library`, `tests/vitest/perf/estimate-sheet-memoization.test.tsx`.
- **Approach:** Inspect props passed to `EstimateRightSidebar`, proposal preview, activity panels, row details, and project-specific dialogs. Memoize derived prop bundles only where a render-probe test exposes churn.
- **Test scenarios:** Typing in a row with the sidebar rendered does not rerender right-sidebar internals unless tree props or library props change. Opening row details still resolves the edited row from current data.
- **Verification:** Render probes and existing sidebar tests pass.

### U8. Final QA, Review, and Cleanup

- **Goal:** Run focused regression, code review, and adversarial QA against memoization behavior before claiming the implementation done.
- **Requirements:** R1-R12.
- **Dependencies:** U1-U7.
- **Files:** `tests/vitest/perf/`, `tests/vitest/estimate-branch-virtualization.test.tsx`, `tests/vitest/estimate-row-table-virtualization.test.tsx`, `tests/vitest/ui-tree.test.tsx`, `.ai/05_logs/`.
- **Approach:** Use an independent review lane for comparator correctness and an UltraQA-style matrix for stale state, dirty worktree, flag opt-out, and misleading green tests.
- **Test scenarios:** The scenarios in `06_ultraqa_matrix.md` are executed or explicitly marked with safe substitutes.
- **Verification:** Focused perf/regression suites pass, typecheck and lint pass for changed files, diff hygiene passes, and a concise implementation log records evidence and residual risks.

---

## Dependencies and Sequencing

U1 must happen first. U2 and U3 can proceed independently after U1. U4 should wait for U3 so branch props are stable before comparator work. U5 should wait for U2 and U4 so totals work is measured after the cheaper wins. U6 should run before generic shared-tree internals because component/template tree data shaping is the likely high-cardinality bottleneck. U7 and U9 are evidence-gated and may remain audit-only if no material churn remains.
