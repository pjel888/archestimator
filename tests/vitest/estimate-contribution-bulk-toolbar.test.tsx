import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateContributionBulkToolbar } from "@/components/workshop/estimate-sheet/EstimateContributionBulkToolbar";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { estimateLibraryItems } from "./fixtures/estimate-library-items";

const mocks = vi.hoisted(() => ({
  applyConfigurationBulk: vi.fn(),
  applyAssemblyBulk: vi.fn(),
}));

vi.mock("@/lib/estimates/contribution-configuration-actions", () => ({
  applyEstimateContributionConfigurationBulkAction: mocks.applyConfigurationBulk,
}));

vi.mock("@/lib/estimates/material-assembly-actions", () => ({
  applyMaterialAssemblyBulkAction: mocks.applyAssemblyBulk,
}));

function rows(): EstimateRowItem[] {
  return [
    { ...estimateLibraryItems[0]!, id: "row-main", material: "WPC plank" },
    { ...estimateLibraryItems[1]!, id: "row-clips", material: "Aluminum clips" },
  ];
}

function renderToolbar(selectedItems = rows()) {
  const onClear = vi.fn();
  const onContributionChanged = vi.fn();
  render(
    <EstimateContributionBulkToolbar
      selectedItems={selectedItems}
      projectId="project-1"
      estimateId="estimate-1"
      estimateTabId="tab-1"
      onClear={onClear}
      onDeleteSelected={vi.fn()}
      onContributionChanged={onContributionChanged}
    />,
  );
  return { onClear, onContributionChanged };
}

beforeEach(() => {
  mocks.applyConfigurationBulk.mockReset().mockResolvedValue({
    changed: true,
    changedGroupIds: ["group-1"],
    changedRowItemIds: ["row-main", "row-clips"],
    contributionRevision: 2,
    contributionScopeId: "scope-1",
  });
  mocks.applyAssemblyBulk.mockReset().mockResolvedValue({
    changed: true,
    changedEdgeIds: ["edge-1"],
    changedGroupIds: [],
    changedRowItemIds: ["row-main", "row-clips"],
    contributionRevision: 2,
    contributionScopeId: "scope-1",
  });
});

describe("EstimateContributionBulkToolbar", () => {
  it("creates an explicit alternatives group and selects the chosen material", async () => {
    const { onClear, onContributionChanged } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Make selected rows material options" }));
    fireEvent.change(screen.getByLabelText("Option group name"), { target: { value: "WPC versions" } });
    fireEvent.click(screen.getByLabelText("Aluminum clips"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.applyConfigurationBulk).toHaveBeenCalledWith(expect.objectContaining({
      expectedContributionRevision: null,
      operation: expect.objectContaining({
        kind: "configure_alternatives",
        name: "WPC versions",
        rowItemIds: ["row-main", "row-clips"],
        selectedRowItemId: "row-clips",
        expectedGroupRevision: null,
      }),
    })));
    expect(mocks.applyConfigurationBulk).toHaveBeenCalledOnce();
    expect(onContributionChanged).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("links accessories to the selected main material with a quantity rule", async () => {
    renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Attach selected accessory rows to a main material" }));
    fireEvent.change(screen.getByLabelText("Per-main quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.applyAssemblyBulk).toHaveBeenCalledWith(expect.objectContaining({
      expectedContributionRevision: null,
      operation: {
        kind: "configure_accessories",
        edges: [expect.objectContaining({
          parentRowItemId: "row-main",
          childRowItemId: "row-clips",
          mode: "required",
          quantityRule: { schemaVersion: 1, kind: "per-parent", factor: 2 },
          expectedEdgeRevision: null,
        })],
      },
    })));
    expect(mocks.applyAssemblyBulk).toHaveBeenCalledOnce();
  });

  it("removes a selected parent-child edge exactly once", async () => {
    const [parent, child] = rows();
    const edge = {
      edgeId: "edge-1",
      mode: "required" as const,
      isIncluded: true,
      quantityRule: { schemaVersion: 1, kind: "per-parent", factor: 1 },
      revision: 3,
    };
    renderToolbar([
      { ...parent!, accessoryChildren: [{ ...edge, childRowItemId: child!.id }] },
      { ...child!, accessoryParent: { ...edge, parentRowItemId: parent!.id } },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Remove contribution roles from selected rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove roles" }));

    await waitFor(() => expect(mocks.applyAssemblyBulk).toHaveBeenCalledOnce());
    expect(mocks.applyAssemblyBulk).toHaveBeenCalledWith(expect.objectContaining({
      operation: expect.objectContaining({
        kind: "remove_roles",
        edges: [{ edgeId: "edge-1", expectedEdgeRevision: 3 }],
      }),
    }));
  });
});
