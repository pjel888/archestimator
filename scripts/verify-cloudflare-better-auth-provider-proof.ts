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

type BetterAuthProviderEndpointBody = {
  mode?: string;
  endpointProofScope?: string;
  providerBacked?: boolean;
  result?: {
    d1BindingPresent?: boolean;
    schemaApplyReady?: boolean;
    expectedTablesPresent?: boolean;
    expectedIndexesPresent?: boolean;
    secretProviderReady?: boolean;
    baseUrlReady?: boolean;
    trustedOriginsReady?: boolean;
    providerSessionFixtureReady?: boolean;
    magicLinkCutover?: {
      magicLinkRequestReady?: boolean;
      magicLinkTokenCaptured?: boolean;
      magicLinkCallbackReady?: boolean;
      sessionCookieIssued?: boolean;
      routeGateSessionReadbackReady?: boolean;
      replayBlockedReady?: boolean;
      cleanupReady?: boolean;
      providerBackedCallbackSessionCutoverReady?: boolean;
      rowsRemaining?: number | null;
      error?: string | null;
    };
    cleanupReady?: boolean;
    tableNames?: string[];
    indexNames?: string[];
    rowsRemaining?: number | null;
    error?: string | null;
  };
  readiness?: {
    providerBacked?: boolean;
    schemaApplyReady?: boolean;
    expectedTablesPresent?: boolean;
    expectedIndexesPresent?: boolean;
    secretProviderReady?: boolean;
    baseUrlReady?: boolean;
    trustedOriginsReady?: boolean;
    providerSessionFixtureReady?: boolean;
    magicLinkRequestReady?: boolean;
    magicLinkCallbackReady?: boolean;
    sessionCookieIssued?: boolean;
    routeGateSessionReadbackReady?: boolean;
    replayBlockedReady?: boolean;
    providerBackedCallbackSessionCutoverReady?: boolean;
    cleanupReady?: boolean;
    betterAuthProviderProofReady?: boolean;
    productionCutoverReady?: boolean;
  };
  blockers?: string[];
};

