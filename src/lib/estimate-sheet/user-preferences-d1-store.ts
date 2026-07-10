import "server-only";

import { isPlatformAdminEmail } from "@/lib/auth/roles";
import type { CurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  EMPTY_ESTIMATE_COLUMN_WIDTHS,
  normalizeEstimateColumnWidths,
  type EstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";

export type EstimatePreferenceContext = {
  estimateId: string;
  userId: string;
  workspaceId: string;
};

export type EstimateSheetUserPreferenceD1Row = {
  column_widths_json: string | null;
  updated_at: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function isPlatformAdmin(user: CurrentUserContext) {
  return user.role === "ceo" || user.role === "admin" || isPlatformAdminEmail(user.email);
}

function parseColumnWidthsJson(value: string | null | undefined): EstimateColumnWidths {
  if (!value) return EMPTY_ESTIMATE_COLUMN_WIDTHS;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY_ESTIMATE_COLUMN_WIDTHS;
    return normalizeEstimateColumnWidths(parsed as EstimateColumnWidths);
  } catch {
    return EMPTY_ESTIMATE_COLUMN_WIDTHS;
  }
}

export async function getEstimatePreferenceContextFromD1(
  db: D1DatabaseLike,
  estimateId: string,
  user: CurrentUserContext,
): Promise<EstimatePreferenceContext | null> {
  const row = await db
    .prepare<{ workspace_id: string }>(
      `
        SELECT p.workspace_id
        FROM estimates e
        JOIN projects p ON p.id = e.project_id
        WHERE e.id = ?
          AND (
            ? = 1
            OR EXISTS (
              SELECT 1
              FROM estimate_sheet_members esm
              WHERE esm.estimate_id = e.id
                AND esm.user_id = ?
            )
            OR (
              COALESCE((
                SELECT inherit_project_access
                FROM estimate_sheet_access_settings access
                WHERE access.estimate_id = e.id
                LIMIT 1
              ), 1) = 1
              AND EXISTS (
                SELECT 1
                FROM project_members pm
                WHERE pm.project_id = e.project_id
                  AND pm.user_id = ?
              )
            )
          )
        LIMIT 1
      `,
    )
    .bind(estimateId, isPlatformAdmin(user) ? 1 : 0, user.userId, user.userId)
    .first<{ workspace_id: string }>();

  return row?.workspace_id ? { estimateId, userId: user.userId, workspaceId: row.workspace_id } : null;
}

export async function getEstimatePreferenceContextFromCloudflareD1(
  estimateId: string,
  user: CurrentUserContext,
) {
  const db = await getCloudflareD1Database();
  return db ? getEstimatePreferenceContextFromD1(db, estimateId, user) : null;
}

export async function loadEstimateSheetUserPreferencesFromD1(
  db: D1DatabaseLike,
  context: EstimatePreferenceContext,
) {
  const row = await db
    .prepare<EstimateSheetUserPreferenceD1Row>(
      `
        SELECT column_widths_json, updated_at
        FROM estimate_sheet_user_preferences
        WHERE user_id = ?
          AND workspace_id = ?
          AND estimate_id = ?
        LIMIT 1
      `,
    )
    .bind(context.userId, context.workspaceId, context.estimateId)
    .first<EstimateSheetUserPreferenceD1Row>();

  return row
    ? {
      columnWidths: parseColumnWidthsJson(row.column_widths_json),
      updatedAt: row.updated_at,
    }
    : null;
}

export async function loadEstimateSheetUserPreferencesFromCloudflareD1(
  context: EstimatePreferenceContext,
) {
  const db = await getCloudflareD1Database();
  return db ? loadEstimateSheetUserPreferencesFromD1(db, context) : null;
}

export async function saveEstimateSheetUserPreferencesInD1(
  db: D1DatabaseLike,
  context: EstimatePreferenceContext,
  columnWidths: EstimateColumnWidths,
) {
  const timestamp = nowIso();
  await db
    .prepare(
      `
        INSERT INTO estimate_sheet_user_preferences (
          user_id,
          workspace_id,
          estimate_id,
          column_widths_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, workspace_id, estimate_id) DO UPDATE SET
          column_widths_json = excluded.column_widths_json,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      context.userId,
      context.workspaceId,
      context.estimateId,
      JSON.stringify(normalizeEstimateColumnWidths(columnWidths)),
      timestamp,
      timestamp,
    )
    .run();
}

export async function saveEstimateSheetUserPreferencesInCloudflareD1(
  context: EstimatePreferenceContext,
  columnWidths: EstimateColumnWidths,
) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Estimate sheet preferences D1 store is unavailable.");
  return saveEstimateSheetUserPreferencesInD1(db, context, columnWidths);
}
