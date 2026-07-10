"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { setUserAccountStatus, type AccountStatus } from "@/lib/admin/users-repository";

export type UserActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "self_target" | "d1_unavailable" | "not_found" | "failed" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

async function performUserStatusAction(
  userId: string,
  status: AccountStatus,
  auditAction: string,
): Promise<UserActionResult> {
  const admin = await requireAdminContext();

  if (!UUID_PATTERN.test(userId)) return { ok: false, error: "validation" };
  if (userId === admin.userId) return { ok: false, error: "self_target" };

  const result = await setUserAccountStatus(userId, status);
  if (result.error) {
    if (result.error.includes("not available")) return { ok: false, error: "d1_unavailable" };
    return { ok: false, error: "failed" };
  }
  if (!result.data?.ok) return { ok: false, error: "not_found" };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: auditAction,
    targetType: "profile",
    targetId: userId,
    summary: { status },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function suspendUser(userId: string): Promise<UserActionResult> {
  return performUserStatusAction(userId, "suspended", "user.suspended");
}

export async function banUser(userId: string): Promise<UserActionResult> {
  return performUserStatusAction(userId, "banned", "user.banned");
}

export async function reactivateUser(userId: string): Promise<UserActionResult> {
  return performUserStatusAction(userId, "active", "user.reactivated");
}
