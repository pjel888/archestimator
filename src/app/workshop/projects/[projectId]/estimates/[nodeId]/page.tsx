import { Suspense } from "react";
import { notFound } from "next/navigation";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { EstimateSheetRouteSkeleton } from "@/components/workshop/EstimateSheetRouteSkeleton";
import { loadCurrentOnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-actions";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";
import { getCurrentGuidedPracticeBindingForEstimate } from "@/lib/onboarding/estimate-practice";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { EstimateSheetAdjustment } from "@/lib/estimates/types";
import { ESTIMATE_SHEET_TREE_LOAD_LIMITS } from "@/lib/estimates/load-limits";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { resolveEstimateEditCapability, resolveEstimateTabRouteContext } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import type { Json } from "@/lib/types/json";

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type EstimateRouteContext = Awaited<ReturnType<typeof resolveEstimateTabRouteContext>>;

type EstimateWorkspaceResolvedProps = {
  project: NonNullable<EstimateRouteContext["project"]>;
  estimate: NonNullable<EstimateRouteContext["estimate"]>;
  selectedNodeId: EstimateRouteContext["selectedNodeId"];
  tree: EstimateRouteContext["tree"];
  tab: EstimateRouteContext["tab"];
  tabs: EstimateRouteContext["tabs"];
  prefetchedCanEditEstimate: EstimateRouteContext["canEditEstimate"];
  canManageLibrary: boolean;
  onboardingSnapshot: OnboardingEligibilitySnapshot | null;
  loadLimitState: EstimateRouteContext["loadLimitState"];
  sheetAdjustment?: EstimateSheetAdjustment;
  proposalExportMetadata: {
    projectId: string;
    estimateId: string;
    projectName: string;
    projectCode: string | null;
    projectAddress: string | null;
    estimateName: string;
    estimateSheetCode: string;
    versionLabel: string;
    currency: string;
  };
};

async function resolveLibraryManagementCapability(workspaceId: string) {
  const [currentUser, database] = await Promise.all([
    requireCurrentUserContext(),
    getCloudflareD1Database(),
  ]);
  if (!database) return false;
  return isWorkspaceEditorInD1(database, workspaceId, currentUser);
}

function readEstimateVersionLabel(metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "V1";
  const record = metadata as Record<string, Json>;
  const value = record.versionNumber ?? record.version_number ?? record.version ?? record.revisionNumber ?? record.revision_number;
  if (typeof value === "number" && Number.isFinite(value)) return `V${value}`;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim();
    return normalized.toLowerCase().startsWith("v") ? normalized : `V${normalized}`;
  }
  return "V1";
}

function scopeOnboardingSnapshotToEstimate(
  snapshot: OnboardingEligibilitySnapshot | null,
  input: {
    workspaceId: string;
    projectId: string;
    estimateId: string;
    nodeId: string | null;
    canEditEstimate: boolean;
    tutorialBindingCurrent: boolean;
  },
) {
  if (!snapshot || snapshot.workspaceId !== input.workspaceId) return null;
  const capabilities = new Set(snapshot.capabilities);
  capabilities.add("view_estimate");
  capabilities.add("view_assigned_project");
  if (input.canEditEstimate) capabilities.add("edit_estimate");
  else capabilities.delete("edit_estimate");
  const availableRoutes = new Set(snapshot.availableRoutes);
  availableRoutes.add("assigned_project");
  availableRoutes.add("assigned_estimate");
  availableRoutes.add("estimate_sheet");
  const guidedState = snapshot.flowStates.find(
    (state) => state.flowKey === "guided_estimate_practice",
  );

  return {
    ...snapshot,
    resourceContext: {
      projectId: input.projectId,
      estimateId: input.estimateId,
      nodeId: input.nodeId ?? undefined,
    },
    capabilities: [...capabilities],
    availableRoutes: [...availableRoutes],
    dataPredicates: {
      ...snapshot.dataPredicates,
      estimate_context_available: true,
      tutorial_binding_current: input.tutorialBindingCurrent,
      tutorial_core_incomplete:
        input.tutorialBindingCurrent && guidedState?.status !== "completed",
    },
  } satisfies OnboardingEligibilitySnapshot;
}

