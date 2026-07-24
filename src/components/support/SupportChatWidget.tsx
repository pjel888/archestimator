import { SupportChatWidgetClient } from "@/components/support/SupportChatWidgetClient";
import { getCurrentUserContext } from "@/lib/auth/session";
import type { OnboardingSupportContext } from "@/lib/onboarding/support-context";

/**
 * Full-page Support Center host for signed-in workshop users.
 * Realtime may degrade independently; durable D1 support remains available.
 */
export async function SupportChatWidget({
  onboardingContext = null,
}: {
  onboardingContext?: OnboardingSupportContext | null;
}) {
  const currentUser = await getCurrentUserContext();
  return (
    <SupportChatWidgetClient
      host="page"
      onboardingContext={onboardingContext}
      workspaceId={currentUser?.profile.default_workspace_id ?? null}
    />
  );
}
