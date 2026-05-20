import { act, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraggingPosition, TreeItem, TreeItemIndex } from "react-complex-tree";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateAreaNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

type CapturedEnvironmentProps = {
  items: Record<TreeItemIndex, TreeItem<{ node: EstimateAreaNode | null }>>;
  getItemTitle: (item: TreeItem<{ node: EstimateAreaNode | null }>) => string;
  canDragAndDrop?: boolean;
  canReorderItems?: boolean;
  canDropOnFolder?: boolean;
  canDropOnNonFolder?: boolean;
  canDropBelowOpenFolders?: boolean;
  canDrag?: (items: TreeItem<{ node: EstimateAreaNode | null }>[]) => boolean;
  canDropAt?: (items: TreeItem<{ node: EstimateAreaNode | null }>[], target: DraggingPosition) => boolean;
  onDrop?: (items: TreeItem<{ node: EstimateAreaNode | null }>[], target: DraggingPosition) => void | Promise<void>;
};

const rctHarness = vi.hoisted(() => ({
  lastEnvironmentProps: null as CapturedEnvironmentProps | null,
}));

vi.mock("next/navigation", () => ({
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

function confirmedTree(): EstimateAreaNode[] {
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

  return queryClient;
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

describe("estimate sheet tree drag/drop", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.refresh.mockReset();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
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
    expect(environment().canDrag?.([item("kitchen")])).toBe(true);
    expect(environment().canDrag?.([item("project-scope"), item("site-works")])).toBe(false);
    expect(environment().canDropAt?.([item("kitchen")], dropKitchenOntoSiteWorks)).toBe(true);
    expect(environment().canDropAt?.([item("living")], dropLivingOntoKitchen)).toBe(false);
  });

  it("updates the tree order optimistically, writes the query cache, and avoids route refresh while the server action is pending", async () => {
    const pending = deferred<{ tree: EstimateAreaNode[] }>();
    actionMocks.reorderEstimateTreeNodes.mockReturnValue(pending.promise);
    const queryClient = renderTree();

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);

    await act(async () => {
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
    });

    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "living", "site-works", "front-yard", "kitchen"]);
    expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledTimes(1);
    expect(actionMocks.reorderEstimateTreeNodes).toHaveBeenCalledWith("project-1", "estimate-1", {
      updates: [
        { id: "living", parentId: "ground-floor", sortOrder: 10 },
        { id: "front-yard", parentId: "site-works", sortOrder: 10 },
        { id: "kitchen", parentId: "site-works", sortOrder: 20 },
      ],
    });
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree());
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

  it("rolls back optimistic order and query cache when persistence fails", async () => {
    actionMocks.reorderEstimateTreeNodes.mockRejectedValue(new Error("Database rejected reorder."));
    const initialTree = fixtureTree();
    const queryClient = renderTree(initialTree);

    await act(async () => {
      await environment().onDrop?.([item("kitchen")], dropKitchenOntoSiteWorks);
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Database rejected reorder."));
    expect(renderedIds()).toEqual(["project-scope", "ground-floor", "kitchen", "living", "site-works", "front-yard"]);
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
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
