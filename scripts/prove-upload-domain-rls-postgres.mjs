#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-domain-rls-proof.json";
const UPLOAD_DOMAIN_TABLES = ["upload_sessions", "upload_assets", "upload_events"];

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function writeReport(report) {
  const outputPath = resolve(readEnv("ARCH_UPLOAD_DOMAIN_RLS_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function skippedReport(reason, missingEnv = []) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-domain-rls-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    checkedTables: UPLOAD_DOMAIN_TABLES,
    note: "Static migration tests do not prove hosted Supabase upload-domain grants, RLS, or RPC behavior. Run with ARCH_UPLOAD_DOMAIN_RLS_PROOF=1 and scoped proof credentials before release.",
  };
}

async function expectDenied({ label, operation }) {
  try {
    const result = await operation();
    const error = result?.error ?? null;
    return {
      label,
      passed: Boolean(error),
      expectation: "denied",
      errorMessage: error?.message ?? null,
      statusCode: error?.statusCode ?? error?.status ?? null,
    };
  } catch (error) {
    return {
      label,
      passed: true,
      expectation: "denied",
      errorMessage: error instanceof Error ? error.message : String(error),
      statusCode: null,
    };
  }
}

async function expectRpcNull({ label, operation }) {
  const result = await operation();
  return {
    label,
    passed: !result.error && result.data === null,
    expectation: "null",
    errorMessage: result.error?.message ?? null,
    data: result.data ?? null,
  };
}

async function expectRpcDescriptor({ label, operation, expectedAssetId }) {
  const result = await operation();
  const data = result.data && typeof result.data === "object" ? result.data : null;
  return {
    label,
    passed: !result.error && data?.assetId === expectedAssetId,
    expectation: "descriptor",
    errorMessage: result.error?.message ?? null,
    data,
  };
}

async function cleanupProofRows(serviceClient, uploadSessionId, uploadAssetId) {
  const cleanup = [];
  if (uploadSessionId) {
    cleanup.push(await serviceClient.from("upload_events").delete().eq("upload_session_id", uploadSessionId));
  }
  if (uploadAssetId) {
    cleanup.push(await serviceClient.from("upload_events").delete().eq("upload_asset_id", uploadAssetId));
    cleanup.push(await serviceClient.from("upload_assets").delete().eq("id", uploadAssetId));
  }
  if (uploadSessionId) {
    cleanup.push(await serviceClient.from("upload_sessions").delete().eq("id", uploadSessionId));
  }
  return cleanup.map((result) => result.error?.message).filter(Boolean);
}

async function runProof() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authToken = readEnv("ARCH_UPLOAD_PROOF_AUTH_TOKEN");
  const workspaceId = readEnv("ARCH_UPLOAD_PROOF_WORKSPACE_ID");
  const userId = readEnv("ARCH_UPLOAD_PROOF_USER_ID");
  const projectId = readEnv("ARCH_UPLOAD_PROOF_PROJECT_ID");
  const estimateId = readEnv("ARCH_UPLOAD_PROOF_ESTIMATE_ID");
  const rowId = readEnv("ARCH_UPLOAD_PROOF_ROW_ID");
  const missingEnv = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["ARCH_UPLOAD_PROOF_AUTH_TOKEN", authToken],
    ["ARCH_UPLOAD_PROOF_WORKSPACE_ID", workspaceId],
    ["ARCH_UPLOAD_PROOF_USER_ID", userId],
    ["ARCH_UPLOAD_PROOF_PROJECT_ID", projectId],
    ["ARCH_UPLOAD_PROOF_ESTIMATE_ID", estimateId],
    ["ARCH_UPLOAD_PROOF_ROW_ID", rowId],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (readEnv("ARCH_UPLOAD_DOMAIN_RLS_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_DOMAIN_RLS_PROOF is not set to 1.");
  }
  if (missingEnv.length > 0) {
    return skippedReport("Required provider proof environment is missing.", missingEnv);
  }

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
  });
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const storagePath = `${workspaceId}/${userId}/estimate-row-images/${estimateId}/domain-proof-${suffix}.webp`;
  const thumbnailPath = `${workspaceId}/${userId}/estimate-row-images/${estimateId}/domain-proof-${suffix}-thumb.webp`;
  const checks = [];
  let uploadSessionId = null;
  let uploadAssetId = null;

  for (const table of UPLOAD_DOMAIN_TABLES) {
    checks.push(await expectDenied({
      label: `${table}:anon-direct-select`,
      operation: () => anonClient.from(table).select("id").limit(1),
    }));
    checks.push(await expectDenied({
      label: `${table}:authenticated-direct-select`,
      operation: () => authClient.from(table).select("id").limit(1),
    }));
  }

  checks.push(await expectDenied({
    label: "record_upload_asset:authenticated-denied",
    operation: () => authClient.rpc("record_upload_asset", {
      target_workspace_id: workspaceId,
      actor_user_id: userId,
      upload_surface: "component-image",
      target_entity_type: "estimate-row",
      target_entity_id: rowId,
      storage_bucket: "component-images",
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_name: "domain-proof.webp",
      content_type: "image/webp",
      size_bytes: 16,
      checksum_sha256: "0".repeat(64),
      scan_status: "not_required",
      metadata: { projectId, estimateId, rowItemId: rowId, width: 1, height: 1 },
    }),
  }));

  const seedResult = await serviceClient.rpc("record_upload_asset", {
    target_workspace_id: workspaceId,
    actor_user_id: userId,
    upload_surface: "component-image",
    target_entity_type: "estimate-row",
    target_entity_id: rowId,
    storage_bucket: "component-images",
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    file_name: "domain-proof.webp",
    content_type: "image/webp",
    size_bytes: 16,
    checksum_sha256: "0".repeat(64),
    scan_status: "not_required",
    metadata: { projectId, estimateId, rowItemId: rowId, width: 1, height: 1 },
  });

  if (seedResult.error || !seedResult.data?.assetId || !seedResult.data?.uploadSessionId) {
    checks.push({
      label: "record_upload_asset:service-seed",
      passed: false,
      expectation: "service seed",
      errorMessage: seedResult.error?.message ?? "record_upload_asset returned no asset descriptor.",
      data: seedResult.data ?? null,
    });
  } else {
    uploadSessionId = seedResult.data.uploadSessionId;
    uploadAssetId = seedResult.data.assetId;

    checks.push(await expectDenied({
      label: "get_upload_asset_descriptor:anon-denied",
      operation: () => anonClient.rpc("get_upload_asset_descriptor", {
        target_asset_id: uploadAssetId,
      }),
    }));
    checks.push(await expectRpcDescriptor({
      label: "get_upload_asset_descriptor:authenticated-own-asset",
      expectedAssetId: uploadAssetId,
      operation: () => authClient.rpc("get_upload_asset_descriptor", {
        target_asset_id: uploadAssetId,
      }),
    }));
    checks.push(await expectDenied({
      label: "validate_estimate_row_image_asset:anon-denied",
      operation: () => anonClient.rpc("validate_estimate_row_image_asset", {
        target_asset_id: uploadAssetId,
        target_upload_session_id: uploadSessionId,
        target_project_id: projectId,
        target_estimate_id: estimateId,
        target_row_id: rowId,
      }),
    }));
    checks.push(await expectRpcDescriptor({
      label: "validate_estimate_row_image_asset:authenticated-row-bound-asset",
      expectedAssetId: uploadAssetId,
      operation: () => authClient.rpc("validate_estimate_row_image_asset", {
        target_asset_id: uploadAssetId,
        target_upload_session_id: uploadSessionId,
        target_project_id: projectId,
        target_estimate_id: estimateId,
        target_row_id: rowId,
      }),
    }));
    checks.push(await expectRpcNull({
      label: "validate_estimate_row_image_asset:wrong-row-null",
      operation: () => authClient.rpc("validate_estimate_row_image_asset", {
        target_asset_id: uploadAssetId,
        target_upload_session_id: uploadSessionId,
        target_project_id: projectId,
        target_estimate_id: estimateId,
        target_row_id: "00000000-0000-4000-8000-000000000000",
      }),
    }));
  }

  const cleanupErrors = await cleanupProofRows(serviceClient, uploadSessionId, uploadAssetId);
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-domain-rls-proof",
    proofBoundary: "linked-provider",
    passed: failedChecks.length === 0 && cleanupErrors.length === 0,
    skipped: false,
    projectUrl: url.replace(/https:\/\/([^.]+).*/, "https://$1.supabase.co"),
    checkedTables: UPLOAD_DOMAIN_TABLES,
    checks,
    failedChecks,
    cleanupErrors,
    note: "Provider proof covers upload-domain table access, record_upload_asset service-role isolation, descriptor RPC access, and estimate-row asset validation binding. It does not prove Supabase Storage object policies or app route behavior.",
  };
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
