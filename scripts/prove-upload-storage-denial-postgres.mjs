#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-storage-denial-proof.json";
const BUCKET_CASES = [
  {
    bucket: "project-images",
    path: "upload-proof-workspace/upload-proof-user/project-images/00000000-0000-4000-8000-000000000001/proof.webp",
    contentType: "image/webp",
    bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    denyAuthenticatedDownload: true,
  },
  {
    bucket: "component-images",
    path: "upload-proof-workspace/upload-proof-user/proof.webp",
    contentType: "image/webp",
    bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    denyAuthenticatedDownload: false,
  },
  {
    bucket: "component-attachments",
    path: "upload-proof-workspace/upload-proof-user/proof.pdf",
    contentType: "application/pdf",
    bytes: new TextEncoder().encode("%PDF-1.7\n% upload proof"),
    denyAuthenticatedDownload: true,
  },
];

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function writeReport(report) {
  const outputPath = resolve(readEnv("ARCH_UPLOAD_STORAGE_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function skippedReport(reason, missingEnv = []) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-storage-denial-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    checkedBuckets: BUCKET_CASES.map((item) => item.bucket),
    note: "Static migration tests do not prove hosted Supabase Storage denial. Run with ARCH_UPLOAD_STORAGE_PROOF=1 and the required proof credentials before release.",
  };
}

async function expectDenied({ label, operation }) {
  try {
    const result = await operation();
    const error = result?.error ?? null;
    return {
      label,
      denied: Boolean(error),
      errorMessage: error?.message ?? null,
      statusCode: error?.statusCode ?? error?.status ?? null,
    };
  } catch (error) {
    return {
      label,
      denied: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      statusCode: null,
    };
  }
}

async function runProof() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authToken = readEnv("ARCH_UPLOAD_PROOF_AUTH_TOKEN");
  const workspaceId = readEnv("ARCH_UPLOAD_PROOF_WORKSPACE_ID");
  const userId = readEnv("ARCH_UPLOAD_PROOF_USER_ID");
  const missingEnv = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["ARCH_UPLOAD_PROOF_AUTH_TOKEN", authToken],
    ["ARCH_UPLOAD_PROOF_WORKSPACE_ID", workspaceId],
    ["ARCH_UPLOAD_PROOF_USER_ID", userId],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (readEnv("ARCH_UPLOAD_STORAGE_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_STORAGE_PROOF is not set to 1.");
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
  const checks = [];
  const cleanup = [];

  for (const bucketCase of BUCKET_CASES) {
    const path = bucketCase.path
      .replace("upload-proof-workspace", workspaceId)
      .replace("upload-proof-user", userId)
      .replace("proof.", `proof-${suffix}.`);
    const wrongPrefixPath = path.replace(`/${userId}/`, "/00000000-0000-4000-8000-000000000000/");
    const seededPath = path.replace(`proof-${suffix}`, `seeded-${suffix}`);
    cleanup.push({ bucket: bucketCase.bucket, paths: [path, wrongPrefixPath, seededPath] });

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:anon-direct-insert`,
      operation: () => anonClient.storage.from(bucketCase.bucket).upload(path, bucketCase.bytes, {
        contentType: bucketCase.contentType,
        upsert: false,
      }),
    }));

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:authenticated-direct-insert`,
      operation: () => authClient.storage.from(bucketCase.bucket).upload(path, bucketCase.bytes, {
        contentType: bucketCase.contentType,
        upsert: false,
      }),
    }));

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:wrong-prefix-direct-insert`,
      operation: () => authClient.storage.from(bucketCase.bucket).upload(wrongPrefixPath, bucketCase.bytes, {
        contentType: bucketCase.contentType,
        upsert: false,
      }),
    }));

    const seedResult = await serviceClient.storage.from(bucketCase.bucket).upload(seededPath, bucketCase.bytes, {
      contentType: bucketCase.contentType,
      upsert: true,
    });
    if (seedResult.error) {
      checks.push({
        label: `${bucketCase.bucket}:service-seed`,
        denied: false,
        errorMessage: seedResult.error.message,
        statusCode: seedResult.error.statusCode ?? null,
      });
      continue;
    }

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:authenticated-direct-update`,
      operation: () => authClient.storage.from(bucketCase.bucket).update(seededPath, bucketCase.bytes, {
        contentType: bucketCase.contentType,
        upsert: true,
      }),
    }));

    if (bucketCase.denyAuthenticatedDownload) {
      checks.push(await expectDenied({
        label: `${bucketCase.bucket}:authenticated-direct-download`,
        operation: () => authClient.storage.from(bucketCase.bucket).download(seededPath),
      }));
    }

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:authenticated-direct-delete`,
      operation: () => authClient.storage.from(bucketCase.bucket).remove([seededPath]),
    }));
  }

  for (const item of cleanup) {
    await serviceClient.storage.from(item.bucket).remove(item.paths).catch(() => undefined);
  }

  const failedChecks = checks.filter((check) => !check.denied).map((check) => check.label);
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-storage-denial-proof",
    proofBoundary: "linked-provider",
    passed: failedChecks.length === 0,
    skipped: false,
    projectUrl: url.replace(/https:\/\/([^.]+).*/, "https://$1.supabase.co"),
    checkedBuckets: BUCKET_CASES.map((item) => item.bucket),
    checks,
    failedChecks,
    note: "Provider proof only covers direct Supabase Storage operations for upload buckets. It does not prove app route behavior, scanner status, or browser UX.",
  };
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
