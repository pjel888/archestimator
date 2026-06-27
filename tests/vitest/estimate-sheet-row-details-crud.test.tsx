import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { withExpressComponentMetadata } from "@/lib/estimates/express-components";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  deleteEstimateRowItem: vi.fn(),
  detachEstimateRowItemFromLibrary: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "77777777-7777-4777-8777-777777777719";
const targetNodeId = "55555555-5555-4555-8555-555555555561";
const projectSpecificRowId = "66666666-6666-4666-8666-666666666671";
const expressRowId = "66666666-6666-4666-8666-666666666672";
const sourceLessRowId = "66666666-6666-4666-8666-666666666673";
const sourceChangedRowId = "66666666-6666-4666-8666-666666666674";

const projectSpecificRow: EstimateRowItem = {
  id: projectSpecificRowId,
  material: "Custom Built-in Cabinet",
  description: "Detached cabinet snapshot",
  supplier: "Local millwork shop",
  source: "project",
  unit: "lm",
  itemCost: 1500,
  quantity: 2,
  subTotal: 3000,
  contingencyPercentage: 5,
  contingencyValue: 150,
  miscCost: 250,
  totalItemCosts: 3400,
  rowRevision: 7,
  category: "Cabinetry",
  pricingSource: "Estimate row snapshot",
  pricingDate: "2026-06-15",
  sourceLibraryItemId: null,
  linkState: "detached",
  discipline: "Architectural",
  designation: "CAB-01",
};

const emptyExpressRow: EstimateRowItem = {
  id: expressRowId,
  material: "",
  description: "",
  supplier: "",
  source: "project",
  unit: "",
  itemCost: 0,
  quantity: 1,
  subTotal: 0,
  contingencyPercentage: 0,
  contingencyValue: 0,
  miscCost: 0,
  totalItemCosts: 0,
  rowRevision: 3,
  category: "Unassigned",
  pricingSource: "Express component",
  pricingDate: "2026-06-15",
  sourceLibraryItemId: null,
  linkState: "unlinked",
  metadata: withExpressComponentMetadata({}, {
    id: "express-component-empty-fields",
    createdFrom: "estimate-sheet-add-row",
    sourceLabel: "Express component",
  }),
};

const sourceLessProjectRow: EstimateRowItem = {
  id: sourceLessRowId,
  material: "Owner-Supplied Pendant",
  description: "Project-only allowance row",
  supplier: "",
  source: "project",
  unit: "pc",
  itemCost: 2500,
  quantity: 1,
  subTotal: 2500,
  contingencyPercentage: 0,
  contingencyValue: 0,
  miscCost: 0,
  totalItemCosts: 2500,
  rowRevision: 2,
  category: "Lighting",
  pricingSource: "Manual estimate row",
  pricingDate: "2026-06-15",
  sourceLibraryItemId: null,
  linkState: "unlinked",
};

const sourceChangedLibraryRow: EstimateRowItem = {
  id: sourceChangedRowId,
  material: "Library Faucet",
  description: "Library source changed after insertion",
  supplier: "Fixture House",
  source: "library",
  unit: "pc",
  itemCost: 4500,
  quantity: 1,
  subTotal: 4500,
  contingencyPercentage: 0,
  contingencyValue: 0,
  miscCost: 0,
  totalItemCosts: 4500,
  rowRevision: 5,
  category: "Plumbing",
  pricingSource: "Library snapshot",
  pricingDate: "2026-06-15",
  sourceLibraryItemId: "library-faucet-source",
  linkState: "source-changed",
};

function treeWithRows(rows: EstimateRowItem[]): EstimateTreeNode[] {
  return [
    {
      id: targetNodeId,
      name: "Kitchen",
      kind: "area",
      total: "PHP 3,400.00",
      estimateRowItems: rows,
      children: [],
    },
  ];
}

function renderPersistedEstimateSheet(rows: EstimateRowItem[]) {
  const nodes = treeWithRows(rows);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  actionMocks.fetchEstimateTree.mockResolvedValue(nodes);

  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId={targetNodeId}
        nodes={nodes}
        projectId={projectId}
        estimateId={estimateId}
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
}

function updateResult(input: Record<string, unknown>, base: EstimateRowItem) {
  return {
    rowId: base.id,
    nodeId: targetNodeId,
    material: typeof input.material === "string" ? input.material : base.material,
    description: typeof input.description === "string" ? input.description : base.description,
    supplier: typeof input.supplier === "string" ? input.supplier : base.supplier,
    unit: typeof input.unit === "string" ? input.unit : base.unit,
    quantity: typeof input.quantity === "number" ? input.quantity : base.quantity,
    itemCost: typeof input.unitCost === "number" ? input.unitCost : base.itemCost,
    contingencyPercentage: typeof input.contingencyPercentage === "number" ? input.contingencyPercentage : base.contingencyPercentage ?? 0,
    contingencyValue: base.contingencyValue ?? 0,
    miscCost: typeof input.miscCost === "number" ? input.miscCost : base.miscCost,
    sourceSnapshot: input.sourceSnapshot ?? null,
    metadata: input.metadata ?? base.metadata,
    linkState: base.linkState,
    rowRevision: (base.rowRevision ?? 1) + 1,
  };
}

