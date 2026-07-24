import type { OnboardingEligibilitySnapshot } from "./flow-types";

export type FirstEstimateChecklistItem = {
  href: string;
  id: "project" | "estimate" | "area-and-priced-row" | "valid-total";
  label: string;
  description: string;
  status: "complete" | "next" | "pending";
};

function getEstimateHref(snapshot: OnboardingEligibilitySnapshot) {
  const projectId = snapshot.resourceContext.projectId;
  return projectId
    ? `/workshop/projects/${encodeURIComponent(projectId)}/estimates`
    : "/workshop/projects";
}

export function deriveFirstEstimateChecklist(
  snapshot: OnboardingEligibilitySnapshot,
) {
  const canShow = snapshot.accessSource === "workspace"
    && snapshot.capabilities.includes("create_projects")
    && snapshot.capabilities.includes("edit_estimate");
  if (!canShow) {
    return {
      canShow,
      completedCount: 0,
      isComplete: false,
      isDismissed: false,
      items: [] satisfies FirstEstimateChecklistItem[],
    };
  }

  const estimateHref = getEstimateHref(snapshot);
  const completion = [
    snapshot.activation.projectStarted,
    snapshot.activation.estimateStarted,
    snapshot.activation.firstAreaCreated
      && snapshot.activation.firstRowPriced,
    snapshot.activation.firstValidTotalReached,
  ];
  const firstIncompleteIndex = completion.findIndex((complete) => !complete);
  const baseItems: Omit<FirstEstimateChecklistItem, "status">[] = [
    {
      id: "project",
      label: "Start a project",
      description: "Create blank work, duplicate a project, or use a workspace template.",
      href: "/workshop/projects",
    },
    {
      id: "estimate",
      label: "Start an estimate",
      description: "Create, duplicate, or begin editing an Estimate Sheet.",
      href: estimateHref,
    },
    {
      id: "area-and-priced-row",
      label: "Add an area and priced row",
      description: "Build one real scope area with at least one priced row.",
      href: estimateHref,
    },
    {
      id: "valid-total",
      label: "Reach a valid saved total",
      description: "Confirm the current Estimate Sheet saves with a valid total.",
      href: estimateHref,
    },
  ];
  const items: FirstEstimateChecklistItem[] = baseItems.map((item, index) => ({
    ...item,
    status: completion[index]
      ? "complete" as const
      : index === firstIncompleteIndex
        ? "next" as const
        : "pending" as const,
  }));
  const completedCount = completion.filter(Boolean).length;

  return {
    canShow,
    completedCount,
    isComplete: completedCount === items.length,
    isDismissed: snapshot.activation.checklistDismissed,
    items,
  };
}
