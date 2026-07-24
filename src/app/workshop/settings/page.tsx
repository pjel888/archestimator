import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { WorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "@/components/workshop/WorkshopSettingsModalContent";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { loadCurrentOnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-actions";

export default async function WorkshopSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCurrentUserContext();
  const [onboardingSnapshot, resolvedSearchParams] = await Promise.all([
    loadCurrentOnboardingEligibilitySnapshot().catch(() => null),
    searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}),
  ]);
  const requestedPageId = resolvedSearchParams.page;

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
          initialPageId={typeof requestedPageId === "string" ? requestedPageId : undefined}
          onboardingSnapshot={onboardingSnapshot}
        />
      </WorkshopSettingsModal>
    </WorkshopRouteHeader>
  );
}
