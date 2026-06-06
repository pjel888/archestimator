import "server-only";

import {
  coerceNotificationDeliveryView,
  isActiveReleaseAnnouncement,
  toReleaseAnnouncementView,
} from "@/lib/notifications/release-announcements";
import type {
  NotificationActionResult,
  NotificationDeliveryWithDefinition,
  NotificationFeedResult,
  ReleaseAnnouncementView,
} from "@/lib/notifications/types";

type NotificationQueryResult<T> = {
  data: T | null;
  error: { message?: string } | null;
  count?: number | null;
};

type NotificationQueryBuilder<T> = PromiseLike<NotificationQueryResult<T>> & {
  select: (columns: string, options?: { count?: "exact"; head?: boolean }) => NotificationQueryBuilder<T>;
  update: (values: Record<string, string>) => NotificationQueryBuilder<T>;
  eq: (column: string, value: string) => NotificationQueryBuilder<T>;
  is: (column: string, value: null) => NotificationQueryBuilder<T>;
  lt: (column: string, value: string) => NotificationQueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => NotificationQueryBuilder<T>;
  limit: (count: number) => NotificationQueryBuilder<T>;
  maybeSingle: () => PromiseLike<NotificationQueryResult<{ id: string }>>;
};

export type NotificationSupabaseClient = {
  from: (table: "notification_deliveries") => NotificationQueryBuilder<NotificationDeliveryWithDefinition[]>;
};

const DELIVERY_WITH_DEFINITION_SELECT = `
  id,
  notification_id,
  delivered_at,
  seen_at,
  read_at,
  dismissed_at,
  modal_acknowledged_at,
  notification_definitions!inner(
    kind,
    title,
    body,
    severity,
    surface,
    release_version,
    action_label,
    action_href,
    priority,
    starts_at,
    expires_at
  )
`;

function clampNotificationLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
}

function throwIfQueryError(error: { message?: string } | null) {
  if (error) throw new Error(error.message ?? "Notification query failed.");
}

export async function listCurrentUserNotifications(
  supabase: NotificationSupabaseClient,
  userId: string,
  input: { limit?: number; cursor?: string | null } = {},
): Promise<NotificationFeedResult> {
  const limit = clampNotificationLimit(input.limit);
  let query = supabase
    .from("notification_deliveries")
    .select(DELIVERY_WITH_DEFINITION_SELECT)
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .is("archived_at", null)
    .order("delivered_at", { ascending: false })
    .limit(limit + 1);

  if (input.cursor) query = query.lt("delivered_at", input.cursor);

  const { data, error } = await query;
  throwIfQueryError(error);

  const rows = data ?? [];
  const visibleRows = rows.slice(0, limit);
  const items = visibleRows
    .map((row) => coerceNotificationDeliveryView(row))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const nextCursor = rows.length > limit ? rows[limit]?.delivered_at ?? null : null;
  return { items, nextCursor };
}

export async function countCurrentUserUnreadNotifications(
  supabase: NotificationSupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notification_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .is("dismissed_at", null)
    .is("archived_at", null);

  throwIfQueryError(error);
  return count ?? 0;
}

export async function getCurrentUserReleaseAnnouncement(
  supabase: NotificationSupabaseClient,
  userId: string,
): Promise<ReleaseAnnouncementView | null> {
  const { data, error } = await supabase
    .from("notification_deliveries")
    .select(DELIVERY_WITH_DEFINITION_SELECT)
    .eq("user_id", userId)
    .is("modal_acknowledged_at", null)
    .is("dismissed_at", null)
    .is("archived_at", null)
    .order("delivered_at", { ascending: false })
    .limit(50);

  throwIfQueryError(error);

  const now = new Date();
  const eligibleRows = (data ?? [])
    .filter((row) => isActiveReleaseAnnouncement(row, now))
    .sort((left, right) => {
      const leftDefinition = Array.isArray(left.notification_definitions)
        ? left.notification_definitions[0]
        : left.notification_definitions;
      const rightDefinition = Array.isArray(right.notification_definitions)
        ? right.notification_definitions[0]
        : right.notification_definitions;
      const priorityDelta = (rightDefinition?.priority ?? 0) - (leftDefinition?.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(right.delivered_at).getTime() - new Date(left.delivered_at).getTime();
    });

  return eligibleRows.length ? toReleaseAnnouncementView(eligibleRows[0]) : null;
}

async function updateCurrentUserDeliveryState(
  supabase: NotificationSupabaseClient,
  userId: string,
  deliveryId: string,
  values: Record<string, string>,
): Promise<NotificationActionResult> {
  const { data, error } = await supabase
    .from("notification_deliveries")
    .update(values)
    .eq("id", deliveryId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  throwIfQueryError(error);
  return data ? { ok: true } : { ok: false, code: "not_found" };
}

export async function markCurrentUserNotificationRead(
  supabase: NotificationSupabaseClient,
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const now = new Date().toISOString();
  return updateCurrentUserDeliveryState(supabase, userId, deliveryId, {
    read_at: now,
    seen_at: now,
  });
}

export async function dismissCurrentUserNotification(
  supabase: NotificationSupabaseClient,
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const now = new Date().toISOString();
  return updateCurrentUserDeliveryState(supabase, userId, deliveryId, {
    dismissed_at: now,
    seen_at: now,
  });
}

export async function acknowledgeCurrentUserReleaseModal(
  supabase: NotificationSupabaseClient,
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const now = new Date().toISOString();
  return updateCurrentUserDeliveryState(supabase, userId, deliveryId, {
    modal_acknowledged_at: now,
    read_at: now,
    seen_at: now,
  });
}

export { clampNotificationLimit };
