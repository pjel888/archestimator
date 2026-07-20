"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/ui/cn";
import {
  EstimateSurfaceVariantProvider,
  type EstimateSurfaceVariant,
} from "./estimate-surface-variant";
import { estimateSurfaceClass } from "./estimate-surface-class";
import { ProjectEstimateMetadataPublisher } from "./ProjectEstimateMetadataStrip";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import { estimateQueryKeys, useEstimateEditCapabilityQuery, useEstimateTabsQuery } from "@/hooks/use-estimate-query";
import { useEstimateActiveTab } from "@/hooks/use-estimate-workspace-state";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { EstimateSheetAdjustment, EstimateTabSummary, EstimateTreeLoadLimitState } from "@/lib/estimates/types";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import type { EstimateTemplate } from "./component-library/templates";
import type { EstimateRowItem, EstimateTreeNode } from "./estimate-tree-data";

const EMPTY_ESTIMATE_TABS: EstimateTabSummary[] = [];

function EstimateTreeDynamicFallback() {
  return (
    <aside
      role="status"
      aria-label="Loading estimate tree"
      aria-busy="true"
      className="hidden w-[376px] shrink-0 p-2 lg:block"
      data-skeleton="estimate-tree-dynamic"
    >
      <span className="sr-only">Loading estimate tree</span>
    </aside>
  );
}

function EstimateContentDynamicFallback() {
  return (
    <div
      role="status"
      aria-label="Loading estimate sheet"
      aria-busy="true"
      className="flex min-h-0 min-w-0 flex-1 flex-col p-2"
      data-skeleton="estimate-content-dynamic"
    >
      <span className="sr-only">Loading estimate sheet</span>
    </div>
  );
}

// Tree is client-only (window/DnD); content keeps SSR for first paint of sheet chrome.
const EstimateSheetTree = dynamic(
  () => import("./EstimateSheetTree").then((module) => module.EstimateSheetTree),
  { ssr: false, loading: () => <EstimateTreeDynamicFallback /> },
);
const EstimateSheetContent = dynamic(
  () => import("./EstimateSheetContent").then((module) => module.EstimateSheetContent),
  { loading: () => <EstimateContentDynamicFallback /> },
);

type EstimateWorkspaceClientProps = {
  projectId: string;
  workspaceId?: string;
  estimateId: string;
  projectName: string;
  estimateName?: string;
  estimateSheetCode?: string;
  projectBudget?: number | null;
  selectedNodeId: string | null;
  nodes: EstimateTreeNode[];
  estimateTabs?: EstimateTabSummary[];
  activeTabId?: string | null;
  loadLimitState?: EstimateTreeLoadLimitState;
  sheetAdjustment?: EstimateSheetAdjustment;
  /** Server-resolved edit capability (UX gating only; default false fails closed). */
  canEditEstimate?: boolean;
  /** Server-resolved shared library management capability. */
  canManageLibrary?: boolean;
  collaborationUserId?: string | null;
  collaborationDisplayName?: string | null;
  proposalExportMetadata?: ProposalExportMetadata;
  libraryItems?: EstimateRowItem[];
  libraryTemplates?: EstimateTemplate[];
  libraryCategoryTree?: ComponentLibraryTaxonomyNode[];
  librarySuppliers?: ComponentLibrarySupplierOption[];
  libraryBrands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  /** Disable localStorage-backed sidebar state when the workspace is rendered as a public/static mockup. */
  libraryUseStoredPreferences?: boolean;
  /** Disable reusable project-source loading when the workspace is rendered outside the private app surface. */
  libraryEnableReusableProjectSources?: boolean;
  /**
   * Surface design language. "glass" is the live liquid-glass workspace (the
   * main estimate route passes it explicitly). "paper" is the legacy
   * solid-white look, kept as the prop default for any caller that omits it.
   */
  surfaceVariant?: EstimateSurfaceVariant;
  /** Disable shallow URL writes when the workspace is embedded as a non-route mockup. */
  disableRouteSync?: boolean;
  /** Keep an embedded product preview entirely on provided data with no route metadata or capability reads. */
  presentationMode?: boolean;
};

