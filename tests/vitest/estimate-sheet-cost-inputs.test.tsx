import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { estimateLibraryItems } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

function renderEstimateSheet(selectedNodeId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent selectedNodeId={selectedNodeId} />
    </QueryClientProvider>,
  );
}

describe("estimate shell chrome", () => {
  it("renders breadcrumbs in the upper-left project header", async () => {
    render(
      await WorkshopPageShell({
        title: "Modern Bungalow",
        eyebrow: "Project",
        breadcrumbs: ["Workshop", "Projects", "Modern Bungalow"],
        children: (
        <div>Estimate workspace</div>
        ),
      }),
    );

    const breadcrumbs = screen.getByLabelText("Project breadcrumbs");
    expect(within(breadcrumbs).getByText("Workshop")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Projects")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Modern Bungalow")).toBeInTheDocument();
  });
});

describe("estimate sheet cost inputs", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("renders the locally selected tree node before route props catch up", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent selectedNodeId="living-area" estimateId="estimate-1" />
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
        <EstimateSheetContent selectedNodeId="deleted-node" estimateId="estimate-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/^Lot A/)).toBeInTheDocument();
    await waitFor(() => {
      expect(useEstimateWorkspaceState.getState().selectedNodeIdByEstimateId["estimate-1"]).toBe("lot-primary-residence");
    });
  });

  it("displays cost inputs as pesos when idle but keeps focused typing uninterrupted", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("main-house");

    const otherCostInput = screen.getByLabelText("HEMLINGBY Loveseat other costs");
    const laborCostInput = screen.getByLabelText("HEMLINGBY Loveseat labor cost");
    const row = otherCostInput.closest("tr");
    expect(row).not.toBeNull();

    expect(otherCostInput).toHaveValue("₱0.00");
    expect(laborCostInput).toHaveValue("₱1,200.00");

    await user.click(otherCostInput);
    expect(otherCostInput).toHaveValue("0");
    await user.clear(otherCostInput);
    await user.type(otherCostInput, "400");
    expect(otherCostInput).toHaveValue("400");
    expect(otherCostInput).toHaveFocus();

    await user.click(laborCostInput);
    expect(otherCostInput).toHaveValue("₱400.00");
    expect(laborCostInput).toHaveValue("1200");
    await user.clear(laborCostInput);
    await user.type(laborCostInput, "400");
    expect(laborCostInput).toHaveValue("400");
    expect(laborCostInput).toHaveFocus();

    await user.tab();
    expect(laborCostInput).toHaveValue("₱400.00");
    expect(within(row as HTMLElement).getByText("₱8,799.00")).toBeInTheDocument();
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

  it("supports baseline spreadsheet keyboard movement across editable row cells", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const firstQuantity = screen.getByLabelText("Hardwood Oak Flooring quantity");
    await user.click(firstQuantity);
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("HEMLINGBY Loveseat quantity")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("HEMLINGBY Loveseat other costs")).toHaveFocus();

    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(screen.getByLabelText("Hardwood Oak Flooring other costs")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByLabelText("Hardwood Oak Flooring quantity")).toHaveFocus();
  });

  it("marks estimate component cells as replaceable draggable sources and highlights focused row editing", async () => {
    const user = userEvent.setup();
    renderEstimateSheet("living-area");

    const materialCell = screen.getByLabelText("Hardwood Oak Flooring replaceable estimate component");
    expect(materialCell).toHaveAttribute("draggable", "true");
    expect(within(materialCell).getByText("Drag / replace component")).toBeInTheDocument();
    expect(within(materialCell).getByText("Source-linked estimate component")).toBeInTheDocument();

    const quantityInput = screen.getByLabelText("Hardwood Oak Flooring quantity");
    await user.click(quantityInput);

    const activeRow = quantityInput.closest("tr");
    expect(activeRow).toHaveAttribute("data-estimate-row-active", "true");
    expect(quantityInput.closest("td")).toHaveAttribute("data-estimate-cell-active", "true");
  });

  it("removes the active group context and moves the project total out of the estimate footer", () => {
    renderEstimateSheet("living-area");

    expect(screen.queryByLabelText("Active estimate group context")).not.toBeInTheDocument();

    const actionHeader = screen.getByLabelText("Sheet controls");
    expect(within(actionHeader).queryByRole("heading", { name: "Sheet" })).not.toBeInTheDocument();
    expect(within(actionHeader).queryByRole("heading", { name: "Living Area" })).not.toBeInTheDocument();
    expect(within(actionHeader).getByLabelText("Search Sheet")).toBeInTheDocument();
    expect(within(actionHeader).getByPlaceholderText("Search Sheet")).toBeInTheDocument();
    const sheetTools = within(actionHeader).getByLabelText("Sheet tools");
    expect(sheetTools).not.toHaveClass("border-y");
    expect(within(sheetTools).queryByText("Sheet tools")).not.toBeInTheDocument();
    expect(within(sheetTools).getByRole("button", { name: "Filter sheet" })).toHaveAttribute("title", "Filter sheet");
    expect(within(sheetTools).getByRole("button", { name: "Group sheet" })).toHaveAttribute("title", "Group sheet");
    expect(within(sheetTools).queryByRole("button", { name: "Collapse all sheet" })).not.toBeInTheDocument();
    expect(within(sheetTools).queryByRole("button", { name: "Expand all sheet" })).not.toBeInTheDocument();
    expect(within(sheetTools).getByRole("button", { name: "Add sheet" })).toHaveAttribute("title", "Add sheet");

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

    expect(screen.queryByLabelText("Hardwood Oak Flooring replaceable estimate component")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("HEMLINGBY Loveseat replaceable estimate component").length).toBeGreaterThan(1);
    expect(screen.getAllByLabelText("HEMLINGBY Loveseat quantity").some((input) => (input as HTMLInputElement).value === "7")).toBe(true);
  });
});
