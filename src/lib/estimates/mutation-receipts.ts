import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

export const D1_MUTATION_HARD_STATEMENT_LIMIT = 1_000;
export const MUTATION_RECEIPT_RESULT_MAX_BYTES = 65_536;

export type MutationReceiptStatement = {
  sql: string;
  values: D1Value[];
};

type MutationReceiptRow = {
  actor_user_id: string;
  request_fingerprint: string;
  result_json: string;
  status: string;
};

type MutationReceiptIdentity = {
  workspaceId: string;
  commandKind: string;
  intentId: string;
  actorUserId: string;
  requestFingerprint: string;
};

export class MutationIntentConflictError extends Error {
  readonly code = "mutation_intent_conflict";

  constructor() {
    super("This action changed after it was submitted. Retry it as a new action.");
    this.name = "MutationIntentConflictError";
  }
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalizeJson(entry)]),
  );
}

export function createMutationRequestFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalizeJson(value))).digest("hex");
}

export function assertD1MutationStatementLimit(statementCount: number) {
  if (!Number.isSafeInteger(statementCount) || statementCount < 0) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
  if (statementCount > D1_MUTATION_HARD_STATEMENT_LIMIT) {
    throw new Error(`Something went wrong. Try again in a moment.`);
  }
}

export async function readCommittedMutationReceipt<T>(
  database: D1DatabaseLike,
  identity: MutationReceiptIdentity,
  parseResult: (value: unknown) => T,
) {
  const receipt = await database.prepare<MutationReceiptRow>(`
    SELECT actor_user_id, request_fingerprint, result_json, status
    FROM estimate_mutation_receipts
    WHERE workspace_id = ?
      AND command_kind = ?
      AND intent_id = ?
    LIMIT 1
  `).bind(identity.workspaceId, identity.commandKind, identity.intentId).first<MutationReceiptRow>();
  if (!receipt) return null;
  if (
    receipt.status !== "committed"
    || receipt.actor_user_id !== identity.actorUserId
    || receipt.request_fingerprint !== identity.requestFingerprint
  ) {
    throw new MutationIntentConflictError();
  }
  try {
    return parseResult(JSON.parse(receipt.result_json) as unknown);
  } catch {
    throw new Error("The committed mutation receipt is invalid.");
  }
}

export function buildCommittedMutationReceiptStatement(input: MutationReceiptIdentity & {
  resourceType: string;
  resourceId?: string | null;
  result: unknown;
  timestamp: string;
}): MutationReceiptStatement {
  const resultJson = JSON.stringify(input.result);
  if (new TextEncoder().encode(resultJson).byteLength > MUTATION_RECEIPT_RESULT_MAX_BYTES) {
    throw new Error("The mutation receipt result is too large.");
  }
  return {
    sql: `
      INSERT INTO estimate_mutation_receipts (
        id, workspace_id, command_kind, intent_id, actor_user_id,
        resource_type, resource_id, request_fingerprint, status,
        result_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'committed', ?, ?, ?)
    `,
    values: [
      randomUUID(),
      input.workspaceId,
      input.commandKind,
      input.intentId,
      input.actorUserId,
      input.resourceType,
      input.resourceId ?? null,
      input.requestFingerprint,
      resultJson,
      input.timestamp,
      input.timestamp,
    ],
  };
}
