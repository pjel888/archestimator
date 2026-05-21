import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";

export default function ComponentsPage() {
  return (
    <WorkshopPageShell
      title="Components"
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
      <ComponentsPageClient />
    </WorkshopPageShell>
  );
}
