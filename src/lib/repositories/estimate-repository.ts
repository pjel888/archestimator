import type { EstimateNode, EstimateNodeKind, EstimateRowItem, EstimateTree } from "@/lib/domain/estimate-tree";
import { readEstimateRowMetadata } from "@/lib/estimates/express-components";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserEnv } from "@/lib/supabase/env";
import { type Tables } from "@/lib/supabase/types";

export type EstimateRepository = {
  getEstimateTree(estimateId: string): Promise<EstimateTree>;
  getEstimateTabTree(estimateId: string, tabId: string): Promise<EstimateTree>;
};

type EstimateNodeRow = Pick<Tables<"estimate_nodes">, "id" | "estimate_id" | "parent_id" | "kind" | "name" | "sort_order"> & {
  estimate_tab_id?: string | null;
};
type EstimateRowItemRow = Pick<
  Tables<"estimate_row_items">,
  | "description"
  | "designation"
  | "discipline"
  | "estimate_id"
  | "id"
  | "link_state"
  | "material"
  | "metadata"
  | "contingency_percentage"
  | "adjustment_percentage"
  | "misc_cost"
  | "node_id"
  | "quantity"
  | "quantity_base"
  | "quantity_contingency_amount"
  | "row_revision"
  | "sort_order"
  | "source_library_item_id"
  | "source_snapshot"
  | "supplier"
  | "unit"
  | "unit_cost"
>;

const ESTIMATE_NODE_SELECT = "id, estimate_id, parent_id, kind, name, sort_order";
const ESTIMATE_ROW_ITEM_SELECT = "id, estimate_id, node_id, sort_order, source_library_item_id, source_snapshot, metadata, material, description, supplier, unit, quantity, quantity_base, quantity_contingency_amount, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, row_revision, discipline, designation, link_state";

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
    supplier: row.supplier,
    unit: row.unit,
    quantity: Number(row.quantity),
    quantityBase: row.quantity_base === null ? null : Number(row.quantity_base),
    quantityContingencyAmount: row.quantity_base === null ? null : Number(row.quantity_contingency_amount ?? 0),
    unitCost: Number(row.unit_cost),
    contingencyPercentage: Number(row.contingency_percentage),
    adjustmentPercentage: Number(row.adjustment_percentage ?? 0),
    miscCost: Number(row.misc_cost),
    rowRevision: row.row_revision,
    discipline: row.discipline,
    designation: row.designation,
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

const supabaseEstimateRepository: EstimateRepository = {
  async getEstimateTree(estimateId) {
    const supabase = createSupabaseBrowserClient();
    const [nodesResult, rowsResult] = await Promise.all([
      supabase
        .from("estimate_nodes")
        .select(ESTIMATE_NODE_SELECT)
        .eq("estimate_id", estimateId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("estimate_row_items")
        .select(ESTIMATE_ROW_ITEM_SELECT)
        .eq("estimate_id", estimateId)
        .order("sort_order", { ascending: true }),
    ]);

    if (nodesResult.error) throw nodesResult.error;
    if (rowsResult.error) throw rowsResult.error;

    return {
      nodes: (nodesResult.data ?? []).flatMap((row) => {
        const node = toEstimateNode(row);
        return node ? [node] : [];
      }),
      rows: (rowsResult.data ?? []).map(toEstimateRowItem),
    };
  },

  async getEstimateTabTree(estimateId, tabId) {
    const supabase = createSupabaseBrowserClient();
    const nodesQuery = supabase
      .from("estimate_nodes")
      .select(`${ESTIMATE_NODE_SELECT}, estimate_tab_id`)
      .eq("estimate_id", estimateId);
    const nodesResult = await (nodesQuery as unknown as { eq: (column: string, value: string) => typeof nodesQuery })
      .eq("estimate_tab_id", tabId)
      .order("sort_order", { ascending: true });

    if (nodesResult.error) throw nodesResult.error;

    const nodes = ((nodesResult.data ?? []) as unknown as EstimateNodeRow[]).flatMap((row) => {
      const node = toEstimateNode(row);
      return node ? [node] : [];
    });
    const nodeIds = nodes.map((node) => node.id);
    if (nodeIds.length === 0) return { nodes, rows: [] };

    const rowsResult = await supabase
      .from("estimate_row_items")
      .select(ESTIMATE_ROW_ITEM_SELECT)
      .in("node_id", nodeIds)
      .order("sort_order", { ascending: true });
    if (rowsResult.error) throw rowsResult.error;

    return {
      nodes,
      rows: (rowsResult.data ?? []).map(toEstimateRowItem),
    };
  },
};

export const estimateRepository: EstimateRepository = hasSupabaseBrowserEnv() ? supabaseEstimateRepository : inMemoryEstimateRepository;
