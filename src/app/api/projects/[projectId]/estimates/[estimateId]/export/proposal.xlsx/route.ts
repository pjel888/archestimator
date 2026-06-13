import { NextResponse, type NextRequest } from "next/server";

import { buildProposalExportModel, defaultProposalExportSettings } from "@/lib/proposal-export/build-proposal-export-model";
import { createProposalWorkbookBuffer } from "@/lib/proposal-export/create-proposal-workbook";
import { buildUniqueWorksheetNames } from "@/lib/proposal-export/worksheet-name";
import { getEstimateTabs, getEstimateTabTree, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import type { EstimateTabSummary, EstimateTreeNode } from "@/lib/estimates/types";
import type { Json, Tables } from "@/lib/supabase/types";
import type { ProposalExportMetadata, ProposalTabbedWorkbookModel } from "@/lib/proposal-export/types";
import { buildProposalWorkbookFilename } from "./filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROPOSAL_EXPORT_NODE_LIMIT = 1200;
const PROPOSAL_EXPORT_ROW_ITEM_LIMIT = 3000;

type ProposalExportRouteContext = {
  params: Promise<{ projectId: string; estimateId: string }>;
};

type ProposalExportProject = Pick<Tables<"projects">, "id" | "name" | "project_code" | "location" | "currency_code">;
type ProposalExportEstimate = Pick<Tables<"estimates">, "id" | "name" | "sheet_code" | "currency_code" | "metadata">;
type ProposalExportLoadLimitState = {
  fetchedNodeCount: number;
  fetchedRowItemCount: number;
  didExceedNodeLimit: boolean;
  didExceedRowItemLimit: boolean;
};

function readVersionLabel(metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "V1";
  const record = metadata as Record<string, Json>;
  const value = record.versionNumber ?? record.version_number ?? record.version ?? record.revisionNumber ?? record.revision_number;

  if (typeof value === "number" && Number.isFinite(value)) return `V${value}`;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim();
    return normalized.toLocaleLowerCase("en-PH").startsWith("v") ? normalized : `V${normalized}`;
  }
  return "V1";
}

function createXlsxResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}

function createLimitResponse() {
  return NextResponse.json(
    {
      error: "Estimate is too large to export as XLSX right now.",
      limits: {
        maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
        maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
      },
    },
    { status: 413 },
  );
}

