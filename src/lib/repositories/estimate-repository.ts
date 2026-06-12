import { moveEstimateRowItem as moveTreeRowItem, type MoveEstimateRowItemInput } from "@/lib/domain/estimate-mutations";
import type { EstimateNode, EstimateNodeKind, EstimateRowItem, EstimateTree } from "@/lib/domain/estimate-tree";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserEnv, type Json, type Tables, type TablesInsert } from "@/lib/supabase/types";

export type InsertEstimateRowItemInput = Omit<EstimateRowItem, "id" | "estimateId"> & { id?: string };
export type UpdateEstimateRowItemInput = Partial<Omit<EstimateRowItem, "id" | "estimateId">>;

export type EstimateRepository = {
  getEstimateTree(estimateId: string): Promise<EstimateTree>;
  getEstimateTabTree(estimateId: string, tabId: string): Promise<EstimateTree>;
  moveEstimateRowItem(estimateId: string, input: MoveEstimateRowItemInput): Promise<EstimateTree>;
  insertEstimateRowItem(estimateId: string, input: InsertEstimateRowItemInput): Promise<EstimateTree>;
  updateEstimateRowItem(estimateId: string, rowId: string, input: UpdateEstimateRowItemInput): Promise<EstimateTree>;
  deleteEstimateRowItem(estimateId: string, rowId: string): Promise<EstimateTree>;
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
  | "contingency_percentage"
  | "misc_cost"
  | "node_id"
  | "quantity"
  | "row_revision"
  | "sort_order"
  | "source_library_item_id"
  | "source_snapshot"
  | "supplier"
  | "unit"
  | "unit_cost"
>;

const ESTIMATE_NODE_SELECT = "id, estimate_id, parent_id, kind, name, sort_order";
const ESTIMATE_ROW_ITEM_SELECT = "id, estimate_id, node_id, sort_order, source_library_item_id, source_snapshot, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, misc_cost, row_revision, discipline, designation, link_state";

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
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    contingencyPercentage: Number(row.contingency_percentage),
    miscCost: Number(row.misc_cost),
    rowRevision: row.row_revision,
    discipline: row.discipline,
    designation: row.designation,
    linkState: row.link_state,
  };
}

function toEstimateRowItemUpdate(row: EstimateRowItem): TablesInsert<"estimate_row_items"> {
  return {
    id: row.id,
    estimate_id: row.estimateId,
    node_id: row.nodeId,
    sort_order: row.sortOrder,
    source_library_item_id: row.sourceLibraryItemId,
    source_snapshot: sanitizeEstimateRowSourceSnapshot(row.sourceSnapshot) as Json | null,
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: row.quantity,
    unit_cost: row.unitCost,
    contingency_percentage: row.contingencyPercentage ?? 0,
    misc_cost: row.miscCost,
    discipline: row.discipline,
    designation: row.designation,
    link_state: row.linkState,
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

  async moveEstimateRowItem(estimateId, input) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const next = moveTreeRowItem(current, input);
    inMemoryTrees.set(estimateId, next);
    return next;
  },

  async insertEstimateRowItem(estimateId, input) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const row: EstimateRowItem = { ...input, id: input.id ?? globalThis.crypto.randomUUID(), estimateId };
    const next = { ...current, rows: [...current.rows, row].sort((a, b) => a.sortOrder - b.sortOrder) };
    inMemoryTrees.set(estimateId, next);
    return next;
  },

  async updateEstimateRowItem(estimateId, rowId, input) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const next = { ...current, rows: current.rows.map((row) => (row.id === rowId ? { ...row, ...input } : row)) };
    inMemoryTrees.set(estimateId, next);
    return next;
  },

  async deleteEstimateRowItem(estimateId, rowId) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const next = { ...current, rows: current.rows.filter((row) => row.id !== rowId) };
    inMemoryTrees.set(estimateId, next);
    return next;
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

  async moveEstimateRowItem(estimateId, input) {
    const current = await this.getEstimateTree(estimateId);
    const next = moveTreeRowItem(current, input);
    const movedRow = next.rows.find((row) => row.id === input.rowId);
    if (!movedRow) throw new Error("Estimate row item not found after move.");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("estimate_row_items").upsert(toEstimateRowItemUpdate(movedRow));
    if (error) throw error;

    return next;
  },

  async insertEstimateRowItem(estimateId, input) {
    const supabase = createSupabaseBrowserClient();
    const row: EstimateRowItem = { ...input, id: input.id ?? globalThis.crypto.randomUUID(), estimateId };
    const { error } = await supabase.from("estimate_row_items").insert(toEstimateRowItemUpdate(row));
    if (error) throw error;
    return this.getEstimateTree(estimateId);
  },

  async updateEstimateRowItem(estimateId, rowId, input) {
    const current = await this.getEstimateTree(estimateId);
    const currentRow = current.rows.find((row) => row.id === rowId);
    if (!currentRow) throw new Error("Estimate row item not found for update.");
    const nextRow: EstimateRowItem = { ...currentRow, ...input };
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("estimate_row_items").upsert(toEstimateRowItemUpdate(nextRow));
    if (error) throw error;
    return this.getEstimateTree(estimateId);
  },

  async deleteEstimateRowItem(estimateId, rowId) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("estimate_row_items").delete().eq("id", rowId).eq("estimate_id", estimateId);
    if (error) throw error;
    return this.getEstimateTree(estimateId);
  },
};

export const estimateRepository: EstimateRepository = hasSupabaseBrowserEnv() ? supabaseEstimateRepository : inMemoryEstimateRepository;
