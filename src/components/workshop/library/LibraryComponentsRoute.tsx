import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { getCurrentWorkspaceComponentRowsLibrary } from "@/lib/repositories/component-library-repository";

/**
 * Shared server content for the Components tab. Rendered by both the
 * library index route (until the Overview home ships) and the
 * /workshop/library/components sub-route.
 */
export async function LibraryComponentsRoute() {
  const componentLibrary = await getCurrentWorkspaceComponentRowsLibrary();

  return (
    <LibraryPageClient
      categoryTree={componentLibrary.categoryTree}
      suppliers={componentLibrary.suppliers}
      brands={componentLibrary.brands}
      libraryFolders={componentLibrary.libraryFolders}
      libraryItems={componentLibrary.libraryItems}
    />
  );
}
