"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import { getAdminUser, setUserAccountStatus, type AccountStatus } from "@/lib/admin/users-repository";
import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import { executeDeleteAccount, previewDeleteAccount } from "@/lib/auth/delete-account-repository";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  validateDeleteAccountConfirmation,
  type DeleteAccountPreview,
} from "@/lib/auth/delete-account-shared";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

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

export type DeleteUserActionState = {
  ok: boolean;
  error?: string;
  blockers?: DeleteAccountPreview["blockers"];
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

async function getAdminDeleteTarget(userId: string) {
  const admin = await requireAdminContext();

  if (!UUID_PATTERN.test(userId)) return { admin, target: null, error: "Invalid user ID." };
  if (userId === admin.userId) return { admin, target: null, error: "You cannot delete your own account from Admin." };

  const target = await getAdminUser(userId);
  if (target.error) {
    return {
      admin,
      target: null,
      error: target.error.includes("not available") ? "Database is unavailable." : "User not found.",
    };
  }
  if (!target.data) return { admin, target: null, error: "User not found." };
  if (isPlatformAdmin({ role: target.data.role, email: target.data.email })) {
    return { admin, target: null, error: "Platform administrator accounts cannot be deleted from Admin." };
  }

  return { admin, target: target.data, error: null };
}

export async function getDeleteUserPreviewAction(userId: string): Promise<DeleteAccountPreview> {
  const targetResult = await getAdminDeleteTarget(userId);
  if (targetResult.error) {
    return {
      ok: false,
      blockers: [{ code: "unavailable", message: targetResult.error, otherMemberCount: 0 }],
      closedWorkspaceIds: [],
      leftWorkspaceIds: [],
      closedWorkspaceNames: [],
      leftWorkspaceNames: [],
      publicationRevokeCount: 0,
      portalDisableCount: 0,
      pendingInviteRevokeCount: 0,
    };
  }

  const database = await getCloudflareD1Database();
  if (!database) {
    return {
      ok: false,
      blockers: [{ code: "unavailable", message: "Account deletion is temporarily unavailable. Try again in a moment.", otherMemberCount: 0 }],
      closedWorkspaceIds: [],
      leftWorkspaceIds: [],
      closedWorkspaceNames: [],
      leftWorkspaceNames: [],
      publicationRevokeCount: 0,
      portalDisableCount: 0,
      pendingInviteRevokeCount: 0,
    };
  }

  return previewDeleteAccount(database, targetResult.target.id);
}

export async function deleteUserAction(
  userId: string,
  _previous: DeleteUserActionState,
  formData: FormData,
): Promise<DeleteUserActionState> {
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!validateDeleteAccountConfirmation(confirmation)) {
    return { ok: false, error: `Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm account deletion.` };
  }

  const targetResult = await getAdminDeleteTarget(userId);
  if (targetResult.error) return { ok: false, error: targetResult.error };

  const database = await getCloudflareD1Database();
  if (!database) return { ok: false, error: "Account deletion is temporarily unavailable. Try again in a moment." };

  const preview = await previewDeleteAccount(database, targetResult.target.id);
  if (!preview.ok) {
    return {
      ok: false,
      error: preview.blockers[0]?.message ?? "Resolve ownership before deleting this account.",
      blockers: preview.blockers,
    };
  }

  const result = await executeDeleteAccount(database, {
    userId: targetResult.target.id,
    email: targetResult.target.email,
    displayName: targetResult.target.display_name,
  });
  if (!result.ok) return { ok: false, error: result.message, blockers: result.blockers };

  const requestHeaders = await headers();
  await Promise.all([
    writeAdminAuditEvent({
      actorUserId: targetResult.admin.userId,
      actorEmail: targetResult.admin.email,
      action: "user.deleted",
      targetType: "profile",
      targetId: targetResult.target.id,
      summary: {
        deletion_id: result.deletionId,
        closed_workspace_count: preview.closedWorkspaceIds.length,
        left_workspace_count: preview.leftWorkspaceIds.length,
      },
      requestId: requestHeaders.get("x-request-id") ?? requestHeaders.get("cf-ray"),
    }),
    recordAccountSecurityEvent({
      eventType: "account_deleted_by_admin",
      userId: targetResult.target.id,
      requestId: requestHeaders.get("x-request-id") ?? requestHeaders.get("cf-ray"),
      ipAddress: requestHeaders.get("cf-connecting-ip")?.trim() ?? null,
      userAgent: requestHeaders.get("user-agent"),
      metadata: {
        deletion_id: result.deletionId,
        deleted_by_user_id: targetResult.admin.userId,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetResult.target.id}`);
  return { ok: true };
}
