"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/ui/cn";
import { onboardingTarget } from "@/lib/onboarding/target-catalog";
import {
  observeEstimateClientInteractive,
  traceEstimateClientChunk,
  traceEstimateClientHydration,
  traceEstimateClientRsc,
} from "@/lib/perf/estimate-loading-client";
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
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";
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
  () =>
    traceEstimateClientChunk("estimate.client.tree-chunk", () =>
      import("./EstimateSheetTree").then((module) => module.EstimateSheetTree),
    ),
  { ssr: false, loading: () => <EstimateTreeDynamicFallback /> },
);
const EstimateSheetContent = dynamic(
  () =>
    traceEstimateClientChunk("estimate.client.content-chunk", () =>
      import("./EstimateSheetContent").then((module) => module.EstimateSheetContent),
    ),
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
  onboardingSnapshot?: OnboardingEligibilitySnapshot | null;
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
  /** Keep both desktop rails mounted inside a fixed-width embedded preview. */
  forceDesktopRails?: boolean;
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
  onboardingSnapshot = null,
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
  forceDesktopRails = false,
}: EstimateWorkspaceClientProps) {
  if (!presentationMode) traceEstimateClientRsc();

  useEffect(() => {
    if (presentationMode) return;
    traceEstimateClientHydration();
    return observeEstimateClientInteractive();
  }, [presentationMode]);

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
      data-estimate-workspace
      {...onboardingTarget("estimate.header")}
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
        forceDesktopPanel={forceDesktopRails}
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
        onboardingSnapshot={presentationMode ? null : onboardingSnapshot}
        initialTabId={activeTabId ?? undefined}
        disableRouteSync={disableRouteSync}
        presentationMode={presentationMode}
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
        libraryForceDesktopPanel={forceDesktopRails}
      />
    </section>
      </EstimateSurfaceVariantProvider>
    </>
  );
}
