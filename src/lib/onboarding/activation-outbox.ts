import "server-only";

import { type D1DatabaseLike, type D1PreparedStatementLike } from "@/lib/cloudflare/d1";

import {
  ActivationRepositoryError,
  prepareActivationLedgerStatements,
  validateActivationMilestoneInput,
} from "./activation-repository";
import {
  isActivationMilestone,
  isActivationSource,
  type ActivationMilestoneInput,
  type ActivationOutboxState,
} from "./activation-types";

const RETRY_MINUTES = [1, 5, 15, 60, 360] as const;

type ActivationOutboxRow = {
  id: string;
  domain_mutation_id: string;
  user_id: string;
  workspace_id: string;
  project_id: string | null;
  estimate_id: string | null;
  milestone: string;
  source: string;
  occurred_at: string;
  dedupe_key: string;
  metadata_json: string;
  state: ActivationOutboxState;
  attempt_count: number;
};

function nextAttemptAt(attemptCount: number, now: Date) {
  const delayMinutes = RETRY_MINUTES[Math.min(Math.max(attemptCount - 1, 0), RETRY_MINUTES.length - 1)];
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

function parseInput(row: ActivationOutboxRow): ActivationMilestoneInput {
  if (!isActivationMilestone(row.milestone) || !isActivationSource(row.source)) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation outbox contains an unknown producer value.");
  }
  let metadata: Record<string, string | number | boolean | null>;
  try {
    metadata = JSON.parse(row.metadata_json) as Record<string, string | number | boolean | null>;
  } catch {
    throw new ActivationRepositoryError("activation_write_failed", "Activation outbox metadata is invalid.");
  }
  const input = {
    dedupeKey: row.dedupe_key,
    estimateId: row.estimate_id,
    metadata,
    milestone: row.milestone,
    occurredAt: row.occurred_at,
    projectId: row.project_id,
    source: row.source,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  };
  validateActivationMilestoneInput(input);
  return input;
}

export async function enqueueActivationMilestone(
  database: D1DatabaseLike | null | undefined,
  input: ActivationMilestoneInput & { domainMutationId: string },
): Promise<{ status: "enqueued" | "already_enqueued" }> {
  if (!database) {
    throw new ActivationRepositoryError("activation_database_unavailable", "Activation writes require D1.");
  }
  validateActivationMilestoneInput(input);
  if (!input.domainMutationId.trim()) {
    throw new ActivationRepositoryError("activation_invalid_input", "Activation requires a domain mutation id.");
  }
  const result = await prepareActivationOutboxIntent(database, input).run();
  if (result.success === false) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation outbox write failed.");
  }
  return { status: (result.meta?.changes ?? 0) > 0 ? "enqueued" : "already_enqueued" };
}

export function prepareActivationOutboxIntent(
  database: D1DatabaseLike,
  input: ActivationMilestoneInput & { domainMutationId: string },
  now = new Date().toISOString(),
): D1PreparedStatementLike {
  validateActivationMilestoneInput(input);
  if (!input.domainMutationId.trim()) {
    throw new ActivationRepositoryError("activation_invalid_input", "Activation requires a domain mutation id.");
  }
  return database.prepare(`
    INSERT INTO beta_activation_outbox (
      id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
      milestone, source, occurred_at, dedupe_key, metadata_json, state, attempt_count,
      next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)
    ON CONFLICT(workspace_id, dedupe_key) DO NOTHING
  `).bind(
    crypto.randomUUID(), input.domainMutationId, input.userId, input.workspaceId,
    input.projectId ?? null, input.estimateId ?? null, input.milestone, input.source,
    input.occurredAt, input.dedupeKey, JSON.stringify(input.metadata ?? {}), now, now, now,
  );
}

