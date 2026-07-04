#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-scan-rpc-provider-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_SCAN_RPC_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

type ProofCheck = {
  label: string;
  passed: boolean;
  errorMessage: string | null;
  statusCode: string | number | null;
};

type ProofAsset = {
  label: string;
  assetId: string;
  uploadSessionId: string;
  checksumSha256: string;
  surface: "component-attachment" | "component-image";
  pathShape: string;
};

type EnvFileResult = {
  requested: boolean;
  loaded: boolean;
  missing?: boolean;
  path?: string;
  names?: string[];
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
    if (!normalized || normalized.startsWith("#")) {
      continue;
    }

    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    if (!PROOF_ENV_FILE_NAMES.has(name)) {
      continue;
    }

    if (!process.env[name]) {
      process.env[name] = decodeEnvValue(rawValue);
      names.push(name);
    }
  }

  return { requested: true, loaded: true, path: requestedPath, names };
}

function writeReport(report: Record<string, unknown>) {
  const outputPath = resolve(readEnv("ARCH_UPLOAD_SCAN_RPC_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function projectRefFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    if (!host.endsWith(".supabase.co")) {
      return "";
    }

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
    mode: "upload-scan-rpc-provider-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    note: "Static scanner lifecycle tests do not prove linked-provider scanner RPC execution. Run with ARCH_UPLOAD_SCAN_RPC_PROOF=1 and scoped provider credentials before release.",
    ...details,
  };
}

