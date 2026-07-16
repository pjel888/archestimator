import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { INSERT_ESTIMATE_TEMPLATE_EVENT, INSERT_PROJECT_SOURCE_EVENT } from "@/components/workshop/component-library/templates";
import { dispatchEstimateExternalDrop, REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT } from "@/components/workshop/estimate-sheet/events";
import { ADD_LIBRARY_ITEM_EVENT, LIBRARY_ITEM_DRAG_MIME_TYPE } from "@/components/workshop/estimate-sheet/rows/constants";
import { handleExpressFieldKeyDown } from "@/components/workshop/estimate-sheet/rows/cells";
import { ToastProvider } from "@/components/ui/toast";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { isUuid } from "@/lib/ids";
import { withExpressComponentMetadata } from "@/lib/estimates/express-components";
import { setLibraryTelemetrySink, type LibraryTelemetryRecord } from "@/lib/component-library/library-telemetry";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  deleteEstimateRowItem: vi.fn(),
  fetchEstimateTree: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  getEstimateComponentEditImpact: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplateNodeIntoEstimate: vi.fn(),
  insertEstimateTemplatesIntoEstimate: vi.fn(),
  moveEstimateRowComponentWithHistory: vi.fn(),
  moveEstimateRowItemWithHistory: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

const promotionMocks = vi.hoisted(() => ({
  promoteEstimateRowToLibraryComponent: vi.fn(),
}));

