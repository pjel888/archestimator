import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EstimateSheetVirtualBranchList } from "@/components/workshop/estimate-sheet/rows/virtual-branch-list";
import { EstimateSheetExpansionContext } from "@/components/workshop/estimate-sheet/rows/expansion";
import type { EditableRowValue } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
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
  it("renders a bounded virtual branch stream when EMC virtualization is enabled", () => {
    function Harness() {
      const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
      const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>({});
      return (
        <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
          <EstimateSheetVirtualBranchList
            node={makeBranchTree(120)}
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
      );
    }

    const { container } = render(<Harness />);
    const virtualizer = container.querySelector("[data-estimate-branch-virtualizer]") as HTMLElement;
    expect(virtualizer).not.toBeNull();
    expect(virtualizer).toHaveAttribute("data-estimate-branch-virtual-total-count", "121");
    const mountedCount = Number(virtualizer.getAttribute("data-estimate-branch-virtual-mounted-count"));
    expect(mountedCount).toBeGreaterThan(0);
    expect(mountedCount).toBeLessThan(121);
    expect(container.querySelectorAll("[data-estimate-branch-virtual-row]").length).toBe(mountedCount);
    expect(screen.getByRole("heading", { name: "Root Area", level: 1 })).toBeInTheDocument();
  });
});
