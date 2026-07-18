export const UNCATEGORIZED_CATEGORY_LABEL = "Uncategorized";

const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";

export type ComponentCategoryFolder = {
  id: string;
  workspace_id?: string;
  parent_id: string | null;
  name: string;
  is_default_category?: boolean | number | null;
};

export type ResolvedComponentCategory = {
  categoryId?: string;
  category: string;
  categoryPath: string[];
  categoryPathIds: string[];
};

export type ComponentCategoryResolver = (
  folderId: string | null | undefined,
  fallbackCategory?: string,
) => ResolvedComponentCategory;

export function isSyntheticProjectComponentFolderId(folderId: string | null | undefined) {
  return typeof folderId === "string" && folderId.startsWith(`${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-`);
}

export function createComponentCategoryResolver(
  folders: readonly ComponentCategoryFolder[],
): ComponentCategoryResolver {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const hasDuplicateFolderIds = folderById.size !== folders.length;

  return (folderId, fallbackCategory = UNCATEGORIZED_CATEGORY_LABEL) => {
    const fallback = fallbackCategory.trim() || UNCATEGORIZED_CATEGORY_LABEL;
    if (!folderId || isSyntheticProjectComponentFolderId(folderId)) {
      return { category: fallback, categoryPath: [fallback], categoryPathIds: [] };
    }
    if (hasDuplicateFolderIds) {
      return { category: fallback, categoryPath: [fallback], categoryPathIds: [] };
    }
    const leaf = folderById.get(folderId);
    if (!leaf) return { category: fallback, categoryPath: [fallback], categoryPathIds: [] };

    const labels: string[] = [];
    const ids: string[] = [];
    const visited = new Set<string>();
    let current: ComponentCategoryFolder | undefined = leaf;
    const workspaceId = leaf.workspace_id;

    while (current) {
      if (visited.has(current.id)) return { category: fallback, categoryPath: [fallback], categoryPathIds: [] };
      if (workspaceId && current.workspace_id && current.workspace_id !== workspaceId) {
        return { category: fallback, categoryPath: [fallback], categoryPathIds: [] };
      }
      visited.add(current.id);
      labels.unshift(current.name.trim() || UNCATEGORIZED_CATEGORY_LABEL);
      ids.unshift(current.id);
      if (!current.parent_id) break;
      const parent = folderById.get(current.parent_id);
      if (!parent) return { category: fallback, categoryPath: [fallback], categoryPathIds: [] };
      current = parent;
    }

    return {
      categoryId: leaf.id,
      category: leaf.name.trim() || UNCATEGORIZED_CATEGORY_LABEL,
      categoryPath: labels,
      categoryPathIds: ids,
    };
  };
}

export function resolveComponentCategory(
  folders: readonly ComponentCategoryFolder[],
  folderId: string | null | undefined,
  fallbackCategory = UNCATEGORIZED_CATEGORY_LABEL,
): ResolvedComponentCategory {
  return createComponentCategoryResolver(folders)(folderId, fallbackCategory);
}

export function getDefaultComponentCategoryFolder(folders: readonly ComponentCategoryFolder[]) {
  return folders.find((folder) => folder.is_default_category === true || folder.is_default_category === 1);
}
