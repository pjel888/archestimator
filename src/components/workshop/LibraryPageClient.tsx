"use client";

import { ComponentLibraryManager } from "./component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

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
