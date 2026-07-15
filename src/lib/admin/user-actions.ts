"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getAdminUser, setUserAccountStatus, type AccountStatus } from "@/lib/admin/users-repository";
import { isPlatformAdmin } from "@/lib/auth/roles";

export type UserActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "self_target"
        | "protected_target"
        | "d1_unavailable"
        | "not_found"
        | "failed";
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

async function performUserStatusAction(
  userId: string,
  status: AccountStatus,
  auditAction: string,
): Promise<UserActionResult> {
  const admin = await requireAdminContext();

  if (!UUID_PATTERN.test(userId)) return { ok: false, error: "validation" };
  if (userId === admin.userId) return { ok: false, error: "self_target" };

  // F0-2/F0-3: read the target before mutating. Confirms the profile exists
  // (so we never report success on a missing user) and gives us the role/email
  // needed for the platform-admin floor below.
  const target = await getAdminUser(userId);
  if (target.error) {
    if (target.error.includes("not available")) return { ok: false, error: "d1_unavailable" };
    return { ok: false, error: "not_found" };
  }
  if (!target.data) return { ok: false, error: "not_found" };

  // F0-3: another platform admin (role ceo/admin, or the email allowlist) cannot
  // be suspended or banned from this surface — that is the founder/admin lockout
  // path. Reactivation stays allowed (it cannot lock anyone out).
  // ponytail: ceiling — the founder also can't suspend a rogue admin via this UI;
  // upgrade to rank-based actor/target comparison if multi-admin operations are
  // ever needed. Until then this is the safe, lockout-proof floor.
  if (status !== "active" && isPlatformAdmin({ role: target.data.role, email: target.data.email })) {
    return { ok: false, error: "protected_target" };
  }

  const result = await setUserAccountStatus(userId, status);
  if (result.error) {
    if (result.error.includes("not available")) return { ok: false, error: "d1_unavailable" };
    return { ok: false, error: "failed" };
  }
  // F0-2: a real row must have changed; 0 means the target vanished between the
  // read above and the update (race) — treat as not_found, never success.
  if (!result.data?.changes) return { ok: false, error: "not_found" };

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
