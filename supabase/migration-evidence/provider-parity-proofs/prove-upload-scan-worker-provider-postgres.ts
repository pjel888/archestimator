#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createUploadPolicyScannerProvider } from "@/lib/uploads/policy-scanner";
import {
  createSupabaseUploadScanStorage,
  createUploadScanResultWriter,
  listUploadScanJobRecords,
  runUploadScanJob,
} from "@/lib/uploads/scan-job";
import {
  setUploadOperationalTelemetrySink,
  type UploadOperationalTelemetryRecord,
} from "@/lib/uploads/operational-telemetry";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-scan-worker-provider-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const BUCKET = "component-attachments";
const CONTENT_TYPE = "application/pdf";
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n% upload scan worker provider proof\n");

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
  errorMessage: string | null;
  statusCode: string | number | null;
  proof?: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
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

function writeReport(report: Record<string, unknown>) {
  const outputPath = resolve(readEnv("ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function projectRefFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    if (!host.endsWith(".supabase.co")) return "";
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function sanitizedProjectUrl(url: string) {
  const projectRef = projectRefFromUrl(url);
  return projectRef ? `https://${projectRef}.supabase.co` : "invalid-supabase-url";
}

function skippedReport(reason: string, missingEnv: string[] = [], details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-scan-worker-provider-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    note: "Local scan worker tests do not prove provider-backed file scanning. Run with ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF=1 and scoped provider credentials before release.",
    ...details,
  };
}

function refusedReport(reason: string, details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-scan-worker-provider-proof",
    proofBoundary: "provider-proof-refused",
    passed: false,
    skipped: false,
    refused: true,
    reason,
    ...details,
  };
}

function sha256Hex(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function proofCheck(label: string, passed: boolean, details: Partial<ProofCheck> = {}): ProofCheck {
  return {
    label,
    passed,
    errorMessage: details.errorMessage ?? null,
    statusCode: details.statusCode ?? null,
    proof: details.proof,
  };
}

function sanitizeJobResult(jobResult: Awaited<ReturnType<typeof runUploadScanJob>> | null) {
  if (!jobResult) return null;

  return {
    runIdShape: "scan-worker-provider-proof-{proofId}",
    scannedCount: jobResult.scannedCount,
    writeFailedCount: jobResult.writeFailedCount,
    downloadFailedCount: jobResult.downloadFailedCount,
    scannerFailedCount: jobResult.scannerFailedCount,
    outcomeCounts: jobResult.outcomeCounts,
  };
}

async function createTemporaryAuthUser(serviceClient: SupabaseClient) {
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createResult = await serviceClient.auth.admin.createUser({
    email: `upload-scan-worker-proof-${stamp}@example.com`,
    email_confirm: true,
  });
  const userId = createResult.data?.user?.id ?? "";
  if (createResult.error || !userId) {
    throw new Error(`Temporary auth user create failed: ${createResult.error?.message ?? "missing user id"}`);
  }

  return userId;
}

async function createWorkspaceFixture(serviceClient: SupabaseClient, userId: string, suffix: string) {
  const workspaceId = randomUUID();
  const workspaceResult = await serviceClient.from("workspaces").insert({
    id: workspaceId,
    name: `Upload scan worker proof ${suffix.slice(0, 8)}`,
    slug: `upload-scan-worker-proof-${suffix.slice(0, 20)}`,
    created_by: userId,
  });
  if (workspaceResult.error) {
    throw new Error(`Temporary workspace create failed: ${workspaceResult.error.message}`);
  }

  const membershipResult = await serviceClient.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  }, { onConflict: "workspace_id,user_id" });
  if (membershipResult.error) {
    throw new Error(`Temporary workspace membership create failed: ${membershipResult.error.message}`);
  }

  return workspaceId;
}

async function seedStorageObject(serviceClient: SupabaseClient, storagePath: string): Promise<ProofCheck> {
  const result = await serviceClient.storage.from(BUCKET).upload(storagePath, PDF_BYTES, {
    contentType: CONTENT_TYPE,
    cacheControl: "31536000",
    upsert: false,
  });

  return proofCheck("provider-storage-object-seeded", !result.error, {
    errorMessage: result.error?.message ?? null,
    statusCode: result.error?.statusCode ?? result.error?.status ?? null,
  });
}

