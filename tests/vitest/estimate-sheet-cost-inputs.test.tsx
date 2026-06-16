import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { LIBRARY_ITEM_DRAG_MIME_TYPE } from "@/components/workshop/estimate-sheet/rows/constants";
// Req 1 / D2: "Activity" + "Preview Excel Export" moved to the project chrome
// header (`EstimateHeaderActions`), fed by the page via a shared store. Render it
// alongside the sheet so the relocated buttons are reachable here.
import { EstimateHeaderActions } from "@/components/workshop/EstimateHeaderActions";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { withExpressComponentMetadata } from "@/lib/estimates/express-components";

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

function renderEstimateSheet(selectedNodeId: string, props: Partial<ComponentProps<typeof EstimateSheetContent>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent selectedNodeId={selectedNodeId} renderSidebar={false} {...props} />
      <EstimateHeaderActions />
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

  it("uses the shared hover-revealed selection checkbox for estimate rows", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const selector = screen.getByRole("checkbox", { name: "Select Hardwood Oak Flooring" });
    expect(selector).toHaveAttribute("aria-checked", "false");
    expect(selector).toHaveClass("opacity-0", "group-hover/estimate-row:opacity-100", "group-focus-within/estimate-row:opacity-100");

    await user.click(selector);

    await waitFor(() => expect(selector).toHaveAttribute("aria-checked", "true"));
    expect(selector).toHaveClass("bg-[#ABABAB]", "opacity-100");
    expect(selector).not.toHaveClass("opacity-0");
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

  it("adds an empty editable express component row when the area drop zone is clicked", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("kitchen");

    const kitchenSection = screen.getByLabelText("Kitchen");
    await user.click(within(kitchenSection).getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    const componentName = await within(kitchenSection).findByLabelText("Component name") as HTMLInputElement;
    expect(componentName).toHaveValue("");
    expect(within(kitchenSection).queryByText("Drag or add a component here")).not.toBeInTheDocument();

    await waitFor(() => expect(componentName).toHaveFocus());
  });

  it("adds a blank estimate row when the area drop zone is keyboard-activated", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("kitchen");

    const kitchenSection = screen.getByLabelText("Kitchen");
    const addBlankRowButton = within(kitchenSection).getByRole("button", { name: "Add blank estimate row to Kitchen" });
    addBlankRowButton.focus();
    await user.keyboard("{Enter}");

    const componentName = await within(kitchenSection).findByLabelText("Component name") as HTMLInputElement;
    expect(componentName).toHaveValue("");
    expect(within(kitchenSection).queryByText("Drag or add a component here")).not.toBeInTheDocument();
  });

  it("renders persisted legacy blank estimate rows as editable empty component rows", () => {
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
    expect(within(manualAreaSection).getByLabelText("Component name")).toHaveValue("");
    expect(within(manualAreaSection).queryByText("Drag or add a component here")).not.toBeInTheDocument();
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
    expect(within(dialog).getByRole("treeitem", { name: /Estimate/i })).toHaveAttribute("aria-selected", "true");
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
    const materialHeader = within(livingAreaSection).getByRole("columnheader", { name: "Materials" });
    expect(within(livingAreaSection).getByRole("columnheader", { name: "Adjustment" })).toBeInTheDocument();
    expect(within(livingAreaSection).getByRole("columnheader", { name: "Total Item Cost" })).toBeInTheDocument();
    expect(materialHeader.querySelector("[data-estimate-material-header-rail='true']")).toHaveClass("w-[3px]", "bg-divider");
    expect(within(livingAreaSection).queryByRole("columnheader", { name: "Costs" })).not.toBeInTheDocument();
    expect(within(livingAreaSection).getAllByText("Total Item Cost")).toHaveLength(1);
    expect(
      within(livingAreaSection)
        .getByRole("row", { name: /Materials Qty Subtotal Adjustment Misc Cost Total Item Cost/ })
        .querySelector("svg"),
    ).toBeNull();
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

  it("commits the fresh draft percentage when the mode changes right after typing", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const adjustmentInput = screen.getByLabelText("Hardwood Oak Flooring adjustment percentage");
    const adjustmentType = screen.getByLabelText("Hardwood Oak Flooring adjustment type");

    // The plan's stale-closure guard sequence: type a draft percentage
    // (unblurred), then open the mode picker (the click blurs and commits
    // the draft), then pick Discount — the committed value must be the
    // fresh draft, negated, not a stale snapshot from open time.
    await user.clear(adjustmentInput);
    await user.type(adjustmentInput, "10");
    await user.click(adjustmentType);
    await user.click(screen.getByRole("option", { name: "Discount" }));

    expect(adjustmentType).toHaveTextContent("Discount");
    expect(screen.getByText("-₱ 5,760.00")).toBeInTheDocument();
    expect(screen.getByText("₱ 81,840.00")).toBeInTheDocument();
  });

  it("keeps area breadcrumbs as a compact node-body trail", () => {
    const { container } = renderEstimateSheet("living-area");

    const breadcrumbs = screen.getByLabelText("Living Area breadcrumbs");
    expect(breadcrumbs).toHaveClass("flex", "items-center", "gap-1", "border-x", "border-b", "border-hairline", "bg-surfaceMuted/40", "pb-2");
    expect((breadcrumbs as HTMLElement).style.paddingLeft).toBe("51px");
    expect(breadcrumbs.parentElement).not.toHaveClass("mt-1", "space-y-2");
    expect(within(breadcrumbs).getAllByText("›").every((separator) => separator.className.includes("text-current"))).toBe(true);

    const rowTable = container.querySelector("[data-estimate-row-table-root='living-area']");
    expect(rowTable).not.toBeNull();
    if (!rowTable) throw new Error("Expected living area row table to render");
    expect(rowTable).toHaveClass("border-x", "border-b", "border-hairline");
    expect(rowTable).not.toHaveClass("border", "border-t");
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

    // P4: one neutral node chrome + caret aria without the kind word, and a
    // single depth-driven rhythm (no group-vs-area header tint).
    const lotHeader = screen.getByRole("button", { name: "Collapse Lot" }).closest("div");
    if (!lotHeader) throw new Error("Expected Lot header to render.");
    expect(lotHeader).not.toHaveClass("bg-neutral-50");
    expect(screen.getByLabelText("Ground Floor")).toHaveClass("mt-[60px]");
    expect(screen.getByLabelText("New Area Node")).toHaveClass("mt-[60px]");
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

    expect(screen.getByLabelText("2-Car Parking")).toHaveClass("mt-10");
    expect(screen.getByLabelText("Living Room")).toHaveClass("mt-10");
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
    const rowDragIcon = screen.getByLabelText("Drag component Hardwood Oak Flooring");
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

    expect(within(row as HTMLElement).getByLabelText("Component name")).toHaveValue("");
    expect(within(row as HTMLElement).getByLabelText("Express component quantity")).toBeInTheDocument();
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
      expect(within(sourceRow as HTMLElement).getByLabelText("Component name")).toHaveValue("");
    });
    expect(within(targetRow as HTMLElement).getByLabelText("Hardwood Oak Flooring replaceable estimate component")).toBeInTheDocument();
  });

  it("blocks express row replace and move before optimistic metadata clobber", () => {
    const expressRow = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      material: "Express Sink",
      source: "project" as const,
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-component-1" }),
    };
    const targetRow = {
      ...estimateLibraryItems[1],
      id: "target-row-1",
      material: "Library Target",
    };
    const expressTree: EstimateTreeNode[] = [
      {
        id: "express-area",
        name: "Express Area",
        kind: "area",
        total: "PHP 0.00",
        estimateRowItems: [expressRow, targetRow],
        children: [],
      },
    ];
    renderEstimateSheet("express-area", { nodes: expressTree });

    const expressCell = screen.getByLabelText("Express Sink replaceable estimate component");
    const libraryDrop = createDataTransferStub("none");
    libraryDrop.setData(LIBRARY_ITEM_DRAG_MIME_TYPE, JSON.stringify(estimateLibraryItems[2]));
    fireEvent.dragOver(expressCell, { dataTransfer: libraryDrop });
    fireEvent.drop(expressCell, { dataTransfer: libraryDrop });

    expect(screen.getByLabelText("Express Sink replaceable estimate component")).toBeInTheDocument();
    expect(screen.queryByLabelText(`${estimateLibraryItems[2].material} replaceable estimate component`)).not.toBeInTheDocument();

    const targetCell = screen.getByLabelText("Library Target replaceable estimate component");
    const moveDrop = createDataTransferStub("none");
    fireEvent.dragStart(within(expressCell).getByRole("button", { name: "Drag component Express Sink" }), { dataTransfer: moveDrop });
    fireEvent.dragOver(targetCell, { dataTransfer: moveDrop });
    fireEvent.drop(targetCell, { dataTransfer: moveDrop });

    expect(screen.getByLabelText("Express Sink replaceable estimate component")).toBeInTheDocument();
    expect(screen.getByLabelText("Library Target replaceable estimate component")).toBeInTheDocument();
  });

  it("treats a cancelled component drag as non-destructive", async () => {
    renderEstimateSheet("living-area");

    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    const row = materialCell.closest("tr");
    expect(row).not.toBeNull();

    const dataTransfer = createDataTransferStub("none");
    fireEvent.dragStart(within(materialCell).getByRole("button", { name: "Drag component Hardwood Oak Flooring" }), { dataTransfer });
    fireEvent.dragEnd(within(materialCell).getByRole("button", { name: "Drag component Hardwood Oak Flooring" }), { dataTransfer });

    expect(within(row as HTMLElement).getByLabelText("Hardwood Oak Flooring replaceable estimate component")).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByLabelText("Drag or add a component here empty estimate component slot")).not.toBeInTheDocument();
  });

  it("removes the active group context and moves the project total out of the estimate footer", () => {
    renderEstimateSheet("living-area", {
      activeTabId: "tab-main",
      estimateTabs: [{ id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }],
    });

    expect(screen.queryByLabelText("Active estimate group context")).not.toBeInTheDocument();

    const actionHeader = screen.getByLabelText("Tab controls");
    const tabList = screen.getByRole("tablist", { name: "Estimate tabs" });
    expect(actionHeader).toHaveClass("border-b", "border-hairline");
    expect(actionHeader.compareDocumentPosition(tabList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(actionHeader).queryByRole("heading", { name: "Sheet" })).not.toBeInTheDocument();
    expect(within(actionHeader).queryByRole("heading", { name: "Living Area" })).not.toBeInTheDocument();
    expect(within(actionHeader).queryByLabelText("Search Tab")).not.toBeInTheDocument();
    expect(within(actionHeader).queryByPlaceholderText("Search Tab")).not.toBeInTheDocument();
    const sheetTools = within(actionHeader).getByLabelText("Tab tools");
    expect(sheetTools).not.toHaveClass("border-y");
    expect(within(sheetTools).queryByText("Tab tools")).not.toBeInTheDocument();
    const showSearchButton = within(sheetTools).getByRole("button", { name: "Show tab search" });
    expect(showSearchButton).toHaveAttribute("title", "Show tab search");
    expect(showSearchButton).toHaveAttribute("aria-expanded", "false");
    // D2/Req 10 (middle): Filter (filterSlot) + Group (onGroup) are now wired and present.
    expect(within(sheetTools).getByRole("button", { name: "Filter sheet" })).toBeInTheDocument();
    expect(within(sheetTools).getByRole("button", { name: "Group tab" })).toBeInTheDocument();
    expect(within(sheetTools).getByRole("button", { name: "Collapse all tab" })).toHaveAttribute("title", "Collapse all tab");
    expect(within(sheetTools).getByRole("button", { name: "Expand all tab" })).toHaveAttribute("title", "Expand all tab");
    expect(within(sheetTools).queryByRole("button", { name: "Add tab" })).not.toBeInTheDocument();
    // C3/Req 13: "New tab" button relocated to Tab tools, hidden for non-editors
    // (canEditEstimate not passed → defaults false → canCreate=false → not rendered).
    expect(within(sheetTools).queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();
    // C1/Req 1: Activity + Preview Excel Export relocated to the project chrome
    // header (EstimateHeaderActions) — no longer inside the sheet's Tab tools.
    expect(within(sheetTools).queryByRole("button", { name: "Activity" })).not.toBeInTheDocument();
    expect(within(sheetTools).queryByRole("button", { name: "Preview Excel Export" })).not.toBeInTheDocument();
    // They remain reachable, with their accessible names preserved, in the chrome.
    expect(screen.getByRole("button", { name: "Activity" })).toHaveAttribute("title", "Activity");
    expect(screen.getByRole("button", { name: "Preview Excel Export" })).toHaveAttribute("title", "Preview Excel Export");

    fireEvent.click(showSearchButton);
    const searchPanel = within(actionHeader).getByRole("search");
    expect(searchPanel).toHaveAttribute("data-tree-search-panel", "true");
    expect(searchPanel).toHaveClass("absolute", "left-0", "right-0", "top-[40px]");
    expect(within(searchPanel).getByLabelText("Search Tab")).toBeEnabled();
    expect(within(sheetTools).getByRole("button", { name: "Hide tab search" })).toHaveAttribute("aria-expanded", "true");

    // A non-empty query pins the panel open through outside clicks.
    fireEvent.change(within(searchPanel).getByLabelText("Search Tab"), { target: { value: "oak" } });
    fireEvent.pointerDown(document.body);
    expect(within(actionHeader).getByRole("search")).toBeInTheDocument();

    fireEvent.change(within(searchPanel).getByLabelText("Search Tab"), { target: { value: "" } });
    fireEvent.pointerDown(document.body);
    expect(within(actionHeader).queryByRole("search")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Tab running totals")).not.toBeInTheDocument();
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

// D2 / Req 10 (middle sheet): faceted FILTER + within-area GROUP/SORT, composed
// into displayedSheetNode only — the area hierarchy is preserved (no flatten),
// and no group-header rows are added (out of scope for the row renderer).
describe("estimate sheet filter + group/sort (D2)", () => {
  function makeFilterGroupTree(): EstimateTreeNode[] {
    function fgRow(
      id: string,
      material: string,
      supplier: string,
      category: string,
      itemCost: number,
    ): import("@/components/workshop/estimate-tree-data").EstimateRowItem {
      return {
        id,
        material,
        description: material,
        supplier,
        source: "library",
        unit: "pc",
        itemCost,
        quantity: 1,
        subTotal: itemCost,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        totalItemCosts: itemCost,
        category,
        pricingSource: "fixture",
        pricingDate: "2026-06-14",
      };
    }
    return [
      {
        id: "fg-group",
        name: "FG Group",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "fg-area-1",
            name: "FG Area 1",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              fgRow("fg-r1", "Zinc Panel", "Acme Supply", "Zeta Cat", 100),
              fgRow("fg-r2", "Brass Fitting", "Beta Supply", "Alpha Cat", 900),
              fgRow("fg-r3", "Copper Wire", "Acme Supply", "Mid Cat", 500),
            ],
            children: [],
          },
          {
            id: "fg-area-2",
            name: "FG Area 2",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [fgRow("fg-r4", "Other Item", "Gamma Supply", "Other Cat", 50)],
            children: [],
          },
        ],
      },
    ];
  }

  // Document-wide row order, de-duplicated (a row renders several cells, each
  // carrying data-estimate-row-id) and restricted to a known set of row ids so
  // a single area's ordering can be asserted regardless of DOM nesting.
  function rowOrder(only: string[]): string[] {
    const seen: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-estimate-row-id]"))) {
      const id = el.getAttribute("data-estimate-row-id") ?? "";
      if (only.includes(id) && !seen.includes(id)) seen.push(id);
    }
    return seen;
  }

  it("renders a Filter button and a Group button on the middle Tab tools header", () => {
    renderEstimateSheet("fg-group", { nodes: makeFilterGroupTree() });
    const sheetTools = within(screen.getByLabelText("Tab controls")).getByLabelText("Tab tools");
    expect(within(sheetTools).getByRole("button", { name: "Filter sheet" })).toBeInTheDocument();
    expect(within(sheetTools).getByRole("button", { name: "Group tab" })).toBeInTheDocument();
  });

  it("selecting a supplier facet hides non-matching rows but keeps the area", () => {
    renderEstimateSheet("fg-group", { nodes: makeFilterGroupTree() });
    const sheetTools = within(screen.getByLabelText("Tab controls")).getByLabelText("Tab tools");

    // Baseline: all four rows present across the two areas.
    expect(screen.getByLabelText("Select Zinc Panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Brass Fitting")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Other Item")).toBeInTheDocument();

    fireEvent.click(within(sheetTools).getByRole("button", { name: "Filter sheet" }));
    // Acme Supply matches fg-r1 + fg-r3 (both in Area 1); Area 2 has no Acme row.
    fireEvent.click(screen.getByLabelText("Supplier Acme Supply"));

    // Matching rows survive; non-matching rows are pruned.
    expect(screen.getByLabelText("Select Zinc Panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Copper Wire")).toBeInTheDocument();
    expect(screen.queryByLabelText("Select Brass Fitting")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Select Other Item")).not.toBeInTheDocument();

    // Hierarchy preserved: Area 1 still renders.
    expect(screen.getAllByText("FG Area 1").length).toBeGreaterThan(0);
  });

  it("choosing Group → Category reorders rows within an area without flattening", () => {
    renderEstimateSheet("fg-group", { nodes: makeFilterGroupTree() });
    const sheetTools = within(screen.getByLabelText("Tab controls")).getByLabelText("Tab tools");

    const area1 = ["fg-r1", "fg-r2", "fg-r3"];
    // Default order: r1 (Zeta Cat), r2 (Alpha Cat), r3 (Mid Cat).
    expect(rowOrder(area1)).toEqual(["fg-r1", "fg-r2", "fg-r3"]);

    fireEvent.click(within(sheetTools).getByRole("button", { name: "Group tab" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Category" }));

    // Category-grouped order (alpha by category): Alpha Cat (r2), Mid Cat (r3), Zeta Cat (r1).
    expect(rowOrder(area1)).toEqual(["fg-r2", "fg-r3", "fg-r1"]);

    // Area 2 still exists as its own area (no flatten across areas).
    expect(screen.getAllByText("FG Area 2").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Select Other Item")).toBeInTheDocument();
  });
});
