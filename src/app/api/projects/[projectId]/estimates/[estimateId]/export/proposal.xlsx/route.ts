import { NextResponse, type NextRequest } from "next/server";

import { buildProposalExportModel, defaultProposalExportSettings } from "@/lib/proposal-export/build-proposal-export-model";
import { buildUniqueWorksheetNames } from "@/lib/proposal-export/worksheet-name";
import { getCurrentUserContext } from "@/lib/auth/session";
import { emitLogRecord, logAppError } from "@/lib/observability/logger";
import { checkProposalExportRateLimit } from "@/lib/publication/public-rate-limits";
import { getEstimateTabs, getEstimateTabTree, getEstimateTreesForTabs, getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import type { EstimateSheetAdjustment, EstimateTabSummary, EstimateTreeNode } from "@/lib/estimates/types";
import { isWorkspaceMemberInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { EstimateRow, ProjectRow } from "@/lib/types/database";
import type { Json } from "@/lib/types/json";
import type { ProposalExportAudience, ProposalExportMetadata, ProposalExportSettings, ProposalChargeMode, ProposalTabbedWorkbookModel } from "@/lib/proposal-export/types";
import { buildProposalWorkbookFilename } from "./filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// F-34 (P3-T5): explicit serverless ceiling. The export is CPU/memory-light (per-tab DB
// fan-out is batched and workbook generation is bounded by the node/row caps), so 60s is generous.
export const maxDuration = 60;

const PROPOSAL_EXPORT_NODE_LIMIT = 1200;
const PROPOSAL_EXPORT_ROW_ITEM_LIMIT = 3000;
const PROPOSAL_EXPORT_TAB_LIMIT = 50;

type ProposalExportRouteContext = {
  params: Promise<{ projectId: string; estimateId: string }>;
};

type ProposalExportProject = Pick<ProjectRow, "id" | "name" | "project_code" | "location" | "currency_code" | "client_name" | "metadata">;
type ProposalExportEstimate = Pick<EstimateRow, "id" | "name" | "sheet_code" | "currency_code" | "metadata">;
type ProposalExportWorkspace = { id?: string | null; name?: string | null } | null | undefined;
type ProposalWorkbookInput = ProposalTabbedWorkbookModel | ReturnType<typeof buildProposalExportModel>;

type ParsedExportSettings =
  | { ok: true; settings: Partial<ProposalExportSettings>; requestedInternal: boolean }
  | { ok: false; error: string };

// P2-T2/§C: parse only non-sensitive settings off the wire, fully validated. `audience` is a
// PREFERENCE here (requestedInternal) — it is never authoritative and is gated server-side by
// resolveExportAudience. Rates must be finite within 0–100 (no silent clamp → 400); modes and
// booleans accept only an explicit allow-list.
function parseExportSettings(searchParams: URLSearchParams): ParsedExportSettings {
  const settings: Partial<ProposalExportSettings> = {};

  for (const key of ["contingencyRate", "vatRate"] as const) {
    const raw = searchParams.get(key);
    if (raw === null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false, error: `${key} must be a finite number between 0 and 100.` };
    }
    settings[key] = value;
  }

  for (const key of ["contingencyMode", "vatMode"] as const) {
    const raw = searchParams.get(key);
    if (raw === null) continue;
    if (raw !== "percentage" && raw !== "included") {
      return { ok: false, error: `${key} must be 'percentage' or 'included'.` };
    }
    settings[key] = raw as ProposalChargeMode;
  }

  for (const key of ["includeFormulas", "includeZeroRows", "includeExcludedRows", "includeSourceBreakdownSheet"] as const) {
    const raw = searchParams.get(key);
    if (raw === null) continue;
    if (raw !== "true" && raw !== "false") {
      return { ok: false, error: `${key} must be 'true' or 'false'.` };
    }
    settings[key] = raw === "true";
  }

  const consolidationMode = searchParams.get("consolidationMode");
  if (consolidationMode !== null) {
    if (consolidationMode !== "industry-standard" && consolidationMode !== "area-breakdown") {
      return { ok: false, error: "consolidationMode must be 'industry-standard' or 'area-breakdown'." };
    }
    settings.consolidationMode = consolidationMode;
  }

  return { ok: true, settings, requestedInternal: searchParams.get("audience") === "internal" };
}

// §C.1: audience is SERVER-derived. An internal export (Source Breakdown + supplier/pricing)
// is granted only to a workspace member (owner/admin/member) of the project's workspace — a
// viewer or external collaborator's `audience=internal` cannot escalate and falls to client.
async function resolveExportAudience(workspaceId: string | null | undefined, userId: string, requestedInternal: boolean): Promise<ProposalExportAudience> {
  if (!requestedInternal || !workspaceId) return "client";
  try {
    const db = await getCloudflareD1Database();
    if (!db) return "client";
    return (await isWorkspaceMemberInD1(db, workspaceId, { userId })) ? "internal" : "client";
  } catch {
    return "client";
  }
}
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

// P2-T6/D3: read GFA from estimate metadata (per-estimate), falling back to project metadata.
// Read-side ships now against the existing JSONB columns (no DB channel needed).
function readNumberFromMetadata(metadata: Json, key: string): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>)[key];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function readGrossFloorArea(estimateMetadata: Json, projectMetadata: Json): number | null {
  return readNumberFromMetadata(estimateMetadata, "grossFloorArea") ?? readNumberFromMetadata(projectMetadata, "grossFloorArea");
}

