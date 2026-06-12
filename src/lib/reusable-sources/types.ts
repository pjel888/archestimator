import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";

type CustomEstimateTemplateSource = {
  kind: "custom-template";
  template: EstimateTemplate;
};

type ProjectReusableSource = {
  kind: "project";
  projectId: string;
  name: string;
};

type ProjectEstimateReusableSource = {
  kind: "project-estimate";
  projectId: string;
  estimateId: string;
  name: string;
  sheetCode: string | null;
};

type ProjectTabReusableSource = {
  kind: "project-tab";
  projectId: string;
  estimateId: string;
  tabId: string;
  name: string;
};

type ProjectNodeReusableSource = {
  kind: "project-node";
  projectId: string;
  estimateId: string;
  tabId: string;
  nodeId: string;
  nodeKind: "group" | "area";
  name: string;
};

export type ReusableEstimateSource =
  | CustomEstimateTemplateSource
  | ProjectReusableSource
  | ProjectEstimateReusableSource
  | ProjectTabReusableSource
  | ProjectNodeReusableSource;
