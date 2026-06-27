import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
import {
  ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE,
  LIBRARY_ITEM_DRAG_MIME_TYPE,
} from "@/components/workshop/estimate-sheet/rows/constants";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import {
  beginEstimateWorkshopDrag,
  endEstimateWorkshopDrag,
  useEstimateWorkshopDragState,
} from "@/components/workshop/estimate-workshop-drag";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/lot",
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

const kitchenRow = { ...estimateLibraryItems[0], id: "kitchen-row-1" };

function fixtureTree(): EstimateTreeNode[] {
  return [
    {
      id: "lot",
      name: "Lot",
      kind: "group",
      total: "₱0.00",
      children: [
        {
          id: "kitchen",
          name: "Kitchen",
          kind: "area",
          total: "₱0.00",
          children: [],
          estimateRowItems: [kitchenRow],
        },
        {
          id: "annex",
          name: "Annex",
          kind: "group",
          total: "₱0.00",
          children: [],
        },
      ],
    },
  ];
}

const templates: EstimateTemplate[] = [
  {
    id: "tpl-1",
    name: "Kitchen Starter",
    description: "Base kitchen fit-out",
    category: "Rooms",
    nodes: [
      {
        id: "tpl-1-root",
        name: "Starter Wing",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "tpl-1-area",
            name: "Starter Pantry",
            kind: "area",
            total: "₱0.00",
            children: [],
            estimateRowItems: [],
          },
        ],
      },
    ],
  },
];

function createDataTransferStub(types: string[]) {
  const store = new Map<string, string>();
  return {
    types,
    dropEffect: "none",
    effectAllowed: "all",
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ""),
    setDragImage: vi.fn(),
  };
}

function renderSheet() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent selectedNodeId="lot" nodes={fixtureTree()} canEditEstimate={true} libraryTemplates={templates} renderSidebar={false} />
    </QueryClientProvider>,
  );
}

// Wrap-on-drop needs a real estimate id: selection moves through the shared
// workspace store, which is keyed by estimate. No projectId keeps every
// server call skipped, so the flows stay optimistic-only like renderSheet.
function renderAreaScopedSheet() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent estimateId="estimate-1" selectedNodeId="kitchen" nodes={fixtureTree()} canEditEstimate={true} libraryTemplates={templates} renderSidebar={false} />
    </QueryClientProvider>,
  );
}

