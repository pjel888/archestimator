import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  COMPONENT_ROUTE_PARAM,
  COMPONENTS_LIBRARY_PATH,
  buildComponentRouteStateHref,
  getComponentDetailsHref,
} from "@/components/workshop/library/component-route-state";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

describe("library component route-state authorization contract", () => {
  it("keeps component detail state in a query param, not an addressable component route", () => {
    expect(COMPONENT_ROUTE_PARAM).toBe("component");
    expect(COMPONENTS_LIBRARY_PATH).toBe("/workshop/library/components");
    expect(getComponentDetailsHref("component/id with spaces")).toBe(
      "/workshop/library/components?component=component%2Fid+with+spaces",
    );
  });

  it("preserves unrelated filters when opening and closing the inspector", () => {
    expect(
      buildComponentRouteStateHref({
        pathname: "/workshop/library/components",
        searchParams: "brand=none&freshness=stale",
        componentId: "component-1",
      }),
    ).toBe("/workshop/library/components?brand=none&freshness=stale&component=component-1");

    expect(
      buildComponentRouteStateHref({
        pathname: "/workshop/library/components",
        searchParams: "brand=none&component=component-1&freshness=stale",
        componentId: null,
      }),
    ).toBe("/workshop/library/components?brand=none&freshness=stale");
  });

  it("resolves unloaded route-state ids before treating them as inaccessible", () => {
    const source = readSource("src/components/workshop/component-library-manager/ComponentLibraryManager.tsx");
    const routeIdIndex = source.indexOf("const routeComponentId = addComponentSearchParams?.get(COMPONENT_ROUTE_PARAM) ?? null;");
    const loadedLibraryGuardIndex = source.indexOf("localLibraryItems.find((entry) => entry.id === routeComponentId)");
    const directLookupIndex = source.indexOf("loadCostLibraryComponentRowDetail(itemId)", loadedLibraryGuardIndex);
    const notFoundIndex = source.indexOf('state: "not-found"', directLookupIndex);
    const authzDeniedTelemetryIndex = source.indexOf(
      'recordLibraryEvent("route_state_authz_denied"',
      notFoundIndex,
    );
    const stripInvalidRouteStateIndex = source.indexOf("componentId: null", authzDeniedTelemetryIndex);

    expect(routeIdIndex).toBeGreaterThan(-1);
    expect(loadedLibraryGuardIndex).toBeGreaterThan(routeIdIndex);
    expect(directLookupIndex).toBeGreaterThan(loadedLibraryGuardIndex);
    expect(notFoundIndex).toBeGreaterThan(directLookupIndex);
    expect(authzDeniedTelemetryIndex).toBeGreaterThan(notFoundIndex);
    expect(stripInvalidRouteStateIndex).toBeGreaterThan(authzDeniedTelemetryIndex);
    expect(source).not.toContain("loadCostLibraryComponent(");
    expect(source).not.toContain("getCostLibraryComponent(");
  });
});
