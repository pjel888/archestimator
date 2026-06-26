import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
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

function renderedIds() {
  const tree = screen.getByRole("tree", { name: "Modern Bungalow estimate areas" });
  return Array.from(tree.querySelectorAll("[data-tree-row]")).map((row) =>
    row.getAttribute("data-tree-row"),
  );
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

/**
 * Drops `sourceId` onto the middle of `targetId`. With jsdom's zero-height
 * rects, the tree resolves the midpoint band: "inside" for groups,
 * "after" for leaf rows.
 */
async function dropOnto(sourceId: string, targetId: string) {
  const dataTransfer = mockDataTransfer();
  fireEvent.dragStart(treeNodeRow(sourceId), { dataTransfer });
  fireEvent.dragOver(treeNodeRow(targetId), { dataTransfer });
  fireEvent.drop(treeNodeRow(targetId), { dataTransfer });
  fireEvent.dragEnd(treeNodeRow(sourceId), { dataTransfer });
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

  it("renders draggable rows with tree semantics and expanded folders by default", () => {
    renderTree();

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);

    const projectScope = treeNodeRow("project-scope");
    expect(projectScope).toHaveAttribute("role", "treeitem");
    expect(projectScope).toHaveAttribute("aria-level", "1");
    expect(projectScope).toHaveAttribute("aria-expanded", "true");
    expect(projectScope).toHaveAttribute("draggable", "true");

    const kitchen = treeNodeRow("kitchen");
    expect(kitchen).toHaveAttribute("aria-level", "3");
    expect(kitchen).not.toHaveAttribute("aria-expanded");
    expect(kitchen).toHaveAttribute("draggable", "true");
  });

  it("keeps collapsed tree state after selecting a node and remounting for the new route", () => {
    const firstRender = renderTree();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all tree" }));
    expect(renderedIds()).toEqual(["project-scope"]);

    firstRender.unmount();
    renderTree(fixtureTree(), "site-works");
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
    expect(screen.getByRole("status")).toHaveTextContent("Saving tree order");
    expect(screen.getByRole("status").closest("[data-toast-viewport='true']")).not.toBeNull();
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ tree: confirmedTree() });
      await pending.promise;
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tree order saved"));
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

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Database rejected reorder."));
    expect(screen.getByRole("alert").closest("[data-toast-viewport='true']")).not.toBeNull();
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("persists Group Node nesting under another Group Node through the same drop path", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({ tree: confirmedGroupReparentTree() });
    const { queryClient } = renderTree();

    await act(async () => {
      await dropOnto("site-works", "ground-floor");
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tree order saved"));
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

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tree order saved"));
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
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saving tree order"));

    // Single "Add Area"; ground-floor (a group) is selected → an area child.
    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));

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
