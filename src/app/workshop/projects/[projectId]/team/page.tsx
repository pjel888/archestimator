import { notFound } from "next/navigation";

import { ProjectTeamAccessPanel } from "@/components/workshop/teamwork/ProjectTeamAccessPanel";
import { getProjectCollaborationSummary, getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

type ProjectTeamAccessPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTeamAccessPage({ params }: ProjectTeamAccessPageProps) {
  const { projectId } = await params;
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) notFound();

  const summary = await getProjectCollaborationSummary(project.id);
  if (!summary) notFound();

  return (
    <main className="h-full overflow-auto p-2" aria-label="Project team access">
      <div className="mx-auto w-full max-w-4xl rounded-xs border border-hairline bg-white p-3">
        <h2 className="text-[12px] font-medium leading-4 text-ink">Team access</h2>
        <p className="mt-1 text-[10px] leading-4 text-tertiary">
          Manage project members and estimate-specific access where your role allows it.
        </p>
        <div className="mt-4">
          <ProjectTeamAccessPanel projectId={project.id} initialSummary={summary} />
        </div>
      </div>
    </main>
  );
}
