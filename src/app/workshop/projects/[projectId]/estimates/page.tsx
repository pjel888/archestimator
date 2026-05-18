import { notFound } from "next/navigation";

import { EstimateListCard } from "@/components/workshop/EstimateListCard";
import { NewEstimateForm } from "@/components/workshop/NewEstimateForm";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const { project, estimates, firstNodeByEstimateId } = await listProjectEstimates(projectId);

  if (!project) notFound();

  return (
    <section className="min-h-full p-2" aria-label={`${project.name} estimates`}>
      <div className="space-y-2">
        <div className="rounded-lg border border-hairline bg-white p-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">Project estimates</p>
          <h1 className="mt-0.5 text-[12px] font-bold tracking-[-0.025em] text-ink">{project.name}</h1>
          <p className="mt-1 text-[10px] leading-4 text-tertiary">
            Create draft estimates, then open the first area node for the live estimate workspace.
          </p>
        </div>

        <NewEstimateForm projectId={project.id} />

        {estimates.length > 0 ? (
          <section aria-label="Live estimates" className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {estimates.map((estimate) => (
              <EstimateListCard key={estimate.id} estimate={estimate} firstNodeId={firstNodeByEstimateId.get(estimate.id)} />
            ))}
          </section>
        ) : (
          <div className="rounded-md border border-dashed border-hairline bg-white p-2 text-[10px] leading-4 text-tertiary">
            No estimates yet. Create a draft estimate above to bootstrap the first lot/structure/level/area hierarchy.
          </div>
        )}
      </div>
    </section>
  );
}
