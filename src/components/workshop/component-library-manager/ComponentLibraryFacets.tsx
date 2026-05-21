"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

import { getHealthLabel, getKindLabel } from "./helpers";
import type { LibraryItemKind, LibraryPriceHealth, ManagerFacetValue, ManagerFacets, ManagerFilters, ManagerStatusFilter } from "./types";

type ComponentLibraryFacetsProps = {
  facets: ManagerFacets;
  visibleCount: number;
  filters: ManagerFilters;
  onChange: (filters: ManagerFilters) => void;
  className?: string;
};

const statusOptions: Array<{ label: string; value: ManagerStatusFilter; tone: "neutral" | "warning" | "danger" }> = [
  { label: "All", value: "all", tone: "neutral" },
  { label: "Needs review", value: "needs-review", tone: "warning" },
  { label: "Missing price", value: "missing-price", tone: "danger" },
  { label: "Missing source", value: "missing-source", tone: "danger" },
];

function toggleStringValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getStatusCount(facets: ManagerFacets, status: ManagerStatusFilter) {
  if (status === "needs-review") return facets.needsReview;
  if (status === "missing-price") return facets.missingPrice;
  if (status === "missing-source") return facets.missingSource;
  return facets.total;
}

function FacetSection({
  title,
  values,
  selected,
  getLabel = (value) => value,
  onToggle,
}: {
  title: string;
  values: ManagerFacetValue[];
  selected: string[];
  getLabel?: (value: string) => string;
  onToggle: (value: string) => void;
}) {
  return (
    <section className="border-t border-hairline px-2 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[9px] font-bold uppercase leading-3 tracking-[0.08em] text-tertiary">{title}</h3>
        <Badge size="xs">{values.length}</Badge>
      </div>
      <div className="space-y-0.5">
        {values.length > 0 ? (
          values.map(({ value, count }) => {
            const active = selected.includes(value);
            return (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                aria-pressed={active}
                className={cn(
                  "h-6 min-h-6 w-full justify-between rounded-sm px-1.5 py-0 text-left",
                  active ? "bg-ink text-white hover:bg-ink hover:text-white" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
                )}
                onClick={() => onToggle(value)}
              >
                <span className="min-w-0 truncate text-[9px] font-bold leading-3">{getLabel(value)}</span>
                <span className={cn("ml-2 shrink-0 text-[8px] font-bold tabular-nums", active ? "text-white/80" : "text-tertiary")}>{count}</span>
              </Button>
            );
          })
        ) : (
          <p className="px-1 text-[9px] font-semibold leading-4 text-tertiary">No values</p>
        )}
      </div>
    </section>
  );
}

export function ComponentLibraryFacets({ facets, visibleCount, filters, onChange, className }: ComponentLibraryFacetsProps) {
  const hasFilters =
    filters.status !== "all" ||
    filters.categories.length > 0 ||
    filters.suppliers.length > 0 ||
    filters.kinds.length > 0 ||
    filters.units.length > 0 ||
    filters.health.length > 0;

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-white", className)} aria-label="Library filters">
      <div className="shrink-0 px-2 py-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[11px] font-bold leading-4 text-ink">Library facets</h2>
            <p className="text-[9px] font-semibold leading-3 text-tertiary">{visibleCount} visible items</p>
          </div>
          {hasFilters ? (
            <Button variant="ghost" size="sm" className="h-6 min-h-6 px-1.5 py-0 text-tertiary" onClick={() => onChange({ status: "all", categories: [], suppliers: [], kinds: [], units: [], health: [] })}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <section className="border-t border-hairline px-2 py-2">
        <h3 className="mb-1 text-[9px] font-bold uppercase leading-3 tracking-[0.08em] text-tertiary">Status views</h3>
        <div className="space-y-0.5">
          {statusOptions.map((option) => {
            const active = filters.status === option.value;
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                aria-pressed={active}
                className={cn(
                  "h-6 min-h-6 w-full justify-between rounded-sm px-1.5 py-0 text-left",
                  active ? "bg-accentSoft text-accentDark hover:bg-accentSoft hover:text-accentDark" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
                )}
                onClick={() => onChange({ ...filters, status: option.value })}
              >
                <span className="text-[9px] font-bold leading-3">{option.label}</span>
                <Badge tone={option.tone} size="xs">{getStatusCount(facets, option.value)}</Badge>
              </Button>
            );
          })}
        </div>
      </section>

      <div className="min-h-0 flex-1 overflow-auto">
        <FacetSection
          title="Category"
          values={facets.categories}
          selected={filters.categories}
          onToggle={(value) => onChange({ ...filters, categories: toggleStringValue(filters.categories, value) })}
        />
        <FacetSection
          title="Supplier"
          values={facets.suppliers}
          selected={filters.suppliers}
          onToggle={(value) => onChange({ ...filters, suppliers: toggleStringValue(filters.suppliers, value) })}
        />
        <FacetSection
          title="Kind"
          values={facets.kinds}
          selected={filters.kinds}
          getLabel={(value) => getKindLabel(value)}
          onToggle={(value) => onChange({ ...filters, kinds: toggleStringValue(filters.kinds, value as LibraryItemKind) })}
        />
        <FacetSection
          title="Unit"
          values={facets.units}
          selected={filters.units}
          onToggle={(value) => onChange({ ...filters, units: toggleStringValue(filters.units, value) })}
        />
        <FacetSection
          title="Price health"
          values={facets.health}
          selected={filters.health}
          getLabel={(value) => getHealthLabel(value as LibraryPriceHealth)}
          onToggle={(value) => onChange({ ...filters, health: toggleStringValue(filters.health, value as LibraryPriceHealth) })}
        />
      </div>
    </aside>
  );
}
