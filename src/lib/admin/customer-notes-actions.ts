"use server";

import { revalidatePath } from "next/cache";

import { addCustomerNote, type CustomerNoteTargetKind } from "@/lib/admin/customer-notes-repository";
import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";

export type AddCustomerNoteResult =
  | { ok: true }
  | { ok: false; error: "validation" | "d1_unavailable" | "failed" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

// F3 founder note on a user or account. Admin-gated, validated, audited.
export async function addCustomerNoteAction(
  targetKind: CustomerNoteTargetKind,
  targetId: string,
  body: string,
): Promise<AddCustomerNoteResult> {
  const admin = await requireAdminContext();
  if ((targetKind !== "user" && targetKind !== "account") || !UUID_PATTERN.test(targetId)) {
    return { ok: false, error: "validation" };
  }
  const trimmed = (body ?? "").trim();
  if (trimmed.length < 1 || trimmed.length > 2000) return { ok: false, error: "validation" };

  const row = await addCustomerNote({
    targetKind,
    targetId,
    body: trimmed,
    createdBy: admin.userId,
    createdByEmail: admin.email,
  });
  if (!row) return { ok: false, error: "failed" };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: `customer_note.created`,
    targetType: targetKind,
    targetId,
    summary: { noteId: row.id, length: trimmed.length },
  });

  revalidatePath(targetKind === "user" ? `/admin/users/${targetId}` : `/admin/accounts/${targetId}`);
  return { ok: true };
}
