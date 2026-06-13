import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Singleton browser client. Returning one instance means every realtime hook
// (presence, cursors) and the top-level auth bridge share a SINGLE websocket
// connection, so `supabase.realtime.setAuth()` on token refresh keeps every
// open channel authenticated. (Teamspace plan §5 / T0.4 / decision R-17.)
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Archestimator Supabase browser environment variables.");
  }

  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
