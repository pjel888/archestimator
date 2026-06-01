import { afterEach, describe, expect, it, vi } from "vitest";

import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("route error smoke gate", () => {
  it("does not throw unless the env gate and query flag are both enabled", () => {
    expect(() => assertRouteErrorSmoke({ routeLabel: "Library", searchParams: { routeErrorSmoke: "1" } })).not.toThrow();

    vi.stubEnv("ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE", "1");
    expect(() => assertRouteErrorSmoke({ routeLabel: "Library", searchParams: {} })).not.toThrow();
  });

  it("throws a sanitized route error only when explicitly enabled", () => {
    vi.stubEnv("ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE", "1");

    expect(() => assertRouteErrorSmoke({ routeLabel: "Project charts", searchParams: { routeErrorSmoke: "1" } })).toThrow(
      "Route error smoke: Project charts",
    );
  });
});
