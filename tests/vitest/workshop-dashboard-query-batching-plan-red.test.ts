import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function getFunctionBody(source: string, functionName: string) {
  const exportedStart = source.indexOf(`export async function ${functionName}`);
  const localStart = source.indexOf(`async function ${functionName}`);
  const start = exportedStart >= 0 ? exportedStart : localStart;
  expect(start, `${functionName} should be exported`).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index + 1);
  }
  throw new Error(`Could not find body for ${functionName}`);
}

describe("Workshop Dashboard query batching plan RED contracts", () => {
  it("provides a request-correlated Phase 0 dashboard query-count harness before optimization claims", () => {
    const serverTiming = read("src/lib/perf/server-timing.ts");
    const measureScriptPath = "scripts/measure-workshop-dashboard-query-count.ts";

    expect(existsSync(join(root, measureScriptPath))).toBe(true);
    expect(serverTiming).toContain("AsyncLocalStorage");
    expect(serverTiming).toMatch(/request(?:Id|LocalId)/);
    expect(serverTiming).toMatch(/Supabase.*request|request.*Supabase/i);
  });

  it("fetches recent and favorite homebase estimate arms in one bounded Phase 1 wave", () => {
    const repository = read("src/lib/repositories/workspace-repository.ts");
    const body = getFunctionBody(repository, "getWorkshopHomebaseDataAppPath");

    expect(body).toContain("recentEstimateProjectIds");
    expect(body).toMatch(/recentEstimate(?:s)?Result/);
    expect(body).toMatch(/favoriteEstimate(?:s)?Result/);
    expect(body).toMatch(/Promise\.all\(\s*\[\s*[\s\S]*recentEstimate(?:s)?Result[\s\S]*favoriteEstimate(?:s)?Result[\s\S]*\]\s*\)/);
    expect(body).toMatch(/favoriteEstimateIds\.slice\(0,\s*(?:50|WORKSHOP_HOMEBASE_FAVORITE_ESTIMATE_LIMIT)\)/);
  });

  it("uses one merged project backfill for favorite projects and missing estimate projects", () => {
    const repository = read("src/lib/repositories/workspace-repository.ts");
    const body = getFunctionBody(repository, "getWorkshopHomebaseDataAppPath");

    expect(body).toContain("missingProjectIds");
    expect(body).toMatch(/projectBackfillIds|backfillProjectIds/);
    expect(body).toMatch(/new Set\([\s\S]*favoriteProjectIds[\s\S]*missingProjectIds[\s\S]*\)/);
    expect(body).not.toMatch(/let favoriteProjects[\s\S]*?await supabase[\s\S]*?\.from\("projects"\)[\s\S]*?let recentEstimates/);
  });

  it("adds a dashboard-lean Phase 2 library spotlight seam without routing Workshop through the full Library overview", () => {
    const repository = read("src/lib/repositories/component-library-repository.ts");
    const workshopPage = read("src/app/workshop/page.tsx");

    expect(repository).toContain("export async function getLibraryDashboardSpotlight");
    expect(repository).toMatch(/recentTemplates:\s*\[\]/);
    expect(workshopPage).toContain("getLibraryDashboardSpotlight");
    expect(workshopPage).not.toContain("getLibraryOverview");
  });
});
