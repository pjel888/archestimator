import { createHash } from "node:crypto";

import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/lib/observability/incident-record-core";
import { redactMessage } from "@/lib/observability/redact";

export type OperationalIncidentAlertAction = "declare" | "note" | "status" | "close";
export type OperationalIncidentAlertScope = "local" | "remote";

export type OperationalIncidentAlertInput = {
  action: OperationalIncidentAlertAction;
  database: string;
  scope: OperationalIncidentAlertScope;
  incidentId: string;
  eventId: string;
  generatedAt?: string;
  severity?: string;
  status?: string;
  owner?: string;
  actor?: string;
  summary?: string;
  detail?: string;
  rootCause?: string;
  relatedRequestIds?: readonly string[];
  sample?: boolean;
};

export type OperationalIncidentAlertPayload = {
  schemaVersion: "v1";
  source: "archestimator-operational-incidents";
  event: "incident_declared" | "incident_note_added" | "incident_status_changed" | "incident_closed";
  emittedAt: string;
  environment: "production" | "local";
  database: string;
  sample: boolean;
  incident: {
    id: string;
    eventId: string;
    severity: IncidentSeverity | null;
    status: IncidentStatus | null;
    owner: string | null;
    actor: string | null;
    summary: string | null;
    detail: string | null;
    rootCause: string | null;
    relatedRequestIds: string[];
  };
  taintedFields: string[];
};

export type OperationalIncidentAlertDeliveryResult =
  | {
      delivered: true;
      skipped: false;
      statusCode: number;
      payloadPathSafe: boolean;
      taintedFields: string[];
    }
  | {
      delivered: false;
      skipped: true;
      statusCode: null;
      reason: "disabled" | "local_scope" | "not_configured" | "missing_token" | "invalid_url";
      payloadPathSafe: boolean;
      taintedFields: string[];
    }
  | {
      delivered: false;
      skipped: false;
      statusCode: number | null;
      reason: "webhook_rejected" | "request_failed" | "unsafe_payload";
      payloadPathSafe: boolean;
      taintedFields: string[];
    };

type SendOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

const MAX_TEXT_LENGTH = 600;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function readEnv(env: Record<string, string | undefined>, name: string) {
  return env[name]?.trim() ?? "";
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function truncate(value: string) {
  return value.length <= MAX_TEXT_LENGTH ? value : `${value.slice(0, MAX_TEXT_LENGTH - 12)} [truncated]`;
}

function safeReference(value: string, field: string, taintedFields: string[]) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const redacted = redactMessage(trimmed);
  const candidate = redacted.value.trim();
  if (!redacted.tainted && SAFE_REFERENCE_PATTERN.test(candidate)) return candidate;
  taintedFields.push(field);
  return `redacted-reference:${sha256Hex(candidate).slice(0, 16)}`;
}

function redactedText(field: string, value: string | undefined, taintedFields: string[]) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const redacted = redactMessage(trimmed);
  if (redacted.tainted) taintedFields.push(field);
  return truncate(redacted.value);
}

function normalizeSeverity(value: string | undefined) {
  return INCIDENT_SEVERITIES.includes(value as IncidentSeverity) ? value as IncidentSeverity : null;
}

function normalizeStatus(value: string | undefined, action: OperationalIncidentAlertAction) {
  const effective = action === "close" ? "closed" : value;
  return INCIDENT_STATUSES.includes(effective as IncidentStatus) ? effective as IncidentStatus : null;
}

function eventForAction(action: OperationalIncidentAlertAction): OperationalIncidentAlertPayload["event"] {
  if (action === "declare") return "incident_declared";
  if (action === "note") return "incident_note_added";
  if (action === "status") return "incident_status_changed";
  return "incident_closed";
}

