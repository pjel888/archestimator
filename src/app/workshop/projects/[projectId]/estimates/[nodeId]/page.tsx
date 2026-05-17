import { EstimateRightSidebar, EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import { findEstimateNode, sampleEstimateTree } from "@/components/workshop/estimate-tree-data";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";

type ProjectEstimateNodePageProps = {
  params: Promise<{ projectId: string; nodeId: string }>;
};

export default async function ProjectEstimateNodePage({ params }: ProjectEstimateNodePageProps) {
  const { projectId, nodeId } = await params;
  const project = sampleProjects.find((item) => item.id === projectId) ?? sampleProjects[0];
  const selectedNodeId = findEstimateNode(sampleEstimateTree, nodeId)?.id ?? sampleEstimateTree[0]?.id ?? nodeId;

  return (
    <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label={`${project.name} estimates`}>
      <EstimateSheetTree projectId={project.id} projectName={project.name} selectedNodeId={selectedNodeId} />
      <EstimateSheetContent selectedNodeId={selectedNodeId} />
      <EstimateRightSidebar />
    </section>
  );
}
