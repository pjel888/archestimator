import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const pathnameMock = vi.hoisted(() => ({
  current: "/workshop/projects/project-1/estimates/kitchen",
}));

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  fetchEstimateTree: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
  renameEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  usePathname: () => pathnameMock.current,
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

function renameTree(nodes: EstimateTreeNode[], nodeId: string, name: string): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    name: node.id === nodeId ? name : node.name,
    children: node.children ? renameTree(node.children, nodeId, name) : node.children,
  }));
}

function deleteKitchenTree(): EstimateTreeNode[] {
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
          ],
        },
      ],
    },
  ];
}

function deleteLivingTree(): EstimateTreeNode[] {
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

function deleteKitchenAndLivingTree(): EstimateTreeNode[] {
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
  ];
}

function renderTree(nodes = fixtureTree(), selectedNodeId: string | null = "kitchen") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(estimateQueryKeys.areaTree("estimate-1"), nodes);

  const view = render(
    <QueryClientProvider client={queryClient}>
      <div data-testid="clipped-sidebar" className="overflow-hidden">
        <EstimateSheetTree
          projectId="project-1"
          estimateId="estimate-1"
          projectName="Modern Bungalow"
          selectedNodeId={selectedNodeId}
          nodes={nodes}
        />
      </div>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function renderTreeWithSheet(nodes = fixtureTree(), selectedNodeId: string | null = "kitchen") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(estimateQueryKeys.areaTree("estimate-1"), nodes);

  const view = render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetTree
        projectId="project-1"
        estimateId="estimate-1"
        projectName="Modern Bungalow"
        selectedNodeId={selectedNodeId}
        nodes={nodes}
      />
      <EstimateSheetContent selectedNodeId={selectedNodeId} nodes={nodes} projectId="project-1" estimateId="estimate-1" />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function treeNodeButton(id: string) {
  const element = document.querySelector(`[data-estimate-tree-node-id="${id}"]`);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Missing tree node button ${id}`);
  return element;
}

async function openContextMenu(nodeId: string) {
  fireEvent.contextMenu(treeNodeButton(nodeId), { clientX: 24, clientY: 24 });
  return screen.findByRole("menu");
}

async function chooseMenuItem(nodeId: string, name: string) {
  await openContextMenu(nodeId);
  fireEvent.click(screen.getByRole("menuitem", { name }));
}

beforeAll(() => {
  if (!window.PointerEvent) {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("estimate tree context menu", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    pathnameMock.current = "/workshop/projects/project-1/estimates/kitchen";
    actionMocks.createEstimateNode.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue(fixtureTree());
  });

  it("opens compact Rename and Delete actions for Group Node and Area Node right-clicks without routing", async () => {
    renderTree();

    await openContextMenu("ground-floor");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    await openContextMenu("kitchen");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("selecting Rename converts only that row title into a focused inline input", async () => {
    renderTree();

    await chooseMenuItem("kitchen", "Rename");

    const input = screen.getByLabelText("Rename Kitchen") as HTMLInputElement;
    expect(input).toHaveValue("Kitchen");
    expect(screen.getByRole("button", { name: /Living Area/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm rename Kitchen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset rename Kitchen" })).toBeInTheDocument();
    await waitFor(() => expect(input.selectionStart).toBe(0));
    expect(input.selectionEnd).toBe("Kitchen".length);
    expect(input).toHaveFocus();
  });

  it("keeps rename active while the pointer moves outside the input", async () => {
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    const input = screen.getByLabelText("Rename Kitchen");
    fireEvent.change(input, { target: { value: "Chef Kitchen" } });
    fireEvent.mouseOver(screen.getByRole("button", { name: /Living Area/ }));
    fireEvent.mouseMove(document.body);

    expect(screen.getByLabelText("Rename Kitchen")).toHaveValue("Chef Kitchen");
    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();
  });

  it("reset button restores the original name without closing rename mode", async () => {
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    const input = screen.getByLabelText("Rename Kitchen");
    fireEvent.change(input, { target: { value: "Chef Kitchen" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset rename Kitchen" }));

    expect(screen.getByLabelText("Rename Kitchen")).toHaveValue("Kitchen");
    expect(screen.getByLabelText("Rename Kitchen")).toHaveFocus();
    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();
  });

  it("check button commits inline rename like Enter", async () => {
    actionMocks.renameEstimateNode.mockResolvedValue({ nodeId: "kitchen", name: "Chef Kitchen" });
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: " Chef Kitchen " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm rename Kitchen" }));

    expect(await screen.findByRole("button", { name: /Chef Kitchen/ })).toBeInTheDocument();
    await waitFor(() => expect(actionMocks.renameEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "kitchen", "Chef Kitchen"));
  });

  it("moving focus to the check control does not preempt the intended rename action", async () => {
    actionMocks.renameEstimateNode.mockResolvedValue({ nodeId: "kitchen", name: "Chef Kitchen" });
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    const input = screen.getByLabelText("Rename Kitchen");
    const confirm = screen.getByRole("button", { name: "Confirm rename Kitchen" });
    fireEvent.change(input, { target: { value: "Chef Kitchen" } });
    fireEvent.blur(input, { relatedTarget: confirm });

    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();
    fireEvent.click(confirm);

    await waitFor(() => expect(actionMocks.renameEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "kitchen", "Chef Kitchen"));
  });

  it("Escape cancels inline rename and restores the original row text", async () => {
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Chef Kitchen" } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Escape" });

    expect(screen.queryByLabelText("Rename Kitchen")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kitchen/ })).toBeInTheDocument();
    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();
  });

  it("Enter commits inline rename optimistically and calls the server action with a trimmed name", async () => {
    const pending = deferred<{ nodeId: string; name: string }>();
    actionMocks.renameEstimateNode.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: " Chef Kitchen " } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });

    expect(await screen.findByRole("button", { name: /Chef Kitchen/ })).toBeInTheDocument();
    await waitFor(() => expect(actionMocks.renameEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "kitchen", "Chef Kitchen"));
    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(renameTree(fixtureTree(), "kitchen", "Chef Kitchen")));
    expect(routerMock.refresh).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ nodeId: "kitchen", name: "Chef Kitchen" });
      await pending.promise;
    });
    expect(screen.getByRole("button", { name: /Chef Kitchen/ })).toBeInTheDocument();
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(renameTree(fixtureTree(), "kitchen", "Chef Kitchen"));
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("cancels in-flight area tree refetches before applying an optimistic rename", async () => {
    const staleFetch = deferred<EstimateTreeNode[]>();
    const pendingRename = deferred<{ nodeId: string; name: string }>();
    actionMocks.fetchEstimateTree.mockReturnValueOnce(staleFetch.promise);
    actionMocks.renameEstimateNode.mockReturnValueOnce(pendingRename.promise);
    const { queryClient } = renderTree();
    const refetchPromise = queryClient.refetchQueries({ queryKey: estimateQueryKeys.areaTree("estimate-1") }).catch(() => undefined);

    await waitFor(() => expect(actionMocks.fetchEstimateTree).toHaveBeenCalled());
    await chooseMenuItem("kitchen", "Rename");
    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Chef Kitchen" } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });
    expect(await screen.findByRole("button", { name: /Chef Kitchen/ })).toBeInTheDocument();

    await act(async () => {
      staleFetch.resolve(fixtureTree());
      await refetchPromise;
    });
    expect(screen.getByRole("button", { name: /Chef Kitchen/ })).toBeInTheDocument();
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(renameTree(fixtureTree(), "kitchen", "Chef Kitchen"));

    await act(async () => {
      pendingRename.resolve({ nodeId: "kitchen", name: "Chef Kitchen" });
      await pendingRename.promise;
    });
    expect(screen.getByRole("button", { name: /Chef Kitchen/ })).toBeInTheDocument();
  });

  it("shares optimistic rename state with sheet content through the area tree query cache", async () => {
    actionMocks.renameEstimateNode.mockResolvedValue({ nodeId: "kitchen", name: "Chef Kitchen" });
    renderTreeWithSheet();

    expect(screen.getByRole("region", { name: "Kitchen" })).toBeInTheDocument();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Chef Kitchen" } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });

    expect(await screen.findByRole("region", { name: "Chef Kitchen" })).toBeInTheDocument();
    expect(actionMocks.renameEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "kitchen", "Chef Kitchen");
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("blur commits changed inline rename values", async () => {
    actionMocks.renameEstimateNode.mockResolvedValue({ nodeId: "kitchen", name: "Prep Kitchen" });
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Prep Kitchen" } });
    fireEvent.blur(screen.getByLabelText("Rename Kitchen"));

    await waitFor(() => expect(actionMocks.renameEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "kitchen", "Prep Kitchen"));
  });

  it("empty rename keeps the input open and shows a compact error", async () => {
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "   " } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });

    expect(screen.getByLabelText("Rename Kitchen")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
    await waitFor(() => expect(screen.getByLabelText("Rename Kitchen")).toHaveFocus());
    fireEvent.blur(screen.getByLabelText("Rename Kitchen"));
    expect(screen.getByLabelText("Rename Kitchen")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
    expect(actionMocks.renameEstimateNode).not.toHaveBeenCalled();
  });

  it("rename failure rolls back tree and cache while keeping the attempted value in edit mode", async () => {
    const pending = deferred<{ nodeId: string; name: string }>();
    actionMocks.renameEstimateNode.mockReturnValue(pending.promise);
    const initialTree = fixtureTree();
    const { queryClient } = renderTree(initialTree);
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Bad Name" } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });

    expect(await screen.findByRole("button", { name: /Bad Name/ })).toBeInTheDocument();
    await act(async () => {
      pending.reject(new Error("Rename failed"));
      await pending.promise.catch(() => undefined);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Rename failed");
    expect(screen.getByLabelText("Rename Kitchen")).toHaveValue("Bad Name");
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
  });

  it("rename failure does not restore an older snapshot over a newer tree cache change", async () => {
    const pending = deferred<{ nodeId: string; name: string }>();
    actionMocks.renameEstimateNode.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Bad Name" } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });

    expect(await screen.findByRole("button", { name: /Bad Name/ })).toBeInTheDocument();
    const newerTree = deleteKitchenTree();
    act(() => {
      queryClient.setQueryData(estimateQueryKeys.areaTree("estimate-1"), newerTree);
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: /Bad Name/ })).not.toBeInTheDocument());

    await act(async () => {
      pending.reject(new Error("Rename failed"));
      await pending.promise.catch(() => undefined);
    });

    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(newerTree);
    expect(screen.queryByLabelText("Rename Kitchen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kitchen/ })).not.toBeInTheDocument();
  });

  it("disables Rename and Delete while another tree mutation is saving", async () => {
    const pending = deferred<{ nodeId: string; name: string }>();
    actionMocks.renameEstimateNode.mockReturnValue(pending.promise);
    renderTree();
    await chooseMenuItem("kitchen", "Rename");

    fireEvent.change(screen.getByLabelText("Rename Kitchen"), { target: { value: "Chef Kitchen" } });
    fireEvent.keyDown(screen.getByLabelText("Rename Kitchen"), { key: "Enter" });

    await screen.findByRole("button", { name: /Chef Kitchen/ });
    await openContextMenu("living");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveAttribute("data-disabled");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("data-disabled");

    await act(async () => {
      pending.resolve({ nodeId: "kitchen", name: "Chef Kitchen" });
      await pending.promise;
    });
  });

  it("selecting Delete opens confirmation instead of deleting immediately", async () => {
    renderTree();
    await chooseMenuItem("kitchen", "Delete");

    expect(screen.getByRole("dialog", { name: "Delete Kitchen" })).toBeInTheDocument();
    expect(screen.getByText("This removes the area and its estimate rows.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kitchen/ })).toBeInTheDocument();
    expect(actionMocks.deleteEstimateNode).not.toHaveBeenCalled();
  });

  it("Group Node delete confirmation warns about child groups, child areas, and descendant rows", async () => {
    renderTree();
    await chooseMenuItem("ground-floor", "Delete");

    expect(screen.getByText("This removes the group, child groups, child areas, and descendant estimate rows.")).toBeInTheDocument();
  });

  it("confirmed Group Node delete removes descendant rows before the server action resolves", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[]; deletedNodeIds: string[]; fallbackNodeId: string | null }>();
    actionMocks.deleteEstimateNode.mockReturnValue(pending.promise);
    renderTree();
    await chooseMenuItem("ground-floor", "Delete");

    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Ground Floor" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Ground Floor/ })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Kitchen/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Living Area/ })).not.toBeInTheDocument();
    await waitFor(() => expect(actionMocks.deleteEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "ground-floor"));

    await act(async () => {
      pending.resolve({ tree: fixtureTree(), deletedNodeIds: ["ground-floor", "kitchen", "living"], fallbackNodeId: "site-works" });
      await pending.promise;
    });
  });

  it("confirmed delete removes the node before the server action resolves and never refreshes", async () => {
    const pending = deferred<{ tree: EstimateTreeNode[]; deletedNodeIds: string[]; fallbackNodeId: string | null }>();
    actionMocks.deleteEstimateNode.mockReturnValue(pending.promise);
    const { queryClient } = renderTree();
    await chooseMenuItem("front-yard", "Delete");

    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Front Yard" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Front Yard/ })).not.toBeInTheDocument());
    await waitFor(() => expect(actionMocks.deleteEstimateNode).toHaveBeenCalledWith("project-1", "estimate-1", "front-yard"));
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(JSON.stringify(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1")))).not.toContain("front-yard");

    await act(async () => {
      pending.resolve({ tree: fixtureTree(), deletedNodeIds: ["front-yard"], fallbackNodeId: "site-works" });
      await pending.promise;
    });
  });

  it("deleting the selected node updates selection and repairs the route with router.replace", async () => {
    actionMocks.deleteEstimateNode.mockResolvedValue({ tree: deleteKitchenTree(), deletedNodeIds: ["kitchen"], fallbackNodeId: "living" });
    renderTree();
    await chooseMenuItem("kitchen", "Delete");

    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Kitchen" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Kitchen/ })).not.toBeInTheDocument());
    await waitFor(() => expect(treeNodeButton("living")).toHaveAttribute("aria-current", "page"));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/living"));
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("repairs delete routing from the current pathname when server props are stale", async () => {
    pathnameMock.current = "/workshop/projects/project-1/estimates/living";
    actionMocks.deleteEstimateNode.mockResolvedValue({ tree: deleteLivingTree(), deletedNodeIds: ["living"], fallbackNodeId: "kitchen" });
    renderTree(fixtureTree(), "kitchen");
    await chooseMenuItem("living", "Delete");

    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Living Area" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Living Area/ })).not.toBeInTheDocument());
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/kitchen"));
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("reconciles delete route repair with the server-confirmed fallback when the client tree was stale", async () => {
    const confirmedTree = deleteKitchenAndLivingTree();
    actionMocks.deleteEstimateNode.mockResolvedValue({ tree: confirmedTree, deletedNodeIds: ["kitchen", "living"], fallbackNodeId: "front-yard" });
    const { queryClient } = renderTree();
    await chooseMenuItem("kitchen", "Delete");

    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Kitchen" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/living"));
    await waitFor(() => expect(routerMock.replace).toHaveBeenLastCalledWith("/workshop/projects/project-1/estimates/front-yard"));
    await waitFor(() => expect(treeNodeButton("front-yard")).toHaveAttribute("aria-current", "page"));
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(confirmedTree);
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("delete failure rolls back visible tree, selection, and repaired route", async () => {
    actionMocks.deleteEstimateNode.mockRejectedValue(new Error("Delete failed"));
    const initialTree = fixtureTree();
    const { queryClient } = renderTree(initialTree);
    await chooseMenuItem("kitchen", "Delete");

    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Kitchen" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Kitchen/ })).not.toBeInTheDocument());
    await screen.findByText("Delete failed");
    expect(screen.getByRole("button", { name: /Kitchen/ })).toHaveAttribute("aria-current", "page");
    expect(queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"))).toEqual(initialTree);
    expect(routerMock.replace).toHaveBeenNthCalledWith(1, "/workshop/projects/project-1/estimates/living");
    expect(routerMock.replace).toHaveBeenNthCalledWith(2, "/workshop/projects/project-1/estimates/kitchen");
  });

  it("ports menu content outside the clipped sidebar container", async () => {
    const { container } = renderTree();

    const menu = await openContextMenu("kitchen");

    expect(menu).toHaveClass("z-[1050]");
    expect(container.querySelector("[data-estimate-tree-context-menu='true']")).toBeNull();
  });

  it("keeps primary left-click navigation intact", async () => {
    const user = userEvent.setup();
    renderTree();

    await user.click(treeNodeButton("living"));

    expect(routerMock.push).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/living");
  });
});
