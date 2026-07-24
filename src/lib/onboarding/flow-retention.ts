import "server-only";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";

import {
  exportActivationPrivacyData,
  hasActiveActivationHold,
  type ActivationPrivacyExport,
} from "./activation-retention";

type FlowPrivacyStateRow = {
  flow_key: string;
  flow_version: number;
  generation: number;
  tutorial_version: number | null;
  tutorial_generation: number | null;
  status: string;
  current_step_key: string | null;
  reset_count: number;
  started_at: string | null;
  last_resumed_at: string | null;
  last_paused_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  last_reset_at: string | null;
  created_at: string;
  updated_at: string;
};

type FlowPrivacyEventRow = {
  flow_key: string;
  flow_version: number;
  generation: number;
  tutorial_version: number | null;
  tutorial_generation: number | null;
  launch_mode: string;
  step_key: string | null;
  event_type: string;
  source: string;
  reason_code: string | null;
  route_key: string | null;
  viewport_class: string | null;
  state_revision: number;
  occurred_at: string;
  ingested_at: string;
};

type StarterPrivacyStateRow = {
  pack_version: number;
  scope_kind: string;
  scope_owner_id: string;
  status: string;
  shared_membership_revision: number;
  installed_at: string | null;
  last_restored_at: string | null;
  created_at: string;
  updated_at: string;
};

type StarterPrivacyClaimRow = {
  pack_version: number;
  scope_kind: string;
  asset_key: string;
  asset_kind: string;
  starter_generation: number;
  lifecycle_state: string;
  created_at: string;
  updated_at: string;
};

type AccessRow = {
  has_access: number;
  has_grouping_capability: number;
};

export type OnboardingPrivacyExport = {
  activation: ActivationPrivacyExport;
  flowStates: FlowPrivacyStateRow[];
  flowEvents: FlowPrivacyEventRow[];
  starterStates: StarterPrivacyStateRow[];
  starterClaims: StarterPrivacyClaimRow[];
};