describe("estimate sheet row details and CRUD entry points", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    actionMocks.deleteEstimateRowItem.mockResolvedValue(undefined);
    actionMocks.updateEstimateRowItem.mockImplementation((input: Record<string, unknown>) => {
      const base = input.rowId === expressRowId ? emptyExpressRow : projectSpecificRow;
      return Promise.resolve(updateResult(input, base));
    });
  });

  it("opens project-specific component-card details on the Component tab with row information", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet([projectSpecificRow]);

    const componentCard = screen.getByLabelText("Custom Built-in Cabinet replaceable estimate component");
    await user.click(within(componentCard).getByRole("button", { name: "Open component details for Custom Built-in Cabinet" }));

    const dialog = await screen.findByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getByRole("tab", { name: "Component" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByText("Current component")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Custom Built-in Cabinet").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("Local millwork shop").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("Project Component").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("This component keeps the current row values and no longer follows library updates.").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("2 lm")).toBeInTheDocument();
    expect(within(dialog).getAllByText("₱ 3,400.00").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("CAB-01")).toBeInTheDocument();
  });

  it("opens empty express component-card details without crashing and shows empty row info", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet([emptyExpressRow]);

    const componentCard = screen.getByLabelText("Project Component replaceable estimate component");
    await user.click(within(componentCard).getByRole("button", { name: "Open component details for Project Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getByRole("tab", { name: "Component" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByText("1")).toBeInTheDocument();
    expect(within(dialog).getByText("Current component")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Project Component").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/authored directly in the estimate row/i).length).toBeGreaterThan(0);
    expect(within(dialog).getByText("No image yet")).toBeInTheDocument();
    expect(within(dialog).queryByText("Manual component")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Express component")).not.toBeInTheDocument();
    expect(within(dialog).getAllByText("₱ 0.00").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("opens source-less row details as a Project Component", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet([sourceLessProjectRow]);

    const componentCard = screen.getByLabelText("Owner-Supplied Pendant replaceable estimate component");
    await user.click(within(componentCard).getByRole("button", { name: "Open component details for Owner-Supplied Pendant" }));

    const dialog = await screen.findByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getByRole("tab", { name: "Component" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getAllByText("Project Component").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("This row is not linked to a library component.").length).toBeGreaterThan(0);
    expect(within(dialog).queryByText("Manual component")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Manual estimate row")).not.toBeInTheDocument();
  });

  it("opens source-changed row details as a Library Component", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet([sourceChangedLibraryRow]);

    const componentCard = screen.getByLabelText("Library Faucet replaceable estimate component");
    await user.click(within(componentCard).getByRole("button", { name: "Open component details for Library Faucet" }));

    const dialog = await screen.findByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getByRole("tab", { name: "Component" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getAllByText("Library Component").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("The source library component changed after this row was added. Review before replacing or detaching it.").length).toBeGreaterThan(0);
    expect(within(dialog).queryByText("Library source changed")).not.toBeInTheDocument();
  });

  it("keeps express saves, project-specific scalar edits, and row delete actions usable", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet([emptyExpressRow, projectSpecificRow]);

    const expressNameInput = screen.getByLabelText("Component name");
    await user.click(expressNameInput);
    await user.type(expressNameInput, "Express Pantry Shelf");
    fireEvent.blur(expressNameInput);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: expressRowId,
      material: "Express Pantry Shelf",
      expectedRowRevision: 3,
    })));

    const quantityInput = screen.getByLabelText("Custom Built-in Cabinet quantity");
    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "4");
    fireEvent.blur(quantityInput);

    const adjustmentInput = screen.getByLabelText("Custom Built-in Cabinet adjustment percentage");
    await user.click(adjustmentInput);
    await user.clear(adjustmentInput);
    await user.type(adjustmentInput, "8");
    fireEvent.blur(adjustmentInput);

    const miscInput = screen.getByLabelText("Custom Built-in Cabinet misc cost");
    await user.click(miscInput);
    await user.clear(miscInput);
    await user.type(miscInput, "375");
    fireEvent.blur(miscInput);

    await waitFor(() => {
      expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({ rowId: projectSpecificRowId, quantity: 4 }));
      expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({ rowId: projectSpecificRowId, adjustmentPercentage: 8 }));
      expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({ rowId: projectSpecificRowId, miscCost: 375 }));
    });

    await user.click(screen.getByRole("button", { name: "Delete row Custom Built-in Cabinet" }));

    await waitFor(() => expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: projectSpecificRowId,
    })));
    expect(screen.queryByLabelText("Custom Built-in Cabinet replaceable estimate component")).not.toBeInTheDocument();
  });
});
