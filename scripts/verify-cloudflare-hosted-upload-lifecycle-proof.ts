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
  uploadSessions?: number;
  uploadAssets?: number;
  uploadEvents?: number;
  attachments?: number;
};

type UploadLifecycleEndpointBody = {
  generatedAt?: string;
  mode?: string;
  proofSurface?: string;
  readiness?: {
    d1BindingPresent?: boolean;
    r2BindingPresent?: boolean;
    storagePutReady?: boolean;
    uploadAssetRecorded?: boolean;
    scanQueueListed?: boolean;
    scanJobRan?: boolean;
    scanResultPersisted?: boolean;
    attachmentDownloadEligible?: boolean;
    cleanupReady?: boolean;
    hostedUploadLifecycleReady?: boolean;
  };
  proof?: {
    objectPathShape?: string;
    objectPathHash?: string;
    storagePut?: {
      passed?: boolean;
      contentType?: string | null;
      sizeBytes?: number;
      checksumMatches?: boolean;
    };
    uploadAssetRecord?: {
      passed?: boolean;
      uploadSessionIdPresent?: boolean;
      assetIdPresent?: boolean;
      initialScanStatus?: string | null;
    };
    scanQueue?: {
      passed?: boolean;
      listedRecordCount?: number;
      targetRecordFound?: boolean;
    };
    scanJob?: {
      passed?: boolean;
      scannedCount?: number;
      writeFailedCount?: number;
      downloadFailedCount?: number;
      scannerFailedCount?: number;
      outcomeCounts?: Record<string, number> | null;
    };
    scanReadback?: {
      passed?: boolean;
      scanStatus?: string | null;
      scanProvider?: string | null;
      scannedAtPresent?: boolean;
      checksumMatches?: boolean;
      scanResultKeys?: string[];
      eventTypes?: string[];
    };
    attachmentDownloadEligibility?: {
      passed?: boolean;
      attachmentPresent?: boolean;
      approved?: boolean;
      finalizedCleanAssetPresent?: boolean;
      storageBytesReadable?: boolean;
      storageChecksumMatches?: boolean;
    };
  };
  cleanupBefore?: CleanupCounts;
  cleanupAfter?: CleanupCounts;
  passed?: boolean;
  error?: string | null;
  note?: string;
};

type HostedUploadLifecycleProofReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-upload-lifecycle-proof-verifier";
  baseUrl: string | null;
  endpointPath: "/api/internal/upload-lifecycle-proof";
  secretInput: SecretInput;
  responseStatus: number | null;
  responseOk: boolean;
  endpointMode: string | null;
  endpointProofSurface: string | null;
  readiness: {
    d1BindingPresent: boolean;
    r2BindingPresent: boolean;
    storagePutReady: boolean;
    uploadAssetRecorded: boolean;
    scanQueueListed: boolean;
    scanJobRan: boolean;
    scanResultPersisted: boolean;
    attachmentDownloadEligible: boolean;
    cleanupReady: boolean;
    hostedUploadLifecycleReady: boolean;
    productionCutoverReady: false;
  };
  proof: UploadLifecycleEndpointBody["proof"] | null;
  cleanupBefore: CleanupCounts | null;
  cleanupAfter: CleanupCounts | null;
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_BASE_URL = "https://archestimator.com";
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-upload-lifecycle-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-upload-lifecycle-proof.md`;
const ENDPOINT_PATH = "/api/internal/upload-lifecycle-proof" as const;
const NOTE =
  "Calls the deployed Cloudflare Worker upload lifecycle proof endpoint with a local bearer secret, then records sanitized R2 write/read, D1 upload asset, scanner execution, clean scan persistence, approved attachment eligibility, and cleanup evidence. It does not print secret values, raw R2 keys, uploaded bytes, session cookies, customer data, or provider credentials.";

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
  if (url.protocol !== "https:") throw new Error("Cloudflare upload lifecycle proof base URL must use HTTPS.");
  return url.origin;
}

function chooseBaseUrl() {
  return normalizeBaseUrl(
    readEnv("CLOUDFLARE_HOSTED_UPLOAD_LIFECYCLE_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_WORKER_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_ROUTE_BASE_URL")
      ?? DEFAULT_BASE_URL,
  );
}

function cleanupCountsAreZero(counts: CleanupCounts | null | undefined) {
  if (!counts) return false;
  return Object.values(counts).every((value) => Number(value ?? 0) === 0);
}

function emptyReadiness(): HostedUploadLifecycleProofReport["readiness"] {
  return {
    d1BindingPresent: false,
    r2BindingPresent: false,
    storagePutReady: false,
    uploadAssetRecorded: false,
    scanQueueListed: false,
    scanJobRan: false,
    scanResultPersisted: false,
    attachmentDownloadEligible: false,
    cleanupReady: false,
    hostedUploadLifecycleReady: false,
    productionCutoverReady: false,
  };
}

function notReadyReport(input: {
  baseUrl: string | null;
  secretInput: SecretInput;
  blockers: string[];
}): HostedUploadLifecycleProofReport {
  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-upload-lifecycle-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    secretInput: input.secretInput,
    responseStatus: null,
    responseOk: false,
    endpointMode: null,
    endpointProofSurface: null,
    readiness: emptyReadiness(),
    proof: null,
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
}): Promise<HostedUploadLifecycleProofReport> {
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
  const body = await response.json().catch(() => ({ error: "non_json_response" })) as UploadLifecycleEndpointBody;
  const endpointReadiness = body.readiness ?? {};
  const cleanupReady = endpointReadiness.cleanupReady === true && cleanupCountsAreZero(body.cleanupAfter);
  const readiness = {
    d1BindingPresent: endpointReadiness.d1BindingPresent === true,
    r2BindingPresent: endpointReadiness.r2BindingPresent === true,
    storagePutReady: endpointReadiness.storagePutReady === true,
    uploadAssetRecorded: endpointReadiness.uploadAssetRecorded === true,
    scanQueueListed: endpointReadiness.scanQueueListed === true,
    scanJobRan: endpointReadiness.scanJobRan === true,
    scanResultPersisted: endpointReadiness.scanResultPersisted === true,
    attachmentDownloadEligible: endpointReadiness.attachmentDownloadEligible === true,
    cleanupReady,
    hostedUploadLifecycleReady:
      response.ok
      && body.passed === true
      && endpointReadiness.hostedUploadLifecycleReady === true
      && cleanupReady,
    productionCutoverReady: false,
  };

  if (!response.ok) blockers.push(`Upload lifecycle proof endpoint returned HTTP ${response.status}.`);
  if (!readiness.d1BindingPresent) blockers.push("Cloudflare D1 ARCH_DB binding was not present.");
  if (!readiness.r2BindingPresent) blockers.push("Cloudflare R2 ARCH_UPLOADS_R2 binding was not present.");
  if (!readiness.storagePutReady) blockers.push("R2 synthetic upload write/read proof did not pass.");
  if (!readiness.uploadAssetRecorded) blockers.push("D1 upload asset/session record proof did not pass.");
  if (!readiness.scanQueueListed) blockers.push("D1 upload scanner queue listing did not include the synthetic asset.");
  if (!readiness.scanJobRan) blockers.push("Cloudflare upload scanner job did not process the synthetic R2 object cleanly.");
  if (!readiness.scanResultPersisted) blockers.push("Clean scan result was not persisted to D1 upload metadata.");
  if (!readiness.attachmentDownloadEligible) blockers.push("Approved attachment/download eligibility proof did not pass.");
  if (!readiness.cleanupReady) blockers.push("Synthetic upload lifecycle proof fixture cleanup did not return to zero.");
  if (body.error) blockers.push(`Endpoint error: ${body.error}`);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-hosted-upload-lifecycle-proof-verifier",
    baseUrl: input.baseUrl,
    endpointPath: ENDPOINT_PATH,
    secretInput: input.secretInput,
    responseStatus: response.status,
    responseOk: response.ok,
    endpointMode: body.mode ?? null,
    endpointProofSurface: body.proofSurface ?? null,
    readiness,
    proof: body.proof ?? null,
    cleanupBefore: body.cleanupBefore ?? null,
    cleanupAfter: body.cleanupAfter ?? null,
    blockers,
    note: NOTE,
  };
}

function writeOutput(report: HostedUploadLifecycleProofReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeMarkdown(report: HostedUploadLifecycleProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const blockers = report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  const proof = report.proof ?? {};
  const lines = [
    "# Cloudflare Hosted Upload Lifecycle Proof",
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
    `| R2 binding | ${report.readiness.r2BindingPresent ? "yes" : "no"} |`,
    `| R2 write/read | ${report.readiness.storagePutReady ? "yes" : "no"} |`,
    `| Upload asset record | ${report.readiness.uploadAssetRecorded ? "yes" : "no"} |`,
    `| Scanner queue listed | ${report.readiness.scanQueueListed ? "yes" : "no"} |`,
    `| Scanner job ran | ${report.readiness.scanJobRan ? "yes" : "no"} |`,
    `| Clean scan persisted | ${report.readiness.scanResultPersisted ? "yes" : "no"} |`,
    `| Attachment download eligible | ${report.readiness.attachmentDownloadEligible ? "yes" : "no"} |`,
    `| Cleanup zero | ${report.readiness.cleanupReady ? "yes" : "no"} |`,
    `| Hosted upload lifecycle proof | ${report.readiness.hostedUploadLifecycleReady ? "yes" : "no"} |`,
    `| Production cutover | ${report.readiness.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Sanitized Results",
    "",
    `- Object path shape: ${proof.objectPathShape ?? "(none)"}`,
    `- Object path hash: ${proof.objectPathHash ?? "(none)"}`,
    `- R2 content type: ${proof.storagePut?.contentType ?? "(none)"}`,
    `- R2 size bytes: ${proof.storagePut?.sizeBytes ?? "(none)"}`,
    `- R2 checksum matches fixture: ${proof.storagePut?.checksumMatches === true ? "yes" : "no"}`,
    `- Initial upload scan status: ${proof.uploadAssetRecord?.initialScanStatus ?? "(none)"}`,
    `- Scanner listed records: ${proof.scanQueue?.listedRecordCount ?? "(none)"}`,
    `- Scanner target found: ${proof.scanQueue?.targetRecordFound === true ? "yes" : "no"}`,
    `- Scanner scanned count: ${proof.scanJob?.scannedCount ?? "(none)"}`,
    `- Scanner outcome counts: ${JSON.stringify(proof.scanJob?.outcomeCounts ?? {})}`,
    `- Persisted scan status: ${proof.scanReadback?.scanStatus ?? "(none)"}`,
    `- Persisted scan provider: ${proof.scanReadback?.scanProvider ?? "(none)"}`,
    `- Scan event types: ${(proof.scanReadback?.eventTypes ?? []).join(", ") || "(none)"}`,
    `- Approved attachment present: ${proof.attachmentDownloadEligibility?.attachmentPresent === true ? "yes" : "no"}`,
    `- Finalized clean asset present: ${proof.attachmentDownloadEligibility?.finalizedCleanAssetPresent === true ? "yes" : "no"}`,
    `- Attachment storage bytes readable: ${proof.attachmentDownloadEligibility?.storageBytesReadable === true ? "yes" : "no"}`,
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
  const envFiles = (readEnv("CLOUDFLARE_UPLOAD_LIFECYCLE_PROOF_ENV_FILES")?.split(",").map((item) => item.trim()).filter(Boolean)
    ?? [".env.local", ".dev.vars"]);
  const baseUrl = chooseBaseUrl();
  const { secret, input } = loadSecretInput(envFiles);
  const report = await buildReport({ baseUrl, secret, secretInput: input });
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(report, outputFile);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.hostedUploadLifecycleReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
