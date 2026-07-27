import { Suspense } from "react";

import { CommitmentCenterClient } from "@/components/workshop/publisher/CommitmentCenterClient";
import { CommitmentCenterSkeleton } from "@/components/workshop/publisher/CommitmentCenterSkeleton";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { assertBetaFeaturePathAllowed } from "@/lib/feature-gates/enforce";
import {
  readWorkspaceCommitmentCenter,
  type CommitmentCenterView,
} from "@/lib/publisher/commitment-center-repository";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";

type PublisherPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const COMMITMENT_CENTER_VIEWS = new Set<CommitmentCenterView>([
  "action_required",
  "portals",
  "requests",
  "decisions",
  "access_delivery",
]);

async function PublisherData({ searchParams }: PublisherPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedView = [resolvedSearchParams.view].flat().find((value): value is string => typeof value === "string");
  const initialView = requestedView && COMMITMENT_CENTER_VIEWS.has(requestedView as CommitmentCenterView)
    ? requestedView as CommitmentCenterView
    : "action_required";
  const data = await withPerfTraceRequest("workshop.commitment-center.data", async () => {
    const [currentUser, { workspace }] = await Promise.all([
      traced("commitment-center.route.current-user", () => requireCurrentUserContext()),
      traced("commitment-center.route.workspace", () => ensureDefaultWorkspace()),
    ]);
    return traced("commitment-center.route.repository", () =>
      readWorkspaceCommitmentCenter({
        userId: currentUser.userId,
        workspaceId: workspace.id,
      }),
    );
  });

  return <CommitmentCenterClient initialData={data} initialView={initialView} />;
}

export default async function PublisherPage({ searchParams }: PublisherPageProps) {
  await assertBetaFeaturePathAllowed("/workshop/publisher");

  return (
    <WorkshopRouteHeader
      title="Commitment Center"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Workspace", "Commitment Center"]}
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-surfaceMuted/35 p-2"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense fallback={<CommitmentCenterSkeleton />}>
          <PublisherData searchParams={searchParams} />
        </Suspense>
      </div>
    </WorkshopRouteHeader>
  );
}