function refusedReport(reason: string, details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-scan-rpc-provider-proof",
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

async function createTemporaryAuthUser(serviceClient: SupabaseClient) {
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createResult = await serviceClient.auth.admin.createUser({
    email: `upload-scan-proof-${stamp}@example.com`,
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
    name: `Upload scan proof ${suffix.slice(0, 8)}`,
    slug: `upload-scan-proof-${suffix.slice(0, 20)}`,
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

async function recordProofAsset({
  serviceClient,
  workspaceId,
  userId,
  suffix,
  label,
  surface = "component-attachment",
  scanStatus = "pending",
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  userId: string;
  suffix: string;
  label: string;
  surface?: "component-attachment" | "component-image";
  scanStatus?: "pending" | "not_required";
}): Promise<ProofAsset> {
  const bytes = surface === "component-attachment"
    ? new TextEncoder().encode(`%PDF-1.7\n% ${label}`)
    : new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const checksumSha256 = sha256Hex(bytes);
  const extension = surface === "component-attachment" ? "pdf" : "webp";
  const bucket = surface === "component-attachment" ? "component-attachments" : "component-images";
  const path = `${workspaceId}/${userId}/scan-rpc-${label}-${suffix}.${extension}`;
  const contentType = surface === "component-attachment" ? "application/pdf" : "image/webp";
  const result = await serviceClient.rpc("record_upload_asset", {
    target_workspace_id: workspaceId,
    actor_user_id: userId,
    upload_surface: surface,
    target_entity_type: "upload-scan-proof",
    target_entity_id: null,
    storage_bucket: bucket,
    storage_path: path,
    thumbnail_path: null,
    file_name: `scan-rpc-${label}.${extension}`,
    content_type: contentType,
    size_bytes: bytes.byteLength,
    checksum_sha256: checksumSha256,
    scan_status: scanStatus,
    metadata: { proof: "upload-scan-rpc-provider-proof", label },
  });

  if (result.error) {
    throw new Error(`record_upload_asset failed for ${label}: ${result.error.message}`);
  }

  const data = result.data as { assetId?: string; uploadSessionId?: string } | null;
  if (!data?.assetId || !data.uploadSessionId) {
    throw new Error(`record_upload_asset returned an invalid payload for ${label}`);
  }

  return {
    label,
    assetId: data.assetId,
    uploadSessionId: data.uploadSessionId,
    checksumSha256,
    surface,
    pathShape: surface === "component-attachment"
      ? "{workspaceId}/{userId}/scan-rpc-{case}-{proofId}.pdf"
      : "{workspaceId}/{userId}/scan-rpc-{case}-{proofId}.webp",
  };
}

async function expectRpcDenied(label: string, operation: () => PromiseLike<{ error: { message?: string | null; status?: string | number | null; statusCode?: string | number | null } | null }>): Promise<ProofCheck> {
  try {
    const result = await operation();
    return {
      label,
      passed: Boolean(result.error),
      errorMessage: result.error?.message ?? null,
      statusCode: result.error?.statusCode ?? result.error?.status ?? null,
    };
  } catch (error) {
    return {
      label,
      passed: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      statusCode: null,
    };
  }
}

async function recordScanResult(serviceClient: SupabaseClient, asset: ProofAsset, scannerStatus: string) {
  const result = await serviceClient.rpc("record_upload_scan_result", {
    target_asset_id: asset.assetId,
    expected_checksum_sha256: asset.checksumSha256,
    scanner_provider: "proof-scanner",
    scanner_status: scannerStatus,
    scanner_result: { proof: "upload-scan-rpc-provider-proof", label: asset.label, scannerStatus },
  });

  if (result.error) {
    throw new Error(`record_upload_scan_result failed for ${asset.label}: ${result.error.message}`);
  }

  return result.data;
}

async function approveOverride(serviceClient: SupabaseClient, asset: ProofAsset, actorUserId: string) {
  const result = await serviceClient.rpc("approve_upload_scan_override", {
    target_asset_id: asset.assetId,
    override_actor_user_id: actorUserId,
    override_reason: `Proof override for ${asset.label}`,
    override_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    expected_checksum_sha256: asset.checksumSha256,
  });

  if (result.error) {
    throw new Error(`approve_upload_scan_override failed for ${asset.label}: ${result.error.message}`);
  }

  return result.data;
}

async function cleanupFixture(serviceClient: SupabaseClient, workspaceId: string | null, userId: string | null) {
  const cleanupErrors: Array<{ target: string; errorMessage: string; statusCode: string | number | null }> = [];

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

  if (readEnv("ARCH_UPLOAD_SCAN_RPC_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_SCAN_RPC_PROOF is not set to 1.", [], { envFile });
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
    return refusedReport("Refusing provider scan RPC proof for unexpected Supabase project.", {
      expectedProjectRef: EXPECTED_PROJECT_REF,
      projectRef: projectRef || null,
      projectUrl: sanitizedProjectUrl(url),
      envFile,
    });
  }

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = randomUUID();
  const checks: ProofCheck[] = [];
  let userId: string | null = null;
  let workspaceId: string | null = null;
  const assets: ProofAsset[] = [];
  let proofReport: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    mode: "upload-scan-rpc-provider-proof",
    proofBoundary: "linked-provider-scan-rpc-readback",
    passed: false,
    skipped: false,
    projectUrl: sanitizedProjectUrl(url),
    projectRef,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    envFile,
    assetFixtureCount: 0,
    checks,
    failedChecks: ["upload-scan-rpc-provider-proof"],
    note: "Provider scan RPC proof did not complete setup.",
  };

  try {
    userId = await createTemporaryAuthUser(serviceClient);
    workspaceId = await createWorkspaceFixture(serviceClient, userId, suffix);

    const cleanAsset = await recordProofAsset({ serviceClient, workspaceId, userId, suffix, label: "clean" });
    const transientAsset = await recordProofAsset({ serviceClient, workspaceId, userId, suffix, label: "failed-transient" });
    const infectedAsset = await recordProofAsset({ serviceClient, workspaceId, userId, suffix, label: "infected" });
    const permanentAsset = await recordProofAsset({ serviceClient, workspaceId, userId, suffix, label: "failed-permanent" });
    const unsupportedAsset = await recordProofAsset({ serviceClient, workspaceId, userId, suffix, label: "unsupported" });
    const checksumMismatchAsset = await recordProofAsset({ serviceClient, workspaceId, userId, suffix, label: "checksum-mismatch" });
    const nonAttachmentAsset = await recordProofAsset({
      serviceClient,
      workspaceId,
      userId,
      suffix,
      label: "non-attachment",
      surface: "component-image",
      scanStatus: "not_required",
    });
    assets.push(cleanAsset, transientAsset, infectedAsset, permanentAsset, unsupportedAsset, checksumMismatchAsset, nonAttachmentAsset);

    await recordScanResult(serviceClient, cleanAsset, "clean");
    await recordScanResult(serviceClient, transientAsset, "failed_transient");
    await recordScanResult(serviceClient, infectedAsset, "infected");
    await recordScanResult(serviceClient, permanentAsset, "failed_permanent");
    await recordScanResult(serviceClient, unsupportedAsset, "unsupported");

    checks.push(await expectRpcDenied("record-scan-result-rejects-checksum-mismatch", () => serviceClient.rpc("record_upload_scan_result", {
      target_asset_id: checksumMismatchAsset.assetId,
      expected_checksum_sha256: sha256Hex("wrong checksum"),
      scanner_provider: "proof-scanner",
      scanner_status: "clean",
      scanner_result: { proof: "checksum-mismatch" },
    })));

    checks.push(await expectRpcDenied("record-scan-result-rejects-non-attachment", () => serviceClient.rpc("record_upload_scan_result", {
      target_asset_id: nonAttachmentAsset.assetId,
      expected_checksum_sha256: nonAttachmentAsset.checksumSha256,
      scanner_provider: "proof-scanner",
      scanner_status: "clean",
      scanner_result: { proof: "non-attachment" },
    })));

    checks.push(await expectRpcDenied("scan-override-rejects-checksum-mismatch", () => serviceClient.rpc("approve_upload_scan_override", {
      target_asset_id: unsupportedAsset.assetId,
      override_actor_user_id: userId,
      override_reason: "Proof wrong checksum",
      override_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      expected_checksum_sha256: sha256Hex("wrong override checksum"),
    })));

    await approveOverride(serviceClient, permanentAsset, userId);
    await approveOverride(serviceClient, unsupportedAsset, userId);

    const { data: assetRows, error: assetRowsError } = await serviceClient
      .from("upload_assets")
      .select("id, surface, scan_status, scan_provider, scanned_at, scan_override_actor_user_id, scan_override_reason, scan_override_expires_at")
      .in("id", assets.map((asset) => asset.assetId));
    if (assetRowsError) {
      throw new Error(`Upload asset readback failed: ${assetRowsError.message}`);
    }

    const assetStatusByLabel = Object.fromEntries(assets.map((asset) => {
      const row = (assetRows ?? []).find((item) => item.id === asset.assetId) as {
        scan_status?: string;
        scan_provider?: string | null;
        scanned_at?: string | null;
        scan_override_actor_user_id?: string | null;
        scan_override_reason?: string | null;
        scan_override_expires_at?: string | null;
      } | undefined;
      return [asset.label, {
        scanStatus: row?.scan_status ?? null,
        scanProvider: row?.scan_provider ?? null,
        scanned: Boolean(row?.scanned_at),
        overrideAudited: Boolean(row?.scan_override_actor_user_id && row.scan_override_reason && row.scan_override_expires_at),
      }];
    }));

    const { data: eventRows, error: eventRowsError } = await serviceClient
      .from("upload_events")
      .select("event_type")
      .in("upload_asset_id", assets.map((asset) => asset.assetId));
    if (eventRowsError) {
      throw new Error(`Upload event readback failed: ${eventRowsError.message}`);
    }

    const eventTypeCounts = (eventRows ?? []).reduce<Record<string, number>>((accumulator, row) => {
      const eventType = String(row.event_type);
      accumulator[eventType] = (accumulator[eventType] ?? 0) + 1;
      return accumulator;
    }, {});

    const expectedStatuses: Record<string, string> = {
      clean: "clean",
      "failed-transient": "failed_transient",
      infected: "infected",
      "failed-permanent": "override_approved",
      unsupported: "override_approved",
      "checksum-mismatch": "pending",
      "non-attachment": "not_required",
    };
    checks.push({
      label: "provider-readback-statuses-match-scan-rpc-results",
      passed: Object.entries(expectedStatuses).every(([label, status]) => assetStatusByLabel[label]?.scanStatus === status),
      errorMessage: null,
      statusCode: null,
    });
    checks.push({
      label: "provider-readback-records-scan-events",
      passed: [
        "scan_clean",
        "scan_failed_transient",
        "scan_infected",
        "scan_failed_permanent",
        "scan_unsupported",
        "scan_override_approved",
      ].every((eventType) => (eventTypeCounts[eventType] ?? 0) > 0),
      errorMessage: null,
      statusCode: null,
    });

    const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-scan-rpc-provider-proof",
      proofBoundary: "linked-provider-scan-rpc-readback",
      passed: failedChecks.length === 0,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      assetFixtureCount: assets.length,
      assetShapes: assets.map((asset) => ({
        label: asset.label,
        surface: asset.surface,
        pathShape: asset.pathShape,
      })),
      assetStatusByLabel,
      eventTypeCounts,
      deniedChecks: checks.filter((check) => check.label.includes("rejects")).map((check) => check.label),
      checks,
      failedChecks,
      note: "Provider proof exercises linked Supabase scanner RPC state transitions and override audit fields for temporary upload_assets rows. It does not run a scanner/CDR engine, queue worker, attachment download route, hosted runtime, or browser workflow.",
    };
  } catch (error) {
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-scan-rpc-provider-proof",
      proofBoundary: "linked-provider-scan-rpc-readback",
      passed: false,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      setupErrors: [error instanceof Error ? error.message : String(error)],
      assetFixtureCount: assets.length,
      checks,
      failedChecks: ["upload-scan-rpc-provider-proof"],
      note: "Provider scan RPC proof failed before all linked-provider readback checks completed.",
    };
  } finally {
    const cleanupErrors = await cleanupFixture(serviceClient, workspaceId, userId);
    const originalPassed = proofReport?.passed === true;
    proofReport = {
      ...proofReport,
      passed: originalPassed && cleanupErrors.length === 0,
      cleanupErrors,
      failedChecks: cleanupErrors.length === 0
        ? proofReport?.failedChecks
        : [...(Array.isArray(proofReport?.failedChecks) ? proofReport.failedChecks : []), "upload-scan-rpc-provider-cleanup"],
    };
  }

  return proofReport;
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
