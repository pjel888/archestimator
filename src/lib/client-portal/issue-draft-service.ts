import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES,
  CLIENT_PORTAL_ISSUE_KINDS,
  CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS,
  type ClientPortalIssueKind,
} from "@/lib/client-portal/issue-draft-contracts";
import {
  abandonIssueDraft,
  findActiveIssueDraft,
  insertIssueDraft,
  markIssueDraftReady,
  readIssueDraft,
  readIssueDraftStatus,
  replaceIssueDraft,
  type ClientPortalIssueDraft,
  type ClientPortalIssueDraftArtifactSelection,
  type ClientPortalIssueDraftEstimateSelection,
  type ClientPortalIssueDraftMetadata,
  type ClientPortalIssueDraftRequestSelection,
  type IssueDraftScope,
} from "@/lib/client-portal/issue-draft-repository";

export type ClientPortalIssueDraftErrorCode =
  | "client_portal_issue_draft_conflict"
  | "client_portal_issue_draft_database_unavailable"
  | "client_portal_issue_draft_immutable"
  | "client_portal_issue_draft_invalid"
  | "client_portal_issue_draft_not_found"
  | "client_portal_issue_draft_not_ready";

export class ClientPortalIssueDraftError extends Error {
  constructor(
    readonly code: ClientPortalIssueDraftErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ClientPortalIssueDraftError";
  }
}

export type OpenClientPortalIssueDraftInput = {
  actorId: string;
  database: D1DatabaseLike;
  draftId?: string;
  issueKind?: ClientPortalIssueKind;
  now: string;
  portalId: string;
  projectId: string;
  workspaceId: string;
};

export type SaveClientPortalIssueDraftInput = IssueDraftScope & {
  actorId: string;
  artifacts: ClientPortalIssueDraftArtifactSelection[];
  database: D1DatabaseLike;
  estimates: ClientPortalIssueDraftEstimateSelection[];
  expectedRevision: number;
  metadata: ClientPortalIssueDraftMetadata;
  now: string;
  requests: ClientPortalIssueDraftRequestSelection[];
};

export type TransitionClientPortalIssueDraftInput = IssueDraftScope & {
  actorId: string;
  database: D1DatabaseLike;
  expectedRevision: number;
  now: string;
};

function invalid(message: string, details: Record<string, unknown> = {}): never {
  throw new ClientPortalIssueDraftError("client_portal_issue_draft_invalid", message, details);
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) invalid(`${field} is required.`, { field });
  return normalized;
}

function optionalText(value: string | null, field: string): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  if (!normalized) invalid(`${field} cannot be blank.`, { field });
  return normalized;
}

function normalizeStringList(values: string[], field: string): string[] {
  const normalized = values.map((value) => requireNonEmpty(value, field));
  if (new Set(normalized).size !== normalized.length) invalid(`${field} contains duplicate values.`, { field });
  return normalized;
}

function requireJsonObject(value: Record<string, unknown>, field: string): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") invalid(`${field} must be an object.`, { field });
  try {
    JSON.stringify(value);
  } catch {
    invalid(`${field} must be JSON serializable.`, { field });
  }
  return value;
}

function requireSortOrders(values: Array<{ sortOrder: number }>, field: string) {
  for (const value of values) {
    if (!Number.isSafeInteger(value.sortOrder) || value.sortOrder < 0) {
      invalid(`${field} sort orders must be non-negative safe integers.`, { field });
    }
  }
}

function requireUnique(values: string[], field: string) {
  if (new Set(values).size !== values.length) invalid(`${field} contains duplicate selections.`, { field });
}

