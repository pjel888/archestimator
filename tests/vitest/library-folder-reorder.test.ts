import { describe, expect, it } from "vitest";

import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import {
  buildLibraryFolderTree,
  getLibraryFolderCreateSortOrder,
  getLibraryItemsForFolderNode,
  getUserLibraryFolders,
  planLibraryFolderDelete,
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
  it("returns no folder nodes for a workspace with no folders", () => {
    expect(buildLibraryFolderTree([])).toEqual([]);
  });

  it("keeps only user-created custom folders for the library folder surface", () => {
    const nestedCustomFolder = {
      ...folders[2],
      id: "folder-custom-under-legacy-taxonomy",
      parent_id: "folder-structure",
    };

    expect(getUserLibraryFolders([...folders, nestedCustomFolder])).toEqual([
      folders[2],
      {
        ...nestedCustomFolder,
        parent_id: null,
      },
    ]);
  });

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

  it("plans created folder sort orders for top-level and child insertion", () => {
    expect(getLibraryFolderCreateSortOrder([], "top")).toBe(10);
    expect(getLibraryFolderCreateSortOrder([{ sort_order: 10 }, { sort_order: 20 }], "top")).toBe(0);
    expect(getLibraryFolderCreateSortOrder([{ sort_order: 0 }, { sort_order: 10 }], "top")).toBe(0);
    expect(getLibraryFolderCreateSortOrder([{ sort_order: 10 }, { sort_order: 20 }], "bottom")).toBe(30);
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

  it("lifts child folders into the deleted folder parent without sibling sort collisions", () => {
    const result = planLibraryFolderDelete(folders, "folder-structure");

    expect(result?.liftedChildUpdates).toEqual([
      { id: "folder-concrete", parentId: null, sortOrder: 30 },
    ]);
    expect(result?.nextFolders.map((folder) => [folder.id, folder.parent_id, folder.sort_order])).toEqual([
      ["folder-concrete", null, 30],
      ["folder-custom", null, 20],
    ]);
  });
});
