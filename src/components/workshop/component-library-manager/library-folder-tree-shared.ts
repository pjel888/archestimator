import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";

export const COMPONENT_VIEW_MODES = [
  { id: "default", label: "Folders" },
  { id: "suppliers", label: "Suppliers" },
  { id: "brand", label: "Brands" },
] as const;

export const ALL_COMPONENTS_FOLDER_ID = "all-components";

export type ComponentViewMode = (typeof COMPONENT_VIEW_MODES)[number]["id"];

export type CreateLibraryFolderHandler = (
  parentId: string | null,
  options?: { onCreated?: (folder: LibraryFolderRecord) => void; placement?: "top" | "bottom" },
) => void;

export type ReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

export function isAllComponentsFolderId(folderId: string | null | undefined) {
  return folderId === ALL_COMPONENTS_FOLDER_ID;
}
