import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EstimateSheetBranch } from "@/components/workshop/estimate-sheet/rows/branch";
import { EstimateSheetExpansionContext } from "@/components/workshop/estimate-sheet/rows/expansion";
import type { EditableRowValue } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

const noop = vi.fn();

function renderBranch() {
  const node: EstimateTreeNode = {
    id: "mobilization-demobilization",
    name: "Mobilization + Demobilization",
    kind: "area",
    total: "₱0.00",
    estimateRowItems: [],
    children: [],
  };

  function Harness() {
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
    const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>({});

    return (
      <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
        <EstimateSheetBranch
          node={node}
          nodeCode="01.01.01"
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
        />
      </EstimateSheetExpansionContext.Provider>
    );
  }

  return render(<Harness />);
}

function renderBranchTree(node: EstimateTreeNode) {
  function Harness() {
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
    const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>({});

    return (
      <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
        <EstimateSheetBranch
          node={node}
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
        />
      </EstimateSheetExpansionContext.Provider>
    );
  }

  return render(<Harness />);
}

describe("estimate sheet branch header chrome", () => {
  it("rests on a white surface with top and side borders", () => {
    renderBranch();

    const branch = screen.getByLabelText("Mobilization + Demobilization");
    const header = branch.querySelector(".min-h-10");

    expect(header).toHaveClass("bg-surfaceMuted/40", "py-2", "border-x", "border-t", "border-hairline");
    expect(header).not.toHaveClass("hover:bg-surfaceMuted/40");
    expect(header).not.toHaveClass("border-b");
  });

  it("applies the depth name ramp and heading semantics", () => {
    renderBranchTree({
      id: "root",
      name: "Root Area",
      kind: "group",
      total: "₱0.00",
      estimateRowItems: [],
      children: [
        { id: "child", name: "Child Area", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
      ],
    });

    expect(screen.getByRole("heading", { name: "Root Area", level: 1 })).toHaveClass("text-ink", "font-medium", "uppercase", "tracking-normal");
    expect(screen.getByRole("heading", { name: "Child Area", level: 2 })).toHaveClass("text-secondary", "font-normal");
    expect(screen.queryByText("01")).not.toBeInTheDocument();
  });

  it("renders a single inset white spacer before non-first child branches", () => {
    const { container } = renderBranchTree({
      id: "root",
      name: "Root Area",
      kind: "group",
      total: "₱0.00",
      estimateRowItems: [],
      children: [
        { id: "first", name: "First Child", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
        { id: "second", name: "Second Child", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
      ],
    });

    const dividers = container.querySelectorAll("[data-estimate-sibling-divider]");
    expect(dividers).toHaveLength(1);
    expect(dividers[0]).toHaveClass("bg-white", "py-5");
    expect(dividers[0]).not.toHaveClass("border-t", "border-divider-sibling");
    expect((dividers[0] as HTMLElement).style.marginLeft).toBe("24px");
    expect(screen.getByRole("heading", { name: "First Child", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Second Child", level: 2 })).toBeInTheDocument();
  });
});
