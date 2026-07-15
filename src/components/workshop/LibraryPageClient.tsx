"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { LibrarySurfaceVariantProvider } from "@/components/workshop/library/library-surface-variant";
import {
  WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY,
  workspaceComponentLibraryQueryKey,
  workspaceComponentRowsLibraryQueryKey,
} from "@/lib/component-library/query-keys";
import {
  loadCurrentWorkspaceComponentRowsLibrary,
  loadProjectComponentRowsLibrary,
  loadProjectOnlyComponentRowsLibrary,
} from "@/lib/component-library/actions";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type {
  ComponentLibraryBrand,
  ComponentRowsLibraryDataset,
  ComponentRowsLibraryPage,
} from "@/lib/repositories/component-library-repository";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

type LibraryItemsMutationOptions = {
  totalComponentCountDelta?: number;
};

const ComponentLibraryManager = dynamic(() =>
  import("./component-library-manager/ComponentLibraryManager").then((module) => module.ComponentLibraryManager),
  {
    loading: () => <LibraryManagerFallback />,
  },
);

function LibraryManagerFallback() {
  return (
    <output
      className="estimate-glass-well flex h-full min-h-0 gap-2 overflow-hidden rounded-xs border border-[color:var(--glass-border)] p-2"
      aria-label="Loading library"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        <section className="flex h-full min-h-0 gap-2 overflow-hidden bg-transparent" aria-label="Component library workspace">
          <div className="estimate-glass-paper flex min-w-0 flex-1 flex-col rounded-xs p-2" aria-hidden="true">
            <Skeleton className="h-7 w-32" />
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-[292px] w-full" />
              ))}
            </div>
          </div>
          <div className="estimate-glass-rail hidden w-[312px] shrink-0 rounded-xs p-2 lg:block" aria-hidden="true">
            <Skeleton className="h-7 w-full" />
            <div className="mt-2 space-y-1">
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading library</span>
    </output>
  );
}

function mergeBrowseRowPreservingDetail(existing: EstimateRowItem, incoming: EstimateRowItem): EstimateRowItem {
  const existingPriceOptions = new Map((existing.priceOptions ?? []).map((option) => [option.id, option]));
  const mergedPriceOptions = incoming.priceOptions?.map((option) => {
    const existingOption = existingPriceOptions.get(option.id);
    if (!existingOption) return option;
    return {
      ...existingOption,
      ...option,
      attachments: existingOption.attachments ?? option.attachments,
    };
  });

  return {
    ...existing,
    ...incoming,
    priceOptions: mergedPriceOptions ?? existing.priceOptions,
    history: existing.history ?? incoming.history,
    notes: incoming.notes ?? existing.notes,
  };
}

function appendComponentRowsPage(
  current: ComponentRowsLibraryDataset,
  incoming: ComponentRowsLibraryPage,
): ComponentRowsLibraryPage {
  const mergedFoldersById = new Map(current.libraryFolders.map((folder) => [folder.id, folder]));
  for (const folder of incoming.libraryFolders) mergedFoldersById.set(folder.id, folder);
  const incomingById = new Map(incoming.libraryItems.map((item) => [item.id, item]));
  const mergedItems = current.libraryItems.map((item) => {
    const incomingItem = incomingById.get(item.id);
    if (!incomingItem) return item;
    incomingById.delete(item.id);
    return mergeBrowseRowPreservingDetail(item, incomingItem);
  });
  mergedItems.push(...incoming.libraryItems.filter((item) => incomingById.has(item.id)));

  const snapshotTotalCount = "nextCursor" in current
    ? (current as ComponentRowsLibraryPage).nextCursor?.snapshotTotalCount
    : undefined;
  const localTotalDelta = snapshotTotalCount === undefined || current.totalComponentCount === undefined
    ? 0
    : current.totalComponentCount - snapshotTotalCount;

  return {
    ...current,
    ...incoming,
    libraryFolders: [...mergedFoldersById.values()],
    libraryItems: mergedItems,
    loadedComponentCount: mergedItems.length,
    totalComponentCount: incoming.totalComponentCount + localTotalDelta,
  };
}

type LibraryPageClientProps = {
  // Library Optimization Plan P0 T3: the Components tab owns its dataset in a
  // TanStack Query cache. The server route seeds it via initialData (preserving SSR
  // cold first-paint); warm tab revisits render from the 5-min cache without
  // re-suspending the route (combined with next.config staleTimes). Mutations patch
  // this same cache entry (T4) instead of router.refresh().
  initialLibrary?: ComponentRowsLibraryDataset;
  // Legacy/test injection: callers may seed the cache by passing the dataset fields
  // directly. `initialLibrary` takes precedence; these are assembled into the seed.
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  libraryItems?: EstimateRowItem[];
  projectId?: string;
  projectOnly?: boolean;
  promotionEnabled?: boolean;
  canManageLibrary?: boolean;
};

