"use client";

import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY, WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY, WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY } from "@/lib/component-library/query-keys";
import { loadCurrentWorkspaceComponentRowsLibrary, loadProjectComponentRowsLibrary } from "@/lib/component-library/actions";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand, ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

const ComponentLibraryManager = dynamic(() =>
  import("./component-library-manager/ComponentLibraryManager").then((module) => module.ComponentLibraryManager),
  {
    loading: () => <LibraryManagerFallback />,
  },
);

function LibraryManagerFallback() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xs border-r border-hairline bg-white" role="status" aria-label="Loading library">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
          <div className="flex min-w-0 flex-1 flex-col p-2" aria-hidden="true">
            <Skeleton className="h-7 w-32" />
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-[236px] w-full" />
              ))}
            </div>
          </div>
          <div className="hidden w-[312px] shrink-0 border-l border-hairline p-2 lg:block" aria-hidden="true">
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
    </div>
  );
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
  promotionEnabled?: boolean;
};

export function LibraryPageClient({
  initialLibrary,
  categoryTree,
  suppliers,
  brands,
  libraryFolders,
  libraryItems,
  projectId,
  promotionEnabled = false,
}: LibraryPageClientProps = {}) {
  const queryClient = useQueryClient();
  const seed: ComponentRowsLibraryDataset | undefined =
    initialLibrary ??
    (categoryTree || suppliers || brands || libraryFolders || libraryItems
      ? ({
          categoryTree: categoryTree ?? [],
          suppliers: suppliers ?? [],
          brands: brands ?? [],
          libraryFolders: libraryFolders ?? [],
          libraryItems: libraryItems ?? [],
        } as ComponentRowsLibraryDataset)
      : undefined);
  const componentRowsQueryKey = projectId ? [...WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, "project", projectId] : WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY;
  const { data } = useQuery({
    queryKey: componentRowsQueryKey,
    queryFn: () => projectId ? loadProjectComponentRowsLibrary(projectId) : loadCurrentWorkspaceComponentRowsLibrary(),
    initialData: seed,
    staleTime: 5 * 60 * 1000,
  });
  const library = data ?? seed;

  // T4: manager mutations patch this warm cache entry instead of router.refresh().
  const onLibraryItemsMutated = (updater: (items: EstimateRowItem[]) => EstimateRowItem[]) => {
    queryClient.setQueryData<ComponentRowsLibraryDataset>(
      componentRowsQueryKey,
      (prev) => (prev ? { ...prev, libraryItems: updater(prev.libraryItems) } : prev),
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
    void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY });
  };

  return (
    <ComponentLibraryManager
      categoryTree={library?.categoryTree}
      suppliers={library?.suppliers}
      brands={library?.brands}
      libraryFolders={library?.libraryFolders}
      libraryItems={library?.libraryItems}
      projectId={projectId}
      promotionEnabled={promotionEnabled}
      onLibraryItemsMutated={onLibraryItemsMutated}
      onLibraryFoldersMutated={onLibraryFoldersMutated}
      onProjectPromotionSucceeded={onProjectPromotionSucceeded}
    />
  );
}
