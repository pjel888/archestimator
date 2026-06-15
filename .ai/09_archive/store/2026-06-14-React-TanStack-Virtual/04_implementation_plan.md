# Implementation Plan

This is a handoff plan. Do not implement until the owner starts the implementation phase.

Second-pass route map: see `08_implementation_routes.md`. Third-pass evidence protocol: see `11_browser_evidence_and_startup_decision.md`.

## Phase 0 - Product-scale baseline and rollout decision

Goal: record baseline evidence and rollout thresholds for an already-planned shared Tree virtualization implementation.

2026-06-15 correction: do not let the current sample project veto the Tree or EMC plan. The owner has clarified that production users are expected to create deeply nested BOQ structures with potentially thousands of nodes. The implementation plan should therefore accommodate full shared Tree virtualization and EMC virtualization now, while still requiring browser proof before any default-on rollout.

Tasks:

- [x] Record the first real-route count/profile pass in `12_browser_count_profile_report.md`.
- [x] Record the product-scale decision adjustment in `13_shared_tree_virtualization_implementation_plan.md`.
- [x] Record the EMC virtualization plan in `14_emc_virtualization_implementation_plan.md`.
- [ ] Create or reuse large fixtures for:
  - `1,000+` visible left tree rows
  - `1,000+` visible right component/template rows
  - `1,000+` visible EMC branch nodes where practical
  - `500+` EMC row items distributed across nested nodes
  - `1,000+` library folder/template-editor rows where practical
  - `500+` estimate row items in one center-sheet node for the row-table sub-track
- [ ] Run existing jsdom perf profile:

```bash
SHEET_PERF_BASELINE_OUTPUT=.omx/artifacts/perf/tanstack-virtual/before-sheet.json bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1
```

- [ ] Add a browser profiling script or Playwright trace for the current in-app route:

```bash
bun run dev
```

Manual/browser target:

```text
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/61afe46e-3d5d-4f04-85ae-758e78aa4937
```

- [ ] Record:
  - initial render time
  - scroll long tasks
  - DOM node count
  - tree expand/collapse responsiveness
  - EMC expand/collapse and center-scroll responsiveness
  - right panel search responsiveness
  - DnD/context-menu/focus responsiveness across virtual boundaries
  - edit latency in EMC rows near top, middle, bottom
- [ ] Decide first enabled surface:
  - shared `Tree` is the planned implementation route
  - left `EstimateSheetTree` is the first consumer proof
  - right `LibraryTree` and `TemplatesTree` follow after left-tree proof
  - EMC branch/section virtualization is a planned track and can run after or in parallel with shared Tree if fixtures show it is the larger user-facing win
  - EMC row-table virtualization is planned as a sub-track when large nodes make row bodies expensive
  - library-management/template-editor consumers follow after the shared path is stable
- [ ] Record the chosen route from `08_implementation_routes.md`.
- [ ] Record the blast-radius checklist items from `07_blast_radius_map.md` that apply to the chosen route.
- [ ] Record whether the decision is:
  - start implementation behind flags
  - turn on locally/staging
  - turn on by default
  - stop

Exit criteria:

- `@tanstack/react-virtual` is planned for shared Tree and EMC virtualization because production-scale nested BOQs are expected.
- The first implementation surfaces are shared `Tree` and EMC; sequencing depends on fixture/profile priority, with separate flags.
- Before metrics are saved in `.omx/artifacts/perf/tanstack-virtual/`.
- A stop decision is written only if the Tree architecture cannot preserve focus, DnD, context menu, ARIA, and rollback contracts.
- Default-on remains blocked until before/after browser evidence proves the enabled virtual path helps.

## Phase 1 - Add dependency and flags

Tasks:

- [ ] Add dependency:

```bash
bun add @tanstack/react-virtual
```

- [ ] Add feature flag helpers near the target surface or in a tiny shared file:

```ts
export const ENABLE_TREE_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_TREE_VIRTUALIZATION === "true";

export const ENABLE_EMC_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_EMC_VIRTUALIZATION === "true";

export const ENABLE_ESTIMATE_ROW_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION === "true";
```

- [ ] Keep both flags default-off.
- [ ] Verify:

```bash
bun run type-check
bunx eslint package.json src/components/ui/tree.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx
git diff --check
```

Exit criteria:

- Dependency installs cleanly.
- No runtime behavior changes when flags are off.

