import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EstimateSheetBranch } from "@/components/workshop/estimate-sheet/rows/branch";
import { EstimateSheetExpansionContext } from "@/components/workshop/estimate-sheet/rows/expansion";
import { EstimateSurfaceVariantProvider, type EstimateSurfaceVariant } from "@/components/workshop/estimate-surface-variant";
import type { EditableRowValue } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

const noop = vi.fn();

function renderBranch(ancestorPath: { id: string; name: string }[] = [], surfaceVariant: EstimateSurfaceVariant = "paper") {
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
      <EstimateSurfaceVariantProvider variant={surfaceVariant}>
        <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
          <EstimateSheetBranch
            node={node}
            nodeCode="01.01.01"
            ancestorPath={ancestorPath}
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
            onPromoteRowToLibrary={noop}
            onMoveRowComponent={noop}
            selectedRowIds={new Set()}
            onToggleRowSelection={noop}
            onToggleRowsSelection={noop}
          />
        </EstimateSheetExpansionContext.Provider>
      </EstimateSurfaceVariantProvider>
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
          onPromoteRowToLibrary={noop}
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
  it("keeps the bottom border when expanded without breadcrumbs or own rows", () => {
    renderBranch();

    const branch = screen.getByLabelText("Mobilization + Demobilization");
    const header = branch.querySelector(".min-h-10");

    expect(header).toHaveClass("bg-surfaceMuted/40", "py-2", "border-x", "border-t", "border-hairline");
    expect(header).toHaveClass("border-b");
    expect(header).not.toHaveClass("hover:bg-surfaceMuted/40");
  });

  it("keeps the bottom border when a node without own rows is collapsed", () => {
    renderBranch();

    const branch = screen.getByLabelText("Mobilization + Demobilization");
    const header = branch.querySelector(".min-h-10");

    fireEvent.click(screen.getByRole("button", { name: "Collapse Mobilization + Demobilization" }));

    expect(header).toHaveClass("border-b");
  });

  it("lets the row table provide the bottom frame when expanded with own rows", () => {
    const { container } = renderBranchTree({
      id: "root",
      name: "Root Area",
      kind: "group",
      total: "₱0.00",
      estimateRowItems: [{ ...estimateLibraryItems[0], id: "root-row-1" }],
      children: [],
    });

    const branch = screen.getByLabelText("Root Area");
    const header = branch.querySelector(".min-h-10");
    const rowTable = container.querySelector("[data-estimate-row-table-root='root']");

    expect(header).toHaveClass("border-x", "border-t", "border-hairline");
    expect(header).not.toHaveClass("border-b");
    expect(rowTable).toHaveClass("border-x", "border-b", "border-hairline");
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
    const childBranch = screen.getByLabelText("Child Area");
    const childHeader = childBranch.querySelector(".min-h-10");
    expect(childHeader).toHaveClass("border-t");
    expect(screen.queryByText("01")).not.toBeInTheDocument();
  });

  it("removes the generated gap between breadcrumbs and the row table", () => {
    renderBranch([
      { id: "general-requirements", name: "General Requirements" },
      { id: "construction-supervision", name: "Construction Supervision" },
    ]);

    const branch = screen.getByLabelText("Mobilization + Demobilization");
    const header = branch.querySelector(".min-h-10");
    const breadcrumbs = screen.getByLabelText("Mobilization + Demobilization breadcrumbs");

    expect(header).not.toHaveClass("border-b");
    expect(breadcrumbs.nextElementSibling).toHaveClass("-mt-2");
  });

  it("uses the branch title surface color for breadcrumbs in the glass estimate sheet", () => {
    renderBranch(
      [
        { id: "general-requirements", name: "General Requirements" },
        { id: "construction-supervision", name: "Construction Supervision" },
      ],
      "glass",
    );

    const branch = screen.getByLabelText("Mobilization + Demobilization");
    const headerSurface = branch.querySelector(".min-h-10")?.parentElement;
    const breadcrumbs = screen.getByLabelText("Mobilization + Demobilization breadcrumbs");

    expect(headerSurface).toHaveClass("estimate-glass-headchrome");
    expect(breadcrumbs).toHaveClass("estimate-glass-headchrome", "bg-surfaceMuted/40");
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
