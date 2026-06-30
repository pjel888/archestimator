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

type D1RuntimeProofEndpointBody = {
  mode?: string;
  endpointProofScope?: string;
  providerBacked?: boolean;
  result?: {
    d1BindingPresent?: boolean;
    schemaReady?: boolean;
    seedReady?: boolean;
    cleanupReady?: boolean;
    rowsSeeded?: number;
    rowsCleaned?: number | null;
    benchmarkSurfaces?: number;
    benchmarkRows?: Array<{
      surface?: string;
      queryBudget?: number;
      plannedQueries?: number;
      hostedBudgetMs?: number;
      hostedP95Ms?: number;
      sampleCount?: number;
      rowsReturned?: number;
      status?: string;
      notes?: string;
    }>;
    error?: string | null;
  };
  readiness?: {
    providerBacked?: boolean;
    queryCountBudgetsReady?: boolean;
    hostedP95Ready?: boolean;
    hostedWorkerD1PerformanceReady?: boolean;
    d1RuntimeProofReady?: boolean;
    productionCutoverReady?: boolean;
  };
  blockers?: string[];
  note?: string;
  error?: string;
};

type CloudflareD1RuntimePerformanceProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-runtime-performance-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/__cloudflare/d1-performance-proof";
  providerBacked: boolean;
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofScope: string | null;
  result: D1RuntimeProofEndpointBody["result"] | null;
  readiness: {
    queryCountBudgetsReady: boolean;
    hostedP95Ready: boolean;
    hostedWorkerD1PerformanceReady: boolean;
    d1RuntimeProofReady: boolean;
    productionCutoverReady: false;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_HOSTED_ROUTE_PROOF_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-hosted-route-proof.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-d1-runtime-performance-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-d1-runtime-performance-proof.md`;
const ENDPOINT_PATH = "/__cloudflare/d1-performance-proof" as const;
const NOTE =
  "Calls the deployed proof Worker D1 performance endpoint with a local bearer secret, then records sanitized provider behavior: D1 binding/schema/seed/cleanup readiness and hosted indexed query p95/query-count proof. It does not print secret values, deploy Workers, change DNS, purchase plans, delete provider resources, or make production cutover ready.";

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
  if (fromEnv) {
    return {
      secret: fromEnv,
      input: { name: "CRON_SECRET", present: true, source: "process.env" },
    };
  }

  for (const file of envFiles) {
    const value = readEnvAssignment(file, "CRON_SECRET");
    if (value?.trim()) {
      return {
        secret: value,
        input: { name: "CRON_SECRET", present: true, source: file },
      };
    }
  }

  return {
    secret: null,
    input: { name: "CRON_SECRET", present: false, source: null },
  };
}

function normalizeBaseUrl(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return null;
  const url = new URL(raw.replace(/\/+$/, ""));
  if (url.protocol !== "https:") throw new Error("Cloudflare D1 performance proof base URL must use HTTPS.");
  return url.origin;
}

function readHostedRouteBaseUrl(source: string) {
  if (!existsSync(source)) return null;
  const report = JSON.parse(readFileSync(source, "utf8")) as HostedRouteProof;
  return normalizeBaseUrl(report.baseUrl);
}

function chooseBaseUrl(hostedRouteProofFile: string) {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_D1_RUNTIME_PERFORMANCE_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_WORKER_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_ROUTE_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL")
      ?? readHostedRouteBaseUrl(hostedRouteProofFile),
  );
}

function notReadyReport(input: {
  baseUrl: string | null;
  secretInput: SecretInput;
  blockers: string[];
}): CloudflareD1RuntimePerformanceProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-d1-runtime-performance-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    providerBacked: Boolean(input.baseUrl),
    secretInput: input.secretInput,
    responseStatus: null,
    responseOk: false,
    endpointMode: null,
    endpointProofScope: null,
    result: null,
    readiness: {
      queryCountBudgetsReady: false,
      hostedP95Ready: false,
      hostedWorkerD1PerformanceReady: false,
      d1RuntimeProofReady: false,
      productionCutoverReady: false,
    },
    blockers: input.blockers,
    note: NOTE,
  };
}

async function buildReport(input: {
  baseUrl: string | null;
  secret: string | null;
  secretInput: SecretInput;
  fetchImpl?: typeof fetch;
}): Promise<CloudflareD1RuntimePerformanceProofReport> {
  const blockers: string[] = [];
  if (!input.baseUrl) blockers.push("No HTTPS deployed Worker base URL is configured or present in hosted route proof evidence.");
  if (!input.secret) blockers.push("CRON_SECRET is missing from process.env or configured local env files.");
  if (blockers.length > 0) return notReadyReport({ baseUrl: input.baseUrl, secretInput: input.secretInput, blockers });

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${input.baseUrl}${ENDPOINT_PATH}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.secret}`,
      accept: "application/json",
    },
  });
  const body = await response.json().catch(() => ({ error: "non_json_response" })) as D1RuntimeProofEndpointBody;
  const readiness = body.readiness ?? {};
  const result = body.result ?? null;
  const queryCountBudgetsReady = readiness.queryCountBudgetsReady === true;
  const hostedP95Ready = readiness.hostedP95Ready === true;
  const hostedWorkerD1PerformanceReady = readiness.hostedWorkerD1PerformanceReady === true;
  const d1RuntimeProofReady = response.ok
    && readiness.d1RuntimeProofReady === true
    && queryCountBudgetsReady
    && hostedP95Ready
    && hostedWorkerD1PerformanceReady;

  if (!response.ok) blockers.push(`D1 performance proof endpoint returned HTTP ${response.status}.`);
  if (!queryCountBudgetsReady) blockers.push("Hosted D1 query-count budgets did not pass.");
  if (!hostedP95Ready) blockers.push("Hosted D1 p95 budgets did not pass.");
  if (!hostedWorkerD1PerformanceReady) blockers.push("Hosted Worker+D1 performance proof did not pass.");
  for (const blocker of body.blockers ?? []) blockers.push(blocker);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-d1-runtime-performance-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    providerBacked: body.providerBacked === true,
    secretInput: input.secretInput,
    responseStatus: response.status,
    responseOk: response.ok,
    endpointMode: body.mode ?? null,
    endpointProofScope: body.endpointProofScope ?? null,
    result,
    readiness: {
      queryCountBudgetsReady,
      hostedP95Ready,
      hostedWorkerD1PerformanceReady,
      d1RuntimeProofReady,
      productionCutoverReady: false,
    },
    blockers: [...new Set(blockers)],
    note: NOTE,
  };
}

