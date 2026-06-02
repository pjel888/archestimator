#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type VerifyInputs = {
  baseUrl: string;
  projectId: string;
  estimateId: string;
  authCookie?: string;
  authHeader?: string;
  outputFile?: string;
  minBytes: number;
};

type VerifyResult = {
  generatedAt: string;
  mode: "hosted-proposal-export-route-smoke";
  baseUrl: string;
  route: string;
  status: number;
  ok: boolean;
  durationMs: number;
  byteLength: number;
  contentType: string | null;
  contentDisposition: string | null;
  cacheControl: string | null;
  xlsxZipMagic: boolean;
  hasWorkbookContentType: boolean;
  hasAttachmentDisposition: boolean;
  minBytes: number;
  passed: boolean;
  note: string;
};

const WORKBOOK_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DEFAULT_MIN_BYTES = 5_000;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function buildExportRoute(projectId: string, estimateId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(estimateId)}/export/proposal.xlsx`;
}

export function parseMinBytes(value: string | undefined) {
  if (!value) return DEFAULT_MIN_BYTES;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("HOSTED_EXPORT_MIN_BYTES must be a positive integer.");
  }
  return parsed;
}

export function parseInputsFromEnv(): VerifyInputs {
  const baseUrl = readEnv("HOSTED_EXPORT_BASE_URL");
  const projectId = readEnv("HOSTED_EXPORT_PROJECT_ID");
  const estimateId = readEnv("HOSTED_EXPORT_ESTIMATE_ID");
  const authCookie = readEnv("HOSTED_EXPORT_AUTH_COOKIE");
  const authHeader = readEnv("HOSTED_EXPORT_AUTH_HEADER");

  const missing = [
    ["HOSTED_EXPORT_BASE_URL", baseUrl],
    ["HOSTED_EXPORT_PROJECT_ID", projectId],
    ["HOSTED_EXPORT_ESTIMATE_ID", estimateId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (!authCookie && !authHeader) {
    missing.push("HOSTED_EXPORT_AUTH_COOKIE or HOSTED_EXPORT_AUTH_HEADER");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required hosted export proof input(s): ${missing.join(", ")}.`);
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl!),
    projectId: projectId!,
    estimateId: estimateId!,
    authCookie,
    authHeader,
    outputFile: readEnv("OUTPUT_FILE"),
    minBytes: parseMinBytes(readEnv("HOSTED_EXPORT_MIN_BYTES")),
  };
}

export function buildHeaders(inputs: Pick<VerifyInputs, "authCookie" | "authHeader">) {
  const headers: Record<string, string> = {};
  if (inputs.authCookie) headers.Cookie = inputs.authCookie;
  if (inputs.authHeader) headers.Authorization = inputs.authHeader;
  return headers;
}

export function hasXlsxZipMagic(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function summarizeResponse(params: {
  inputs: VerifyInputs;
  route: string;
  response: Response;
  bytes: Uint8Array;
  durationMs: number;
}): VerifyResult {
  const contentType = params.response.headers.get("content-type");
  const contentDisposition = params.response.headers.get("content-disposition");
  const cacheControl = params.response.headers.get("cache-control");
  const xlsxZipMagic = hasXlsxZipMagic(params.bytes);
  const hasWorkbookContentType = contentType === WORKBOOK_CONTENT_TYPE;
  const hasAttachmentDisposition = Boolean(contentDisposition?.toLowerCase().includes("attachment"));
  const passed = (
    params.response.ok
    && hasWorkbookContentType
    && hasAttachmentDisposition
    && xlsxZipMagic
    && params.bytes.byteLength >= params.inputs.minBytes
  );

  return {
    generatedAt: new Date().toISOString(),
    mode: "hosted-proposal-export-route-smoke",
    baseUrl: params.inputs.baseUrl,
    route: params.route,
    status: params.response.status,
    ok: params.response.ok,
    durationMs: Math.round(params.durationMs),
    byteLength: params.bytes.byteLength,
    contentType,
    contentDisposition,
    cacheControl,
    xlsxZipMagic,
    hasWorkbookContentType,
    hasAttachmentDisposition,
    minBytes: params.inputs.minBytes,
    passed,
    note: "Sanitized hosted export route smoke. Auth cookies/headers are required for the request but are never written to this report.",
  };
}

export async function verifyHostedExportRoute(inputs: VerifyInputs, fetchImpl: typeof fetch = fetch): Promise<VerifyResult> {
  const route = buildExportRoute(inputs.projectId, inputs.estimateId);
  const url = `${inputs.baseUrl}${route}`;
  const startedAt = performance.now();
  const response = await fetchImpl(url, {
    method: "GET",
    headers: buildHeaders(inputs),
    redirect: "manual",
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const durationMs = performance.now() - startedAt;
  return summarizeResponse({ inputs, route, response, bytes, durationMs });
}

function writeOutput(outputFile: string, result: VerifyResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const inputs = parseInputsFromEnv();
  const result = await verifyHostedExportRoute(inputs);
  if (inputs.outputFile) writeOutput(inputs.outputFile, result);
  console.log(JSON.stringify(result, null, 2));

  if (!result.passed) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
