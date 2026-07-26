import "server-only";

import { randomUUID } from "node:crypto";

import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1Value,
} from "@/lib/cloudflare/d1";

import {
  prepareStarterSeedActivationOutboxIntent,
} from "./activation-outbox";
import { issueStarterSeedActivationCapability } from "./activation-origin";
import { resolveCurrentOnboardingActor } from "./flow-actions";
import {
  createStarterRowMetadata,
  STARTER_EXAMPLES_GROUP_NAME,
  STARTER_PACK_MANIFEST,
  STARTER_PACK_VERSION,
  STARTER_REFERENCE_SOURCES,
  STARTER_USER_ASSET_KEYS,
  STARTER_WORKSPACE_ASSET_KEYS,
  type StarterComponentDefinition,
  type StarterProjectDefinition,
  type StarterTemplateDefinition,
} from "./starter-pack";

type StarterScopeKind = "workspace" | "user";
type StarterInstallMode = "install" | "resume" | "restore";
type StarterAssetKind =
  | "project"
  | "project_group"
  | "project_group_membership"
  | "component_folder"
  | "component"
  | "template";

type StarterStateRow = {
  status: "installing" | "complete" | "partial";
  revision: number;
  shared_membership_revision: number;
};

type StarterClaimRow = {
  asset_key: string;
  asset_kind: StarterAssetKind;
  starter_generation: number;
  resource_id: string;
  lifecycle_state: "active" | "archived" | "missing";
};

type InstallContext = {
  database: D1DatabaseLike;
  workspaceId: string;
  userId: string;
  mode: StarterInstallMode;
  mutationLeaseToken?: string;
};

export type StarterInstallResult = {
  workspaceStatus: StarterStateRow["status"];
  userStatus: StarterStateRow["status"] | "not_eligible";
  ready: boolean;
};

const starterActivationCapability = issueStarterSeedActivationCapability();
const STARTER_MUTATION_LEASE_MS = 10 * 60 * 1000;

class StarterMutationLeaseConflictError extends Error {}
const STARTER_WORKSPACE_ASSET_KEY_PLACEHOLDERS =
  STARTER_WORKSPACE_ASSET_KEYS.map(() => "?").join(", ");

function nowIso() {
  return new Date().toISOString();
}

function resolveStarterReferences(referenceIds: readonly (keyof typeof STARTER_REFERENCE_SOURCES)[]) {
  return referenceIds.map((referenceId) => ({
    id: referenceId,
    ...STARTER_REFERENCE_SOURCES[referenceId],
  }));
}

async function first<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

async function assertAndRenewStarterMutationLease(context: InstallContext) {
  if (!context.mutationLeaseToken) {
    throw new Error("Starter content mutation requires an active lease.");
  }
  const renewedAt = nowIso();
  const expiresAt = new Date(
    Date.parse(renewedAt) + STARTER_MUTATION_LEASE_MS,
  ).toISOString();
  const result = await context.database.prepare(`
    UPDATE beta_starter_mutation_leases
    SET expires_at = ?
    WHERE workspace_id = ? AND pack_version = ? AND lease_token = ?
  `).bind(
    expiresAt,
    context.workspaceId,
    STARTER_PACK_VERSION,
    context.mutationLeaseToken,
  ).run();
  if (result.success === false || (result.meta?.changes ?? 0) !== 1) {
    throw new StarterMutationLeaseConflictError(
      "Starter content lease changed before the mutation finished. Refresh and try again.",
    );
  }
}

async function run(
  context: InstallContext,
  sql: string,
  values: D1Value[] = [],
) {
  await assertAndRenewStarterMutationLease(context);
  const result = await context.database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Starter content could not be persisted.");
  return result;
}

async function runCheckedBatch(
  context: InstallContext,
  statements: D1PreparedStatementLike[],
) {
  await assertAndRenewStarterMutationLease(context);
  if (!context.database.batch) throw new Error("Starter content requires D1 batch support.");
  const results = await context.database.batch(statements);
  if (results.length !== statements.length || results.some((result) => result.success === false)) {
    throw new Error("A starter asset batch did not commit.");
  }
}

