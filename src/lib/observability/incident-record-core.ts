import { createHash } from "node:crypto";

import { redactMessage } from "@/lib/observability/redact";

export const INCIDENT_SEVERITIES = ["sev1", "sev2", "sev3"] as const;
export const INCIDENT_STATUSES = ["open", "contained", "resolved", "closed"] as const;
export const INCIDENT_EVENT_KINDS = ["declared", "status_changed", "escalated", "note", "closed"] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type IncidentEventKind = (typeof INCIDENT_EVENT_KINDS)[number];

export type OperationalIncidentRow = {
  id: string;
  declared_at: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner: string;
  summary: string;
  root_cause: string | null;
  related_request_ids: string;
  closed_at: string | null;
};

export type OperationalIncidentEventRow = {
  id: string;
  incident_id: string;
  occurred_at: string;
  event_kind: IncidentEventKind;
  actor: string;
  detail: string;
};

export type BuildOperationalIncidentInput = {
  id?: string;
  eventId?: string;
  declaredAt?: string;
  occurredAt?: string;
  severity: IncidentSeverity;
  status?: IncidentStatus;
  owner: string;
  actor?: string;
  summary: string;
  detail?: string;
  rootCause?: string | null;
  relatedRequestIds?: readonly string[];
  closedAt?: string | null;
  eventKind?: IncidentEventKind;
};

export type BuiltOperationalIncident = {
  incident: OperationalIncidentRow;
  event: OperationalIncidentEventRow;
  taintedFields: string[];
};

const MAX_OWNER_LENGTH = 128;
const MAX_SUMMARY_LENGTH = 512;
const MAX_ROOT_CAUSE_LENGTH = 4000;
const MAX_DETAIL_LENGTH = 2000;
const MAX_RELATED_REQUEST_IDS = 20;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function assertEnum<T extends string>(name: string, value: string, allowed: readonly T[]): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 12))} [truncated]`;
}

function normalizeRequiredText(
  field: string,
  value: string,
  maxLength: number,
  taintedFields: string[],
) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Operational incident ${field} is required`);
  const redacted = redactMessage(trimmed);
  if (redacted.tainted) taintedFields.push(field);
  return truncate(redacted.value, maxLength);
}

function normalizeOptionalText(
  field: string,
  value: string | null | undefined,
  maxLength: number,
  taintedFields: string[],
) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const redacted = redactMessage(trimmed);
  if (redacted.tainted) taintedFields.push(field);
  return truncate(redacted.value, maxLength);
}

function stableReferenceHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeRelatedRequestIds(values: readonly string[] | undefined, taintedFields: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const [index, raw] of (values ?? []).entries()) {
    if (normalized.length >= MAX_RELATED_REQUEST_IDS) break;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const redacted = redactMessage(trimmed);
    const candidate = redacted.value.trim();
    let value = candidate;

    if (redacted.tainted || !SAFE_REFERENCE_PATTERN.test(candidate)) {
      taintedFields.push(`relatedRequestIds[${index}]`);
      value = `redacted-reference:${stableReferenceHash(candidate)}`;
    }

    if (!seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  }

  return normalized;
}

function validateClosedAt(status: IncidentStatus, closedAt: string | null | undefined) {
  if (status === "closed" && !closedAt) {
    throw new Error("Operational incident closed_at is required when status is closed");
  }
  if (status !== "closed" && closedAt) {
    throw new Error("Operational incident closed_at must be null unless status is closed");
  }
}

export function buildOperationalIncidentRows(input: BuildOperationalIncidentInput): BuiltOperationalIncident {
  const status = input.status ?? "open";
  const eventKind = input.eventKind ?? (status === "closed" ? "closed" : "declared");
  assertEnum("incident severity", input.severity, INCIDENT_SEVERITIES);
  assertEnum("incident status", status, INCIDENT_STATUSES);
  assertEnum("incident event kind", eventKind, INCIDENT_EVENT_KINDS);
  validateClosedAt(status, input.closedAt);

  const taintedFields: string[] = [];
  const declaredAt = input.declaredAt ?? new Date().toISOString();
  const incidentId = input.id ?? crypto.randomUUID();
  const owner = normalizeRequiredText("owner", input.owner, MAX_OWNER_LENGTH, taintedFields);
  const summary = normalizeRequiredText("summary", input.summary, MAX_SUMMARY_LENGTH, taintedFields);
  const rootCause = normalizeOptionalText("rootCause", input.rootCause, MAX_ROOT_CAUSE_LENGTH, taintedFields);
  const relatedRequestIds = normalizeRelatedRequestIds(input.relatedRequestIds, taintedFields);
  const actor = normalizeRequiredText("actor", input.actor ?? input.owner, MAX_OWNER_LENGTH, taintedFields);
  const detail = normalizeRequiredText("detail", input.detail ?? input.summary, MAX_DETAIL_LENGTH, taintedFields);

  return {
    incident: {
      id: incidentId,
      declared_at: declaredAt,
      severity: input.severity,
      status,
      owner,
      summary,
      root_cause: rootCause,
      related_request_ids: JSON.stringify(relatedRequestIds),
      closed_at: status === "closed" ? input.closedAt! : null,
    },
    event: {
      id: input.eventId ?? crypto.randomUUID(),
      incident_id: incidentId,
      occurred_at: input.occurredAt ?? declaredAt,
      event_kind: eventKind,
      actor,
      detail,
    },
    taintedFields: [...new Set(taintedFields)],
  };
}
