import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { sampleEstimateTree } from "@/components/workshop/estimate-tree-data";

vi.mock("@/lib/estimates/actions", () => ({
  createEstimateNode: vi.fn(),
}));

describe("estimate sheet tree modal flow", () => {
  it("opens a viewport modal for adding a tree node from the left plus tool", () => {
    const { container } = render(
      <EstimateSheetTree
        projectId="project-1"
        estimateId="estimate-1"
        projectName="Modern Bungalow"
        selectedNodeId="kitchen"
        nodes={sampleEstimateTree}
      />,
    );

    const treeTitle = screen.getByRole("heading", { name: "Estimate tree" });
    expect(treeTitle).toHaveClass("text-[9px]", "font-bold", "uppercase", "tracking-[0.14em]", "text-tertiary");

    fireEvent.click(screen.getByRole("button", { name: "Add estimate tree" }));

    const dialog = screen.getByRole("dialog", { name: "Add estimate tree node" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest("[data-archestimator-modal-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(screen.getByLabelText("Node name")).toBeInTheDocument();
    expect(screen.getByLabelText("Node type")).toHaveValue("area");
    expect(screen.getByLabelText("Parent context")).toHaveValue("main-house-ground-floor");
  });
});
