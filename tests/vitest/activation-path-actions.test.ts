import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addStarterContent: vi.fn(),
  revalidatePath: vi.fn(),
  restoreStarterContent: vi.fn(),
  resumeStarterContent: vi.fn(),
  startGuidedPractice: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/onboarding/guided-sample-actions", () => ({
  startGuidedPractice: mocks.startGuidedPractice,
}));

vi.mock("@/lib/onboarding/starter-pack-actions", () => ({
  addStarterContent: mocks.addStarterContent,
  restoreStarterContent: mocks.restoreStarterContent,
  resumeStarterContent: mocks.resumeStarterContent,
}));

import {
  addCurrentStarterContent,
  restoreCurrentStarterContent,
  resumeCurrentStarterContent,
  startGuidedSample,
} from "@/lib/onboarding/activation-actions";

describe("startGuidedSample", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates sample startup to the current guided-practice action", async () => {
    const result = {
      projectId: "project-1",
      estimateId: "estimate-1",
      areaId: "area-1",
      tutorialVersion: 2,
      tutorialGeneration: 1,
      resumed: false,
    };
    mocks.startGuidedPractice.mockResolvedValue(result);

    await expect(startGuidedSample()).resolves.toEqual(result);

    expect(mocks.startGuidedPractice).toHaveBeenCalledTimes(1);
    expect(mocks.startGuidedPractice).toHaveBeenCalledWith();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop", "layout");
  });

  it("preserves guided-practice authorization failures", async () => {
    const error = new Error(
      "Guided practice requires permission to create and edit workspace Projects.",
    );
    mocks.startGuidedPractice.mockRejectedValue(error);

    await expect(startGuidedSample()).rejects.toBe(error);

    expect(mocks.startGuidedPractice).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["add", addCurrentStarterContent, "addStarterContent"],
    ["resume", resumeCurrentStarterContent, "resumeStarterContent"],
  ] as const)(
    "revalidates the workshop shell after starter %s",
    async (_label, action, mockKey) => {
      mocks[mockKey].mockResolvedValue({ status: "complete" });

      await expect(action()).resolves.toEqual({ status: "complete" });

      expect(mocks[mockKey]).toHaveBeenCalledTimes(1);
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop", "layout");
    },
  );

  it("passes the guarded revision through starter restore before revalidating", async () => {
    mocks.restoreStarterContent.mockResolvedValue({
      status: "restored",
      workspaceStatus: "complete",
      userStatus: "complete",
      ready: true,
    });

    await expect(restoreCurrentStarterContent(7)).resolves.toEqual({
      status: "restored",
      workspaceStatus: "complete",
      userStatus: "complete",
      ready: true,
    });

    expect(mocks.restoreStarterContent).toHaveBeenCalledWith({
      expectedRevision: 7,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop", "layout");
  });

  it("passes through the typed stale starter restore result", async () => {
    mocks.restoreStarterContent.mockResolvedValue({
      status: "stale",
      currentRevision: 8,
    });

    await expect(restoreCurrentStarterContent(7)).resolves.toEqual({
      status: "stale",
      currentRevision: 8,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workshop", "layout");
  });
});
