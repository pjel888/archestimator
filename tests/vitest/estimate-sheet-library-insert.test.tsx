import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { isUuid } from "@/lib/ids";

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
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "77777777-7777-4777-8777-777777777719";
const targetNodeId = "55555555-5555-4555-8555-555555555561";
const groupNodeId = "55555555-5555-4555-8555-555555555560";
const cabinetRowId = "66666666-6666-4666-8666-666666666661";
const sinkRowId = "66666666-6666-4666-8666-666666666662";

const nodes: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [],
    children: [],
  },
];

const nodesWithGroup: EstimateTreeNode[] = [
  {
    id: groupNodeId,
    name: "Ground Floor",
    kind: "group",
    total: "PHP 0.00",
    children: nodes,
  },
];

const starterTemplate = {
  id: "template-condo-fit-out-starter",
  name: "Condo Fit-Out Starter",
  description: "Starter fit-out",
  category: "Residential Rooms",
  nodes: [
    {
      id: "template-interior",
      name: "Interior Fit-Out",
      kind: "group" as const,
      total: "PHP 0.00",
      children: [
        {
          id: "template-living",
          name: "Living + Dining",
          kind: "area" as const,
          total: "PHP 0.00",
          estimateRowItems: [
            {
              id: "lib-sofa",
              material: "HEMLINGBY Loveseat",
              description: "Sofa",
              supplier: "IKEA Philippines",
              source: "library" as const,
              unit: "pc",
              itemCost: 7999,
              quantity: 1,
              subTotal: 7999,
              miscCost: 1200,
              totalItemCosts: 9199,
              category: "Furniture",
              pricingSource: "test",
              pricingDate: "2026-05-22",
            },
          ],
        },
      ],
    },
  ],
};

const nodesWithRow: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [
      {
        id: cabinetRowId,
        material: "Kitchen Cabinet",
        description: "Base cabinet",
        supplier: "Local supplier",
        source: "project",
        unit: "lm",
        itemCost: 100,
        quantity: 2,
        subTotal: 200,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        totalItemCosts: 210,
        rowRevision: 7,
        category: "Cabinetry",
        pricingSource: "Estimate row snapshot",
        pricingDate: "2026-05-22",
      },
      {
        id: sinkRowId,
        material: "Kitchen Sink",
        description: "Single bowl sink",
        supplier: "Local supplier",
        source: "project",
        unit: "pc",
        itemCost: 250,
        quantity: 1,
        subTotal: 250,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        totalItemCosts: 250,
        rowRevision: 3,
        category: "Plumbing Fixtures",
        pricingSource: "Estimate row snapshot",
        pricingDate: "2026-05-22",
      },
    ],
    children: [],
  },
];

const nodesWithLinkedRow: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [
      {
        ...nodesWithRow[0].estimateRowItems![0],
        source: "library",
        sourceLibraryItemId: "99999999-9999-4999-8999-999999999901",
        linkState: "linked-clean",
      },
    ],
    children: [],
  },
];

