"use server";

import { requireAdminContext } from "@/lib/admin/require-admin";
import { searchAdminEntities, type AdminSearchResult } from "@/lib/admin/search-repository";

export type AdminSearchActionOutcome =
  | { ok: true; results: AdminSearchResult[]; degraded: boolean }
  | { ok: false; error: "validation" | "failed" };

// F1 global search entrypoint. Reauthorizes the platform admin on every call;
// delegates to the bounded, source-isolated repository.
export async function adminSearch(query: string): Promise<AdminSearchActionOutcome> {
  await requireAdminContext();
  const q = (query ?? "").trim();
  if (q.length < 2) return { ok: false, error: "validation" };
  try {
    const outcome = await searchAdminEntities(q);
    return { ok: true, results: outcome.results, degraded: outcome.degraded };
  } catch {
    return { ok: false, error: "failed" };
  }
}
