"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ReleaseAnnouncementModal } from "@/features/notifications/components/ReleaseAnnouncementModal";
import { useReleaseAnnouncementQuery } from "@/features/notifications/hooks/useNotificationsQuery";

type NotificationProviderProps = {
  children: ReactNode;
};

function shouldEnableNotifications(pathname: string | null) {
  return Boolean(pathname?.startsWith("/workshop"));
}

function NotificationProviderSurface({ children }: NotificationProviderProps) {
  const releaseAnnouncementQuery = useReleaseAnnouncementQuery();

  return (
    <>
      {children}
      <ReleaseAnnouncementModal announcement={releaseAnnouncementQuery.data ?? null} />
    </>
  );
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const pathname = usePathname();

  if (!shouldEnableNotifications(pathname)) return <>{children}</>;
  return <NotificationProviderSurface>{children}</NotificationProviderSurface>;
}

export { shouldEnableNotifications };
