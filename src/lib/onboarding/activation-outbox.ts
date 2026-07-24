import "server-only";

import { type D1DatabaseLike, type D1PreparedStatementLike } from "@/lib/cloudflare/d1";

import {
  ActivationRepositoryError,
  assertActivationResourceChain,
  prepareActivationLedgerStatements,
  validateActivationMilestoneInput,
} from "./activation-repository";
import {
  isActivationMilestone,
  isActivationOriginClass,
  isActivationSource,
  type ActivationMilestoneInput,
  type ActivationOutboxState,
} from "./activation-types";
import {
  assertTrustedActivation,
  prepareStarterSeedActivation,
  prepareTutorialSeedActivation,
  prepareUserDomainActivation,
  restorePersistedActivationClassification,
  type StarterSeedActivationCapability,
  type TrustedActivationMilestoneInput,
  type TutorialSeedActivationCapability,
} from "./activation-origin";

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
  origin_class: string;
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

function parseInput(row: ActivationOutboxRow): TrustedActivationMilestoneInput {
  if (
    !isActivationMilestone(row.milestone)
    || !isActivationSource(row.source)
    || !isActivationOriginClass(row.origin_class)
  ) {
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
  return restorePersistedActivationClassification(input, row.origin_class);
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
  await assertActivationResourceChain(database, input);
  const result = await prepareActivationOutboxIntent(database, input).run();
  if (result.success === false) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation outbox write failed.");
  }
  if ((result.meta?.changes ?? 0) > 0) return { status: "enqueued" };
  const existing = await database.prepare<{ present: number }>(`
    SELECT 1 AS present
    FROM beta_activation_outbox
    WHERE workspace_id = ? AND dedupe_key = ?
    LIMIT 1
  `).bind(input.workspaceId, input.dedupeKey).first<{ present: number }>();
  if (existing) return { status: "already_enqueued" };
  throw new ActivationRepositoryError(
    "activation_resource_not_found",
    "Activation resource chain changed before the outbox write.",
  );
}

export function prepareActivationOutboxIntent(
  database: D1DatabaseLike,
  input: ActivationMilestoneInput & { domainMutationId: string },
  now = new Date().toISOString(),
): D1PreparedStatementLike {
  return prepareClassifiedActivationOutboxIntent(
    database,
    prepareUserDomainActivation(input),
    input.domainMutationId,
    now,
  );
}

export function prepareStarterSeedActivationOutboxIntent(
  database: D1DatabaseLike,
  capability: StarterSeedActivationCapability,
  input: ActivationMilestoneInput & { domainMutationId: string },
  now = new Date().toISOString(),
): D1PreparedStatementLike {
  return prepareClassifiedActivationOutboxIntent(
    database,
    prepareStarterSeedActivation(capability, input),
    input.domainMutationId,
    now,
  );
}

export function prepareTutorialSeedActivationOutboxIntent(
  database: D1DatabaseLike,
  capability: TutorialSeedActivationCapability,
  input: ActivationMilestoneInput & { domainMutationId: string },
  now = new Date().toISOString(),
): D1PreparedStatementLike {
  return prepareClassifiedActivationOutboxIntent(
    database,
    prepareTutorialSeedActivation(capability, input),
    input.domainMutationId,
    now,
  );
}