export function EstimateWorkspaceClient({
  projectId,
  workspaceId,
  estimateId,
  projectName,
  estimateName,
  estimateSheetCode,
  projectBudget,
  selectedNodeId,
  nodes,
  estimateTabs = EMPTY_ESTIMATE_TABS,
  activeTabId = null,
  loadLimitState,
  sheetAdjustment,
  canEditEstimate = false,
  canManageLibrary = false,
  collaborationUserId,
  collaborationDisplayName,
  proposalExportMetadata,
  libraryItems,
  libraryTemplates,
  libraryCategoryTree,
  librarySuppliers,
  libraryBrands,
  libraryFolders,
  libraryUseStoredPreferences,
  libraryEnableReusableProjectSources,
  surfaceVariant = "paper",
  disableRouteSync = false,
  presentationMode = false,
}: EstimateWorkspaceClientProps) {
  const queryClient = useQueryClient();
  const dataProjectId = presentationMode ? "" : projectId;
  const tabQueriesEnabled = Boolean(activeTabId);
  const tabsQuery = useEstimateTabsQuery({
    projectId: dataProjectId,
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
  const editCapabilityQuery = useEstimateEditCapabilityQuery({
    projectId: dataProjectId,
    estimateId,
    initialCanEdit: canEditEstimate,
    enabled: !presentationMode,
  });
  const resolvedCanEditEstimate = presentationMode
    ? canEditEstimate === true
    : canEditEstimate === true || editCapabilityQuery.canEditEstimate;
  const defaultTabId = activeTabId ?? queryTabs.find((tab) => tab.isDefault)?.id ?? queryTabs[0]?.id;
  const { activeTabId: storedActiveTabId, setActiveTabId } = useEstimateActiveTab(estimateId, defaultTabId);
  const resolvedActiveTabId = tabQueriesEnabled && storedActiveTabId && queryTabs.some((tab) => tab.id === storedActiveTabId)
    ? storedActiveTabId
    : defaultTabId;
  const displayActiveTabId = resolvedActiveTabId ?? fallbackTabs[0]?.id ?? "legacy-main";
  const routeSelectedNodeId = resolvedActiveTabId === activeTabId ? selectedNodeId : null;
  const resolvedLibraryUseStoredPreferences = presentationMode ? false : (libraryUseStoredPreferences ?? !disableRouteSync);
  const resolvedLibraryEnableReusableProjectSources = presentationMode ? false : (libraryEnableReusableProjectSources ?? !disableRouteSync);
  return (
    <>
      {!presentationMode ? <ProjectEstimateMetadataPublisher
        metadata={{
          projectId,
          estimateId,
          projectName,
          estimateName: estimateName ?? projectName,
          estimateSheetCode: estimateSheetCode ?? "",
          projectBudget: projectBudget ?? null,
          canEditEstimate: resolvedCanEditEstimate,
        }}
      /> : null}
      <EstimateSurfaceVariantProvider variant={surfaceVariant}>
      <div
      role="note"
      aria-label="Desktop workspace notice"
      className="shrink-0 border-b border-hairline bg-surface px-3 py-2 text-[10px] leading-4 text-secondary lg:hidden"
    >
      <span className="block font-medium text-ink">Estimate editing works best on a desktop-width screen.</span>
      <span className="block text-tertiary">Side panels open as compact drawers on this width; use a wider display for full three-panel editing.</span>
    </div>
    <section
      className={cn(
        "flex h-full min-h-0 overflow-hidden",
        // glass: a single uniform 8px rhythm — the section pads itself 8px and
        // gaps its three floating panes 8px, so the gutter equals the inner
        // padding and there is no doubled spacing between panes. paper: panes
        // abut edge-to-edge as before (live page unchanged).
        surfaceVariant === "glass" && "gap-2 p-2",
        estimateSurfaceClass(surfaceVariant, "root"),
      )}
      aria-label={`${projectName} estimates`}
    >
      <EstimateSheetTree
        projectId={dataProjectId}
        estimateId={estimateId}
        activeTabId={resolvedActiveTabId}
        initialTabId={activeTabId ?? undefined}
        projectName={projectName}
        selectedNodeId={routeSelectedNodeId}
        nodes={nodes}
        loadLimitState={loadLimitState}
        canEditEstimate={resolvedCanEditEstimate}
        disableRouteSync={disableRouteSync}
      />
      <EstimateSheetContent
        selectedNodeId={routeSelectedNodeId}
        nodes={nodes}
        projectId={dataProjectId}
        workspaceId={workspaceId}
        estimateId={estimateId}
        estimateTabs={fallbackTabs}
        activeTabId={displayActiveTabId}
        dataTabId={resolvedActiveTabId}
        loadLimitState={loadLimitState}
        sheetAdjustment={sheetAdjustment}
        canEditEstimate={resolvedCanEditEstimate}
        canManageLibrary={presentationMode ? false : canManageLibrary}
        initialTabId={activeTabId ?? undefined}
        disableRouteSync={disableRouteSync}
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
        libraryUseStoredPreferences={resolvedLibraryUseStoredPreferences}
        libraryEnableReusableProjectSources={resolvedLibraryEnableReusableProjectSources}
      />
    </section>
      </EstimateSurfaceVariantProvider>
    </>
  );
}
