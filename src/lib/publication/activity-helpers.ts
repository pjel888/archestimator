import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { readPublicationTokenEncryptionSecret } from "@/lib/publication/security";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RecipientIdentityRow = {
  id: string;
  display_name: string | null;
};

type TargetLabelMap = {
  estimateLabels: Map<string, string>;
  rowLabels: Map<string, string>;
  rowEstimateIds: Map<string, string>;
};

type SharedLinkTargetKind = "proposal" | "estimate" | "row";

export type SharedLinkStoredTargetInput = {
  estimate_id?: string | null;
  row_id?: string | null;
  target_kind?: string | null;
  target_label?: string | null;
  target_secondary_label?: string | null;
};

export type SharedLinkTargetLabelsJson = {
  estimateLabels: Record<string, string>;
  rowLabels: Record<string, string>;
  rowEstimateIds: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readSharedLinkRecipientDisplayName(recipient: RecipientIdentityRow): string {
  return readString(recipient.display_name) ?? "Client";
}

export function createSharedLinkTargetLabelMap(snapshotJson: Json | null | undefined): TargetLabelMap {
  const estimateLabels = new Map<string, string>();
  const rowLabels = new Map<string, string>();
  const rowEstimateIds = new Map<string, string>();
  if (!isRecord(snapshotJson) || !Array.isArray(snapshotJson.estimates)) return { estimateLabels, rowLabels, rowEstimateIds };

  const collectNodeLabels = (nodes: unknown, nodeLabels: Map<string, string>) => {
    if (!Array.isArray(nodes)) return;
    const visit = (node: unknown) => {
      if (!isRecord(node)) return;
      const nodeId = readString(node.id);
      const nodeLabel = readString(node.name);
      if (nodeId && nodeLabel) nodeLabels.set(nodeId, nodeLabel);
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    nodes.forEach(visit);
  };

  const collectRows = (rows: unknown, estimateId: string | null, estimateLabel: string, nodeLabels: Map<string, string>) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const rowId = readString(row.id);
      if (!rowId) continue;
      if (estimateId) rowEstimateIds.set(rowId, estimateId);
      const nodeId = readString(row.nodeId) ?? readString(row.node_id);
      const label =
        (nodeId ? nodeLabels.get(nodeId) : null) ??
        readString(row.areaName) ??
        readString(row.area_name) ??
        readString(row.description) ??
        readString(row.material) ??
        estimateLabel;
      rowLabels.set(rowId, label);
    }
  };

  for (const estimate of snapshotJson.estimates) {
    if (!isRecord(estimate)) continue;
    const estimateId = readString(estimate.id);
    const estimateLabel = readString(estimate.name) ?? readString(estimate.sheetCode) ?? readString(estimate.sheet_code) ?? "Proposal";
    if (estimateId) estimateLabels.set(estimateId, estimateLabel);

    const nodeLabels = new Map<string, string>();
    collectNodeLabels(estimate.nodes, nodeLabels);
    collectNodeLabels(estimate.treeNodes, nodeLabels);
    collectNodeLabels(estimate.tree_nodes, nodeLabels);

    collectRows(estimate.rows, estimateId, estimateLabel, nodeLabels);

    if (Array.isArray(estimate.tabs)) {
      for (const tab of estimate.tabs) {
        if (!isRecord(tab)) continue;
        collectNodeLabels(tab.treeNodes, nodeLabels);
        collectNodeLabels(tab.tree_nodes, nodeLabels);
        collectRows(tab.rows, estimateId, estimateLabel, nodeLabels);
      }
    }
  }

  return { estimateLabels, rowLabels, rowEstimateIds };
}

function normalizeSharedLinkTargetKind(value: unknown, fallback: SharedLinkTargetKind): SharedLinkTargetKind {
  if (value === "row" || value === "estimate" || value === "proposal") return value;
  return fallback;
}

