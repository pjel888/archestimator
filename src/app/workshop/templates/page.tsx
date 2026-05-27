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
    >
      <TemplatesPageClient templates={templates} />
    </WorkshopPageShell>
  );
}
