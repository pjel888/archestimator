import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { WorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "@/components/workshop/WorkshopSettingsModalContent";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { loadCurrentOnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-actions";

export default async function WorkshopSettingsPage() {
  await requireCurrentUserContext();
  const onboardingSnapshot = await loadCurrentOnboardingEligibilitySnapshot().catch(() => null);

  return (
    <WorkshopRouteHeader
      title="Settings"
      eyebrow="Workshop"
      breadcrumbs={["Settings"]}
      contentClassName="p-2"
    >

      <div className="h-full" aria-hidden="true" />
      <WorkshopSettingsModal
        initialOpen
        closeHref="/workshop/projects"
        trigger="none"
        location="Workshop / Settings"
      >
        <WorkshopSettingsModalContent
          onboardingSnapshot={onboardingSnapshot}
        />
      </WorkshopSettingsModal>
    </WorkshopRouteHeader>
  );
}
