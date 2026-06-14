# Architecture

## Design principles

- Expected production BOQ scale is a first-class architectural input. The current sample project is useful for shape and regression checks, but it is not the reason to defer shared Tree or EMC virtualization planning.
- Virtualization is an implementation detail, not a data model change.
- Logical lists stay complete in memory; only DOM mounting is windowed.
- Small lists should keep the simple non-virtual path.
- Stable ids are mandatory. Avoid index keys because expanded tree rows and estimate rows can shift.
- Each virtualized surface needs a scroll-to-item API for keyboard, pending focus, search, and "open current row" flows.
- Feature flags must allow immediate rollback without reverting the dependency.

## Product-scale premise

The shared `Tree` primitive sits under workflows where live users can plausibly produce thousands of nested nodes:

- project BOQ / estimate sheet area trees
- center Estimate Master Column (EMC) branch hierarchy and row tables
- component-library folders and components
- reusable project-source trees under Templates
- custom estimate-template trees
- template editor structure trees

This means the architecture should be designed for production-scale nested trees and EMC bodies even if the current demo route is small. Browser profiling still matters, but its job is to tune thresholds, prove default-on rollout, and catch interaction regressions. It is not a veto on planning the shared Tree or EMC routes.

## Proposed feature flags

Use env flags during implementation:

```ts
const ENABLE_TREE_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_TREE_VIRTUALIZATION === "true";

const ENABLE_EMC_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_EMC_VIRTUALIZATION === "true";

const ENABLE_ESTIMATE_ROW_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION === "true";
```

Recommended thresholds:

```ts
const TREE_VIRTUALIZATION_MIN_ROWS = 150;
const EMC_VIRTUALIZATION_MIN_NODES = 100;
const ESTIMATE_TABLE_VIRTUALIZATION_MIN_ROWS = 75;
```

Thresholds are starting values only. Tune after Gate 0 browser profiles.

## Shared tree virtual mode

This is the primary implementation track for this plan. It should be planned as a shared primitive capability, then rolled out consumer by consumer.

Current known `Tree` consumers:

| Consumer | File | Initial rollout tier |
| --- | --- | --- |
| Estimate sheet tree | `src/components/workshop/EstimateSheetTree.tsx` | Tier 1 |
| Right component library tree | `src/components/workshop/component-library/tree/LibraryTree.tsx` | Tier 2 |
| Right templates/project sources tree | `src/components/workshop/component-library/tree/TemplatesTree.tsx` | Tier 2 |
| Library folder manager tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | Tier 3 |
| Templates browse manager tree | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` | Tier 3 |
| Template editor structure tree | `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` | Tier 3 |
| Storybook tree examples | `src/stories/trees/tree.stories.tsx` | proof / docs |

Extend `TreeProps` in `src/components/ui/tree.tsx`:

```ts
export type TreeVirtualizationOptions = {
  enabled?: boolean;
  estimateRowHeight?: number;
  overscan?: number;
  minRows?: number;
  getScrollElement?: () => HTMLElement | null;
  useFlushSync?: boolean;
};

export interface TreeProps {
  // existing props...
  virtualization?: TreeVirtualizationOptions;
}
```

Expected default behavior:

- `virtualization` omitted means current non-virtual render.
- `virtualization.enabled !== true` means current non-virtual render.
- `flatNodes.length < minRows` means current non-virtual render.
- `getItemKey(index)` returns `flatNodes[index].id`.
- `estimateSize` defaults to `estimateRowHeight ?? 28`.
- `overscan` defaults to `8` for trees.
- `useFlushSync` should default to `false` in React 19 unless measurement proves synchronous updates are needed.

Rendering shape:

```tsx
const rowVirtualizer = useVirtualizer({
  count: flatNodes.length,
  getScrollElement: () => scrollElement,
  getItemKey: (index) => flatNodes[index]?.id ?? index,
  estimateSize: () => estimateRowHeight,
  overscan,
  useFlushSync: false,
});
```

The virtual render loop should place rows in a relative inner container:

```tsx
<div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
    const flat = flatNodes[virtualRow.index];
    return (
      <div
        key={virtualRow.key}
        data-tree-virtual-row
        data-index={virtualRow.index}
        ref={rowVirtualizer.measureElement}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${virtualRow.start}px)`,
        }}
      >
        {renderExistingTreeRow(flat)}
      </div>
    );
  })}
</div>
```

Tree-specific additions:

