export const PROJECT_STATUS_VALUES = [
  "ongoing",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "ongoing";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  archived: "Archived",
};

const PROJECT_STATUS_VALUE_SET = new Set<string>(PROJECT_STATUS_VALUES);

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && PROJECT_STATUS_VALUE_SET.has(value);
}

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  return isProjectStatus(value) ? value : DEFAULT_PROJECT_STATUS;
}
