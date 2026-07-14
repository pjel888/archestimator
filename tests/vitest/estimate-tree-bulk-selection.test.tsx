import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { ToastProvider } from "@/components/ui/toast";
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
  deleteEstimateNodesBulk: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  restoreDeletedEstimateNodes: vi.fn(),
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
            { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
            { id: "living", name: "Living Area", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
          ],
        },
      ],
    },
  ];
}

function renderTree(
  nodes = fixtureTree(),
  selectedNodeId: string | null = "kitchen",
  options: { activeTabId?: string; initialTabId?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EstimateSheetTree
          projectId="project-1"
          estimateId="estimate-1"
          activeTabId={options.activeTabId}
          initialTabId={options.initialTabId}
          projectName="Modern Bungalow"
          selectedNodeId={selectedNodeId}
          nodes={nodes}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function treeNode(id: string) {
  const element = document.querySelector(`[data-tree-row="${id}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tree node ${id}`);
  return element;
}

describe("estimate tree bulk selection", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.deleteEstimateNodesBulk.mockReset();
    actionMocks.fetchEstimateTabTree.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.restoreDeletedEstimateNodes.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.fetchEstimateTabTree.mockResolvedValue({ tree: fixtureTree(), loadLimitState: undefined });
    actionMocks.fetchEstimateTree.mockResolvedValue(fixtureTree());
  });

  it("checkbox click selects a node without navigating or changing route selection", async () => {
    const user = userEvent.setup();
    renderTree();

    const livingCheckbox = screen.getByRole("checkbox", { name: "Select Living Area" });
    await user.click(livingCheckbox);

    expect(livingCheckbox).toBeChecked();
    expect(treeNode("kitchen")).toHaveAttribute("aria-current", "page");
    expect(treeNode("living")).not.toHaveAttribute("aria-current");
    expect(routerMock.push).not.toHaveBeenCalled();
    const dock = await screen.findByRole("region", { name: "Bulk action toolbar" });
    await waitFor(() => expect(within(dock).getByLabelText("1 Area selected")).toHaveTextContent("1"));
    expect(within(dock).getByRole("button", { name: "Delete selected" })).toBeInTheDocument();
    expect(within(dock).getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });

  it("checking a parent selects descendants and renders the parent indeterminate after one child is cleared", async () => {
    renderTree();

    const groundFloorCheckbox = screen.getByRole("checkbox", { name: "Select Ground Floor" });
    fireEvent.click(groundFloorCheckbox);

    expect(groundFloorCheckbox).toHaveAttribute("data-selection-checkbox-tone", "blue");
    expect(groundFloorCheckbox).toHaveAttribute("data-selection-checkbox-state", "checked");
    expect(groundFloorCheckbox).toHaveClass("border-blue-500", "bg-blue-50");
    expect(groundFloorCheckbox.parentElement?.querySelector('[data-selection-checkbox-icon="checked"]')).toHaveClass("text-blue-700");
    expect(treeNode("ground-floor")).toHaveClass("bg-blue-50/70");
    expect(screen.getByRole("checkbox", { name: "Select Kitchen" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Living Area" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Kitchen" }));

    await waitFor(() => expect(groundFloorCheckbox).toHaveAttribute("aria-checked", "mixed"));
    expect(groundFloorCheckbox).toHaveAttribute("data-selection-checkbox-state", "mixed");
    expect(groundFloorCheckbox).toHaveClass("border-blue-500", "bg-blue-50");
    expect(groundFloorCheckbox.parentElement?.querySelector('[data-selection-checkbox-icon="mixed"]')).toHaveClass("text-blue-700");
    expect(treeNode("ground-floor")).toHaveClass("bg-blue-50/40");
  });

  it("bulk deletes selected nodes with optimistic removal and server confirmation", async () => {
    const confirmedTree: EstimateTreeNode[] = [
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
              { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
            ],
          },
        ],
      },
    ];
    actionMocks.deleteEstimateNodesBulk.mockResolvedValue({
      eventId: "bulk-delete-event-1",
      tree: confirmedTree,
      deletedNodeIds: ["living"],
      fallbackNodeId: "kitchen",
    });
    renderTree(fixtureTree(), "kitchen", { activeTabId: "tab-2", initialTabId: "tab-2" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Living Area" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    const dialog = screen.getByRole("dialog", { name: "Delete 1 selected Area" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(actionMocks.deleteEstimateNodesBulk).toHaveBeenCalledWith("project-1", "estimate-1", ["living"], "tab-2"));
    await waitFor(() => expect(document.querySelector('[data-tree-row="living"]')).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Bulk action toolbar" })).not.toBeInTheDocument();
  });

  it("restores bulk-deleted nodes from Undo with the active tab id", async () => {
    const user = userEvent.setup();
    const confirmedTree: EstimateTreeNode[] = [
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
              { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
            ],
          },
        ],
      },
    ];
    actionMocks.deleteEstimateNodesBulk.mockResolvedValue({
      eventId: "bulk-delete-event-1",
      tree: confirmedTree,
      deletedNodeIds: ["living"],
      fallbackNodeId: "kitchen",
    });
    actionMocks.restoreDeletedEstimateNodes.mockResolvedValue({
      eventId: "restore-event-1",
      sourceEventId: "bulk-delete-event-1",
      restoredNodeIds: ["living"],
      restoredRootNodeIds: ["living"],
      restoredNodeCount: 1,
      restoredRowIds: [],
      restoredRowCount: 0,
      tree: fixtureTree(),
    });
    renderTree(fixtureTree(), "kitchen", { activeTabId: "tab-2", initialTabId: "tab-2" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Living Area" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete 1 selected Area" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(document.querySelector('[data-tree-row="living"]')).not.toBeInTheDocument());
    await user.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => expect(actionMocks.restoreDeletedEstimateNodes).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      sourceEventId: "bulk-delete-event-1",
      nodeIds: ["living"],
      targetTabId: "tab-2",
    }));
    await waitFor(() => expect(treeNode("living")).toBeInTheDocument());
  });

  it("keeps bulk-deleted nodes removed and reports an error when Undo restore fails", async () => {
    const user = userEvent.setup();
    const confirmedTree: EstimateTreeNode[] = [
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
              { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
            ],
          },
        ],
      },
    ];
    actionMocks.deleteEstimateNodesBulk.mockResolvedValue({
      eventId: "bulk-delete-event-1",
      tree: confirmedTree,
      deletedNodeIds: ["living"],
      fallbackNodeId: "kitchen",
    });
    actionMocks.restoreDeletedEstimateNodes.mockRejectedValue(new Error("Restore provider unavailable."));
    renderTree(fixtureTree(), "kitchen", { activeTabId: "tab-2", initialTabId: "tab-2" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Living Area" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete 1 selected Area" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(document.querySelector('[data-tree-row="living"]')).not.toBeInTheDocument());

    await user.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => expect(actionMocks.restoreDeletedEstimateNodes).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't restore the deleted Areas. Try again.");
    expect(document.querySelector('[data-tree-row="living"]')).not.toBeInTheDocument();
    expect(screen.queryByText("1 Area restored.")).not.toBeInTheDocument();
  });

  it("bulk delete deduplicates parent and child selections before calling the server", async () => {
    actionMocks.deleteEstimateNodesBulk.mockResolvedValue({
      eventId: "bulk-delete-event-1",
      tree: [
        {
          id: "project-scope",
          name: "Project Scope",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
      deletedNodeIds: ["ground-floor", "kitchen", "living"],
      fallbackNodeId: "project-scope",
    });
    renderTree();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Living Area" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ground Floor" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    const dialog = screen.getByRole("dialog", { name: "Delete 3 selected Areas" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(actionMocks.deleteEstimateNodesBulk).toHaveBeenCalledWith("project-1", "estimate-1", ["ground-floor"], undefined));
  });
});
