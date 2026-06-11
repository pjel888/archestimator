import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateEditorClient } from "@/components/workshop/library/template-editor/TemplateEditorClient";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

const actionMocks = vi.hoisted(() => ({
  addEstimateTemplateRowItems: vi.fn(),
  createEstimateTemplateAllowanceRow: vi.fn(),
  createEstimateTemplateNode: vi.fn(),
  deleteEstimateTemplateNode: vi.fn(),
  insertTemplateIntoTemplate: vi.fn(),
  moveEstimateTemplateNode: vi.fn(),
  removeEstimateTemplateRowItem: vi.fn(),
  renameEstimateTemplateNode: vi.fn(),
  updateEstimateTemplateRowItem: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/component-library/template-editor-actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigationMocks.refresh, push: navigationMocks.push }),
  usePathname: () => "/workshop/library/templates/template-1",
  useSelectedLayoutSegments: () => ["templates", "template-1"],
}));

function buildTemplate(): EstimateTemplate {
  return {
    id: "template-1",
    name: "Powder Room Basic",
    description: "Compact toilet and bath template",
    category: "Residential Rooms",
    nodes: [
      {
        id: "group-1",
        name: "Powder Room",
        kind: "group",
        total: "",
        children: [
          {
            id: "area-1",
            name: "Toilet + Bath",
            kind: "area",
            total: "",
            children: [],
            estimateRowItems: [
              {
                id: "row-1",
                material: "GROHE Lavatory Faucet",
                description: "",
                supplier: "GROHE",
                source: "library",
                unit: "pc",
                itemCost: 9800,
                quantity: 1,
                subTotal: 9800,
                contingencyPercentage: 0,
                contingencyValue: 0,
                miscCost: 0,
                totalItemCosts: 9800,
                category: "Plumbing Fixtures",
                pricingSource: "Test",
                pricingDate: "2026-05-01",
              },
              {
                id: "row-2",
                material: "Wall Tile Allowance",
                description: "",
                supplier: "",
                source: "project",
                unit: "sqm",
                itemCost: 1833.33,
                quantity: 12,
                subTotal: 21999.96,
                contingencyPercentage: 0,
                contingencyValue: 0,
                miscCost: 0,
                totalItemCosts: 21999.96,
                category: "Finishes",
                pricingSource: "Test",
                pricingDate: "2026-05-01",
              },
            ],
          },
        ],
        estimateRowItems: [],
      },
    ],
  };
}

describe("TemplateEditorClient", () => {
  beforeEach(() => {
    navigationMocks.refresh.mockReset();
    for (const mock of Object.values(actionMocks)) mock.mockReset();
    actionMocks.updateEstimateTemplateRowItem.mockResolvedValue({ row: {} });
    actionMocks.removeEstimateTemplateRowItem.mockResolvedValue({ rowId: "row-1" });
    actionMocks.createEstimateTemplateAllowanceRow.mockResolvedValue({ row: {} });
    actionMocks.createEstimateTemplateNode.mockResolvedValue({ node: {} });
    actionMocks.deleteEstimateTemplateNode.mockResolvedValue({ deletedNodeIds: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("publishes the breadcrumb chrome and renders the sheet", () => {
    render(<TemplateEditorClient template={buildTemplate()} />);

    expect(useLibraryEditorChrome.getState().breadcrumb).toEqual({
      templateId: "template-1",
      templateName: "Powder Room Basic",
      category: "Residential Rooms",
    });
    expect(screen.getByRole("region", { name: "Template sheet" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("GROHE Lavatory Faucet")).toBeInTheDocument();
    expect(screen.getByText("Totals are reference pricing: estimates re-price on insert")).toBeInTheDocument();
  });

  it("commits an inline quantity edit through the row update action", async () => {
    render(<TemplateEditorClient template={buildTemplate()} />);

    const quantityInput = screen.getByLabelText("GROHE Lavatory Faucet quantity");
    fireEvent.change(quantityInput, { target: { value: "3" } });
    fireEvent.blur(quantityInput);

    await waitFor(() => {
      expect(actionMocks.updateEstimateTemplateRowItem).toHaveBeenCalledWith({
        templateId: "template-1",
        rowId: "row-1",
        patch: { quantity: 3 },
      });
    });
    expect(navigationMocks.refresh).toHaveBeenCalled();
  });

  it("removes a row optimistically", async () => {
    render(<TemplateEditorClient template={buildTemplate()} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove row GROHE Lavatory Faucet" }));

    await waitFor(() => {
      expect(actionMocks.removeEstimateTemplateRowItem).toHaveBeenCalledWith({
        templateId: "template-1",
        rowId: "row-1",
      });
    });
    await waitFor(() => {
      expect(screen.queryByDisplayValue("GROHE Lavatory Faucet")).not.toBeInTheDocument();
    });
  });

  it("rolls the row back when the server rejects the removal", async () => {
    actionMocks.removeEstimateTemplateRowItem.mockRejectedValue(new Error("RLS said no"));
    render(<TemplateEditorClient template={buildTemplate()} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove row GROHE Lavatory Faucet" }));

    await waitFor(() => {
      expect(useLibraryEditorChrome.getState().saveState).toEqual({ state: "error", message: "RLS said no" });
    });
    expect(screen.getByDisplayValue("GROHE Lavatory Faucet")).toBeInTheDocument();
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
  });

  it("creates an allowance row from the ghost row", async () => {
    render(<TemplateEditorClient template={buildTemplate()} />);

    const ghostInput = screen.getByLabelText("Add row to Toilet + Bath");
    fireEvent.change(ghostInput, { target: { value: "Floor drain allowance" } });
    fireEvent.keyDown(ghostInput, { key: "Enter" });

    await waitFor(() => {
      expect(actionMocks.createEstimateTemplateAllowanceRow).toHaveBeenCalledWith({
        templateId: "template-1",
        nodeId: "area-1",
        material: "Floor drain allowance",
      });
    });
    expect(screen.getByDisplayValue("Floor drain allowance")).toBeInTheDocument();
  });

  it("adds a group from the sheet toolbar via prompt", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Second Bathroom");
    render(<TemplateEditorClient template={buildTemplate()} />);

    const sheet = screen.getByRole("region", { name: "Template sheet" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Add group" }));

    await waitFor(() => {
      expect(actionMocks.createEstimateTemplateNode).toHaveBeenCalledWith({
        templateId: "template-1",
        parentId: null,
        kind: "group",
        name: "Second Bathroom",
      });
    });
    // Appears in both the sheet and the structure tree optimistically.
    expect(screen.getAllByText("Second Bathroom").length).toBeGreaterThanOrEqual(1);
  });

  it("deletes a node after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TemplateEditorClient template={buildTemplate()} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete area Toilet + Bath" }));

    await waitFor(() => {
      expect(actionMocks.deleteEstimateTemplateNode).toHaveBeenCalledWith({
        templateId: "template-1",
        nodeId: "area-1",
      });
    });
    await waitFor(() => {
      expect(screen.queryByText("Toilet + Bath")).not.toBeInTheDocument();
    });
  });
});
