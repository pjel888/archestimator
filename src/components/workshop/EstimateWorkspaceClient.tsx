"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import { useEstimateTabsQuery } from "@/hooks/use-estimate-query";
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
  collaborationUserId?: string | null;
  collaborationDisplayName?: string | null;
  proposalExportMetadata?: ProposalExportMetadata;
  libraryItems?: EstimateRowItem[];
  libraryTemplates?: EstimateTemplate[];
  libraryCategoryTree?: ComponentLibraryTaxonomyNode[];
  librarySuppliers?: ComponentLibrarySupplierOption[];
  libraryBrands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
};

export function EstimateWorkspaceClient({
  projectId,
  estimateId,
  projectName,
  selectedNodeId,
  nodes,
  estimateTabs = [],
  activeTabId = null,
  collaborationUserId,
  collaborationDisplayName,
  proposalExportMetadata,
  libraryItems,
  libraryTemplates,
  libraryCategoryTree,
  librarySuppliers,
  libraryBrands,
  libraryFolders,
}: EstimateWorkspaceClientProps) {
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
    <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label={`${projectName} estimates`}>
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
        initialTabId={activeTabId ?? undefined}
        onActiveTabChange={setActiveTabId}
        onEstimateTabsChange={() => { void tabsQuery.refetch(); }}
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
  );
}

function EstimateTreeFallback() {
  return (
    <aside className="hidden w-[376px] shrink-0 border-r border-hairline bg-white p-2 lg:block" aria-hidden="true">
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
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white p-2" role="status" aria-label="Loading estimate">
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