export async function reconcileActivationOutbox(
  database: D1DatabaseLike | null | undefined,
  options: { limit?: number; now?: Date } = {},
): Promise<{ dead: number; delivered: number; scanned: number }> {
  if (!database?.batch) return { dead: 0, delivered: 0, scanned: 0 };
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const selected = await database.prepare<ActivationOutboxRow>(`
    SELECT id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
           milestone, source, occurred_at, dedupe_key, metadata_json, state, attempt_count
    FROM beta_activation_outbox
    WHERE (state = 'pending' AND next_attempt_at <= ?)
       OR (state = 'processing' AND lease_expires_at <= ?)
    ORDER BY next_attempt_at ASC, id ASC
    LIMIT ?
  `).bind(nowIso, nowIso, limit).all<ActivationOutboxRow>();
  if (selected.success === false) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation outbox selection failed.");
  }
  let delivered = 0;
  let dead = 0;
  const rows = selected.results ?? [];
  for (const row of rows) {
    if (row.attempt_count >= 10) {
      const result = await database.prepare(`
        UPDATE beta_activation_outbox
        SET state = 'dead', lease_token = NULL, lease_expires_at = NULL,
            last_error_code = 'attempt_limit_reached', updated_at = ?
        WHERE id = ? AND state IN ('pending', 'processing')
      `).bind(nowIso, row.id).run();
      if (result.success === false) throw new ActivationRepositoryError("activation_write_failed", "Activation dead-letter update failed.");
      dead += result.meta?.changes ?? 0;
      continue;
    }
    const leaseToken = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + 60_000).toISOString();
    const claimed = await database.prepare(`
      UPDATE beta_activation_outbox
      SET state = 'processing', attempt_count = attempt_count + 1, lease_token = ?,
          lease_expires_at = ?, next_attempt_at = ?, updated_at = ?, last_error_code = NULL
      WHERE id = ?
        AND ((state = 'pending' AND next_attempt_at <= ?)
          OR (state = 'processing' AND lease_expires_at <= ?))
    `).bind(leaseToken, leaseExpiresAt, nextAttemptAt(row.attempt_count + 1, now), nowIso, row.id, nowIso, nowIso).run();
    if (claimed.success === false) throw new ActivationRepositoryError("activation_write_failed", "Activation lease claim failed.");
    if ((claimed.meta?.changes ?? 0) === 0) continue;
    try {
      const input = parseInput(row);
      const { insertEvent, updateProgress } = prepareActivationLedgerStatements(database, input, nowIso);
      const deliveredStatement = database.prepare(`
        UPDATE beta_activation_outbox
        SET state = 'delivered', delivered_at = ?, lease_token = NULL, lease_expires_at = NULL,
            last_error_code = NULL, updated_at = ?
        WHERE id = ? AND state = 'processing' AND lease_token = ? AND lease_expires_at > ?
      `).bind(nowIso, nowIso, row.id, leaseToken, nowIso);
      const results = await database.batch([insertEvent, updateProgress, deliveredStatement]);
      if (results.some((result) => result.success === false) || (results[2]?.meta?.changes ?? 0) !== 1) {
        throw new ActivationRepositoryError("activation_write_failed", "Activation outbox delivery acknowledgement failed.");
      }
      delivered += 1;
    } catch (error) {
      const code = error instanceof ActivationRepositoryError ? error.code : "activation_write_failed";
      const retry = await database.prepare(`
        UPDATE beta_activation_outbox
        SET state = CASE WHEN attempt_count >= 10 THEN 'dead' ELSE 'pending' END,
            lease_token = NULL, lease_expires_at = NULL, last_error_code = ?, updated_at = ?
        WHERE id = ? AND state = 'processing' AND lease_token = ?
      `).bind(code, nowIso, row.id, leaseToken).run();
      if (retry.success === false) throw new ActivationRepositoryError("activation_write_failed", "Activation retry scheduling failed.");
      if ((retry.meta?.changes ?? 0) > 0 && row.attempt_count + 1 >= 10) dead += 1;
    }
  }
  return { dead, delivered, scanned: rows.length };
}

export async function repairDeadActivationIntent(
  database: D1DatabaseLike | null | undefined,
  input: { id: string; workspaceId: string },
): Promise<{ repaired: boolean }> {
  if (!database) return { repaired: false };
  const now = new Date().toISOString();
  const result = await database.prepare(`
    UPDATE beta_activation_outbox
    SET state = 'pending', attempt_count = 0, next_attempt_at = ?, lease_token = NULL,
        lease_expires_at = NULL, last_error_code = NULL, updated_at = ?
    WHERE id = ? AND workspace_id = ? AND state = 'dead'
  `).bind(now, now, input.id, input.workspaceId).run();
  if (result.success === false) throw new ActivationRepositoryError("activation_write_failed", "Activation dead-letter repair failed.");
  return { repaired: (result.meta?.changes ?? 0) === 1 };
}
