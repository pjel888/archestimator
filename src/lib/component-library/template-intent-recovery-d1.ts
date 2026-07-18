import "server-only";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

export async function reconcileExpiredTemplateMutationIntents(
  database: D1DatabaseLike | null | undefined,
  options: { intentId?: string; limit?: number; now?: Date } = {},
) {
  if (!database) return { resolved: 0 };
  const timestamp = (options.now ?? new Date()).toISOString();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const intentFilter = options.intentId ? "AND intent_id = ?" : "";
  const values = options.intentId
    ? [timestamp, timestamp, options.intentId, timestamp, limit]
    : [timestamp, timestamp, timestamp, limit];
  const result = await database.prepare(`
    UPDATE estimate_template_mutation_intents
    SET state = 'not_applied', execution_lease_token = NULL,
        execution_lease_expires_at = NULL, not_applied_code = 'execution_lease_expired',
        updated_at = ?, resolved_at = ?
    WHERE intent_id IN (
      SELECT intent_id
      FROM estimate_template_mutation_intents
      WHERE state = 'pending'
        ${intentFilter}
        AND execution_lease_expires_at <= ?
      ORDER BY execution_lease_expires_at ASC, updated_at ASC, intent_id ASC
      LIMIT ?
    )
  `).bind(...values).run();
  if (result.success === false) throw new Error("Could not reconcile retained Template update intents.");
  return { resolved: result.meta?.changes ?? 0 };
}
