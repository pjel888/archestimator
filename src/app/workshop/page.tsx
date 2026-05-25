import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import { listCurrentWorkspaceProjects } from "@/lib/repositories/workspace-repository";

export default async function WorkshopPage() {
  const { projects } = await listCurrentWorkspaceProjects();

  return (
    <WorkshopPageShell
      title="Workshop"
      showEyebrow={false}
      breadcrumbs={["Workshop"]}
      contentClassName="overflow-auto"
    >
      <WorkshopHomebaseClient liveProjects={projects} />
    </WorkshopPageShell>
  );
}
