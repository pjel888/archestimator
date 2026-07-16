"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { createSavedReply, deleteSavedReply } from "@/lib/admin/saved-replies-repository";

export type SavedReplyResult =
  | { ok: true }
  | { ok: false; error: "validation" | "not_found" | "failed" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function createSavedReplyAction(input: {
  label: string;
  body: string;
}): Promise<SavedReplyResult> {
  const admin = await requireAdminContext();
  const label = (input.label ?? "").trim();
  const body = (input.body ?? "").trim();
  if (label.length < 1 || label.length > 120 || body.length < 1 || body.length > 2000) {
    return { ok: false, error: "validation" };
  }
  const row = await createSavedReply({
    label,
    body,
    createdBy: admin.userId,
    createdByEmail: admin.email,
  });
  if (!row) return { ok: false, error: "failed" };
  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "saved_reply.created",
    targetType: "admin_saved_reply",
    targetId: row.id,
    summary: { label },
  });
  revalidatePath("/admin/saved-replies");
  return { ok: true };
}

export async function deleteSavedReplyAction(id: string): Promise<SavedReplyResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "validation" };
  const result = await deleteSavedReply(id);
  if (!result.ok) return { ok: false, error: "not_found" };
  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "saved_reply.deleted",
    targetType: "admin_saved_reply",
    targetId: id,
  });
  revalidatePath("/admin/saved-replies");
  return { ok: true };
}
