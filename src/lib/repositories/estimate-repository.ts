import { moveEstimateNode as moveTreeNode, moveEstimateRowItem as moveTreeRowItem, type MoveEstimateNodeInput, type MoveEstimateRowItemInput } from "@/lib/domain/estimate-mutations";
import type { EstimateNode, EstimateRowItem, EstimateTree } from "@/lib/domain/estimate-tree";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserEnv, type Json, type Tables, type TablesInsert } from "@/lib/supabase/types";

export type InsertEstimateRowItemInput = Omit<EstimateRowItem, "id" | "estimateId"> & { id?: string };
export type UpdateEstimateRowItemInput = Partial<Omit<EstimateRowItem, "id" | "estimateId">>;

export type EstimateRepository = {
  getEstimateTree(estimateId: string): Promise<EstimateTree>;
  moveEstimateNode(estimateId: string, input: MoveEstimateNodeInput): Promise<EstimateTree>;
  moveEstimateRowItem(estimateId: string, input: MoveEstimateRowItemInput): Promise<EstimateTree>;
  insertEstimateRowItem(estimateId: string, input: InsertEstimateRowItemInput): Promise<EstimateTree>;
  updateEstimateRowItem(estimateId: string, rowId: string, input: UpdateEstimateRowItemInput): Promise<EstimateTree>;
  deleteEstimateRowItem(estimateId: string, rowId: string): Promise<EstimateTree>;
};

type EstimateNodeRow = Tables<"estimate_nodes">;
type EstimateRowItemRow = Tables<"estimate_row_items">;

const inMemoryTrees = new Map<string, EstimateTree>();

function getEmptyEstimateTree(): EstimateTree {
  return { nodes: [], rows: [] };
}

function toEstimateNode(row: EstimateNodeRow): EstimateNode {
  return {
    id: row.id,
    estimateId: row.estimate_id,
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
    sourceSnapshot: row.source_snapshot && typeof row.source_snapshot === "object" && !Array.isArray(row.source_snapshot) ? row.source_snapshot : null,
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    supplementaryCost: Number(row.supplementary_cost),
    laborCost: Number(row.labor_cost),
    discipline: row.discipline,
    designation: row.designation,
    linkState: row.link_state,
  };
}

function toEstimateNodeUpdate(node: EstimateNode): TablesInsert<"estimate_nodes"> {
  return {
    id: node.id,
    estimate_id: node.estimateId,
    parent_id: node.parentId,
    kind: node.kind,
    name: node.name,
    sort_order: node.sortOrder,
  };
}

function toEstimateRowItemUpdate(row: EstimateRowItem): TablesInsert<"estimate_row_items"> {
  return {
    id: row.id,
    estimate_id: row.estimateId,
    node_id: row.nodeId,
    sort_order: row.sortOrder,
    source_library_item_id: row.sourceLibraryItemId,
    source_snapshot: row.sourceSnapshot as Json | null,
    material: row.material,
    description: row.description,
    supplier: row.supplier,
    unit: row.unit,
    quantity: row.quantity,
    unit_cost: row.unitCost,
    supplementary_cost: row.supplementaryCost,
    labor_cost: row.laborCost,
    discipline: row.discipline,
    designation: row.designation,
    link_state: row.linkState,
  };
}

const inMemoryEstimateRepository: EstimateRepository = {
  async getEstimateTree(estimateId) {
    return inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
  },

  async moveEstimateNode(estimateId, input) {
    const current = inMemoryTrees.get(estimateId) ?? getEmptyEstimateTree();
    const next = moveTreeNode(current, input);
    inMemoryTrees.set(estimateId, next);
    return next;
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
        .select("*")
        .eq("estimate_id", estimateId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("estimate_row_items")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("sort_order", { ascending: true }),
    ]);

    if (nodesResult.error) throw nodesResult.error;
    if (rowsResult.error) throw rowsResult.error;

    return {
      nodes: (nodesResult.data ?? []).map(toEstimateNode),
      rows: (rowsResult.data ?? []).map(toEstimateRowItem),
    };
  },

  async moveEstimateNode(estimateId, input) {
    const current = await this.getEstimateTree(estimateId);
    const next = moveTreeNode(current, input);
    const movedNode = next.nodes.find((node) => node.id === input.nodeId);
    if (!movedNode) throw new Error("Estimate node not found after move.");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("estimate_nodes").upsert(toEstimateNodeUpdate(movedNode));
    if (error) throw error;

    return next;
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
