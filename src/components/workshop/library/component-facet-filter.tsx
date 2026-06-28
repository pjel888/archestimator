"use client";

import { useMemo } from "react";
import { FunnelSimple, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterPopover } from "@/components/ui/overlays/popover";
import type { ComponentLifecycleState } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import {
  COMPONENT_FACET_STALE_DAYS,
  COMPONENT_FACET_VERY_STALE_DAYS,
  COMPONENT_LIFECYCLE_FACET_LABELS,
  countActiveComponentFacets,
  EMPTY_COMPONENT_FACET_FILTERS,
  type ComponentFacetFilters,
  type ComponentFacetOptions,
  type ComponentPricingFreshness,
  type FacetOption,
} from "./component-facet-filter-model";

const FRESHNESS_OPTIONS: Array<{ value: ComponentPricingFreshness; label: string }> = [
  { value: "any", label: "Any pricing date" },
  { value: "fresh", label: `Updated within ${COMPONENT_FACET_STALE_DAYS} days` },
  { value: "stale", label: `Older than ${COMPONENT_FACET_STALE_DAYS} days` },
  { value: "very-stale", label: `Older than ${COMPONENT_FACET_VERY_STALE_DAYS} days` },
  { value: "missing", label: "No pricing date" },
];

const APPLIED_FRESHNESS_LABELS: Record<Exclude<ComponentPricingFreshness, "any">, string> = {
  fresh: `Updated within ${COMPONENT_FACET_STALE_DAYS} days`,
  stale: `Older than ${COMPONENT_FACET_STALE_DAYS} days`,
  "very-stale": `Older than ${COMPONENT_FACET_VERY_STALE_DAYS} days`,
  missing: "No pricing date",
};

type ComponentAppliedFacetKind = "supplier" | "brand" | "lifecycle" | "confidence" | "freshness";

type ComponentAppliedFacetChip = {
  id: string;
  kind: ComponentAppliedFacetKind;
  value: string;
  label: string;
};

function findFacetOptionLabel(options: FacetOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function appliedFacetPrefix(kind: ComponentAppliedFacetKind) {
  switch (kind) {
    case "supplier":
      return "Supplier";
    case "brand":
      return "Brand";
    case "lifecycle":
      return "Lifecycle";
    case "confidence":
      return "Confidence";
    case "freshness":
      return "Pricing";
    default:
      return "Filter";
  }
}

function buildComponentAppliedFacetChips(
  filters: ComponentFacetFilters,
  options: ComponentFacetOptions,
): ComponentAppliedFacetChip[] {
  const chips: ComponentAppliedFacetChip[] = [];
  for (const value of filters.suppliers) {
    chips.push({
      id: `supplier:${value}`,
      kind: "supplier",
      value,
      label: `${appliedFacetPrefix("supplier")}: ${findFacetOptionLabel(options.suppliers, value)}`,
    });
  }
  for (const value of filters.brands) {
    chips.push({
      id: `brand:${value}`,
      kind: "brand",
      value,
      label: `${appliedFacetPrefix("brand")}: ${findFacetOptionLabel(options.brands, value)}`,
    });
  }
  for (const value of filters.lifecycles) {
    chips.push({
      id: `lifecycle:${value}`,
      kind: "lifecycle",
      value,
      label: `${appliedFacetPrefix("lifecycle")}: ${COMPONENT_LIFECYCLE_FACET_LABELS[value]}`,
    });
  }
  for (const value of filters.confidence) {
    chips.push({
      id: `confidence:${value}`,
      kind: "confidence",
      value,
      label: `${appliedFacetPrefix("confidence")}: ${findFacetOptionLabel(options.confidence, value)}`,
    });
  }
  if (filters.freshness !== "any") {
    chips.push({
      id: `freshness:${filters.freshness}`,
      kind: "freshness",
      value: filters.freshness,
      label: `${appliedFacetPrefix("freshness")}: ${APPLIED_FRESHNESS_LABELS[filters.freshness]}`,
    });
  }
  return chips;
}

function removeAppliedFacetChip(
  filters: ComponentFacetFilters,
  chip: ComponentAppliedFacetChip,
): ComponentFacetFilters {
  switch (chip.kind) {
    case "supplier":
      return { ...filters, suppliers: filters.suppliers.filter((value) => value !== chip.value) };
    case "brand":
      return { ...filters, brands: filters.brands.filter((value) => value !== chip.value) };
    case "lifecycle":
      return { ...filters, lifecycles: filters.lifecycles.filter((value) => value !== chip.value) };
    case "confidence":
      return { ...filters, confidence: filters.confidence.filter((value) => value !== chip.value) };
    case "freshness":
      return { ...filters, freshness: "any" };
    default:
      return filters;
  }
}

export function ComponentAppliedFacetChips({
  filters,
  options,
  onFiltersChange,
  className,
  chipClassName,
}: {
  filters: ComponentFacetFilters;
  options: ComponentFacetOptions;
  onFiltersChange: (filters: ComponentFacetFilters) => void;
  className?: string;
  chipClassName?: string;
}) {
  const chips = useMemo(() => buildComponentAppliedFacetChips(filters, options), [filters, options]);
  if (chips.length === 0) return null;

  return (
    <div
      className={cn("flex min-h-8 flex-wrap items-center gap-1.5 border-b border-hairline px-2 py-1", className)}
      data-component-applied-filters="true"
      aria-label="Applied component filters"
    >
      <span className="mr-0.5 text-[9px] font-medium leading-3 text-tertiary">
        {chips.length} {chips.length === 1 ? "filter" : "filters"}
      </span>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1" aria-label="Active component filter chips">
        {chips.map((chip) => (
          <li key={chip.id} className="min-w-0">
            <button
              type="button"
              className={cn(
                "inline-flex max-w-[min(220px,80vw)] items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[9px] font-medium leading-3 text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                chipClassName ?? "border-hairline bg-white/75 hover:bg-surfaceMuted",
              )}
              onClick={() => onFiltersChange(removeAppliedFacetChip(filters, chip))}
              aria-label={`Remove ${chip.label} filter`}
            >
              <span className="truncate">{chip.label}</span>
              <X size={10} weight="regular" aria-hidden="true" className="shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="plain"
        size="xs"
        className="h-6 min-h-6 min-w-0 shrink-0 px-1.5 py-0 !text-[9px]"
        onClick={() => onFiltersChange(EMPTY_COMPONENT_FACET_FILTERS)}
      >
        Clear filters
      </Button>
    </div>
  );
}

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
      trigger={<FunnelSimple size={12} weight="regular" aria-hidden="true" />}
      triggerVariant="ghost"
      // icon-sm gives a clean square icon base (grid place-items-center, p-0);
      // without it the Button falls back to the default md size whose horizontal
      // padding makes the trigger a rectangle. Matches the sheet + tree filters.
      triggerSize="icon-sm"
      // size-6 squares it to the View-by / Add toolbar icons (overrides icon-sm's
      // size-8). Active state reads from the muted fill, not a width change.
      triggerClassName={cn(
        "size-6 rounded-xs p-0",
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
