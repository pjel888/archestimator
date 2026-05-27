import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { getCurrentWorkspaceComponentRowsLibrary } from "@/lib/repositories/component-library-repository";

export default async function LibraryPage() {
  const componentLibrary = await getCurrentWorkspaceComponentRowsLibrary();

  return (
    <WorkshopPageShell
      title="Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Library"]}
      contentClassName=""
    >
      <LibraryPageClient
        categoryTree={componentLibrary.categoryTree}
        suppliers={componentLibrary.suppliers}
        brands={componentLibrary.brands}
        libraryFolders={componentLibrary.libraryFolders}
        libraryItems={componentLibrary.libraryItems}
      />
    </WorkshopPageShell>
  );
}
