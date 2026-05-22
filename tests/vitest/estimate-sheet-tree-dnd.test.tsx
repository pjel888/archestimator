import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraggingPosition, TreeItem, TreeItemIndex, TreeViewState } from "react-complex-tree";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { ESTIMATE_TREE_ROOT_ITEM_ID } from "@/lib/estimates/estimate-tree-reorder";

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

type CapturedEnvironmentProps = {
  items: Record<TreeItemIndex, TreeItem<{ node: EstimateTreeNode | null }>>;
  getItemTitle: (item: TreeItem<{ node: EstimateTreeNode | null }>) => string;
  viewState?: TreeViewState;
  canDragAndDrop?: boolean;
  canReorderItems?: boolean;
  canDropOnFolder?: boolean;
  canDropOnNonFolder?: boolean;
  canDropBelowOpenFolders?: boolean;
  canDrag?: (items: TreeItem<{ node: EstimateTreeNode | null }>[]) => boolean;
  canDropAt?: (items: TreeItem<{ node: EstimateTreeNode | null }>[], target: DraggingPosition) => boolean;
  onDrop?: (items: TreeItem<{ node: EstimateTreeNode | null }>[], target: DraggingPosition) => void | Promise<void>;
  onPrimaryAction?: (item: TreeItem<{ node: EstimateTreeNode | null }>, treeId: string) => void;
};

const rctHarness = vi.hoisted(() => ({
  lastEnvironmentProps: null as CapturedEnvironmentProps | null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/kitchen",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

vi.mock("react-complex-tree", () => ({
  InteractionMode: { ClickArrowToExpand: "ClickArrowToExpand" },
  ControlledTreeEnvironment: (props: CapturedEnvironmentProps & { children: React.ReactNode }) => {
    rctHarness.lastEnvironmentProps = props;
    return <div data-rct-environment="true">{props.children}</div>;
  },
  Tree: ({ rootItem, treeLabel }: { rootItem: TreeItemIndex; treeLabel: string }) => {
    const environment = rctHarness.lastEnvironmentProps;
    if (!environment) return null;

    function renderChildren(parentId: TreeItemIndex): React.ReactNode {
      const parent = environment.items[parentId];
      return (
        <ol>
          {(parent?.children ?? []).map((childId) => {
            const child = environment.items[childId];
            return (
              <li key={String(childId)}>
                <button type="button" data-rct-node-id={String(childId)} data-estimate-tree-node-id={String(childId)}>
                  {environment.getItemTitle(child)}
                </button>
                {child?.children?.length ? renderChildren(childId) : null}
              </li>
            );
          })}
        </ol>
      );
    }

    return (
      <div role="tree" aria-label={treeLabel}>
        {renderChildren(rootItem)}
      </div>
    );
  },
}));

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
      <TreeView />
    </QueryClientProvider>,
  );

  return {
    queryClient,
    unmount: view.unmount,
    rerenderTree: (nextNodes: EstimateTreeNode[], nextSelectedNodeId: string | null = selectedNodeId) =>
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <TreeView nextNodes={nextNodes} nextSelectedNodeId={nextSelectedNodeId} />
        </QueryClientProvider>,
      ),
  };
}

function environment() {
  if (!rctHarness.lastEnvironmentProps) throw new Error("RCT environment was not rendered.");
  return rctHarness.lastEnvironmentProps;
}

function renderedIds() {
  return within(screen.getByRole("tree", { name: "Modern Bungalow estimate areas" }))
    .getAllByRole("button")
    .map((button) => button.getAttribute("data-rct-node-id"));
}

function item(id: string) {
  const current = environment().items[id];
  if (!current) throw new Error(`Missing item ${id}`);
  return current;
}

const dropKitchenOntoSiteWorks: DraggingPosition = {
  targetType: "item",
  treeId: "estimate-sheet-tree",
  targetItem: "site-works",
  parentItem: "project-scope",
  linearIndex: 4,
  depth: 1,
};

const dropLivingOntoKitchen: DraggingPosition = {
  targetType: "item",
  treeId: "estimate-sheet-tree",
  targetItem: "kitchen",
  parentItem: "ground-floor",
  linearIndex: 2,
  depth: 2,
};