async function recordPendingAsset({
  serviceClient,
  workspaceId,
  userId,
  storagePath,
  checksumSha256,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  userId: string;
  storagePath: string;
  checksumSha256: string;
}) {
  const result = await serviceClient.rpc("record_upload_asset", {
    target_workspace_id: workspaceId,
    actor_user_id: userId,
    upload_surface: "component-attachment",
    target_entity_type: "upload-scan-worker-proof",
    target_entity_id: null,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    thumbnail_path: null,
    file_name: "scan-worker-provider-proof.pdf",
    content_type: CONTENT_TYPE,
    size_bytes: PDF_BYTES.byteLength,
    checksum_sha256: checksumSha256,
    scan_status: "pending",
    metadata: { proof: "upload-scan-worker-provider-proof" },
  });

  if (result.error) throw new Error(`record_upload_asset failed: ${result.error.message}`);
  const data = result.data as { assetId?: string; uploadSessionId?: string } | null;
  if (!data?.assetId || !data.uploadSessionId) {
    throw new Error("record_upload_asset returned an invalid payload.");
  }

  return {
    assetId: data.assetId,
    uploadSessionId: data.uploadSessionId,
  };
}

async function readScanResult(serviceClient: SupabaseClient, assetId: string) {
  const assetResult = await serviceClient
    .from("upload_assets")
    .select("id, scan_status, scan_provider, scan_result, scanned_at, checksum_sha256")
    .eq("id", assetId)
    .maybeSingle();

  if (assetResult.error) throw new Error(`scan asset readback failed: ${assetResult.error.message}`);

  const eventsResult = await serviceClient
    .from("upload_events")
    .select("event_type")
    .eq("upload_asset_id", assetId);

  if (eventsResult.error) throw new Error(`scan event readback failed: ${eventsResult.error.message}`);

  return {
    asset: assetResult.data as {
      scan_status?: string | null;
      scan_provider?: string | null;
      scan_result?: Record<string, unknown> | null;
      scanned_at?: string | null;
      checksum_sha256?: string | null;
    } | null,
    eventTypes: Array.isArray(eventsResult.data)
      ? eventsResult.data.map((row: { event_type?: string | null }) => row.event_type).filter(Boolean)
      : [],
  };
}

async function cleanupFixture({
  serviceClient,
  workspaceId,
  userId,
  storagePath,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string | null;
  userId: string | null;
  storagePath: string | null;
}) {
  const cleanupErrors: Array<{ target: string; errorMessage: string; statusCode: string | number | null }> = [];

  if (storagePath) {
    const removeResult = await serviceClient.storage.from(BUCKET).remove([storagePath]);
    if (removeResult.error) {
      cleanupErrors.push({
        target: "provider-storage-object",
        errorMessage: removeResult.error.message,
        statusCode: removeResult.error.statusCode ?? removeResult.error.status ?? null,
      });
    }
  }

  if (workspaceId) {
    const deleteWorkspace = await serviceClient.from("workspaces").delete().eq("id", workspaceId);
    if (deleteWorkspace.error) {
      cleanupErrors.push({
        target: "workspaces",
        errorMessage: deleteWorkspace.error.message,
        statusCode: deleteWorkspace.error.code ?? null,
      });
    }
  }

  if (userId) {
    const deleteUser = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteUser.error) {
      cleanupErrors.push({
        target: "auth.users",
        errorMessage: deleteUser.error.message,
        statusCode: deleteUser.error.status ?? null,
      });
    }
  }

  return cleanupErrors;
}

