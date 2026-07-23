"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

export type BroadcastNotificationResult =
  | { ok: true; notificationId: string; deliveryCount: number }
  | { ok: false; error: "validation" | "d1_unavailable" | "failed" };

// F0-6: mirror the notification_definitions CHECK constraints (migration 0009)
// as typed sets so invalid values are rejected with a clean "validation" result
// instead of relying on a DB exception surfacing as a generic "failed".
const NOTIFICATION_KINDS = new Set([
  "release_announcement",
  "system_notice",
  "collaboration",
  "publication_activity",
  "beta_feedback",
  "security_notice",
]);
const NOTIFICATION_SEVERITIES = new Set(["info", "success", "warning", "critical"]);
const NOTIFICATION_SURFACES = new Set(["center", "modal", "toast_and_center"]);

function isValidActionHref(value: string): boolean {
  const lower = value.toLowerCase();
  return (value === "/workshop" || value.startsWith("/workshop/"))
    && !value.startsWith("//")
    && !/\s/u.test(value)
    && !value.includes("\\")
    && !lower.includes("javascript:")
    && !lower.includes("http:")
    && !lower.includes("https:")
    && !lower.includes("%2f")
    && !lower.includes("%5c")
    && !lower.includes("../")
    && !lower.includes("%2e%2e");
}

/**
 * Creates a notification definition and delivers it to all active users.
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
  // F0-6: title CHECK is BETWEEN 1 AND 120 (was incorrectly capped at 200 here,
  // which let 121–200 char titles pass validation then fail the INSERT).
  if (!title || title.length > 120) return { ok: false, error: "validation" };
  if (!body || body.length > 2000) return { ok: false, error: "validation" };
  if (!kind || !NOTIFICATION_KINDS.has(kind)) return { ok: false, error: "validation" };

  const severity = input.severity?.trim() || "info";
  const surface = input.surface?.trim() || "toast_and_center";
  if (!NOTIFICATION_SEVERITIES.has(severity)) return { ok: false, error: "validation" };
  if (!NOTIFICATION_SURFACES.has(surface)) return { ok: false, error: "validation" };

  // actionHref must be a /workshop path (per the notification schema constraint).
  const actionHref = input.actionHref?.trim() || null;
  const actionLabel = input.actionLabel?.trim() || null;
  if (actionLabel && actionLabel.length > 40) return { ok: false, error: "validation" };
  if ((actionLabel === null) !== (actionHref === null)) return { ok: false, error: "validation" };
  if (actionHref && !isValidActionHref(actionHref)) return { ok: false, error: "validation" };

  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, error: "d1_unavailable" };
  // F0-6: batch() runs the definition + delivery in a single atomic D1
  // transaction so a delivery failure can no longer leave an orphaned
  // definition with no deliveries. (batch is optional on the local type but
  // always present on real D1; guard keeps it type-safe.)
  const runInBatch = db.batch;
  if (!runInBatch) return { ok: false, error: "d1_unavailable" };

  try {
    const notificationId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert the notification definition.
    const definitionStatement = db
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
      );

    // Deliver to all active users. INSERT ... SELECT avoids shipping user IDs
    // to the client. Batched with the definition so both land or neither does.
    const deliveryStatement = db
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
      .bind(notificationId, now, now, now);

    const [definitionResult, deliveryResult] = await runInBatch([
      definitionStatement,
      deliveryStatement,
    ]);
    if (definitionResult.success === false || deliveryResult.success === false) {
      throw new Error("notification_batch_unsuccessful");
    }

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
