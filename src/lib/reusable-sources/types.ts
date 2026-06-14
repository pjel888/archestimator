import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

export type CustomEstimateTemplateSource = {
  kind: "custom-template";
  template: EstimateTemplate;
};

export type ReusableSourceLiveMetadata = {
  projectName?: string;
  estimateName?: string;
  sheetCode?: string | null;
  tabName?: string;
  nodePath?: string[];
  updatedAt?: string | null;
  rowCount?: number | null;
  totalCost?: number | null;
};

export type ProjectReusableSource = {
  kind: "project";
  projectId: string;
  name: string;
  metadata?: ReusableSourceLiveMetadata;
};

export type ProjectEstimateReusableSource = {
  kind: "project-estimate";
  projectId: string;
  estimateId: string;
  name: string;
  sheetCode: string | null;
  metadata?: ReusableSourceLiveMetadata;
};

export type ProjectTabReusableSource = {
  kind: "project-tab";
  projectId: string;
  estimateId: string;
  tabId: string;
  name: string;
  metadata?: ReusableSourceLiveMetadata;
};

export type ProjectNodeReusableSource = {
  kind: "project-node";
  projectId: string;
  estimateId: string;
  tabId: string;
  nodeId: string;
  parentNodeId?: string | null;
  nodeKind: "group" | "area";
  name: string;
  rowItems?: EstimateRowItem[];
  metadata?: ReusableSourceLiveMetadata;
};

export type ProjectSourceInsertTarget = ProjectTabReusableSource | ProjectNodeReusableSource;
export type ProjectReusableEstimateSource =
  | ProjectReusableSource
  | ProjectEstimateReusableSource
  | ProjectTabReusableSource
  | ProjectNodeReusableSource;

export type ReusableEstimateSource =
  | CustomEstimateTemplateSource
  | ProjectReusableEstimateSource;

// U2: a normalized project-source insert request. `nodeId` null = whole tab.
export type InsertProjectSourceIntoEstimateInput = {
  targetProjectId: string;
  targetEstimateId: string;
  targetParentNodeId: string;
  source: { projectId: string; estimateId: string; tabId: string; nodeId?: string | null };
  // RS-1: the tab the insert targets in the *target* estimate. When set, the
  // refreshed tree is loaded for THIS tab so a non-default-tab insert returns
  // the tab the user is editing. Omitted for legacy (no-tab) estimates.
  targetTabId?: string;
};

export type InsertProjectSourceIntoEstimateResult = {
  tree: EstimateTreeNode[];
  insertedRootNodeIds: string[];
};
