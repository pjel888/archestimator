import { readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import type { ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";

const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";

/**
 * The project projection loader intentionally composes project-specific rows
 * with the workspace library for estimate pickers. The workspace Components
 * page needs the inverse: a truthful project-only management catalogue.
 */
export function toProjectOnlyComponentRowsLibrary(
  dataset: ComponentRowsLibraryDataset,
  projectId: string,
): ComponentRowsLibraryDataset {
  const projectFolderId = `${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-${projectId}`;
  const libraryItems = dataset.libraryItems.filter((item) => {
    if (item.source !== "project") return false;
    return readProjectComponentProjectionMetadata(item.metadata)?.projectId === projectId;
  });

  return {
    ...dataset,
    isPartial: false,
    libraryFolders: dataset.libraryFolders.filter((folder) =>
      folder.id === projectFolderId || folder.id.startsWith(`${projectFolderId}-estimate-`),
    ),
    libraryItems,
    loadedComponentCount: libraryItems.length,
    totalComponentCount: libraryItems.length,
  };
}
