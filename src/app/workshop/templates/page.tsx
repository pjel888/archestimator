import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { TemplatesPageClient } from "@/components/workshop/TemplatesPageClient";
import { getCurrentWorkspaceEstimateTemplates } from "@/lib/repositories/component-library-repository";

export default async function TemplatesPage() {
  const templates = await getCurrentWorkspaceEstimateTemplates();

  return (
    <WorkshopPageShell
      title="Templates"
      eyebrow="Templates"
      showEyebrow={false}
      breadcrumbs={["Templates"]}
      footer={
        <>
          <span>Workspace library</span>
          <span>Templates</span>
        </>
      }
    >
      <TemplatesPageClient templates={templates} />
    </WorkshopPageShell>
  );
}
