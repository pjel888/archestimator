"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/ui/cn";

import { formatCompactDate, formatMoney, getHealthLabel, getKindLabel } from "./helpers";
import type { ComponentLibraryManagerItem, LibraryPriceHealth, ManagerGroupBy, ManagerSortBy } from "./types";

type ComponentLibraryTableProps = {
  groupedItems: [string, ComponentLibraryManagerItem[]][];
  groupBy: ManagerGroupBy;
  sortBy: ManagerSortBy;
  selectedId: string | null;
  onSort: (sortBy: ManagerSortBy) => void;
  onSelect: (itemId: string) => void;
  className?: string;
};

const columnsClass = "grid-cols-[18px_minmax(220px,1.5fr)_78px_minmax(120px,0.8fr)_minmax(132px,0.9fr)_58px_98px_minmax(132px,0.9fr)]";

const healthDotClasses: Record<LibraryPriceHealth, string> = {
  current: "bg-success",
  "needs-review": "bg-warning",
  stale: "bg-warning",
  missing: "bg-danger",
};

const healthBadgeTone: Record<LibraryPriceHealth, "success" | "warning" | "danger"> = {
  current: "success",
  "needs-review": "warning",
  stale: "warning",
  missing: "danger",
};

function nextSort(current: ManagerSortBy, column: ManagerSortBy, reverseColumn?: ManagerSortBy) {
  if (!reverseColumn) return column;
  return current === column ? reverseColumn : column;
}

function getAriaSort(activeSort: ManagerSortBy, sortKey: ManagerSortBy, reverseSortKey?: ManagerSortBy) {
  if (activeSort !== sortKey && activeSort !== reverseSortKey) return "none";
  if (activeSort === reverseSortKey || sortKey === "pricingDate") return "descending";
  return "ascending";
}

function SortHeader({
  label,
  sortKey,
  reverseSortKey,
  activeSort,
  onSort,
  className,
}: {
  label: string;
  sortKey: ManagerSortBy;
  reverseSortKey?: ManagerSortBy;
  activeSort: ManagerSortBy;
  onSort: (sortBy: ManagerSortBy) => void;
  className?: string;
}) {
  const active = activeSort === sortKey || activeSort === reverseSortKey;
  return (
    <Button
      role="columnheader"
      aria-sort={getAriaSort(activeSort, sortKey, reverseSortKey)}
      variant="ghost"
      size="sm"
      className={cn("h-7 min-h-7 justify-start rounded-none px-1 py-0 text-[9px] uppercase tracking-[0.08em] text-tertiary hover:text-ink", className)}
      onClick={() => onSort(nextSort(activeSort, sortKey, reverseSortKey))}
    >
      <span>{label}</span>
      {active ? activeSort === reverseSortKey ? <CaretDown size={9} weight="bold" aria-hidden="true" /> : <CaretUp size={9} weight="bold" aria-hidden="true" /> : null}
    </Button>
  );
}

function SourceCell({ item }: { item: ComponentLibraryManagerItem }) {
  const source = item.pricingSource?.trim() || "No source";
  const date = formatCompactDate(item.pricingDate);
  return (
    <span className="min-w-0 truncate text-[9px] font-semibold leading-3 text-tertiary" title={`${source} / ${date}`}>
      {source} / {date}
    </span>
  );
}

