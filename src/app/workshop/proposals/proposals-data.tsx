import { ProposalsPageClient } from "@/components/workshop/proposals-page-client";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

export async function ProposalsData() {
  return withPerfTraceRequest("workshop.proposals.data", async () => {
    // Resolve auth before the list query so unauthenticated requests fail closed.
    const user = await requireCurrentUserContext();
    const initialResult = await traced("recipient-proposals.route.list", () => listRecipientProposals());

    return <ProposalsPageClient userEmail={user.email} initialResult={initialResult} />;
  });
}
