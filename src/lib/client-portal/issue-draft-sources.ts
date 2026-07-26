import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

export type ClientPortalIssueDraftSources = {
  artifacts: Array<{
    artifactId: string;
    artifactVersionId: string;
    contentType: string;
    fileName: string;
    revisionLabel: string | null;
    title: string;
    versionNumber: number;
  }>;
  baselines: Array<{ id: string; issueLabel: string }>;
  estimates: Array<{ id: string; name: string; sheetCode: string | null }>;
  issues: Array<{ id: string; issueNumber: number; versionLabel: string }>;
  requests: Array<{
    requestCode: string;
    requestId: string;
    requestVersionId: string;
    status: string;
    title: string;
  }>;
};

async function rows<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

export async function loadClientPortalIssueDraftSources(
  database: D1DatabaseLike,
  scope: { portalId: string; projectId: string; workspaceId: string },
): Promise<ClientPortalIssueDraftSources> {
  const [estimates, artifacts, requests, baselines, issues] = await Promise.all([
    rows<{ id: string; name: string; sheet_code: string | null }>(
      database,
      "SELECT id, name, sheet_code FROM estimates WHERE project_id = ? ORDER BY sheet_code ASC, name ASC, id ASC",
      [scope.projectId],
    ),
    rows<{ artifact_id: string; artifact_version_id: string; content_type: string; file_name: string; revision_label: string | null; title: string; version_number: number }>(
      database,
      `SELECT artifact.id AS artifact_id, artifact.title, version.id AS artifact_version_id,
              version.version_number, version.revision_label, version.file_name, version.content_type
       FROM project_artifacts artifact
       JOIN project_artifact_versions version ON version.artifact_id = artifact.id
       WHERE artifact.workspace_id = ? AND artifact.project_id = ? AND artifact.status = 'active'
       ORDER BY artifact.updated_at DESC, artifact.id ASC, version.version_number DESC`,
      [scope.workspaceId, scope.projectId],
    ),
    rows<{ request_code: string; request_id: string; request_version_id: string; status: string; title: string }>(
      database,
      `SELECT request.id AS request_id, request.request_code, request.status,
              version.id AS request_version_id, version.title
       FROM project_change_requests request
       JOIN project_change_request_versions version ON version.id = request.current_version_id
       WHERE request.workspace_id = ? AND request.project_id = ? AND request.status <> 'initializing'
       ORDER BY request.request_number DESC, request.id ASC`,
      [scope.workspaceId, scope.projectId],
    ),
    rows<{ id: string; issue_label: string }>(
      database,
      `SELECT baseline.id, issue.version_label AS issue_label
       FROM client_portal_baselines baseline
       JOIN client_portal_issues issue ON issue.id = baseline.issue_id
       WHERE baseline.workspace_id = ? AND baseline.project_id = ? AND baseline.portal_id = ?
       ORDER BY baseline.established_at DESC, baseline.id DESC`,
      [scope.workspaceId, scope.projectId, scope.portalId],
    ),
    rows<{ id: string; issue_number: number; version_label: string }>(
      database,
      `SELECT id, issue_number, version_label
       FROM client_portal_issues
       WHERE portal_id = ?
       ORDER BY issue_number DESC, id DESC`,
      [scope.portalId],
    ),
  ]);
  return {
    artifacts: artifacts.map((row) => ({ artifactId: row.artifact_id, artifactVersionId: row.artifact_version_id, contentType: row.content_type, fileName: row.file_name, revisionLabel: row.revision_label, title: row.title, versionNumber: row.version_number })),
    baselines: baselines.map((row) => ({ id: row.id, issueLabel: row.issue_label })),
    estimates: estimates.map((row) => ({ id: row.id, name: row.name, sheetCode: row.sheet_code })),
    issues: issues.map((row) => ({ id: row.id, issueNumber: row.issue_number, versionLabel: row.version_label })),
    requests: requests.map((row) => ({ requestCode: row.request_code, requestId: row.request_id, requestVersionId: row.request_version_id, status: row.status, title: row.title })),
  };
}