function countTree(nodes: EstimateTreeNode[]) {
  let nodeCount = 0;
  let rowItemCount = 0;

  function visit(node: EstimateTreeNode) {
    nodeCount += 1;
    rowItemCount += node.estimateRowItems?.length ?? 0;
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return { nodeCount, rowItemCount };
}

function didExceedExportLimit(loadLimitState: ProposalExportLoadLimitState | undefined, tree: EstimateTreeNode[]) {
  if (loadLimitState?.didExceedNodeLimit || loadLimitState?.didExceedRowItemLimit) return true;
  const treeCounts = countTree(tree);
  const fetchedNodeCount = loadLimitState?.fetchedNodeCount ?? treeCounts.nodeCount;
  const fetchedRowItemCount = loadLimitState?.fetchedRowItemCount ?? treeCounts.rowItemCount;
  return fetchedNodeCount > PROPOSAL_EXPORT_NODE_LIMIT || fetchedRowItemCount > PROPOSAL_EXPORT_ROW_ITEM_LIMIT;
}

function buildMetadata(project: ProposalExportProject, estimate: ProposalExportEstimate): ProposalExportMetadata {
  return {
    projectId: project.id,
    estimateId: estimate.id,
    projectName: project.name,
    projectCode: project.project_code,
    projectAddress: project.location,
    estimateName: estimate.name,
    estimateSheetCode: estimate.sheet_code,
    versionLabel: readVersionLabel(estimate.metadata),
    currency: estimate.currency_code || project.currency_code || "PHP",
  };
}

async function buildSingleTabResponse(projectId: string, estimateId: string, tabId: string | null) {
  if (tabId) {
    const result = await getEstimateTabTree(projectId, estimateId, tabId, {
      maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
      maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
      // U1-5: an explicit synthetic "legacy-main" tab id (schema-missing) must
      // degrade to the legacy whole-estimate loader, not 500 on a literal lookup.
      allowLegacyFallback: true,
    });
    if (!result.project || !result.estimate || !result.tab) {
      return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
    }

    if (didExceedExportLimit(result.loadLimitState, result.tree)) return createLimitResponse();

    const model = buildProposalExportModel({
      metadata: buildMetadata(result.project, result.estimate),
      nodes: result.tree,
    });
    const buffer = await createProposalWorkbookBuffer(model);
    const filename = buildProposalWorkbookFilename(
      result.project.project_code || result.project.name,
      result.estimate.sheet_code || result.estimate.name,
      result.tab.name,
    );
    return createXlsxResponse(buffer, filename);
  }

  const result = await getProjectEstimateTreeByEstimate(projectId, estimateId, {
    maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
    maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
  });

  if (!result.project || !result.estimate) {
    return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  }

  if (didExceedExportLimit(result.loadLimitState, result.tree)) return createLimitResponse();

  const model = buildProposalExportModel({
    metadata: buildMetadata(result.project, result.estimate),
    nodes: result.tree,
  });
  const buffer = await createProposalWorkbookBuffer(model);
  const filename = buildProposalWorkbookFilename(
    result.project.project_code || result.project.name,
    result.estimate.sheet_code || result.estimate.name,
  );

  return createXlsxResponse(buffer, filename);
}

async function buildAllTabsResponse(projectId: string, estimateId: string, tabs: EstimateTabSummary[]) {
  const tabResults = await Promise.all(tabs.map((tab) =>
    getEstimateTabTree(projectId, estimateId, tab.id, {
      maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
      maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
    }),
  ));
  const firstResult = tabResults[0];
  if (!firstResult?.project || !firstResult.estimate || tabResults.some((result) => !result.tab)) {
    return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  }

  let totalNodeCount = 0;
  let totalRowItemCount = 0;
  for (const result of tabResults) {
    if (didExceedExportLimit(result.loadLimitState, result.tree)) return createLimitResponse();
    const treeCounts = countTree(result.tree);
    totalNodeCount += result.loadLimitState?.fetchedNodeCount ?? treeCounts.nodeCount;
    totalRowItemCount += result.loadLimitState?.fetchedRowItemCount ?? treeCounts.rowItemCount;
  }
  if (totalNodeCount > PROPOSAL_EXPORT_NODE_LIMIT || totalRowItemCount > PROPOSAL_EXPORT_ROW_ITEM_LIMIT) {
    return createLimitResponse();
  }

  const metadata = buildMetadata(firstResult.project, firstResult.estimate);
  const generatedAt = new Date().toISOString();
  const worksheetNames = buildUniqueWorksheetNames(tabs.map((tab) => ({ id: tab.id, name: tab.name })));
  const tabWorkbookModel: ProposalTabbedWorkbookModel = {
    metadata,
    settings: defaultProposalExportSettings,
    generatedAt,
    tabs: tabResults.map((result, index) => {
      const tab = tabs[index];
      const worksheetName = worksheetNames[index];
      if (!tab || !worksheetName) throw new Error("Estimate tab export mapping failed.");
      return {
        tabId: tab.id,
        tabName: tab.name,
        worksheetName: worksheetName.worksheetName,
        model: buildProposalExportModel({
          metadata,
          nodes: result.tree,
          generatedAt,
        }),
      };
    }),
  };

  const buffer = await createProposalWorkbookBuffer(tabWorkbookModel);
  const filename = buildProposalWorkbookFilename(firstResult.project.project_code || firstResult.project.name, firstResult.estimate.sheet_code || firstResult.estimate.name);
  return createXlsxResponse(buffer, filename);
}

export async function GET(request: NextRequest, context: ProposalExportRouteContext) {
  const { projectId, estimateId } = await context.params;
  const tabId = new URL(request.url).searchParams.get("tab");

  if (tabId) return buildSingleTabResponse(projectId, estimateId, tabId);

  // Read-only legacy fallback: without estimate_tabs applied this would 500
  // (U1-5). A synthetic single "Main" tab routes to the whole-estimate path,
  // which already degrades safely via getProjectEstimateTreeByEstimate.
  const tabs = await getEstimateTabs(projectId, estimateId, { allowLegacyFallback: true });
  if (tabs.length <= 1) return buildSingleTabResponse(projectId, estimateId, null);
  return buildAllTabsResponse(projectId, estimateId, tabs);
}