const dropSiteWorksOntoGroundFloor: DraggingPosition = {
  targetType: "item",
  treeId: "estimate-sheet-tree",
  targetItem: "ground-floor",
  parentItem: "project-scope",
  linearIndex: 1,
  depth: 1,
};

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
    rctHarness.lastEnvironmentProps = null;
  });

  it("enables React Complex Tree drag/drop with app-side drop guards", () => {
    renderTree();

    expect(environment()).toMatchObject({
      canDragAndDrop: true,
      canReorderItems: true,
      canDropOnFolder: true,
      canDropOnNonFolder: false,
      canDropBelowOpenFolders: true,
    });
    expect(environment().items[ESTIMATE_TREE_ROOT_ITEM_ID]).toMatchObject({
      isFolder: true,
      canMove: false,
      children: ["project-scope"],
    });
    expect(environment().items["project-scope"]).toMatchObject({ isFolder: true, children: ["ground-floor", "site-works"] });
    expect(environment().items["ground-floor"]).toMatchObject({ isFolder: true, children: ["kitchen", "living"] });
    expect(environment().items["kitchen"]).toMatchObject({ isFolder: false, children: undefined });
    expect(environment().viewState?.["estimate-sheet-tree"]?.expandedItems).toEqual(
      expect.arrayContaining(["project-scope", "ground-floor", "site-works"]),
    );
    expect(environment().canDrag?.([item("kitchen")])).toBe(true);
    expect(environment().canDrag?.([item("project-scope"), item("site-works")])).toBe(false);
    expect(environment().canDropAt?.([item("kitchen")], dropKitchenOntoSiteWorks)).toBe(true);
    expect(environment().canDropAt?.([item("living")], dropLivingOntoKitchen)).toBe(false);
  });

  it("keeps collapsed tree state after selecting a node and remounting for the new route", () => {
    const firstRender = renderTree();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all tree" }));
    expect(environment().viewState?.["estimate-sheet-tree"]?.expandedItems).toEqual([]);

    firstRender.unmount();
    renderTree(fixtureTree(), "site-works");
    expect(environment().viewState?.["estimate-sheet-tree"]?.expandedItems).toEqual([]);

    firstRender.queryClient.clear();
  });

  it("updates the tree order optimistically, writes the query cache, and avoids route refresh while the server action is pending", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);

    await act(async () => {
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
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
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
      environment().onPrimaryAction?.(item("kitchen"), "estimate-sheet-tree");
    });

    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("rolls back optimistic order and query cache when persistence fails", async () => {
    actionMocks.reorderEstimateTreeNodes.mockRejectedValue(new Error("Database rejected reorder."));
    const initialTree = fixtureTree();
    const { queryClient } = renderTree(initialTree);

    await act(async () => {
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Database rejected reorder."));
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("persists Group Node nesting under another Group Node through the same RCT drop path", async () => {
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({ tree: confirmedGroupReparentTree() });
    const { queryClient } = renderTree();

    await act(async () => {
      await environment().onDrop?.([item("site-works")], dropSiteWorksOntoGroundFloor);
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tree order saved"));
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "site-works", "front-yard", "kitchen", "living"]);
    expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "ground-floor", parentId: "project-scope", sortOrder: 10 },
        { id: "site-works", parentId: "ground-floor", sortOrder: 10 },
        { id: "kitchen", parentId: "ground-floor", sortOrder: 20 },
        { id: "living", parentId: "ground-floor", sortOrder: 30 },
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
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tree order saved"));
    rerenderTree(fixtureTree());

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "living", "site-works", "front-yard", "kitchen"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree());
  });

  it("syncs local tree rendering when route props change node content without changing topology", async () => {
    const { queryClient, rerenderTree } = renderTree(fixtureTree());

    rerenderTree(treeWithKitchenName("Kitchen Renamed"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Kitchen Renamed" })).toBeInTheDocument());
    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(treeWithKitchenName("Kitchen Renamed")));
  });

  it("rebases optimistic reorder on the latest cached tree so row edits survive", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();

    queryClient.setQueryData(estimateQueryKeys.areaTree("estimate-1"), treeWithKitchenRow("cached-row-before-drop"));

    await act(async () => {
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
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
    const { queryClient } = renderTree(fixtureTree(), "ground-floor");

    await act(async () => {
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saving tree order"));

    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    expect(screen.getByRole("button", { name: "New Group" })).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ tree: confirmedTree() });
      await pending.promise;
    });

    expect(screen.getByRole("button", { name: "New Group" })).toBeInTheDocument();
    expect(JSON.stringify(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1")))).toContain("New Group");
  });

  it("does not call persistence for invalid or no-op drops", async () => {
    renderTree();

    await act(async () => {
      await environment().onDrop?.([item("living")], dropLivingOntoKitchen);
      await environment().onDrop?.([item("kitchen")], {
        targetType: "between-items",
        treeId: "estimate-sheet-tree",
        parentItem: "ground-floor",
        childIndex: 0,
        linePosition: "top",
        linearIndex: 2,
        depth: 2,
      });
    });

    expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
