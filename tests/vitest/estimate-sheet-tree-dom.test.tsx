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
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node row ${id}`);
  return element;
}

function rootDropZone(edge: "top" | "bottom") {
  const element = document.querySelector(`[data-tree-root-drop-edge='${edge}']`);
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

describe("estimate sheet tree DOM integration", () => {
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

  it("renders visible nested items as draggable treeitems with the shared tree row styling", () => {
    renderTree();

    const tree = screen.getByRole("tree", { name: "Modern Bungalow estimate areas" });

    expect(
      Array.from(tree.querySelectorAll("[data-tree-row]")).map((item) => item.getAttribute("data-tree-row")),
    ).toEqual(["project-scope", "ground-floor", "kitchen", "alternates", "phase-two", "phase-three"]);

    const projectScope = treeNodeButton("project-scope");
    const groundFloor = treeNodeButton("ground-floor");
    const kitchen = treeNodeButton("kitchen");
    const alternates = treeNodeButton("alternates");

    expect(projectScope).toHaveAttribute("role", "treeitem");
    expect(projectScope).toHaveAttribute("aria-level", "1");
    expect(projectScope).toHaveAttribute("aria-expanded", "true");
    expect(groundFloor).toHaveAttribute("aria-level", "2");
    expect(kitchen).toHaveAttribute("aria-level", "3");
    expect(kitchen).not.toHaveAttribute("aria-expanded");
    expect(kitchen).toHaveAttribute("draggable", "true");
    expect(alternates).toHaveAttribute("draggable", "true");
    expect(kitchen).toHaveAttribute("aria-current", "page");

    // The shared component's default row: compact min-h-7, 10px type, and a depth
    // indent spacer of 16px per level applied to the content, never the rail.
    expect(kitchen).toHaveClass("min-h-7", "text-[10px]");
    expect(projectScope.querySelector("[data-tree-indent]")).toBeNull();
    expect((groundFloor.querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("16px");
    expect((kitchen.querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("32px");
    expect((alternates.querySelector("[data-tree-indent]") as HTMLElement).style.width).toBe("16px");

    // Selection checkbox and drag grip stay hidden until the row itself is
    // hovered; the reveal is scoped to the row, not ancestor `group` panels.
    expect(kitchen).toHaveClass("group/tree-row");
    const kitchenCheckbox = within(kitchen).getByRole("checkbox", { name: "Select Kitchen" });
    expect(kitchenCheckbox).toHaveClass("opacity-0", "group-hover/tree-row:opacity-100");
    const kitchenDragGrip = kitchen.querySelector(".cursor-grab");
    expect(kitchenDragGrip).toHaveClass("opacity-0", "group-hover/tree-row:opacity-100");

    // Drag grip and checkbox live in the left rail, before the indent
    // spacer, so they never drift with depth.
    const kitchenIndent = kitchen.querySelector("[data-tree-indent]") as HTMLElement;
    expect(
      (kitchenDragGrip as HTMLElement).compareDocumentPosition(kitchenIndent) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      kitchenCheckbox.compareDocumentPosition(kitchenIndent) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the estimate tree under the shared Sheets tab strip", () => {
    renderTree();

    expect(screen.getByRole("tablist", { name: "Estimate tree views" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sheets" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves focus between rows with arrow keys and activates with Enter", () => {
    renderTree();

    const tree = screen.getByRole("tree", { name: "Modern Bungalow estimate areas" });
    expect(treeNodeButton("kitchen")).toHaveAttribute("tabindex", "0");
    expect(treeNodeButton("alternates")).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(tree, { key: "ArrowDown" });
    expect(treeNodeButton("alternates")).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(treeNodeButton("alternates"));

    fireEvent.keyDown(tree, { key: "Enter" });
    // Selection is client state with a shallow URL sync; a router navigation
    // here would remount the whole estimate workspace.
    expect(window.location.pathname).toBe("/workshop/projects/project-1/estimates/alternates");
    expect(routerMock.push).not.toHaveBeenCalled();
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

    expect(treeNodeButton("alternates")).toHaveClass("bg-surfaceMuted");
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

    fireEvent.dragStart(alternates, { dataTransfer });
    fireEvent.dragOver(rootTopDropZone, { dataTransfer });

    expect(rootDropZone("top")).toHaveAttribute("data-tree-root-drop-active", "true");

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

    fireEvent.dragStart(alternates, { dataTransfer });
    fireEvent.dragOver(rootBottomDropZone, { dataTransfer });

    expect(rootDropZone("bottom")).toHaveAttribute("data-tree-root-drop-active", "true");

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
