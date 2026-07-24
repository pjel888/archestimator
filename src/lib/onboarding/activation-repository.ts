import "server-only";

import {
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1Value,
} from "@/lib/cloudflare/d1";

import {
  ACTIVATION_MILESTONE_RANK,
  isActivationMilestone,
  isActivationSource,
  type ActivationMilestone,
  type ActivationMilestoneInput,
  type ActivationPath,
} from "./activation-types";
import {
  assertTrustedActivation,
  prepareUserDomainActivation,
  type TrustedActivationMilestoneInput,
} from "./activation-origin";

const ALLOWED_METADATA_KEYS = new Set([
  "activation_path",
  "sample_version",
  "template_id",
  "export_format",
  "publication_id",
  "recipient_id",
  "decision",
]);

export type ActivationProgress = {
  userId: string;
  workspaceId: string;
  selectedPath: ActivationPath | null;
  projectId: string | null;
  estimateId: string | null;
  lastMilestone: ActivationMilestone | null;
  firstValueCompletedAt: string | null;
  checklistDismissedAt: string | null;
  checklistReopenedAt: string | null;
  automaticGuidanceDisabledAt: string | null;
  supportState: "none" | "requested" | "open" | "resolved";
  lastEventAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type ActivationProgressRow = {
  user_id: string;
  workspace_id: string;
  selected_path: ActivationPath | null;
  project_id: string | null;
  estimate_id: string | null;
  last_milestone: string | null;
  first_value_completed_at: string | null;
  checklist_dismissed_at: string | null;
  checklist_reopened_at: string | null;
  automatic_guidance_disabled_at: string | null;
  support_state: ActivationProgress["supportState"];
  last_event_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export class ActivationRepositoryError extends Error {
  constructor(
    readonly code: "activation_database_unavailable" | "activation_invalid_input" | "activation_resource_not_found" | "activation_write_failed",
    message: string,
  ) {
    super(message);
    this.name = "ActivationRepositoryError";
  }
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new ActivationRepositoryError("activation_invalid_input", `Activation requires a ${label}.`);
  }
}

function validateMetadata(metadata: ActivationMilestoneInput["metadata"]) {
  if (!metadata) return;
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key) || typeof value === "object") {
      throw new ActivationRepositoryError("activation_invalid_input", "Activation metadata is not allowed.");
    }
  }
}

export function validateActivationMilestoneInput(input: ActivationMilestoneInput) {
  assertNonEmpty(input.userId, "user id");
  assertNonEmpty(input.workspaceId, "workspace id");
  assertNonEmpty(input.dedupeKey, "dedupe key");
  if (!isActivationMilestone(input.milestone) || !isActivationSource(input.source)) {
    throw new ActivationRepositoryError("activation_invalid_input", "Activation milestone or source is not allowed.");
  }
  if (input.estimateId && !input.projectId) {
    throw new ActivationRepositoryError("activation_invalid_input", "Activation estimate requires a project.");
  }
  if (Number.isNaN(Date.parse(input.occurredAt))) {
    throw new ActivationRepositoryError("activation_invalid_input", "Activation occurrence time is invalid.");
  }
  validateMetadata(input.metadata);
}

function mapProgress(row: ActivationProgressRow): ActivationProgress {
  const lastMilestone = parseLastMilestone(row.last_milestone);
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    selectedPath: row.selected_path,
    projectId: row.project_id,
    estimateId: row.estimate_id,
    lastMilestone,
    firstValueCompletedAt: row.first_value_completed_at,
    checklistDismissedAt: row.checklist_dismissed_at,
    checklistReopenedAt: row.checklist_reopened_at,
    automaticGuidanceDisabledAt: row.automatic_guidance_disabled_at,
    supportState: row.support_state,
    lastEventAt: row.last_event_at,
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseLastMilestone(value: string | null): ActivationMilestone | null {
  if (value === null) return null;
  if (!isActivationMilestone(value)) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation progress contains an unknown milestone.");
  }
  return value;
}

