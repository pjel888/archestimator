#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  createSupabaseDirectUploadProvider,
  validateProviderObjectHead,
  type SignedSinglePartUploadSession,
} from "@/lib/uploads/provider-portability";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-signed-provider-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_SIGNED_PROVIDER_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

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
  const outputPath = resolve(readEnv("ARCH_UPLOAD_SIGNED_PROVIDER_PROOF_OUTPUT") || DEFAULT_OUTPUT);
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
    mode: "upload-signed-provider-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    note: "Local provider portability tests do not prove linked-provider signed upload execution. Run with ARCH_UPLOAD_SIGNED_PROVIDER_PROOF=1 and scoped provider credentials before platform completion.",
    ...details,
  };
}

function refusedReport(reason: string, details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-signed-provider-proof",
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
    email: `upload-signed-proof-${stamp}@example.com`,
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
    name: `Upload signed proof ${suffix.slice(0, 8)}`,
    slug: `upload-signed-proof-${suffix.slice(0, 20)}`,
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

async function uploadWithoutAuthorizationHeader(session: SignedSinglePartUploadSession, bytes: Uint8Array) {
  const response = await fetch(session.uploadUrl, {
    method: session.method,
    headers: {
      "cache-control": "max-age=31536000",
      "content-type": session.constraints.contentType,
      "x-upsert": "false",
    },
    body: bytes,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Signed upload failed with ${response.status}: ${message.slice(0, 240)}`);
  }

  return {
    status: response.status,
    authorizationHeaderSent: false,
  };
}

async function recordUploadAsset({
  serviceClient,
  workspaceId,
  userId,
  bucket,
  path,
  checksumSha256,
  sizeBytes,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  userId: string;
  bucket: string;
  path: string;
  checksumSha256: string;
  sizeBytes: number;
}) {
  const result = await serviceClient.rpc("record_upload_asset", {
    target_workspace_id: workspaceId,
    actor_user_id: userId,
    upload_surface: "component-attachment",
    target_entity_type: "upload-signed-provider-proof",
    target_entity_id: null,
    storage_bucket: bucket,
    storage_path: path,
    thumbnail_path: null,
    file_name: "signed-provider-proof.pdf",
    content_type: "application/pdf",
    size_bytes: sizeBytes,
    checksum_sha256: checksumSha256,
    scan_status: "pending",
    metadata: { proof: "upload-signed-provider-proof" },
  });

  if (result.error) {
    throw new Error(`record_upload_asset failed: ${result.error.message}`);
  }

  const data = result.data as { assetId?: string; uploadSessionId?: string } | null;
  if (!data?.assetId || !data.uploadSessionId) {
    throw new Error("record_upload_asset returned an invalid payload");
  }

  return data;
}

async function cleanupFixture(serviceClient: SupabaseClient, bucket: string | null, path: string | null, workspaceId: string | null, userId: string | null) {
  const cleanupErrors: Array<{ target: string; errorMessage: string; statusCode: string | number | null }> = [];

  if (bucket && path) {
    const removeResult = await serviceClient.storage.from(bucket).remove([path]);
    if (removeResult.error) {
      cleanupErrors.push({
        target: "storage.objects",
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

  if (readEnv("ARCH_UPLOAD_SIGNED_PROVIDER_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_SIGNED_PROVIDER_PROOF is not set to 1.", [], { envFile });
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
    return refusedReport("Refusing signed upload provider proof for unexpected Supabase project.", {
      expectedProjectRef: EXPECTED_PROJECT_REF,
      projectRef: projectRef || null,
      projectUrl: sanitizedProjectUrl(url),
      envFile,
    });
  }

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const provider = createSupabaseDirectUploadProvider(serviceClient);

  const suffix = randomUUID();
  const bytes = new TextEncoder().encode("%PDF-1.7\n% signed provider proof\n");
  const checksumSha256 = sha256Hex(bytes);
  const bucket = "component-attachments";
  const checks: ProofCheck[] = [];
  let userId: string | null = null;
  let workspaceId: string | null = null;
  let storagePath: string | null = null;
  let proofReport: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    mode: "upload-signed-provider-proof",
    proofBoundary: "linked-provider-signed-upload-readback",
    passed: false,
    skipped: false,
    projectUrl: sanitizedProjectUrl(url),
    projectRef,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    envFile,
    failedChecks: ["upload-signed-provider-proof"],
    note: "Provider signed upload proof did not complete setup.",
  };

  try {
    userId = await createTemporaryAuthUser(serviceClient);
    workspaceId = await createWorkspaceFixture(serviceClient, userId, suffix);
    storagePath = `${workspaceId}/${userId}/signed-provider-${suffix}.pdf`;
    const pathShape = "{workspaceId}/{userId}/signed-provider-{proofId}.pdf";

    const session = await provider.createSignedUploadSession({
      bucket,
      path: storagePath,
      contentType: "application/pdf",
      sizeBytes: bytes.byteLength,
      maxBytes: bytes.byteLength,
      checksumSha256,
      expiresInSeconds: 300,
    });
    checks.push({
      label: "provider-issued-signed-single-part-session",
      passed: session.kind === "signed_single_part"
        && session.method === "PUT"
        && session.requiresFinalizeRpc
        && session.constraints.bucket === bucket
        && session.constraints.path === storagePath
        && new URL(session.uploadUrl).searchParams.has("token"),
      errorMessage: null,
      statusCode: null,
    });

    const uploadResult = await uploadWithoutAuthorizationHeader(session, bytes);
    checks.push({
      label: "signed-upload-accepts-token-without-authorization-header",
      passed: uploadResult.status >= 200 && uploadResult.status < 300 && !uploadResult.authorizationHeaderSent,
      errorMessage: null,
      statusCode: uploadResult.status,
    });

    const head = await provider.headObject({ bucket, path: storagePath });
    const validation = validateProviderObjectHead(session.constraints, head);
    checks.push({
      label: "provider-object-head-validates-finalization",
      passed: validation.ok,
      errorMessage: validation.ok ? null : validation.reason,
      statusCode: null,
      proof: validation.ok ? validation.proof : undefined,
    });
    checks.push({
      label: "provider-object-head-rejects-path-mismatch",
      passed: validateProviderObjectHead(session.constraints, { ...head, path: `${storagePath}-wrong` }).ok === false,
      errorMessage: null,
      statusCode: null,
    });

    const record = await recordUploadAsset({
      serviceClient,
      workspaceId,
      userId,
      bucket,
      path: storagePath,
      checksumSha256,
      sizeBytes: bytes.byteLength,
    });

    const { data: assetRows, error: assetRowsError } = await serviceClient
      .from("upload_assets")
      .select("id, surface, scan_status, storage_bucket")
      .eq("id", record.assetId);
    if (assetRowsError) {
      throw new Error(`Upload asset readback failed: ${assetRowsError.message}`);
    }

    const assetRow = assetRows?.[0] as { surface?: string; scan_status?: string; storage_bucket?: string } | undefined;
    checks.push({
      label: "signed-upload-finalization-records-upload-asset",
      passed: assetRow?.surface === "component-attachment"
        && assetRow.scan_status === "pending"
        && assetRow.storage_bucket === bucket,
      errorMessage: null,
      statusCode: null,
    });

    const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-signed-provider-proof",
      proofBoundary: "linked-provider-signed-upload-readback",
      passed: failedChecks.length === 0,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      provider: "supabase-storage",
      uploadMode: "signed_single_part",
      resumableImplemented: false,
      signedUrlRecorded: false,
      tokenRecorded: false,
      uploadedWithAuthorizationHeader: false,
      assetShape: {
        surface: "component-attachment",
        bucket,
        pathShape,
        contentType: "application/pdf",
        sizeBytes: bytes.byteLength,
      },
      objectHead: {
        contentType: head.contentType,
        sizeBytes: head.sizeBytes,
        etagObserved: Boolean(head.etag),
        checksumObserved: Boolean(head.checksumSha256),
        validationProof: validation.ok ? validation.proof : null,
      },
      uploadAssetRecorded: true,
      checks,
      failedChecks,
      note: "Provider proof exercises Supabase signed single-part upload URL issuance, token-only upload without Authorization header, object metadata readback, finalization validation, and upload asset recording. It does not implement TUS/resumable/multipart flows or app-route/browser integration.",
    };
  } catch (error) {
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-signed-provider-proof",
      proofBoundary: "linked-provider-signed-upload-readback",
      passed: false,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      setupErrors: [error instanceof Error ? error.message : String(error)],
      checks,
      failedChecks: ["upload-signed-provider-proof"],
      note: "Provider signed upload proof failed before all linked-provider checks completed.",
    };
  } finally {
    const cleanupErrors = await cleanupFixture(serviceClient, bucket, storagePath, workspaceId, userId);
    const originalPassed = proofReport.passed === true;
    proofReport = {
      ...proofReport,
      passed: originalPassed && cleanupErrors.length === 0,
      cleanupErrors,
      failedChecks: cleanupErrors.length === 0
        ? proofReport.failedChecks
        : [...(Array.isArray(proofReport.failedChecks) ? proofReport.failedChecks : []), "upload-signed-provider-cleanup"],
    };
  }

  return proofReport;
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
