#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type HostedRouteProof = {
  baseUrl?: string | null;
};

type SecretInput = {
  name: "CRON_SECRET";
  present: boolean;
  source: string | null;
};

type JobsProofEndpointBody = {
  generatedAt?: string;
  mode?: string;
  endpointProofScope?: string;
  proofId?: string;
  queue?: string;
  proofReceiptKey?: string;
  result?: {
    queueSendReady?: boolean;
    queueConsumerReceiptReady?: boolean;
    cronProviderExecutionProven?: boolean;
    consumerOutcome?: {
      action?: string;
      reason?: string;
      attempts?: number;
      deadLetterExpected?: boolean;
      executedCount?: number;
      skippedCount?: number;
      error?: string | null;
    } | null;
    queueLatency?: QueueLatencyEndpointResult;
  };
  queueLatency?: QueueLatencyEndpointResult;
  readiness?: {
    providerBacked?: boolean;
    queueSendReady?: boolean;
    queueConsumerReceiptReady?: boolean;
    cronProviderExecutionProven?: boolean;
    productionJobsMessagingReady?: boolean;
  };
  blockers?: string[];
  error?: string;
};

type QueueLatencyEndpointResult = {
  requestedAt?: string | null;
  receiptGeneratedAt?: string | null;
  latencyMs?: number | null;
  p95Ms?: number | null;
  sampleCount?: number;
  samples?: number[];
};

type QueueLatencyReport = {
  sampleCount: number;
  p95Ms: number | null;
  samplesMs: number[];
  latestRequestedAt: string | null;
  latestReceiptGeneratedAt: string | null;
};

