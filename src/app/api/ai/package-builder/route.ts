import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getAiRequestUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import {
  buildAiPackageActionRun,
  recordAiPackageApplyAuthorization,
  recordAiPackageAuditRows,
  type AiPackageAuditRows,
} from "@/lib/ai/audit";
import { applyPackageBuilderDraft, type PackageBuilderApplyResult } from "@/lib/ai/package-builder/apply";
import { buildPackageBuilderDraft, refinePackageBuilderDraft } from "@/lib/ai/package-builder/draft";
import { createPackageDraftToken, verifyPackageDraftToken } from "@/lib/ai/package-builder/draft-token";
import { getPackageBuilderFeatureFlags } from "@/lib/ai/package-builder/feature-flags";
import {
  recordPackageBuilderMemorySignals,
  type RecordPackageBuilderMemorySignalsInput,
} from "@/lib/ai/package-builder/memory";
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
  type PackageBuilderDraft,
} from "@/lib/ai/package-builder/schemas";

type PackageBuilderDependencies = {
  getUserContext: () => Promise<AiRequestUserContext | null>;
  provider: PackageBuilderAiProvider;
  readTools: (input: { runId: string; userContext: AiRequestUserContext; message: string; routeContext?: Record<string, unknown>; memoryEnabled?: boolean }) => Promise<PackageBuilderReadToolsData>;
  applyPackage: (input: PackageBuilderApplyRequest & { userContext: AiRequestUserContext; authorizationRunId: string; requestHost?: string | null; userAgent?: string | null }) => Promise<PackageBuilderApplyResult>;
  recordAudit: (input: AiPackageAuditRows | null) => Promise<void>;
  recordMemory: (input: RecordPackageBuilderMemorySignalsInput) => Promise<void>;
  authorizeApply: (input: ReturnType<typeof buildAiPackageActionRun>) => Promise<void>;
};

const defaultDependencies: PackageBuilderDependencies = {
  getUserContext: getAiRequestUserContext,
  provider: createDeepSeekPackageBuilderProvider(),
  readTools: readPackageBuilderTools,
  applyPackage: applyPackageBuilderDraft,
  recordAudit: recordAiPackageAuditRows,
  recordMemory: recordPackageBuilderMemorySignals,
  authorizeApply: recordAiPackageApplyAuthorization,
};

const AI_AUTH_MODE_ERROR = "AI requires a real Supabase account session. Disable local admin DB bypass and sign in to use account data.";

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
    historicalRowMatches: [],
    comparableEstimatePackages: [],
    componentMatches: [],
    templateMatches: [],
    memoryPreferences: { componentSignals: [], templateSignals: [], sourceRowCount: 0 },
    auditEvents: [],
  };
}

function flattenAuditEvents(readData: PackageBuilderReadToolsData) {
  return {
    toolCalls: readData.auditEvents.map((event) => event.toolCall).filter((event): event is NonNullable<typeof event> => Boolean(event)),
    dataAccessEvents: readData.auditEvents.map((event) => event.dataAccessEvent).filter((event): event is NonNullable<typeof event> => Boolean(event)),
  };
}

function buildCurrentRouteProviderContext(readData: PackageBuilderReadToolsData) {
  const areaNodes = readData.estimateTree.filter((node) => node.kind === "area");
  const areaNameById = new Map(areaNodes.map((node) => [node.id, node.name]));

  return {
    portfolioProjects: readData.projects.slice(0, 12).map((project) => ({
      name: project.name,
      projectCode: project.projectCode,
      updatedAt: project.updatedAt,
    })),
    currentProjectEstimates: readData.projectEstimates.slice(0, 12).map((estimate) => ({
      name: estimate.name,
      sheetCode: estimate.sheetCode,
      total: estimate.total,
      nodeCount: estimate.nodeCount,
      rowCount: estimate.rowCount,
    })),
    currentProject: readData.projectSummary
      ? {
          name: readData.projectSummary.name,
        }
      : null,
    currentEstimate: readData.estimateSummary
      ? {
          name: readData.estimateSummary.name,
          sheetCode: readData.estimateSummary.sheetCode,
          total: readData.estimateSummary.total,
          nodeCount: readData.estimateSummary.nodeCount,
          rowCount: readData.estimateSummary.rowCount,
        }
      : null,
    currentAreas: areaNodes.slice(0, 16).map((node) => ({
      name: node.name,
      path: node.path.slice(0, 8),
      rowCount: node.rowCount,
    })),
    currentAreaRows: readData.areaRows.slice(0, 16).map((row) => ({
      areaName: areaNameById.get(row.nodeId) ?? null,
      material: row.material,
      quantity: row.quantity,
      unit: row.unit,
      unitCost: row.unitCost,
      total: row.total,
      sourceType: row.sourceType,
    })),
  };
}

