"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";

import { WorkshopCollectionLayout } from "./WorkshopCollectionLayout";
import { estimateLibraryItems } from "./estimate-tree-data";

export function ComponentsPageClient() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return estimateLibraryItems;
    const q = searchQuery.toLowerCase();
    return estimateLibraryItems.filter((item) =>
      [item.material, item.category, item.supplier, item.unit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  return (
    <WorkshopCollectionLayout
      searchLabel="Search components"
      searchPlaceholder="Search components"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      toolbarLabel="Component tools"
      toolbarPrefix="components"
      addVisibleLabel="Create Components"
    >
      {filteredItems.length > 0 ? (
        <section aria-label="Component library items" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-lg border border-hairline bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[11px] font-bold leading-4 text-ink">{item.material}</h2>
                  <p className="truncate text-[9px] font-semibold leading-3 text-tertiary">{item.category}</p>
                </div>
                <span className="shrink-0 rounded-sm bg-surfaceMuted px-1.5 py-1 text-[9px] font-bold leading-none text-tertiary">
                  {item.unit}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] leading-4 text-secondary">
                <span className="truncate">Supplier: {item.supplier}</span>
                <span className="text-right font-bold text-ink">₱{item.itemCost.toLocaleString()}</span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState title="No components matched" description="Try clearing or changing the component search." />
      )}
    </WorkshopCollectionLayout>
  );
}
