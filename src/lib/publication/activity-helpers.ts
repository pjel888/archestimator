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
