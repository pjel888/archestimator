import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveOnboardingTarget,
  waitForOnboardingTarget,
} from "@/components/onboarding/onboarding-target-resolver";

const mocks = vi.hoisted(() => ({
  prepareTarget: vi.fn(),
}));

vi.mock("@/components/onboarding/estimate-target-adapter", () => ({
  prepareEstimateOnboardingTarget: mocks.prepareTarget,
}));

function visibleTarget(key = "estimate.total") {
  const element = document.createElement("button");
  element.dataset.onboardingTarget = key;
  vi.spyOn(element, "getClientRects").mockReturnValue({
    0: element.getBoundingClientRect(),
    length: 1,
    item: () => element.getBoundingClientRect(),
    [Symbol.iterator]: function* iterator() {
      yield element.getBoundingClientRect();
    },
  });
  return element;
}

describe("onboarding target resolver", () => {
  beforeEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    mocks.prepareTarget.mockReset();
    mocks.prepareTarget.mockResolvedValue(null);
    if (!globalThis.CSS) {
      Object.defineProperty(globalThis, "CSS", {
        configurable: true,
        value: { escape: (value: string) => value },
      });
    } else if (!globalThis.CSS.escape) {
      globalThis.CSS.escape = (value: string) => value;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("selects only a connected, visible, non-inert target", () => {
    const hidden = visibleTarget();
    hidden.setAttribute("aria-hidden", "true");
    const inertContainer = document.createElement("div");
    inertContainer.setAttribute("inert", "");
    inertContainer.append(visibleTarget());
    const visible = visibleTarget();
    document.body.append(hidden, inertContainer, visible);

    expect(resolveOnboardingTarget("estimate.total")).toBe(visible);
  });

  it("returns an immediately visible target without preparation", async () => {
    const target = visibleTarget();
    document.body.append(target);

    await expect(waitForOnboardingTarget({
      key: "estimate.total",
      signal: new AbortController().signal,
      timeoutMs: 100,
    })).resolves.toBe(target);
    expect(mocks.prepareTarget).not.toHaveBeenCalled();
  });

  it("uses target preparation before observing DOM mutations", async () => {
    const prepared = visibleTarget();
    mocks.prepareTarget.mockResolvedValue(prepared);
    const controller = new AbortController();

    await expect(waitForOnboardingTarget({
      key: "estimate.total",
      signal: controller.signal,
      timeoutMs: 100,
    })).resolves.toBe(prepared);
    expect(mocks.prepareTarget).toHaveBeenCalledWith(
      "estimate.total",
      controller.signal,
    );
  });

  it("resolves after a matching target becomes visible through mutation", async () => {
    const pending = waitForOnboardingTarget({
      key: "estimate.total",
      signal: new AbortController().signal,
      timeoutMs: 1_000,
    });
    const target = visibleTarget();
    document.body.append(target);

    await expect(pending).resolves.toBe(target);
  });

  it("retries a virtual target adapter that registers after resume begins", async () => {
    vi.useFakeTimers();
    const prepared = visibleTarget("estimate.row_math");
    mocks.prepareTarget
      .mockResolvedValueOnce(null)
      .mockResolvedValue(prepared);
    const controller = new AbortController();
    const pending = waitForOnboardingTarget({
      key: "estimate.row_math",
      signal: controller.signal,
      timeoutMs: 250,
    });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(51);

    await expect(pending).resolves.toBe(prepared);
    expect(mocks.prepareTarget).toHaveBeenCalledTimes(2);
  });

  it("disconnects and resolves null when aborted", async () => {
    const controller = new AbortController();
    const pending = waitForOnboardingTarget({
      key: "estimate.total",
      signal: controller.signal,
      timeoutMs: 1_000,
    });

    controller.abort();

    await expect(pending).resolves.toBeNull();
  });

  it("resolves null after timeout without a visible target", async () => {
    vi.useFakeTimers();
    const pending = waitForOnboardingTarget({
      key: "estimate.total",
      signal: new AbortController().signal,
      timeoutMs: 250,
    });

    await vi.advanceTimersByTimeAsync(251);

    await expect(pending).resolves.toBeNull();
  });
});
