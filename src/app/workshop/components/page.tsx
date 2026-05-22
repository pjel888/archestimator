import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";
import { getCurrentWorkspaceComponentLibrary } from "@/lib/repositories/component-library-repository";

export default async function ComponentsPage() {
  const componentLibrary = await getCurrentWorkspaceComponentLibrary();

  return (
    <WorkshopPageShell
      title="Component Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Components"]}
      footer={
        <>
          <span>Component workspace</span>
          <span>Custom library</span>
        </>
      }
    >
      <ComponentsPageClient
        categoryTree={componentLibrary.categoryTree}
        suppliers={componentLibrary.suppliers}
        libraryItems={componentLibrary.libraryItems}
        templates={componentLibrary.templates}
      />
    </WorkshopPageShell>
  );
}