function createXlsxResponse(buffer: Uint8Array, filename: string) {
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
      // F-33 (P2-T8): stop content-type sniffing on the binary download.
      "X-Content-Type-Options": "nosniff",
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
        maxTabCount: PROPOSAL_EXPORT_TAB_LIMIT,
      },
    },
    { status: 413 },
  );
}

type ProposalExportLogContext = { startedAt: number; estimateId: string };
type ProposalExportContext = ProposalExportLogContext & {
  userId: string;
  requestedSettings: Partial<ProposalExportSettings>;
  requestedInternal: boolean;
};

async function createProposalWorkbookBuffer(input: ProposalWorkbookInput) {
  const workbookModule = await import("@/lib/proposal-export/create-proposal-workbook");
  return workbookModule.createProposalWorkbookBuffer(input);
}

// Merge the validated request settings with the server-resolved (gated) audience. The audience
// is decided here, never taken from the caller's settings.
async function resolveExportSettings(workspace: ProposalExportWorkspace, exportContext: ProposalExportContext): Promise<Partial<ProposalExportSettings>> {
  const audience = await resolveExportAudience(workspace?.id, exportContext.userId, exportContext.requestedInternal);
  return { ...exportContext.requestedSettings, audience };
}

function withSheetAdjustmentSettings(
  settings: Partial<ProposalExportSettings>,
  sheetAdjustment: EstimateSheetAdjustment | null | undefined,
): Partial<ProposalExportSettings> {
  if (!sheetAdjustment || sheetAdjustment.percentage === 0) return settings;
  return {
    ...settings,
    sheetAdjustmentMode: sheetAdjustment.mode,
    sheetAdjustmentRate: sheetAdjustment.percentage,
  };
}

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
  const level = entry.outcome === "error" ? "error" : "info";
  emitLogRecord({
    level,
    event: "proposal_export_route_event",
    message: entry.message ?? (entry.outcome === "error" ? "Proposal export failed." : "Proposal export completed."),
    action: "export_proposal_workbook",
    context: {
      route: "/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx",
      estimate_id: entry.estimateId,
      tab_count: entry.tabCount,
      row_count: entry.rowCount,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
    },
  });
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
    grossFloorArea: readGrossFloorArea(estimate.metadata, project.metadata),
  };
}

async function buildSingleTabResponse(projectId: string, estimateId: string, tabId: string | null, exportContext: ProposalExportContext) {
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
      metadata: buildMetadata(result.project, result.estimate, result.workspace),
      nodes: result.tree,
      settings: withSheetAdjustmentSettings(await resolveExportSettings(result.workspace, exportContext), result.sheetAdjustment),
    });
    const buffer = await createProposalWorkbookBuffer(model);
    const filename = buildProposalWorkbookFilename(
      result.project.project_code || result.project.name,
      result.estimate.sheet_code || result.estimate.name,
      result.tab.name,
    );
    logProposalExport({
      estimateId: exportContext.estimateId,
      tabCount: 1,
      rowCount: countTree(result.tree).rowItemCount,
      durationMs: Date.now() - exportContext.startedAt,
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
    settings: withSheetAdjustmentSettings(await resolveExportSettings(result.workspace, exportContext), result.sheetAdjustment),
  });
  const buffer = await createProposalWorkbookBuffer(model);
  const filename = buildProposalWorkbookFilename(
    result.project.project_code || result.project.name,
    result.estimate.sheet_code || result.estimate.name,
  );

  logProposalExport({
    estimateId: exportContext.estimateId,
    tabCount: 1,
    rowCount: countTree(result.tree).rowItemCount,
    durationMs: Date.now() - exportContext.startedAt,
    outcome: "success",
  });
  return createXlsxResponse(buffer, filename);
}

