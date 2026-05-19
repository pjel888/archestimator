import { notFound } from "next/navigation";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { ProjectEstimatesTable } from "@/components/workshop/ProjectEstimatesTable";
import { listProjectEstimates } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

function getProjectBudget(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>).projectBudget;
  return typeof value === "number" ? value : null;
}

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const { project, estimates, firstNodeByEstimateId, totalCostByEstimateId } = await listProjectEstimates(projectId);

  if (!project) notFound();

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label={`${project.name} estimates`}>
      <div className="flex shrink-0 items-center gap-2 bg-white">
        <SearchInput
          placeholder="Search estimate sheets"
          aria-label="Search estimate sheets"
          wrapperClassName="h-12 w-full"
        />
      </div>

      <HeaderIconToolbar
        ariaLabel="Project estimate sheet tools"
        labelPrefix="estimate sheets"
        addVisibleLabel="Create Estimate Sheet"
      />

      <div className="min-h-0 flex-1 bg-white">
        <ProjectEstimatesTable
          projectBudget={getProjectBudget(project.metadata)}
          estimates={estimates.map((estimate) => ({
            ...estimate,
            firstNodeId: firstNodeByEstimateId.get(estimate.id) ?? null,
            totalProjectCost: totalCostByEstimateId.get(estimate.id) ?? 0,
          }))}
        />
      </div>
    </section>
  );
}
