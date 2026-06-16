import { cookies, headers } from "next/headers";

import { getRequiredCurrentUserContextResult } from "@/lib/auth/session";
import { getDevAuthEmail } from "@/lib/auth/dev-auth";
import { getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";

export type AiRequestUserContext = {
  userId: string;
  email: string;
  workspaceId?: string | null;
  authMode?: "supabase" | "dev-bypass";
};

export async function getAiRequestUserContext(): Promise<AiRequestUserContext | null> {
  const requestHeaders = await headers();
  const hostHeader = requestHeaders.get("host");
  const devAuthBypassCredential = getDevAuthBypassCredentialFromRequestParts(requestHeaders, await cookies());
  if (isDevAdminDatabaseBypassRequest(hostHeader, devAuthBypassCredential)) {
    throw new Error("AI routes cannot use the local admin database bypass.");
  }
  if (isDevAuthBypassRequest(hostHeader, devAuthBypassCredential)) {
    return {
      userId: "dev-auth-bypass",
      email: getDevAuthEmail(),
      workspaceId: null,
      authMode: "dev-bypass",
    };
  }

  const authResult = await getRequiredCurrentUserContextResult();
  if (!authResult.ok) {
    if (authResult.reason === "unauthenticated") return null;
    throw new Error("AI routes require current Terms acceptance.");
  }
  const { context } = authResult;

  return {
    userId: context.userId,
    email: context.email,
    workspaceId: context.profile.default_workspace_id ?? null,
    authMode: "supabase",
  };
}
