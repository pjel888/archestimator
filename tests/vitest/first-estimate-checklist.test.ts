import { describe, expect, it } from "vitest";

import { deriveFirstEstimateChecklist } from "@/lib/onboarding/first-estimate-checklist";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";

function snapshot(
  overrides: Partial<OnboardingEligibilitySnapshot> = {},
): OnboardingEligibilitySnapshot {
  return {
    userId: "user-1",
    workspaceId: "workspace-1",
    workspaceRole: "owner",
    accessSource: "workspace",
    effectiveRole: "owner",
    entryKind: "workspace_creator",
    viewportHint: "unknown",
    resourceContext: {
      projectId: "project-1",
      estimateId: "estimate-1",
    },
    activation: {
      selectedPath: "guided_sample",
      projectStarted: false,
      estimateStarted: false,
      firstAreaCreated: false,
      firstRowPriced: false,
      firstValidTotalReached: false,
      automaticGuidanceEnabled: true,
      checklistDismissed: false,
    },
    starter: null,
    audience: ["workspace_creator"],
    capabilities: ["view_workshop", "view_projects", "create_projects", "view_estimate", "edit_estimate"],
    dataPredicates: {},
    availableRoutes: ["getting_started", "projects", "estimate_sheet"],
    availableTargets: [],
    flowStates: [],
    ...overrides,
  };
}

describe("deriveFirstEstimateChecklist", () => {
  it("derives four tasks only from authoritative saved-work evidence", () => {
    const checklist = deriveFirstEstimateChecklist(snapshot({
      activation: {
        ...snapshot().activation,
        projectStarted: true,
        estimateStarted: true,
        firstAreaCreated: true,
        firstRowPriced: true,
        firstValidTotalReached: true,
      },
    }));

    expect(checklist.items.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "project", status: "complete" },
      { id: "estimate", status: "complete" },
      { id: "area-and-priced-row", status: "complete" },
      { id: "valid-total", status: "complete" },
    ]);
    expect(checklist.completedCount).toBe(4);
    expect(checklist.isComplete).toBe(true);
  });

  it("requires both an area and priced row before advancing to a valid total", () => {
    const checklist = deriveFirstEstimateChecklist(snapshot({
      activation: {
        ...snapshot().activation,
        projectStarted: true,
        estimateStarted: true,
        firstAreaCreated: true,
        firstRowPriced: false,
        firstValidTotalReached: false,
      },
    }));

    expect(checklist.items.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "project", status: "complete" },
      { id: "estimate", status: "complete" },
      { id: "area-and-priced-row", status: "next" },
      { id: "valid-total", status: "pending" },
    ]);
    expect(checklist.items[2]?.href).toBe("/workshop/projects/project-1/estimates");
  });

  it("does not award checklist credit for completed guide state", () => {
    const checklist = deriveFirstEstimateChecklist(snapshot({
      flowStates: [{
        flowKey: "guided_estimate_practice",
        status: "completed",
        currentStepKey: null,
        completedStepKeys: [],
        skippedStepKeys: [],
        definitionVersion: 1,
        startedAt: "2026-07-24T00:00:00.000Z",
        completedAt: "2026-07-24T00:10:00.000Z",
        dismissedAt: null,
        lastEventAt: "2026-07-24T00:10:00.000Z",
        revision: 1,
      }],
    }));

    expect(checklist.completedCount).toBe(0);
    expect(checklist.items[0]?.status).toBe("next");
  });

  it("uses persisted visibility state without changing completion", () => {
    const checklist = deriveFirstEstimateChecklist(snapshot({
      activation: {
        ...snapshot().activation,
        projectStarted: true,
        checklistDismissed: true,
      },
    }));

    expect(checklist.isDismissed).toBe(true);
    expect(checklist.completedCount).toBe(1);
  });

  it("stays hidden outside workspace creator editing access", () => {
    const checklist = deriveFirstEstimateChecklist(snapshot({
      accessSource: "estimate",
      capabilities: ["view_workshop", "view_estimate"],
    }));

    expect(checklist).toMatchObject({
      canShow: false,
      completedCount: 0,
      isComplete: false,
      isDismissed: false,
      items: [],
    });
  });
});