export async function assertActivationResourceChain(
  database: D1DatabaseLike,
  input: ActivationMilestoneInput,
) {
  const result = await database.prepare<{ valid: number }>(`
    SELECT 1 AS valid
    FROM workspaces workspace
    WHERE workspace.id = ?
      AND (
        ? IS NULL
        OR EXISTS (
          SELECT 1
          FROM projects project
          WHERE project.id = ?
            AND project.workspace_id = workspace.id
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
      AND (
        (
          ? IS NULL
          AND (
            EXISTS (
              SELECT 1
              FROM workspace_members membership
              WHERE membership.workspace_id = workspace.id
                AND membership.user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM project_members membership
              JOIN projects project ON project.id = membership.project_id
              WHERE project.workspace_id = workspace.id
                AND membership.user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM estimate_sheet_members membership
              JOIN estimates estimate ON estimate.id = membership.estimate_id
              JOIN projects project ON project.id = estimate.project_id
              WHERE project.workspace_id = workspace.id
                AND membership.user_id = ?
            )
          )
        )
        OR (
          ? IS NOT NULL
          AND ? IS NULL
          AND (
            EXISTS (
              SELECT 1
              FROM workspace_members membership
              WHERE membership.workspace_id = workspace.id
                AND membership.user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM project_members membership
              WHERE membership.project_id = ?
                AND membership.user_id = ?
            )
          )
        )
        OR (
          ? IS NOT NULL
          AND (
            EXISTS (
              SELECT 1
              FROM estimate_sheet_members membership
              WHERE membership.estimate_id = ?
                AND membership.user_id = ?
            )
            OR (
              COALESCE((
                SELECT setting.inherit_project_access
                FROM estimate_sheet_access_settings setting
                WHERE setting.estimate_id = ?
                LIMIT 1
              ), 1) = 1
              AND (
                EXISTS (
                  SELECT 1
                  FROM workspace_members membership
                  WHERE membership.workspace_id = workspace.id
                    AND membership.user_id = ?
                )
                OR EXISTS (
                  SELECT 1
                  FROM project_members membership
                  WHERE membership.project_id = ?
                    AND membership.user_id = ?
                )
              )
            )
          )
        )
      )
    LIMIT 1
  `).bind(
    input.workspaceId,
    input.projectId ?? null,
    input.projectId ?? null,
    input.estimateId ?? null,
    input.estimateId ?? null,
    input.projectId ?? null,
    input.projectId ?? null,
    input.projectId ?? null,
    input.userId,
    input.userId,
    input.userId,
    input.projectId ?? null,
    input.estimateId ?? null,
    input.userId,
    input.projectId ?? null,
    input.userId,
    input.estimateId ?? null,
    input.estimateId ?? null,
    input.userId,
    input.estimateId ?? null,
    input.userId,
    input.projectId ?? null,
    input.userId,
  ).first<{ valid: number }>();
  if (!result?.valid) {
    throw new ActivationRepositoryError("activation_resource_not_found", "Activation resource chain is unavailable.");
  }
}

function milestoneRankSql(value: string) {
  return `CASE ${value}
    ${Object.entries(ACTIVATION_MILESTONE_RANK).map(([milestone, rank]) => `WHEN '${milestone}' THEN ${rank}`).join("\n    ")}
    ELSE -1
  END`;
}

