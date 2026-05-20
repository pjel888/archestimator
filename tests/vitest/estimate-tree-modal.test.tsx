import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { sampleEstimateTree } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => ({
  createEstimateNode: vi.fn(),
}));

describe("estimate sheet tree modal flow", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
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

  it("cleans up the offset tree width variable when the estimate tree unmounts", () => {
    window.localStorage.setItem("estimate_sheet_tree_width", "272");
    document.documentElement.style.setProperty("--estimate-tree-panel-width", "300px");

    const { unmount } = renderTree();

    expect(document.documentElement.style.getPropertyValue("--estimate-tree-panel-width")).toBe("376px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--estimate-tree-panel-width")).toBe("300px");
  });

  it("opens a viewport modal for adding a tree node from the left plus tool", () => {
    const { container } = renderTree();

    expect(screen.queryByRole("heading", { name: "Tree" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search Tree")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search Tree")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand all tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse all tree" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add tree" }));

    const dialog = screen.getByRole("dialog", { name: "Add estimate tree node" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest("[data-archestimator-modal-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(screen.getByLabelText("Node name")).toBeInTheDocument();
    expect(screen.getByLabelText("Node type")).toHaveValue("area");
    expect(screen.getByLabelText("Parent context")).toHaveValue("main-house-ground-floor");
    expect(screen.getByRole("option", { name: "Group Node" })).toHaveValue("group");
    expect(screen.queryByRole("option", { name: "General Node" })).not.toBeInTheDocument();
  });

  it("filters add-node parent choices through the hierarchy matrix", () => {
    renderTree(sampleEstimateTree, "main-house");

    fireEvent.click(screen.getByRole("button", { name: "Add tree" }));

    const parentSelect = screen.getByLabelText("Parent context");
    expect(parentSelect).toHaveValue("main-house");
    expect(screen.queryByRole("option", { name: "Estimate root" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Node type"), { target: { value: "group" } });

    expect(screen.getByLabelText("Parent context")).toHaveValue("main-house");
    expect(screen.getByRole("option", { name: "Lot A — Primary Residence / Main House" })).toBeInTheDocument();
  });

  it("keeps the selected group parent when adding a nested group from an area route", () => {
    renderTree([
      {
        id: "general-requirements",
        name: "General Requirements",
        kind: "general",
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

    fireEvent.click(screen.getByRole("button", { name: "Add tree" }));
    expect(screen.getByLabelText("Node type")).toHaveValue("area");
    expect(screen.getByLabelText("Parent context")).toHaveValue("general-requirements");

    fireEvent.change(screen.getByLabelText("Node type"), { target: { value: "group" } });

    expect(screen.getByLabelText("Parent context")).toHaveValue("general-requirements");
    expect(screen.getByRole("option", { name: "General Requirements" })).toBeInTheDocument();
  });

  it("defaults an empty tree to a root-valid group node", () => {
    renderTree([], null);

    fireEvent.click(screen.getByRole("button", { name: "Add tree" }));

    expect(screen.getByLabelText("Node type")).toHaveValue("group");
    expect(screen.getByLabelText("Parent context")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Estimate root" })).toBeInTheDocument();
  });
});