function prepareClaimInsert(
  context: InstallContext,
  input: {
    scopeKind: StarterScopeKind;
    scopeOwnerId: string;
    assetKey: string;
    assetKind: StarterAssetKind;
    generation: number;
    resourceId: string;
    timestamp: string;
  },
) {
  return context.database.prepare(`
    INSERT INTO beta_starter_asset_claims (
      workspace_id, pack_version, scope_kind, scope_owner_id, asset_key,
      asset_kind, starter_generation, resource_id, lifecycle_state,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(
    context.workspaceId,
    STARTER_PACK_VERSION,
    input.scopeKind,
    input.scopeOwnerId,
    input.assetKey,
    input.assetKind,
    input.generation,
    input.resourceId,
    input.timestamp,
    input.timestamp,
  );
}

async function readState(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
) {
  return first<StarterStateRow>(
    context.database,
    `
      SELECT status, revision, shared_membership_revision
      FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = ? AND scope_owner_id = ?
      LIMIT 1
    `,
    [context.workspaceId, STARTER_PACK_VERSION, scopeKind, scopeOwnerId],
  );
}

async function readClaims(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
) {
  return all<StarterClaimRow>(
    context.database,
    `
      SELECT asset_key, asset_kind, starter_generation, resource_id, lifecycle_state
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = ? AND scope_owner_id = ?
      ORDER BY asset_key ASC, starter_generation DESC
    `,
    [context.workspaceId, STARTER_PACK_VERSION, scopeKind, scopeOwnerId],
  );
}

function hasExactActiveClaims(claims: StarterClaimRow[], expectedKeys: readonly string[]) {
  const latestClaims = new Map<string, StarterClaimRow>();
  for (const claim of claims) {
    if (!latestClaims.has(claim.asset_key)) latestClaims.set(claim.asset_key, claim);
  }
  const activeKeys = new Set([...latestClaims.values()]
    .filter((claim) => claim.lifecycle_state === "active")
    .map((claim) => claim.asset_key));
  return expectedKeys.every((key) => activeKeys.has(key)) && activeKeys.size === expectedKeys.length;
}

async function ensureState(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
) {
  const existing = await readState(context, scopeKind, scopeOwnerId);
  if (existing) return existing;
  const claims = await readClaims(context, scopeKind, scopeOwnerId);
  const timestamp = nowIso();
  await run(
    context,
    `
      INSERT OR IGNORE INTO beta_starter_pack_states (
        workspace_id, pack_version, scope_kind, scope_owner_id, status,
        revision, shared_membership_revision, installed_at, last_restored_at,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, NULL, NULL, ?, ?)
    `,
    [
      context.workspaceId,
      STARTER_PACK_VERSION,
      scopeKind,
      scopeOwnerId,
      claims.length > 0 ? "partial" : "installing",
      scopeKind === "workspace" ? 1 : 0,
      timestamp,
      timestamp,
    ],
  );
  const created = await readState(context, scopeKind, scopeOwnerId);
  if (!created) throw new Error("Starter installation state was not created.");
  return created;
}

async function readPendingUserMembershipScopes(
  context: InstallContext,
  limit: number,
) {
  return all<{ user_id: string; role: string | null }>(
    context.database,
    `
      WITH workspace_state AS (
        SELECT shared_membership_revision
        FROM beta_starter_pack_states
        WHERE workspace_id = ? AND pack_version = ?
          AND scope_kind = 'workspace' AND scope_owner_id = workspace_id
        LIMIT 1
      ),
      eligible_pending AS (
        SELECT member.user_id, member.role
        FROM workspace_members member
        CROSS JOIN workspace_state
        LEFT JOIN beta_starter_pack_states user_state
          ON user_state.workspace_id = member.workspace_id
         AND user_state.pack_version = ?
         AND user_state.scope_kind = 'user'
         AND user_state.scope_owner_id = member.user_id
        WHERE member.workspace_id = ?
          AND member.role IN ('owner', 'admin', 'member')
          AND (
            user_state.scope_owner_id IS NULL
            OR user_state.status <> 'complete'
            OR user_state.shared_membership_revision
              < workspace_state.shared_membership_revision
            OR (
              SELECT COUNT(*)
              FROM beta_starter_asset_claims claim
              WHERE claim.workspace_id = member.workspace_id
                AND claim.pack_version = ?
                AND claim.scope_kind = 'user'
                AND claim.scope_owner_id = member.user_id
                AND claim.lifecycle_state = 'active'
            ) <> ?
            OR (
              SELECT COUNT(*)
              FROM beta_starter_asset_claims claim
              WHERE claim.workspace_id = member.workspace_id
                AND claim.pack_version = ?
                AND claim.scope_kind = 'user'
                AND claim.scope_owner_id = member.user_id
                AND claim.lifecycle_state = 'active'
                AND claim.asset_key IN (
                  'group.starter_examples',
                  'membership.starter_examples.tutorial',
                  'membership.starter_examples.reference'
                )
            ) <> ?
          )
      ),
      ineligible_pending AS (
        SELECT user_state.scope_owner_id AS user_id, member.role
        FROM beta_starter_pack_states user_state
        LEFT JOIN workspace_members member
          ON member.workspace_id = user_state.workspace_id
         AND member.user_id = user_state.scope_owner_id
        WHERE user_state.workspace_id = ? AND user_state.pack_version = ?
          AND user_state.scope_kind = 'user'
          AND (
            member.user_id IS NULL
            OR member.role NOT IN ('owner', 'admin', 'member')
          )
      )
      SELECT user_id, role
      FROM (
        SELECT user_id, role FROM eligible_pending
        UNION
        SELECT user_id, role FROM ineligible_pending
      )
      ORDER BY user_id ASC
      LIMIT ?
    `,
    [
      context.workspaceId,
      STARTER_PACK_VERSION,
      STARTER_PACK_VERSION,
      context.workspaceId,
      STARTER_PACK_VERSION,
      STARTER_USER_ASSET_KEYS.length,
      STARTER_PACK_VERSION,
      STARTER_USER_ASSET_KEYS.length,
      context.workspaceId,
      STARTER_PACK_VERSION,
      limit,
    ],
  );
}

async function hasPendingUserMembershipScopes(context: InstallContext) {
  return (await readPendingUserMembershipScopes(context, 1)).length > 0;
}

async function setScopeStatus(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
  status: StarterStateRow["status"],
) {
  const timestamp = nowIso();
  await run(
    context,
    `
      UPDATE beta_starter_pack_states
      SET status = ?,
          revision = revision + 1,
          installed_at = CASE WHEN ? = 'complete' THEN COALESCE(installed_at, ?) ELSE installed_at END,
          last_restored_at = CASE WHEN ? = 'complete' AND ? = 'restore' THEN ? ELSE last_restored_at END,
          updated_at = ?
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = ? AND scope_owner_id = ?
    `,
    [
      status,
      status,
      timestamp,
      status,
      context.mode,
      timestamp,
      timestamp,
      context.workspaceId,
      STARTER_PACK_VERSION,
      scopeKind,
      scopeOwnerId,
    ],
  );
}

async function finalizeWorkspaceScopeIfReady(context: InstallContext) {
  const observed = await readState(context, "workspace", context.workspaceId);
  if (!observed) return false;
  if (observed.status === "complete") {
    return !await hasPendingUserMembershipScopes(context);
  }
  const timestamp = nowIso();
  const result = await run(
    context,
    `
      UPDATE beta_starter_pack_states AS workspace_state
      SET status = 'complete',
          revision = revision + 1,
          installed_at = COALESCE(installed_at, ?),
          last_restored_at = CASE WHEN ? = 'restore' THEN ? ELSE last_restored_at END,
          updated_at = ?
      WHERE workspace_state.workspace_id = ?
        AND workspace_state.pack_version = ?
        AND workspace_state.scope_kind = 'workspace'
        AND workspace_state.scope_owner_id = workspace_state.workspace_id
        AND workspace_state.revision = ?
        AND workspace_state.shared_membership_revision = ?
        AND (
          SELECT COUNT(*)
          FROM beta_starter_asset_claims claim
          WHERE claim.workspace_id = workspace_state.workspace_id
            AND claim.pack_version = workspace_state.pack_version
            AND claim.scope_kind = 'workspace'
            AND claim.scope_owner_id = workspace_state.workspace_id
            AND claim.lifecycle_state = 'active'
        ) = ?
        AND (
          SELECT COUNT(*)
          FROM beta_starter_asset_claims claim
          WHERE claim.workspace_id = workspace_state.workspace_id
            AND claim.pack_version = workspace_state.pack_version
            AND claim.scope_kind = 'workspace'
            AND claim.scope_owner_id = workspace_state.workspace_id
            AND claim.lifecycle_state = 'active'
            AND claim.asset_key IN (${STARTER_WORKSPACE_ASSET_KEY_PLACEHOLDERS})
        ) = ?
        AND NOT EXISTS (
          SELECT 1
          FROM beta_starter_asset_claims claim
          WHERE claim.workspace_id = workspace_state.workspace_id
            AND claim.pack_version = workspace_state.pack_version
            AND claim.scope_kind = 'workspace'
            AND claim.scope_owner_id = workspace_state.workspace_id
            AND claim.lifecycle_state = 'active'
            AND (
              (
                claim.asset_kind = 'project'
                AND NOT EXISTS (
                  SELECT 1 FROM projects project
                  WHERE project.id = claim.resource_id
                    AND project.workspace_id = workspace_state.workspace_id
                    AND project.status <> 'archived'
                )
              )
              OR (
                claim.asset_kind = 'component_folder'
                AND NOT EXISTS (
                  SELECT 1 FROM library_folders folder
                  WHERE folder.id = claim.resource_id
                    AND folder.workspace_id = workspace_state.workspace_id
                )
              )
              OR (
                claim.asset_kind = 'component'
                AND NOT EXISTS (
                  SELECT 1 FROM cost_library_items component
                  WHERE component.id = claim.resource_id
                    AND component.workspace_id = workspace_state.workspace_id
                    AND component.lifecycle_state <> 'archived'
                )
              )
              OR (
                claim.asset_kind = 'template'
                AND NOT EXISTS (
                  SELECT 1 FROM estimate_templates template
                  WHERE template.id = claim.resource_id
                    AND template.workspace_id = workspace_state.workspace_id
                    AND template.archived_at IS NULL
                )
              )
              OR claim.asset_kind NOT IN (
                'project', 'component_folder', 'component', 'template'
              )
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM workspace_members member
          LEFT JOIN beta_starter_pack_states user_state
            ON user_state.workspace_id = member.workspace_id
           AND user_state.pack_version = workspace_state.pack_version
           AND user_state.scope_kind = 'user'
           AND user_state.scope_owner_id = member.user_id
          WHERE member.workspace_id = workspace_state.workspace_id
            AND member.role IN ('owner', 'admin', 'member')
            AND (
              user_state.scope_owner_id IS NULL
              OR user_state.status <> 'complete'
              OR user_state.shared_membership_revision
                < workspace_state.shared_membership_revision
              OR (
                SELECT COUNT(*)
                FROM beta_starter_asset_claims claim
                WHERE claim.workspace_id = member.workspace_id
                  AND claim.pack_version = workspace_state.pack_version
                  AND claim.scope_kind = 'user'
                  AND claim.scope_owner_id = member.user_id
                  AND claim.lifecycle_state = 'active'
              ) <> ?
              OR (
                SELECT COUNT(*)
                FROM beta_starter_asset_claims claim
                WHERE claim.workspace_id = member.workspace_id
                  AND claim.pack_version = workspace_state.pack_version
                  AND claim.scope_kind = 'user'
                  AND claim.scope_owner_id = member.user_id
                  AND claim.lifecycle_state = 'active'
                  AND claim.asset_key IN (
                    'group.starter_examples',
                    'membership.starter_examples.tutorial',
                    'membership.starter_examples.reference'
                  )
              ) <> ?
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM beta_starter_pack_states user_state
          LEFT JOIN workspace_members member
            ON member.workspace_id = user_state.workspace_id
           AND member.user_id = user_state.scope_owner_id
          WHERE user_state.workspace_id = workspace_state.workspace_id
            AND user_state.pack_version = workspace_state.pack_version
            AND user_state.scope_kind = 'user'
            AND (
              member.user_id IS NULL
              OR member.role NOT IN ('owner', 'admin', 'member')
            )
        )
    `,
    [
      timestamp,
      context.mode,
      timestamp,
      timestamp,
      context.workspaceId,
      STARTER_PACK_VERSION,
      observed.revision,
      observed.shared_membership_revision,
      STARTER_WORKSPACE_ASSET_KEYS.length,
      ...STARTER_WORKSPACE_ASSET_KEYS,
      STARTER_WORKSPACE_ASSET_KEYS.length,
      STARTER_USER_ASSET_KEYS.length,
      STARTER_USER_ASSET_KEYS.length,
    ],
  );
  return (result.meta?.changes ?? 0) === 1;
}

async function classifyClaimResource(
  context: InstallContext,
  claim: StarterClaimRow,
): Promise<StarterClaimRow["lifecycle_state"]> {
  if (claim.asset_kind === "project") {
    const row = await first<{ status: string }>(
      context.database,
      "SELECT status FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1",
      [claim.resource_id, context.workspaceId],
    );
    return !row ? "missing" : row.status === "archived" ? "archived" : "active";
  }
  if (claim.asset_kind === "component") {
    const row = await first<{ lifecycle_state: string }>(
      context.database,
      "SELECT lifecycle_state FROM cost_library_items WHERE id = ? AND workspace_id = ? LIMIT 1",
      [claim.resource_id, context.workspaceId],
    );
    return !row ? "missing" : row.lifecycle_state === "archived" ? "archived" : "active";
  }
  if (claim.asset_kind === "template") {
    const row = await first<{ archived_at: string | null }>(
      context.database,
      "SELECT archived_at FROM estimate_templates WHERE id = ? AND workspace_id = ? LIMIT 1",
      [claim.resource_id, context.workspaceId],
    );
    return !row ? "missing" : row.archived_at ? "archived" : "active";
  }
  if (claim.asset_kind === "project_group_membership") {
    const projectKey = claim.asset_key === "membership.starter_examples.tutorial"
      ? "project.tutorial"
      : claim.asset_key === "membership.starter_examples.reference"
        ? "project.reference"
        : null;
    const [membership, groupClaim, projectClaim] = await Promise.all([
      first<{ group_id: string; project_id: string; project_status: string | null }>(
        context.database,
        `
          SELECT membership.group_id, membership.project_id,
                 project.status AS project_status
          FROM project_group_memberships membership
          LEFT JOIN projects project ON project.id = membership.project_id
          WHERE membership.id = ? AND membership.workspace_id = ?
            AND membership.user_id = ?
          LIMIT 1
        `,
        [claim.resource_id, context.workspaceId, context.userId],
      ),
      readActiveClaim(context, "user", context.userId, "group.starter_examples"),
      projectKey
        ? readActiveClaim(context, "workspace", context.workspaceId, projectKey)
        : Promise.resolve(null),
    ]);
    if (membership
      && groupClaim
      && projectClaim
      && membership.group_id === groupClaim.resource_id
      && membership.project_id === projectClaim.resource_id) {
      return "active";
    }
    return membership?.project_status === "archived" ? "archived" : "missing";
  }
  if (claim.asset_kind === "component_folder") {
    const row = await first<{ present: number }>(
      context.database,
      `
        SELECT 1 AS present
        FROM library_folders
        WHERE id = ? AND workspace_id = ?
        LIMIT 1
      `,
      [claim.resource_id, context.workspaceId],
    );
    return row ? "active" : "missing";
  }
  if (claim.asset_kind === "project_group") {
    const row = await first<{ present: number }>(
      context.database,
      `
        SELECT 1 AS present
        FROM project_groups
        WHERE id = ? AND workspace_id = ? AND user_id = ?
        LIMIT 1
      `,
      [claim.resource_id, context.workspaceId, context.userId],
    );
    return row ? "active" : "missing";
  }
  return "missing";
}

async function reconcileClaimLifecycle(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
) {
  const claims = await readClaims(context, scopeKind, scopeOwnerId);
  for (const claim of claims.filter((candidate) => candidate.lifecycle_state === "active")) {
    const lifecycleState = await classifyClaimResource(context, claim);
    if (lifecycleState === "active") continue;
    await run(
      context,
      `
        UPDATE beta_starter_asset_claims
        SET lifecycle_state = ?, updated_at = ?
        WHERE workspace_id = ? AND pack_version = ?
          AND scope_kind = ? AND scope_owner_id = ?
          AND asset_key = ? AND starter_generation = ?
          AND lifecycle_state = 'active'
      `,
      [
        lifecycleState,
        nowIso(),
        context.workspaceId,
        STARTER_PACK_VERSION,
        scopeKind,
        scopeOwnerId,
        claim.asset_key,
        claim.starter_generation,
      ],
    );
    if (claim.asset_kind === "project_group_membership") {
      await run(
        context,
        `
          DELETE FROM project_group_memberships
          WHERE id = ? AND workspace_id = ? AND user_id = ?
        `,
        [claim.resource_id, context.workspaceId, scopeOwnerId],
      );
    }
  }
}

async function resolveAssetGeneration(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
  assetKey: string,
) {
  const claims = (await readClaims(context, scopeKind, scopeOwnerId))
    .filter((claim) => claim.asset_key === assetKey);
  const latest = claims[0] ?? null;
  if (latest?.lifecycle_state === "active") {
    return { status: "active" as const, claim: latest };
  }
  if (latest && context.mode !== "restore") {
    return { status: "restore_required" as const, claim: latest };
  }
  if (latest) {
    await run(
      context,
      `
        UPDATE beta_starter_asset_claims
        SET lifecycle_state = 'archived', updated_at = ?
        WHERE workspace_id = ? AND pack_version = ?
          AND scope_kind = ? AND scope_owner_id = ?
          AND asset_key = ? AND starter_generation < ?
          AND lifecycle_state = 'active'
      `,
      [
        nowIso(),
        context.workspaceId,
        STARTER_PACK_VERSION,
        scopeKind,
        scopeOwnerId,
        assetKey,
        latest.starter_generation,
      ],
    );
  }
  return {
    status: "create" as const,
    generation: (latest?.starter_generation ?? 0) + 1,
  };
}

async function readActiveClaim(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
  assetKey: string,
) {
  return first<StarterClaimRow>(
    context.database,
    `
      SELECT asset_key, asset_kind, starter_generation, resource_id, lifecycle_state
      FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = ? AND scope_owner_id = ?
        AND asset_key = ? AND lifecycle_state = 'active'
      ORDER BY starter_generation DESC
      LIMIT 1
    `,
    [context.workspaceId, STARTER_PACK_VERSION, scopeKind, scopeOwnerId, assetKey],
  );
}

async function assertAssetCommitted(
  context: InstallContext,
  scopeKind: StarterScopeKind,
  scopeOwnerId: string,
  assetKey: string,
) {
  const claim = await readActiveClaim(context, scopeKind, scopeOwnerId, assetKey);
  if (!claim || await classifyClaimResource(context, claim) !== "active") {
    throw new Error(`Starter asset ${assetKey} did not commit completely.`);
  }
  return claim;
}

async function resolveUniqueName(
  context: InstallContext,
  input: {
    table: "projects" | "library_folders" | "cost_library_items" | "estimate_templates" | "project_groups";
    canonicalName: string;
    userId?: string;
  },
) {
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const name = suffix === 0
      ? input.canonicalName
      : suffix === 1
        ? `${input.canonicalName} · Starter`
        : `${input.canonicalName} · Starter ${suffix}`;
    const values: D1Value[] = [context.workspaceId, name];
    const userClause = input.table === "project_groups" ? " AND user_id = ?" : "";
    if (userClause) values.push(input.userId ?? context.userId);
    const existing = await first<{ id: string }>(
      context.database,
      `SELECT id FROM ${input.table} WHERE workspace_id = ? AND lower(name) = lower(?)${userClause} LIMIT 1`,
      values,
    );
    if (!existing) return name;
  }
  throw new Error(`A unique starter name could not be resolved for ${input.canonicalName}.`);
}

function prepareProjectGraphStatements(
  context: InstallContext,
  project: StarterProjectDefinition,
  projectId: string,
  projectName: string,
  timestamp: string,
) {
  const statements: D1PreparedStatementLike[] = [
    context.database.prepare(`
      INSERT INTO projects (
        id, workspace_id, name, project_code, created_by, client_name, location,
        currency_code, metadata, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ongoing', ?, ?)
    `).bind(
      projectId,
      context.workspaceId,
      projectName,
      project.projectCode,
      context.userId,
      project.clientName,
      project.location,
      project.currencyCode,
      JSON.stringify({
        fictional: true,
        floorAreaSqm: project.floorAreaSqm,
        pricingAsOf: project.pricingAsOf,
        pricingBasis: "DEMO_ILLUSTRATIVE",
        projectType: project.projectType,
        referenceSources: resolveStarterReferences(project.referenceIds),
        region: project.region,
        sourceDisclaimer: project.sourceDisclaimer,
        starterLabel: project.label,
        taxTreatment: {
          basis: project.taxBasis,
          vatIncluded: false,
          vatRate: project.vatRate,
        },
      }),
      timestamp,
      timestamp,
    ),
    prepareStarterSeedActivationOutboxIntent(context.database, starterActivationCapability, {
      domainMutationId: projectId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      projectId,
      milestone: "project_created",
      source: "project",
      occurredAt: timestamp,
      dedupeKey: `${context.workspaceId}:${projectId}:project_created`,
    }, timestamp),
    prepareStarterSeedActivationOutboxIntent(context.database, starterActivationCapability, {
      domainMutationId: projectId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      milestone: "workspace_ready",
      source: "project",
      occurredAt: timestamp,
      dedupeKey: `${context.workspaceId}:${projectId}:workspace_ready`,
    }, timestamp),
  ];

  project.estimates.forEach((estimate, estimateIndex) => {
    const estimateId = randomUUID();
    const tabId = randomUUID();
    statements.push(
      context.database.prepare(`
        INSERT INTO estimates (
          id, project_id, name, created_by, created_at, updated_at,
          sheet_code, notes, currency_code, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `).bind(
        estimateId,
        projectId,
        estimate.name,
        context.userId,
        timestamp,
        timestamp,
        estimate.sheetCode,
        project.currencyCode,
        JSON.stringify({
          fictional: true,
          pricingAsOf: project.pricingAsOf,
          pricingBasis: "DEMO_ILLUSTRATIVE",
          referenceSources: resolveStarterReferences(project.referenceIds),
          region: project.region,
          taxTreatment: {
            basis: project.taxBasis,
            vatIncluded: false,
            vatRate: project.vatRate,
          },
        }),
      ),
      context.database.prepare(`
        INSERT INTO estimate_tabs (
          id, estimate_id, name, sort_order, is_default, archived_at,
          created_at, updated_at, metadata, created_by
        )
        VALUES (?, ?, ?, ?, 1, NULL, ?, ?, '{}', ?)
      `).bind(
        tabId,
        estimateId,
        estimate.tabName,
        estimateIndex,
        timestamp,
        timestamp,
        context.userId,
      ),
    );
    const nodeIds = new Map(estimate.nodes.map((node) => [node.key, randomUUID()]));
    estimate.nodes.forEach((node, nodeIndex) => {
      const nodeId = nodeIds.get(node.key);
      if (!nodeId) throw new Error("Starter estimate node identity is unavailable.");
      statements.push(context.database.prepare(`
        INSERT INTO estimate_nodes (
          id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order,
          created_at, updated_at, metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
      `).bind(
        nodeId,
        estimateId,
        tabId,
        node.name,
        node.kind,
        node.parentKey ? nodeIds.get(node.parentKey) ?? null : null,
        nodeIndex,
        timestamp,
        timestamp,
      ));
      node.rows.forEach((row, rowIndex) => {
        const rowId = randomUUID();
        const rowMetadata = createStarterRowMetadata(row, {
          createdAt: timestamp,
          estimateId,
          nodeId,
          origin: "starter_pack",
          projectId,
          rowId,
        });
        statements.push(context.database.prepare(`
          INSERT INTO estimate_row_items (
            id, estimate_id, node_id, description, designation, discipline,
            material, quantity, quantity_base, quantity_contingency_amount,
            unit, unit_cost, misc_cost, contingency_percentage,
            adjustment_percentage, source_snapshot_json, sort_order,
            created_at, updated_at, row_revision, source_library_item_id,
            link_state, metadata_json, supplier, pricing_provenance_origin
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 0, 0, ?, ?,
            ?, ?, 1, NULL, 'unlinked', ?, '', 'recorded'
          )
        `).bind(
          rowId,
          estimateId,
          nodeId,
          row.description,
          row.designation,
          row.discipline,
          row.material,
          row.quantity,
          row.unit,
          row.unitCost,
          row.miscCost ?? 0,
          JSON.stringify({
            fictional: true,
            pricingAsOf: project.pricingAsOf,
            pricingBasis: "DEMO_ILLUSTRATIVE",
            referenceSources: resolveStarterReferences(project.referenceIds),
            region: project.region,
            requiresQuote: true,
            taxTreatment: {
              basis: project.taxBasis,
              vatIncluded: false,
              vatRate: project.vatRate,
            },
          }),
          rowIndex,
          timestamp,
          timestamp,
          JSON.stringify(rowMetadata),
        ));
      });
    });
    if (estimate.nodes.some((node) => node.kind === "area")) {
      statements.push(prepareStarterSeedActivationOutboxIntent(context.database, starterActivationCapability, {
        domainMutationId: estimateId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        projectId,
        estimateId,
        milestone: "first_area_created",
        source: "estimate",
        occurredAt: timestamp,
        dedupeKey: `${context.workspaceId}:${estimateId}:first_area_created`,
      }, timestamp));
    }
    if (estimate.nodes.some((node) => node.rows.some((row) => row.unitCost > 0))) {
      statements.push(
        prepareStarterSeedActivationOutboxIntent(context.database, starterActivationCapability, {
          domainMutationId: estimateId,
          userId: context.userId,
          workspaceId: context.workspaceId,
          projectId,
          estimateId,
          milestone: "first_row_priced",
          source: "estimate",
          occurredAt: timestamp,
          dedupeKey: `${context.workspaceId}:${estimateId}:first_row_priced`,
        }, timestamp),
        prepareStarterSeedActivationOutboxIntent(context.database, starterActivationCapability, {
          domainMutationId: estimateId,
          userId: context.userId,
          workspaceId: context.workspaceId,
          projectId,
          estimateId,
          milestone: "first_valid_total",
          source: "estimate",
          occurredAt: timestamp,
          dedupeKey: `${context.workspaceId}:${estimateId}:first_valid_total`,
        }, timestamp),
      );
    }
  });
  return statements;
}

async function installProject(context: InstallContext, project: StarterProjectDefinition) {
  const generation = await resolveAssetGeneration(
    context,
    "workspace",
    context.workspaceId,
    project.key,
  );
  if (generation.status !== "create") return;
  const projectId = randomUUID();
  const timestamp = nowIso();
  const projectName = await resolveUniqueName(context, {
    table: "projects",
    canonicalName: project.name,
  });
  const statements = prepareProjectGraphStatements(context, project, projectId, projectName, timestamp);
  statements.push(prepareClaimInsert(context, {
    scopeKind: "workspace",
    scopeOwnerId: context.workspaceId,
    assetKey: project.key,
    assetKind: "project",
    generation: generation.generation,
    resourceId: projectId,
    timestamp,
  }));
  await runCheckedBatch(context, statements);
  await assertAssetCommitted(context, "workspace", context.workspaceId, project.key);
}

async function installFolder(
  context: InstallContext,
  folder: (typeof STARTER_PACK_MANIFEST.folders)[number],
) {
  const generation = await resolveAssetGeneration(
    context,
    "workspace",
    context.workspaceId,
    folder.key,
  );
  if (generation.status !== "create") return;
  const folderId = randomUUID();
  const timestamp = nowIso();
  const name = await resolveUniqueName(context, {
    table: "library_folders",
    canonicalName: folder.name,
  });
  await runCheckedBatch(context, [
    context.database.prepare(`
      INSERT INTO library_folders (
        id, workspace_id, parent_id, name, sort_order, source_category_node_id,
        folder_kind, created_by, created_at, updated_at, is_default_category
      )
      VALUES (?, ?, NULL, ?, ?, NULL, 'custom', ?, ?, ?, 0)
    `).bind(
      folderId,
      context.workspaceId,
      name,
      folder.sortOrder,
      context.userId,
      timestamp,
      timestamp,
    ),
    prepareClaimInsert(context, {
      scopeKind: "workspace",
      scopeOwnerId: context.workspaceId,
      assetKey: folder.key,
      assetKind: "component_folder",
      generation: generation.generation,
      resourceId: folderId,
      timestamp,
    }),
  ]);
  await assertAssetCommitted(context, "workspace", context.workspaceId, folder.key);
}

async function ensureProtectedDefaultFolder(context: InstallContext) {
  const existing = await first<{ id: string }>(
    context.database,
    `
      SELECT id FROM library_folders
      WHERE workspace_id = ? AND is_default_category = 1
      ORDER BY id ASC LIMIT 1
    `,
    [context.workspaceId],
  );
  if (existing) return existing.id;
  const folderId = randomUUID();
  const timestamp = nowIso();
  await run(
    context,
    `
      INSERT OR IGNORE INTO library_folders (
        id, workspace_id, parent_id, name, sort_order, folder_kind,
        created_by, created_at, updated_at, is_default_category
      )
      VALUES (?, ?, NULL, 'Uncategorized', 0, 'custom', NULL, ?, ?, 1)
    `,
    [folderId, context.workspaceId, timestamp, timestamp],
  );
  const created = await first<{ id: string }>(
    context.database,
    "SELECT id FROM library_folders WHERE workspace_id = ? AND is_default_category = 1 LIMIT 1",
    [context.workspaceId],
  );
  if (!created) throw new Error("The protected Uncategorized folder is unavailable.");
  return created.id;
}

async function resolveComponentFolderId(
  context: InstallContext,
  component: StarterComponentDefinition,
) {
  if (component.folderKey === "protected.uncategorized") {
    return ensureProtectedDefaultFolder(context);
  }
  const claim = await readActiveClaim(
    context,
    "workspace",
    context.workspaceId,
    component.folderKey,
  );
  if (!claim) throw new Error(`Starter folder ${component.folderKey} is unavailable.`);
  return claim.resource_id;
}

async function installComponent(
  context: InstallContext,
  component: StarterComponentDefinition,
) {
  const generation = await resolveAssetGeneration(
    context,
    "workspace",
    context.workspaceId,
    component.key,
  );
  if (generation.status !== "create") return;
  const folderId = await resolveComponentFolderId(context, component);
  const folder = await first<{ name: string }>(
    context.database,
    "SELECT name FROM library_folders WHERE id = ? AND workspace_id = ? LIMIT 1",
    [folderId, context.workspaceId],
  );
  if (!folder) throw new Error("A starter Component folder is unavailable.");
  const itemId = randomUUID();
  const optionIds = component.variants.map(() => randomUUID());
  const defaultIndex = component.variants.findIndex((variant) => variant.isDefault);
  if (defaultIndex < 0) throw new Error("A starter Component requires one default variant.");
  const timestamp = nowIso();
  const name = await resolveUniqueName(context, {
    table: "cost_library_items",
    canonicalName: component.name,
  });
  const statements: D1PreparedStatementLike[] = [
    context.database.prepare(`
      INSERT INTO cost_library_items (
        id, workspace_id, name, description, category, category_node_id,
        library_folder_id, supplier, supplier_id, brand, brand_id, unit,
        unit_cost, misc_cost, lifecycle_state, current_version_number,
        active_price_option_id, pricing_source, pricing_date, thumbnail_path,
        metadata_json, created_by, created_at, updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, NULL, ?, 'Fictional demo supplier', NULL, ?, NULL, ?, ?, 0,
        'available', 1, ?, 'DEMO_ILLUSTRATIVE', ?, NULL, ?, ?, ?, ?
      )
    `).bind(
      itemId,
      context.workspaceId,
      name,
      component.description,
      folder.name,
      folderId,
      component.brand,
      component.variants[defaultIndex].unit,
      component.variants[defaultIndex].unitCost,
      optionIds[defaultIndex],
      component.pricingAsOf,
      JSON.stringify({
        expiresOn: component.expiresOn,
        fictional: true,
        pricingBasis: "DEMO_ILLUSTRATIVE",
        referenceSources: resolveStarterReferences(component.referenceIds),
        region: component.region,
        requiresQuote: true,
        taxTreatment: {
          basis: component.taxBasis,
          vatIncluded: false,
          vatRate: component.vatRate,
        },
      }),
      context.userId,
      timestamp,
      timestamp,
    ),
  ];
  component.variants.forEach((variant, index) => {
    statements.push(
      context.database.prepare(`
        INSERT INTO cost_library_item_price_options (
          id, workspace_id, item_id, label, unit, unit_cost, misc_cost,
          currency, is_active, is_default, updated_at, supplier_id,
          pricing_source, metadata_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 'PHP', 1, ?, ?, NULL, 'DEMO_ILLUSTRATIVE', ?, ?)
      `).bind(
        optionIds[index],
        context.workspaceId,
        itemId,
        variant.label,
        variant.unit,
        variant.unitCost,
        variant.isDefault ? 1 : 0,
        timestamp,
        JSON.stringify({
          expiresOn: component.expiresOn,
          fictional: true,
          pricingAsOf: component.pricingAsOf,
          referenceSources: resolveStarterReferences(component.referenceIds),
          region: component.region,
          requiresQuote: true,
          taxTreatment: {
            basis: component.taxBasis,
            vatIncluded: false,
            vatRate: component.vatRate,
          },
        }),
        timestamp,
      ),
      context.database.prepare(`
        INSERT INTO cost_library_item_variant_cost_entries (
          id, workspace_id, item_id, price_option_id, unit_cost, misc_cost,
          currency, pricing_source, pricing_date, source_url, notes,
          is_current, deleted_at, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 0, 'PHP', 'DEMO_ILLUSTRATIVE', ?, ?, ?, 1, NULL, ?, ?, ?)
      `).bind(
        randomUUID(),
        context.workspaceId,
        itemId,
        optionIds[index],
        variant.unitCost,
        component.pricingAsOf,
        STARTER_REFERENCE_SOURCES[component.referenceIds[0]].url,
        `Illustrative ${component.region} teaching rate; obtain a current quotation.`,
        JSON.stringify({
          expiresOn: component.expiresOn,
          fictional: true,
          referenceSources: resolveStarterReferences(component.referenceIds),
          requiresQuote: true,
          taxTreatment: {
            basis: component.taxBasis,
            vatIncluded: false,
            vatRate: component.vatRate,
          },
        }),
        timestamp,
        timestamp,
      ),
    );
  });
  statements.push(
    context.database.prepare(`
      INSERT INTO cost_library_item_versions (
        id, item_id, workspace_id, version_number, snapshot_json,
        change_summary, change_reason, effective_at, created_by, created_at
      )
      VALUES (?, ?, ?, 1, ?, 'Component created', 'Starter content', ?, ?, ?)
    `).bind(
      randomUUID(),
      itemId,
      context.workspaceId,
      JSON.stringify({
        name,
        description: component.description,
        unit: component.unit,
        priceOptions: component.variants.map((variant, index) => ({
          id: optionIds[index],
          label: variant.label,
          unit: variant.unit,
          unitCost: variant.unitCost,
          isDefault: variant.isDefault,
        })),
      }),
      timestamp,
      context.userId,
      timestamp,
    ),
    prepareClaimInsert(context, {
      scopeKind: "workspace",
      scopeOwnerId: context.workspaceId,
      assetKey: component.key,
      assetKind: "component",
      generation: generation.generation,
      resourceId: itemId,
      timestamp,
    }),
  );
  await runCheckedBatch(context, statements);
  await assertAssetCommitted(context, "workspace", context.workspaceId, component.key);
}

async function installTemplate(
  context: InstallContext,
  template: StarterTemplateDefinition,
  sortOrder: number,
) {
  const generation = await resolveAssetGeneration(
    context,
    "workspace",
    context.workspaceId,
    template.key,
  );
  if (generation.status !== "create") return;
  const templateRows: Array<{
    claim: StarterClaimRow;
    component: {
      name: string;
      description: string;
      unit: string;
      unit_cost: number;
      active_price_option_id: string | null;
    };
    rowId: string;
  }> = [];
  for (const componentKey of template.sourceComponentKeys) {
    const claim = await readActiveClaim(
      context,
      "workspace",
      context.workspaceId,
      componentKey,
    );
    if (!claim) throw new Error(`Starter Component ${componentKey} is unavailable.`);
    const component = await first<{
    name: string;
    description: string;
    unit: string;
    unit_cost: number;
    active_price_option_id: string | null;
    }>(
      context.database,
      `
        SELECT name, description, unit, unit_cost, active_price_option_id
        FROM cost_library_items
        WHERE id = ? AND workspace_id = ? AND lifecycle_state <> 'archived'
        LIMIT 1
      `,
      [claim.resource_id, context.workspaceId],
    );
    if (!component) throw new Error("A starter Template dependency is unavailable.");
    templateRows.push({ claim, component, rowId: randomUUID() });
  }
  const templateId = randomUUID();
  const groupId = randomUUID();
  const areaId = randomUUID();
  const timestamp = nowIso();
  const name = await resolveUniqueName(context, {
    table: "estimate_templates",
    canonicalName: template.name,
  });
  const snapshot = JSON.stringify({
    schemaVersion: 1,
    template: {
      id: templateId,
      name,
      description: template.description,
      category: template.category,
      metadata: {
        fictional: true,
        pricingBasis: "DEMO_ILLUSTRATIVE",
        referenceSources: resolveStarterReferences(["psa_cmrpi", "bir_vat"]),
        taxTreatment: { basis: "EX_VAT", vatIncluded: false, vatRate: 0.12 },
      },
    },
    nodes: [
      { id: groupId, parentId: null, kind: "group", name: template.groupName, sortOrder: 0, metadata: {} },
      { id: areaId, parentId: groupId, kind: "area", name: template.areaName, sortOrder: 1, metadata: {} },
    ],
    rows: templateRows.map(({ claim, component, rowId }) => ({
      id: rowId,
      templateNodeId: areaId,
      material: component.name,
      description: component.description,
      unit: component.unit,
      quantity: 1,
      unitCost: component.unit_cost,
      sourceLibraryItemId: claim.resource_id,
    })),
  });
  await runCheckedBatch(context, [
    context.database.prepare(`
      INSERT INTO estimate_templates (
        id, workspace_id, name, description, category, sort_order, metadata,
        created_by, created_at, updated_at, current_version_number,
        archived_at, archived_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL)
    `).bind(
      templateId,
      context.workspaceId,
      name,
      template.description,
      template.category,
      sortOrder,
      JSON.stringify({
        fictional: true,
        pricingBasis: "DEMO_ILLUSTRATIVE",
        referenceSources: resolveStarterReferences(["psa_cmrpi", "bir_vat"]),
        sourceComponentKeys: template.sourceComponentKeys,
        taxTreatment: { basis: "EX_VAT", vatIncluded: false, vatRate: 0.12 },
      }),
      context.userId,
      timestamp,
      timestamp,
    ),
    context.database.prepare(`
      INSERT INTO estimate_template_nodes (
        id, template_id, parent_id, kind, name, sort_order, metadata,
        created_at, updated_at
      )
      VALUES (?, ?, NULL, 'group', ?, 0, '{}', ?, ?)
    `).bind(groupId, templateId, template.groupName, timestamp, timestamp),
    context.database.prepare(`
      INSERT INTO estimate_template_nodes (
        id, template_id, parent_id, kind, name, sort_order, metadata,
        created_at, updated_at
      )
      VALUES (?, ?, ?, 'area', ?, 1, '{}', ?, ?)
    `).bind(areaId, templateId, groupId, template.areaName, timestamp, timestamp),
    ...templateRows.map(({ claim, component, rowId }, rowIndex) =>
      context.database.prepare(`
        INSERT INTO estimate_template_row_items (
          id, template_id, template_node_id, sort_order, source_library_item_id,
          source_snapshot, pricing_provenance_origin, category_node_id, supplier_id,
          material, description, supplier, unit, quantity, unit_cost, misc_cost,
          contingency_percentage, adjustment_percentage, discipline, designation,
          link_state, metadata, created_at, updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, 'recorded', NULL, NULL, ?, ?, '', ?, 1, ?, 0,
          0, 0, '', '', 'linked-clean', '{}', ?, ?
        )
      `).bind(
        rowId,
        templateId,
        areaId,
        rowIndex,
        claim.resource_id,
        JSON.stringify({
          material: component.name,
          description: component.description,
          sourceLibraryItemId: claim.resource_id,
          priceOptionId: component.active_price_option_id,
          pricingBasis: "DEMO_ILLUSTRATIVE",
          referenceSources: resolveStarterReferences(["psa_cmrpi", "bir_vat"]),
          taxTreatment: { basis: "EX_VAT", vatIncluded: false, vatRate: 0.12 },
          unit: component.unit,
          unitCost: component.unit_cost,
        }),
        component.name,
        component.description,
        component.unit,
        component.unit_cost,
        timestamp,
        timestamp,
      )
    ),
    context.database.prepare(`
      INSERT INTO estimate_template_versions (
        template_id, version_number, workspace_id, snapshot_json,
        source_fingerprint, change_kind, change_summary_json,
        created_by, created_at
      )
      VALUES (?, 1, ?, ?, ?, 'starter_create', '{}', ?, ?)
    `).bind(
      templateId,
      context.workspaceId,
      snapshot,
      `starter:${templateId}`,
      context.userId,
      timestamp,
    ),
    prepareClaimInsert(context, {
      scopeKind: "workspace",
      scopeOwnerId: context.workspaceId,
      assetKey: template.key,
      assetKind: "template",
      generation: generation.generation,
      resourceId: templateId,
      timestamp,
    }),
  ]);
  await assertAssetCommitted(context, "workspace", context.workspaceId, template.key);
}

async function installSharedScope(context: InstallContext) {
  await ensureState(context, "workspace", context.workspaceId);
  await reconcileClaimLifecycle(context, "workspace", context.workspaceId);
  const beforeClaims = await readClaims(context, "workspace", context.workspaceId);
  const state = await readState(context, "workspace", context.workspaceId);
  if (
    state?.status === "complete"
    && hasExactActiveClaims(beforeClaims, STARTER_WORKSPACE_ASSET_KEYS)
    && !await hasPendingUserMembershipScopes(context)
  ) {
    return true;
  }
  if (beforeClaims.some((claim) => claim.lifecycle_state !== "active") && context.mode !== "restore") {
    await setScopeStatus(context, "workspace", context.workspaceId, "partial");
  }
  for (const project of STARTER_PACK_MANIFEST.projects) await installProject(context, project);
  for (const folder of STARTER_PACK_MANIFEST.folders) await installFolder(context, folder);
  await ensureProtectedDefaultFolder(context);
  for (const component of STARTER_PACK_MANIFEST.components) await installComponent(context, component);
  for (const [index, template] of STARTER_PACK_MANIFEST.templates.entries()) {
    await installTemplate(context, template, index);
  }
  const claims = await readClaims(context, "workspace", context.workspaceId);
  const complete = hasExactActiveClaims(claims, STARTER_WORKSPACE_ASSET_KEYS);
  if (!complete || !await finalizeWorkspaceScopeIfReady(context)) {
    await setScopeStatus(context, "workspace", context.workspaceId, "partial");
  }
  return complete;
}

async function canGroupProjects(context: InstallContext) {
  const membership = await first<{ role: string }>(
    context.database,
    `
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ? LIMIT 1
    `,
    [context.workspaceId, context.userId],
  );
  return membership?.role === "owner" || membership?.role === "admin" || membership?.role === "member";
}

async function installUserScope(context: InstallContext) {
  if (!await canGroupProjects(context)) return false;
  await ensureState(context, "user", context.userId);
  await reconcileClaimLifecycle(context, "user", context.userId);
  const [existingUserState, workspaceState, existingClaims] = await Promise.all([
    readState(context, "user", context.userId),
    readState(context, "workspace", context.workspaceId),
    readClaims(context, "user", context.userId),
  ]);
  if (
    existingUserState?.status === "complete"
    && existingUserState.shared_membership_revision === workspaceState?.shared_membership_revision
    && hasExactActiveClaims(existingClaims, STARTER_USER_ASSET_KEYS)
  ) {
    return true;
  }
  const groupResolution = await resolveAssetGeneration(
    context,
    "user",
    context.userId,
    "group.starter_examples",
  );
  let groupId = groupResolution.status === "active" ? groupResolution.claim.resource_id : null;
  if (groupResolution.status === "create") {
    groupId = randomUUID();
    const timestamp = nowIso();
    const name = await resolveUniqueName(context, {
      table: "project_groups",
      canonicalName: STARTER_EXAMPLES_GROUP_NAME,
      userId: context.userId,
    });
    const position = await first<{ position: number | null }>(
      context.database,
      `
        SELECT MAX(position) AS position FROM project_groups
        WHERE workspace_id = ? AND user_id = ?
      `,
      [context.workspaceId, context.userId],
    );
    await runCheckedBatch(context, [
      context.database.prepare(`
        INSERT INTO project_groups (
          id, workspace_id, user_id, name, accent_id, position,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'sage', ?, ?, ?)
      `).bind(
        groupId,
        context.workspaceId,
        context.userId,
        name,
        (position?.position ?? -1) + 1,
        timestamp,
        timestamp,
      ),
      prepareClaimInsert(context, {
        scopeKind: "user",
        scopeOwnerId: context.userId,
        assetKey: "group.starter_examples",
        assetKind: "project_group",
        generation: groupResolution.generation,
        resourceId: groupId,
        timestamp,
      }),
    ]);
  }
  if (!groupId) {
    await setScopeStatus(context, "user", context.userId, "partial");
    return false;
  }

  const memberships = [
    {
      key: "membership.starter_examples.tutorial",
      projectKey: "project.tutorial",
      position: 0,
    },
    {
      key: "membership.starter_examples.reference",
      projectKey: "project.reference",
      position: 1,
    },
  ] as const;
  for (const membership of memberships) {
    const resolution = await resolveAssetGeneration(
      context,
      "user",
      context.userId,
      membership.key,
    );
    if (resolution.status !== "create") continue;
    const projectClaim = await readActiveClaim(
      context,
      "workspace",
      context.workspaceId,
      membership.projectKey,
    );
    if (!projectClaim) continue;
    const membershipId = randomUUID();
    const timestamp = nowIso();
    await runCheckedBatch(context, [
      context.database.prepare(`
        INSERT INTO project_group_memberships (
          id, group_id, workspace_id, user_id, project_id, position,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        membershipId,
        groupId,
        context.workspaceId,
        context.userId,
        projectClaim.resource_id,
        membership.position,
        timestamp,
        timestamp,
      ),
      prepareClaimInsert(context, {
        scopeKind: "user",
        scopeOwnerId: context.userId,
        assetKey: membership.key,
        assetKind: "project_group_membership",
        generation: resolution.generation,
        resourceId: membershipId,
        timestamp,
      }),
    ]);
  }
  const claims = await readClaims(context, "user", context.userId);
  const complete = hasExactActiveClaims(claims, STARTER_USER_ASSET_KEYS);
  if (complete) {
    const exactMemberships = await first<{ count: number }>(
      context.database,
      `
        SELECT COUNT(*) AS count
        FROM project_group_memberships membership
        JOIN beta_starter_asset_claims claim
          ON claim.resource_id = membership.id
         AND claim.asset_kind = 'project_group_membership'
         AND claim.lifecycle_state = 'active'
        WHERE membership.workspace_id = ? AND membership.user_id = ?
          AND membership.group_id = ?
      `,
      [context.workspaceId, context.userId, groupId],
    );
    if (Number(exactMemberships?.count ?? 0) !== 2) {
      await setScopeStatus(context, "user", context.userId, "partial");
      return false;
    }
  }
  await setScopeStatus(context, "user", context.userId, complete ? "complete" : "partial");
  if (complete) {
    await run(
      context,
      `
        UPDATE beta_starter_pack_states
        SET shared_membership_revision = COALESCE((
              SELECT shared_membership_revision
              FROM beta_starter_pack_states
              WHERE workspace_id = ? AND pack_version = ?
                AND scope_kind = 'workspace' AND scope_owner_id = ?
            ), shared_membership_revision),
            updated_at = ?
        WHERE workspace_id = ? AND pack_version = ?
          AND scope_kind = 'user' AND scope_owner_id = ?
      `,
      [
        context.workspaceId,
        STARTER_PACK_VERSION,
        context.workspaceId,
        nowIso(),
        context.workspaceId,
        STARTER_PACK_VERSION,
        context.userId,
      ],
    );
  }
  return complete;
}

async function cleanupStarterUserScope(context: InstallContext) {
  const groupClaim = await readActiveClaim(
    context,
    "user",
    context.userId,
    "group.starter_examples",
  );
  const statements: D1PreparedStatementLike[] = [];
  if (groupClaim) {
    statements.push(
      context.database.prepare(`
        DELETE FROM project_group_memberships
        WHERE workspace_id = ? AND user_id = ? AND group_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM workspace_members current_membership
            WHERE current_membership.workspace_id = ?
              AND current_membership.user_id = ?
              AND current_membership.role IN ('owner', 'admin', 'member')
          )
      `).bind(
        context.workspaceId,
        context.userId,
        groupClaim.resource_id,
        context.workspaceId,
        context.userId,
      ),
      context.database.prepare(`
        DELETE FROM project_groups
        WHERE id = ? AND workspace_id = ? AND user_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM workspace_members current_membership
            WHERE current_membership.workspace_id = ?
              AND current_membership.user_id = ?
              AND current_membership.role IN ('owner', 'admin', 'member')
          )
      `).bind(
        groupClaim.resource_id,
        context.workspaceId,
        context.userId,
        context.workspaceId,
        context.userId,
      ),
    );
  }
  statements.push(
    context.database.prepare(`
      DELETE FROM beta_starter_asset_claims
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'user' AND scope_owner_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM workspace_members current_membership
          WHERE current_membership.workspace_id = ?
            AND current_membership.user_id = ?
            AND current_membership.role IN ('owner', 'admin', 'member')
        )
    `).bind(
      context.workspaceId,
      STARTER_PACK_VERSION,
      context.userId,
      context.workspaceId,
      context.userId,
    ),
    context.database.prepare(`
      DELETE FROM beta_starter_pack_states
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'user' AND scope_owner_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM workspace_members current_membership
          WHERE current_membership.workspace_id = ?
            AND current_membership.user_id = ?
            AND current_membership.role IN ('owner', 'admin', 'member')
        )
    `).bind(
      context.workspaceId,
      STARTER_PACK_VERSION,
      context.userId,
      context.workspaceId,
      context.userId,
    ),
  );
  await runCheckedBatch(context, statements);
  if (await canGroupProjects(context)) {
    await installUserScope({ ...context, mode: "restore" });
    return false;
  }
  const [state, claims, group] = await Promise.all([
    readState(context, "user", context.userId),
    readClaims(context, "user", context.userId),
    groupClaim
      ? first<{ present: number }>(
          context.database,
          `
            SELECT 1 AS present
            FROM project_groups
            WHERE id = ? AND workspace_id = ? AND user_id = ?
            LIMIT 1
          `,
          [groupClaim.resource_id, context.workspaceId, context.userId],
        )
      : Promise.resolve(null),
  ]);
  if (state || claims.length > 0 || group) {
    throw new Error("Starter organization cleanup did not complete.");
  }
  return true;
}

async function reconcileStarterUserBatch(context: InstallContext) {
  const pendingUsers = await readPendingUserMembershipScopes(context, 25);
  if (pendingUsers.length > 0) {
    await setScopeStatus(context, "workspace", context.workspaceId, "partial");
  }
  for (const pending of pendingUsers) {
    const userContext = { ...context, userId: pending.user_id, mode: "restore" as const };
    if (pending.role === "owner" || pending.role === "admin" || pending.role === "member") {
      await installUserScope(userContext);
    } else {
      await cleanupStarterUserScope(userContext);
    }
  }
  const pending = await hasPendingUserMembershipScopes(context);
  if (!pending) {
    await finalizeWorkspaceScopeIfReady(context);
  }
  return !pending;
}

async function acquireStarterMutationLease(
  context: InstallContext,
  operation: StarterInstallMode,
  expectedRevision?: number,
) {
  if (!context.database.batch) {
    throw new Error("Starter content mutation leases require D1 batch support.");
  }
  const leaseToken = randomUUID();
  const acquiredAt = nowIso();
  const expiresAt = new Date(
    Date.parse(acquiredAt) + STARTER_MUTATION_LEASE_MS,
  ).toISOString();
  const statements: D1PreparedStatementLike[] = [
    context.database.prepare(`
      DELETE FROM beta_starter_mutation_leases
      WHERE workspace_id = ? AND pack_version = ? AND expires_at <= ?
    `).bind(context.workspaceId, STARTER_PACK_VERSION, acquiredAt),
    context.database.prepare(`
      INSERT INTO beta_starter_mutation_leases (
        workspace_id, pack_version, lease_token, actor_user_id, operation,
        expires_at, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM beta_starter_mutation_leases
        WHERE workspace_id = ? AND pack_version = ?
      )
      ON CONFLICT(workspace_id, pack_version) DO NOTHING
    `).bind(
      context.workspaceId,
      STARTER_PACK_VERSION,
      leaseToken,
      context.userId,
      operation,
      expiresAt,
      acquiredAt,
      context.workspaceId,
      STARTER_PACK_VERSION,
    ),
  ];
  if (expectedRevision !== undefined) {
    statements.push(context.database.prepare(`
      UPDATE beta_starter_pack_states
      SET status = 'partial', revision = revision + 1, updated_at = ?
      WHERE workspace_id = ? AND pack_version = ?
        AND scope_kind = 'workspace' AND scope_owner_id = ?
        AND revision = ?
        AND EXISTS (
          SELECT 1
          FROM beta_starter_mutation_leases lease
          WHERE lease.workspace_id = beta_starter_pack_states.workspace_id
            AND lease.pack_version = beta_starter_pack_states.pack_version
            AND lease.lease_token = ?
        )
    `).bind(
      acquiredAt,
      context.workspaceId,
      STARTER_PACK_VERSION,
      context.workspaceId,
      expectedRevision,
      leaseToken,
    ));
  }
  const results = await context.database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new Error("Starter content mutation lease could not be acquired.");
  }
  if ((results[1]?.meta?.changes ?? 0) !== 1) {
    throw new StarterMutationLeaseConflictError(
      "Starter content is already being changed. Refresh and try again.",
    );
  }
  if (
    expectedRevision !== undefined
    && (results[2]?.meta?.changes ?? 0) !== 1
  ) {
    await releaseStarterMutationLease(context, leaseToken);
    throw new Error("Starter content changed before recovery finished. Refresh and try again.");
  }
  return leaseToken;
}

async function releaseStarterMutationLease(
  context: InstallContext,
  leaseToken: string,
) {
  const result = await context.database.prepare(`
    DELETE FROM beta_starter_mutation_leases
    WHERE workspace_id = ? AND pack_version = ? AND lease_token = ?
  `).bind(context.workspaceId, STARTER_PACK_VERSION, leaseToken).run();
  if (result.success === false) throw new Error("Starter content lease could not be released.");
}

async function withStarterMutationLease<T>(
  context: InstallContext,
  operation: StarterInstallMode,
  work: (leasedContext: InstallContext) => Promise<T>,
) {
  const leaseToken = await acquireStarterMutationLease(context, operation);
  const leasedContext = { ...context, mutationLeaseToken: leaseToken };
  try {
    return await work(leasedContext);
  } finally {
    await releaseStarterMutationLease(context, leaseToken);
  }
}

async function withAutomaticStarterMutationLease<T extends StarterInstallResult | null>(
  context: InstallContext,
  work: (leasedContext: InstallContext) => Promise<T>,
): Promise<T | StarterInstallResult> {
  try {
    return await withStarterMutationLease(context, "install", work);
  } catch (error) {
    if (!(error instanceof StarterMutationLeaseConflictError)) throw error;
    return readStarterInstallResult(context);
  }
}

async function canManageSharedStarter(context: InstallContext) {
  const membership = await first<{ role: string }>(
    context.database,
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1",
    [context.workspaceId, context.userId],
  );
  return membership?.role === "owner" || membership?.role === "admin";
}

async function installStarterPack(
  context: InstallContext,
) {
  let workspaceComplete = false;
  let userComplete = false;
  try {
    workspaceComplete = await installSharedScope(context);
    if (workspaceComplete) {
      userComplete = await installUserScope(context);
      if (userComplete && await canManageSharedStarter(context)) {
        await reconcileStarterUserBatch(context);
      }
    }
  } catch (error) {
    await ensureState(context, "workspace", context.workspaceId);
    await setScopeStatus(context, "workspace", context.workspaceId, "partial");
    if (await canGroupProjects(context)) {
      await ensureState(context, "user", context.userId);
      await setScopeStatus(context, "user", context.userId, "partial");
    }
    throw error;
  }
  const workspaceState = await readState(context, "workspace", context.workspaceId);
  const userState = await readState(context, "user", context.userId);
  return {
    workspaceStatus: workspaceState?.status ?? "partial",
    userStatus: userState?.status ?? "not_eligible",
    ready: workspaceComplete && userComplete,
  } satisfies StarterInstallResult;
}

async function readStarterInstallResult(context: InstallContext): Promise<StarterInstallResult> {
  const [workspaceState, userState] = await Promise.all([
    readState(context, "workspace", context.workspaceId),
    readState(context, "user", context.userId),
  ]);
  const ready = workspaceState?.status === "complete"
    && userState?.status === "complete"
    && userState.shared_membership_revision === workspaceState.shared_membership_revision;
  return {
    workspaceStatus: workspaceState?.status ?? "partial",
    userStatus: userState?.status ?? "not_eligible",
    ready,
  };
}

async function requireStarterDatabase() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Starter content requires the workspace database.");
  return database;
}

async function assertOwnerOrManager(context: InstallContext) {
  const membership = await first<{ role: string }>(
    context.database,
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1",
    [context.workspaceId, context.userId],
  );
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new Error("Only workspace owners and managers can change shared starter content.");
  }
}

