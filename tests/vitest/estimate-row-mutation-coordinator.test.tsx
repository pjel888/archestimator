import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PropsWithChildren } from "react";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { workspaceComponentLibraryLiteQueryKey } from "@/lib/component-library/query-keys";

const actionMocks = vi.hoisted(() => ({
  deleteEstimateRowItem: vi.fn(),
  deleteEstimateRowItemsBulk: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  moveEstimateRowComponentWithHistory: vi.fn(),
  moveEstimateRowItemWithHistory: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

const promotionMocks = vi.hoisted(() => ({
  promoteEstimateRowToLibraryComponent: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/estimates/express-promotion-actions", () => promotionMocks);

const projectId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "11111111-1111-4111-8111-111111111111";
const estimateId = "77777777-7777-4777-8777-777777777719";
const targetNodeId = "55555555-5555-4555-8555-555555555561";
const cabinetRowId = "66666666-6666-4666-8666-666666666661";
const sinkRowId = "66666666-6666-4666-8666-666666666662";
const secondCabinetRowId = "66666666-6666-4666-8666-666666666663";
const cabinetComponentId = "project-cabinet-component";

const cabinetRow: EstimateRowItem = {
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
};

const sinkRow: EstimateRowItem = {
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
};

const nodesWithRow: EstimateTreeNode[] = [
  {
    id: targetNodeId,
    name: "Kitchen",
    kind: "area",
    total: "PHP 0.00",
    estimateRowItems: [cabinetRow, sinkRow],
    children: [],
  },
];

const projectedCabinetRow: EstimateRowItem = {
  ...cabinetRow,
  metadata: {
    expressComponent: {
      kind: "express",
      schemaVersion: 1,
      id: cabinetComponentId,
      componentId: cabinetComponentId,
    },
    projectComponentProjection: {
      componentId: cabinetComponentId,
      projectId,
      projectName: "Modern Bungalow",
      estimateId,
      estimateName: "Main Estimate",
      nodeId: targetNodeId,
      nodeName: "Kitchen",
      sourceRowId: cabinetRowId,
      instanceRowIds: [cabinetRowId],
      instanceCount: 1,
      classification: "express",
    },
  },
};

const secondProjectedCabinetRow: EstimateRowItem = {
  ...projectedCabinetRow,
  id: secondCabinetRowId,
  quantity: 5,
  subTotal: 500,
  totalItemCosts: 510,
  rowRevision: 2,
  metadata: {
    ...projectedCabinetRow.metadata,
    projectComponentProjection: {
      ...projectedCabinetRow.metadata?.projectComponentProjection,
      sourceRowId: cabinetRowId,
      instanceRowIds: [cabinetRowId, secondCabinetRowId],
      instanceCount: 2,
    },
  },
};

const projectedCabinetComponentItem: EstimateRowItem = {
  ...projectedCabinetRow,
  id: cabinetComponentId,
  metadata: {
    ...projectedCabinetRow.metadata,
    projectComponentProjection: {
      ...projectedCabinetRow.metadata?.projectComponentProjection,
      componentId: cabinetComponentId,
      sourceRowId: cabinetRowId,
      instanceRowIds: [cabinetRowId],
      instanceCount: 1,
    },
  },
};

const projectedCabinetComponentWithTwoInstances: EstimateRowItem = {
  ...projectedCabinetComponentItem,
  metadata: {
    ...projectedCabinetComponentItem.metadata,
    projectComponentProjection: {
      ...projectedCabinetComponentItem.metadata?.projectComponentProjection,
      instanceRowIds: [cabinetRowId, secondCabinetRowId],
      instanceCount: 2,
    },
  },
};

const snapshotIdentityCabinetRow = {
  ...cabinetRow,
  metadata: {
    expressComponent: {
      kind: "express",
      schemaVersion: 1,
      id: "legacy-cabinet-row-local-id",
    },
  },
  sourceSnapshot: {
    sourceType: "project_component",
    sourceComponentId: cabinetComponentId,
    sourceEstimateRowId: cabinetRowId,
  },
} as EstimateRowItem;

const secondSnapshotIdentityCabinetRow = {
  ...snapshotIdentityCabinetRow,
  id: secondCabinetRowId,
  quantity: 5,
  subTotal: 500,
  totalItemCosts: 510,
  rowRevision: 2,
  metadata: {},
  sourceSnapshot: {
    sourceType: "project_component",
    sourceComponentId: cabinetComponentId,
    sourceEstimateRowId: cabinetRowId,
  },
} as EstimateRowItem;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
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
    quantityBase: item.quantityBase ?? null,
    quantityContingencyAmount: item.quantityContingencyAmount ?? null,
    itemCost: item.itemCost,
    contingencyPercentage: item.contingencyPercentage ?? 0,
    contingencyValue: item.contingencyValue ?? 0,
    adjustmentPercentage: item.adjustmentPercentage ?? 0,
    adjustmentValue: item.adjustmentValue ?? 0,
    miscCost: item.miscCost ?? 0,
    sourceSnapshot: item.sourceSnapshot ?? null,
    metadata: item.metadata ?? {},
    linkState: item.linkState ?? "unlinked",
    rowRevision,
  };
}

function findCachedRow(queryClient: QueryClient, rowId: string) {
  const tree = queryClient.getQueryData<EstimateTreeNode[]>(estimateQueryKeys.areaTree(estimateId));
  return tree?.flatMap((node) => node.estimateRowItems ?? []).find((item) => item.id === rowId) ?? null;
}

function makeLibraryData(libraryItems: EstimateRowItem[]) {
  return {
    categoryTree: [],
    suppliers: [],
    brands: [],
    libraryFolders: [],
    libraryItems,
    templates: [],
  };
}

function getCachedLibraryItems(queryClient: QueryClient) {
  return queryClient.getQueryData<ReturnType<typeof makeLibraryData>>(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId))?.libraryItems ?? [];
}

describe("estimate row mutation coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("serializes a target-row replacement behind an in-flight component move", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nodesWithRow);
    const move = deferred<{
      status: "applied";
      eventId: string;
      sourceRow: ReturnType<typeof makeCanonicalReplaceResult>;
      targetRow: ReturnType<typeof makeCanonicalReplaceResult>;
    }>();
    actionMocks.moveEstimateRowComponentWithHistory.mockReturnValueOnce(move.promise);
    actionMocks.replaceEstimateRowItemWithLibrary.mockResolvedValueOnce(makeCanonicalReplaceResult(sinkRowId, {
      ...sinkRow,
      material: "New Sink Component",
    }, 4));

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.moveRows({
        projectId,
        estimateId,
        sourceRowId: cabinetRowId,
        targetRowId: sinkRowId,
        sourceLibraryItem: { ...cabinetRow, material: "Project Component" },
        targetLibraryItem: cabinetRow,
      });
    });

    await waitFor(() => expect(actionMocks.moveEstimateRowComponentWithHistory).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.replaceRow({
        projectId,
        estimateId,
        rowId: sinkRowId,
        libraryItem: { ...sinkRow, material: "New Sink Component" },
      });
    });

    expect(actionMocks.replaceEstimateRowItemWithLibrary).not.toHaveBeenCalled();

    const moveInput = actionMocks.moveEstimateRowComponentWithHistory.mock.calls[0][0];
    await act(async () => {
      move.resolve({
        status: "applied",
        eventId: "move-event-1",
        sourceRow: makeCanonicalReplaceResult(cabinetRowId, moveInput.sourceLibraryItem, 8),
        targetRow: makeCanonicalReplaceResult(sinkRowId, moveInput.targetLibraryItem, 5),
      });
      await move.promise;
    });

    await waitFor(() => expect(actionMocks.replaceEstimateRowItemWithLibrary).toHaveBeenCalledTimes(1));
    expect(actionMocks.replaceEstimateRowItemWithLibrary).toHaveBeenCalledWith(expect.objectContaining({
      rowId: sinkRowId,
      expectedRowRevision: 5,
    }));
    await waitFor(() => expect(findCachedRow(queryClient, sinkRowId)?.material).toBe("New Sink Component"));
  });

  it("serializes an immediate quantity edit behind a normal library row insert", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nodesWithRow);
    const insert = deferred<ReturnType<typeof makeCanonicalReplaceResult>>();
    actionMocks.insertEstimateRowItemFromLibrary.mockReturnValueOnce(insert.promise);
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce(makeCanonicalReplaceResult(cabinetRowId, {
      ...cabinetRow,
      quantity: 3,
    }, 2));

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.insertRow({
        projectId,
        estimateId,
        targetNodeId,
        rowId: cabinetRowId,
        libraryItem: cabinetRow,
      });
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        quantity: 3,
      });
    });

    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).not.toHaveBeenCalled();

    await act(async () => {
      insert.resolve(makeCanonicalReplaceResult(cabinetRowId, cabinetRow, 1));
      await insert.promise;
    });

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledWith(expect.objectContaining({
      rowId: cabinetRowId,
      quantity: 3,
      expectedRowRevision: 1,
    }));
  });

  it("reconciles authoritative rows when an atomic bulk delete reports a revision conflict", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nodesWithRow);
    actionMocks.deleteEstimateRowItemsBulk.mockResolvedValueOnce({
      status: "conflict",
      conflictRowIds: [cabinetRowId],
      authoritativeRows: [makeCanonicalReplaceResult(cabinetRowId, {
        ...cabinetRow,
        material: "Authoritative Cabinet",
      }, 8)],
    });
    const rollback = vi.fn();
    const onError = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.deleteRows({
        projectId,
        estimateId,
        rowIds: [cabinetRowId],
        rollback,
        onError,
        onSuccess,
      });
    });

    await waitFor(() => expect(actionMocks.deleteEstimateRowItemsBulk).toHaveBeenCalledWith(expect.objectContaining({
      expectedRowRevisions: { [cabinetRowId]: 7 },
    })));
    await waitFor(() => expect(findCachedRow(queryClient, cabinetRowId)).toMatchObject({
      material: "Authoritative Cabinet",
      rowRevision: 8,
    }));
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "estimate_sheet_row_revision_conflict" }));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("refetches the active tree and suppresses local success when move rows are absent from cache", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData<EstimateTreeNode[]>(estimateQueryKeys.areaTree(estimateId), [
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Stale Area",
        kind: "area",
        total: "PHP 0.00",
        estimateRowItems: [],
        children: [],
      },
    ]);
    const recoveredTree: EstimateTreeNode[] = [{
      ...nodesWithRow[0],
      estimateRowItems: [
        { ...cabinetRow, rowRevision: 8 },
        { ...sinkRow, rowRevision: 4 },
      ],
    }];
    actionMocks.moveEstimateRowItemWithHistory.mockResolvedValueOnce({
      eventId: "event-move-row",
      updatedRowCount: 2,
      rows: [
        { rowId: cabinetRowId, nodeId: targetNodeId, sortOrder: 0, rowRevision: 8 },
        { rowId: sinkRowId, nodeId: targetNodeId, sortOrder: 1, rowRevision: 4 },
      ],
    });
    actionMocks.fetchEstimateTree.mockResolvedValueOnce(recoveredTree);
    const onSuccess = vi.fn();
    const saveStates: string[] = [];

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, undefined, undefined, (state) => saveStates.push(state)),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.moveRowItem({
        projectId,
        estimateId,
        movedRowId: sinkRowId,
        sourceNodeId: "44444444-4444-4444-8444-444444444445",
        targetNodeId,
        updates: [
          { rowId: cabinetRowId, nodeId: targetNodeId, sortOrder: 0, expectedRowRevision: 7 },
          { rowId: sinkRowId, nodeId: targetNodeId, sortOrder: 1, expectedRowRevision: 3 },
        ],
        onSuccess,
      });
    });

    await waitFor(() => expect(actionMocks.moveEstimateRowItemWithHistory).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(actionMocks.fetchEstimateTree).toHaveBeenCalledWith({ projectId, estimateId }));
    await waitFor(() => expect(queryClient.getQueryData(estimateQueryKeys.areaTree(estimateId))).toEqual(recoveredTree));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(saveStates).toContain("saved");
  });

  it("fails row updates fast when the browser is offline instead of leaving the row pending", async () => {
    const onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nodesWithRow);
    const saveStates: string[] = [];

    try {
      const { result } = renderHook(
        () => useEstimateRowMutations(estimateId, undefined, undefined, undefined, (state) => saveStates.push(state)),
        { wrapper: makeWrapper(queryClient) },
      );

      act(() => {
        result.current.updateRow({
          projectId,
          estimateId,
          rowId: cabinetRowId,
          quantity: 7,
        });
      });

      await waitFor(() => expect(result.current.rowMutationStatuses[cabinetRowId]?.phase).toBe("failed"));
      expect(result.current.rowMutationStatuses[cabinetRowId]?.message).toMatch(/offline/i);
      expect(actionMocks.updateEstimateRowItem).not.toHaveBeenCalled();
      expect(saveStates).toContain("failed");
      expect(findCachedRow(queryClient, cabinetRowId)?.quantity).toBe(7);
    } finally {
      onlineSpy.mockRestore();
    }
  });

  it("patches the mounted Project tab component projection during row name updates", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [projectedCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentItem]));
    const update = deferred<ReturnType<typeof makeCanonicalReplaceResult>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(update.promise);

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        material: "Custom Cabinet",
      });
    });

    await waitFor(() => expect(getCachedLibraryItems(queryClient)[0]?.material).toBe("Custom Cabinet"));

    await act(async () => {
      update.resolve(makeCanonicalReplaceResult(cabinetRowId, {
        ...projectedCabinetRow,
        material: "Confirmed Cabinet",
      }, 8));
      await update.promise;
    });

    await waitFor(() => expect(getCachedLibraryItems(queryClient)[0]?.material).toBe("Confirmed Cabinet"));
    expect(findCachedRow(queryClient, cabinetRowId)?.material).toBe("Confirmed Cabinet");
  });

  it("patches every mounted project component instance for shared component-field edits", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [projectedCabinetRow, secondProjectedCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentWithTwoInstances]));
    const update = deferred<ReturnType<typeof makeCanonicalReplaceResult>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(update.promise);

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        material: "Shared Cabinet",
        quantity: 9,
      });
    });

    await waitFor(() => expect(findCachedRow(queryClient, cabinetRowId)?.material).toBe("Shared Cabinet"));
    expect(findCachedRow(queryClient, cabinetRowId)?.quantity).toBe(9);
    expect(findCachedRow(queryClient, secondCabinetRowId)).toMatchObject({
      material: "Shared Cabinet",
      quantity: 5,
    });
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({
      id: cabinetComponentId,
      material: "Shared Cabinet",
      quantity: 2,
    });

    await act(async () => {
      update.resolve(makeCanonicalReplaceResult(cabinetRowId, {
        ...projectedCabinetRow,
        material: "Confirmed Shared Cabinet",
        quantity: 9,
      }, 8));
      await update.promise;
    });

    await waitFor(() => expect(findCachedRow(queryClient, secondCabinetRowId)?.material).toBe("Confirmed Shared Cabinet"));
    expect(findCachedRow(queryClient, secondCabinetRowId)?.quantity).toBe(5);
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({
      id: cabinetComponentId,
      material: "Confirmed Shared Cabinet",
      quantity: 2,
    });
  });

  it("patches mounted project component instances that only share source snapshot identity", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [snapshotIdentityCabinetRow, secondSnapshotIdentityCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentWithTwoInstances]));
    const update = deferred<ReturnType<typeof makeCanonicalReplaceResult>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(update.promise);

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        material: "Shared Snapshot Cabinet",
        quantity: 9,
      });
    });

    await waitFor(() => expect(findCachedRow(queryClient, secondCabinetRowId)?.material).toBe("Shared Snapshot Cabinet"));
    expect(findCachedRow(queryClient, cabinetRowId)?.quantity).toBe(9);
    expect(findCachedRow(queryClient, secondCabinetRowId)?.quantity).toBe(5);
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({
      id: cabinetComponentId,
      material: "Shared Snapshot Cabinet",
    });

    await act(async () => {
      update.resolve(makeCanonicalReplaceResult(cabinetRowId, {
        ...snapshotIdentityCabinetRow,
        material: "Confirmed Snapshot Cabinet",
        quantity: 9,
      }, 8));
      await update.promise;
    });

    await waitFor(() => expect(findCachedRow(queryClient, secondCabinetRowId)?.material).toBe("Confirmed Snapshot Cabinet"));
    expect(findCachedRow(queryClient, secondCabinetRowId)?.quantity).toBe(5);
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({
      id: cabinetComponentId,
      material: "Confirmed Snapshot Cabinet",
    });
  });

  it("patches every mounted project component instance after editing the shared thumbnail", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [projectedCabinetRow, secondProjectedCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentWithTwoInstances]));
    const update = deferred<ReturnType<typeof makeCanonicalReplaceResult>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(update.promise);

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        sourceSnapshot: { imageUrl: "https://assets.example.test/shared-cabinet.webp" },
      });
    });

    await waitFor(() => expect(findCachedRow(queryClient, cabinetRowId)?.imageUrl).toBe("https://assets.example.test/shared-cabinet.webp"));
    expect(findCachedRow(queryClient, secondCabinetRowId)?.imageUrl).toBe("https://assets.example.test/shared-cabinet.webp");
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({
      id: cabinetComponentId,
      imageUrl: "https://assets.example.test/shared-cabinet.webp",
    });

    await act(async () => {
      update.resolve(makeCanonicalReplaceResult(cabinetRowId, {
        ...projectedCabinetRow,
        sourceSnapshot: { imageUrl: "https://assets.example.test/confirmed-cabinet.webp" },
      }, 8));
      await update.promise;
    });

    await waitFor(() => expect(findCachedRow(queryClient, cabinetRowId)?.imageUrl).toBe("https://assets.example.test/confirmed-cabinet.webp"));
    expect(findCachedRow(queryClient, secondCabinetRowId)?.imageUrl).toBe("https://assets.example.test/confirmed-cabinet.webp");
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({
      id: cabinetComponentId,
      imageUrl: "https://assets.example.test/confirmed-cabinet.webp",
    });
  });

  it("rolls back the mounted Project tab component projection when a row name update fails", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [projectedCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentItem]));
    const update = deferred<ReturnType<typeof makeCanonicalReplaceResult>>();
    actionMocks.updateEstimateRowItem.mockReturnValueOnce(update.promise);

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        material: "Draft Cabinet",
      });
    });

    await waitFor(() => expect(getCachedLibraryItems(queryClient)[0]?.material).toBe("Draft Cabinet"));

    await act(async () => {
      update.reject(new Error("save failed"));
      try {
        await update.promise;
      } catch {
        // The mutation queue owns the user-facing failure state.
      }
    });

    await waitFor(() => expect(result.current.rowMutationStatuses[cabinetRowId]?.phase).toBe("failed"));
    expect(getCachedLibraryItems(queryClient)[0]).toMatchObject({ material: "Kitchen Cabinet", rowRevision: 7 });
    expect(findCachedRow(queryClient, cabinetRowId)).toMatchObject({ material: "Kitchen Cabinet", rowRevision: 7 });
  });

  it("removes deleted project component projections from the mounted Project tab cache", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [projectedCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentItem, sinkRow]));
    actionMocks.deleteEstimateRowItem.mockResolvedValueOnce({
      eventId: "event-delete-cabinet",
      deletedRowId: cabinetRowId,
    });

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.deleteRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
      });
    });

    await waitFor(() => expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getCachedLibraryItems(queryClient).map((item) => item.id)).not.toContain(cabinetComponentId));
    expect(getCachedLibraryItems(queryClient).map((item) => item.id)).toContain(sinkRowId);
  });

  it("keeps a Project tab component cached when only one of its row instances is deleted", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), [{
      ...nodesWithRow[0],
      estimateRowItems: [projectedCabinetRow, secondProjectedCabinetRow, sinkRow],
    }]);
    queryClient.setQueryData(workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), makeLibraryData([projectedCabinetComponentWithTwoInstances]));
    actionMocks.deleteEstimateRowItem.mockResolvedValueOnce({
      eventId: "event-delete-cabinet-instance",
      deletedRowId: cabinetRowId,
    });

    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId, undefined, workspaceId, projectId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.deleteRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
      });
    });

    await waitFor(() => expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(getCachedLibraryItems(queryClient).map((item) => item.id)).toContain(cabinetComponentId);
  });
});
