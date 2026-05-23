import { describe, expect, it } from "vitest";
import type { DraggingPosition } from "react-complex-tree";

import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import {
  buildLibraryFolderTree,
  evaluateLibraryFolderDrop,
  getLibraryItemsForFolderNode,
  LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
  type LibraryFolderRecord,
} from "@/lib/component-library/library-folder-reorder";

const folders: LibraryFolderRecord[] = [
  {
    id: "folder-structure",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Structure",
    sort_order: 10,
    source_category_node_id: "category-structure",
    folder_kind: "taxonomy",
  },
  {
    id: "folder-concrete",
    workspace_id: "workspace-1",
    parent_id: "folder-structure",
    name: "Concrete",
    sort_order: 10,
    source_category_node_id: "category-concrete",
    folder_kind: "taxonomy",
  },
  {
    id: "folder-custom",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "My Assemblies",
    sort_order: 20,
    source_category_node_id: null,
    folder_kind: "custom",
  },
];

function row(input: Partial<EstimateRowItem> & Pick<EstimateRowItem, "id" | "material">): EstimateRowItem {
  return {
    description: "",
    supplier: "",
    source: "library",
    unit: "unit",
    itemCost: 1,
    quantity: 1,
    subTotal: 1,
    miscCost: 0,
    totalItemCosts: 1,
    category: "General",
    pricingSource: "test",
    pricingDate: "2026-05-23",
    ...input,
  };
}

describe("library folder reorder planning", () => {
  it("builds prefixed folder tree nodes from workspace-scoped folders", () => {
    const tree = buildLibraryFolderTree(folders);

    expect(tree.map((node) => node.id)).toEqual(["folder:folder-structure", "folder:folder-custom"]);
    expect(tree[0]?.children?.map((node) => node.id)).toEqual(["folder:folder-concrete"]);
    expect(tree[0]).toMatchObject({
      folderId: "folder-structure",
      label: "Structure",
      sourceCategoryNodeId: "category-structure",
      folderKind: "taxonomy",
    });
  });

  it("plans single-folder root and nesting moves with affected sibling updates", () => {
    const target: DraggingPosition = {
      targetType: "item",
      treeId: "library-folder-tree",
      targetItem: "folder:folder-custom",
      parentItem: LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
      depth: 0,
      linearIndex: 1,
    };

    const result = evaluateLibraryFolderDrop({
      folders,
      draggedItemIds: ["folder:folder-concrete"],
      target,
    });

    expect(result).toMatchObject({
      ok: true,
      plan: {
        draggedFolderId: "folder-concrete",
        sourceParentId: "folder-structure",
        targetParentId: "folder-custom",
      },
    });
    expect(result.ok ? result.plan.updates : []).toEqual([
      { id: "folder-concrete", parentId: "folder-custom", sortOrder: 10 },
    ]);
  });

  it("rejects descendant cycles and no-op drops", () => {
    const cycleTarget: DraggingPosition = {
      targetType: "item",
      treeId: "library-folder-tree",
      targetItem: "folder:folder-concrete",
      parentItem: LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
      depth: 1,
      linearIndex: 1,
    };
    const noOpTarget: DraggingPosition = {
      targetType: "between-items",
      treeId: "library-folder-tree",
      parentItem: "folder:folder-structure",
      childIndex: 0,
      linePosition: "top",
      linearIndex: 1,
      depth: 1,
    };

    expect(evaluateLibraryFolderDrop({ folders, draggedItemIds: ["folder:folder-structure"], target: cycleTarget })).toMatchObject({
      ok: false,
      code: "cycle",
    });
    expect(evaluateLibraryFolderDrop({ folders, draggedItemIds: ["folder:folder-concrete"], target: noOpTarget })).toMatchObject({
      ok: false,
      code: "no-op",
    });
  });

  it("filters row items by explicit folder assignment before taxonomy fallback", () => {
    const [structure] = buildLibraryFolderTree(folders);
    const items = [
      row({ id: "explicit", material: "Explicit", libraryFolderId: "folder-custom", categoryNodeId: "category-concrete" }),
      row({ id: "fallback", material: "Fallback", categoryNodeId: "category-concrete" }),
      row({ id: "other", material: "Other", categoryNodeId: "category-finishes" }),
    ];

    expect(getLibraryItemsForFolderNode(structure, items).map((item) => item.id)).toEqual(["fallback"]);
  });
});
