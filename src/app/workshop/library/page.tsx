import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { getCurrentWorkspaceComponentRowsLibrary } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Library", searchParams: await searchParams });

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
