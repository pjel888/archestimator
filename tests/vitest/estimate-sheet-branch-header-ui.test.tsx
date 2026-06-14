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

describe("estimate sheet branch header chrome", () => {
  it("rests on the same surface color as hover and carries a top divider", () => {
    renderBranch();

    const branch = screen.getByLabelText("Mobilization + Demobilization");
    const header = branch.querySelector(".h-10");

    expect(header).toHaveClass("bg-surfaceMuted/40", "hover:bg-surfaceMuted/40", "border-t", "border-hairline");
  });
});
