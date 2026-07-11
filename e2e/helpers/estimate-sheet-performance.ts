import type { Page, TestInfo } from "@playwright/test";

export const ESTIMATE_PERFORMANCE_ROUTE = "/workshop/projects/:projectId/estimates/:nodeId";

export type EstimatePerformanceRouteConfig = Readonly<{
  projectId: string;
  nodeId: string;
  pathname: string;
}>;

export type EstimateBrowserSnapshot = Readonly<{
  route: string;
  navigationMs: number | null;
  resourceCount: number;
  scriptBytes: number;
  rscBytes: number;
  mountedRows: number;
  mountedBranches: number;
  sheetVisible: boolean;
  treeReady: boolean;
}>;

export function getEstimatePerformanceRouteConfig(env: NodeJS.ProcessEnv = process.env): EstimatePerformanceRouteConfig | null {
  const projectId = env.ESTIMATE_PERF_PROJECT_ID;
  const nodeId = env.ESTIMATE_PERF_NODE_ID;
  if (!projectId || !nodeId) return null;
  return {
    projectId,
    nodeId,
    pathname: `/workshop/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(nodeId)}`,
  };
}

export async function waitForEstimateSheetReady(page: Page, timeout = 30_000): Promise<void> {
  const readyMarker = page.locator('[data-estimate-sheet-ready="true"], [data-estimate-sheet], [data-testid="estimate-sheet"]').first();
  await readyMarker.waitFor({ state: "visible", timeout });
  const treeMarker = page.locator('[data-estimate-tree-ready="true"], [data-testid="estimate-tree"]').first();
  await treeMarker.waitFor({ state: "attached", timeout });
}

export async function collectEstimateBrowserSnapshot(page: Page): Promise<EstimateBrowserSnapshot> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const rows = document.querySelectorAll('[data-estimate-row], [data-row-id], [role="row"][data-estimate-row]').length;
    const branches = document.querySelectorAll('[data-estimate-branch], [data-node-id][data-node-kind="branch"]').length;
    const sheet = Boolean(document.querySelector('[data-estimate-sheet], [data-testid="estimate-sheet"]'));
    const tree = Boolean(document.querySelector('[data-estimate-tree-ready="true"], [data-testid="estimate-tree"]'));
    return {
      route: window.location.pathname,
      navigationMs: navigation ? Math.max(navigation.duration, navigation.domContentLoadedEventEnd) : null,
      resourceCount: resources.length,
      scriptBytes: resources
        .filter((resource) => resource.initiatorType === "script" || /\.m?js(?:$|\?)/iu.test(resource.name))
        .reduce((total, resource) => total + (resource.transferSize || resource.encodedBodySize || 0), 0),
      rscBytes: resources
        .filter((resource) => resource.name.includes("_rsc=") || resource.name.includes("/_next/data/"))
        .reduce((total, resource) => total + (resource.transferSize || resource.encodedBodySize || 0), 0),
      mountedRows: rows,
      mountedBranches: branches,
      sheetVisible: sheet,
      treeReady: tree,
    };
  });
}

export async function attachEstimateSnapshot(testInfo: TestInfo, name: string, snapshot: unknown): Promise<void> {
  await testInfo.attach(name, {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(snapshot, null, 2), "utf8"),
  });
}

export async function openEstimateSheet(page: Page, config: EstimatePerformanceRouteConfig): Promise<EstimateBrowserSnapshot> {
  await page.goto(config.pathname, { waitUntil: "domcontentloaded" });
  await waitForEstimateSheetReady(page);
  return collectEstimateBrowserSnapshot(page);
}