async function isWorkspaceEmptyForAutomaticInstall(context: InstallContext) {
  const counts = await first<{
    projects_count: number;
    components_count: number;
    templates_count: number;
    groups_count: number;
    custom_folders_count: number;
  }>(
    context.database,
    `
      SELECT
        (SELECT COUNT(*) FROM projects WHERE workspace_id = ?) AS projects_count,
        (SELECT COUNT(*) FROM cost_library_items WHERE workspace_id = ?) AS components_count,
        (SELECT COUNT(*) FROM estimate_templates WHERE workspace_id = ?) AS templates_count,
        (SELECT COUNT(*) FROM project_groups WHERE workspace_id = ?) AS groups_count,
        (
          SELECT COUNT(*) FROM library_folders
          WHERE workspace_id = ? AND is_default_category = 0
        ) AS custom_folders_count
    `,
    [
      context.workspaceId,
      context.workspaceId,
      context.workspaceId,
      context.workspaceId,
      context.workspaceId,
    ],
  );
  return Boolean(
    counts
    && counts.projects_count === 0
    && counts.components_count === 0
    && counts.templates_count === 0
    && counts.groups_count === 0
    && counts.custom_folders_count === 0
  );
}

export async function installStarterPackForNewWorkspace(
  database: D1DatabaseLike,
  input: { workspaceId: string; userId: string },
) {
  const context: InstallContext = {
    database,
    workspaceId: input.workspaceId,
    userId: input.userId,
    mode: "install",
  };
  return withAutomaticStarterMutationLease(context, (leasedContext) =>
    installStarterPack(leasedContext));
}

