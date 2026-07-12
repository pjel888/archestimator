import "server-only";

import { BETA_TELEMETRY_REGISTRY_VERSION } from "@/lib/landing/beta-telemetry-registry";
import { isPlatformAdminRole, type AppPlatformRole, type WorkspaceAccountRole } from "@/lib/auth/roles";

export const BETA_OPERATING_OVERVIEW_VERSION = "BETA-OPERATING-OVERVIEW-v1" as const;
export const ACTIVATION_COHORT_CONSUMER_CONTRACT = "ACT-RECEIPT-COHORT-CONSUMER-v1" as const;

export type BetaOperatingAvailability = "available" | "partial" | "stale" | "unavailable" | "error" | "denied";
export type BetaOperatingSource = "activation" | "feedback" | "support" | "incidents" | "recovery" | "release";
export type BetaOperatingMetricId =
  | "cohort.invited"
  | "cohort.accepted"
  | "cohort.active"
  | "activation.first_project"
  | "activation.first_priced_row"
  | "feedback.open"
  | "support.open"
  | "incidents.open"
  | "recovery.ready"
  | "release.ready";

export type BetaOperatingSourceSnapshot = {
  availability: Exclude<BetaOperatingAvailability, "denied">;
  asOf: string | null;
  errorCategory: "source_unavailable" | "source_failed" | "source_denied" | null;
  aggregates: Readonly<Record<string, number | boolean | undefined>>;
  fields?: Readonly<Record<string, BetaOperatingFieldSnapshot>>;
};

export type BetaOperatingFieldSnapshot = {
  availability: Exclude<BetaOperatingAvailability, "denied">;
  asOf: string | null;
  errorCategory: BetaOperatingSourceSnapshot["errorCategory"];
  value: number | boolean | undefined;
};

export type BetaOperatingOverviewInput = {
  actor: {
    platformRole: AppPlatformRole;
    corporateAccountRole?: WorkspaceAccountRole | null;
  };
  sources: Partial<Record<BetaOperatingSource, BetaOperatingSourceSnapshot>>;
  now?: Date;
  staleAfterMs?: number;
};

export type BetaOperatingMetric = {
  id: BetaOperatingMetricId;
  value: number | boolean | null;
  source: BetaOperatingSource;
  asOf: string | null;
  availability: BetaOperatingAvailability;
  errorCategory: BetaOperatingSourceSnapshot["errorCategory"];
  nextAction: string;
};

export type BetaOperatingOverview = {
  schemaVersion: typeof BETA_OPERATING_OVERVIEW_VERSION;
  authorized: boolean;
  telemetryRegistryVersion: typeof BETA_TELEMETRY_REGISTRY_VERSION;
  activationConsumerContract: typeof ACTIVATION_COHORT_CONSUMER_CONTRACT;
  metrics: BetaOperatingMetric[];
};

type MetricDefinition = {
  id: BetaOperatingMetricId;
  source: BetaOperatingSource;
  aggregateKey: string;
  nextAction: string;
};

const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  { id: "cohort.invited", source: "activation", aggregateKey: "invited", nextAction: "Inspect the activation cohort receipt." },
  { id: "cohort.accepted", source: "activation", aggregateKey: "accepted", nextAction: "Inspect invite acceptance receipts." },
  { id: "cohort.active", source: "activation", aggregateKey: "active", nextAction: "Inspect the active-cohort receipt." },
  { id: "activation.first_project", source: "activation", aggregateKey: "firstProject", nextAction: "Inspect the first-project activation funnel." },
  { id: "activation.first_priced_row", source: "activation", aggregateKey: "firstPricedRow", nextAction: "Inspect the priced-row activation funnel." },
  { id: "feedback.open", source: "feedback", aggregateKey: "open", nextAction: "Open the authorized feedback queue." },
  { id: "support.open", source: "support", aggregateKey: "open", nextAction: "Open the authorized support queue." },
  { id: "incidents.open", source: "incidents", aggregateKey: "open", nextAction: "Inspect the incident response record." },
  { id: "recovery.ready", source: "recovery", aggregateKey: "ready", nextAction: "Inspect the recovery readiness receipt." },
  { id: "release.ready", source: "release", aggregateKey: "ready", nextAction: "Inspect the release truth artifact." },
];

function unavailableMetric(definition: MetricDefinition, source: BetaOperatingSourceSnapshot | undefined): BetaOperatingMetric {
  return {
    id: definition.id,
    value: null,
    source: definition.source,
    asOf: source?.asOf ?? null,
    availability: source?.availability === "error" ? "error" : source?.availability === "partial" ? "partial" : "unavailable",
    errorCategory: source?.errorCategory ?? "source_unavailable",
    nextAction: definition.nextAction,
  };
}

function sourceAvailability(source: BetaOperatingSourceSnapshot, now: Date, staleAfterMs: number): BetaOperatingAvailability {
  if (source.availability === "unavailable" || source.availability === "error") return source.availability;
  if (!source.asOf || !Number.isFinite(Date.parse(source.asOf))) return "unavailable";
  if (now.getTime() - Date.parse(source.asOf) > staleAfterMs) return "stale";
  return source.availability;
}

function metricFromSource(definition: MetricDefinition, source: BetaOperatingSourceSnapshot | undefined, now: Date, staleAfterMs: number): BetaOperatingMetric {
  if (!source) return unavailableMetric(definition, source);
  const field = source.fields?.[definition.aggregateKey];
  const metricSource = field
    ? { availability: field.availability, asOf: field.asOf, errorCategory: field.errorCategory, aggregates: { value: field.value } }
    : source;
  const availability = sourceAvailability(metricSource, now, staleAfterMs);
  const value = field ? field.value : source.aggregates[definition.aggregateKey];
  if (availability === "unavailable" || availability === "error" || value === undefined) return unavailableMetric(definition, metricSource);
  if (typeof value !== "number" && typeof value !== "boolean") return unavailableMetric(definition, metricSource);
  return {
    id: definition.id,
    value,
    source: definition.source,
    asOf: metricSource.asOf,
    availability,
    errorCategory: metricSource.errorCategory,
    nextAction: definition.nextAction,
  };
}

export function buildBetaOperatingOverview(input: BetaOperatingOverviewInput): BetaOperatingOverview {
  const authorized = isPlatformAdminRole(input.actor.platformRole);
  if (!authorized) {
    return {
      schemaVersion: BETA_OPERATING_OVERVIEW_VERSION,
      authorized: false,
      telemetryRegistryVersion: BETA_TELEMETRY_REGISTRY_VERSION,
      activationConsumerContract: ACTIVATION_COHORT_CONSUMER_CONTRACT,
      metrics: [],
    };
  }

  const now = input.now ?? new Date();
  const staleAfterMs = input.staleAfterMs ?? 15 * 60 * 1000;
  if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs <= 0) throw new Error("Beta operating overview requires a positive stale window.");
  return {
    schemaVersion: BETA_OPERATING_OVERVIEW_VERSION,
    authorized: true,
    telemetryRegistryVersion: BETA_TELEMETRY_REGISTRY_VERSION,
    activationConsumerContract: ACTIVATION_COHORT_CONSUMER_CONTRACT,
    metrics: METRIC_DEFINITIONS.map((definition) => metricFromSource(definition, input.sources[definition.source], now, staleAfterMs)),
  };
}
