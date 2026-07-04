#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-storage-denial-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_STORAGE_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ARCH_UPLOAD_PROOF_AUTH_TOKEN",
  "ARCH_UPLOAD_PROOF_WORKSPACE_ID",
  "ARCH_UPLOAD_PROOF_USER_ID",
]);
const BUCKET_CASES = [
  {
    bucket: "project-images",
    path: "upload-proof-workspace/upload-proof-user/project-images/00000000-0000-4000-8000-000000000001/proof.webp",
    contentType: "image/webp",
    bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
  },
  {
    bucket: "component-images",
    path: "upload-proof-workspace/upload-proof-user/proof.webp",
    contentType: "image/webp",
    bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x0c, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
  },
  {
    bucket: "component-attachments",
    path: "upload-proof-workspace/upload-proof-user/proof.pdf",
    contentType: "application/pdf",
    bytes: new TextEncoder().encode("%PDF-1.7\n% upload proof"),
  },
];

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function decodeEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
}

function loadProofEnvFile() {
  const requestedPath = readEnv(ENV_FILE_VAR);
  if (!requestedPath) {
    return { requested: false, loaded: false };
  }

  const envPath = resolve(requestedPath);
  if (!existsSync(envPath)) {
    return { requested: true, loaded: false, missing: true, path: requestedPath };
  }

  const names = [];
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

function writeReport(report) {
  const outputPath = resolve(readEnv("ARCH_UPLOAD_STORAGE_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function skippedReport(reason, missingEnv = [], details = {}) {
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
    ...details,
  };
}

function refusedReport(reason, details = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-storage-denial-proof",
    proofBoundary: "provider-proof-refused",
    passed: false,
    skipped: false,
    refused: true,
    reason,
    checkedBuckets: BUCKET_CASES.map((item) => item.bucket),
    ...details,
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

async function expectDeleteDenied({ label, bucket, path, actorClient, serviceClient }) {
  let removeResult = null;
  let removeException = null;
  try {
    removeResult = await actorClient.storage.from(bucket).remove([path]);
  } catch (error) {
    removeException = error instanceof Error ? error.message : String(error);
  }

  const readback = await serviceClient.storage.from(bucket).download(path);
  const objectStillPresent = !readback.error && Boolean(readback.data);

  return {
    label,
    denied: objectStillPresent,
    errorMessage: removeException ?? removeResult?.error?.message ?? (objectStillPresent ? null : readback.error?.message ?? "Object was removed"),
    statusCode: removeResult?.error?.statusCode ?? removeResult?.error?.status ?? readback.error?.statusCode ?? readback.error?.status ?? null,
    proof: objectStillPresent ? "object-still-present-after-direct-delete-attempt" : "service-readback-missing-after-direct-delete-attempt",
  };
}

function projectRefFromUrl(url) {
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

function sanitizedProjectUrl(url) {
  const projectRef = projectRefFromUrl(url);
  return projectRef ? `https://${projectRef}.supabase.co` : "invalid-supabase-url";
}

async function createTemporaryProofSession({ anonClient, serviceClient }) {
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `upload-proof-${stamp}@example.com`;
  const password = `Proof-${stamp}-Aa1!`;
  const createResult = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const userId = createResult.data?.user?.id ?? "";
  if (createResult.error || !userId) {
    throw new Error(`Temporary auth user create failed: ${createResult.error?.message ?? "missing user id"}`);
  }

  const cleanup = async () => {
    const deleteResult = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteResult.error) {
      throw new Error(`Temporary auth user cleanup failed: ${deleteResult.error.message}`);
    }
  };

  const signInResult = await anonClient.auth.signInWithPassword({ email, password });
  const authToken = signInResult.data?.session?.access_token ?? "";
  if (signInResult.error || !authToken) {
    await cleanup().catch(() => undefined);
    throw new Error(`Temporary auth user sign-in failed: ${signInResult.error?.message ?? "missing access token"}`);
  }

  return {
    authToken,
    userId,
    cleanup,
    authStrategy: "temporary-user",
  };
}

async function seedObject({ bucketCase, label, path, serviceClient, checks }) {
  const seedResult = await serviceClient.storage.from(bucketCase.bucket).upload(path, bucketCase.bytes, {
    contentType: bucketCase.contentType,
    upsert: true,
  });

  if (seedResult.error) {
    checks.push({
      label,
      denied: false,
      errorMessage: seedResult.error.message,
      statusCode: seedResult.error.statusCode ?? seedResult.error.status ?? null,
    });
    return false;
  }

  return true;
}

async function cleanupStorageTargets({ serviceClient, cleanupTargets }) {
  const cleanupErrors = [];
  for (const item of cleanupTargets) {
    const cleanupResult = await serviceClient.storage.from(item.bucket).remove(item.paths);
    if (cleanupResult.error) {
      cleanupErrors.push({
        bucket: item.bucket,
        pathCount: item.paths.length,
        errorMessage: cleanupResult.error.message,
        statusCode: cleanupResult.error.statusCode ?? cleanupResult.error.status ?? null,
      });
    }
  }

  return cleanupErrors;
}

async function runProof() {
  const envFile = loadProofEnvFile();

  if (readEnv("ARCH_UPLOAD_STORAGE_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_STORAGE_PROOF is not set to 1.", [], { envFile });
  }
  if (envFile.missing) {
    return skippedReport("Requested provider proof environment file is missing.", [ENV_FILE_VAR], { envFile });
  }

  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  let authToken = readEnv("ARCH_UPLOAD_PROOF_AUTH_TOKEN");
  const workspaceId = readEnv("ARCH_UPLOAD_PROOF_WORKSPACE_ID") || randomUUID();
  let pathUserId = readEnv("ARCH_UPLOAD_PROOF_USER_ID");
  const missingEnv = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingEnv.length > 0) {
    return skippedReport("Required provider proof environment is missing.", missingEnv, { envFile });
  }

  const projectRef = projectRefFromUrl(url);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    return refusedReport("Refusing provider proof for unexpected Supabase project.", {
      expectedProjectRef: EXPECTED_PROJECT_REF,
      projectRef: projectRef || null,
      projectUrl: sanitizedProjectUrl(url),
      envFile,
    });
  }

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let temporarySession = null;
  let authStrategy = "provided-token";
  if (!authToken) {
    try {
      temporarySession = await createTemporaryProofSession({ anonClient, serviceClient });
      authToken = temporarySession.authToken;
      pathUserId ||= temporarySession.userId;
      authStrategy = temporarySession.authStrategy;
    } catch (error) {
      return {
        generatedAt: new Date().toISOString(),
        mode: "upload-storage-denial-proof",
        proofBoundary: "linked-provider",
        passed: false,
        skipped: false,
        projectUrl: sanitizedProjectUrl(url),
        projectRef,
        checkedBuckets: BUCKET_CASES.map((item) => item.bucket),
        authStrategy: "temporary-user",
        setupErrors: [error instanceof Error ? error.message : String(error)],
        checks: [],
        failedChecks: ["temporary-auth-session"],
        cleanupErrors: [],
        note: "Provider proof could not create a temporary authenticated session for direct storage denial checks.",
      };
    }
  }

  pathUserId ||= randomUUID();

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
  });

  const suffix = randomUUID();
  const checks = [];
  const cleanupTargets = [];
  const cleanupErrors = [];
  let temporaryUserDeleted = null;

  for (const bucketCase of BUCKET_CASES) {
    const path = bucketCase.path
      .replace("upload-proof-workspace", workspaceId)
      .replace("upload-proof-user", pathUserId)
      .replace("proof.", `proof-${suffix}.`);
    const wrongPrefixPath = path.replace(`/${pathUserId}/`, `/${randomUUID()}/`);
    const updateDownloadSeededPath = path.replace(`proof-${suffix}`, `seeded-update-download-${suffix}`);
    const anonDeleteSeededPath = path.replace(`proof-${suffix}`, `seeded-anon-delete-${suffix}`);
    const authDeleteSeededPath = path.replace(`proof-${suffix}`, `seeded-auth-delete-${suffix}`);
    cleanupTargets.push({
      bucket: bucketCase.bucket,
      paths: [path, wrongPrefixPath, updateDownloadSeededPath, anonDeleteSeededPath, authDeleteSeededPath],
    });

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

    const seededForUpdateDownload = await seedObject({
      bucketCase,
      checks,
      label: `${bucketCase.bucket}:service-seed-update-download`,
      path: updateDownloadSeededPath,
      serviceClient,
    });
    if (!seededForUpdateDownload) {
      continue;
    }

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:anon-direct-update`,
      operation: () => anonClient.storage.from(bucketCase.bucket).update(updateDownloadSeededPath, bucketCase.bytes, {
        contentType: bucketCase.contentType,
        upsert: true,
      }),
    }));

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:authenticated-direct-update`,
      operation: () => authClient.storage.from(bucketCase.bucket).update(updateDownloadSeededPath, bucketCase.bytes, {
        contentType: bucketCase.contentType,
        upsert: true,
      }),
    }));

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:anon-direct-download`,
      operation: () => anonClient.storage.from(bucketCase.bucket).download(updateDownloadSeededPath),
    }));

    checks.push(await expectDenied({
      label: `${bucketCase.bucket}:authenticated-direct-download`,
      operation: () => authClient.storage.from(bucketCase.bucket).download(updateDownloadSeededPath),
    }));

    const seededForAnonDelete = await seedObject({
      bucketCase,
      checks,
      label: `${bucketCase.bucket}:service-seed-anon-delete`,
      path: anonDeleteSeededPath,
      serviceClient,
    });
    if (seededForAnonDelete) {
      checks.push(await expectDeleteDenied({
        label: `${bucketCase.bucket}:anon-direct-delete`,
        bucket: bucketCase.bucket,
        path: anonDeleteSeededPath,
        actorClient: anonClient,
        serviceClient,
      }));
    }

    const seededForAuthDelete = await seedObject({
      bucketCase,
      checks,
      label: `${bucketCase.bucket}:service-seed-auth-delete`,
      path: authDeleteSeededPath,
      serviceClient,
    });
    if (seededForAuthDelete) {
      checks.push(await expectDeleteDenied({
        label: `${bucketCase.bucket}:authenticated-direct-delete`,
        bucket: bucketCase.bucket,
        path: authDeleteSeededPath,
        actorClient: authClient,
        serviceClient,
      }));
    }
  }

  cleanupErrors.push(...await cleanupStorageTargets({ serviceClient, cleanupTargets }));
  if (temporarySession) {
    try {
      await temporarySession.cleanup();
      temporaryUserDeleted = true;
    } catch (error) {
      temporaryUserDeleted = false;
      cleanupErrors.push({
        bucket: "auth.users",
        pathCount: 1,
        errorMessage: error instanceof Error ? error.message : String(error),
        statusCode: null,
      });
    }
  }

  const failedChecks = checks.filter((check) => !check.denied).map((check) => check.label);
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-storage-denial-proof",
    proofBoundary: "linked-provider",
    passed: failedChecks.length === 0 && cleanupErrors.length === 0,
    skipped: false,
    projectUrl: sanitizedProjectUrl(url),
    projectRef,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    authStrategy,
    pathWorkspaceSource: readEnv("ARCH_UPLOAD_PROOF_WORKSPACE_ID") ? "provided-env" : "generated-uuid",
    pathUserSource: readEnv("ARCH_UPLOAD_PROOF_USER_ID") ? "provided-env" : temporarySession ? "temporary-auth-user" : "generated-uuid",
    temporaryUserDeleted,
    envFile,
    checkedBuckets: BUCKET_CASES.map((item) => item.bucket),
    checks,
    failedChecks,
    cleanupErrors,
    note: "Provider proof only covers direct Supabase Storage operations for upload buckets. It does not prove app route behavior, scanner status, or browser UX.",
  };
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
