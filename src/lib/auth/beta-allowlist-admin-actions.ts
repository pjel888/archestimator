"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canManageClosedBetaAllowlist,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
} from "@/lib/auth/beta-allowlist-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const betaUsersPath = "/workshop/settings/beta-users";

export async function createClosedBetaAllowlistEntry(formData: FormData) {
  const parsed = parseClosedBetaAllowlistCreate(formData);
  if (!parsed.ok) redirect(`${betaUsersPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context.role)) redirect(`${betaUsersPath}?error=forbidden`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("closed_beta_allowed_emails").insert({
    invited_by: context.userId,
    metadata: {},
    normalized_email: parsed.email,
    notes: parsed.notes,
    status: parsed.status,
  });

  if (error) redirect(`${betaUsersPath}?error=save`);

  revalidatePath(betaUsersPath);
  redirect(`${betaUsersPath}?created=1`);
}

export async function updateClosedBetaAllowlistEntry(formData: FormData) {
  const parsed = parseClosedBetaAllowlistUpdate(formData);
  if (!parsed.ok) redirect(`${betaUsersPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context.role)) redirect(`${betaUsersPath}?error=forbidden`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("closed_beta_allowed_emails")
    .update({
      notes: parsed.notes,
      status: parsed.status,
    })
    .eq("id", parsed.id);

  if (error) redirect(`${betaUsersPath}?error=save`);

  revalidatePath(betaUsersPath);
  redirect(`${betaUsersPath}?saved=1`);
}
