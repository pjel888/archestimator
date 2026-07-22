import "server-only";

import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { requireOpenSupportPrivacyFence } from "@/lib/support/privacy-fence";

const ABANDON_QUIET_PERIOD_MS = 24 * 60 * 60 * 1_000;

type AbandonClaimRow = {
  cleanup_not_before: string | null;
  privacy_generation: number;
  state: "reserved" | "committed" | "cleanup_fenced" | "abandoned";
};

export class SupportAbandonError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 503) {
    super(message);
  }
}

async function readClaim(database: D1DatabaseLike, userId: string, clientMessageId: string) {
  return database
    .prepare<AbandonClaimRow>(
      `SELECT state, privacy_generation, cleanup_not_before
       FROM support_user_intake_claims
       WHERE user_id = ? AND client_message_id = ?
       LIMIT 1`,
    )
    .bind(userId, clientMessageId)
    .first<AbandonClaimRow>();
}

export async function abandonUserSupportIntake(input: {
  clientMessageId: string;
  database: D1DatabaseLike;
  userId: string;
}) {
  const clientMessageId = input.clientMessageId.trim().toLowerCase();
  if (!isUuid(clientMessageId)) throw new SupportAbandonError("Support intake not found.", 404);
  const claim = await readClaim(input.database, input.userId, clientMessageId);
  if (!claim) throw new SupportAbandonError("Support intake not found.", 404);
  if (claim.state === "committed") {
    throw new SupportAbandonError("Committed support messages cannot be abandoned.", 409);
  }
  if (claim.state === "cleanup_fenced" || claim.state === "abandoned") {
    return { state: claim.state, cleanupNotBefore: claim.cleanup_not_before };
  }

  const fence = await requireOpenSupportPrivacyFence(input.database, input.userId);
  if (claim.privacy_generation !== fence.generation) {
    throw new SupportAbandonError("Support intake crossed a privacy boundary.", 409);
  }
  const now = new Date();
  const cleanupNotBefore = new Date(now.getTime() + ABANDON_QUIET_PERIOD_MS).toISOString();
  const update = input.database
    .prepare(
      `UPDATE support_user_intake_claims
       SET state = 'cleanup_fenced', lease_token = NULL, lease_expires_at = NULL,
           cleanup_not_before = ?, updated_at = ?
       WHERE user_id = ?
         AND client_message_id = ?
         AND state = 'reserved'
         AND privacy_generation = ?
         AND EXISTS (
           SELECT 1 FROM support_subject_privacy_fences abandon_fence
           WHERE abandon_fence.user_id = support_user_intake_claims.user_id
             AND abandon_fence.generation = support_user_intake_claims.privacy_generation
             AND abandon_fence.state = 'open'
         )`,
    )
    .bind(cleanupNotBefore, now.toISOString(), input.userId, clientMessageId, fence.generation);
  const [result] = await runRequiredD1Batch(input.database, [update], "Support intake could not be abandoned.");
  const current = await readClaim(input.database, input.userId, clientMessageId);
  if (!current) throw new SupportAbandonError("Support intake not found.", 404);
  if (current.state === "committed") {
    throw new SupportAbandonError("Support message committed before abandonment.", 409);
  }
  if (current.state !== "cleanup_fenced" || !current.cleanup_not_before) {
    throw new SupportAbandonError("Support intake could not be abandoned.", 409);
  }
  if (result.meta?.changes !== 1 && current.cleanup_not_before !== cleanupNotBefore) {
    throw new SupportAbandonError("Support intake could not be abandoned.", 409);
  }
  return { state: current.state, cleanupNotBefore: current.cleanup_not_before };
}
