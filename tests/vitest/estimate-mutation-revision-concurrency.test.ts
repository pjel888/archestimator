import { createElement, type PropsWithChildren } from "react";

import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";

const actions = vi.hoisted(() => ({
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/estimates/actions")>()),
  updateEstimateRowItem: actions.updateEstimateRowItem,
}));

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "77777777-7777-4777-8777-777777777719";
const nodeId = "55555555-5555-4555-8555-555555555561";
const rowId = "66666666-6666-4666-8666-666666666661";

const row: EstimateRowItem = {
  id: rowId,
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
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function makeResult(quantity: number, rowRevision: number) {
  return {
    rowId,
    nodeId,
    quantity,
    itemCost: 100,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 10,
    linkState: "linked-overridden" as const,
    rowRevision,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function wrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("estimate mutation revision concurrency", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("serializes rapid same-row saves and advances the second expected revision", async () => {
    const firstSave = deferred<ReturnType<typeof makeResult>>();
    const secondSave = deferred<ReturnType<typeof makeResult>>();
    actions.updateEstimateRowItem.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise);
    const queryClient = makeQueryClient();
    const tree: EstimateTreeNode[] = [{
      id: nodeId,
      name: "Kitchen",
      kind: "area",
      total: "PHP 0.00",
      estimateRowItems: [row],
      children: [],
    }];
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), tree);
    const { result } = renderHook(() => useEstimateRowMutations(estimateId), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.updateRow({ projectId, estimateId, rowId, quantity: 7 });
      result.current.updateRow({ projectId, estimateId, rowId, quantity: 8 });
    });

    await waitFor(() => expect(actions.updateEstimateRowItem).toHaveBeenCalledTimes(1));
    expect(actions.updateEstimateRowItem).toHaveBeenLastCalledWith(expect.objectContaining({
      rowId,
      quantity: 7,
      expectedRowRevision: 7,
    }));

    await act(async () => {
      firstSave.resolve(makeResult(7, 8));
      await firstSave.promise;
    });

    await waitFor(() => expect(actions.updateEstimateRowItem).toHaveBeenCalledTimes(2));
    expect(actions.updateEstimateRowItem).toHaveBeenLastCalledWith(expect.objectContaining({
      rowId,
      quantity: 8,
      expectedRowRevision: 8,
    }));

    await act(async () => {
      secondSave.resolve(makeResult(8, 9));
      await secondSave.promise;
    });

    await waitFor(() => {
      const cachedTree = queryClient.getQueryData<EstimateTreeNode[]>(estimateQueryKeys.areaTree(estimateId));
      expect(cachedTree?.[0]?.estimateRowItems?.[0]).toMatchObject({ quantity: 8, rowRevision: 9 });
    });
  });
});
