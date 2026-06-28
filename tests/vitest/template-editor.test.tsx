import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateEditorClient } from "@/components/workshop/library/template-editor/TemplateEditorClient";
import {
  beginEstimateWorkshopDrag,
  endEstimateWorkshopDrag,
} from "@/components/workshop/estimate-workshop-drag";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import { loadCurrentWorkspaceComponentLibraryLite } from "@/lib/component-library/actions";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

const componentLibraryMocks = vi.hoisted(() => ({
  estimateRightSidebar: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => ({
  loadCurrentWorkspaceComponentLibraryLite: vi.fn(async () => ({
    libraryItems: [],
    templates: [],
    categoryTree: [],
    suppliers: [],
    brands: [],
    libraryFolders: [],
  })),
}));

vi.mock("@/components/workshop/component-library", () => ({
  EstimateRightSidebar: (props: unknown) => {
    componentLibraryMocks.estimateRightSidebar(props);
    return <aside aria-label="Components dock stub" />;
  },
}));

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
                sourceLibraryItemId: "component-row-1",
                linkState: "linked-clean",
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

function renderEditor(template: EstimateTemplate, props: { canEditTemplate?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TemplateEditorClient template={template} workspaceId="workspace-1" {...props} />
    </QueryClientProvider>,
  );
}

describe("TemplateEditorClient", () => {
  beforeEach(() => {
    navigationMocks.refresh.mockReset();
    componentLibraryMocks.estimateRightSidebar.mockReset();
    vi.mocked(loadCurrentWorkspaceComponentLibraryLite).mockClear();
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
    renderEditor(buildTemplate());

    expect(useLibraryEditorChrome.getState().breadcrumb).toEqual({
      templateId: "template-1",
      templateName: "Powder Room Basic",
      category: "Residential Rooms",
    });
    expect(screen.getByRole("region", { name: "Template content" })).toBeInTheDocument();
    const sourceTrust = screen.getByLabelText("Source trust for Powder Room Basic");
    expect(within(sourceTrust).getByText("1/2 linked rows")).toBeInTheDocument();
    expect(within(sourceTrust).getByText("Current")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GROHE Lavatory Faucet")).toBeInTheDocument();
    expect(screen.getByText("Totals are reference pricing: estimates re-price on insert")).toBeInTheDocument();
  });

  it("keeps the re-hosted sidebar template-only without project-source props", async () => {
    renderEditor(buildTemplate());
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Load components dock" }));

    await waitFor(() => expect(componentLibraryMocks.estimateRightSidebar).toHaveBeenCalled());
    const props = componentLibraryMocks.estimateRightSidebar.mock.calls.at(-1)?.[0] as {
      templateCreateMode?: string;
      visibleTabs?: string[];
      projectId?: string;
      estimateId?: string;
      projectSources?: unknown[];
      onInsertProjectSource?: unknown;
      projectTabUnavailable?: unknown;
    };

    expect(props.templateCreateMode).toBe("scratch");
    expect(props.visibleTabs).toEqual(["components", "project"]);
    expect(props.projectId).toBeUndefined();
    expect(props.estimateId).toBeUndefined();
    expect(props.projectSources).toBeUndefined();
    expect(props.onInsertProjectSource).toBeUndefined();
    expect(props.projectTabUnavailable).toBeDefined();
  });

  it("hides template mutation affordances when rendered read-only", async () => {
    renderEditor(buildTemplate(), { canEditTemplate: false });

    const sheet = screen.getByRole("region", { name: "Template content" });
    expect(within(sheet).queryByRole("button", { name: "Add group" })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Add area" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove row GROHE Lavatory Faucet" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("GROHE Lavatory Faucet quantity")).toBeDisabled();
    expect(screen.getByLabelText("GROHE Lavatory Faucet unit cost")).toBeDisabled();
    expect(screen.queryByLabelText("Add row to Toilet + Bath")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load components dock" })).not.toBeInTheDocument();

    act(() => beginEstimateWorkshopDrag({ kind: "library-item" }));
    expect(screen.queryByText("Drop to add the component to Toilet + Bath")).not.toBeInTheDocument();
    act(() => endEstimateWorkshopDrag());

    fireEvent.change(screen.getByLabelText("GROHE Lavatory Faucet quantity"), { target: { value: "3" } });
    fireEvent.blur(screen.getByLabelText("GROHE Lavatory Faucet quantity"));

    await waitFor(() => {
      expect(actionMocks.updateEstimateTemplateRowItem).not.toHaveBeenCalled();
    });
    expect(componentLibraryMocks.estimateRightSidebar).not.toHaveBeenCalled();
  });

  it("does not auto-load the components dock before user intent", async () => {
    vi.useFakeTimers();
    try {
      renderEditor(buildTemplate());

      expect(loadCurrentWorkspaceComponentLibraryLite).not.toHaveBeenCalled();
      expect(componentLibraryMocks.estimateRightSidebar).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1_200);
        await Promise.resolve();
      });

      expect(loadCurrentWorkspaceComponentLibraryLite).not.toHaveBeenCalled();
      expect(componentLibraryMocks.estimateRightSidebar).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("commits an inline quantity edit through the row update action", async () => {
    renderEditor(buildTemplate());

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
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("coalesces rapid inline row edits into one deferred refresh", async () => {
    renderEditor(buildTemplate());

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

    const unitCostInput = screen.getByLabelText("GROHE Lavatory Faucet unit cost");
    fireEvent.change(unitCostInput, { target: { value: "12000" } });
    fireEvent.blur(unitCostInput);

    await waitFor(() => {
      expect(actionMocks.updateEstimateTemplateRowItem).toHaveBeenCalledWith({
        templateId: "template-1",
        rowId: "row-1",
        patch: { unitCost: 12000 },
      });
    });
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12000")).toBeInTheDocument();
  });

  it("removes a row optimistically", async () => {
    renderEditor(buildTemplate());

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
    renderEditor(buildTemplate());

    fireEvent.click(screen.getByRole("button", { name: "Remove row GROHE Lavatory Faucet" }));

    await waitFor(() => {
      expect(useLibraryEditorChrome.getState().saveState).toEqual({ state: "error", message: "RLS said no" });
    });
    expect(screen.getByDisplayValue("GROHE Lavatory Faucet")).toBeInTheDocument();
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
  });

  it("creates an allowance row from the ghost row", async () => {
    renderEditor(buildTemplate());

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

  it("adds a group from the sheet toolbar via the DS name dialog", async () => {
    // P1 T8 (F22): native window.prompt was replaced with an in-DS dialog.
    renderEditor(buildTemplate());

    const sheet = screen.getByRole("region", { name: "Template content" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Add group" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Group name"), { target: { value: "Second Bathroom" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

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

  it("shows a component drop zone on areas during a library drag and inserts on drop", async () => {
    actionMocks.addEstimateTemplateRowItems.mockResolvedValue({ rows: [] });
    renderEditor(buildTemplate());

    act(() => beginEstimateWorkshopDrag({ kind: "library-item" }));
    const zone = await screen.findByText("Drop to add the component to Toilet + Bath");

    const dataTransfer = createDataTransferStub(["application/x-archestimator-library-item"]);
    dataTransfer.setData(
      "application/x-archestimator-library-item",
      JSON.stringify({
        id: "lib-tile",
        material: "600x600 Porcelain Tile",
        description: "",
        supplier: "Mariwasa",
        source: "library",
        unit: "sqm",
        itemCost: 185,
        quantity: 1,
        subTotal: 185,
        miscCost: 0,
        totalItemCosts: 185,
        category: "Finishes",
        pricingSource: "Test",
        pricingDate: "2026-05-01",
      }),
    );
    fireEvent.drop(zone.closest("[data-template-editor-node]") as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    await waitFor(() => {
      expect(actionMocks.addEstimateTemplateRowItems).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: "template-1", nodeId: "area-1" }),
      );
    });
    expect(screen.getByDisplayValue("600x600 Porcelain Tile")).toBeInTheDocument();
  });

  it("inserts a dragged template at the root through the composition action", async () => {
    actionMocks.insertTemplateIntoTemplate.mockResolvedValue({ insertedNodeIds: [] });
    renderEditor(buildTemplate());

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "tpl-2", templateName: "Kitchen Starter" }));
    const rootZone = await screen.findByText("Drop Kitchen Starter here to add it at the template root");

    const dataTransfer = createDataTransferStub(["application/x-archestimator-estimate-template"]);
    dataTransfer.setData("application/x-archestimator-estimate-template", JSON.stringify({ templateId: "tpl-2" }));
    fireEvent.drop(rootZone.closest("[data-template-root-drop-zone]") as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    await waitFor(() => {
      expect(actionMocks.insertTemplateIntoTemplate).toHaveBeenCalledWith({
        targetTemplateId: "template-1",
        targetNodeId: null,
        sourceTemplateId: "tpl-2",
        sourceNodeId: undefined,
      });
    });
  });

  it("blocks self-insert from a template drag", async () => {
    renderEditor(buildTemplate());

    act(() => beginEstimateWorkshopDrag({ kind: "estimate-template", templateId: "template-1", templateName: "Powder Room Basic" }));
    const rootZone = await screen.findByText("Drop Powder Room Basic here to add it at the template root");

    const dataTransfer = createDataTransferStub(["application/x-archestimator-estimate-template"]);
    dataTransfer.setData("application/x-archestimator-estimate-template", JSON.stringify({ templateId: "template-1" }));
    fireEvent.drop(rootZone.closest("[data-template-root-drop-zone]") as HTMLElement, { dataTransfer });
    act(() => endEstimateWorkshopDrag());

    expect(actionMocks.insertTemplateIntoTemplate).not.toHaveBeenCalled();
  });

  it("deletes a node after confirmation", async () => {
    // P1 T8 (F22): native window.confirm was replaced with a destructive DS dialog.
    renderEditor(buildTemplate());

    fireEvent.click(screen.getByRole("button", { name: "Delete area Toilet + Bath" }));
    // Destructive ConfirmDialog renders role="alertdialog".
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

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
