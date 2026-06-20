"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import {
  EstimateSurfaceVariantProvider,
  estimateSurfaceClass,
  useEstimateSurfaceVariant,
  type EstimateSurfaceVariant,
} from "./estimate-surface-variant";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import { estimateQueryKeys, useEstimateTabsQuery } from "@/hooks/use-estimate-query";
import { useEstimateActiveTab } from "@/hooks/use-estimate-workspace-state";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import type { EstimateTemplate } from "./component-library/templates";
import type { EstimateRowItem, EstimateTreeNode } from "./estimate-tree-data";

const EstimateSheetTree = dynamic(() =>
  import("./EstimateSheetTree").then((module) => module.EstimateSheetTree),
  {
    loading: () => <EstimateTreeFallback />,
  },
);

const EstimateSheetContent = dynamic(() =>
  import("./EstimateSheetContent").then((module) => module.EstimateSheetContent),
  {
    loading: () => <EstimateContentFallback />,
  },
);

type EstimateWorkspaceClientProps = {
  projectId: string;
  estimateId: string;
  projectName: string;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
  estimateTabs?: EstimateTabSummary[];
  activeTabId?: string | null;
  /** Server-resolved edit capability (UX gating only; default false fails closed). */
  canEditEstimate?: boolean;
  collaborationUserId?: string | null;
  collaborationDisplayName?: string | null;
  proposalExportMetadata?: ProposalExportMetadata;
  libraryItems?: EstimateRowItem[];
  libraryTemplates?: EstimateTemplate[];
  libraryCategoryTree?: ComponentLibraryTaxonomyNode[];
  librarySuppliers?: ComponentLibrarySupplierOption[];
  libraryBrands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  /**
   * Surface design language. "paper" (default) is the live solid-white
   * workspace; "glass" opts into the liquid-glass refresh used by the
   * /newdesign preview route.
   */
  surfaceVariant?: EstimateSurfaceVariant;
};

export function EstimateWorkspaceClient({
  projectId,
  estimateId,
  projectName,
  selectedNodeId,
  nodes,
  estimateTabs = [],
  activeTabId = null,
  canEditEstimate = false,
  collaborationUserId,
  collaborationDisplayName,
  proposalExportMetadata,
  libraryItems,
  libraryTemplates,
  libraryCategoryTree,
  librarySuppliers,
  libraryBrands,
  libraryFolders,
  surfaceVariant = "paper",
}: EstimateWorkspaceClientProps) {
  const queryClient = useQueryClient();
  const tabQueriesEnabled = Boolean(activeTabId);
  const tabsQuery = useEstimateTabsQuery({
    projectId,
    estimateId,
    initialTabs: estimateTabs,
    enabled: tabQueriesEnabled,
  });
  const queryTabs = useMemo(
    () => (tabQueriesEnabled ? tabsQuery.tabs : []),
    [tabQueriesEnabled, tabsQuery.tabs],
  );
  const fallbackTabs = useMemo<EstimateTabSummary[]>(
    () => queryTabs.length > 0 ? queryTabs : [{ id: "legacy-main", name: "Main", sortOrder: 0, isDefault: true }],
    [queryTabs],
  );
  const defaultTabId = activeTabId ?? queryTabs.find((tab) => tab.isDefault)?.id ?? queryTabs[0]?.id;
  const { activeTabId: storedActiveTabId, setActiveTabId } = useEstimateActiveTab(estimateId, defaultTabId);
  const resolvedActiveTabId = tabQueriesEnabled && storedActiveTabId && queryTabs.some((tab) => tab.id === storedActiveTabId)
    ? storedActiveTabId
    : defaultTabId;
  const displayActiveTabId = resolvedActiveTabId ?? fallbackTabs[0]?.id ?? "legacy-main";
  const routeSelectedNodeId = resolvedActiveTabId === activeTabId ? selectedNodeId : null;

  useEffect(() => {
    if (!tabQueriesEnabled || !defaultTabId || resolvedActiveTabId) return;
    setActiveTabId(defaultTabId);
  }, [defaultTabId, resolvedActiveTabId, setActiveTabId, tabQueriesEnabled]);

  return (
    <EstimateSurfaceVariantProvider variant={surfaceVariant}>
    <section
      className={cn("flex h-full min-h-0 overflow-hidden", estimateSurfaceClass(surfaceVariant, "root"))}
      aria-label={`${projectName} estimates`}
    >
      <EstimateSheetTree
        projectId={projectId}
        estimateId={estimateId}
        activeTabId={resolvedActiveTabId}
        initialTabId={activeTabId ?? undefined}
        projectName={projectName}
        selectedNodeId={routeSelectedNodeId}
        nodes={nodes}
      />
      <EstimateSheetContent
        selectedNodeId={routeSelectedNodeId}
        nodes={nodes}
        projectId={projectId}
        estimateId={estimateId}
        estimateTabs={fallbackTabs}
        activeTabId={displayActiveTabId}
        dataTabId={resolvedActiveTabId}
        canEditEstimate={canEditEstimate}
        initialTabId={activeTabId ?? undefined}
        onActiveTabChange={setActiveTabId}
        onEstimateTabsChange={(tabs) => {
          // The tab CRUD actions already return the canonical tab array, so set
          // the cache directly instead of a blind refetch — create now issues a
          // single network round-trip with no redundant re-fetch flash (R10).
          queryClient.setQueryData(estimateQueryKeys.tabs(estimateId), tabs);
        }}
        collaborationUserId={collaborationUserId}
        collaborationDisplayName={collaborationDisplayName}
        proposalExportMetadata={proposalExportMetadata}
        libraryItems={libraryItems}
        libraryTemplates={libraryTemplates}
        libraryCategoryTree={libraryCategoryTree}
        librarySuppliers={librarySuppliers}
        libraryBrands={libraryBrands}
        libraryFolders={libraryFolders}
      />
    </section>
    </EstimateSurfaceVariantProvider>
  );
}

function EstimateTreeFallback() {
  const variant = useEstimateSurfaceVariant();
  return (
    <aside
      className={cn("hidden w-[376px] shrink-0 p-2 lg:block", estimateSurfaceClass(variant, "treeRail"))}
      aria-hidden="true"
    >
      <Skeleton className="h-7 w-full" />
      <div className="mt-2 space-y-1">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </aside>
  );
}

function EstimateContentFallback() {
  const variant = useEstimateSurfaceVariant();
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col p-2", estimateSurfaceClass(variant, "centerColumnFallback"))}
      role="status"
      aria-label="Loading estimate"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-hairline" aria-hidden="true">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="ml-auto h-6 w-24" />
      </div>
      <div className="min-h-0 flex-1 space-y-1 pt-2" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading estimate</span>
    </div>
  );
}
