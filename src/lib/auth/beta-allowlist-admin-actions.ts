"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createClosedBetaAllowlistEntriesInD1,
  createClosedBetaAllowlistEntryInD1,
  updateClosedBetaAllowlistEntryInD1,
} from "@/lib/auth/closed-beta-d1-store";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canManageClosedBetaAllowlist,
  CLOSED_BETA_ALLOWLIST_ADMIN_PATH,
  CLOSED_BETA_ALLOWLIST_WORKSHOP_PATH,
  parseClosedBetaAllowlistBulkCreate,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
  resolveClosedBetaAllowlistReturnPath,
} from "@/lib/auth/beta-allowlist-admin";

function revalidateAllowlistPaths() {
  revalidatePath(CLOSED_BETA_ALLOWLIST_ADMIN_PATH);
  revalidatePath(CLOSED_BETA_ALLOWLIST_WORKSHOP_PATH);
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

  revalidateAllowlistPaths();
  redirect(`${returnPath}?created=1`);
}

export async function createClosedBetaAllowlistEntries(formData: FormData) {
  const returnPath = resolveClosedBetaAllowlistReturnPath(formData);
  const parsed = parseClosedBetaAllowlistBulkCreate(formData);
  if (!parsed.ok) redirect(`${returnPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) redirect(`${returnPath}?error=forbidden`);

  try {
    const result = await createClosedBetaAllowlistEntriesInD1({
      actorUserId: context.userId,
      emails: parsed.emails,
      notes: parsed.notes,
      status: parsed.status,
    });
    revalidateAllowlistPaths();
    if (result.created === 0) redirect(`${returnPath}?error=duplicate`);
    redirect(`${returnPath}?created=${result.created}`);
  } catch {
    redirect(`${returnPath}?error=save`);
  }
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
