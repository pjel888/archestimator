#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

type D1Result = {
  results?: Array<Record<string, unknown>>;
  success?: boolean;
  meta?: Record<string, unknown>;
};

type SyntheticUser = {
  id: string;
  email: string;
  displayName: string;
  sessionId: string;
  sessionToken: string;
  signedCookieValue: string;
  sessionExpiresAt: string;
  projectRole: "owner" | "editor";
};

type SyntheticFixture = {
  workspaceId: string;
  projectId: string;
  estimateId: string;
  tabId: string;
  rootNodeId: string;
  areaNodeId: string;
  rowId: string;
  workspaceSlug: string;
  projectCode: string;
  users: [SyntheticUser, SyntheticUser];
};

type CleanupCounts = {
  users: number;
  sessions: number;
  profiles: number;
  memberships: number;
  closedBetaRows: number;
  legalTermsRows: number;
  workspaces: number;
  projects: number;
  projectMembers: number;
  estimates: number;
  estimateTabs: number;
  estimateNodes: number;
  estimateRows: number;
  estimateSheetMembers: number;
  estimateSheetAccessSettings: number;
  estimateSheetPreferences: number;
};

type BrowserProof = {
  projectRouteStatus: number | null;
  projectRouteOk: boolean;
  projectHeaderAccessLinkReady: boolean;
  publisherAccessRouteStatus: number | null;
  publisherAccessReady: boolean;
  rosterPanelReady: boolean;
  userARosterVisible: boolean;
  userBRosterVisible: boolean;
  estimateRouteAStatus: number | null;
  estimateRouteBStatus: number | null;
  estimateRouteAReady: boolean;
  estimateRouteBReady: boolean;
  cursorChannelA: string | null;
  cursorChannelB: string | null;
  cursorSendStatusB: string | null;
  remoteCursorVisibleOnA: boolean;
  remoteCursorUserIdOnA: string | null;
  remoteCursorLabelOnA: string | null;
  consoleErrors: string[];
  pageErrors: string[];
};