type CloudflareJobsRuntimeProofReport = {
  generatedAt: string;
  mode: "cloudflare-jobs-runtime-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/__cloudflare/jobs-proof";
  providerBacked: boolean;
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofScope: string | null;
  proofId: string | null;
  queue: string | null;
  proofReceiptKey: string | null;
  result: JobsProofEndpointBody["result"] | null;
  queueLatency: QueueLatencyReport;
  readiness: {
    providerBacked: boolean;
    queueSendReady: boolean;
    queueConsumerReceiptReady: boolean;
    cronProviderExecutionProven: boolean;
    productionJobsMessagingReady: boolean;
    productionCutoverReady: false;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_HOSTED_ROUTE_PROOF_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-hosted-route-proof.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-jobs-runtime-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-01-cloudflare-jobs-runtime-proof.md`;
const ENDPOINT_PATH = "/__cloudflare/jobs-proof" as const;
const NOTE =
  "Calls the deployed proof Worker jobs-proof endpoint with a local bearer secret, then records sanitized Queue send, consumer receipt, queue latency, and scheduled dry-run execution evidence. It does not print secret values, change DNS, delete resources, disable Vercel fallback, or make production cutover ready.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed;
}

function readEnvAssignment(file: string, name: string) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match?.[1] === name) return unquoteEnvValue(match[2]);
  }
  return null;
}

function loadSecretInput(envFiles: string[]): { secret: string | null; input: SecretInput } {
  const fromEnv = readEnv("CRON_SECRET");
  if (fromEnv) return { secret: fromEnv, input: { name: "CRON_SECRET", present: true, source: "process.env" } };

  for (const file of envFiles) {
    const value = readEnvAssignment(file, "CRON_SECRET");
    if (value?.trim()) return { secret: value, input: { name: "CRON_SECRET", present: true, source: file } };
  }

  return { secret: null, input: { name: "CRON_SECRET", present: false, source: null } };
}

function normalizeBaseUrl(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return null;
  const url = new URL(raw.replace(/\/+$/, ""));
  if (url.protocol !== "https:") throw new Error("Cloudflare jobs proof base URL must use HTTPS.");
  return url.origin;
}

function readHostedRouteBaseUrl(source: string) {
  if (!existsSync(source)) return null;
  const report = JSON.parse(readFileSync(source, "utf8")) as HostedRouteProof;
  return normalizeBaseUrl(report.baseUrl);
}

function chooseBaseUrl(hostedRouteProofFile: string) {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_JOBS_PROOF_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_WORKER_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_ROUTE_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL")
      ?? readHostedRouteBaseUrl(hostedRouteProofFile),
  );
}

function readSampleCount() {
  const parsed = Number.parseInt(readEnv("CLOUDFLARE_JOBS_PROOF_SAMPLE_COUNT") ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 20);
}

function percentile(values: number[], percentileRank: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileRank) - 1));
  return sorted[index];
}

function emptyQueueLatencyReport(): QueueLatencyReport {
  return {
    sampleCount: 0,
    p95Ms: null,
    samplesMs: [],
    latestRequestedAt: null,
    latestReceiptGeneratedAt: null,
  };
}

function endpointQueueLatency(body: JobsProofEndpointBody): QueueLatencyEndpointResult | null {
  return body.result?.queueLatency ?? body.queueLatency ?? null;
}

function summarizeQueueLatency(bodies: JobsProofEndpointBody[]): QueueLatencyReport {
  const latencies = bodies
    .map((body) => endpointQueueLatency(body)?.latencyMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const latest = [...bodies].reverse().find((body) => endpointQueueLatency(body));
  const latestLatency = latest ? endpointQueueLatency(latest) : null;
  return {
    sampleCount: latencies.length,
    p95Ms: percentile(latencies, 0.95),
    samplesMs: latencies,
    latestRequestedAt: latestLatency?.requestedAt ?? null,
    latestReceiptGeneratedAt: latestLatency?.receiptGeneratedAt ?? null,
  };
}

function notReadyReport(input: {
  baseUrl: string | null;
  secretInput: SecretInput;
  blockers: string[];
}): CloudflareJobsRuntimeProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-jobs-runtime-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    providerBacked: Boolean(input.baseUrl),
    secretInput: input.secretInput,
    responseStatus: null,
    responseOk: false,
    endpointMode: null,
    endpointProofScope: null,
    proofId: null,
    queue: null,
    proofReceiptKey: null,
    result: null,
    queueLatency: emptyQueueLatencyReport(),
    readiness: {
      providerBacked: Boolean(input.baseUrl),
      queueSendReady: false,
      queueConsumerReceiptReady: false,
      cronProviderExecutionProven: false,
      productionJobsMessagingReady: false,
      productionCutoverReady: false,
    },
    blockers: input.blockers,
    note: NOTE,
  };
}

type EndpointProofResult = {
  response: Response;
  body: JobsProofEndpointBody;
};

async function pollProof(input: {
  baseUrl: string;
  proofId: string;
  secret: string;
  fetchImpl: typeof fetch;
}): Promise<EndpointProofResult | null> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await input.fetchImpl(`${input.baseUrl}${ENDPOINT_PATH}?id=${encodeURIComponent(input.proofId)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${input.secret}`,
      },
    });
    const body = await response.json().catch(() => null) as JobsProofEndpointBody | null;
    if (response.ok && body?.readiness?.productionJobsMessagingReady === true) {
      return { response, body };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  return null;
}

async function requestProofSample(input: {
  baseUrl: string;
  secret: string;
  fetchImpl: typeof fetch;
}): Promise<EndpointProofResult> {
  let response = await input.fetchImpl(`${input.baseUrl}${ENDPOINT_PATH}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${input.secret}`,
    },
  });
  let body = await response.json().catch(() => ({ error: "non_json_response" })) as JobsProofEndpointBody;

  if (response.status === 202 && body.proofId) {
    const polled = await pollProof({
      baseUrl: input.baseUrl,
      proofId: body.proofId,
      secret: input.secret,
      fetchImpl: input.fetchImpl,
    });
    if (polled) {
      response = polled.response;
      body = polled.body;
    }
  }

  return { response, body };
}

export async function buildReport(input: {
  baseUrl: string | null;
  secret: string | null;
  secretInput: SecretInput;
  fetchImpl?: typeof fetch;
  sampleCount?: number;
}): Promise<CloudflareJobsRuntimeProofReport> {
  const blockers: string[] = [];
  if (!input.baseUrl) blockers.push("No HTTPS deployed Worker base URL is configured or present in hosted route proof evidence.");
  if (!input.secret) blockers.push("CRON_SECRET is missing from process.env or configured local env files.");
  if (blockers.length > 0) return notReadyReport({ baseUrl: input.baseUrl, secretInput: input.secretInput, blockers });

  const fetchImpl = input.fetchImpl ?? fetch;
  const requestedSampleCount = Math.min(Math.max(input.sampleCount ?? 1, 1), 20);
  const samples: EndpointProofResult[] = [];

  for (let sampleIndex = 0; sampleIndex < requestedSampleCount; sampleIndex += 1) {
    samples.push(await requestProofSample({
      baseUrl: input.baseUrl,
      secret: input.secret,
      fetchImpl,
    }));
  }

  const lastSample = samples[samples.length - 1];
  if (!lastSample) {
    return notReadyReport({
      baseUrl: input.baseUrl,
      secretInput: input.secretInput,
      blockers: ["No Cloudflare jobs proof samples were requested."],
    });
  }
  const { response, body } = lastSample;
  const bodies = samples.map((sample) => sample.body);
  const result = body.result ?? null;
  const queueLatency = summarizeQueueLatency(bodies);
  const queueSendReady = samples.every((sample) => sample.body.readiness?.queueSendReady === true);
  const queueConsumerReceiptReady = samples.every((sample) => sample.body.readiness?.queueConsumerReceiptReady === true);
  const cronProviderExecutionProven = samples.every((sample) =>
    sample.body.readiness?.cronProviderExecutionProven === true
  );
  const productionJobsMessagingReady = samples.every((sample) => sample.response.ok)
    && queueSendReady
    && queueConsumerReceiptReady
    && cronProviderExecutionProven
    && samples.every((sample) => sample.body.readiness?.productionJobsMessagingReady === true);

  for (const sample of samples) {
    if (!sample.response.ok) blockers.push(`Jobs proof endpoint returned HTTP ${sample.response.status}.`);
  }
  if (!queueSendReady) blockers.push("Cloudflare Queue provider send did not pass.");
  if (!queueConsumerReceiptReady) blockers.push("Cloudflare Queue consumer receipt did not appear in R2.");
  if (!cronProviderExecutionProven) blockers.push("Cloudflare scheduled dry-run execution was not provider-proven.");
  if (queueLatency.sampleCount < requestedSampleCount) {
    blockers.push("Cloudflare Queue latency sample was not exposed for every requested proof sample.");
  }
  for (const sampleBody of bodies) {
    for (const blocker of sampleBody.blockers ?? []) {
      if (!blockers.includes(blocker)) blockers.push(blocker);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-jobs-runtime-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    providerBacked: true,
    secretInput: input.secretInput,
    responseStatus: response.status,
    responseOk: response.ok,
    endpointMode: body.mode ?? null,
    endpointProofScope: body.endpointProofScope ?? null,
    proofId: body.proofId ?? null,
    queue: body.queue ?? null,
    proofReceiptKey: body.proofReceiptKey ?? null,
    result,
    queueLatency,
    readiness: {
      providerBacked: true,
      queueSendReady,
      queueConsumerReceiptReady,
      cronProviderExecutionProven,
      productionJobsMessagingReady,
      productionCutoverReady: false,
    },
    blockers,
    note: NOTE,
  };
}

function writeOutput(report: CloudflareJobsRuntimeProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: CloudflareJobsRuntimeProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const outcome = report.result?.consumerOutcome;
  const lines = [
    "# Cloudflare Jobs Runtime Proof",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl ?? "(missing)"}`,
    `Endpoint: ${report.endpointPath}`,
    `Provider backed: ${report.providerBacked ? "yes" : "no"}`,
    `Response status: ${report.responseStatus ?? "(none)"}`,
    `Secret input present: ${report.secretInput.present ? "yes" : "no"}`,
    `Secret input source: ${report.secretInput.source ?? "(none)"}`,
    "",
    report.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Queue provider send | ${report.readiness.queueSendReady ? "yes" : "no"} |`,
    `| Queue consumer receipt | ${report.readiness.queueConsumerReceiptReady ? "yes" : "no"} |`,
    `| Cron dry-run provider execution | ${report.readiness.cronProviderExecutionProven ? "yes" : "no"} |`,
    `| Production jobs messaging | ${report.readiness.productionJobsMessagingReady ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- Proof id: ${report.proofId ?? "(none)"}`,
    `- Queue: ${report.queue ?? "(none)"}`,
    `- Receipt key: ${report.proofReceiptKey ?? "(none)"}`,
    `- Consumer action: ${outcome?.action ?? "(none)"}`,
    `- Consumer reason: ${outcome?.reason ?? "(none)"}`,
    `- Consumer attempts: ${outcome?.attempts ?? "(none)"}`,
    `- Executed count: ${outcome?.executedCount ?? "(none)"}`,
    `- Skipped count: ${outcome?.skippedCount ?? "(none)"}`,
    `- Consumer error: ${outcome?.error ?? "(none)"}`,
    `- Queue latency sample count: ${report.queueLatency.sampleCount}`,
    `- Queue latency p95: ${report.queueLatency.p95Ms === null ? "(none)" : `${report.queueLatency.p95Ms} ms`}`,
    `- Latest queue requested at: ${report.queueLatency.latestRequestedAt ?? "(none)"}`,
    `- Latest queue receipt generated at: ${report.queueLatency.latestReceiptGeneratedAt ?? "(none)"}`,
    `- Queue latency samples ms: ${report.queueLatency.samplesMs.length > 0 ? report.queueLatency.samplesMs.join(", ") : "(none)"}`,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const envFiles = (readEnv("CLOUDFLARE_JOBS_PROOF_ENV_FILES")?.split(",").map((item) => item.trim()).filter(Boolean)
    ?? [".env.local", ".dev.vars"]);
  const hostedRouteProofFile = readEnv("CLOUDFLARE_HOSTED_ROUTE_PROOF_FILE") ?? DEFAULT_HOSTED_ROUTE_PROOF_FILE;
  const outputFile = readEnv("CLOUDFLARE_JOBS_RUNTIME_PROOF_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("CLOUDFLARE_JOBS_RUNTIME_PROOF_MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const baseUrl = chooseBaseUrl(hostedRouteProofFile);
  const { secret, input } = loadSecretInput(envFiles);
  const report = await buildReport({ baseUrl, secret, secretInput: input, sampleCount: readSampleCount() });

  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.productionJobsMessagingReady) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
