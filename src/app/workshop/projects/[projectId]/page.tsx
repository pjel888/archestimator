import { FolderOpen, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const project = sampleProjects.find((item) => item.id === projectId) ?? sampleProjects[0];

  return (
    <section className="min-h-full p-2" aria-label={`${project.name} dashboard`}>
      <div className="rounded-xl border border-hairline bg-white p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-tertiary">Project dashboard</p>
            <h2 className="mt-1 text-[12px] font-semibold leading-tight tracking-[-0.035em] text-ink">{project.name}</h2>
            <p className="mt-1 text-[10px] leading-4 text-tertiary">{project.client} · {project.location}</p>
          </div>
          <Button variant="primary" size="sm" className="h-8 gap-1">
            <Plus size={14} weight="bold" aria-hidden="true" />
            Action
          </Button>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-hairline bg-surface-muted p-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-tertiary">Estimate total</p>
            <p className="mt-1 font-mono text-[12px] font-semibold text-ink">{project.estimateTotal}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-muted p-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-tertiary">Active revision</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{project.metrics.revision}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-muted p-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-tertiary">Line items</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">{project.metrics.lineItems}</p>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-dashed border-divider bg-white p-2">
          <div className="flex items-center gap-2 text-[10px] font-medium text-tertiary">
            <FolderOpen size={14} aria-hidden="true" />
            Dashboard content placeholder. Next slice should define the approved project dashboard modules before adding production data.
          </div>
        </div>
      </div>
    </section>
  );
}
