import { redirect } from "next/navigation";

import { sampleEstimateTree } from "@/components/workshop/estimate-tree-data";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";

type ProjectEstimatesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectEstimatesPage({ params }: ProjectEstimatesPageProps) {
  const { projectId } = await params;
  const project = sampleProjects.find((item) => item.id === projectId) ?? sampleProjects[0];
  const firstNodeId = sampleEstimateTree[0]?.id;

  if (firstNodeId) {
    redirect(`/workshop/projects/${project.id}/estimates/${firstNodeId}`);
  }

  return null;
}
