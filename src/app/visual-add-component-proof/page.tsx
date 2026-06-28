"use client";

import { useEffect, useState } from "react";

import { AddComponentModal } from "@/components/workshop/component-library-manager/AddComponentModal";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";

const categoryTree: ComponentLibraryTaxonomyNode[] = [
  {
    id: "category-all-components",
    label: "All Components",
    kind: "organizer",
    children: [
      {
        id: "category-concrete-masonry",
        label: "Concrete & Masonry",
        kind: "organizer",
        children: [
          {
            id: "category-reinforcement",
            label: "Reinforcement",
            kind: "category",
          },
        ],
      },
    ],
  },
];

const folders: LibraryFolderRecord[] = [
  {
    id: "folder-reinforcement",
    workspace_id: "workspace-proof",
    parent_id: null,
    name: "Reinforcement",
    sort_order: 1,
    source_category_node_id: "category-reinforcement",
    folder_kind: "custom",
  },
];

export default function VisualAddComponentProofPage() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EstimateRowItem[]>([]);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(760px_520px_at_12%_4%,rgba(202,210,222,0.58),transparent_64%),radial-gradient(680px_480px_at_92%_14%,rgba(225,229,214,0.38),transparent_58%),linear-gradient(180deg,#f6f7f8,#eef0f2)]">
      <AddComponentModal
        open={open}
        folders={folders}
        categoryTree={categoryTree}
        suppliers={[{ id: "supplier-steelasia-trading", name: "SteelAsia Trading Corp.", sort_order: 1 }]}
        brands={[{ id: "brand-steelasia", name: "SteelAsia", normalized_name: "steelasia", sort_order: 1 }]}
        libraryItems={items}
        selectedFolderId={null}
        onOpenChange={setOpen}
        onComponentCreated={(item) => setItems((current) => [item, ...current])}
      />
    </main>
  );
}
