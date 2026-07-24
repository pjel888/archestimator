import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { onboardingSupportContextFromSearchParams } from "@/lib/onboarding/support-context";

export default async function WorkshopFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supportContext = onboardingSupportContextFromSearchParams(await searchParams);
  return (
    <WorkshopRouteHeader
      title="Support Center"
      eyebrow="Support"
      description="Read private support replies, continue a request, or send a new message."
      breadcrumbs={["Support Center"]}
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-2"
    >
      <SupportChatWidget onboardingContext={supportContext} />
    </WorkshopRouteHeader>
  );
}
