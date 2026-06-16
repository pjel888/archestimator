import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ensureDefaultWorkspace } from "./workspace-repository";

export async function listCurrentUserEstimateFavoriteCreatedAtById(
  estimateIds: readonly string[],
): Promise<Map<string, string>> {
  const uniqueEstimateIds = Array.from(new Set(estimateIds));
  if (uniqueEstimateIds.length === 0) return new Map();

  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("estimate_favorites")
    .select("estimate_id, created_at")
    .eq("workspace_id", workspace.id)
    .eq("user_id", profile.id)
    .in("estimate_id", uniqueEstimateIds);

  if (error) throw error;

  return new Map((data ?? []).map((favorite) => [favorite.estimate_id, favorite.created_at]));
}