export async function installStarterPackForEligibleWorkspace(
  database: D1DatabaseLike,
  input: { workspaceId: string; userId: string },
): Promise<StarterInstallResult | null> {
  const context: InstallContext = {
    database,
    workspaceId: input.workspaceId,
    userId: input.userId,
    mode: "install",
  };
  const currentResult = await readStarterInstallResult(context);
  if (currentResult.ready) return currentResult;
  return withAutomaticStarterMutationLease(context, async (leasedContext) => {
  const [workspaceState, userState, claims] = await Promise.all([
    readState(leasedContext, "workspace", leasedContext.workspaceId),
    readState(leasedContext, "user", leasedContext.userId),
    readClaims(leasedContext, "workspace", leasedContext.workspaceId),
  ]);
  if (workspaceState?.status === "complete") {
    await installUserScope({ ...leasedContext, mode: userState ? "resume" : "install" });
    if (await canManageSharedStarter(leasedContext)) {
      await reconcileStarterUserBatch(leasedContext);
    }
    return readStarterInstallResult(leasedContext);
  }
  const membership = await first<{ role: string }>(
    database,
    "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1",
    [leasedContext.workspaceId, leasedContext.userId],
  );
  if (membership?.role !== "owner" && membership?.role !== "admin") return null;
  if (workspaceState || userState || claims.length > 0) {
    return installStarterPack({ ...leasedContext, mode: "resume" });
  }
  if (!await isWorkspaceEmptyForAutomaticInstall(leasedContext)) return null;
  return installStarterPack(leasedContext);
  });
}

