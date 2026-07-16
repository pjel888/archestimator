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
import type {
  ComponentRowsLibraryDataset,
  CurrentWorkspaceEstimateTemplatesSeed,
} from "@/lib/repositories/component-library-repository";
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
  templateSeed?: CurrentWorkspaceEstimateTemplatesSeed;
  templates?: EstimateTemplate[];
  componentLibrary?: ComponentRowsLibraryDataset;
  queryScope?: WorkspaceEstimateTemplatesQueryScope;
};

type TemplatesSchemaUnavailableSeed = Extract<CurrentWorkspaceEstimateTemplatesSeed, { status: "schema_unavailable" }>;

function TemplatesSchemaUnavailable({ seed }: { seed: TemplatesSchemaUnavailableSeed }) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 items-center justify-center overflow-auto rounded-xs border border-[color:var(--glass-border)] p-6",
        librarySurfaceClass("glass", "root"),
      )}
      aria-labelledby="templates-schema-unavailable-title"
      data-template-schema-state="schema_unavailable"
    >
      <div className={cn("w-full max-w-xl rounded-xs border border-dashed border-hairline bg-surfaceMuted/40 p-6", librarySurfaceClass("glass", "contentTile"))}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-tertiary">Templates unavailable</p>
        <h1 id="templates-schema-unavailable-title" className="mt-2 text-base font-semibold text-primary">
          Template storage needs a database migration
        </h1>
        <p className="mt-2 text-[11px] leading-5 text-secondary">
          Required Template tables are unavailable, so this workspace cannot load or edit Templates. No sample templates are being shown.
        </p>
        <div className="mt-4 rounded-xs border border-hairline bg-surface/70 p-3">
          <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Required migration</p>
          <code className="mt-1 block break-all text-[10px] text-primary">{seed.migrationPath}</code>
          <p className="mt-2 text-[10px] leading-4 text-secondary">
            Missing schema: {seed.missingTables.join(", ")}
          </p>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-tertiary">
          An administrator must apply the migration before Templates become available.
        </p>
      </div>
    </section>
  );
}

function AvailableTemplatesBrowse({ templates, componentLibrary, queryScope }: Omit<TemplatesBrowsePageClientProps, "templateSeed">) {
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
    <TemplatesBrowseManager
      templates={data ?? templates}
      libraryData={componentLibrary}
      onTemplatesMutated={onTemplatesMutated}
      onTemplatesInvalidated={onTemplatesInvalidated}
    />
  );
}

export function TemplatesBrowsePageClient({ templateSeed, templates, componentLibrary, queryScope }: TemplatesBrowsePageClientProps = {}) {
  if (templateSeed?.status === "schema_unavailable") {
    return (
      <LibrarySurfaceVariantProvider variant="glass">
        <TemplatesSchemaUnavailable seed={templateSeed} />
      </LibrarySurfaceVariantProvider>
    );
  }

  const availableTemplates = templateSeed?.templates ?? templates;
  const availableQueryScope = queryScope ?? (templateSeed
    ? { userId: templateSeed.userId, workspaceId: templateSeed.workspaceId }
    : undefined);

  return (
    <LibrarySurfaceVariantProvider variant="glass">
      <AvailableTemplatesBrowse
        templates={availableTemplates}
        componentLibrary={componentLibrary}
        queryScope={availableQueryScope}
      />
    </LibrarySurfaceVariantProvider>
  );
}
