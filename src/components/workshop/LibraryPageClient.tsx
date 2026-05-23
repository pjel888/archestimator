"use client";

import { ComponentLibraryManager } from "./component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { EstimateTemplate } from "./component-library/templates";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

type LibraryPageClientProps = {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  libraryFolders?: LibraryFolderRecord[];
  libraryItems?: EstimateRowItem[];
  templates?: EstimateTemplate[];
};

export function LibraryPageClient({ categoryTree, suppliers, libraryFolders, libraryItems, templates }: LibraryPageClientProps = {}) {
  return (
    <ComponentLibraryManager
      categoryTree={categoryTree}
      suppliers={suppliers}
      libraryFolders={libraryFolders}
      libraryItems={libraryItems}
      templates={templates}
    />
  );
}
