"use client";

import { useQueryClient } from "@tanstack/react-query";

import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";

export function WorkshopNotificationEntry() {
  try {
    useQueryClient();
  } catch {
    return null;
  }

  return <NotificationCenter />;
}
