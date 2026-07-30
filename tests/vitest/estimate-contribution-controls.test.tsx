import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEditableRowStore, EditableRowStoreContext } from "@/components/workshop/estimate-sheet/rows/editable-row-store";
import { EstimateRowItemsTable } from "@/components/workshop/estimate-sheet/rows/row-table";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { estimateLibraryItems } from "./fixtures/estimate-library-items";

const actionMocks = vi.hoisted(() => ({
  selectAlternative: vi.fn(async () => ({ changed: true })),
  setOptionalInclusion: vi.fn(async () => ({ changed: true })),
}));

vi.mock("@/lib/estimates/value-engineering-actions", () => ({
  selectEstimateAlternativeAction: actionMocks.selectAlternative,
  setEstimateOptionalInclusionAction: actionMocks.setOptionalInclusion,
}));

const noop = vi.fn();

function renderRows(items: EstimateRowItem[], onContributionChanged = vi.fn()) {
  const editableRowStore = createEditableRowStore({}, []);
  render(
    <EditableRowStoreContext.Provider value={editableRowStore}>
      <EstimateRowItemsTable
        canEditEstimate
        items={items}
        projectId="project-1"
        estimateId="estimate-1"
        estimateTabId="tab-1"
        targetNodeId="node-1"
        onInsertLibraryItem={noop}
        onReplaceRowItem={noop}
        onDeleteRowItem={noop}
        onOpenRowDetails={noop}
        onClearRowComponent={noop}
        onPromoteRowToLibrary={noop}
        onMoveRowComponent={noop}
        onMoveRowItem={noop}
        onRetryExpressDraft={noop}
        onDeleteExpressDraft={noop}
        selectedRowIds={new Set()}
        onToggleRowSelection={noop}
        onToggleRowsSelection={noop}
        onContributionChanged={onContributionChanged}
        virtualization={{ enabled: false }}
      />
    </EditableRowStoreContext.Provider>,
  );
  return onContributionChanged;
}

describe("estimate contribution controls", () => {
  it("selects a visible alternative with revision guards and refetches", async () => {
    const base = estimateLibraryItems[0]!;
    const rows: EstimateRowItem[] = [{
      ...base,
      id: "row-v2",
      material: "WPC V-2",
      contributionScopeId: "scope-1",
      contributionRevision: 5,
      alternativeGroup: {
        id: "group-1",
        name: "WPC options",
        selectedRowItemId: "row-v1",
        memberRowItemIds: ["row-v1", "row-v2"],
        revision: 3,
      },
    }];
    const onContributionChanged = renderRows(rows);

    fireEvent.click(screen.getByRole("button", { name: "Select WPC V-2 for WPC options" }));

    await waitFor(() => expect(actionMocks.selectAlternative).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      estimateTabId: "tab-1",
      contributionScopeId: "scope-1",
      groupId: "group-1",
      selectedRowItemId: "row-v2",
      expectedGroupRevision: 3,
      expectedContributionRevision: 5,
    })));
    expect(onContributionChanged).toHaveBeenCalledOnce();
  });

  it("toggles an optional row and labels accessory relationships", async () => {
    const base = estimateLibraryItems[0]!;
    const rows: EstimateRowItem[] = [
      {
        ...base,
        id: "row-optional",
        material: "Termination clips",
        contributionScopeId: "scope-1",
        contributionRevision: 8,
        optionalContribution: { isIncluded: false, revision: 2 },
      },
      {
        ...base,
        id: "row-parent",
        material: "WPC plank",
        accessoryChildren: [{
          edgeId: "edge-1",
          childRowItemId: "row-accessory",
          mode: "required",
          isIncluded: true,
          quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 1 },
          revision: 1,
        }],
      },
    ];
    renderRows(rows);

    fireEvent.click(screen.getByRole("button", { name: "Include optional material Termination clips" }));

    await waitFor(() => expect(actionMocks.setOptionalInclusion).toHaveBeenCalledWith(expect.objectContaining({
      rowItemId: "row-optional",
      isIncluded: true,
      expectedOptionalRevision: 2,
      expectedContributionRevision: 8,
    })));
    expect(screen.getByLabelText("1 linked accessories")).toBeInTheDocument();
  });
});
