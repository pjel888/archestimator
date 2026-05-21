import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        {
          id: "alternates",
          name: "Alternates",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
    },
    {
      id: "phase-two",
      name: "Phase Two",
      kind: "group",
      total: "₱0.00",
      children: [],
    },
    {
      id: "phase-three",
      name: "Phase Three",
      kind: "group",
      total: "₱0.00",
      children: [],
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

function rootDropZone(edge: "top" | "bottom") {
  const element = document.querySelector(`[data-estimate-tree-root-${edge}-drop='true']`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing root ${edge} drop zone.`);
  return element;
}

function setMiddleDropRect(element: HTMLElement) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: -14,
    top: -14,
    left: 0,
    right: 180,
    bottom: 14,
    width: 180,
    height: 28,
    toJSON: () => ({}),
  });
}

function mockDataTransfer() {
  const transferStore = new Map<string, string>();
  return {
    dropEffect: "move",
    effectAllowed: "all",
    getData: vi.fn((key: string) => transferStore.get(key) ?? ""),
    setData: vi.fn((key: string, value: string) => {
      transferStore.set(key, value);
    }),
    setDragImage: vi.fn(),
  };
}

describe("estimate sheet tree React Complex Tree DOM integration", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue(fixtureTree());
  });

  it("renders visible nested items with RCT interactive drag props on the node buttons", () => {
    renderTree();

    const tree = screen.getByRole("tree", { name: "Modern Bungalow estimate areas" });
    expect(
      Array.from(tree.querySelectorAll("[data-estimate-tree-node-id]")).map((item) => item.getAttribute("data-estimate-tree-node-id")),
    ).toEqual(["project-scope", "ground-floor", "kitchen", "alternates", "phase-two", "phase-three"]);

    const projectScope = treeNodeButton("project-scope");
    const groundFloor = treeNodeButton("ground-floor");
    const kitchen = treeNodeButton("kitchen");
    const alternates = treeNodeButton("alternates");
    const phaseTwo = treeNodeButton("phase-two");
    const phaseThree = treeNodeButton("phase-three");

    expect(projectScope).toHaveAttribute("data-rct-item-interactive", "true");
    expect(projectScope).toHaveAttribute("data-rct-item-id", "project-scope");
    expect(groundFloor).toHaveAttribute("data-rct-item-interactive", "true");
    expect(kitchen).toHaveAttribute("data-rct-item-interactive", "true");
    expect(kitchen).toHaveAttribute("draggable", "true");
    expect(alternates).toHaveAttribute("data-rct-item-interactive", "true");
    expect(alternates).toHaveAttribute("draggable", "true");
    expect(phaseTwo).toHaveAttribute("data-rct-item-interactive", "true");
    expect(phaseThree).toHaveAttribute("data-rct-item-interactive", "true");

    expect(projectScope.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "0px" });
    expect(groundFloor.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "20px" });
    expect(kitchen.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "40px" });
    expect(alternates.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "20px" });
    expect(phaseTwo.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "0px" });
    expect(phaseThree.querySelector("[data-estimate-tree-title-offset]")).toHaveStyle({ paddingLeft: "0px" });
  });

  it("shows a nesting affordance when dragging a node over the middle of a valid Group Node", () => {
    renderTree();

    const kitchen = treeNodeButton("kitchen");
    const alternates = treeNodeButton("alternates");
    const dataTransfer = mockDataTransfer();
    setMiddleDropRect(alternates);

    fireEvent.dragStart(kitchen, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("application/x-archestimator-estimate-tree-item", "kitchen");
    fireEvent.dragOver(alternates, { clientY: 14, dataTransfer });

    expect(screen.getByText("Nest inside Alternates")).toBeInTheDocument();
  });

  it("shows a large top root drop target for moving a Group Node before the first root item", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({
      tree: [
        {
          id: "alternates",
          name: "Alternates",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
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
        {
          id: "phase-two",
          name: "Phase Two",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
        {
          id: "phase-three",
          name: "Phase Three",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
    });
    renderTree();

    const alternates = treeNodeButton("alternates");
    const rootTopDropZone = rootDropZone("top");
    const dataTransfer = mockDataTransfer();

    expect(rootTopDropZone).toHaveClass("h-8");

    fireEvent.dragStart(alternates, { dataTransfer });
    fireEvent.dragOver(rootTopDropZone, { dataTransfer });

    expect(rootTopDropZone).toHaveAttribute("data-estimate-tree-root-top-drop-active", "true");

    fireEvent.drop(rootDropZone("top"), { dataTransfer });

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "ground-floor", parentId: "project-scope", sortOrder: 10 },
        { id: "alternates", parentId: null, sortOrder: 10 },
        { id: "project-scope", parentId: null, sortOrder: 20 },
        { id: "phase-two", parentId: null, sortOrder: 30 },
        { id: "phase-three", parentId: null, sortOrder: 40 },
      ],
    }));
  });

  it("shows a bottom root drop line for moving a Group Node to the outermost level", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({
      tree: [
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
        {
          id: "phase-two",
          name: "Phase Two",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
        {
          id: "phase-three",
          name: "Phase Three",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
        {
          id: "alternates",
          name: "Alternates",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
    });
    renderTree();

    const alternates = treeNodeButton("alternates");
    const rootBottomDropZone = rootDropZone("bottom");
    const dataTransfer = mockDataTransfer();

    expect(rootBottomDropZone).toHaveClass("h-8");

    fireEvent.dragStart(alternates, { dataTransfer });
    fireEvent.dragOver(rootBottomDropZone, { dataTransfer });

    expect(rootBottomDropZone).toHaveAttribute("data-estimate-tree-root-bottom-drop-active", "true");

    fireEvent.drop(rootDropZone("bottom"), { dataTransfer });

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "ground-floor", parentId: "project-scope", sortOrder: 10 },
        { id: "project-scope", parentId: null, sortOrder: 10 },
        { id: "phase-two", parentId: null, sortOrder: 20 },
        { id: "phase-three", parentId: null, sortOrder: 30 },
        { id: "alternates", parentId: null, sortOrder: 40 },
      ],
    }));
  });
});
