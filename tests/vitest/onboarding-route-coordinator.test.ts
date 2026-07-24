import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  prepareOnboardingRoute,
  resolveOnboardingRouteHref,
} from "@/components/onboarding/onboarding-route-coordinator";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";

const mocks = vi.hoisted(() => ({
  resolveTarget: vi.fn(),
  waitForTarget: vi.fn(),
}));

vi.mock("@/components/onboarding/onboarding-target-resolver", () => ({
  resolveOnboardingTarget: mocks.resolveTarget,
  waitForOnboardingTarget: mocks.waitForTarget,
}));

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
      projectId: "project / 1",
      estimateId: "estimate / 1",
      nodeId: "node / 1",
    },
    activation: {
      selectedPath: null,
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
    capabilities: ["view_workshop"],
    dataPredicates: {},
    availableRoutes: [
      "workshop_home",
      "getting_started",
      "projects",
      "assigned_project",
      "assigned_estimate",
      "estimate_sheet",
      "library_components",
      "library_templates",
      "client_links",
      "settings_guidance",
      "support",
    ],
    availableTargets: [],
    flowStates: [],
    ...overrides,
  };
}

describe("onboarding route coordinator", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.resolveTarget.mockReset();
    mocks.resolveTarget.mockReturnValue(null);
    mocks.waitForTarget.mockReset();
    window.history.replaceState({}, "", "/workshop");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves authorized resource routes and rejects unavailable context", () => {
    expect(resolveOnboardingRouteHref("estimate_sheet", snapshot())).toBe(
      "/workshop/projects/project%20%2F%201/estimates/node%20%2F%201",
    );
    expect(resolveOnboardingRouteHref("assigned_estimate", snapshot({
      resourceContext: { projectId: "project-1", estimateId: "estimate-1" },
    }))).toBe("/workshop/projects/project-1/estimates/estimate-1");
    expect(resolveOnboardingRouteHref("client_links", snapshot())).toBe(
      "/workshop/publisher",
    );
    expect(resolveOnboardingRouteHref("support", snapshot({
      availableRoutes: ["projects"],
    }))).toBeNull();
    expect(resolveOnboardingRouteHref("assigned_project", snapshot({
      resourceContext: {},
    }))).toBeNull();
  });

  it("returns immediately when the route is ready and the target is centered", async () => {
    const navigate = vi.fn();

    await expect(prepareOnboardingRoute({
      route: "workshop_home",
      target: "center",
      snapshot: snapshot(),
      signal: new AbortController().signal,
      navigate,
    })).resolves.toEqual({ ok: true, href: "/workshop" });

    expect(navigate).not.toHaveBeenCalled();
    expect(mocks.waitForTarget).not.toHaveBeenCalled();
  });

  it("navigates, waits for route readiness, and resolves a recovered target", async () => {
    const target = document.createElement("button");
    mocks.waitForTarget.mockResolvedValue(target);
    const navigate = vi.fn((href: string) => {
      window.history.pushState({}, "", href);
    });

    await expect(prepareOnboardingRoute({
      route: "projects",
      target: "nav.projects",
      snapshot: snapshot(),
      signal: new AbortController().signal,
      navigate,
    })).resolves.toEqual({ ok: true, href: "/workshop/projects" });

    expect(navigate).toHaveBeenCalledWith("/workshop/projects");
    expect(mocks.waitForTarget).toHaveBeenCalledWith(expect.objectContaining({
      key: "nav.projects",
      timeoutMs: 4_000,
    }));
  });

  it("keeps the current route when a global navigation target is already visible", async () => {
    const target = document.createElement("button");
    mocks.resolveTarget.mockReturnValue(target);
    const navigate = vi.fn();

    await expect(prepareOnboardingRoute({
      route: "projects",
      target: "nav.projects",
      snapshot: snapshot(),
      signal: new AbortController().signal,
      navigate,
    })).resolves.toEqual({ ok: true, href: "/workshop/projects" });

    expect(navigate).not.toHaveBeenCalled();
    expect(mocks.waitForTarget).not.toHaveBeenCalled();
  });

  it("still navigates for a visible route-local target", async () => {
    const target = document.createElement("button");
    mocks.resolveTarget.mockReturnValue(target);
    mocks.waitForTarget.mockResolvedValue(target);
    const navigate = vi.fn((href: string) => {
      window.history.pushState({}, "", href);
    });

    await expect(prepareOnboardingRoute({
      route: "estimate_sheet",
      target: "estimate.add_row",
      snapshot: snapshot(),
      signal: new AbortController().signal,
      navigate,
    })).resolves.toEqual({
      ok: true,
      href: "/workshop/projects/project%20%2F%201/estimates/node%20%2F%201",
    });

    expect(navigate).toHaveBeenCalledWith(
      "/workshop/projects/project%20%2F%201/estimates/node%20%2F%201",
    );
    expect(mocks.waitForTarget).toHaveBeenCalledWith(expect.objectContaining({
      key: "estimate.add_row",
      timeoutMs: 4_000,
    }));
  });

  it("reports target timeout after route readiness", async () => {
    mocks.waitForTarget.mockResolvedValue(null);
    window.history.replaceState({}, "", "/workshop/projects");

    await expect(prepareOnboardingRoute({
      route: "projects",
      target: "nav.projects",
      snapshot: snapshot(),
      signal: new AbortController().signal,
      navigate: vi.fn(),
    })).resolves.toEqual({ ok: false, reason: "target_timeout" });
  });

  it("stops pathname readiness on abort", async () => {
    const controller = new AbortController();
    const pending = prepareOnboardingRoute({
      route: "projects",
      target: "center",
      snapshot: snapshot(),
      signal: controller.signal,
      navigate: vi.fn(),
    });

    controller.abort();

    await expect(pending).resolves.toEqual({
      ok: false,
      reason: "route_not_ready",
    });
  });

  it("times out when navigation never reaches the requested pathname", async () => {
    vi.useFakeTimers();
    const pending = prepareOnboardingRoute({
      route: "projects",
      target: "center",
      snapshot: snapshot(),
      signal: new AbortController().signal,
      navigate: vi.fn(),
    });

    await vi.advanceTimersByTimeAsync(4_100);

    await expect(pending).resolves.toEqual({
      ok: false,
      reason: "route_not_ready",
    });
  });
});
