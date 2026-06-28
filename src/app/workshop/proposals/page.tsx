import { Suspense } from "react";

import { ProposalsPageClient } from "@/components/workshop/proposals-page-client";
import { ProposalsListSkeleton } from "@/components/workshop/proposals-page/ProposalsListSkeleton";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

export async function ProposalsData() {
  return withPerfTraceRequest("workshop.proposals.data", async () => {
    const user = await requireCurrentUserContext();
    const initialResult = await traced("recipient-proposals.route.list", () => listRecipientProposals());

    return <ProposalsPageClient userEmail={user.email} initialResult={initialResult} />;
  });
}

export default function ProposalsPage() {
  return (
    <WorkshopPageShell
      title="Proposals"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Proposals"]}
      canvasClassName="projects-canvas-wash"
      contentClassName=""
    >
      <Suspense fallback={<ProposalsListSkeleton />}>
        <ProposalsData />
      </Suspense>
    </WorkshopPageShell>
  );
}
