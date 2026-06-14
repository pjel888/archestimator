# Architecture

## Design principles

- Virtualization is an implementation detail, not a data model change.
- Logical lists stay complete in memory; only DOM mounting is windowed.
- Small lists should keep the simple non-virtual path.
- Stable ids are mandatory. Avoid index keys because expanded tree rows and estimate rows can shift.
- Each virtualized surface needs a scroll-to-item API for keyboard, pending focus, search, and "open current row" flows.
- Feature flags must allow immediate rollback without reverting the dependency.

## Proposed feature flags

Use env flags during implementation:

```ts
const ENABLE_TREE_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_TREE_VIRTUALIZATION === "true";

const ENABLE_ESTIMATE_ROW_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION === "true";
```

Recommended thresholds:

```ts
const TREE_VIRTUALIZATION_MIN_ROWS = 150;
const ESTIMATE_TABLE_VIRTUALIZATION_MIN_ROWS = 75;
```

Thresholds are starting values only. Tune after Gate 0 browser profiles.

## Shared tree virtual mode

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