- Keep root drop zones outside the virtual inner container.
- Add `scrollToNode(nodeId, align)` internally for keyboard and current-row changes.
- When `focusId` changes to an offscreen row, find its logical index, call `scrollToIndex`, then focus after the row mounts.
- Keep search reveal based on the logical `flatNodes`, not DOM.

## EMC virtual mode

EMC means the center Estimate Master Column: the recursive `EstimateSheetBranch` hierarchy plus each node's own row table. It is tree-shaped but it does not use `src/components/ui/tree.tsx`, so it needs its own virtualization plan.

Primary files:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet-render-probe.ts`

Recommended architecture:

1. Flatten the expanded EMC branch hierarchy into a logical ordered stream of visible node sections.
2. Keep logical identity by `node.id`; never key virtual items by index.
3. Render each virtual item as a node section block: header, breadcrumbs, own row table, add-row/drop affordances, and node-level totals.
4. Preserve rows-first ordering by placing each node's own rows directly under its header; children appear as later logical virtual items at deeper depth.
5. Use dynamic measurement for section heights because node sections can contain zero rows, many rows, breadcrumbs, drop zones, or loading/empty states.
6. Keep only the displayed top node header sticky unless a later browser proof designs a safe sticky cascade.
7. Keep the non-virtual recursive `EstimateSheetBranch` path as fallback while the virtual path matures.

EMC branch virtualization and row-table virtualization are related but separate:

- branch/section virtualization limits how many node sections are mounted
- row-table virtualization limits how many rows inside one large node table are mounted
- a large BOQ can need both
- each must have its own activation proof so tests cannot pass while the wrong virtual path is disabled

## Estimate row-table virtual body

Extend `EstimateRowItemsTableProps` in `src/components/workshop/estimate-sheet/rows/row-table.tsx`:

```ts
type EstimateRowItemsTableProps = {
  // existing props...
  virtualization?: {
    enabled?: boolean;
    minRows?: number;
    estimateRowHeight?: number;
    overscan?: number;
  };
};
```

Expected default behavior:

- omitted or disabled means current table rendering.
- `items.length < minRows` means current table rendering.
- use stable row ids through `getItemKey`.
- estimate row height starts at `96`.
- overscan starts at `6`.

Recommended first implementation:

- Keep the existing `thead`.
- Extract the existing row map into a shared `renderRow(item, rowIndex)` helper.
- Add a `VirtualEstimateRowItemsBody` component that renders the rows in a virtual block.
- Keep the non-virtual `<tbody>` path for small tables and fallback.

Important table semantics note:

Native `<tbody>` plus absolutely positioned `<tr>` is fragile. The first implementation should decide between two explicit options during the spike:

1. Keep native table semantics for the non-virtual path and render a `role="rowgroup"` grid-like virtual body for the virtual path.
2. Keep a table-looking CSS grid for both paths by extracting the table body out of native table semantics.

The plan recommends option 1 for a smaller initial blast radius, with accessibility tests proving row/cell names still work.

## Focus architecture

Current row focus uses local row indexes:

```ts
focusEstimateCell(rowIndex, cellIndex)
```

Virtualization should introduce stable row-id targeting:

```ts
export function focusEstimateCellByRowId(rowId: string, cellIndex: number) {
  const nextCell = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-estimate-row-id="${rowId}"][data-estimate-cell-index="${cellIndex}"]`,
  );
  nextCell?.focus();
  if (nextCell instanceof HTMLInputElement) nextCell.select();
}
```

Arrow navigation can derive the next row id from the table's `items` array:

```ts
const nextItem = items[rowIndex + delta];
requestFocusRowId(nextItem.id, nextCellIndex);
```

For offscreen virtual rows, the virtual table must scroll to the row's index and focus after mount.

## Remote cursor architecture

Current cursor fallback already returns absolute cursor coordinates when DOM anchor lookup misses. Keep that behavior, but add tests and a small UX refinement:

- if a cursor row is mounted, anchor to row/cell DOM exactly as today
- if a cursor row is offscreen, keep last known absolute coordinates or show a subdued edge indicator near the scroll container boundary
- do not force-scroll local users to remote cursor positions
- do not re-render sheet rows when cursor frames arrive

## Measurement architecture

Extend `src/components/workshop/estimate-sheet-render-probe.ts` with optional row mount/window events during implementation:

```ts
type EstimateSheetRenderProbe = {
  onTableRender?: (nodeId: string) => void;
  onRowRender?: (rowId: string) => void;
  onVirtualWindowChange?: (nodeId: string, mountedCount: number, totalCount: number) => void;
};
```

If this is too invasive, keep a separate test-only callback local to row-table tests. Do not make production UI depend on the probe.
