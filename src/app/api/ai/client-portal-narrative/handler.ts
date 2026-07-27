import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAiRequestUserContext, isProviderBackedAiUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import {
  buildAiPackageActionRun,
  hashAiAuditValue,
  recordAiPackageAuditRows,
  type AiPackageAuditRows,
} from "@/lib/ai/audit";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  buildClientPortalNarrativeFacts,
  buildClientPortalNarrativeInput,
  buildClientPortalNarrativeInputFingerprint,
  canonicalSerializeClientPortalNarrative,
  CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION,
  createDeterministicClientPortalNarrativeSelection,
  parseClientPortalNarrativeSelection,
  renderClientPortalNarrative,
  type ClientPortalNarrativeResponse,
} from "@/lib/client-portal/narrative-ai";
import {
  createDeepSeekClientPortalNarrativeProvider,
  type ClientPortalNarrativeProvider,
} from "@/lib/client-portal/narrative-ai-provider";
import { readIssueDraft } from "@/lib/client-portal/issue-draft-repository";
import { loadClientPortalIssueDraftSources } from "@/lib/client-portal/issue-draft-sources";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertProjectPublicationManager } from "@/lib/publication/actions";
import { assertSameOrigin, getClientIp } from "@/lib/publication/security";
import { checkRecordedDurableRateLimit, type DurableRateLimitResult } from "@/lib/security/durable-rate-limits";

type NarrativeRequest = {
  draftId: string;
  draftRevision: number;
  portalId: string;
  projectId: string;
};

type NarrativeDraftContext = {
  draft: NonNullable<Awaited<ReturnType<typeof readIssueDraft>>>;
  sources: Awaited<ReturnType<typeof loadClientPortalIssueDraftSources>>;
};

type NarrativeHandlerDependencies = {
  checkQuota: (input: { request: Request; userContext: AiRequestUserContext & { authMode: "better-auth"; workspaceId: string } }) => Promise<DurableRateLimitResult>;
  getUserContext: () => Promise<AiRequestUserContext | null>;
  readDraftContext: (input: NarrativeRequest & { userContext: AiRequestUserContext & { authMode: "better-auth"; workspaceId: string } }) => Promise<NarrativeDraftContext | null>;
  provider: ClientPortalNarrativeProvider;
  recordAudit: (input: AiPackageAuditRows | null) => Promise<void>;
};

const MAX_REQUEST_BODY_BYTES = 2_048;

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

