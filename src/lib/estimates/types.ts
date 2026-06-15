import type { EstimateRowMetadata } from "@/lib/estimates/express-components";

export type EstimateRowItemSource = "project" | "supplier" | "library";
export type EstimateRowLinkState = "unlinked" | "linked-clean" | "linked-overridden" | "detached" | "source-changed";

export type ComponentLifecycleState = "draft" | "in_production" | "available" | "discontinued" | "archived";

export type ComponentVariantCostEntry = {
  id: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  pricingSource?: string | null;
  pricingDate: string;
  confidence?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ComponentVariantAttachment = {
  id: string;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: "pdf" | "excel";
  metadata?: unknown;
  createdAt?: string;
};

export type ComponentPriceOption = {
  id: string;
  label: string;
  sku?: string | null;
  variantDescription?: string | null;
  variantSortOrder?: number;
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
  activeCostEntryId?: string | null;
  costEntries?: ComponentVariantCostEntry[];
  packageQuantity?: number | null;
  packageUnit?: string | null;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  mass?: number | null;
  massUnit?: string | null;
  imageBucket?: string | null;
  imagePath?: string | null;
  thumbnailPath?: string | null;
  imageMetadata?: unknown;
  attachments?: ComponentVariantAttachment[];
  variantMetadata?: unknown;
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
  contingencyPercentage?: number;
  contingencyValue?: number;
  miscCost: number;
  miscCostDefault?: number;
  totalItemCosts: number;
  imageUrl?: string;
  category: string;
  categoryNodeId?: string;
  categoryPath?: string[];
  libraryFolderId?: string;
  brand?: string;
  brandId?: string;
  supplierId?: string;
  discipline?: string;
  designation?: string;
  tags?: string[];
  sku?: string;
  sourceUrl?: string;
  sourceLibraryItemId?: string | null;
  metadata?: EstimateRowMetadata;
  linkState?: EstimateRowLinkState;
  componentVersionId?: string | null;
  componentVersionNumber?: number;
  rowRevision?: number;
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
  // P3-T1/T2 (read-side via estimate_row_items.metadata JSONB; typed columns DB-gated):
  // interim labor unit rate and per-row scope for the proposal export. Absent → 0 / included.
  laborUnitCost?: number;
  scopeStatus?: string;
};

export type EstimateTreeNode = {
  id: string;
  name: string;
  kind: "group" | "area";
  total: string;
  children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];
};

export type EstimateTabSummary = {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  nodeCount?: number;
  rowCount?: number;
  totalCost?: number;
};

export type EstimateTabTree = {
  tab: EstimateTabSummary;
  tree: EstimateTreeNode[];
  loadLimitState?: {
    maxNodeCount: number | null;
    maxRowItemCount: number | null;
    fetchedNodeCount: number;
    fetchedRowItemCount: number;
    didExceedNodeLimit: boolean;
    didExceedRowItemLimit: boolean;
  };
};

export type EstimateWithTabs<TEstimate = unknown> = {
  estimate: TEstimate;
  tabs: EstimateTabSummary[];
  defaultTabId: string;
};

export type FlatEstimateTreeNode = EstimateTreeNode & {
  depth: number;
  path: string[];
};
