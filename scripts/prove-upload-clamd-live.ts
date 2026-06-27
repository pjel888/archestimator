#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createClamdUploadScannerProvider } from "@/lib/uploads/clamd-scanner";
import type { UploadScanProviderOutcome } from "@/lib/uploads/scanning";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-clamd-live-proof.json";
const PROOF_FLAG = "ARCH_UPLOAD_CLAMD_LIVE_PROOF";
const ENV_FILE_VAR = "ARCH_UPLOAD_CLAMD_LIVE_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  "UPLOAD_SCAN_PROVIDER",
  "UPLOAD_CLAMD_HOST",
  "UPLOAD_CLAMD_PORT",
  "UPLOAD_CLAMD_TIMEOUT_MS",
  "UPLOAD_CLAMD_CHUNK_BYTES",
]);

const CLEAN_BYTES = new TextEncoder().encode("%PDF-1.7\n% Archestimator live ClamD clean proof\n");
const EICAR_BYTES = new TextEncoder().encode("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");

type EnvFileResult = {
  requested: boolean;
  loaded: boolean;
  missing?: boolean;
  path?: string;
  names?: string[];
};

type ProofCheck = {
  label: string;
  passed: boolean;
  proof?: string;
};

type LiveClamdProofOptions = {
  host?: string;
  port?: number;
  timeoutMs?: number;
  chunkBytes?: number;
  generatedAt?: string;
};

type SanitizedScanOutcome = {
  outcome: UploadScanProviderOutcome["outcome"];
  provider: string;
  signaturePresent: boolean;
  reason?: string;
  resultKeys: string[];
  protocol: string | null;
  clamdReplyHashPresent: boolean;
};

type LiveClamdProofReport = {
  generatedAt: string;
  mode: "upload-clamd-live-proof";
  proofBoundary: "live-clamd-scanner-service-proof";
  scannerProvider: "clamd";
  passed: boolean;
  skipped: false;
  target: {
    hostConfigured: boolean;
    portConfigured: boolean;
    timeoutMsConfigured: boolean;
    chunkBytesConfigured: boolean;
  };
  samples: {
    clean: SanitizedScanOutcome | null;
    eicar: SanitizedScanOutcome | null;
  };
  checks: ProofCheck[];
  failedChecks: string[];
  errorSummary?: {
    name: string;
    code: string | null;
    messageSha256: string;
  };
  note: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function sha256Hex(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeEnvValue(rawValue: string) {
  const trimmed = rawValue.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
}

function loadProofEnvFile(): EnvFileResult {
  const requestedPath = readEnv(ENV_FILE_VAR);
  if (!requestedPath) {
    return { requested: false, loaded: false };
  }

  const envPath = resolve(requestedPath);
  if (!existsSync(envPath)) {
    return { requested: true, loaded: false, missing: true, path: requestedPath };
  }

  const names: string[] = [];
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const normalized = line.trim().replace(/^export\s+/, "");
    if (!normalized || normalized.startsWith("#")) continue;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, name, rawValue] = match;
    if (!PROOF_ENV_FILE_NAMES.has(name)) continue;
    if (!process.env[name]) {
      process.env[name] = decodeEnvValue(rawValue);
      names.push(name);
    }
  }

  return { requested: true, loaded: true, path: requestedPath, names };
}

function normalizePositiveInteger(value: string | number | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
}

function proofCheck(label: string, passed: boolean, proof?: string): ProofCheck {
  return { label, passed, proof };
}

function sanitizeOutcome(outcome: UploadScanProviderOutcome): SanitizedScanOutcome {
  const result = outcome.result ?? {};
  return {
    outcome: outcome.outcome,
    provider: outcome.provider,
    signaturePresent: "signature" in outcome && Boolean(outcome.signature),
    reason: "reason" in outcome ? outcome.reason : undefined,
    resultKeys: Object.keys(result).sort(),
    protocol: typeof result.protocol === "string" ? result.protocol : null,
    clamdReplyHashPresent: typeof result.clamdReplySha256 === "string",
  };
}

function errorSummary(error: unknown) {
  const err = error as NodeJS.ErrnoException;
  const message = error instanceof Error ? error.message : String(error);
  return {
    name: error instanceof Error ? error.name : "Error",
    code: typeof err.code === "string" ? err.code : null,
    messageSha256: sha256Hex(message),
  };
}

function skippedReport(reason: string, envFile: EnvFileResult, missingEnv: string[] = []) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-clamd-live-proof",
    proofBoundary: "live-clamd-proof-skipped",
    scannerProvider: "clamd",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    envFile,
    note: "Live ClamD proof requires explicit opt-in. It must scan a clean fixture and the EICAR antivirus test string against a real ClamD service before the live scanner/CDR gate can be reduced.",
  };
}