export function buildOperationalIncidentAlertPayload(input: OperationalIncidentAlertInput): OperationalIncidentAlertPayload {
  const taintedFields: string[] = [];
  const relatedRequestIds = (input.relatedRequestIds ?? [])
    .map((requestId, index) => safeReference(requestId, `relatedRequestIds[${index}]`, taintedFields))
    .filter((requestId): requestId is string => Boolean(requestId));

  return {
    schemaVersion: "v1",
    source: "archestimator-operational-incidents",
    event: eventForAction(input.action),
    emittedAt: input.generatedAt ?? new Date().toISOString(),
    environment: input.scope === "remote" ? "production" : "local",
    database: input.database,
    sample: input.sample === true,
    incident: {
      id: safeReference(input.incidentId, "incidentId", taintedFields) ?? "missing-incident-id",
      eventId: safeReference(input.eventId, "eventId", taintedFields) ?? "missing-event-id",
      severity: normalizeSeverity(input.severity),
      status: normalizeStatus(input.status, input.action),
      owner: redactedText("owner", input.owner, taintedFields),
      actor: redactedText("actor", input.actor, taintedFields),
      summary: redactedText("summary", input.summary, taintedFields),
      detail: redactedText("detail", input.detail, taintedFields),
      rootCause: redactedText("rootCause", input.rootCause, taintedFields),
      relatedRequestIds,
    },
    taintedFields: [...new Set(taintedFields)],
  };
}

export function operationalIncidentAlertPayloadPathSafe(payload: OperationalIncidentAlertPayload) {
  const body = JSON.stringify(payload);
  const deniedPatterns = [
    /storage[_-]?path/i,
    /file[_-]?name/i,
    /component-attachments\//i,
    /component-images\//i,
    /project-images\//i,
    /private\//i,
    /signed[_-]?url/i,
    /access[_-]?token/i,
    /bearer\s+[a-z0-9._~+/=-]+/i,
    /cookie/i,
    /password\s*[:=]\s*[^,}\s]+/i,
    /invite[_-]?token/i,
    /share[_-]?token/i,
  ];
  return deniedPatterns.every((pattern) => !pattern.test(body));
}

function alertWebhookUrl(env: Record<string, string | undefined>) {
  const value = readEnv(env, "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL");
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function sendOperationalIncidentAlert(
  input: OperationalIncidentAlertInput,
  options: SendOptions = {},
): Promise<OperationalIncidentAlertDeliveryResult> {
  const env = options.env ?? process.env;
  const payload = buildOperationalIncidentAlertPayload(input);
  const payloadPathSafe = operationalIncidentAlertPayloadPathSafe(payload);

  if (readEnv(env, "OPERATIONAL_INCIDENT_ALERTS_ENABLED") !== "1") {
    return { delivered: false, skipped: true, statusCode: null, reason: "disabled", payloadPathSafe, taintedFields: payload.taintedFields };
  }

  if (input.scope !== "remote" && readEnv(env, "OPERATIONAL_INCIDENT_ALERTS_ALLOW_LOCAL") !== "1") {
    return { delivered: false, skipped: true, statusCode: null, reason: "local_scope", payloadPathSafe, taintedFields: payload.taintedFields };
  }

  const url = alertWebhookUrl(env);
  if (!url) {
    return readEnv(env, "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL")
      ? { delivered: false, skipped: true, statusCode: null, reason: "invalid_url", payloadPathSafe, taintedFields: payload.taintedFields }
      : { delivered: false, skipped: true, statusCode: null, reason: "not_configured", payloadPathSafe, taintedFields: payload.taintedFields };
  }

  const token = readEnv(env, "OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN");
  if (!token) {
    return { delivered: false, skipped: true, statusCode: null, reason: "missing_token", payloadPathSafe, taintedFields: payload.taintedFields };
  }

  if (!payloadPathSafe) {
    return { delivered: false, skipped: false, statusCode: null, reason: "unsafe_payload", payloadPathSafe, taintedFields: payload.taintedFields };
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
        "x-archestimator-alert-event": payload.event,
        "x-archestimator-incident-id": payload.incident.id,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        delivered: false,
        skipped: false,
        statusCode: response.status,
        reason: "webhook_rejected",
        payloadPathSafe,
        taintedFields: payload.taintedFields,
      };
    }

    return {
      delivered: true,
      skipped: false,
      statusCode: response.status,
      payloadPathSafe,
      taintedFields: payload.taintedFields,
    };
  } catch {
    return {
      delivered: false,
      skipped: false,
      statusCode: null,
      reason: "request_failed",
      payloadPathSafe,
      taintedFields: payload.taintedFields,
    };
  }
}