## Phase 2A - Shared Tree virtual mode

This is the primary implementation phase. It is not blocked on the current small sample project because production-scale nested trees are expected. It remains default-off until proof is strong enough to enable.

Files:

- `src/components/ui/tree.tsx`
- `tests/vitest/ui-tree.test.tsx`
- `tests/vitest/tree-external-drop.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`

Tasks:

- [ ] Add `TreeVirtualizationOptions` and optional `virtualization` prop.
- [ ] Extract the existing row render block into a local `renderFlatRow(flat)` helper so non-virtual and virtual paths share behavior.
- [ ] Add virtual path gated by:
  - `virtualization.enabled === true`
  - `flatNodes.length >= (virtualization.minRows ?? 150)`
- [ ] Use `getItemKey(index) => flatNodes[index].id`.
- [ ] Set `estimateSize` to `28` initially and `overscan` to `8`.
- [ ] Set `useFlushSync: false` unless a spike proves this breaks scroll correctness.
- [ ] Update focus handling:
  - keyboard events update logical `focusId`
  - if target is offscreen, virtualizer scrolls to the target index
  - after mount, focus `[data-tree-row="${focusId}"]`
- [ ] Keep root drop zones outside the virtual row container.
- [ ] Preserve `renderItem` and `renderRow` contracts.

Tests to add:

- [ ] virtual-path activation test proves the `Tree` virtual path is active before mounted row counts are asserted
- [ ] virtual mode renders fewer rows than the full tree for a large expanded fixture
- [ ] ArrowDown from a rendered row can focus a previously offscreen row
- [ ] Home/End scroll and focus first/last logical row
- [ ] search-revealed nodes keep correct `aria-level`, `aria-posinset`, `aria-setsize`
- [ ] context menu opens on a virtual row and keeps row rails pinned
- [ ] DnD before/after/inside still reports the correct target for first and last rendered rows

Verification:

```bash
bunx vitest run tests/vitest/ui-tree.test.tsx tests/vitest/tree-external-drop.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/templates-tree-performance.test.ts --maxWorkers=1
bun run type-check
bunx eslint src/components/ui/tree.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/TemplatesTree.tsx tests/vitest/ui-tree.test.tsx
git diff --check
```

Exit criteria:

- Shared tree behavior is identical with flag off.
- Virtual mode passes keyboard, DnD, context menu, search, and ARIA tests.

## Phase 2B - Enable Tree virtual mode by consumer

Files:

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/template-editor/TemplateStructureTree.tsx`
- `src/stories/trees/tree.stories.tsx`

Tasks:

- [ ] Enable virtual mode for `EstimateSheetTree` first:

```tsx
<Tree
  // existing props
  virtualization={{
    enabled: ENABLE_TREE_VIRTUALIZATION,
    minRows: TREE_VIRTUALIZATION_MIN_ROWS,
    estimateRowHeight: 28,
    overscan: 8,
    useFlushSync: false,
  }}
/>
```

- [ ] Run left tree browser QA before enabling right trees.
- [ ] Enable `LibraryTree` and `TemplatesTree` after shared tests pass.
- [ ] Enable `LibraryFolderTree`, `TemplatesBrowseManager`, and `TemplateStructureTree` only after the estimate-sheet and right-panel trees prove the shared path.
- [ ] Update Storybook examples so reviewers can inspect virtual and non-virtual Tree modes side by side.
- [ ] For templates/project-source rows with variable height, use `measureElement` if visual QA shows row clipping or scroll drift.

Exit criteria:

- Left tree can be enabled alone.
- Right library/templates trees can be enabled separately.
- Lower-traffic management/editor trees are covered by tests or explicitly deferred with rationale.
- Rollback is a flag flip.

## Phase 3A - Estimate row-table virtual body

Do this phase as part of the EMC track when a large node can own enough row items for table-body DOM to matter. This is no longer excluded from planning; it is default-off and separately proven because table/focus semantics are high risk.

Files:

- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet-render-probe.ts`
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`
- `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

Tasks:

- [ ] Add a default-off `virtualization` prop to `EstimateRowItemsTable`.
- [ ] Extract existing row rendering into a shared local function so non-virtual and virtual paths use the same row component.
- [ ] Add a `VirtualEstimateRowsBody` with:
  - `count: items.length`
  - `getItemKey: index => items[index].id`
  - `estimateSize: () => 96`
  - `overscan: 6`
  - `useFlushSync: false`