export async function autoInstallStarterPackIfEligible(): Promise<StarterInstallResult | null> {
  "use server";
  const database = await requireStarterDatabase();
  const actor = await resolveCurrentOnboardingActor(database);
  return installStarterPackForEligibleWorkspace(database, {
    workspaceId: actor.workspaceId,
    userId: actor.userId,
  });
}

export async function addStarterContent(): Promise<StarterInstallResult> {
  "use server";
  const database = await requireStarterDatabase();
  const actor = await resolveCurrentOnboardingActor(database);
  const context: InstallContext = {
    database,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    mode: "install",
  };
  await assertOwnerOrManager(context);
  return withStarterMutationLease(context, "install", (leasedContext) =>
    installStarterPack(leasedContext));
}

export async function resumeStarterContent(): Promise<StarterInstallResult> {
  "use server";
  const database = await requireStarterDatabase();
  const actor = await resolveCurrentOnboardingActor(database);
  const context: InstallContext = {
    database,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    mode: "resume",
  };
  const [workspaceState, membership] = await Promise.all([
    readState(context, "workspace", context.workspaceId),
    first<{ role: string }>(
      database,
      "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1",
      [context.workspaceId, context.userId],
    ),
  ]);
  const canManageShared = membership?.role === "owner" || membership?.role === "admin";
  const canResumePersonal = canManageShared || membership?.role === "member";
  if (!canResumePersonal) {
    throw new Error("This workspace role cannot change starter content.");
  }
  if (workspaceState?.status !== "complete") {
    await assertOwnerOrManager(context);
  }
  return withStarterMutationLease(context, "resume", async (leasedContext) => {
    if (workspaceState?.status === "complete" && !canManageShared) {
      await installUserScope(leasedContext);
    } else {
      await installStarterPack(leasedContext);
    }
    return readStarterInstallResult(leasedContext);
  });
}