export function resolveSharedLinkStoredTargetMetadata(
  labels: TargetLabelMap,
  input: SharedLinkStoredTargetInput,
): {
  targetKind: SharedLinkTargetKind;
  targetLabel: string;
  targetSecondaryLabel?: string;
} {
  const fallbackKind: SharedLinkTargetKind = input.row_id ? "row" : input.estimate_id ? "estimate" : "proposal";
  const targetKind = normalizeSharedLinkTargetKind(input.target_kind, fallbackKind);
  const fallbackLabel = resolveSharedLinkTargetLabel(labels, input.row_id, input.estimate_id);
  const targetLabel =
    readString(input.target_label) ??
    fallbackLabel ??
    (targetKind === "row" ? "Selected line item" : targetKind === "estimate" ? "Selected estimate" : "the proposal");
  const targetSecondaryLabel =
    readString(input.target_secondary_label) ??
    (targetKind === "row" && input.estimate_id ? labels.estimateLabels.get(input.estimate_id) : undefined);

  return {
    targetKind,
    targetLabel,
    ...(targetSecondaryLabel ? { targetSecondaryLabel } : {}),
  };
}

export function validateSharedLinkReviewTarget(
  labels: TargetLabelMap,
  input: Pick<SharedLinkStoredTargetInput, "estimate_id" | "row_id">,
): { estimateId: string | null; rowId: string | null } {
  const estimateId = readString(input.estimate_id);
  const rowId = readString(input.row_id);

  if (estimateId && !labels.estimateLabels.has(estimateId)) {
    throw new Error("Invalid review target: selected estimate is not part of this publication.");
  }

  if (!rowId) {
    return { estimateId, rowId: null };
  }

  const rowEstimateId = labels.rowEstimateIds.get(rowId);
  if (!labels.rowLabels.has(rowId) || !rowEstimateId) {
    throw new Error("Invalid review target: selected line item is not part of this publication.");
  }

  if (estimateId && rowEstimateId !== estimateId) {
    throw new Error("Invalid review target: selected line item does not belong to the selected estimate.");
  }

  return { estimateId: estimateId ?? rowEstimateId, rowId };
}

function readStringRecordMap(value: unknown) {
  const labels = new Map<string, string>();
  if (!isRecord(value)) return labels;
  for (const [key, rawLabel] of Object.entries(value)) {
    const normalizedKey = readString(key);
    const label = readString(rawLabel);
    if (normalizedKey && label) labels.set(normalizedKey, label);
  }
  return labels;
}

export function createSharedLinkTargetLabelsJson(snapshotJson: Json | null | undefined): SharedLinkTargetLabelsJson {
  const labels = createSharedLinkTargetLabelMap(snapshotJson);
  return {
    estimateLabels: Object.fromEntries(labels.estimateLabels),
    rowLabels: Object.fromEntries(labels.rowLabels),
    rowEstimateIds: Object.fromEntries(labels.rowEstimateIds),
  };
}

export function createSharedLinkTargetLabelMapFromLabelsJson(labelsJson: Json | null | undefined): TargetLabelMap {
  if (!isRecord(labelsJson)) return { estimateLabels: new Map(), rowLabels: new Map(), rowEstimateIds: new Map() };
  return {
    estimateLabels: readStringRecordMap(labelsJson.estimateLabels),
    rowLabels: readStringRecordMap(labelsJson.rowLabels),
    rowEstimateIds: readStringRecordMap(labelsJson.rowEstimateIds),
  };
}

export function resolveSharedLinkTargetLabel(
  labels: TargetLabelMap,
  rowId: string | null | undefined,
  estimateId: string | null | undefined,
): string | undefined {
  if (rowId && labels.rowLabels.has(rowId)) return labels.rowLabels.get(rowId);
  if (estimateId && labels.estimateLabels.has(estimateId)) return labels.estimateLabels.get(estimateId);
  return undefined;
}

export type SharedLinkActivityCursor = {
  createdAt: string;
  id: string;
};

export type SharedLinkActivitySortable = {
  created_at: string;
  id: string;
};

const activityCursorPrefix = "shared-link-activity-cursor-v2";

type SharedLinkActivityCursorParseResult =
  | { ok: true; cursor: SharedLinkActivityCursor | null }
  | { ok: false; error: string };

