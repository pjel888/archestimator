import { notFound } from "next/navigation";
import { EstimateWorkspace } from "@/components/estimate-workspace";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import { duplicateRevisionAction, issueProposalSnapshotAction, saveCostLibraryItemAction, saveEstimateAction } from "@/app/actions";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const database = await (await createMutableLocalRepository()).getDatabase();
  const project = database.projects.find((item) => item.id === projectId);

  if (!project) notFound();

  return (
    <EstimateWorkspace
      database={database}
      projectId={project.id}
      onSaveEstimate={saveEstimateAction}
      onDuplicateRevision={duplicateRevisionAction}
      onIssueProposalSnapshot={issueProposalSnapshotAction}
      onSaveCostLibraryItem={saveCostLibraryItemAction}
    />
  );
}
