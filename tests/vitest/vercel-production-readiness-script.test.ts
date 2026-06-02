import { describe, expect, it } from "vitest";

import {
  checkVercelProductionReadiness,
  countReadyRollbackCandidates,
  parseDomainList,
  parseVercelAliasTable,
  parseVercelInspect,
} from "@/../scripts/check-vercel-production-readiness";

const INSPECT_TEXT = `Vercel CLI 54.6.1
Fetching deployment "archestimator-current.vercel.app"
{
  "id": "dpl_current",
  "url": "archestimator-current.vercel.app",
  "target": "preview",
  "readyState": "READY",
  "aliases": ["archestimator-git-main-philipjonlewis-projects.vercel.app"]
}`;

const ALIAS_TEXT = `
  source                                                        url                                                                             age
  archestimator-old-philipjonlewis-projects.vercel.app          archestimator.com                                                                3d
  archestimator-old-philipjonlewis-projects.vercel.app          www.archestimator.com                                                            3d
  archestimator-current.vercel.app                              archestimator-git-main-philipjonlewis-projects.vercel.app                        2m
`;

const DEPLOYMENT_LIST_TEXT = `
  Age     Project                                   Deployment                                                             Status      Environment
  2m      philipjonlewis-projects/archestimator     https://archestimator-current.vercel.app                               ● Ready     Preview
  8m      philipjonlewis-projects/archestimator     https://archestimator-previous.vercel.app                              ● Ready     Preview
  9m      philipjonlewis-projects/archestimator     https://archestimator-building.vercel.app                              ● Building  Preview
`;

describe("Vercel production readiness checker", () => {
  it("normalizes expected domain lists", () => {
    expect(parseDomainList("https://Archestimator.com, www.archestimator.com/health\narchestimator.com")).toEqual([
      "archestimator.com",
      "www.archestimator.com",
    ]);
  });

  it("parses inspect JSON from CLI output", () => {
    expect(parseVercelInspect(INSPECT_TEXT)).toEqual({
      id: "dpl_current",
      url: "archestimator-current.vercel.app",
      target: "preview",
      readyState: "READY",
      aliases: ["archestimator-git-main-philipjonlewis-projects.vercel.app"],
    });
  });

  it("parses alias table rows without keeping unrelated prose", () => {
    const aliases = parseVercelAliasTable(ALIAS_TEXT);

    expect(aliases.get("archestimator.com")).toBe("archestimator-old-philipjonlewis-projects.vercel.app");
    expect(aliases.get("archestimator-git-main-philipjonlewis-projects.vercel.app")).toBe("archestimator-current.vercel.app");
  });

  it("counts ready rollback candidates other than the current deployment", () => {
    expect(countReadyRollbackCandidates(DEPLOYMENT_LIST_TEXT, "archestimator-current.vercel.app")).toBe(1);
  });

  it("fails closed when custom domains still point to an older deployment and rollback drill is missing", () => {
    const result = checkVercelProductionReadiness({
      inspectText: INSPECT_TEXT,
      aliasText: ALIAS_TEXT,
      deploymentListText: DEPLOYMENT_LIST_TEXT,
      expectedCustomDomains: ["archestimator.com", "www.archestimator.com"],
    });

    expect(result.deploymentReady).toBe(true);
    expect(result.rollbackCandidateAvailable).toBe(true);
    expect(result.customDomainsReady).toBe(false);
    expect(result.rollbackDrillStatus).toBe("not-provided");
    expect(result.vercelProductionReady).toBe(false);
    expect(result.missing).toContain("custom domains aliased to current deployment");
    expect(result.missing).toContain("rollback drill passed");
  });

  it("passes only when deployment, aliases, rollback candidate, and rollback drill all pass", () => {
    const aliasText = `
      archestimator-current.vercel.app archestimator.com 2m
      archestimator-current.vercel.app www.archestimator.com 2m
    `;
    const result = checkVercelProductionReadiness({
      inspectText: INSPECT_TEXT,
      aliasText,
      deploymentListText: DEPLOYMENT_LIST_TEXT,
      expectedCustomDomains: ["archestimator.com", "www.archestimator.com"],
      rollbackDrillStatus: "passed",
    });

    expect(result.customDomainsReady).toBe(true);
    expect(result.rollbackDrillPassed).toBe(true);
    expect(result.vercelProductionReady).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
