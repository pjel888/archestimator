"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SupportCenterOverlay = dynamic(
  () => import("@/components/support/SupportChatWidgetClient").then((module) => module.SupportChatWidgetClient),
  { ssr: false },
);

type WorkshopFeedbackModalProps = {
  className?: string;
  workspaceId?: string | null;
};

export function WorkshopFeedbackModal({ className, workspaceId }: WorkshopFeedbackModalProps) {
  const pathname = usePathname();
  if (pathname === "/workshop/feedback") return null;
  return <SupportCenterOverlay className={className} host="overlay" workspaceId={workspaceId} />;
}
