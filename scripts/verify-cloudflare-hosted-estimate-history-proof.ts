#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SecretInput = {
  name: "CRON_SECRET";
  present: boolean;
  source: string | null;
};

type CleanupCounts = {
  workspaces?: number;
  profiles?: number;
  workspaceMembers?: number;
  projects?: number;
  estimates?: number;
  estimateTabs?: number;
  estimateNodes?: number;
  estimateRows?: number;
  estimateEvents?: number;
  estimateAdjustments?: number;
};

type EstimateHistoryProofEndpointBody = {
  generatedAt?: string;
  mode?: string;
  proofSurface?: string;
  readiness?: {
    d1BindingPresent?: boolean;
    appLayerEditorGuardReady?: boolean;
    crossWorkspaceDenialReady?: boolean;
    viewerDenialReady?: boolean;
    idempotencyReady?: boolean;
    rollbackReady?: boolean;
    cleanupReady?: boolean;
    hostedEstimateHistoryD1Ready?: boolean;
  };
  fixture?: {
    workspaceId?: string;
    projectId?: string;
    estimateId?: string;
    rowId?: string;
  };
  idempotencyProof?: {
    passed?: boolean;
    eventCount?: number;
    replayReturnedSameEvent?: boolean;
    firstError?: string | null;
    secondError?: string | null;
  } | null;
  denialProof?: {
    passed?: boolean;
    viewerCanEdit?: boolean;
    strangerCanEdit?: boolean;
    viewerMutationError?: string | null;
    strangerMutationError?: string | null;
    viewerEventCount?: number;
    strangerEventCount?: number;
  } | null;
  rollbackProof?: {
    passed?: boolean;
    rollbackErrorObserved?: boolean;
    rowResidue?: number | null;
    eventResidue?: number | null;
    error?: string | null;
  } | null;
  cleanupBefore?: CleanupCounts;
  cleanupAfter?: CleanupCounts;
  cleanupPassed?: boolean;
  passed?: boolean;
  error?: string | null;
  note?: string;
};

type HostedEstimateHistoryProofReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-estimate-history-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/api/internal/estimate-history-proof";
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofSurface: string | null;
  readiness: {
    d1BindingPresent: boolean;
    appLayerEditorGuardReady: boolean;
    crossWorkspaceDenialReady: boolean;
    viewerDenialReady: boolean;
    idempotencyReady: boolean;
    rollbackReady: boolean;
    cleanupReady: boolean;
    hostedEstimateHistoryD1Ready: boolean;
    productionCutoverReady: false;
  };
  idempotencyProof: EstimateHistoryProofEndpointBody["idempotencyProof"] | null;
  denialProof: EstimateHistoryProofEndpointBody["denialProof"] | null;
  rollbackProof: EstimateHistoryProofEndpointBody["rollbackProof"] | null;
  cleanupBefore: CleanupCounts | null;
  cleanupAfter: CleanupCounts | null;
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_BASE_URL = "https://archestimator.com";
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-estimate-history-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-estimate-history-proof.md`;
const ENDPOINT_PATH = "/api/internal/estimate-history-proof" as const;
const NOTE =
  "Calls the deployed Cloudflare Worker estimate-history proof endpoint with a local bearer secret, then records sanitized D1 rollback, idempotency, viewer-denial, cross-workspace-denial, and cleanup evidence. It does not print secret values, delete provider resources, downgrade external providers, or touch real customer/project data.";

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
  if (url.protocol !== "https:") throw new Error("Cloudflare estimate-history proof base URL must use HTTPS.");
  return url.origin;
}

function chooseBaseUrl() {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_HOSTED_ESTIMATE_HISTORY_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_WORKER_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_ROUTE_BASE_URL")
      ?? DEFAULT_BASE_URL,
  );
}

function cleanupCountsAreZero(counts: CleanupCounts | null | undefined) {
  if (!counts) return false;
  return Object.values(counts).every((value) => Number(value ?? 0) === 0);
}

function emptyReadiness(): HostedEstimateHistoryProofReport["readiness"] {
  return {
    d1BindingPresent: false,
    appLayerEditorGuardReady: false,
    crossWorkspaceDenialReady: false,
    viewerDenialReady: false,
    idempotencyReady: false,
    rollbackReady: false,
    cleanupReady: false,
    hostedEstimateHistoryD1Ready: false,
    productionCutoverReady: false,
  };
}

function notReadyReport(input: {
  baseUrl: string | null;
  secretInput: SecretInput;
  blockers: string[];
}): HostedEstimateHistoryProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-estimate-history-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    secretInput: input.secretInput,
    responseStatus: null,
    responseOk: false,
    endpointMode: null,
    endpointProofSurface: null,
    readiness: emptyReadiness(),
    idempotencyProof: null,
    denialProof: null,
    rollbackProof: null,
    cleanupBefore: null,
    cleanupAfter: null,
    blockers: input.blockers,
    note: NOTE,
  };
}

export async function buildReport(input: {
  baseUrl: string | null;
  secret: string | null;
  secretInput: SecretInput;
  fetchImpl?: typeof fetch;
}): Promise<HostedEstimateHistoryProofReport> {
  const blockers: string[] = [];
  if (!input.baseUrl) blockers.push("No HTTPS deployed Worker base URL is configured.");
  if (!input.secret) blockers.push("CRON_SECRET is missing from process.env or configured local env files.");
  if (blockers.length > 0) return notReadyReport({ baseUrl: input.baseUrl, secretInput: input.secretInput, blockers });

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${input.baseUrl}${ENDPOINT_PATH}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${input.secret}`,
    },
  });
  const body = await response.json().catch(() => ({ error: "non_json_response" })) as EstimateHistoryProofEndpointBody;
  const endpointReadiness = body.readiness ?? {};
  const cleanupReady = endpointReadiness.cleanupReady === true && cleanupCountsAreZero(body.cleanupAfter);
  const readiness = {
    d1BindingPresent: endpointReadiness.d1BindingPresent === true,
    appLayerEditorGuardReady: endpointReadiness.appLayerEditorGuardReady === true,
    crossWorkspaceDenialReady: endpointReadiness.crossWorkspaceDenialReady === true,
    viewerDenialReady: endpointReadiness.viewerDenialReady === true,
    idempotencyReady: endpointReadiness.idempotencyReady === true,
    rollbackReady: endpointReadiness.rollbackReady === true,
    cleanupReady,
    hostedEstimateHistoryD1Ready: response.ok && body.passed === true && endpointReadiness.hostedEstimateHistoryD1Ready === true && cleanupReady,
    productionCutoverReady: false,
  };

  if (!response.ok) blockers.push(`Estimate-history proof endpoint returned HTTP ${response.status}.`);
  if (!readiness.d1BindingPresent) blockers.push("Cloudflare D1 ARCH_DB binding was not present.");
  if (!readiness.idempotencyReady) blockers.push("Estimate row mutation idempotency proof did not pass.");
  if (!readiness.viewerDenialReady) blockers.push("Workspace viewer edit denial proof did not pass.");
  if (!readiness.crossWorkspaceDenialReady) blockers.push("Cross-workspace edit denial proof did not pass.");
  if (!readiness.appLayerEditorGuardReady) blockers.push("App-layer estimate edit guard proof did not pass.");
  if (!readiness.rollbackReady) blockers.push("D1 transaction rollback proof did not pass.");
  if (!readiness.cleanupReady) blockers.push("Synthetic estimate proof fixture cleanup did not return to zero.");
  if (body.error) blockers.push(`Endpoint error: ${body.error}`);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-estimate-history-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    secretInput: input.secretInput,
    responseStatus: response.status,
    responseOk: response.ok,
    endpointMode: body.mode ?? null,
    endpointProofSurface: body.proofSurface ?? null,
    readiness,
    idempotencyProof: body.idempotencyProof ?? null,
    denialProof: body.denialProof ?? null,
    rollbackProof: body.rollbackProof ?? null,
    cleanupBefore: body.cleanupBefore ?? null,
    cleanupAfter: body.cleanupAfter ?? null,
    blockers,
    note: NOTE,
  };
}

