export const ESTIMATE_MUTATION_TELEMETRY_EVENTS = [
  "mutation_requested",
  "mutation_succeeded",
  "mutation_failed",
  "mutation_conflict",
  "mutation_offline_retryable",
  "mutation_pending_age_escalated",
  "cache_refetch_queued",
  "authz_denied",
  "rate_limited",
] as const;

export type EstimateMutationTelemetryEvent = typeof ESTIMATE_MUTATION_TELEMETRY_EVENTS[number];

export type EstimateMutationOperation =
  | "insert_row"
  | "replace_row"
  | "delete_row"
  | "delete_rows"
  | "restore_rows"
  | "move_component"
  | "move_row"
  | "detach_row"
  | "promote_row"
  | "update_row"
  | "authz_check";

export type EstimateMutationTelemetryPayload = {
  operation?: EstimateMutationOperation;
  projectId?: string;
  estimateId?: string;
  rowId?: string;
  rowCount?: number;
  mutationId?: string;
  durationMs?: number;
  pendingAgeMs?: number;
  reason?: string;
  code?: string;
  retryable?: boolean;
  refetchType?: "active" | "all" | "inactive" | "none";
  queryScope?: "detail" | "tree" | "library" | "component_projection";
};

export type EstimateMutationTelemetryRecord = {
  schemaVersion: "v1";
  event: EstimateMutationTelemetryEvent;
} & EstimateMutationTelemetryPayload;

export const ESTIMATE_MUTATION_TELEMETRY_SAFE_PAYLOAD_KEYS = [
  "operation",
  "projectId",
  "estimateId",
  "rowId",
  "rowCount",
  "mutationId",
  "durationMs",
  "pendingAgeMs",
  "reason",
  "code",
  "retryable",
  "refetchType",
  "queryScope",
] as const satisfies readonly (keyof EstimateMutationTelemetryPayload)[];

const safePayloadKeys = new Set<string>(ESTIMATE_MUTATION_TELEMETRY_SAFE_PAYLOAD_KEYS);

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : undefined;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildEstimateMutationTelemetryRecord(
  event: EstimateMutationTelemetryEvent,
  payload: Record<string, unknown> = {},
): EstimateMutationTelemetryRecord {
  const record: EstimateMutationTelemetryRecord = {
    schemaVersion: "v1",
    event,
  };

  for (const [key, rawValue] of Object.entries(payload)) {
    if (!safePayloadKeys.has(key) || rawValue === undefined || rawValue === null) continue;

    if (key === "durationMs" || key === "pendingAgeMs" || key === "rowCount") {
      const normalizedNumber = normalizeNumber(rawValue);
      if (normalizedNumber !== undefined) {
        (record as Record<string, unknown>)[key] = normalizedNumber;
      }
      continue;
    }

    if (key === "retryable") {
      if (typeof rawValue === "boolean") record.retryable = rawValue;
      continue;
    }

    const normalizedString = normalizeString(rawValue);
    if (normalizedString) {
      (record as Record<string, unknown>)[key] = normalizedString;
    }
  }

  return record;
}

export function recordEstimateMutationEvent(
  event: EstimateMutationTelemetryEvent,
  payload: Record<string, unknown> = {},
) {
  if (process.env.NODE_ENV === "test") return;
  console.warn("[estimate-mutations]", buildEstimateMutationTelemetryRecord(event, payload));
}