function deriveActivityCursorKey() {
  return createHash("sha256")
    .update(`${readPublicationTokenEncryptionSecret()}:shared-link-activity-cursor`)
    .digest();
}

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function normalizeSharedLinkActivityCursor(value: Partial<SharedLinkActivityCursor>): SharedLinkActivityCursor | null {
  if (typeof value.createdAt !== "string" || typeof value.id !== "string") return null;
  if (Number.isNaN(new Date(value.createdAt).getTime()) || !value.id.trim()) return null;
  return { createdAt: value.createdAt, id: value.id };
}

function decodeLegacySharedLinkActivityCursor(value: string): SharedLinkActivityCursor | null {
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SharedLinkActivityCursor>;
  return normalizeSharedLinkActivityCursor(parsed);
}

export function encodeSharedLinkActivityCursor(item: SharedLinkActivitySortable): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveActivityCursorKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ createdAt: item.created_at, id: item.id }), "utf8"),
    cipher.final(),
  ]);
  return `${activityCursorPrefix}:${toBase64Url(iv)}:${toBase64Url(cipher.getAuthTag())}:${toBase64Url(encrypted)}`;
}

export function parseSharedLinkActivityCursor(value: string | null | undefined): SharedLinkActivityCursorParseResult {
  if (!value) return { ok: true, cursor: null };
  if (!value.startsWith(`${activityCursorPrefix}:`)) {
    try {
      const cursor = decodeLegacySharedLinkActivityCursor(value);
      return cursor ? { ok: true, cursor } : { ok: false, error: "Activity cursor is invalid." };
    } catch {
      return { ok: false, error: "Activity cursor is invalid." };
    }
  }

  const parts = value.split(":");
  if (parts.length !== 4) return { ok: false, error: "Activity cursor is invalid." };
  const [, iv, tag, encrypted] = parts;
  if (!iv || !tag || !encrypted) return { ok: false, error: "Activity cursor is invalid." };

  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveActivityCursorKey(), fromBase64Url(iv));
    decipher.setAuthTag(fromBase64Url(tag));
    const payload = Buffer.concat([decipher.update(fromBase64Url(encrypted)), decipher.final()]).toString("utf8");
    const cursor = normalizeSharedLinkActivityCursor(JSON.parse(payload) as Partial<SharedLinkActivityCursor>);
    return cursor ? { ok: true, cursor } : { ok: false, error: "Activity cursor is invalid." };
  } catch {
    return { ok: false, error: "Activity cursor is invalid." };
  }
}

export function decodeSharedLinkActivityCursor(value: string | null | undefined): SharedLinkActivityCursor | null {
  const parsed = parseSharedLinkActivityCursor(value);
  return parsed.ok ? parsed.cursor : null;
}

export function compareSharedLinkActivityDesc(a: SharedLinkActivitySortable, b: SharedLinkActivitySortable) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function isBeforeSharedLinkActivityCursor(item: SharedLinkActivitySortable, cursor: SharedLinkActivityCursor | null) {
  if (!cursor) return true;
  if (item.created_at < cursor.createdAt) return true;
  if (item.created_at === cursor.createdAt && item.id < cursor.id) return true;
  return false;
}

export function sharedLinkActivityCursorFilter(cursor: SharedLinkActivityCursor | null) {
  if (!cursor) return null;
  const createdAt = cursor.createdAt.replaceAll('"', "");
  const id = cursor.id.replaceAll('"', "");
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`;
}

export type ProjectPublicationAccessTelemetryMetricInput = {
  accessStage?: string | null;
  bot?: boolean | null;
};

export function summarizeProjectPublicationAccessTelemetryMetrics(events: ProjectPublicationAccessTelemetryMetricInput[]) {
  const byStage: Record<string, number> = {};
  let bot = 0;
  for (const event of events) {
    const stage = event.accessStage?.trim() || "unknown";
    byStage[stage] = (byStage[stage] ?? 0) + 1;
    if (event.bot) bot += 1;
  }
  return { total: events.length, bot, human: events.length - bot, byStage };
}
