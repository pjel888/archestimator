"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import {
  WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY,
  workspaceEstimateTemplatesQueryKey,
  type WorkspaceEstimateTemplatesQueryScope,
} from "@/lib/component-library/query-keys";
import { loadCurrentWorkspaceEstimateTemplates } from "@/lib/component-library/actions";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";

const TemplatesBrowseManager = dynamic(
  () => import("./TemplatesBrowseManager").then((module) => module.TemplatesBrowseManager),
  {
    loading: () => <TemplatesBrowseFallback />,
  },
);

function TemplatesBrowseFallback() {
  return (
    <div
      className="flex h-full min-h-0 overflow-hidden rounded-xs border-r border-hairline bg-white"
      role="status"
      aria-label="Loading templates"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-hidden="true">
          <div className="hidden w-[312px] shrink-0 border-r border-hairline p-2 lg:block">
            <Skeleton className="h-7 w-full" />
            <div className="mt-2 space-y-1">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-2">
            <Skeleton className="h-7 w-32" />
            <div className="mt-2 space-y-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-[72px] w-full" />
              ))}
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading templates</span>
    </div>
  );
}

type TemplatesBrowsePageClientProps = {
  templates?: EstimateTemplate[];
  queryScope?: WorkspaceEstimateTemplatesQueryScope;
};

export function TemplatesBrowsePageClient({ templates, queryScope }: TemplatesBrowsePageClientProps = {}) {
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
  return <TemplatesBrowseManager templates={data ?? templates} onTemplatesMutated={onTemplatesMutated} />;
}
