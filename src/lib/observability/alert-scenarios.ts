export const ALERT_SCENARIO_IDS = ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07"] as const;

export type AlertScenarioId = (typeof ALERT_SCENARIO_IDS)[number];
export type AlertScenarioSeverity = "critical" | "high" | "medium";
export type AlertScenarioProofStatus = "implemented" | "planned";

export type AlertScenario = {
  id: AlertScenarioId;
  slug: string;
  label: string;
  severity: AlertScenarioSeverity;
  ownerRole: string;
  signalSource: string;
  primaryChannels: readonly string[];
  detectionLatencyTarget: string;
  detectionLatencyTargetMinutes: number;
  deliveryLatencyTarget: string;
  deliveryLatencyTargetMinutes: number;
  evaluator: string;
  fixture: string;
  runs: number;
  regressionThreshold: string;
  rollbackTrigger: string;
  proof: {
    status: AlertScenarioProofStatus;
    command: string;
    artifact: string;
    providerBackedRequiredForLaunch: boolean;
  };
  freeTier: {
    paidAddOnRequired: false;
    note: string;
  };
};

export type AlertScenarioCatalogValidation = {
  expectedIds: readonly AlertScenarioId[];
  scenarioCount: number;
  missingIds: AlertScenarioId[];
  duplicateIds: string[];
  duplicateSlugs: string[];
  implementedProofCount: number;
  plannedProofCount: number;
  providerBackedLaunchRequiredCount: number;
  catalogReady: boolean;
  missing: string[];
};

