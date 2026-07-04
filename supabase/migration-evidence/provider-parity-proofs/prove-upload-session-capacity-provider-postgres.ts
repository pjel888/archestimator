#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  isUploadSessionCapacityExceededError,
  recordPendingUploadSession,
  type UploadSessionCapacityQuotaClass,
} from "@/lib/uploads/direct-upload-records";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-session-capacity-provider-proof.json";
const EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr";
const ENV_FILE_VAR = "ARCH_UPLOAD_SESSION_CAPACITY_PROOF_ENV_FILE";
const PROOF_ENV_FILE_NAMES = new Set(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const ACTOR_CAP_ATTEMPTS = 8;
const WORKSPACE_CAP_ATTEMPTS = 8;
const ACTOR_CAP = 3;
const WORKSPACE_CAP = 6;

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
  proof?: string;
};

type AttemptSummary = {
  attempts: number;
  admittedCount: number;
  actorCapacityErrorCount: number;
  workspaceCapacityErrorCount: number;
  otherErrorCount: number;
  otherErrorMessageHashes: string[];
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
  if (!requestedPath) return { requested: false, loaded: false };

  const envPath = resolve(requestedPath);
  if (!existsSync(envPath)) return { requested: true, loaded: false, missing: true, path: requestedPath };

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
  const outputPath = resolve(readEnv("ARCH_UPLOAD_SESSION_CAPACITY_PROOF_OUTPUT") || DEFAULT_OUTPUT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function projectRefFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".supabase.co") ? host.split(".")[0] ?? "" : "";
  } catch {
    return "";
  }
}

function sanitizedProjectUrl(url: string) {
  const projectRef = projectRefFromUrl(url);
  return projectRef ? `https://${projectRef}.supabase.co` : "invalid-supabase-url";
}

function sha256Hex(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function skippedReport(reason: string, missingEnv: string[] = [], details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-session-capacity-provider-proof",
    proofBoundary: "provider-proof-skipped",
    passed: false,
    skipped: true,
    reason,
    missingEnv,
    note: "Static SQL tests do not prove concurrent create_upload_session behavior. Run with ARCH_UPLOAD_SESSION_CAPACITY_PROOF=1 and scoped provider credentials before treating the atomic capacity gate as provider-proven.",
    ...details,
  };
}

function refusedReport(reason: string, details: Record<string, unknown> = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: "upload-session-capacity-provider-proof",
    proofBoundary: "provider-proof-refused",
    passed: false,
    skipped: false,
    refused: true,
    reason,
    ...details,
  };
}

async function createTemporaryAuthUser(serviceClient: SupabaseClient, label: string) {
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createResult = await serviceClient.auth.admin.createUser({
    email: `upload-session-capacity-${label}-${stamp}@example.com`,
    email_confirm: true,
  });
  const userId = createResult.data?.user?.id ?? "";
  if (createResult.error || !userId) {
    throw new Error(`Temporary auth user create failed: ${createResult.error?.message ?? "missing user id"}`);
  }
  return userId;
}

async function createWorkspaceFixture(serviceClient: SupabaseClient, ownerUserId: string, suffix: string) {
  const workspaceId = randomUUID();
  const workspaceResult = await serviceClient.from("workspaces").insert({
    id: workspaceId,
    name: `Upload session capacity proof ${suffix.slice(0, 8)}`,
    slug: `upload-session-capacity-proof-${suffix.slice(0, 20)}`,
    created_by: ownerUserId,
  });
  if (workspaceResult.error) throw new Error(`Temporary workspace create failed: ${workspaceResult.error.message}`);

  return workspaceId;
}

async function upsertWorkspaceMember(serviceClient: SupabaseClient, workspaceId: string, userId: string) {
  const membershipResult = await serviceClient.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  }, { onConflict: "workspace_id,user_id" });
  if (membershipResult.error) {
    throw new Error(`Temporary workspace membership create failed: ${membershipResult.error.message}`);
  }
}

