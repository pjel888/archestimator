import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { sampleEstimateTree } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

describe("estimate sheet tree add-node toolbar flow", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
  });

  function renderTree(nodes = sampleEstimateTree, selectedNodeId: string | null = "kitchen") {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    return render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetTree
          projectId="project-1"
          estimateId="estimate-1"
          projectName="Modern Bungalow"
          selectedNodeId={selectedNodeId}
          nodes={nodes}
        />
      </QueryClientProvider>,
    );
  }

  function submittedCreateFormData() {
    const call = actionMocks.createEstimateNode.mock.calls.at(-1);
    if (!call) throw new Error("createEstimateNode was not called.");
    return call[2] as FormData;
  }

  it("cleans up the offset tree width variable when the estimate tree unmounts", () => {
    window.localStorage.setItem("estimate_sheet_tree_width", "272");
    document.documentElement.style.setProperty("--estimate-tree-panel-width", "300px");

    const { unmount } = renderTree();

    expect(document.documentElement.style.getPropertyValue("--estimate-tree-panel-width")).toBe("376px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--estimate-tree-panel-width")).toBe("300px");
  });

  it("renders direct Add Group and Add Node tools instead of the old tree add modal", () => {
    const { container } = renderTree();

    expect(screen.queryByRole("heading", { name: "Tree" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search Tree")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search Tree")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand all tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse all tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Group" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Node" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add tree" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));

    expect(screen.queryByRole("dialog", { name: "Add estimate tree node" })).not.toBeInTheDocument();
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });

  it("adds Group Nodes and Area Nodes inside the selected Group Node", () => {
    renderTree(sampleEstimateTree, "main-house");

    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    let formData = submittedCreateFormData();
    expect(actionMocks.createEstimateNode).toHaveBeenLastCalledWith("project-1", "estimate-1", expect.any(FormData));
    expect(formData.get("kind")).toBe("group");
    expect(formData.get("name")).toBe("New Group");
    expect(formData.get("parentId")).toBe("main-house");

    fireEvent.click(screen.getByRole("button", { name: "Add Node" }));
    formData = submittedCreateFormData();
    expect(formData.get("kind")).toBe("area");
    expect(formData.get("name")).toBe("New Area Node");
    expect(formData.get("parentId")).toBe("main-house");
  });

  it("adds root Group Nodes and blocks Area Nodes when no Group Node is selected", () => {
    renderTree([
      {
        id: "general-requirements",
        name: "General Requirements",
        kind: "group",
        total: "PHP 0.00",
        children: [
          {
            id: "mobilization",
            name: "Mobilization + Demobilization",
            kind: "area",
            total: "PHP 0.00",
            children: [],
          },
        ],
      },
    ], "mobilization");

    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const groupFormData = submittedCreateFormData();
    expect(groupFormData.get("kind")).toBe("group");
    expect(groupFormData.get("parentId")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add Node" }));

    expect(screen.getByText("you must select a group first before adding an area node")).toBeInTheDocument();
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });

  it("allows a root Group Node from an empty tree and blocks a root Area Node", () => {
    renderTree([], null);

    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const groupFormData = submittedCreateFormData();
    expect(groupFormData.get("kind")).toBe("group");
    expect(groupFormData.get("parentId")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add Node" }));

    expect(screen.getByText("you must select a group first before adding an area node")).toBeInTheDocument();
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });
});