function hasRowApplyWrites(draft: PackageBuilderApplyRequest["draft"]) {
  return draft.rowDraft.length > 0
    || (draft.rowUpdateDraft?.length ?? 0) > 0
    || (draft.rowReplacementDraft?.length ?? 0) > 0
    || (draft.rowDeleteDraft?.length ?? 0) > 0
    || (draft.templateRowCopyDraft?.length ?? 0) > 0
    || (draft.templateInsertDraft?.length ?? 0) > 0;
}

async function recordMemorySignalBestEffort(
  deps: Pick<PackageBuilderDependencies, "recordMemory">,
  input: RecordPackageBuilderMemorySignalsInput,
) {
  try {
    await deps.recordMemory(input);
  } catch {
    // Memory is a ranking hint only; feedback and Apply outcomes remain authoritative.
  }
}

function getBaseDraftRequest(parsedRequest: ReturnType<typeof parsePackageBuilderRequest>): {
  baseDraft: PackageBuilderDraft;
  baseDraftHash: string;
  baseDraftToken: string;
} | null {
  if (parsedRequest.mode === "refine") {
    return {
      baseDraft: parsedRequest.baseDraft,
      baseDraftHash: parsedRequest.baseDraftHash,
      baseDraftToken: parsedRequest.baseDraftToken,
    };
  }
  if (parsedRequest.mode === "draft" && parsedRequest.baseDraft && parsedRequest.baseDraftHash && parsedRequest.baseDraftToken) {
    return {
      baseDraft: parsedRequest.baseDraft,
      baseDraftHash: parsedRequest.baseDraftHash,
      baseDraftToken: parsedRequest.baseDraftToken,
    };
  }
  return null;
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
    return jsonError(AI_AUTH_MODE_ERROR, 403);
  }
  if (!userContext) return jsonError("Authentication required.", 401);
  if (userContext.authMode !== "supabase" || !userContext.workspaceId) return jsonError(AI_AUTH_MODE_ERROR, 403);

  if (parsedRequest.mode === "feedback") {
    try {
      verifyPackageDraftToken({
        draftToken: parsedRequest.draftToken,
        draft: parsedRequest.draft,
        draftHash: parsedRequest.draftHash,
        userContext,
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Package draft feedback request is invalid.", 400);
    }

    const feedbackRunId = randomUUID();
    const actionRun = buildAiPackageActionRun({
      runId: feedbackRunId,
      userContext,
      mode: "draft",
      status: "completed",
      provider: "app-command",
      model: "user-feedback",
      routeContext: parsedRequest.routeContext,
      providerSendCategories: [
        "server_verified_draft_token",
        "explicit_user_rejection",
        "validated_draft_hash",
        "safe_summary",
      ],
      requestHost: request.headers.get("host"),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        draftId: parsedRequest.draft.draftId,
        draftHash: parsedRequest.draftHash,
        feedbackDecision: parsedRequest.decision,
        productionWrite: false,
        componentMatchCount: parsedRequest.draft.componentMatches.length,
        templateMatchCount: parsedRequest.draft.templateMatches.length,
        rowDraftCount: parsedRequest.draft.rowDraft.length,
        rowUpdateCount: parsedRequest.draft.rowUpdateDraft?.length ?? 0,
        rowReplacementCount: parsedRequest.draft.rowReplacementDraft?.length ?? 0,
        rowDeleteCount: parsedRequest.draft.rowDeleteDraft?.length ?? 0,
        nodeRenameCount: parsedRequest.draft.nodeRenameDraft?.length ?? 0,
        templateInsertCount: parsedRequest.draft.templateInsertDraft?.length ?? 0,
        templateRowCopyCount: parsedRequest.draft.templateRowCopyDraft?.length ?? 0,
        componentCreateCount: parsedRequest.draft.componentCreateDraft?.length ?? 0,
      },
    });
    if (actionRun) {
      await deps.recordAudit({ actionRun });
    }
    if (flags.memory) {
      await recordMemorySignalBestEffort(deps, {
        userContext,
        draft: parsedRequest.draft,
        draftHash: parsedRequest.draftHash,
        signal: "rejected",
      });
    }

    return NextResponse.json({
      mode: "feedback",
      decision: parsedRequest.decision,
      productionWrite: false,
    });
  }

  if (parsedRequest.mode === "apply") {
    if (!flags.applyShell || !flags.applyTree) return jsonError("AI package Apply is disabled.", 403);

    let applyRequest;
    try {
      // Keep Apply gated on explicit confirmation plus a matching draftHash.
      applyRequest = parsePackageBuilderApplyRequest(rawBody);
      verifyPackageDraftToken({
        draftToken: applyRequest.draftToken,
        draft: applyRequest.draft,
        draftHash: applyRequest.draftHash,
        userContext,
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Package Apply request is invalid.", 400);
    }
    if (!flags.applyRows && hasRowApplyWrites(applyRequest.draft)) {
      return jsonError("AI package row Apply is disabled.", 403);
    }

    const applyRunId = randomUUID();
    try {
      await deps.authorizeApply(buildAiPackageActionRun({
        runId: applyRunId,
        userContext,
        mode: "apply",
        status: "started",
        provider: "app-command",
        model: "server-authorization",
        providerSendCategories: ["server_verified_draft_token", "explicit_user_confirmation", "validated_draft_hash", "safe_summary"],
        requestHost: request.headers.get("host"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          draftId: applyRequest.draft.draftId,
          draftHash: applyRequest.draftHash,
          idempotencyKey: applyRequest.idempotencyKey,
          draftTokenVerified: true,
          serverConfirmation: true,
          rowApplyEnabled: flags.applyRows,
          componentCreateCount: applyRequest.draft.componentCreateDraft?.length ?? 0,
          nodeRenameCount: applyRequest.draft.nodeRenameDraft?.length ?? 0,
        },
      }));
    } catch {
      return jsonError("Package Apply authorization could not be recorded.", 503);
    }

    try {
      const result = await deps.applyPackage({
        ...applyRequest,
        userContext,
        authorizationRunId: applyRunId,
        requestHost: request.headers.get("host"),
        userAgent: request.headers.get("user-agent"),
      });
      if (flags.memory) {
        await recordMemorySignalBestEffort(deps, {
          userContext,
          draft: applyRequest.draft,
          draftHash: applyRequest.draftHash,
          signal: "accepted",
        });
      }
      return NextResponse.json({ mode: "apply", result });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Package Apply failed.", 400);
    }
  }

  if (!flags.draft) return jsonError("AI package Draft is disabled.", 403);

  const baseDraftRequest = getBaseDraftRequest(parsedRequest);
  if (baseDraftRequest) {
    try {
      verifyPackageDraftToken({
        draftToken: baseDraftRequest.baseDraftToken,
        draft: baseDraftRequest.baseDraft,
        draftHash: baseDraftRequest.baseDraftHash,
        userContext,
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Package draft revision request is invalid.", 400);
    }
  }

  const runId = randomUUID();
  let readData: PackageBuilderReadToolsData = createEmptyReadData();
  if (flags.readTools && userContext.authMode === "supabase" && userContext.workspaceId) {
    try {
      readData = await deps.readTools({
        runId,
        userContext,
        message: parsedRequest.message,
        routeContext: parsedRequest.routeContext,
        memoryEnabled: flags.memory,
      });
    } catch {
      return jsonError("Package-builder read tools failed.", 503);
    }
  }

  let providerResult = null;
  try {
    providerResult = !baseDraftRequest && deps.provider.hasApiKey()
        ? await deps.provider.createDraftSuggestion({
          message: parsedRequest.message,
          compactContext: {
            workspace: readData.workspace,
            ...buildCurrentRouteProviderContext(readData),
            libraryItems: readData.componentMatches.slice(0, 8).map((component) => ({
              material: component.material,
              category: component.category,
              categoryPath: component.categoryPath,
              libraryFolderName: component.libraryFolderName ?? null,
              libraryFolderPath: component.libraryFolderPath ?? [],
              supplier: component.supplier,
              brand: component.brand ?? null,
              unit: component.unit,
              unitCost: component.unitCost,
            })),
            templates: readData.templateMatches.slice(0, 6).map((template) => ({
              name: template.name,
              category: template.category,
              nodeCount: template.nodeCount,
              rowCount: template.rowCount,
              areaNames: template.areaNames.slice(0, 12),
              rowPreviews: (template.rowPreviews ?? []).slice(0, 8).map((row) => ({
                areaName: row.areaName,
                material: row.material,
                unit: row.unit,
                unitCost: row.unitCost,
                total: row.total,
              })),
            })),
            historicalRows: readData.historicalRowMatches.slice(0, 8).map((row) => ({
              projectName: row.projectName,
              estimateName: row.estimateName,
              areaName: row.areaName,
              material: row.material,
              unit: row.unit,
              unitCost: row.unitCost,
              total: row.total,
            })),
            comparablePackages: readData.comparableEstimatePackages.slice(0, 4).map((packageMatch) => ({
              projectName: packageMatch.projectName,
              estimateName: packageMatch.estimateName,
              sheetCode: packageMatch.sheetCode,
              matchedTerms: packageMatch.matchedTerms.slice(0, 12),
              areaCount: packageMatch.areaCount,
              rowCount: packageMatch.rowCount,
              total: packageMatch.total,
              sourceLibraryCoverageRatio: packageMatch.sourceLibraryCoverageRatio,
              areas: packageMatch.areas.slice(0, 8).map((area) => ({
                areaName: area.areaName,
                rowCount: area.rowCount,
                total: area.total,
                sourceLibraryCoverageRatio: area.sourceLibraryCoverageRatio,
                topMaterials: area.topMaterials.slice(0, 6),
                rowPreviews: area.rowPreviews.slice(0, 4).map((row) => ({
                  areaName: row.areaName,
                  material: row.material,
                  quantity: row.quantity,
                  unit: row.unit,
                  unitCost: row.unitCost,
                  total: row.total,
                  sourceType: row.sourceType,
                })),
              })),
            })),
          },
        })
      : null;
  } catch {
    providerResult = null;
  }

  let draft;
  try {
    draft = parsedRequest.mode === "refine"
      ? refinePackageBuilderDraft({ message: parsedRequest.message, baseDraft: parsedRequest.baseDraft, readData })
      : buildPackageBuilderDraft({ message: parsedRequest.message, readData, providerResult, baseDraft: parsedRequest.baseDraft });
  } catch {
    providerResult = null;
    draft = parsedRequest.mode === "refine"
      ? refinePackageBuilderDraft({ message: parsedRequest.message, baseDraft: parsedRequest.baseDraft, readData })
      : buildPackageBuilderDraft({ message: parsedRequest.message, readData, providerResult, baseDraft: parsedRequest.baseDraft });
  }
  const draftHash = buildPackageDraftHash(draft);
  const provider = parsedRequest.mode === "refine" || baseDraftRequest ? "app-command" : providerResult?.provider ?? deps.provider.name;
  const model = parsedRequest.mode === "refine"
    ? "server-refinement"
    : baseDraftRequest
      ? "server-revision"
      : providerResult?.model ?? deps.provider.model;
  const draftToken = createPackageDraftToken({ draft, draftHash, userContext, provider, model });
  const providerSendCategories = baseDraftRequest
    ? [
        "user_message",
        "server_verified_base_draft_token",
        ...(parsedRequest.mode === "refine" ? ["deterministic_in_memory_refinement"] : ["deterministic_pending_draft_revision"]),
        "validated_draft_schema",
        "safe_summary",
      ]
    : [
        "user_message",
        "compact_workspace_context",
        "compact_portfolio_context",
        "compact_current_estimate_context",
        "compact_component_matches",
        "compact_template_matches",
        "compact_historical_estimate_rows",
        "compact_comparable_estimate_packages",
        "validated_draft_schema",
      ];
  const actionRun = buildAiPackageActionRun({
    runId,
    userContext,
    mode: "draft",
    status: "completed",
    provider,
    model,
    message: parsedRequest.message,
    routeContext: parsedRequest.routeContext,
    providerSendCategories,
    usage: providerResult?.usage ?? {},
    requestHost: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    metadata: {
      draftId: draft.draftId,
      draftHash,
      refinement: parsedRequest.mode === "refine",
      revision: parsedRequest.mode === "draft" && Boolean(parsedRequest.baseDraft),
      baseDraftId: baseDraftRequest?.baseDraft.draftId ?? null,
      baseDraftHash: baseDraftRequest?.baseDraftHash ?? null,
      baseDraftTokenVerified: Boolean(baseDraftRequest),
      componentMatchCount: draft.componentMatches.length,
      templateMatchCount: draft.templateMatches.length,
      comparablePackageCount: readData.comparableEstimatePackages.length,
      allowanceRowCount: draft.rowDraft.filter((row) => row.sourceType === "allowance").length,
      nodeRenameCount: draft.nodeRenameDraft?.length ?? 0,
      componentCreateCount: draft.componentCreateDraft?.length ?? 0,
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
    draftToken,
    provider,
    model,
    usage: providerResult?.usage ?? null,
    productionWrite: false,
    serverValidation: draft.applyEligibility,
  });
}

export async function POST(request: Request) {
  return handlePackageBuilderRequest(request);
}
