import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { moveEstimateRowItem, type MoveEstimateRowItemInput } from "@/lib/domain/estimate-mutations";
import type { EstimateTree } from "@/lib/domain/estimate-tree";
import { estimateRepository } from "@/lib/repositories/estimate-repository";

export const estimateQueryKeys = {
  detail: (estimateId: string) => ["estimate", estimateId] as const,
  areaTree: (estimateId: string) => ["estimate", estimateId, "area-tree"] as const,
};

export function useEstimateQuery(estimateId: string) {
  return useQuery({
    queryKey: estimateQueryKeys.detail(estimateId),
    queryFn: () => estimateRepository.getEstimateTree(estimateId),
  });
}

export function useMoveEstimateRowItem(estimateId: string) {
  const queryClient = useQueryClient();
  const queryKey = estimateQueryKeys.detail(estimateId);

  return useMutation({
    mutationFn: (input: MoveEstimateRowItemInput) => estimateRepository.moveEstimateRowItem(estimateId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<EstimateTree>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, moveEstimateRowItem(previous, input));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
