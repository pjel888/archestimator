import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { buildEstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

const subtreeClientMocks = vi.hoisted(() => ({
  loadEstimateNodeSubtree: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useParams: () => ({ projectId: "project-1", nodeId: "estimate-1" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/estimates/subtree-client", () => subtreeClientMocks);

function node(input: Partial<EstimateTreeNode> & Pick<EstimateTreeNode, "id" | "name">): EstimateTreeNode {
  return {
    kind: "area",
    total: "₱0.00",
    children: [],
    estimateRowItems: [],
    ...input,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function mockDataTransfer() {
  const transferStore = new Map<string, string>();
  return {
    types: [] as string[],
    dropEffect: "move",
    effectAllowed: "all",
    getData: vi.fn((key: string) => transferStore.get(key) ?? ""),
    setData: vi.fn((key: string, value: string) => {
      transferStore.set(key, value);
    }),
    setDragImage: vi.fn(),
  };
}

function renderTree(nodes: EstimateTreeNode[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetTree
        projectId="project-1"
        estimateId="estimate-1"
        projectName="Project"
        selectedNodeId={null}
        nodes={nodes}
        loadLimitState={{
          maxNodeCount: 1,
          maxRowItemCount: 5000,
          fetchedNodeCount: 2,
          fetchedRowItemCount: 0,
          didExceedNodeLimit: true,
          didExceedRowItemLimit: false,
        }}
        disableRouteSync
      />
    </QueryClientProvider>,
  );
}

describe("estimate tree lazy branch hydration", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    actionMocks.fetchEstimateTree.mockResolvedValue([]);
  });

  it("fetches and merges a partial branch when the user expands it", async () => {
    const partialRoot = node({ id: "partial-root", name: "Partial root" });
    const loadedRoot = node({
      id: "partial-root",
      name: "Partial root",
      childrenLoaded: true,
      children: [node({ id: "loaded-child", name: "Loaded child" })],
    });
    subtreeClientMocks.loadEstimateNodeSubtree.mockImplementation(({ requestId }) =>
      Promise.resolve(buildEstimateTreeSubtreePayload({
        estimateId: "estimate-1",
        rootNodeId: "partial-root",
        parentNodeId: null,
        requestId,
        fetchedAt: "2026-06-26T00:00:00.000Z",
        tree: [loadedRoot],
        completeness: {
          childrenLoaded: true,
          rowItemsLoaded: true,
          didExceedNodeLimit: false,
          didExceedRowItemLimit: false,
        },
      })),
    );

    renderTree([partialRoot]);

    const row = document.querySelector<HTMLElement>("[data-tree-row='partial-root']");
    if (!row) throw new Error("partial-root row not found");
    fireEvent.click(row.querySelector<HTMLElement>("button[aria-label='Collapse']")!);
    fireEvent.click(row.querySelector<HTMLElement>("button[aria-label='Expand']")!);

    await waitFor(() => expect(subtreeClientMocks.loadEstimateNodeSubtree).toHaveBeenCalledTimes(1));
    expect(subtreeClientMocks.loadEstimateNodeSubtree).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: null,
      nodeId: "partial-root",
      requestId: expect.stringContaining("estimate-1:legacy:partial-root:"),
    }));
    expect(await screen.findByText("Loaded child")).toBeInTheDocument();
  });

  it("blocks structural drag while a partial branch is still loading", async () => {
    const pendingLoad = deferred<ReturnType<typeof buildEstimateTreeSubtreePayload>>();
    const partialRoot = node({
      id: "partial-root",
      name: "Partial root",
      childrenLoaded: false,
    });
    const mover = node({ id: "mover", name: "Mover" });
    subtreeClientMocks.loadEstimateNodeSubtree.mockReturnValue(pendingLoad.promise);
    actionMocks.reorderEstimateTreeNodes.mockResolvedValue({
      tree: [{ ...partialRoot, children: [mover] }],
    });
    renderTree([partialRoot, mover]);

    const partialRow = document.querySelector<HTMLElement>("[data-tree-row='partial-root']");
    const moverHandle = document.querySelector<HTMLElement>("[data-tree-drag-handle='mover']");
    if (!partialRow || !moverHandle) throw new Error("Lazy-drop fixture rows not found.");
    fireEvent.click(partialRow.querySelector<HTMLElement>("button[aria-label='Collapse']")!);
    fireEvent.click(partialRow.querySelector<HTMLElement>("button[aria-label='Expand']")!);
    expect(await screen.findByText("Loading...")).toBeInTheDocument();

    expect(moverHandle).toHaveAttribute("draggable", "false");
    expect(moverHandle).toHaveAttribute("aria-disabled", "true");
    expect(moverHandle).toHaveAttribute("data-tree-drag-disabled-reason", "Load the complete tab before moving nodes.");

    const dataTransfer = mockDataTransfer();
    fireEvent.dragStart(moverHandle, { dataTransfer });
    fireEvent.dragOver(partialRow, { dataTransfer });
    fireEvent.drop(partialRow, { dataTransfer });

    expect(partialRow).not.toHaveAttribute("data-tree-drop-state", "valid");
    expect(actionMocks.reorderEstimateTreeNodes).not.toHaveBeenCalled();
  });
});
