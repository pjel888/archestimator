export type LibraryItemKind = "material" | "labor" | "equipment" | "subcontract" | "assembly" | "allowance";

export type LibraryHealthIssue = "missing-price" | "missing-source" | "missing-date" | "low-confidence" | "stale-price";

export type LibraryPriceHealth = "current" | "needs-review" | "stale" | "missing";

export type ComponentLibraryManagerItemDraft = {
  id: string;
  name: string;
  kind: LibraryItemKind;
  category: string;
  supplier: string;
  rawSupplier: string | null;
  brand?: string;
  sku?: string;
  unit: string;
  unitCost: number | null;
  laborCost: number | null;
  supplementaryCost: number | null;
  pricingSource?: string;
  pricingDate?: string;
  confidence?: string;
  description: string;
  thumbnailPath?: string;
  updatedAt?: string;
  discipline?: string;
  designation?: string;
  tags?: string[];
  isCustom?: boolean;
  sourceUrl?: string;
  notes?: string;
};

export type ComponentLibraryManagerItem = ComponentLibraryManagerItemDraft & {
  health: LibraryPriceHealth;
  healthIssues: LibraryHealthIssue[];
};

export type ManagerStatusFilter = "all" | "needs-review" | "missing-price" | "missing-source";

export type ManagerFilters = {
  status: ManagerStatusFilter;
  categories: string[];
  suppliers: string[];
  kinds: LibraryItemKind[];
  units: string[];
  health: LibraryPriceHealth[];
};

export type ManagerGroupBy = "none" | "category" | "supplier" | "kind" | "health";

export type ManagerSortBy = "name" | "category" | "supplier" | "unitCostAsc" | "unitCostDesc" | "pricingDate";

export type ManagerFacetValue = {
  value: string;
  count: number;
};

export type ManagerFacets = {
  total: number;
  needsReview: number;
  missingPrice: number;
  missingSource: number;
  categories: ManagerFacetValue[];
  suppliers: ManagerFacetValue[];
  kinds: ManagerFacetValue[];
  units: ManagerFacetValue[];
  health: ManagerFacetValue[];
};

export const defaultManagerFilters: ManagerFilters = {
  status: "all",
  categories: [],
  suppliers: [],
  kinds: [],
  units: [],
  health: [],
};
