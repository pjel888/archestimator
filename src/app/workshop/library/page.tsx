import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { getCurrentWorkspaceComponentLibrary } from "@/lib/repositories/component-library-repository";

export default async function LibraryPage() {
  const componentLibrary = await getCurrentWorkspaceComponentLibrary();

  return (
    <WorkshopPageShell
      title="Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Library"]}
      footer={
        <>
          <span>Workspace library</span>
          <span>Categories and templates</span>
        </>
      }
    >
      <LibraryPageClient
        categoryTree={componentLibrary.categoryTree}
        suppliers={componentLibrary.suppliers}
        libraryFolders={componentLibrary.libraryFolders}
        libraryItems={componentLibrary.libraryItems}
        templates={componentLibrary.templates}
      />
    </WorkshopPageShell>
  );
}
