"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createClosedBetaAllowlistEntryInD1,
  updateClosedBetaAllowlistEntryInD1,
} from "@/lib/auth/closed-beta-d1-store";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canManageClosedBetaAllowlist,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
} from "@/lib/auth/beta-allowlist-admin";

const betaUsersPath = "/workshop/settings/users";

export async function createClosedBetaAllowlistEntry(formData: FormData) {
  const parsed = parseClosedBetaAllowlistCreate(formData);
  if (!parsed.ok) redirect(`${betaUsersPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context.role)) redirect(`${betaUsersPath}?error=forbidden`);

  try {
    await createClosedBetaAllowlistEntryInD1({
      actorUserId: context.userId,
      email: parsed.email,
      notes: parsed.notes,
      status: parsed.status,
    });
  } catch {
    redirect(`${betaUsersPath}?error=save`);
  }

  revalidatePath(betaUsersPath);
  redirect(`${betaUsersPath}?created=1`);
}

export async function updateClosedBetaAllowlistEntry(formData: FormData) {
  const parsed = parseClosedBetaAllowlistUpdate(formData);
  if (!parsed.ok) redirect(`${betaUsersPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context.role)) redirect(`${betaUsersPath}?error=forbidden`);

  try {
    await updateClosedBetaAllowlistEntryInD1({
      actorUserId: context.userId,
      id: parsed.id,
      notes: parsed.notes,
      status: parsed.status,
    });
  } catch {
    redirect(`${betaUsersPath}?error=save`);
  }

  revalidatePath(betaUsersPath);
  redirect(`${betaUsersPath}?saved=1`);
}
