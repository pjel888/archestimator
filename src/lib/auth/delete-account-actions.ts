"use server";

import { redirect } from "next/navigation";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import {
  executeDeleteAccount,
  previewDeleteAccount,
} from "@/lib/auth/delete-account-repository";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  validateDeleteAccountConfirmation,
  type DeleteAccountPreview,
} from "@/lib/auth/delete-account-shared";
import { requireAuth } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { cookies, headers } from "next/headers";

export type DeleteAccountActionState = {
  ok: boolean;
  error?: string;
  blockers?: DeleteAccountPreview["blockers"];
};

async function clearBetterAuthSessionCookies() {
  const cookieStore = await cookies();
  const options = { maxAge: 0, path: "/" };
  cookieStore.set("better-auth.session_token", "", options);
  cookieStore.set("__Secure-better-auth.session_token", "", options);
}

export async function getDeleteAccountPreviewAction(): Promise<DeleteAccountPreview> {
  const context = await requireAuth();
  const database = await getCloudflareD1Database();
  if (!database) {
    return {
      ok: false,
      blockers: [
        {
          code: "unavailable",
          message: "Account deletion is temporarily unavailable. Try again in a moment.",
          otherMemberCount: 0,
        },
      ],
      closedWorkspaceIds: [],
      leftWorkspaceIds: [],
      closedWorkspaceNames: [],
      leftWorkspaceNames: [],
      publicationRevokeCount: 0,
      portalDisableCount: 0,
      pendingInviteRevokeCount: 0,
    };
  }
  return previewDeleteAccount(database, context.userId);
}

export async function deleteAccountAction(
  _previous: DeleteAccountActionState,
  formData: FormData,
): Promise<DeleteAccountActionState> {
  const context = await requireAuth();
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!validateDeleteAccountConfirmation(confirmation)) {
    return {
      ok: false,
      error: `Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm account deletion.`,
    };
  }

  const database = await getCloudflareD1Database();
  if (!database) {
    return { ok: false, error: "Account deletion is temporarily unavailable. Try again in a moment." };
  }

  const preview = await previewDeleteAccount(database, context.userId);
  if (!preview.ok) {
    return {
      ok: false,
      error: preview.blockers[0]?.message ?? "Resolve ownership before deleting your account.",
      blockers: preview.blockers,
    };
  }

  const result = await executeDeleteAccount(database, {
    userId: context.userId,
    email: context.email,
    displayName: context.displayName,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      blockers: result.blockers,
    };
  }

  const requestHeaders = await headers();
  await recordAccountSecurityEvent({
    eventType: "account_deleted",
    userId: context.userId,
    requestId: requestHeaders.get("x-request-id") ?? requestHeaders.get("cf-ray"),
    ipAddress: requestHeaders.get("cf-connecting-ip")?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent"),
    metadata: {
      deletion_id: result.deletionId,
      closed_workspace_count: preview.closedWorkspaceIds.length,
      left_workspace_count: preview.leftWorkspaceIds.length,
    },
  });

  await clearBetterAuthSessionCookies();
  redirect("/login?accountDeleted=1");
}
