import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createDevSupabaseAdminClient, getDevAuthBypassCredentialFromRequestParts, isDevAdminDatabaseBypassRequest } from "@/lib/auth/dev-auth";
import { instrumentSupabaseFetch } from "@/lib/perf/server-timing";
import type { Database } from "./types";

// Request-scoped memoization. The hero render path rebuilds this client ~19x per
// request (the workspace repository alone), and each build runs `await headers()`
// + `await cookies()` and the dev-bypass gate. React `cache()` collapses those to
// one build per server request — same pattern as `getCurrentUserContext` /
// `ensureDefaultWorkspace`.
//
// Safety: the @supabase/ssr server storage adapter reads cookies lazily per
// operation (it never snapshots cookie state at construction), and read-after-write
// within a request is served from the single client instance's in-memory
// setItems/removedItems buffer. Auth write-then-read flows (callback code exchange,
// sign-in/out, getUser→RPC) already reuse one client instance for the whole flow,
// so sharing one instance per request preserves — and slightly strengthens — that
// correctness. The dev-bypass gate is deterministic for a given request's
// headers/cookies, and the admin client it returns holds no session state
// (persistSession: false), so memoizing it is inert.
export const createSupabaseServerClient = cache(async function createSupabaseServerClient() {
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
});
