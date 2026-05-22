"use client";

import { ComponentLibraryManager } from "./component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "./estimate-tree-data";
import type { EstimateTemplate } from "./component-library/templates";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";

type ComponentsPageClientProps = {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  libraryItems?: EstimateRowItem[];
  templates?: EstimateTemplate[];
};

export function ComponentsPageClient({ categoryTree, suppliers, libraryItems, templates }: ComponentsPageClientProps = {}) {
  return <ComponentLibraryManager categoryTree={categoryTree} suppliers={suppliers} libraryItems={libraryItems} templates={templates} />;
}
