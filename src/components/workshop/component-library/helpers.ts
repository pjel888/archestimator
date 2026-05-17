import type { EstimateRowItem } from "../estimate-tree-data";
import type { ComponentFilters, LibraryGroupBy, LibrarySortMode, NewComponentForm, SearchResult } from "./types";

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const componentImageFallbacks: Record<string, string> = {
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  cabinetry: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80",
  finishes: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
  "wall paints / interior finishes": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
  "electrical fixtures": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  "lighting fixtures": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=600&q=80",
  "plumbing fixtures": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80",
  "kitchen fixtures": "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=600&q=80",
  outdoor: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
};

export function getComponentImageUrl(item: EstimateRowItem) {
  if (item.imageUrl) return item.imageUrl;
  const category = item.category?.toLowerCase();
  if (category && componentImageFallbacks[category]) return componentImageFallbacks[category];
  const material = item.material.toLowerCase();
  if (material.includes("paint") || material.includes("skimcoat") || material.includes("wallpaper")) return componentImageFallbacks["wall paints / interior finishes"];
  if (material.includes("light") || material.includes("outlet") || material.includes("switch") || material.includes("led")) return componentImageFallbacks["electrical fixtures"];
  if (material.includes("toilet") || material.includes("lavatory") || material.includes("vanity") || material.includes("sink")) return componentImageFallbacks["plumbing fixtures"];
  if (material.includes("tile") || material.includes("floor")) return componentImageFallbacks.finishes;
  if (material.includes("wardrobe") || material.includes("cabinet")) return componentImageFallbacks.cabinetry;
  return componentImageFallbacks.furniture;
}

export function getComponentName(item: EstimateRowItem) {
  return item.name ?? item.material;
}

export function getComponentPrice(item: EstimateRowItem) {
  return item.price ?? item.itemCost;
}

export function getComponentDiscipline(item: EstimateRowItem) {
  return (
    item.discipline ??
    (item.category?.includes("Electrical") || item.category?.includes("Lighting")
      ? "Electrical"
      : item.category?.includes("Plumbing") || item.category?.includes("Kitchen")
        ? "Plumbing"
        : item.category === "Furniture"
          ? "Furniture"
          : "Architectural")
  );
}

