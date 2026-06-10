import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
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
      <EstimateSheetContent selectedNodeId="lot" nodes={fixtureTree()} libraryTemplates={templates} renderSidebar={false} />
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
    expect(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" })).toBeInTheDocument();
    expect(screen.getByText(/No nodes in this group yet/i)).toBeInTheDocument();
  });

  it("reveals component drop zones only while a library-item drag is active", () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "library-item" }));
    expect(screen.getByText("Drag and drop estimate component into Kitchen")).toBeInTheDocument();
    expect(document.querySelector("[data-estimate-template-drop-zone]")).toBeNull();

    act(() => endEstimateWorkshopDrag());
    expect(screen.queryByText("Drag and drop estimate component into Kitchen")).not.toBeInTheDocument();
  });

  it("reveals template drop zones on groups during a template drag and inserts on drop", async () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "tpl-1", templateName: "Kitchen Starter" }));

    expect(screen.queryByText(/Drag and drop estimate component/i)).not.toBeInTheDocument();
    // Empty-group guidance steps aside for the live drop target.
    expect(screen.queryByText(/No nodes in this group yet/i)).not.toBeInTheDocument();
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

  it("offers template drop zones for groups only, never for areas", () => {
    renderSheet();

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "tpl-1", templateName: "Kitchen Starter" }));

    expect(screen.getByText("Drop Kitchen Starter into Lot")).toBeInTheDocument();
    expect(screen.getByText("Drop Kitchen Starter into Annex")).toBeInTheDocument();
    expect(screen.queryByText("Drop Kitchen Starter into Kitchen")).not.toBeInTheDocument();

    act(() => endEstimateWorkshopDrag());
    expect(screen.queryByText(/Drop Kitchen Starter into/i)).not.toBeInTheDocument();
  });
});
