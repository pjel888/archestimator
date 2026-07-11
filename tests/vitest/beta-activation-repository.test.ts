import { describe, expect, it } from "vitest";

import {
  ActivationRepositoryError,
  validateActivationMilestoneInput,
} from "@/lib/onboarding/activation-repository";

const validInput = {
  dedupeKey: "workspace-a:project-a:project_created:mutation-a",
  milestone: "project_created",
  occurredAt: "2026-07-11T00:00:00.000Z",
  projectId: "project-a",
  source: "project",
  userId: "user-a",
  workspaceId: "workspace-a",
} as const;

describe("activation repository input boundary", () => {
  it("accepts the versioned vocabulary and safe metadata", () => {
    expect(() => validateActivationMilestoneInput({
      ...validInput,
      metadata: { activation_path: "blank", sample_version: 1 },
    })).not.toThrow();
  });

  it.each([
    [{ ...validInput, milestone: "forged" }, "unknown milestone"],
    [{ ...validInput, source: "browser" }, "unknown source"],
    [{ ...validInput, estimateId: "estimate-a", projectId: null }, "estimate without project"],
    [{ ...validInput, metadata: { email: "client@example.test" } }, "unallowlisted metadata"],
    [{ ...validInput, metadata: { activation_path: { unbounded: true } } }, "nested metadata"],
  ])("rejects %s", (input) => {
    expect(() => validateActivationMilestoneInput(input as never)).toThrow(ActivationRepositoryError);
  });
});
