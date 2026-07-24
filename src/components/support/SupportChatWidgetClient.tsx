"use client";

import { SupportCenter } from "@/components/support/SupportCenter";
import type { SupportCenterHost } from "@/components/support/support-center-types";
import type { OnboardingSupportContext } from "@/lib/onboarding/support-context";

type SupportChatWidgetClientProps = {
  className?: string;
  host?: SupportCenterHost;
  onboardingContext?: OnboardingSupportContext | null;
  workspaceId?: string | null;
};

export function SupportChatWidgetClient({
  className,
  host = "page",
  onboardingContext = null,
  workspaceId,
}: SupportChatWidgetClientProps) {
  return (
    <SupportCenter
      className={className}
      host={host}
      onboardingContext={onboardingContext}
      workspaceId={workspaceId}
    />
  );
}
