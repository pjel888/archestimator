import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

export type CustomEstimateTemplateSource = {
  kind: "custom-template";
  template: EstimateTemplate;
};

export type ProjectReusableSource = {
  kind: "project";
  projectId: string;
  name: string;
};

export type ProjectEstimateReusableSource = {
  kind: "project-estimate";
  projectId: string;
  estimateId: string;
  name: string;
  sheetCode: string | null;
};

export type ProjectTabReusableSource = {
  kind: "project-tab";
  projectId: string;
  estimateId: string;
  tabId: string;
  name: string;
};

export type ProjectNodeReusableSource = {
  kind: "project-node";
  projectId: string;
  estimateId: string;
  tabId: string;
  nodeId: string;
  nodeKind: "group" | "area";
  name: string;
};

export type ProjectSourceInsertTarget = ProjectTabReusableSource | ProjectNodeReusableSource;

export type ReusableEstimateSource =
  | CustomEstimateTemplateSource
  | ProjectReusableSource
  | ProjectEstimateReusableSource
  | ProjectTabReusableSource
  | ProjectNodeReusableSource;