export async function restoreStarterContent(input: {
  expectedRevision: number;
}): Promise<StarterInstallResult> {
  "use server";
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new Error("Starter restore revision is invalid.");
  }
  const database = await requireStarterDatabase();
  const currentUser = await requireCurrentUserContext();
  const actor = await resolveCurrentOnboardingActor(database);
  if (currentUser.userId !== actor.userId) throw new Error("Starter restore actor mismatch.");
  const context: InstallContext = {
    database,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    mode: "restore",
  };
  await assertOwnerOrManager(context);
  const leaseToken = await acquireStarterMutationLease(
    context,
    "restore",
    input.expectedRevision,
  );
  const leasedContext = { ...context, mutationLeaseToken: leaseToken };
  try {
  await reconcileClaimLifecycle(leasedContext, "workspace", leasedContext.workspaceId);
  const claims = await readClaims(leasedContext, "workspace", leasedContext.workspaceId);
  const latestClaims = new Map<string, StarterClaimRow>();
  for (const claim of claims) {
    if (!latestClaims.has(claim.asset_key)) latestClaims.set(claim.asset_key, claim);
  }
  const activeKeys = new Set(
    [...latestClaims.values()]
      .filter((claim) => claim.lifecycle_state === "active")
      .map((claim) => claim.asset_key),
  );
  const inactiveAssetKeys = STARTER_WORKSPACE_ASSET_KEYS.filter(
    (assetKey) => !activeKeys.has(assetKey),
  );
  if (inactiveAssetKeys.length === 0) {
    await installStarterPack(leasedContext);
    return readStarterInstallResult(leasedContext);
  }
  const requiresMembershipRebind = inactiveAssetKeys.includes("project.tutorial")
    || inactiveAssetKeys.includes("project.reference");
  if (requiresMembershipRebind) {
    const timestamp = nowIso();
    await runCheckedBatch(leasedContext, [
      database.prepare(`
        UPDATE beta_starter_pack_states
        SET shared_membership_revision = shared_membership_revision + 1,
            updated_at = ?
        WHERE workspace_id = ? AND pack_version = ?
          AND scope_kind = 'workspace' AND scope_owner_id = ?
      `).bind(
        timestamp,
        leasedContext.workspaceId,
        STARTER_PACK_VERSION,
        leasedContext.workspaceId,
      ),
      database.prepare(`
        UPDATE beta_starter_pack_states
        SET status = 'partial', updated_at = ?
        WHERE workspace_id = ? AND pack_version = ?
          AND scope_kind = 'user'
      `).bind(timestamp, leasedContext.workspaceId, STARTER_PACK_VERSION),
    ]);
  }
  await installStarterPack(leasedContext);
  return readStarterInstallResult(leasedContext);
  } finally {
    await releaseStarterMutationLease(context, leaseToken);
  }
}
