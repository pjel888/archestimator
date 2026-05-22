"use client";

import { ComponentLibraryManager } from "./component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

type ComponentsPageClientProps = {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  libraryItems?: EstimateRowItem[];
};

export function ComponentsPageClient({ categoryTree, suppliers, libraryItems }: ComponentsPageClientProps = {}) {
  return <ComponentLibraryManager categoryTree={categoryTree} suppliers={suppliers} libraryItems={libraryItems} />;
}
