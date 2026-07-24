"use server";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  assertProjectPublicationManager,
  createProjectPublication,
  republishProjectPublication,
} from "@/lib/publication/actions";
import type { ProjectPublicationLocationVisibility } from "@/lib/publication/types";
import { getProjectPublicationSummary } from "@/lib/repositories/workspace-repository";

import { getOnboardingFlowDefinition } from "./flow-catalog";
import {
  completeOnboardingFlowFromDomainProof,
  getOnboardingFlowRunBinding,
} from "./flow-repository";

const CLIENT_LINK_RECEIPT_VERSION = 1;
const CLIENT_LINK_RECEIPT_TTL_MS = 5 * 60 * 1_000;
const CLIENT_LINK_RECEIPT_PURPOSE =
  "archestimator:onboarding:client-link-publication:v1";

export type ClientLinkLearningActionKind = "create" | "republish";
export type ClientLinkLearningVerificationMethod =
  | "copy"
  | "selectable_link"
  | "authenticated_preview";

type ClientLinkReceiptPayload = {
  version: typeof CLIENT_LINK_RECEIPT_VERSION;
  run_id: string;
  flow_version: number;
  expected_state_revision: number;
  action_kind: ClientLinkLearningActionKind;
  publication_revision: number;
  issued_at: number;
  expires_at: number;
  binding_digest: string;
};

type ClientLinkPublishInput = {
  projectId: string;
  selectedEstimateIds?: string[];
  password?: string;
  clearPassword?: boolean;
  expiresAt?: string | null;
  locationVisibility?: ProjectPublicationLocationVisibility | null;
  actionKind: ClientLinkLearningActionKind;
  runId: string;
  expectedRevision: number;
};

export type ClientLinkLearningPublishResult =
  | {
      ok: true;
      code: "publication_verified";
      message: string;
      clientLinkPath: string;
      receipt: string;
    }
  | {
      ok: false;
      code:
        | "publication_action_failed"
        | "publication_binding_changed"
        | "publication_verification_failed"
        | "publication_receipt_unavailable";
      message: string;
    };

export type ClientLinkLearningCompletionResult =
  | {
      ok: true;
      code: "client_link_learning_completed";
      message: string;
    }
  | {
      ok: false;
      code:
        | "publication_proof_expired"
        | "publication_binding_mismatch"
        | "publication_proof_invalid"
        | "publication_replaced"
        | "publication_proof_replayed"
        | "publication_state_changed";
      message: string;
    };

function encodeReceipt(payload: ClientLinkReceiptPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeReceipt(receipt: string): ClientLinkReceiptPayload | null {
  if (receipt.length === 0 || receipt.length > 4_096) return null;
  try {
    const value = JSON.parse(
      Buffer.from(receipt, "base64url").toString("utf8"),
    ) as Partial<ClientLinkReceiptPayload>;
    if (
      value.version !== CLIENT_LINK_RECEIPT_VERSION
      || typeof value.run_id !== "string"
      || !Number.isInteger(value.flow_version)
      || !Number.isInteger(value.expected_state_revision)
      || (value.action_kind !== "create" && value.action_kind !== "republish")
      || !Number.isInteger(value.publication_revision)
      || !Number.isInteger(value.issued_at)
      || !Number.isInteger(value.expires_at)
      || typeof value.binding_digest !== "string"
    ) {
      return null;
    }
    return value as ClientLinkReceiptPayload;
  } catch {
    return null;
  }
}

async function readReceiptSecret() {
  let workerSecret: unknown;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as {
      env?: Record<string, unknown>;
    };
    workerSecret = context.env?.BETTER_AUTH_SECRET;
  } catch {
    workerSecret = undefined;
  }
  const secret = typeof workerSecret === "string"
    ? workerSecret.trim()
    : process.env.BETTER_AUTH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function receiptBindingDigest(input: {
  secret: string;
  userId: string;
  workspaceId: string;
  projectId: string;
  publicationId: string;
  publicationRevision: number;
  actionKind: ClientLinkLearningActionKind;
  runId: string;
  flowVersion: number;
  expectedRevision: number;
  issuedAt: number;
  expiresAt: number;
}) {
  return createHmac("sha256", input.secret)
    .update(CLIENT_LINK_RECEIPT_PURPOSE)
    .update("\0")
    .update(input.userId)
    .update("\0")
    .update(input.workspaceId)
    .update("\0")
    .update(input.projectId)
    .update("\0")
    .update(input.publicationId)
    .update("\0")
    .update(String(input.publicationRevision))
    .update("\0")
    .update(input.actionKind)
    .update("\0")
    .update(input.runId)
    .update("\0")
    .update(String(input.flowVersion))
    .update("\0")
    .update(String(input.expectedRevision))
    .update("\0")
    .update(String(input.issuedAt))
    .update("\0")
    .update(String(input.expiresAt))
    .digest("base64url");
}

function constantTimeDigestMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  const sameLength = actualBuffer.length === expectedBuffer.length;
  const comparableActual = sameLength
    ? actualBuffer
    : Buffer.alloc(expectedBuffer.length);
  return timingSafeEqual(comparableActual, expectedBuffer) && sameLength;
}

