# Implementation Plan

This is a handoff plan. Do not implement until the owner starts the implementation phase.

Second-pass route map: see `08_implementation_routes.md`. Third-pass evidence protocol: see `11_browser_evidence_and_startup_decision.md`.

## Phase 0 - Baseline and dependency decision

Goal: decide whether to start a reversible virtualization implementation, which surface to start with, and what proof is required before enabling it.

Tasks:

- [ ] Create or reuse large fixtures for:
  - `500+` estimate row items in the center sheet
  - `1,000+` visible left tree rows
  - `1,000+` visible right component/template rows
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
  - edit latency in a row near top, middle, bottom
  - tree expand/collapse responsiveness
  - right panel search responsiveness
- [ ] Decide first enabled surface:
  - if tree DOM count dominates, start with shared `Tree`
  - if row-table DOM count dominates, start with `EstimateRowItemsTable`
  - if neither dominates but the startup-bias criteria in `11_browser_evidence_and_startup_decision.md` pass, choose the proactive shared-tree route only
  - if neither dominates and startup-bias criteria do not pass, stop and do not add the dependency yet
- [ ] Record the chosen route from `08_implementation_routes.md`.
- [ ] Record the blast-radius checklist items from `07_blast_radius_map.md` that apply to the chosen route.
- [ ] Record whether the decision is:
  - start implementation behind flags
  - turn on locally/staging
  - turn on by default
  - stop

Exit criteria:

- `@tanstack/react-virtual` is justified for at least one named surface or for the proactive shared-tree route.
- The first implementation surface is chosen.
- Before metrics are saved in `.omx/artifacts/perf/tanstack-virtual/`.
- A stop decision is written if browser evidence and startup-bias criteria do not justify reversible implementation.
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

Do this phase if Gate 0 identifies tree DOM rendering as the first bottleneck.

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
- [ ] For templates rows with variable height, use `measureElement` if visual QA shows row clipping or scroll drift.

Exit criteria:

- Left tree can be enabled alone.
- Right library/templates trees can be enabled separately.
- Rollback is a flag flip.

## Phase 3A - Estimate row-table virtual body

Do this phase if Gate 0 identifies row-table body DOM rendering as the first bottleneck.

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
