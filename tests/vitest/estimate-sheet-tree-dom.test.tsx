import { createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  INSERT_ESTIMATE_TEMPLATE_EVENT,
  INSERT_PROJECT_SOURCE_EVENT,
  PROJECT_SOURCE_DRAG_MIME_TYPE,
} from "@/components/workshop/component-library/templates";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  readEstimateExternalDropEnvelope,
  REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT,
} from "@/components/workshop/estimate-sheet/events";
import { ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE } from "@/components/workshop/estimate-sheet/rows/constants";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useParams: () => ({ projectId: "project-1", nodeId: "kitchen" }),
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

function renderTree(
  nodes = fixtureTree(),
  selectedNodeId: string | null = "kitchen",
  options: { activeTabId?: string; canEditEstimate?: boolean; initialTabId?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetTree
        projectId="project-1"
        estimateId="estimate-1"
        activeTabId={options.activeTabId}
        initialTabId={options.initialTabId}
        projectName="Modern Bungalow"
        selectedNodeId={selectedNodeId}
        nodes={nodes}
        canEditEstimate={options.canEditEstimate}
      />
    </QueryClientProvider>,
  );
}

function treeNodeButton(id: string) {
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node row ${id}`);
  return element;
}

function treeDragHandle(id: string) {
  const element = treeNodeButton(id).querySelector(`[data-tree-drag-handle="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node drag handle ${id}`);
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

function mockDataTransfer(types: string[] = []) {
  const transferStore = new Map<string, string>();
  return {
    types,
    dropEffect: "move",
    effectAllowed: "all",
    getData: vi.fn((key: string) => transferStore.get(key) ?? ""),
    setData: vi.fn((key: string, value: string) => {
      transferStore.set(key, value);
    }),
    setDragImage: vi.fn(),
  };
}

function acknowledgeExternalDrop<T>(event: Event) {
  const envelope = readEstimateExternalDropEnvelope<T>((event as CustomEvent).detail, {
    projectId: "project-1",
    estimateId: "estimate-1",
    tabId: null,
  });
  if (!envelope) throw new Error("Expected a matching estimate external-drop envelope.");
  envelope.acknowledge({ accepted: true });
  return envelope;
}

describe("estimate sheet tree DOM integration", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.fetchEstimateTabTree.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue(fixtureTree());
  });

  it("hydrates a non-initial duplicated tab from the server instead of caching an empty tree", async () => {
    const duplicatedTree = [
      {
        id: "copied-ground-floor",
        name: "Copied Ground Floor",
        kind: "group" as const,
        total: "₱0.00",
        children: [],
      },
    ];
    actionMocks.fetchEstimateTabTree.mockResolvedValue({ tree: duplicatedTree, loadLimitState: null });

    renderTree(fixtureTree(), null, { activeTabId: "tab-copy", initialTabId: "tab-main" });

    expect(await screen.findByText("Copied Ground Floor")).toBeInTheDocument();
    expect(actionMocks.fetchEstimateTabTree).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-copy",
    });
    expect(screen.queryByText("No areas yet")).not.toBeInTheDocument();
  });

  it("renders empty-state copy with an Add Area action when the tree has no areas", () => {
    actionMocks.createEstimateNode.mockResolvedValue({ nodeId: "new-area" });

    renderTree([], null);

    expect(screen.getByText("No areas yet")).toBeInTheDocument();
    expect(screen.getByText("Add an area to start organizing this estimate.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Area" })).toBeInTheDocument();
  });

  it("renders visible nested items as handle-draggable treeitems with the shared tree row styling", () => {
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
    expect(kitchen).toHaveAttribute("draggable", "false");
    expect(alternates).toHaveAttribute("draggable", "false");
    expect(kitchen).toHaveAttribute("data-tree-drag-activation", "handle");
    expect(kitchen).toHaveAttribute("aria-current", "page");
    expect(kitchen).toHaveClass("border-l-dividerSibling");
    expect(kitchen).not.toHaveClass("bg-accentSoft", "bg-surfaceMuted");

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
    expect(treeDragHandle("kitchen")).toHaveAttribute("draggable", "true");

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

  it("keeps Area rename geometry and parent styling stable, with caret-end focus and no pointer-exit save", async () => {
    actionMocks.renameEstimateNode.mockResolvedValue({ nodeId: "kitchen", name: "Kitchen Revised" });
    renderTree();
    const row = treeNodeButton("kitchen");
    const restingClassName = row.className;

    row.focus();
    fireEvent.keyDown(row, { key: "F2" });

    const input = await screen.findByRole("textbox", { name: "Rename Kitchen" });
    await waitFor(() => expect(input).toHaveFocus());
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(input).toHaveClass("bg-transparent", "focus-visible:ring-focus");
    expect(input).not.toBeDisabled();
    expect(treeNodeButton("kitchen")).toBe(row);
    expect(row.className).toBe(restingClassName);
    expect(row).not.toHaveClass("bg-accentSoft", "bg-surfaceMuted");
    expect(row.querySelector("[data-estimate-tree-rename-controls]")).toHaveClass("absolute", "w-10");

    fireEvent.change(input, { target: { value: "Kitchen Revised" } });
    fireEvent.pointerLeave(row);
    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Rename Kitchen" })).not.toBeInTheDocument());
    await waitFor(() => expect(row).toHaveFocus());
    expect(row.className).toBe(restingClassName);
    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();
  });

  it("deduplicates Enter and blur while returning focus to the renamed Area", async () => {
    actionMocks.renameEstimateNode.mockResolvedValue({ nodeId: "kitchen", name: "Kitchen Revised" });
    renderTree();
    const row = treeNodeButton("kitchen");

    row.focus();
    fireEvent.keyDown(row, { key: "F2" });
    const input = await screen.findByRole("textbox", { name: "Rename Kitchen" });
    fireEvent.change(input, { target: { value: "Kitchen Revised" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    await waitFor(() => expect(actionMocks.renameEstimateNode).toHaveBeenCalledWith(
      "project-1",
      "estimate-1",
      "kitchen",
      "Kitchen Revised",
    ));
    expect(actionMocks.renameEstimateNode).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(row).toHaveFocus());
    expect(row).toHaveTextContent("Kitchen Revised");
  });

  it("causes no React commit for an Area rename keystroke", async () => {
    const onRender = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <Profiler id="estimate-tree" onRender={onRender}>
        <QueryClientProvider client={queryClient}>
          <EstimateSheetTree
            projectId="project-1"
            estimateId="estimate-1"
            projectName="Modern Bungalow"
            selectedNodeId="kitchen"
            nodes={fixtureTree()}
          />
        </QueryClientProvider>
      </Profiler>,
    );
    const row = treeNodeButton("kitchen");
    row.focus();
    fireEvent.keyDown(row, { key: "F2" });
    const input = await screen.findByRole("textbox", { name: "Rename Kitchen" });
    onRender.mockClear();

    fireEvent.change(input, { target: { value: "Kitchen R" } });

    expect(input).toHaveValue("Kitchen R");
    expect(onRender).not.toHaveBeenCalled();
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

    fireEvent.dragStart(treeDragHandle("phase-two"), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("application/x-archestimator-estimate-tree-item", "phase-two");
    fireEvent.dragOver(groundFloor, { clientY: 14, dataTransfer });

    expect(treeNodeButton("ground-floor")).toHaveClass("bg-surfaceMuted");
    expect(treeNodeButton("ground-floor")).toHaveAttribute("data-tree-drop-state", "valid");
    expect(treeNodeButton("ground-floor")).toHaveAttribute("data-tree-drop-position", "inside");
  });

  it("starts estimate tree reorder drags only from the grip", () => {
    renderTree();

    const phaseTwo = treeNodeButton("phase-two");
    const projectScope = treeNodeButton("project-scope");
    const rowDataTransfer = mockDataTransfer();

    fireEvent.dragStart(phaseTwo, { dataTransfer: rowDataTransfer });
    expect(rowDataTransfer.setData).not.toHaveBeenCalledWith("application/x-archestimator-estimate-tree-item", "phase-two");

    setTopDropRect(projectScope);
    fireDragOverAt(projectScope, rowDataTransfer, 0);
    fireDropAt(projectScope, rowDataTransfer, 0);

    expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();

    const handleDataTransfer = mockDataTransfer();
    fireEvent.dragStart(treeDragHandle("phase-two"), { dataTransfer: handleDataTransfer });

    expect(handleDataTransfer.setData).toHaveBeenCalledWith(
      "application/x-archestimator-estimate-tree-item",
      "phase-two",
    );
  });

  it("keeps the drag handle visible with a reason while tree search disables reorder", async () => {
    renderTree();

    fireEvent.click(screen.getByRole("button", { name: "Show tree search" }));
    const searchInput = await screen.findByPlaceholderText("Search Tree");
    fireEvent.change(searchInput, { target: { value: "Kitchen" } });

    await waitFor(() => {
      const kitchenHandle = treeDragHandle("kitchen");
      expect(kitchenHandle).toHaveAttribute("draggable", "false");
      expect(kitchenHandle).toHaveAttribute("aria-disabled", "true");
      expect(kitchenHandle).toHaveAttribute("data-tree-drag-disabled-reason", "Clear tree search before dragging nodes.");
      expect(kitchenHandle).toHaveAttribute("title", "Clear tree search before dragging nodes.");
      expect(kitchenHandle).toHaveAccessibleName("Drag Kitchen unavailable: Clear tree search before dragging nodes.");
    });
  });

  it("disables edit-only tree affordances with a view-only reason", () => {
    renderTree(fixtureTree(), "kitchen", { canEditEstimate: false });

    expect(screen.getByRole("button", { name: "Add Branch" })).toBeDisabled();
    expect(screen.queryByRole("checkbox", { name: "Select Kitchen" })).not.toBeInTheDocument();

    const kitchenHandle = treeDragHandle("kitchen");
    expect(kitchenHandle).toHaveAttribute("draggable", "false");
    expect(kitchenHandle).toHaveAttribute("aria-disabled", "true");
    expect(kitchenHandle).toHaveAttribute("data-tree-drag-disabled-reason", "View-only estimate.");
    expect(kitchenHandle).toHaveAccessibleName("Drag Kitchen unavailable: View-only estimate.");

    const dataTransfer = mockDataTransfer();
    fireEvent.dragStart(kitchenHandle, { dataTransfer });
    expect(dataTransfer.setData).not.toHaveBeenCalledWith("application/x-archestimator-estimate-tree-item", "kitchen");

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));
    expect(actionMocks.createEstimateNode).not.toHaveBeenCalled();
  });

  it("keeps no-op parent drops quiet instead of presenting an error", () => {
    renderTree();

    const groundFloor = treeNodeButton("ground-floor");
    const dataTransfer = mockDataTransfer();

    fireEvent.dragStart(treeDragHandle("kitchen"), { dataTransfer });
    setMiddleDropRect(groundFloor);
    fireEvent.dragOver(groundFloor, { clientY: 0, dataTransfer });

    expect(groundFloor).toHaveAttribute("data-tree-drop-state", "valid");
    expect(groundFloor).toHaveAttribute("data-tree-drop-position", "inside");
    expect(groundFloor).not.toHaveAttribute("data-tree-drop-reason");
    expect(document.querySelector("[data-tree-drop-status]")).not.toBeInTheDocument();
  });

  it("shows invalid styling and status for blocked internal estimate-tree drops", () => {
    renderTree();

    const projectScope = treeNodeButton("project-scope");
    const kitchen = treeNodeButton("kitchen");
    const dataTransfer = mockDataTransfer();

    fireEvent.dragStart(treeDragHandle("project-scope"), { dataTransfer });
    setMiddleDropRect(kitchen);
    fireEvent.dragOver(kitchen, { clientY: 0, dataTransfer });

    expect(projectScope).toHaveAttribute("aria-grabbed", "true");
    expect(kitchen).toHaveAttribute("data-tree-drop-state", "invalid");
    expect(kitchen).toHaveAttribute("data-tree-drop-position", "inside");
    expect(kitchen).toHaveAttribute("data-tree-drop-reason", "Cannot move a node inside its own descendant.");
    expect(document.querySelector("[data-tree-drop-status]")).toHaveTextContent("Cannot move a node inside its own descendant.");
  });

  it("accepts sidebar template drags on group rows and hands the insert to the sheet", () => {
    renderTree();

    const insertEvents: Array<Record<string, unknown>> = [];
    const recordInsert = (event: Event) => {
      insertEvents.push(acknowledgeExternalDrop<Record<string, unknown>>(event).payload);
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
      insertEvents.push(acknowledgeExternalDrop<Record<string, unknown>>(event).payload);
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

  it("routes project-source drops inside the target row without invoking tree reorder", () => {
    renderTree();
    const onInsertProjectSource = vi.fn((event: Event) => acknowledgeExternalDrop<Record<string, unknown>>(event));
    window.addEventListener(INSERT_PROJECT_SOURCE_EVENT, onInsertProjectSource as EventListener);
    const dataTransfer = mockDataTransfer([PROJECT_SOURCE_DRAG_MIME_TYPE]);
    dataTransfer.setData(PROJECT_SOURCE_DRAG_MIME_TYPE, JSON.stringify({
      kind: "project-node",
      projectId: "source-project",
      estimateId: "source-estimate",
      tabId: "source-tab",
      nodeId: "source-node",
    }));

    try {
      const kitchen = treeNodeButton("kitchen");
      setTopDropRect(kitchen);
      fireDragOverAt(kitchen, dataTransfer, 0);
      expect(kitchen).toHaveAttribute("data-tree-drop-position", "inside");
      fireDropAt(kitchen, dataTransfer, 0);

      expect(onInsertProjectSource).toHaveBeenCalledTimes(1);
      expect(onInsertProjectSource.mock.results[0]?.value).toMatchObject({
        target: {
          projectId: "project-1",
          estimateId: "estimate-1",
          tabId: null,
          nodeId: "kitchen",
        },
        payload: {
        targetParentNodeId: "kitchen",
        source: {
          projectId: "source-project",
          estimateId: "source-estimate",
          tabId: "source-tab",
          nodeId: "source-node",
        },
        },
      });
      expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(INSERT_PROJECT_SOURCE_EVENT, onInsertProjectSource as EventListener);
    }
  });

  it("routes estimate-row-item drops inside the target row without invoking tree reorder", () => {
    renderTree();
    const onMoveRow = vi.fn((event: Event) => acknowledgeExternalDrop<Record<string, unknown>>(event));
    window.addEventListener(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, onMoveRow as EventListener);
    const dataTransfer = mockDataTransfer([ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE]);
    dataTransfer.setData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE, JSON.stringify({
      rowItemId: "row-1",
      sourceNodeId: "ground-floor",
    }));

    try {
      const kitchen = treeNodeButton("kitchen");
      setTopDropRect(kitchen);
      fireDragOverAt(kitchen, dataTransfer, 0);
      expect(kitchen).toHaveAttribute("data-tree-drop-position", "inside");
      fireDropAt(kitchen, dataTransfer, 0);

      expect(onMoveRow).toHaveBeenCalledTimes(1);
      expect(onMoveRow.mock.results[0]?.value).toMatchObject({
        target: {
          projectId: "project-1",
          estimateId: "estimate-1",
          tabId: null,
          nodeId: "kitchen",
        },
        payload: {
          rowItemId: "row-1",
          targetNodeId: "kitchen",
          targetIndex: 0,
          targetPlacement: "end",
        },
      });
      expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, onMoveRow as EventListener);
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

    fireEvent.dragStart(treeDragHandle("phase-two"), { dataTransfer });
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

    fireEvent.dragStart(treeDragHandle("alternates"), { dataTransfer });
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
