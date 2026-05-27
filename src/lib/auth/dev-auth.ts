import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";
import type { Database, Tables } from "@/lib/supabase/types";

export { isDevAdminDatabaseBypassEnabled, isDevAdminDatabaseBypassRequest, isDevAuthBypassEnabled, isDevAuthBypassRequest } from "@/lib/auth/dev-auth-gate";

const DEV_AUTH_BYPASS_FLAG = "ARCHESTIMATOR_DEV_AUTH_BYPASS";
const DEV_AUTH_EMAIL = "ARCHESTIMATOR_DEV_AUTH_EMAIL";
const SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY";

export type DevCurrentUserContext = {
  userId: string;
  email: string;
  role: Tables<"profiles">["role"];
  profile: Tables<"profiles">;
  displayName: string;
  avatarUrl: string | null;
};

function getRequiredDevEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when ${DEV_AUTH_BYPASS_FLAG}=1. Set it in .env.local; never commit real Supabase secrets.`);
  }
  return value;
}

export function getDevAuthEmail() {
  return getRequiredDevEnv(DEV_AUTH_EMAIL).toLowerCase();
}

export function createDevSupabaseAdminClient() {
  const url = getRequiredDevEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredDevEnv(SERVICE_ROLE_KEY);

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-dev-auth-bypass",
      },
    },
  });
}

export async function getDevCurrentUserContext(): Promise<DevCurrentUserContext | null> {
  const hostHeader = (await headers()).get("host");
  if (!isDevAuthBypassRequest(hostHeader)) return null;

  const email = getDevAuthEmail();
  const supabase = createDevSupabaseAdminClient();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();

  if (error) throw error;
  if (!profile) {
    throw new Error(`Dev auth bypass could not find public.profiles.email=${email}. Log in once or seed/create that profile before using ${DEV_AUTH_BYPASS_FLAG}=1.`);
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
