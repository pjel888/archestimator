export type ClientPortalComposeIntent = {
  artifactVersionIds?: readonly string[];
  estimateIds?: readonly string[];
  nodeIds?: readonly string[];
  requestVersionIds?: readonly string[];
};

function values(entries: readonly string[] | undefined) {
  return [...new Set((entries ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function clientPortalComposeSearch(intent: ClientPortalComposeIntent, includeTab = true) {
  const search = new URLSearchParams();
  if (includeTab) search.set("tab", "content");
  for (const estimateId of values(intent.estimateIds)) search.append("estimateId", estimateId);
  for (const nodeId of values(intent.nodeIds)) search.append("nodeId", nodeId);
  for (const artifactVersionId of values(intent.artifactVersionIds)) search.append("artifactVersionId", artifactVersionId);
  for (const requestVersionId of values(intent.requestVersionIds)) search.append("requestVersionId", requestVersionId);
  return search.toString();
}

export function projectClientPortalComposeHref(projectId: string, intent: ClientPortalComposeIntent) {
  const search = clientPortalComposeSearch(intent, false);
  const path = `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/compose`;
  return search ? `${path}?${search}` : path;
}
