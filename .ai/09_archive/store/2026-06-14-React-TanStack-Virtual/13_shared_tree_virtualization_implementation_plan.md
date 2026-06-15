# Shared Tree Virtualization Implementation Plan

Status: planning-only correction, added 2026-06-15. No source code, dependency, lockfile, runtime flag, migration, or provider setting is changed by this document.

## Correction

The app should plan shared Tree virtualization now.

The deciding premise is not the current sample estimate. The deciding premise is product scale: real Archestimator users can create deeply nested BOQs, reusable project-source trees, template trees, and library folder structures with hundreds or thousands of visible nodes. The sample route is useful for regression shape and baseline measurement, but it is not representative enough to block the Tree virtualization plan.

The implementation should still be default-off until proven in browser QA. That is a rollout safety rule, not a reason to avoid planning the work.

## Scope

Primary implementation surface:

- `src/components/ui/tree.tsx`

Current shared `Tree` consumers to accommodate:

| Tier | Consumer | File | Why it matters |
| --- | --- | --- | --- |
| 1 | Estimate sheet tree | `src/components/workshop/EstimateSheetTree.tsx` | highest daily use; exercises current row, rename, DnD, context menu, selection, and occupied-node styling |
| 2 | Component library tree | `src/components/workshop/component-library/tree/LibraryTree.tsx` | right-panel search, component drag, add action, selection |
| 2 | Templates/project-source tree | `src/components/workshop/component-library/tree/TemplatesTree.tsx` | project BOQ source trees can become very large; mixed row heights and skeleton children |
| 3 | Library folder manager | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | folder/component management, DnD, bulk selection |
| 3 | Templates browse manager | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` | template library navigation and reorder/context menu |
| 3 | Template editor structure tree | `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` | template authoring tree with reorder/delete context menu |
| proof | Storybook tree stories | `src/stories/trees/tree.stories.tsx` | visual review surface for virtual and non-virtual variants |

Out of scope for this shared Tree implementation plan, but still in scope for the overall TanStack Virtual plan:

- center estimate row-table virtualization
- whole-page estimate sheet virtualization
- database schema changes
- changing tree data models or IDs
- making virtualization default-on in the first implementation pass

## Design

Add a default-off virtual mode to the shared `Tree` primitive:

```ts
export type TreeVirtualizationOptions = {
  enabled?: boolean;
  minRows?: number;
  estimateRowHeight?: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
  useFlushSync?: boolean;
};
```

The default path remains current behavior:

- omitted `virtualization` means non-virtual render
- `enabled !== true` means non-virtual render
- `flatNodes.length < minRows` means non-virtual render
- virtual rows use stable `flatNodes[index].id` keys
- root drop zones remain outside the virtual window
- `data-tree-row`, ARIA attributes, render contracts, context menus, DnD, and selection semantics remain unchanged

The virtual path should expose explicit test markers:

- `data-tree-virtualizer`
- `data-tree-virtual-row`
- `data-tree-virtual-total-count`
- `data-tree-virtual-mounted-count`

Tests must assert the virtual path is active before asserting bounded mounted row count.

## Implementation Phases

### Phase T0 - Contract Tests First

Add failing tests before implementation for:

- virtual mode activates only when `enabled` and `flatNodes.length >= minRows`
- virtual mode renders fewer mounted rows than logical rows for a large expanded fixture
- non-virtual mode still renders all rows
- stable row attributes and ARIA metadata remain logical, not window-local
- root drop zones stay mounted outside the virtual row window
- context menu can open on a virtual row
- Arrow/Home/End can move focus across offscreen rows by scrolling then focusing
- DnD before/after/inside resolves against first and last mounted virtual rows

### Phase T1 - Shared Primitive

Implement `TreeVirtualizationOptions` in `src/components/ui/tree.tsx`.

Required internal shape:

- keep current `flattenTree` logic as the logical source of truth
- extract existing row rendering into one helper shared by virtual and non-virtual paths
- use `useVirtualizer` from `@tanstack/react-virtual`
- use stable IDs for item keys
- default `estimateRowHeight` to the current `min-h-7` row height
- default `overscan` to `8`
- set `useFlushSync: false` unless browser proof says otherwise
- scroll to logical targets before focusing unmounted rows

### Phase T2 - Tier 1 Consumer

Enable virtual mode for `EstimateSheetTree` first, still default-off globally.

Proof requirements:

- expand/collapse
- current-node rail
- inline rename
- single and bulk selection
- context menu
- internal reorder DnD
- external template/project-source drops
- search and structural filter
- empty tree and optimistic new-node paths

### Phase T3 - Tier 2 Consumers

Enable separately for:

- `LibraryTree`
- `TemplatesTree`

Extra proof requirements:

- right-panel search does not mount every matching descendant unnecessarily
- component drag from library into sheet still stamps payloads
- template/project-source drag still stamps payloads
- skeleton project-source children do not cause scroll drift
- mixed-height template rows either measure correctly or stay on the non-virtual path until measured

### Phase T4 - Tier 3 Consumers

Enable after Tier 1 and Tier 2 are stable:

- `LibraryFolderTree`
- `TemplatesBrowseManager`
- `TemplateStructureTree`

These are still in scope because they share the same primitive and can inherit bugs. They do not need to block the first local proof, but the plan must account for them before default-on rollout.

### Phase T5 - Storybook And Browser Review

Add Storybook variants for:

- small non-virtual tree
- large virtual tree
- selectable/draggable virtual tree
- mixed-height or custom-row virtual tree

Browser QA must cover:

- desktop and narrow panel widths
- fast scroll with no blank gaps
- keyboard navigation across offscreen rows
- context menu after scroll
- drag/drop on first and last mounted virtual rows
- reduced motion

## Rollout

Rollout order:

1. dependency and code path present, flag off
2. shared primitive tests pass
3. Tier 1 local enablement
4. Tier 2 local enablement
5. Tier 3 local enablement or explicit deferral
6. closed-beta flag-on dogfood
7. default-on only after before/after browser evidence improves the failing metric

Rollback remains:

```bash
NEXT_PUBLIC_TREE_VIRTUALIZATION=false
```

## Required Verification

Minimum implementation verification:

```bash
bunx vitest run tests/vitest/ui-tree.test.tsx tests/vitest/tree-external-drop.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/templates-tree-performance.test.ts --maxWorkers=1
bun run type-check
bunx eslint src/components/ui/tree.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/TemplatesTree.tsx
git diff --check
```

Default-on verification additionally requires:

- large fixture with at least `1000` visible logical tree rows
- flag-off vs flag-on DOM counts
- browser scroll proof with no blank gaps
- keyboard/focus proof across unmounted rows
- DnD/context-menu proof after scroll
- rollback flag proof

## Decision Boundary

Tree virtualization is now planned work.

What remains gated:

- enabling it by default
- applying it to mixed-height consumers without measurement proof
- EMC branch/section virtualization, covered separately in `14_emc_virtualization_implementation_plan.md`
- EMC row-table virtualization, covered separately in `14_emc_virtualization_implementation_plan.md`

This aligns with the product reality: build the shared infrastructure for the scale users are expected to hit, but keep runtime exposure controlled until the browser proves the interactions are solid.
