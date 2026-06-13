import { NextResponse, type NextRequest } from "next/server";

import { buildProposalExportModel, defaultProposalExportSettings } from "@/lib/proposal-export/build-proposal-export-model";
import { createProposalWorkbookBuffer } from "@/lib/proposal-export/create-proposal-workbook";
import { buildUniqueWorksheetNames } from "@/lib/proposal-export/worksheet-name";
import { getCurrentUserContext } from "@/lib/auth/session";
import { checkProposalExportRateLimit } from "@/lib/publication/public-repository";
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

type ProposalExportProject = Pick<Tables<"projects">, "id" | "name" | "project_code" | "location" | "currency_code" | "client_name" | "metadata">;
type ProposalExportEstimate = Pick<Tables<"estimates">, "id" | "name" | "sheet_code" | "currency_code" | "metadata">;
type ProposalExportWorkspace = { name?: string | null } | null | undefined;
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

type ProposalExportLogContext = { startedAt: number; estimateId: string };

// F-13 (P1-T4): structured, single-line observability for the heaviest export endpoint.
// Mirrors the share-route logging shape ({ level, route, ... , ts }).
function logProposalExport(entry: {
  estimateId: string;
  tabCount: number;
  rowCount: number;
  durationMs: number;
  outcome: "success" | "error";
  message?: string;
}) {
  const payload = { level: entry.outcome === "error" ? "error" : "info", route: "proposal_export", ts: new Date().toISOString(), ...entry };
  if (entry.outcome === "error") console.error(payload);
  else console.info(payload);
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

function buildMetadata(project: ProposalExportProject, estimate: ProposalExportEstimate, workspace: ProposalExportWorkspace): ProposalExportMetadata {
  // P2-T4: contractor identity is D4-gated; until a contractor profile lands, fall back to
  // the workspace name (DB-free) — never the removed beta placeholder.
  const contractorName = typeof workspace?.name === "string" && workspace.name.trim() ? workspace.name.trim() : null;
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
    clientName: project.client_name, // DB-free: projects.client_name
    contractorName,
    subject: `BID FORM — ${estimate.name}`,
  };
}

async function buildSingleTabResponse(projectId: string, estimateId: string, tabId: string | null, logContext: ProposalExportLogContext) {
  if (tabId) {
    const result = await getEstimateTabTree(projectId, estimateId, tabId, {
      maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
      maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
    });
    if (!result.project || !result.estimate || !result.tab) {
      return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
    }

    if (didExceedExportLimit(result.loadLimitState, result.tree)) return createLimitResponse();

    const model = buildProposalExportModel({
      metadata: buildMetadata(result.project, result.estimate, result.workspace),
      nodes: result.tree,
    });
    const buffer = await createProposalWorkbookBuffer(model);
    const filename = buildProposalWorkbookFilename(
      result.project.project_code || result.project.name,
      result.estimate.sheet_code || result.estimate.name,
      result.tab.name,
    );
    logProposalExport({
      estimateId: logContext.estimateId,
      tabCount: 1,
      rowCount: countTree(result.tree).rowItemCount,
      durationMs: Date.now() - logContext.startedAt,
      outcome: "success",
    });
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
    metadata: buildMetadata(result.project, result.estimate, result.workspace),
    nodes: result.tree,
  });
  const buffer = await createProposalWorkbookBuffer(model);
  const filename = buildProposalWorkbookFilename(
    result.project.project_code || result.project.name,
    result.estimate.sheet_code || result.estimate.name,
  );

  logProposalExport({
    estimateId: logContext.estimateId,
    tabCount: 1,
    rowCount: countTree(result.tree).rowItemCount,
    durationMs: Date.now() - logContext.startedAt,
    outcome: "success",
  });
  return createXlsxResponse(buffer, filename);
}

