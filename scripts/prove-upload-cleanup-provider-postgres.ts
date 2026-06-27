#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { StorageCleanupReport, StorageCleanupTarget } from "@/lib/mass-deletion/bulk-action";
import {
  buildUploadCleanupOperationalSnapshot,
  planUploadStorageCleanup,
  summarizeUploadCleanup,
  type UploadCleanupRecord,
} from "@/lib/uploads/cleanup";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-cleanup-provider-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_CLEANUP_PROOF_ENV_FILE";
const NOW = new Date("2026-06-27T02:30:00Z");
const EXPIRED_AT = "2026-06-26T02:30:00Z";
const FUTURE_EXPIRES_AT = "2026-06-28T02:30:00Z";
const PROOF_ENV_FILE_NAMES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const WEBP_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n% upload cleanup proof");

type ProofTarget = {
  label: string;
  bucket: string;
  path: string;
  pathShape: string;
  contentType: string;
  bytes: Uint8Array;
  seed: boolean;
  expectedDisposition: "deleted" | "preserved" | "rejected-unseeded";
};

type ProofFixtures = {
  records: UploadCleanupRecord[];
  targets: ProofTarget[];
};

type ProofCheck = {
  label: string;
  passed: boolean;
  errorMessage: string | null;
  statusCode: string | number | null;
  proof?: string;
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
  const outputPath = resolve(readEnv("ARCH_UPLOAD_CLEANUP_PROOF_OUTPUT") || DEFAULT_OUTPUT);
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
    mode: "upload-cleanup-provider-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    checkedBuckets: ["project-images", "component-images", "component-attachments"],
    note: "Static cleanup tests do not prove hosted Supabase Storage cleanup execution. Run with ARCH_UPLOAD_CLEANUP_PROOF=1 and scoped provider credentials before release.",
    ...details,
  };
}

function refusedReport(reason: string, details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-cleanup-provider-proof",
    proofBoundary: "provider-proof-refused",
    passed: false,
    skipped: false,
    refused: true,
    reason,
    checkedBuckets: ["project-images", "component-images", "component-attachments"],
    ...details,
  };
}

function targetKey(target: Pick<StorageCleanupTarget, "bucket" | "path">) {
  return `${target.bucket}:${target.path}`;
}