export async function exportOnboardingPrivacyData(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<OnboardingPrivacyExport> {
  if (!database) {
    return {
      activation: { events: [], progress: null },
      flowStates: [],
      flowEvents: [],
      starterStates: [],
      starterClaims: [],
    };
  }
  const [activation, stateResult, eventResult, starterStateResult, claimResult] =
    await Promise.all([
      exportActivationPrivacyData(database, input),
      database.prepare<FlowPrivacyStateRow>(`
        SELECT
          flow_key, flow_version, generation, tutorial_version,
          tutorial_generation, status, current_step_key, reset_count,
          started_at, last_resumed_at, last_paused_at, completed_at,
          dismissed_at, last_reset_at, created_at, updated_at
        FROM beta_onboarding_flow_states
        WHERE user_id = ? AND workspace_id = ?
        ORDER BY flow_key ASC, flow_version ASC
      `).bind(input.userId, input.workspaceId).all<FlowPrivacyStateRow>(),
      database.prepare<FlowPrivacyEventRow>(`
        SELECT
          flow_key, flow_version, generation, tutorial_version,
          tutorial_generation, launch_mode, step_key, event_type, source,
          reason_code, route_key, viewport_class, state_revision,
          occurred_at, ingested_at
        FROM beta_onboarding_flow_events
        WHERE user_id = ? AND workspace_id = ?
        ORDER BY occurred_at ASC, id ASC
      `).bind(input.userId, input.workspaceId).all<FlowPrivacyEventRow>(),
      database.prepare<StarterPrivacyStateRow>(`
        SELECT
          pack_version, scope_kind, scope_owner_id, status,
          shared_membership_revision, installed_at, last_restored_at,
          created_at, updated_at
        FROM beta_starter_pack_states
        WHERE workspace_id = ?
          AND (
            (scope_kind = 'workspace' AND scope_owner_id = workspace_id)
            OR (scope_kind = 'user' AND scope_owner_id = ?)
          )
        ORDER BY pack_version ASC, scope_kind ASC
      `).bind(input.workspaceId, input.userId).all<StarterPrivacyStateRow>(),
      database.prepare<StarterPrivacyClaimRow>(`
        SELECT
          pack_version, scope_kind, asset_key, asset_kind,
          starter_generation, lifecycle_state, created_at, updated_at
        FROM beta_starter_asset_claims
        WHERE workspace_id = ?
          AND scope_kind = 'user'
          AND scope_owner_id = ?
        ORDER BY pack_version ASC, asset_key ASC, starter_generation ASC
      `).bind(input.workspaceId, input.userId).all<StarterPrivacyClaimRow>(),
    ]);
  return {
    activation,
    flowStates: stateResult.results ?? [],
    flowEvents: eventResult.results ?? [],
    starterStates: starterStateResult.results ?? [],
    starterClaims: claimResult.results ?? [],
  };
}

export function prepareStarterOrganizationCleanupStatements(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
  options: { guardGroupingCapabilityAbsent?: boolean } = {},
): D1PreparedStatementLike[] {
  const capabilityGuard = options.guardGroupingCapabilityAbsent
    ? `
        AND NOT EXISTS (
          SELECT 1
          FROM workspace_members current_membership
          WHERE current_membership.workspace_id = ?
            AND current_membership.user_id = ?
            AND current_membership.role IN ('owner', 'admin', 'member')
        )
      `
    : "";
  const capabilityValues = options.guardGroupingCapabilityAbsent
    ? [input.workspaceId, input.userId]
    : [];
  return [
    database.prepare(`
      DELETE FROM project_group_memberships
      WHERE workspace_id = ?
        AND user_id = ?
        AND group_id IN (
          SELECT resource_id
          FROM beta_starter_asset_claims
          WHERE workspace_id = ?
            AND scope_kind = 'user'
            AND scope_owner_id = ?
            AND asset_kind = 'project_group'
        )
        ${capabilityGuard}
    `).bind(
      input.workspaceId,
      input.userId,
      input.workspaceId,
      input.userId,
      ...capabilityValues,
    ),
    database.prepare(`
      DELETE FROM project_groups
      WHERE workspace_id = ?
        AND user_id = ?
        AND id IN (
          SELECT resource_id
          FROM beta_starter_asset_claims
          WHERE workspace_id = ?
            AND scope_kind = 'user'
            AND scope_owner_id = ?
            AND asset_kind = 'project_group'
        )
        ${capabilityGuard}
    `).bind(
      input.workspaceId,
      input.userId,
      input.workspaceId,
      input.userId,
      ...capabilityValues,
    ),
    database.prepare(`
      DELETE FROM beta_starter_asset_claims
      WHERE workspace_id = ?
        AND scope_kind = 'user'
        AND scope_owner_id = ?
        ${capabilityGuard}
    `).bind(input.workspaceId, input.userId, ...capabilityValues),
    database.prepare(`
      DELETE FROM beta_starter_pack_states
      WHERE workspace_id = ?
        AND scope_kind = 'user'
        AND scope_owner_id = ?
        ${capabilityGuard}
    `).bind(input.workspaceId, input.userId, ...capabilityValues),
  ];
}

function prepareUnheldEvidenceCleanupStatements(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
): D1PreparedStatementLike[] {
  const withoutActiveHold = (table: string) => `
    AND NOT EXISTS (
      SELECT 1 FROM beta_activation_retention_holds hold
      WHERE hold.user_id = ${table}.user_id
        AND hold.workspace_id = ${table}.workspace_id
        AND datetime(hold.starts_at) <= datetime('now')
        AND datetime(hold.expires_at) > datetime('now')
    )
  `;
  return [
    database.prepare(`
      DELETE FROM beta_onboarding_flow_events
      WHERE user_id = ? AND workspace_id = ?
      ${withoutActiveHold("beta_onboarding_flow_events")}
    `).bind(input.userId, input.workspaceId),
    database.prepare(`
      DELETE FROM beta_onboarding_flow_states
      WHERE user_id = ? AND workspace_id = ?
      ${withoutActiveHold("beta_onboarding_flow_states")}
    `).bind(input.userId, input.workspaceId),
    database.prepare(`
      DELETE FROM beta_activation_outbox
      WHERE user_id = ? AND workspace_id = ?
      ${withoutActiveHold("beta_activation_outbox")}
    `).bind(input.userId, input.workspaceId),
    database.prepare(`
      DELETE FROM beta_activation_events
      WHERE user_id = ? AND workspace_id = ?
      ${withoutActiveHold("beta_activation_events")}
    `).bind(input.userId, input.workspaceId),
    database.prepare(`
      DELETE FROM beta_activation_progress
      WHERE user_id = ? AND workspace_id = ?
      ${withoutActiveHold("beta_activation_progress")}
    `).bind(input.userId, input.workspaceId),
  ];
}

export async function eraseOnboardingPrivacyData(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<{ status: "erased" | "skipped_legal_hold" | "unavailable" }> {
  if (!database?.batch) return { status: "unavailable" };
  const held = await hasActiveActivationHold(database, input);
  const results = await database.batch([
    ...prepareStarterOrganizationCleanupStatements(database, input),
    ...(held ? [] : prepareUnheldEvidenceCleanupStatements(database, input)),
  ]);
  if (results.some((result) => result.success === false)) {
    throw new Error("Onboarding privacy erase failed.");
  }
  return { status: held ? "skipped_legal_hold" : "erased" };
}

async function readAccessAfterGrantRemoval(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
): Promise<AccessRow> {
  const row = await database.prepare<AccessRow>(`
    SELECT
      CASE WHEN
        EXISTS (
          SELECT 1 FROM workspace_members
          WHERE user_id = ? AND workspace_id = ?
        )
        OR EXISTS (
          SELECT 1
          FROM project_members membership
          JOIN projects project ON project.id = membership.project_id
          WHERE membership.user_id = ? AND project.workspace_id = ?
        )
        OR EXISTS (
          SELECT 1
          FROM estimate_sheet_members membership
          JOIN estimates estimate ON estimate.id = membership.estimate_id
          JOIN projects project ON project.id = estimate.project_id
          WHERE membership.user_id = ? AND project.workspace_id = ?
        )
        THEN 1 ELSE 0
      END AS has_access,
      CASE WHEN EXISTS (
        SELECT 1
        FROM workspace_members
        WHERE user_id = ?
          AND workspace_id = ?
          AND role IN ('owner', 'admin', 'member')
      ) THEN 1 ELSE 0 END AS has_grouping_capability
  `).bind(
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
    input.userId, input.workspaceId,
  ).first<AccessRow>();
  return row ?? { has_access: 0, has_grouping_capability: 0 };
}

export async function reconcileOnboardingAfterAccessChange(
  database: D1DatabaseLike | null | undefined,
  input: { userId: string; workspaceId: string },
): Promise<{
  status:
    | "access_retained"
    | "starter_organization_removed"
    | "final_access_erased"
    | "final_access_held";
}> {
  if (!database?.batch) throw new Error("Onboarding access reconciliation requires D1.");
  const access = await readAccessAfterGrantRemoval(database, input);
  if (access.has_access === 1 && access.has_grouping_capability === 1) {
    return { status: "access_retained" };
  }
  const starterCleanup = prepareStarterOrganizationCleanupStatements(database, input, {
    guardGroupingCapabilityAbsent: true,
  });
  if (access.has_access === 1) {
    const results = await database.batch(starterCleanup);
    if (results.some((result) => result.success === false)) {
      throw new Error("Starter organization cleanup failed.");
    }
    const currentAccess = await readAccessAfterGrantRemoval(database, input);
    if (currentAccess.has_grouping_capability === 1) {
      return { status: "access_retained" };
    }
    const remaining = await database.prepare<{ present: number }>(`
      SELECT 1 AS present
      WHERE EXISTS (
        SELECT 1
        FROM beta_starter_pack_states
        WHERE workspace_id = ? AND scope_kind = 'user' AND scope_owner_id = ?
      )
      OR EXISTS (
        SELECT 1
        FROM beta_starter_asset_claims
        WHERE workspace_id = ? AND scope_kind = 'user' AND scope_owner_id = ?
      )
      LIMIT 1
    `).bind(
      input.workspaceId,
      input.userId,
      input.workspaceId,
      input.userId,
    ).first<{ present: number }>();
    if (remaining) throw new Error("Starter organization cleanup did not complete.");
    return { status: "starter_organization_removed" };
  }
  const held = await hasActiveActivationHold(database, input);
  const results = await database.batch([
    ...starterCleanup,
    ...(held ? [] : prepareUnheldEvidenceCleanupStatements(database, input)),
  ]);
  if (results.some((result) => result.success === false)) {
    throw new Error("Final onboarding access cleanup failed.");
  }
  return { status: held ? "final_access_held" : "final_access_erased" };
}

export async function prepareOnboardingAccountDeletionStatements(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
): Promise<D1PreparedStatementLike[]> {
  const held = await hasActiveActivationHold(database, input);
  return [
    ...prepareStarterOrganizationCleanupStatements(database, input),
    ...(held ? [] : prepareUnheldEvidenceCleanupStatements(database, input)),
  ];
}

export async function purgeExpiredOnboardingEvents(
  database: D1DatabaseLike | null | undefined,
  options: { now?: Date } = {},
): Promise<{ events: number }> {
  if (!database) return { events: 0 };
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60_000).toISOString();
  const nowIso = now.toISOString();
  const result = await database.prepare(`
    DELETE FROM beta_onboarding_flow_events
    WHERE datetime(occurred_at) < datetime(?)
      AND NOT EXISTS (
        SELECT 1
        FROM beta_activation_retention_holds hold
        WHERE hold.user_id = beta_onboarding_flow_events.user_id
          AND hold.workspace_id = beta_onboarding_flow_events.workspace_id
          AND datetime(hold.starts_at) <= datetime(?)
          AND datetime(hold.expires_at) > datetime(?)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM beta_onboarding_flow_states state
        WHERE state.user_id = beta_onboarding_flow_events.user_id
          AND state.workspace_id = beta_onboarding_flow_events.workspace_id
          AND state.flow_key = beta_onboarding_flow_events.flow_key
          AND state.flow_version = beta_onboarding_flow_events.flow_version
          AND state.generation = beta_onboarding_flow_events.generation
          AND (
            (
              state.status = 'in_progress'
              AND beta_onboarding_flow_events.event_type IN (
                'state_imported', 'flow_started', 'flow_resumed', 'flow_replayed',
                'flow_paused', 'flow_dismissed', 'flow_restarted'
              )
            )
            OR (
              state.flow_key = 'guided_estimate_practice'
              AND beta_onboarding_flow_events.source = 'tutorial_practice'
              AND beta_onboarding_flow_events.event_type = 'practice_action_completed'
              AND beta_onboarding_flow_events.tutorial_version = state.tutorial_version
              AND beta_onboarding_flow_events.tutorial_generation = state.tutorial_generation
            )
          )
      )
  `).bind(cutoff, nowIso, nowIso).run();
  if (result.success === false) throw new Error("Onboarding event retention purge failed.");
  return { events: result.meta?.changes ?? 0 };
}
