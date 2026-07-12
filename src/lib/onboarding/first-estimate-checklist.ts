import type { ActivationMilestone } from "./activation-types";
import type { ActivationProgress } from "./activation-repository";

export type FirstEstimateChecklistItem = {
  href: string;
  id: "project" | "estimate" | "area" | "priced-row" | "total" | "publish";
  label: string;
  status: "complete" | "next" | "not_available";
};

const milestoneRank: Record<ActivationMilestone, number> = {
  invite_accepted: 0,
  workspace_ready: 1,
  project_created: 2,
  first_area_created: 3,
  first_row_priced: 4,
  first_valid_total: 5,
  health_reviewed: 6,
  export_completed: 7,
  publication_created: 8,
  recipient_opened: 9,
  recipient_engaged: 10,
  recipient_decided: 11,
};

function hasMilestone(progress: ActivationProgress | null, milestone: ActivationMilestone) {
  if (!progress?.lastMilestone) return false;
  return milestoneRank[progress.lastMilestone] >= milestoneRank[milestone];
}

export function deriveFirstEstimateChecklist(progress: ActivationProgress | null) {
  const projectHref = progress?.projectId ? `/workshop/projects/${progress.projectId}` : "/workshop/projects";
  const estimateHref = progress?.projectId && progress?.estimateId
    ? `/workshop/projects/${progress.projectId}/estimates/${progress.estimateId}`
    : projectHref;
  const items: FirstEstimateChecklistItem[] = [
    { id: "project", label: "Create a project", href: projectHref, status: hasMilestone(progress, "project_created") ? "complete" : "next" },
    { id: "estimate", label: "Create an estimate", href: estimateHref, status: hasMilestone(progress, "workspace_ready") ? "complete" : "next" },
    { id: "area", label: "Add an area", href: estimateHref, status: hasMilestone(progress, "first_area_created") ? "complete" : "next" },
    { id: "priced-row", label: "Price a row", href: estimateHref, status: hasMilestone(progress, "first_row_priced") ? "complete" : "next" },
    { id: "total", label: "Confirm a total", href: estimateHref, status: hasMilestone(progress, "first_valid_total") ? "complete" : "next" },
    { id: "publish", label: "Publish when ready", href: "/workshop/publisher", status: "not_available" },
  ];
  return {
    items,
    isComplete: items.filter((item) => item.status !== "not_available").every((item) => item.status === "complete"),
    isDismissed: Boolean(
      progress?.checklistDismissedAt &&
        (!progress.checklistReopenedAt || progress.checklistDismissedAt >= progress.checklistReopenedAt),
    ),
  };
}