function prepareClassifiedActivationOutboxIntent(
  database: D1DatabaseLike,
  input: TrustedActivationMilestoneInput,
  domainMutationId: string,
  now: string,
): D1PreparedStatementLike {
  validateActivationMilestoneInput(input);
  assertTrustedActivation(input);
  if (!domainMutationId.trim()) {
    throw new ActivationRepositoryError("activation_invalid_input", "Activation requires a domain mutation id.");
  }
  return database.prepare(`
    WITH intent (
      id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
      milestone, source, origin_class, occurred_at, dedupe_key, metadata_json,
      next_attempt_at, created_at, updated_at
    ) AS (
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    )
    INSERT INTO beta_activation_outbox (
      id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
      milestone, source, origin_class, occurred_at, dedupe_key, metadata_json,
      state, attempt_count, next_attempt_at, created_at, updated_at
    )
    SELECT
      intent.id, intent.domain_mutation_id, intent.user_id, intent.workspace_id,
      intent.project_id, intent.estimate_id, intent.milestone, intent.source,
      intent.origin_class, intent.occurred_at, intent.dedupe_key,
      intent.metadata_json, 'pending', 0, intent.next_attempt_at,
      intent.created_at, intent.updated_at
    FROM intent
    WHERE EXISTS (
      SELECT 1
      FROM workspaces workspace
      WHERE workspace.id = intent.workspace_id
        AND (
          intent.project_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM projects project
            WHERE project.id = intent.project_id
              AND project.workspace_id = workspace.id
          )
        )
        AND (
          intent.estimate_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM estimates estimate
            JOIN projects project ON project.id = estimate.project_id
            WHERE estimate.id = intent.estimate_id
              AND project.workspace_id = workspace.id
              AND (intent.project_id IS NULL OR project.id = intent.project_id)
          )
        )
        AND (
          (
            intent.project_id IS NULL
            AND (
              EXISTS (
                SELECT 1
                FROM workspace_members membership
                WHERE membership.workspace_id = workspace.id
                  AND membership.user_id = intent.user_id
              )
              OR EXISTS (
                SELECT 1
                FROM project_members membership
                JOIN projects project ON project.id = membership.project_id
                WHERE project.workspace_id = workspace.id
                  AND membership.user_id = intent.user_id
              )
              OR EXISTS (
                SELECT 1
                FROM estimate_sheet_members membership
                JOIN estimates estimate ON estimate.id = membership.estimate_id
                JOIN projects project ON project.id = estimate.project_id
                WHERE project.workspace_id = workspace.id
                  AND membership.user_id = intent.user_id
              )
            )
          )
          OR (
            intent.project_id IS NOT NULL
            AND intent.estimate_id IS NULL
            AND (
              EXISTS (
                SELECT 1
                FROM workspace_members membership
                WHERE membership.workspace_id = workspace.id
                  AND membership.user_id = intent.user_id
              )
              OR EXISTS (
                SELECT 1
                FROM project_members membership
                WHERE membership.project_id = intent.project_id
                  AND membership.user_id = intent.user_id
              )
            )
          )
          OR (
            intent.estimate_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1
                FROM estimate_sheet_members membership
                WHERE membership.estimate_id = intent.estimate_id
                  AND membership.user_id = intent.user_id
              )
              OR (
                COALESCE((
                  SELECT setting.inherit_project_access
                  FROM estimate_sheet_access_settings setting
                  WHERE setting.estimate_id = intent.estimate_id
                  LIMIT 1
                ), 1) = 1
                AND (
                  EXISTS (
                    SELECT 1
                    FROM workspace_members membership
                    WHERE membership.workspace_id = workspace.id
                      AND membership.user_id = intent.user_id
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM project_members membership
                    WHERE membership.project_id = intent.project_id
                      AND membership.user_id = intent.user_id
                  )
                )
              )
            )
          )
        )
    )
    ON CONFLICT(workspace_id, dedupe_key) DO NOTHING
  `).bind(
    crypto.randomUUID(), domainMutationId, input.userId, input.workspaceId,
    input.projectId ?? null, input.estimateId ?? null, input.milestone, input.source,
    input.originClass, input.occurredAt, input.dedupeKey,
    JSON.stringify(input.metadata ?? {}), now, now, now,
  );
}

async function hasValidOutboxResourceChain(
  database: D1DatabaseLike,
  row: ActivationOutboxRow,
) {
  const valid = await database.prepare<{ valid: number }>(`
    SELECT 1 AS valid
    FROM workspaces workspace
    WHERE workspace.id = ?
      AND (
        ? IS NULL
        OR EXISTS (
          SELECT 1
          FROM projects project
          WHERE project.id = ? AND project.workspace_id = workspace.id
        )
      )
      AND (
        ? IS NULL
        OR EXISTS (
          SELECT 1
          FROM estimates estimate
          JOIN projects project ON project.id = estimate.project_id
          WHERE estimate.id = ?
            AND project.workspace_id = workspace.id
            AND (? IS NULL OR project.id = ?)
        )
      )
    LIMIT 1
  `).bind(
    row.workspace_id,
    row.project_id,
    row.project_id,
    row.estimate_id,
    row.estimate_id,
    row.project_id,
    row.project_id,
  ).first<{ valid: number }>();
  return valid?.valid === 1;
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
           milestone, source, origin_class, occurred_at, dedupe_key, metadata_json,
           state, attempt_count
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
      if (!await hasValidOutboxResourceChain(database, row)) {
        const invalid = await database.prepare(`
          UPDATE beta_activation_outbox
          SET state = 'dead', lease_token = NULL, lease_expires_at = NULL,
              last_error_code = 'resource_chain_invalid', updated_at = ?
          WHERE id = ? AND state = 'processing' AND lease_token = ?
        `).bind(nowIso, row.id, leaseToken).run();
        if (invalid.success === false) {
          throw new ActivationRepositoryError(
            "activation_write_failed",
            "Activation invalid-resource dead-letter update failed.",
          );
        }
        dead += invalid.meta?.changes ?? 0;
        continue;
      }
      const input = parseInput(row);
      const { insertEvent, updateProgress } = prepareActivationLedgerStatements(database, input, nowIso, {
        outboxId: row.id,
        leaseToken,
        now: nowIso,
      });
      const deliveredStatement = database.prepare(`
        UPDATE beta_activation_outbox
        SET state = 'delivered', delivered_at = ?, lease_token = NULL, lease_expires_at = NULL,
            last_error_code = NULL, updated_at = ?
        WHERE id = ? AND state = 'processing' AND lease_token = ? AND lease_expires_at > ?
      `).bind(nowIso, nowIso, row.id, leaseToken, nowIso);
      const statements = updateProgress
        ? [insertEvent, updateProgress, deliveredStatement]
        : [insertEvent, deliveredStatement];
      const deliveredIndex = statements.length - 1;
      const results = await database.batch(statements);
      if (
        results.some((result) => result.success === false)
        || (results[deliveredIndex]?.meta?.changes ?? 0) !== 1
      ) {
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
