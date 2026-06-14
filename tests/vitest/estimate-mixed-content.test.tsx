import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// A truly-empty node: no rows, no children. Under P6 this is the only
// non-collapsible node — it keeps the inert reserved caret slot for alignment.
function emptyTree(): EstimateTreeNode[] {
  return [
    { id: "empty-area", name: "Empty Area", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
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
    const ownRowCell = within(buildingSection).getByText("HEMLINGBY Loveseat");
    const childSection = screen.getByLabelText("Kitchen");

    // DOM order: this node's own-rows table → child sub-area section. The
    // rows-first order alone disambiguates own rows from children — no label.
    expect(ownRowCell.compareDocumentPosition(childSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders no 'Own items' EMC label (rows-first DOM order disambiguates instead)", () => {
    const { unmount } = renderSheet(mixedTree(), "building-a");
    expect(within(screen.getByLabelText("Building A")).queryByText("Own items")).not.toBeInTheDocument();
    unmount();

    renderSheet(leafTree(), "pantry");
    expect(screen.queryByText("Own items")).not.toBeInTheDocument();
  });

  it("uses the tightened in-node cluster gap (space-y-2), not space-y-4 (Req 2)", () => {
    renderSheet(leafTree(), "pantry");
    const section = screen.getByLabelText("Pantry");
    // The table/add-row strip/children cluster reads as one node (sm=8px gap);
    // node separation is carried by the inter-node groupGap, not this gap.
    expect(section.querySelector(".space-y-2")).not.toBeNull();
    expect(section.querySelector(".space-y-4")).toBeNull();
  });

  it("renders a disclosure caret + aria-expanded on any node with contents (rows OR children)", () => {
    renderSheet(mixedTree(), "building-a");

    // Parent (rows + children) has a caret/disclosure with aria-expanded.
    const parentToggle = screen.getByRole("button", { name: /Collapse Building A|Expand Building A/ });
    expect(parentToggle).toHaveAttribute("aria-expanded", "true");

    // A rows-only child is now collapsible: it advertises a caret + aria-expanded.
    const kitchenSection = screen.getByLabelText("Kitchen");
    const kitchenToggle = within(kitchenSection).getByRole("button", { name: /Collapse Kitchen|Expand Kitchen/ });
    expect(kitchenToggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders no disclosure caret on a truly-empty node (no rows, no children)", () => {
    renderSheet(emptyTree(), "empty-area");
    const section = screen.getByLabelText("Empty Area");
    expect(within(section).queryByRole("button", { name: /Collapse Empty Area|Expand Empty Area/ })).not.toBeInTheDocument();
    const header = section.querySelector(".sticky");
    expect(header).not.toBeNull();
    // The inert reserved slot keeps alignment but advertises no expandability.
    expect((header as HTMLElement).querySelector("[aria-expanded]")).toBeNull();
  });

  it("toggles a rows-only node via keyboard and keeps focus on the disclosure button", async () => {
    const user = userEvent.setup();
    renderSheet(mixedTree(), "building-a");
    const kitchenSection = screen.getByLabelText("Kitchen");
    const kitchenToggle = within(kitchenSection).getByRole("button", { name: /Collapse Kitchen|Expand Kitchen/ });
    expect(kitchenToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(kitchenSection).queryByRole("table")).not.toBeNull();

    kitchenToggle.focus();
    await user.keyboard("{Enter}");
    expect(kitchenToggle).toHaveFocus();
    expect(kitchenToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(kitchenSection).queryByRole("table")).toBeNull();

    await user.keyboard(" ");
    expect(kitchenToggle).toHaveFocus();
    expect(kitchenToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(kitchenSection).queryByRole("table")).not.toBeNull();
  });

  it("collapse-all hides the rows-only table; the rows-only node re-expands independently", async () => {
    const user = userEvent.setup();
    renderSheet(mixedTree(), "building-a");

    await user.click(screen.getByRole("button", { name: "Collapse all tab" }));
    // The top-level node collapses, unmounting its body (own table + children).
    expect(within(screen.getByLabelText("Building A")).queryByRole("table")).toBeNull();

    // Re-expand the parent: its rows-only child surfaces, still collapsed —
    // proof that collapse-all reached the rows-only node (per-node caret + bulk
    // surface are consistent now that the caret keys off hasContents).
    await user.click(within(screen.getByLabelText("Building A")).getByRole("button", { name: /Expand Building A/ }));
    const kitchenSection = screen.getByLabelText("Kitchen");
    const kitchenToggle = within(kitchenSection).getByRole("button", { name: /Expand Kitchen/ });
    expect(kitchenToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(kitchenSection).queryByRole("table")).toBeNull();

    await user.click(kitchenToggle);
    expect(within(kitchenSection).queryByRole("table")).not.toBeNull();
  });

  it("suppresses disclosure carets while sheet search is active and restores them on clear (OD-3)", async () => {
    const user = userEvent.setup();
    renderSheet(mixedTree(), "building-a");
    expect(screen.getByRole("button", { name: /Collapse Building A|Expand Building A/ })).toBeInTheDocument();

    // Open the tab search panel and type a matching query.
    await user.click(screen.getByRole("button", { name: "Show tab search" }));
    const searchBox = await screen.findByLabelText("Search Tab");
    await user.type(searchBox, "Building");

    // While searching, collapse state is force-revealed; the per-node caret is
    // suppressed so a user can't toggle invisible collapse state.
    expect(screen.queryByRole("button", { name: /Collapse Building A|Expand Building A/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Collapse Kitchen|Expand Kitchen/ })).not.toBeInTheDocument();

    // Clearing search restores the carets.
    await user.clear(searchBox);
    expect(screen.getByRole("button", { name: /Collapse Building A|Expand Building A/ })).toBeInTheDocument();
  });

  it("keeps a nested node's breadcrumb OUT of the sticky header so it can't clip the table thead (OD-20)", () => {
    renderSheet(mixedTree(), "building-a");
    const kitchenSection = screen.getByLabelText("Kitchen");
    const stickyHeader = kitchenSection.querySelector(".sticky") as HTMLElement;
    expect(stickyHeader).not.toBeNull();
    const breadcrumb = screen.getByLabelText("Kitchen breadcrumbs");
    // If the breadcrumb lives inside the sticky header it inflates the sticky
    // height past STICKY_HEADER_H (40px) and covers the own-rows thead that pins
    // at stickyTop + 40. It must be a normal (scrolling) band outside sticky.
    expect(stickyHeader.contains(breadcrumb)).toBe(false);
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

  it("renders no phantom row-reorder handle (false 'Drag material' affordance removed, Req 4/D5)", () => {
    const { container } = renderSheet(mixedTree(), "building-a");
    // The DotsSixVertical row grip presented cursor-grab + aria-label="Drag
    // material …" but had no drag handler and no reorder RPC — a false
    // affordance and a false a11y announcement. It must not exist. (The real
    // component-move handle "Drag component …" in the material cell stays.)
    expect(container.querySelector('[aria-label^="Drag material"]')).toBeNull();
    expect(container.querySelector('[aria-label^="Drag component"]')).not.toBeNull();
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