export async function publishClientLinkForLearning(
  input: ClientLinkPublishInput,
): Promise<ClientLinkLearningPublishResult> {
  if (input.actionKind !== "create" && input.actionKind !== "republish") {
    return {
      ok: false,
      code: "publication_action_failed",
      message: "Publication action is invalid.",
    };
  }
  const database = await getCloudflareD1Database();
  if (!database) {
    return {
      ok: false,
      code: "publication_receipt_unavailable",
      message: "Publication verification is temporarily unavailable.",
    };
  }
  const context = await assertProjectPublicationManager(input.projectId);
  const definition = getOnboardingFlowDefinition("client_link_publishing");
  const binding = await getOnboardingFlowRunBinding(database, {
    userId: context.currentUserId,
    workspaceId: context.project.workspace_id,
    flowKey: "client_link_publishing",
    flowVersion: definition.version,
  });
  if (
    !binding
    || binding.runId !== input.runId
    || binding.state.status !== "in_progress"
    || binding.state.revision !== input.expectedRevision
  ) {
    return {
      ok: false,
      code: "publication_binding_changed",
      message: "This lesson changed in another session. Resume it before publishing.",
    };
  }

  const actionResult = input.actionKind === "create"
    ? await createProjectPublication({
        projectId: input.projectId,
        selectedEstimateIds: input.selectedEstimateIds,
        password: input.password,
        expiresAt: input.expiresAt,
        locationVisibility: input.locationVisibility,
      })
    : await republishProjectPublication({
        projectId: input.projectId,
        selectedEstimateIds: input.selectedEstimateIds,
        password: input.password,
        clearPassword: input.clearPassword,
        expiresAt: input.expiresAt,
        locationVisibility: input.locationVisibility,
      });
  if (!actionResult.ok || !actionResult.clientLinkPath) {
    return {
      ok: false,
      code: "publication_action_failed",
      message: actionResult.message,
    };
  }

  const summary = await getProjectPublicationSummary(input.projectId);
  if (
    !summary
    || !summary.canManagePublication
    || summary.workspaceId !== context.project.workspace_id
    || summary.status !== "published"
    || !summary.publicationId
    || summary.snapshotVersion < 1
    || summary.selectedEstimateCount < 1
    || !summary.tokenCopyAvailable
    || !summary.clientLinkPath
    || summary.clientLinkPath !== actionResult.clientLinkPath
    || Boolean(summary.staleSnapshotWarning)
  ) {
    return {
      ok: false,
      code: "publication_verification_failed",
      message: "The publication was not confirmed. Refresh Client links before sharing it.",
    };
  }

  const secret = await readReceiptSecret();
  if (!secret) {
    return {
      ok: false,
      code: "publication_receipt_unavailable",
      message: "The link is published, but lesson verification is temporarily unavailable.",
    };
  }
  const issuedAt = Date.now();
  const expiresAt = issuedAt + CLIENT_LINK_RECEIPT_TTL_MS;
  const payload: ClientLinkReceiptPayload = {
    version: CLIENT_LINK_RECEIPT_VERSION,
    run_id: input.runId,
    flow_version: definition.version,
    expected_state_revision: input.expectedRevision,
    action_kind: input.actionKind,
    publication_revision: summary.snapshotVersion,
    issued_at: issuedAt,
    expires_at: expiresAt,
    binding_digest: receiptBindingDigest({
      secret,
      userId: context.currentUserId,
      workspaceId: context.project.workspace_id,
      projectId: input.projectId,
      publicationId: summary.publicationId,
      publicationRevision: summary.snapshotVersion,
      actionKind: input.actionKind,
      runId: input.runId,
      flowVersion: definition.version,
      expectedRevision: input.expectedRevision,
      issuedAt,
      expiresAt,
    }),
  };
  return {
    ok: true,
    code: "publication_verified",
    message: actionResult.message,
    clientLinkPath: summary.clientLinkPath,
    receipt: encodeReceipt(payload),
  };
}