const defaultDependencies: NarrativeHandlerDependencies = {
  checkQuota: ({ request, userContext }) => checkRecordedDurableRateLimit({
    keyParts: [userContext.workspaceId, userContext.userId, getClientIp(request)],
    metadata: { route: "client_portal_narrative" },
    scope: "ai_client_portal_narrative",
    windows: [
      { seconds: 60, limit: 5, message: (retryAfter) => `AI narrative quota exceeded. Please wait ${retryAfter} seconds.` },
      { seconds: 60 * 60, limit: 30, message: (retryAfter) => `AI narrative quota exceeded. Please wait ${retryAfter} seconds.` },
    ],
  }),
  getUserContext: getAiRequestUserContext,
  async readDraftContext(input) {
    const [manager, database] = await Promise.all([
      assertProjectPublicationManager(input.projectId).catch(() => null),
      getCloudflareD1Database(),
    ]);
    if (!manager || !database || manager.project.workspace_id !== input.userContext.workspaceId) return null;
    const scope = {
      draftId: input.draftId,
      portalId: input.portalId,
      projectId: manager.project.id,
      workspaceId: manager.project.workspace_id,
    };
    const [draft, sources] = await Promise.all([
      readIssueDraft(database, scope),
      loadClientPortalIssueDraftSources(database, scope),
    ]);
    return draft ? { draft, sources } : null;
  },
  provider: createDeepSeekClientPortalNarrativeProvider(),
  recordAudit: recordAiPackageAuditRows,
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequest(value: unknown): NarrativeRequest {
  if (!isRecord(value)) throw new Error("Narrative request must be an object.");
  const keys = Object.keys(value).sort();
  const expected = ["draftId", "draftRevision", "portalId", "projectId"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("Narrative request contains unsupported fields.");
  }
  const cleanId = (candidate: unknown) => typeof candidate === "string" && candidate.trim().length > 0 && candidate.length <= 160 ? candidate.trim() : null;
  const draftId = cleanId(value.draftId);
  const portalId = cleanId(value.portalId);
  const projectId = cleanId(value.projectId);
  if (!draftId || !portalId || !projectId || !Number.isInteger(value.draftRevision) || Number(value.draftRevision) < 1) {
    throw new Error("Narrative request identifiers and draft revision are required.");
  }
  return { draftId, portalId, projectId, draftRevision: Number(value.draftRevision) };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fallbackReasonFor(error: unknown): ClientPortalNarrativeResponse["fallbackReason"] {
  if (error instanceof DOMException && error.name === "AbortError") return "timeout";
  if (error instanceof Error && /abort|timeout/i.test(error.message)) return "timeout";
  if (error instanceof SyntaxError || (error instanceof Error && /provider|JSON|fact ID|must contain|must select/i.test(error.message))) return "invalid_output";
  return "provider_error";
}

export async function handleClientPortalNarrativeRequest(
  request: Request,
  options: {
    aiEnabled: boolean;
    dependencies?: Partial<NarrativeHandlerDependencies>;
  },
) {
  const deps = { ...defaultDependencies, ...options.dependencies };
  const sameOrigin = assertSameOrigin(request);
  if (!sameOrigin.ok) return response({ error: sameOrigin.message }, sameOrigin.status);

  const body = await readBoundedJsonBody<unknown>(request, MAX_REQUEST_BODY_BYTES);
  if (!body.ok) return response({ error: body.error }, body.status);

  let parsed: NarrativeRequest;
  try {
    parsed = parseRequest(body.value);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Narrative request is invalid." }, 400);
  }

  let userContext: AiRequestUserContext | null;
  try {
    userContext = await deps.getUserContext();
  } catch {
    return response({ error: "AI requires a signed-in account session." }, 401);
  }
  if (!userContext || !isProviderBackedAiUserContext(userContext)) {
    return response({ error: "AI requires a signed-in account session." }, 401);
  }

  const draftContext = await deps.readDraftContext({ ...parsed, userContext }).catch(() => null);
  if (!draftContext) return response({ error: "Issue draft was not found or is not available to this workspace." }, 404);
  if (draftContext.draft.draftRevision !== parsed.draftRevision) {
    return response({ error: "Issue draft changed. Save the latest revision and generate again.", code: "stale_draft" }, 409);
  }
  if (draftContext.draft.status !== "draft" && draftContext.draft.status !== "ready") {
    return response({ error: "Issue draft can no longer receive a narrative.", code: "immutable_draft" }, 409);
  }

  const providerConfigured = options.aiEnabled && deps.provider.hasApiKey();
  if (providerConfigured) {
    let quota: DurableRateLimitResult;
    try {
      quota = await deps.checkQuota({ request, userContext });
    } catch {
      return response({ error: "AI narrative quota is unavailable." }, 503);
    }
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.message },
        { status: 429, headers: { ...noStoreHeaders, "Retry-After": String(quota.retryAfter) } },
      );
    }
  }

  const changeSet = buildClientPortalNarrativeInput({ draft: draftContext.draft, sources: draftContext.sources });
  const facts = buildClientPortalNarrativeFacts(changeSet);
  const inputFingerprint = buildClientPortalNarrativeInputFingerprint({ draftRevision: parsed.draftRevision, changeSet });
  const inputHash = sha256(canonicalSerializeClientPortalNarrative(changeSet));
  const runId = randomUUID();
  let provider = "deterministic";
  let model = "source-fact-renderer-v1";
  let source: ClientPortalNarrativeResponse["source"] = "deterministic";
  let fallbackReason: ClientPortalNarrativeResponse["fallbackReason"] = options.aiEnabled ? null : "disabled";
  let usage: Record<string, number> = {};
  let selection = createDeterministicClientPortalNarrativeSelection(facts);

  if (options.aiEnabled && !providerConfigured) {
    fallbackReason = "unconfigured";
  } else if (options.aiEnabled) {
    provider = deps.provider.name;
    model = deps.provider.model;
    try {
      const result = await deps.provider.generate({ facts });
      if (!result) throw new Error("Narrative provider returned no output.");
      selection = parseClientPortalNarrativeSelection(result.output, facts);
      provider = result.provider;
      model = result.model;
      source = "ai";
      fallbackReason = null;
      usage = Object.fromEntries(Object.entries(result.usage ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
    } catch (error) {
      fallbackReason = fallbackReasonFor(error);
    }
  }

  const narrative = renderClientPortalNarrative(facts, selection);
  const outputHash = sha256(canonicalSerializeClientPortalNarrative({ narrative, selection }));
  const actionRun = buildAiPackageActionRun({
    runId,
    userContext,
    mode: "draft",
    status: "completed",
    provider,
    model,
    routeContext: { surface: "client_portal_narrative", projectId: parsed.projectId },
    providerSendCategories: ["sanitized_client_portal_change_set", "source_backed_fact_ids", "no_financial_values", "no_public_promises"],
    usage,
    requestHost: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    metadata: {
      schemaVersion: CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION,
      draftRevision: parsed.draftRevision,
      inputHash,
      inputFingerprintHash: hashAiAuditValue(inputFingerprint),
      outputHash,
      source,
      fallbackReason,
    },
  });
  await deps.recordAudit(actionRun ? { actionRun, toolCalls: [], dataAccessEvents: [] } : null);

  return response({
    schemaVersion: CLIENT_PORTAL_NARRATIVE_SCHEMA_VERSION,
    draftRevision: parsed.draftRevision,
    inputFingerprint,
    narrative,
    selection,
    source,
    provider,
    model,
    fallbackReason,
    runId,
    generatedAt: new Date().toISOString(),
    inputHash,
    outputHash,
  } satisfies ClientPortalNarrativeResponse);
}
