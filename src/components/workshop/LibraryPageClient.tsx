"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

const ComponentLibraryManager = dynamic(() =>
  import("./component-library-manager/ComponentLibraryManager").then((module) => module.ComponentLibraryManager),
  {
    loading: () => <LibraryManagerFallback />,
  },
);

function LibraryManagerFallback() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xs border-r border-hairline bg-white" role="status" aria-label="Loading library">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
          <div className="flex min-w-0 flex-1 flex-col p-2" aria-hidden="true">
            <Skeleton className="h-7 w-32" />
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-[236px] w-full" />
              ))}
            </div>
          </div>
          <div className="hidden w-[312px] shrink-0 border-l border-hairline p-2 lg:block" aria-hidden="true">
            <Skeleton className="h-7 w-full" />
            <div className="mt-2 space-y-1">
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading library</span>
    </div>
  );
}

type LibraryPageClientProps = {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  libraryItems?: EstimateRowItem[];
};

export function LibraryPageClient({ categoryTree, suppliers, brands, libraryFolders, libraryItems }: LibraryPageClientProps = {}) {
  return (
    <ComponentLibraryManager
      categoryTree={categoryTree}
      suppliers={suppliers}
      brands={brands}
      libraryFolders={libraryFolders}
      libraryItems={libraryItems}
    />
  );
}
