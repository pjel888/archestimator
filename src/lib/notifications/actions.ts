"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import {
  acknowledgeCurrentUserReleaseModal,
  countCurrentUserUnreadNotifications,
  dismissCurrentUserNotification,
  getCurrentUserReleaseAnnouncement,
  listCurrentUserNotifications,
  markCurrentUserNotificationRead,
} from "@/lib/notifications/repository";
import type {
  NotificationActionResult,
  NotificationFeedResult,
  ReleaseAnnouncementView,
} from "@/lib/notifications/types";

type NotificationUserContextResult =
  | { ok: true; userId: string }
  | { ok: false; code: "unauthenticated" | "unavailable" };

function isLoginRedirectError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  return String((error as { digest?: unknown }).digest).includes("NEXT_REDIRECT") && String((error as { digest?: unknown }).digest).includes("/login");
}

async function readNotificationUserContext(): Promise<NotificationUserContextResult> {
  try {
    const context = await requireCurrentUserContext();
    return { ok: true, userId: context.userId };
  } catch (error) {
    return { ok: false, code: isLoginRedirectError(error) ? "unauthenticated" : "unavailable" };
  }
}

export async function loadCurrentUserNotifications(
  input: { limit?: number; cursor?: string | null } = {},
): Promise<NotificationFeedResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return { items: [], nextCursor: null };

  try {
    return await listCurrentUserNotifications(context.userId, input);
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function loadCurrentUserUnreadNotificationCount(): Promise<number> {
  const context = await readNotificationUserContext();
  if (!context.ok) return 0;

  try {
    return await countCurrentUserUnreadNotifications(context.userId);
  } catch {
    return 0;
  }
}

export async function loadCurrentUserReleaseAnnouncement(): Promise<ReleaseAnnouncementView | null> {
  const context = await readNotificationUserContext();
  if (!context.ok) return null;

  try {
    return await getCurrentUserReleaseAnnouncement(context.userId);
  } catch {
    return null;
  }
}

export async function markNotificationReadAction(deliveryId: string): Promise<NotificationActionResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return context;
  if (!isUuid(deliveryId)) return { ok: false, code: "invalid_input" };

  try {
    return await markCurrentUserNotificationRead(context.userId, deliveryId);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

export async function dismissNotificationAction(deliveryId: string): Promise<NotificationActionResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return context;
  if (!isUuid(deliveryId)) return { ok: false, code: "invalid_input" };

  try {
    return await dismissCurrentUserNotification(context.userId, deliveryId);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

export async function acknowledgeReleaseAnnouncementAction(deliveryId: string): Promise<NotificationActionResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return context;
  if (!isUuid(deliveryId)) return { ok: false, code: "invalid_input" };

  try {
    return await acknowledgeCurrentUserReleaseModal(context.userId, deliveryId);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}
