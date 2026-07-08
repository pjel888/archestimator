import { describe, expect, it } from "vitest";

import {
  ALERT_SCENARIOS,
  ALERT_SCENARIO_IDS,
  alertScenarioLaunchBlockers,
  validateAlertScenarioCatalog,
  type AlertScenario,
} from "@/lib/observability/alert-scenarios";

function cloneScenarios() {
  return ALERT_SCENARIOS.map((scenario) => ({
    ...scenario,
    primaryChannels: [...scenario.primaryChannels],
    proof: { ...scenario.proof },
    freeTier: { ...scenario.freeTier },
  })) as AlertScenario[];
}

describe("alert scenario catalog", () => {
  it("enumerates the seven launch alert scenarios with explicit owners, channels, latency, and proof commands", () => {
    const validation = validateAlertScenarioCatalog();

    expect(ALERT_SCENARIOS.map((scenario) => scenario.id)).toEqual([...ALERT_SCENARIO_IDS]);
    expect(validation.catalogReady).toBe(true);
    expect(validation.missing).toEqual([]);
    expect(validation.scenarioCount).toBe(7);
    expect(validation.implementedProofCount).toBe(7);
    expect(validation.plannedProofCount).toBe(0);

    for (const scenario of ALERT_SCENARIOS) {
      expect(scenario.ownerRole).toMatch(/\S/);
      expect(scenario.primaryChannels.length).toBeGreaterThan(0);
      expect(scenario.detectionLatencyTargetMinutes).toBeGreaterThan(0);
      expect(scenario.deliveryLatencyTargetMinutes).toBeGreaterThan(0);
      expect(scenario.proof.command).toMatch(/^bun run /);
      expect(scenario.proof.artifact).toMatch(/\.json$/);
      expect(scenario.freeTier.paidAddOnRequired).toBe(false);
    }
  });

  it("keeps critical provider-backed scenarios marked as launch requirements", () => {
    const providerBackedIds = ALERT_SCENARIOS
      .filter((scenario) => scenario.proof.providerBackedRequiredForLaunch)
      .map((scenario) => scenario.id);

    expect(providerBackedIds).toEqual([...ALERT_SCENARIO_IDS]);
    expect(providerBackedIds).toEqual(expect.arrayContaining(["S-01", "S-02", "S-05", "S-06"]));
  });

  it("fails catalog validation when an owner, proof artifact, or free-tier stance is missing", () => {
    const scenarios = cloneScenarios();
    scenarios[0] = {
      ...scenarios[0],
      ownerRole: "",
      proof: { ...scenarios[0].proof, artifact: "" },
      freeTier: { ...scenarios[0].freeTier, paidAddOnRequired: true as false },
    };

    const validation = validateAlertScenarioCatalog(scenarios);

    expect(validation.catalogReady).toBe(false);
    expect(validation.missing).toEqual(expect.arrayContaining([
      "S-01: owner role",
      "S-01: proof artifact",
      "S-01: free-tier no-paid-add-on stance",
    ]));
  });

  it("keeps launch readiness unblocked once all provider-backed proof producers are implemented", () => {
    expect(alertScenarioLaunchBlockers()).toEqual([]);
  });
});