function buildProofFixtures({
  workspaceId,
  otherWorkspaceId,
  userId,
  projectId,
  suffix,
}: {
  workspaceId: string;
  otherWorkspaceId: string;
  userId: string;
  projectId: string;
  suffix: string;
}): ProofFixtures {
  const componentMain = `${workspaceId}/${userId}/cleanup-component-${suffix}.webp`;
  const componentThumb = `${workspaceId}/${userId}/cleanup-component-thumb-${suffix}.webp`;
  const projectExpired = `${workspaceId}/${userId}/project-images/${projectId}/cleanup-project-expired-${suffix}.webp`;
  const projectReserved = `${workspaceId}/${userId}/project-images/${projectId}/cleanup-project-reserved-${suffix}.webp`;
  const attachmentDeleted = `${workspaceId}/${userId}/cleanup-attachment-deleted-${suffix}.pdf`;
  const finalizedComponent = `${workspaceId}/${userId}/cleanup-finalized-${suffix}.webp`;
  const activeProject = `${workspaceId}/${userId}/project-images/${projectId}/cleanup-active-${suffix}.webp`;
  const crossWorkspaceAttachment = `${otherWorkspaceId}/${userId}/cleanup-cross-workspace-${suffix}.pdf`;
  const wrongExtensionAttachment = `${workspaceId}/${userId}/cleanup-wrong-extension-${suffix}.exe`;
  const traversalComponent = `${workspaceId}/${userId}/../cleanup-traversal-${suffix}.webp`;

  const records: UploadCleanupRecord[] = [
    {
      assetId: "asset-component-failed",
      uploadSessionId: "session-component-failed",
      workspaceId,
      surface: "component-image",
      bucket: "component-images",
      path: componentMain,
      thumbnailPath: componentThumb,
      status: "failed",
    },
    {
      assetId: "asset-component-failed-duplicate",
      workspaceId,
      surface: "component-image",
      bucket: "component-images",
      path: componentMain,
      thumbnailPath: componentThumb,
      status: "failed",
    },
    {
      assetId: "asset-project-expired",
      workspaceId,
      surface: "project-image",
      bucket: "project-images",
      path: projectExpired,
      status: "expired",
    },
    {
      assetId: "asset-project-reserved-expired",
      uploadSessionId: "session-project-reserved-expired",
      workspaceId,
      surface: "project-image",
      bucket: "project-images",
      path: projectReserved,
      status: "reserved",
      expiresAt: EXPIRED_AT,
    },
    {
      assetId: "asset-attachment-deleted",
      workspaceId,
      surface: "component-attachment",
      bucket: "component-attachments",
      path: attachmentDeleted,
      status: "deleted",
    },
    {
      assetId: "asset-component-finalized",
      workspaceId,
      surface: "component-image",
      bucket: "component-images",
      path: finalizedComponent,
      status: "finalized",
      expiresAt: EXPIRED_AT,
    },
    {
      assetId: "asset-project-active",
      workspaceId,
      surface: "project-image",
      bucket: "project-images",
      path: activeProject,
      status: "reserved",
      expiresAt: FUTURE_EXPIRES_AT,
    },
    {
      assetId: "asset-cross-workspace",
      workspaceId,
      surface: "component-attachment",
      bucket: "component-attachments",
      path: crossWorkspaceAttachment,
      status: "expired",
    },
    {
      assetId: "asset-wrong-extension",
      workspaceId,
      surface: "component-attachment",
      bucket: "component-attachments",
      path: wrongExtensionAttachment,
      status: "deleted",
    },
    {
      assetId: "asset-traversal",
      workspaceId,
      surface: "component-image",
      bucket: "component-images",
      path: traversalComponent,
      status: "failed",
    },
  ];

  return {
    records,
    targets: [
      {
        label: "component-images:failed-main",
        bucket: "component-images",
        path: componentMain,
        pathShape: "{workspaceId}/{userId}/cleanup-component-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: true,
        expectedDisposition: "deleted",
      },
      {
        label: "component-images:failed-thumbnail",
        bucket: "component-images",
        path: componentThumb,
        pathShape: "{workspaceId}/{userId}/cleanup-component-thumb-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: true,
        expectedDisposition: "deleted",
      },
      {
        label: "project-images:expired",
        bucket: "project-images",
        path: projectExpired,
        pathShape: "{workspaceId}/{userId}/project-images/{projectId}/cleanup-project-expired-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: true,
        expectedDisposition: "deleted",
      },
      {
        label: "project-images:reserved-expired",
        bucket: "project-images",
        path: projectReserved,
        pathShape: "{workspaceId}/{userId}/project-images/{projectId}/cleanup-project-reserved-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: true,
        expectedDisposition: "deleted",
      },
      {
        label: "component-attachments:deleted-pdf",
        bucket: "component-attachments",
        path: attachmentDeleted,
        pathShape: "{workspaceId}/{userId}/cleanup-attachment-deleted-{proofId}.pdf",
        contentType: "application/pdf",
        bytes: PDF_BYTES,
        seed: true,
        expectedDisposition: "deleted",
      },
      {
        label: "component-images:finalized-preserved",
        bucket: "component-images",
        path: finalizedComponent,
        pathShape: "{workspaceId}/{userId}/cleanup-finalized-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: true,
        expectedDisposition: "preserved",
      },
      {
        label: "project-images:active-preserved",
        bucket: "project-images",
        path: activeProject,
        pathShape: "{workspaceId}/{userId}/project-images/{projectId}/cleanup-active-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: true,
        expectedDisposition: "preserved",
      },
      {
        label: "component-attachments:cross-workspace-preserved",
        bucket: "component-attachments",
        path: crossWorkspaceAttachment,
        pathShape: "{otherWorkspaceId}/{userId}/cleanup-cross-workspace-{proofId}.pdf",
        contentType: "application/pdf",
        bytes: PDF_BYTES,
        seed: true,
        expectedDisposition: "preserved",
      },
      {
        label: "component-attachments:wrong-extension-preserved",
        bucket: "component-attachments",
        path: wrongExtensionAttachment,
        pathShape: "{workspaceId}/{userId}/cleanup-wrong-extension-{proofId}.exe",
        contentType: "application/pdf",
        bytes: PDF_BYTES,
        seed: true,
        expectedDisposition: "preserved",
      },
      {
        label: "component-images:traversal-rejected-unseeded",
        bucket: "component-images",
        path: traversalComponent,
        pathShape: "{workspaceId}/{userId}/../cleanup-traversal-{proofId}.webp",
        contentType: "image/webp",
        bytes: WEBP_BYTES,
        seed: false,
        expectedDisposition: "rejected-unseeded",
      },
    ],
  };
}

