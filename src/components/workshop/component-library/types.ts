import type { EstimateRowItem } from "../estimate-tree-data";

export type LibraryPanelTab = "components" | "assemblies" | "templates";
export type LibraryGroupBy = "none" | "category" | "supplier" | "discipline" | "room" | "recent";
export type LibraryViewMode = "compact" | "detailed" | "grid";
export type LibrarySortMode = "relevance" | "name" | "priceAsc" | "priceDesc" | "recentUsed" | "recentAdded" | "supplier";

export type LibraryBundleKind = "assembly" | "template";

export type LibraryBundleItem = {
  itemId: string;
  quantity: number;
};

export type LibraryBundle = {
  id: string;
  kind: LibraryBundleKind;
  name: string;
  description: string;
  items: LibraryBundleItem[];
  tags?: string[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LibraryImportResult = {
  items: EstimateRowItem[];
  bundles: LibraryBundle[];
  errors: string[];
};

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
  miscCost: string;
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