function writeOutput(report: CloudflareD1RuntimePerformanceProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: CloudflareD1RuntimePerformanceProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = report.result;
  const rows = result?.benchmarkRows ?? [];
  const benchmarkRows = rows.map((row) => [
    row.surface ?? "",
    `${row.plannedQueries ?? ""}/${row.queryBudget ?? ""}`,
    `${row.hostedP95Ms ?? ""}ms/${row.hostedBudgetMs ?? ""}ms`,
    String(row.sampleCount ?? ""),
    String(row.rowsReturned ?? ""),
    row.status ?? "",
  ]);
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const lines = [
    "# Cloudflare D1 Runtime Performance Proof",
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
    `| Query-count budgets ready | ${report.readiness.queryCountBudgetsReady ? "yes" : "no"} |`,
    `| Hosted p95 budgets ready | ${report.readiness.hostedP95Ready ? "yes" : "no"} |`,
    `| Hosted Worker+D1 performance ready | ${report.readiness.hostedWorkerD1PerformanceReady ? "yes" : "no"} |`,
    `| D1 runtime proof ready | ${report.readiness.d1RuntimeProofReady ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- D1 binding present: ${result?.d1BindingPresent === true ? "yes" : "no"}`,
    `- Schema ready: ${result?.schemaReady === true ? "yes" : "no"}`,
    `- Seed ready: ${result?.seedReady === true ? "yes" : "no"}`,
    `- Cleanup ready: ${result?.cleanupReady === true ? "yes" : "no"}`,
    `- Rows seeded: ${result?.rowsSeeded ?? "(none)"}`,
    `- Rows cleaned: ${result?.rowsCleaned ?? "(none)"}`,
    `- Endpoint error: ${result?.error ?? "(none)"}`,
    "",
    "## Hosted Benchmark",
    "",
    "| Surface | Planned/query budget | Hosted p95/budget | Samples | Rows returned | Status |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...benchmarkRows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`),
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const hostedRouteProofFile = readEnv("CLOUDFLARE_HOSTED_ROUTE_PROOF_FILE") ?? DEFAULT_HOSTED_ROUTE_PROOF_FILE;
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const { secret, input } = loadSecretInput([".dev.vars", ".env.local"]);
  const report = await buildReport({
    baseUrl: chooseBaseUrl(hostedRouteProofFile),
    secret,
    secretInput: input,
  });
  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.d1RuntimeProofReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
