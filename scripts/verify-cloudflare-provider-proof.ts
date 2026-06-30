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

type ProviderProofEndpointBody = {
  ok?: boolean;
  mode?: string;
  proofScope?: string;
  result?: {
    imagesBindingPresent?: boolean;
    imagesInfoReady?: boolean;
    imagesTransformReady?: boolean;
    imageFormat?: string | null;
    imageDimensions?: { width: number; height: number } | null;
    imageOutputBytes?: number | null;
    imagesError?: string | null;
    r2BindingPresent?: boolean;
    r2PutReady?: boolean;
    r2GetReady?: boolean;
    r2DeleteReady?: boolean;
    r2ObjectBytes?: number | null;
    proofObjectDeleted?: boolean;
    r2Error?: string | null;
    imagesProviderProofReady?: boolean;
    r2ProviderProofReady?: boolean;
  };
  error?: string;
};

type CloudflareProviderRuntimeProofReport = {
  generatedAt: string;
  mode: "cloudflare-provider-runtime-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/__cloudflare/provider-proof";
  providerBacked: boolean;
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofScope: string | null;
  result: ProviderProofEndpointBody["result"] | null;
  readiness: {
    imagesProviderProofReady: boolean;
    r2ProviderProofReady: boolean;
    providerRuntimeProofReady: boolean;
    productionCutoverReady: false;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_HOSTED_ROUTE_PROOF_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-hosted-route-proof.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-runtime-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-runtime-proof.md`;
const ENDPOINT_PATH = "/__cloudflare/provider-proof" as const;
const NOTE =
  "Calls the deployed proof Worker provider-proof endpoint with a local bearer secret, then records only sanitized provider behavior: Cloudflare Images info/transform readiness and ephemeral R2 put/get/delete readiness. It does not print secret values, upload secrets, deploy Workers, change DNS, purchase plans, delete resources, or make production cutover ready.";

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
  if (url.protocol !== "https:") throw new Error("Cloudflare provider proof base URL must use HTTPS.");
  return url.origin;
}

function readHostedRouteBaseUrl(source: string) {
  if (!existsSync(source)) return null;
  const report = JSON.parse(readFileSync(source, "utf8")) as HostedRouteProof;
  return normalizeBaseUrl(report.baseUrl);
}

function chooseBaseUrl(hostedRouteProofFile: string) {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_PROVIDER_PROOF_BASE_URL")
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
}): CloudflareProviderRuntimeProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-provider-runtime-proof-verifier",
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
      imagesProviderProofReady: false,
      r2ProviderProofReady: false,
      providerRuntimeProofReady: false,
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
}): Promise<CloudflareProviderRuntimeProofReport> {
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
  const body = await response.json().catch(() => ({ error: "non_json_response" })) as ProviderProofEndpointBody;
  const result = body.result ?? null;
  const imagesProviderProofReady = result?.imagesProviderProofReady === true;
  const r2ProviderProofReady = result?.r2ProviderProofReady === true;
  const providerRuntimeProofReady = response.ok && body.ok === true && imagesProviderProofReady && r2ProviderProofReady;
  if (!response.ok) blockers.push(`Provider proof endpoint returned HTTP ${response.status}.`);
  if (!imagesProviderProofReady) blockers.push("Cloudflare Images provider proof did not pass.");
  if (!r2ProviderProofReady) blockers.push("Cloudflare R2 provider proof did not pass.");

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-provider-runtime-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    providerBacked: true,
    secretInput: input.secretInput,
    responseStatus: response.status,
    responseOk: response.ok,
    endpointMode: body.mode ?? null,
    endpointProofScope: body.proofScope ?? null,
    result,
    readiness: {
      imagesProviderProofReady,
      r2ProviderProofReady,
      providerRuntimeProofReady,
      productionCutoverReady: false,
    },
    blockers,
    note: NOTE,
  };
}

function writeOutput(report: CloudflareProviderRuntimeProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: CloudflareProviderRuntimeProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = report.result;
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const lines = [
    "# Cloudflare Provider Runtime Proof",
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
    `| Images provider proof | ${report.readiness.imagesProviderProofReady ? "yes" : "no"} |`,
    `| R2 provider proof | ${report.readiness.r2ProviderProofReady ? "yes" : "no"} |`,
    `| Provider runtime proof | ${report.readiness.providerRuntimeProofReady ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- Images binding present: ${result?.imagesBindingPresent === true ? "yes" : "no"}`,
    `- Images info ready: ${result?.imagesInfoReady === true ? "yes" : "no"}`,
    `- Images transform ready: ${result?.imagesTransformReady === true ? "yes" : "no"}`,
    `- Images error: ${result?.imagesError ?? "(none)"}`,
    `- Image format: ${result?.imageFormat ?? "(none)"}`,
    `- Image dimensions: ${result?.imageDimensions ? `${result.imageDimensions.width}x${result.imageDimensions.height}` : "(none)"}`,
    `- Image output bytes: ${result?.imageOutputBytes ?? "(none)"}`,
    `- R2 binding present: ${result?.r2BindingPresent === true ? "yes" : "no"}`,
    `- R2 put/get/delete ready: ${result?.r2PutReady === true && result.r2GetReady === true && result.r2DeleteReady === true ? "yes" : "no"}`,
    `- R2 error: ${result?.r2Error ?? "(none)"}`,
    `- R2 object bytes: ${result?.r2ObjectBytes ?? "(none)"}`,
    `- Proof object deleted: ${result?.proofObjectDeleted === true ? "yes" : "no"}`,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const envFiles = (readEnv("CLOUDFLARE_PROVIDER_PROOF_ENV_FILES")?.split(",").map((item) => item.trim()).filter(Boolean)
    ?? [".env.local", ".dev.vars"]);
  const hostedRouteProofFile = readEnv("CLOUDFLARE_HOSTED_ROUTE_PROOF_FILE") ?? DEFAULT_HOSTED_ROUTE_PROOF_FILE;
  const baseUrl = chooseBaseUrl(hostedRouteProofFile);
  const { secret, input } = loadSecretInput(envFiles);
  const report = await buildReport({ baseUrl, secret, secretInput: input });
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.providerRuntimeProofReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