- [ ] Keep non-virtual path for `items.length < 75`.
- [ ] Preserve row data attributes:
  - `data-estimate-row-id`
  - `data-estimate-row-index`
  - `data-estimate-cell-index`
- [ ] Introduce row-id focus helper in `cells.tsx`.
- [ ] Update ArrowUp/ArrowDown to scroll-to-row-id when the target row is offscreen.
- [ ] Keep `selectedRowIds` independent of mounted rows.
- [ ] Add cursor fallback test for offscreen row anchors.
- [ ] Add virtual-path activation test proving the row-table virtual body is active before mounted row counts are asserted.

Verification:

```bash
bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
bun run type-check
bunx eslint src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet-render-probe.ts tests/vitest/perf/estimate-sheet-render-baseline.test.tsx
git diff --check
```

Exit criteria:

- Existing render isolation tests still pass.
- Focus, edit, blur-save, selection, and row details work in virtual mode.
- Browser trace shows the failing metric improved.

## Phase 3B - Enable row-table virtualization in the sheet

Files:

- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`

Tasks:

- [ ] Pass virtualization options from `EstimateSheetBranch` to `EstimateRowItemsTable`.
- [ ] Keep flag default-off.
- [ ] Verify branch headers, add-row strips, child areas, and sticky top header behavior in browser.
- [ ] Verify drag from right library into a virtualized row table.
- [ ] Verify pending focus after adding a blank row near the bottom of a long table.

Exit criteria:

- Virtual row-table can be enabled without enabling tree virtualization.
- Rollback is a flag flip.

## Phase 3C - EMC branch/section virtualization

Do this phase for the center Estimate Master Column when large BOQs create many visible node sections, even if each individual row table is not huge.

Files:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/expansion.ts`
- `src/components/workshop/estimate-sheet-render-probe.ts`
- `tests/vitest/estimate-mixed-content.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`

Tasks:

- [ ] Add `NEXT_PUBLIC_EMC_VIRTUALIZATION`, default-off.
- [ ] Add a logical flattener for the expanded EMC node hierarchy using stable `node.id` keys.
- [ ] Extract branch header/body rendering so recursive and virtual paths share behavior.
- [ ] Add virtual EMC section path using dynamic measurement.
- [ ] Preserve rows-first order: node header, own rows/add-row/drop zone, then child nodes as later logical sections.
- [ ] Preserve collapse/search behavior from `useEstimateSheetExpansion`.
- [ ] Preserve template/component drop targets and edge auto-scroll.
- [ ] Preserve the single sticky displayed-node header behavior.
- [ ] Add virtual-path activation markers and tests before asserting mounted section counts.

Verification:

```bash
bunx vitest run tests/vitest/estimate-mixed-content.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx --maxWorkers=1
bun run type-check
bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/rows/branch.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx
git diff --check
```

Exit criteria:

- EMC virtual path can be enabled independently from shared Tree virtualization.
- Mixed-content layout, rows-first ordering, collapse, search, drops, add-row, and sticky header behavior remain intact.
- Browser proof shows fewer mounted center sections or rows on a large fixture without blank gaps or lost edit focus.
- Rollback is `NEXT_PUBLIC_EMC_VIRTUALIZATION=false`.

## Phase 4 - Browser QA and rollout

Manual QA target:

```text
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/61afe46e-3d5d-4f04-85ae-758e78aa4937
```

QA checklist:

- [ ] open sheet with left and right panels visible
- [ ] expand/collapse left tree deeply
- [ ] search left tree and right tree
- [ ] keyboard navigate left tree with Arrow/Home/End
- [ ] context menu a virtualized row
- [ ] rename a left tree node
- [ ] drag/drop tree nodes before/after/inside
- [ ] drag a component from right panel into center sheet
- [ ] type quantity/adjustment/misc in top, middle, bottom row positions
- [ ] open row details and activity
- [ ] bulk select visible and offscreen rows
- [ ] observe remote cursor layer if a second session is available
- [ ] reduced-motion mode does not introduce jumpy cursor or scroll behavior

Final verification:

```bash
bun run type-check
bunx vitest run tests/vitest/ui-tree.test.tsx tests/vitest/tree-external-drop.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/templates-tree-performance.test.ts --maxWorkers=1
bunx vitest run tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
git diff --check
```
