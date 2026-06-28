import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { ProposalsListSkeleton } from "@/components/workshop/proposals-page/ProposalsListSkeleton";

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell
      title="Proposals"
      eyebrow="Workspace"
      showEyebrow={false}
      canvasClassName="projects-canvas-wash"
    >
      <ProposalsListSkeleton />
    </StaticWorkshopLoadingShell>
  );
}
