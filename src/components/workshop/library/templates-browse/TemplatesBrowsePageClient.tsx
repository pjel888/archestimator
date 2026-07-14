"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import {
  LibrarySurfaceVariantProvider,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import {
  WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY,
  workspaceEstimateTemplatesQueryKey,
  type WorkspaceEstimateTemplatesQueryScope,
} from "@/lib/component-library/query-keys";
import { loadCurrentWorkspaceEstimateTemplates } from "@/lib/component-library/actions";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import type { ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";
import { cn } from "@/lib/ui/cn";

const TemplatesBrowseManager = dynamic(
  () => import("./TemplatesBrowseManager").then((module) => module.TemplatesBrowseManager),
  {
    loading: () => <TemplatesBrowseFallback />,
  },
);

function TemplatesBrowseFallback() {
  return (
    <output
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs border border-[color:var(--glass-border)] p-2",
        librarySurfaceClass("glass", "root"),
      )}
      aria-label="Loading templates"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        <section className="flex h-full min-h-0 gap-2 overflow-hidden bg-transparent" aria-hidden="true">
          <div className={cn("hidden w-[312px] shrink-0 p-2 lg:block", librarySurfaceClass("glass", "treeRail"))}>
            <Skeleton className={cn("h-7 w-full", librarySurfaceClass("glass", "skeleton"))} />
            <div className="mt-2 space-y-1">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className={cn("h-6 w-full", librarySurfaceClass("glass", "skeleton"))} />
              ))}
            </div>
          </div>
          <div className={cn("flex min-w-0 flex-1 flex-col p-2", librarySurfaceClass("glass", "centerColumn"))}>
            <Skeleton className={cn("h-7 w-32", librarySurfaceClass("glass", "skeleton"))} />
            <div className="mt-2 space-y-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className={cn("h-[72px] w-full", librarySurfaceClass("glass", "skeleton"))} />
              ))}
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading templates</span>
    </output>
  );
}

type TemplatesBrowsePageClientProps = {
  templates?: EstimateTemplate[];
  componentLibrary?: ComponentRowsLibraryDataset;
  queryScope?: WorkspaceEstimateTemplatesQueryScope;
};

export function TemplatesBrowsePageClient({ templates, componentLibrary, queryScope }: TemplatesBrowsePageClientProps = {}) {
  const queryClient = useQueryClient();
  const queryUserId = queryScope?.userId;
  const queryWorkspaceId = queryScope?.workspaceId;
  const queryKey = useMemo(
    () => (queryUserId && queryWorkspaceId
      ? workspaceEstimateTemplatesQueryKey({ userId: queryUserId, workspaceId: queryWorkspaceId })
      : WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY),
    [queryUserId, queryWorkspaceId],
  );
  // P0 T3: own the Templates dataset in a warm query cache seeded by the server
  // fetch via initialData, so warm tab revisits render from cache (with staleTimes).
  const { data } = useQuery({
    queryKey,
    queryFn: () => loadCurrentWorkspaceEstimateTemplates(),
    initialData: templates,
    staleTime: 5 * 60 * 1000,
  });
  // P0 T4: manager mutations patch this cache entry instead of router.refresh().
  const onTemplatesMutated = useCallback(
    (updater: (items: EstimateTemplate[]) => EstimateTemplate[]) => {
      queryClient.setQueryData<EstimateTemplate[]>(
        queryKey,
        (prev) => updater(prev ?? []),
      );
    },
    [queryClient, queryKey],
  );
  const onTemplatesInvalidated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);
  return (
    <LibrarySurfaceVariantProvider variant="glass">
      <TemplatesBrowseManager
        templates={data ?? templates}
        libraryData={componentLibrary}
        onTemplatesMutated={onTemplatesMutated}
        onTemplatesInvalidated={onTemplatesInvalidated}
      />
    </LibrarySurfaceVariantProvider>
  );
}
