import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

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
  nodeKind: "group" | "area";
  name: string;
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