const nodesWithOverriddenLinkedRow: EstimateTreeNode[] = [
  {
    ...nodesWithLinkedRow[0],
    estimateRowItems: [
      {
        ...nodesWithLinkedRow[0].estimateRowItems![0],
        linkState: "linked-overridden",
      },
    ],
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function renderPersistedEstimateSheet(sheetNodes = nodes) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId={targetNodeId}
        nodes={sheetNodes}
        projectId={projectId}
        estimateId={estimateId}
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
}

describe("estimate sheet library insertion persistence", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    actionMocks.fetchEstimateTree.mockResolvedValue(nodes);
    actionMocks.insertEstimateRowItemFromLibrary.mockResolvedValue(undefined);
    actionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({ tree: nodesWithGroup });
    actionMocks.updateEstimateRowItem.mockResolvedValue({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 7,
      itemCost: 100,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 10,
      linkState: "linked-overridden",
      rowRevision: 8,
    });
    actionMocks.detachEstimateRowItemFromLibrary.mockResolvedValue({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 2,
      itemCost: 100,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 10,
      linkState: "detached",
      rowRevision: 8,
    });
  });

  it("sends a UUID row id when a component library item is inserted", async () => {
    renderPersistedEstimateSheet();
    const libraryItem = estimateLibraryItems[0];

    await act(async () => {
      window.dispatchEvent(new CustomEvent("archestimator:add-library-item", { detail: libraryItem }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({ projectId, estimateId, targetNodeId, libraryItem });
    expect(isUuid(input.rowId)).toBe(true);
    expect(input.rowId).not.toContain(libraryItem.id);
  });

  it("sends an unlinked manual row template when the area drop zone is clicked", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({ projectId, estimateId, targetNodeId });
    expect(isUuid(input.rowId)).toBe(true);
    expect(input.libraryItem).toMatchObject({
      material: "Drag or add a component here",
      supplier: "",
      source: "project",
      itemCost: 0,
      miscCost: 0,
      category: "Unassigned",
      pricingSource: "Manual estimate row",
    });
    expect(input.libraryItem.tags).toContain("manual-row-placeholder");
  });

  it("adds estimate templates from the right sidebar to the selected group node", async () => {
    const user = userEvent.setup();
    const insertedTree: EstimateTreeNode[] = [
      {
        ...nodesWithGroup[0],
        children: [...nodesWithGroup[0].children!, starterTemplate.nodes[0]],
      },
    ];
    actionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({ tree: insertedTree });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          libraryItems={[]}
          libraryTemplates={[starterTemplate]}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("tab", { name: "Templates" }));
    await user.click(screen.getByRole("button", { name: "Add template Condo Fit-Out Starter to Ground Floor" }));

    await waitFor(() => expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1));
    expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledWith({
      projectId,
      estimateId,
      targetParentNodeId: groupNodeId,
      templateId: starterTemplate.id,
    });
    expect(await screen.findByLabelText("Interior Fit-Out")).toBeInTheDocument();
  });

  it("drops estimate templates from the sidebar onto a group node", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const data: Record<string, string> = {};
    const dataTransfer = {
      types: [] as string[],
      effectAllowed: "",
      dropEffect: "",
      setDragImage: vi.fn(),
      setData: vi.fn((type: string, value: string) => {
        data[type] = value;
        if (!dataTransfer.types.includes(type)) dataTransfer.types.push(type);
      }),
      getData: vi.fn((type: string) => data[type] ?? ""),
    };

    render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          libraryItems={[]}
          libraryTemplates={[starterTemplate]}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("tab", { name: "Templates" }));
    fireEvent.dragStart(screen.getByLabelText("Condo Fit-Out Starter estimate template"), { dataTransfer });
    fireEvent.drop(screen.getByLabelText("Ground Floor"), { dataTransfer });

    await waitFor(() => expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1));
    expect(actionMocks.insertEstimateTemplateIntoEstimate.mock.calls[0][0]).toMatchObject({
      projectId,
      estimateId,
      targetParentNodeId: groupNodeId,
      templateId: starterTemplate.id,
    });
    expect(actionMocks.insertEstimateTemplateIntoEstimate.mock.calls[0][0]).not.toHaveProperty("template");
  });

  it("keeps a committed quantity edit visible while the server save is delayed", async () => {
    const user = userEvent.setup();
    const save = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValue(save.promise);
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;
    const row = quantityInput.closest("tr");
    expect(row).not.toBeNull();

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");
    await user.tab();

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: cabinetRowId,
      quantity: 7,
      mutationId: expect.any(String),
    }));
    expect(quantityInput.value).toBe("7");
    expect(within(row as HTMLElement).getByText("₱ 710.00")).toBeInTheDocument();

    await act(async () => {
      save.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        quantity: 7,
        itemCost: 100,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        linkState: "linked-overridden",
        rowRevision: 8,
      });
      await save.promise;
    });

    expect(quantityInput.value).toBe("7");
    expect(within(row as HTMLElement).getByText("₱ 710.00")).toBeInTheDocument();
  });

  it("clamps negative quantity edits to zero before saving", async () => {
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 0,
      itemCost: 100,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 10,
      linkState: "linked-overridden",
      rowRevision: 8,
    });
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;
    const row = quantityInput.closest("tr");
    expect(row).not.toBeNull();

    fireEvent.change(quantityInput, { target: { value: "-7" } });
    fireEvent.blur(quantityInput);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      quantity: 0,
      expectedRowRevision: 7,
    }));
    expect(within(row as HTMLElement).getByText("₱ 10.00")).toBeInTheDocument();
  });

  it("makes a linked component project-specific without clearing row values", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithLinkedRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    expect(within(kitchenSection).getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(within(kitchenSection).getByText("₱ 210.00")).toBeInTheDocument();

    await user.click(within(kitchenSection).getByRole("button", { name: "Make Kitchen Cabinet project-specific" }));
    const firstDialog = screen.getByRole("dialog", { name: "Make component project-specific" });
    await user.click(within(firstDialog).getByRole("button", { name: "Cancel" }));
    expect(actionMocks.detachEstimateRowItemFromLibrary).not.toHaveBeenCalled();

    await user.click(within(kitchenSection).getByRole("button", { name: "Make Kitchen Cabinet project-specific" }));
    const dialog = screen.getByRole("dialog", { name: "Make component project-specific" });
    await user.click(within(dialog).getByRole("button", { name: "Make project-specific" }));

    await waitFor(() => expect(actionMocks.detachEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    expect(actionMocks.detachEstimateRowItemFromLibrary).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: cabinetRowId,
      expectedRowRevision: 7,
      mutationId: expect.any(String),
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Make component project-specific" })).not.toBeInTheDocument());
    expect(within(kitchenSection).getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(within(kitchenSection).getByText("Project-specific")).toBeInTheDocument();
    expect(within(kitchenSection).getByText("₱ 210.00")).toBeInTheDocument();
  });

  it("shows exact library sync state in row component details", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithOverriddenLinkedRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    await user.click(within(kitchenSection).getByRole("button", { name: "Open component details for Kitchen Cabinet" }));

    const dialog = screen.getByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getAllByText("Customized library component").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("This row is linked to the library, but one or more estimate values have project-specific overrides.").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Source library id")).toBeInTheDocument();
  });

  it("rolls back a failed quantity save without rendering spreadsheet save pills", async () => {
    const user = userEvent.setup();
    actionMocks.updateEstimateRowItem.mockRejectedValue(new Error("Permission denied"));
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");
    await user.tab();

    await waitFor(() => expect(quantityInput.value).toBe("2"));
    expect(within(kitchenSection).queryByText("Unsaved")).not.toBeInTheDocument();
    expect(within(kitchenSection).queryByText("Saving")).not.toBeInTheDocument();
    expect(within(kitchenSection).queryByText("Saved")).not.toBeInTheDocument();
    expect(within(kitchenSection).queryByText("Save failed")).not.toBeInTheDocument();
  });

  it("keeps another row edit when an older row save fails", async () => {
    const user = userEvent.setup();
    const firstSave = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockImplementation((input: { rowId: string; quantity?: number }) => {
      if (input.rowId === cabinetRowId) return firstSave.promise;
      return Promise.resolve({
        rowId: sinkRowId,
        nodeId: targetNodeId,
        quantity: input.quantity ?? 1,
          itemCost: 250,
          contingencyPercentage: 0,
          contingencyValue: 0,
          miscCost: 0,
          linkState: "linked-overridden",
          rowRevision: 4,
        });
    });
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const cabinetQuantity = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;
    const sinkQuantity = within(kitchenSection).getByLabelText("Kitchen Sink quantity") as HTMLInputElement;

    await user.click(cabinetQuantity);
    await user.clear(cabinetQuantity);
    await user.type(cabinetQuantity, "7");
    await user.click(sinkQuantity);
    await user.clear(sinkQuantity);
    await user.type(sinkQuantity, "4");
    fireEvent.blur(sinkQuantity);

    await waitFor(() => expect(sinkQuantity.value).toBe("4"));

    await act(async () => {
      firstSave.reject(new Error("Permission denied"));
      await firstSave.promise.catch(() => undefined);
    });

    await waitFor(() => expect(cabinetQuantity.value).toBe("2"));
    expect(sinkQuantity.value).toBe("4");
  });

  it("does not let an older quantity response overwrite a newer quantity edit", async () => {
    const user = userEvent.setup();
    const firstSave = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    const secondSave = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise);
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");
    fireEvent.blur(quantityInput);
    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "8");
    fireEvent.blur(quantityInput);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenLastCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      quantity: 7,
      expectedRowRevision: 7,
    }));

    await act(async () => {
      firstSave.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        quantity: 7,
        itemCost: 100,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        linkState: "linked-overridden",
        rowRevision: 8,
      });
      await firstSave.promise;
    });

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(2));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenLastCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      quantity: 8,
      expectedRowRevision: 8,
    }));

    expect(quantityInput.value).toBe("8");

    await act(async () => {
      secondSave.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        quantity: 8,
        itemCost: 100,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        linkState: "linked-overridden",
        rowRevision: 9,
      });
      await secondSave.promise;
    });

    expect(quantityInput.value).toBe("8");
  });

  it("queues rapid same-row quantity and misc edits against the latest row revision", async () => {
    const user = userEvent.setup();
    const quantitySave = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    const miscSave = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(quantitySave.promise).mockReturnValueOnce(miscSave.promise);
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;
    const miscCostInput = within(kitchenSection).getByLabelText("Kitchen Cabinet misc cost") as HTMLInputElement;
    const row = quantityInput.closest("tr");
    expect(row).not.toBeNull();

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");
    await user.tab();
    await user.clear(miscCostInput);
    await user.type(miscCostInput, "400");
    await user.tab();

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenLastCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      quantity: 7,
      expectedRowRevision: 7,
    }));

    expect(quantityInput.value).toBe("7");
    expect(within(row as HTMLElement).getByText("₱ 1,100.00")).toBeInTheDocument();

    await act(async () => {
      quantitySave.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        quantity: 7,
        itemCost: 100,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        linkState: "linked-overridden",
        rowRevision: 8,
      });
      await quantitySave.promise;
    });

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(2));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenLastCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      miscCost: 400,
      expectedRowRevision: 8,
    }));

    await act(async () => {
      miscSave.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        quantity: 7,
        itemCost: 100,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 400,
        linkState: "linked-overridden",
        rowRevision: 9,
      });
      await miscSave.promise;
    });

    expect(quantityInput.value).toBe("7");
    expect(within(row as HTMLElement).getByText("₱ 1,100.00")).toBeInTheDocument();
  });

  it("clamps out-of-range contingency before saving the row", async () => {
    const user = userEvent.setup();
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 2,
      itemCost: 100,
      contingencyPercentage: 100,
      contingencyValue: 200,
      miscCost: 10,
      linkState: "linked-overridden",
      rowRevision: 8,
    });
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const contingencyInput = within(kitchenSection).getByLabelText("Kitchen Cabinet adjustment percentage") as HTMLInputElement;

    await user.click(contingencyInput);
    await user.clear(contingencyInput);
    await user.type(contingencyInput, "101");
    await user.tab();

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      contingencyPercentage: 100,
      expectedRowRevision: 7,
    }));
    expect(contingencyInput.value).toBe("100");
  });

  it("saves discount adjustments as negative percentages", async () => {
    const user = userEvent.setup();
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 2,
      itemCost: 100,
      contingencyPercentage: -10,
      contingencyValue: -20,
      miscCost: 10,
      linkState: "linked-overridden",
      rowRevision: 8,
    });
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const adjustmentType = within(kitchenSection).getByLabelText("Kitchen Cabinet adjustment type");
    const adjustmentInput = within(kitchenSection).getByLabelText("Kitchen Cabinet adjustment percentage") as HTMLInputElement;

    await user.selectOptions(adjustmentType, "discount");
    await user.click(adjustmentInput);
    await user.clear(adjustmentInput);
    await user.type(adjustmentInput, "10");
    await user.tab();

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      contingencyPercentage: -10,
      expectedRowRevision: 7,
    }));
    expect(adjustmentType).toHaveValue("discount");
    expect(adjustmentInput.value).toBe("10");
  });
});
