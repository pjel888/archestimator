import { describe, expect, it } from "vitest";

import { deriveFirstEstimateChecklist } from "@/lib/onboarding/first-estimate-checklist";
import type { ActivationProgress } from "@/lib/onboarding/activation-repository";

function progress(overrides: Partial<ActivationProgress> = {}): ActivationProgress {
  return {
    userId: "user-1",
    workspaceId: "workspace-1",
    selectedPath: "guided_sample",
    projectId: "project-1",
    estimateId: "estimate-1",
    lastMilestone: "project_created",
    firstValueCompletedAt: null,
    checklistDismissedAt: null,
    checklistReopenedAt: null,
    supportState: "none",
    lastEventAt: "2026-07-12T00:00:00.000Z",
    version: 1,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("deriveFirstEstimateChecklist", () => {
  it("derives completion from the authoritative milestone rather than client claims", () => {
    const checklist = deriveFirstEstimateChecklist(progress({ lastMilestone: "first_valid_total" }));

    expect(checklist.items.filter((item) => item.status === "complete")).toHaveLength(5);
    expect(checklist.isComplete).toBe(true);
    expect(checklist.items.find((item) => item.id === "publish")).toMatchObject({ status: "not_available" });
  });

  it("keeps late/incomplete milestones actionable with scoped estimate links", () => {
    const checklist = deriveFirstEstimateChecklist(progress({ lastMilestone: "first_area_created" }));

    expect(checklist.items.find((item) => item.id === "priced-row")).toMatchObject({
      href: "/workshop/projects/project-1/estimates/estimate-1",
      status: "next",
    });
    expect(checklist.isComplete).toBe(false);
  });

  it("uses persisted dismissal/reopen timestamps without changing completion", () => {
    const dismissed = deriveFirstEstimateChecklist(progress({ checklistDismissedAt: "2026-07-12T01:00:00.000Z" }));
    const reopened = deriveFirstEstimateChecklist(progress({
      checklistDismissedAt: "2026-07-12T01:00:00.000Z",
      checklistReopenedAt: "2026-07-12T02:00:00.000Z",
    }));

    expect(dismissed.isDismissed).toBe(true);
    expect(reopened.isDismissed).toBe(false);
    expect(reopened.items.find((item) => item.id === "project")?.status).toBe("complete");
  });

  it("does not fabricate progress when activation data is unavailable", () => {
    const checklist = deriveFirstEstimateChecklist(null);

    expect(checklist.items.filter((item) => item.status === "complete")).toHaveLength(0);
    expect(checklist.items.find((item) => item.id === "project")?.href).toBe("/workshop/projects");
  });
});
