import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx",
  "utf8",
);
const clientSource = readFileSync("src/components/workshop/EstimateWorkspaceClient.tsx", "utf8");
const sharedSource = readFileSync("src/lib/estimates/estimate-performance-modes.ts", "utf8");
const serverSource = readFileSync("src/lib/estimates/estimate-performance-modes.server.ts", "utf8");
const contextSource = readFileSync("src/components/workshop/estimate-performance-mode-context.tsx", "utf8");

function expectBefore(source: string, before: string, after: string) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  expect(beforeIndex, `${before} should exist`).toBeGreaterThanOrEqual(0);
  expect(afterIndex, `${after} should exist`).toBeGreaterThanOrEqual(0);
  expect(beforeIndex, `${before} should appear before ${after}`).toBeLessThan(afterIndex);
}

describe("estimate performance mode route bridge", () => {
  it("keeps the shared snapshot client-safe and the resolver server-only", () => {
    expect(sharedSource).not.toContain("process.env as");
    expect(sharedSource).not.toContain("getCloudflareContext");
    expect(sharedSource).not.toContain("server-only");
    expect(serverSource).toMatch(/^import "server-only";/);
    expect(serverSource).toContain("getCloudflareContext({ async: true })");
    expect(serverSource).not.toContain("NEXT_PUBLIC_");
  });

  it("resolves one server snapshot before route-context loading", () => {
    expect(routeSource).toContain("loadEstimatePerformanceModeSnapshot");
    expect(routeSource).toContain("estimate-performance-modes.server");
    expect(routeSource).toContain("const estimatePerformanceModeSnapshot = await loadEstimatePerformanceModeSnapshot();");
    expectBefore(
      routeSource,
      "const estimatePerformanceModeSnapshot = await loadEstimatePerformanceModeSnapshot();",
      "resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)",
    );
    expect(routeSource).toContain("estimatePerformanceModeSnapshot: EstimatePerformanceModeSnapshot;");
    expect(routeSource).toContain("estimatePerformanceModeSnapshot={estimatePerformanceModeSnapshot}");
    expect(routeSource).not.toContain("NEXT_PUBLIC_");
  });

  it("passes the same prop through the resolved wrapper into the client boundary", () => {
    const propPasses = routeSource.match(/estimatePerformanceModeSnapshot=\{estimatePerformanceModeSnapshot\}/g) ?? [];
    expect(propPasses).toHaveLength(2);
    expect(routeSource).toContain("function EstimateWorkspaceResolved({");
    expect(routeSource).toContain("estimatePerformanceModeSnapshot,");
    expect(routeSource).toContain("<EstimateWorkspaceClient");
  });

  it("installs inert context and exposes only deterministic mode metadata", () => {
    expect(clientSource).toContain("EstimatePerformanceModeProvider");
    expect(clientSource).toContain('from "./estimate-performance-mode-context";');
    expect(clientSource).toContain("estimatePerformanceModeSnapshot = ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT");
    expect(clientSource).toContain("<EstimatePerformanceModeProvider snapshot={estimatePerformanceModeSnapshot}>");
    expect(clientSource).toContain("</EstimatePerformanceModeProvider>");
    expect(clientSource).not.toContain("ESTIMATE_ROUTE_FAST_PATH_MODE");
    expect(clientSource).not.toContain("NEXT_PUBLIC_");

    for (const attribute of [
      "data-estimate-performance-mode-schema",
      "data-estimate-performance-mode-source",
      "data-estimate-performance-mode-route-fast-path",
      "data-estimate-performance-mode-graph",
      "data-estimate-performance-mode-incremental-derivation",
      "data-estimate-performance-mode-render-boundary",
      "data-estimate-performance-mode-entity-patch",
    ]) {
      expect(clientSource).toContain(attribute);
    }
  });

  it("keeps context fallback all-off and does not branch optimized behavior", () => {
    expect(contextSource).toContain("ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT");
    expect(contextSource).toContain("createContext<EstimatePerformanceModeSnapshot>");
    expect(contextSource).toContain("use(EstimatePerformanceModeContext)");
    expect(clientSource).toContain("getEstimatePerformanceModeMetadata");
    expect(clientSource).not.toContain("if (estimatePerformanceModeSnapshot");
    expect(clientSource).not.toContain("switch (estimatePerformanceModeSnapshot");
  });
});
