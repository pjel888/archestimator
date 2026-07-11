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
  const filters = parseRosterFilters(resolvedSearchParams);
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
      contentClassName=""
    >
      <WorkshopCanvasWash className="publisher-canvas-wash" />

      <Suspense fallback={<PublisherRosterSkeleton />}>
        <PublisherData searchParams={searchParams} />
      </Suspense>
    </WorkshopRouteHeader>
  );
}
