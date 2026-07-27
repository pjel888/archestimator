"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { ClientPortalIssueDraft, ClientPortalNarrativeProvenance } from "@/lib/client-portal/issue-draft-repository";
import {
  abandonClientPortalIssueDraft,
  getClientPortalIssueDraft,
  markClientPortalIssueDraftReady,
  openClientPortalIssueDraft,
  saveClientPortalIssueDraft,
} from "@/lib/client-portal/issue-draft-service";
import { loadClientPortalIssueDraftSources } from "@/lib/client-portal/issue-draft-sources";
import {
  buildClientPortalNarrativeFacts,
  buildClientPortalNarrativeInput,
  buildClientPortalNarrativeInputFingerprint,
  canonicalSerializeClientPortalNarrative,
  parseClientPortalNarrativeResponse,
  parseClientPortalNarrativeSelection,
  renderClientPortalNarrative,
  type ClientPortalNarrativeResponse,
} from "@/lib/client-portal/narrative-ai";
import { hashAiAuditValue } from "@/lib/ai/audit";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function context(projectId: string) {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return { actorId: manager.currentUserId, database, projectId: manager.project.id, workspaceId: manager.project.workspace_id };
}

function detailPath(projectId: string, portalId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}?tab=content`;
}

export async function openClientPortalIssueDraftAction(input: { portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const [{ draft }, sources] = await Promise.all([
    openClientPortalIssueDraft({
      actorId: scope.actorId,
      database: scope.database,
      now: new Date().toISOString(),
      portalId: input.portalId,
      projectId: scope.projectId,
      workspaceId: scope.workspaceId,
    }),
    loadClientPortalIssueDraftSources(scope.database, {
      portalId: input.portalId,
      projectId: scope.projectId,
      workspaceId: scope.workspaceId,
    }),
  ]);
  return { draft, sources };
}

export async function saveClientPortalIssueDraftAction(input: { draft: ClientPortalIssueDraft; portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const [current, sources] = await Promise.all([
    getClientPortalIssueDraft(scope.database, { draftId: input.draft.id, portalId: input.portalId, projectId: scope.projectId, workspaceId: scope.workspaceId }),
    loadClientPortalIssueDraftSources(scope.database, { portalId: input.portalId, projectId: scope.projectId, workspaceId: scope.workspaceId }),
  ]);
  const submittedFingerprint = buildClientPortalNarrativeInputFingerprint({
    draftRevision: input.draft.draftRevision,
    changeSet: buildClientPortalNarrativeInput({ draft: input.draft, sources }),
  });
  const narrativeProvenance = current.narrativeProvenance
    && current.revisionNote === input.draft.revisionNote
    && current.narrativeProvenance.inputFingerprint === submittedFingerprint
    ? current.narrativeProvenance
    : null;
  const draft = await saveClientPortalIssueDraft({
    actorId: scope.actorId,
    artifacts: input.draft.artifacts,
    database: scope.database,
    draftId: input.draft.id,
    estimates: input.draft.estimates,
    expectedRevision: input.draft.draftRevision,
    metadata: { ...input.draft, narrativeProvenance },
    now: new Date().toISOString(),
    portalId: input.portalId,
    projectId: scope.projectId,
    requests: input.draft.requests,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return draft;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function acceptClientPortalNarrativeAction(input: {
  draftId: string;
  expectedRevision: number;
  finalText: string;
  portalId: string;
  projectId: string;
  response: ClientPortalNarrativeResponse;
}) {
  const scope = await context(input.projectId);
  const response = parseClientPortalNarrativeResponse(input.response);
  if (response.source !== "ai") throw new Error("Only provider-backed AI drafts require AI provenance acceptance.");
  const [draft, sources, auditRun] = await Promise.all([
    getClientPortalIssueDraft(scope.database, { draftId: input.draftId, portalId: input.portalId, projectId: scope.projectId, workspaceId: scope.workspaceId }),
    loadClientPortalIssueDraftSources(scope.database, { portalId: input.portalId, projectId: scope.projectId, workspaceId: scope.workspaceId }),
    scope.database.prepare<{ created_at: string; metadata_json: string; model: string; provider: string }>("SELECT created_at, metadata_json, model, provider FROM ai_action_runs WHERE run_id = ? AND workspace_id = ? AND actor_user_id = ? AND mode = 'draft' AND status = 'completed' LIMIT 1")
      .bind(response.runId, scope.workspaceId, scope.actorId)
      .first<{ created_at: string; metadata_json: string; model: string; provider: string }>(),
  ]);
  if (draft.draftRevision !== input.expectedRevision || response.draftRevision !== draft.draftRevision) throw new Error("Issue draft changed before AI narrative acceptance.");
  const changeSet = buildClientPortalNarrativeInput({ draft, sources });
  const inputFingerprint = buildClientPortalNarrativeInputFingerprint({ draftRevision: draft.draftRevision, changeSet });
  const facts = buildClientPortalNarrativeFacts(changeSet);
  const selection = parseClientPortalNarrativeSelection(response.selection, facts);
  const aiDraft = renderClientPortalNarrative(facts, selection);
  const inputHash = sha256(canonicalSerializeClientPortalNarrative(changeSet));
  const outputHash = sha256(canonicalSerializeClientPortalNarrative({ narrative: aiDraft, selection }));
  const auditMetadata = auditRun ? JSON.parse(auditRun.metadata_json) as Record<string, unknown> : null;
  if (
    !auditRun
    || auditRun.provider !== response.provider
    || auditRun.model !== response.model
    || response.inputFingerprint !== inputFingerprint
    || response.narrative !== aiDraft
    || response.inputHash !== inputHash
    || response.outputHash !== outputHash
    || auditMetadata?.source !== "ai"
    || auditMetadata?.schemaVersion !== response.schemaVersion
    || auditMetadata?.draftRevision !== response.draftRevision
    || auditMetadata?.inputHash !== response.inputHash
    || auditMetadata?.outputHash !== response.outputHash
    || auditMetadata?.inputFingerprintHash !== hashAiAuditValue(response.inputFingerprint)
  ) {
    throw new Error("AI narrative provenance could not be verified.");
  }
  const finalText = input.finalText.trim();
  if (!finalText || finalText.length > 4_000) throw new Error("Reviewed narrative is required and must be 4,000 characters or fewer.");
  const approvedAt = new Date().toISOString();
  const narrativeProvenance: ClientPortalNarrativeProvenance = {
    aiDraft,
    approvedAt,
    approvedBy: scope.actorId,
    generatedAt: auditRun.created_at,
    inputFingerprint,
    inputHash,
    model: response.model,
    outputHash,
    provider: response.provider,
    runId: response.runId,
    schemaVersion: response.schemaVersion,
    selection,
  };
  const saved = await saveClientPortalIssueDraft({
    actorId: scope.actorId,
    artifacts: draft.artifacts,
    database: scope.database,
    draftId: draft.id,
    estimates: draft.estimates,
    expectedRevision: draft.draftRevision,
    metadata: { ...draft, narrativeProvenance, revisionNote: finalText },
    now: approvedAt,
    portalId: input.portalId,
    projectId: scope.projectId,
    requests: draft.requests,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return saved;
}

export async function markClientPortalIssueDraftReadyAction(input: { draftId: string; expectedRevision: number; portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const draft = await markClientPortalIssueDraftReady({
    actorId: scope.actorId,
    database: scope.database,
    draftId: input.draftId,
    expectedRevision: input.expectedRevision,
    now: new Date().toISOString(),
    portalId: input.portalId,
    projectId: scope.projectId,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return draft;
}

export async function abandonClientPortalIssueDraftAction(input: { draftId: string; expectedRevision: number; portalId: string; projectId: string }) {
  const scope = await context(input.projectId);
  const draft = await abandonClientPortalIssueDraft({
    actorId: scope.actorId,
    database: scope.database,
    draftId: input.draftId,
    expectedRevision: input.expectedRevision,
    now: new Date().toISOString(),
    portalId: input.portalId,
    projectId: scope.projectId,
    workspaceId: scope.workspaceId,
  });
  revalidatePath(detailPath(scope.projectId, input.portalId));
  return draft;
}
