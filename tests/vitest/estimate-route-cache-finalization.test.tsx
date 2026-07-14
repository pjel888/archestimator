import { readFileSync } from "node:fs";

import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { ESTIMATE_ROW_REVISION_CONFLICT_CODE } from "@/lib/estimates/row-revision-conflict";

const actionMocks = vi.hoisted(() => ({
  deleteEstimateRowItem: vi.fn(),
  deleteEstimateRowItemsBulk: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
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
const estimateId = "77777777-7777-4777-8777-777777777719";
const targetNodeId = "55555555-5555-4555-8555-555555555561";
const cabinetRowId = "66666666-6666-4666-8666-666666666661";

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

const nodesWithRow: EstimateTreeNode[] = [{
  id: targetNodeId,
  name: "Kitchen",
  kind: "area",
  total: "PHP 0.00",
  estimateRowItems: [cabinetRow],
  children: [],
}];

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

function makeCanonicalRowResult(rowPatch: Partial<EstimateRowItem> = {}) {
  const row = { ...cabinetRow, ...rowPatch };
  return {
    rowId: row.id,
    nodeId: targetNodeId,
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: row.quantity,
    quantityBase: row.quantityBase ?? null,
    quantityContingencyAmount: row.quantityContingencyAmount ?? null,
    itemCost: row.itemCost,
    contingencyPercentage: row.contingencyPercentage ?? 0,
    contingencyValue: row.contingencyValue ?? 0,
    miscCost: row.miscCost ?? 0,
    sourceSnapshot: row.sourceSnapshot ?? null,
    metadata: row.metadata ?? {},
    linkState: row.linkState ?? "unlinked",
    rowRevision: row.rowRevision ?? 1,
  };
}

function expectTreeAndDetailInvalidated(
  invalidateSpy: ReturnType<typeof vi.spyOn<QueryClient, "invalidateQueries">>,
  treeRefetchType: "none" | "active" = "none",
  detailRefetchType: "none" | "active" = "none",
) {
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: estimateQueryKeys.areaTree(estimateId),
    refetchType: treeRefetchType,
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: estimateQueryKeys.detail(estimateId),
    refetchType: detailRefetchType,
  });
}

function sourceBlock(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("estimate route cache finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks tree and detail caches stale after row insert, update, delete, and restore", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nodesWithRow);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId),
      { wrapper: makeWrapper(queryClient) },
    );

    actionMocks.insertEstimateRowItemFromLibrary.mockResolvedValueOnce(makeCanonicalRowResult({ rowRevision: 8 }));
    act(() => {
      result.current.insertRow({
        projectId,
        estimateId,
        targetNodeId,
        rowId: cabinetRowId,
        libraryItem: cabinetRow,
      });
    });
    await waitFor(() => expect(actionMocks.insertEstimateRowItemFromLibrary).toHaveBeenCalledTimes(1));
    await waitFor(() => expectTreeAndDetailInvalidated(invalidateSpy));

    invalidateSpy.mockClear();
    actionMocks.updateEstimateRowItem.mockResolvedValueOnce(makeCanonicalRowResult({ quantity: 3, rowRevision: 9 }));
    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        quantity: 3,
      });
    });
    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expectTreeAndDetailInvalidated(invalidateSpy));

    invalidateSpy.mockClear();
    actionMocks.deleteEstimateRowItem.mockResolvedValueOnce({ rowId: cabinetRowId, eventId: "event-delete" });
    act(() => {
      result.current.deleteRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
      });
    });
    await waitFor(() => expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expectTreeAndDetailInvalidated(invalidateSpy));

    invalidateSpy.mockClear();
    actionMocks.restoreDeletedEstimateRows.mockResolvedValueOnce({ restoredRows: [makeCanonicalRowResult({ rowRevision: 10 })] });
    act(() => {
      result.current.restoreDeletedRows({
        projectId,
        estimateId,
        sourceEventId: "event-delete",
        rowIds: [cabinetRowId],
      });
    });
    await waitFor(() => expect(actionMocks.restoreDeletedEstimateRows).toHaveBeenCalledTimes(1));
    await waitFor(() => expectTreeAndDetailInvalidated(invalidateSpy));
  });

  it("actively refetches the tree on row revision conflicts while preserving detail-cache finalization", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), nodesWithRow);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const conflict = Object.assign(new Error("row revision conflict"), {
      code: ESTIMATE_ROW_REVISION_CONFLICT_CODE,
    });
    actionMocks.updateEstimateRowItem.mockRejectedValueOnce(conflict);
    const { result } = renderHook(
      () => useEstimateRowMutations(estimateId),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.updateRow({
        projectId,
        estimateId,
        rowId: cabinetRowId,
        quantity: 4,
      });
    });

    await waitFor(() => expect(actionMocks.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expectTreeAndDetailInvalidated(invalidateSpy, "active", "active"));
    await waitFor(() => expect(result.current.rowMutationStatuses[cabinetRowId]?.phase).toBe("failed"));
  });

  it("keeps server-side route context cache clearing on route-affecting estimate mutations", () => {
    const actions = readFileSync("src/lib/estimates/actions.ts", "utf8");
    const revalidationHelper = sourceBlock(
      actions,
      "function revalidateProjectEstimatePaths(projectId: string)",
      "export async function fetchEstimateTree",
    );
    const adjustmentAction = sourceBlock(
      actions,
      "export async function updateEstimateSheetAdjustment",
      "export async function updateEstimateRowItem",
    );
    const rowMoveAction = sourceBlock(
      actions,
      "export async function moveEstimateRowItemWithHistory",
      "function normalizeEstimateRowIdSelection",
    );

    expect(revalidationHelper).toContain("clearEstimateRouteContextProcessCache(projectId)");
    expect(revalidationHelper).toContain("revalidatePath(`/workshop/projects/${projectId}`)");
    expect(revalidationHelper).toContain("revalidatePath(`/workshop/projects/${projectId}/estimates`)");
    expect(revalidationHelper).toContain("revalidatePath(`/workshop/projects/${projectId}/data`)");
    expect(adjustmentAction).toContain("clearEstimateRouteContextProcessCache(project.id)");
    expect(adjustmentAction).toContain("revalidateProjectEstimatePaths(project.id)");
    expect(rowMoveAction).toContain("clearEstimateRouteContextProcessCache(project.id)");
  });
});
