import { notFound } from "next/navigation";

import { ClientPreviewBanner } from "@/components/workshop/publisher/ClientPreviewBanner";
import { ShareContainer } from "@/components/share/ShareContainer";
import { SharePageProposalHeader } from "@/components/share/SharePageProposalHeader";
import { SharePageBrandHeader } from "@/components/share/SharePageBrandHeader";
import { SharePageFooter } from "@/components/share/SharePageFooter";
import ShareReviewWorkspace from "@/components/share/ShareReviewWorkspace";
import { requireAuth } from "@/lib/auth/session";
import { assertProjectPublicationManager } from "@/lib/publication/actions";
import { createPublicationD1Store } from "@/lib/publication/d1-store";
import { sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import { getProjectPublicationSummary } from "@/lib/repositories/workspace-repository";
import "../../../../share/print.css";

type PreviewPageProps = { params: Promise<{ projectId: string }> };

export default async function PublisherPreviewPage({ params }: PreviewPageProps) {
  const { projectId } = await params;
  await requireAuth();
  await assertProjectPublicationManager(projectId);
  const summary = await getProjectPublicationSummary(projectId);
  if (!summary || !summary.canManagePublication || !summary.publicationId) notFound();

  const storedSnapshot = await createPublicationD1Store().getPublicationSnapshotById(summary.publicationId);
  if (!storedSnapshot) notFound();
  const snapshot = sanitizeProjectPublicationSnapshotForPublicRead(storedSnapshot as ProjectPublicationSnapshot);

  return (
    <main aria-label="Manager client preview" className="flex min-h-dvh flex-col bg-white text-ink">
      <ClientPreviewBanner projectId={projectId} />
      <ShareContainer className="share-print-content flex min-h-0 flex-1 flex-col">
        <SharePageBrandHeader project={snapshot.project} />
        <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 sm:py-5">
          <SharePageProposalHeader project={snapshot.project} />
          <ShareReviewWorkspace estimates={snapshot.estimates} currencyCode={snapshot.project.currencyCode} previewMode="manager-read-only" snapshot={snapshot} token="manager-preview" viewToken="manager-preview" />
        </div>
        <SharePageFooter snapshot={snapshot} />
      </ShareContainer>
    </main>
  );
}
