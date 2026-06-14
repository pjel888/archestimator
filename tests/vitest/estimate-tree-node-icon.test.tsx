import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { ToastProvider } from "@/components/ui/toast";

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  usePathname: () => "/workshop/projects/project-1/estimates/kitchen",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  fetchEstimateTree: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

const oneItem = { ...estimateLibraryItems[0], id: "icon-test-item-1" };

/** Tree with two top-level leaf nodes: "Filled" has items, "Empty" has none. */
function iconTestTree(): EstimateTreeNode[] {
  return [
    {
      id: "filled-node",
      name: "Filled",
      kind: "area",
      total: "₱0.00",
      estimateRowItems: [oneItem],
      children: [],
    },
    {
      id: "empty-node",
      name: "Empty",
      kind: "area",
      total: "₱0.00",
      estimateRowItems: [],
      children: [],
    },
  ];
}

function renderTree(nodes: EstimateTreeNode[], selectedNodeId: string | null = "filled-node") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EstimateSheetTree
          projectId="project-1"
          estimateId="estimate-1"
          projectName="Icon Test Project"
          selectedNodeId={selectedNodeId}
          nodes={nodes}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * The "has components" cue is an occupancy dot (after the caret, before the
 * label) — the node circle was removed. Returns true iff the row's dot is
 * orange (occupied) rather than muted.
 */
function rowDotIsOrange(nodeId: string): boolean {
  const row = document.querySelector(`[data-tree-row="${nodeId}"]`);
  if (!row) throw new Error(`Tree row for node "${nodeId}" not found in DOM.`);
  const dot = row.querySelector("[data-occupancy-dot]");
  if (!dot) throw new Error(`No occupancy dot found in row for node "${nodeId}".`);
  return (dot.getAttribute("class") ?? "").includes("bg-orange-600");
}

describe("estimate tree node occupancy cue (orange dot, Req 4)", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("renders an orange dot for a leaf node that directly holds components", () => {
    renderTree(iconTestTree());
    expect(rowDotIsOrange("filled-node")).toBe(true);
  });

  it("renders a muted dot for a node with no direct components", () => {
    renderTree(iconTestTree());
    expect(rowDotIsOrange("empty-node")).toBe(false);
  });

  it("does not orange a parent whose CHILDREN have components but itself does not (direct-only)", () => {
    const parentWithItemOnlyInChild: EstimateTreeNode[] = [
      {
        id: "parent-node",
        name: "Parent",
        kind: "group",
        total: "₱0.00",
        estimateRowItems: [], // no direct items
        children: [
          {
            id: "child-node",
            name: "Child",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [oneItem], // item lives here, NOT in parent
            children: [],
          },
        ],
      },
    ];
    renderTree(parentWithItemOnlyInChild, "parent-node");

    // Parent (folder, no direct components) → muted dot.
    expect(rowDotIsOrange("parent-node")).toBe(false);

    const parentRow = document.querySelector(`[data-tree-row="parent-node"]`);
    if (!parentRow) throw new Error("parent-node row not found");
    if (!document.querySelector(`[data-tree-row="child-node"]`)) {
      const toggleBtn = parentRow.querySelector<HTMLElement>(
        "button[aria-label='Expand'], button[aria-label='Collapse']",
      );
      if (!toggleBtn) throw new Error("Expand/Collapse button not found inside parent-node row");
      toggleBtn.click();
    }

    // Child (leaf, has components) → orange dot.
    expect(rowDotIsOrange("child-node")).toBe(true);
  });

  it("renders an orange 'Add Area' toolbar button (icon swap to Log keeps the orange styling)", () => {
    renderTree(iconTestTree());
    const addAreaBtn = screen.getByRole("button", { name: "Add Area" });
    expect(addAreaBtn).toBeInTheDocument();
    expect(addAreaBtn.className).toMatch(/orange/);
  });
});