export function getComponentDesignation(item: EstimateRowItem) {
  return (
    item.designation ??
    (getComponentName(item).toLowerCase().includes("light")
      ? "Ceiling"
      : getComponentName(item).toLowerCase().includes("wall")
        ? "Wall"
        : "Floor")
  );
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export function itemCreatedAt(item: EstimateRowItem) {
  return item.createdAt ?? item.pricingDate ?? "2026-05-17";
}

export function itemLastUsedAt(item: EstimateRowItem, recentIds: string[]) {
  return item.lastUsedAt ?? (recentIds.includes(item.id) ? new Date().toISOString() : "");
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function normalizeForSearch(value: string) {
  return value.toLowerCase().trim();
}

export function searchComponents(items: EstimateRowItem[], query: string): SearchResult[] {
  const q = normalizeForSearch(query);
  if (!q) return items.map((item, index) => ({ item, score: 0, index }));
  return items
    .map((item, index) => {
      const name = normalizeForSearch(getComponentName(item));
      const supplier = normalizeForSearch(item.supplier ?? "");
      const category = normalizeForSearch(item.category ?? "");
      const description = normalizeForSearch(item.description ?? "");
      const tags = normalizeForSearch((item.tags ?? []).join(" "));
      const discipline = normalizeForSearch(getComponentDiscipline(item));
      const designation = normalizeForSearch(getComponentDesignation(item));
      const unit = normalizeForSearch(item.unit ?? "");
      const notes = normalizeForSearch(item.notes ?? item.pricingSource ?? "");
      let score = -1;
      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 800;
      else if (name.includes(q)) score = 650;
      else if (supplier.includes(q) || category.includes(q)) score = 520;
      else if (discipline.includes(q) || designation.includes(q) || unit.includes(q)) score = 430;
      else if (description.includes(q) || tags.includes(q) || notes.includes(q)) score = 300;
      return { item, score, index };
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

export function filterComponents(
  items: EstimateRowItem[],
  filters: ComponentFilters,
  favoriteIds: string[] = [],
  recentIds: string[] = [],
) {
  const minPrice = filters.minPrice ? Number(filters.minPrice) : Number.NEGATIVE_INFINITY;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : Number.POSITIVE_INFINITY;
  return items.filter((item) => {
    const price = getComponentPrice(item);
    if (filters.categories.length && !filters.categories.includes(item.category)) return false;
    if (filters.suppliers.length && !filters.suppliers.includes(item.supplier)) return false;
    if (filters.disciplines.length && !filters.disciplines.includes(getComponentDiscipline(item))) return false;
    if (filters.designations.length && !filters.designations.includes(getComponentDesignation(item))) return false;
    if (filters.units.length && !filters.units.includes(item.unit)) return false;
    if (price < minPrice || price > maxPrice) return false;
    if (filters.favoritesOnly && !favoriteIds.includes(item.id) && !item.isFavorite) return false;
    if (filters.recentOnly && !recentIds.includes(item.id) && !item.lastUsedAt) return false;
    if (filters.customOnly && !item.isCustom) return false;
    if (filters.imageState === "has" && !item.imageUrl) return false;
    if (filters.imageState === "none" && item.imageUrl) return false;
    if (filters.supplierState === "has" && !item.supplier) return false;
    if (filters.supplierState === "none" && item.supplier) return false;
    return true;
  });
}

export function sortComponents(results: SearchResult[], sortMode: LibrarySortMode, recentIds: string[] = []) {
  const sorted = [...results];
  sorted.sort((a, b) => {
    if (sortMode === "relevance") return b.score - a.score || a.index - b.index;
    if (sortMode === "name") return getComponentName(a.item).localeCompare(getComponentName(b.item));
    if (sortMode === "priceAsc") return getComponentPrice(a.item) - getComponentPrice(b.item);
    if (sortMode === "priceDesc") return getComponentPrice(b.item) - getComponentPrice(a.item);
    if (sortMode === "supplier") return (a.item.supplier ?? "").localeCompare(b.item.supplier ?? "") || getComponentName(a.item).localeCompare(getComponentName(b.item));
    if (sortMode === "recentUsed") return (itemLastUsedAt(b.item, recentIds) || "").localeCompare(itemLastUsedAt(a.item, recentIds) || "");
    if (sortMode === "recentAdded") return itemCreatedAt(b.item).localeCompare(itemCreatedAt(a.item));
    return 0;
  });
  return sorted.map((result) => result.item);
}

export function groupComponents(items: EstimateRowItem[], groupBy: LibraryGroupBy, recentIds: string[] = []): [string, EstimateRowItem[]][] {
  if (groupBy === "none") return [["All components", items]];
  const groups = items.reduce<Record<string, EstimateRowItem[]>>((acc, item) => {
    const key =
      groupBy === "supplier"
        ? item.supplier || "No supplier"
        : groupBy === "discipline"
          ? getComponentDiscipline(item)
          : groupBy === "recent"
            ? recentIds.includes(item.id) || item.lastUsedAt
              ? "Recently used"
              : "Not recently used"
            : groupBy === "room"
              ? item.designation ?? "General"
              : item.category || "General";
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function createComponent(form: NewComponentForm): { component?: EstimateRowItem; error?: string } {
  if (!form.material.trim()) return { error: "Component name is required." };
  if (!form.category.trim()) return { error: "Category is required." };
  if (!form.unit.trim()) return { error: "Unit is required." };
  const itemCost = Number(form.itemCost);
  if (!Number.isFinite(itemCost) || itemCost < 0) return { error: "Base price must be a valid non-negative number." };
  const laborCost = Number(form.laborCost || 0);
  const supplementaryCosts = Number(form.supplementaryCosts || 0);
  const subTotal = itemCost;
  const now = new Date().toISOString();
  return {
    component: {
      id: `custom-${Date.now()}`,
      material: form.material.trim(),
      name: form.material.trim(),
      category: form.category.trim(),
      supplier: form.supplier.trim(),
      unit: form.unit.trim(),
      itemCost,
      price: itemCost,
      currency: form.currency || "PHP",
      quantity: 1,
      subTotal,
      supplementaryCosts,
      laborCost,
      laborCostDefault: laborCost,
      otherCostDefault: supplementaryCosts,
      totalItemCosts: subTotal + supplementaryCosts + laborCost,
      description: form.description.trim(),
      source: "library",
      discipline: form.discipline,
      designation: form.designation,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      imageUrl: form.imageUrl.trim() || getComponentImageUrl({
        material: form.material.trim(),
        category: form.category.trim(),
        supplier: form.supplier.trim(),
        source: "library",
        unit: form.unit.trim(),
        itemCost,
        quantity: 1,
        supplementaryCosts,
        laborCost,
        subTotal,
        totalItemCosts: subTotal + supplementaryCosts + laborCost,
        description: form.description.trim(),
        id: "component-image-preview",
        pricingSource: "User-created component",
        pricingDate: now.slice(0, 10),
      }),
      sku: form.sku.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      pricingSource: form.sourceUrl.trim() || "User-created component",
      pricingDate: now.slice(0, 10),
    },
  };
}

export const defaultFilters: ComponentFilters = {
  categories: [],
  suppliers: [],
  disciplines: [],
  designations: [],
  units: [],
  minPrice: "",
  maxPrice: "",
  favoritesOnly: false,
  recentOnly: false,
  customOnly: false,
  imageState: "all",
  supplierState: "all",
};

export const defaultForm: NewComponentForm = {
  material: "",
  category: "",
  supplier: "",
  unit: "pc",
  itemCost: "",
  currency: "PHP",
  discipline: "Architectural",
  designation: "Floor",
  description: "",
  tags: "",
  imageUrl: "",
  laborCost: "0",
  supplementaryCosts: "0",
  sku: "",
  sourceUrl: "",
  notes: "",
};

export const LIBRARY_PREFS_KEY = "archestimator_component_library_preferences_v1";
export const LIBRARY_FAVORITES_KEY = "archestimator_component_library_favorites_v1";
export const LIBRARY_RECENTS_KEY = "archestimator_component_library_recents_v1";

export function readLibraryPreferences() {
  return readJsonStorage<{ viewMode?: "compact" | "detailed" | "grid"; groupBy?: LibraryGroupBy; sortMode?: LibrarySortMode }>(LIBRARY_PREFS_KEY, {});
}