async function seedObject(serviceClient: Pick<SupabaseClient, "storage">, target: ProofTarget): Promise<ProofCheck> {
  const result = await serviceClient.storage.from(target.bucket).upload(target.path, target.bytes, {
    contentType: target.contentType,
    upsert: true,
  });

  return {
    label: `${target.label}:service-seed`,
    passed: !result.error,
    errorMessage: result.error?.message ?? null,
    statusCode: result.error?.statusCode ?? result.error?.status ?? null,
  };
}

async function expectObjectPresent(serviceClient: Pick<SupabaseClient, "storage">, target: ProofTarget, labelSuffix: string): Promise<ProofCheck> {
  const result = await serviceClient.storage.from(target.bucket).download(target.path);

  return {
    label: `${target.label}:${labelSuffix}`,
    passed: !result.error && Boolean(result.data),
    errorMessage: result.error?.message ?? null,
    statusCode: result.error?.statusCode ?? result.error?.status ?? null,
    proof: "service-readback-present",
  };
}

async function expectObjectMissing(serviceClient: Pick<SupabaseClient, "storage">, target: ProofTarget): Promise<ProofCheck> {
  const result = await serviceClient.storage.from(target.bucket).download(target.path);
  const missing = Boolean(result.error) && !result.data;

  return {
    label: `${target.label}:service-readback-missing-after-delete`,
    passed: missing,
    errorMessage: missing ? null : result.error?.message ?? "Object still readable after cleanup delete",
    statusCode: result.error?.statusCode ?? result.error?.status ?? null,
    proof: missing ? "service-readback-missing-after-delete" : "service-readback-present-after-delete",
  };
}

async function removeCandidates(
  serviceClient: Pick<SupabaseClient, "storage">,
  candidates: ProofTarget[],
): Promise<StorageCleanupReport> {
  const removed: StorageCleanupReport["removed"] = [];
  const failed: StorageCleanupReport["failed"] = [];
  const targetsByBucket = new Map<string, ProofTarget[]>();

  for (const target of candidates) {
    targetsByBucket.set(target.bucket, [...(targetsByBucket.get(target.bucket) ?? []), target]);
  }

  for (const [bucket, bucketTargets] of targetsByBucket.entries()) {
    const result = await serviceClient.storage.from(bucket).remove(bucketTargets.map((target) => target.path));
    if (result.error) {
      failed.push(...bucketTargets.map((target) => ({
        bucket,
        path: target.path,
        message: result.error.message,
      })));
    } else {
      removed.push(...bucketTargets.map((target) => ({
        bucket,
        path: target.path,
      })));
    }
  }

  return { removed, rejected: [], failed };
}

