import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EstimateRowItemsTable } from "@/components/workshop/estimate-sheet/rows/row-table";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const noop = vi.fn();

function makeRows(count: number, prefix = "virtual"): EstimateRowItem[] {
  const base = estimateLibraryItems[0];
  return Array.from({ length: count }, (_, index) => ({
    ...base,
    id: `${prefix}-row-${index + 1}`,
    material: `${prefix} Row ${index + 1}`,
  }));
}

function rect(top: number, height: number) {
  return {
    bottom: top + height,
    height,
    left: 0,
    right: 800,
    top,
    width: 800,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe("estimate row table virtualization", () => {
  it("mounts a bounded row window when row virtualization is enabled", async () => {
    const { container } = render(
      <EstimateRowItemsTable
        items={makeRows(120)}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="virtual-node"
        onInsertLibraryItem={noop}
        onReplaceRowItem={noop}
        onDeleteRowItem={noop}
        onUpdateRowItem={noop}
        onMarkRowDirty={noop}
        onOpenRowDetails={noop}
        onClearRowComponent={noop}
        onRequestProjectSpecific={noop}
        onMoveRowComponent={noop}
        selectedRowIds={new Set()}
        onToggleRowSelection={noop}
        onToggleRowsSelection={noop}
        virtualization={{ enabled: true, minRows: 1, estimateRowHeight: 96, overscan: 2 }}
      />
    );

    const virtualizer = container.querySelector("[data-estimate-row-virtualizer]") as HTMLElement;
    expect(virtualizer).not.toBeNull();
    expect(virtualizer).toHaveAttribute("data-estimate-row-virtual-total-count", "120");
    await waitFor(() => expect(Number(virtualizer.getAttribute("data-estimate-row-virtual-mounted-count"))).toBeGreaterThan(0));
    const mountedCount = Number(virtualizer.getAttribute("data-estimate-row-virtual-mounted-count"));
    expect(mountedCount).toBeGreaterThan(0);
    expect(mountedCount).toBeLessThan(120);
    expect(container.querySelectorAll("tr[data-estimate-row-id]").length).toBe(mountedCount);
  });

  it("compensates lower row tables inside a shared sheet scroller", async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const element = this as HTMLElement;
      if (element.dataset.testid === "shared-row-scroller") return rect(0, 240);
      if (element.dataset.estimateRowTableRoot === "first-node") return rect(0 - (element.parentElement?.scrollTop ?? 0), 11_520);
      if (element.dataset.estimateRowTableRoot === "second-node") return rect(1_200 - (element.parentElement?.scrollTop ?? 0), 11_520);
      return originalGetBoundingClientRect.call(this);
    };

    try {
      const { container } = render(
        <div data-testid="shared-row-scroller" style={{ height: 240, overflowY: "auto" }}>
          <EstimateRowItemsTable
            items={makeRows(120, "first")}
            editableRows={{}}
            setEditableRows={noop}
            targetNodeId="first-node"
            onInsertLibraryItem={noop}
            onReplaceRowItem={noop}
            onDeleteRowItem={noop}
            onUpdateRowItem={noop}
            onMarkRowDirty={noop}
            onOpenRowDetails={noop}
            onClearRowComponent={noop}
            onRequestProjectSpecific={noop}
            onMoveRowComponent={noop}
            selectedRowIds={new Set()}
            onToggleRowSelection={noop}
            onToggleRowsSelection={noop}
            virtualization={{ enabled: true, minRows: 1, estimateRowHeight: 96, overscan: 2, initialViewportHeight: 240 }}
          />
          <EstimateRowItemsTable
            items={makeRows(120, "second")}
            editableRows={{}}
            setEditableRows={noop}
            targetNodeId="second-node"
            onInsertLibraryItem={noop}
            onReplaceRowItem={noop}
            onDeleteRowItem={noop}
            onUpdateRowItem={noop}
            onMarkRowDirty={noop}
            onOpenRowDetails={noop}
            onClearRowComponent={noop}
            onRequestProjectSpecific={noop}
            onMoveRowComponent={noop}
            selectedRowIds={new Set()}
            onToggleRowSelection={noop}
            onToggleRowsSelection={noop}
            virtualization={{ enabled: true, minRows: 1, estimateRowHeight: 96, overscan: 2, initialViewportHeight: 240 }}
          />
        </div>
      );

      const scroller = container.querySelector("[data-testid='shared-row-scroller']") as HTMLElement;
      scroller.scrollTop = 1_200;
      fireEvent.scroll(scroller);

      const secondVirtualizer = container.querySelector("[data-estimate-row-table-root='second-node'] [data-estimate-row-virtualizer]") as HTMLElement;
      await waitFor(() => expect(secondVirtualizer).toHaveAttribute("data-estimate-row-scroll-margin", "1200"));
      await waitFor(() => expect(container.querySelector("[data-estimate-row-id='second-row-1']")).not.toBeNull());
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });
});
