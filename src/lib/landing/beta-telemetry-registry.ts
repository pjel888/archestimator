import { ACTIVATION_PRODUCER_CONTRACT_VERSION } from "@/lib/onboarding/activation-producer-contract";

export const BETA_TELEMETRY_REGISTRY_VERSION = "BETA-TELEMETRY-REGISTRY-v1" as const;
export const BETA_TELEMETRY_ENABLE_ENV = "NEXT_PUBLIC_BETA_TELEMETRY_ENABLED" as const;

export type BetaTelemetryAvailability = "available" | "partial" | "stale" | "unavailable";
export type BetaTelemetryConsentBasis = "essential" | "analytics_opt_in" | "authenticated_operation";
export type BetaTelemetryPopulation = "production" | "bot" | "test" | "synthetic" | "anonymous" | "verified_recipient";

export type BetaTelemetryMetric = {
  id: string;
  version: 1;
  owner: "activation" | "operating";
  decision: string;
  producerContract: typeof ACTIVATION_PRODUCER_CONTRACT_VERSION;
  consumerContract: "ACT-RECEIPT-COHORT-CONSUMER-v1";
  consentBasis: BetaTelemetryConsentBasis;
  permittedSurfaces: readonly ("landing" | "workspace")[];
  retentionDays: number;
  deletionBehavior: "activation_lifecycle";
  providerDeletionBehavior: "not_applicable" | "provider_api_unavailable";
  denominator: string;
};

const activationMetric = {
  version: 1,
  owner: "activation",
  producerContract: ACTIVATION_PRODUCER_CONTRACT_VERSION,
  consumerContract: "ACT-RECEIPT-COHORT-CONSUMER-v1",
  permittedSurfaces: ["workspace"],
  retentionDays: 180,
  deletionBehavior: "activation_lifecycle",
  providerDeletionBehavior: "not_applicable",
} as const;

export const BETA_TELEMETRY_METRICS: readonly BetaTelemetryMetric[] = [
  {
    ...activationMetric,
    id: "beta.activation.invite_to_project",
    decision: "Measure whether invited beta users create a first project.",
    consentBasis: "authenticated_operation",
    denominator: "distinct accepted invites in the cohort",
  },
  {
    ...activationMetric,
    id: "beta.activation.project_to_priced_row",
    decision: "Measure whether new projects reach a first priced estimate row.",
    consentBasis: "authenticated_operation",
    denominator: "distinct cohort projects created during the measurement window",
  },
] as const;

export type BetaTelemetryInput = {
  availability: BetaTelemetryAvailability;
  consentGranted: boolean;
  population: BetaTelemetryPopulation;
  surface: "landing" | "workspace" | "share" | "recipient";
  isProduction: boolean;
};

export type BetaTelemetryRuntime = {
  nodeEnv: string | undefined;
  enabled: string | undefined;
};

export function isBetaTelemetryProductionEnabled(runtime: BetaTelemetryRuntime) {
  return runtime.nodeEnv === "production" && runtime.enabled === "true";
}

export function getBetaTelemetryMetric(metricId: string) {
  return BETA_TELEMETRY_METRICS.find((metric) => metric.id === metricId) ?? null;
}

export function canRecordBetaTelemetry(metricId: string, input: BetaTelemetryInput) {
  const metric = getBetaTelemetryMetric(metricId);

  if (!metric || input.availability !== "available" || !input.isProduction) return false;
  if (input.population !== "production") return false;
  if (!metric.permittedSurfaces.includes(input.surface as "landing" | "workspace")) return false;
  return metric.consentBasis !== "analytics_opt_in" || input.consentGranted;
}
