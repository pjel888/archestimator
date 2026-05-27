"use server";

import { redirect } from "next/navigation";

import { DEFAULT_AUTH_DESTINATION, LOGIN_PATH } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutForPendingInvite() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`${LOGIN_PATH}?next=${encodeURIComponent(DEFAULT_AUTH_DESTINATION)}`);
}