function normalizeSaveInput(input: SaveClientPortalIssueDraftInput): SaveClientPortalIssueDraftInput {
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) {
    invalid("expectedRevision must be a positive safe integer.", { field: "expectedRevision" });
  }
  if (!CLIENT_PORTAL_ISSUE_KINDS.includes(input.metadata.issueKind)) invalid("Unsupported issue kind.");
  if (!["none", "acknowledgement", "formal"].includes(input.metadata.requestedDecision)) {
    invalid("Unsupported requested decision.");
  }
  requireSortOrders(input.estimates, "estimates");
  requireSortOrders(input.artifacts, "artifacts");
  requireSortOrders(input.requests, "requests");
  requireUnique(input.estimates.map((selection) => selection.estimateId), "estimates");
  requireUnique(input.artifacts.map((selection) => selection.artifactVersionId), "artifacts");
  requireUnique(input.requests.map((selection) => selection.requestVersionId), "requests");
  for (const artifact of input.artifacts) {
    requireNonEmpty(artifact.artifactVersionId, "artifactVersionId");
    if (!CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES.includes(artifact.purpose)) invalid("Unsupported artifact purpose.");
  }
  for (const estimate of input.estimates) requireNonEmpty(estimate.estimateId, "estimateId");
  for (const request of input.requests) {
    requireNonEmpty(request.requestId, "requestId");
    requireNonEmpty(request.requestVersionId, "requestVersionId");
    if (!CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS.includes(request.relationship)) {
      invalid("Unsupported request relationship.");
    }
  }
  return {
    ...input,
    actorId: requireNonEmpty(input.actorId, "actorId"),
    draftId: requireNonEmpty(input.draftId, "draftId"),
    metadata: {
      ...input.metadata,
      assumptions: normalizeStringList(input.metadata.assumptions, "assumptions"),
      decisionPolicy: requireJsonObject(input.metadata.decisionPolicy, "decisionPolicy"),
      exclusions: normalizeStringList(input.metadata.exclusions, "exclusions"),
      revisionNote: optionalText(input.metadata.revisionNote, "revisionNote"),
      sectionOverrides: requireJsonObject(input.metadata.sectionOverrides, "sectionOverrides"),
      unresolvedItems: normalizeStringList(input.metadata.unresolvedItems, "unresolvedItems"),
      versionLabel: optionalText(input.metadata.versionLabel, "versionLabel"),
    },
    now: requireNonEmpty(input.now, "now"),
    portalId: requireNonEmpty(input.portalId, "portalId"),
    projectId: requireNonEmpty(input.projectId, "projectId"),
    workspaceId: requireNonEmpty(input.workspaceId, "workspaceId"),
  };
}

async function resolveMutationFailure(
  database: D1DatabaseLike,
  scope: IssueDraftScope,
  expectedRevision: number,
): Promise<never> {
  const current = await readIssueDraftStatus(database, scope);
  if (!current) {
    throw new ClientPortalIssueDraftError("client_portal_issue_draft_not_found", "Issue draft was not found.");
  }
  if (["publishing", "published", "abandoned"].includes(current.status)) {
    throw new ClientPortalIssueDraftError(
      "client_portal_issue_draft_immutable",
      "Issue draft can no longer be changed.",
      { status: current.status },
    );
  }
  throw new ClientPortalIssueDraftError(
    "client_portal_issue_draft_conflict",
    "Issue draft changed before this update was saved.",
    { actualRevision: current.draftRevision, expectedRevision },
  );
}

function readinessFailures(draft: ClientPortalIssueDraft): string[] {
  const failures: string[] = [];
  const hasIncludedEstimate = draft.estimates.some((selection) => selection.included);
  const hasVisibleContent = hasIncludedEstimate || draft.artifacts.length > 0 || draft.requests.length > 0;
  if (!hasVisibleContent) failures.push("visible_content_required");
  if (!draft.revisionNote?.trim()) failures.push("final_narrative_required");
  if (draft.requestedDecision === "formal" && Object.keys(draft.decisionPolicy).length === 0) {
    failures.push("formal_decision_policy_required");
  }
  return failures;
}

