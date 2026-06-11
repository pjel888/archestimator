"use client";

import { useMemo } from "react";
import { FunnelSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterPopover } from "@/components/ui/overlays/popover";
import type { EstimateRowItem, ComponentLifecycleState } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";

export const COMPONENT_FACET_STALE_DAYS = 90;

const NO_SUPPLIER_OPTION = "__no_supplier__";
const NO_BRAND_OPTION = "__no_brand__";

export type ComponentPricingFreshness = "any" | "fresh" | "stale" | "missing";

export type ComponentFacetFilters = {
  suppliers: string[];
  brands: string[];
  lifecycles: ComponentLifecycleState[];
  confidence: string[];
  freshness: ComponentPricingFreshness;
};

export const EMPTY_COMPONENT_FACET_FILTERS: ComponentFacetFilters = {
  suppliers: [],
  brands: [],
  lifecycles: [],
  confidence: [],
  freshness: "any",
};

export const COMPONENT_LIFECYCLE_FACET_LABELS: Record<ComponentLifecycleState, string> = {
  draft: "Draft",
  in_production: "In production",
  available: "Available",
  discontinued: "Discontinued",
  archived: "Archived",
};

export function countActiveComponentFacets(filters: ComponentFacetFilters): number {
  return (
    filters.suppliers.length +
    filters.brands.length +
    filters.lifecycles.length +
    filters.confidence.length +
    (filters.freshness === "any" ? 0 : 1)
  );
}

function getSupplierFacetValue(item: EstimateRowItem): string {
  return item.supplier?.trim() || NO_SUPPLIER_OPTION;
}

function getBrandFacetValue(item: EstimateRowItem): string {
  return item.brand?.trim() || NO_BRAND_OPTION;
}

export function getComponentPricingFreshness(
  item: Pick<EstimateRowItem, "pricingDate">,
  now: number = Date.now(),
): Exclude<ComponentPricingFreshness, "any"> {
  const raw = item.pricingDate?.trim();
  if (!raw) return "missing";
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "missing";
  const ageDays = (now - parsed) / (1000 * 60 * 60 * 24);
  return ageDays > COMPONENT_FACET_STALE_DAYS ? "stale" : "fresh";
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
  if (filters.confidence.length > 0) {
    const confidence = item.confidence?.trim();
    if (!confidence || !filters.confidence.includes(confidence)) return false;
  }
  if (filters.freshness !== "any" && getComponentPricingFreshness(item, now) !== filters.freshness) return false;
  return true;
}

/**
 * Reads facet deep-link search params (used by the Library Overview health
 * line): `?lifecycle=discontinued`, `?brand=none`, `?freshness=stale`,
 * `?supplier=…`, `?confidence=…`.
 */
export function parseComponentFacetSearchParams(params: URLSearchParams): ComponentFacetFilters {
  const lifecycles = params
    .getAll("lifecycle")
    .filter((value): value is ComponentLifecycleState => value in COMPONENT_LIFECYCLE_FACET_LABELS);
  const brands = params.getAll("brand").map((value) => (value === "none" ? NO_BRAND_OPTION : value));
  const suppliers = params.getAll("supplier").map((value) => (value === "none" ? NO_SUPPLIER_OPTION : value));
  const confidence = params.getAll("confidence");
  const freshnessRaw = params.get("freshness");
  const freshness: ComponentPricingFreshness =
    freshnessRaw === "fresh" || freshnessRaw === "stale" || freshnessRaw === "missing" ? freshnessRaw : "any";

  return { suppliers, brands, lifecycles, confidence, freshness };
}

type FacetOption = { value: string; label: string };

export type ComponentFacetOptions = {
  suppliers: FacetOption[];
  brands: FacetOption[];
  lifecycles: FacetOption[];
  confidence: FacetOption[];
};

export function buildComponentFacetOptions(items: EstimateRowItem[]): ComponentFacetOptions {
  const suppliers = new Set<string>();
  const brands = new Set<string>();
  const lifecycles = new Set<ComponentLifecycleState>();
  const confidence = new Set<string>();
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
    const confidenceValue = item.confidence?.trim();
    if (confidenceValue) confidence.add(confidenceValue);
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
    lifecycles: (Object.keys(COMPONENT_LIFECYCLE_FACET_LABELS) as ComponentLifecycleState[])
      .filter((state) => lifecycles.has(state))
      .map((state) => ({ value: state, label: COMPONENT_LIFECYCLE_FACET_LABELS[state] })),
    confidence: toSortedOptions(confidence),
  };
}

