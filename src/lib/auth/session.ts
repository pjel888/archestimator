import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type CurrentUserContext = {
  userId: string;
  email: string;
  role: Tables<"profiles">["role"];
  profile: Tables<"profiles">;
};

export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const email = user.email?.toLowerCase() ?? "";
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (profile) {
    return { userId: user.id, email, role: profile.role, profile };
  }

  const role = email === "philipjonlewis@gmail.com" ? "ceo" : "member";
  const { data: createdProfile, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, email, display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? null, role })
    .select("*")
    .single();

  if (error) throw error;
  return { userId: user.id, email, role: createdProfile.role, profile: createdProfile };
});

export async function requireCurrentUserContext() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  return context;
}
