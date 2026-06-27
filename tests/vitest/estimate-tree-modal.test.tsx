import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { sampleEstimateTree } from "@/components/workshop/estimate-tree-data";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { ToastProvider } from "@/components/ui/toast";

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
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

let createdNodeSequence = 1;

describe("estimate sheet tree add-node toolbar flow", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue(sampleEstimateTree);
    actionMocks.createEstimateNode.mockImplementation((_projectId: string, _estimateId: string, formData: FormData) =>
      Promise.resolve({
        nodeId: `server-${String(formData.get("kind"))}-${createdNodeSequence++}`,
        name: String(formData.get("name") ?? ""),
        kind: String(formData.get("kind") ?? "group"),
        parentId: (formData.get("parentId") as string | null) ?? null,
      }),
    );
  });

  function renderTree(nodes = sampleEstimateTree, selectedNodeId: string | null = "kitchen") {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const view = render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EstimateSheetTree
            projectId="project-1"
            estimateId="estimate-1"
            projectName="Modern Bungalow"
            selectedNodeId={selectedNodeId}
            nodes={nodes}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    return { ...view, queryClient };
  }

  function submittedCreateFormData() {
    const call = actionMocks.createEstimateNode.mock.calls.at(-1);
    if (!call) throw new Error("createEstimateNode was not called.");
    return call[2] as FormData;
  }

  function getOptimisticTreeRow(kind: "group" | "area") {
    const row = document.querySelector(`[data-tree-row^="optimistic-${kind}-"]`);
    if (!(row instanceof HTMLElement)) {
      throw new Error(`Optimistic ${kind} row was not rendered.`);
    }
    return row;
  }

  it("cleans up the offset tree width variable when the estimate tree unmounts", () => {
    window.localStorage.setItem("estimate_sheet_tree_width", "272");
    document.documentElement.style.setProperty("--estimate-tree-panel-width", "300px");

    const { unmount } = renderTree();

    expect(document.documentElement.style.getPropertyValue("--estimate-tree-panel-width")).toBe("376px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--estimate-tree-panel-width")).toBe("300px");
  });

  it("renders a single icon-only Add Branch tool (no Group/Node split) without plus overlays", () => {
    const { container } = renderTree();

    expect(screen.queryByRole("heading", { name: "Tree" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search Tree")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search Tree")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show tree search" })).toBeInTheDocument();
    // P4: one neutral "Add Area" replaces the old "Add Group" + "Add Node" pair.
    expect(
      Array.from(screen.getByLabelText("Tree tools").querySelectorAll("button")).map((button) => button.getAttribute("aria-label")),
    // A4/D8: handler-gated — re-wired in Phase D; D3: filterSlot injects "Filter tree"
    ).toEqual(["Show tree search", "Filter tree", "Expand all tree", "Collapse all tree", "Add Branch"]);
    expect(screen.getByRole("button", { name: "Expand all tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse all tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Branch" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Node" })).not.toBeInTheDocument();
    // Icon-only (no visible text), single glyph.
    expect(screen.getByRole("button", { name: "Add Branch" })).not.toHaveTextContent("Add Area");
    expect(screen.getByRole("button", { name: "Add Branch" }).querySelectorAll("svg")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Add tree" })).not.toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Bulk actions" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show tree search" }));
    expect(document.querySelector("[data-tree-search-panel='true']")).toHaveClass("absolute", "left-0", "right-0", "top-[40px]");
    expect(screen.getByLabelText("Search Tree")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search Tree")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(document.querySelector("[data-tree-search-panel='true']")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search Tree")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));

    expect(screen.queryByRole("dialog", { name: "Add estimate tree node" })).not.toBeInTheDocument();
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });

  it("optimistically shows a new Area immediately and mirrors it into the tree cache", () => {
    actionMocks.createEstimateNode.mockReturnValue(new Promise(() => {}));
    // With a group selected, Add Area creates an `area` child (write-valid).
    const { queryClient } = renderTree(sampleEstimateTree, "main-house");

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));

    expect(getOptimisticTreeRow("area")).toBeInTheDocument();
    expect(screen.getByLabelText("Rename New Area")).toHaveValue("New Area");
    expect(screen.getByRole("status")).toHaveTextContent("Adding area");
    const optimisticTree = queryClient.getQueryData(estimateQueryKeys.areaTree("estimate-1"));
    expect(JSON.stringify(optimisticTree)).toContain("New Area");
  });

  it("scrolls a newly created Area row into view", async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    actionMocks.createEstimateNode.mockReturnValue(new Promise(() => {}));

    try {
      renderTree(sampleEstimateTree, "main-house");

      fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" }));
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("rolls back an optimistic Add Area when the server action fails", async () => {
    actionMocks.createEstimateNode.mockRejectedValue(new Error("Create failed"));
    renderTree(sampleEstimateTree, "main-house");

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));

    expect(getOptimisticTreeRow("area")).toBeInTheDocument();
    expect(screen.getByLabelText("Rename New Area")).toHaveValue("New Area");
    expect(await screen.findByText("Create failed")).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(`[data-estimate-tree-node-id^="optimistic-area-"]`)).toBeNull());
  });

  it("adds an Area child under the selected group, no kind choice or gate", async () => {
    // Selecting a group, Add Area creates an `area` child named "New Area".
    renderTree(sampleEstimateTree, "main-house");

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));
    const formData = submittedCreateFormData();
    expect(actionMocks.createEstimateNode).toHaveBeenLastCalledWith("project-1", "estimate-1", expect.any(FormData));
    expect(formData.get("kind")).toBe("area");
    expect(formData.get("name")).toBe("New Area");
    expect(formData.get("parentId")).toBe("main-house");
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });

  it("Add Area adds a child area under a selected row-owning node (former area), no error (P6)", () => {
    // P6 single-node model: ANY selected node is a valid create parent. With a
    // row-owning former-"area" selected, "Add Area" creates an `area` CHILD of
    // it (no "select a group first" error, no root fallback, no wrap).
    renderTree([
      {
        id: "general-requirements",
        name: "General Requirements",
        kind: "group",
        total: "PHP 0.00",
        children: [
          {
            id: "mobilization",
            name: "Mobilization + Demobilization",
            kind: "area",
            total: "PHP 0.00",
            children: [],
          },
        ],
      },
    ], "mobilization");

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));
    expect(screen.queryByText("you must select a group first before adding an area node")).not.toBeInTheDocument();
    const formData = submittedCreateFormData();
    expect(formData.get("parentId")).toBe("mobilization");
    expect(formData.get("kind")).toBe("area");
    expect(formData.get("name")).toBe("New Area");
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });

  it("Add Area creates a write-valid root node from an empty tree (no error)", () => {
    renderTree([], null);

    fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));
    expect(screen.queryByText("you must select a group first before adding an area node")).not.toBeInTheDocument();
    const formData = submittedCreateFormData();
    expect(formData.get("parentId")).toBeNull();
    expect(formData.get("name")).toBe("New Area");
    expect(actionMocks.createEstimateNode).toHaveBeenCalledTimes(1);
  });
});