export function ComponentLibraryTable({ groupedItems, groupBy, sortBy, selectedId, onSort, onSelect, className }: ComponentLibraryTableProps) {
  const totalItems = groupedItems.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <section className={cn("flex h-full min-h-0 flex-col bg-white", className)} role="grid" aria-label="Component library table" aria-colcount={8} aria-rowcount={totalItems + 1}>
      <div className={cn("grid min-w-[880px] shrink-0 border-b border-hairline bg-surfaceMuted/80", columnsClass)} role="row">
        <span role="columnheader" className="flex h-7 items-center justify-center text-[8px] font-bold uppercase text-tertiary">St</span>
        <SortHeader label="Name" sortKey="name" activeSort={sortBy} onSort={onSort} />
        <span role="columnheader" className="flex h-7 items-center px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-tertiary">Kind</span>
        <SortHeader label="Category" sortKey="category" activeSort={sortBy} onSort={onSort} />
        <SortHeader label="Supplier" sortKey="supplier" activeSort={sortBy} onSort={onSort} />
        <span role="columnheader" className="flex h-7 items-center px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-tertiary">Unit</span>
        <SortHeader label="Unit cost" sortKey="unitCostAsc" reverseSortKey="unitCostDesc" activeSort={sortBy} onSort={onSort} className="justify-end text-right" />
        <SortHeader label="Source" sortKey="pricingDate" activeSort={sortBy} onSort={onSort} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto" role="rowgroup">
        {totalItems > 0 ? (
          <div className="min-w-[880px]">
            {groupedItems.map(([group, items]) => (
              <div key={group} className="border-b border-hairline/70 last:border-b-0">
                {groupBy !== "none" ? (
                  <div className="sticky top-0 z-10 flex h-7 items-center gap-2 border-b border-hairline bg-white px-2">
                    <span className="text-[10px] font-bold leading-3 text-ink">{group}</span>
                    <Badge size="xs">{items.length}</Badge>
                  </div>
                ) : null}
                {items.map((item) => {
                  const selected = item.id === selectedId;
                  const issues = item.healthIssues.map((issue) => issue.replaceAll("-", " ")).join(", ") || "Current";
                  return (
                    <Button
                      key={item.id}
                      role="row"
                      variant="ghost"
                      size="sm"
                      aria-selected={selected}
                      className={cn(
                        "grid min-h-9 w-full min-w-[880px] rounded-none border-b border-hairline/70 px-0 py-0 text-left last:border-b-0",
                        columnsClass,
                        selected ? "border-l-2 border-l-accent bg-accentSoft/70 text-ink hover:bg-accentSoft" : "text-secondary hover:bg-surfaceMuted/80 hover:text-ink",
                      )}
                      onClick={() => onSelect(item.id)}
                    >
                      <span role="gridcell" className="flex items-center justify-center px-1">
                        <span className={cn("size-2 rounded-full", healthDotClasses[item.health])} title={`${getHealthLabel(item.health)}: ${issues}`} />
                      </span>
                      <span role="gridcell" className="flex min-w-0 flex-col justify-center px-1">
                        <span className="truncate text-[10px] font-bold leading-3 text-ink">{item.name}</span>
                        <span className="truncate text-[9px] font-semibold leading-3 text-tertiary">{item.description || item.category}</span>
                      </span>
                      <span role="gridcell" className="flex items-center px-1">
                        <Badge size="xs" tone={item.kind === "material" ? "neutral" : "accent"}>{getKindLabel(item.kind)}</Badge>
                      </span>
                      <span role="gridcell" className="flex min-w-0 items-center px-1 text-[10px] font-semibold leading-3">{item.category}</span>
                      <span role="gridcell" className="flex min-w-0 items-center px-1 text-[10px] font-semibold leading-3">{item.supplier}</span>
                      <span role="gridcell" className="flex items-center px-1 text-[10px] font-bold leading-3 text-tertiary">{item.unit}</span>
                      <span role="gridcell" className="flex items-center justify-end px-1 text-[10px] font-bold leading-3 tabular-nums text-ink">{formatMoney(item.unitCost)}</span>
                      <span role="gridcell" className="flex min-w-0 items-center gap-1 px-1">
                        <Badge size="xs" tone={healthBadgeTone[item.health]}>{getHealthLabel(item.health)}</Badge>
                        <SourceCell item={item} />
                      </span>
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="m-2 min-h-52" title="No components matched" description="Clear filters or adjust the search query to show more library items." />
        )}
      </div>
    </section>
  );
}
