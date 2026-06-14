/**
 * D3 (Req 10 left): Structured filter for the left estimate tree.
 *
 * Tests:
 * - "Filter tree" button appears in the toolbar (filterSlot wired)
 * - No "Group tree" button (D6: Group omitted — hierarchy IS the grouping)
 * - filterEstimateTreeByStructure: hideEmptyAreas prunes nodes with no items anywhere
 * - UI: toggle "Hide empty areas" hides empty area rows; toggling off restores them
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { ToastProvider } from "@/components/ui/toast";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

// ---------------------------------------------------------------------------
// Mocks (mirror estimate-tree-modal.test.tsx pattern)
// ---------------------------------------------------------------------------

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  fetchEstimateTree: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  usePathname: () => "/workshop/projects/project-1/estimates/estimate-1",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

// ---------------------------------------------------------------------------
// Minimal fixture tree:
//   Filled Area — has a direct estimateRowItem
//   Empty Area  — no items, no item-bearing descendants
//   Mixed Parent — has an Empty child and a Filled child (so it is NOT empty)
// ---------------------------------------------------------------------------

const filledItem = {
  id: "item-1",
  material: "Paint",
  description: "",
  supplier: null,
  source: "manual" as const,
  unit: "sqm",
  itemCost: 100,
  quantity: 1,
  miscCost: 0,
  total: "₱100.00",
  category: null,
  discipline: null,
  designation: null,
  pricingSource: null,
  pricingDate: null,
  imageUrl: null,
  brand: null,
  libraryId: null,
};

const filledArea: EstimateTreeNode = {
  id: "filled-area",
  name: "Filled Area",
  kind: "area",
  total: "₱100.00",
  estimateRowItems: [filledItem],
  children: [],
};

const emptyArea: EstimateTreeNode = {
  id: "empty-area",
  name: "Empty Area",
  kind: "area",
  total: "₱0.00",
  estimateRowItems: [],
  children: [],
};

// A parent whose only filled child keeps the parent from being pruned
const mixedParent: EstimateTreeNode = {
  id: "mixed-parent",
  name: "Mixed Parent",
  kind: "area",
  total: "₱100.00",
  estimateRowItems: [],
  children: [
    { id: "mixed-empty-child", name: "Empty Child", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
    { id: "mixed-filled-child", name: "Filled Child", kind: "area", total: "₱100.00", estimateRowItems: [filledItem], children: [] },
  ],
};

// A totally empty subtree (parent + child both empty)
const emptyParentWithEmptyChild: EstimateTreeNode = {
  id: "all-empty-parent",
  name: "All Empty Parent",
  kind: "area",
  total: "₱0.00",
  estimateRowItems: [],
  children: [
    { id: "all-empty-child", name: "All Empty Child", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
  ],
};

const testTree: EstimateTreeNode[] = [filledArea, emptyArea, mixedParent, emptyParentWithEmptyChild];

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderTree(nodes = testTree, selectedNodeId = "filled-area") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EstimateSheetTree
          projectId="project-1"
          estimateId="estimate-1"
          projectName="Test Project"
          selectedNodeId={selectedNodeId}
          nodes={nodes}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("D3 — Estimate tree structured filter", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    actionMocks.createEstimateNode.mockReset();
    actionMocks.deleteEstimateNode.mockReset();
    actionMocks.fetchEstimateTree.mockReset();
    actionMocks.renameEstimateNode.mockReset();
    actionMocks.reorderEstimateTreeNodes.mockReset();
    actionMocks.fetchEstimateTree.mockResolvedValue(testTree);
  });

  it("toolbar has Filter button but NO Group button (D6)", () => {
    renderTree();

    // D3: filterSlot injects a "Filter tree" button into the toolbar
    expect(screen.getByRole("button", { name: "Filter tree" })).toBeInTheDocument();

    // D6: no Group button — Area hierarchy IS the grouping
    expect(screen.queryByRole("button", { name: "Group tree" })).not.toBeInTheDocument();
  });

  it("toolbar button order is: Show search → Filter tree → Expand all → Collapse all → Add Area", () => {
    renderTree();

    const toolbarButtons = Array.from(
      screen.getByLabelText("Tree tools").querySelectorAll("button"),
    ).map((btn) => btn.getAttribute("aria-label"));

    expect(toolbarButtons).toEqual([
      "Show tree search",
      "Filter tree",
      "Expand all tree",
      "Collapse all tree",
      "Add Area",
    ]);
  });

  it("Filter trigger is not pressed when no filters are active", () => {
    renderTree();
    const filterBtn = screen.getByRole("button", { name: "Filter tree" });
    expect(filterBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking Filter tree opens the filter popover", () => {
    renderTree();

    expect(screen.queryByRole("checkbox", { name: /hide empty areas/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter tree" }));

    expect(screen.getByRole("checkbox", { name: /hide empty areas/i })).toBeInTheDocument();
  });

  it("toggling Hide empty areas prunes nodes with no items anywhere, keeps filled nodes", () => {
    renderTree();

    // Before filter: all top-level nodes visible
    expect(screen.getByText("Filled Area")).toBeInTheDocument();
    expect(screen.getByText("Empty Area")).toBeInTheDocument();
    expect(screen.getByText("Mixed Parent")).toBeInTheDocument();
    expect(screen.getByText("All Empty Parent")).toBeInTheDocument();

    // Open filter popover and toggle on
    fireEvent.click(screen.getByRole("button", { name: "Filter tree" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /hide empty areas/i }));

    // Empty Area has no items → pruned
    expect(screen.queryByText("Empty Area")).not.toBeInTheDocument();
    // All Empty Parent (and its child) have no items → pruned
    expect(screen.queryByText("All Empty Parent")).not.toBeInTheDocument();
    expect(screen.queryByText("All Empty Child")).not.toBeInTheDocument();

    // Filled Area has items → kept
    expect(screen.getByText("Filled Area")).toBeInTheDocument();
    // Mixed Parent has a filled descendant → kept
    expect(screen.getByText("Mixed Parent")).toBeInTheDocument();
    // Empty Child inside Mixed Parent is also pruned (no items in its subtree)
    expect(screen.queryByText("Empty Child")).not.toBeInTheDocument();
    // Filled Child inside Mixed Parent is kept
    expect(screen.getByText("Filled Child")).toBeInTheDocument();
  });

  it("toggling Hide empty areas off restores all nodes", () => {
    renderTree();

    // Enable filter
    fireEvent.click(screen.getByRole("button", { name: "Filter tree" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /hide empty areas/i }));
    expect(screen.queryByText("Empty Area")).not.toBeInTheDocument();

    // Disable filter
    fireEvent.click(screen.getByRole("checkbox", { name: /hide empty areas/i }));
    expect(screen.getByText("Empty Area")).toBeInTheDocument();
    expect(screen.getByText("All Empty Parent")).toBeInTheDocument();
  });

  it("Filter trigger shows aria-pressed=true when hideEmptyAreas is active", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "Filter tree" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /hide empty areas/i }));

    const filterBtn = screen.getByRole("button", { name: "Filter tree" });
    expect(filterBtn).toHaveAttribute("aria-pressed", "true");
  });
});
