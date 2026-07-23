import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

// F6 (UNIT-007) Data quality — read-only referential-integrity findings.
// Each check is independent: a failure in one (e.g. a table absent in a given
// environment) does not erase the others. v1 checks are safe COUNTs only — no
// mutation, no repair (the dry-run/apply repair framework is a later increment).

export type DataQualitySeverity = "info" | "warning" | "critical";

export type DataQualityFinding = {
  key: string;
  label: string;
  severity: DataQualitySeverity;
  count: number;
  available: boolean;
  detail: string;
};

type CountRow = { c: number };

async function runCount(
  sql: string,
  label: string,
  key: string,
  severity: DataQualitySeverity,
  detail: string,
): Promise<DataQualityFinding> {
  const db = await getCloudflareD1Database();
  if (!db) return { key, label, severity, count: 0, available: false, detail: "D1 unavailable — check skipped." };
  try {
    const row = await db.prepare<CountRow>(sql).first<CountRow>();
    const count = row?.c ?? 0;
    return { key, label, severity, count, available: true, detail };
  } catch {
    return { key, label, severity, count: 0, available: false, detail: `${detail} (check could not run in this environment).` };
  }
}

export async function runDataQualityChecks(): Promise<DataQualityFinding[]> {
  // Order matters only for display; each check is isolated.
  const [orphanEstimates, orphanProjectWorkspaces, profilesMissingRole] = await Promise.all([
    runCount(
      `SELECT COUNT(*) AS c FROM estimates WHERE project_id NOT IN (SELECT id FROM projects)`,
      "Orphan estimates (project missing)",
      "orphan_estimates",
      "warning",
      "Estimates pointing at a project that no longer exists.",
    ),
    runCount(
      `SELECT COUNT(*) AS c FROM projects WHERE workspace_id NOT IN (SELECT id FROM workspaces)`,
      "Orphan projects (workspace missing)",
      "orphan_project_workspaces",
      "warning",
      "Projects pointing at a workspace that no longer exists.",
    ),
    runCount(
      `SELECT COUNT(*) AS c FROM profiles WHERE role IS NULL OR length(trim(role)) = 0`,
      "Profiles missing a role",
      "profiles_missing_role",
      "info",
      "Profiles without a platform role set.",
    ),
  ]);
  return [orphanEstimates, orphanProjectWorkspaces, profilesMissingRole];
}

export function isFindingActionable(finding: DataQualityFinding): boolean {
  return finding.available && finding.count > 0;
}
