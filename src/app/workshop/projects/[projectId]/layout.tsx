import { Suspense, type ReactNode } from "react";

import { ProjectChromeAsync, ProjectHeaderChromeSkeleton } from "@/components/workshop/ProjectChromeAsync";
import { FirstEstimateChecklist } from "@/components/workshop/FirstEstimateChecklist";
import { ProjectEstimateMetadataStrip } from "@/components/workshop/ProjectEstimateMetadataStrip";
import { ProjectMiniSidebar } from "@/components/workshop/ProjectMiniSidebar";
import { ProjectRouteContentFallback } from "@/components/workshop/ProjectRouteContentFallback";
import { ProjectTotalFooterOverlay } from "@/components/workshop/ProjectTotalHeader";
import { WorkshopBreadcrumbs } from "@/components/workshop/WorkshopBreadcrumbs";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { WorkshopShellFooterSlot } from "@/components/workshop/WorkshopShellFooterSlot";
import { sampleProjects } from "@/components/workshop/workshop-sample-projects";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getCurrentWorkspaceProject } from "@/lib/repositories/workspace-repository";
import { getCurrentActivationProgress } from "@/lib/onboarding/activation-actions";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

function ProjectTitleBlock({ projectId, title }: { projectId: string; title: string }) {
  return (
    <div
      className="flex min-w-0 shrink-0 translate-y-1 flex-col justify-center gap-0 pt-1"
      data-workshop-title-region
    >
      <div className="min-w-0" data-workshop-title-block>
        <h1 className="truncate text-[12px] font-medium leading-4 tracking-normal text-ink">{title}</h1>
      </div>
      <WorkshopBreadcrumbs
        breadcrumbs={[
          { label: "Workshop", href: "/workshop" },
          { label: "Projects", href: "/workshop/projects" },
          { label: title, href: `/workshop/projects/${projectId}` },
        ]}
        projectId={projectId}
      />
    </div>
  );
}

async function ProjectTitleAsync({ projectId }: { projectId: string }) {
  const { project: liveProject } = await withPerfTraceRequest("workshop.project-layout-title", () =>
    traced("project-layout.title", () => getCurrentWorkspaceProject(projectId)),
  );
  const sampleProject = sampleProjects.find((item) => item.id === projectId);
  const title = liveProject?.name ?? sampleProject?.name ?? "Project";

  return <ProjectTitleBlock projectId={projectId} title={title} />;
}

async function FirstEstimateChecklistAsync() {
  const progress = await getCurrentActivationProgress();
  return <FirstEstimateChecklist progress={progress} />;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;

  return (
    <WorkshopRouteHeader
      title="Project"
      eyebrow="Projects"
      breadcrumbs={[
        { label: "Workshop", href: "/workshop" },
        { label: "Projects", href: "/workshop/projects" },
        { label: "Project", href: `/workshop/projects/${projectId}` },
      ]}
      titleSlot={
        <Suspense fallback={<ProjectTitleBlock projectId={projectId} title="Project" />}>
          <ProjectTitleAsync projectId={projectId} />
        </Suspense>
      }
      alignChromeToProjectSidebar
      contentClassName="pt-0 pb-0 pr-0 pl-0"
      centerHeader={<ProjectEstimateMetadataStrip />}
      projectId={projectId}
      actions={
        <Suspense fallback={<ProjectHeaderChromeSkeleton />}>
          <ProjectChromeAsync projectId={projectId} />
        </Suspense>
      }
    >
      <div className="flex h-full min-h-0 overflow-hidden">
        <ProjectMiniSidebar projectId={projectId} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={null}><FirstEstimateChecklistAsync /></Suspense>
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense fallback={<ProjectRouteContentFallback />}>{children}</Suspense>
          </div>
        </div>
      </div>
      <WorkshopShellFooterSlot>
        <ProjectTotalFooterOverlay projectId={projectId} />
      </WorkshopShellFooterSlot>
    </WorkshopRouteHeader>
  );
}
