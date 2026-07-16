import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetVirtualBranchList } from "@/components/workshop/estimate-sheet/rows/virtual-branch-list";
import { createEditableRowStore, EditableRowStoreContext } from "@/components/workshop/estimate-sheet/rows/editable-row-store";
import { EstimateSheetExpansionContext } from "@/components/workshop/estimate-sheet/rows/expansion";
import type { EditableRowValue } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import { setEstimateSheetBranchRenderProbe } from "@/components/workshop/estimate-sheet-render-probe";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

const noop = vi.fn();

function makeBranchTree(count: number): EstimateTreeNode {
  return {
    id: "root",
    name: "Root Area",
    kind: "group",
    total: "₱0.00",
    estimateRowItems: [],
    children: Array.from({ length: count }, (_, index) => ({
      id: `child-${index + 1}`,
      name: `Child Area ${index + 1}`,
      kind: "area" as const,
      total: "₱0.00",
      estimateRowItems: [],
      children: [],
    })),
  };
}

describe("estimate branch virtualization", () => {
  afterEach(() => {
    setEstimateSheetBranchRenderProbe(null);
  });

  it("renders a bounded virtual branch stream when EMC virtualization is enabled", () => {
    function Harness() {
      const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
      const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>({});
      const [branchTree] = useState(() => makeBranchTree(499));
      const [editableRowStore] = useState(() => createEditableRowStore({}, [branchTree]));
      return (
        <EditableRowStoreContext.Provider value={editableRowStore}>
          <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
            <EstimateSheetVirtualBranchList
              node={branchTree}
              nodeCode="01"
              ancestorPath={[]}
              editableRows={editableRows}
              setEditableRows={setEditableRows}
              onInsertLibraryItem={noop}
              onInsertTemplates={noop}
              onInsertTemplateNode={noop}
              onAddBlankRow={noop}
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
              virtualization={{ enabled: true, minSections: 1, estimateSectionHeight: 96, overscan: 2 }}
            />
          </EstimateSheetExpansionContext.Provider>
        </EditableRowStoreContext.Provider>
      );
    }

    const startedAt = performance.now();
    const { container } = render(<Harness />);
    const elapsedMs = performance.now() - startedAt;
    const virtualizer = container.querySelector("[data-estimate-branch-virtualizer]") as HTMLElement;
    expect(virtualizer).not.toBeNull();
    expect(virtualizer).toHaveAttribute("data-estimate-branch-virtual-total-count", "500");
    const mountedCount = Number(virtualizer.getAttribute("data-estimate-branch-virtual-mounted-count"));
    expect(mountedCount).toBeGreaterThan(0);
    expect(mountedCount).toBeLessThan(500);
    expect(container.querySelectorAll("[data-estimate-branch-virtual-row]").length).toBe(mountedCount);
    expect(screen.getByRole("heading", { name: "Root Area", level: 1 })).toBeInTheDocument();
    expect(elapsedMs).toBeLessThan(500);
    console.log("estimate-branch-virtualization-perf-s07", JSON.stringify({ elapsedMs, totalCount: 500, mountedCount }));
  });

  it("expands 100 children within budget without rendering the full tree", () => {
    const renderCounts = new Map<string, number>();
    setEstimateSheetBranchRenderProbe((nodeId) => {
      renderCounts.set(nodeId, (renderCounts.get(nodeId) ?? 0) + 1);
    });

    function Harness() {
      const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set(["root"]));
      const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>({});
      const [branchTree] = useState(() => makeBranchTree(100));
      const [editableRowStore] = useState(() => createEditableRowStore({}, [branchTree]));
      return (
        <EditableRowStoreContext.Provider value={editableRowStore}>
          <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
            <EstimateSheetVirtualBranchList
              node={branchTree}
              nodeCode="01"
              ancestorPath={[]}
              editableRows={editableRows}
              setEditableRows={setEditableRows}
              onInsertLibraryItem={noop}
              onInsertTemplates={noop}
              onInsertTemplateNode={noop}
              onAddBlankRow={noop}
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
              virtualization={{ enabled: true, minSections: 1, estimateSectionHeight: 96, overscan: 2 }}
            />
          </EstimateSheetExpansionContext.Provider>
        </EditableRowStoreContext.Provider>
      );
    }

    const { container } = render(<Harness />);
    renderCounts.clear();
    const startedAt = performance.now();
    fireEvent.click(screen.getByRole("button", { name: "Expand Root Area" }));
    const virtualizer = container.querySelector("[data-estimate-branch-virtualizer]") as HTMLElement;
    const elapsedMs = performance.now() - startedAt;
    const mountedCount = Number(virtualizer.getAttribute("data-estimate-branch-virtual-mounted-count"));
    const branchRenderCount = [...renderCounts.values()].reduce((total, count) => total + count, 0);

    expect(virtualizer).toHaveAttribute("data-estimate-branch-virtual-total-count", "101");
    expect(mountedCount).toBeGreaterThan(0);
    expect(mountedCount).toBeLessThan(101);
    expect(branchRenderCount).toBeLessThan(101);
    expect(elapsedMs).toBeLessThan(300);
    console.log("estimate-branch-virtualization-perf-s06", JSON.stringify({ elapsedMs, totalCount: 101, mountedCount, branchRenderCount }));
  });

  it("marks only the pending insertion target in a virtualized branch stream", () => {
    function Harness() {
      const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
      const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>({});
      const [branchTree] = useState(() => makeBranchTree(3));
      const [editableRowStore] = useState(() => createEditableRowStore({}, [branchTree]));
      return (
        <EditableRowStoreContext.Provider value={editableRowStore}>
          <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
            <EstimateSheetVirtualBranchList
              node={branchTree}
              nodeCode="01"
              ancestorPath={[]}
              editableRows={editableRows}
              setEditableRows={setEditableRows}
              onInsertLibraryItem={noop}
              onInsertTemplates={noop}
              onInsertTemplateNode={noop}
              onAddBlankRow={noop}
              onReplaceRowItem={noop}
              onDeleteRowItem={noop}
              onUpdateRowItem={noop}
              onMarkRowDirty={noop}
              onOpenRowDetails={noop}
              onClearRowComponent={noop}
              onRequestProjectSpecific={noop}
              onMoveRowComponent={noop}
              sourceInsertPendingNodeIds={new Set(["child-1"])}
              selectedRowIds={new Set()}
              onToggleRowSelection={noop}
              onToggleRowsSelection={noop}
              virtualization={{ enabled: true, minSections: 1, estimateSectionHeight: 96, overscan: 2 }}
            />
          </EstimateSheetExpansionContext.Provider>
        </EditableRowStoreContext.Provider>
      );
    }

    render(<Harness />);

    expect(screen.getByLabelText("Child Area 1")).toHaveAttribute("aria-busy", "true");
    expect(within(screen.getByLabelText("Child Area 1")).getByRole("status")).toHaveTextContent("Adding…");
    expect(screen.getByLabelText("Root Area")).not.toHaveAttribute("aria-busy");
    expect(screen.getByLabelText("Child Area 2")).not.toHaveAttribute("aria-busy");
  });
});
