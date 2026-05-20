import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateAreaNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

function fixtureTree(): EstimateAreaNode[] {
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
            {
              id: "kitchen",
              name: "Kitchen",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
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

function treeNodeButton(id: string) {
  const element = document.querySelector(`[data-estimate-tree-node-id="${id}"]`);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Missing tree node button ${id}`);
  return element;
}

describe("estimate sheet tree React Complex Tree DOM integration", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.refresh.mockReset();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
  });

  it("renders visible nested items with RCT interactive drag props on the node buttons", () => {
    renderTree();

    const tree = screen.getByRole("tree", { name: "Modern Bungalow estimate areas" });
    expect(
      Array.from(tree.querySelectorAll("[data-estimate-tree-node-id]")).map((item) => item.getAttribute("data-estimate-tree-node-id")),
    ).toEqual(["project-scope", "ground-floor", "kitchen"]);

    const projectScope = treeNodeButton("project-scope");
    const groundFloor = treeNodeButton("ground-floor");
    const kitchen = treeNodeButton("kitchen");

    expect(projectScope).toHaveAttribute("data-rct-item-interactive", "true");
    expect(projectScope).toHaveAttribute("data-rct-item-id", "project-scope");
    expect(groundFloor).toHaveAttribute("data-rct-item-interactive", "true");
    expect(kitchen).toHaveAttribute("data-rct-item-interactive", "true");
    expect(kitchen).toHaveAttribute("draggable", "true");

    expect(projectScope.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "0px" });
    expect(groundFloor.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "20px" });
    expect(kitchen.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "40px" });
  });
});
