import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/main-house",
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

function renderEstimateSheet(selectedNodeId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent selectedNodeId={selectedNodeId} renderSidebar={false} />
    </QueryClientProvider>,
  );
}

function createDataTransferStub(initialDropEffect = "none") {
  const store = new Map<string, string>();
  const types: string[] = [];
  return {
    types,
    dropEffect: initialDropEffect,
    effectAllowed: "all",
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
      if (!types.includes(type)) types.push(type);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ""),
    setDragImage: vi.fn(),
  };
}

describe("estimate shell chrome", () => {
  it("renders breadcrumbs in the upper-left project header", async () => {
    render(
      await WorkshopPageShell({
        title: "Modern Bungalow",
        eyebrow: "Project",
        breadcrumbs: ["Workshop", "Projects", "Modern Bungalow"],
        projectId: "project-1",
        children: (
        <div>Estimate workspace</div>
        ),
      }),
    );

    const breadcrumbs = screen.getByLabelText("Project breadcrumbs");
    expect(within(breadcrumbs).getByText("Workshop")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Projects")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Modern Bungalow")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Estimates")).toBeInTheDocument();
    expect(within(breadcrumbs).queryByText("Modern Bungalow - 001")).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).toContainElement(breadcrumbs);
    expect(screen.getByRole("contentinfo")).not.toContainElement(breadcrumbs);
  });

  it("keeps the project title and breadcrumbs visible when an estimate sheet publishes metadata", async () => {
    render(
      await WorkshopPageShell({
        title: "Modern Bungalow",
        eyebrow: "Project",
        breadcrumbs: ["Workshop", "Projects", "Modern Bungalow"],
        projectId: "project-1",
        children: (
          <>
            <ProjectEstimateMetadataPublisher
              metadata={{
                projectId: "project-1",
                estimateId: "estimate-1",
                projectName: "Modern Bungalow",
                estimateName: "Modern Bungalow - 001",
                estimateSheetCode: "ES-001",
                projectBudget: 2_000_000,
              }}
            />
            <div>Estimate workspace</div>
          </>
        ),
      }),
    );

    expect(screen.getByRole("heading", { name: "Modern Bungalow" })).toBeVisible();
    const breadcrumbs = screen.getByLabelText("Project breadcrumbs");
    expect(within(breadcrumbs).getByText("Modern Bungalow")).toBeVisible();
    expect(within(breadcrumbs).getByText("Estimates")).toBeVisible();
    await waitFor(() => expect(within(breadcrumbs).getByText("Modern Bungalow - 001")).toBeVisible());
  });
});

