#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

type D1Result = {
  results?: Array<Record<string, unknown>>;
  success?: boolean;
  meta?: Record<string, unknown>;
};

type SyntheticCleanupCounts = {
  users: number;
  sessions: number;
  profiles: number;
  memberships: number;
  closedBetaRows: number;
  legalTermsRows: number;
  uploadSessions: number;
  uploadAssets: number;
  uploadEvents: number;
  attachments: number;
};

type SyntheticFixture = {
  userId: string;
  email: string;
  sessionId: string;
  sessionToken: string;
  sessionExpiresAt: string;
  signedCookieValue: string;
};

type UploadApiBody = {
  bucket?: string;
  uploadSessionId?: string;
  assetId?: string;
  scanStatus?: string;
  path?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  error?: string;
};

type BrowserProof = {
  routeStatus: number | null;
  routeOk: boolean;
  finalUrlPath: string | null;
  workspaceVisible: boolean;
  addComponentButtonReady: boolean;
  addComponentModalReady: boolean;
  variantPanelReady: boolean;
  variantEditorReady: boolean;
  attachmentInputReady: boolean;
  uploadApiStatus: number | null;
  uploadApiOk: boolean;
  uploadApiBody: UploadApiBody | null;
  statusTextVisible: boolean;
  consoleErrors: string[];
  pageErrors: string[];
};

type D1UploadReadback = {
  uploadSessionRows: number;
  uploadAssetRows: number;
  attachmentRows: number;
  eventTypes: string[];
  sessionStatus: string | null;
  assetStatus: string | null;
  scanStatus: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  checksumMatchesFixture: boolean;
};

type R2ObjectReadback = {
  getStatus: number | null;
  readable: boolean;
  sizeBytes: number | null;
  checksumMatchesFixture: boolean;
};

type AppCleanupProof = {
  deleteStatus: number | null;
  deleteOk: boolean;
  removedCount: number;
  r2ObjectMissingAfterDelete: boolean;
};

type HostedUploadUiProofReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-upload-ui-proof";
  baseUrl: string;
  routePath: "/workshop/library/components";
  d1Database: string;
  r2PhysicalBucket: string;
  r2LogicalBucket: "component-attachments";
  workspaceId: string;
  syntheticFixture: {
    userId: string;
    email: string;
    workspaceRole: "owner";
    sessionExpiresAt: string;
    signedCookiesProvided: boolean;
  } | null;
  readiness: {
    browserRouteReady: boolean;
    syntheticBetterAuthSessionReady: boolean;
    componentLibraryWorkspaceVisible: boolean;
    addComponentModalReady: boolean;
    variantAttachmentInputReady: boolean;
    uiUploadRequestObserved: boolean;
    uploadResponseReady: boolean;
    d1UploadSessionRecorded: boolean;
    d1UploadAssetRecorded: boolean;
    d1ScanPendingEventRecorded: boolean;
    r2ObjectReadable: boolean;
    r2ChecksumMatchesFixture: boolean;
    appCleanupRemovedR2Object: boolean;
    d1CleanupReady: boolean;
    hostedUploadUiReady: boolean;
    productionCutoverReady: false;
  };
  proof: {
    fileName: string;
    fileSizeBytes: number;
    fixtureChecksumSha256: string;
    navigation: Pick<BrowserProof, "routeStatus" | "routeOk" | "finalUrlPath"> | null;
    ui: Pick<BrowserProof, "workspaceVisible" | "addComponentButtonReady" | "addComponentModalReady" | "variantPanelReady" | "variantEditorReady" | "attachmentInputReady" | "statusTextVisible"> | null;
    uploadApi: {
      status: number | null;
      ok: boolean;
      bucket: string | null;
      fileName: string | null;
      contentType: string | null;
      sizeBytes: number | null;
      scanStatus: string | null;
      uploadSessionIdPresent: boolean;
      assetIdPresent: boolean;
      objectPathShape: string | null;
      objectPathHash: string | null;
    } | null;
    d1Readback: D1UploadReadback | null;
    r2Readback: R2ObjectReadback | null;
    appCleanup: AppCleanupProof | null;
    cleanupBefore: SyntheticCleanupCounts | null;
    cleanupAfter: SyntheticCleanupCounts | null;
    browserDiagnostics: {
      consoleErrors: string[];
      pageErrors: string[];
    };
  };
  blockers: string[];
  passed: boolean;
  note: string;
  error: string | null;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-upload-ui-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-upload-ui-proof.md`;
const DEFAULT_BASE_URL = "https://archestimator.com";
const ROUTE_PATH = "/workshop/library/components" as const;
const D1_DATABASE = process.env.CLOUDFLARE_D1_DATABASE?.trim() || "archestimator-proof-db";
const WORKSPACE_ID = process.env.HOSTED_UPLOAD_UI_WORKSPACE_ID?.trim()
  || process.env.HOSTED_AUTH_WORKSPACE_ID?.trim()
  || "258b50ee-3fde-4f6a-a9d9-c360ec44cd0b";
const R2_PHYSICAL_BUCKET = process.env.CLOUDFLARE_UPLOAD_R2_BUCKET?.trim() || "archestimator-proof-uploads";
const R2_LOGICAL_BUCKET = "component-attachments" as const;
const EMAIL_PREFIX = "codex-upload-ui-";
const EMAIL_DOMAIN = "example.invalid";
const FILE_PREFIX = "codex-browser-upload-proof";
const NOTE =
  "Drives the real hosted Add Component browser UI with a synthetic Better Auth D1 session, uploads a tiny PDF through /api/component-library/attachments, verifies D1 upload metadata and R2 bytes, proves app-level R2 cleanup through DELETE /api/component-library/attachments, then removes exact synthetic D1 rows. Raw session cookies, signatures, R2 object paths, provider tokens, and customer data are not written to evidence.";
const TERMS = {
  key: "terms-of-service",
  version: "tos-2026-06-06-beta-v1",
  effectiveDate: "2026-06-06",
  contentHash: "sha256:55b472ffb1aaab0ca1c3a6ddd5363f9113efec37f4007d537d61d30153102444",
  privacyPolicyVersion: "privacy-2026-06-06-beta-v1",
};
const redactions = new Set<string>();

function addRedaction(value: string | null | undefined) {
  if (value) redactions.add(value);
}

function redact(value: string) {
  let output = value;
  for (const secret of redactions) {
    output = output.split(secret).join("[redacted]");
  }
  return output.replace(/(__Secure-)?better-auth\.session_token=[^;\s]+/g, "$1better-auth.session_token=[redacted]");
}

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
  return trimmed;
}

function readEnvAssignment(file: string, name: string) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match?.[1] === name) return unquoteEnvValue(match[2]);
  }
  return null;
}

function readSecret(name: string) {
  const fromEnv = readEnv(name);
  if (fromEnv) return fromEnv;
  for (const file of [".dev.vars", ".env.local", ".env"]) {
    const value = readEnvAssignment(file, name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

function sqlValue(value: string | null) {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function d1Execute(sql: string, label: string): D1Result[] {
  const result = spawnSync("bunx", [
    "wrangler",
    "d1",
    "execute",
    D1_DATABASE,
    "--remote",
    "--json",
    "--command",
    sql,
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed: ${redact([result.stdout, result.stderr].filter(Boolean).join("\n"))}`);
  }

  try {
    return JSON.parse(result.stdout) as D1Result[];
  } catch (error) {
    throw new Error(`${label} returned non-JSON output: ${redact(result.stdout)} (${error instanceof Error ? error.message : String(error)})`);
  }
}

