"use client";

import { SupportCenter } from "@/components/support/SupportCenter";
import type { SupportCenterHost } from "@/components/support/support-center-types";

type SupportChatWidgetClientProps = {
  className?: string;
  host?: SupportCenterHost;
  workspaceId?: string | null;
};

export function SupportChatWidgetClient({
  className,
  host = "page",
  workspaceId,
}: SupportChatWidgetClientProps) {
  return <SupportCenter className={className} host={host} workspaceId={workspaceId} />;
}
