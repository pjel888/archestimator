export const PROJECT_START_QUERY_PARAM = "start";

export const PROJECT_START_CHOOSER_HREF =
  `/workshop/projects?${PROJECT_START_QUERY_PARAM}=project`;
export const PROJECT_START_BLANK_HREF =
  `/workshop/projects?${PROJECT_START_QUERY_PARAM}=blank`;

export type ProjectStartIntent = "chooser" | "blank";

export function parseProjectStartIntent(
  value: string | string[] | undefined,
): ProjectStartIntent | null {
  const intent = Array.isArray(value) ? value[0] : value;
  if (intent === "project") return "chooser";
  if (intent === "blank") return "blank";
  return null;
}
