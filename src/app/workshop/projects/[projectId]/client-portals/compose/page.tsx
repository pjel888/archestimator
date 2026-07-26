import { redirect } from "next/navigation";

import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { clientPortalComposeSearch, type ClientPortalComposeIntent } from "@/lib/client-portal/compose-entry";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

type Query = Record<string, string | string[] | undefined>;

function strings(value: string | string[] | undefined) {
  return [...new Set((Array.isArray(value) ? value : value ? [value] : []).map((item) => item.trim()).filter(Boolean))];
}

async function ownedIds(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<{ id: string }>(sql).bind(...values).all<{ id: string }>();
  return (result.results ?? []).map((row) => row.id);
}

export default async function ClientPortalComposeEntryPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Query> }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const manager = await assertProjectPublicationManager(projectId);
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Something went wrong. Try again in a moment.");

  const requestedEstimateIds = strings(query.estimateId);
  const nodeIds = strings(query.nodeId);
  const requestedArtifactVersionIds = strings(query.artifactVersionId);
  const requestedRequestVersionIds = strings(query.requestVersionId);
  const [estimateIds, nodeEstimateIds, artifactVersionIds, requestVersionIds, portals] = await Promise.all([
    requestedEstimateIds.length ? ownedIds(database, `SELECT id FROM estimates WHERE project_id = ? AND id IN (${requestedEstimateIds.map(() => "?").join(", ")})`, [manager.project.id, ...requestedEstimateIds]) : [],
    nodeIds.length ? ownedIds(database, `SELECT DISTINCT estimate.id FROM estimate_nodes node JOIN estimates estimate ON estimate.id = node.estimate_id WHERE estimate.project_id = ? AND node.id IN (${nodeIds.map(() => "?").join(", ")})`, [manager.project.id, ...nodeIds]) : [],
    requestedArtifactVersionIds.length ? ownedIds(database, `SELECT id FROM project_artifact_versions WHERE workspace_id = ? AND project_id = ? AND id IN (${requestedArtifactVersionIds.map(() => "?").join(", ")})`, [manager.project.workspace_id, manager.project.id, ...requestedArtifactVersionIds]) : [],
    requestedRequestVersionIds.length ? ownedIds(database, `SELECT version.id FROM project_change_request_versions version JOIN project_change_requests request ON request.id = version.request_id WHERE request.workspace_id = ? AND request.project_id = ? AND version.id IN (${requestedRequestVersionIds.map(() => "?").join(", ")})`, [manager.project.workspace_id, manager.project.id, ...requestedRequestVersionIds]) : [],
    ownedIds(database, "SELECT id FROM client_portals WHERE workspace_id = ? AND project_id = ? AND status IN ('draft', 'ready', 'live', 'access_off') ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'ready' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END, updated_at DESC, id ASC", [manager.project.workspace_id, manager.project.id]),
  ]);
  const intent: ClientPortalComposeIntent = {
    estimateIds: [...new Set([...estimateIds, ...nodeEstimateIds])],
    artifactVersionIds,
    requestVersionIds,
  };
  const detailSearch = clientPortalComposeSearch(intent);
  if (portals.length === 1) {
    redirect(`/workshop/projects/${encodeURIComponent(manager.project.id)}/client-portals/${encodeURIComponent(portals[0]!)}?${detailSearch}`);
  }
  const chooserSearch = new URLSearchParams(clientPortalComposeSearch(intent, false));
  chooserSearch.set("compose", "1");
  redirect(`/workshop/projects/${encodeURIComponent(manager.project.id)}/client-portals?${chooserSearch.toString()}`);
}
