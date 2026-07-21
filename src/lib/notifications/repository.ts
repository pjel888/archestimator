import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
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

type NotificationJoinedD1Row = {
  action_href: string | null;
  action_label: string | null;
  body: string;
  delivered_at: string;
  dismissed_at: string | null;
  expires_at: string | null;
  id: string;
  kind: string;
  modal_acknowledged_at: string | null;
  notification_id: string;
  priority: number | null;
  read_at: string | null;
  release_version: string | null;
  seen_at: string | null;
  severity: string;
  starts_at: string;
  surface: string;
  title: string;
};

type CountRow = {
  count: number;
};

const DELIVERY_WITH_DEFINITION_SELECT = `
  SELECT
    deliveries.id,
    deliveries.notification_id,
    deliveries.delivered_at,
    deliveries.seen_at,
    deliveries.read_at,
    deliveries.dismissed_at,
    deliveries.modal_acknowledged_at,
    definitions.kind,
    definitions.title,
    definitions.body,
    definitions.severity,
    definitions.surface,
    definitions.release_version,
    definitions.action_label,
    definitions.action_href,
    definitions.priority,
    definitions.starts_at,
    definitions.expires_at
  FROM notification_deliveries deliveries
  JOIN notification_definitions definitions
    ON definitions.id = deliveries.notification_id
`;

function clampNotificationLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
}

async function requireNotificationsD1() {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
  return db;
}

function coerceCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDeliveryWithDefinition(row: NotificationJoinedD1Row): NotificationDeliveryWithDefinition {
  return {
    delivered_at: row.delivered_at,
    dismissed_at: row.dismissed_at,
    id: row.id,
    modal_acknowledged_at: row.modal_acknowledged_at,
    notification_id: row.notification_id,
    notification_definitions: {
      action_href: row.action_href,
      action_label: row.action_label,
      body: row.body,
      expires_at: row.expires_at,
      kind: row.kind,
      priority: row.priority ?? 0,
      release_version: row.release_version,
      severity: row.severity,
      starts_at: row.starts_at,
      surface: row.surface,
      title: row.title,
    },
    read_at: row.read_at,
    seen_at: row.seen_at,
  };
}

export async function listCurrentUserNotificationsFromD1(
  db: D1DatabaseLike,
  userId: string,
  input: { limit?: number; cursor?: string | null } = {},
): Promise<NotificationFeedResult> {
  const limit = clampNotificationLimit(input.limit);
  const cursorFilter = input.cursor ? "AND deliveries.delivered_at < ?" : "";
  const statement = db
    .prepare<NotificationJoinedD1Row>(
      `
        ${DELIVERY_WITH_DEFINITION_SELECT}
        WHERE deliveries.user_id = ?
          AND deliveries.dismissed_at IS NULL
          AND deliveries.archived_at IS NULL
          ${cursorFilter}
        ORDER BY deliveries.delivered_at DESC
        LIMIT ?
      `,
    );
  const boundStatement = input.cursor
    ? statement.bind(userId, input.cursor, limit + 1)
    : statement.bind(userId, limit + 1);
  const { results } = await boundStatement.all<NotificationJoinedD1Row>();
  const rows = results ?? [];
  const visibleRows = rows.slice(0, limit);
  const items = visibleRows
    .map((row) => coerceNotificationDeliveryView(toDeliveryWithDefinition(row)))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const nextCursor = rows.length > limit ? rows[limit]?.delivered_at ?? null : null;
  return { items, nextCursor };
}

export async function listCurrentUserNotifications(
  userId: string,
  input: { limit?: number; cursor?: string | null } = {},
): Promise<NotificationFeedResult> {
  const db = await requireNotificationsD1();
  return listCurrentUserNotificationsFromD1(db, userId, input);
}

export async function countCurrentUserUnreadNotificationsFromD1(
  db: D1DatabaseLike,
  userId: string,
): Promise<number> {
  const row = await db
    .prepare<CountRow>(
      `
        SELECT COUNT(*) AS count
        FROM notification_deliveries
        WHERE user_id = ?
          AND read_at IS NULL
          AND dismissed_at IS NULL
          AND archived_at IS NULL
      `,
    )
    .bind(userId)
    .first<CountRow>();

  return coerceCount(row?.count);
}

export async function countCurrentUserUnreadNotifications(userId: string): Promise<number> {
  const db = await requireNotificationsD1();
  return countCurrentUserUnreadNotificationsFromD1(db, userId);
}

export async function getCurrentUserReleaseAnnouncementFromD1(
  db: D1DatabaseLike,
  userId: string,
): Promise<ReleaseAnnouncementView | null> {
  const { results } = await db
    .prepare<NotificationJoinedD1Row>(
      `
        ${DELIVERY_WITH_DEFINITION_SELECT}
        WHERE deliveries.user_id = ?
          AND deliveries.modal_acknowledged_at IS NULL
          AND deliveries.dismissed_at IS NULL
          AND deliveries.archived_at IS NULL
        ORDER BY deliveries.delivered_at DESC
        LIMIT 50
      `,
    )
    .bind(userId)
    .all<NotificationJoinedD1Row>();

  const now = new Date();
  const eligibleRows = (results ?? [])
    .map(toDeliveryWithDefinition)
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

export async function getCurrentUserReleaseAnnouncement(userId: string): Promise<ReleaseAnnouncementView | null> {
  const db = await requireNotificationsD1();
  return getCurrentUserReleaseAnnouncementFromD1(db, userId);
}

async function updateCurrentUserDeliveryStateInD1(
  db: D1DatabaseLike,
  userId: string,
  deliveryId: string,
  values: Record<string, string>,
): Promise<NotificationActionResult> {
  const updates = Object.entries(values);
  const assignments = [
    ...updates.map(([column]) => `${column} = ?`),
    "updated_at = ?",
  ].join(", ");
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `
        UPDATE notification_deliveries
        SET ${assignments}
        WHERE id = ?
          AND user_id = ?
      `,
    )
    .bind(...updates.map(([, value]) => value), now, deliveryId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0 ? { ok: true } : { ok: false, code: "not_found" };
}

export async function markCurrentUserNotificationReadInD1(
  db: D1DatabaseLike,
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const now = new Date().toISOString();
  return updateCurrentUserDeliveryStateInD1(db, userId, deliveryId, {
    read_at: now,
    seen_at: now,
  });
}

export async function markCurrentUserNotificationRead(
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const db = await requireNotificationsD1();
  return markCurrentUserNotificationReadInD1(db, userId, deliveryId);
}

export async function dismissCurrentUserNotificationInD1(
  db: D1DatabaseLike,
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const now = new Date().toISOString();
  return updateCurrentUserDeliveryStateInD1(db, userId, deliveryId, {
    dismissed_at: now,
    seen_at: now,
  });
}

export async function dismissCurrentUserNotification(
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const db = await requireNotificationsD1();
  return dismissCurrentUserNotificationInD1(db, userId, deliveryId);
}

export async function acknowledgeCurrentUserReleaseModalInD1(
  db: D1DatabaseLike,
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const now = new Date().toISOString();
  return updateCurrentUserDeliveryStateInD1(db, userId, deliveryId, {
    modal_acknowledged_at: now,
    read_at: now,
    seen_at: now,
  });
}

export async function acknowledgeCurrentUserReleaseModal(
  userId: string,
  deliveryId: string,
): Promise<NotificationActionResult> {
  const db = await requireNotificationsD1();
  return acknowledgeCurrentUserReleaseModalInD1(db, userId, deliveryId);
}

export { clampNotificationLimit };
