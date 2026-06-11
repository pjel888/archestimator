import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  deleteEstimateNodesBulk: vi.fn(),
  fetchEstimateTree: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  usePathname: () => "/workshop/projects/project-1/estimates/kitchen",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

function fixtureTree(): EstimateTreeNode[] {
  return [
    {
      id: "project-scope",
      name: "Project Scope",
      kind: "group",
      total: "₱0.00",
      children: [
        {
          id: "ground-floor",
          name: "Ground Floor",
          kind: "group",
          total: "₱0.00",
          children: [
            { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
            { id: "living", name: "Living Area", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
          ],
        },
      ],
    },
  ];
}

function renderTree(nodes = fixtureTree(), selectedNodeId: string | null = "kitchen") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetTree projectId="project-1" estimateId="estimate-1" projectName="Modern Bungalow" selectedNodeId={selectedNodeId} nodes={nodes} />
    </QueryClientProvider>,
  );
}

function treeNode(id: string) {
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node ${id}`);
  return element;
}

describe("estimate tree bulk selection", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.deleteEstimateNodesBulk.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue(fixtureTree());
  });

  it("checkbox click selects a node without navigating or changing route selection", async () => {
    renderTree();

    const livingCheckbox = screen.getByRole("checkbox", { name: "Select Living Area" });
    fireEvent.click(livingCheckbox);

    expect(livingCheckbox).toBeChecked();
    expect(treeNode("kitchen")).toHaveAttribute("aria-current", "page");
    expect(treeNode("living")).not.toHaveAttribute("aria-current");
    expect(routerMock.push).not.toHaveBeenCalled();
    const dock = screen.getByRole("region", { name: "Bulk action toolbar" });
    expect(dock).toHaveTextContent(/1\s*node selected/);
    expect(within(dock).getByRole("button", { name: "Delete selected" })).toBeInTheDocument();
    expect(within(dock).getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });

  it("checking a parent selects descendants and renders the parent indeterminate after one child is cleared", async () => {
    renderTree();

    const groundFloorCheckbox = screen.getByRole("checkbox", { name: "Select Ground Floor" });
    fireEvent.click(groundFloorCheckbox);

    expect(screen.getByRole("checkbox", { name: "Select Kitchen" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Living Area" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Kitchen" }));

    await waitFor(() => expect(groundFloorCheckbox).toHaveAttribute("aria-checked", "mixed"));
  });

  it("bulk deletes selected nodes with optimistic removal and server confirmation", async () => {
    const confirmedTree: EstimateTreeNode[] = [
      {
        id: "project-scope",
        name: "Project Scope",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "ground-floor",
            name: "Ground Floor",
            kind: "group",
            total: "₱0.00",
            children: [
              { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
            ],
          },
        ],
      },
    ];
    actionMocks.deleteEstimateNodesBulk.mockResolvedValue({
      tree: confirmedTree,
      deletedNodeIds: ["living"],
      fallbackNodeId: "kitchen",
    });
    renderTree();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Living Area" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    const dialog = screen.getByRole("dialog", { name: "Delete 1 selected node" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(actionMocks.deleteEstimateNodesBulk).toHaveBeenCalledWith("project-1", "estimate-1", ["living"]));
    await waitFor(() => expect(document.querySelector('[data-tree-row="living"]')).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Bulk action toolbar" })).not.toBeInTheDocument();
  });

  it("bulk delete deduplicates parent and child selections before calling the server", async () => {
    actionMocks.deleteEstimateNodesBulk.mockResolvedValue({
      tree: [
        {
          id: "project-scope",
          name: "Project Scope",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
      deletedNodeIds: ["ground-floor", "kitchen", "living"],
      fallbackNodeId: "project-scope",
    });
    renderTree();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Living Area" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ground Floor" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    const dialog = screen.getByRole("dialog", { name: "Delete 3 selected nodes" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(actionMocks.deleteEstimateNodesBulk).toHaveBeenCalledWith("project-1", "estimate-1", ["ground-floor"]));
  });
});