export function LibraryPageClient({
  initialLibrary,
  categoryTree,
  suppliers,
  brands,
  libraryFolders,
  libraryItems,
  projectId,
  projectOnly = false,
  promotionEnabled = false,
  canManageLibrary = false,
}: LibraryPageClientProps = {}) {
  const queryClient = useQueryClient();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const seed: ComponentRowsLibraryDataset | undefined =
    initialLibrary ??
    (categoryTree || suppliers || brands || libraryFolders || libraryItems
      ? ({
          workspaceId: "legacy-test-scope",
          categoryTree: categoryTree ?? [],
          suppliers: suppliers ?? [],
          brands: brands ?? [],
          libraryFolders: libraryFolders ?? [],
          libraryItems: libraryItems ?? [],
        } as ComponentRowsLibraryDataset)
      : undefined);
  const componentRowsBaseQueryKey = seed?.workspaceId
    ? workspaceComponentRowsLibraryQueryKey(seed.workspaceId, projectId)
    : projectId
      ? [...WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, "project", projectId]
      : WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY;
  const componentRowsQueryKey = projectId && projectOnly
    ? [...componentRowsBaseQueryKey, "project-only"] as const
    : componentRowsBaseQueryKey;
  const seedIsPartial = seed?.isPartial === true;
  const { data, isFetching } = useQuery({
    queryKey: componentRowsQueryKey,
    queryFn: async () => {
      if (!projectId) return loadCurrentWorkspaceComponentRowsLibrary();
      return projectOnly
        ? loadProjectOnlyComponentRowsLibrary(projectId)
        : loadProjectComponentRowsLibrary(projectId);
    },
    initialData: seed,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: seedIsPartial ? false : true,
  });
  const library = data ?? seed;
  const componentRowsPage = library && "hasMore" in library
    ? library as ComponentRowsLibraryPage
    : null;

  const loadMoreComponentRows = () => {
    if (!componentRowsPage?.hasMore || !componentRowsPage.nextCursor || isLoadingMore) return;
    const nextPageRequest = projectId && projectOnly
      ? loadProjectOnlyComponentRowsLibrary(projectId, componentRowsPage.nextCursor)
      : !projectId
        ? loadCurrentWorkspaceComponentRowsLibrary(componentRowsPage.nextCursor)
        : null;
    if (!nextPageRequest) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    void nextPageRequest
      .then((nextPage) => {
        queryClient.setQueryData<ComponentRowsLibraryDataset>(componentRowsQueryKey, (current) => (
          current ? appendComponentRowsPage(current, nextPage) : nextPage
        ));
      })
      .catch((error: unknown) => {
        setLoadMoreError(error instanceof Error ? error.message : "Could not load more components.");
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  // T4: manager mutations patch this warm cache entry instead of router.refresh().
  const onLibraryItemsMutated = (
    updater: (items: EstimateRowItem[]) => EstimateRowItem[],
    options?: LibraryItemsMutationOptions,
  ) => {
    queryClient.setQueryData<ComponentRowsLibraryDataset>(
      componentRowsQueryKey,
      (prev) => {
        if (!prev) return prev;
        const nextItems = updater(prev.libraryItems);
        const totalComponentCount = prev.totalComponentCount === undefined
          ? undefined
          : Math.max(0, prev.totalComponentCount + (options?.totalComponentCountDelta ?? 0));
        return {
          ...prev,
          libraryItems: nextItems,
          loadedComponentCount: nextItems.length,
          totalComponentCount,
        };
      },
    );
  };
  const onLibraryFoldersMutated = (updater: (folders: LibraryFolderRecord[]) => LibraryFolderRecord[]) => {
    queryClient.setQueryData<ComponentRowsLibraryDataset>(
      componentRowsQueryKey,
      (prev) =>
        prev ? { ...prev, libraryFolders: updater(prev.libraryFolders as LibraryFolderRecord[]) } : prev,
    );
  };
  const onProjectPromotionSucceeded = () => {
    void queryClient.invalidateQueries({ queryKey: componentRowsQueryKey });
    if (library?.workspaceId) {
      void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(library.workspaceId) });
      void queryClient.invalidateQueries({ queryKey: workspaceComponentRowsLibraryQueryKey(library.workspaceId) });
    }
  };

  return (
    <LibrarySurfaceVariantProvider variant="glass">
      <ComponentLibraryManager
        categoryTree={library?.categoryTree}
        suppliers={library?.suppliers}
        brands={library?.brands}
        libraryFolders={library?.libraryFolders}
        libraryItems={library?.libraryItems}
        workspaceId={library?.workspaceId}
        projectId={projectId}
        promotionEnabled={promotionEnabled}
        canManageLibrary={canManageLibrary}
        componentRowsLoadState={library ? {
          isPartial: componentRowsPage?.hasMore === true || library.isPartial === true,
          loadedComponentCount: library.loadedComponentCount ?? library.libraryItems.length,
          totalComponentCount: library.totalComponentCount,
          isLoading: isFetching || isLoadingMore,
          loadError: loadMoreError,
          onLoadMore: loadMoreComponentRows,
        } : undefined}
        onLibraryItemsMutated={onLibraryItemsMutated}
        onLibraryFoldersMutated={onLibraryFoldersMutated}
        onProjectPromotionSucceeded={onProjectPromotionSucceeded}
      />
    </LibrarySurfaceVariantProvider>
  );
}
