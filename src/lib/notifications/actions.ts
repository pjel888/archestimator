"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import {
  acknowledgeCurrentUserReleaseModal,
  countCurrentUserUnreadNotifications,
  dismissCurrentUserNotification,
  listCurrentUserNotifications,
  markCurrentUserNotificationRead,
  type NotificationSupabaseClient,
} from "@/lib/notifications/repository";
import type {
  NotificationActionResult,
  NotificationFeedResult,
  ReleaseAnnouncementView,
} from "@/lib/notifications/types";
import { getCurrentUserReleaseAnnouncement } from "@/lib/notifications/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

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

function asNotificationClient(client: unknown): NotificationSupabaseClient {
  return client as NotificationSupabaseClient;
}

export async function loadCurrentUserNotifications(
  input: { limit?: number; cursor?: string | null } = {},
): Promise<NotificationFeedResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return { items: [], nextCursor: null };

  try {
    const supabase = await createSupabaseServerClient();
    return await listCurrentUserNotifications(asNotificationClient(supabase), context.userId, input);
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function loadCurrentUserUnreadNotificationCount(): Promise<number> {
  const context = await readNotificationUserContext();
  if (!context.ok) return 0;

  try {
    const supabase = await createSupabaseServerClient();
    return await countCurrentUserUnreadNotifications(asNotificationClient(supabase), context.userId);
  } catch {
    return 0;
  }
}

export async function loadCurrentUserReleaseAnnouncement(): Promise<ReleaseAnnouncementView | null> {
  const context = await readNotificationUserContext();
  if (!context.ok) return null;

  try {
    const supabase = await createSupabaseServerClient();
    return await getCurrentUserReleaseAnnouncement(asNotificationClient(supabase), context.userId);
  } catch {
    return null;
  }
}

export async function markNotificationReadAction(deliveryId: string): Promise<NotificationActionResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return context;
  if (!isUuid(deliveryId)) return { ok: false, code: "invalid_input" };

  try {
    const serviceRole = createSupabaseServiceRoleClient("archestimator-notifications-mark-read");
    return await markCurrentUserNotificationRead(asNotificationClient(serviceRole), context.userId, deliveryId);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

export async function dismissNotificationAction(deliveryId: string): Promise<NotificationActionResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return context;
  if (!isUuid(deliveryId)) return { ok: false, code: "invalid_input" };

  try {
    const serviceRole = createSupabaseServiceRoleClient("archestimator-notifications-dismiss");
    return await dismissCurrentUserNotification(asNotificationClient(serviceRole), context.userId, deliveryId);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

export async function acknowledgeReleaseAnnouncementAction(deliveryId: string): Promise<NotificationActionResult> {
  const context = await readNotificationUserContext();
  if (!context.ok) return context;
  if (!isUuid(deliveryId)) return { ok: false, code: "invalid_input" };

  try {
    const serviceRole = createSupabaseServiceRoleClient("archestimator-notifications-release-acknowledge");
    return await acknowledgeCurrentUserReleaseModal(asNotificationClient(serviceRole), context.userId, deliveryId);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}