export async function completeClientLinkLearning(input: {
  projectId: string;
  receipt: string;
  method: ClientLinkLearningVerificationMethod;
  mutationId: string;
}): Promise<ClientLinkLearningCompletionResult> {
  if (
    input.method !== "copy"
    && input.method !== "selectable_link"
    && input.method !== "authenticated_preview"
  ) {
    return {
      ok: false,
      code: "publication_proof_invalid",
      message: "Publication verification method is invalid.",
    };
  }
  const payload = decodeReceipt(input.receipt);
  if (!payload) {
    return {
      ok: false,
      code: "publication_proof_invalid",
      message: "Publication verification is invalid. Publish again to continue.",
    };
  }
  const currentTime = Date.now();
  if (
    payload.issued_at > currentTime
    || payload.expires_at <= currentTime
    || payload.expires_at - payload.issued_at !== CLIENT_LINK_RECEIPT_TTL_MS
  ) {
    return {
      ok: false,
      code: "publication_proof_expired",
      message: "Publication verification expired. Publish again to continue.",
    };
  }
  const database = await getCloudflareD1Database();
  const secret = await readReceiptSecret();
  if (!database || !secret) {
    return {
      ok: false,
      code: "publication_state_changed",
      message: "Publication verification is temporarily unavailable.",
    };
  }

  const context = await assertProjectPublicationManager(input.projectId);
  const definition = getOnboardingFlowDefinition("client_link_publishing");
  const [summary, binding] = await Promise.all([
    getProjectPublicationSummary(input.projectId),
    getOnboardingFlowRunBinding(database, {
      userId: context.currentUserId,
      workspaceId: context.project.workspace_id,
      flowKey: definition.key,
      flowVersion: definition.version,
    }),
  ]);
  if (
    !summary
    || summary.workspaceId !== context.project.workspace_id
    || !summary.canManagePublication
    || summary.status !== "published"
    || !summary.publicationId
    || summary.snapshotVersion !== payload.publication_revision
    || summary.selectedEstimateCount < 1
    || !summary.tokenCopyAvailable
    || !summary.clientLinkPath
    || Boolean(summary.staleSnapshotWarning)
  ) {
    return {
      ok: false,
      code: "publication_replaced",
      message: "The current publication changed. Publish again before completing this lesson.",
    };
  }
  const expectedDigest = receiptBindingDigest({
    secret,
    userId: context.currentUserId,
    workspaceId: context.project.workspace_id,
    projectId: input.projectId,
    publicationId: summary.publicationId,
    publicationRevision: summary.snapshotVersion,
    actionKind: payload.action_kind,
    runId: payload.run_id,
    flowVersion: payload.flow_version,
    expectedRevision: payload.expected_state_revision,
    issuedAt: payload.issued_at,
    expiresAt: payload.expires_at,
  });
  if (!constantTimeDigestMatch(payload.binding_digest, expectedDigest)) {
    return {
      ok: false,
      code: "publication_binding_mismatch",
      message: "Publication verification does not match this project or account.",
    };
  }
  if (
    !binding
    || payload.flow_version !== definition.version
    || binding.runId !== payload.run_id
    || binding.state.revision !== payload.expected_state_revision
  ) {
    return {
      ok: false,
      code: "publication_state_changed",
      message: "This lesson changed in another session. Resume it before sharing.",
    };
  }

  const completion = await completeOnboardingFlowFromDomainProof(database, {
    userId: context.currentUserId,
    workspaceId: context.project.workspace_id,
    flowKey: "client_link_publishing",
    expectedRevision: payload.expected_state_revision,
    runId: payload.run_id,
    mutationId: input.mutationId,
    source: "publication_domain",
    stepKey: "client_links_verify",
    routeKey: "client_links",
  });
  if (completion.status === "applied") {
    return {
      ok: true,
      code: "client_link_learning_completed",
      message: input.method === "authenticated_preview"
        ? "Preview verified. Client link lesson complete."
        : "Shared link verified. Client link lesson complete.",
    };
  }
  return {
    ok: false,
    code: completion.code === "ONBOARDING_ALREADY_COMPLETED"
      ? "publication_proof_replayed"
      : completion.code === "ONBOARDING_DOMAIN_BINDING_MISMATCH"
        ? "publication_binding_mismatch"
        : "publication_state_changed",
    message: completion.code === "ONBOARDING_ALREADY_COMPLETED"
      ? "This publication verification was already used."
      : "This lesson changed before completion. Resume it and publish again.",
  };
}
