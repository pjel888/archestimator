import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { INSERT_ESTIMATE_TEMPLATE_EVENT } from "@/components/workshop/component-library/templates";
import { replaceOptimisticTemplateRoots } from "@/components/workshop/estimate-sheet/template-insert-reconciliation";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { isUuid } from "@/lib/ids";
import { withExpressComponentMetadata } from "@/lib/estimates/express-components";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  deleteEstimateRowItem: vi.fn(),
  detachEstimateRowItemFromLibrary: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplatesIntoEstimate: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

const promotionMocks = vi.hoisted(() => ({
  promoteEstimateRowToLibraryComponent: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/estimates/express-promotion-actions", () => promotionMocks);

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

function makeEstimateTemplate(id: string, name: string, rootName = name) {
  return {
    id,
    name,
    description: `${name} description`,
    category: "Residential Rooms",
    nodes: [
      {
        id: `${id}-root`,
        name: rootName,
        kind: "group" as const,
        total: "PHP 0.00",
        children: [],
        estimateRowItems: [],
      },
    ],
  };
}

const alternateTemplate = makeEstimateTemplate("template-alternate-fit-out", "Alternate Fit-Out", "Alternate Fit-Out");
const failedTemplate = makeEstimateTemplate("template-failed-fit-out", "Failed Fit-Out", "Failed Fit-Out");
const backupTemplate = makeEstimateTemplate("template-backup-fit-out", "Backup Fit-Out", "Backup Fit-Out");

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

const nodesWithDetachedProjectSpecificRow: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [
      {
        ...nodesWithRow[0].estimateRowItems![0],
        source: "project",
        sourceLibraryItemId: null,
        sourceSnapshot: {
          sourceLibraryItemId: "99999999-9999-4999-8999-999999999901",
          sourceType: "library_component",
        },
        linkState: "detached",
      },
    ],
    children: [],
  },
];

const legacyBlankRowId = "66666666-6666-4666-8666-666666666663";
const nodesWithLegacyBlankRow: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [
      {
        id: legacyBlankRowId,
        material: "Drag or add a component here",
        description: "",
        supplier: "",
        source: "project",
        unit: "unit",
        itemCost: 0,
        quantity: 1,
        subTotal: 0,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        totalItemCosts: 0,
        rowRevision: 1,
        category: "Unassigned",
        tags: ["manual-row-placeholder"],
        pricingSource: "Manual estimate row",
        pricingDate: "2026-06-15",
        linkState: "unlinked",
        sourceLibraryItemId: null,
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

const nodesWithDuplicateLinkedRows: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [
      {
        ...nodesWithRow[0].estimateRowItems![0],
        id: cabinetRowId,
        source: "library",
        sourceLibraryItemId: "99999999-9999-4999-8999-999999999901",
        linkState: "linked-clean",
      },
      {
        ...nodesWithRow[0].estimateRowItems![0],
        id: sinkRowId,
        source: "library",
        sourceLibraryItemId: "99999999-9999-4999-8999-999999999901",
        linkState: "linked-clean",
        rowRevision: 3,
      },
    ],
    children: [],
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
    delete process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED;
    actionMocks.fetchEstimateTree.mockResolvedValue(nodes);
    actionMocks.insertEstimateRowItemFromLibrary.mockResolvedValue(undefined);
    actionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({ tree: nodesWithGroup });
    actionMocks.insertEstimateTemplatesIntoEstimate.mockResolvedValue({ tree: nodesWithGroup, insertedRootNodeIds: [] });
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
    promotionMocks.promoteEstimateRowToLibraryComponent.mockResolvedValue({
      rowId: cabinetRowId,
      itemId: "99999999-9999-4999-8999-999999999999",
      activePriceOptionId: "88888888-8888-4888-8888-888888888888",
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

  it("still renders and persists an editable express row when the legacy flag is disabled", async () => {
    process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED = "false";
    const user = userEvent.setup();
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    expect(await screen.findByLabelText("Express component replaceable estimate component")).toBeInTheDocument();
    expect(screen.getByLabelText("Image URL")).toBeInTheDocument();
    const nameInput = await screen.findByLabelText("Component name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
    expect(screen.getByLabelText("Supplier")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit cost")).toBeInTheDocument();
    expect(screen.getByLabelText("Component description")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit")).toBeInTheDocument();
    expect(screen.queryByText("Drag or add a component here")).not.toBeInTheDocument();
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({ projectId, estimateId, targetNodeId });
    expect(isUuid(input.rowId)).toBe(true);
    expect(input.libraryItem).toMatchObject({
      material: "",
      supplier: "",
      source: "project",
      sourceLibraryItemId: null,
      itemCost: 0,
      quantity: 1,
      miscCost: 0,
      category: "Unassigned",
      pricingSource: "Express component",
    });
    expect(input.libraryItem.metadata?.expressComponent).toMatchObject({
      kind: "express",
      schemaVersion: 1,
      createdFrom: "estimate-sheet-add-row",
      sourceLabel: "Express component",
    });
    expect(input.libraryItem.tags ?? []).not.toContain("manual-row-placeholder");
  });

  it("sends an express row template by default when the area drop zone is clicked", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({ projectId, estimateId, targetNodeId });
    expect(isUuid(input.rowId)).toBe(true);
    expect(input.libraryItem).toMatchObject({
      material: "",
      supplier: "",
      source: "project",
      sourceLibraryItemId: null,
      itemCost: 0,
      quantity: 1,
      miscCost: 0,
      category: "Unassigned",
      pricingSource: "Express component",
      discipline: "Unspecified",
      designation: "",
    });
    expect(await screen.findByLabelText("Express component replaceable estimate component")).toBeInTheDocument();
    expect(screen.getByLabelText("Image URL")).toBeInTheDocument();
    const nameInput = await screen.findByLabelText("Component name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
    expect(screen.getByLabelText("Supplier")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit cost")).toBeInTheDocument();
    expect(screen.getByLabelText("Component description")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit")).toBeInTheDocument();
    expect(screen.queryByText("Drag or add a component here")).not.toBeInTheDocument();
    expect(input.libraryItem.metadata?.expressComponent).toMatchObject({
      kind: "express",
      schemaVersion: 1,
      createdFrom: "estimate-sheet-add-row",
      sourceLabel: "Express component",
    });
    expect(input.libraryItem.tags ?? []).not.toContain("manual-row-placeholder");
  });

  it("opens empty express row component details as an express component", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    const kitchenSection = screen.getByLabelText("Kitchen");
    expect(await within(kitchenSection).findByLabelText("Express component replaceable estimate component")).toBeInTheDocument();
    await user.click(within(kitchenSection).getByRole("button", { name: "Open component details for Express component" }));

    const dialog = screen.getByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getAllByText("Express component").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/authored directly in the estimate row/i).length).toBeGreaterThan(0);
    expect(within(dialog).getByText("No image yet")).toBeInTheDocument();
    expect(within(dialog).queryByText("Manual component")).not.toBeInTheDocument();
  });

  it("buffers express field edits until insert returns a row revision", async () => {
    process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED = "true";
    const user = userEvent.setup();
    const insert = deferred<Awaited<ReturnType<typeof actionMocks.insertEstimateRowItemFromLibrary>>>();
    actionMocks.insertEstimateRowItemFromLibrary.mockReturnValueOnce(insert.promise);
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));
    const insertInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    const nameInput = await screen.findByLabelText("Component name");
    await user.clear(nameInput);
    await user.type(nameInput, "Custom Vanity");
    fireEvent.blur(nameInput);

    expect(actionMocks.updateEstimateRowItem).not.toHaveBeenCalled();

    await act(async () => {
      insert.resolve({
        rowId: insertInput.rowId,
        nodeId: targetNodeId,
        material: "",
        description: "",
        supplier: "",
        unit: "",
        quantity: 1,
        itemCost: 0,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        sourceSnapshot: null,
        metadata: insertInput.libraryItem.metadata,
        linkState: "unlinked",
        rowRevision: 1,
      });
      await insert.promise;
    });

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: insertInput.rowId,
      material: "Custom Vanity",
      expectedRowRevision: 1,
    }));
  });

  it("keeps failed express drafts visible with retry and delete recovery", async () => {
    process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED = "true";
    const user = userEvent.setup();
    actionMocks.insertEstimateRowItemFromLibrary.mockRejectedValueOnce(new Error("Network offline"));
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    expect(await screen.findByText("Component row was not created. Retry or delete this draft.")).toBeInTheDocument();
    const firstInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    actionMocks.insertEstimateRowItemFromLibrary.mockResolvedValueOnce({
        rowId: firstInput.rowId,
        nodeId: targetNodeId,
        material: "",
        description: "",
        supplier: "",
        unit: "",
      quantity: 1,
      itemCost: 0,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 0,
      sourceSnapshot: null,
      metadata: firstInput.libraryItem.metadata,
      linkState: "unlinked",
      rowRevision: 1,
    });

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(2));
    const retryInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[1][0];
    expect(retryInput.rowId).toBe(firstInput.rowId);
    expect(retryInput.mutationId).toBe(firstInput.mutationId);
    await waitFor(() => expect(screen.queryByText("Component row was not created. Retry or delete this draft.")).not.toBeInTheDocument());

    actionMocks.insertEstimateRowItemFromLibrary.mockRejectedValueOnce(new Error("Still offline"));
    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));
    expect(await screen.findByText("Component row was not created. Retry or delete this draft.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(screen.queryByText("Component row was not created. Retry or delete this draft.")).not.toBeInTheDocument());
  });

  it("renders legacy blank rows as empty inline express editors and upgrades them on edit", async () => {
    const user = userEvent.setup();
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce({
      rowId: legacyBlankRowId,
      nodeId: targetNodeId,
      material: "Custom Vanity",
      description: "",
      supplier: "",
      unit: "",
      quantity: 1,
      itemCost: 0,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 0,
      sourceSnapshot: null,
      metadata: withExpressComponentMetadata({}, { id: legacyBlankRowId }),
      linkState: "unlinked",
      rowRevision: 2,
    });
    renderPersistedEstimateSheet(nodesWithLegacyBlankRow);

    const nameInput = await screen.findByLabelText("Component name") as HTMLInputElement;
    expect(nameInput.value).toBe("");
    expect(screen.queryByText("Drag or add a component here")).not.toBeInTheDocument();

    await user.type(nameInput, "Custom Vanity");
    fireEvent.blur(nameInput);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: legacyBlankRowId,
      material: "Custom Vanity",
      metadata: expect.objectContaining({
        expressComponent: expect.objectContaining({
          kind: "express",
          schemaVersion: 1,
          createdFrom: "legacy-blank-row-inline-edit",
          sourceLabel: "Express component",
        }),
      }),
      expectedRowRevision: 1,
    }));
  });


  it("persists express image URLs through source snapshot merge patches", async () => {
    const expressRowId = "66666666-6666-4666-8666-666666666699";
    const expressMetadata = withExpressComponentMetadata({}, { id: "express-row-1" });
    const nodesWithExpressRow: EstimateTreeNode[] = [
      {
        ...nodes[0],
        estimateRowItems: [
          {
            id: expressRowId,
            material: "Express Vanity",
            description: "",
            supplier: "",
            source: "project",
            unit: "unit",
            itemCost: 0,
            quantity: 1,
            subTotal: 0,
            contingencyPercentage: 0,
            contingencyValue: 0,
            miscCost: 0,
            totalItemCosts: 0,
            rowRevision: 1,
            category: "Unassigned",
            pricingSource: "Express component",
            pricingDate: "2026-06-15",
            metadata: expressMetadata,
            linkState: "unlinked",
            sourceLibraryItemId: null,
          },
        ],
      },
    ];
    actionMocks.updateEstimateRowItem.mockResolvedValue({
      rowId: expressRowId,
      nodeId: targetNodeId,
      material: "Express Vanity",
      description: "",
      supplier: "",
      unit: "unit",
      quantity: 1,
      itemCost: 0,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 0,
        sourceSnapshot: { imageUrl: "https://example.com/vanity.jpg" },
      metadata: expressMetadata,
      linkState: "unlinked",
      rowRevision: 2,
    });
    renderPersistedEstimateSheet(nodesWithExpressRow);

    const imageUrl = screen.getByLabelText("Image URL");
    fireEvent.change(imageUrl, { target: { value: "https://example.com/vanity.jpg" } });
    fireEvent.blur(imageUrl);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalled());
    expect(actionMocks.updateEstimateRowItem.mock.calls.map(([input]) => input.sourceSnapshot)).toEqual([
      { imageUrl: "https://example.com/vanity.jpg" },
    ]);
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
    // Rows carry no add buttons: inserting goes through the context menu.
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Condo Fit-Out Starter estimate template" }), { clientX: 16, clientY: 16 });
    await user.click(await screen.findByRole("menuitem", { name: "Add to Ground Floor" }));

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

  it("uses the refreshed server tree for a partial batch template insert when no local edit intervened", async () => {
    const serverCommittedRoot: EstimateTreeNode = {
      id: "server-template-committed-root",
      name: "Server Committed Fit-Out",
      kind: "group",
      total: "PHP 0.00",
      children: [],
      estimateRowItems: [],
    };
    const refreshedTree: EstimateTreeNode[] = [
      {
        ...nodesWithGroup[0],
        name: "Ground Floor Refreshed",
        children: [
          {
            ...nodes[0],
            name: "Kitchen Server Refresh",
          },
          serverCommittedRoot,
        ],
      },
    ];
    actionMocks.insertEstimateTemplatesIntoEstimate.mockResolvedValueOnce({
      tree: refreshedTree,
      insertedRootNodeIds: [serverCommittedRoot.id],
      partialFailureMessage: "One template failed.",
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          libraryItems={[]}
          libraryTemplates={[starterTemplate, alternateTemplate]}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: {
          targetParentNodeId: groupNodeId,
          templateIds: [starterTemplate.id, alternateTemplate.id],
        },
      }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateTemplatesIntoEstimate).toHaveBeenCalledTimes(1));
    expect(await screen.findByLabelText("Kitchen Server Refresh")).toBeInTheDocument();
    expect(screen.getByLabelText("Server Committed Fit-Out")).toBeInTheDocument();
    expect(screen.queryByLabelText("Alternate Fit-Out")).not.toBeInTheDocument();
  });

  it("keeps partial batch reconciliation when a later batch rollback runs", async () => {
    const firstInsert = deferred<Awaited<ReturnType<typeof actionMocks.insertEstimateTemplatesIntoEstimate>>>();
    const secondInsert = deferred<Awaited<ReturnType<typeof actionMocks.insertEstimateTemplatesIntoEstimate>>>();
    const serverCommittedRoot: EstimateTreeNode = {
      id: "server-template-first-committed-root",
      name: "First Batch Server Root",
      kind: "group",
      total: "PHP 0.00",
      children: [],
      estimateRowItems: [],
    };
    actionMocks.insertEstimateTemplatesIntoEstimate
      .mockReturnValueOnce(firstInsert.promise)
      .mockReturnValueOnce(secondInsert.promise);

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          libraryItems={[]}
          libraryTemplates={[starterTemplate, alternateTemplate, failedTemplate, backupTemplate]}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: {
          targetParentNodeId: groupNodeId,
          templateIds: [starterTemplate.id, alternateTemplate.id],
        },
      }));
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: {
          targetParentNodeId: groupNodeId,
          templateIds: [failedTemplate.id, backupTemplate.id],
        },
      }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateTemplatesIntoEstimate).toHaveBeenCalledTimes(2));

    await act(async () => {
      firstInsert.resolve({
        tree: [
          {
            ...nodesWithGroup[0],
            children: [nodes[0], serverCommittedRoot],
          },
        ],
        insertedRootNodeIds: [serverCommittedRoot.id],
        partialFailureMessage: "One template failed.",
      });
      await firstInsert.promise;
    });

    await act(async () => {
      secondInsert.reject(new Error("Second batch failed"));
      await secondInsert.promise.catch(() => undefined);
    });

    expect(await screen.findByLabelText("First Batch Server Root")).toBeInTheDocument();
    expect(screen.queryByLabelText("Failed Fit-Out")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Backup Fit-Out")).not.toBeInTheDocument();
  });

  it("reconciles partial batch template failures without overwriting later tree edits", () => {
    const kitchenWithRows = nodesWithRow.find((node) => node.id === targetNodeId);
    expect(kitchenWithRows).toBeDefined();
    if (!kitchenWithRows) throw new Error("Kitchen fixture is missing.");
    const [cabinetRow, sinkRow] = kitchenWithRows.estimateRowItems ?? [];
    expect(cabinetRow).toBeDefined();
    expect(sinkRow).toBeDefined();
    if (!cabinetRow || !sinkRow) throw new Error("Kitchen row fixtures are missing.");

    const laterEditedKitchen: EstimateTreeNode = {
      ...kitchenWithRows,
      estimateRowItems: [
        {
          ...cabinetRow,
          quantity: 7,
          subTotal: 700,
          totalItemCosts: 710,
        },
        sinkRow,
      ],
    };
    const optimisticCommittedRoot: EstimateTreeNode = {
      id: "optimistic-template-committed",
      name: "Interior Fit-Out",
      kind: "group",
      total: "PHP 0.00",
      children: [],
      estimateRowItems: [],
    };
    const optimisticFailedRoot: EstimateTreeNode = {
      id: "optimistic-template-failed",
      name: "Failed Package",
      kind: "group",
      total: "PHP 0.00",
      children: [],
      estimateRowItems: [],
    };
    const committedServerRoot: EstimateTreeNode = {
      ...optimisticCommittedRoot,
      id: "server-template-committed",
    };
    const laterEditedKitchenWithMovedOptimisticRoot: EstimateTreeNode = {
      ...laterEditedKitchen,
      children: [...(laterEditedKitchen.children ?? []), optimisticFailedRoot],
    };
    const currentTreeAfterLaterEdit: EstimateTreeNode[] = [
      {
        ...nodesWithGroup[0],
        children: [laterEditedKitchenWithMovedOptimisticRoot, optimisticCommittedRoot],
      },
    ];

    const reconciledTree = replaceOptimisticTemplateRoots(
      currentTreeAfterLaterEdit,
      groupNodeId,
      new Set([optimisticCommittedRoot.id, optimisticFailedRoot.id]),
      [committedServerRoot],
    );

    const reconciledGroup = reconciledTree[0];
    expect(reconciledGroup).toBeDefined();
    if (!reconciledGroup) throw new Error("Reconciled group is missing.");
    expect(reconciledGroup.children?.map((node) => node.id)).toEqual([targetNodeId, committedServerRoot.id]);
    expect(reconciledGroup.children?.[0].estimateRowItems?.[0]).toMatchObject({
      id: cabinetRowId,
      quantity: 7,
      totalItemCosts: 710,
    });
    expect(reconciledGroup.children?.[0].children?.map((node) => node.id)).not.toContain(optimisticFailedRoot.id);
  });

  it("preserves committed template roots that are already present in the current tree", () => {
    const committedRoot: EstimateTreeNode = {
      id: "server-template-committed",
      name: "Committed Package",
      kind: "group",
      total: "PHP 0.00",
      children: [],
      estimateRowItems: [],
    };
    const optimisticRoot: EstimateTreeNode = {
      id: "optimistic-template-failed",
      name: "Failed Package",
      kind: "group",
      total: "PHP 0.00",
      children: [],
      estimateRowItems: [],
    };
    const currentTree: EstimateTreeNode[] = [
      {
        ...nodesWithGroup[0],
        children: [
          committedRoot,
          {
            ...nodes[0],
            children: [optimisticRoot],
          },
        ],
      },
    ];

    const reconciledTree = replaceOptimisticTemplateRoots(
      currentTree,
      groupNodeId,
      new Set([optimisticRoot.id]),
      [committedRoot],
    );

    expect(reconciledTree[0].children?.map((node) => node.id)).toEqual([committedRoot.id, targetNodeId]);
    expect(reconciledTree[0].children?.[1].children).toEqual([]);
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

  it("promotes a project-specific component to a new library component from the sheet", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithDetachedProjectSpecificRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const promoteButton = within(kitchenSection).getByRole("button", { name: "Promote Kitchen Cabinet to library" });
    await user.click(promoteButton);

    await waitFor(() => {
      expect(promotionMocks.promoteEstimateRowToLibraryComponent).toHaveBeenCalledWith({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        mutationId: expect.any(String),
      });
    });
  });

  it("keeps duplicate linked rows independently eligible for project-specific detach", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithDuplicateLinkedRows);

    const kitchenSection = screen.getByLabelText("Kitchen");
    expect(within(kitchenSection).getAllByRole("button", { name: "Make Kitchen Cabinet project-specific" })).toHaveLength(2);

    await user.click(within(kitchenSection).getAllByRole("button", { name: "Make Kitchen Cabinet project-specific" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Make component project-specific" });
    await user.click(within(dialog).getByRole("button", { name: "Make project-specific" }));

    await waitFor(() => expect(actionMocks.detachEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    expect(actionMocks.detachEstimateRowItemFromLibrary).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      expectedRowRevision: 7,
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Make component project-specific" })).not.toBeInTheDocument());
    expect(within(kitchenSection).getByText("Project-specific")).toBeInTheDocument();
    expect(within(kitchenSection).getAllByRole("button", { name: "Make Kitchen Cabinet project-specific" })).toHaveLength(1);
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

    await user.click(adjustmentType);
    await user.click(screen.getByRole("option", { name: "Discount" }));
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
    expect(adjustmentType).toHaveTextContent("Discount");
    expect(adjustmentInput.value).toBe("10");
  });
});
