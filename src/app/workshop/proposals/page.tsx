import { Suspense } from "react";

import { ProposalsPageClient } from "@/components/workshop/proposals-page-client";
import { ProposalsListSkeleton } from "@/components/workshop/proposals-page/ProposalsListSkeleton";
import { WorkshopCanvasWash } from "@/components/workshop/WorkshopCanvasWash";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

export async function ProposalsData() {
  return withPerfTraceRequest("workshop.proposals.data", async () => {
    // Auth must resolve before the list call (fail-closed ordering — see recipient-proposals-route-gate).
    const user = await requireCurrentUserContext();
    const initialResult = await traced("recipient-proposals.route.list", () => listRecipientProposals());

    return <ProposalsPageClient userEmail={user.email} initialResult={initialResult} />;
  });
}

export default function ProposalsPage() {
  return (
    <WorkshopRouteHeader
      title="Proposals"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Proposals"]}
      contentClassName=""
    >
      <WorkshopCanvasWash className="projects-canvas-wash" />

      <Suspense fallback={<ProposalsListSkeleton />}>
        <ProposalsData />
      </Suspense>
    </WorkshopRouteHeader>
  );
}
