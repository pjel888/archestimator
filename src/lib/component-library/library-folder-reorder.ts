import type { TreeItemIndex } from "react-complex-tree";

import { readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { filterMapBy } from "@/lib/util/array";

export const LIBRARY_FOLDER_TREE_ID = "library-folder-tree";
export const LIBRARY_FOLDER_TREE_ROOT_ITEM_ID = "library-folder-tree-root";
export const LIBRARY_FOLDER_ID_PREFIX = "folder:";
export const LIBRARY_FOLDER_SORT_ORDER_STEP = 10;
const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";

export type LibraryFolderKind = "taxonomy" | "custom";

export type LibraryFolderRecord = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  source_category_node_id: string | null;
  folder_kind: LibraryFolderKind;
  is_default_category?: number | boolean | null;
};

export type LibraryFolderTreeNode = {
  id: string;
  folderId: string;
  label: string;
  parentId: string | null;
  sortOrder: number;
  sourceCategoryNodeId: string | null;
  folderKind: LibraryFolderKind;
  children?: LibraryFolderTreeNode[];
};

export type LibraryFolderReorderUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type LibraryFolderReorderPlan = {
  draggedFolderId: string;
  sourceParentId: string | null;
  targetParentId: string | null;
  targetIndex: number;
  nextFolders: LibraryFolderRecord[];
  updates: LibraryFolderReorderUpdate[];
};

export type LibraryFolderDeletePlan = {
  deletedFolder: LibraryFolderRecord;
  nextFolders: LibraryFolderRecord[];
  liftedChildUpdates: LibraryFolderReorderUpdate[];
};

export type LibraryFolderCreatePlacement = "top" | "bottom";

type LibraryFolderReorderFailureCode =
  | "unknown-dragged-folder"
  | "unknown-target-parent"
  | "synthetic-root-drag"
  | "multi-drag-unsupported"
  | "self-drop"
  | "cycle"
  | "no-op"
  | "unsupported-target";

export type LibraryFolderReorderResult =
  | { ok: true; plan: LibraryFolderReorderPlan }
  | { ok: false; code: LibraryFolderReorderFailureCode; message: string };

type FolderLocation = {
  folder: LibraryFolderRecord;
  parentId: string | null;
  index: number;
};

function fail(code: LibraryFolderReorderFailureCode, message: string): LibraryFolderReorderResult {
  return { ok: false, code, message };
}

export function toLibraryFolderTreeItemId(folderId: string) {
  return `${LIBRARY_FOLDER_ID_PREFIX}${folderId}`;
}

export function fromLibraryFolderTreeItemId(itemId: TreeItemIndex): string {
  const value = String(itemId);
  return value.startsWith(LIBRARY_FOLDER_ID_PREFIX) ? value.slice(LIBRARY_FOLDER_ID_PREFIX.length) : value;
}

