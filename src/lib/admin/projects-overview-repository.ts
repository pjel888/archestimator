import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F7 (UNIT-008) read-only Project 360. Reads existing projects/estimates tables
// (no new schema). Diagnostics/funnel links come later; this is the navigation +
// summary foundation that the global search can deep-link into.
export type AdminProjectOverviewRow = {
  id: string;
  name: string;
  project_code: string | null;
  workspace_id: string;
  created_at: string;
};

export type AdminProjectEstimateRow = {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin project overview D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function getAdminProjectOverview(
  projectId: string,
): Promise<AdminProjectOverviewRow | null> {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  try {
    return (
      (await db
        .prepare<AdminProjectOverviewRow>(
          `
            SELECT id, name, project_code, workspace_id, created_at
            FROM projects
            WHERE id = ?
            LIMIT 1
          `,
        )
        .bind(projectId)
        .first<AdminProjectOverviewRow>()) ?? null
    );
  } catch (error) {
    logFailure(error, "admin_project_overview_failed");
    return null;
  }
}

export async function listAdminProjectEstimates(
  projectId: string,
  limit = 50,
): Promise<AdminProjectEstimateRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminProjectEstimateRow>(
        `
          SELECT id, name, project_id, created_at
          FROM estimates
          WHERE project_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(projectId, limit)
      .all<AdminProjectEstimateRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_project_estimates_failed");
    return [];
  }
}

export async function listAdminProjects(limit = 50): Promise<AdminProjectOverviewRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminProjectOverviewRow>(
        `
          SELECT id, name, project_code, workspace_id, created_at
          FROM projects
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(limit)
      .all<AdminProjectOverviewRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_projects_list_failed");
    return [];
  }
}
