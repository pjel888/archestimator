import type { QueryClient } from "@tanstack/react-query";

import {
  workspaceComponentLibraryQueryKey,
  workspaceComponentRowsLibraryQueryKey,
} from "@/lib/component-library/query-keys";
import type { EstimateRowItem } from "@/lib/estimates/types";
import type {
  ComponentLibraryDataset,
  ComponentRowsLibraryDataset,
} from "@/lib/repositories/component-library-repository";

function upsertCreatedLibraryItem(items: EstimateRowItem[], item: EstimateRowItem) {
  return [item, ...items.filter((candidate) => candidate.id !== item.id)];
}

export function patchCreatedComponentLibraryDataset(
  dataset: ComponentLibraryDataset | undefined,
  item: EstimateRowItem,
) {
  if (!dataset) return dataset;
  return { ...dataset, libraryItems: upsertCreatedLibraryItem(dataset.libraryItems, item) };
}

export function patchCreatedComponentRowsDataset(
  dataset: ComponentRowsLibraryDataset | undefined,
  item: EstimateRowItem,
) {
  if (!dataset) return dataset;
  const alreadyLoaded = dataset.libraryItems.some((candidate) => candidate.id === item.id);
  return {
    ...dataset,
    libraryItems: upsertCreatedLibraryItem(dataset.libraryItems, item),
    loadedComponentCount: dataset.loadedComponentCount === undefined || alreadyLoaded
      ? dataset.loadedComponentCount
      : dataset.loadedComponentCount + 1,
    totalComponentCount: dataset.totalComponentCount === undefined || alreadyLoaded
      ? dataset.totalComponentCount
      : dataset.totalComponentCount + 1,
  };
}

export function convergeCreatedComponentLibraryCaches(
  queryClient: QueryClient,
  workspaceId: string,
  item: EstimateRowItem,
) {
  const componentLibraryKey = workspaceComponentLibraryQueryKey(workspaceId);
  const componentRowsKey = workspaceComponentRowsLibraryQueryKey(workspaceId);
  void queryClient.cancelQueries({ queryKey: componentLibraryKey });
  void queryClient.cancelQueries({ queryKey: componentRowsKey });
  queryClient.setQueriesData<ComponentLibraryDataset>(
    { queryKey: componentLibraryKey },
    (dataset) => patchCreatedComponentLibraryDataset(dataset, item),
  );
  queryClient.setQueriesData<ComponentRowsLibraryDataset>(
    { queryKey: componentRowsKey },
    (dataset) => patchCreatedComponentRowsDataset(dataset, item),
  );
}