function compareFolders(left: LibraryFolderRecord, right: LibraryFolderRecord) {
  return left.sort_order - right.sort_order || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

export function getUserLibraryFolders(folders: LibraryFolderRecord[]): LibraryFolderRecord[] {
  const customFolders = folders.filter((folder) => folder.folder_kind === "custom");
  const customFolderIds = new Set(customFolders.map((folder) => folder.id));
  return customFolders.map((folder) => {
    if (!folder.parent_id || customFolderIds.has(folder.parent_id)) return folder;
    return { ...folder, parent_id: null };
  });
}

export function buildLibraryFolderTree(folders: LibraryFolderRecord[]): LibraryFolderTreeNode[] {
  const foldersByParentId = new Map<string | null, LibraryFolderRecord[]>();
  for (const folder of folders) {
    const siblings = foldersByParentId.get(folder.parent_id) ?? [];
    siblings.push(folder);
    foldersByParentId.set(folder.parent_id, siblings);
  }

  for (const siblings of foldersByParentId.values()) {
    siblings.sort(compareFolders);
  }

  function attach(parentId: string | null): LibraryFolderTreeNode[] {
    return (foldersByParentId.get(parentId) ?? []).map((folder) => {
      const children = attach(folder.id);
      return {
        id: toLibraryFolderTreeItemId(folder.id),
        folderId: folder.id,
        label: folder.name,
        parentId: folder.parent_id,
        sortOrder: folder.sort_order,
        sourceCategoryNodeId: folder.source_category_node_id,
        folderKind: folder.folder_kind,
        children: children.length ? children : undefined,
      };
    });
  }

  return attach(null);
}

export function getLibraryFolderCreateSortOrder(
  siblings: Array<Pick<LibraryFolderRecord, "sort_order">>,
  placement: LibraryFolderCreatePlacement = "bottom",
) {
  if (siblings.length === 0) return LIBRARY_FOLDER_SORT_ORDER_STEP;
  if (placement === "top") {
    return Math.max(0, Math.min(...siblings.map((folder) => folder.sort_order)) - LIBRARY_FOLDER_SORT_ORDER_STEP);
  }
  return Math.max(...siblings.map((folder) => folder.sort_order)) + LIBRARY_FOLDER_SORT_ORDER_STEP;
}

function findFolderLocation(folders: LibraryFolderRecord[], id: string): FolderLocation | null {
  const siblingsByParentId = new Map<string | null, LibraryFolderRecord[]>();
  for (const folder of folders) {
    const siblings = siblingsByParentId.get(folder.parent_id) ?? [];
    siblings.push(folder);
    siblingsByParentId.set(folder.parent_id, siblings);
  }

  for (const siblings of siblingsByParentId.values()) {
    siblings.sort(compareFolders);
  }

  for (const [parentId, siblings] of siblingsByParentId.entries()) {
    for (let index = 0; index < siblings.length; index += 1) {
      const folder = siblings[index];
      if (folder.id === id) return { folder, parentId, index };
    }
  }

  return null;
}

function getChildren(folders: LibraryFolderRecord[], parentId: string | null) {
  return folders.filter((folder) => folder.parent_id === parentId).sort(compareFolders);
}

function getDescendantFolderIds(folders: LibraryFolderRecord[], folderId: string): Set<string> {
  const ids = new Set<string>();

  function visit(parentId: string) {
    for (const child of getChildren(folders, parentId)) {
      ids.add(child.id);
      visit(child.id);
    }
  }

  visit(folderId);
  return ids;
}

function normalizeFolderSortOrders(folders: LibraryFolderRecord[], parentId: string | null): LibraryFolderRecord[] {
  const sortedChildren = getChildren(folders, parentId);
  const nextSortOrderById = new Map(sortedChildren.map((folder, index) => [folder.id, (index + 1) * LIBRARY_FOLDER_SORT_ORDER_STEP]));
  return folders.map((folder) => (
    folder.parent_id === parentId && nextSortOrderById.has(folder.id)
      ? { ...folder, sort_order: nextSortOrderById.get(folder.id)! }
      : folder
  ));
}

function insertFolder(folders: LibraryFolderRecord[], targetParentId: string | null, targetIndex: number, folderToInsert: LibraryFolderRecord) {
  const withoutDragged = folders.filter((folder) => folder.id !== folderToInsert.id);
  const targetSiblings = getChildren(withoutDragged, targetParentId);
  const boundedIndex = Math.max(0, Math.min(targetIndex, targetSiblings.length));
  const nextSiblingIds = targetSiblings.map((folder) => folder.id);
  nextSiblingIds.splice(boundedIndex, 0, folderToInsert.id);
  const sortOrderById = new Map(nextSiblingIds.map((id, index) => [id, (index + 1) * LIBRARY_FOLDER_SORT_ORDER_STEP]));

  return withoutDragged.concat({
    ...folderToInsert,
    parent_id: targetParentId,
    sort_order: sortOrderById.get(folderToInsert.id) ?? LIBRARY_FOLDER_SORT_ORDER_STEP,
  }).map((folder) => (
    sortOrderById.has(folder.id)
      ? { ...folder, parent_id: targetParentId, sort_order: sortOrderById.get(folder.id)! }
      : folder
  ));
}

function buildSiblingUpdates(folders: LibraryFolderRecord[], parentIds: Array<string | null>): LibraryFolderReorderUpdate[] {
  const uniqueParentIds = Array.from(new Set(parentIds.map((parentId) => parentId ?? "__root__")))
    .map((value) => (value === "__root__" ? null : value));

  return uniqueParentIds.flatMap((parentId) =>
    getChildren(folders, parentId).map((folder, index) => ({
      id: folder.id,
      parentId,
      sortOrder: (index + 1) * LIBRARY_FOLDER_SORT_ORDER_STEP,
    })),
  );
}

export function planLibraryFolderDelete(folders: LibraryFolderRecord[], folderId: string): LibraryFolderDeletePlan | null {
  const deletedFolder = folders.find((folder) => folder.id === folderId);
  if (!deletedFolder) return null;

  const childFolders = getChildren(folders, folderId);
  const targetSiblings = getChildren(folders, deletedFolder.parent_id).filter((folder) => folder.id !== folderId);
  const baseSortOrder = targetSiblings.reduce((max, folder) => Math.max(max, folder.sort_order), 0);
  const liftedChildUpdates = childFolders.map((folder, index) => ({
    id: folder.id,
    parentId: deletedFolder.parent_id,
    sortOrder: baseSortOrder + (index + 1) * LIBRARY_FOLDER_SORT_ORDER_STEP,
  }));
  const updateById = new Map(liftedChildUpdates.map((update) => [update.id, update]));
  const nextFolders = filterMapBy(
    folders,
    (folder) => folder.id !== folderId,
    (folder) => {
      const update = updateById.get(folder.id);
      return update ? { ...folder, parent_id: update.parentId, sort_order: update.sortOrder } : folder;
    },
  );

  return { deletedFolder, nextFolders, liftedChildUpdates };
}

function getFolderStructureSignature(folders: LibraryFolderRecord[]) {
  return [...folders]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((folder) => `${folder.id}:${folder.parent_id ?? "root"}:${folder.sort_order}`)
    .join("|");
}

export function buildLibraryFolderReorderPlan({
  folders,
  draggedFolderId,
  targetParentId,
  targetIndex,
}: {
  folders: LibraryFolderRecord[];
  draggedFolderId: string;
  targetParentId: string | null;
  targetIndex: number;
}): LibraryFolderReorderResult {
  const sourceLocation = findFolderLocation(folders, draggedFolderId);
  if (!sourceLocation) return fail("unknown-dragged-folder", "Dragged library folder was not found.");
  if (targetParentId === draggedFolderId) return fail("self-drop", "A library folder cannot be dropped inside itself.");
  if (targetParentId && !findFolderLocation(folders, targetParentId)) return fail("unknown-target-parent", "Drop target library folder was not found.");
  if (targetParentId && getDescendantFolderIds(folders, draggedFolderId).has(targetParentId)) {
    return fail("cycle", "A library folder cannot be dropped inside one of its descendants.");
  }

  const childCount = getChildren(folders, targetParentId).length;
  const boundedTargetIndex = Math.max(0, Math.min(targetIndex, childCount));
  const adjustedTargetIndex = sourceLocation.parentId === targetParentId && sourceLocation.index < boundedTargetIndex
    ? boundedTargetIndex - 1
    : boundedTargetIndex;

  if (sourceLocation.parentId === targetParentId && sourceLocation.index === adjustedTargetIndex) {
    return fail("no-op", "Library folder is already in that position.");
  }

  let nextFolders = insertFolder(folders, targetParentId, adjustedTargetIndex, sourceLocation.folder);
  nextFolders = normalizeFolderSortOrders(nextFolders, sourceLocation.parentId);
  nextFolders = normalizeFolderSortOrders(nextFolders, targetParentId);
  // react-doctor-disable-next-line react-doctor/insecure-crypto-risk -- Structure signature is deterministic equality for reorder no-op detection, not security-sensitive cryptography.
  if (getFolderStructureSignature(nextFolders) === getFolderStructureSignature(folders)) {
    return fail("no-op", "Library folder is already in that position.");
  }

  return {
    ok: true,
    plan: {
      draggedFolderId,
      sourceParentId: sourceLocation.parentId,
      targetParentId,
      targetIndex: adjustedTargetIndex,
      nextFolders,
      updates: buildSiblingUpdates(nextFolders, [sourceLocation.parentId, targetParentId]),
    },
  };
}

function collectFolderPlacement(node: LibraryFolderTreeNode) {
  const folderIds = new Set<string>([node.folderId]);
  const sourceCategoryNodeIds = new Set<string>();
  if (node.sourceCategoryNodeId) sourceCategoryNodeIds.add(node.sourceCategoryNodeId);

  function visit(current: LibraryFolderTreeNode) {
    for (const child of current.children ?? []) {
      folderIds.add(child.folderId);
      if (child.sourceCategoryNodeId) sourceCategoryNodeIds.add(child.sourceCategoryNodeId);
      visit(child);
    }
  }

  visit(node);
  return { folderIds, sourceCategoryNodeIds };
}

function isProjectComponentFolderId(folderId: string | null | undefined) {
  return typeof folderId === "string" && folderId.startsWith(`${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-`);
}

function isProjectComponentProjectionItem(item: EstimateRowItem) {
  return readProjectComponentProjectionMetadata(item.metadata) !== null;
}

export function getLibraryItemsForFolderNode(node: LibraryFolderTreeNode | null, items: EstimateRowItem[]): EstimateRowItem[] {
  if (!node) return items;
  const { folderIds, sourceCategoryNodeIds } = collectFolderPlacement(node);
  return items.filter((item) => {
    if (item.libraryFolderId) {
      if (!folderIds.has(item.libraryFolderId)) return false;
      if (isProjectComponentFolderId(item.libraryFolderId)) return isProjectComponentProjectionItem(item);
      return true;
    }
    return Boolean(item.categoryNodeId && sourceCategoryNodeIds.has(item.categoryNodeId));
  });
}