export default function ProjectEstimateNodePage({ params, searchParams }: ProjectEstimateNodePageProps) {
  return (
    <Suspense fallback={<EstimateSheetRouteSkeleton />}>
      <EstimateRouteContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EstimateRouteContent({ params, searchParams }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  assertRouteErrorSmoke({ routeLabel: "Estimate workspace", searchParams: await searchParams });

  // The component-library dataset stays lazy-loaded through a server action, so
  // first paint is not gated on library queries.
  const estimateTreeResult = await withPerfTraceRequest("workshop.estimate-sheet", () =>
    traced("estimate-sheet.route-context", () => resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)),
  );
  const { project, estimate, selectedNodeId, tree, tab, tabs, canEditEstimate: prefetchedCanEditEstimate, loadLimitState, sheetAdjustment } = estimateTreeResult;

  if (!project || !estimate) notFound();
  const [resolvedCanEditEstimate, canManageLibrary, onboardingSnapshot] = await Promise.all([
    prefetchedCanEditEstimate === true
      ? Promise.resolve(true)
      : traced("estimate-sheet.edit-capability", () => resolveEstimateEditCapability(estimate.id)),
    traced("estimate-sheet.library-management-capability", () => resolveLibraryManagementCapability(project.workspace_id)),
    traced("estimate-sheet.onboarding-snapshot", async () => {
      try {
        return await loadCurrentOnboardingEligibilitySnapshot();
      } catch {
        return null;
      }
    }),
  ]);
  const onboardingDatabase = onboardingSnapshot
    ? await getCloudflareD1Database()
    : null;
  const tutorialBindingCurrent = Boolean(
    onboardingSnapshot
    && onboardingDatabase
    && await getCurrentGuidedPracticeBindingForEstimate(onboardingDatabase, {
      userId: onboardingSnapshot.userId,
      workspaceId: project.workspace_id,
      projectId: project.id,
      estimateId: estimate.id,
    }),
  );
  const scopedOnboardingSnapshot = scopeOnboardingSnapshotToEstimate(
    onboardingSnapshot,
    {
      workspaceId: project.workspace_id,
      projectId: project.id,
      estimateId: estimate.id,
      nodeId: selectedNodeId,
      canEditEstimate: resolvedCanEditEstimate,
      tutorialBindingCurrent,
    },
  );

  const estimateVersionLabel = readEstimateVersionLabel(estimate.metadata);
  const proposalExportMetadata = {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    projectCode: project.project_code,
    projectAddress: project.location,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    versionLabel: estimateVersionLabel,
    currency: estimate.currency_code || project.currency_code || "PHP",
  };

  return (
    <EstimateWorkspaceResolved
      project={project}
      estimate={estimate}
      selectedNodeId={selectedNodeId}
      tree={tree}
      tab={tab}
      tabs={tabs}
      prefetchedCanEditEstimate={resolvedCanEditEstimate}
      canManageLibrary={canManageLibrary}
      onboardingSnapshot={scopedOnboardingSnapshot}
      loadLimitState={loadLimitState}
      sheetAdjustment={sheetAdjustment}
      proposalExportMetadata={proposalExportMetadata}
    />
  );
}

function EstimateWorkspaceResolved({
  project,
  estimate,
  selectedNodeId,
  tree,
  tab,
  tabs,
  prefetchedCanEditEstimate,
  canManageLibrary,
  onboardingSnapshot,
  loadLimitState,
  sheetAdjustment,
  proposalExportMetadata,
}: EstimateWorkspaceResolvedProps) {
  // The route-context resolver already returns the tab list on the dominant
  // tab-present path. Missing tab/edit affordance data fails closed on first
  // paint and hydrates through client queries so the sheet itself can stream.
  const estimateTabs = tabs ?? [];

  return (
    <EstimateWorkspaceClient
      projectId={project.id}
      workspaceId={project.workspace_id}
      estimateId={estimate.id}
      projectName={project.name}
      estimateName={estimate.name}
      estimateSheetCode={estimate.sheet_code}
      projectBudget={estimate.project_budget}
      selectedNodeId={selectedNodeId}
      nodes={tree}
      estimateTabs={estimateTabs}
      activeTabId={tab?.id ?? null}
      loadLimitState={loadLimitState}
      sheetAdjustment={sheetAdjustment}
      canEditEstimate={prefetchedCanEditEstimate === true}
      canManageLibrary={canManageLibrary}
      onboardingSnapshot={onboardingSnapshot}
      proposalExportMetadata={proposalExportMetadata}
      surfaceVariant="glass"
    />
  );
}
