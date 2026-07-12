import { PublisherDiscussionInbox } from "@/components/workshop/publisher/PublisherDiscussionInbox";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

export const dynamic = "force-dynamic";

export default async function ClientPortalDiscussionsPage({ params }: { params: Promise<{ portalId: string; projectId: string }> }) {
  const { portalId, projectId } = await params;
  await assertProjectPublicationManager(projectId);
  return <PublisherDiscussionInbox portalId={portalId} projectId={projectId} />;
}
