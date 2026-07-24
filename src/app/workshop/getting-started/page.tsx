import { GettingStartedProgress } from "@/components/onboarding/GettingStartedProgress";
import { WorkshopCanvasWash } from "@/components/workshop/WorkshopCanvasWash";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { loadCurrentOnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-actions";

export default async function GettingStartedPage() {
  const snapshot = await loadCurrentOnboardingEligibilitySnapshot();

  return (
    <WorkshopRouteHeader
      title="Getting Started"
      eyebrow="Guidance"
      breadcrumbs={["Getting Started"]}
      description="Choose how to begin, follow your first estimate progress, and open a focused guide when it helps."
      contentClassName="relative min-h-0 flex-1 overflow-y-auto p-2"
    >
      <WorkshopCanvasWash className="projects-canvas-wash" />
      <div className="relative z-[1]">
        <GettingStartedProgress snapshot={snapshot} />
      </div>
    </WorkshopRouteHeader>
  );
}
