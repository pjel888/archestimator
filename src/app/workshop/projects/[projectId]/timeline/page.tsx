import { notFound, redirect } from "next/navigation";

import { ProjectTimelineClient } from "@/components/workshop/project-timeline/ProjectTimelineClient";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import {
  PROJECT_COMMITMENT_EVENT_SOURCE_TYPES,
  type ProjectCommitmentEventSourceType,
} from "@/lib/project-ledger/contracts";
import { readProjectTimelinePage } from "@/lib/project-ledger/timeline-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";

type ProjectTimelinePageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ portal?: string | string[]; source?: string | string[] }>;
};

export default async function ProjectTimelinePage({ params, searchParams }: ProjectTimelinePageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams, requireCurrentUserContext()]);
  const { project } = await getCurrentWorkspaceProject(projectId);
  if (!project) {
    if (isUuid(projectId)) redirect(`/workshop?removedProject=${encodeURIComponent(projectId)}`);
    notFound();
  }
  const portalId = typeof query.portal === "string" ? query.portal : null;
  const source = typeof query.source === "string" ? query.source : null;
  const sourceTypes = source && PROJECT_COMMITMENT_EVENT_SOURCE_TYPES.includes(source as ProjectCommitmentEventSourceType)
    ? [source as ProjectCommitmentEventSourceType]
    : [];
  const initialData = await readProjectTimelinePage({
    projectId: project.id,
    filters: {
      portalId,
      sourceTypes,
    },
  });

  return <ProjectTimelineClient initialData={initialData} projectId={project.id} projectName={project.name} />;
}
