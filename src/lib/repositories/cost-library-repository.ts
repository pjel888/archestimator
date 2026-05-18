import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserEnv, type Tables, type TablesInsert, type TablesUpdate } from "@/lib/supabase/types";

export type CostLibraryItem = Tables<"cost_library_items">;
export type CreateCostLibraryItemInput = TablesInsert<"cost_library_items">;
export type UpdateCostLibraryItemInput = TablesUpdate<"cost_library_items">;

type CostLibraryRepository = {
  listCostLibraryItems(workspaceId: string): Promise<CostLibraryItem[]>;
  createCostLibraryItem(input: CreateCostLibraryItemInput): Promise<CostLibraryItem>;
  updateCostLibraryItem(id: string, input: UpdateCostLibraryItemInput): Promise<CostLibraryItem>;
};

const inMemoryCostLibraryItems = new Map<string, CostLibraryItem>();

const inMemoryCostLibraryRepository: CostLibraryRepository = {
  async listCostLibraryItems(workspaceId) {
    return Array.from(inMemoryCostLibraryItems.values())
      .filter((item) => item.workspace_id === workspaceId)
      .sort((a, b) => a.description.localeCompare(b.description));
  },

  async createCostLibraryItem(input) {
    const now = new Date().toISOString();
    const item = {
      brand: null,
      confidence: null,
      created_at: now,
      created_by: null,
      discipline: null,
      id: globalThis.crypto.randomUUID(),
      labor_cost: 0,
      metadata: {},
      productivity_unit: null,
      specification: null,
      supplementary_cost: 0,
      supplier: null,
      tags: [],
      unit_cost: 0,
      updated_at: now,
      ...input,
    } as CostLibraryItem;
    inMemoryCostLibraryItems.set(item.id, item);
    return item;
  },

  async updateCostLibraryItem(id, input) {
    const current = inMemoryCostLibraryItems.get(id);
    if (!current) throw new Error("Cost library item not found.");
    const next = { ...current, ...input, updated_at: new Date().toISOString() } as CostLibraryItem;
    inMemoryCostLibraryItems.set(id, next);
    return next;
  },
};

const supabaseCostLibraryRepository: CostLibraryRepository = {
  async listCostLibraryItems(workspaceId) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("cost_library_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("description", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async createCostLibraryItem(input) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("cost_library_items").insert(input).select("*").single();
    if (error) throw error;
    return data;
  },

  async updateCostLibraryItem(id, input) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("cost_library_items").update(input).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  },
};

export const costLibraryRepository: CostLibraryRepository = hasSupabaseBrowserEnv()
  ? supabaseCostLibraryRepository
  : inMemoryCostLibraryRepository;
