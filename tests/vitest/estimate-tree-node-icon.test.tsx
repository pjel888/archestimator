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
 * Return the Circle SVG icon inside the named tree row.
 * SVG elements have `className` as an SVGAnimatedString — use `.baseVal` for the string value.
 */
function getRowIconClass(nodeId: string): string {
  const row = document.querySelector(`[data-tree-row="${nodeId}"]`);
  if (!row) throw new Error(`Tree row for node "${nodeId}" not found in DOM.`);
  const svg = row.querySelector<SVGElement>("svg[aria-hidden='true']");
  if (!svg) throw new Error(`No aria-hidden SVG icon found in row for node "${nodeId}".`);
  return svg.getAttribute("class") ?? svg.className.baseVal ?? "";
}

describe("estimate tree node icon occupancy (B1, Req 4)", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("renders an orange icon for a node that directly holds items", () => {
    renderTree(iconTestTree());
    expect(getRowIconClass("filled-node")).toMatch(/text-orange-600/);
  });

  it("renders a tertiary (muted) icon for a node with no direct items", () => {
    renderTree(iconTestTree());
    const cls = getRowIconClass("empty-node");
    expect(cls).toMatch(/text-tertiary/);
    expect(cls).not.toMatch(/text-orange-600/);
  });

  it("does not show orange for a node whose CHILDREN have items but the node itself does not (D3: direct-only, O(1))", () => {
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

    // Parent row is present in the DOM
    const parentCls = getRowIconClass("parent-node");
    expect(parentCls).toMatch(/text-tertiary/);
    expect(parentCls).not.toMatch(/text-orange-600/);

    // Ensure the child row is visible — expand if collapsed, or it may already be expanded
    const parentRow = document.querySelector(`[data-tree-row="parent-node"]`);
    if (!parentRow) throw new Error("parent-node row not found");

    // If child is not yet in DOM, click the expand/collapse toggle in the parent row
    if (!document.querySelector(`[data-tree-row="child-node"]`)) {
      const toggleBtn = parentRow.querySelector<HTMLElement>(
        "button[aria-label='Expand'], button[aria-label='Collapse']",
      );
      if (!toggleBtn) throw new Error("Expand/Collapse button not found inside parent-node row");
      toggleBtn.click();
    }

    const childCls = getRowIconClass("child-node");
    expect(childCls).toMatch(/text-orange-600/);
  });

  it("renders an orange 'Add Area' toolbar button (D1: ADD_BUTTON_CLASSNAME applied)", () => {
    renderTree(iconTestTree());
    const addAreaBtn = screen.getByRole("button", { name: "Add Area" });
    expect(addAreaBtn).toBeInTheDocument();
    // ADD_BUTTON_CLASSNAME injects orange-* Tailwind classes onto the button element
    expect(addAreaBtn.className).toMatch(/orange/);
  });
});