export async function openClientPortalIssueDraft(
  input: OpenClientPortalIssueDraftInput,
): Promise<{ draft: ClientPortalIssueDraft; replayed: boolean }> {
  const scope = {
    portalId: requireNonEmpty(input.portalId, "portalId"),
    projectId: requireNonEmpty(input.projectId, "projectId"),
    workspaceId: requireNonEmpty(input.workspaceId, "workspaceId"),
  };
  const existing = await findActiveIssueDraft(input.database, scope);
  if (existing) return { draft: existing, replayed: true };
  const issueKind = input.issueKind ?? "initial_estimate";
  if (!CLIENT_PORTAL_ISSUE_KINDS.includes(issueKind)) invalid("Unsupported issue kind.");
  const draftId = input.draftId ? requireNonEmpty(input.draftId, "draftId") : `issue-draft-${randomUUID()}`;
  try {
    await insertIssueDraft(input.database, {
      ...scope,
      actorId: requireNonEmpty(input.actorId, "actorId"),
      draftId,
      issueKind,
      now: requireNonEmpty(input.now, "now"),
    });
  } catch (error) {
    const raced = await findActiveIssueDraft(input.database, scope);
    if (raced) return { draft: raced, replayed: true };
    throw error;
  }
  const draft = await findActiveIssueDraft(input.database, scope);
  if (!draft) {
    throw new ClientPortalIssueDraftError(
      "client_portal_issue_draft_not_found",
      "Portal was not found or does not belong to the project.",
    );
  }
  return { draft, replayed: draft.id !== draftId };
}

export async function getClientPortalIssueDraft(
  database: D1DatabaseLike,
  scope: IssueDraftScope,
): Promise<ClientPortalIssueDraft> {
  const draft = await readIssueDraft(database, scope);
  if (!draft) throw new ClientPortalIssueDraftError("client_portal_issue_draft_not_found", "Issue draft was not found.");
  return draft;
}

export async function saveClientPortalIssueDraft(
  unnormalizedInput: SaveClientPortalIssueDraftInput,
): Promise<ClientPortalIssueDraft> {
  const input = normalizeSaveInput(unnormalizedInput);
  let updated: boolean;
  try {
    updated = await replaceIssueDraft(input.database, input);
  } catch (error) {
    if (error instanceof ClientPortalIssueDraftError) throw error;
    if (error instanceof Error && error.message.includes("D1 batch support")) {
      throw new ClientPortalIssueDraftError(
        "client_portal_issue_draft_database_unavailable",
        "Atomic issue draft updates are unavailable.",
      );
    }
    throw error;
  }
  if (!updated) await resolveMutationFailure(input.database, input, input.expectedRevision);
  return getClientPortalIssueDraft(input.database, input);
}

export async function markClientPortalIssueDraftReady(
  input: TransitionClientPortalIssueDraftInput,
): Promise<ClientPortalIssueDraft> {
  const draft = await getClientPortalIssueDraft(input.database, input);
  if (["publishing", "published", "abandoned"].includes(draft.status)) {
    throw new ClientPortalIssueDraftError(
      "client_portal_issue_draft_immutable",
      "Issue draft can no longer be marked ready.",
      { status: draft.status },
    );
  }
  if (draft.draftRevision !== input.expectedRevision) {
    throw new ClientPortalIssueDraftError(
      "client_portal_issue_draft_conflict",
      "Issue draft changed before readiness was confirmed.",
      { actualRevision: draft.draftRevision, expectedRevision: input.expectedRevision },
    );
  }
  const failures = readinessFailures(draft);
  if (failures.length > 0) {
    throw new ClientPortalIssueDraftError(
      "client_portal_issue_draft_not_ready",
      "Issue draft is not ready to publish.",
      { failures },
    );
  }
  const updated = await markIssueDraftReady(input.database, input);
  if (!updated) await resolveMutationFailure(input.database, input, input.expectedRevision);
  return getClientPortalIssueDraft(input.database, input);
}

export async function abandonClientPortalIssueDraft(
  input: TransitionClientPortalIssueDraftInput,
): Promise<ClientPortalIssueDraft> {
  const updated = await abandonIssueDraft(input.database, input);
  if (!updated) await resolveMutationFailure(input.database, input, input.expectedRevision);
  return getClientPortalIssueDraft(input.database, input);
}
