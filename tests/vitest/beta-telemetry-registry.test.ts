import { describe, expect, it } from "vitest";

import {
  BETA_TELEMETRY_METRICS,
  BETA_TELEMETRY_REGISTRY_VERSION,
  canRecordBetaTelemetry,
  isBetaTelemetryProductionEnabled,
} from "@/lib/landing/beta-telemetry-registry";

describe("beta telemetry registry", () => {
  it("defines versioned activation metrics that consume the activation contract", () => {
    expect(BETA_TELEMETRY_REGISTRY_VERSION).toBe("BETA-TELEMETRY-REGISTRY-v1");
    expect(BETA_TELEMETRY_METRICS).toHaveLength(2);
    expect(BETA_TELEMETRY_METRICS.every((metric) => metric.producerContract === "ACTIVATION-PRODUCER-CONTRACT-v1")).toBe(true);
    expect(BETA_TELEMETRY_METRICS.every((metric) => metric.consumerContract === "ACT-RECEIPT-COHORT-CONSUMER-v1")).toBe(true);
  });

  it("fails closed outside available production workspace cohort data", () => {
    const metricId = "beta.activation.invite_to_project";
    const validInput = { availability: "available" as const, consentGranted: false, isProduction: true, population: "production" as const, surface: "workspace" as const };

    expect(canRecordBetaTelemetry(metricId, validInput)).toBe(true);
    expect(canRecordBetaTelemetry(metricId, { ...validInput, availability: "stale" })).toBe(false);
    expect(canRecordBetaTelemetry(metricId, { ...validInput, population: "test" })).toBe(false);
    expect(canRecordBetaTelemetry(metricId, { ...validInput, surface: "share" })).toBe(false);
    expect(canRecordBetaTelemetry("unknown.metric", validInput)).toBe(false);
  });

  it("requires explicit production telemetry enablement", () => {
    expect(isBetaTelemetryProductionEnabled({ nodeEnv: "production", enabled: "true" })).toBe(true);
    expect(isBetaTelemetryProductionEnabled({ nodeEnv: "production", enabled: "false" })).toBe(false);
    expect(isBetaTelemetryProductionEnabled({ nodeEnv: "development", enabled: "true" })).toBe(false);
    expect(isBetaTelemetryProductionEnabled({ nodeEnv: "production", enabled: undefined })).toBe(false);
  });
});
