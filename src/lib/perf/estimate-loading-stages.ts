export const ESTIMATE_LOADING_STAGE_NAMES = [
  "estimate.layout.auth",
  "estimate.route.params",
  "estimate.route.context",
  "estimate.route.d1",
  "estimate.route.current-user",
  "estimate.route.selected-node",
  "estimate.route.project-estimate-access",
  "estimate.route.tabs",
  "estimate.route.nodes-adjustment",
  "estimate.route.rows-template-links",
  "estimate.route.tree-build",
  "estimate.route.capabilities",
  "estimate.route.onboarding",
  "estimate.route.binding",
  "estimate.client.rsc",
  "estimate.client.tree-chunk",
  "estimate.client.content-chunk",
  "estimate.client.hydration",
  "estimate.client.interactive",
] as const;

export type EstimateLoadingStageName = (typeof ESTIMATE_LOADING_STAGE_NAMES)[number];

export const ESTIMATE_LOADING_ROUTE_STAGE_NAMES = ESTIMATE_LOADING_STAGE_NAMES.filter(
  (stage): stage is Extract<EstimateLoadingStageName, `estimate.route.${string}`> =>
    stage.startsWith("estimate.route."),
);

export const ESTIMATE_LOADING_CLIENT_STAGE_NAMES = ESTIMATE_LOADING_STAGE_NAMES.filter(
  (stage): stage is Extract<EstimateLoadingStageName, `estimate.client.${string}`> =>
    stage.startsWith("estimate.client."),
);
