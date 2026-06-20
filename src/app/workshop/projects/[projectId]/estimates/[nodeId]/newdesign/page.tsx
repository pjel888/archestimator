import { notFound } from "next/navigation";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { ProjectEstimateMetadataPublisher } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getEstimateTabs, resolveEstimateEditCapability, resolveEstimateTabRouteContext } from "@/lib/repositories/workspace-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import type { Json } from "@/lib/supabase/types";

// ─────────────────────────────────────────────────────────────────────────────
// /newdesign — liquid-glass preview of the estimate-sheet hero page.
//
// This route is a byte-for-byte clone of the production estimate page's data
// loading; the ONLY difference is `surfaceVariant="glass"` on the workspace
// client. It exists so the new design can be reviewed side-by-side with the
// live page (drop the `/newdesign` suffix to compare) before the variant is
// promoted to the default. Delete this folder once the glass design ships.
// ─────────────────────────────────────────────────────────────────────────────

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function ProjectEstimateNodeNewDesignPage({ params, searchParams }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  assertRouteErrorSmoke({ routeLabel: "Estimate workspace", searchParams: await searchParams });

  const [estimateTreeResult, currentUser] = await withPerfTraceRequest("workshop.estimate-sheet", () =>
    Promise.all([
      traced("estimate-sheet.route-context", () => resolveEstimateTabRouteContext(projectId, nodeId)),
      traced("estimate-sheet.current-user", () => requireCurrentUserContext()),
    ]),
  );
  const { project, estimate, selectedNodeId, tree, tab, tabs } = estimateTreeResult;

  if (!project || !estimate) notFound();

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
  const [estimateTabs, canEditEstimate] = await withPerfTraceRequest("workshop.estimate-sheet-tail", () =>
    Promise.all([
      traced("estimate-sheet.tabs", async () => tabs ?? (tab ? await getEstimateTabs(project.id, estimate.id) : [])),
      traced("estimate-sheet.edit-capability", async () => tab ? await resolveEstimateEditCapability(estimate.id) : false),
    ]),
  );
  const estimateMetadata = {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    projectBudget: estimate.project_budget,
    canEditEstimate,
  };

  return (
    <>
      <ProjectEstimateMetadataPublisher metadata={estimateMetadata} />
      <EstimateWorkspaceClient
        projectId={project.id}
        estimateId={estimate.id}
        projectName={project.name}
        selectedNodeId={selectedNodeId}
        nodes={tree}
        estimateTabs={estimateTabs as EstimateTabSummary[]}
        activeTabId={tab?.id ?? null}
        canEditEstimate={canEditEstimate}
        collaborationUserId={currentUser.userId}
        collaborationDisplayName={currentUser.displayName}
        proposalExportMetadata={proposalExportMetadata}
        surfaceVariant="glass"
      />
    </>
  );
}
