import type {
  ProjectReusableEstimateSource,
  ProjectTabReusableSource,
  ReusableEstimateSource,
} from "./types";

export function getProjectTabReusableSourceDisplayName(source: ProjectTabReusableSource) {
  return source.displayName ?? source.metadata?.tabDisplayName ?? source.name;
}

export function getProjectReusableSourceDisplayName(source: ProjectReusableEstimateSource) {
  if (source.kind === "project-tab") return getProjectTabReusableSourceDisplayName(source);
  return source.name;
}

function getReusableSourceDisplayName(source: ReusableEstimateSource) {
  if (source.kind === "custom-template") return source.template.name;
  return getProjectReusableSourceDisplayName(source);
}
