import { notFound } from "next/navigation";
import { FolderOpen, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const { project } = await getCurrentWorkspaceProject(projectId);
  const sampleProject = sampleProjects.find((item) => item.id === projectId);

  if (!project && !sampleProject) notFound();

  const name = project?.name ?? sampleProject?.name ?? "Project";
  const client = project?.client_name ?? sampleProject?.client ?? "No client yet";
  const location = project?.location ?? sampleProject?.location ?? "No location";
  const status = project?.status ?? sampleProject?.status ?? "Draft";
  const code = project?.project_code ?? "No project code";

  return (
    <section className="min-h-full p-2" aria-label={`${name} dashboard`}>
      <div className="rounded-xl border border-hairline bg-white p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-tertiary">Project dashboard</p>
            <h2 className="mt-1 text-[12px] font-semibold leading-tight tracking-[-0.035em] text-ink">{name}</h2>
            <p className="mt-1 text-[10px] leading-4 text-tertiary">{client} · {location}</p>
          </div>
          <Button variant="primary" size="sm" className="h-8 gap-1">
            <Plus size={14} weight="bold" aria-hidden="true" />
            Action
          </Button>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-hairline bg-surface-muted p-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-tertiary">Status</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{status}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-muted p-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-tertiary">Project code</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{code}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-muted p-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-tertiary">Source</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{project ? "Supabase" : "Sample"}</p>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-dashed border-divider bg-white p-2">
          <div className="flex items-center gap-2 text-[10px] font-medium text-tertiary">
            <FolderOpen size={14} aria-hidden="true" />
            Live project detail is connected. Next modules should add estimates, totals, exports, and recent activity from Supabase.
          </div>
        </div>
      </div>
    </section>
  );
}
