import type { Json } from "@/lib/supabase/types";

type RecipientIdentityRow = {
  id: string;
  display_name: string | null;
};

type TargetLabelMap = {
  estimateLabels: Map<string, string>;
  rowLabels: Map<string, string>;
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
  if (!isRecord(snapshotJson) || !Array.isArray(snapshotJson.estimates)) return { estimateLabels, rowLabels };

  for (const estimate of snapshotJson.estimates) {
    if (!isRecord(estimate)) continue;
    const estimateId = readString(estimate.id);
    const estimateLabel = readString(estimate.name) ?? readString(estimate.sheetCode) ?? readString(estimate.sheet_code) ?? "Proposal";
    if (estimateId) estimateLabels.set(estimateId, estimateLabel);

    const nodeLabels = new Map<string, string>();
    if (Array.isArray(estimate.nodes)) {
      for (const node of estimate.nodes) {
        if (!isRecord(node)) continue;
        const nodeId = readString(node.id);
        const nodeLabel = readString(node.name);
        if (nodeId && nodeLabel) nodeLabels.set(nodeId, nodeLabel);
      }
    }

    if (Array.isArray(estimate.rows)) {
      for (const row of estimate.rows) {
        if (!isRecord(row)) continue;
        const rowId = readString(row.id);
        if (!rowId) continue;
        const nodeId = readString(row.nodeId) ?? readString(row.node_id);
        const label =
          (nodeId ? nodeLabels.get(nodeId) : null) ??
          readString(row.areaName) ??
          readString(row.area_name) ??
          readString(row.material) ??
          readString(row.description) ??
          estimateLabel;
        rowLabels.set(rowId, label);
      }
    }
  }

  return { estimateLabels, rowLabels };
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

export function encodeSharedLinkActivityCursor(item: SharedLinkActivitySortable): string {
  return Buffer.from(JSON.stringify({ createdAt: item.created_at, id: item.id }), "utf8").toString("base64url");
}

export function decodeSharedLinkActivityCursor(value: string | null | undefined): SharedLinkActivityCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SharedLinkActivityCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") return null;
    if (Number.isNaN(new Date(parsed.createdAt).getTime()) || !parsed.id.trim()) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
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