function writeOutput(report: HostedEstimateHistoryProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: HostedEstimateHistoryProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const lines = [
    "# Cloudflare Hosted Estimate History Proof",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl ?? "(missing)"}`,
    `Endpoint: ${report.endpointPath}`,
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
    `| D1 binding | ${report.readiness.d1BindingPresent ? "yes" : "no"} |`,
    `| App-layer editor guard | ${report.readiness.appLayerEditorGuardReady ? "yes" : "no"} |`,
    `| Viewer edit denial | ${report.readiness.viewerDenialReady ? "yes" : "no"} |`,
    `| Cross-workspace edit denial | ${report.readiness.crossWorkspaceDenialReady ? "yes" : "no"} |`,
    `| Mutation idempotency | ${report.readiness.idempotencyReady ? "yes" : "no"} |`,
    `| Transaction rollback | ${report.readiness.rollbackReady ? "yes" : "no"} |`,
    `| Cleanup zero | ${report.readiness.cleanupReady ? "yes" : "no"} |`,
    `| Hosted estimate-history D1 proof | ${report.readiness.hostedEstimateHistoryD1Ready ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- Idempotency event count: ${report.idempotencyProof?.eventCount ?? "(none)"}`,
    `- Idempotency replay returned same event: ${report.idempotencyProof?.replayReturnedSameEvent === true ? "yes" : "no"}`,
    `- Viewer can edit: ${report.denialProof?.viewerCanEdit === true ? "yes" : "no"}`,
    `- Stranger can edit: ${report.denialProof?.strangerCanEdit === true ? "yes" : "no"}`,
    `- Viewer denied event count: ${report.denialProof?.viewerEventCount ?? "(none)"}`,
    `- Stranger denied event count: ${report.denialProof?.strangerEventCount ?? "(none)"}`,
    `- Rollback error observed: ${report.rollbackProof?.rollbackErrorObserved === true ? "yes" : "no"}`,
    `- Rollback row residue: ${report.rollbackProof?.rowResidue ?? "(none)"}`,
    `- Rollback event residue: ${report.rollbackProof?.eventResidue ?? "(none)"}`,
    `- Cleanup after: ${JSON.stringify(report.cleanupAfter ?? {})}`,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const envFiles = (readEnv("CLOUDFLARE_ESTIMATE_HISTORY_PROOF_ENV_FILES")?.split(",").map((item) => item.trim()).filter(Boolean)
    ?? [".env.local", ".dev.vars"]);
  const baseUrl = chooseBaseUrl();
  const { secret, input } = loadSecretInput(envFiles);
  const report = await buildReport({ baseUrl, secret, secretInput: input });
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.hostedEstimateHistoryD1Ready) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