function refusedReport(reason: string, envFile: EnvFileResult) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-clamd-live-proof",
    proofBoundary: "live-clamd-proof-refused",
    scannerProvider: "clamd",
    passed: false,
    skipped: false,
    refused: true,
    reason,
    envFile,
    note: "Live scanner proof only runs when the upload scanner configuration explicitly selects ClamD.",
  };
}

function writeReport(report: Record<string, unknown>) {
  const outputPath = resolve(readEnv("ARCH_UPLOAD_CLAMD_LIVE_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

export async function runLiveClamdProof(options: LiveClamdProofOptions): Promise<LiveClamdProofReport> {
  const scanner = createClamdUploadScannerProvider(options);
  const checks: ProofCheck[] = [];
  let clean: SanitizedScanOutcome | null = null;
  let eicar: SanitizedScanOutcome | null = null;
  let error: unknown;

  try {
    clean = sanitizeOutcome(await scanner.scan({
      assetId: "11111111-1111-4111-8111-111111111111",
      fileName: "live-clamd-clean.pdf",
      contentType: "application/pdf",
      sizeBytes: CLEAN_BYTES.byteLength,
      bytes: CLEAN_BYTES,
    }));
    eicar = sanitizeOutcome(await scanner.scan({
      assetId: "22222222-2222-4222-8222-222222222222",
      fileName: "live-clamd-eicar.txt",
      contentType: "text/plain",
      sizeBytes: EICAR_BYTES.byteLength,
      bytes: EICAR_BYTES,
    }));
  } catch (caught) {
    error = caught;
  }

  checks.push(
    proofCheck("live-clamd-clean-fixture-scans-clean", clean?.provider === "clamd" && clean.outcome === "clean", clean?.outcome),
    proofCheck("live-clamd-eicar-fixture-detected", eicar?.provider === "clamd" && eicar.outcome === "infected", eicar?.outcome),
    proofCheck("live-clamd-eicar-signature-present", eicar?.signaturePresent === true),
    proofCheck("live-clamd-result-metadata-is-path-safe", !JSON.stringify({ clean, eicar }).includes("live-clamd-clean.pdf") && !JSON.stringify({ clean, eicar }).includes("live-clamd-eicar.txt")),
  );

  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "upload-clamd-live-proof",
    proofBoundary: "live-clamd-scanner-service-proof",
    scannerProvider: "clamd",
    passed: failedChecks.length === 0 && !error,
    skipped: false,
    target: {
      hostConfigured: Boolean(options.host),
      portConfigured: Boolean(options.port),
      timeoutMsConfigured: Boolean(options.timeoutMs),
      chunkBytesConfigured: Boolean(options.chunkBytes),
    },
    samples: { clean, eicar },
    checks,
    failedChecks: error ? [...failedChecks, "live-clamd-scan-execution"] : failedChecks,
    errorSummary: error ? errorSummary(error) : undefined,
    note: "This proof executes the ClamD INSTREAM provider against a live ClamD service using only generated clean and EICAR fixtures. It does not prove hosted queue-worker invocation, CDR behavior, dashboard emission, alert delivery, backpressure, retention runbooks, or runtime limits.",
  };
}

async function main() {
  const envFile = loadProofEnvFile();
  if (readEnv(PROOF_FLAG) !== "1") {
    return skippedReport(`${PROOF_FLAG} is not set to 1.`, envFile);
  }

  const provider = readEnv("UPLOAD_SCAN_PROVIDER").toLowerCase();
  if (provider !== "clamd") {
    return refusedReport("UPLOAD_SCAN_PROVIDER must be clamd for live ClamD proof.", envFile);
  }

  return runLiveClamdProof({
    host: readEnv("UPLOAD_CLAMD_HOST") || undefined,
    port: readEnv("UPLOAD_CLAMD_PORT") ? normalizePositiveInteger(readEnv("UPLOAD_CLAMD_PORT"), 3310, 65_535) : undefined,
    timeoutMs: readEnv("UPLOAD_CLAMD_TIMEOUT_MS") ? normalizePositiveInteger(readEnv("UPLOAD_CLAMD_TIMEOUT_MS"), 5_000) : undefined,
    chunkBytes: readEnv("UPLOAD_CLAMD_CHUNK_BYTES") ? normalizePositiveInteger(readEnv("UPLOAD_CLAMD_CHUNK_BYTES"), 1024 * 1024, 1024 * 1024) : undefined,
  });
}

if (import.meta.main) {
  main()
    .then((report) => {
      const output = writeReport(report);
      if (report.passed) {
        console.log(`Live ClamD proof passed; output=${output}`);
        return;
      }
      if ("skipped" in report && report.skipped) {
        console.log(`Live ClamD proof skipped; output=${output}`);
        return;
      }
      console.error(`Live ClamD proof failed; output=${output}`);
      process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
