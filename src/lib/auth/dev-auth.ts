import { cookies, headers } from "next/headers";
import { getDevAuthBypassCredentialFromRequestParts, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import { getProfileByEmailFromCloudflareD1, type AppRole, type CurrentUserProfile } from "@/lib/auth/profile-d1-store";

export { getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassEnabled, isDevAdminDatabaseBypassRequest, isDevAuthBypassEnabled, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";

const DEV_AUTH_BYPASS_FLAG = "ARCHESTIMATOR_DEV_AUTH_BYPASS";
const DEV_AUTH_EMAIL = "ARCHESTIMATOR_DEV_AUTH_EMAIL";

export type DevCurrentUserContext = {
  userId: string;
  email: string;
  role: AppRole;
  profile: CurrentUserProfile;
  displayName: string;
  avatarUrl: string | null;
};

function getRequiredDevEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when ${DEV_AUTH_BYPASS_FLAG}=1. Set it in .env.local; never commit real provider secrets.`);
  }
  return value;
}

export function getDevAuthEmail() {
  return getRequiredDevEnv(DEV_AUTH_EMAIL).toLowerCase();
}

export async function getDevCurrentUserContext(): Promise<DevCurrentUserContext | null> {
  const requestHeaders = await headers();
  const hostHeader = requestHeaders.get("host");
  const devAuthBypassCredential = getDevAuthBypassCredentialFromRequestParts(requestHeaders, await cookies());
  if (!isDevAuthBypassRequest(hostHeader, devAuthBypassCredential)) return null;

  const email = getDevAuthEmail();
  const profile = await getProfileByEmailFromCloudflareD1(email);

  if (!profile) {
    throw new Error(`Dev auth bypass could not find Cloudflare D1 profiles.email=${email}. Backfill or seed the D1 profile before using ${DEV_AUTH_BYPASS_FLAG}=1.`);
  }

  return {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    profile,
    displayName: profile.display_name ?? profile.email,
    avatarUrl: profile.avatar_url,
  };
}