const FRESHNESS_OPTIONS: Array<{ value: ComponentPricingFreshness; label: string }> = [
  { value: "any", label: "Any pricing date" },
  { value: "fresh", label: `Updated within ${COMPONENT_FACET_STALE_DAYS} days` },
  { value: "stale", label: `Older than ${COMPONENT_FACET_STALE_DAYS} days` },
  { value: "missing", label: "No pricing date" },
];

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function FacetCheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset className="min-w-0">
      <legend className="text-[9px] font-medium leading-3 text-tertiary">{legend}</legend>
      <div className="mt-1 flex max-h-32 flex-col gap-1 overflow-y-auto pr-1">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={<span className="truncate text-[10px] leading-4 text-secondary">{option.label}</span>}
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Wired facet filter for the Components sheet: composes the generic
 * `FilterPopover` with supplier/brand/lifecycle/confidence/freshness facets.
 * Category scoping stays with the left folder tree; duplicating it here
 * would double-filter the same axis.
 */
export function ComponentFacetFilterPopover({
  options,
  filters,
  onFiltersChange,
}: {
  options: ComponentFacetOptions;
  filters: ComponentFacetFilters;
  onFiltersChange: (filters: ComponentFacetFilters) => void;
}) {
  const activeCount = useMemo(() => countActiveComponentFacets(filters), [filters]);
  const filterActive = activeCount > 0;

  return (
    <FilterPopover
      triggerLabel={filterActive ? `Filter components (${activeCount} active)` : "Filter components"}
      trigger={
        <>
          <FunnelSimple size={12} weight="regular" aria-hidden="true" />
          {filterActive ? (
            <span className="rounded-xs bg-surfaceMuted px-1 text-[8px] font-medium leading-3 tabular-nums">
              {activeCount}
            </span>
          ) : null}
        </>
      }
      triggerVariant="ghost"
      triggerClassName={cn(
        "h-6 min-h-6 w-auto gap-1 rounded-xs px-1.5 py-0 !text-[9px]",
        filterActive ? "bg-surfaceMuted text-ink" : "text-tertiary",
      )}
      triggerPressed={filterActive}
      title="Filter components"
      contentClassName="w-64"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="text-[9px] leading-3 text-tertiary">
            {filterActive ? `${activeCount} ${activeCount === 1 ? "filter" : "filters"} active` : "No filters active"}
          </p>
          <Button
            type="button"
            variant="plain"
            size="xs"
            className="min-w-0 px-1.5 !text-[9px]"
            disabled={!filterActive}
            onClick={() => onFiltersChange(EMPTY_COMPONENT_FACET_FILTERS)}
          >
            Reset filters
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <FacetCheckboxGroup
          legend="Lifecycle"
          options={options.lifecycles}
          selected={filters.lifecycles}
          onToggle={(value) =>
            onFiltersChange({
              ...filters,
              lifecycles: toggleValue(filters.lifecycles, value as ComponentLifecycleState),
            })
          }
        />
        <FacetCheckboxGroup
          legend="Confidence"
          options={options.confidence}
          selected={filters.confidence}
          onToggle={(value) => onFiltersChange({ ...filters, confidence: toggleValue(filters.confidence, value) })}
        />
        <fieldset className="min-w-0">
          <legend className="text-[9px] font-medium leading-3 text-tertiary">Pricing freshness</legend>
          <div className="mt-1 flex flex-col gap-1">
            {FRESHNESS_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="component-pricing-freshness"
                  className="size-3 accent-primary"
                  checked={filters.freshness === option.value}
                  onChange={() => onFiltersChange({ ...filters, freshness: option.value })}
                />
                <span className="text-[10px] leading-4 text-secondary">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <FacetCheckboxGroup
          legend="Supplier"
          options={options.suppliers}
          selected={filters.suppliers}
          onToggle={(value) => onFiltersChange({ ...filters, suppliers: toggleValue(filters.suppliers, value) })}
        />
        <FacetCheckboxGroup
          legend="Brand"
          options={options.brands}
          selected={filters.brands}
          onToggle={(value) => onFiltersChange({ ...filters, brands: toggleValue(filters.brands, value) })}
        />
      </div>
    </FilterPopover>
  );
}
