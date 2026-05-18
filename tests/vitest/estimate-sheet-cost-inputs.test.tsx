import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { estimateLibraryItems } from "@/components/workshop/estimate-tree-data";

describe("estimate shell chrome", () => {
  it("renders breadcrumbs in the upper-left project header", () => {
    render(
      <WorkshopPageShell title="Modern Bungalow" eyebrow="Project" breadcrumbs={["Workshop", "Projects", "Modern Bungalow"]}>
        <div>Estimate workspace</div>
      </WorkshopPageShell>,
    );

    const breadcrumbs = screen.getByLabelText("Project breadcrumbs");
    expect(within(breadcrumbs).getByText("Workshop")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Projects")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Modern Bungalow")).toBeInTheDocument();
  });
});

describe("estimate sheet cost inputs", () => {
  it("displays cost inputs as pesos when idle but keeps focused typing uninterrupted", async () => {
    const user = userEvent.setup();
    render(<EstimateSheetContent selectedNodeId="main-house" />);

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

  it("uses an explicit area target when the selected node is not an area and focuses the inserted row quantity", async () => {
    const user = userEvent.setup();
    render(<EstimateSheetContent selectedNodeId="main-house" />);

    expect(screen.getByText("Target required: choose an area")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Insert target area"), "kitchen");
    expect(screen.getByText("Target: Kitchen")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: estimateLibraryItems[0] }));
    });

    const kitchenSection = screen.getByLabelText("Kitchen area group");
    const insertedQuantity = await within(kitchenSection).findByLabelText("HEMLINGBY Loveseat quantity");
    await waitFor(() => expect(insertedQuantity).toHaveFocus());
    expect(within(kitchenSection).getAllByText("HEMLINGBY Loveseat")).toHaveLength(1);
  });

  it("supports baseline spreadsheet keyboard movement across editable row cells", async () => {
    const user = userEvent.setup();
    render(<EstimateSheetContent selectedNodeId="living-area" />);

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
    render(<EstimateSheetContent selectedNodeId="living-area" />);

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

  it("keeps group context out of the action header and aligns the project total in the estimate footer", () => {
    render(<EstimateSheetContent selectedNodeId="living-area" />);

    const activeContext = screen.getByLabelText("Active estimate group context");
    expect(within(activeContext).getByText("Living Area")).toBeInTheDocument();
    expect(within(activeContext).getByText("Area group")).toBeInTheDocument();

    const actionHeader = screen.getByLabelText("Estimate sheet controls");
    expect(within(actionHeader).queryByRole("heading", { name: "Living Area" })).not.toBeInTheDocument();
    expect(within(actionHeader).getByLabelText("Search estimate rows")).toBeInTheDocument();
    expect(within(actionHeader).getByRole("button", { name: "Delete selected row items" })).toBeDisabled();

    const footer = screen.getByLabelText("Estimate sheet running totals");
    expect(within(footer).getByText("Ongoing total project cost")).toBeInTheDocument();
    expect(within(footer).getByText("₱1,208,527.00")).toBeInTheDocument();
  });

  it("replaces the row estimate component on drop while preserving editable row fields", async () => {
    const user = userEvent.setup();
    render(<EstimateSheetContent selectedNodeId="living-area" />);

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
