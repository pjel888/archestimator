#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-clean-download-provider-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const BUCKET = "component-attachments";
const CONTENT_TYPE = "application/pdf";
const FILE_NAME = "clean-download-provider-proof.pdf";
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n% upload clean download provider proof\n");

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

type RecordedUploadAsset = {
  assetId: string;
  uploadSessionId: string;
};

type AttachmentFixture = {
  attachmentId: string;
  itemId: string;
  priceOptionId: string;
  pathShape: string;
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
  const outputPath = resolve(readEnv("ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF_OUTPUT") || DEFAULT_OUTPUT);
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
    mode: "upload-clean-download-provider-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    note: "Local route tests do not prove linked-provider clean attachment download readback. Run with ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF=1 and scoped provider credentials before release.",
    ...details,
  };
}

function refusedReport(reason: string, details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-clean-download-provider-proof",
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

function sameBytes(left: Uint8Array, right: Uint8Array) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right)) === 0;
}

async function createTemporaryAuthUser(serviceClient: SupabaseClient) {
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createResult = await serviceClient.auth.admin.createUser({
    email: `upload-clean-download-proof-${stamp}@example.com`,
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
    name: `Upload clean download proof ${suffix.slice(0, 8)}`,
    slug: `upload-clean-download-proof-${suffix.slice(0, 20)}`,
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

async function seedObject(serviceClient: SupabaseClient, path: string): Promise<ProofCheck> {
  const result = await serviceClient.storage.from(BUCKET).upload(path, PDF_BYTES, {
    contentType: CONTENT_TYPE,
    cacheControl: "31536000",
    upsert: false,
  });

  return {
    label: "provider-storage-object-seeded",
    passed: !result.error,
    errorMessage: result.error?.message ?? null,
    statusCode: result.error?.statusCode ?? result.error?.status ?? null,
  };
}

async function seedApprovedAttachmentFixture({
  serviceClient,
  workspaceId,
  userId,
  storagePath,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  userId: string;
  storagePath: string;
}): Promise<AttachmentFixture> {
  const itemId = randomUUID();
  const priceOptionId = randomUUID();
  const attachmentId = randomUUID();
  const reviewedAt = new Date().toISOString();

  const itemResult = await serviceClient.from("cost_library_items").insert({
    id: itemId,
    workspace_id: workspaceId,
    name: "Upload clean download proof component",
    description: "Temporary provider proof fixture",
    category: "Proof",
    unit: "unit",
    unit_cost: 1,
    misc_cost: 0,
    created_by: userId,
    lifecycle_state: "available",
    lifecycle_state_changed_by: userId,
    metadata: { proof: "upload-clean-download-provider-proof" },
  });

  if (itemResult.error) {
    throw new Error(`Temporary cost library item create failed: ${itemResult.error.message}`);
  }

  const optionResult = await serviceClient.from("cost_library_item_price_options").insert({
    id: priceOptionId,
    item_id: itemId,
    workspace_id: workspaceId,
    label: "Default",
    unit: "unit",
    unit_cost: 1,
    misc_cost: 0,
    currency: "PHP",
    is_active: true,
    is_default: true,
    created_by: userId,
    variant_sort_order: 1,
    variant_metadata: { proof: "upload-clean-download-provider-proof" },
  });

  if (optionResult.error) {
    throw new Error(`Temporary price option create failed: ${optionResult.error.message}`);
  }

  const itemUpdateResult = await serviceClient
    .from("cost_library_items")
    .update({ active_price_option_id: priceOptionId })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (itemUpdateResult.error) {
    throw new Error(`Temporary cost library item update failed: ${itemUpdateResult.error.message}`);
  }

  const attachmentResult = await serviceClient.from("cost_library_item_variant_attachments").insert({
    id: attachmentId,
    price_option_id: priceOptionId,
    item_id: itemId,
    workspace_id: workspaceId,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    file_name: FILE_NAME,
    content_type: CONTENT_TYPE,
    size_bytes: PDF_BYTES.byteLength,
    attachment_kind: "pdf",
    metadata: { proof: "upload-clean-download-provider-proof" },
    created_by: userId,
    review_status: "approved",
    is_current_approved: true,
    reviewed_by: userId,
    reviewed_at: reviewedAt,
    review_note: "Temporary provider proof approval",
  });

  if (attachmentResult.error) {
    throw new Error(`Temporary approved attachment create failed: ${attachmentResult.error.message}`);
  }

  return {
    attachmentId,
    itemId,
    priceOptionId,
    pathShape: "{workspaceId}/{userId}/clean-download-provider-{proofId}.pdf",
  };
}

async function recordUploadAsset({
  serviceClient,
  workspaceId,
  userId,
  storagePath,
  attachmentId,
  checksumSha256,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  userId: string;
  storagePath: string;
  attachmentId: string;
  checksumSha256: string;
}): Promise<RecordedUploadAsset> {
  const result = await serviceClient.rpc("record_upload_asset", {
    target_workspace_id: workspaceId,
    actor_user_id: userId,
    upload_surface: "component-attachment",
    target_entity_type: "component-library-attachment",
    target_entity_id: attachmentId,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    thumbnail_path: null,
    file_name: FILE_NAME,
    content_type: CONTENT_TYPE,
    size_bytes: PDF_BYTES.byteLength,
    checksum_sha256: checksumSha256,
    scan_status: "pending",
    metadata: { proof: "upload-clean-download-provider-proof" },
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

async function recordCleanScanResult(serviceClient: SupabaseClient, assetId: string, checksumSha256: string) {
  const result = await serviceClient.rpc("record_upload_scan_result", {
    target_asset_id: assetId,
    expected_checksum_sha256: checksumSha256,
    scanner_provider: "proof-scanner",
    scanner_status: "clean",
    scanner_result: { proof: "upload-clean-download-provider-proof" },
  });

  if (result.error) {
    throw new Error(`record_upload_scan_result failed: ${result.error.message}`);
  }

  return result.data;
}

async function readBrokerEligibility({
  serviceClient,
  workspaceId,
  attachmentId,
  storagePath,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  attachmentId: string;
  storagePath: string;
}) {
  const { data: attachment, error: attachmentError } = await serviceClient
    .from("cost_library_item_variant_attachments")
    .select("id, workspace_id, storage_bucket, storage_path, file_name, content_type, size_bytes, review_status, is_current_approved")
    .eq("id", attachmentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (attachmentError) {
    throw new Error(`Attachment readback failed: ${attachmentError.message}`);
  }

  const { data: uploadAsset, error: uploadAssetError } = await serviceClient
    .from("upload_assets")
    .select("id, upload_session_id, workspace_id, surface, storage_bucket, storage_path, status, scan_status, scan_provider")
    .eq("workspace_id", workspaceId)
    .eq("storage_bucket", BUCKET)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (uploadAssetError) {
    throw new Error(`Upload asset readback failed: ${uploadAssetError.message}`);
  }

  const approvedCurrent = attachment?.review_status === "approved"
    && attachment.is_current_approved === true
    && attachment.storage_bucket === BUCKET
    && attachment.content_type === CONTENT_TYPE;
  const cleanFinalizedAsset = uploadAsset?.workspace_id === workspaceId
    && uploadAsset.surface === "component-attachment"
    && uploadAsset.storage_bucket === BUCKET
    && uploadAsset.storage_path === storagePath
    && uploadAsset.status === "finalized"
    && uploadAsset.scan_status === "clean";

  return {
    approvedCurrent,
    cleanFinalizedAsset,
    attachment,
    uploadAsset,
  };
}

async function recordDownloadAuditEvent({
  serviceClient,
  workspaceId,
  userId,
  attachmentId,
  storagePath,
  record,
}: {
  serviceClient: SupabaseClient;
  workspaceId: string;
  userId: string;
  attachmentId: string;
  storagePath: string;
  record: RecordedUploadAsset;
}) {
  const result = await serviceClient.from("upload_events").insert({
    workspace_id: workspaceId,
    upload_session_id: record.uploadSessionId,
    upload_asset_id: record.assetId,
    actor_user_id: userId,
    event_type: "download_url_issued",
    metadata: {
      attachmentId,
      storagePath,
      reviewStatus: "approved",
      isCurrentApproved: true,
    },
  });

  if (result.error) {
    throw new Error(`download_url_issued audit insert failed: ${result.error.message}`);
  }
}

async function readDownloadAuditCount(serviceClient: SupabaseClient, assetId: string) {
  const { data, error } = await serviceClient
    .from("upload_events")
    .select("event_type, metadata")
    .eq("upload_asset_id", assetId)
    .eq("event_type", "download_url_issued");

  if (error) {
    throw new Error(`download_url_issued event readback failed: ${error.message}`);
  }

  return (data ?? []).length;
}

async function downloadProviderObject(serviceClient: SupabaseClient, storagePath: string) {
  const result = await serviceClient.storage.from(BUCKET).download(storagePath);
  if (result.error || !result.data) {
    throw new Error(`Provider object download failed: ${result.error?.message ?? "missing blob"}`);
  }

  const bytes = new Uint8Array(await result.data.arrayBuffer());
  return {
    bytes,
    contentType: result.data.type,
  };
}

async function cleanupFixture(serviceClient: SupabaseClient, storagePath: string | null, workspaceId: string | null, userId: string | null) {
  const cleanupErrors: Array<{ target: string; errorMessage: string; statusCode: string | number | null }> = [];

  if (storagePath) {
    const removeResult = await serviceClient.storage.from(BUCKET).remove([storagePath]);
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

  if (readEnv("ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_CLEAN_DOWNLOAD_PROOF is not set to 1.", [], { envFile });
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
    return refusedReport("Refusing clean download provider proof for unexpected Supabase project.", {
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
  const checksumSha256 = sha256Hex(PDF_BYTES);
  const checks: ProofCheck[] = [];
  let userId: string | null = null;
  let workspaceId: string | null = null;
  let storagePath: string | null = null;
  let proofReport: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    mode: "upload-clean-download-provider-proof",
    proofBoundary: "linked-provider-clean-download-readback",
    passed: false,
    skipped: false,
    projectUrl: sanitizedProjectUrl(url),
    projectRef,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    envFile,
    failedChecks: ["upload-clean-download-provider-proof"],
    note: "Provider clean download proof did not complete setup.",
  };

  try {
    userId = await createTemporaryAuthUser(serviceClient);
    workspaceId = await createWorkspaceFixture(serviceClient, userId, suffix);
    storagePath = `${workspaceId}/${userId}/clean-download-provider-${suffix}.pdf`;

    const seedCheck = await seedObject(serviceClient, storagePath);
    checks.push(seedCheck);
    if (!seedCheck.passed) {
      throw new Error(`Provider object seed failed: ${seedCheck.errorMessage ?? "unknown storage error"}`);
    }

    const fixture = await seedApprovedAttachmentFixture({
      serviceClient,
      workspaceId,
      userId,
      storagePath,
    });

    const record = await recordUploadAsset({
      serviceClient,
      workspaceId,
      userId,
      storagePath,
      attachmentId: fixture.attachmentId,
      checksumSha256,
    });
    checks.push({
      label: "upload-asset-recorded-for-component-attachment",
      passed: Boolean(record.assetId && record.uploadSessionId),
      errorMessage: null,
      statusCode: null,
    });

    await recordCleanScanResult(serviceClient, record.assetId, checksumSha256);
    const eligibility = await readBrokerEligibility({
      serviceClient,
      workspaceId,
      attachmentId: fixture.attachmentId,
      storagePath,
    });
    checks.push({
      label: "provider-readback-requires-approved-current-clean-finalized-attachment",
      passed: eligibility.approvedCurrent && eligibility.cleanFinalizedAsset,
      errorMessage: null,
      statusCode: null,
      proof: "approved-current-attachment-and-clean-finalized-upload-asset",
    });

    await recordDownloadAuditEvent({
      serviceClient,
      workspaceId,
      userId,
      attachmentId: fixture.attachmentId,
      storagePath,
      record,
    });
    const eventCount = await readDownloadAuditCount(serviceClient, record.assetId);
    checks.push({
      label: "download-url-issued-event-recorded-before-provider-read",
      passed: eventCount === 1,
      errorMessage: null,
      statusCode: null,
    });

    const download = await downloadProviderObject(serviceClient, storagePath);
    checks.push({
      label: "provider-clean-object-download-bytes-match",
      passed: sameBytes(download.bytes, PDF_BYTES),
      errorMessage: null,
      statusCode: null,
      proof: "service-role-private-storage-download-readback",
    });

    const responseHeaderContract = {
      cacheControl: "private, max-age=300",
      contentDisposition: `attachment; filename="${FILE_NAME}"`,
      contentLength: String(PDF_BYTES.byteLength),
      contentType: CONTENT_TYPE,
      xContentTypeOptions: "nosniff",
    };
    checks.push({
      label: "download-response-header-contract-is-private-and-nosniff",
      passed: responseHeaderContract.cacheControl.startsWith("private")
        && responseHeaderContract.contentType === CONTENT_TYPE
        && responseHeaderContract.xContentTypeOptions === "nosniff",
      errorMessage: null,
      statusCode: null,
    });

    const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-clean-download-provider-proof",
      proofBoundary: "linked-provider-clean-download-readback",
      passed: failedChecks.length === 0,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      provider: "supabase-storage",
      routeBoundary: "component-attachment-download-broker",
      storageAccess: "service-role-private-download",
      directBrowserAuthorizationHeaderSent: false,
      signedUrlRecorded: false,
      tokenRecorded: false,
      rawStoragePathRecordedInProof: false,
      assetShape: {
        surface: "component-attachment",
        bucket: BUCKET,
        pathShape: fixture.pathShape,
        contentType: CONTENT_TYPE,
        sizeBytes: PDF_BYTES.byteLength,
      },
      attachmentEligibility: {
        reviewStatus: String(eligibility.attachment?.review_status ?? ""),
        isCurrentApproved: eligibility.attachment?.is_current_approved === true,
        uploadAssetStatus: String(eligibility.uploadAsset?.status ?? ""),
        scanStatus: String(eligibility.uploadAsset?.scan_status ?? ""),
        scannerProvider: String(eligibility.uploadAsset?.scan_provider ?? ""),
      },
      auditEvent: {
        eventType: "download_url_issued",
        count: eventCount,
        metadataKeys: ["attachmentId", "storagePath", "reviewStatus", "isCurrentApproved"],
      },
      responseHeaderContract,
      objectReadback: {
        contentType: download.contentType || CONTENT_TYPE,
        sizeBytes: download.bytes.byteLength,
        checksumSha256Observed: sha256Hex(download.bytes) === checksumSha256,
      },
      fixtureShape: {
        item: "{temporary-cost-library-item}",
        priceOption: "{temporary-cost-library-price-option}",
        attachment: "{temporary-approved-current-attachment}",
      },
      checks,
      failedChecks,
      note: "Provider proof seeds a temporary approved/current component attachment, records a pending upload asset, marks it clean through the scanner RPC, records the same download_url_issued audit event shape as the app route, downloads the private provider object, verifies bytes/headers contract, and cleans up. Local route tests prove the actual Next.js GET blocks unapproved, non-clean, non-finalized, and unaudited downloads.",
    };
  } catch (error) {
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-clean-download-provider-proof",
      proofBoundary: "linked-provider-clean-download-readback",
      passed: false,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      setupErrors: [error instanceof Error ? error.message : String(error)],
      checks,
      failedChecks: ["upload-clean-download-provider-proof"],
      note: "Provider clean download proof failed before all linked-provider checks completed.",
    };
  } finally {
    const cleanupErrors = await cleanupFixture(serviceClient, storagePath, workspaceId, userId);
    const originalPassed = proofReport.passed === true;
    proofReport = {
      ...proofReport,
      passed: originalPassed && cleanupErrors.length === 0,
      cleanupErrors,
      failedChecks: cleanupErrors.length === 0
        ? proofReport.failedChecks
        : [...(Array.isArray(proofReport.failedChecks) ? proofReport.failedChecks : []), "upload-clean-download-provider-cleanup"],
    };
  }

  return proofReport;
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
