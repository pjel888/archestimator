import { Suspense } from "react";

import { PublisherRosterClient } from "@/components/workshop/publisher/PublisherRosterClient";
import { PublisherRosterSkeleton } from "@/components/workshop/publisher/PublisherRosterSkeleton";
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
  const focusedProjectId = [resolvedSearchParams.wizard, resolvedSearchParams.drawer]
    .flat()
    .find((value): value is string => typeof value === "string" && value.length > 0);
  const filterSearchParams = focusedProjectId
    ? {
        ...resolvedSearchParams,
        page: undefined,
        project: focusedProjectId,
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
      <PublisherRosterClient
        key={`${filters.status}:${filters.projectId ?? ""}:${filters.search}:${filters.page}`}
        roster={roster}
        filters={filters}
      />
    </Suspense>
  );
}

export default function PublisherPage({ searchParams }: PublisherPageProps) {
  return (
    <WorkshopRouteHeader
      title="Client links"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Share", "Client links"]}
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-surfaceMuted/35 p-2"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense fallback={<PublisherRosterSkeleton />}>
          <PublisherData searchParams={searchParams} />
        </Suspense>
      </div>
    </WorkshopRouteHeader>
  );
}
