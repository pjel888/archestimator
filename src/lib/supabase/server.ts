import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { instrumentSupabaseFetch } from "@/lib/perf/server-timing";
import type { Database } from "./types";

// Request-scoped memoization. The hero render path rebuilds this client ~19x per
// request (the workspace repository alone). React `cache()` collapses those to
// one build per server request, mirroring `getCurrentUserContext` /
// `ensureDefaultWorkspace`.
//
// Safety: app auth is handled by Better Auth during the Cloudflare migration.
// This helper is now only a transitional Supabase/Postgres query client, so it
// disables Supabase Auth persistence and never reads or writes provider session
// cookies. It always uses the browser-safe Supabase anon key; service-role DB
// bypasses have been retired from this runtime.
export const createSupabaseServerClient = cache(async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Archestimator Supabase server environment variables.");
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: instrumentSupabaseFetch(fetch),
    },
  });
});
