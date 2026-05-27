import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getAiRequestUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import {
  buildAiPackageActionRun,
  recordAiPackageAuditRows,
  type AiPackageAuditRows,
} from "@/lib/ai/audit";
import { applyPackageBuilderDraft, type PackageBuilderApplyResult } from "@/lib/ai/package-builder/apply";
import { buildPackageBuilderDraft } from "@/lib/ai/package-builder/draft";
import { getPackageBuilderFeatureFlags } from "@/lib/ai/package-builder/feature-flags";
import { createDeepSeekPackageBuilderProvider, type PackageBuilderAiProvider } from "@/lib/ai/package-builder/provider";
import {
  readPackageBuilderTools,
  type PackageBuilderReadToolsData,
} from "@/lib/ai/package-builder/read-tools";
import {
  buildPackageDraftHash,
  parsePackageBuilderApplyRequest,
  parsePackageBuilderRequest,
  type PackageBuilderApplyRequest,
} from "@/lib/ai/package-builder/schemas";

type PackageBuilderDependencies = {
  getUserContext: () => Promise<AiRequestUserContext | null>;
  provider: PackageBuilderAiProvider;
  readTools: (input: { runId: string; userContext: AiRequestUserContext; message: string; routeContext?: Record<string, unknown> }) => Promise<PackageBuilderReadToolsData>;
  applyPackage: (input: PackageBuilderApplyRequest & { userContext: AiRequestUserContext; requestHost?: string | null; userAgent?: string | null }) => Promise<PackageBuilderApplyResult>;
  recordAudit: (input: AiPackageAuditRows | null) => Promise<void>;
};

const defaultDependencies: PackageBuilderDependencies = {
  getUserContext: getAiRequestUserContext,
  provider: createDeepSeekPackageBuilderProvider(),
  readTools: readPackageBuilderTools,
  applyPackage: applyPackageBuilderDraft,
  recordAudit: recordAiPackageAuditRows,
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function createEmptyReadData(): PackageBuilderReadToolsData {
  return {
    workspace: { name: null },
    projects: [],
    projectSummary: null,
    projectEstimates: [],
    estimateSummary: null,
    estimateTree: [],
    areaRows: [],
    componentMatches: [],
    templateMatches: [],
    auditEvents: [],
  };
}

function flattenAuditEvents(readData: PackageBuilderReadToolsData) {
  return {
    toolCalls: readData.auditEvents.map((event) => event.toolCall).filter((event): event is NonNullable<typeof event> => Boolean(event)),
    dataAccessEvents: readData.auditEvents.map((event) => event.dataAccessEvent).filter((event): event is NonNullable<typeof event> => Boolean(event)),
  };
}

export async function handlePackageBuilderRequest(request: Request, dependencies: Partial<PackageBuilderDependencies> = {}) {
  const deps = { ...defaultDependencies, ...dependencies };
  const flags = getPackageBuilderFeatureFlags();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  let parsedRequest;
  try {
    parsedRequest = parsePackageBuilderRequest(rawBody);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Package-builder request is invalid.", 400);
  }

  let userContext: AiRequestUserContext | null;
  try {
    userContext = await deps.getUserContext();
  } catch {
    return jsonError("AI request is not allowed in this auth mode.", 403);
  }
  if (!userContext) return jsonError("Authentication required.", 401);

  if (parsedRequest.mode === "apply") {
    if (userContext.authMode !== "supabase" || !userContext.workspaceId) {
      return jsonError("Package Apply requires an authenticated workspace.", 403);
    }
    if (!flags.applyShell || !flags.applyTree) return jsonError("AI package Apply is disabled.", 403);

    let applyRequest;
    try {
      applyRequest = parsePackageBuilderApplyRequest(rawBody);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Package Apply request is invalid.", 400);
    }

    try {
      const result = await deps.applyPackage({
        ...applyRequest,
        userContext,
        requestHost: request.headers.get("host"),
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json({ mode: "apply", result });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Package Apply failed.", 400);
    }
  }

  if (!flags.draft) return jsonError("AI package Draft is disabled.", 403);

  const runId = randomUUID();
  let readData: PackageBuilderReadToolsData = createEmptyReadData();
  if (flags.readTools && userContext.authMode === "supabase" && userContext.workspaceId) {
    try {
      readData = await deps.readTools({
        runId,
        userContext,
        message: parsedRequest.message,
        routeContext: parsedRequest.routeContext,
      });
    } catch {
      readData = createEmptyReadData();
    }
  }

  let providerResult = null;
  try {
    providerResult = deps.provider.hasApiKey()
      ? await deps.provider.createDraftSuggestion({
          message: parsedRequest.message,
          compactContext: {
            workspace: readData.workspace,
            libraryItems: readData.componentMatches.slice(0, 8).map((component) => ({
              material: component.material,
              category: component.category,
              supplier: component.supplier,
              unit: component.unit,
              unitCost: component.unitCost,
            })),
            templates: readData.templateMatches.slice(0, 6).map((template) => ({
              name: template.name,
              category: template.category,
              nodeCount: template.nodeCount,
              rowCount: template.rowCount,
            })),
          },
        })
      : null;
  } catch {
    providerResult = null;
  }

  const draft = buildPackageBuilderDraft({ message: parsedRequest.message, readData, providerResult });
  const draftHash = buildPackageDraftHash(draft);
  const actionRun = buildAiPackageActionRun({
    runId,
    userContext,
    mode: "draft",
    status: "completed",
    provider: providerResult?.provider ?? deps.provider.name,
    model: providerResult?.model ?? deps.provider.model,
    message: parsedRequest.message,
    routeContext: parsedRequest.routeContext,
    providerSendCategories: ["user_message", "compact_workspace_context", "compact_component_matches", "compact_template_matches", "validated_draft_schema"],
    usage: providerResult?.usage ?? {},
    requestHost: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    metadata: {
      draftId: draft.draftId,
      draftHash,
      componentMatchCount: draft.componentMatches.length,
      templateMatchCount: draft.templateMatches.length,
      allowanceRowCount: draft.rowDraft.filter((row) => row.sourceType === "allowance").length,
    },
  });
  const readAudit = flattenAuditEvents(readData);
  if (actionRun) {
    await deps.recordAudit({
      actionRun,
      toolCalls: readAudit.toolCalls,
      dataAccessEvents: readAudit.dataAccessEvents,
    });
  }

  return NextResponse.json({
    mode: "draft",
    draft,
    draftHash,
    provider: providerResult?.provider ?? deps.provider.name,
    model: providerResult?.model ?? deps.provider.model,
    usage: providerResult?.usage ?? null,
    productionWrite: false,
    serverValidation: draft.applyEligibility,
  });
}

export async function POST(request: Request) {
  return handlePackageBuilderRequest(request);
}
