import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { STICKY_HEADER_H } from "@/components/workshop/estimate-sheet/rows/node-visuals";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserContext: vi.fn(async () => null) }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })) }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/lot",
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}));

const ownRow = { ...estimateLibraryItems[0], id: "own-row-1" };
const childRow = { ...estimateLibraryItems[1], id: "child-row-1" };

// A genuinely mixed node: it owns rows AND has a child sub-area that also owns
// a row. Pure presentation — the layout renders both regardless of the (still
// two-kind) DB constraint, which is exactly what P4 ships ahead of P6 writes.
function mixedTree(): EstimateTreeNode[] {
  return [
    {
      id: "building-a",
      name: "Building A",
      kind: "group",
      total: "₱0.00",
      estimateRowItems: [ownRow],
      children: [
        {
          id: "kitchen",
          name: "Kitchen",
          kind: "area",
          total: "₱0.00",
          estimateRowItems: [childRow],
          children: [],
        },
      ],
    },
  ];
}

// A plain leaf: own rows, no children.
function leafTree(): EstimateTreeNode[] {
  return [
    {
      id: "pantry",
      name: "Pantry",
      kind: "area",
      total: "₱0.00",
      estimateRowItems: [ownRow],
      children: [],
    },
  ];
}

function renderSheet(nodes: EstimateTreeNode[], selectedNodeId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent selectedNodeId={selectedNodeId} nodes={nodes} renderSidebar={false} />
    </QueryClientProvider>,
  );
}

describe("estimate mixed-content layout (P4)", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("renders a mixed node's own rows table BEFORE its child sub-areas (rows-first)", () => {
    renderSheet(mixedTree(), "building-a");

    const buildingSection = screen.getByLabelText("Building A");
    const ownItemsLabel = within(buildingSection).getByText("Own items");
    const ownRowCell = within(buildingSection).getByText("HEMLINGBY Loveseat");
    const childSection = screen.getByLabelText("Kitchen");

    // DOM order: Own-items label → own-rows table → child sub-area section.
    expect(ownItemsLabel.compareDocumentPosition(ownRowCell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ownRowCell.compareDocumentPosition(childSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the 'Own items' label only when a node has BOTH rows and children", () => {
    const { unmount } = renderSheet(mixedTree(), "building-a");
    expect(within(screen.getByLabelText("Building A")).getByText("Own items")).toBeInTheDocument();
    unmount();

    // A leaf (rows, no children) needs no disambiguation → no label.
    renderSheet(leafTree(), "pantry");
    expect(screen.queryByText("Own items")).not.toBeInTheDocument();
  });

  it("renders a disclosure caret + aria-expanded only on a node with children", () => {
    renderSheet(mixedTree(), "building-a");

    // Parent has a caret/disclosure with aria-expanded.
    const parentToggle = screen.getByRole("button", { name: /Collapse Building A|Expand Building A/ });
    expect(parentToggle).toHaveAttribute("aria-expanded");

    // Leaf child renders no disclosure button and advertises no expandability.
    const kitchenSection = screen.getByLabelText("Kitchen");
    expect(within(kitchenSection).queryByRole("button", { name: /Collapse Kitchen|Expand Kitchen/ })).not.toBeInTheDocument();
    // The leaf's sticky header carries no aria-expanded (row-cell comboboxes
    // below it legitimately do, so scope the check to the header).
    const kitchenHeader = kitchenSection.querySelector(".sticky");
    expect(kitchenHeader).not.toBeNull();
    expect((kitchenHeader as HTMLElement).querySelector("[aria-expanded]")).toBeNull();
  });

  it("offsets the own-rows sticky thead below the node header (sticky cascade)", () => {
    renderSheet(mixedTree(), "building-a");

    const buildingSection = screen.getByLabelText("Building A");
    const thead = buildingSection.querySelector("thead");
    expect(thead).not.toBeNull();
    // The own-rows <thead> pins below the (top-level, stickyTop=0) header, i.e.
    // exactly the header height — never at top-0 where it would collide.
    expect((thead as HTMLElement).style.top).toBe(`${STICKY_HEADER_H}px`);
  });

  it("renders no 'Group Node' / 'Area Node' / 'select a group first' copy", () => {
    const { container } = renderSheet(mixedTree(), "building-a");
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Group Node/i);
    expect(text).not.toMatch(/Area Node/i);
    expect(text).not.toMatch(/select a group first/i);
  });

  it("uses one neutral node icon (no FolderSimple/MapPin folder-vs-pin split)", () => {
    renderSheet(mixedTree(), "building-a");
    const buildingSection = screen.getByLabelText("Building A");
    // The neutral glyph announces the dual content via the sr-only L7 label.
    expect(within(buildingSection).getAllByText(/Building A, area/).length).toBeGreaterThan(0);
  });
});
