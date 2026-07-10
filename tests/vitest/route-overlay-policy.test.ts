import { describe, expect, it } from "vitest";

import { shouldSuppressGlobalRouteOverlay } from "@/lib/navigation/route-overlay-policy";

describe("shouldSuppressGlobalRouteOverlay", () => {
  it("suppresses workshop routes that stream a loading.tsx skeleton", () => {
    expect(shouldSuppressGlobalRouteOverlay("/workshop")).toBe(true);
    expect(shouldSuppressGlobalRouteOverlay("/workshop/projects")).toBe(true);
    expect(shouldSuppressGlobalRouteOverlay("/workshop/projects/abc/estimates/def")).toBe(true);
    expect(shouldSuppressGlobalRouteOverlay("/workshop/publisher")).toBe(true);
    expect(shouldSuppressGlobalRouteOverlay("/workshop/proposals")).toBe(true);
  });

  it("suppresses share and invite token routes with loading.tsx", () => {
    expect(shouldSuppressGlobalRouteOverlay("/share/raw-token-value")).toBe(true);
    expect(shouldSuppressGlobalRouteOverlay("/invite/raw-token-value")).toBe(true);
  });

  it("keeps the global overlay for marketing and auth shells without segment loading.tsx", () => {
    expect(shouldSuppressGlobalRouteOverlay("/")).toBe(false);
    expect(shouldSuppressGlobalRouteOverlay("/about")).toBe(false);
    expect(shouldSuppressGlobalRouteOverlay("/login")).toBe(false);
    expect(shouldSuppressGlobalRouteOverlay(null)).toBe(false);
    expect(shouldSuppressGlobalRouteOverlay(undefined)).toBe(false);
  });
});
