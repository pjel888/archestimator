import { FirstEstimateChecklist } from "@/components/workshop/FirstEstimateChecklist";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { getCurrentActivationProgress } from "@/lib/onboarding/activation-actions";

export default async function GettingStartedPage() {
  const progress = await getCurrentActivationProgress();
  return (
    <WorkshopRouteHeader title="Getting Started" eyebrow="Workspace" breadcrumbs={["Getting Started"]}>
      <FirstEstimateChecklist progress={progress} />
    </WorkshopRouteHeader>
  );
}