describe("estimate sheet drag-aware drop zones", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    useEstimateWorkshopDragState.setState({ activeDrag: null });
  });

  it("keeps drop zones hidden at rest while quiet affordances remain", () => {
    renderSheet();

    expect(screen.queryByText(/Drag and drop estimate component/i)).not.toBeInTheDocument();
    expect(document.querySelector("[data-estimate-template-drop-zone]")).toBeNull();
    const kitchenAddRow = screen.getByRole("button", { name: "Add blank estimate row to Kitchen" });
    expect(kitchenAddRow).toBeInTheDocument();
    expect(kitchenAddRow).toHaveClass("h-16");
    expect(kitchenAddRow).toHaveClass("border-dashed", "border-hairline", "bg-surfaceMuted/30", "opacity-60");
    expect(screen.getByText("Add row to Kitchen")).toBeInTheDocument();
    // Empty nodes use the same quiet add-row affordance as populated nodes.
    expect(screen.queryByText(/Empty area\. Add a row/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add blank estimate row to Annex" })).toBeInTheDocument();
    expect(screen.getByText("Add row to Annex")).toBeInTheDocument();
    expect(screen.queryByText(/No sub-areas yet/i)).not.toBeInTheDocument();
  });

  it("reveals component drop zones only while a library-item drag is active", () => {
    renderSheet();

    const restingSlot = screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }).closest(".py-1");
    expect(restingSlot).not.toBeNull();

    act(() => beginEstimateWorkshopDrag({ kind: "library-item" }));
    const kitchenDropZoneLabel = screen.getByText("Drag and drop estimate component into Kitchen");
    expect(kitchenDropZoneLabel).toBeInTheDocument();
    const activeSlot = kitchenDropZoneLabel.closest(".py-1");
    expect(activeSlot).not.toBeNull();
    expect(activeSlot?.firstElementChild).toHaveClass("h-16");
    expect(activeSlot?.firstElementChild).toHaveClass("border-dashed", "border-hairline", "bg-surfaceMuted/30", "opacity-60");
    expect(document.querySelector("[data-estimate-template-drop-zone]")).toBeNull();

    act(() => endEstimateWorkshopDrag());
    expect(screen.queryByText("Drag and drop estimate component into Kitchen")).not.toBeInTheDocument();
  });

  it("clears row move drop zones after a cross-branch row drop", async () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({
      kind: "estimate-row-item",
      rowItemId: "kitchen-row-1",
      rowLabel: "HEMLINGBY Loveseat",
      sourceNodeId: "kitchen",
    }));

    const annexDropZoneLabel = screen.getByText("Move row to Annex");
    const annexDropZone = annexDropZoneLabel.closest(".py-1");
    expect(annexDropZone).not.toBeNull();
    expect(screen.getByText("Move row to Kitchen")).toBeInTheDocument();

    const dataTransfer = createDataTransferStub([ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE]);
    dataTransfer.setData(
      ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE,
      JSON.stringify({ rowItemId: "kitchen-row-1", sourceNodeId: "kitchen", label: "HEMLINGBY Loveseat" }),
    );
    fireEvent.drop(annexDropZone as HTMLElement, { dataTransfer });

    expect(screen.queryByText(/^Move row to /)).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Add blank estimate row to Annex" })).toBeInTheDocument();
  });

  it("shows component drop zones on collapsed nodes and expands after a drop", async () => {
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Collapse Lot" }));
    expect(screen.getByRole("button", { name: "Expand Lot" })).toBeInTheDocument();
    expect(screen.queryByText("Drag and drop estimate component into Lot")).not.toBeInTheDocument();
    expect(screen.queryByText("Drag and drop estimate component into Kitchen")).not.toBeInTheDocument();

    act(() => beginEstimateWorkshopDrag({ kind: "library-item" }));

    const lotDropZoneLabel = screen.getByText("Drag and drop estimate component into Lot");
    const lotDropZone = lotDropZoneLabel.closest(".py-1");
    expect(lotDropZone).not.toBeNull();
    expect(screen.queryByText("Drag and drop estimate component into Kitchen")).not.toBeInTheDocument();

    const droppedLibraryItem = {
      ...estimateLibraryItems[0],
      id: "collapsed-lot-drop-row",
      material: "Collapsed Lot Test Component",
    };
    const dataTransfer = createDataTransferStub([LIBRARY_ITEM_DRAG_MIME_TYPE]);
    dataTransfer.setData(LIBRARY_ITEM_DRAG_MIME_TYPE, JSON.stringify(droppedLibraryItem));
    fireEvent.drop(lotDropZone as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    expect(screen.getByRole("button", { name: "Collapse Lot" })).toBeInTheDocument();
    expect(await screen.findByText("Collapsed Lot Test Component")).toBeInTheDocument();
  });

  it("reveals template drop zones on groups during a template drag and inserts on drop", async () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "tpl-1", templateName: "Kitchen Starter" }));

    expect(screen.queryByText(/Drag and drop estimate component/i)).not.toBeInTheDocument();
    // Empty-group guidance steps aside for the live drop target.
    expect(screen.queryByText(/No sub-areas yet/i)).not.toBeInTheDocument();
    expect(screen.getByText("Drop Kitchen Starter into Lot")).toBeInTheDocument();

    const annexZoneLabel = screen.getByText("Drop Kitchen Starter into Annex");
    const annexZone = annexZoneLabel.closest("[data-estimate-template-drop-zone]");
    expect(annexZone).not.toBeNull();

    const dataTransfer = createDataTransferStub([ESTIMATE_TEMPLATE_DRAG_MIME_TYPE]);
    dataTransfer.setData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, JSON.stringify({ templateId: "tpl-1" }));
    fireEvent.drop(annexZone as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    // Optimistic insert: the template structure lands inside Annex and the
    // sheet selection moves to that group. Names can appear in both section
    // headers and area breadcrumbs.
    expect((await screen.findAllByText("Starter Wing")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Starter Pantry").length).toBeGreaterThan(0);
  });

  it("inserts only the dragged subtree when a node from inside a template drops on a group", async () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateName: "Starter Pantry" }));

    const annexZoneLabel = screen.getByText("Drop Starter Pantry into Annex");
    const annexZone = annexZoneLabel.closest("[data-estimate-template-drop-zone]");
    expect(annexZone).not.toBeNull();

    const dataTransfer = createDataTransferStub([ESTIMATE_TEMPLATE_DRAG_MIME_TYPE]);
    dataTransfer.setData(
      ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
      JSON.stringify({ templateId: "tpl-1", templateNodeId: "tpl-1-area" }),
    );
    fireEvent.drop(annexZone as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    // Only the dragged area lands — its template parent group stays behind.
    expect((await screen.findAllByText("Starter Pantry")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Starter Wing")).not.toBeInTheDocument();
  });

  it("offers a plain insert zone on EVERY node, including a row-owning area (P6)", () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "tpl-1", templateName: "Kitchen Starter" }));

    expect(screen.getByText("Drop Kitchen Starter into Lot")).toBeInTheDocument();
    expect(screen.getByText("Drop Kitchen Starter into Annex")).toBeInTheDocument();
    // P6: a row-owning area ("Kitchen") now accepts a direct template insert —
    // no group gate, and crucially NO "group it with" wrap copy.
    expect(screen.getByText("Drop Kitchen Starter into Kitchen")).toBeInTheDocument();
    expect(screen.queryByText(/group it with Kitchen/i)).not.toBeInTheDocument();

    act(() => endEstimateWorkshopDrag());
    expect(screen.queryByText(/Drop Kitchen Starter into/i)).not.toBeInTheDocument();
  });

  it("inserts a dropped template directly INTO a row-owning area (no wrap group) — P6", async () => {
    renderAreaScopedSheet();

    expect(document.querySelector("[data-estimate-template-drop-zone]")).toBeNull();
    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "tpl-1", templateName: "Kitchen Starter" }));

    // P6: a row-owning area takes child nodes directly — the drop target is a
    // plain "into" zone (no wrap), and there is no "group it with" copy.
    expect(screen.queryByText(/group it with Kitchen/i)).not.toBeInTheDocument();
    const dropZoneLabel = screen.getByText("Drop Kitchen Starter into Kitchen");
    const dropZone = dropZoneLabel.closest("[data-estimate-template-drop-zone]");
    expect(dropZone).not.toBeNull();

    const dataTransfer = createDataTransferStub([ESTIMATE_TEMPLATE_DRAG_MIME_TYPE]);
    dataTransfer.setData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, JSON.stringify({ templateId: "tpl-1" }));
    fireEvent.drop(dropZone as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    // The template structure lands as a CHILD of Kitchen — Kitchen stays its own
    // node and no wrapper "Kitchen Group" is created.
    expect(screen.queryByText("Kitchen Group")).not.toBeInTheDocument();
    expect(screen.getAllByText("Kitchen").length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Starter Wing")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Starter Pantry").length).toBeGreaterThan(0);

    // Kitchen's own content leads; the inserted child follows.
    const kitchenSection = screen.getByRole("region", { name: "Kitchen" });
    const starterWingSection = screen.getByRole("region", { name: "Starter Wing" });
    expect(kitchenSection.compareDocumentPosition(starterWingSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("inserts only the dragged subtree directly into a row-owning area (P6)", async () => {
    renderAreaScopedSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateName: "Starter Pantry" }));

    const dropZoneLabel = screen.getByText("Drop Starter Pantry into Kitchen");
    const dropZone = dropZoneLabel.closest("[data-estimate-template-drop-zone]");
    expect(dropZone).not.toBeNull();

    const dataTransfer = createDataTransferStub([ESTIMATE_TEMPLATE_DRAG_MIME_TYPE]);
    dataTransfer.setData(
      ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
      JSON.stringify({ templateId: "tpl-1", templateNodeId: "tpl-1-area" }),
    );
    fireEvent.drop(dropZone as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    expect(screen.queryByText("Kitchen Group")).not.toBeInTheDocument();
    expect((await screen.findAllByText("Starter Pantry")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Starter Wing")).not.toBeInTheDocument();

    const kitchenSection = screen.getByRole("region", { name: "Kitchen" });
    const pantrySection = screen.getByRole("region", { name: "Starter Pantry" });
    expect(kitchenSection.compareDocumentPosition(pantrySection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
