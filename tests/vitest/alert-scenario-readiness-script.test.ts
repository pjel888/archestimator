import { describe, expect, it } from "vitest";

import { ALERT_SCENARIOS, type AlertScenario } from "@/lib/observability/alert-scenarios";
import {
  checkAlertScenarioReadiness,
  formatAlertScenarioReadinessSummary,
} from "@/../scripts/check-alert-scenario-readiness";

function implementedScenarios() {
  return ALERT_SCENARIOS.map((scenario) => ({
    ...scenario,
    primaryChannels: [...scenario.primaryChannels],
    proof: { ...scenario.proof, status: "implemented" },
    freeTier: { ...scenario.freeTier },
  })) as AlertScenario[];
}

describe("alert scenario producer script", () => {
  it("passes the local catalog contract and proof-producer readiness", () => {
    const report = checkAlertScenarioReadiness({
      generatedAt: "2026-07-08T00:00:00.000Z",
    });

    expect(report.catalogReady).toBe(true);
    expect(report.productionAlertProducerReady).toBe(true);
    expect(report.totals).toMatchObject({
      scenarios: 7,
      implementedProofs: 7,
      plannedProofs: 0,
      providerBackedLaunchRequired: 7,
      launchBlockers: 0,
    });
    expect(report.launchBlockers).toEqual([]);

    const summary = formatAlertScenarioReadinessSummary(report, "/tmp/alert-scenarios.json");
    expect(summary).toEqual([
      "Alert scenario producer check passed; output=/tmp/alert-scenarios.json",
      "Catalog ready: true; productionAlertProducerReady=true",
      "Scenarios: 7/7; implementedProofs=7; plannedProofs=0",
    ]);
    expect(JSON.stringify(report)).not.toMatch(/token|secret|Bearer /i);
  });

  it("fails readiness when a provider-backed proof producer regresses to planned", () => {
    const scenarios = implementedScenarios();
    scenarios[3].proof.status = "planned";

    const report = checkAlertScenarioReadiness({
      generatedAt: "2026-07-08T00:00:00.000Z",
      scenarios,
    });

    expect(report.catalogReady).toBe(true);
    expect(report.productionAlertProducerReady).toBe(false);
    expect(report.launchBlockers).toEqual([
      "S-04:queue-dlq: provider-backed proof producer is planned",
    ]);
  });

  it("can format a catalog-only pass while still exposing launch blockers", () => {
    const report = checkAlertScenarioReadiness({
      generatedAt: "2026-07-08T00:00:00.000Z",
    });

    const summary = formatAlertScenarioReadinessSummary(report, undefined, { catalogOnly: true });

    expect(summary[0]).toBe("Alert scenario catalog check passed");
    expect(summary).toContain("Catalog ready: true; productionAlertProducerReady=true");
    expect(summary.some((line) => line.startsWith("Launch blockers:"))).toBe(false);
  });
});
