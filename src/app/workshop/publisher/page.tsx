import { Suspense } from "react";

import { PublisherRosterClient } from "@/components/workshop/publisher/PublisherRosterClient";
import { PublisherRosterSkeleton } from "@/components/workshop/publisher/PublisherRosterSkeleton";
import { WorkshopCanvasWash } from "@/components/workshop/WorkshopCanvasWash";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { parseRosterFilters } from "@/lib/publisher/roster-filter";
import { readWorkspacePublicationsRoster } from "@/lib/publisher/roster-repository";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";

type PublisherPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function PublisherData({ searchParams }: PublisherPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const wizardProjectId = Array.isArray(resolvedSearchParams.wizard)
    ? resolvedSearchParams.wizard[0]
    : resolvedSearchParams.wizard;
  const filterSearchParams = wizardProjectId
    ? {
        ...resolvedSearchParams,
        page: undefined,
        project: wizardProjectId,
        q: undefined,
        status: undefined,
      }
    : resolvedSearchParams;
  const filters = parseRosterFilters(filterSearchParams);
  const roster = await withPerfTraceRequest("workshop.publisher.data", async () => {
    const [currentUser, { workspace }] = await Promise.all([
      traced("publisher.route.current-user", () => requireCurrentUserContext()),
      traced("publisher.route.workspace", () => ensureDefaultWorkspace()),
    ]);
    return traced("publisher.route.roster", () =>
      readWorkspacePublicationsRoster(workspace.id, currentUser.userId, filters),
    );
  });

  return (
    <Suspense fallback={<PublisherRosterSkeleton />}>
      <PublisherRosterClient roster={roster} filters={filters} />
    </Suspense>
  );
}

export default function PublisherPage({ searchParams }: PublisherPageProps) {
  return (
    <WorkshopRouteHeader
      title="Share"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Share"]}
      description="Create, review, and manage the client links for every project."
      contentClassName="relative flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2"
    >
      <WorkshopCanvasWash className="publisher-canvas-wash" />

      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense fallback={<PublisherRosterSkeleton />}>
          <PublisherData searchParams={searchParams} />
        </Suspense>
      </div>
    </WorkshopRouteHeader>
  );
}
