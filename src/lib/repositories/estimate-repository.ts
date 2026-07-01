import type { EstimateNode, EstimateNodeKind, EstimateRowItem, EstimateTree } from "@/lib/domain/estimate-tree";
import { readEstimateRowMetadata } from "@/lib/estimates/express-components";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";

export type EstimateRepository = {
  getEstimateTree(estimateId: string): Promise<EstimateTree>;
  getEstimateTabTree(estimateId: string, tabId: string): Promise<EstimateTree>;
};

type EstimateNodeRow = {
  estimate_id: string;
  estimate_tab_id?: string | null;
  id: string;
  kind: string | null;
  name: string;
  parent_id: string | null;
  sort_order: number;
};
type EstimateRowItemRow = {
  adjustment_percentage: number | string | null;
  contingency_percentage: number | string | null;
  description: string;
  designation: string | null;
  discipline: string | null;
  estimate_id: string;
  id: string;
  link_state: EstimateRowItem["linkState"];
  material: string;
  metadata: unknown;
  misc_cost: number | string | null;
  node_id: string;
  quantity: number | string | null;
  quantity_base: number | string | null;
  quantity_contingency_amount: number | string | null;
  row_revision: number;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot: unknown;
  supplier: string | null;
  unit: string | null;
  unit_cost: number | string | null;
};

const inMemoryTrees = new Map<string, EstimateTree>();

function getEmptyEstimateTree(): EstimateTree {
  return { nodes: [], rows: [] };
}

function isActiveEstimateNodeKind(kind: EstimateNodeRow["kind"]): kind is EstimateNodeKind {
  return kind === "group" || kind === "area";
}

function toEstimateNode(row: EstimateNodeRow): EstimateNode | null {
  if (!isActiveEstimateNodeKind(row.kind)) return null;

  return {
    id: row.id,
    estimateId: row.estimate_id,
    estimateTabId: row.estimate_tab_id ?? null,
    parentId: row.parent_id,
    kind: row.kind,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function toEstimateRowItem(row: EstimateRowItemRow): EstimateRowItem {
  return {
    id: row.id,
    estimateId: row.estimate_id,
    nodeId: row.node_id,
    sortOrder: row.sort_order,
    sourceLibraryItemId: row.source_library_item_id,
    sourceSnapshot: sanitizeEstimateRowSourceSnapshot(row.source_snapshot),
    metadata: readEstimateRowMetadata(row.metadata),
    material: row.material,
    description: row.description,
    supplier: row.supplier ?? "",
    unit: row.unit ?? "",
    quantity: Number(row.quantity),
    quantityBase: row.quantity_base === null ? null : Number(row.quantity_base),
    quantityContingencyAmount: row.quantity_base === null ? null : Number(row.quantity_contingency_amount ?? 0),
    unitCost: Number(row.unit_cost),
    contingencyPercentage: Number(row.contingency_percentage),
    adjustmentPercentage: Number(row.adjustment_percentage ?? 0),
    miscCost: Number(row.misc_cost),
    rowRevision: row.row_revision,
    discipline: row.discipline ?? "",
    designation: row.designation ?? "",
    linkState: row.link_state,
  };
}

const inMemoryEstimateRepository: EstimateRepository = {
  async getEstimateTree(estimateId) {
    return inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
  },

  async getEstimateTabTree(estimateId, tabId) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const nodes = current.nodes.filter((node) => !node.estimateTabId || node.estimateTabId === tabId);
    const nodeIds = new Set(nodes.map((node) => node.id));
    return { nodes, rows: current.rows.filter((row) => nodeIds.has(row.nodeId)) };
  },
};

export const estimateRepository: EstimateRepository = inMemoryEstimateRepository;