export async function getActivationProgress(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<ActivationProgress | null> {
  if (!database) return null;
  assertNonEmpty(input.userId, "user id");
  assertNonEmpty(input.workspaceId, "workspace id");
  const row = await database.prepare<ActivationProgressRow>(`
    SELECT user_id, workspace_id, selected_path, project_id, estimate_id, last_milestone,
           first_value_completed_at, checklist_dismissed_at, checklist_reopened_at,
           automatic_guidance_disabled_at, support_state, last_event_at, version, created_at, updated_at
    FROM beta_activation_progress
    WHERE user_id = ? AND workspace_id = ?
    LIMIT 1
  `).bind(input.userId, input.workspaceId).first<ActivationProgressRow>();
  return row ? mapProgress(row) : null;
}

export type ActivationLedgerDeliveryGuard = {
  outboxId: string;
  leaseToken: string;
  now: string;
};

export function prepareActivationLedgerStatements(
  database: D1DatabaseLike,
  input: TrustedActivationMilestoneInput,
  now = new Date().toISOString(),
  deliveryGuard?: ActivationLedgerDeliveryGuard,
) {
  assertTrustedActivation(input);
  const eventId = crypto.randomUUID();
  const deliveryLeaseCondition = deliveryGuard
    ? `EXISTS (
      SELECT 1
      FROM beta_activation_outbox
      WHERE id = ?
        AND state = 'processing'
        AND lease_token = ?
        AND lease_expires_at > ?
    )`
    : "1 = 1";
  const deliveryLeaseBindings: D1Value[] = deliveryGuard
    ? [deliveryGuard.outboxId, deliveryGuard.leaseToken, deliveryGuard.now]
    : [];
  const metadataJson = JSON.stringify(input.metadata ?? {});
  const firstValueAt = input.milestone === "first_valid_total" ? input.occurredAt : null;
  const insertEvent = database.prepare(`
    INSERT INTO beta_activation_events (
      id, user_id, workspace_id, project_id, estimate_id, milestone, source,
      origin_class, occurred_at, dedupe_key, metadata_json, created_at
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE ${deliveryLeaseCondition}
    ON CONFLICT(workspace_id, dedupe_key) DO NOTHING
  `).bind(
    eventId, input.userId, input.workspaceId, input.projectId ?? null,
    input.estimateId ?? null, input.milestone, input.source, input.originClass, input.occurredAt,
    input.dedupeKey, metadataJson, now, ...deliveryLeaseBindings,
  );
  if (input.originClass !== "user_domain") {
    return { insertEvent, updateProgress: null };
  }
  const currentRank = milestoneRankSql("beta_activation_progress.last_milestone");
  const inputRank = milestoneRankSql("excluded.last_milestone");
  const updateProgress = database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, project_id, estimate_id, last_milestone,
      first_value_completed_at, last_event_at, created_at, updated_at
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1
      FROM beta_activation_events
      WHERE id = ?
    )
      AND ${deliveryLeaseCondition}
    ON CONFLICT(user_id, workspace_id) DO UPDATE SET
      project_id = COALESCE(excluded.project_id, beta_activation_progress.project_id),
      estimate_id = CASE
        WHEN excluded.estimate_id IS NOT NULL THEN excluded.estimate_id
        WHEN excluded.project_id IS NOT NULL
          AND excluded.project_id IS NOT beta_activation_progress.project_id
          THEN NULL
        ELSE beta_activation_progress.estimate_id
      END,
      last_milestone = CASE WHEN ${inputRank} > ${currentRank}
        THEN excluded.last_milestone ELSE beta_activation_progress.last_milestone END,
      first_value_completed_at = COALESCE(beta_activation_progress.first_value_completed_at, excluded.first_value_completed_at),
      last_event_at = CASE
        WHEN beta_activation_progress.last_event_at IS NULL OR excluded.last_event_at > beta_activation_progress.last_event_at
          THEN excluded.last_event_at
        ELSE beta_activation_progress.last_event_at
      END,
      version = beta_activation_progress.version + 1,
      updated_at = excluded.updated_at
  `).bind(
    input.userId, input.workspaceId, input.projectId ?? null, input.estimateId ?? null,
    input.milestone, firstValueAt, input.occurredAt, now, now, eventId, ...deliveryLeaseBindings,
  );
  return { insertEvent, updateProgress };
}

export async function recordClassifiedActivationMilestone(
  database: D1DatabaseLike | null | undefined,
  input: TrustedActivationMilestoneInput,
): Promise<{ status: "recorded" | "already_recorded" }> {
  if (!database?.batch) {
    throw new ActivationRepositoryError("activation_database_unavailable", "Activation writes require D1 batch support.");
  }
  validateActivationMilestoneInput(input);
  assertTrustedActivation(input);
  await assertActivationResourceChain(database, input);
  const now = new Date().toISOString();
  const { insertEvent, updateProgress } = prepareActivationLedgerStatements(database, input, now);
  const statements = updateProgress ? [insertEvent, updateProgress] : [insertEvent];
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation milestone write failed.");
  }
  return { status: (results[0]?.meta?.changes ?? 0) > 0 ? "recorded" : "already_recorded" };
}

export async function recordActivationMilestone(
  database: D1DatabaseLike | null | undefined,
  input: ActivationMilestoneInput,
): Promise<{ status: "recorded" | "already_recorded" }> {
  return recordClassifiedActivationMilestone(database, prepareUserDomainActivation(input));
}

export async function setActivationSelectedPath(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    selectedPath: ActivationPath;
  },
): Promise<void> {
  if (!database) {
    throw new ActivationRepositoryError("activation_database_unavailable", "Activation writes require D1.");
  }
  const now = new Date().toISOString();
  const result = await database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, selected_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, workspace_id) DO UPDATE SET
      selected_path = excluded.selected_path,
      version = beta_activation_progress.version + 1,
      updated_at = excluded.updated_at
  `).bind(
    input.userId,
    input.workspaceId,
    input.selectedPath,
    now,
    now,
  ).run();
  if (result.success === false) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation path write failed.");
  }
}

