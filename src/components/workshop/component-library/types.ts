import type { EstimateRowItem } from "../estimate-tree-data";

export type LibraryGroupBy = "none" | "category" | "supplier" | "discipline" | "room" | "recent";
export type LibraryViewMode = "compact" | "detailed" | "grid";
export type LibrarySortMode = "relevance" | "name" | "priceAsc" | "priceDesc" | "recentUsed" | "recentAdded" | "supplier";

export type ComponentFilters = {
  categories: string[];
  suppliers: string[];
  disciplines: string[];
  designations: string[];
  units: string[];
  minPrice: string;
  maxPrice: string;
  favoritesOnly: boolean;
  recentOnly: boolean;
  customOnly: boolean;
  imageState: "all" | "has" | "none";
  supplierState: "all" | "has" | "none";
};

export type NewComponentForm = {
  material: string;
  category: string;
  supplier: string;
  unit: string;
  itemCost: string;
  currency: string;
  discipline: string;
  designation: string;
  description: string;
  tags: string;
  imageUrl: string;
  laborCost: string;
  supplementaryCosts: string;
  sku: string;
  sourceUrl: string;
  notes: string;
};

export type LibraryFacets = {
  categories: string[];
  suppliers: string[];
  disciplines: string[];
  designations: string[];
  units: string[];
};

export type SearchResult = {
  item: EstimateRowItem;
  score: number;
  index: number;
};