const reusableSourceMocks = vi.hoisted(() => ({
  insertProjectSourceIntoEstimate: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/estimates/express-promotion-actions", () => promotionMocks);
vi.mock("@/lib/reusable-sources/actions", () => reusableSourceMocks);

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "77777777-7777-4777-8777-777777777719";
const targetNodeId = "55555555-5555-4555-8555-555555555561";
const groupNodeId = "55555555-5555-4555-8555-555555555560";
const livingNodeId = "55555555-5555-4555-8555-555555555562";
const cabinetRowId = "66666666-6666-4666-8666-666666666661";
const sinkRowId = "66666666-6666-4666-8666-666666666662";
const vanityRowId = "66666666-6666-4666-8666-666666666663";

const libraryItemFixture: EstimateRowItem = {
  id: "lib-sofa",
  material: "HEMLINGBY Loveseat",
  description: "IKEA Philippines loveseat",
  supplier: "IKEA Philippines",
  source: "library",
  unit: "pc",
  itemCost: 7_999,
  quantity: 1,
  subTotal: 7_999,
  miscCost: 1_200,
  totalItemCosts: 9_199,
  category: "Furniture",
  pricingSource: "Test fixture",
  pricingDate: "2026-05-22",
};

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

const finishesTemplate = {
  ...starterTemplate,
  id: "template-finishes-pack",
  name: "Finishes Pack",
  nodes: [
    {
      ...starterTemplate.nodes[0],
      id: "template-finishes",
      name: "Finishes Pack",
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

const nodesWithRowsInSeparateAreas: EstimateTreeNode[] = [
  {
    ...nodesWithRow[0],
    estimateRowItems: [nodesWithRow[0].estimateRowItems![0]],
  },
  {
    id: livingNodeId,
    name: "Living",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [nodesWithRow[0].estimateRowItems![1]],
    children: [],
  },
];

const nodesWithThreeRows: EstimateTreeNode[] = [
  {
    ...nodesWithRow[0],
    estimateRowItems: [
      ...nodesWithRow[0].estimateRowItems!,
      {
        id: vanityRowId,
        material: "Kitchen Vanity",
        description: "Powder room vanity",
        supplier: "Local supplier",
        source: "project",
        unit: "pc",
        itemCost: 400,
        quantity: 1,
        subTotal: 400,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 0,
        totalItemCosts: 400,
        rowRevision: 2,
        category: "Millwork",
        pricingSource: "Estimate row snapshot",
        pricingDate: "2026-05-22",
      },
    ],
  },
];

const projectedComponentId = "project-component-cabinet";
const sharedProjectComponentMetadata = withExpressComponentMetadata({
  projectComponentProjection: {
    componentId: projectedComponentId,
    projectId,
    projectName: "Modern Bungalow",
    estimateId,
    estimateName: "Main Estimate",
    nodeId: targetNodeId,
    nodeName: "Kitchen",
    sourceRowId: cabinetRowId,
    instanceRowIds: [cabinetRowId, vanityRowId],
    instanceCount: 2,
    classification: "express",
  },
}, {
  id: projectedComponentId,
  componentId: projectedComponentId,
  componentName: "Kitchen Cabinet",
  sourceLabel: "Project Component",
});
const nodesWithProjectedComponentInstances: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [
      {
        ...nodesWithRow[0].estimateRowItems![0],
        id: cabinetRowId,
        source: "project",
        quantity: 2,
        metadata: sharedProjectComponentMetadata,
      },
      {
        ...nodesWithRow[0].estimateRowItems![0],
        id: vanityRowId,
        source: "project",
        quantity: 5,
        subTotal: 500,
        totalItemCosts: 510,
        rowRevision: 3,
        metadata: sharedProjectComponentMetadata,
      },
    ],
    children: [],
  },
];
const nodesWithRenamedProjectedComponentInstances: EstimateTreeNode[] = [
  {
    ...nodesWithProjectedComponentInstances[0],
    estimateRowItems: nodesWithProjectedComponentInstances[0].estimateRowItems!.map((item) => ({
      ...item,
      material: "Shared Cabinet",
    })),
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

function makeCanonicalReplaceResult(rowId: string, item: EstimateRowItem, rowRevision: number) {
  return {
    rowId,
    nodeId: targetNodeId,
    material: item.material,
    description: item.description,
    supplier: item.supplier,
    unit: item.unit,
    quantity: item.quantity,
    itemCost: item.itemCost,
    contingencyPercentage: item.contingencyPercentage ?? 0,
    contingencyValue: item.contingencyValue ?? 0,
    miscCost: item.miscCost ?? 0,
    sourceSnapshot: item.sourceSnapshot ?? null,
    metadata: item.metadata ?? {},
    linkState: item.linkState ?? "unlinked",
    rowRevision,
  };
}

function uploadedImageAsset(url: string, assetId = "asset-1") {
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId,
    uploadSessionId: `${assetId}-session`,
    bucket: "project-images",
    path: `workspace-1/user-1/project-images/${projectId}/estimate-row-images/${estimateId}/${assetId}.webp`,
    thumbnailPath: `workspace-1/user-1/project-images/${projectId}/estimate-row-images/${estimateId}/${assetId}-thumb.webp`,
    url,
    thumbnailUrl: `${url}?thumb=1`,
    contentType: "image/webp",
    sizeBytes: 128,
    scanStatus: "not_required",
  };
}

async function dragCabinetOntoSink(sheetNodes = nodesWithRow) {
  renderPersistedEstimateSheet(sheetNodes);

  const sourceCell = screen.getByLabelText("Kitchen Cabinet replaceable estimate component");
  const targetCell = screen.getByLabelText("Kitchen Sink replaceable estimate component");
  const sourceRow = sourceCell.closest("tr");
  const targetRow = targetCell.closest("tr");
  expect(sourceRow).not.toBeNull();
  expect(targetRow).not.toBeNull();

  const dataTransfer = createDataTransferStub("none");
  fireEvent.dragStart(within(sourceCell).getByRole("button", { name: "Drag component Kitchen Cabinet" }), { dataTransfer });
  fireEvent.dragOver(targetCell, { dataTransfer });
  fireEvent.drop(targetCell, { dataTransfer });

  await waitFor(() => expect(actionMocks.moveEstimateRowComponentWithHistory).toHaveBeenCalledTimes(1));
  return { sourceRow: sourceRow as HTMLElement, targetRow: targetRow as HTMLElement };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function renderPersistedEstimateSheet(sheetNodes = nodes) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId={targetNodeId}
        nodes={sheetNodes}
        projectId={projectId}
        estimateId={estimateId}
        canEditEstimate={true}
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
}

function renderPersistedEstimateSheetWithToasts(sheetNodes = nodes) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EstimateSheetContent
          selectedNodeId={targetNodeId}
          nodes={sheetNodes}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function toastViewport() {
  const viewport = document.querySelector("[data-toast-viewport='true']");
  if (!(viewport instanceof HTMLElement)) throw new Error("Toast viewport was not rendered.");
  return viewport;
}

describe("estimate sheet library insertion persistence", () => {
  afterEach(() => {
    cleanup();
    resetEstimateWorkspaceState();
    setLibraryTelemetrySink(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "off");
    delete process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED;
    actionMocks.fetchEstimateTree.mockResolvedValue(nodes);
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [],
      nodeEvents: [],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });
    actionMocks.insertEstimateRowItemFromLibrary.mockResolvedValue(undefined);
    actionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({ status: "inserted", tree: nodesWithGroup, insertedRootNodeIds: [] });
    actionMocks.insertEstimateTemplateNodeIntoEstimate.mockResolvedValue({ status: "inserted", tree: nodesWithGroup, insertedRootNodeId: groupNodeId });
    actionMocks.insertEstimateTemplatesIntoEstimate.mockResolvedValue({ status: "inserted", tree: nodesWithGroup, insertedRootNodeIds: [] });
    reusableSourceMocks.insertProjectSourceIntoEstimate.mockResolvedValue({ tree: nodesWithGroup, insertedRootNodeIds: [] });
    actionMocks.moveEstimateRowComponentWithHistory.mockResolvedValue({
      sourceRow: makeCanonicalReplaceResult(cabinetRowId, {
        ...nodesWithRow[0].estimateRowItems![0],
        material: "Project Component",
        description: "",
        supplier: "",
        source: "project",
        unit: "unit",
        itemCost: 0,
        quantity: 2,
        subTotal: 0,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        totalItemCosts: 10,
        category: "Unassigned",
        pricingSource: "Manual estimate row",
      }, 8),
      targetRow: makeCanonicalReplaceResult(sinkRowId, {
        ...nodesWithRow[0].estimateRowItems![0],
        quantity: 1,
        miscCost: 0,
        totalItemCosts: 100,
      }, 4),
    });
    actionMocks.moveEstimateRowItemWithHistory.mockResolvedValue({
      eventId: "event-move-row",
      updatedRowCount: 1,
      rows: [
        {
          rowId: sinkRowId,
          nodeId: targetNodeId,
          sortOrder: 1,
          rowRevision: 4,
        },
      ],
    });
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
    actionMocks.replaceEstimateRowItemWithLibrary.mockImplementation(({ rowId, libraryItem }: { rowId: string; libraryItem: EstimateRowItem }) =>
      Promise.resolve(makeCanonicalReplaceResult(rowId, libraryItem, 8)),
    );
    promotionMocks.promoteEstimateRowToLibraryComponent.mockResolvedValue({
      rowId: cabinetRowId,
      itemId: "99999999-9999-4999-8999-999999999999",
      activePriceOptionId: "88888888-8888-4888-8888-888888888888",
    });
  });

  it("sends a UUID row id when a component library item is inserted", async () => {
    renderPersistedEstimateSheet();
    const libraryItem = libraryItemFixture;

    await act(async () => {
      window.dispatchEvent(new CustomEvent(ADD_LIBRARY_ITEM_EVENT, { detail: libraryItem }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({ projectId, estimateId, targetNodeId, libraryItem });
    expect(isUuid(input.rowId)).toBe(true);
    expect(input.rowId).not.toContain(libraryItem.id);
  });

  it("uses the add-library event target node instead of the selected insertion node", async () => {
    renderPersistedEstimateSheet(nodesWithRowsInSeparateAreas);
    const libraryItem = libraryItemFixture;
    const accepted = vi.fn();

    await act(async () => {
      window.dispatchEvent(new CustomEvent(ADD_LIBRARY_ITEM_EVENT, {
        cancelable: true,
        detail: { libraryItem, targetNodeId: livingNodeId, onAccepted: accepted },
      }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({ projectId, estimateId, targetNodeId: livingNodeId, libraryItem });
    expect(accepted).toHaveBeenCalledWith(true);
  });

  it("rejects malformed add-library custom events without mutating", async () => {
    const records: LibraryTelemetryRecord[] = [];
    setLibraryTelemetrySink((record) => records.push(record));
    renderPersistedEstimateSheet();

    let dispatchResult = true;
    await act(async () => {
      dispatchResult = window.dispatchEvent(new CustomEvent(ADD_LIBRARY_ITEM_EVENT, {
        cancelable: true,
        detail: { id: "not-a-row-item" },
      }));
    });

    expect(dispatchResult).toBe(false);
    expect(actionMocks.insertEstimateRowItemFromLibrary).not.toHaveBeenCalled();
    expect(records).toContainEqual(expect.objectContaining({
      event: "insert_payload_rejected",
      projectId,
      estimateId,
      action: "custom_event",
      reason: "missing_required_field",
    }));
  });

  it("rejects valid add-library custom events for read-only viewers", async () => {
    const records: LibraryTelemetryRecord[] = [];
    const accepted = vi.fn();
    setLibraryTelemetrySink((record) => records.push(record));
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={targetNodeId}
          nodes={nodes}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={false}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    let dispatchResult = true;
    await act(async () => {
      dispatchResult = window.dispatchEvent(new CustomEvent(ADD_LIBRARY_ITEM_EVENT, {
        cancelable: true,
        detail: { libraryItem: libraryItemFixture, onAccepted: accepted },
      }));
    });

    expect(dispatchResult).toBe(false);
    expect(accepted).toHaveBeenCalledWith(false);
    expect(actionMocks.insertEstimateRowItemFromLibrary).not.toHaveBeenCalled();
    expect(records).toContainEqual(expect.objectContaining({
      event: "authz_denied",
      projectId,
      estimateId,
      action: "insert_row",
      role: "viewer",
      resourceKind: "estimate",
    }));
  });

  it("ignores malformed library replacement drag payloads without throwing or replacing", async () => {
    renderPersistedEstimateSheet(nodesWithRow);
    const targetCell = screen.getByLabelText("Kitchen Sink replaceable estimate component");
    const dataTransfer = createDataTransferStub("none");
    dataTransfer.setData(LIBRARY_ITEM_DRAG_MIME_TYPE, "{");

    await act(async () => {
      expect(() => fireEvent.drop(targetCell, { dataTransfer })).not.toThrow();
      await Promise.resolve();
    });

    expect(actionMocks.replaceEstimateRowItemWithLibrary).not.toHaveBeenCalled();
  });

  it("shows the project row variant under the thumbnail and persists variant menu selections through row update", async () => {
    const user = userEvent.setup();
    const variantPriceOptions: NonNullable<EstimateRowItem["priceOptions"]> = [
      {
        id: "variant-standard",
        label: "Variant 1",
        unit: "lm",
        unitCost: 100,
        miscCost: 0,
        currency: "PHP",
        isActive: true,
        isDefault: true,
      },
      {
        id: "variant-premium",
        label: "Premium",
        variantDescription: "Premium cabinet finish",
        sku: "CAB-PREMIUM",
        unit: "lm",
        unitCost: 175,
        miscCost: 0,
        currency: "PHP",
        pricingSource: "Variant schedule",
        pricingDate: "2026-07-08",
        thumbnailPath: "https://example.com/cabinet-premium.webp",
        isActive: true,
        isDefault: false,
      },
    ];
    const variantNodes: EstimateTreeNode[] = [{
      ...nodesWithRow[0],
      estimateRowItems: [{
        ...nodesWithRow[0].estimateRowItems![0],
        priceOptionId: "variant-standard",
        priceOptionLabel: "Variant 1",
        priceOptions: variantPriceOptions,
      }],
    }];

    renderPersistedEstimateSheet(variantNodes);

    const componentCell = screen.getByLabelText("Kitchen Cabinet replaceable estimate component");
    expect(within(componentCell).getByText("Base cabinet")).toBeInTheDocument();
    const trigger = within(componentCell).getByRole("button", { name: "Change variant for Kitchen Cabinet" });
    expect(trigger).toHaveTextContent("V-1");

    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "V-2 — Premium" }));

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.replaceEstimateRowItemWithLibrary).not.toHaveBeenCalled();
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      description: "Premium cabinet finish",
      unitCost: 175,
      unit: "lm",
      sourceSnapshot: expect.objectContaining({
        imageUrl: "https://example.com/cabinet-premium.webp",
        sku: "CAB-PREMIUM",
        priceOptionId: "variant-premium",
        priceOptionLabel: "Premium",
        pricingSource: "Variant schedule",
        pricingDate: "2026-07-08",
      }),
    }));
  });

  it("keeps a newly added project component variant after save and reopen", async () => {
    const user = userEvent.setup();
    const save = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    const variantPriceOptions: NonNullable<EstimateRowItem["priceOptions"]> = [
      {
        id: "variant-standard",
        label: "Default",
        unit: "lm",
        unitCost: 100,
        miscCost: 0,
        currency: "PHP",
        isActive: true,
        isDefault: true,
      },
    ];
    const projectVariantNodes: EstimateTreeNode[] = [{
      ...nodesWithRow[0],
      estimateRowItems: [{
        ...nodesWithRow[0].estimateRowItems![0],
        priceOptionId: "variant-standard",
        priceOptionLabel: "Default",
        priceOptions: variantPriceOptions,
        sourceSnapshot: {
          sourceType: "project_component",
          sourceComponentId: projectedComponentId,
          sourceEstimateRowId: cabinetRowId,
          priceOptionId: "variant-standard",
          priceOptionLabel: "Default",
          priceOptions: variantPriceOptions,
        },
      }],
    }];
    actionMocks.getEstimateComponentEditImpact.mockResolvedValue({
      componentKind: "project",
      fingerprint: "project-component-impact",
      instanceCount: 1,
      projectCount: 1,
      estimateCount: 1,
      optionUsageCounts: { "variant-standard": 1 },
      affectedEstimates: [{
        projectId,
        projectName: "Modern Bungalow",
        estimateId,
        estimateName: "Main Estimate",
        instanceCount: 1,
      }],
    });
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(save.promise);
    renderPersistedEstimateSheet(projectVariantNodes);

    const kitchenSection = screen.getByLabelText("Kitchen");
    await user.click(within(kitchenSection).getByRole("button", { name: "Edit component Kitchen Cabinet" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Component" });
    await user.click(within(dialog).getByRole("button", { name: "Open variants panel" }));
    const variantDrawer = within(dialog).getByRole("dialog", { name: "Manage variants" });
    const addVariantButtons = within(variantDrawer).getAllByRole("button", { name: "Add variant" });
    await user.click(addVariantButtons[addVariantButtons.length - 1]);
    const variantCost = within(variantDrawer).getByLabelText("Variant unit cost");
    await user.type(variantCost, "250");
    await user.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog", { name: "Edit Component" })).toBeInTheDocument();
    const updateInput = actionMocks.updateEstimateRowItem.mock.calls[0][0];
    expect(updateInput.expectedComponentImpactFingerprint).toBe("project-component-impact");
    expect(updateInput.sourceSnapshot.priceOptions).toEqual([
      expect.objectContaining({ id: "variant-standard", label: "Default" }),
      expect.objectContaining({ label: "Option 2", unitCost: 250 }),
    ]);
    actionMocks.fetchEstimateTree.mockResolvedValue([{
      ...projectVariantNodes[0],
      estimateRowItems: [{
        ...projectVariantNodes[0].estimateRowItems![0],
        priceOptions: updateInput.sourceSnapshot.priceOptions,
        sourceSnapshot: {
          ...projectVariantNodes[0].estimateRowItems![0].sourceSnapshot,
          ...updateInput.sourceSnapshot,
        },
        rowRevision: 8,
      }],
    }]);

    await act(async () => {
      save.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        material: "Kitchen Cabinet",
        description: "Base cabinet",
        supplier: "Local supplier",
        unit: "lm",
        quantity: 2,
        quantityBase: null,
        quantityContingencyAmount: null,
        itemCost: 100,
        contingencyPercentage: 0,
        contingencyValue: 0,
        adjustmentPercentage: 0,
        adjustmentValue: 0,
        miscCost: 10,
        sourceLibraryItemId: null,
        sourceSnapshot: {
          ...projectVariantNodes[0].estimateRowItems![0].sourceSnapshot,
          ...updateInput.sourceSnapshot,
        },
        metadata: {},
        linkState: "unlinked",
        rowRevision: 8,
      });
      await save.promise;
    });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit Component" })).not.toBeInTheDocument());
    await user.click(within(kitchenSection).getByRole("button", { name: "Edit component Kitchen Cabinet" }));
    const reopenedDialog = await screen.findByRole("dialog", { name: "Edit Component" });
    await user.click(within(reopenedDialog).getByRole("button", { name: "Open variants panel" }));
    const reopenedDrawer = within(reopenedDialog).getByRole("dialog", { name: "Manage variants" });
    expect(within(reopenedDrawer).getByRole("button", { name: "Open V-2 — Option 2" })).toBeInTheDocument();
    expect(within(reopenedDrawer).getByRole("button", { name: /^Option 2PHP/u })).toBeInTheDocument();
  });

  it("keeps linked library variant menu selections on the library replacement path", async () => {
    const user = userEvent.setup();
    const variantPriceOptions: NonNullable<EstimateRowItem["priceOptions"]> = [
      {
        id: "variant-standard",
        label: "Variant 1",
        unit: "lm",
        unitCost: 100,
        miscCost: 0,
        currency: "PHP",
        isActive: true,
        isDefault: true,
      },
      {
        id: "variant-premium",
        label: "Premium",
        variantDescription: "Premium cabinet finish",
        sku: "CAB-PREMIUM",
        unit: "lm",
        unitCost: 175,
        miscCost: 0,
        currency: "PHP",
        pricingSource: "Variant schedule",
        pricingDate: "2026-07-08",
        thumbnailPath: "https://example.com/cabinet-premium.webp",
        isActive: true,
        isDefault: false,
      },
    ];
    const linkedVariantNodes: EstimateTreeNode[] = [{
      ...nodesWithLinkedRow[0],
      estimateRowItems: [{
        ...nodesWithLinkedRow[0].estimateRowItems![0],
        priceOptionId: "variant-standard",
        priceOptionLabel: "Variant 1",
        priceOptions: variantPriceOptions,
      }],
    }];

    renderPersistedEstimateSheet(linkedVariantNodes);

    const componentCell = screen.getByLabelText("Kitchen Cabinet replaceable estimate component");
    const trigger = within(componentCell).getByRole("button", { name: "Change variant for Kitchen Cabinet" });

    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "V-2 — Premium" }));

    await waitFor(() => expect(actionMocks.replaceEstimateRowItemWithLibrary).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).not.toHaveBeenCalled();
    const input = actionMocks.replaceEstimateRowItemWithLibrary.mock.calls[0][0];
    expect(input.rowId).toBe(cabinetRowId);
    expect(input.libraryItem).toMatchObject({
      priceOptionId: "variant-premium",
      priceOptionLabel: "Premium",
      description: "Premium cabinet finish",
      itemCost: 175,
      unit: "lm",
      quantity: 2,
      miscCost: 10,
      sku: "CAB-PREMIUM",
      imageUrl: "https://example.com/cabinet-premium.webp",
      pricingSource: "Variant schedule",
      pricingDate: "2026-07-08",
    });
  });

  it("maps Enter, multiline Enter, Mod+Enter, and Escape to the estimate field contract", () => {
    const onRevert = vi.fn();
    const makeEvent = (tagName: "INPUT" | "TEXTAREA", input: { key: string; metaKey?: boolean; ctrlKey?: boolean }) => {
      const blur = vi.fn();
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      return {
        blur,
        preventDefault,
        stopPropagation,
        event: {
          ...input,
          metaKey: input.metaKey ?? false,
          ctrlKey: input.ctrlKey ?? false,
          currentTarget: { tagName, blur },
          preventDefault,
          stopPropagation,
        } as Parameters<typeof handleExpressFieldKeyDown>[0],
      };
    };

    const singleLineEnter = makeEvent("INPUT", { key: "Enter" });
    handleExpressFieldKeyDown(singleLineEnter.event, { field: "name", onRevert });
    expect(singleLineEnter.preventDefault).toHaveBeenCalledOnce();
    expect(singleLineEnter.stopPropagation).toHaveBeenCalledOnce();
    expect(singleLineEnter.blur).toHaveBeenCalledOnce();

    const multilineEnter = makeEvent("TEXTAREA", { key: "Enter" });
    handleExpressFieldKeyDown(multilineEnter.event, { field: "description", onRevert });
    expect(multilineEnter.preventDefault).not.toHaveBeenCalled();
    expect(multilineEnter.stopPropagation).toHaveBeenCalledOnce();
    expect(multilineEnter.blur).not.toHaveBeenCalled();

    const modifiedEnter = makeEvent("TEXTAREA", { key: "Enter", metaKey: true });
    handleExpressFieldKeyDown(modifiedEnter.event, { field: "description", onRevert });
    expect(modifiedEnter.preventDefault).toHaveBeenCalledOnce();
    expect(modifiedEnter.stopPropagation).toHaveBeenCalledOnce();
    expect(modifiedEnter.blur).toHaveBeenCalledOnce();

    const escape = makeEvent("INPUT", { key: "Escape" });
    handleExpressFieldKeyDown(escape.event, { field: "name", onRevert });
    expect(escape.preventDefault).toHaveBeenCalledOnce();
    expect(escape.stopPropagation).toHaveBeenCalledOnce();
    expect(escape.blur).not.toHaveBeenCalled();
    expect(onRevert).toHaveBeenCalledOnce();
    expect(onRevert).toHaveBeenCalledWith("name");
  });

  it("latches rapid duplicate activations to one pending row intent", async () => {
    const duplicate = deferred<Awaited<ReturnType<typeof actionMocks.insertEstimateRowItemFromLibrary>>>();
    actionMocks.insertEstimateRowItemFromLibrary.mockReturnValueOnce(duplicate.promise);
    renderPersistedEstimateSheet(nodesWithRow);

    const duplicateButton = screen.getByRole("button", { name: "Duplicate row item Kitchen Cabinet" });
    fireEvent.click(duplicateButton);
    fireEvent.click(duplicateButton);

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const input = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    expect(input).toMatchObject({
      projectId,
      estimateId,
      targetNodeId,
      mutationId: expect.any(String),
      libraryItem: expect.objectContaining({
        id: cabinetRowId,
        duplicateSourceRowId: cabinetRowId,
        rowRevision: 7,
      }),
    });
    expect(input.rowId).not.toBe(cabinetRowId);

    await act(async () => {
      duplicate.resolve(undefined);
      await duplicate.promise;
    });
  });

  it("reuses duplicate identity after ambiguity and releases it after explicit rejection", async () => {
    actionMocks.insertEstimateRowItemFromLibrary
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Permission denied"))
      .mockResolvedValueOnce(undefined);
    renderPersistedEstimateSheet(nodesWithRow);

    const sourceDuplicateButton = () => screen.getAllByRole("button", { name: "Duplicate row item Kitchen Cabinet" })[0];
    fireEvent.click(sourceDuplicateButton());
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    const ambiguousInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Duplicate row item/u })).toHaveLength(2));

    fireEvent.click(sourceDuplicateButton());
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(2));
    const ambiguityRetryInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[1][0];
    expect(ambiguityRetryInput.rowId).toBe(ambiguousInput.rowId);
    expect(ambiguityRetryInput.mutationId).toBe(ambiguousInput.mutationId);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(sourceDuplicateButton());
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(3));
    const rejectedInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[2][0];
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Duplicate row item/u })).toHaveLength(3));

    fireEvent.click(sourceDuplicateButton());
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(4));
    const deliberateRetryInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[3][0];
    expect(deliberateRetryInput.rowId).not.toBe(rejectedInput.rowId);
    expect(deliberateRetryInput.mutationId).not.toBe(rejectedInput.mutationId);
  });

  it("still renders and persists an editable express row when the legacy flag is disabled", async () => {
    process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED = "false";
    const user = userEvent.setup();
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));

    expect(await screen.findByLabelText("Project Component replaceable estimate component")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add reference image for Project Component" })).toBeInTheDocument();
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
    expect(await screen.findByLabelText("Project Component replaceable estimate component")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add reference image for Project Component" })).toBeInTheDocument();
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
    expect(await within(kitchenSection).findByLabelText("Project Component replaceable estimate component")).toBeInTheDocument();
    await user.click(within(kitchenSection).getByRole("button", { name: "Edit component Project Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit Component" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("");
    expect(within(dialog).getByLabelText("Unit cost")).toHaveValue("0.00");
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

  it("uploads a selected image for a newly inserted express row with the inserted row revision", async () => {
    process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED = "true";
    const MockURL = class extends URL {} as typeof URL;
    MockURL.createObjectURL = vi.fn(() => "blob:express-reference-preview") as typeof URL.createObjectURL;
    MockURL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    vi.stubGlobal("URL", MockURL);
    const uploadedUrl = "https://assets.example.test/new-express-reference.webp";
    const imageAsset = uploadedImageAsset(uploadedUrl, "asset-new-express");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: uploadedUrl, imageAsset }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    const insert = deferred<Awaited<ReturnType<typeof actionMocks.insertEstimateRowItemFromLibrary>>>();
    actionMocks.insertEstimateRowItemFromLibrary.mockReturnValueOnce(insert.promise);
    renderPersistedEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Add blank estimate row to Kitchen" }));
    const insertInput = actionMocks.insertEstimateRowItemFromLibrary.mock.calls[0][0];
    actionMocks.updateEstimateRowItem.mockImplementationOnce(async (input) => ({
      rowId: input.rowId,
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
      sourceSnapshot: input.sourceSnapshot,
      metadata: insertInput.libraryItem.metadata,
      linkState: "unlinked",
      rowRevision: 2,
    }));

    await user.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/estimate-row-images", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: insertInput.rowId,
      expectedRowRevision: 1,
      sourceSnapshot: {
        imageUrl: uploadedUrl,
        imageAsset,
      },
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

    fireEvent.click(screen.getByRole("button", { name: /reference image for Express Vanity/ }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    const imageUrl = within(dialog).getByLabelText("Reference image URL");
    fireEvent.change(imageUrl, { target: { value: "https://example.com/vanity.jpg" } });
    fireEvent.keyDown(imageUrl, { key: "Enter" });

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalled());
    expect(actionMocks.updateEstimateRowItem.mock.calls.map(([input]) => input.sourceSnapshot)).toEqual([
      { imageAsset: null, imageUrl: "https://example.com/vanity.jpg" },
    ]);
  });

  it("adds estimate templates from the shared template-drop event path", async () => {
    const insertedTree: EstimateTreeNode[] = [
      {
        ...nodesWithGroup[0],
        children: [...nodesWithGroup[0].children!, starterTemplate.nodes[0]],
      },
    ];
    actionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({
      status: "inserted",
      tree: insertedTree,
      insertedRootNodeIds: [starterTemplate.nodes[0].id],
    });

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
          libraryTemplates={[starterTemplate]}
        />
      </QueryClientProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: { targetParentNodeId: groupNodeId, templateIds: [starterTemplate.id] },
      }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1));
    expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledWith({
      projectId,
      estimateId,
      targetParentNodeId: groupNodeId,
      templateId: starterTemplate.id,
      intentId: expect.any(String),
      targetTabId: undefined,
      unavailableSourcePolicy: "cancel",
    });
    expect(await screen.findByLabelText("Interior Fit-Out")).toBeInTheDocument();
  });

  it("persists template drop events by template id without sending template payloads", async () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
          libraryTemplates={[starterTemplate]}
        />
      </QueryClientProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: { targetParentNodeId: groupNodeId, templateIds: [starterTemplate.id] },
      }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1));
    expect(actionMocks.insertEstimateTemplateIntoEstimate.mock.calls[0][0]).toMatchObject({
      projectId,
      estimateId,
      targetParentNodeId: groupNodeId,
      templateId: starterTemplate.id,
    });
    expect(actionMocks.insertEstimateTemplateIntoEstimate.mock.calls[0][0]).not.toHaveProperty("template");
  });

  it("inserts a project source into any target node with scoped pending feedback and post-commit acknowledgement", async () => {
    const pendingInsert = deferred<{ tree: EstimateTreeNode[]; insertedRootNodeIds: string[] }>();
    const acknowledgements = vi.fn();
    const sourceProjectId = "33333333-3333-4333-8333-333333333333";
    const sourceEstimateId = "44444444-4444-4444-8444-444444444444";
    const sourceTabId = "88888888-8888-4888-8888-888888888888";
    const intentId = "99999999-9999-4999-8999-999999999999";
    reusableSourceMocks.insertProjectSourceIntoEstimate.mockReturnValueOnce(pendingInsert.promise);

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    act(() => {
      dispatchEstimateExternalDrop({
        eventName: INSERT_PROJECT_SOURCE_EVENT,
        intentId,
        target: { projectId, estimateId, tabId: null, nodeId: targetNodeId },
        payload: {
          targetParentNodeId: targetNodeId,
          source: { projectId: sourceProjectId, estimateId: sourceEstimateId, tabId: sourceTabId, nodeId: null },
        },
        onAcknowledged: acknowledgements,
      });
    });

    await waitFor(() => expect(reusableSourceMocks.insertProjectSourceIntoEstimate).toHaveBeenCalledTimes(1));
    expect(reusableSourceMocks.insertProjectSourceIntoEstimate).toHaveBeenCalledWith({
      targetProjectId: projectId,
      targetEstimateId: estimateId,
      targetParentNodeId: targetNodeId,
      source: { projectId: sourceProjectId, estimateId: sourceEstimateId, tabId: sourceTabId, nodeId: null },
      intentId,
      targetTabId: undefined,
    });
    expect(screen.getByLabelText("Kitchen")).toHaveAttribute("aria-busy", "true");
    expect(within(screen.getByLabelText("Kitchen")).getByRole("status")).toHaveTextContent("Adding…");
    expect(acknowledgements).not.toHaveBeenCalled();

    await act(async () => {
      pendingInsert.resolve({ tree: nodesWithGroup, insertedRootNodeIds: [] });
      await pendingInsert.promise;
    });

    await waitFor(() => expect(screen.getByLabelText("Kitchen")).not.toHaveAttribute("aria-busy"));
    expect(acknowledgements).toHaveBeenCalledWith({ accepted: true });
  });

  it("retains one project-source intent across an ambiguous retry", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const source = {
      projectId: "33333333-3333-4333-8333-333333333333",
      estimateId: "44444444-4444-4444-8444-444444444444",
      tabId: "88888888-8888-4888-8888-888888888888",
      nodeId: null,
    };
    reusableSourceMocks.insertProjectSourceIntoEstimate
      .mockRejectedValueOnce(new Error("delivery status unknown"))
      .mockResolvedValueOnce({ tree: nodesWithGroup, insertedRootNodeIds: [] });

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    const dispatchInsert = () => window.dispatchEvent(new CustomEvent(INSERT_PROJECT_SOURCE_EVENT, {
      detail: { targetParentNodeId: targetNodeId, source },
    }));
    act(dispatchInsert);
    await waitFor(() => expect(reusableSourceMocks.insertProjectSourceIntoEstimate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText("Kitchen")).not.toHaveAttribute("aria-busy"));
    act(dispatchInsert);
    await waitFor(() => expect(reusableSourceMocks.insertProjectSourceIntoEstimate).toHaveBeenCalledTimes(2));

    const firstIntentId = reusableSourceMocks.insertProjectSourceIntoEstimate.mock.calls[0][0].intentId;
    const secondIntentId = reusableSourceMocks.insertProjectSourceIntoEstimate.mock.calls[1][0].intentId;
    expect(firstIntentId).toBe(secondIntentId);
    expect(isUuid(firstIntentId)).toBe(true);
    expect(consoleError).toHaveBeenCalled();
  });

  it("requires explicit confirmation before using saved template values", async () => {
    actionMocks.insertEstimateTemplateIntoEstimate
      .mockResolvedValueOnce({
        status: "requires_saved_snapshot_confirmation",
        unavailableSourceCount: 1,
        unavailableRows: [{ templateRowId: "template-row", material: "Saved component", reason: "selected_variant_unavailable" }],
      })
      .mockResolvedValueOnce({
        status: "inserted",
        tree: nodesWithGroup,
        insertedRootNodeIds: [],
      });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
          libraryTemplates={[starterTemplate]}
        />
      </QueryClientProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: { targetParentNodeId: groupNodeId, templateIds: [starterTemplate.id] },
      }));
    });

    const confirmation = await screen.findByRole("dialog", { name: "Use saved template values?" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "Insert saved values" }));
    await waitFor(() => expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(2));
    expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      unavailableSourcePolicy: "cancel",
    }));
    expect(actionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      unavailableSourcePolicy: "use_saved_snapshot_unlinked",
    }));
  });

  it("batches template drop events with multiple template ids into one action call", async () => {
    actionMocks.insertEstimateTemplatesIntoEstimate.mockResolvedValue({ status: "inserted", tree: nodesWithGroup, insertedRootNodeIds: [] });
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EstimateSheetContent
          selectedNodeId={groupNodeId}
          nodes={nodesWithGroup}
          projectId={projectId}
          estimateId={estimateId}
          canEditEstimate={true}
          renderSidebar={false}
          libraryTemplates={[starterTemplate, finishesTemplate]}
        />
      </QueryClientProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(INSERT_ESTIMATE_TEMPLATE_EVENT, {
        detail: {
          targetParentNodeId: groupNodeId,
          templateIds: [starterTemplate.id, finishesTemplate.id],
        },
      }));
    });

    await waitFor(() => expect(actionMocks.insertEstimateTemplatesIntoEstimate).toHaveBeenCalledTimes(1));
    expect(actionMocks.insertEstimateTemplateIntoEstimate).not.toHaveBeenCalled();
    expect(actionMocks.insertEstimateTemplatesIntoEstimate).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      targetParentNodeId: groupNodeId,
      templateIds: [starterTemplate.id, finishesTemplate.id],
    }));
    expect(actionMocks.insertEstimateTemplatesIntoEstimate.mock.calls[0][0]).not.toHaveProperty("templates");
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

  it("rejects negative quantity edits without saving", async () => {
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;
    const row = quantityInput.closest("tr");
    expect(row).not.toBeNull();

    fireEvent.change(quantityInput, { target: { value: "-7" } });
    fireEvent.blur(quantityInput);

    expect(actionMocks.updateEstimateRowItem).not.toHaveBeenCalled();
    await waitFor(() => expect(quantityInput.value).toBe("2"));
    expect(within(row as HTMLElement).getByText("₱ 210.00")).toBeInTheDocument();
  });

  it("makes a linked component project-specific without clearing row values", async () => {
    actionMocks.updateEstimateRowItem.mockResolvedValue({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 2,
      itemCost: 100,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 10,
      linkState: "unlinked",
      rowRevision: 8,
    });
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithLinkedRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    expect(within(kitchenSection).getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(within(kitchenSection).getByText("₱ 210.00")).toBeInTheDocument();

    await user.click(within(kitchenSection).getByRole("button", { name: "Make Kitchen Cabinet a Project Component" }));
    const firstDialog = screen.getByRole("dialog", { name: "Make Project Component" });
    await user.click(within(firstDialog).getByRole("button", { name: "Cancel" }));
    expect(actionMocks.updateEstimateRowItem).not.toHaveBeenCalled();

    await user.click(within(kitchenSection).getByRole("button", { name: "Make Kitchen Cabinet a Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Make Project Component" });
    await user.click(within(dialog).getByRole("button", { name: "Make Project Component" }));

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: cabinetRowId,
      expectedRowRevision: 7,
      sourceLibraryItemId: null,
      linkState: "unlinked",
      mutationId: expect.any(String),
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Make Project Component" })).not.toBeInTheDocument());
    expect(within(kitchenSection).getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(within(kitchenSection).getByText("Project Component")).toBeInTheDocument();
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
        expectedRowRevision: 7,
        mutationId: expect.any(String),
      });
    });
  });

  it("keeps duplicate linked rows independently eligible for project-specific detach", async () => {
    actionMocks.updateEstimateRowItem.mockResolvedValue({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 2,
      itemCost: 100,
      contingencyPercentage: 0,
      contingencyValue: 0,
      miscCost: 10,
      linkState: "unlinked",
      rowRevision: 8,
    });
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithDuplicateLinkedRows);

    const kitchenSection = screen.getByLabelText("Kitchen");
    expect(within(kitchenSection).getAllByRole("button", { name: "Make Kitchen Cabinet a Project Component" })).toHaveLength(2);

    await user.click(within(kitchenSection).getAllByRole("button", { name: "Make Kitchen Cabinet a Project Component" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Make Project Component" });
    await user.click(within(dialog).getByRole("button", { name: "Make Project Component" }));

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      expectedRowRevision: 7,
      sourceLibraryItemId: null,
      linkState: "unlinked",
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Make Project Component" })).not.toBeInTheDocument());
    expect(within(kitchenSection).getByText("Project Component")).toBeInTheDocument();
    expect(within(kitchenSection).getAllByRole("button", { name: "Make Kitchen Cabinet a Project Component" })).toHaveLength(1);
  });

  it("shows exact library sync state in row details", async () => {
    const user = userEvent.setup();
    renderPersistedEstimateSheet(nodesWithOverriddenLinkedRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    await user.click(within(kitchenSection).getByRole("button", { name: "Open row activity for Kitchen Cabinet" }));

    const dialog = await screen.findByRole("dialog", { name: "Row item details" });
    expect(within(dialog).getAllByText("Library Component").length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole("tab", { name: "Component" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
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

  it("keeps routine row save progress and success out of global notifications", async () => {
    const user = userEvent.setup();
    const save = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(save.promise);
    renderPersistedEstimateSheetWithToasts(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");
    fireEvent.blur(quantityInput);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(toastViewport()).not.toHaveTextContent("Saving row changes");

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

    await waitFor(() => expect(quantityInput.value).toBe("7"));
    expect(toastViewport()).not.toHaveTextContent("Saved.");
  });

  it("syncs visible project component instances after editing one shared component field", async () => {
    const save = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(save.promise);
    actionMocks.fetchEstimateTree.mockResolvedValue(nodesWithRenamedProjectedComponentInstances);
    renderPersistedEstimateSheet(nodesWithProjectedComponentInstances);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const nameInputs = await within(kitchenSection).findAllByLabelText("Component name") as HTMLInputElement[];
    expect(nameInputs).toHaveLength(2);
    expect(nameInputs[0]).toHaveValue("Kitchen Cabinet");
    expect(nameInputs[1]).toHaveValue("Kitchen Cabinet");

    fireEvent.focus(nameInputs[0]);
    fireEvent.change(nameInputs[0], { target: { value: "Shared Cabinet" } });
    expect(nameInputs[0]).toHaveValue("Shared Cabinet");
    fireEvent.blur(nameInputs[0]);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowId: cabinetRowId,
      material: "Shared Cabinet",
      mutationId: expect.any(String),
    }));

    await act(async () => {
      save.resolve({
        rowId: cabinetRowId,
        nodeId: targetNodeId,
        material: "Shared Cabinet",
        description: "Base cabinet",
        supplier: "Local supplier",
        unit: "lm",
        itemCost: 100,
        quantity: 2,
        contingencyPercentage: 0,
        contingencyValue: 0,
        miscCost: 10,
        sourceSnapshot: null,
        metadata: sharedProjectComponentMetadata,
        linkState: "unlinked",
        rowRevision: 8,
      });
      await save.promise;
    });

    expect(nameInputs[0]).toHaveValue("Shared Cabinet");
    await waitFor(() => {
      const syncedInputs = within(kitchenSection).getAllByLabelText("Component name") as HTMLInputElement[];
      expect(syncedInputs[1]).toHaveValue("Shared Cabinet");
    });
  });

  it("keeps row save failures visible without a routine saving notification", async () => {
    const user = userEvent.setup();
    const save = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(save.promise);
    renderPersistedEstimateSheetWithToasts(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const quantityInput = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;

    await user.click(quantityInput);
    await user.clear(quantityInput);
    await user.type(quantityInput, "7");
    fireEvent.blur(quantityInput);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(toastViewport()).not.toHaveTextContent("Saving row changes");

    await act(async () => {
      save.reject(new Error("Permission denied"));
      await save.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Permission denied"));
    expect(screen.getByRole("alert").closest("[data-toast-viewport='true']")).not.toBeNull();
  });

  it("persists component moves through one atomic row move action", async () => {
    const move = deferred<{
      sourceRow: ReturnType<typeof makeCanonicalReplaceResult>;
      targetRow: ReturnType<typeof makeCanonicalReplaceResult>;
    }>();
    actionMocks.moveEstimateRowComponentWithHistory.mockReturnValueOnce(move.promise);
    const { sourceRow, targetRow } = await dragCabinetOntoSink();

    const input = actionMocks.moveEstimateRowComponentWithHistory.mock.calls[0][0];
    expect(input).toMatchObject({
      projectId,
      estimateId,
      sourceRowId: cabinetRowId,
      targetRowId: sinkRowId,
      mutationId: expect.any(String),
    });

    await act(async () => {
      move.resolve({
        sourceRow: makeCanonicalReplaceResult(cabinetRowId, input.sourceLibraryItem, 8),
        targetRow: makeCanonicalReplaceResult(sinkRowId, input.targetLibraryItem, 4),
      });
      await move.promise;
    });

    await waitFor(() => {
      expect(within(sourceRow).getByLabelText("Component name")).toHaveValue("");
      expect(within(targetRow).getByLabelText("Kitchen Cabinet replaceable estimate component")).toBeInTheDocument();
    });
    expect(within(targetRow).queryByLabelText("Kitchen Sink replaceable estimate component")).not.toBeInTheDocument();
  });

  it("marks source and target rows pending while moving a component", async () => {
    const move = deferred<{
      sourceRow: ReturnType<typeof makeCanonicalReplaceResult>;
      targetRow: ReturnType<typeof makeCanonicalReplaceResult>;
    }>();
    actionMocks.moveEstimateRowComponentWithHistory.mockReturnValueOnce(move.promise);
    const { sourceRow, targetRow } = await dragCabinetOntoSink(nodesWithThreeRows);
    const unrelatedRow = screen.getByLabelText("Kitchen Vanity replaceable estimate component").closest("tr");
    expect(unrelatedRow).not.toBeNull();

    await waitFor(() => expect(sourceRow).toHaveAttribute("aria-busy", "true"));
    expect(targetRow).toHaveAttribute("aria-busy", "true");
    expect(unrelatedRow as HTMLElement).not.toHaveAttribute("aria-busy");
    expect(within(sourceRow).getByRole("status", { name: /mutation status/i })).toHaveTextContent("Moving component");
    expect(within(targetRow).getByRole("status", { name: /mutation status/i })).toHaveTextContent("Moving component");
    expect(within(unrelatedRow as HTMLElement).queryByRole("status", { name: /mutation status/i })).not.toBeInTheDocument();

    const input = actionMocks.moveEstimateRowComponentWithHistory.mock.calls[0][0];
    await act(async () => {
      move.resolve({
        sourceRow: makeCanonicalReplaceResult(cabinetRowId, input.sourceLibraryItem, 8),
        targetRow: makeCanonicalReplaceResult(sinkRowId, input.targetLibraryItem, 4),
      });
      await move.promise;
    });

    await waitFor(() => expect(sourceRow).not.toHaveAttribute("aria-busy"));
    expect(targetRow).not.toHaveAttribute("aria-busy");
  });

  it("allows moving an unrelated row while a different row save is pending", async () => {
    const user = userEvent.setup();
    const cabinetSave = deferred<Awaited<ReturnType<typeof actionMocks.updateEstimateRowItem>>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(cabinetSave.promise);
    renderPersistedEstimateSheetWithToasts(nodesWithRowsInSeparateAreas);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const cabinetQuantity = within(kitchenSection).getByLabelText("Kitchen Cabinet quantity") as HTMLInputElement;
    await user.click(cabinetQuantity);
    await user.clear(cabinetQuantity);
    await user.type(cabinetQuantity, "7");
    fireEvent.blur(cabinetQuantity);

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.dispatchEvent(new CustomEvent(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, {
        detail: {
          rowItemId: sinkRowId,
          targetNodeId,
          targetIndex: 1,
        },
      }));
    });

    await waitFor(() => expect(actionMocks.moveEstimateRowItemWithHistory).toHaveBeenCalledTimes(1));
    expect(actionMocks.moveEstimateRowItemWithHistory).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      movedRowId: sinkRowId,
      sourceNodeId: livingNodeId,
      targetNodeId,
      mutationId: expect.any(String),
    }));
    expect(toastViewport()).not.toHaveTextContent("Finish saving row edits before moving rows.");

    await act(async () => {
      cabinetSave.resolve({
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
      await cabinetSave.promise;
    });
  });

  it("appends tree-initiated row drops against the current content tree when the tree index is stale", async () => {
    renderPersistedEstimateSheetWithToasts(nodesWithRowsInSeparateAreas);

    await act(async () => {
      window.dispatchEvent(new CustomEvent(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, {
        detail: {
          rowItemId: sinkRowId,
          targetNodeId,
          targetIndex: 0,
          targetPlacement: "end",
        },
      }));
    });

    await waitFor(() => expect(actionMocks.moveEstimateRowItemWithHistory).toHaveBeenCalledTimes(1));
    expect(actionMocks.moveEstimateRowItemWithHistory).toHaveBeenCalledWith(expect.objectContaining({
      movedRowId: sinkRowId,
      sourceNodeId: livingNodeId,
      targetNodeId,
      updates: [
        {
          rowId: sinkRowId,
          nodeId: targetNodeId,
          sortOrder: 1,
          expectedRowRevision: 3,
        },
      ],
    }));
    expect(toastViewport()).not.toHaveTextContent("Couldn't move the row to that location.");
  });

  it("rolls back both rows when an atomic component move fails", async () => {
    actionMocks.moveEstimateRowComponentWithHistory.mockRejectedValueOnce(new Error("component move failed"));
    const { sourceRow, targetRow } = await dragCabinetOntoSink();

    await waitFor(() => {
      expect(within(sourceRow).getByLabelText("Kitchen Cabinet replaceable estimate component")).toBeInTheDocument();
      expect(within(targetRow).getByLabelText("Kitchen Sink replaceable estimate component")).toBeInTheDocument();
    });
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

  it("clamps out-of-range quantity contingency before saving the row", async () => {
    const user = userEvent.setup();
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 4,
      quantityBase: 2,
      quantityContingencyAmount: 2,
      itemCost: 100,
      contingencyPercentage: 100,
      contingencyValue: 0,
      adjustmentPercentage: 0,
      adjustmentValue: 0,
      miscCost: 10,
      linkState: "linked-overridden",
      rowRevision: 8,
    });
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const contingencyInput = within(kitchenSection).getByLabelText("Kitchen Cabinet contingency percentage") as HTMLInputElement;

    await user.click(contingencyInput);
    await user.clear(contingencyInput);
    await user.type(contingencyInput, "101");
    await user.tab();

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    const input = actionMocks.updateEstimateRowItem.mock.calls[0]?.[0];
    expect(input).toEqual(expect.objectContaining({
      rowId: cabinetRowId,
      quantity: 4,
      quantityBase: 2,
      quantityContingencyAmount: 2,
      contingencyPercentage: 100,
      expectedRowRevision: 7,
    }));
    expect(input).not.toEqual(expect.objectContaining({
      adjustmentPercentage: expect.any(Number),
    }));
    expect(contingencyInput.value).toBe("+100");
  });

  it("saves signed row adjustment percentage edits after subtotal", async () => {
    const user = userEvent.setup();
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce({
      rowId: cabinetRowId,
      nodeId: targetNodeId,
      quantity: 2,
      quantityBase: null,
      quantityContingencyAmount: null,
      itemCost: 100,
      contingencyPercentage: 0,
      contingencyValue: 0,
      adjustmentPercentage: -10,
      adjustmentValue: -20,
      miscCost: 10,
      linkState: "linked-overridden",
      rowRevision: 8,
    });
    renderPersistedEstimateSheet(nodesWithRow);

    const kitchenSection = screen.getByLabelText("Kitchen");
    const adjustmentInput = within(kitchenSection).getByLabelText("Kitchen Cabinet adjustment percentage") as HTMLInputElement;

    await user.click(adjustmentInput);
    await user.clear(adjustmentInput);
    await user.type(adjustmentInput, "-10");
    await user.tab();

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    const input = actionMocks.updateEstimateRowItem.mock.calls[0]?.[0];
    expect(input).toEqual(expect.objectContaining({
      rowId: cabinetRowId,
      adjustmentPercentage: -10,
      expectedRowRevision: 7,
    }));
    expect(input).not.toEqual(expect.objectContaining({
      quantity: expect.any(Number),
      quantityBase: expect.anything(),
      quantityContingencyAmount: expect.anything(),
      contingencyPercentage: expect.any(Number),
    }));
    expect(within(kitchenSection).queryByLabelText("Kitchen Cabinet adjustment type")).not.toBeInTheDocument();
    expect(adjustmentInput.value).toBe("-10");
  });
});
