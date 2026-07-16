import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import {
  assertD1MutationStatementLimit,
  buildCommittedMutationReceiptStatement,
  createMutationRequestFingerprint,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";
import { isUuid } from "@/lib/ids";

export type TemplateMutationStatement = {
  sql: string;
  values?: D1Value[];
};

export type TemplateMutationIdentity = {
  workspaceId: string;
  commandKind: string;
  intentId: string;
  actorUserId: string;
  requestFingerprint: string;
};

export type TemplatePricingProvenanceOrigin =
  | "recorded"
  | "inherited_snapshot"
  | "synthesized_fallback"
  | "missing";

type TemplateMutationTelemetryInput = {
  actorUserId: string;
  workspaceId: string;
  templateId: string | null;
  action: string;
  intentId: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function resolveTemplateMutationIntentId(intentId: string | null | undefined) {
  if (intentId === undefined || intentId === null || intentId === "") return randomUUID();
  if (!isUuid(intentId)) throw new Error("Template action intent is invalid.");
  return intentId;
}

export function normalizeTemplatePricingProvenance(value: unknown): TemplatePricingProvenanceOrigin {
  return value === "recorded"
    || value === "inherited_snapshot"
    || value === "synthesized_fallback"
    ? value
    : "missing";
}

export function toDetachedTemplatePricingProvenance(value: unknown): TemplatePricingProvenanceOrigin {
  const origin = normalizeTemplatePricingProvenance(value);
  return origin === "recorded" || origin === "inherited_snapshot" ? "inherited_snapshot" : origin;
}

export function createTemplateMutationIdentity(input: {
  workspaceId: string;
  commandKind: string;
  intentId?: string | null;
  actorUserId: string;
  request: unknown;
}): TemplateMutationIdentity {
  return {
    workspaceId: input.workspaceId,
    commandKind: input.commandKind,
    intentId: resolveTemplateMutationIntentId(input.intentId),
    actorUserId: input.actorUserId,
    requestFingerprint: createMutationRequestFingerprint(input.request),
  };
}

export function readCommittedTemplateMutation<T>(
  database: D1DatabaseLike,
  identity: TemplateMutationIdentity,
  parseResult: (value: unknown) => T,
) {
  return readCommittedMutationReceipt(database, identity, parseResult);
}

export function buildTemplateMutationReceiptStatement(input: TemplateMutationIdentity & {
  templateId: string | null;
  result: unknown;
  timestamp: string;
}) {
  return buildCommittedMutationReceiptStatement({
    ...input,
    resourceType: "estimate_template",
    resourceId: input.templateId,
  });
}

export function buildTemplateMutationTelemetryStatement(input: TemplateMutationTelemetryInput): TemplateMutationStatement {
  return {
    sql: `
      INSERT INTO component_library_telemetry_events (
        id, actor_user_id, workspace_id, project_id, estimate_id,
        event_name, schema_version, surface, kind, resource_kind,
        action, reason, payload_json, created_at
      )
      VALUES (?, ?, ?, NULL, NULL, 'template_lifecycle_committed', 'v1',
        'component_library_templates', 'template_lifecycle', 'estimate_template',
        ?, NULL, ?, ?)
    `,
    values: [
      randomUUID(),
      input.actorUserId,
      input.workspaceId,
      input.action,
      JSON.stringify({
        templateId: input.templateId,
        intentId: input.intentId,
        correlationId: input.intentId,
        ...(input.metadata ?? {}),
      }),
      input.timestamp,
    ],
  };
}

export async function runTemplateAtomicBatch(
  database: D1DatabaseLike,
  statements: TemplateMutationStatement[],
): Promise<D1Result[]> {
  assertD1MutationStatementLimit(statements.length);
  if (!database.batch) throw new Error("Cloudflare D1 atomic batch support is required for template updates.");
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
  );
  if (results.some((result) => result.success === false)) {
    throw new Error("Cloudflare D1 template mutation batch failed.");
  }
  return results;
}