export const ALERT_SCENARIOS = [
  {
    id: "S-01",
    slug: "uptime",
    label: "Uptime",
    severity: "critical",
    ownerRole: "Launch Ops / Alerts",
    signalSource: "external probe",
    primaryChannels: ["ops webhook", "support inbox"],
    detectionLatencyTarget: "<=5 min",
    detectionLatencyTargetMinutes: 5,
    deliveryLatencyTarget: "<=10 min",
    deliveryLatencyTargetMinutes: 10,
    evaluator: "uptime-probe receipt timestamps",
    fixture: "1 synthetic down",
    runs: 10,
    regressionThreshold: "p95 > 15 min",
    rollbackTrigger: "switch to dashboard-manual observation",
    proof: {
      status: "implemented",
      command: "bun run ops:verify-observability-alert -- --scenario uptime",
      artifact: "uptime-alert-delivery-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Uses the existing explicitly gated webhook proof path; no paid Cloudflare add-on is required by the catalog.",
    },
  },
  {
    id: "S-02",
    slug: "error-rate",
    label: "Error-rate",
    severity: "critical",
    ownerRole: "Launch Ops / Alerts",
    signalSource: "GraphQL poll",
    primaryChannels: ["ops webhook", "support inbox"],
    detectionLatencyTarget: "<= poll interval (default 5 min)",
    detectionLatencyTargetMinutes: 5,
    deliveryLatencyTarget: "<=10 min",
    deliveryLatencyTargetMinutes: 10,
    evaluator: "verify-error-rate-alert-delivery.ts end-to-end",
    fixture: "seeded synthetic_test_error via emit-test-log.mjs",
    runs: 5,
    regressionThreshold: "ack > 15 min",
    rollbackTrigger: "lower threshold / shorten interval",
    proof: {
      status: "implemented",
      command: "bun run ops:verify-observability-alert -- --scenario error-rate",
      artifact: "error-rate-alert-delivery-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Assumes a free external poller or existing automation host; the catalog does not enable paid Cloudflare analytics or Logpush.",
    },
  },
  {
    id: "S-03",
    slug: "upload-backpressure",
    label: "Upload backpressure",
    severity: "high",
    ownerRole: "Upload Ops / Alerts",
    signalSource: "existing upload webhook",
    primaryChannels: ["upload-ops webhook"],
    detectionLatencyTarget: "immediate (event-driven)",
    detectionLatencyTargetMinutes: 1,
    deliveryLatencyTarget: "<=30 s",
    deliveryLatencyTargetMinutes: 1,
    evaluator: "verify-upload-alert-delivery.ts",
    fixture: "1 synthetic upload operational alert",
    runs: 5,
    regressionThreshold: "ack > 60 s",
    rollbackTrigger: "n/a (existing)",
    proof: {
      status: "implemented",
      command: "bun run scripts/verify-upload-alert-delivery.ts",
      artifact: "upload-alert-delivery-production-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Reuses the existing upload operations webhook path and hosted upload proof artifact.",
    },
  },
  {
    id: "S-04",
    slug: "queue-dlq",
    label: "Queue DLQ",
    severity: "high",
    ownerRole: "Launch Ops / Queues",
    signalSource: "queue depth poll",
    primaryChannels: ["ops webhook", "support inbox"],
    detectionLatencyTarget: "<= poll interval",
    detectionLatencyTargetMinutes: 5,
    deliveryLatencyTarget: "<=10 min",
    deliveryLatencyTargetMinutes: 10,
    evaluator: "verify-observability-alert-delivery.ts --scenario queue-dlq",
    fixture: "1 seeded DLQ message",
    runs: 3,
    regressionThreshold: "ack > 15 min",
    rollbackTrigger: "manual dashboard",
    proof: {
      status: "implemented",
      command: "bun run ops:verify-observability-alert -- --scenario queue-dlq",
      artifact: "queue-dlq-alert-delivery-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Expected to poll the existing free-tier Cloudflare Queue/DLQ state without enabling paid add-ons.",
    },
  },
  {
    id: "S-05",
    slug: "cron-failure",
    label: "Cron failure",
    severity: "critical",
    ownerRole: "Launch Ops / Cron",
    signalSource: "cron summary log",
    primaryChannels: ["ops webhook", "support inbox"],
    detectionLatencyTarget: "<= next poll after cron",
    detectionLatencyTargetMinutes: 15,
    deliveryLatencyTarget: "<=15 min",
    deliveryLatencyTargetMinutes: 15,
    evaluator: "verify-observability-alert-delivery.ts --scenario cron-failure",
    fixture: "forced ok:false",
    runs: 3,
    regressionThreshold: "ack > 30 min",
    rollbackTrigger: "wrangler tail manual",
    proof: {
      status: "implemented",
      command: "bun run ops:verify-observability-alert -- --scenario cron-failure",
      artifact: "cron-failure-alert-delivery-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Expected to use existing cron summary logs and hosted proof artifacts; no paid scheduled-job service is assumed.",
    },
  },
  {
    id: "S-06",
    slug: "incident-escalation",
    label: "Incident escalation",
    severity: "critical",
    ownerRole: "Launch Ops / Incident Commander",
    signalSource: "human declare",
    primaryChannels: ["ops webhook", "support inbox"],
    detectionLatencyTarget: "immediate",
    detectionLatencyTargetMinutes: 1,
    deliveryLatencyTarget: "<=5 min",
    deliveryLatencyTargetMinutes: 5,
    evaluator: "verify-incident-escalation-alert-delivery.ts",
    fixture: "1 synthetic declare",
    runs: 3,
    regressionThreshold: "ack > 10 min",
    rollbackTrigger: "phone fallback",
    proof: {
      status: "implemented",
      command: "bun run ops:verify-observability-alert -- --scenario incident-escalation",
      artifact: "incident-escalation-alert-delivery-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Uses the operational incident alert payload sanitizer and the existing explicitly gated proof script.",
    },
  },
  {
    id: "S-07",
    slug: "retention-failure",
    label: "Retention failure",
    severity: "medium",
    ownerRole: "Launch Ops / Compliance",
    signalSource: "cron summary / data_retention_events",
    primaryChannels: ["ops webhook", "support inbox"],
    detectionLatencyTarget: "<= next poll",
    detectionLatencyTargetMinutes: 15,
    deliveryLatencyTarget: "<=15 min",
    deliveryLatencyTargetMinutes: 15,
    evaluator: "verify-observability-alert-delivery.ts --scenario retention-failure",
    fixture: "forced budget_reached abnormal",
    runs: 3,
    regressionThreshold: "ack > 30 min",
    rollbackTrigger: "manual",
    proof: {
      status: "implemented",
      command: "bun run ops:verify-observability-alert -- --scenario retention-failure",
      artifact: "retention-failure-alert-delivery-proof.json",
      providerBackedRequiredForLaunch: true,
    },
    freeTier: {
      paidAddOnRequired: false,
      note: "Expected to use existing D1 retention events and cron summaries; no paid log export is assumed.",
    },
  },
] as const satisfies readonly AlertScenario[];

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function nonEmpty(value: string) {
  return value.trim().length > 0;
}

