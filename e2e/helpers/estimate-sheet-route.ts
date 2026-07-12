export type EstimateSheetRouteConfig = Readonly<{
  pathname: string;
}>;

export function getEstimateSheetRouteConfig(env: NodeJS.ProcessEnv = process.env): EstimateSheetRouteConfig | null {
  const projectId = env.PLAYWRIGHT_ESTIMATE_PROJECT_ID;
  const nodeId = env.PLAYWRIGHT_ESTIMATE_NODE_ID;
  if (!projectId || !nodeId) return null;
  return {
    pathname: `/workshop/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(nodeId)}`,
  };
}
