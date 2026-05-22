export type EstimateRowItemSource = "project" | "supplier" | "library";

export type EstimateRowItem = {
  id: string;
  material: string;
  name?: string;
  description: string;
  supplier: string;
  source: EstimateRowItemSource;
  unit: string;
  itemCost: number;
  price?: number;
  currency?: string;
  quantity: number;
  subTotal: number;
  miscCost: number;
  miscCostDefault?: number;
  totalItemCosts: number;
  imageUrl?: string;
  category: string;
  categoryNodeId?: string;
  categoryPath?: string[];
  supplierId?: string;
  discipline?: string;
  designation?: string;
  tags?: string[];
  sku?: string;
  sourceUrl?: string;
  sourceLibraryItemId?: string | null;
  notes?: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  pricingSource: string;
  pricingDate: string;
  confidence?: string;
};

export type EstimateTreeNode = {
  id: string;
  name: string;
  kind: "group" | "area";
  total: string;
  children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];
};

export type FlatEstimateTreeNode = EstimateTreeNode & {
  depth: number;
  path: string[];
};