async function cleanupLeftovers(serviceClient: Pick<SupabaseClient, "storage">, targets: ProofTarget[]) {
  const cleanupErrors: Array<{
    bucket: string;
    pathCount: number;
    errorMessage: string;
    statusCode: string | number | null;
  }> = [];
  const targetsByBucket = new Map<string, string[]>();

  for (const target of targets.filter((item) => item.seed)) {
    targetsByBucket.set(target.bucket, [...(targetsByBucket.get(target.bucket) ?? []), target.path]);
  }

  for (const [bucket, paths] of targetsByBucket.entries()) {
    const result = await serviceClient.storage.from(bucket).remove(paths);
    if (result.error) {
      cleanupErrors.push({
        bucket,
        pathCount: paths.length,
        errorMessage: result.error.message,
        statusCode: result.error.statusCode ?? result.error.status ?? null,
      });
    }
  }

  return cleanupErrors;
}

function labelForTarget(targets: ProofTarget[], target: StorageCleanupTarget) {
  return targets.find((item) => item.bucket === target.bucket && item.path === target.path)?.label ?? `${target.bucket}:unknown-target`;
}

async function runProof() {
  const envFile = loadProofEnvFile();

  if (readEnv("ARCH_UPLOAD_CLEANUP_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_CLEANUP_PROOF is not set to 1.", [], { envFile });
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
    return refusedReport("Refusing provider cleanup proof for unexpected Supabase project.", {
      expectedProjectRef: EXPECTED_PROJECT_REF,
      projectRef: projectRef || null,
      projectUrl: sanitizedProjectUrl(url),
      envFile,
    });
  }

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fixtures = buildProofFixtures({
    workspaceId: randomUUID(),
    otherWorkspaceId: randomUUID(),
    userId: randomUUID(),
    projectId: randomUUID(),
    suffix: randomUUID(),
  });
  const targetsByKey = new Map(fixtures.targets.map((target) => [targetKey(target), target]));
  const plan = planUploadStorageCleanup(fixtures.records, { now: NOW });
  const checks: ProofCheck[] = [];
  let cleanupReport: StorageCleanupReport = { removed: [], rejected: [], failed: [] };
  let cleanupErrors: Awaited<ReturnType<typeof cleanupLeftovers>> = [];

  const candidateTargets = plan.candidates.map((candidate) => targetsByKey.get(targetKey(candidate.target))).filter((target): target is ProofTarget => Boolean(target));
  const candidateKeys = new Set(candidateTargets.map((target) => targetKey(target)));
  const preservedTargets = fixtures.targets.filter((target) => target.seed && target.expectedDisposition === "preserved");
  const seededTargets = fixtures.targets.filter((target) => target.seed);
  const rejectedLabels = plan.rejected.map((rejected) => labelForTarget(fixtures.targets, rejected));

  checks.push({
    label: "planner-candidate-count",
    passed: plan.candidates.length === 5,
    errorMessage: plan.candidates.length === 5 ? null : `Expected 5 planner candidates; got ${plan.candidates.length}.`,
    statusCode: null,
  });
  checks.push({
    label: "planner-rejected-count",
    passed: plan.rejected.length === 5,
    errorMessage: plan.rejected.length === 5 ? null : `Expected 5 planner rejections; got ${plan.rejected.length}.`,
    statusCode: null,
  });
  checks.push({
    label: "planner-deduped-duplicate-thumbnail-targets",
    passed: candidateTargets.filter((target) => target.label.startsWith("component-images:failed")).length === 2,
    errorMessage: null,
    statusCode: null,
  });
  checks.push({
    label: "planner-rejected-finalized-active-cross-workspace-wrong-extension-and-traversal",
    passed: [
      "component-images:finalized-preserved",
      "project-images:active-preserved",
      "component-attachments:cross-workspace-preserved",
      "component-attachments:wrong-extension-preserved",
      "component-images:traversal-rejected-unseeded",
    ].every((label) => rejectedLabels.includes(label)),
    errorMessage: null,
    statusCode: null,
  });
  checks.push({
    label: "provider-deletes-only-planner-candidates",
    passed: candidateTargets.every((target) => target.expectedDisposition === "deleted") && preservedTargets.every((target) => !candidateKeys.has(targetKey(target))),
    errorMessage: null,
    statusCode: null,
  });

  try {
    for (const target of seededTargets) {
      checks.push(await seedObject(serviceClient, target));
    }

    for (const target of seededTargets) {
      checks.push(await expectObjectPresent(serviceClient, target, "service-readback-before-cleanup"));
    }

    cleanupReport = await removeCandidates(serviceClient, candidateTargets);

    checks.push({
      label: "provider-cleanup-remove-target-count",
      passed: cleanupReport.removed.length === candidateTargets.length && cleanupReport.failed.length === 0,
      errorMessage: cleanupReport.failed.length === 0 ? null : "Provider cleanup remove returned failures.",
      statusCode: null,
    });

    for (const target of candidateTargets) {
      checks.push(await expectObjectMissing(serviceClient, target));
    }

    for (const target of preservedTargets) {
      checks.push(await expectObjectPresent(serviceClient, target, "service-readback-preserved-after-cleanup"));
    }
  } finally {
    cleanupErrors = await cleanupLeftovers(serviceClient, seededTargets);
  }

  const metrics = summarizeUploadCleanup(plan, cleanupReport);
  const operationalSnapshot = buildUploadCleanupOperationalSnapshot(plan, metrics, { now: NOW });
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
  const readbackMissingCount = checks.filter((check) => check.proof === "service-readback-missing-after-delete" && check.passed).length;
  const preservedReadbackCount = checks.filter((check) => check.label.endsWith(":service-readback-preserved-after-cleanup") && check.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-cleanup-provider-proof",
    proofBoundary: "linked-provider-cleanup-execution-readback",
    passed: failedChecks.length === 0 && cleanupErrors.length === 0,
    skipped: false,
    projectUrl: sanitizedProjectUrl(url),
    projectRef,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    envFile,
    checkedBuckets: ["project-images", "component-images", "component-attachments"],
    planner: {
      recordCount: fixtures.records.length,
      candidateCount: plan.candidates.length,
      rejectedCount: plan.rejected.length,
      candidateLabels: plan.candidates.map((candidate) => labelForTarget(fixtures.targets, candidate.target)),
      rejectedLabels,
      rejectedReasons: plan.rejected.reduce<Record<string, number>>((accumulator, rejected) => {
        accumulator[rejected.reason] = (accumulator[rejected.reason] ?? 0) + 1;
        return accumulator;
      }, {}),
    },
    targetShapes: fixtures.targets.map((target) => ({
      label: target.label,
      bucket: target.bucket,
      pathShape: target.pathShape,
      seeded: target.seed,
      expectedDisposition: target.expectedDisposition,
      contentType: target.contentType,
    })),
    seededCount: checks.filter((check) => check.label.endsWith(":service-seed") && check.passed).length,
    removedCount: cleanupReport.removed.length,
    failedCount: cleanupReport.failed.length,
    rejectedCount: metrics.rejectedCount,
    failedBuckets: metrics.failedBuckets,
    readbackMissingCount,
    preservedReadbackCount,
    checks,
    failedChecks,
    cleanupErrors,
    operationalSnapshot,
    note: "Provider proof builds failed/deleted/expired/reserved/finalized/active/unsafe/cross-workspace/duplicate/thumbnail upload cleanup records, runs planUploadStorageCleanup, deletes only planner-approved proof objects, verifies deleted objects are missing, and verifies rejected/finalized/active proof objects remain present. It does not prove durable scheduling, persisted retry/audit jobs, dashboard emission, scanner behavior, hosted runtime limits, or browser UX.",
  };
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