type HostedCollaborationUiProofReport = {
  generatedAt: string;
  mode: "cloudflare-hosted-collaboration-ui-proof";
  baseUrl: string;
  d1Database: string;
  syntheticFixture: {
    workspaceId: string;
    projectId: string;
    estimateId: string;
    areaNodeId: string;
    projectCode: string;
    users: Array<{
      id: string;
      email: string;
      displayName: string;
      projectRole: "owner" | "editor";
      sessionExpiresAt: string;
      signedCookiesProvided: boolean;
    }>;
  } | null;
  readiness: {
    syntheticBetterAuthSessionsReady: boolean;
    d1ProjectFixtureReady: boolean;
    projectRouteReady: boolean;
    publisherAccessRosterReady: boolean;
    twoClientEstimateRoutesReady: boolean;
    durableObjectChannelsSubscribed: boolean;
    cursorBroadcastSent: boolean;
    remoteCursorRendered: boolean;
    exactD1CleanupReady: boolean;
    hostedCollaborationUiReady: boolean;
    productionCutoverReady: false;
  };
  proof: {
    cleanupBefore: CleanupCounts | null;
    cleanupAfter: CleanupCounts | null;
    browser: BrowserProof | null;
    routes: {
      projectPath: string | null;
      publisherAccessPath: string | null;
      estimateSheetPath: string | null;
    };
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
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-collaboration-ui-proof.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-07-02-cloudflare-hosted-collaboration-ui-proof.md`;
const DEFAULT_BASE_URL = "https://archestimator.com";
const D1_DATABASE = process.env.CLOUDFLARE_D1_DATABASE?.trim() || "archestimator-proof-db";
const EMAIL_PREFIX = "codex-collab-ui-";
const EMAIL_DOMAIN = "example.invalid";
const WORKSPACE_SLUG_PREFIX = "codex-collab-ui";
const PROJECT_CODE_PREFIX = "CF-COLLAB";
const COLLABORATION_FLOOR_TRIGGER_NAMES = [
  "collaboration_workspace_owner_floor_delete",
  "collaboration_workspace_owner_floor_update",
  "collaboration_project_manager_floor_delete",
  "collaboration_project_manager_floor_update",
  "collaboration_restricted_estimate_manager_floor_delete",
  "collaboration_restricted_estimate_manager_floor_update",
  "collaboration_restricted_estimate_requires_manager_insert",
  "collaboration_restricted_estimate_requires_manager_update",
] as const;
const NOTE =
  "Seeds an exact synthetic Cloudflare D1 workspace/project/estimate with two Better Auth users, drives the hosted Publisher access roster and two authenticated estimate-sheet browser sessions on archestimator.com, verifies a Cloudflare Durable Object cursor broadcast renders remotely, then deletes the exact D1 fixture rows. Session tokens, signatures, cookies, and provider tokens are never written to evidence.";
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
  for (const secret of redactions) output = output.split(secret).join("[redacted]");
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

export function normalizeHostedCollaborationUiBaseUrl(
  value: string | undefined | null,
  allowedOrigins = parseAllowedOrigins(readEnv("HOSTED_COLLABORATION_UI_ALLOWED_ORIGINS")),
) {
  const raw = value?.trim() || DEFAULT_BASE_URL;
  const origin = normalizeOrigin(raw.replace(/\/+$/, ""), "HOSTED_COLLABORATION_UI_BASE_URL");
  const allowed = allowedOrigins.map((allowedOrigin) => normalizeOrigin(allowedOrigin, "HOSTED_COLLABORATION_UI_ALLOWED_ORIGINS"));
  if (!allowed.includes(origin)) {
    throw new Error(`HOSTED_COLLABORATION_UI_BASE_URL origin ${origin} is not in HOSTED_COLLABORATION_UI_ALLOWED_ORIGINS. Refusing to send hosted auth cookies.`);
  }
  return origin;
}

function chooseBaseUrl() {
  return normalizeHostedCollaborationUiBaseUrl(
    readEnv("HOSTED_COLLABORATION_UI_BASE_URL")
      ?? readEnv("CLOUDFLARE_HOSTED_COLLABORATION_UI_BASE_URL")
      ?? readEnv("HOSTED_AUTH_BASE_URL")
      ?? DEFAULT_BASE_URL,
  );
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

function numberAt(results: D1Result[], statementIndex: number, key: keyof CleanupCounts) {
  const value = results[statementIndex]?.results?.[0]?.[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function syntheticEmailLike() {
  return `${EMAIL_PREFIX}%@${EMAIL_DOMAIN}`;
}

function syntheticWorkspaceSlugLike() {
  return `${WORKSPACE_SLUG_PREFIX}-%`;
}

function syntheticProjectCodeLike() {
  return `${PROJECT_CODE_PREFIX}-%`;
}

function countSyntheticRows(): CleanupCounts {
  const emailLike = syntheticEmailLike();
  const workspaceLike = syntheticWorkspaceSlugLike();
  const projectCodeLike = syntheticProjectCodeLike();
  const sql = `
    SELECT COUNT(*) AS users FROM "user" WHERE email LIKE ${sqlValue(emailLike)};
    SELECT COUNT(*) AS sessions FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    SELECT COUNT(*) AS profiles FROM profiles WHERE email LIKE ${sqlValue(emailLike)};
    SELECT COUNT(*) AS memberships FROM workspace_members WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    ) OR workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ${sqlValue(workspaceLike)});
    SELECT COUNT(*) AS closedBetaRows FROM closed_beta_allowed_emails WHERE normalized_email LIKE ${sqlValue(emailLike)};
    SELECT COUNT(*) AS legalTermsRows FROM legal_terms_acceptances WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    SELECT COUNT(*) AS workspaces FROM workspaces WHERE slug LIKE ${sqlValue(workspaceLike)};
    SELECT COUNT(*) AS projects FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)} OR workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ${sqlValue(workspaceLike)});
    SELECT COUNT(*) AS projectMembers FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}) OR user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    SELECT COUNT(*) AS estimates FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)});
    SELECT COUNT(*) AS estimateTabs FROM estimate_tabs WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    SELECT COUNT(*) AS estimateNodes FROM estimate_nodes WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    SELECT COUNT(*) AS estimateRows FROM estimate_row_items WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    SELECT COUNT(*) AS estimateSheetMembers FROM estimate_sheet_members WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)})) OR user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    SELECT COUNT(*) AS estimateSheetAccessSettings FROM estimate_sheet_access_settings WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    SELECT COUNT(*) AS estimateSheetPreferences FROM estimate_sheet_user_preferences WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)})) OR user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
  `;
  const results = d1Execute(sql, "count hosted collaboration UI synthetic rows");
  return {
    users: numberAt(results, 0, "users"),
    sessions: numberAt(results, 1, "sessions"),
    profiles: numberAt(results, 2, "profiles"),
    memberships: numberAt(results, 3, "memberships"),
    closedBetaRows: numberAt(results, 4, "closedBetaRows"),
    legalTermsRows: numberAt(results, 5, "legalTermsRows"),
    workspaces: numberAt(results, 6, "workspaces"),
    projects: numberAt(results, 7, "projects"),
    projectMembers: numberAt(results, 8, "projectMembers"),
    estimates: numberAt(results, 9, "estimates"),
    estimateTabs: numberAt(results, 10, "estimateTabs"),
    estimateNodes: numberAt(results, 11, "estimateNodes"),
    estimateRows: numberAt(results, 12, "estimateRows"),
    estimateSheetMembers: numberAt(results, 13, "estimateSheetMembers"),
    estimateSheetAccessSettings: numberAt(results, 14, "estimateSheetAccessSettings"),
    estimateSheetPreferences: numberAt(results, 15, "estimateSheetPreferences"),
  };
}

function cleanupCountsAreZero(counts: CleanupCounts | null | undefined) {
  if (!counts) return false;
  return Object.values(counts).every((value) => Number(value) === 0);
}

function cleanupSyntheticRows(label = "cleanup hosted collaboration UI synthetic rows") {
  const emailLike = syntheticEmailLike();
  const workspaceLike = syntheticWorkspaceSlugLike();
  const projectCodeLike = syntheticProjectCodeLike();
  const sql = `
    DELETE FROM estimate_sheet_user_preferences
    WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}))
       OR user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    DELETE FROM estimate_row_items WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    DELETE FROM estimate_nodes WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    DELETE FROM estimate_tabs WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    DELETE FROM estimate_sheet_access_settings WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}));
    DELETE FROM estimate_sheet_members
    WHERE estimate_id IN (SELECT id FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)}))
       OR user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    DELETE FROM estimates WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)});
    DELETE FROM project_members
    WHERE project_id IN (SELECT id FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)})
       OR user_id IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    DELETE FROM projects WHERE project_code LIKE ${sqlValue(projectCodeLike)} OR workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ${sqlValue(workspaceLike)});
    DELETE FROM "session" WHERE "userId" IN (SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)});
    DELETE FROM workspace_members
    WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    ) OR workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE ${sqlValue(workspaceLike)});
    DELETE FROM legal_terms_acceptances
    WHERE user_id IN (
      SELECT id FROM profiles WHERE email LIKE ${sqlValue(emailLike)}
      UNION SELECT id FROM "user" WHERE email LIKE ${sqlValue(emailLike)}
    );
    DELETE FROM profiles WHERE email LIKE ${sqlValue(emailLike)};
    DELETE FROM closed_beta_allowed_emails WHERE normalized_email LIKE ${sqlValue(emailLike)};
    DELETE FROM "user" WHERE email LIKE ${sqlValue(emailLike)};
    DELETE FROM workspaces WHERE slug LIKE ${sqlValue(workspaceLike)};
  `;
  const dropFloorTriggersSql = COLLABORATION_FLOOR_TRIGGER_NAMES
    .map((name) => `DROP TRIGGER IF EXISTS ${name};`)
    .join("\n");
  const restoreFloorTriggersSql = readFileSync(
    resolve("migrations/0055_collaboration_manager_floor_integrity.sql"),
    "utf8",
  ).replace(/^\s*--.*$/gm, "");

  // Synthetic cleanup must remove the last owner/member row as well. Keep the
  // production floor definitions absent only for this exact D1 batch, and
  // restore the canonical migration in a finally block before returning.
  d1Execute(dropFloorTriggersSql, `${label}: temporarily remove collaboration floor triggers`);
  try {
    d1Execute(sql, label);
  } finally {
    d1Execute(restoreFloorTriggersSql, `${label}: restore collaboration floor triggers`);
  }
}

async function makeUser(input: {
  label: "A" | "B";
  generatedAt: string;
  secret: string;
  projectRole: "owner" | "editor";
}): Promise<SyntheticUser> {
  const id = randomUUID();
  const sessionId = randomUUID();
  const token = `codexcollabui${input.label.toLowerCase()}${randomUUID().replace(/-/g, "")}`;
  const signature = await makeSignature(token, input.secret);
  const signedCookieValue = `${token}.${signature}`;
  const sessionExpiresAt = new Date(Date.parse(input.generatedAt) + 60 * 60 * 1000).toISOString();
  const stamp = input.generatedAt.replace(/[-:.TZ]/g, "").toLowerCase();
  const email = `${EMAIL_PREFIX}${input.label.toLowerCase()}-${stamp}@${EMAIL_DOMAIN}`;

  addRedaction(input.secret);
  addRedaction(token);
  addRedaction(signature);
  addRedaction(signedCookieValue);

  return {
    id,
    email,
    displayName: input.label === "A" ? "Codex Collab Alice" : "Codex Collab Bruno",
    sessionId,
    sessionToken: token,
    signedCookieValue,
    sessionExpiresAt,
    projectRole: input.projectRole,
  };
}

async function makeFixture(generatedAt: string, secret: string): Promise<SyntheticFixture> {
  const stamp = generatedAt.replace(/[-:.TZ]/g, "").toLowerCase();
  const users = await Promise.all([
    makeUser({ label: "A", generatedAt, secret, projectRole: "owner" }),
    makeUser({ label: "B", generatedAt, secret, projectRole: "editor" }),
  ]);
  return {
    workspaceId: randomUUID(),
    projectId: randomUUID(),
    estimateId: randomUUID(),
    tabId: randomUUID(),
    rootNodeId: randomUUID(),
    areaNodeId: randomUUID(),
    rowId: randomUUID(),
    workspaceSlug: `${WORKSPACE_SLUG_PREFIX}-${stamp}`,
    projectCode: `${PROJECT_CODE_PREFIX}-${stamp}`,
    users: [users[0], users[1]],
  };
}

function insertUserSql(user: SyntheticUser, fixture: SyntheticFixture, now: string) {
  return `
    INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
    VALUES (${sqlValue(user.id)}, ${sqlValue(user.displayName)}, ${sqlValue(user.email)}, 1, NULL, ${sqlValue(now)}, ${sqlValue(now)});
    INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
    VALUES (${sqlValue(user.sessionId)}, ${sqlValue(user.sessionExpiresAt)}, ${sqlValue(user.sessionToken)}, ${sqlValue(now)}, ${sqlValue(now)}, NULL, ${sqlValue("codex-hosted-collaboration-ui-proof")}, ${sqlValue(user.id)});
    INSERT INTO profiles (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at)
    VALUES (${sqlValue(user.id)}, ${sqlValue(user.email)}, ${sqlValue(user.displayName)}, 'member', ${sqlValue(fixture.workspaceId)}, NULL, ${sqlValue(now)}, ${sqlValue(now)});
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
    VALUES (${sqlValue(fixture.workspaceId)}, ${sqlValue(user.id)}, ${sqlValue(user.projectRole === "owner" ? "owner" : "member")}, ${sqlValue(now)}, ${sqlValue(now)});
    INSERT INTO legal_terms_acceptances (
      id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash,
      privacy_policy_version, acceptance_method, acceptance_context, metadata_json, accepted_at, created_at
    )
    VALUES (
      ${sqlValue(randomUUID())}, ${sqlValue(user.id)}, ${sqlValue(TERMS.key)}, ${sqlValue(TERMS.version)},
      ${sqlValue(TERMS.effectiveDate)}, ${sqlValue(TERMS.contentHash)}, ${sqlValue(TERMS.privacyPolicyVersion)},
      'authenticated_clickwrap', 'workshop_terms_gate',
      ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof" }))}, ${sqlValue(now)}, ${sqlValue(now)}
    );
    INSERT INTO closed_beta_allowed_emails (
      id, normalized_email, status, invited_by, invited_at, accepted_at, notes, metadata_json, created_at, updated_at
    )
    VALUES (
      ${sqlValue(randomUUID())}, ${sqlValue(user.email)}, 'active', NULL, ${sqlValue(now)}, ${sqlValue(now)},
      ${sqlValue("Codex hosted collaboration UI synthetic proof fixture")},
      ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof" }))}, ${sqlValue(now)}, ${sqlValue(now)}
    );
  `;
}

function seedFixtureSql(fixture: SyntheticFixture, now: string) {
  const [userA, userB] = fixture.users;
  return `
    INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
    VALUES (${sqlValue(fixture.workspaceId)}, 'Codex Collaboration UI Proof Workspace', ${sqlValue(fixture.workspaceSlug)}, ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)});

    ${insertUserSql(userA, fixture, now)}
    ${insertUserSql(userB, fixture, now)}

    INSERT INTO projects (id, workspace_id, name, project_code, created_by, created_at, updated_at, client_name, location, currency_code, metadata)
    VALUES (
      ${sqlValue(fixture.projectId)}, ${sqlValue(fixture.workspaceId)}, 'Codex Hosted Collaboration Proof',
      ${sqlValue(fixture.projectCode)}, ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)},
      'Codex Synthetic Client', 'Cloudflare D1', 'PHP',
      ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof" }))}
    );

    INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at, updated_at)
    VALUES
      (${sqlValue(fixture.projectId)}, ${sqlValue(fixture.workspaceId)}, ${sqlValue(userA.id)}, ${sqlValue(userA.projectRole)}, ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)}),
      (${sqlValue(fixture.projectId)}, ${sqlValue(fixture.workspaceId)}, ${sqlValue(userB.id)}, ${sqlValue(userB.projectRole)}, ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)});

    INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at, sheet_code, project_budget, notes, currency_code, metadata)
    VALUES (
      ${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.projectId)}, 'Hosted Collaboration Estimate',
      ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)}, 'COLLAB-001', 1000, NULL, 'PHP',
      ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof", versionNumber: 1 }))}
    );

    INSERT INTO estimate_tabs (id, estimate_id, name, sort_order, is_default, archived_at, created_at, updated_at, metadata, created_by)
    VALUES (${sqlValue(fixture.tabId)}, ${sqlValue(fixture.estimateId)}, 'Main', 0, 1, NULL, ${sqlValue(now)}, ${sqlValue(now)}, '{}', ${sqlValue(userA.id)});

    INSERT INTO estimate_nodes (id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order, created_at, updated_at, metadata_json)
    VALUES
      (${sqlValue(fixture.rootNodeId)}, ${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.tabId)}, 'Proof Lot', 'group', NULL, 0, ${sqlValue(now)}, ${sqlValue(now)}, ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof" }))}),
      (${sqlValue(fixture.areaNodeId)}, ${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.tabId)}, 'Proof Area', 'area', ${sqlValue(fixture.rootNodeId)}, 10, ${sqlValue(now)}, ${sqlValue(now)}, ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof" }))});

    INSERT INTO estimate_row_items (
      id, estimate_id, node_id, description, designation, discipline, material, quantity,
      quantity_base, quantity_contingency_amount, unit, unit_cost, misc_cost,
      contingency_percentage, adjustment_percentage, source_snapshot_json, sort_order,
      created_at, updated_at, supplier_id, row_revision, category_node_id,
      source_library_item_id, link_state, metadata_json, supplier
    )
    VALUES (
      ${sqlValue(fixture.rowId)}, ${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.areaNodeId)},
      'Synthetic collaboration cursor row', 'Proof', 'Architecture', 'Cloudflare Durable Object',
      1, 1, 0, 'lot', 1000, 0, 0, 0, '{}', 0, ${sqlValue(now)}, ${sqlValue(now)},
      NULL, 0, NULL, NULL, 'unlinked',
      ${sqlValue(JSON.stringify({ source: "codex_hosted_collaboration_ui_proof" }))}, ''
    );

    INSERT INTO estimate_sheet_access_settings (estimate_id, project_id, inherit_project_access, updated_by, created_at, updated_at)
    VALUES (${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.projectId)}, 1, ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)});

    INSERT INTO estimate_sheet_members (estimate_id, project_id, user_id, role, added_by, created_at, updated_at)
    VALUES
      (${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.projectId)}, ${sqlValue(userA.id)}, 'owner', ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)}),
      (${sqlValue(fixture.estimateId)}, ${sqlValue(fixture.projectId)}, ${sqlValue(userB.id)}, 'editor', ${sqlValue(userA.id)}, ${sqlValue(now)}, ${sqlValue(now)});
  `;
}

async function attachCookies(context: BrowserContext, baseUrl: string, user: SyntheticUser) {
  await context.addCookies([
    {
      name: "__Secure-better-auth.session_token",
      value: user.signedCookieValue,
      url: baseUrl,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "better-auth.session_token",
      value: user.signedCookieValue,
      url: baseUrl,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

function pathFromUrl(value: string, baseUrl: string) {
  try {
    const parsed = new URL(value, baseUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

async function driveBrowserProof(input: {
  baseUrl: string;
  fixture: SyntheticFixture;
}): Promise<BrowserProof> {
  let browser: Browser | null = null;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const [userA, userB] = input.fixture.users;
  const projectPath = `/workshop/projects/${input.fixture.projectId}`;
  const publisherAccessPath = `/workshop/publisher?project=${input.fixture.projectId}&drawer=${input.fixture.projectId}&tab=access`;
  const estimateSheetPath = `/workshop/projects/${input.fixture.projectId}/estimates/${input.fixture.areaNodeId}`;

  try {
    browser = await chromium.launch({ headless: readEnv("HOSTED_COLLABORATION_UI_HEADED") !== "1" });
    const contextA = await browser.newContext({ baseURL: input.baseUrl, viewport: { width: 1440, height: 900 } });
    const contextB = await browser.newContext({ baseURL: input.baseUrl, viewport: { width: 1440, height: 900 } });
    await Promise.all([
      attachCookies(contextA, input.baseUrl, userA),
      attachCookies(contextB, input.baseUrl, userB),
    ]);
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    for (const page of [pageA, pageB]) {
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(redact(message.text()).slice(0, 500));
      });
      page.on("pageerror", (error) => {
        pageErrors.push(redact(error.message).slice(0, 500));
      });
    }

    const projectResponse = await pageA.goto(projectPath, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const projectHeaderAccessLink = pageA.locator('[data-workshop-layout="project-teamspace-header"]');
    await projectHeaderAccessLink.waitFor({ state: "visible", timeout: 60_000 });
    const projectHeaderAccessLinkReady = await projectHeaderAccessLink.isVisible().catch(() => false);

    const publisherResponse = await pageA.goto(publisherAccessPath, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const rosterPanel = pageA.locator('[data-publisher-members-panel="true"]');
    await rosterPanel.waitFor({ state: "visible", timeout: 90_000 });
    const userARow = rosterPanel.getByText(userA.displayName, { exact: false }).first();
    const userBRow = rosterPanel.getByText(userB.displayName, { exact: false }).first();
    const publisherAccessReady = (publisherResponse?.ok() ?? false) && pathFromUrl(pageA.url(), input.baseUrl)?.startsWith("/workshop/publisher") === true;
    const rosterPanelReady = await rosterPanel.isVisible().catch(() => false);
    const userARosterVisible = await userARow.isVisible().catch(() => false);
    const userBRosterVisible = await userBRow.isVisible().catch(() => false);

    const [estimateResponseA, estimateResponseB] = await Promise.all([
      pageA.goto(estimateSheetPath, { waitUntil: "domcontentloaded", timeout: 90_000 }),
      pageB.goto(estimateSheetPath, { waitUntil: "domcontentloaded", timeout: 90_000 }),
    ]);
    const surfaceA = pageA.locator("[data-estimate-pointer-surface]").first();
    const surfaceB = pageB.locator("[data-estimate-pointer-surface]").first();
    await Promise.all([
      surfaceA.waitFor({ state: "visible", timeout: 90_000 }),
      surfaceB.waitFor({ state: "visible", timeout: 90_000 }),
    ]);
    const [cursorChannelAReady, cursorChannelBReady] = await Promise.all([
      pageA.waitForFunction(() => document.querySelector("[data-estimate-pointer-surface]")?.getAttribute("data-estimate-cursor-channel") === "subscribed", undefined, { timeout: 30_000 }).then(() => true).catch(() => false),
      pageB.waitForFunction(() => document.querySelector("[data-estimate-pointer-surface]")?.getAttribute("data-estimate-cursor-channel") === "subscribed", undefined, { timeout: 30_000 }).then(() => true).catch(() => false),
    ]);
    if (!cursorChannelAReady || !cursorChannelBReady) {
      return {
        projectRouteStatus: projectResponse?.status() ?? null,
        projectRouteOk: projectResponse?.ok() ?? false,
        projectHeaderAccessLinkReady,
        publisherAccessRouteStatus: publisherResponse?.status() ?? null,
        publisherAccessReady,
        rosterPanelReady,
        userARosterVisible,
        userBRosterVisible,
        estimateRouteAStatus: estimateResponseA?.status() ?? null,
        estimateRouteBStatus: estimateResponseB?.status() ?? null,
        estimateRouteAReady: estimateResponseA?.ok() ?? false,
        estimateRouteBReady: estimateResponseB?.ok() ?? false,
        cursorChannelA: await surfaceA.getAttribute("data-estimate-cursor-channel").catch(() => null),
        cursorChannelB: await surfaceB.getAttribute("data-estimate-cursor-channel").catch(() => null),
        cursorSendStatusB: await surfaceB.getAttribute("data-estimate-cursor-send").catch(() => null),
        remoteCursorVisibleOnA: false,
        remoteCursorUserIdOnA: null,
        remoteCursorLabelOnA: null,
        consoleErrors,
        pageErrors,
      };
    }

    const pointerBox = await surfaceB.boundingBox();
    if (!pointerBox) throw new Error("Estimate pointer surface was not measurable.");
    await pageB.waitForTimeout(2_000);
    for (let index = 0; index < 10; index += 1) {
      const x = pointerBox.x + 160 + index * 14;
      const y = pointerBox.y + 120 + index * 7;
      await pageB.mouse.move(x, y);
      await surfaceB.evaluate((element, point) => {
        element.dispatchEvent(new PointerEvent("pointermove", {
          clientX: point.x,
          clientY: point.y,
          pointerType: "mouse",
          bubbles: true,
        }));
      }, { x, y });
      await pageB.waitForTimeout(150);
    }

    await pageB.waitForFunction(() => document.querySelector("[data-estimate-pointer-surface]")?.getAttribute("data-estimate-cursor-send") === "ok", undefined, { timeout: 15_000 });
    const remoteCursor = pageA.locator("[data-estimate-remote-cursor]").first();
    await remoteCursor.waitFor({ state: "visible", timeout: 20_000 });

    const result: BrowserProof = {
      projectRouteStatus: projectResponse?.status() ?? null,
      projectRouteOk: projectResponse?.ok() ?? false,
      projectHeaderAccessLinkReady,
      publisherAccessRouteStatus: publisherResponse?.status() ?? null,
      publisherAccessReady,
      rosterPanelReady,
      userARosterVisible,
      userBRosterVisible,
      estimateRouteAStatus: estimateResponseA?.status() ?? null,
      estimateRouteBStatus: estimateResponseB?.status() ?? null,
      estimateRouteAReady: estimateResponseA?.ok() ?? false,
      estimateRouteBReady: estimateResponseB?.ok() ?? false,
      cursorChannelA: await surfaceA.getAttribute("data-estimate-cursor-channel").catch(() => null),
      cursorChannelB: await surfaceB.getAttribute("data-estimate-cursor-channel").catch(() => null),
      cursorSendStatusB: await surfaceB.getAttribute("data-estimate-cursor-send").catch(() => null),
      remoteCursorVisibleOnA: await remoteCursor.isVisible().catch(() => false),
      remoteCursorUserIdOnA: await remoteCursor.getAttribute("data-estimate-remote-cursor").catch(() => null),
      remoteCursorLabelOnA: await remoteCursor.textContent().catch(() => null),
      consoleErrors,
      pageErrors,
    };

    await Promise.all([
      contextA.close().catch(() => undefined),
      contextB.close().catch(() => undefined),
    ]);
    return result;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function buildReadiness(input: {
  fixture: SyntheticFixture | null;
  browserProof: BrowserProof | null;
  cleanupAfter: CleanupCounts | null;
  error: string | null;
}): HostedCollaborationUiProofReport["readiness"] {
  const browser = input.browserProof;
  const fixture = input.fixture;
  const readiness = {
    syntheticBetterAuthSessionsReady: Boolean(fixture?.users.every((user) => user.signedCookieValue.length > 0)),
    d1ProjectFixtureReady: Boolean(fixture?.workspaceId && fixture.projectId && fixture.estimateId && fixture.areaNodeId),
    projectRouteReady: browser?.projectRouteOk === true && browser.projectHeaderAccessLinkReady === true,
    publisherAccessRosterReady: browser?.publisherAccessReady === true
      && browser.rosterPanelReady === true
      && browser.userARosterVisible === true
      && browser.userBRosterVisible === true,
    twoClientEstimateRoutesReady: browser?.estimateRouteAReady === true && browser.estimateRouteBReady === true,
    durableObjectChannelsSubscribed: browser?.cursorChannelA === "subscribed" && browser.cursorChannelB === "subscribed",
    cursorBroadcastSent: browser?.cursorSendStatusB === "ok",
    remoteCursorRendered: browser?.remoteCursorVisibleOnA === true
      && browser.remoteCursorUserIdOnA === fixture?.users[1].id
      && browser.remoteCursorLabelOnA?.includes(fixture?.users[1].displayName ?? "") === true,
    exactD1CleanupReady: cleanupCountsAreZero(input.cleanupAfter),
    hostedCollaborationUiReady: false,
    productionCutoverReady: false as const,
  };
  readiness.hostedCollaborationUiReady = Object.entries(readiness)
    .filter(([key]) => key !== "hostedCollaborationUiReady" && key !== "productionCutoverReady")
    .every(([, value]) => value === true)
    && !input.error;
  return readiness;
}

function blockersForReadiness(readiness: HostedCollaborationUiProofReport["readiness"], error: string | null) {
  const blockers: string[] = [];
  if (error) blockers.push(error);
  if (!readiness.syntheticBetterAuthSessionsReady) blockers.push("Synthetic Better Auth sessions were not generated.");
  if (!readiness.d1ProjectFixtureReady) blockers.push("Synthetic D1 collaboration project fixture was not ready.");
  if (!readiness.projectRouteReady) blockers.push("The hosted project route or project access header link did not load.");
  if (!readiness.publisherAccessRosterReady) blockers.push("The hosted Publisher access roster did not show both synthetic project members.");
  if (!readiness.twoClientEstimateRoutesReady) blockers.push("Both authenticated estimate-sheet browser sessions did not load.");
  if (!readiness.durableObjectChannelsSubscribed) blockers.push("Both estimate-sheet browser sessions did not subscribe to the Cloudflare collaboration room.");
  if (!readiness.cursorBroadcastSent) blockers.push("The second browser did not send a cursor broadcast successfully.");
  if (!readiness.remoteCursorRendered) blockers.push("The first browser did not render the second user's remote cursor.");
  if (!readiness.exactD1CleanupReady) blockers.push("Synthetic D1 rows did not return to zero after cleanup.");
  return blockers;
}

function buildReport(input: {
  generatedAt: string;
  baseUrl: string;
  fixture: SyntheticFixture | null;
  browserProof: BrowserProof | null;
  cleanupBefore: CleanupCounts | null;
  cleanupAfter: CleanupCounts | null;
  error: string | null;
}): HostedCollaborationUiProofReport {
  const readiness = buildReadiness({
    fixture: input.fixture,
    browserProof: input.browserProof,
    cleanupAfter: input.cleanupAfter,
    error: input.error,
  });
  const blockers = blockersForReadiness(readiness, input.error);
  return {
    generatedAt: input.generatedAt,
    mode: "cloudflare-hosted-collaboration-ui-proof",
    baseUrl: input.baseUrl,
    d1Database: D1_DATABASE,
    syntheticFixture: input.fixture
      ? {
        workspaceId: input.fixture.workspaceId,
        projectId: input.fixture.projectId,
        estimateId: input.fixture.estimateId,
        areaNodeId: input.fixture.areaNodeId,
        projectCode: input.fixture.projectCode,
        users: input.fixture.users.map((user) => ({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          projectRole: user.projectRole,
          sessionExpiresAt: user.sessionExpiresAt,
          signedCookiesProvided: true,
        })),
      }
      : null,
    readiness,
    proof: {
      cleanupBefore: input.cleanupBefore,
      cleanupAfter: input.cleanupAfter,
      browser: input.browserProof,
      routes: {
        projectPath: input.fixture ? `/workshop/projects/${input.fixture.projectId}` : null,
        publisherAccessPath: input.fixture ? `/workshop/publisher?project=${input.fixture.projectId}&drawer=${input.fixture.projectId}&tab=access` : null,
        estimateSheetPath: input.fixture ? `/workshop/projects/${input.fixture.projectId}/estimates/${input.fixture.areaNodeId}` : null,
      },
      browserDiagnostics: {
        consoleErrors: input.browserProof?.consoleErrors ?? [],
        pageErrors: input.browserProof?.pageErrors ?? [],
      },
    },
    blockers,
    passed: readiness.hostedCollaborationUiReady && blockers.length === 0,
    note: NOTE,
    error: input.error,
  };
}

function writeJson(file: string, value: unknown) {
  const outputPath = resolve(file);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(file: string, report: HostedCollaborationUiProofReport) {
  const outputPath = resolve(file);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rows = Object.entries(report.readiness)
    .map(([gate, ready]) => `| ${gate} | ${ready ? "yes" : "no"} |`)
    .join("\n");
  const blockers = report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- (none)"];
  writeFileSync(outputPath, `# Cloudflare Hosted Collaboration UI Proof

