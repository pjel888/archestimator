export type EstimateRowItemSource = "project" | "supplier" | "library";

export type ComponentLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";

export type ComponentPriceOption = {
  id: string;
  label: string;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  pricingSource?: string | null;
  pricingDate?: string | null;
  confidence?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  supplierId?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ComponentHistoryEntry = {
  id: string;
  type: "version" | "price" | "state";
  label: string;
  summary: string;
  effectiveAt: string;
  createdAt: string;
  versionNumber?: number;
};

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
  libraryFolderId?: string;
  supplierId?: string;
  discipline?: string;
  designation?: string;
  tags?: string[];
  sku?: string;
  sourceUrl?: string;
  sourceLibraryItemId?: string | null;
  componentVersionId?: string | null;
  componentVersionNumber?: number;
  priceOptionId?: string | null;
  priceOptionLabel?: string;
  priceOptions?: ComponentPriceOption[];
  lifecycleState?: ComponentLifecycleState;
  lifecycleStateChangedAt?: string;
  history?: ComponentHistoryEntry[];
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