type CloudflareBetterAuthProviderProofReport = {
  generatedAt: string;
  mode: "cloudflare-better-auth-provider-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/__cloudflare/better-auth-proof";
  providerBacked: boolean;
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofScope: string | null;
  result: BetterAuthProviderEndpointBody["result"] | null;
  readiness: {
    schemaApplyReady: boolean;
    expectedTablesPresent: boolean;
    expectedIndexesPresent: boolean;
    secretProviderReady: boolean;
    baseUrlReady: boolean;
    trustedOriginsReady: boolean;
    providerSessionFixtureReady: boolean;
    magicLinkRequestReady: boolean;
    magicLinkCallbackReady: boolean;
    sessionCookieIssued: boolean;
    routeGateSessionReadbackReady: boolean;
    replayBlockedReady: boolean;
    providerBackedCallbackSessionCutoverReady: boolean;
    cleanupReady: boolean;
    betterAuthProviderProofReady: boolean;
    productionCutoverReady: false;
  };
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_HOSTED_ROUTE_PROOF_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-hosted-route-proof.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-better-auth-provider-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-better-auth-provider-proof.md`;
const ENDPOINT_PATH = "/__cloudflare/better-auth-proof" as const;
const NOTE =
  "Calls the deployed proof Worker Better Auth provider-proof endpoint with a local bearer secret, then records sanitized provider behavior: hosted D1 schema/index readback, Better Auth secret/base URL presence, one ephemeral D1 session fixture readback, magic-link callback/session-cookie/route-gate readback, token replay blocking, and cleanup. It does not print secret values, deploy Workers, change DNS, replace Supabase auth, prove OAuth provider credentials, or make production cutover ready.";

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
  if (url.protocol !== "https:") throw new Error("Cloudflare Better Auth provider proof base URL must use HTTPS.");
  return url.origin;
}

function readHostedRouteBaseUrl(source: string) {
  if (!existsSync(source)) return null;
  const report = JSON.parse(readFileSync(source, "utf8")) as HostedRouteProof;
  return normalizeBaseUrl(report.baseUrl);
}

function chooseBaseUrl(hostedRouteProofFile: string) {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_BETTER_AUTH_PROVIDER_PROOF_BASE_URL")
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
}): CloudflareBetterAuthProviderProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-better-auth-provider-proof-verifier",
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
      schemaApplyReady: false,
      expectedTablesPresent: false,
      expectedIndexesPresent: false,
      secretProviderReady: false,
      baseUrlReady: false,
      trustedOriginsReady: false,
      providerSessionFixtureReady: false,
      magicLinkRequestReady: false,
      magicLinkCallbackReady: false,
      sessionCookieIssued: false,
      routeGateSessionReadbackReady: false,
      replayBlockedReady: false,
      providerBackedCallbackSessionCutoverReady: false,
      cleanupReady: false,
      betterAuthProviderProofReady: false,
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
}): Promise<CloudflareBetterAuthProviderProofReport> {
  const blockers: string[] = [];
  if (!input.baseUrl) blockers.push("No HTTPS deployed Worker base URL is configured or present in hosted route proof evidence.");
  if (!input.secret) blockers.push("CRON_SECRET is missing from process.env or configured local env files.");
  if (blockers.length > 0) return notReadyReport({ baseUrl: input.baseUrl, secretInput: input.secretInput, blockers });

  const response = await (input.fetchImpl ?? fetch)(`${input.baseUrl}${ENDPOINT_PATH}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.secret}`,
      accept: "application/json",
    },
  });
  const body = await response.json().catch(() => ({})) as BetterAuthProviderEndpointBody;
  const readiness = body.readiness ?? {};
  const result = body.result ?? null;
  const betterAuthProviderProofReady = response.ok && readiness.betterAuthProviderProofReady === true;

  if (!response.ok) blockers.push(`Better Auth provider proof endpoint returned HTTP ${response.status}.`);
  if (!betterAuthProviderProofReady) blockers.push("Hosted Better Auth provider proof did not pass.");
  for (const blocker of body.blockers ?? []) blockers.push(blocker);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-better-auth-provider-proof-verifier",
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
      schemaApplyReady: readiness.schemaApplyReady === true,
      expectedTablesPresent: readiness.expectedTablesPresent === true,
      expectedIndexesPresent: readiness.expectedIndexesPresent === true,
      secretProviderReady: readiness.secretProviderReady === true,
      baseUrlReady: readiness.baseUrlReady === true,
      trustedOriginsReady: readiness.trustedOriginsReady === true,
      providerSessionFixtureReady: readiness.providerSessionFixtureReady === true,
      magicLinkRequestReady: readiness.magicLinkRequestReady === true,
      magicLinkCallbackReady: readiness.magicLinkCallbackReady === true,
      sessionCookieIssued: readiness.sessionCookieIssued === true,
      routeGateSessionReadbackReady: readiness.routeGateSessionReadbackReady === true,
      replayBlockedReady: readiness.replayBlockedReady === true,
      providerBackedCallbackSessionCutoverReady: readiness.providerBackedCallbackSessionCutoverReady === true,
      cleanupReady: readiness.cleanupReady === true,
      betterAuthProviderProofReady,
      productionCutoverReady: false,
    },
    blockers: [...new Set(blockers)],
    note: NOTE,
  };
}

function writeOutput(report: CloudflareBetterAuthProviderProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: CloudflareBetterAuthProviderProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = report.result;
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const lines = [
    "# Cloudflare Better Auth Provider Proof",
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
    `| Schema apply ready | ${report.readiness.schemaApplyReady ? "yes" : "no"} |`,
    `| Expected tables present | ${report.readiness.expectedTablesPresent ? "yes" : "no"} |`,
    `| Expected indexes present | ${report.readiness.expectedIndexesPresent ? "yes" : "no"} |`,
    `| Secret provider ready | ${report.readiness.secretProviderReady ? "yes" : "no"} |`,
    `| Base URL ready | ${report.readiness.baseUrlReady ? "yes" : "no"} |`,
    `| Trusted origins ready | ${report.readiness.trustedOriginsReady ? "yes" : "no"} |`,
    `| Provider session fixture ready | ${report.readiness.providerSessionFixtureReady ? "yes" : "no"} |`,
    `| Magic-link request ready | ${report.readiness.magicLinkRequestReady ? "yes" : "no"} |`,
    `| Magic-link callback ready | ${report.readiness.magicLinkCallbackReady ? "yes" : "no"} |`,
    `| Session cookie issued | ${report.readiness.sessionCookieIssued ? "yes" : "no"} |`,
    `| Route-gate session readback ready | ${report.readiness.routeGateSessionReadbackReady ? "yes" : "no"} |`,
    `| Magic-link replay blocked | ${report.readiness.replayBlockedReady ? "yes" : "no"} |`,
    `| Provider-backed callback/session cutover proof ready | ${report.readiness.providerBackedCallbackSessionCutoverReady ? "yes" : "no"} |`,
    `| Cleanup ready | ${report.readiness.cleanupReady ? "yes" : "no"} |`,
    `| Better Auth provider proof ready | ${report.readiness.betterAuthProviderProofReady ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- Tables: ${result?.tableNames?.join(", ") || "(none)"}`,
    `- Indexes: ${result?.indexNames?.join(", ") || "(none)"}`,
    `- Rows remaining: ${result?.rowsRemaining ?? "(none)"}`,
    `- Endpoint error: ${result?.error ?? "(none)"}`,
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
  if (!report.readiness.betterAuthProviderProofReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
