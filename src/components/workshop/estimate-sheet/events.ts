export const REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT = "archestimator:request-estimate-tree-node-create";

export type RequestEstimateTreeNodeCreateEventDetail = {
  kind: "group" | "area";
};
