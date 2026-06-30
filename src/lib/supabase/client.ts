import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Singleton browser DB client. Browser auth/session persistence is disabled
// because application auth is handled by Better Auth during the Cloudflare
// migration; this helper remains only for transitional Supabase table reads.
let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Archestimator Supabase browser environment variables.");
  }

  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return browserClient;
}