Status: **${report.passed ? "PASSED" : "OPEN / NOT FULLY PROVEN"}**

Generated: \`${report.generatedAt}\`

Base URL: \`${report.baseUrl}\`

D1 database: \`${report.d1Database}\`

${report.note}

## Summary

| Gate | Ready |
| --- | --- |
${rows}

## Sanitized Browser Proof

- Project route: \`${report.proof.routes.projectPath ?? "(none)"}\`
- Publisher access route: \`${report.proof.routes.publisherAccessPath ?? "(none)"}\`
- Estimate sheet route: \`${report.proof.routes.estimateSheetPath ?? "(none)"}\`
- Project route status: \`${report.proof.browser?.projectRouteStatus ?? "(none)"}\`
- Publisher access route status: \`${report.proof.browser?.publisherAccessRouteStatus ?? "(none)"}\`
- Estimate route statuses: \`${report.proof.browser?.estimateRouteAStatus ?? "(none)"} / ${report.proof.browser?.estimateRouteBStatus ?? "(none)"}\`
- Cursor channel statuses: \`${report.proof.browser?.cursorChannelA ?? "(none)"} / ${report.proof.browser?.cursorChannelB ?? "(none)"}\`
- Cursor send status: \`${report.proof.browser?.cursorSendStatusB ?? "(none)"}\`
- Remote cursor user matched: \`${report.proof.browser?.remoteCursorUserIdOnA === report.syntheticFixture?.users[1]?.id ? "yes" : "no"}\`
- Remote cursor label: \`${report.proof.browser?.remoteCursorLabelOnA ?? "(none)"}\`
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

  let fixture: SyntheticFixture | null = null;
  let cleanupBefore: CleanupCounts | null = null;
  let cleanupAfter: CleanupCounts | null = null;
  let browserProof: BrowserProof | null = null;
  let error: string | null = null;

  try {
    cleanupSyntheticRows("pre-clean hosted collaboration UI synthetic rows");
    cleanupBefore = countSyntheticRows();
    fixture = await makeFixture(generatedAt, secret);
    d1Execute(seedFixtureSql(fixture, generatedAt), "seed hosted collaboration UI proof fixture");
    browserProof = await driveBrowserProof({ baseUrl, fixture });
  } catch (caught) {
    error = redact(caught instanceof Error ? caught.message : String(caught));
  } finally {
    try {
      cleanupSyntheticRows("post-clean hosted collaboration UI synthetic rows");
      cleanupAfter = countSyntheticRows();
    } catch (caught) {
      error = [error, redact(caught instanceof Error ? caught.message : String(caught))].filter(Boolean).join(" | ");
    }
  }

  const report = buildReport({
    generatedAt,
    baseUrl,
    fixture,
    browserProof,
    cleanupBefore,
    cleanupAfter,
    error,
  });

  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
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
  runProof().catch((error) => {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
