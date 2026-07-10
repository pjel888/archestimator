"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import {
  addCorporateAccountMember,
  createCorporateAccount,
  isValidRole,
  linkWorkspaceToCorporateAccount,
  removeCorporateAccountMember,
  unlinkWorkspaceFromCorporateAccount,
  updateCorporateAccountMemberRole,
} from "@/lib/admin/corporate-account-repository";

export type CorporateActionResult =
  | { ok: true; accountId?: string }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function createCorporateAccountAction(input: {
  name: string;
  description?: string;
}): Promise<CorporateActionResult> {
  const admin = await requireAdminContext();
  const name = input.name.trim();
  if (!name || name.length > 200) return { ok: false, error: "Name is required (max 200 chars)." };

  const result = await createCorporateAccount({
    name,
    description: input.description,
    createdBy: admin.userId,
  });
  if (result.error || !result.data) return { ok: false, error: result.error ?? "Failed." };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "corporate_account.created",
    targetType: "corporate_account",
    targetId: result.data.id,
    summary: { name },
  });

  revalidatePath("/admin/accounts");
  return { ok: true, accountId: result.data.id };
}

export async function assignUserToCorporateAccountAction(input: {
  accountId: string;
  userId: string;
  role: string;
  jobTitle?: string;
}): Promise<CorporateActionResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(input.accountId) || !UUID_PATTERN.test(input.userId)) {
    return { ok: false, error: "Invalid ID." };
  }
  if (!isValidRole(input.role)) return { ok: false, error: "Invalid role." };

  const result = await addCorporateAccountMember(input);
  if (result.error || !result.data?.ok) return { ok: false, error: result.error ?? "Failed." };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "corporate_account.member_assigned",
    targetType: "corporate_account",
    targetId: input.accountId,
    summary: { userId: input.userId, role: input.role },
  });

  revalidatePath("/admin/accounts");
  return { ok: true };
}

export async function removeUserFromCorporateAccountAction(input: {
  accountId: string;
  userId: string;
}): Promise<CorporateActionResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(input.accountId) || !UUID_PATTERN.test(input.userId)) {
    return { ok: false, error: "Invalid ID." };
  }

  const result = await removeCorporateAccountMember(input.accountId, input.userId);
  if (result.error || !result.data?.ok) return { ok: false, error: result.error ?? "Failed." };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "corporate_account.member_removed",
    targetType: "corporate_account",
    targetId: input.accountId,
    summary: { userId: input.userId },
  });

  revalidatePath("/admin/accounts");
  return { ok: true };
}

export async function updateMemberRoleAction(input: {
  accountId: string;
  userId: string;
  role: string;
}): Promise<CorporateActionResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(input.accountId) || !UUID_PATTERN.test(input.userId)) {
    return { ok: false, error: "Invalid ID." };
  }
  if (!isValidRole(input.role)) return { ok: false, error: "Invalid role." };

  const result = await updateCorporateAccountMemberRole(input);
  if (result.error || !result.data?.ok) return { ok: false, error: result.error ?? "Failed." };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "corporate_account.member_role_updated",
    targetType: "corporate_account",
    targetId: input.accountId,
    summary: { userId: input.userId, role: input.role },
  });

  revalidatePath("/admin/accounts");
  return { ok: true };
}

export async function linkWorkspaceAction(input: {
  workspaceId: string;
  accountId: string;
}): Promise<CorporateActionResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(input.workspaceId) || !UUID_PATTERN.test(input.accountId)) {
    return { ok: false, error: "Invalid ID." };
  }

  const result = await linkWorkspaceToCorporateAccount(input.workspaceId, input.accountId);
  if (result.error || !result.data?.ok) return { ok: false, error: result.error ?? "Failed." };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "corporate_account.workspace_linked",
    targetType: "corporate_account",
    targetId: input.accountId,
    summary: { workspaceId: input.workspaceId },
  });

  revalidatePath("/admin/accounts");
  return { ok: true };
}

export async function unlinkWorkspaceAction(input: {
  workspaceId: string;
}): Promise<CorporateActionResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(input.workspaceId)) {
    return { ok: false, error: "Invalid workspace ID." };
  }

  const result = await unlinkWorkspaceFromCorporateAccount(input.workspaceId);
  if (result.error || !result.data?.ok) return { ok: false, error: result.error ?? "Failed." };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "corporate_account.workspace_unlinked",
    targetType: "workspace",
    targetId: input.workspaceId,
    summary: {},
  });

  revalidatePath("/admin/accounts");
  return { ok: true };
}