function numberAt(results: D1Result[], statementIndex: number, key: string) {
  const value = results[statementIndex]?.results?.[0]?.[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function stringAt(results: D1Result[], statementIndex: number, key: string) {
  const value = results[statementIndex]?.results?.[0]?.[key];
  return typeof value === "string" ? value : null;
}

function uploadPathLike() {
  return `%/${FILE_PREFIX}%`;
}

function fileNameLike() {
  return `${FILE_PREFIX}%`;
}

function authEmailLike() {
  return `${EMAIL_PREFIX}%@${EMAIL_DOMAIN}`;
}

function countSyntheticRows(): SyntheticCleanupCounts {
  const emailLike = authEmailLike();
  const pathLike = uploadPathLike();
  const nameLike = fileNameLike();
  const sql = `
    SELECT COUNT(*) AS users FROM "user" WHERE email LIKE ${sqlValue(emailLike)};
    SELECT COUNT(*) AS sessions FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    SELECT COUNT(*) AS profiles FROM profiles WHERE email LIKE ${sqlValue(emailLike)};
    SELECT COUNT(*) AS memberships FROM workspace_members WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    SELECT COUNT(*) AS closedBetaRows FROM closed_beta_allowed_emails WHERE normalized_email LIKE ${sqlValue(emailLike)};
    SELECT COUNT(*) AS legalTermsRows FROM legal_terms_acceptances WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    SELECT COUNT(*) AS uploadSessions FROM upload_sessions WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)});
    SELECT COUNT(*) AS uploadAssets FROM upload_assets WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)});
    SELECT COUNT(*) AS uploadEvents FROM upload_events WHERE upload_session_id IN (
      SELECT id FROM upload_sessions WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)})
    ) OR upload_asset_id IN (
      SELECT id FROM upload_assets WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)})
    ) OR actor_user_id IN (
      SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    SELECT COUNT(*) AS attachments FROM cost_library_item_variant_attachments WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)});
  `;
  const results = d1Execute(sql, "count hosted upload UI synthetic rows");
  return {
    users: numberAt(results, 0, "users"),
    sessions: numberAt(results, 1, "sessions"),
    profiles: numberAt(results, 2, "profiles"),
    memberships: numberAt(results, 3, "memberships"),
    closedBetaRows: numberAt(results, 4, "closedBetaRows"),
    legalTermsRows: numberAt(results, 5, "legalTermsRows"),
    uploadSessions: numberAt(results, 6, "uploadSessions"),
    uploadAssets: numberAt(results, 7, "uploadAssets"),
    uploadEvents: numberAt(results, 8, "uploadEvents"),
    attachments: numberAt(results, 9, "attachments"),
  };
}

function cleanupCountsAreZero(counts: SyntheticCleanupCounts | null | undefined) {
  if (!counts) return false;
  return Object.values(counts).every((value) => Number(value) === 0);
}

function listStaleUploadPaths() {
  const pathLike = uploadPathLike();
  const nameLike = fileNameLike();
  const sql = `
    SELECT storage_path AS storagePath FROM upload_sessions
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)})
    UNION
    SELECT storage_path AS storagePath FROM upload_assets
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)})
    UNION
    SELECT storage_path AS storagePath FROM cost_library_item_variant_attachments
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)});
  `;
  const results = d1Execute(sql, "list stale hosted upload UI object paths");
  return (results[0]?.results ?? [])
    .map((row) => row.storagePath)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function cleanupSyntheticRows(label = "cleanup hosted upload UI synthetic rows") {
  const emailLike = authEmailLike();
  const pathLike = uploadPathLike();
  const nameLike = fileNameLike();
  const sql = `
    DELETE FROM upload_events
    WHERE upload_session_id IN (
      SELECT id FROM upload_sessions WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)})
    )
    OR upload_asset_id IN (
      SELECT id FROM upload_assets WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)} AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)})
    )
    OR actor_user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});

    DELETE FROM cost_library_item_variant_attachments
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)} OR created_by IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}));

    DELETE FROM upload_assets
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)} OR actor_user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}));

    DELETE FROM upload_sessions
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND (file_name LIKE ${sqlValue(nameLike)} OR storage_path LIKE ${sqlValue(pathLike)} OR actor_user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}));

    DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    DELETE FROM workspace_members WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    DELETE FROM legal_terms_acceptances WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    DELETE FROM profiles WHERE email LIKE ${sqlValue(emailLike)};
    DELETE FROM closed_beta_allowed_emails WHERE normalized_email LIKE ${sqlValue(emailLike)};
    DELETE FROM "user" WHERE email LIKE ${sqlValue(emailLike)};
  `;
  d1Execute(sql, label);
}

function cleanupExactRows(input: {
  fixture?: SyntheticFixture | null;
  upload?: UploadApiBody | null;
}) {
  const conditions = {
    userId: input.fixture?.userId ?? null,
    email: input.fixture?.email ?? null,
    uploadSessionId: input.upload?.uploadSessionId ?? null,
    assetId: input.upload?.assetId ?? null,
    path: input.upload?.path ?? null,
    fileName: input.upload?.fileName ?? null,
  };
  const sql = `
    DELETE FROM upload_events
    WHERE (${conditions.uploadSessionId ? `upload_session_id = ${sqlValue(conditions.uploadSessionId)}` : "0"})
       OR (${conditions.assetId ? `upload_asset_id = ${sqlValue(conditions.assetId)}` : "0"})
       OR (${conditions.userId ? `actor_user_id = ${sqlValue(conditions.userId)}` : "0"});

    DELETE FROM cost_library_item_variant_attachments
    WHERE (${conditions.path ? `storage_path = ${sqlValue(conditions.path)}` : "0"})
       OR (${conditions.fileName ? `file_name = ${sqlValue(conditions.fileName)}` : "0"})
       OR (${conditions.userId ? `created_by = ${sqlValue(conditions.userId)}` : "0"});

    DELETE FROM upload_assets
    WHERE (${conditions.assetId ? `id = ${sqlValue(conditions.assetId)}` : "0"})
       OR (${conditions.uploadSessionId ? `upload_session_id = ${sqlValue(conditions.uploadSessionId)}` : "0"})
       OR (${conditions.path ? `storage_path = ${sqlValue(conditions.path)}` : "0"})
       OR (${conditions.userId ? `actor_user_id = ${sqlValue(conditions.userId)}` : "0"});

    DELETE FROM upload_sessions
    WHERE (${conditions.uploadSessionId ? `id = ${sqlValue(conditions.uploadSessionId)}` : "0"})
       OR (${conditions.path ? `storage_path = ${sqlValue(conditions.path)}` : "0"})
       OR (${conditions.userId ? `actor_user_id = ${sqlValue(conditions.userId)}` : "0"});

    DELETE FROM "session" WHERE ${conditions.userId ? `"userId" = ${sqlValue(conditions.userId)}` : "0"};
    DELETE FROM workspace_members WHERE ${conditions.userId ? `user_id = ${sqlValue(conditions.userId)}` : "0"};
    DELETE FROM legal_terms_acceptances WHERE ${conditions.userId ? `user_id = ${sqlValue(conditions.userId)}` : "0"};
    DELETE FROM profiles WHERE ${conditions.email ? `email = ${sqlValue(conditions.email)}` : "0"};
    DELETE FROM closed_beta_allowed_emails WHERE ${conditions.email ? `normalized_email = ${sqlValue(conditions.email)}` : "0"};
    DELETE FROM "user" WHERE ${conditions.email ? `email = ${sqlValue(conditions.email)}` : "0"};
  `;
  d1Execute(sql, "cleanup exact hosted upload UI proof rows");
}

function createPdfBytes() {
  return Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n", "utf8");
}

function sha256Hex(bytes: Buffer | Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeOrigin(value: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL.`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${label} must use HTTPS before hosted auth cookies are sent.`);
  return parsed.origin;
}

function parseAllowedOrigins(value: string | undefined) {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : ["https://archestimator.com", "https://www.archestimator.com"];
}

export function normalizeHostedUploadUiBaseUrl(value: string | undefined | null, allowedOrigins = parseAllowedOrigins(readEnv("HOSTED_UPLOAD_UI_ALLOWED_ORIGINS"))) {
  const raw = value?.trim() || DEFAULT_BASE_URL;
  const origin = normalizeOrigin(raw.replace(/\/+$/, ""), "HOSTED_UPLOAD_UI_BASE_URL");
  const allowed = allowedOrigins.map((allowedOrigin) => normalizeOrigin(allowedOrigin, "HOSTED_UPLOAD_UI_ALLOWED_ORIGINS"));
  if (!allowed.includes(origin)) {
    throw new Error(`HOSTED_UPLOAD_UI_BASE_URL origin ${origin} is not in HOSTED_UPLOAD_UI_ALLOWED_ORIGINS. Refusing to send hosted auth cookies.`);
  }
  return origin;
}

function chooseBaseUrl() {
  return normalizeHostedUploadUiBaseUrl(
    readEnv("HOSTED_UPLOAD_UI_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_UPLOAD_UI_BASE_URL")
      ?? readEnv("HOSTED_AUTH_BASE_URL")
      ?? DEFAULT_BASE_URL,
  );
}

async function makeFixture(generatedAt: string, secret: string): Promise<SyntheticFixture> {
  const userId = randomUUID();
  const sessionId = randomUUID();
  const sessionToken = `codexuploadui${randomUUID().replace(/-/g, "")}`;
  const signature = await makeSignature(sessionToken, secret);
  const signedCookieValue = `${sessionToken}.${signature}`;
  const sessionExpiresAt = new Date(Date.parse(generatedAt) + 60 * 60 * 1000).toISOString();
  const email = `${EMAIL_PREFIX}${generatedAt.replace(/[-:.TZ]/g, "").toLowerCase()}@${EMAIL_DOMAIN}`;

  addRedaction(secret);
  addRedaction(sessionToken);
  addRedaction(signature);
  addRedaction(signedCookieValue);

  return {
    userId,
    email,
    sessionId,
    sessionToken,
    sessionExpiresAt,
    signedCookieValue,
  };
}

function seedFixtureSql(fixture: SyntheticFixture, now: string) {
  const displayName = "Codex Upload UI Proof";
  return `
    INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
    VALUES (${sqlValue(fixture.userId)}, ${sqlValue(displayName)}, ${sqlValue(fixture.email)}, 1, NULL, ${sqlValue(now)}, ${sqlValue(now)});

    INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
    VALUES (${sqlValue(fixture.sessionId)}, ${sqlValue(fixture.sessionExpiresAt)}, ${sqlValue(fixture.sessionToken)}, ${sqlValue(now)}, ${sqlValue(now)}, NULL, ${sqlValue("codex-hosted-upload-ui-proof")}, ${sqlValue(fixture.userId)});

    INSERT INTO profiles (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at)
    VALUES (${sqlValue(fixture.userId)}, ${sqlValue(fixture.email)}, ${sqlValue(displayName)}, 'member', ${sqlValue(WORKSPACE_ID)}, NULL, ${sqlValue(now)}, ${sqlValue(now)});

    INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
    VALUES (${sqlValue(WORKSPACE_ID)}, ${sqlValue(fixture.userId)}, 'owner', ${sqlValue(now)}, ${sqlValue(now)});

    INSERT INTO legal_terms_acceptances (
      id,
      user_id,
      terms_key,
      terms_version,
      terms_effective_date,
      terms_content_hash,
      privacy_policy_version,
      acceptance_method,
      acceptance_context,
      metadata_json,
      accepted_at,
      created_at
    )
    VALUES (
      ${sqlValue(randomUUID())},
      ${sqlValue(fixture.userId)},
      ${sqlValue(TERMS.key)},
      ${sqlValue(TERMS.version)},
      ${sqlValue(TERMS.effectiveDate)},
      ${sqlValue(TERMS.contentHash)},
      ${sqlValue(TERMS.privacyPolicyVersion)},
      'authenticated_clickwrap',
      'workshop_terms_gate',
      ${sqlValue(JSON.stringify({ source: "codex_hosted_upload_ui_proof" }))},
      ${sqlValue(now)},
      ${sqlValue(now)}
    );

    INSERT INTO closed_beta_allowed_emails (
      id,
      normalized_email,
      status,
      invited_by,
      invited_at,
      accepted_at,
      notes,
      metadata_json,
      created_at,
      updated_at
    )
    VALUES (
      ${sqlValue(randomUUID())},
      ${sqlValue(fixture.email)},
      'active',
      NULL,
      ${sqlValue(now)},
      ${sqlValue(now)},
      ${sqlValue("Codex hosted upload UI synthetic proof fixture")},
      ${sqlValue(JSON.stringify({ source: "codex_hosted_upload_ui_proof" }))},
      ${sqlValue(now)},
      ${sqlValue(now)}
    );
  `;
}

function objectPathShape(path: string | null | undefined) {
  if (!path) return null;
  const parts = path.split("/");
  if (parts.length >= 3) return "{workspaceId}/{userId}/{safeUploadName}-{uuid}.pdf";
  return "{sanitized-component-attachment-path}";
}

function objectPathHash(path: string | null | undefined) {
  if (!path) return null;
  return sha256Hex(path);
}

function validateUploadBody(body: UploadApiBody | null, expectedFileName: string, expectedSizeBytes: number) {
  return Boolean(
    body
    && body.bucket === R2_LOGICAL_BUCKET
    && body.fileName === expectedFileName
    && body.contentType === "application/pdf"
    && body.sizeBytes === expectedSizeBytes
    && body.scanStatus === "pending"
    && typeof body.path === "string"
    && body.path.length > 0
    && typeof body.uploadSessionId === "string"
    && body.uploadSessionId.length > 0
    && typeof body.assetId === "string"
    && body.assetId.length > 0,
  );
}

async function attachCookies(context: BrowserContext, baseUrl: string, fixture: SyntheticFixture) {
  await context.addCookies([
    {
      name: "__Secure-better-auth.session_token",
      value: fixture.signedCookieValue,
      url: baseUrl,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "better-auth.session_token",
      value: fixture.signedCookieValue,
      url: baseUrl,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

function uploadApiSummary(body: UploadApiBody | null, status: number | null, ok: boolean) {
  if (!body) return null;
  return {
    status,
    ok,
    bucket: body.bucket ?? null,
    fileName: body.fileName ?? null,
    contentType: body.contentType ?? null,
    sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
    scanStatus: body.scanStatus ?? null,
    uploadSessionIdPresent: Boolean(body.uploadSessionId),
    assetIdPresent: Boolean(body.assetId),
    objectPathShape: objectPathShape(body.path),
    objectPathHash: objectPathHash(body.path),
  };
}

async function driveBrowserUpload(input: {
  baseUrl: string;
  fixture: SyntheticFixture;
  fileName: string;
  pdfBytes: Buffer;
}): Promise<BrowserProof> {
  let browser: Browser | null = null;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  try {
    browser = await chromium.launch({ headless: readEnv("HOSTED_UPLOAD_UI_HEADED") !== "1" });
    const context = await browser.newContext({
      baseURL: input.baseUrl,
      viewport: { width: 1365, height: 900 },
    });
    await attachCookies(context, input.baseUrl, input.fixture);
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(redact(message.text()).slice(0, 500));
    });
    page.on("pageerror", (error) => {
      pageErrors.push(redact(error.message).slice(0, 500));
    });

    const navigationResponse = await page.goto(`${input.baseUrl}${ROUTE_PATH}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const finalUrlPath = pathFromUrl(page.url(), input.baseUrl);
    const routeStatus = navigationResponse?.status() ?? null;
    const routeOk = navigationResponse?.ok() ?? false;

    const workspace = page.locator('[data-component-library-workspace="true"]');
    await workspace.waitFor({ state: "visible", timeout: 90_000 });
    const workspaceVisible = await workspace.isVisible().catch(() => false);

    const addComponentButton = workspace.getByRole("button", { name: /^Add component$/i }).first();
    await addComponentButton.waitFor({ state: "visible", timeout: 30_000 });
    const addComponentButtonReady = await addComponentButton.isVisible().catch(() => false);
    await addComponentButton.click();

    const modalHeading = page.getByRole("heading", { name: "Add Component" });
    await modalHeading.waitFor({ state: "visible", timeout: 30_000 });
    const addComponentModalReady = await modalHeading.isVisible().catch(() => false);

    const variantPanelButton = page.getByRole("button", { name: "Open variants panel" });
    await variantPanelButton.click();
    const variantManager = page.locator('[aria-label="Variant manager"]');
    await variantManager.waitFor({ state: "visible", timeout: 30_000 });
    const variantPanelReady = await variantManager.isVisible().catch(() => false);
    const managerV1Button = variantManager.locator("button").filter({ hasText: /^V1/ }).first();
    await managerV1Button.click();

    const variantEditor = page.locator('[aria-label="Variant editor"]');
    await variantEditor.waitFor({ state: "visible", timeout: 30_000 });

    const attachmentInput = page.locator('section[aria-label="Variant attachments"] input[aria-label="Upload attachment"]');
    await attachmentInput.waitFor({ state: "attached", timeout: 30_000 });
    const attachmentInputReady = await attachmentInput.count().then((count) => count > 0).catch(() => false);

    const uploadResponsePromise = page.waitForResponse((response) => (
      response.url().includes("/api/component-library/attachments")
      && response.request().method() === "POST"
    ), { timeout: 90_000 });
    await attachmentInput.setInputFiles({
      name: input.fileName,
      mimeType: "application/pdf",
      buffer: input.pdfBytes,
    });
    const uploadResponse = await uploadResponsePromise;
    const uploadApiStatus = uploadResponse.status();
    const uploadApiOk = uploadResponse.ok();
    const uploadApiBody = await uploadResponse.json().catch(() => ({ error: "non_json_upload_response" })) as UploadApiBody;
    addRedaction(uploadApiBody.path);

    const statusText = page
      .locator('section[aria-label="Variant attachments"] [role="status"]')
      .filter({ hasText: input.fileName });
    await statusText.waitFor({ state: "visible", timeout: 30_000 });
    const statusTextVisible = await statusText.isVisible().catch(() => false);
    const variantEditorReady = await variantEditor.isVisible().catch(() => false);

    await context.close();
    return {
      routeStatus,
      routeOk,
      finalUrlPath,
      workspaceVisible,
      addComponentButtonReady,
      addComponentModalReady,
      variantPanelReady,
      variantEditorReady,
      attachmentInputReady,
      uploadApiStatus,
      uploadApiOk,
      uploadApiBody,
      statusTextVisible,
      consoleErrors,
      pageErrors,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function pathFromUrl(value: string, baseUrl: string) {
  try {
    const parsed = new URL(value, baseUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

function readD1UploadRecord(upload: UploadApiBody, fixtureChecksum: string): D1UploadReadback {
  const sql = `
    SELECT COUNT(*) AS uploadSessionRows, MAX(status) AS sessionStatus, MAX(content_type) AS contentType, MAX(size_bytes) AS sizeBytes, MAX(checksum_sha256) AS checksumSha256
    FROM upload_sessions
    WHERE id = ${sqlValue(upload.uploadSessionId ?? null)}
      AND storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND storage_path = ${sqlValue(upload.path ?? null)};

    SELECT COUNT(*) AS uploadAssetRows, MAX(status) AS assetStatus, MAX(scan_status) AS scanStatus, MAX(content_type) AS contentType, MAX(size_bytes) AS sizeBytes, MAX(checksum_sha256) AS checksumSha256
    FROM upload_assets
    WHERE id = ${sqlValue(upload.assetId ?? null)}
      AND upload_session_id = ${sqlValue(upload.uploadSessionId ?? null)}
      AND storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND storage_path = ${sqlValue(upload.path ?? null)};

    SELECT COUNT(*) AS attachmentRows
    FROM cost_library_item_variant_attachments
    WHERE storage_bucket = ${sqlValue(R2_LOGICAL_BUCKET)}
      AND storage_path = ${sqlValue(upload.path ?? null)};

    SELECT event_type AS eventType
    FROM upload_events
    WHERE upload_session_id = ${sqlValue(upload.uploadSessionId ?? null)}
       OR upload_asset_id = ${sqlValue(upload.assetId ?? null)}
    ORDER BY created_at ASC;
  `;
  const results = d1Execute(sql, "read hosted upload UI D1 upload record");
  const sessionChecksum = stringAt(results, 0, "checksumSha256");
  const assetChecksum = stringAt(results, 1, "checksumSha256");
  return {
    uploadSessionRows: numberAt(results, 0, "uploadSessionRows"),
    uploadAssetRows: numberAt(results, 1, "uploadAssetRows"),
    attachmentRows: numberAt(results, 2, "attachmentRows"),
    eventTypes: (results[3]?.results ?? []).map((row) => row.eventType).filter((value): value is string => typeof value === "string"),
    sessionStatus: stringAt(results, 0, "sessionStatus"),
    assetStatus: stringAt(results, 1, "assetStatus"),
    scanStatus: stringAt(results, 1, "scanStatus"),
    contentType: stringAt(results, 1, "contentType") ?? stringAt(results, 0, "contentType"),
    sizeBytes: numberAt(results, 1, "sizeBytes") || numberAt(results, 0, "sizeBytes") || null,
    checksumMatchesFixture: sessionChecksum === fixtureChecksum && assetChecksum === fixtureChecksum,
  };
}

function runWrangler(args: string[], label: string, allowFailure = false) {
  const result = spawnSync("bunx", ["wrangler", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${label} failed: ${redact([result.stdout, result.stderr].filter(Boolean).join("\n"))}`);
  }
  return result;
}

function physicalR2ObjectPath(storagePath: string) {
  const objectPath = `${R2_PHYSICAL_BUCKET}/${R2_LOGICAL_BUCKET}/${storagePath}`;
  addRedaction(storagePath);
  addRedaction(objectPath);
  return objectPath;
}

async function readR2Object(storagePath: string, fixtureChecksum: string): Promise<R2ObjectReadback> {
  const directory = await mkdtemp(join(tmpdir(), "archestimator-upload-ui-r2-"));
  const file = join(directory, "object.bin");
  try {
    const result = runWrangler([
      "r2",
      "object",
      "get",
      physicalR2ObjectPath(storagePath),
      "--remote",
      "--file",
      file,
    ], "read hosted upload UI R2 object");
    const bytes = await readFile(file);
    return {
      getStatus: result.status,
      readable: true,
      sizeBytes: bytes.byteLength,
      checksumMatchesFixture: sha256Hex(bytes) === fixtureChecksum,
    };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

function removeR2ObjectBestEffort(storagePath: string) {
  runWrangler([
    "r2",
    "object",
    "delete",
    physicalR2ObjectPath(storagePath),
    "--remote",
  ], "remove hosted upload UI R2 object", true);
}

async function r2ObjectMissing(storagePath: string) {
  const directory = await mkdtemp(join(tmpdir(), "archestimator-upload-ui-r2-missing-"));
  const file = join(directory, "object.bin");
  try {
    const result = runWrangler([
      "r2",
      "object",
      "get",
      physicalR2ObjectPath(storagePath),
      "--remote",
      "--file",
      file,
    ], "verify hosted upload UI R2 object is missing", true);
    return result.status !== 0;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function deleteViaApp(page: Page | null, baseUrl: string, fixture: SyntheticFixture, storagePath: string): Promise<AppCleanupProof> {
  let browser: Browser | null = null;
  let activePage = page;
  try {
    if (!activePage) {
      browser = await chromium.launch({ headless: readEnv("HOSTED_UPLOAD_UI_HEADED") !== "1" });
      const context = await browser.newContext({ baseURL: baseUrl });
      await attachCookies(context, baseUrl, fixture);
      activePage = await context.newPage();
      await activePage.goto(`${baseUrl}${ROUTE_PATH}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    }

    const result = await activePage.evaluate(async (path) => {
      const response = await fetch("/api/component-library/attachments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [path] }),
      });
      const body = await response.json().catch(() => ({}));
      return {
        status: response.status,
        ok: response.ok,
        removedCount: Array.isArray(body.removedPaths) ? body.removedPaths.length : 0,
      };
    }, storagePath);
    const missing = await r2ObjectMissing(storagePath);
    return {
      deleteStatus: result.status,
      deleteOk: result.ok,
      removedCount: result.removedCount,
      r2ObjectMissingAfterDelete: missing,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function buildReadiness(input: {
  browserProof: BrowserProof | null;
  uploadBodyValid: boolean;
  d1Readback: D1UploadReadback | null;
  r2Readback: R2ObjectReadback | null;
  appCleanup: AppCleanupProof | null;
  cleanupAfter: SyntheticCleanupCounts | null;
  error: string | null;
}): HostedUploadUiProofReport["readiness"] {
  const d1UploadSessionRecorded = input.d1Readback?.uploadSessionRows === 1
    && input.d1Readback.sessionStatus === "finalized"
    && input.d1Readback.checksumMatchesFixture;
  const d1UploadAssetRecorded = input.d1Readback?.uploadAssetRows === 1
    && input.d1Readback.assetStatus === "finalized"
    && input.d1Readback.scanStatus === "pending"
    && input.d1Readback.checksumMatchesFixture;
  const readiness = {
    browserRouteReady: input.browserProof?.routeOk === true && input.browserProof.finalUrlPath === ROUTE_PATH,
    syntheticBetterAuthSessionReady: input.browserProof?.routeOk === true && input.browserProof.finalUrlPath === ROUTE_PATH,
    componentLibraryWorkspaceVisible: input.browserProof?.workspaceVisible === true,
    addComponentModalReady: input.browserProof?.addComponentModalReady === true,
    variantAttachmentInputReady: input.browserProof?.attachmentInputReady === true,
    uiUploadRequestObserved: input.browserProof?.uploadApiStatus !== null && input.browserProof?.uploadApiStatus !== undefined,
    uploadResponseReady: input.browserProof?.uploadApiOk === true && input.uploadBodyValid,
    d1UploadSessionRecorded,
    d1UploadAssetRecorded,
    d1ScanPendingEventRecorded: input.d1Readback?.eventTypes.includes("scan_pending") === true,
    r2ObjectReadable: input.r2Readback?.readable === true,
    r2ChecksumMatchesFixture: input.r2Readback?.checksumMatchesFixture === true,
    appCleanupRemovedR2Object: input.appCleanup?.deleteOk === true
      && input.appCleanup.removedCount === 1
      && input.appCleanup.r2ObjectMissingAfterDelete === true,
    d1CleanupReady: cleanupCountsAreZero(input.cleanupAfter),
    hostedUploadUiReady: false,
    productionCutoverReady: false as const,
  };
  readiness.hostedUploadUiReady = Object.entries(readiness)
    .filter(([key]) => key !== "productionCutoverReady" && key !== "hostedUploadUiReady")
    .every(([, value]) => value === true)
    && !input.error;
  return readiness;
}

function blockersForReadiness(readiness: HostedUploadUiProofReport["readiness"], error: string | null) {
  const blockers: string[] = [];
  if (error) blockers.push(error);
  if (!readiness.browserRouteReady) blockers.push("The hosted component library route did not load as an authenticated Cloudflare browser session.");
  if (!readiness.syntheticBetterAuthSessionReady) blockers.push("The synthetic Better Auth D1 session was not accepted by the hosted route.");
  if (!readiness.componentLibraryWorkspaceVisible) blockers.push("The component library workspace UI did not become visible.");
  if (!readiness.addComponentModalReady) blockers.push("The Add Component modal did not open.");
  if (!readiness.variantAttachmentInputReady) blockers.push("The variant attachment upload input was not reachable.");
  if (!readiness.uiUploadRequestObserved) blockers.push("The browser did not issue the attachment upload request.");
  if (!readiness.uploadResponseReady) blockers.push("The hosted attachment upload API did not return the expected PDF upload metadata.");
  if (!readiness.d1UploadSessionRecorded) blockers.push("D1 upload_sessions did not contain exactly one finalized synthetic browser upload session.");
  if (!readiness.d1UploadAssetRecorded) blockers.push("D1 upload_assets did not contain exactly one finalized pending-scan synthetic browser upload asset.");
  if (!readiness.d1ScanPendingEventRecorded) blockers.push("D1 upload_events did not record the pending scan event.");
  if (!readiness.r2ObjectReadable) blockers.push("The synthetic PDF was not readable from Cloudflare R2.");
  if (!readiness.r2ChecksumMatchesFixture) blockers.push("The R2 object checksum did not match the browser-uploaded PDF fixture.");
  if (!readiness.appCleanupRemovedR2Object) blockers.push("The app cleanup route did not remove the synthetic R2 object.");
  if (!readiness.d1CleanupReady) blockers.push("Synthetic D1 rows did not return to zero after cleanup.");
  return blockers;
}

function buildReport(input: {
  generatedAt: string;
  baseUrl: string;
  fixture: SyntheticFixture | null;
  fileName: string;
  fileSizeBytes: number;
  fixtureChecksumSha256: string;
  browserProof: BrowserProof | null;
  uploadBodyValid: boolean;
  d1Readback: D1UploadReadback | null;
  r2Readback: R2ObjectReadback | null;
  appCleanup: AppCleanupProof | null;
  cleanupBefore: SyntheticCleanupCounts | null;
  cleanupAfter: SyntheticCleanupCounts | null;
  error: string | null;
}): HostedUploadUiProofReport {
  const readiness = buildReadiness({
    browserProof: input.browserProof,
    uploadBodyValid: input.uploadBodyValid,
    d1Readback: input.d1Readback,
    r2Readback: input.r2Readback,
    appCleanup: input.appCleanup,
    cleanupAfter: input.cleanupAfter,
    error: input.error,
  });
  const blockers = blockersForReadiness(readiness, input.error);
  const uploadApi = uploadApiSummary(
    input.browserProof?.uploadApiBody ?? null,
    input.browserProof?.uploadApiStatus ?? null,
    input.browserProof?.uploadApiOk ?? false,
  );
  return {
    generatedAt: input.generatedAt,
    mode: "cloudflare-hosted-upload-ui-proof",
    baseUrl: input.baseUrl,
    routePath: ROUTE_PATH,
    d1Database: D1_DATABASE,
    r2PhysicalBucket: R2_PHYSICAL_BUCKET,
    r2LogicalBucket: R2_LOGICAL_BUCKET,
    workspaceId: WORKSPACE_ID,
    syntheticFixture: input.fixture
      ? {
        userId: input.fixture.userId,
        email: input.fixture.email,
        workspaceRole: "owner",
        sessionExpiresAt: input.fixture.sessionExpiresAt,
        signedCookiesProvided: true,
      }
      : null,
    readiness,
    proof: {
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      fixtureChecksumSha256: input.fixtureChecksumSha256,
      navigation: input.browserProof
        ? {
          routeStatus: input.browserProof.routeStatus,
          routeOk: input.browserProof.routeOk,
          finalUrlPath: input.browserProof.finalUrlPath,
        }
        : null,
      ui: input.browserProof
        ? {
          workspaceVisible: input.browserProof.workspaceVisible,
          addComponentButtonReady: input.browserProof.addComponentButtonReady,
          addComponentModalReady: input.browserProof.addComponentModalReady,
          variantPanelReady: input.browserProof.variantPanelReady,
          variantEditorReady: input.browserProof.variantEditorReady,
          attachmentInputReady: input.browserProof.attachmentInputReady,
          statusTextVisible: input.browserProof.statusTextVisible,
        }
        : null,
      uploadApi,
      d1Readback: input.d1Readback,
      r2Readback: input.r2Readback,
      appCleanup: input.appCleanup,
      cleanupBefore: input.cleanupBefore,
      cleanupAfter: input.cleanupAfter,
      browserDiagnostics: {
        consoleErrors: input.browserProof?.consoleErrors ?? [],
        pageErrors: input.browserProof?.pageErrors ?? [],
      },
    },
    blockers,
    passed: readiness.hostedUploadUiReady && blockers.length === 0,
    note: NOTE,
    error: input.error,
  };
}

function writeJson(file: string, value: unknown) {
  const outputPath = resolve(file);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(file: string, report: HostedUploadUiProofReport) {
  const outputPath = resolve(file);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rows = Object.entries(report.readiness)
    .map(([gate, ready]) => `| ${gate} | ${ready ? "yes" : "no"} |`)
    .join("\n");
  const blockers = report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  writeFileSync(outputPath, `# Cloudflare Hosted Upload UI Proof

Status: **${report.passed ? "PASSED" : "OPEN / NOT FULLY PROVEN"}**

Generated: \`${report.generatedAt}\`

Base URL: \`${report.baseUrl}\`

Route: \`${report.routePath}\`

D1 database: \`${report.d1Database}\`

R2 physical bucket: \`${report.r2PhysicalBucket}\`

R2 logical bucket: \`${report.r2LogicalBucket}\`

Workspace fixture: \`${report.workspaceId}\`

${report.note}

## Summary

| Gate | Ready |
| --- | --- |
${rows}

## Sanitized Browser Upload

- File name: \`${report.proof.fileName}\`
- File size bytes: \`${report.proof.fileSizeBytes}\`
- Fixture checksum: \`${report.proof.fixtureChecksumSha256}\`
- Route status: \`${report.proof.navigation?.routeStatus ?? "(none)"}\`
- Final route path: \`${report.proof.navigation?.finalUrlPath ?? "(none)"}\`
- Upload API status: \`${report.proof.uploadApi?.status ?? "(none)"}\`
- Upload API bucket: \`${report.proof.uploadApi?.bucket ?? "(none)"}\`
- Upload API content type: \`${report.proof.uploadApi?.contentType ?? "(none)"}\`
- Upload API scan status: \`${report.proof.uploadApi?.scanStatus ?? "(none)"}\`
- Upload session id present: \`${report.proof.uploadApi?.uploadSessionIdPresent ? "yes" : "no"}\`
- Upload asset id present: \`${report.proof.uploadApi?.assetIdPresent ? "yes" : "no"}\`
- Object path shape: \`${report.proof.uploadApi?.objectPathShape ?? "(none)"}\`
- Object path hash: \`${report.proof.uploadApi?.objectPathHash ?? "(none)"}\`
- D1 event types: \`${report.proof.d1Readback?.eventTypes.join(", ") || "(none)"}\`
- R2 bytes readable: \`${report.proof.r2Readback?.readable ? "yes" : "no"}\`
- R2 checksum matches: \`${report.proof.r2Readback?.checksumMatchesFixture ? "yes" : "no"}\`
- App cleanup DELETE status: \`${report.proof.appCleanup?.deleteStatus ?? "(none)"}\`
- App cleanup removed count: \`${report.proof.appCleanup?.removedCount ?? "(none)"}\`
- Cleanup counts after proof: \`${JSON.stringify(report.proof.cleanupAfter ?? {})}\`

## Blockers

${blockers.join("\n")}
`);
}

async function runProof() {
  const generatedAt = new Date().toISOString();
  const baseUrl = chooseBaseUrl();
  const secret = readSecret("BETTER_AUTH_SECRET");
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET is missing or shorter than 32 characters.");

  const pdfBytes = createPdfBytes();
  const fixtureChecksumSha256 = sha256Hex(pdfBytes);
  const fileName = `${FILE_PREFIX}-${generatedAt.replace(/[-:.TZ]/g, "").toLowerCase()}.pdf`;
  let fixture: SyntheticFixture | null = null;
  let cleanupBefore: SyntheticCleanupCounts | null = null;
  let cleanupAfter: SyntheticCleanupCounts | null = null;
  let browserProof: BrowserProof | null = null;
  let d1Readback: D1UploadReadback | null = null;
  let r2Readback: R2ObjectReadback | null = null;
  let appCleanup: AppCleanupProof | null = null;
  let error: string | null = null;

  try {
    for (const stalePath of listStaleUploadPaths()) removeR2ObjectBestEffort(stalePath);
    cleanupSyntheticRows("pre-clean hosted upload UI synthetic rows");
    cleanupBefore = countSyntheticRows();

    fixture = await makeFixture(generatedAt, secret);
    d1Execute(seedFixtureSql(fixture, generatedAt), "seed hosted upload UI synthetic auth fixture");

    browserProof = await driveBrowserUpload({
      baseUrl,
      fixture,
      fileName,
      pdfBytes,
    });

    const uploadBody = browserProof.uploadApiBody;
    if (uploadBody?.path) addRedaction(uploadBody.path);
    const uploadBodyValid = validateUploadBody(uploadBody, fileName, pdfBytes.byteLength);
    if (!uploadBodyValid) throw new Error(`Hosted browser upload returned unexpected metadata or status ${browserProof.uploadApiStatus ?? "(none)"}.`);

    d1Readback = readD1UploadRecord(uploadBody!, fixtureChecksumSha256);
    r2Readback = await readR2Object(uploadBody!.path!, fixtureChecksumSha256);
    appCleanup = await deleteViaApp(null, baseUrl, fixture, uploadBody!.path!);
    cleanupExactRows({ fixture, upload: uploadBody });
  } catch (caught) {
    error = redact(caught instanceof Error ? caught.message : String(caught));
  } finally {
    const uploadBody = browserProof?.uploadApiBody ?? null;
    if (uploadBody?.path && !appCleanup?.r2ObjectMissingAfterDelete) removeR2ObjectBestEffort(uploadBody.path);
    try {
      cleanupExactRows({ fixture, upload: uploadBody });
      cleanupSyntheticRows("post-clean hosted upload UI synthetic rows");
      cleanupAfter = countSyntheticRows();
    } catch (cleanupError) {
      const message = redact(cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
      error = error ? `${error}; cleanup error: ${message}` : `cleanup error: ${message}`;
    }
  }

  const uploadBodyValid = validateUploadBody(browserProof?.uploadApiBody ?? null, fileName, pdfBytes.byteLength);
  return buildReport({
    generatedAt,
    baseUrl,
    fixture,
    fileName,
    fileSizeBytes: pdfBytes.byteLength,
    fixtureChecksumSha256,
    browserProof,
    uploadBodyValid,
    d1Readback,
    r2Readback,
    appCleanup,
    cleanupBefore,
    cleanupAfter,
    error,
  });
}

async function main() {
  const outputFile = readEnv("HOSTED_UPLOAD_UI_OUTPUT_FILE") ?? readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("HOSTED_UPLOAD_UI_MARKDOWN_FILE") ?? readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  const report = await runProof();
  writeJson(outputFile, report);
  writeMarkdown(markdownFile, report);

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    mode: report.mode,
    passed: report.passed,
    readiness: report.readiness,
    blockers: report.blockers,
    outputFile,
    markdownFile,
  }, null, 2));

  if (!report.passed) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch(async (caught) => {
    const message = redact(caught instanceof Error ? caught.message : String(caught));
    const generatedAt = new Date().toISOString();
    const baseUrl = (() => {
      try {
        return chooseBaseUrl();
      } catch {
        return DEFAULT_BASE_URL;
      }
    })();
    const report = buildReport({
      generatedAt,
      baseUrl,
      fixture: null,
      fileName: `${FILE_PREFIX}-not-created.pdf`,
      fileSizeBytes: 0,
      fixtureChecksumSha256: "",
      browserProof: null,
      uploadBodyValid: false,
      d1Readback: null,
      r2Readback: null,
      appCleanup: null,
      cleanupBefore: null,
      cleanupAfter: null,
      error: message,
    });
    writeJson(readEnv("HOSTED_UPLOAD_UI_OUTPUT_FILE") ?? readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE, report);
    writeMarkdown(readEnv("HOSTED_UPLOAD_UI_MARKDOWN_FILE") ?? readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE, report);
    console.error(message);
    process.exitCode = 1;
  });
}