async function buildAllTabsResponse(projectId: string, estimateId: string, tabs: EstimateTabSummary[], exportContext: ProposalExportContext) {
  // F-14/F-24 (P2-T7): one batched fetch (estimate + nodes + rows) instead of a per-tab
  // getEstimateTabTree fan-out. The over-fetch guard caps the TOTAL node/row count, so the
  // 413 fires early rather than after reading up to the full cap per tab.
  const result = await getEstimateTreesForTabs(projectId, estimateId, tabs, {
    maxNodeCount: PROPOSAL_EXPORT_NODE_LIMIT,
    maxRowItemCount: PROPOSAL_EXPORT_ROW_ITEM_LIMIT,
  });

  if (!result.project || !result.estimate || result.tabs.length === 0) {
    return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  }

  const allTrees = result.tabs.flatMap((entry) => entry.tree);
  if (didExceedExportLimit(result.loadLimitState, allTrees)) return createLimitResponse();
  const totalRowItemCount = result.loadLimitState?.fetchedRowItemCount ?? countTree(allTrees).rowItemCount;

  const metadata = buildMetadata(result.project, result.estimate, result.workspace);
  const generatedAt = new Date().toISOString();
  // Resolve the (gated) audience once from the shared workspace; all tabs use the same settings.
  const resolvedSettings = await resolveExportSettings(result.workspace, exportContext);
  const adjustedResolvedSettings = withSheetAdjustmentSettings(resolvedSettings, result.sheetAdjustment);
  const settings = { ...defaultProposalExportSettings, ...adjustedResolvedSettings };
  const worksheetNames = buildUniqueWorksheetNames(result.tabs.map(({ tab }) => ({ id: tab.id, name: tab.name })));
  const tabWorkbookModel: ProposalTabbedWorkbookModel = {
    metadata,
    settings,
    generatedAt,
    tabs: result.tabs.map(({ tab, tree }, index) => {
      const worksheetName = worksheetNames[index];
      if (!worksheetName) throw new Error("Estimate tab export mapping failed.");
      return {
        tabId: tab.id,
        tabName: tab.name,
        worksheetName: worksheetName.worksheetName,
        model: buildProposalExportModel({
          metadata,
          nodes: tree,
          generatedAt,
          settings: adjustedResolvedSettings,
        }),
      };
    }),
  };

  const buffer = await createProposalWorkbookBuffer(tabWorkbookModel);
  const filename = buildProposalWorkbookFilename(result.project.project_code || result.project.name, result.estimate.sheet_code || result.estimate.name);
  logProposalExport({
    estimateId: exportContext.estimateId,
    tabCount: result.tabs.length,
    rowCount: totalRowItemCount,
    durationMs: Date.now() - exportContext.startedAt,
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
  const url = new URL(request.url);
  const tabId = url.searchParams.get("tab");

  // P2-T2/§C.2-C.3: validate export settings off the wire → 400 on malformed input (no silent
  // clamp). The audience is NOT taken from here; it is server-resolved in build*Response.
  const parsedSettings = parseExportSettings(url.searchParams);
  if (!parsedSettings.ok) {
    return NextResponse.json({ error: parsedSettings.error }, { status: 400 });
  }
  const exportContext: ProposalExportContext = {
    startedAt,
    estimateId,
    userId: userContext.userId,
    requestedSettings: parsedSettings.settings,
    requestedInternal: parsedSettings.requestedInternal,
  };

  // F-13 (P1-T4): one try/catch around the whole build so a DB/workbook/throw becomes a
  // logged JSON 500 (consumed by the fetch-then-blob client), never an unhandled stack page.
  // `return await` is required so a rejected build promise is caught here, not escaped.
  try {
    if (tabId) return await buildSingleTabResponse(projectId, estimateId, tabId, exportContext);

    // U1-5 (legacy fallback, from origin/main): without estimate_tabs applied, listing tabs
    // would 500 — the fallback yields a synthetic single "Main" tab so this degrades to the
    // whole-estimate path (which already degrades safely via getProjectEstimateTreeByEstimate).
    const tabs = await getEstimateTabs(projectId, estimateId, {
      allowLegacyFallback: true,
      maxTabCount: PROPOSAL_EXPORT_TAB_LIMIT,
    });
    if (tabs.length > PROPOSAL_EXPORT_TAB_LIMIT) return createLimitResponse();
    // Single-tab estimates must load that exact tab (not a separate default-tab lookup), so
    // a lone non-default tab or the synthetic legacy Main tab still exports its own tree.
    if (tabs.length === 1) return await buildSingleTabResponse(projectId, estimateId, tabs[0]!.id, exportContext);
    if (tabs.length === 0) return await buildSingleTabResponse(projectId, estimateId, null, exportContext);
    return await buildAllTabsResponse(projectId, estimateId, tabs, exportContext);
  } catch (error) {
    // F-33 (P2-T8): a malformed estimate/tab id reaches Postgres as an invalid uuid (SQLSTATE
    // 22P02) — surface that as a clean 400 instead of a 500. No pre-validation, so it doesn't
    // disturb the mocked-id test fixtures; the real DB raises 22P02 in production.
    const errorCode = error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined;
    const isInvalidIdentifier = errorCode === "22P02";
    logProposalExport({
      estimateId,
      tabCount: 0,
      rowCount: 0,
      durationMs: Date.now() - startedAt,
      outcome: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    logAppError(error, {
      event: "route_error",
      context: {
        estimate_id: estimateId,
        invalid_identifier: isInvalidIdentifier,
        project_id: projectId,
        route: "/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx",
        route_handler: "GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx",
      },
    });
    return NextResponse.json(
      { error: isInvalidIdentifier ? "Invalid estimate or tab identifier." : "Failed to generate the spreadsheet export. Please try again." },
      { status: isInvalidIdentifier ? 400 : 500 },
    );
  }
}
