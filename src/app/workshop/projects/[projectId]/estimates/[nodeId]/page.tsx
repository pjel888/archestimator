import { notFound } from "next/navigation";

import { EstimateRightSidebar, EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { getProjectEstimateTreeByNode } from "@/lib/repositories/workspace-repository";

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
};

export default async function ProjectEstimateNodePage({ params }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  const { project, estimate, selectedNodeId, tree } = await getProjectEstimateTreeByNode(projectId, nodeId);

  if (!project || !estimate || !selectedNodeId || tree.length === 0) notFound();

  return (
    <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label={`${project.name} estimates`}>
      <EstimateSheetTree projectId={project.id} projectName={project.name} selectedNodeId={selectedNodeId} nodes={tree} />
      <EstimateSheetContent selectedNodeId={selectedNodeId} nodes={tree} projectId={project.id} estimateId={estimate.id} />
      <EstimateRightSidebar />
    </section>
  );
}