async function cleanupFixture(serviceClient: SupabaseClient, workspaceIds: string[], userIds: string[]) {
  const cleanupErrors: Array<{ target: string; errorMessage: string; statusCode: string | number | null }> = [];

  for (const workspaceId of workspaceIds) {
    for (const [target, action] of [
      ["upload_events", () => serviceClient.from("upload_events").delete().eq("workspace_id", workspaceId)],
      ["upload_assets", () => serviceClient.from("upload_assets").delete().eq("workspace_id", workspaceId)],
      ["upload_sessions", () => serviceClient.from("upload_sessions").delete().eq("workspace_id", workspaceId)],
      ["workspaces", () => serviceClient.from("workspaces").delete().eq("id", workspaceId)],
      ["workspace_members", () => serviceClient.from("workspace_members").delete().eq("workspace_id", workspaceId)],
    ] as const) {
      const result = await action();
      if (result.error) {
        cleanupErrors.push({
          target,
          errorMessage: result.error.message,
          statusCode: result.error.code ?? null,
        });
      }
    }
  }

  for (const userId of userIds) {
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

async function attemptSession(
  serviceClient: SupabaseClient,
  input: {
    workspaceId: string;
    actorUserId: string;
    scenario: "actor-cap" | "workspace-cap";
    attempt: number;
  },
) {
  const pathHash = sha256Hex(`${input.scenario}:${input.attempt}:${randomUUID()}`).slice(0, 16);
  return recordPendingUploadSession(serviceClient, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    surface: "component-attachment",
    targetEntityType: "upload-session-capacity-proof",
    targetEntityId: null,
    bucket: "component-attachments",
    path: `${input.workspaceId}/${input.actorUserId}/capacity-${input.scenario}-${pathHash}.pdf`,
    fileName: `capacity-${input.scenario}-${input.attempt}.pdf`,
    contentType: "application/pdf",
    sizeBytes: 34,
    checksumSha256: sha256Hex(`%PDF-1.7 ${input.scenario} ${input.attempt}`),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    metadata: {
      proof: "upload-session-capacity-provider-proof",
      scenario: input.scenario,
      attempt: input.attempt,
    },
  });
}

function summarizeAttempts(results: PromiseSettledResult<unknown>[]): AttemptSummary {
  const summary: AttemptSummary = {
    attempts: results.length,
    admittedCount: 0,
    actorCapacityErrorCount: 0,
    workspaceCapacityErrorCount: 0,
    otherErrorCount: 0,
    otherErrorMessageHashes: [],
  };

  for (const result of results) {
    if (result.status === "fulfilled") {
      summary.admittedCount += 1;
      continue;
    }

    const error = result.reason;
    if (isUploadSessionCapacityExceededError(error)) {
      if (error.quotaClass === "active_actor") summary.actorCapacityErrorCount += 1;
      if (error.quotaClass === "active_workspace") summary.workspaceCapacityErrorCount += 1;
      continue;
    }

    const message = error instanceof Error ? error.message : String(error ?? "unknown error");
    summary.otherErrorCount += 1;
    summary.otherErrorMessageHashes.push(sha256Hex(message));
  }

  return summary;
}

async function countReservedSessions(
  serviceClient: SupabaseClient,
  input: {
    workspaceId: string;
    actorUserId?: string;
  },
) {
  const baseQuery = serviceClient
    .from("upload_sessions")
    .select("id", { count: "exact" })
    .eq("workspace_id", input.workspaceId)
    .eq("surface", "component-attachment")
    .eq("status", "reserved")
    .gt("expires_at", new Date().toISOString());
  const result = input.actorUserId ? await baseQuery.eq("actor_user_id", input.actorUserId) : await baseQuery;
  if (result.error) throw new Error(`Reserved upload_sessions readback failed: ${result.error.message}`);
  return result.count ?? result.data?.length ?? 0;
}

async function runActorCapacityScenario(serviceClient: SupabaseClient) {
  const suffix = randomUUID();
  const userId = await createTemporaryAuthUser(serviceClient, "actor");
  const workspaceId = await createWorkspaceFixture(serviceClient, userId, suffix);
  await upsertWorkspaceMember(serviceClient, workspaceId, userId);

  const results = await Promise.allSettled(Array.from({ length: ACTOR_CAP_ATTEMPTS }, (_, index) => attemptSession(serviceClient, {
    workspaceId,
    actorUserId: userId,
    scenario: "actor-cap",
    attempt: index + 1,
  })));
  const summary = summarizeAttempts(results);
  const readbackReservedCount = await countReservedSessions(serviceClient, { workspaceId, actorUserId: userId });

  return {
    workspaceId,
    userIds: [userId],
    report: {
      ...summary,
      readbackReservedCount,
      expectedAdmittedCount: ACTOR_CAP,
      expectedCapacityQuotaClass: "active_actor" satisfies UploadSessionCapacityQuotaClass,
    },
  };
}

async function runWorkspaceCapacityScenario(serviceClient: SupabaseClient) {
  const suffix = randomUUID();
  const ownerUserId = await createTemporaryAuthUser(serviceClient, "workspace-owner");
  const workspaceId = await createWorkspaceFixture(serviceClient, ownerUserId, suffix);
  const userIds = [ownerUserId];
  await upsertWorkspaceMember(serviceClient, workspaceId, ownerUserId);

  for (let index = 2; index <= WORKSPACE_CAP_ATTEMPTS; index += 1) {
    const userId = await createTemporaryAuthUser(serviceClient, `workspace-${index}`);
    userIds.push(userId);
    await upsertWorkspaceMember(serviceClient, workspaceId, userId);
  }

  const results = await Promise.allSettled(userIds.map((userId, index) => attemptSession(serviceClient, {
    workspaceId,
    actorUserId: userId,
    scenario: "workspace-cap",
    attempt: index + 1,
  })));
  const summary = summarizeAttempts(results);
  const readbackReservedCount = await countReservedSessions(serviceClient, { workspaceId });

  return {
    workspaceId,
    userIds,
    report: {
      ...summary,
      readbackReservedCount,
      expectedAdmittedCount: WORKSPACE_CAP,
      expectedCapacityQuotaClass: "active_workspace" satisfies UploadSessionCapacityQuotaClass,
    },
  };
}

function buildChecks(actorCap: Record<string, number | string>, workspaceCap: Record<string, number | string>): ProofCheck[] {
  return [
    {
      label: "parallel-create-upload-session-actor-cap-admits-three",
      passed: actorCap.admittedCount === ACTOR_CAP && actorCap.readbackReservedCount === ACTOR_CAP,
      errorMessage: null,
      proof: "8 parallel same-actor RPC attempts produced 3 reserved sessions by provider readback.",
    },
    {
      label: "parallel-create-upload-session-actor-cap-rejects-overflow",
      passed: actorCap.actorCapacityErrorCount === ACTOR_CAP_ATTEMPTS - ACTOR_CAP && actorCap.otherErrorCount === 0,
      errorMessage: null,
      proof: "Overflow same-actor RPC attempts returned active_actor capacity errors.",
    },
    {
      label: "parallel-create-upload-session-workspace-cap-admits-six",
      passed: workspaceCap.admittedCount === WORKSPACE_CAP && workspaceCap.readbackReservedCount === WORKSPACE_CAP,
      errorMessage: null,
      proof: "8 parallel same-workspace/different-actor RPC attempts produced 6 reserved sessions by provider readback.",
    },
    {
      label: "parallel-create-upload-session-workspace-cap-rejects-overflow",
      passed: workspaceCap.workspaceCapacityErrorCount === WORKSPACE_CAP_ATTEMPTS - WORKSPACE_CAP && workspaceCap.otherErrorCount === 0,
      errorMessage: null,
      proof: "Overflow same-workspace RPC attempts returned active_workspace capacity errors.",
    },
  ];
}

async function runProof() {
  const envFile = loadProofEnvFile();
  if (readEnv("ARCH_UPLOAD_SESSION_CAPACITY_PROOF") !== "1") {
    return skippedReport("ARCH_UPLOAD_SESSION_CAPACITY_PROOF is not set to 1.", [], { envFile });
  }
  if (envFile.missing) return skippedReport("Requested provider proof environment file is missing.", [ENV_FILE_VAR], { envFile });

  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const missingEnv = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missingEnv.length > 0) return skippedReport("Required provider proof environment is missing.", missingEnv, { envFile });

  const projectRef = projectRefFromUrl(url);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    return refusedReport("Refusing upload session capacity proof for unexpected Supabase project.", {
      expectedProjectRef: EXPECTED_PROJECT_REF,
      projectRef: projectRef || null,
      projectUrl: sanitizedProjectUrl(url),
      envFile,
    });
  }

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-upload-session-capacity-proof" } },
  });
  const workspaceIds: string[] = [];
  const userIds: string[] = [];
  let proofReport: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    mode: "upload-session-capacity-provider-proof",
    proofBoundary: "linked-provider-create-upload-session-concurrency-proof",
    passed: false,
    skipped: false,
    projectUrl: sanitizedProjectUrl(url),
    projectRef,
    expectedProjectRef: EXPECTED_PROJECT_REF,
    envFile,
    failedChecks: ["upload-session-capacity-provider-proof"],
  };

  try {
    const actorScenario = await runActorCapacityScenario(serviceClient);
    workspaceIds.push(actorScenario.workspaceId);
    userIds.push(...actorScenario.userIds);

    const workspaceScenario = await runWorkspaceCapacityScenario(serviceClient);
    workspaceIds.push(workspaceScenario.workspaceId);
    userIds.push(...workspaceScenario.userIds);

    const checks = buildChecks(actorScenario.report, workspaceScenario.report);
    const failedChecks = checks.filter((check) => !check.passed).map((check) => check.label);
    proofReport = {
      generatedAt: new Date().toISOString(),
      mode: "upload-session-capacity-provider-proof",
      proofBoundary: "linked-provider-create-upload-session-concurrency-proof",
      passed: failedChecks.length === 0,
      skipped: false,
      projectUrl: sanitizedProjectUrl(url),
      projectRef,
      expectedProjectRef: EXPECTED_PROJECT_REF,
      envFile,
      actorCap: actorScenario.report,
      workspaceCap: workspaceScenario.report,
      checks,
      failedChecks,
      note: "Provider proof exercises live concurrent create_upload_session RPC calls under service_role against temporary workspace/user fixtures, then reads back reserved upload_sessions counts. Reports are sanitized: raw workspace/user/session IDs, storage paths, and tokens are omitted.",
    };
  } catch (error) {
    proofReport = {
      ...proofReport,
      generatedAt: new Date().toISOString(),
      setupErrors: [error instanceof Error ? error.message : String(error)],
      failedChecks: ["upload-session-capacity-provider-proof"],
      note: "Upload session capacity provider proof failed before all linked-provider checks completed.",
    };
  } finally {
    const cleanupErrors = await cleanupFixture(serviceClient, workspaceIds, userIds);
    const originalPassed = proofReport.passed === true;
    proofReport = {
      ...proofReport,
      passed: originalPassed && cleanupErrors.length === 0,
      cleanupErrors,
      failedChecks: cleanupErrors.length === 0
        ? proofReport.failedChecks
        : [...(Array.isArray(proofReport.failedChecks) ? proofReport.failedChecks : []), "upload-session-capacity-provider-cleanup"],
    };
  }

  return proofReport;
}

const report = await runProof();
const outputPath = writeReport(report);
console.log(JSON.stringify({ ...report, outputPath }, null, 2));
process.exitCode = report.skipped || report.passed ? 0 : 1;