export async function setActivationChecklistControl(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    visibility: "dismiss" | "reopen";
  },
): Promise<void> {
  if (!database) {
    throw new ActivationRepositoryError("activation_database_unavailable", "Activation writes require D1.");
  }
  const now = new Date().toISOString();
  const dismissedAt = input.visibility === "dismiss" ? now : null;
  const reopenedAt = input.visibility === "reopen" ? now : null;
  const result = await database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, checklist_dismissed_at, checklist_reopened_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, workspace_id) DO UPDATE SET
      checklist_dismissed_at = COALESCE(
        excluded.checklist_dismissed_at,
        beta_activation_progress.checklist_dismissed_at
      ),
      checklist_reopened_at = COALESCE(
        excluded.checklist_reopened_at,
        beta_activation_progress.checklist_reopened_at
      ),
      version = beta_activation_progress.version + 1,
      updated_at = excluded.updated_at
  `).bind(
    input.userId,
    input.workspaceId,
    dismissedAt,
    reopenedAt,
    now,
    now,
  ).run();
  if (result.success === false) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation checklist write failed.");
  }
}

export async function setAutomaticGuidancePreference(
  database: D1DatabaseLike | null | undefined,
  input: {
    userId: string;
    workspaceId: string;
    enabled: boolean;
  },
): Promise<void> {
  if (!database) {
    throw new ActivationRepositoryError("activation_database_unavailable", "Activation writes require D1.");
  }
  assertNonEmpty(input.userId, "user id");
  assertNonEmpty(input.workspaceId, "workspace id");
  if (typeof input.enabled !== "boolean") {
    throw new ActivationRepositoryError("activation_invalid_input", "Automatic guidance preference is invalid.");
  }
  const now = new Date().toISOString();
  const result = await database.prepare(`
    INSERT INTO beta_activation_progress (
      user_id, workspace_id, automatic_guidance_disabled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, workspace_id) DO UPDATE SET
      automatic_guidance_disabled_at = excluded.automatic_guidance_disabled_at,
      version = beta_activation_progress.version + 1,
      updated_at = excluded.updated_at
  `).bind(
    input.userId,
    input.workspaceId,
    input.enabled ? null : now,
    now,
    now,
  ).run();
  if (result.success === false) {
    throw new ActivationRepositoryError("activation_write_failed", "Automatic guidance preference write failed.");
  }
}

export type ActivationLedgerStatements = {
  insertEvent: D1PreparedStatementLike;
  updateProgress: D1PreparedStatementLike | null;
};

export type ActivationPreparedStatementValues = D1Value[];
