import type { ComponentLifecycleState, EstimateRowItem } from "@/lib/estimates/types";
import { DEFAULT_PRICE_FRESHNESS_POLICY, getPriceFreshness } from "@/lib/estimate-health";
import { filterMapBy } from "@/lib/util/array";

export const COMPONENT_FACET_STALE_DAYS = 90;
export const COMPONENT_FACET_VERY_STALE_DAYS = 180;

export type ComponentPricingFreshness = "any" | "fresh" | "stale" | "very-stale" | "missing";

export const COMPONENT_LIFECYCLE_FACET_LABELS: Record<ComponentLifecycleState, string> = {
  draft: "Draft",
  in_production: "In production",
  available: "Available",
  discontinued: "Discontinued",
  archived: "Archived",
};

export const COMPONENT_PRICING_FRESHNESS_LABELS: Record<Exclude<ComponentPricingFreshness, "any">, string> = {
  fresh: "Fresh price",
  stale: "Stale price",
  "very-stale": "Very stale price",
  missing: "Missing price source",
};

export function getComponentPricingFreshness(
  item: Pick<EstimateRowItem, "pricingDate">,
  now: number = Date.now(),
): Exclude<ComponentPricingFreshness, "any"> {
  const raw = item.pricingDate?.trim();
  if (!raw) return "missing";
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "missing";
  return getPriceFreshness({ timestamp: parsed, now, policy: DEFAULT_PRICE_FRESHNESS_POLICY });
}

function componentMatchesPricingFreshness(
  item: Pick<EstimateRowItem, "pricingDate">,
  freshness: Exclude<ComponentPricingFreshness, "any">,
  now: number,
) {
  const itemFreshness = getComponentPricingFreshness(item, now);
  if (freshness === "stale") return itemFreshness === "stale" || itemFreshness === "very-stale";
  return itemFreshness === freshness;
}

export const NO_SUPPLIER_OPTION = "__no_supplier__";
export const NO_BRAND_OPTION = "__no_brand__";

export type ComponentFacetFilters = {
  suppliers: string[];
  brands: string[];
  lifecycles: ComponentLifecycleState[];
  freshness: ComponentPricingFreshness;
};

export const EMPTY_COMPONENT_FACET_FILTERS: ComponentFacetFilters = {
  suppliers: [],
  brands: [],
  lifecycles: [],
  freshness: "any",
};

export function countActiveComponentFacets(filters: ComponentFacetFilters): number {
  return (
    filters.suppliers.length +
    filters.brands.length +
    filters.lifecycles.length +
    (filters.freshness === "any" ? 0 : 1)
  );
}

function getSupplierFacetValue(item: EstimateRowItem): string {
  return item.supplier?.trim() || NO_SUPPLIER_OPTION;
}

function getBrandFacetValue(item: EstimateRowItem): string {
  return item.brand?.trim() || NO_BRAND_OPTION;
}

export function componentMatchesFacets(
  item: EstimateRowItem,
  filters: ComponentFacetFilters,
  now: number = Date.now(),
): boolean {
  if (filters.suppliers.length > 0 && !filters.suppliers.includes(getSupplierFacetValue(item))) return false;
  if (filters.brands.length > 0 && !filters.brands.includes(getBrandFacetValue(item))) return false;
  if (filters.lifecycles.length > 0) {
    const lifecycle = item.lifecycleState ?? "available";
    if (!filters.lifecycles.includes(lifecycle)) return false;
  }
  if (filters.freshness !== "any" && !componentMatchesPricingFreshness(item, filters.freshness, now)) return false;
  return true;
}

/**
 * Reads facet deep-link search params (used by the Library Overview health
 * line): `?lifecycle=discontinued`, `?brand=none`, `?freshness=stale`,
 * `?supplier=...`.
 */
export function parseComponentFacetSearchParams(params: URLSearchParams): ComponentFacetFilters {
  const lifecycles = params
    .getAll("lifecycle")
    .filter((value): value is ComponentLifecycleState => value in COMPONENT_LIFECYCLE_FACET_LABELS);
  const brands = params.getAll("brand").map((value) => (value === "none" ? NO_BRAND_OPTION : value));
  const suppliers = params.getAll("supplier").map((value) => (value === "none" ? NO_SUPPLIER_OPTION : value));
  const freshnessRaw = params.get("freshness");
  const freshness: ComponentPricingFreshness =
    freshnessRaw === "fresh" || freshnessRaw === "stale" || freshnessRaw === "very-stale" || freshnessRaw === "missing"
      ? freshnessRaw
      : "any";

  return { suppliers, brands, lifecycles, freshness };
}

export type FacetOption = { value: string; label: string };

export type ComponentFacetOptions = {
  suppliers: FacetOption[];
  brands: FacetOption[];
  lifecycles: FacetOption[];
};

export function buildComponentFacetOptions(items: EstimateRowItem[]): ComponentFacetOptions {
  const suppliers = new Set<string>();
  const brands = new Set<string>();
  const lifecycles = new Set<ComponentLifecycleState>();
  let hasNoSupplier = false;
  let hasNoBrand = false;

  for (const item of items) {
    const supplier = item.supplier?.trim();
    if (supplier) suppliers.add(supplier);
    else hasNoSupplier = true;
    const brand = item.brand?.trim();
    if (brand) brands.add(brand);
    else hasNoBrand = true;
    lifecycles.add(item.lifecycleState ?? "available");
  }

  const toSortedOptions = (values: Set<string>) =>
    Array.from(values)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }));

  return {
    suppliers: [
      ...toSortedOptions(suppliers),
      ...(hasNoSupplier ? [{ value: NO_SUPPLIER_OPTION, label: "No supplier" }] : []),
    ],
    brands: [
      ...toSortedOptions(brands),
      ...(hasNoBrand ? [{ value: NO_BRAND_OPTION, label: "No brand" }] : []),
    ],
    lifecycles: filterMapBy(
      Object.keys(COMPONENT_LIFECYCLE_FACET_LABELS) as ComponentLifecycleState[],
      (state) => lifecycles.has(state),
      (state) => ({ value: state, label: COMPONENT_LIFECYCLE_FACET_LABELS[state] }),
    ),
  };
}
