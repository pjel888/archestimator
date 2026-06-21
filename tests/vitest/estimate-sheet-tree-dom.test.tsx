import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  INSERT_ESTIMATE_TEMPLATE_EVENT,
} from "@/components/workshop/component-library/templates";
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

function setTopDropRect(element: HTMLElement) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 180,
    bottom: 28,
    width: 180,
    height: 28,
    toJSON: () => ({}),
  });
}

function fireDragOverAt(element: HTMLElement, dataTransfer: ReturnType<typeof mockDataTransfer>, clientY: number) {
  const event = createEvent.dragOver(element, { dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY });
  fireEvent(element, event);
}

function fireDropAt(element: HTMLElement, dataTransfer: ReturnType<typeof mockDataTransfer>, clientY: number) {
  const event = createEvent.drop(element, { dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY });
  fireEvent(element, event);
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

  it("renders the estimate tree under the shared Estimate Tree tab", () => {
    renderTree();

    expect(screen.getByRole("tablist", { name: "Estimate sheets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Estimate Tree" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("navigation", { name: "Modern Bungalow estimate areas" }).parentElement).toHaveClass("px-2", "pb-1", "pt-0");

    const headerRoot = screen.getByLabelText("Tree tools").closest(".sticky");
    expect(headerRoot).toBeInstanceOf(HTMLElement);
    expect(headerRoot).not.toHaveClass("border-b");
    expect(headerRoot?.firstElementChild).toHaveClass("border-b", "border-hairline");
  });

  it("scopes the drag/select rail reveal to the whole sidebar, not just the rows", () => {
    renderTree();

    // The panel header (search, Add Group, Add Node) must live inside the same
    // `group/tree` scope as the rows: hovering or focusing the toolbar keeps
    // the rail space open instead of shifting the tree back and forth.
    const header = screen.getByLabelText("Tree tools");
    const railScope = header.closest(".group\\/tree");
    expect(railScope).not.toBeNull();
    expect(railScope).toContainElement(screen.getByRole("tree", { name: "Modern Bungalow estimate areas" }));
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

  it("keeps row icons within the shared tree icon scale (no oversized svg)", () => {
    renderTree();

    // The per-node circle was removed; the occupancy cue is now the disclosure
    // caret / static caret marker, sized via classes like the other trees. No
    // row svg may read "bigger" than the 12px shared scale.
    for (const id of ["project-scope", "kitchen"]) {
      const oversized = Array.from(treeNodeButton(id).querySelectorAll("svg")).filter((svg) => {
        const width = Number.parseFloat(svg.getAttribute("width") ?? "0");
        return Number.isFinite(width) && width > 12;
      });
      expect(oversized).toHaveLength(0);
    }
  });

  it("shows a nesting affordance when dragging a node over the middle of a node with children", () => {
    // P4: leaf/folder is derived from CHILDREN, not kind. The "inside" band
    // shows over a node that has child sub-areas (ground-floor here). An empty
    // node (e.g. the empty group `alternates`) is now a leaf and no longer
    // offers the internal-drag "inside" band — a deliberate consequence of the
    // children-based leaf rule, flagged for browser review.
    renderTree();

    // phase-two (a top-level node) dragged over the middle of ground-floor (a
    // node with children) → valid nest, "inside" band lights up.
    const phaseTwo = treeNodeButton("phase-two");
    const groundFloor = treeNodeButton("ground-floor");
    const dataTransfer = mockDataTransfer();
    setMiddleDropRect(groundFloor);

    fireEvent.dragStart(phaseTwo, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("application/x-archestimator-estimate-tree-item", "phase-two");
    fireEvent.dragOver(groundFloor, { clientY: 14, dataTransfer });

    expect(treeNodeButton("ground-floor")).toHaveClass("bg-surfaceMuted");
  });

  it("accepts sidebar template drags on group rows and hands the insert to the sheet", () => {
    renderTree();

    const insertEvents: Array<Record<string, unknown>> = [];
    const recordInsert = (event: Event) => {
      insertEvents.push((event as CustomEvent<Record<string, unknown>>).detail);
    };
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, recordInsert);

    try {
      // No dragStart in this tree: the payload comes from the right sidebar.
      const dataTransfer = Object.assign(mockDataTransfer(), {
        types: [ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, "text/plain"],
      });
      dataTransfer.setData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, JSON.stringify({ templateId: "tpl-9" }));

      const alternates = treeNodeButton("alternates");
      setMiddleDropRect(alternates);
      fireEvent.dragOver(alternates, { clientY: 0, dataTransfer });
      expect(treeNodeButton("alternates")).toHaveClass("bg-surfaceMuted");
      fireEvent.drop(alternates, { dataTransfer });

      expect(insertEvents).toEqual([{ targetParentNodeId: "alternates", templateIds: ["tpl-9"] }]);

      // P6: a row-owning area row accepts a template directly — any node can
      // parent children now, so the drop emits a plain `targetParentNodeId`
      // insert (no wrap-into-group).
      const kitchen = treeNodeButton("kitchen");
      setMiddleDropRect(kitchen);
      fireEvent.dragOver(kitchen, { clientY: 0, dataTransfer });
      expect(treeNodeButton("kitchen")).toHaveClass("bg-surfaceMuted");
      fireEvent.drop(kitchen, { dataTransfer });

      expect(insertEvents).toHaveLength(2);
      expect(insertEvents[1]).toEqual({ targetParentNodeId: "kitchen", templateIds: ["tpl-9"] });
    } finally {
      window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, recordInsert);
    }
  });

  it("hands node-from-template drops to the sheet with the subtree payload", () => {
    renderTree();

    const insertEvents: Array<Record<string, unknown>> = [];
    const recordInsert = (event: Event) => {
      insertEvents.push((event as CustomEvent<Record<string, unknown>>).detail);
    };
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, recordInsert);

    try {
      const dataTransfer = Object.assign(mockDataTransfer(), {
        types: [ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, "text/plain"],
      });
      dataTransfer.setData(
        ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
        JSON.stringify({ templateId: "tpl-9", templateNodeId: "tpl-9-area" }),
      );

      const alternates = treeNodeButton("alternates");
      setMiddleDropRect(alternates);
      fireEvent.dragOver(alternates, { clientY: 0, dataTransfer });
      fireEvent.drop(alternates, { dataTransfer });

      expect(insertEvents).toEqual([
        { targetParentNodeId: "alternates", templateId: "tpl-9", templateNodeId: "tpl-9-area" },
      ]);
    } finally {
      window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, recordInsert);
    }
  });

  it("moves a Group Node before the first root item from the first row top band", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({
      tree: [
        {
          id: "phase-two",
          name: "Phase Two",
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
          id: "phase-three",
          name: "Phase Three",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
    });
    renderTree();

    const phaseTwo = treeNodeButton("phase-two");
    const projectScope = treeNodeButton("project-scope");
    const dataTransfer = mockDataTransfer();

    fireEvent.dragStart(phaseTwo, { dataTransfer });
    setTopDropRect(projectScope);
    fireDragOverAt(projectScope, dataTransfer, 0);

    await waitFor(() => expect(projectScope).toHaveAttribute("aria-dropeffect", "move"));

    fireDropAt(projectScope, dataTransfer, 0);

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "phase-two", parentId: null, sortOrder: 10 },
        { id: "project-scope", parentId: null, sortOrder: 20 },
        { id: "phase-three", parentId: null, sortOrder: 30 },
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
