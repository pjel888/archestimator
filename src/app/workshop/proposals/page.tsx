import { Suspense } from "react";

import { ProposalsListSkeleton } from "@/components/workshop/proposals-page/ProposalsListSkeleton";
import { WorkshopCanvasWash } from "@/components/workshop/WorkshopCanvasWash";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { assertBetaFeaturePathAllowed } from "@/lib/feature-gates/enforce";
import { ProposalsData } from "./proposals-data";

export default async function ProposalsPage() {
  await assertBetaFeaturePathAllowed("/workshop/proposals");

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
