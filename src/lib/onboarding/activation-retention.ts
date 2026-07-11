import "server-only";

import { type D1DatabaseLike } from "@/lib/cloudflare/d1";

import { ActivationRepositoryError } from "./activation-repository";

export type ActivationPrivacyExport = {
  progress: Record<string, unknown> | null;
  events: Array<Record<string, unknown>>;
};

type ActiveHoldRow = { active: number };

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
    database.prepare(`
      SELECT selected_path, project_id, estimate_id, last_milestone,
             first_value_completed_at, checklist_dismissed_at, checklist_reopened_at,
             support_state, last_event_at, version, created_at, updated_at
      FROM beta_activation_progress
      WHERE user_id = ? AND workspace_id = ?
      LIMIT 1
    `).bind(input.userId, input.workspaceId).first<Record<string, unknown>>(),
    database.prepare(`
      SELECT project_id, estimate_id, milestone, source, occurred_at, metadata_json, created_at
      FROM beta_activation_events
      WHERE user_id = ? AND workspace_id = ?
      ORDER BY occurred_at ASC, id ASC
    `).bind(input.userId, input.workspaceId).all<Record<string, unknown>>(),
  ]);
  return { events: eventResult.results ?? [], progress };
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