async function runProof() {
  const envFile = loadProofEnvFile();

  if (readEnv("ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_SCAN_WORKER_PROVIDER_PROOF is not set to 1.", [], { envFile });
  }
  if (envFile.missing) {
    return skippedReport("Requested provider proof environment file is missing.", [ENV_FILE_VAR], { envFile });
  }

  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missingEnv = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingEnv.length > 0) {
    return skippedReport("Required provider proof environment is missing.", missingEnv, { envFile });
  }

  const projectRef = projectRefFromUrl(url);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    return refusedReport("Refusing provider scan worker proof for unexpected Supabase project.", {
      expectedProjectRef: EXPECTED_PROJECT_REF,
      projectRef: projectRef || null,
      projectUrl: sanitizedProjectUrl(url),
      envFile,
    });
  }

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const proofId = randomUUID();
  let userId: string | null = null;
  let workspaceId: string | null = null;
  let storagePath: string | null = null;
  let report: Record<string, unknown> | null = null;

  try {
    userId = await createTemporaryAuthUser(serviceClient);
    workspaceId = await createWorkspaceFixture(serviceClient, userId, proofId);
    storagePath = `${workspaceId}/${userId}/scan-worker-provider-proof-${proofId}.pdf`;
    const checksumSha256 = sha256Hex(PDF_BYTES);
    const checks: ProofCheck[] = [];

    checks.push(await seedStorageObject(serviceClient, storagePath));
    const recorded = await recordPendingAsset({
      serviceClient,
      workspaceId,
      userId,
      storagePath,
      checksumSha256,
    });
    checks.push(proofCheck("pending-upload-asset-recorded", true, { proof: "record_upload_asset returned asset/session ids" }));

    const listedRecords = await listUploadScanJobRecords(serviceClient, { limit: 100 });
    const targetRecord = listedRecords.find((record) => record.assetId === recorded.assetId) ?? null;
    checks.push(proofCheck("scan-job-reader-listed-provider-asset", Boolean(targetRecord), {
      proof: targetRecord ? "pending asset was visible through listUploadScanJobRecords" : undefined,
    }));

    const telemetry: UploadOperationalTelemetryRecord[] = [];
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const jobResult = targetRecord
      ? await runUploadScanJob({
        records: [targetRecord],
        storage: createSupabaseUploadScanStorage(serviceClient),
        scanner: createUploadPolicyScannerProvider(),
        resultWriter: createUploadScanResultWriter(serviceClient),
        runId: `scan-worker-provider-proof-${proofId}`,
      })
      : null;
    setUploadOperationalTelemetrySink(null);

    checks.push(proofCheck("scan-job-ran-provider-download", jobResult?.scannedCount === 1 && jobResult.downloadFailedCount === 0, {
      proof: jobResult ? `scanned=${jobResult.scannedCount};downloadFailures=${jobResult.downloadFailedCount}` : undefined,
    }));
    checks.push(proofCheck("policy-scanner-recorded-clean-outcome", jobResult?.outcomeCounts.clean === 1, {
      proof: jobResult ? JSON.stringify(jobResult.outcomeCounts) : undefined,
    }));

    const readback = await readScanResult(serviceClient, recorded.assetId);
    checks.push(proofCheck("provider-scan-status-readback-clean", readback.asset?.scan_status === "clean", {
      proof: readback.asset?.scan_status ?? undefined,
    }));
    checks.push(proofCheck("provider-scan-event-recorded", readback.eventTypes.includes("scan_clean"), {
      proof: readback.eventTypes.join(","),
    }));
    checks.push(proofCheck("scan-telemetry-emitted", telemetry.some((event) => event.event === "upload_scan_job_completed"), {
      proof: `${telemetry.length} telemetry event(s) captured`,
    }));

    const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
    report = {
      generatedAt: new Date().toISOString(),
      mode: "upload-scan-worker-provider-proof",
      proofBoundary: "linked-provider-operation-proof",
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      passed: failedChecks.length === 0,
      failedChecks,
      checks,
      scannerProvider: "archestimator-policy-scanner",
      uploadAssetIdPresent: Boolean(recorded.assetId),
      uploadSessionIdPresent: Boolean(recorded.uploadSessionId),
      objectPathShape: "{workspaceId}/{userId}/scan-worker-provider-proof-{proofId}.pdf",
      checksumSha256,
      jobResult: sanitizeJobResult(jobResult),
      scanReadback: {
        status: readback.asset?.scan_status ?? null,
        provider: readback.asset?.scan_provider ?? null,
        scannedAtPresent: Boolean(readback.asset?.scanned_at),
        scanResultKeys: Object.keys(readback.asset?.scan_result ?? {}).sort(),
        eventTypes: readback.eventTypes,
      },
      telemetry: telemetry.map((event) => ({
        event: event.event,
        source: event.source,
        status: event.status,
        severity: event.severity,
        scanResultsRecorded: event.scanResultsRecorded,
        scanOutcomeCounts: event.scanOutcomeCounts,
      })),
      rawStoragePathRecorded: false,
      cleanupErrors: [],
      envFile,
    };

    report.rawStoragePathRecorded = JSON.stringify(report).includes(storagePath);
  } catch (error) {
    report = {
      generatedAt: new Date().toISOString(),
      mode: "upload-scan-worker-provider-proof",
      proofBoundary: "linked-provider-operation-proof",
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      passed: false,
      failedChecks: ["upload-scan-worker-provider-proof"],
      errorMessage: error instanceof Error ? error.message : String(error),
      rawStoragePathRecorded: false,
      cleanupErrors: [],
      envFile,
    };
  } finally {
    setUploadOperationalTelemetrySink(null);
    const cleanupErrors = await cleanupFixture({ serviceClient, workspaceId, userId, storagePath });
    if (report) {
      report.cleanupErrors = cleanupErrors;
      report.rawStoragePathRecorded = storagePath
        ? JSON.stringify(report).includes(storagePath)
        : Boolean(report.rawStoragePathRecorded);
      report.passed = Boolean(report.passed) && cleanupErrors.length === 0 && report.rawStoragePathRecorded === false;
      if (cleanupErrors.length > 0) {
        report.failedChecks = [...(Array.isArray(report.failedChecks) ? report.failedChecks : []), "upload-scan-worker-provider-cleanup"];
      }
    }
  }

  return report ?? refusedReport("Provider scan worker proof did not produce a report.", { envFile });
}

runProof()
  .then((report) => {
    const output = writeReport(report);
    if (report.passed) {
      console.log(`Upload scan worker provider proof passed; output=${output}`);
      return;
    }

    if (report.skipped) {
      console.log(`Upload scan worker provider proof skipped; output=${output}`);
      return;
    }

    console.error(`Upload scan worker provider proof failed; output=${output}`);
    process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
