import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";

export default function ComponentsPage() {
  return (
    <WorkshopPageShell
      title="Components"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Components"]}
      contentClassName=""
      footer={
        <>
          <span>Workspace library</span>
          <span>Demo seed</span>
        </>
      }
    >
      <ComponentsPageClient />
    </WorkshopPageShell>
  );
}
