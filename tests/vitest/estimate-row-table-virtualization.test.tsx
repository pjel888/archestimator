import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { EstimateRowItemsTable } from "@/components/workshop/estimate-sheet/rows/row-table";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { ESTIMATE_COLUMN_TEMPLATE, RESIZABLE_ESTIMATE_COLUMN_IDS } from "@/lib/estimate-sheet/column-model";
import { withExpressComponentMetadata } from "@/lib/estimates/express-components";

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
  it("uses the shared column template without changing row DOM contracts", () => {
    const { container } = render(
      <EstimateRowItemsTable
        items={makeRows(2, "template")}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="template-node"
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
        virtualization={{ enabled: false }}
      />
    );

    const headerRow = container.querySelector("thead tr") as HTMLElement;
    const bodyRow = container.querySelector("tr[data-estimate-row-id='template-row-1']") as HTMLElement;

    expect(headerRow.style.gridTemplateColumns).toBe(ESTIMATE_COLUMN_TEMPLATE);
    expect(bodyRow.style.gridTemplateColumns).toBe(ESTIMATE_COLUMN_TEMPLATE);
    expect(Array.from(headerRow.querySelectorAll("th")).map((header) => header.getAttribute("scope"))).toEqual(
      Array.from({ length: 10 }, () => "col"),
    );
    expect(bodyRow).toHaveAttribute("data-estimate-row-id", "template-row-1");
    expect(bodyRow.querySelectorAll("[data-estimate-cell-index]").length).toBeGreaterThan(0);
  });

  it("hides row and component mutation affordances for read-only viewers", () => {
    const rows = makeRows(1, "readonly");
    const rowLabel = rows[0]?.material ?? "readonly Row 1";

    render(
      <EstimateRowItemsTable
        canEditEstimate={false}
        items={rows}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="readonly-node"
        onInsertLibraryItem={noop}
        onReplaceRowItem={noop}
        onDeleteRowItem={noop}
        onUpdateRowItem={noop}
        onMarkRowDirty={noop}
        onOpenRowDetails={noop}
        onClearRowComponent={noop}
        onRequestProjectSpecific={noop}
        onPromoteRowToLibrary={noop}
        onMoveRowComponent={noop}
        onMoveRowItem={noop}
        onOpenMoveRowItemDialog={noop}
        onOpenReplaceComponentPicker={noop}
        onOpenMoveComponentPicker={noop}
        selectedRowIds={new Set([rows[0]?.id ?? ""])}
        onToggleRowSelection={noop}
        onToggleRowsSelection={noop}
        virtualization={{ enabled: false }}
      />
    );

    expect(screen.queryByRole("checkbox", { name: "Select all estimate row items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: `Select ${rowLabel}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Move row ${rowLabel}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Delete row ${rowLabel}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Replace component ${rowLabel}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Move component ${rowLabel}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Delete component ${rowLabel}` })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Drag component ${rowLabel}` })).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: `Open row details for ${rowLabel}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Open row activity for ${rowLabel}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Open component details for ${rowLabel}` })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: `${rowLabel} quantity` })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: `${rowLabel} contingency percentage` })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: `${rowLabel} adjustment percentage` })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: `${rowLabel} misc cost` })).toBeDisabled();
  });

  it("pluralizes quantity column units without changing material per-unit labels", () => {
    const row = {
      ...estimateLibraryItems[0],
      id: "box-row-1",
      material: "Carton box",
      quantity: 12,
      unit: "box",
    };

    render(
      <EstimateRowItemsTable
        items={[row]}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="box-node"
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
        virtualization={{ enabled: false }}
      />,
    );

    const quantityCell = screen.getByRole("textbox", { name: "Carton box quantity" }).closest("td");
    expect(quantityCell).toBeInstanceOf(HTMLElement);
    expect(within(quantityCell as HTMLElement).getByText("boxes")).toHaveClass("!text-[10px]");
    expect(within(quantityCell as HTMLElement).queryByText("/ box")).not.toBeInTheDocument();
    expect(screen.getByText("/ box")).toBeInTheDocument();
  });

  it("renders left-edge resize handles in each node table header when column resizing is enabled", () => {
    const surfaceRef = createRef<HTMLElement | null>();
    surfaceRef.current = document.createElement("div");
    const onCommitWidths = vi.fn();
    const onResetWidths = vi.fn();

    render(
      <EstimateRowItemsTable
        items={makeRows(2, "resize")}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="resize-node"
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
        columnResize={{ surfaceRef, widths: {}, onCommitWidths, onResetWidths }}
        virtualization={{ enabled: false }}
      />
    );

    const handles = screen.getAllByRole("separator", { name: /Resize .* column/ });
    expect(handles).toHaveLength(RESIZABLE_ESTIMATE_COLUMN_IDS.length);
    fireEvent.keyDown(handles[0], { key: "ArrowRight" });
    expect(onCommitWidths).toHaveBeenCalledWith({ material: 164 });

    const quantityHandle = screen.getByRole("separator", { name: "Resize Qty column" });
    fireEvent.pointerDown(quantityHandle, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 84 });
    fireEvent.pointerUp(window);
    expect(onCommitWidths).toHaveBeenLastCalledWith({ material: 164, quantity: 86 });
    expect(screen.queryByRole("button", { name: "Reset column widths" })).not.toBeInTheDocument();
    expect(onResetWidths).not.toHaveBeenCalled();
  });

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

  it("disables row virtualization while an express editor is active", async () => {
    const rows = makeRows(80);
    rows[10] = {
      ...rows[10],
      metadata: withExpressComponentMetadata({}, { id: "express-row-11" }),
      sourceLibraryItemId: null,
      source: "project",
    };

    const { container } = render(
      <EstimateRowItemsTable
        items={rows}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="express-virtual-node"
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

    expect(container.querySelector("[data-estimate-row-virtualizer]")).not.toBeNull();

    fireEvent.focus(screen.getByLabelText("Component name"));

    await waitFor(() => expect(container.querySelector("[data-estimate-row-virtualizer]")).toBeNull());
    expect(container.querySelector("[data-estimate-row-virtualizer-disabled-reason='express-editor-active']")).not.toBeNull();
    expect(container.querySelector("[data-active-express-editor-count='1']")).not.toBeNull();
    expect(container.querySelectorAll("tr[data-estimate-row-id]")).toHaveLength(80);
  });

  it("keeps the active express editor visible under a 500-row fallback window", async () => {
    const rows = makeRows(500, "stress");
    rows[2] = {
      ...rows[2],
      metadata: withExpressComponentMetadata({}, { id: "express-stress-row-3" }),
      sourceLibraryItemId: null,
      source: "project",
    };

    const { container } = render(
      <EstimateRowItemsTable
        items={rows}
        editableRows={{}}
        setEditableRows={noop}
        targetNodeId="express-stress-node"
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
    );

    const virtualizer = container.querySelector("[data-estimate-row-virtualizer]") as HTMLElement;
    expect(virtualizer).not.toBeNull();
    expect(virtualizer).toHaveAttribute("data-estimate-row-virtual-total-count", "500");

    fireEvent.focus(screen.getByLabelText("Component name"));

    await waitFor(() => expect(container.querySelector("[data-estimate-row-virtualizer]")).toBeNull());
    expect(container.querySelector("[data-estimate-row-virtualizer-disabled-reason='express-editor-active']")).not.toBeNull();
    expect(container.querySelector("[data-active-express-editor-count='1']")).not.toBeNull();
    expect(container.querySelector("[data-estimate-row-id='stress-row-3']")).not.toBeNull();
    expect(container.querySelectorAll("tr[data-estimate-row-id]")).toHaveLength(500);
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
