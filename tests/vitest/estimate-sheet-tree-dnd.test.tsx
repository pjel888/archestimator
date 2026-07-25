import { act, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { ESTIMATE_TREE_DRAG_MIME_TYPE } from "@/components/workshop/estimate-sheet/drag-types";
import { ADD_LIBRARY_ITEM_EVENT, LIBRARY_ITEM_DRAG_MIME_TYPE } from "@/components/workshop/estimate-sheet/rows/constants";
import type { EstimateExternalDropEnvelope } from "@/components/workshop/estimate-sheet/events";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { ToastProvider } from "@/components/ui/toast";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

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
            {
              id: "living",
              name: "Living Area",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
          ],
        },
        {
          id: "site-works",
          name: "Site Works",
          kind: "group",
          total: "₱0.00",
          children: [
            {
              id: "front-yard",
              name: "Front Yard",
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

function confirmedTree(): EstimateTreeNode[] {
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
              id: "living",
              name: "Living Area",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
          ],
        },
        {
          id: "site-works",
          name: "Site Works",
          kind: "group",
          total: "₱0.00",
          children: [
            {
              id: "front-yard",
              name: "Front Yard",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
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

function confirmedGroupReparentTree(): EstimateTreeNode[] {
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
            {
              id: "living",
              name: "Living Area",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: [],
              children: [],
            },
            {
              id: "site-works",
              name: "Site Works",
              kind: "group",
              total: "₱0.00",
              children: [
                {
                  id: "front-yard",
                  name: "Front Yard",
                  kind: "area",
                  total: "₱0.00",
                  estimateRowItems: [],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

function rowItem(id: string) {
  return {
    id,
    material: "Cached row edit",
    description: "Local cache row that should survive tree reorders.",
    supplier: "Local cache",
    source: "project" as const,
    unit: "pc",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "General",
    pricingSource: "Local cache",
    pricingDate: "2026-05-21",
  };
}

function mapTreeNode(nodes: EstimateTreeNode[], targetId: string, mapper: (node: EstimateTreeNode) => EstimateTreeNode): EstimateTreeNode[] {
  return nodes.map((node) => {
    const nextNode = node.id === targetId ? mapper(node) : node;
    return {
      ...nextNode,
      children: nextNode.children ? mapTreeNode(nextNode.children, targetId, mapper) : nextNode.children,
    };
  });
}

function treeWithKitchenName(name: string) {
  return mapTreeNode(fixtureTree(), "kitchen", (node) => ({ ...node, name }));
}

function treeWithKitchenRow(rowId: string) {
  return mapTreeNode(fixtureTree(), "kitchen", (node) => ({ ...node, estimateRowItems: [rowItem(rowId)] }));
}

function renderTree(nodes = fixtureTree(), selectedNodeId: string | null = "kitchen") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  function TreeView({ nextNodes = nodes, nextSelectedNodeId = selectedNodeId }: { nextNodes?: EstimateTreeNode[]; nextSelectedNodeId?: string | null }) {
    return (
      <EstimateSheetTree
        projectId="project-1"
        estimateId="estimate-1"
        projectName="Modern Bungalow"
        selectedNodeId={nextSelectedNodeId}
        nodes={nextNodes}
      />
    );
  }

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TreeView />
      </ToastProvider>
    </QueryClientProvider>,
  );

  return {
    queryClient,
    unmount: view.unmount,
    rerenderTree: (nextNodes: EstimateTreeNode[], nextSelectedNodeId: string | null = selectedNodeId) =>
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <TreeView nextNodes={nextNodes} nextSelectedNodeId={nextSelectedNodeId} />
          </ToastProvider>
        </QueryClientProvider>,
      ),
  };
}

function treeNodeRow(id: string) {
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node row ${id}`);
  return element;
}

function treeNodeDragHandle(id: string) {
  const element = treeNodeRow(id).querySelector(`[data-tree-drag-handle="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node drag handle ${id}`);
  return element;
}

function renderedIds() {
  const tree = screen.getByRole("tree", { name: "Modern Bungalow estimate areas" });
  return Array.from(tree.querySelectorAll("[data-tree-row]")).map((row) =>
    row.getAttribute("data-tree-row"),
  );
}

function toastViewport() {
  const viewport = document.querySelector("[data-toast-viewport='true']");
  if (!(viewport instanceof HTMLElement)) throw new Error("Toast viewport was not rendered.");
  return viewport;
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

function setDropRect(element: HTMLElement) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 180,
    bottom: 30,
    width: 180,
    height: 30,
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

/**
 * Drops `sourceId` onto the middle of `targetId`. With jsdom's zero-height
 * rects, the tree resolves the midpoint band: "inside" for groups,
 * "after" for leaf rows.
 */
async function dropOnto(sourceId: string, targetId: string) {
  const dataTransfer = mockDataTransfer();
  fireEvent.dragStart(treeNodeDragHandle(sourceId), { dataTransfer });
  fireEvent.dragOver(treeNodeRow(targetId), { dataTransfer });
  fireEvent.drop(treeNodeRow(targetId), { dataTransfer });
  fireEvent.dragEnd(treeNodeDragHandle(sourceId), { dataTransfer });
}

describe("estimate sheet tree drag/drop", () => {
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

  it("renders handle-draggable rows with tree semantics and expanded folders by default", async () => {
    await act(async () => {
      renderTree();
      await Promise.resolve();
    });

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);

    const projectScope = treeNodeRow("project-scope");
    expect(projectScope).toHaveAttribute("role", "treeitem");
    expect(projectScope).toHaveAttribute("aria-level", "1");
    expect(projectScope).toHaveAttribute("aria-expanded", "true");
    expect(projectScope).toHaveAttribute("draggable", "false");
    expect(projectScope).toHaveAttribute("data-tree-drag-activation", "handle");
    expect(treeNodeDragHandle("project-scope")).toHaveAttribute("draggable", "true");

    const kitchen = treeNodeRow("kitchen");
    expect(kitchen).toHaveAttribute("aria-level", "3");
    expect(kitchen).not.toHaveAttribute("aria-expanded");
    expect(kitchen).toHaveAttribute("draggable", "false");
    expect(treeNodeDragHandle("kitchen")).toHaveAttribute("draggable", "true");
  });

  it("routes Project-tab component drops on tree rows through the library item insert event", async () => {
    await act(async () => {
      renderTree();
      await Promise.resolve();
    });
    const projectComponentItem: EstimateRowItem = {
      ...rowItem("project-component-row"),
      material: "Project Component",
      description: "",
      metadata: {
        projectComponentProjection: {
          projectId: "project-1",
          projectName: "Modern Bungalow",
          estimateId: "estimate-1",
          estimateName: "Main Estimate",
          nodeId: "kitchen",
          nodeName: "Kitchen",
          classification: "express",
        },
      },
    };
    const onAddLibraryItem = vi.fn();
    window.addEventListener(ADD_LIBRARY_ITEM_EVENT, onAddLibraryItem as EventListener);
    const dataTransfer = mockDataTransfer([LIBRARY_ITEM_DRAG_MIME_TYPE]);
    dataTransfer.setData(LIBRARY_ITEM_DRAG_MIME_TYPE, JSON.stringify(projectComponentItem));

    try {
      await act(async () => {
        fireEvent.dragOver(treeNodeRow("kitchen"), { dataTransfer });
        fireEvent.drop(treeNodeRow("kitchen"), { dataTransfer });
        await Promise.resolve();
      });

      expect(onAddLibraryItem).toHaveBeenCalledTimes(1);
      const event = onAddLibraryItem.mock.calls[0]?.[0] as CustomEvent<EstimateExternalDropEnvelope<{ libraryItem: EstimateRowItem }>>;
      expect(event.detail.target.nodeId).toBe("kitchen");
      expect(event.detail.payload.libraryItem).toMatchObject({
        id: "project-component-row",
        material: "Project Component",
        source: "project",
      });
      expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(ADD_LIBRARY_ITEM_EVENT, onAddLibraryItem as EventListener);
    }
  });

  it("keeps collapsed tree state after selecting a node and remounting for the new route", async () => {
    let firstRender!: ReturnType<typeof renderTree>;
    await act(async () => {
      firstRender = renderTree();
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Collapse all tree" }));
      await Promise.resolve();
    });
    expect(renderedIds()).toEqual(["project-scope"]);

    await act(async () => {
      firstRender.unmount();
      renderTree(fixtureTree(), "site-works");
      await Promise.resolve();
    });
    expect(renderedIds()).toEqual(["project-scope"]);

    firstRender.queryClient.clear();
  });

  it("updates the tree order optimistically, writes the query cache, and avoids route refresh while the server action is pending", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);

    await act(async () => {
      await dropOnto("kitchen", "site-works");
    });

    await waitFor(() => expect(renderedIds()).toEqual(["project-scope", "ground-floor", "living", "site-works", "front-yard", "kitchen"]));
    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1));
    expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "living", parentId: "ground-floor", sortOrder: 10 },
        { id: "front-yard", parentId: "site-works", sortOrder: 10 },
        { id: "kitchen", parentId: "site-works", sortOrder: 20 },
      ],
    });
    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree()));
    expect(treeNodeDragHandle("kitchen")).toHaveAttribute("data-tree-drag-disabled-reason", "Finish the current tree save before dragging nodes.");
    expect(toastViewport()).not.toHaveTextContent("Saving tree order");
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ tree: confirmedTree() });
      await pending.promise;
    });

    await waitFor(() => expect(treeNodeDragHandle("kitchen")).toHaveAttribute("draggable", "true"));
    expect(toastViewport()).not.toHaveTextContent("Tree order saved");
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "living", "site-works", "front-yard", "kitchen"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree());
  });

  it("suppresses the click primary action that follows a completed drag/drop", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({ tree: confirmedTree() });
    renderTree();

    await act(async () => {
      await dropOnto("kitchen", "site-works");
    });
    fireEvent.click(treeNodeRow("kitchen"));

    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("rolls back optimistic order and query cache when persistence fails", async () => {
    actionMocks.reorderEstimateTreeNodes.mockRejectedValue(new Error("Database rejected reorder."));
    const initialTree = fixtureTree();
    const { queryClient } = renderTree(initialTree);

    await act(async () => {
      await dropOnto("kitchen", "site-works");
    });

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1));
    expect(toastViewport()).not.toHaveTextContent("Saving tree order");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Database rejected reorder."));
    expect(screen.getByRole("alert").closest("[data-toast-viewport='true']")).not.toBeNull();
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("reorders a non-root branch before its sibling from explicit row geometry without detaching descendants", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    renderTree();

    const dataTransfer = mockDataTransfer();
    const groundFloor = treeNodeRow("ground-floor");
    setDropRect(groundFloor);

    fireEvent.dragStart(treeNodeDragHandle("site-works"), { dataTransfer });
    fireDragOverAt(groundFloor, dataTransfer, 1);
    expect(groundFloor).toHaveAttribute("data-tree-drop-position", "before");
    fireDropAt(groundFloor, dataTransfer, 1);

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1));
    expect(renderedIds()).toEqual(["project-scope", "site-works", "front-yard", "ground-floor", "kitchen", "living"]);
    expect(treeNodeRow("site-works")).toHaveAttribute("aria-level", "2");
    expect(treeNodeRow("front-yard")).toHaveAttribute("aria-level", "3");
    expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: expect.arrayContaining([
        { id: "site-works", parentId: "project-scope", sortOrder: 10 },
        { id: "ground-floor", parentId: "project-scope", sortOrder: 20 },
      ]),
    });

    const [root] = fixtureTree();
    const [groundFloorNode, siteWorksNode] = root?.children ?? [];
    if (!root || !groundFloorNode || !siteWorksNode) throw new Error("Invalid branch reorder fixture.");
    await act(async () => {
      pending.resolve({ tree: [{ ...root, children: [siteWorksNode, groundFloorNode] }] });
      await pending.promise;
    });
    await waitFor(() => expect(treeNodeDragHandle("site-works")).toHaveAttribute("draggable", "true"));
    expect(renderedIds()).toEqual(["project-scope", "site-works", "front-yard", "ground-floor", "kitchen", "living"]);
  });

  it("rolls back a failed non-empty branch move with descendants, selection, and expansion intact", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    const initialTree = fixtureTree();
    const { queryClient } = renderTree(initialTree, "front-yard");

    expect(treeNodeRow("ground-floor")).toHaveAttribute("aria-expanded", "true");
    expect(treeNodeRow("site-works")).toHaveAttribute("aria-expanded", "true");
    expect(treeNodeRow("front-yard")).toHaveAttribute("aria-current", "page");

    await act(async () => {
      await dropOnto("site-works", "ground-floor");
    });

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1));
    expect(treeNodeRow("site-works")).toHaveAttribute("aria-level", "3");
    expect(treeNodeRow("front-yard")).toHaveAttribute("aria-level", "4");
    expect(treeNodeRow("front-yard")).toHaveAttribute("aria-current", "page");

    await act(async () => {
      pending.reject(new Error("Branch move failed."));
      await pending.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Branch move failed."));
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);
    expect(treeNodeRow("ground-floor")).toHaveAttribute("aria-expanded", "true");
    expect(treeNodeRow("site-works")).toHaveAttribute("aria-expanded", "true");
    expect(treeNodeRow("front-yard")).toHaveAttribute("aria-level", "3");
    expect(treeNodeRow("front-yard")).toHaveAttribute("aria-current", "page");
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
  });

  it("persists Group Node nesting under another Group Node through the same drop path", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({ tree: confirmedGroupReparentTree() });
    const { queryClient } = renderTree();

    await act(async () => {
      await dropOnto("site-works", "ground-floor");
    });

    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedGroupReparentTree()));
    // "Inside" drops append after the existing children — the dropped group
    // does not jump above area siblings.
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);
    expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "ground-floor", parentId: "project-scope", sortOrder: 10 },
        { id: "kitchen", parentId: "ground-floor", sortOrder: 10 },
        { id: "living", parentId: "ground-floor", sortOrder: 20 },
        { id: "site-works", parentId: "ground-floor", sortOrder: 30 },
      ],
    });
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedGroupReparentTree());
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("does not let stale route props overwrite the confirmed server tree after a successful drop", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({ tree: confirmedTree() });
    const staleInitialTree = fixtureTree();
    const { queryClient, rerenderTree } = renderTree(staleInitialTree);

    await act(async () => {
      await dropOnto("kitchen", "site-works");
    });

    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree()));
    rerenderTree(fixtureTree());

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "living", "site-works", "front-yard", "kitchen"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree());
  });

  it("syncs local tree rendering when route props change node content without changing topology", async () => {
    const { queryClient, rerenderTree } = renderTree(fixtureTree());

    rerenderTree(treeWithKitchenName("Kitchen Renamed"));

    await waitFor(() => expect(treeNodeRow("kitchen")).toHaveTextContent("Kitchen Renamed"));
    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(treeWithKitchenName("Kitchen Renamed")));
  });

  it("rebases optimistic reorder on the latest cached tree so row edits survive", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();

    queryClient.setQueryData(estimateQueryKeys.areaTree("estimate-1"), treeWithKitchenRow("cached-row-before-drop"));

    await act(async () => {
      await dropOnto("kitchen", "site-works");
    });

    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1")))).toContain("cached-row-before-drop");

    await act(async () => {
      pending.resolve({ tree: confirmedTree() });
      await pending.promise;
    });
    expect(JSON.stringify(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1")))).toContain("cached-row-before-drop");
  });

  it("does not let stale reorder completion overwrite newer local tree edits", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    actionMocks.createEstimateNode.mockReturnValue(new Promise(() => {}));
    const { queryClient } = renderTree(fixtureTree(), "ground-floor");

    await act(async () => {
      await dropOnto("kitchen", "site-works");
    });
    await waitFor(() => expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1));
    expect(treeNodeDragHandle("kitchen")).toHaveAttribute("data-tree-drag-disabled-reason", "Finish the current tree save before dragging nodes.");

    // Single "Add Area"; ground-floor (a group) is selected → an area child.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Area" }));
    });
    expect(document.querySelector('[data-tree-row^="optimistic-area-"]')).not.toBeNull();
    expect(screen.getByLabelText("Rename New Area")).toHaveValue("New Area");

    await act(async () => {
      pending.resolve({ tree: confirmedTree() });
      await pending.promise;
    });

    expect(document.querySelector('[data-tree-row^="optimistic-area-"]')).not.toBeNull();
    expect(screen.getByLabelText("Rename New Area")).toHaveValue("New Area");
    expect(JSON.stringify(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1")))).toContain("New Area");
  });

  it("appends an optimistic Add Area row after sibling areas and keeps that slot on settle", async () => {
    const pending = deferred<{ nodeId: string; name: string; kind: "area"; parentId: string }>();
    actionMocks.createEstimateNode.mockReturnValue(pending.promise);
    renderTree(fixtureTree(), "ground-floor");

    // ground-floor (a group) is selected → Add Area creates an `area` child.
    fireEvent.click(screen.getByRole("button", { name: "Add Area" }));

    // Position is the contract: the new node appends after its siblings
    // (kitchen/living) and keeps that slot on settle — no kind re-sorting.
    const optimisticIds = renderedIds();
    const optimisticRow = optimisticIds.find((id) => id?.startsWith("optimistic-area-"));
    expect(optimisticRow).toBeTruthy();
    expect(optimisticIds).toEqual(["project-scope", "ground-floor", "kitchen", "living", optimisticRow, "site-works", "front-yard"]);

    await act(async () => {
      pending.resolve({ nodeId: "server-area-1", name: "New Area", kind: "area", parentId: "ground-floor" });
      await pending.promise;
    });

    await waitFor(() =>
      expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "server-area-1", "site-works", "front-yard"]),
    );
  });

  it("explains why a newly created optimistic node cannot be reordered while its create is saving", async () => {
    const pending = deferred<{ nodeId: string; name: string; kind: "area"; parentId: string }>();
    actionMocks.createEstimateNode.mockReturnValue(pending.promise);
    renderTree(fixtureTree(), "ground-floor");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Area" }));
    });
    const optimisticRow = document.querySelector<HTMLElement>('[data-tree-row^="optimistic-area-"]');
    if (!optimisticRow) throw new Error("Missing optimistic area row.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel rename New Area" }));
    });

    const optimisticId = optimisticRow.getAttribute("data-tree-row");
    if (!optimisticId) throw new Error("Missing optimistic area id.");
    const handle = treeNodeDragHandle(optimisticId);
    expect(handle).toHaveAttribute("draggable", "false");
    expect(handle).toHaveAttribute("aria-disabled", "true");
    expect(handle).toHaveAttribute("data-tree-drag-disabled-reason", "Finish the current tree save before dragging nodes.");
    expect(handle).toHaveAccessibleName("Drag New Area unavailable: Finish the current tree save before dragging nodes.");

    await act(async () => {
      pending.reject(new Error("Characterization cleanup."));
      await pending.promise.catch(() => undefined);
    });
  });

  it("blocks a persisted node dropped onto an optimistic target with a reachable reason", async () => {
    const pending = deferred<{ nodeId: string; name: string; kind: "area"; parentId: string }>();
    actionMocks.createEstimateNode.mockReturnValue(pending.promise);
    renderTree(fixtureTree(), "ground-floor");

    fireEvent.click(screen.getByRole("button", { name: "Add Area" }));
    const optimisticRow = document.querySelector<HTMLElement>('[data-tree-row^="optimistic-area-"]');
    if (!optimisticRow) throw new Error("Missing optimistic area row.");

    const dataTransfer = mockDataTransfer([ESTIMATE_TREE_DRAG_MIME_TYPE]);
    dataTransfer.setData(ESTIMATE_TREE_DRAG_MIME_TYPE, "kitchen");
    fireEvent.dragOver(optimisticRow, { dataTransfer });

    expect(optimisticRow).toHaveAttribute("data-tree-drop-state", "invalid");
    expect(optimisticRow).toHaveAttribute("data-tree-drop-reason", "Drop is not allowed here.");
    expect(document.querySelector("[data-tree-drop-status]")).toHaveTextContent("Drop is not allowed here.");

    fireEvent.drop(optimisticRow, { dataTransfer });
    expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();

    await act(async () => {
      pending.reject(new Error("Characterization cleanup."));
      await pending.promise.catch(() => undefined);
    });
  });

  it("does not call persistence for no-op drops", async () => {
    renderTree();

    // Living onto its own parent's midpoint resolves to "inside ground-floor",
    // appending where it already sits: a genuine no-op.
    // (Unification P6: living onto kitchen now nests living *inside* kitchen — a
    //  valid move that DOES persist, since any node may parent any node. The
    //  cycle / self-drop / cross-tab rejections are covered in
    //  estimate-tree-reorder.test.ts and estimate-node-reorder-action.test.ts.)
    await act(async () => {
      await dropOnto("living", "ground-floor");
    });

    expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
