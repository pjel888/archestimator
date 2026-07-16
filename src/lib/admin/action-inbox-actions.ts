"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import {
  dismissActionItemInD1,
  resolveActionItemInD1,
  snoozeActionItemInD1,
} from "@/lib/admin/action-inbox-repository";
import { requireAdminContext } from "@/lib/admin/require-admin";

export type ActionInboxActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "d1_unavailable" | "not_found" | "failed" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SNOOZE_DAYS = 1;

async function runActionInboxMutation(
  itemId: string,
  mutation: "snooze" | "resolve" | "dismiss",
): Promise<ActionInboxActionResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(itemId)) return { ok: false, error: "validation" };

  const snoozeUntil =
    mutation === "snooze"
      ? new Date(Date.now() + SNOOZE_DAYS * 86_400_000).toISOString()
      : null;

  const result =
    mutation === "snooze"
      ? await snoozeActionItemInD1(itemId, snoozeUntil as string)
      : mutation === "resolve"
        ? await resolveActionItemInD1(itemId)
        : await dismissActionItemInD1(itemId);

  if (!result.ok) {
    // D1 unavailable vs. no row touched: the repo returns changes=0 for both.
    // Treat 0 changes as not_found (idempotent retry / stale item).
    return { ok: false, error: "not_found" };
  }

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: `action_inbox.${mutation}`,
    targetType: "admin_action_item",
    targetId: itemId,
    summary: mutation === "snooze" ? { snoozeUntil } : null,
  });

  revalidatePath("/admin/today");
  return { ok: true };
}

export function snoozeActionItem(itemId: string): Promise<ActionInboxActionResult> {
  return runActionInboxMutation(itemId, "snooze");
}
export function resolveActionItem(itemId: string): Promise<ActionInboxActionResult> {
  return runActionInboxMutation(itemId, "resolve");
}
export function dismissActionItem(itemId: string): Promise<ActionInboxActionResult> {
  return runActionInboxMutation(itemId, "dismiss");
}
