"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

export type BroadcastNotificationResult =
  | { ok: true; notificationId: string; deliveryCount: number }
  | { ok: false; error: "validation" | "d1_unavailable" | "failed" };

/**
 * Creates a notification definition and delivers it to all users.
 * This is the admin broadcast surface for the notification system.
 */
export async function broadcastNotification(input: {
  kind: string;
  title: string;
  body: string;
  severity?: string;
  surface?: string;
  actionLabel?: string;
  actionHref?: string;
  releaseVersion?: string;
}): Promise<BroadcastNotificationResult> {
  const admin = await requireAdminContext();

  // Validate inputs.
  const title = input.title.trim();
  const body = input.body.trim();
  const kind = input.kind.trim();
  if (!title || title.length > 200) return { ok: false, error: "validation" };
  if (!body || body.length > 2000) return { ok: false, error: "validation" };
  if (!kind) return { ok: false, error: "validation" };

  const severity = input.severity?.trim() || "info";
  const surface = input.surface?.trim() || "toast_and_center";

  // actionHref must be a /workshop path (per the notification schema constraint).
  const actionHref = input.actionHref?.trim() || null;
  const actionLabel = input.actionLabel?.trim() || null;

  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };

  try {
    const notificationId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert the notification definition.
    await db
      .prepare(
        `
          INSERT INTO notification_definitions
            (id, kind, title, body, severity, surface, release_version, priority,
             dedupe_key, action_label, action_href, starts_at, expires_at,
             created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        notificationId,
        kind,
        title,
        body,
        severity,
        surface,
        input.releaseVersion?.trim() || null,
        50, // default priority
        `admin_broadcast_${notificationId}`,
        actionLabel,
        actionHref,
        now, // starts_at
        null, // expires_at
        admin.userId,
        now,
        now,
      )
      .run();

    // Deliver to all users. This creates one delivery row per profile.
    // Using INSERT ... SELECT to avoid shipping user IDs to the client.
    const deliveryResult = await db
      .prepare(
        `
          INSERT INTO notification_deliveries
            (id, notification_id, user_id, delivery_reason, delivered_at, created_at, updated_at)
          SELECT
            lower(hex(randomblob(8))) || '-' || lower(hex(randomblob(4))) || '-4' ||
            lower(hex(substr(randomblob(2), 1, 1))) || '-' ||
            lower(hex(substr(randomblob(2), 2, 1))) || '-' || lower(hex(randomblob(12))),
            ?, p.id, 'admin_broadcast', ?, ?, ?
          FROM profiles p
          WHERE p.account_status = 'active' OR p.account_status IS NULL
        `,
      )
      .bind(notificationId, now, now, now)
      .run();

    const deliveryCount = deliveryResult.meta?.changes ?? 0;

    await writeAdminAuditEvent({
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: "notification.broadcast",
      targetType: "notification",
      targetId: notificationId,
      summary: { kind, title, deliveryCount, severity },
    });

    revalidatePath("/admin");
    return { ok: true, notificationId, deliveryCount };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "unknown";
    await writeAdminAuditEvent({
      actorUserId: admin.userId,
      actorEmail: admin.email,
      action: "notification.broadcast_failed",
      targetType: "notification",
      targetId: "unknown",
      summary: { errorName, kind, title },
    }).catch(() => undefined);
    return { ok: false, error: "failed" };
  }
}
