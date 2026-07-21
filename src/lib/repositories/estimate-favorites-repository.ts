import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1Value } from "@/lib/cloudflare/d1";

type EstimateFavoriteD1Row = {
  estimate_id: string;
  created_at: string;
};

export async function listCurrentUserEstimateFavoriteCreatedAtById(
  estimateIds: readonly string[],
): Promise<Map<string, string>> {
  const uniqueEstimateIds = Array.from(new Set(estimateIds));
  if (uniqueEstimateIds.length === 0) return new Map();

  const currentUser = await requireCurrentUserContext();
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const estimateIdPlaceholders = uniqueEstimateIds.map(() => "?").join(", ");
  const binds: D1Value[] = [currentUser.userId, ...uniqueEstimateIds];
  const { results = [] } = await db
    .prepare<EstimateFavoriteD1Row>(`
      SELECT estimate_id, created_at
      FROM estimate_favorites
      WHERE user_id = ?
        AND estimate_id IN (${estimateIdPlaceholders})
    `)
    .bind(...binds)
    .all<EstimateFavoriteD1Row>();

  return new Map(results.map((favorite) => [favorite.estimate_id, favorite.created_at]));
}
