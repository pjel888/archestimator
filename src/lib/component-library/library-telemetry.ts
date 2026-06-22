export type LibraryTelemetryEvent =
  | "library_find_started"
  | "library_find_resolved"
  | "library_find_abandoned"
  | "quick_add_started"
  | "quick_add_saved"
  | "quick_add_abandoned"
  | "quick_add_failed"
  | "insert_target_confirmed"
  | "insert_target_mismatch"
  | "trust_chip_rendered"
  | "trust_chip_unclassified"
  | "authz_denied"
  | "idor_attempt"
  | "cache_bleed_detected"
  | "redaction_regression"
  | "xss_attempt"
  | "formula_injection_detected"
  | "csrf_attempt"
  | "rate_limit_exceeded"
  | "snapshot_bypass_attempt"
  | "telemetry_pii_leak"
  | "search_rate_anomaly"
  | "snapshot_enumeration_pattern"
  | "folder_api_anomaly"
  | "bulk_export"
  | "trust_state_tamper"
  | "library_component_selected"
  | "component_route_not_found"
  | "route_state_authz_denied"
  | "workspace_switch_cache_recovery"
  | "library_template_opened"
  | "template_route_not_found"
  | "trust_insert_gate_warned"
  | "trust_insert_gate_confirmed"
  | "trust_insert_gate_blocked"
  | "quick_add_field_invalid"
  | "upload_rejected_type"
  | "import_failed_partial_commit"
  | "export_large_export_logged"
  | "bulk_archive_hash_mismatch";

export type LibraryTelemetryPayload = {
  workspaceId?: string;
  projectId?: string;
  estimateId?: string;
  itemId?: string;
  rowId?: string;
  sourceItemId?: string;
  sourceKind?: "component" | "template";
  targetStale?: boolean;
  sessionFindId?: string;
  sessionAddId?: string;
  surface?: "overview" | "components" | "templates";
  kind?: "component" | "template";
  durationMs?: number;
  reason?: string;
  freshness?: "fresh" | "stale" | "very stale" | "missing";
  hasConfidenceLabel?: boolean;
  sampled?: boolean;
  usedAdvanced?: boolean;
  entry?: "button" | "route_param" | "empty_state" | "unknown";
  action?: string;
  role?: string;
  resourceId?: string;
  resourceKind?: "component" | "template" | "folder" | "estimate";
  workspaceAId?: string;
  workspaceBId?: string;
  cacheKey?: string;
  recovered?: boolean;
  snapshotId?: string;
  componentId?: string;
  eventName?: string;
  field?: string;
  rule?: string;
  violationCode?: string;
  inputHash?: string;
  inputLength?: number;
  inputCategory?: string;
  origin?: string;
  endpoint?: string;
  count?: number;
  window?: string;
  ipHash?: string;
  pattern?: string;
  attemptedValue?: string;
  rowIndex?: number;
  mimeType?: string;
  extension?: string;
  rowCount?: number;
  format?: string;
};

export type LibraryTelemetryRecord = {
  schemaVersion: "v1";
  event: LibraryTelemetryEvent;
} & LibraryTelemetryPayload;

type LibraryTelemetrySink = (record: LibraryTelemetryRecord) => void | Promise<void>;

const SAFE_PAYLOAD_KEYS = new Set<keyof LibraryTelemetryPayload>([
  "workspaceId",
  "projectId",
  "estimateId",
  "itemId",
  "rowId",
  "sourceItemId",
  "sourceKind",
  "targetStale",
  "sessionFindId",
  "sessionAddId",
  "surface",
  "kind",
  "durationMs",
  "reason",
  "freshness",
  "hasConfidenceLabel",
  "sampled",
  "usedAdvanced",
  "entry",
  "action",
  "role",
  "resourceId",
  "resourceKind",
  "workspaceAId",
  "workspaceBId",
  "cacheKey",
  "recovered",
  "snapshotId",
  "componentId",
  "eventName",
  "field",
  "rule",
  "violationCode",
  "inputHash",
  "inputLength",
  "inputCategory",
  "origin",
  "endpoint",
  "count",
  "window",
  "ipHash",
  "pattern",
  "attemptedValue",
  "rowIndex",
  "mimeType",
  "extension",
  "rowCount",
  "format",
]);

let sink: LibraryTelemetrySink | null = null;

export function setLibraryTelemetrySink(next: LibraryTelemetrySink | null) {
  sink = next;
}

function sanitizeLibraryTelemetryPayload(payload: LibraryTelemetryPayload): LibraryTelemetryPayload {
  const safePayload: LibraryTelemetryPayload = {};
  const entries = Object.entries(payload) as Array<[keyof LibraryTelemetryPayload, LibraryTelemetryPayload[keyof LibraryTelemetryPayload]]>;
  for (const [key, value] of entries) {
    if (!SAFE_PAYLOAD_KEYS.has(key) || value === undefined) continue;
    safePayload[key] = value as never;
  }
  return safePayload;
}

export function recordLibraryEvent(
  event: LibraryTelemetryEvent,
  payload: LibraryTelemetryPayload = {},
) {
  const record: LibraryTelemetryRecord = {
    schemaVersion: "v1",
    event,
    ...sanitizeLibraryTelemetryPayload(payload),
  };

  if (sink) {
    try {
      void sink(record);
    } catch {
      // Telemetry must never block the product path.
    }
    return;
  }

  if (process.env.NODE_ENV === "test") return;
  console.warn("[library]", record);
}