export function validateAlertScenarioCatalog(
  scenarios: readonly AlertScenario[] = ALERT_SCENARIOS,
): AlertScenarioCatalogValidation {
  const scenarioIds = scenarios.map((scenario) => scenario.id);
  const scenarioSlugs = scenarios.map((scenario) => scenario.slug);
  const missingIds = ALERT_SCENARIO_IDS.filter((id) => !scenarioIds.includes(id));
  const duplicateIds = duplicateValues(scenarioIds);
  const duplicateSlugs = duplicateValues(scenarioSlugs);
  const implementedProofCount = scenarios.filter((scenario) => scenario.proof.status === "implemented").length;
  const plannedProofCount = scenarios.filter((scenario) => scenario.proof.status === "planned").length;
  const providerBackedLaunchRequiredCount = scenarios
    .filter((scenario) => scenario.proof.providerBackedRequiredForLaunch)
    .length;

  const missing = [
    scenarios.length !== ALERT_SCENARIO_IDS.length ? `expected ${ALERT_SCENARIO_IDS.length} scenarios` : null,
    ...missingIds.map((id) => `missing scenario ${id}`),
    ...duplicateIds.map((id) => `duplicate scenario id ${id}`),
    ...duplicateSlugs.map((slug) => `duplicate scenario slug ${slug}`),
    ...scenarios.flatMap((scenario) => [
      !ALERT_SCENARIO_IDS.includes(scenario.id) ? `${scenario.id}: expected scenario id` : null,
      !nonEmpty(scenario.slug) ? `${scenario.id}: slug` : null,
      !nonEmpty(scenario.label) ? `${scenario.id}: label` : null,
      !nonEmpty(scenario.ownerRole) ? `${scenario.id}: owner role` : null,
      !nonEmpty(scenario.signalSource) ? `${scenario.id}: signal source` : null,
      scenario.primaryChannels.length === 0 ? `${scenario.id}: primary channel` : null,
      scenario.primaryChannels.some((channel) => !nonEmpty(channel)) ? `${scenario.id}: primary channel label` : null,
      !nonEmpty(scenario.detectionLatencyTarget) ? `${scenario.id}: detection latency target` : null,
      scenario.detectionLatencyTargetMinutes <= 0 ? `${scenario.id}: detection latency minutes` : null,
      !nonEmpty(scenario.deliveryLatencyTarget) ? `${scenario.id}: delivery latency target` : null,
      scenario.deliveryLatencyTargetMinutes <= 0 ? `${scenario.id}: delivery latency minutes` : null,
      !nonEmpty(scenario.evaluator) ? `${scenario.id}: evaluator` : null,
      !nonEmpty(scenario.fixture) ? `${scenario.id}: fixture` : null,
      scenario.runs <= 0 ? `${scenario.id}: runs` : null,
      !nonEmpty(scenario.regressionThreshold) ? `${scenario.id}: regression threshold` : null,
      !nonEmpty(scenario.rollbackTrigger) ? `${scenario.id}: rollback trigger` : null,
      !nonEmpty(scenario.proof.command) ? `${scenario.id}: proof command` : null,
      !nonEmpty(scenario.proof.artifact) ? `${scenario.id}: proof artifact` : null,
      scenario.freeTier.paidAddOnRequired !== false ? `${scenario.id}: free-tier no-paid-add-on stance` : null,
      !nonEmpty(scenario.freeTier.note) ? `${scenario.id}: free-tier note` : null,
    ]),
  ].filter((value): value is string => Boolean(value));

  return {
    expectedIds: ALERT_SCENARIO_IDS,
    scenarioCount: scenarios.length,
    missingIds,
    duplicateIds,
    duplicateSlugs,
    implementedProofCount,
    plannedProofCount,
    providerBackedLaunchRequiredCount,
    catalogReady: missing.length === 0,
    missing,
  };
}

export function alertScenarioLaunchBlockers(
  scenarios: readonly AlertScenario[] = ALERT_SCENARIOS,
) {
  return scenarios
    .filter((scenario) => scenario.proof.providerBackedRequiredForLaunch && scenario.proof.status !== "implemented")
    .map((scenario) => `${scenario.id}:${scenario.slug}: provider-backed proof producer is ${scenario.proof.status}`);
}
