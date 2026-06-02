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

type ClosedBetaAllowlistMutationRpcClient = {
  rpc: (
    ...args:
      | [
          functionName: "create_closed_beta_allowlist_entry",
          args: { entry_email: string; entry_status: string; entry_notes: string | null },
        ]
      | [
          functionName: "update_closed_beta_allowlist_entry",
          args: { entry_id: string; entry_status: string; entry_notes: string | null },
        ]
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export async function createClosedBetaAllowlistEntry(formData: FormData) {
  const parsed = parseClosedBetaAllowlistCreate(formData);
  if (!parsed.ok) redirect(`${betaUsersPath}?error=invalid`);

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context.role)) redirect(`${betaUsersPath}?error=forbidden`);

  const supabase = await createSupabaseServerClient();
  const { error } = await (supabase as ClosedBetaAllowlistMutationRpcClient).rpc("create_closed_beta_allowlist_entry", {
    entry_email: parsed.email,
    entry_notes: parsed.notes,
    entry_status: parsed.status,
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
  const { error } = await (supabase as ClosedBetaAllowlistMutationRpcClient).rpc("update_closed_beta_allowlist_entry", {
    entry_id: parsed.id,
    entry_notes: parsed.notes,
    entry_status: parsed.status,
  });

  if (error) redirect(`${betaUsersPath}?error=save`);

  revalidatePath(betaUsersPath);
  redirect(`${betaUsersPath}?saved=1`);
}