async function buildAllTabsResponse(projectId: string, estimateId: string, tabs: EstimateTabSummary[], logContext: ProposalExportLogContext) {
  // F-25/F-14 (P1-T4): allSettled so one archived/failing tab can be skipped rather than
  // failing the whole export. A tab can be deleted between getEstimateTabs() and this fetch
  // (TOCTOU); a rejected fetch is logged and skipped. Only an all-tabs-gone result is a 404.
  const settled = await Promise.allSettled(tabs.map((tab) =>
    getEstimateTabTree(projectId, estimateId, tab.id, {
      maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
      maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
    }),
  ));

  const resolvedTabs: Array<{ tab: EstimateTabSummary; result: Awaited<ReturnType<typeof getEstimateTabTree>> }> = [];
  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    const outcome = settled[index];
    if (!tab || !outcome) continue;
    if (outcome.status !== "fulfilled") {
      logProposalExport({
        estimateId: logContext.estimateId,
        tabCount: tabs.length,
        rowCount: 0,
        durationMs: Date.now() - logContext.startedAt,
        outcome: "error",
        message: `Skipped tab ${tab.id}: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`,
      });
      continue;
    }
    if (!outcome.value.tab) continue; // archived between list and fetch — skip gracefully
    resolvedTabs.push({ tab, result: outcome.value });
  }

  const firstResult = resolvedTabs[0]?.result;
  if (!firstResult?.project || !firstResult.estimate) {
    return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  }

  let totalNodeCount = 0;
  let totalRowItemCount = 0;
  for (const { result } of resolvedTabs) {
    if (didExceedExportLimit(result.loadLimitState, result.tree)) return createLimitResponse();
    const treeCounts = countTree(result.tree);
    totalNodeCount += result.loadLimitState?.fetchedNodeCount ?? treeCounts.nodeCount;
    totalRowItemCount += result.loadLimitState?.fetchedRowItemCount ?? treeCounts.rowItemCount;
  }
  if (totalNodeCount > PROPOSAL_EXPORT_NODE_LIMIT || totalRowItemCount > PROPOSAL_EXPORT_ROW_ITEM_LIMIT) {
    return createLimitResponse();
  }

  const metadata = buildMetadata(firstResult.project, firstResult.estimate, firstResult.workspace);
  const generatedAt = new Date().toISOString();
  const worksheetNames = buildUniqueWorksheetNames(resolvedTabs.map(({ tab }) => ({ id: tab.id, name: tab.name })));
  const tabWorkbookModel: ProposalTabbedWorkbookModel = {
    metadata,
    settings: defaultProposalExportSettings,
    generatedAt,
    tabs: resolvedTabs.map(({ tab, result }, index) => {
      const worksheetName = worksheetNames[index];
      if (!worksheetName) throw new Error("Estimate tab export mapping failed.");
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
  logProposalExport({
    estimateId: logContext.estimateId,
    tabCount: resolvedTabs.length,
    rowCount: totalRowItemCount,
    durationMs: Date.now() - logContext.startedAt,
    outcome: "success",
  });
  return createXlsxResponse(buffer, filename);
}

export async function GET(request: NextRequest, context: ProposalExportRouteContext) {
  // F-15 (P1-T5): fail closed in-handler. getCurrentUserContext() is nullable; a null
  // result must be a clean 401 JSON for the fetch-then-blob client (P1-T1), never a 307
  // redirect (which requireCurrentUserContext() would emit and the blob client can't render).
  const userContext = await getCurrentUserContext();
  if (!userContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // P1-T10: per-user (+ client IP) rate limit on the heaviest endpoint in this surface.
  const rateLimit = await checkProposalExportRateLimit({ userId: userContext.userId, request });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.message, retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const startedAt = Date.now();
  const { projectId, estimateId } = await context.params;
  const tabId = new URL(request.url).searchParams.get("tab");
  const logContext: ProposalExportLogContext = { startedAt, estimateId };

  // F-13 (P1-T4): one try/catch around the whole build so a DB/ExcelJS/throw becomes a
  // logged JSON 500 (consumed by the fetch-then-blob client), never an unhandled stack page.
  // `return await` is required so a rejected build promise is caught here, not escaped.
  try {
    if (tabId) return await buildSingleTabResponse(projectId, estimateId, tabId, logContext);

    const tabs = await getEstimateTabs(projectId, estimateId);
    if (tabs.length <= 1) return await buildSingleTabResponse(projectId, estimateId, null, logContext);
    return await buildAllTabsResponse(projectId, estimateId, tabs, logContext);
  } catch (error) {
    logProposalExport({
      estimateId,
      tabCount: 0,
      rowCount: 0,
      durationMs: Date.now() - startedAt,
      outcome: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate the spreadsheet export. Please try again." },
      { status: 500 },
    );
  }
}
