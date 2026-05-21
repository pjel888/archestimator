"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, Table as TableIcon } from "@phosphor-icons/react/dist/ssr";

import { ControlSelect } from "@/components/ui/control-select";
import { WorkshopCollectionLayout } from "@/components/workshop/WorkshopCollectionLayout";
import { estimateLibraryItems } from "@/components/workshop/estimate-tree-data";

import { adaptEstimateRowItemToManagerItem } from "./adapters";
import { ComponentLibraryFacets } from "./ComponentLibraryFacets";
import { ComponentLibraryInspector } from "./ComponentLibraryInspector";
import { ComponentLibraryTable } from "./ComponentLibraryTable";
import { filterManagerItems, getManagerFacets, groupManagerItems, searchManagerItems, sortManagerItems } from "./helpers";
import { defaultManagerFilters, type ManagerFilters, type ManagerGroupBy, type ManagerSortBy } from "./types";

const groupCycle: ManagerGroupBy[] = ["none", "category", "supplier", "kind", "health"];

function nextGroup(groupBy: ManagerGroupBy) {
  const index = groupCycle.indexOf(groupBy);
  return groupCycle[(index + 1) % groupCycle.length] ?? "none";
}

export function ComponentLibraryManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ManagerFilters>(defaultManagerFilters);
  const [groupBy, setGroupBy] = useState<ManagerGroupBy>("none");
  const [sortBy, setSortBy] = useState<ManagerSortBy>("name");
  const [showFacets, setShowFacets] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => estimateLibraryItems.map((item) => adaptEstimateRowItemToManagerItem(item)), []);
  const searchedItems = useMemo(() => searchManagerItems(items, searchQuery), [items, searchQuery]);
  const filteredItems = useMemo(() => filterManagerItems(searchedItems, filters), [searchedItems, filters]);
  const sortedItems = useMemo(() => sortManagerItems(filteredItems, sortBy), [filteredItems, sortBy]);
  const groupedItems = useMemo(() => groupManagerItems(sortedItems, groupBy), [sortedItems, groupBy]);
  const facets = useMemo(() => getManagerFacets(filteredItems), [filteredItems]);
  const selectedItem = useMemo(() => filteredItems.find((item) => item.id === selectedItemId) ?? null, [filteredItems, selectedItemId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (!editable && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && selectedItemId) setSelectedItemId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId]);

  return (
    <WorkshopCollectionLayout
      searchLabel="Search library"
      searchPlaceholder="Search components, suppliers, category, unit..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchInputRef={searchRef}
      toolbarLabel="Library tools"
      toolbarPrefix="library"
      onFilter={() => setShowFacets((value) => !value)}
      onGroup={() => setGroupBy((value) => nextGroup(value))}
      addVisibleLabel="New component"
      addDisabled
      addActions={[
        {
          label: "Editing library items is not enabled yet",
          visibleLabel: "New component",
          disabled: true,
        },
      ]}
      searchActions={
        <div className="flex shrink-0 items-center gap-2 pr-2">
          <label className="flex items-center gap-1 text-[9px] font-bold uppercase leading-none tracking-[0.08em] text-tertiary">
            Sort
            <ControlSelect aria-label="Sort components" value={sortBy} onChange={(event) => setSortBy(event.target.value as ManagerSortBy)}>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="supplier">Supplier</option>
              <option value="unitCostAsc">Price asc</option>
              <option value="unitCostDesc">Price desc</option>
              <option value="pricingDate">Price date</option>
            </ControlSelect>
          </label>
          <label className="flex items-center gap-1 text-[9px] font-bold uppercase leading-none tracking-[0.08em] text-tertiary">
            Group
            <ControlSelect aria-label="Group components" value={groupBy} onChange={(event) => setGroupBy(event.target.value as ManagerGroupBy)}>
              <option value="none">None</option>
              <option value="category">Category</option>
              <option value="supplier">Supplier</option>
              <option value="kind">Kind</option>
              <option value="health">Health</option>
            </ControlSelect>
          </label>
          <span className="hidden items-center gap-1 border-l border-hairline pl-2 text-[9px] font-bold leading-none text-tertiary md:flex">
            <TableIcon size={11} weight="bold" aria-hidden="true" />
            Dense table
          </span>
          <span className="hidden items-center gap-1 text-[9px] font-bold leading-none text-tertiary lg:flex">
            <Stack size={11} weight="bold" aria-hidden="true" />
            Demo seed
          </span>
        </div>
      }
    >
      <div className="relative flex h-full min-h-0 overflow-hidden border border-hairline bg-white">
        {showFacets ? (
          <ComponentLibraryFacets
            facets={facets}
            visibleCount={filteredItems.length}
            filters={filters}
            onChange={setFilters}
            className="w-[240px] shrink-0 border-r border-hairline"
          />
        ) : null}
        <ComponentLibraryTable
          groupedItems={groupedItems}
          groupBy={groupBy}
          sortBy={sortBy}
          selectedId={selectedItem?.id ?? null}
          onSort={setSortBy}
          onSelect={setSelectedItemId}
          className="min-w-0 flex-1"
        />
        {selectedItem ? (
          <ComponentLibraryInspector
            item={selectedItem}
            onClose={() => setSelectedItemId(null)}
            className="absolute inset-0 z-20 w-full shrink-0 border-l-0 border-hairline md:static md:z-auto md:w-[380px] md:border-l"
          />
        ) : null}
      </div>
    </WorkshopCollectionLayout>
  );
}
