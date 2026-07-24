"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createClosedBetaAllowlistEntriesInD1,
  createClosedBetaAllowlistEntryInD1,
  deliverPendingClosedBetaInviteEmailsFromD1,
  sendClosedBetaInviteEmailsForCreatedEntriesInD1,
  updateClosedBetaAllowlistEntryInD1,
} from "@/lib/auth/closed-beta-d1-store";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canManageClosedBetaAllowlist,
  CLOSED_BETA_ALLOWLIST_ADMIN_PATH,
  parseClosedBetaAllowlistBulkCreate,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
  resolveClosedBetaAllowlistReturnPath,
} from "@/lib/auth/beta-allowlist-admin";

function revalidateAllowlistPaths() {
  revalidatePath(CLOSED_BETA_ALLOWLIST_ADMIN_PATH);
}

export async function createClosedBetaAllowlistEntry(formData: FormData) {
  const returnPath = resolveClosedBetaAllowlistReturnPath(formData);
  const parsed = parseClosedBetaAllowlistCreate(formData);
  if (!parsed.ok) redirect(`${returnPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) redirect(`${returnPath}?error=forbidden`);

  try {
    await createClosedBetaAllowlistEntryInD1({
      actorUserId: context.userId,
      email: parsed.email,
      notes: parsed.notes,
      status: parsed.status,
    });
  } catch {
    redirect(`${returnPath}?error=save`);
  }

  try {
    await sendClosedBetaInviteEmailsForCreatedEntriesInD1({ emails: [parsed.email] });
  } catch {
    // Allowlist write already succeeded; pending cron/page delivery will retry.
  }

  revalidateAllowlistPaths();
  redirect(`${returnPath}?created=1`);
}

export async function createClosedBetaAllowlistEntries(formData: FormData) {
  const returnPath = resolveClosedBetaAllowlistReturnPath(formData);
  const parsed = parseClosedBetaAllowlistBulkCreate(formData);
  if (!parsed.ok) redirect(`${returnPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) redirect(`${returnPath}?error=forbidden`);

  let createdEmails: string[] = [];
  let created = 0;
  try {
    const result = await createClosedBetaAllowlistEntriesInD1({
      actorUserId: context.userId,
      emails: parsed.emails,
      notes: parsed.notes,
      status: parsed.status,
    });
    created = result.created;
    createdEmails = result.createdEmails;
  } catch {
    redirect(`${returnPath}?error=save`);
  }

  if (created === 0) {
    revalidateAllowlistPaths();
    redirect(`${returnPath}?error=duplicate`);
  }

  try {
    await sendClosedBetaInviteEmailsForCreatedEntriesInD1({ emails: createdEmails });
  } catch {
    // Allowlist write already succeeded; pending cron/page delivery will retry.
  }

  revalidateAllowlistPaths();
  redirect(`${returnPath}?created=${created}`);
}

export async function updateClosedBetaAllowlistEntry(formData: FormData) {
  const returnPath = resolveClosedBetaAllowlistReturnPath(formData);
  const parsed = parseClosedBetaAllowlistUpdate(formData);
  if (!parsed.ok) redirect(`${returnPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) redirect(`${returnPath}?error=forbidden`);

  try {
    await updateClosedBetaAllowlistEntryInD1({
      actorUserId: context.userId,
      id: parsed.id,
      notes: parsed.notes,
      status: parsed.status,
    });
  } catch {
    redirect(`${returnPath}?error=save`);
  }

  revalidateAllowlistPaths();
  redirect(`${returnPath}?saved=1`);
}

export async function deliverPendingClosedBetaInviteEmails() {
  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) {
    return { authorized: false as const, attempted: 0, sent: 0, failed: 0 };
  }

  try {
    const result = await deliverPendingClosedBetaInviteEmailsFromD1();
    revalidateAllowlistPaths();
    return { authorized: true as const, ...result };
  } catch {
    return { authorized: true as const, attempted: 0, sent: 0, failed: 0 };
  }
}
