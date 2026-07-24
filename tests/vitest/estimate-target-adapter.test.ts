import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prepareEstimateOnboardingTarget,
  registerEstimateOnboardingTargetAdapter,
} from "@/components/onboarding/estimate-target-adapter";

const cleanups: Array<() => void> = [];

function visibleOwner() {
  const owner = document.createElement("div");
  vi.spyOn(owner, "getClientRects").mockReturnValue([
    {
      bottom: 1,
      height: 1,
      left: 0,
      right: 1,
      top: 0,
      width: 1,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    },
  ] as unknown as DOMRectList);
  document.body.append(owner);
  return owner;
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("estimate onboarding target adapter", () => {
  it("prefers a guided-practice price row over an earlier generic editable row", async () => {
    const genericOwner = visibleOwner();
    const practiceOwner = visibleOwner();
    const genericInput = document.createElement("input");
    const practiceInput = document.createElement("input");
    genericOwner.append(genericInput);
    practiceOwner.append(practiceInput);

    cleanups.push(
      registerEstimateOnboardingTargetAdapter({
        target: "estimate.price_input",
        owner: () => genericOwner,
        priority: () => 0,
        prepare: async () => genericInput,
      }),
      registerEstimateOnboardingTargetAdapter({
        target: "estimate.price_input",
        owner: () => practiceOwner,
        priority: () => 1,
        prepare: async () => practiceInput,
      }),
    );

    await expect(
      prepareEstimateOnboardingTarget(
        "estimate.price_input",
        new AbortController().signal,
      ),
    ).resolves.toBe(practiceInput);
  });
});
