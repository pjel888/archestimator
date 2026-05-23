import { headers } from "next/headers";

import { getDevAuthEmail } from "@/lib/auth/dev-auth";
import { isDevAdminDatabaseBypassRequest, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AiRequestUserContext = {
  userId: string;
  email: string;
  workspaceId?: string | null;
  authMode?: "supabase" | "dev-bypass";
};

export async function getAiRequestUserContext(): Promise<AiRequestUserContext | null> {
  const hostHeader = (await headers()).get("host");
  if (isDevAdminDatabaseBypassRequest(hostHeader)) {
    throw new Error("AI routes cannot use the local admin database bypass.");
  }
  if (isDevAuthBypassRequest(hostHeader)) {
    return {
      userId: "dev-auth-bypass",
      email: getDevAuthEmail(),
      workspaceId: null,
      authMode: "dev-bypass",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("default_workspace_id").eq("id", user.id).maybeSingle();

  return {
    userId: user.id,
    email: user.email?.toLowerCase() ?? "",
    workspaceId: profile?.default_workspace_id ?? null,
    authMode: "supabase",
  };
}
