import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createDevSupabaseAdminClient, getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest } from "@/lib/auth/dev-auth";
import { instrumentSupabaseFetch } from "@/lib/perf/server-timing";
import type { Database } from "./types";

export async function createSupabaseServerClient() {
  const requestHeaders = await headers();
  const hostHeader = requestHeaders.get("host");
  const devAuthBypassCredential = getDevAuthBypassCredentialFromRequestParts(requestHeaders, await cookies());
  if (isDevAdminDatabaseBypassRequest(hostHeader, devAuthBypassCredential)) {
    return createDevSupabaseAdminClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Archestimator Supabase server environment variables.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    global: {
      fetch: instrumentSupabaseFetch(fetch),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies; middleware can refresh sessions later.
        }
      },
    },
  });
}
