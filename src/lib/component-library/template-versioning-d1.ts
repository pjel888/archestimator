import "server-only";

import { createMutationRequestFingerprint } from "@/lib/estimates/mutation-receipts";
import type {
  EstimateTemplateVersionSnapshot,
  EstimateTemplateVersionSnapshotNode,
  EstimateTemplateVersionSnapshotRow,
} from "@/lib/component-library/template-link-types";

export const ESTIMATE_TEMPLATE_LINK_PAYLOAD_MAX_BYTES = 1_500_000;

type TemplateSnapshotHeader = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type TemplateSnapshotNodeRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number | string | null;
  metadata: unknown;
};

type TemplateSnapshotRowItemRow = {
  id: string;
  template_node_id: string;
  sort_order: number | string | null;
  source_library_item_id: string | null;
  source_snapshot: unknown;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string | null;
  description: string | null;
  supplier: string | null;
  unit: string | null;
  quantity: number | string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  discipline: string | null;
  designation: string | null;
  link_state: string | null;
  metadata: unknown;
};

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return readRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function buildSnapshotNode(node: TemplateSnapshotNodeRow): EstimateTemplateVersionSnapshotNode {
  if (node.kind !== "group" && node.kind !== "area") {
    throw new Error("Estimate Template contains an unsupported node kind.");
  }
  return {
    id: node.id,
    parentId: node.parent_id,
    kind: node.kind,
    name: node.name,
    sortOrder: readNumber(node.sort_order),
    metadata: readRecord(node.metadata),
  };
}

function buildSnapshotRow(row: TemplateSnapshotRowItemRow): EstimateTemplateVersionSnapshotRow {
  const sourceSnapshot = readRecord(row.source_snapshot);
  const initialTakeoffDefaults = {
    quantity: readNumber(row.quantity),
    contingencyPercentage: readNumber(row.contingency_percentage),
    adjustmentPercentage: readNumber(row.adjustment_percentage),
  };
  if (row.source_library_item_id && row.link_state !== "unlinked" && row.link_state !== "detached") {
    return {
      id: row.id,
      rowKind: "component",
      templateNodeId: row.template_node_id,
      sortOrder: readNumber(row.sort_order),
      sourceLibraryItemId: row.source_library_item_id,
      selectedVariantId: readOptionalString(sourceSnapshot.priceOptionId),
      initialTakeoffDefaults,
    };
  }
  return {
    id: row.id,
    rowKind: "custom",
    templateNodeId: row.template_node_id,
    sortOrder: readNumber(row.sort_order),
    material: row.material ?? "",
    description: row.description ?? "",
    supplier: row.supplier ?? "",
    supplierId: row.supplier_id,
    unit: row.unit ?? "unit",
    unitCost: readNumber(row.unit_cost),
    miscCost: readNumber(row.misc_cost),
    categoryNodeId: row.category_node_id,
    discipline: row.discipline ?? "",
    designation: row.designation ?? "",
    sourceSnapshot,
    metadata: readRecord(row.metadata),
    initialTakeoffDefaults,
  };
}

export function buildEstimateTemplateVersionSnapshot(input: {
  template: TemplateSnapshotHeader;
  nodes: TemplateSnapshotNodeRow[];
  rows: TemplateSnapshotRowItemRow[];
}) {
  const snapshot: EstimateTemplateVersionSnapshot = {
    schemaVersion: 1,
    template: {
      id: input.template.id,
      name: input.template.name,
      description: input.template.description,
      category: input.template.category,
    },
    nodes: [...input.nodes]
      .sort((left, right) => readNumber(left.sort_order) - readNumber(right.sort_order) || left.id.localeCompare(right.id))
      .map(buildSnapshotNode),
    rows: [...input.rows]
      .sort((left, right) => readNumber(left.sort_order) - readNumber(right.sort_order) || left.id.localeCompare(right.id))
      .map(buildSnapshotRow),
  };
  const serializedSnapshot = JSON.stringify(snapshot);
  const snapshotBytes = new TextEncoder().encode(serializedSnapshot).byteLength;
  if (snapshotBytes > ESTIMATE_TEMPLATE_LINK_PAYLOAD_MAX_BYTES) {
    const error = new Error("template_snapshot_too_large") as Error & { code: string; sizeBytes: number };
    error.code = "template_snapshot_too_large";
    error.sizeBytes = snapshotBytes;
    throw error;
  }
  return {
    snapshot,
    serializedSnapshot,
    sourceFingerprint: createMutationRequestFingerprint(snapshot),
    snapshotBytes,
  };
}

export function assertEstimateTemplateLinkPayloadSize(value: unknown) {
  const sizeBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (sizeBytes > ESTIMATE_TEMPLATE_LINK_PAYLOAD_MAX_BYTES) {
    const error = new Error("template_link_payload_too_large") as Error & { code: string; sizeBytes: number };
    error.code = "template_link_payload_too_large";
    error.sizeBytes = sizeBytes;
    throw error;
  }
  return sizeBytes;
}
