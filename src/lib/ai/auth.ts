import { cookies, headers } from "next/headers";

import { getDevAuthEmail } from "@/lib/auth/dev-auth";
import { getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import { getCurrentUserContext } from "@/lib/auth/session";

export type AiRequestUserContext = {
  userId: string;
  email: string;
  workspaceId?: string | null;
  authMode?: "better-auth" | "dev-bypass";
};

export function isProviderBackedAiAuthMode(authMode: AiRequestUserContext["authMode"]) {
  return authMode === "better-auth";
}

export function isProviderBackedAiUserContext(
  userContext: AiRequestUserContext,
): userContext is AiRequestUserContext & { authMode: "better-auth"; workspaceId: string } {
  return isProviderBackedAiAuthMode(userContext.authMode) && Boolean(userContext.workspaceId);
}

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

  const user = await getCurrentUserContext();
  if (!user) return null;

  return {
    userId: user.userId,
    email: user.email.toLowerCase(),
    workspaceId: user.profile.default_workspace_id ?? null,
    authMode: "better-auth",
  };
}
