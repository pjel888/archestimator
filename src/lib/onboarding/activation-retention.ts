import "server-only";

import { type D1DatabaseLike } from "@/lib/cloudflare/d1";

import { ActivationRepositoryError } from "./activation-repository";

export type ActivationPrivacyExport = {
  progress: ActivationPrivacyProgress | null;
  events: ActivationPrivacyEvent[];
};

type ActiveHoldRow = { active: number };

export type ActivationPrivacyProgress = {
  selectedPath: string | null;
  projectId: string | null;
  estimateId: string | null;
  lastMilestone: string | null;
  firstValueCompletedAt: string | null;
  checklistDismissedAt: string | null;
  checklistReopenedAt: string | null;
  supportState: string;
  lastEventAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivationPrivacyEvent = {
  projectId: string | null;
  estimateId: string | null;
  milestone: string;
  source: string;
  occurredAt: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

type ActivationPrivacyProgressRow = {
  selected_path: string | null;
  project_id: string | null;
  estimate_id: string | null;
  last_milestone: string | null;
  first_value_completed_at: string | null;
  checklist_dismissed_at: string | null;
  checklist_reopened_at: string | null;
  support_state: string;
  last_event_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

type ActivationPrivacyEventRow = {
  project_id: string | null;
  estimate_id: string | null;
  milestone: string;
  source: string;
  occurred_at: string;
  metadata_json: string;
  created_at: string;
};

function parseExportMetadata(value: string): Record<string, string | number | boolean | null> {
  try {
    const metadata = JSON.parse(value) as unknown;
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return {};
    return Object.fromEntries(Object.entries(metadata).filter(([, item]) => (
      item === null || ["string", "number", "boolean"].includes(typeof item)
    ))) as Record<string, string | number | boolean | null>;
  } catch {
    return {};
  }
}

function mapPrivacyProgress(row: ActivationPrivacyProgressRow): ActivationPrivacyProgress {
  return {
    selectedPath: row.selected_path,
    projectId: row.project_id,
    estimateId: row.estimate_id,
    lastMilestone: row.last_milestone,
    firstValueCompletedAt: row.first_value_completed_at,
    checklistDismissedAt: row.checklist_dismissed_at,
    checklistReopenedAt: row.checklist_reopened_at,
    supportState: row.support_state,
    lastEventAt: row.last_event_at,
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPrivacyEvent(row: ActivationPrivacyEventRow): ActivationPrivacyEvent {
  return {
    projectId: row.project_id,
    estimateId: row.estimate_id,
    milestone: row.milestone,
    source: row.source,
    occurredAt: row.occurred_at,
    metadata: parseExportMetadata(row.metadata_json),
    createdAt: row.created_at,
  };
}

async function hasActiveActivationHold(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
): Promise<boolean> {
  const row = await database.prepare<ActiveHoldRow>(`
    SELECT 1 AS active
    FROM beta_activation_retention_holds
    WHERE user_id = ? AND workspace_id = ?
      AND starts_at <= ? AND expires_at > ?
    LIMIT 1
  `).bind(input.userId, input.workspaceId, new Date().toISOString(), new Date().toISOString()).first<ActiveHoldRow>();
  return row?.active === 1;
}

export async function exportActivationPrivacyData(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<ActivationPrivacyExport> {
  if (!database) return { events: [], progress: null };
  const [progress, eventResult] = await Promise.all([
    database.prepare<ActivationPrivacyProgressRow>(`
      SELECT selected_path, project_id, estimate_id, last_milestone,
             first_value_completed_at, checklist_dismissed_at, checklist_reopened_at,
             support_state, last_event_at, version, created_at, updated_at
      FROM beta_activation_progress
      WHERE user_id = ? AND workspace_id = ?
      LIMIT 1
    `).bind(input.userId, input.workspaceId).first<ActivationPrivacyProgressRow>(),
    database.prepare<ActivationPrivacyEventRow>(`
      SELECT project_id, estimate_id, milestone, source, occurred_at, metadata_json, created_at
      FROM beta_activation_events
      WHERE user_id = ? AND workspace_id = ?
      ORDER BY occurred_at ASC, id ASC
    `).bind(input.userId, input.workspaceId).all<ActivationPrivacyEventRow>(),
  ]);
  return {
    events: (eventResult.results ?? []).map(mapPrivacyEvent),
    progress: progress ? mapPrivacyProgress(progress) : null,
  };
}

export async function eraseActivationPrivacyData(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<{ status: "erased" | "skipped_legal_hold" | "unavailable" }> {
  if (!database?.batch) return { status: "unavailable" };
  if (await hasActiveActivationHold(database, input)) return { status: "skipped_legal_hold" };
  const statements = [
    database.prepare("DELETE FROM beta_activation_outbox WHERE user_id = ? AND workspace_id = ?").bind(input.userId, input.workspaceId),
    database.prepare("DELETE FROM beta_activation_events WHERE user_id = ? AND workspace_id = ?").bind(input.userId, input.workspaceId),
    database.prepare("DELETE FROM beta_activation_progress WHERE user_id = ? AND workspace_id = ?").bind(input.userId, input.workspaceId),
  ];
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation privacy erase failed.");
  }
  return { status: "erased" };
}

export async function purgeExpiredActivationData(
  database: D1DatabaseLike | null | undefined,
  options: { now?: Date } = {},
): Promise<{ deliveredOutbox: number; events: number; unresolvedOutbox: number }> {
  if (!database?.batch) return { deliveredOutbox: 0, events: 0, unresolvedOutbox: 0 };
  const now = options.now ?? new Date();
  const activeHoldAt = now.toISOString();
  const eventCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60_000).toISOString();
  const deliveredOutboxCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();
  const unresolvedOutboxCutoff = eventCutoff;
  const withoutActiveHold = `
    NOT EXISTS (
      SELECT 1
      FROM beta_activation_retention_holds hold
      WHERE hold.user_id = beta_activation_outbox.user_id
        AND hold.workspace_id = beta_activation_outbox.workspace_id
        AND hold.starts_at <= ? AND hold.expires_at > ?
    )
  `;
  const withoutActiveEventHold = withoutActiveHold.replaceAll("beta_activation_outbox", "beta_activation_events");
  const results = await database.batch([
    database.prepare(`
      DELETE FROM beta_activation_events
      WHERE occurred_at < ? AND ${withoutActiveEventHold}
    `).bind(eventCutoff, activeHoldAt, activeHoldAt),
    database.prepare(`
      DELETE FROM beta_activation_outbox
      WHERE state = 'delivered' AND delivered_at < ? AND ${withoutActiveHold}
    `).bind(deliveredOutboxCutoff, activeHoldAt, activeHoldAt),
    database.prepare(`
      DELETE FROM beta_activation_outbox
      WHERE state IN ('pending', 'processing', 'dead') AND created_at < ? AND ${withoutActiveHold}
    `).bind(unresolvedOutboxCutoff, activeHoldAt, activeHoldAt),
  ]);
  if (results.some((result) => result.success === false)) {
    throw new ActivationRepositoryError("activation_write_failed", "Activation retention purge failed.");
  }
  return {
    events: results[0]?.meta?.changes ?? 0,
    deliveredOutbox: results[1]?.meta?.changes ?? 0,
    unresolvedOutbox: results[2]?.meta?.changes ?? 0,
  };
}
