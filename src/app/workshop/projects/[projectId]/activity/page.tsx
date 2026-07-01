import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { ProjectActivityClient } from "@/components/workshop/project-activity/ProjectActivityClient";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { canEditProjectInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import {
  listProjectEstimatesForDropdown,
  listProjectMembersForDropdown,
  listProjectRecipientsForDropdown,
  readProjectActivityFeed,
} from "@/lib/repositories/project-activity-feed-repository";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { parseActivityUrlSearchParams } from "@/components/workshop/project-activity/url-state";
import ProjectActivityLoading from "./loading";

type ProjectActivityPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return params;
}

async function canEditProject(projectId: string, currentUser: CurrentUserContext) {
  const db = await getCloudflareD1Database();
  if (!db) return false;
  try {
    return await canEditProjectInD1(db, projectId, currentUser);
  } catch {
    return false;
  }
}

function emptyActivityData() {
  return {
    items: [],
    nextCursor: null,
    partial: false,
    unavailableSources: [],
    counts: {
      loadedCount: 0,
      filteredTotalCount: 0,
      scopeTotalCount: 0,
    },
  };
}

export default function ProjectActivityPage(props: ProjectActivityPageProps) {
  return (
    <Suspense fallback={<ProjectActivityLoading />}>
      <ProjectActivityContent {...props} />
    </Suspense>
  );
}

async function ProjectActivityContent({ params, searchParams }: ProjectActivityPageProps) {
  const [{ projectId }, rawSearchParams, currentUser] = await Promise.all([
    params,
    searchParams,
    requireCurrentUserContext(),
  ]);
  const { project } = await getCurrentWorkspaceProject(projectId);
  const sampleProject = sampleProjects.find((item) => item.id === projectId);

  if (!project && !sampleProject) {
    if (isUuid(projectId)) redirect(`/workshop?removedProject=${encodeURIComponent(projectId)}`);
    notFound();
  }

  const pageState = parseActivityUrlSearchParams(toUrlSearchParams(rawSearchParams));
  const projectName = project?.name ?? sampleProject?.name ?? "Project";

  const data = project
    ? await withPerfTraceRequest("workshop.project-activity", async () => {
        const canEdit = await traced("project-activity.can-edit", () => canEditProject(project.id, currentUser));
        if (!canEdit) {
          return {
            canEdit,
            initialLoadFailed: false,
            feed: emptyActivityData(),
            estimates: [],
            members: [],
            recipients: [],
          };
        }

        try {
          const [feed, estimates, members, recipients] = await Promise.all([
            traced("project-activity.feed", () =>
              readProjectActivityFeed({
                projectId: project.id,
                scope: pageState.scope,
                filters: {
                  actions: pageState.actions,
                  actorUserId: pageState.actor,
                  recipientId: pageState.client,
                },
                limit: 20,
                includeCounts: true,
              }),
            ),
            traced("project-activity.estimates", () => listProjectEstimatesForDropdown(project.id)),
            traced("project-activity.members", () => listProjectMembersForDropdown(project.id)),
            traced("project-activity.recipients", () => listProjectRecipientsForDropdown(project.id)),
          ]);

          return {
            canEdit,
            initialLoadFailed: false,
            feed,
            estimates,
            members,
            recipients,
          };
        } catch {
          console.warn("project_activity_initial_load_failed", { projectId: project.id });
          return {
            canEdit,
            initialLoadFailed: true,
            feed: emptyActivityData(),
            estimates: [],
            members: [],
            recipients: [],
          };
        }
      })
    : {
        canEdit: false,
        initialLoadFailed: false,
        feed: emptyActivityData(),
        estimates: [],
        members: [],
        recipients: [],
      };

  return (
    <ProjectActivityClient
      projectId={projectId}
      projectName={projectName}
      currentUserId={currentUser.userId}
      canEdit={data.canEdit}
      initialLoadFailed={data.initialLoadFailed}
      initialState={pageState}
      initialData={data.feed}
      estimates={data.estimates}
      members={data.members}
      recipients={data.recipients}
    />
  );
}
