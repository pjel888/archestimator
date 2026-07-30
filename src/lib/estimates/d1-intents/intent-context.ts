import "server-only";

import { randomUUID } from "node:crypto";

import type { CurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateStrictInD1, canEditProjectStrictInD1 } from "@/lib/authz/d1-access";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  buildCommittedMutationReceiptStatement,
  createMutationRequestFingerprint,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";

import { firstD1Row, type D1IntentStatement } from "./database";

export type EstimateD1Actor = Readonly<Pick<CurrentUserContext, "userId" | "role">>;

export type EstimateIntentProjectContext = {
  projectId: string;
  workspaceId: string;
};

export type EstimateIntentContext = EstimateIntentProjectContext & {
  estimateId: string;
};

export type EstimateMutationIntentContext = EstimateIntentContext & {
  actorUserId: string;
  commandKind: string;
  intentId: string;
  requestFingerprint: string;
};

type EstimateMutationIntentInput = {
  projectId: string;
  estimateId: string;
  correlationId: string;
  commandKind: string;
  request: unknown;
};

function readReceiptResult(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Estimate mutation receipt result must be an object.");
  }
  return value as Record<string, unknown>;
}

function requireActor(actor: EstimateD1Actor | null | undefined, denialMessage: string): EstimateD1Actor {
  if (!actor) throw new Error(denialMessage);
  return actor;
}

export async function readEstimateIntentProjectContext(
  database: D1DatabaseLike,
  projectId: string,
): Promise<EstimateIntentProjectContext | null> {
  const row = await firstD1Row<{ id: string; workspace_id: string }>(
    database,
    `
      SELECT id, workspace_id
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [projectId],
  );
  return row ? { projectId: row.id, workspaceId: row.workspace_id } : null;
}

export async function readEstimateIntentContext(
  database: D1DatabaseLike,
  input: { projectId: string; estimateId: string },
): Promise<EstimateIntentContext | null> {
  const row = await firstD1Row<{ id: string; project_id: string; workspace_id: string }>(
    database,
    `
      SELECT estimate.id, estimate.project_id, project.workspace_id
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = ?
        AND estimate.project_id = ?
      LIMIT 1
    `,
    [input.estimateId, input.projectId],
  );
  return row
    ? { projectId: row.project_id, estimateId: row.id, workspaceId: row.workspace_id }
    : null;
}

export async function assertProjectEditIntent(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  projectId: string,
): Promise<EstimateIntentProjectContext> {
  const trustedActor = requireActor(actor, "Project edit access denied.");
  const allowed = await canEditProjectStrictInD1(database, projectId, trustedActor);
  if (!allowed) throw new Error("Project edit access denied.");
  const context = await readEstimateIntentProjectContext(database, projectId);
  if (!context) throw new Error("Project not found in the current workspace.");
  return context;
}

export async function assertEstimateEditIntent(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  estimateId: string,
): Promise<EstimateIntentContext> {
  const trustedActor = requireActor(actor, "Estimate edit access denied.");
  const allowed = await canEditEstimateStrictInD1(database, estimateId, trustedActor);
  if (!allowed) throw new Error("Estimate edit access denied.");
  const row = await firstD1Row<{ id: string; project_id: string; workspace_id: string }>(
    database,
    `
      SELECT estimate.id, estimate.project_id, project.workspace_id
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = ?
      LIMIT 1
    `,
    [estimateId],
  );
  if (!row) throw new Error("Estimate edit access denied.");
  return { projectId: row.project_id, estimateId: row.id, workspaceId: row.workspace_id };
}

export async function prepareEstimateMutationIntent<T>(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: EstimateMutationIntentInput,
): Promise<{ context: EstimateMutationIntentContext; committedResult: T | null }> {
  const trustedActor = requireActor(actor, "Estimate edit access denied.");
  await assertEstimateEditIntent(database, trustedActor, input.estimateId);
  const estimate = await readEstimateIntentContext(database, input);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const intentId = (input.correlationId || randomUUID()).trim();
  if (!intentId) throw new Error("Estimate mutation intent is required.");
  const context: EstimateMutationIntentContext = {
    ...estimate,
    actorUserId: trustedActor.userId,
    commandKind: input.commandKind,
    intentId,
    requestFingerprint: createMutationRequestFingerprint(input.request),
  };
  const committedResult = await readCommittedMutationReceipt(
    database,
    context,
    (value) => readReceiptResult(value) as T,
  );
  return { context, committedResult };
}

export async function prepareParsedEstimateMutationIntent<T>(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: EstimateMutationIntentInput,
  parseCommittedResult: (value: unknown) => T,
): Promise<{ context: EstimateMutationIntentContext; committedResult: T | null }> {
  const prepared = await prepareEstimateMutationIntent<unknown>(database, actor, input);
  return {
    context: prepared.context,
    committedResult: prepared.committedResult === null
      ? null
      : parseCommittedResult(prepared.committedResult),
  };
}

export async function readConcurrentEstimateMutationReceipt<T>(
  database: D1DatabaseLike,
  context: EstimateMutationIntentContext,
): Promise<T | null> {
  return readCommittedMutationReceipt(
    database,
    context,
    (value) => readReceiptResult(value) as T,
  );
}

export function buildEstimateMutationReceiptStatement(
  context: EstimateMutationIntentContext,
  resourceType: string,
  resourceId: string | null,
  result: unknown,
  timestamp: string,
): D1IntentStatement {
  return buildCommittedMutationReceiptStatement({
    ...context,
    resourceType,
    resourceId,
    result,
    timestamp,
  });
}

export function buildProjectPublicationRevisionForEstimate(
  projectId: string,
  workspaceId: string,
  estimateId: string,
): D1IntentStatement {
  return {
    sql: `
      UPDATE projects
      SET publication_source_revision = publication_source_revision + 1
      WHERE id = ?
        AND workspace_id = ?
        AND EXISTS (
          SELECT 1
          FROM estimates
          WHERE estimates.id = ?
            AND estimates.project_id = projects.id
        )
    `,
    values: [projectId, workspaceId, estimateId],
  };
}

export function buildProjectPublicationRevisionForProject(
  projectId: string,
  workspaceId: string,
): D1IntentStatement {
  return {
    sql: `
      UPDATE projects
      SET publication_source_revision = publication_source_revision + 1
      WHERE id = ?
        AND workspace_id = ?
    `,
    values: [projectId, workspaceId],
  };
}