describe("estimate sheet cost inputs", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("renders the locally selected tree node before route props catch up", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="living-area" estimateId="estimate-1" renderSidebar={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Living Area")).toBeInTheDocument();

    await act(async () => {
      useEstimateWorkspaceState.getState().setSelectedNodeId("estimate-1", "kitchen");
    });

    expect(screen.getByLabelText("Kitchen")).toBeInTheDocument();
  });

  it("reconciles stale selected node ids to the first available tree node", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="deleted-node" estimateId="estimate-1" renderSidebar={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/^Lot A/)).toBeInTheDocument();
    await waitFor(() => {
      expect(useEstimateWorkspaceState.getState().selectedNodeIdByEstimateId["estimate-1"]).toBe("lot-primary-residence");
    });
  });

  it("displays the misc cost input as pesos when idle but keeps focused typing uninterrupted", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("main-house");

    const miscCostInput = screen.getByLabelText("HEMLINGBY Loveseat misc cost");
    const row = miscCostInput.closest("tr");
    expect(row).not.toBeNull();

    expect(miscCostInput).toHaveValue("₱ 1,200.00");

    await user.click(miscCostInput);
    expect(miscCostInput).toHaveValue("1200");
    await user.clear(miscCostInput);
    await user.type(miscCostInput, "400");
    expect(miscCostInput).toHaveValue("400");
    expect(miscCostInput).toHaveFocus();

    await user.tab();
    expect(miscCostInput).toHaveValue("₱ 400.00");
    expect(within(row as HTMLElement).getByText("₱ 8,399.00")).toBeInTheDocument();
  });

  it("uses the selected area as the add target and focuses the inserted row quantity", async () => {
    renderEstimateSheet("kitchen");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: estimateLibraryItems[0] }));
    });

    const kitchenSection = screen.getByLabelText("Kitchen");
    const insertedQuantity = await within(kitchenSection).findByLabelText("HEMLINGBY Loveseat quantity");
    await waitFor(() => expect(insertedQuantity).toHaveFocus());
    expect(within(kitchenSection).getAllByText("HEMLINGBY Loveseat")).toHaveLength(1);
  });

  it("adds a blank estimate row when the area drop zone is clicked", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("kitchen");

    const kitchenSection = screen.getByLabelText("Kitchen");
    await user.click(within(kitchenSection).getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    const emptyComponentSlot = await within(kitchenSection).findByLabelText("Drag or add a component here empty estimate component slot");
    expect(within(emptyComponentSlot).getByText("Drag or add a component here")).toBeInTheDocument();

    const insertedQuantity = within(kitchenSection).getByLabelText("Drag or add a component here quantity");
    await waitFor(() => expect(insertedQuantity).toHaveFocus());
  });

  it("adds a blank estimate row when the area drop zone is keyboard-activated", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("kitchen");

    const kitchenSection = screen.getByLabelText("Kitchen");
    const addBlankRowButton = within(kitchenSection).getByRole("button", { name: "Add blank estimate row to Kitchen" });
    addBlankRowButton.focus();
    await user.keyboard("{Enter}");

    expect(await within(kitchenSection).findByLabelText("Drag or add a component here empty estimate component slot")).toBeInTheDocument();
  });

  it("keeps persisted blank estimate rows as placeholder slots without thumbnail fallbacks", () => {
    const persistedBlankRowTree: EstimateTreeNode[] = [
      {
        id: "manual-area",
        name: "Manual Area",
        kind: "area",
        total: "PHP 0.00",
        estimateRowItems: [
          {
            id: "manual-row-1",
            material: "Drag or add a component here",
            description: "",
            supplier: "",
            source: "project",
            unit: "unit",
            itemCost: 0,
            quantity: 1,
            subTotal: 0,
            miscCost: 0,
            totalItemCosts: 0,
            category: "Unassigned",
            pricingSource: "Manual estimate row",
            pricingDate: "2026-05-22",
          },
        ],
        children: [],
      },
    ];

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="manual-area" nodes={persistedBlankRowTree} renderSidebar={false} />
      </QueryClientProvider>,
    );

    const manualAreaSection = screen.getByLabelText("Manual Area");
    expect(within(manualAreaSection).getByLabelText("Drag or add a component here empty estimate component slot")).toBeInTheDocument();
    expect(within(manualAreaSection).queryByLabelText("Drag or add a component here reference image")).not.toBeInTheDocument();
  });

  it("keeps drop prompts hidden at rest and offers a quiet add-row affordance instead", () => {
    renderEstimateSheet("living-area");

    const livingAreaSection = screen.getByLabelText("Living Area");
    expect(within(livingAreaSection).queryByText("Add or drag estimate component")).not.toBeInTheDocument();
    expect(within(livingAreaSection).queryByText("Drag and drop here")).not.toBeInTheDocument();
    // Drop zones only appear while a drag is in flight; at rest the area
    // keeps a quiet add-row button.
    expect(within(livingAreaSection).queryByText(/Drag and drop estimate component/i)).not.toBeInTheDocument();
    expect(within(livingAreaSection).getByRole("button", { name: "Add blank estimate row to Living Area" })).toBeInTheDocument();
  });

  it("opens row details from the row action menu", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    await user.click(screen.getByRole("button", { name: "Open row details for Hardwood Oak Flooring" }));

    const dialog = screen.getByRole("dialog", { name: "Row item details" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getAllByText("Hardwood Oak Flooring").length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole("tree", { name: "Activity scope tree" })).not.toBeInTheDocument();
  });

  it("opens sheet activity from the local sheet header", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    await user.click(screen.getByRole("button", { name: "Activity" }));

    const dialog = screen.getByRole("dialog", { name: "Activity History" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("treeitem", { name: /Estimate sheet/i })).toHaveAttribute("aria-selected", "true");
  });

  it("does not expose discipline or designation as estimate row item fields", () => {
    renderEstimateSheet("living-area");

    const livingAreaSection = screen.getByLabelText("Living Area");
    expect(within(livingAreaSection).queryByText("Discipline / Designation")).not.toBeInTheDocument();
    expect(within(livingAreaSection).queryByLabelText("Hardwood Oak Flooring discipline")).not.toBeInTheDocument();
    expect(within(livingAreaSection).queryByLabelText("Hardwood Oak Flooring designation")).not.toBeInTheDocument();
  });

  it("labels the total column once without repeating the description in every row", () => {
    renderEstimateSheet("living-area");

    const livingAreaSection = screen.getByLabelText("Living Area");
    expect(within(livingAreaSection).getByRole("columnheader", { name: "Adjustment" })).toBeInTheDocument();
    expect(within(livingAreaSection).getByRole("columnheader", { name: "Total Item Cost" })).toBeInTheDocument();
    expect(within(livingAreaSection).queryByRole("columnheader", { name: "Costs" })).not.toBeInTheDocument();
    expect(within(livingAreaSection).getAllByText("Total Item Cost")).toHaveLength(1);
  });

  it("centers subtotal, adjustment, and misc cost row values", () => {
    renderEstimateSheet("living-area");

    const livingAreaSection = screen.getByLabelText("Living Area");
    const subtotalCell = within(livingAreaSection).getByText("₱ 57,600.00").closest("td");
    const adjustmentInput = within(livingAreaSection).getByLabelText("Hardwood Oak Flooring adjustment percentage");
    const adjustmentType = within(livingAreaSection).getByLabelText("Hardwood Oak Flooring adjustment type");
    const adjustmentCell = adjustmentInput.closest("td");
    const miscCostInput = within(livingAreaSection).getByLabelText("Hardwood Oak Flooring misc cost");

    expect(subtotalCell).toHaveClass("justify-center");
    expect(adjustmentCell).toHaveClass("relative", "justify-center");
    expect(adjustmentType).toHaveTextContent("Contingency");
    expect(adjustmentType).toHaveClass("!text-[8px]", "text-left");
    expect(adjustmentType.closest("[data-slot='dropdown-select-root']")?.parentElement).toHaveClass("absolute", "left-1.5", "top-1.5");
    expect(adjustmentInput).toHaveClass("text-right");
    expect(adjustmentInput).toHaveClass("h-5");
    expect(within(adjustmentCell as HTMLElement).getAllByText("%")).toHaveLength(1);
    expect(within(adjustmentCell as HTMLElement).getByText("₱ 0.00")).toHaveClass("text-center", "text-[8px]");
    expect(miscCostInput.closest("td")).toHaveClass("justify-center");
    expect(miscCostInput).toHaveClass("text-center");
  });

  it("calculates contingency value from the row subtotal and includes it in total item cost", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const adjustmentInput = screen.getByLabelText("Hardwood Oak Flooring adjustment percentage");
    await user.clear(adjustmentInput);
    await user.type(adjustmentInput, "10");

    expect(screen.getByText("₱ 5,760.00")).toBeInTheDocument();
    expect(screen.getByText("₱ 93,360.00")).toBeInTheDocument();
  });

  it("subtracts the adjustment value when the row is set to discount", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const adjustmentType = screen.getByLabelText("Hardwood Oak Flooring adjustment type");
    const adjustmentInput = screen.getByLabelText("Hardwood Oak Flooring adjustment percentage");
    await user.click(adjustmentType);
    await user.click(screen.getByRole("option", { name: "Discount" }));
    await user.clear(adjustmentInput);
    await user.type(adjustmentInput, "10");

    expect(adjustmentType).toHaveTextContent("Discount");
    expect(screen.getByText("-₱ 5,760.00")).toBeInTheDocument();
    expect(screen.getByText("₱ 81,840.00")).toBeInTheDocument();
  });

  it("keeps area breadcrumb spacing symmetrical above and below the trail", () => {
    renderEstimateSheet("living-area");

    expect(screen.getByLabelText("Living Area breadcrumbs")).toHaveClass("my-1");
  });

  it("uses group row rhythm when group and area nodes are siblings", () => {
    const mixedSiblingTree: EstimateTreeNode[] = [
      {
        id: "lot",
        name: "Lot",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "house",
            name: "House",
            kind: "group",
            total: "₱0.00",
            children: [
              {
                id: "ground-floor",
                name: "Ground Floor",
                kind: "group",
                total: "₱0.00",
                children: [],
              },
              {
                id: "new-area-node",
                name: "New Area Node",
                kind: "area",
                total: "₱0.00",
                estimateRowItems: [],
              },
            ],
          },
        ],
      },
    ];

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="lot" nodes={mixedSiblingTree} renderSidebar={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Ground Floor")).toHaveClass("mt-4");
    expect(screen.getByLabelText("New Area Node")).toHaveClass("mt-4");
  });

  it("keeps compact spacing when a group contains only area nodes", () => {
    const areaOnlyTree: EstimateTreeNode[] = [
      {
        id: "lot",
        name: "Lot",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "house",
            name: "House",
            kind: "group",
            total: "₱0.00",
            children: [
              {
                id: "ground-floor",
                name: "Ground Floor",
                kind: "group",
                total: "₱0.00",
                children: [
                  {
                    id: "parking",
                    name: "2-Car Parking",
                    kind: "area",
                    total: "₱0.00",
                    estimateRowItems: [],
                  },
                  {
                    id: "living-room",
                    name: "Living Room",
                    kind: "area",
                    total: "₱0.00",
                    estimateRowItems: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="lot" nodes={areaOnlyTree} renderSidebar={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("2-Car Parking")).toHaveClass("mt-0");
    expect(screen.getByLabelText("Living Room")).toHaveClass("mt-0");
    expect(screen.getByLabelText("Living Room")).not.toHaveClass("mt-4");
  });

  it("inserts from the production sidebar direct callback path", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="kitchen" estimateId="estimate-sidebar-test" renderSidebar libraryItems={[estimateLibraryItems[0]]} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand all library tree" }));
    fireEvent.click(await screen.findByLabelText(/^add to kitchen:/i));

    const kitchenSection = screen.getByLabelText("Kitchen");
    await waitFor(() => expect(within(kitchenSection).getAllByRole("spinbutton").length).toBeGreaterThan(0));
  });

  it("opens command palette and inserts into the selected area from the keyboard", async () => {
    renderEstimateSheet("kitchen");

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const palette = screen.getByRole("dialog", { name: "Command palette" });
    fireEvent.change(screen.getByLabelText("Command palette search"), { target: { value: "LED Downlight" } });
    fireEvent.keyDown(palette, { key: "Enter" });

    const kitchenSection = screen.getByLabelText("Kitchen");
    const insertedQuantity = await within(kitchenSection).findByLabelText("LED Downlight, Recessed, 18W Daylight quantity");
    await waitFor(() => expect(insertedQuantity).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "Command palette" })).not.toBeInTheDocument();
  });

  it("commits row cells on Enter without moving to the next cell", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const firstQuantity = screen.getByLabelText("Hardwood Oak Flooring quantity");
    await user.click(firstQuantity);
    const activeRow = firstQuantity.closest("tr");
    expect(activeRow).toHaveAttribute("data-estimate-row-active", "true");

    await user.keyboard("{Enter}");

    expect(firstQuantity).not.toHaveFocus();
    expect(activeRow).not.toHaveAttribute("data-estimate-row-active");
    expect(screen.getByLabelText("HEMLINGBY Loveseat quantity")).not.toHaveFocus();

    await user.click(firstQuantity);
    await user.keyboard("{ArrowRight}");
    const firstContingency = screen.getByLabelText("Hardwood Oak Flooring adjustment percentage");
    expect(firstContingency).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(firstContingency).not.toHaveFocus();

    await user.click(firstQuantity);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByLabelText("Hardwood Oak Flooring misc cost")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Hardwood Oak Flooring misc cost")).not.toHaveFocus();
  });

  it("commits row cells when focus leaves the edited input", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const firstQuantity = screen.getByLabelText("Hardwood Oak Flooring quantity");
    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    await user.click(firstQuantity);
    const activeRow = firstQuantity.closest("tr");
    expect(activeRow).toHaveAttribute("data-estimate-row-active", "true");

    await user.clear(firstQuantity);
    await user.type(firstQuantity, "7");
    await user.click(materialCell);

    expect(firstQuantity).not.toHaveFocus();
    expect(activeRow).not.toHaveAttribute("data-estimate-row-active");
    expect(firstQuantity).toHaveValue(7);
  });

  it("keeps row save state out of the visible spreadsheet cells while editing", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const livingAreaSection = screen.getByLabelText("Living Area");
    const quantityInput = within(livingAreaSection).getByLabelText("Hardwood Oak Flooring quantity");

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "12");

    expect(within(livingAreaSection).queryByText("Unsaved")).not.toBeInTheDocument();
    expect(within(livingAreaSection).queryByText("Saving")).not.toBeInTheDocument();
    expect(within(livingAreaSection).queryByText("Saved")).not.toBeInTheDocument();
    expect(within(livingAreaSection).queryByText("Save failed")).not.toBeInTheDocument();
  });

  it("marks estimate component cells as replaceable targets with component action handles and highlights focused row editing", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    const rowDragIcon = screen.getByLabelText("Drag material Hardwood Oak Flooring");
    expect(materialCell).not.toHaveAttribute("draggable", "true");
    expect(within(materialCell).getByText("Hardwood Oak Flooring")).toBeInTheDocument();
    expect(within(materialCell).getByText("₱ 1,200.00")).toBeInTheDocument();
    expect(rowDragIcon).toHaveClass("cursor-grab", "active:cursor-grabbing");
    expect(within(materialCell).getByLabelText("Component actions for Hardwood Oak Flooring")).toBeInTheDocument();
    expect(within(materialCell).getByRole("button", { name: "Delete component Hardwood Oak Flooring" })).toBeInTheDocument();
    expect(within(materialCell).getByRole("button", { name: "Open component details for Hardwood Oak Flooring" })).toBeInTheDocument();
    expect(within(materialCell).getByRole("button", { name: "Drag component Hardwood Oak Flooring" })).toHaveAttribute("draggable", "true");

    const quantityInput = screen.getByLabelText("Hardwood Oak Flooring quantity");
    await user.click(quantityInput);

    const activeRow = quantityInput.closest("tr");
    expect(activeRow).toHaveAttribute("data-estimate-row-active", "true");
    expect(quantityInput.closest("td")).toHaveAttribute("data-estimate-cell-active", "true");
  });

  it("opens the row component tab from the in-card component action", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    await user.click(within(materialCell).getByRole("button", { name: "Open component details for Hardwood Oak Flooring" }));

    const dialog = screen.getByRole("dialog", { name: "Row item details" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "Component" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByText("Current component")).toBeInTheDocument();
  });

  it("deletes only the component from the card action while keeping the row item editable", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    const row = materialCell.closest("tr");
    expect(row).not.toBeNull();

    await user.click(within(materialCell).getByRole("button", { name: "Delete component Hardwood Oak Flooring" }));

    expect(within(row as HTMLElement).getByLabelText("Drag or add a component here empty estimate component slot")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByLabelText("Drag or add a component here quantity")).toBeInTheDocument();
    expect(screen.queryByLabelText("Hardwood Oak Flooring quantity")).not.toBeInTheDocument();
  });

  it("moves a component to another row item from the in-card drag handle and clears the source component", async () => {
    renderEstimateSheet("living-area");

    const sourceComponent = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    const sourceRow = sourceComponent.closest("tr");
    const targetComponent = screen.getByLabelText("HEMLINGBY Loveseat replaceable estimate component");
    const targetRow = targetComponent.closest("tr");
    expect(sourceRow).not.toBeNull();
    expect(targetRow).not.toBeNull();

    const dataTransfer = createDataTransferStub("none");
    fireEvent.dragStart(within(sourceComponent).getByRole("button", { name: "Drag component Hardwood Oak Flooring" }), { dataTransfer });
    fireEvent.dragOver(targetComponent, { dataTransfer });
    fireEvent.drop(targetComponent, { dataTransfer });

    await waitFor(() => {
      expect(within(sourceRow as HTMLElement).getByLabelText("Drag or add a component here empty estimate component slot")).toBeInTheDocument();
    });
    expect(within(targetRow as HTMLElement).getByLabelText("Hardwood Oak Flooring replaceable estimate component")).toBeInTheDocument();
  });

  it("treats dragging a component away from row items as deleting only the component", async () => {
    renderEstimateSheet("living-area");

    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    const row = materialCell.closest("tr");
    expect(row).not.toBeNull();

    const dataTransfer = createDataTransferStub("none");
    fireEvent.dragStart(within(materialCell).getByRole("button", { name: "Drag component Hardwood Oak Flooring" }), { dataTransfer });
    fireEvent.dragEnd(within(materialCell).getByRole("button", { name: "Drag component Hardwood Oak Flooring" }), { dataTransfer });

    expect(within(row as HTMLElement).getByLabelText("Drag or add a component here empty estimate component slot")).toBeInTheDocument();
  });

  it("removes the active group context and moves the project total out of the estimate footer", () => {
    renderEstimateSheet("living-area");

    expect(screen.queryByLabelText("Active estimate group context")).not.toBeInTheDocument();

    const actionHeader = screen.getByLabelText("Sheet controls");
    expect(within(actionHeader).queryByRole("heading", { name: "Sheet" })).not.toBeInTheDocument();
    expect(within(actionHeader).queryByRole("heading", { name: "Living Area" })).not.toBeInTheDocument();
    expect(within(actionHeader).queryByLabelText("Search Sheet")).not.toBeInTheDocument();
    expect(within(actionHeader).queryByPlaceholderText("Search Sheet")).not.toBeInTheDocument();
    const sheetTools = within(actionHeader).getByLabelText("Sheet tools");
    expect(sheetTools).not.toHaveClass("border-y");
    expect(within(sheetTools).queryByText("Sheet tools")).not.toBeInTheDocument();
    const showSearchButton = within(sheetTools).getByRole("button", { name: "Show sheet search" });
    expect(showSearchButton).toHaveAttribute("title", "Show sheet search");
    expect(showSearchButton).toHaveAttribute("aria-expanded", "false");
    expect(within(sheetTools).getByRole("button", { name: "Filter sheet" })).toHaveAttribute("title", "Filter sheet");
    expect(within(sheetTools).getByRole("button", { name: "Group sheet" })).toHaveAttribute("title", "Group sheet");
    expect(within(sheetTools).getByRole("button", { name: "Collapse all sheet" })).toHaveAttribute("title", "Collapse all sheet");
    expect(within(sheetTools).getByRole("button", { name: "Expand all sheet" })).toHaveAttribute("title", "Expand all sheet");
    expect(within(sheetTools).queryByRole("button", { name: "Add sheet" })).not.toBeInTheDocument();
    expect(within(sheetTools).getByRole("button", { name: "Activity" })).toHaveAttribute("title", "Activity");
    expect(within(sheetTools).getByRole("button", { name: "Preview Excel Export" })).toHaveAttribute("title", "Preview Excel Export");

    fireEvent.click(showSearchButton);
    const searchPanel = within(actionHeader).getByRole("search");
    expect(searchPanel).toHaveAttribute("data-tree-search-panel", "true");
    expect(searchPanel).toHaveClass("absolute", "left-0", "right-0", "top-[40px]");
    expect(within(searchPanel).getByLabelText("Search Sheet")).toBeEnabled();
    expect(within(sheetTools).getByRole("button", { name: "Hide sheet search" })).toHaveAttribute("aria-expanded", "true");

    // A non-empty query pins the panel open through outside clicks.
    fireEvent.change(within(searchPanel).getByLabelText("Search Sheet"), { target: { value: "oak" } });
    fireEvent.pointerDown(document.body);
    expect(within(actionHeader).getByRole("search")).toBeInTheDocument();

    fireEvent.change(within(searchPanel).getByLabelText("Search Sheet"), { target: { value: "" } });
    fireEvent.pointerDown(document.body);
    expect(within(actionHeader).queryByRole("search")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Sheet running totals")).not.toBeInTheDocument();
  });

  it("replaces the row estimate component on drop while preserving editable row fields", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const quantityInput = screen.getByLabelText("Hardwood Oak Flooring quantity");
    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");

    const replacement = estimateLibraryItems.find((item) => item.material === "HEMLINGBY Loveseat");
    expect(replacement).toBeDefined();

    const targetComponent = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    const dataTransfer = {
      types: ["application/x-archestimator-library-item"],
      dropEffect: "copy",
      getData: (type: string) => (type === "application/x-archestimator-library-item" ? JSON.stringify(replacement) : ""),
    };

    fireEvent.dragOver(targetComponent, { dataTransfer });
    expect(targetComponent).toHaveAttribute("data-replace-target-active", "true");
    fireEvent.drop(targetComponent, { dataTransfer });

    await waitFor(() => {
      expect(screen.queryByLabelText("Hardwood Oak Flooring replaceable estimate component")).not.toBeInTheDocument();
    });
    expect(screen.getAllByLabelText("HEMLINGBY Loveseat replaceable estimate component").length).toBeGreaterThan(1);
    expect(screen.getAllByLabelText("HEMLINGBY Loveseat quantity").some((input) => (input as HTMLInputElement).value === "7")).toBe(true);
  });
});
